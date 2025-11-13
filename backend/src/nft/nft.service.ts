import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GetNftsDto } from './dto/get-nfts.dto';
import { ClaimUserPassDto } from './dto/claim-user-pass.dto';
import { BurnNftDto } from './dto/burn-nft.dto';
import { IssueRewardNftDto } from './dto/issue-reward-nft.dto';
import { NftType, NftTier } from './enums/nft-type.enum';
import { USER_PASS_METADATA, TIER_NFT_CONFIG, NFT_CONTRACT_ADDRESSES } from './constants/nft-metadata.constant';
import { Prisma } from '@prisma/client';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class NftService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {}

  /**
   * 내 NFT 컬렉션 조회
   * GET /api/v1/nfts/my-collection
   */
  async getMyNfts(userId: string, dto: GetNftsDto) {
    const { type, is_burned } = dto;

    // WHERE 조건 구성
    const whereConditions: Prisma.user_nftsWhereInput = {
      user_id: userId,
    };

    if (type) {
      whereConditions.nft_type = type as any;
    }

    if (is_burned !== undefined) {
      whereConditions.is_burned = is_burned;
    }

    const nfts = await this.prisma.user_nfts.findMany({
      where: whereConditions,
      orderBy: [
        { nft_type: 'asc' }, // SBT, TIER, REWARD 순
        { tier: 'desc' }, // 티어 높은 순
        { minted_at: 'desc' }, // 최신 순
      ],
    });

    return {
      total: nfts.length,
      nfts: nfts.map((nft) => this.formatNft(nft)),
    };
  }

  /**
   * NFT 단건 조회
   * GET /api/v1/nfts/:id
   */
  async getNftById(nftId: string, userId: string) {
    const nft = await this.prisma.user_nfts.findFirst({
      where: {
        id: nftId,
        user_id: userId,
      },
    });

    if (!nft) {
      throw new NotFoundException('NFT not found');
    }

    return this.formatNft(nft);
  }

  /**
   * NFT 타입별 설명 조회
   * GET /api/v1/nfts/types
   */
  getNftTypes() {
    return {
      types: [
        {
          type: NftType.SBT,
          name: 'Soul-Bound Token',
          description: 'Non-transferable membership badges (e.g., User Pass)',
          transferable: false,
        },
        {
          type: NftType.TIER,
          name: 'Tier NFT',
          description: 'Membership tier NFTs with point boost benefits',
          transferable: true,
          tiers: Object.values(NftTier).map((tier) => ({
            tier,
            ...TIER_NFT_CONFIG[tier],
          })),
        },
        {
          type: NftType.REWARD,
          name: 'Reward NFT',
          description: 'Special event or achievement rewards',
          transferable: true,
        },
        {
          type: NftType.CONNECTION,
          name: 'Connection NFT',
          description: 'Partnership or collaboration badges',
          transferable: false,
        },
      ],
    };
  }

  /**
   * User Pass 클레임 자격 확인
   */
  async checkUserPassEligibility(userId: string) {
    // 이미 User Pass를 보유 중인지 확인
    const existingPass = await this.prisma.user_nfts.findFirst({
      where: {
        user_id: userId,
        nft_type: NftType.SBT,
        name: USER_PASS_METADATA.name,
        is_burned: false,
      },
    });

    if (existingPass) {
      return {
        eligible: false,
        reason: 'User Pass already claimed',
        hasClaimed: true,
      };
    }

    // 클레임 조건 확인
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        social_accounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 조건 1: YouTube 채널 인증 완료
    const hasVerifiedYoutube = user.social_accounts.some(
      (acc) => acc.platform === 'YOUTUBE' && acc.is_verified === true,
    );

    // 조건 2: X 포스팅 완료 (추천링크 공유)
    // TODO: X 포스팅 추적 테이블 생성 후 구현
    const hasPostedOnX = false; // 임시

    const eligible = hasVerifiedYoutube || hasPostedOnX;

    return {
      eligible,
      reason: eligible
        ? 'Eligible to claim User Pass'
        : 'Complete YouTube verification or post on X to claim',
      conditions: {
        youtubeVerified: hasVerifiedYoutube,
        xPosted: hasPostedOnX,
      },
      hasClaimed: false,
    };
  }

  /**
   * User Pass 클레임
   * POST /api/v1/nfts/claim-user-pass
   */
  async claimUserPass(userId: string, dto: ClaimUserPassDto) {
    // 자격 확인
    const eligibility = await this.checkUserPassEligibility(userId);

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    // 지갑 연결 확인 및 업데이트 (화면기획 My Page_5: 지갑 연동 필수)
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { wallet_address: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 지갑 주소가 다르면 업데이트
    if (user.wallet_address !== dto.walletAddress) {
      await this.prisma.users.update({
        where: { id: userId },
        data: { wallet_address: dto.walletAddress },
      });
    }

    // User Pass NFT 생성
    const userPass = await this.prisma.user_nfts.create({
      data: {
        user_id: userId,
        nft_type: NftType.SBT,
        name: USER_PASS_METADATA.name,
        description: USER_PASS_METADATA.description,
        image_url: USER_PASS_METADATA.imageUrl,
        contract_address: NFT_CONTRACT_ADDRESSES.USER_PASS,
        chain_id: NFT_CONTRACT_ADDRESSES.CHAIN_ID,
        metadata: {
          ...USER_PASS_METADATA.attributes,
          issueDate: new Date().toISOString(),
          walletAddress: dto.walletAddress,
        } as any,
        minted_at: new Date(),
      },
    });

    // Boost 포인트 지급 (+2000점)
    await this.prisma.point_transactions.create({
      data: {
        user_id: userId,
        category: 'BOOST',
        amount: 2000,
        reason: 'SBT User Pass claimed',
        metadata: {
          nftId: userPass.id,
          nftType: NftType.SBT,
        },
      },
    });

    return {
      success: true,
      message: 'User Pass claimed successfully! +2000 Boost points awarded.',
      nft: this.formatNft(userPass),
    };
  }

  /**
   * 티어 NFT 업그레이드 (Background Job용 또는 수동 Claim)
   *
   * 정책:
   * - 티어형 NFT는 커뮤니티 이용자의 Claim 시, (교환) 발급
   * - 승격 시 보너스 포인트 지급 (누적 포인트 × 보너스 비율)
   *   - Bronze: 1%, Silver: 2%, Gold: 3%, Platinum: 5%, Diamond: 7%
   */
  async upgradeTierNft(userId: string, newTier: NftTier) {
    // 현재 포인트 조회
    const userPoints = await this.prisma.user_points.findUnique({
      where: { user_id: userId },
    });

    if (!userPoints) {
      throw new NotFoundException('User points not found');
    }

    const currentTotalPoints = userPoints.total_points;

    // 기존 티어 NFT 확인
    const existingTierNft = await this.prisma.user_nfts.findFirst({
      where: {
        user_id: userId,
        nft_type: NftType.TIER,
        is_burned: false,
      },
      orderBy: { tier: 'desc' },
    });

    // 기존 NFT가 있으면 burn 처리
    if (existingTierNft) {
      await this.prisma.user_nfts.update({
        where: { id: existingTierNft.id },
        data: {
          is_burned: true,
          burned_at: new Date(),
        },
      });
    }

    // 새 티어 NFT 생성
    const tierConfig = TIER_NFT_CONFIG[newTier];
    const newTierNft = await this.prisma.user_nfts.create({
      data: {
        user_id: userId,
        nft_type: NftType.TIER,
        name: tierConfig.name,
        description: tierConfig.description,
        image_url: tierConfig.imageUrl,
        tier: newTier,
        contract_address: NFT_CONTRACT_ADDRESSES.TIER,
        chain_id: NFT_CONTRACT_ADDRESSES.CHAIN_ID,
        metadata: {
          pointsRequired: tierConfig.pointsRequired,
          upgradeBonus: tierConfig.upgradeBonus,
          boostMultiplier: tierConfig.boostMultiplier,
          nextTier: tierConfig.nextTier,
          nextTierPoints: tierConfig.nextTierPoints,
        } as any,
        minted_at: new Date(),
      },
    });

    // 승격 보너스 포인트 지급
    const bonusPoints = Math.floor(currentTotalPoints * tierConfig.upgradeBonus);

    if (bonusPoints > 0) {
      // 포인트 트랜잭션 생성
      await this.prisma.point_transactions.create({
        data: {
          user_id: userId,
          category: 'BOOST',
          amount: bonusPoints,
          reason: `Tier upgrade bonus: ${tierConfig.name} (${Math.floor(tierConfig.upgradeBonus * 100)}%)`,
          metadata: {
            nftId: newTierNft.id,
            oldTier: existingTierNft?.tier || 0,
            newTier,
            bonusRate: tierConfig.upgradeBonus,
            basePoints: currentTotalPoints,
          },
        },
      });

      // user_points 업데이트
      await this.prisma.user_points.update({
        where: { user_id: userId },
        data: {
          slot_06_boost: { increment: bonusPoints },
          total_points: { increment: bonusPoints },
        },
      });
    }

    // 업그레이드 알림 발송
    await this.sendUpgradeNotification(userId, newTier, existingTierNft?.tier || 0);

    return {
      success: true,
      message: `Upgraded to ${tierConfig.name}! Bonus points awarded: +${bonusPoints}P`,
      oldTier: existingTierNft?.tier || null,
      newTier,
      bonusPoints,
      nft: this.formatNft(newTierNft),
    };
  }

  /**
   * 티어 업그레이드 알림 발송
   */
  private async sendUpgradeNotification(
    userId: string,
    newTier: NftTier,
    oldTier: number,
  ) {
    try {
      // 사용자 정보 조회
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { email: true, x_display_name: true },
      });

      if (!user || !user.email) {
        return; // 이메일 없으면 알림 스킵
      }

      const tierConfig = TIER_NFT_CONFIG[newTier];
      const oldTierName = oldTier > 0 ? TIER_NFT_CONFIG[oldTier].name : 'No Tier';

      // 이메일 발송
      await this.mailerService.sendMail({
        to: user.email,
        from: this.configService.get('EMAIL_FROM'),
        subject: `🎉 Congratulations! Tier Upgraded to ${tierConfig.name}`,
        html: this.getTierUpgradeEmailTemplate(
          user.x_display_name || 'User',
          oldTierName,
          tierConfig.name,
          tierConfig.boostMultiplier,
          tierConfig.imageUrl,
        ),
      });
    } catch (error) {
      // 알림 실패해도 업그레이드는 완료
      console.error(`Failed to send upgrade notification: ${error.message}`);
    }
  }

  /**
   * 티어 업그레이드 이메일 템플릿
   */
  private getTierUpgradeEmailTemplate(
    userName: string,
    oldTierName: string,
    newTierName: string,
    boostMultiplier: number,
    nftImageUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tier Upgraded!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 Tier Upgraded!</h1>
          </div>

          <!-- NFT Image -->
          <div style="padding: 30px; text-align: center; background: #f8f9fa;">
            <img src="${nftImageUrl}" alt="${newTierName}" style="width: 200px; height: 200px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);" />
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 18px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">
              Hi <strong>${userName}</strong>,
            </p>
            <p style="font-size: 16px; color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              Congratulations! Your XYLO NFT has been upgraded from <strong>${oldTierName}</strong> to <strong style="color: #667eea;">${newTierName}</strong>!
            </p>

            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #667eea; font-size: 20px; margin: 0 0 15px 0;">🎁 New Benefits</h2>
              <ul style="margin: 0; padding-left: 20px; color: #333;">
                <li style="margin-bottom: 10px;">
                  <strong>XLT Claim Boost:</strong> ${boostMultiplier}x multiplier
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Leaderboard Badge:</strong> ${newTierName} tier badge
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>Monthly Airdrop:</strong> Eligible for exclusive rewards
                </li>
                ${newTierName === 'Diamond Tier NFT' ? '<li style="margin-bottom: 10px;"><strong>VIP Access:</strong> Early access to new features</li>' : ''}
              </ul>
            </div>

            <p style="font-size: 16px; color: #666; line-height: 1.6; margin: 20px 0;">
              Keep up the great work and continue earning points to unlock even more rewards!
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://xylo.world/my-page" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                View My NFT
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #999; font-size: 12px;">
              © 2025 XYLO Fans. All rights reserved.
            </p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
              🤖 Generated with <a href="https://claude.com/claude-code" style="color: #667eea; text-decoration: none;">Claude Code</a>
            </p>
          </div>

        </div>
      </body>
      </html>
    `;
  }

  /**
   * NFT 소각 (Burn)
   * POST /api/v1/nfts/burn/:nftId
   *
   * 용도: 이벤트 티켓팅 시스템
   * - CONNECTION 타입 NFT만 소각 가능
   * - 이벤트 참여 증명으로 NFT를 소각
   */
  async burnNft(nftId: string, userId: string, dto: BurnNftDto) {
    // NFT 조회
    const nft = await this.prisma.user_nfts.findUnique({
      where: { id: nftId },
    });

    if (!nft) {
      throw new NotFoundException('NFT not found');
    }

    // 소유권 확인
    if (nft.user_id !== userId) {
      throw new ForbiddenException('You do not own this NFT');
    }

    // 이미 소각된 NFT인지 확인
    if (nft.is_burned) {
      throw new BadRequestException('NFT is already burned');
    }

    // CONNECTION 타입만 소각 가능 (이벤트 티켓)
    // SBT, TIER는 소각 불가
    if (nft.nft_type !== NftType.CONNECTION && nft.nft_type !== NftType.REWARD) {
      throw new BadRequestException(
        `Cannot burn ${nft.nft_type} NFT. Only CONNECTION and REWARD NFTs can be burned.`,
      );
    }

    // NFT 소각 처리
    const burnedNft = await this.prisma.user_nfts.update({
      where: { id: nftId },
      data: {
        is_burned: true,
        burned_at: new Date(),
        metadata: {
          ...(nft.metadata as any),
          burnReason: dto.reason || 'User initiated',
          burnedBy: userId,
        } as any,
      },
    });

    return {
      success: true,
      message: 'NFT burned successfully',
      nft: this.formatNft(burnedNft),
    };
  }

  /**
   * NFT 혜택 안내 조회
   * GET /api/v1/nfts/benefits
   *
   * 목적: NFT 업그레이드 동기 부여
   */
  async getNftBenefits(userId: string) {
    // 현재 티어 NFT 조회
    const currentTierNft = await this.prisma.user_nfts.findFirst({
      where: {
        user_id: userId,
        nft_type: NftType.TIER,
        is_burned: false,
      },
      orderBy: { tier: 'desc' },
    });

    // 현재 포인트 조회
    const userPoints = await this.prisma.user_points.findUnique({
      where: { user_id: userId },
    });

    const totalPoints = userPoints?.total_points || 0;
    const currentTier = currentTierNft?.tier || 0;

    // 티어가 없는 경우 Bronze(1)로 시작
    const actualTier = currentTier === 0 ? NftTier.BRONZE : currentTier;
    const currentConfig = TIER_NFT_CONFIG[actualTier];

    // 다음 티어 정보
    let nextTierInfo: any | null = null;
    if (currentConfig.nextTier) {
      const nextConfig = TIER_NFT_CONFIG[currentConfig.nextTier];
      const pointsNeeded = nextConfig.pointsRequired - totalPoints;

      nextTierInfo = {
        tier: currentConfig.nextTier,
        name: nextConfig.name,
        imageUrl: nextConfig.imageUrl,
        pointsRequired: nextConfig.pointsRequired,
        pointsNeeded: Math.max(0, pointsNeeded),
        boostMultiplier: nextConfig.boostMultiplier,
        progress: Math.min(100, Math.floor((totalPoints / nextConfig.pointsRequired) * 100)),
      };
    }

    return {
      currentTier: actualTier,
      currentTierName: currentConfig.name,
      currentBoost: currentConfig.boostMultiplier,
      totalPoints,
      nextTier: nextTierInfo,
      allTiers: Object.values(NftTier).map((tier) => {
        const config = TIER_NFT_CONFIG[tier];
        return {
          tier,
          name: config.name,
          imageUrl: config.imageUrl,
          pointsRequired: config.pointsRequired,
          boostMultiplier: config.boostMultiplier,
          isUnlocked: totalPoints >= config.pointsRequired,
          isCurrent: tier === actualTier,
        };
      }),
    };
  }

  /**
   * 리워드 NFT 발급 (관리자용)
   * POST /api/v1/nfts/issue-reward
   *
   * 화면기획 My Page_5: Limited Edition NFT
   * 발급 용도:
   * - 공모전 당선자
   * - 굿즈 구매자
   * - 한정판 이벤트 참여자
   */
  async issueRewardNft(dto: IssueRewardNftDto) {
    const { userId, name, description, imageUrl, eventType, metadata } = dto;

    // 사용자 존재 확인
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 리워드 NFT 생성
    const rewardNft = await this.prisma.user_nfts.create({
      data: {
        user_id: userId,
        nft_type: NftType.REWARD,
        name,
        description,
        image_url: imageUrl,
        contract_address: NFT_CONTRACT_ADDRESSES.TIER, // TODO: REWARD 전용 컨트랙트 추가
        chain_id: NFT_CONTRACT_ADDRESSES.CHAIN_ID,
        metadata: {
          eventType: eventType || 'LIMITED_EDITION',
          issueDate: new Date().toISOString(),
          isLimitedEdition: true,
          ...metadata,
        } as any,
        minted_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Reward NFT issued successfully',
      nft: this.formatNft(rewardNft),
    };
  }

  /**
   * NFT 데이터 포맷팅
   */
  private formatNft(nft: any) {
    return {
      id: nft.id,
      type: nft.nft_type,
      name: nft.name,
      description: nft.description,
      imageUrl: nft.image_url,
      tier: nft.tier,
      tokenId: nft.token_id?.toString() || null,
      contractAddress: nft.contract_address,
      chainId: nft.chain_id,
      metadata: nft.metadata,
      isBurned: nft.is_burned,
      burnedAt: nft.burned_at,
      mintedAt: nft.minted_at,
      createdAt: nft.created_at,
    };
  }
}
