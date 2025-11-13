import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * 리더보드 조회 (기간별 필터링, 정렬, 페이지네이션 지원)
   * 화면기획 Leaderboards: 전체 기능 통합
   */
  async getLeaderboard(query: GetLeaderboardDto) {
    const { period, category = 'total', sort = 'desc', page = 1, limit = 10, offset } = query;

    // offset이 명시적으로 제공되면 사용, 아니면 page 기반으로 계산
    const skip = offset !== undefined ? offset : (page - 1) * limit;

    // 최신 스냅샷 날짜 조회
    const latestSnapshot = await this.prisma.leaderboard_entries.findFirst({
      where: { period: period as any },
      orderBy: { snapshot_date: 'desc' },
      select: { snapshot_date: true },
    });

    if (!latestSnapshot) {
      return {
        period,
        category,
        sort,
        snapshotDate: null,
        total: 0,
        page,
        limit,
        totalPages: 0,
        entries: [],
      };
    }

    // 카테고리별 정렬 컬럼 결정
    const getCategoryField = (cat: string) => {
      switch (cat) {
        case 'contents': return 'contents';
        case 'referral': return 'mgm';
        case 'event': return 'event';
        case 'profit': return 'profit';
        case 'boost': return 'boost';
        case 'sponsor': return 'sponsor';
        case 'total':
        default: return 'total_current';
      }
    };

    const sortField = getCategoryField(category);

    // 정렬 옵션 설정 (화면기획 5번: Highest/Lowest first)
    const orderBy =
      sort === 'asc'
        ? { [sortField]: 'asc' as const } // Lowest first
        : { [sortField]: 'desc' as const }; // Highest first

    // 해당 날짜의 리더보드 엔트리 조회
    const [entries, total] = await Promise.all([
      this.prisma.leaderboard_entries.findMany({
        where: {
          period: period as any,
          snapshot_date: latestSnapshot.snapshot_date,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.leaderboard_entries.count({
        where: {
          period: period as any,
          snapshot_date: latestSnapshot.snapshot_date,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      period,
      category,
      sort,
      snapshotDate: latestSnapshot.snapshot_date,
      total,
      page,
      limit,
      totalPages,
      entries: entries.map((entry) => ({
        rank: entry.rank,
        userId: entry.user_id,
        channelId: entry.channel_id,
        totalPoints: entry.total_current,
        points: {
          contents: entry.contents,
          referral: entry.mgm, // 화면기획: MGM → REFERRAL
          event: entry.event,
          profit: entry.profit,
          boost: entry.boost,
        },
        channel: {
          title: entry.channel_title,
          imageUrl: entry.channel_image_url,
        },
        user: {
          xHandle: entry.x_handle,
          profileImageUrl: entry.profile_image_url,
        },
      })),
    };
  }

  /**
   * 특정 사용자의 랭킹 조회
   */
  async getUserRank(userId: string, period: string = 'ALL') {
    // 최신 스냅샷 날짜 조회
    const latestSnapshot = await this.prisma.leaderboard_entries.findFirst({
      where: { period: period as any },
      orderBy: { snapshot_date: 'desc' },
      select: { snapshot_date: true },
    });

    if (!latestSnapshot) {
      return null;
    }

    // 사용자의 모든 채널 랭킹 조회
    const userEntries = await this.prisma.leaderboard_entries.findMany({
      where: {
        user_id: userId,
        period: period as any,
        snapshot_date: latestSnapshot.snapshot_date,
      },
      orderBy: { rank: 'asc' },
    });

    if (userEntries.length === 0) {
      return null;
    }

    // 최고 순위 채널 반환
    const bestEntry = userEntries[0];

    return {
      period,
      snapshotDate: latestSnapshot.snapshot_date,
      rank: bestEntry.rank,
      channelId: bestEntry.channel_id,
      totalPoints: bestEntry.total_current,
      points: {
        contents: bestEntry.contents,
        referral: bestEntry.mgm, // 화면기획: MGM → REFERRAL
        event: bestEntry.event,
        profit: bestEntry.profit,
        boost: bestEntry.boost,
      },
      channel: {
        title: bestEntry.channel_title,
        imageUrl: bestEntry.channel_image_url,
      },
      allChannels: userEntries.map((entry) => ({
        channelId: entry.channel_id,
        rank: entry.rank,
        channelTitle: entry.channel_title,
      })),
    };
  }

  /**
   * Top3 리더보드 조회
   * 화면기획 Leaderboards 4번: Top3 카드 노출
   */
  async getTop3(period: string = 'ALL') {
    // 최신 스냅샷 날짜 조회
    const latestSnapshot = await this.prisma.leaderboard_entries.findFirst({
      where: { period: period as any },
      orderBy: { snapshot_date: 'desc' },
      select: { snapshot_date: true },
    });

    if (!latestSnapshot) {
      return {
        period,
        snapshotDate: null,
        top3: [],
      };
    }

    // Top3 엔트리 조회
    const top3Entries = await this.prisma.leaderboard_entries.findMany({
      where: {
        period: period as any,
        snapshot_date: latestSnapshot.snapshot_date,
      },
      orderBy: { rank: 'asc' },
      take: 3,
    });

    return {
      period,
      snapshotDate: latestSnapshot.snapshot_date,
      top3: top3Entries.map((entry) => ({
        rank: entry.rank,
        userId: entry.user_id,
        channelId: entry.channel_id,
        totalPoints: entry.total_current,
        points: {
          contents: entry.contents,
          referral: entry.mgm,
          event: entry.event,
          profit: entry.profit,
          boost: entry.boost,
        },
        channel: {
          title: entry.channel_title,
          imageUrl: entry.channel_image_url,
          url: `https://www.youtube.com/channel/${entry.channel_id}`,
        },
        user: {
          xHandle: entry.x_handle,
          profileImageUrl: entry.profile_image_url,
        },
      })),
    };
  }

  /**
   * 리더보드 통계 조회
   */
  async getLeaderboardStats(period: string = 'ALL') {
    // 최신 스냅샷 날짜 조회
    const latestSnapshot = await this.prisma.leaderboard_entries.findFirst({
      where: { period: period as any },
      orderBy: { snapshot_date: 'desc' },
      select: { snapshot_date: true },
    });

    if (!latestSnapshot) {
      return null;
    }

    const stats = await this.prisma.leaderboard_entries.aggregate({
      where: {
        period: period as any,
        snapshot_date: latestSnapshot.snapshot_date,
      },
      _count: true,
      _avg: {
        total_current: true,
      },
      _sum: {
        total_current: true,
      },
      _max: {
        total_current: true,
      },
      _min: {
        total_current: true,
      },
    });

    return {
      period,
      snapshotDate: latestSnapshot.snapshot_date,
      totalEntries: stats._count,
      averagePoints: Math.round(stats._avg.total_current || 0),
      totalPoints: stats._sum.total_current || 0,
      maxPoints: stats._max.total_current || 0,
      minPoints: stats._min.total_current || 0,
    };
  }
}
