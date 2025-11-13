import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReferralProcessJob {
  userId: string; // 피추천인 ID (조건 체크 대상)
}

/**
 * 추천(Referral) Processor
 *
 * 스케줄:
 * - 매일 02:00 KST 전체 체크 (jobs.service.ts)
 * - 이벤트 기반: 사용자 액션 시 즉시 체크 (Discord 가입 등)
 *
 * 2단계 검증:
 * 1. is_joined: 가입 완료 (자동 true, 추천 코드로 가입 시)
 * 2. is_discord_joined: Discord 서버 가입 (social_accounts.platform='DISCORD' 확인)
 *
 * 포인트 지급:
 * - 추천인(referrer): 10P (REFERRAL 카테고리)
 * - 피추천인(referee): 1P (REFERRAL 카테고리)
 * - 조건 충족 시 1회만 지급 (is_completed=true 처리)
 *
 * 참고: is_video_posted는 추적용으로만 사용되며 완료 조건에서 제외됨
 */
@Processor('referral')
export class ReferralProcessor {
  private readonly logger = new Logger(ReferralProcessor.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 매일 02:00 KST 실행
   * 모든 미완료 추천 관계의 조건을 체크하고 완료 시 포인트 지급
   */
  @Process('check-referrals')
  async handleCheckReferrals(job: Bull.Job) {
    this.logger.log('Starting daily referral check job');

    try {
      // 미완료 추천 관계 조회
      const pendingReferrals = await this.prisma.referrals.findMany({
        where: { is_completed: false },
        include: {
          users_referrals_referee_idTousers: true, // 피추천인 정보
        },
      });

      this.logger.log(`Found ${pendingReferrals.length} pending referrals`);

      let completedCount = 0;

      for (const referral of pendingReferrals) {
        const completed = await this.checkReferralCompletion(
          referral.referee_id,
          referral.id,
        );
        if (completed) {
          completedCount++;
        }
      }

      this.logger.log(
        `Referral check job completed: ${completedCount}/${pendingReferrals.length} completed`,
      );

      return { success: true, completedCount };
    } catch (error: any) {
      this.logger.error(`Referral check job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 특정 사용자의 추천 조건 체크 (이벤트 트리거용)
   */
  @Process('process-referral')
  async handleProcessReferral(job: Bull.Job<ReferralProcessJob>) {
    const { userId } = job.data;

    this.logger.log(`Checking referral completion for user ${userId}`);

    try {
      // 해당 사용자의 미완료 추천 관계 조회
      const referral = await this.prisma.referrals.findFirst({
        where: {
          referee_id: userId,
          is_completed: false,
        },
      });

      if (!referral) {
        this.logger.log(`No pending referral found for user ${userId}`);
        return { success: true, completed: false };
      }

      const completed = await this.checkReferralCompletion(userId, referral.id);

      return { success: true, completed };
    } catch (error: any) {
      this.logger.error(
        `Error processing referral for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * 추천 완료 조건 체크 및 포인트 지급
   */
  private async checkReferralCompletion(
    refereeId: string,
    referralId: string,
  ): Promise<boolean> {
    const referral = await this.prisma.referrals.findUnique({
      where: { id: referralId },
    });

    if (!referral || referral.is_completed) {
      return false;
    }

    // 1. 가입 완료 확인 (이미 레퍼럴 생성 시 true)
    const isJoined = referral.is_joined;

    // 2. 디스코드 가입 확인
    const discordAccount = await this.prisma.social_accounts.findFirst({
      where: {
        user_id: refereeId,
        platform: 'DISCORD',
        is_verified: true,
      },
    });
    const isDiscordJoined = !!discordAccount;

    // 3. 영상 업로드 확인 (필수 태그 포함)
    const user = await this.prisma.users.findUnique({
      where: { id: refereeId },
    });

    const eligibleVideo = await this.prisma.youtube_videos.findFirst({
      where: {
        youtube_channels: {
          user_id: refereeId,
          is_verified: true,
        },
        is_eligible: true, // #WITCHES 또는 #XYLO 포함
        published_at: user?.joined_at
          ? { gte: user.joined_at }
          : undefined,
      },
    });
    const isVideoPosted = !!eligibleVideo;

    // 4. 진행 상황 업데이트
    await this.prisma.referrals.update({
      where: { id: referralId },
      data: {
        is_joined: isJoined,
        is_discord_joined: isDiscordJoined,
        is_video_posted: isVideoPosted,
      },
    });

    // 5. 조건 충족 시 포인트 지급 (가입 + 디스코드)
    if (isJoined && isDiscordJoined) {
      // 추천인에게 10P 지급
      await this.prisma.point_transactions.create({
        data: {
          user_id: referral.referrer_id,
          category: 'REFERRAL',
          amount: 10,
          reason: `Referral completed by ${refereeId}`,
          metadata: {
            referralId: referral.id,
            refereeId: refereeId,
          },
        },
      });

      // 피추천인에게 1P 지급
      await this.prisma.point_transactions.create({
        data: {
          user_id: refereeId,
          category: 'REFERRAL',
          amount: 1,
          reason: 'Referral completed',
          metadata: {
            referralId: referral.id,
            referrerId: referral.referrer_id,
          },
        },
      });

      // 완료 상태로 업데이트
      await this.prisma.referrals.update({
        where: { id: referralId },
        data: {
          is_completed: true,
          completed_at: new Date(),
        },
      });

      this.logger.log(
        `Referral ${referralId} completed: Awarded 10P to referrer ${referral.referrer_id} and 1P to referee ${refereeId}`,
      );

      return true;
    }

    this.logger.log(
      `Referral ${referralId} progress: joined=${isJoined}, discord=${isDiscordJoined}, video=${isVideoPosted}`,
    );

    return false;
  }
}
