import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface PointCalculationJob {
  channelId?: string; // 특정 채널만 계산 (없으면 모든 인증된 채널)
}

/**
 * 포인트 계산 Processor
 *
 * 스케줄:
 * - 매일 03:00 KST (YouTube 크롤링 다음)
 *
 * 계산 공식:
 * - 조회수: 100회당 1P
 * - 좋아요: 50개당 1P
 * - 댓글: 10개당 1P
 * - 일일 최대: 1000P (영상별)
 *
 * 계산 방식:
 * - 전날 스냅샷 대비 오늘 스냅샷 증가분 계산
 * - is_eligible: true인 영상만 포인트 적립
 * - point_transactions 테이블에 기록 → DB 트리거가 user_points 자동 업데이트
 *
 * 카테고리:
 * - 'CONTENT' (slot_01_content)
 */
@Processor('point-calculation')
export class PointCalculationProcessor {
  private readonly logger = new Logger(PointCalculationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Process('calculate-points')
  async handleCalculatePoints(job: Bull.Job<PointCalculationJob>) {
    this.logger.log('Starting point calculation job');

    try {
      let channels;

      if (job.data.channelId) {
        // Calculate for specific channel
        channels = await this.prisma.youtube_channels.findMany({
          where: {
            id: job.data.channelId,
            is_verified: true,
          },
        });
      } else {
        // Calculate for all verified channels
        channels = await this.prisma.youtube_channels.findMany({
          where: { is_verified: true },
        });
      }

      this.logger.log(`Calculating points for ${channels.length} channels`);

      for (const channel of channels) {
        try {
          // Calculate video-based points (from snapshots)
          const videoPoints = await this.calculateVideoPoints(
            channel.user_id,
            channel.id,
          );

          if (videoPoints > 0) {
            this.logger.log(
              `Awarded ${videoPoints} CONTENT points to user ${channel.user_id} for channel ${channel.id}`,
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Error calculating points for channel ${channel.id}: ${error.message}`,
          );
        }
      }

      this.logger.log('Point calculation job completed');
      return { success: true, processedCount: channels.length };
    } catch (error: any) {
      this.logger.error(`Point calculation job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 영상별 포인트 계산 (전날 대비 증가분)
   */
  private async calculateVideoPoints(
    userId: string,
    channelId: string,
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 해당 채널의 적격 비디오 조회
    // 조건:
    // 1. #WITCHES 또는 #XYLO 포함 (is_eligible)
    // 2. 공개 영상만 (privacy_status = 'public')
    // 3. 처리 완료된 영상만 (upload_status = 'processed')
    const eligibleVideos = await this.prisma.youtube_videos.findMany({
      where: {
        channel_id: channelId,
        is_eligible: true,
        privacy_status: 'public', // 공개 영상만
        upload_status: 'processed', // 처리 완료만
      },
    });

    if (eligibleVideos.length === 0) {
      this.logger.log(`No eligible videos for channel ${channelId}`);
      return 0;
    }

    let totalPoints = 0;

    for (const video of eligibleVideos) {
      // 오늘과 어제의 스냅샷 조회
      const [todaySnapshot, yesterdaySnapshot] = await Promise.all([
        this.prisma.youtube_video_snapshots.findUnique({
          where: {
            video_id_snapshot_date: {
              video_id: video.id,
              snapshot_date: today,
            },
          },
        }),
        this.prisma.youtube_video_snapshots.findUnique({
          where: {
            video_id_snapshot_date: {
              video_id: video.id,
              snapshot_date: yesterday,
            },
          },
        }),
      ]);

      // 어제 스냅샷이 없으면 첫날이므로 포인트 계산 안 함
      if (!yesterdaySnapshot || !todaySnapshot) {
        continue;
      }

      // 증가분 계산
      const viewDelta = Math.max(
        0,
        (todaySnapshot.view_count ?? 0) - (yesterdaySnapshot.view_count ?? 0),
      );
      const likeDelta = Math.max(
        0,
        (todaySnapshot.like_count ?? 0) - (yesterdaySnapshot.like_count ?? 0),
      );
      const commentDelta = Math.max(
        0,
        (todaySnapshot.comment_count ?? 0) -
          (yesterdaySnapshot.comment_count ?? 0),
      );

      // 포인트 계산 (기획서 기준)
      // 조회수 1회당 1P, 좋아요 1개당 1P, 댓글 1개당 3P
      const viewPoints = viewDelta;
      const likePoints = likeDelta;
      const commentPoints = commentDelta * 3;

      const points = viewPoints + likePoints + commentPoints;

      if (points > 0) {
        await this.prisma.point_transactions.create({
          data: {
            user_id: userId,
            category: 'CONTENT',
            amount: points,
            reason: `Video ${video.video_id}: +${viewDelta} views, +${likeDelta} likes, +${commentDelta} comments`,
            metadata: {
              videoId: video.id,
              videoYtId: video.video_id,
              viewDelta,
              likeDelta,
              commentDelta,
              viewPoints,
              likePoints,
              commentPoints,
            },
          },
        });

        totalPoints += points;
      }
    }

    return totalPoints;
  }
}
