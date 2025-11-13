import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { GetActivityStatsDto } from './dto/get-activity-stats.dto';

/**
 * 사용자 서비스
 *
 * 역할:
 * - 사용자 프로필 조회/수정
 * - 지갑 주소 연결
 * - YouTube 채널 목록 조회
 *
 * 인증:
 * - 모든 메서드는 JWT Guard로 보호
 * - userId는 req.user.id로 전달받음
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 사용자 ID로 프로필 조회
   *
   * @param {string} userId - 사용자 UUID
   * @returns {Promise<UserProfile>} 사용자 프로필 정보
   * @throws {NotFoundException} 사용자가 존재하지 않을 때
   *
   * API: GET /api/v1/users/me
   */
  async findById(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        x_id: true,
        x_handle: true,
        x_display_name: true,
        profile_image_url: true,
        email: true,
        wallet_address: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      xId: user.x_id,
      xHandle: user.x_handle,
      xDisplayName: user.x_display_name,
      profileImageUrl: user.profile_image_url,
      email: user.email,
      walletAddress: user.wallet_address,
      createdAt: user.created_at,
    };
  }

  /**
   * 프로필 업데이트
   *
   * @param {string} userId - 사용자 UUID
   * @param {UpdateProfileDto} updateProfileDto - 수정할 프로필 정보
   * @returns {Promise<UserProfile>} 업데이트된 사용자 프로필
   *
   * 수정 가능 항목:
   * - xDisplayName: 표시 이름
   * - profileImageUrl: 프로필 이미지 URL (화면기획 My Page_6)
   * - walletAddress: 지갑 주소
   * - email: 이메일 (화면기획 My Page_6)
   *
   * API: PATCH /api/v1/users/me
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.users.update({
      where: { id: userId },
      data: {
        x_display_name: updateProfileDto.xDisplayName,
        profile_image_url: updateProfileDto.profileImageUrl,
        wallet_address: updateProfileDto.walletAddress,
        email: updateProfileDto.email,
      },
      select: {
        id: true,
        x_id: true,
        x_handle: true,
        x_display_name: true,
        profile_image_url: true,
        email: true,
        wallet_address: true,
        created_at: true,
      },
    });

    return {
      id: user.id,
      xId: user.x_id,
      xHandle: user.x_handle,
      xDisplayName: user.x_display_name,
      profileImageUrl: user.profile_image_url,
      email: user.email,
      walletAddress: user.wallet_address,
      createdAt: user.created_at,
    };
  }

  /**
   * 지갑 연결 (Polygon Mumbai Testnet)
   *
   * @param {string} userId - 사용자 UUID
   * @param {ConnectWalletDto} connectWalletDto - 지갑 주소 (0x...)
   * @returns {Promise<UserProfile>} 업데이트된 사용자 프로필
   *
   * 용도:
   * - NFT(SBT) 발행 시 필요한 지갑 주소 저장
   * - users.wallet_address는 UNIQUE 제약 (1 지갑 1 계정)
   *
   * 검증:
   * - DTO에서 isEthereumAddress() 검증 (0x + 40자리 hex)
   *
   * API: POST /api/v1/users/wallet
   */
  async connectWallet(userId: string, connectWalletDto: ConnectWalletDto) {
    const user = await this.prisma.users.update({
      where: { id: userId },
      data: {
        wallet_address: connectWalletDto.walletAddress,
      },
      select: {
        id: true,
        x_id: true,
        x_handle: true,
        x_display_name: true,
        profile_image_url: true,
        email: true,
        wallet_address: true,
        created_at: true,
      },
    });

    return {
      id: user.id,
      xId: user.x_id,
      xHandle: user.x_handle,
      xDisplayName: user.x_display_name,
      profileImageUrl: user.profile_image_url,
      email: user.email,
      walletAddress: user.wallet_address,
      createdAt: user.created_at,
    };
  }

  /**
   * 사용자의 YouTube 채널 목록 조회
   *
   * @param {string} userId - 사용자 UUID
   * @returns {Promise<YouTubeChannel[]>} 등록된 채널 목록
   *
   * 정렬:
   * - 최신 등록 순 (created_at DESC)
   *
   * 인증 상태:
   * - is_verified: false → 채널 description에 verification_code 추가 필요
   * - is_verified: true → 포인트 적립 가능
   *
   * 포인트 적립 조건:
   * - is_verified = true
   * - #WITCHES 또는 #XYLO 태그 포함 영상
   * - 1000 조회수당 1P (최대 일 1000P)
   *
   * API: GET /api/v1/users/me/channels
   */
  async getUserChannels(userId: string) {
    const channels = await this.prisma.youtube_channels.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        channel_id: true,
        channel_title: true,
        channel_url: true,
        thumbnail_url: true,
        subscriber_count: true,
        video_count: true,
        view_count: true,
        is_verified: true,
        verification_code: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc', // 최신 등록 채널 우선
      },
    });

    // DB 스네이크 케이스 → 프론트엔드 카멜 케이스 변환
    return channels.map((channel) => ({
      id: channel.id,
      channelId: channel.channel_id,
      channelTitle: channel.channel_title,
      channelUrl: channel.channel_url,
      thumbnailUrl: channel.thumbnail_url,
      subscriberCount: channel.subscriber_count,
      videoCount: channel.video_count,
      viewCount: channel.view_count,
      isVerified: channel.is_verified,
      verificationCode: channel.verification_code,
      createdAt: channel.created_at,
      updatedAt: channel.updated_at,
    }));
  }

  /**
   * 소셜 계정 연동 상태 조회
   * GET /api/v1/users/me/social-accounts
   *
   * 화면기획 My Page_6: 채널 연동 상태 표시
   * - YouTube: Connect/@채널명
   * - X: Connect/@핸들
   * - Instagram: Not yet (Coming soon)
   * - Discord: Not yet (Coming soon)
   */
  async getSocialAccountsStatus(userId: string) {
    const socialAccounts = await this.prisma.social_accounts.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        platform: true,
        handle: true,
        display_name: true,
        profile_image: true,
        is_verified: true,
        connected_at: true,
      },
      orderBy: {
        connected_at: 'desc',
      },
    });

    // 플랫폼별로 매핑
    const platformStatus = {
      YOUTUBE: null as any,
      X: null as any,
      INSTAGRAM: null as any,
      DISCORD: null as any,
    };

    socialAccounts.forEach((account) => {
      platformStatus[account.platform] = {
        id: account.id,
        platform: account.platform,
        handle: account.handle,
        displayName: account.display_name,
        profileImage: account.profile_image,
        isVerified: account.is_verified,
        connectedAt: account.connected_at,
        status: 'connected',
      };
    });

    // 연결되지 않은 플랫폼 처리
    Object.keys(platformStatus).forEach((platform) => {
      if (!platformStatus[platform]) {
        // Instagram과 Discord는 "Coming soon" 상태
        if (platform === 'INSTAGRAM' || platform === 'DISCORD') {
          platformStatus[platform] = {
            platform,
            status: 'coming_soon',
            message: 'Coming soon...',
          };
        } else {
          // YouTube와 X는 연결 가능
          platformStatus[platform] = {
            platform,
            status: 'not_connected',
            message: 'Not yet Connected',
          };
        }
      }
    });

    return {
      youtube: platformStatus.YOUTUBE,
      x: platformStatus.X,
      instagram: platformStatus.INSTAGRAM,
      discord: platformStatus.DISCORD,
    };
  }

  /**
   * 활동 상세 통계 조회
   * GET /api/v1/users/me/activity-stats?period=7d
   *
   * 목적: 포인트 계산 근거 투명화
   */
  async getActivityStats(userId: string, dto: GetActivityStatsDto) {
    const { period = '7d' } = dto;

    // 기간 계산
    const startDate = new Date();
    if (period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(startDate.getDate() - 90);
    } else {
      // 'all' - 계정 생성일부터
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { created_at: true },
      });
      startDate.setTime(user?.created_at?.getTime() || Date.now());
    }

    // 사용자의 YouTube 채널 목록
    const channels = await this.prisma.youtube_channels.findMany({
      where: { user_id: userId, is_verified: true },
      select: { id: true },
    });

    if (channels.length === 0) {
      return {
        period,
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        pointsEarned: {
          fromViews: 0,
          fromLikes: 0,
          fromComments: 0,
          total: 0,
        },
        topVideos: [],
      };
    }

    const channelIds = channels.map((c) => c.id);

    // 비디오 목록 조회
    const videos = await this.prisma.youtube_videos.findMany({
      where: {
        channel_id: { in: channelIds },
        published_at: { gte: startDate },
      },
      select: {
        id: true,
        video_id: true,
        title: true,
        view_count: true,
        like_count: true,
        comment_count: true,
      },
      orderBy: {
        view_count: 'desc',
      },
    });

    // 통계 집계
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    videos.forEach((video) => {
      totalViews += video.view_count || 0;
      totalLikes += video.like_count || 0;
      totalComments += video.comment_count || 0;
    });

    // 포인트 계산 (1 view = 1P, 1 like = 1P, 1 comment = 3P)
    const fromViews = totalViews;
    const fromLikes = totalLikes;
    const fromComments = totalComments * 3;

    // 상위 비디오 5개
    const topVideos = videos.slice(0, 5).map((video) => {
      const videoPoints = (video.view_count || 0) +
        (video.like_count || 0) +
        (video.comment_count || 0) * 3;

      return {
        videoId: video.video_id,
        title: video.title,
        views: video.view_count || 0,
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        pointsEarned: videoPoints,
      };
    });

    return {
      period,
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      totalComments,
      pointsEarned: {
        fromViews,
        fromLikes,
        fromComments,
        total: fromViews + fromLikes + fromComments,
      },
      topVideos,
    };
  }
}
