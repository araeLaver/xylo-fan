import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { leaderboard_period } from '@prisma/client';

export interface LeaderboardSnapshotJob {
  period?: leaderboard_period; // 특정 기간만 생성 (없으면 전체 5개 기간)
}

/**
 * 리더보드 스냅샷 Processor
 *
 * 스케줄:
 * - 매일 04:00 KST (포인트 계산 다음)
 * - 매주 월요일 05:00 KST (주간 스냅샷)
 *
 * 생성 기간:
 * - ALL: 전체 누적 순위
 * - ONE_DAY (1D): 일간 순위
 * - ONE_WEEK (1W): 주간 순위
 * - ONE_MONTH (1M): 월간 순위
 * - THREE_MONTHS (3M): 3개월 순위
 *
 * 정렬 기준:
 * - subscriber_count 내림차순 (구독자 많은 순)
 * - 같은 날짜에 기간별로 5개 스냅샷 생성
 *
 * 용도:
 * - 프론트엔드에서 기간별 리더보드 표시
 * - 순위 변동 추이 분석
 */
@Processor('leaderboard-snapshot')
export class LeaderboardSnapshotProcessor {
  private readonly logger = new Logger(LeaderboardSnapshotProcessor.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 매일 01:00 KST 실행
   * 5개 기간(ALL, 1D, 1W, 1M, 3M) 모두 생성
   */
  @Process('create-snapshot')
  async handleCreateSnapshot(job: Bull.Job<LeaderboardSnapshotJob>) {
    this.logger.log('Starting leaderboard snapshot job');

    try {
      const snapshotDate = new Date();
      snapshotDate.setHours(0, 0, 0, 0);

      // 모든 인증된 채널 조회 (subscriber_count 기준 정렬)
      const channels = await this.prisma.youtube_channels.findMany({
        where: { is_verified: true },
        orderBy: { subscriber_count: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              x_handle: true,
              profile_image_url: true,
            },
          },
        },
      });

      this.logger.log(`Creating snapshots for ${channels.length} channels`);

      // 5개 기간 모두 처리
      const periods: leaderboard_period[] = [
        leaderboard_period.ALL,
        leaderboard_period.ONE_DAY,
        leaderboard_period.ONE_WEEK,
        leaderboard_period.ONE_MONTH,
        leaderboard_period.THREE_MONTHS,
      ];

      for (const period of periods) {
        await this.createPeriodSnapshot(channels, period, snapshotDate);
      }

      this.logger.log(
        `Leaderboard snapshot job completed for all periods (${channels.length} channels)`,
      );
      return {
        success: true,
        channelCount: channels.length,
        periods: periods.length,
      };
    } catch (error: any) {
      this.logger.error(`Leaderboard snapshot job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 특정 기간의 리더보드 스냅샷 생성
   */
  private async createPeriodSnapshot(
    channels: any[],
    period: leaderboard_period,
    snapshotDate: Date,
  ): Promise<void> {
    this.logger.log(`Creating ${period} period snapshot`);

    // 각 채널별로 포인트 조회 및 리더보드 엔트리 생성
    const entries = await Promise.all(
      channels.map(async (channel, index) => {
        const userId = channel.user_id;

        // 사용자 포인트 조회
        const userPoints = await this.prisma.user_points.findUnique({
          where: { user_id: userId },
        });

        if (!userPoints) {
          return null;
        }

        // 사용자 정보
        const user = channel.users;

        return {
          user_id: userId,
          channel_id: channel.id,
          period: period,
          rank: index + 1, // subscriber_count 기준 순위
          total_current: userPoints.total_points,
          contents: userPoints.slot_01_content,
          mgm: userPoints.slot_02_mgm,
          event: userPoints.slot_03_event,
          profit: userPoints.slot_04_profit,
          boost: userPoints.slot_06_boost,
          channel_title: channel.channel_title,
          channel_image_url: channel.thumbnail_url,
          x_handle: user?.x_handle,
          profile_image_url: user?.profile_image_url || channel.thumbnail_url,
          snapshot_date: snapshotDate,
        };
      }),
    );

    // null 제거
    const validEntries = entries.filter((e) => e !== null);

    // 배치 삽입
    for (const entry of validEntries) {
      await this.prisma.leaderboard_entries.upsert({
        where: {
          period_rank_snapshot_date: {
            period: entry.period,
            rank: entry.rank,
            snapshot_date: entry.snapshot_date,
          },
        },
        create: {
          user_id: entry.user_id,
          channel_id: entry.channel_id,
          period: entry.period,
          rank: entry.rank,
          total_current: entry.total_current,
          contents: entry.contents,
          mgm: entry.mgm,
          event: entry.event,
          profit: entry.profit,
          boost: entry.boost,
          channel_title: entry.channel_title,
          channel_image_url: entry.channel_image_url,
          x_handle: entry.x_handle,
          profile_image_url: entry.profile_image_url,
          snapshot_date: entry.snapshot_date,
        },
        update: {
          total_current: entry.total_current,
          contents: entry.contents,
          mgm: entry.mgm,
          event: entry.event,
          profit: entry.profit,
          boost: entry.boost,
          channel_title: entry.channel_title,
          channel_image_url: entry.channel_image_url,
          x_handle: entry.x_handle,
          profile_image_url: entry.profile_image_url,
        },
      });
    }

    this.logger.log(
      `Created ${validEntries.length} entries for period ${period}`,
    );
  }
}
