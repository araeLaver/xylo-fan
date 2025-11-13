import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NftService } from '../../nft/nft.service';
import { NftTier } from '../../nft/enums/nft-type.enum';
import { TIER_NFT_CONFIG } from '../../nft/constants/nft-metadata.constant';

export interface TierNftUpgradeJob {
  userId?: string; // 특정 유저만 처리 (없으면 모든 유저)
}

/**
 * Tier NFT 자동 승급 Processor
 *
 * 스케줄:
 * - 매일 04:00 KST (포인트 계산 완료 후)
 *
 * 로직:
 * 1. user_points 테이블에서 total_points 조회
 * 2. 현재 보유 중인 Tier NFT 확인
 * 3. 포인트 기준 목표 티어 계산
 * 4. 목표 티어 > 현재 티어 → 자동 업그레이드
 * 5. 이메일 알림 발송 (향후 구현)
 *
 * Tier 기준:
 * - Bronze (1): 0P ~ 999P
 * - Silver (2): 1,000P ~ 4,999P
 * - Gold (3): 5,000P ~ 9,999P
 * - Diamond (4): 10,000P+
 */
@Processor('tier-nft-upgrade')
export class TierNftUpgradeProcessor {
  private readonly logger = new Logger(TierNftUpgradeProcessor.name);

  constructor(
    private prisma: PrismaService,
    private nftService: NftService,
  ) {}

  @Process('upgrade-tiers')
  async handleUpgradeTiers(job: Bull.Job<TierNftUpgradeJob>) {
    this.logger.log('Starting Tier NFT upgrade job');

    try {
      let userPoints;

      if (job.data.userId) {
        // 특정 유저만 처리
        userPoints = await this.prisma.user_points.findMany({
          where: { user_id: job.data.userId },
        });
      } else {
        // 모든 유저 처리
        userPoints = await this.prisma.user_points.findMany({
          orderBy: { total_points: 'desc' },
        });
      }

      this.logger.log(`Processing ${userPoints.length} users for tier upgrades`);

      let upgradedCount = 0;
      let skippedCount = 0;

      for (const userPoint of userPoints) {
        try {
          const userId = userPoint.user_id;
          const totalPoints = userPoint.total_points;

          // 현재 티어 NFT 조회
          const currentTierNft = await this.prisma.user_nfts.findFirst({
            where: {
              user_id: userId,
              nft_type: 'TIER',
              is_burned: false,
            },
            orderBy: { tier: 'desc' },
          });

          const currentTier = currentTierNft?.tier || 0;

          // 포인트 기반 목표 티어 계산
          const targetTier = this.calculateTierFromPoints(totalPoints);

          // 티어 자격이 없으면 스킵 (20,000P 미만)
          if (!targetTier) {
            skippedCount++;
            continue;
          }

          // 업그레이드 필요 여부 확인
          if (targetTier > currentTier) {
            this.logger.log(
              `Upgrading user ${userId}: Tier ${currentTier} → ${targetTier} (${totalPoints}P)`,
            );

            // NftService의 upgradeTierNft 메서드 호출
            await this.nftService.upgradeTierNft(userId, targetTier);

            upgradedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to upgrade user ${userPoint.user_id}: ${error.message}`,
          );
          // 개별 유저 실패해도 계속 진행
        }
      }

      this.logger.log(
        `Tier upgrade job completed: ${upgradedCount} upgraded, ${skippedCount} skipped`,
      );

      return {
        success: true,
        processed: userPoints.length,
        upgraded: upgradedCount,
        skipped: skippedCount,
      };
    } catch (error) {
      this.logger.error(`Tier upgrade job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 포인트 기반 티어 계산
   *
   * 정책 기준:
   * - Bronze: 20,000 ~ 100,000P
   * - Silver: 100,001 ~ 500,000P
   * - Gold: 500,001 ~ 1,000,000P
   * - Platinum: 1,000,001 ~ 10,000,000P
   * - Diamond: 10,000,001P ~
   */
  private calculateTierFromPoints(totalPoints: number): NftTier | null {
    if (totalPoints >= TIER_NFT_CONFIG[NftTier.DIAMOND].pointsRequired) {
      return NftTier.DIAMOND; // 10,000,001P+
    } else if (totalPoints >= TIER_NFT_CONFIG[NftTier.PLATINUM].pointsRequired) {
      return NftTier.PLATINUM; // 1,000,001P+
    } else if (totalPoints >= TIER_NFT_CONFIG[NftTier.GOLD].pointsRequired) {
      return NftTier.GOLD; // 500,001P+
    } else if (totalPoints >= TIER_NFT_CONFIG[NftTier.SILVER].pointsRequired) {
      return NftTier.SILVER; // 100,001P+
    } else if (totalPoints >= TIER_NFT_CONFIG[NftTier.BRONZE].pointsRequired) {
      return NftTier.BRONZE; // 20,000P+
    } else {
      return null; // 20,000P 미만은 티어 없음
    }
  }
}
