import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterReferralDto } from './dto/register-referral.dto';

@Injectable()
export class ReferralService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 레퍼럴 코드 등록 (피추천인이 추천인 코드 입력)
   */
  async registerReferral(userId: string, dto: RegisterReferralDto) {
    // 자신의 레퍼럴 코드인지 확인
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.referral_code === dto.referralCode) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // 추천인 찾기
    const referrer = await this.prisma.users.findUnique({
      where: { referral_code: dto.referralCode },
    });

    if (!referrer) {
      throw new NotFoundException('Invalid referral code');
    }

    // 이미 레퍼럴 관계가 있는지 확인
    const existingReferral = await this.prisma.referrals.findFirst({
      where: {
        OR: [
          { referrer_id: referrer.id, referee_id: userId },
          { referee_id: userId },
        ],
      },
    });

    if (existingReferral) {
      throw new BadRequestException('Referral already exists');
    }

    // 레퍼럴 관계 생성
    const referral = await this.prisma.referrals.create({
      data: {
        referrer_id: referrer.id,
        referee_id: userId,
        referral_code: dto.referralCode,
        is_joined: true, // 가입 완료 (이미 로그인한 상태)
      },
    });

    return {
      id: referral.id,
      referrerId: referral.referrer_id,
      refereeId: referral.referee_id,
      referralCode: referral.referral_code,
      isJoined: referral.is_joined,
      isDiscordJoined: referral.is_discord_joined,
      isVideoPosted: referral.is_video_posted,
      isCompleted: referral.is_completed,
      createdAt: referral.created_at,
    };
  }

  /**
   * 내가 추천한 사용자 목록 조회
   */
  async getMyReferrals(userId: string) {
    const referrals = await this.prisma.referrals.findMany({
      where: { referrer_id: userId },
      orderBy: { created_at: 'desc' },
    });

    // 피추천인 정보 조회
    const referralDetails = await Promise.all(
      referrals.map(async (referral) => {
        const referee = await this.prisma.users.findUnique({
          where: { id: referral.referee_id },
          select: {
            id: true,
            x_handle: true,
            x_display_name: true,
            profile_image_url: true,
          },
        });

        // 피추천인이 삭제된 경우 null 처리
        return {
          id: referral.id,
          referee: referee || null,
          progress: {
            isJoined: referral.is_joined,
            isDiscordJoined: referral.is_discord_joined,
            isVideoPosted: referral.is_video_posted,
            isCompleted: referral.is_completed,
          },
          completedAt: referral.completed_at,
          createdAt: referral.created_at,
        };
      }),
    );

    return {
      total: referrals.length,
      completed: referrals.filter((r) => r.is_completed).length,
      referrals: referralDetails,
    };
  }

  /**
   * 나를 추천한 사용자 정보 조회
   */
  async getMyReferrer(userId: string) {
    const referral = await this.prisma.referrals.findFirst({
      where: { referee_id: userId },
    });

    if (!referral) {
      return null;
    }

    const referrer = await this.prisma.users.findUnique({
      where: { id: referral.referrer_id },
      select: {
        id: true,
        x_handle: true,
        x_display_name: true,
        profile_image_url: true,
        referral_code: true,
      },
    });

    // 추천인이 삭제된 경우 null 처리
    return {
      referrer: referrer || null,
      progress: {
        isJoined: referral.is_joined,
        isDiscordJoined: referral.is_discord_joined,
        isVideoPosted: referral.is_video_posted,
        isCompleted: referral.is_completed,
      },
      completedAt: referral.completed_at,
      createdAt: referral.created_at,
    };
  }

  /**
   * 레퍼럴 통계 조회
   */
  async getReferralStats(userId: string) {
    const referrals = await this.prisma.referrals.findMany({
      where: { referrer_id: userId },
    });

    return {
      total: referrals.length,
      completed: referrals.filter((r) => r.is_completed).length,
      pending: referrals.filter((r) => !r.is_completed).length,
      joinedOnly: referrals.filter(
        (r) => r.is_joined && !r.is_discord_joined && !r.is_video_posted,
      ).length,
      discordJoined: referrals.filter(
        (r) => r.is_joined && r.is_discord_joined && !r.is_video_posted,
      ).length,
      videoPosted: referrals.filter(
        (r) => r.is_joined && r.is_discord_joined && r.is_video_posted,
      ).length,
    };
  }

  /**
   * 내 추천링크 정보 조회
   * GET /api/v1/referrals/my-link
   */
  async getMyReferralLink(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { referral_code: true },
    });

    if (!user || !user.referral_code) {
      throw new NotFoundException('User or referral code not found');
    }

    const referralCode = user.referral_code;
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'https://xylo.world';
    const referralUrl = `${baseUrl}/?ref=${referralCode}`;

    // QR 코드 URL 생성 (무료 QR 코드 API 사용)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralUrl)}`;

    // 통계 조회
    const stats = await this.getReferralStats(userId);

    // 예상 포인트 계산 (완료된 추천 * 600P)
    const totalPointsEarned = stats.completed * 600;
    const pendingPoints = stats.pending * 600;

    return {
      referralCode,
      referralUrl,
      qrCodeUrl,
      shareText: `🎉 Join XYLO Fans and earn rewards together!\n\nUse my referral link: ${referralUrl}\n\n#XYLO #WITCHES #Web3Community`,
      stats: {
        totalReferrals: stats.total,
        completedReferrals: stats.completed,
        pendingReferrals: stats.pending,
        totalPointsEarned,
        pendingPoints,
      },
    };
  }

  /**
   * X(Twitter) 공유 URL 생성
   * GET /api/v1/referrals/x-share-url
   *
   * 비용 효율적 방식: 사용자가 직접 포스팅하도록 URL 생성
   * (X API 사용 시 $100/월 비용 발생)
   */
  async getXShareUrl(userId: string, type: string = 'referral') {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { referral_code: true, x_handle: true },
    });

    if (!user || !user.referral_code) {
      throw new NotFoundException('User or referral code not found');
    }

    const referralCode = user.referral_code;
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'https://xylo.world';
    const referralUrl = `${baseUrl}/?ref=${referralCode}`;

    let tweetText = '';
    let hashtags = 'XYLO,WITCHES,Web3Community';

    switch (type) {
      case 'referral':
        tweetText = `🎉 Join XYLO Fans and earn rewards together!\n\nUse my referral link: ${referralUrl}\n\n✨ Earn points through YouTube activities\n💎 Get NFT rewards\n🚀 Claim XLT tokens`;
        break;
      case 'achievement':
        tweetText = `🎉 Just earned my XYLO User Pass NFT!\n\nJoin XYLO Fans to earn rewards: ${referralUrl}`;
        hashtags = 'XYLO,WITCHES,NFT,Web3';
        break;
      case 'nft_upgrade':
        tweetText = `🎉 My XYLO NFT just got upgraded!\n\nJoin the community: ${referralUrl}`;
        hashtags = 'XYLO,WITCHES,NFT,Web3Community';
        break;
      default:
        tweetText = `Check out XYLO Fans! ${referralUrl}`;
    }

    // X Intent URL 생성 (사용자가 클릭하면 X 포스팅 화면으로 이동)
    const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&hashtags=${hashtags}`;

    return {
      shareUrl: xShareUrl,
      tweetText,
      referralUrl,
      type,
      note: 'Click this URL to share on X (formerly Twitter). No API costs!',
    };
  }
}
