import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestXltClaimDto } from './dto/request-xlt-claim.dto';
import { GetXltClaimsDto } from './dto/get-xlt-claims.dto';
import {
  XLT_CLAIM_MIN_POINTS,
  XLT_EXCHANGE_RATE,
  XLT_MAX_TOTAL_SUPPLY,
  MVP_END_DATE,
  XltClaimStatus,
  XltClaimEligibility,
} from './constants/xlt-claim.constant';
import { NftType } from '../nft/enums/nft-type.enum';

@Injectable()
export class XltClaimService {
  constructor(private prisma: PrismaService) {}

  /**
   * XLT Claim 신청 자격 확인
   *
   * 조건:
   * 1. 최소 20,000 포인트 이상 보유
   * 2. SBT (User Pass) 보유 필수
   * 3. MVP 기간 내 (2026.06.30까지)
   * 4. XLT 총 한도 미소진 (50만 XLT)
   */
  async checkEligibility(userId: string): Promise<XltClaimEligibility> {
    // 1. 현재 포인트 조회
    const userPoints = await this.prisma.user_points.findUnique({
      where: { user_id: userId },
    });

    const currentPoints = userPoints?.total_points || 0;

    // 2. SBT (User Pass) 보유 확인
    const userPass = await this.prisma.user_nfts.findFirst({
      where: {
        user_id: userId,
        nft_type: NftType.SBT,
        is_burned: false,
      },
    });

    const hasSbt = !!userPass;

    // 3. 총 지급된 XLT 조회
    const totalClaimedResult = await this.prisma.xlt_claim_requests.aggregate({
      where: {
        status: { in: [XltClaimStatus.APPROVED, XltClaimStatus.COMPLETED] },
      },
      _sum: {
        xlt_amount: true,
      },
    });

    const totalClaimedXlt = Number(totalClaimedResult._sum.xlt_amount) || 0;

    // 4. MVP 기간 확인
    const now = new Date();
    const isWithinMvpPeriod = now <= MVP_END_DATE;

    // 자격 판단
    const eligible =
      currentPoints >= XLT_CLAIM_MIN_POINTS &&
      hasSbt &&
      isWithinMvpPeriod &&
      totalClaimedXlt < XLT_MAX_TOTAL_SUPPLY;

    let reason = '';
    if (!eligible) {
      if (currentPoints < XLT_CLAIM_MIN_POINTS) {
        reason = `Minimum ${XLT_CLAIM_MIN_POINTS} points required. Current: ${currentPoints}P`;
      } else if (!hasSbt) {
        reason = 'SBT (User Pass) required. Please claim your User Pass first.';
      } else if (!isWithinMvpPeriod) {
        reason = `MVP period ended (${MVP_END_DATE.toISOString()})`;
      } else if (totalClaimedXlt >= XLT_MAX_TOTAL_SUPPLY) {
        reason = `XLT maximum supply reached (${XLT_MAX_TOTAL_SUPPLY} XLT)`;
      }
    }

    return {
      eligible,
      reason: eligible ? undefined : reason,
      minPoints: XLT_CLAIM_MIN_POINTS,
      currentPoints,
      hasSbt,
      totalClaimedXlt,
      maxTotalXlt: XLT_MAX_TOTAL_SUPPLY,
      isWithinMvpPeriod,
    };
  }

  /**
   * XLT Claim 신청
   *
   * MVP 종료 후 실제 XLT 교환 가능
   */
  async requestXltClaim(
    userId: string,
    dto: RequestXltClaimDto,
  ): Promise<any> {
    // 자격 확인
    const eligibility = await this.checkEligibility(userId);

    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    // 신청 포인트가 현재 포인트보다 많은지 확인
    if (dto.points > eligibility.currentPoints) {
      throw new BadRequestException(
        `Insufficient points. Available: ${eligibility.currentPoints}P, Requested: ${dto.points}P`,
      );
    }

    // XLT 수량 계산 (포인트 → 원 → XLT)
    // 예: 20,000P → 20,000원 → 100 XLT (1 XLT = 200원)
    const krwAmount = dto.points; // 1P = 1원 가정
    const xltAmount = krwAmount / XLT_EXCHANGE_RATE;

    // 남은 XLT 한도 확인
    const remainingXlt = XLT_MAX_TOTAL_SUPPLY - eligibility.totalClaimedXlt;
    if (xltAmount > remainingXlt) {
      throw new BadRequestException(
        `Insufficient XLT supply. Available: ${remainingXlt} XLT, Requested: ${xltAmount} XLT`,
      );
    }

    // XLT Claim 신청 생성
    const claimRequest = await this.prisma.xlt_claim_requests.create({
      data: {
        user_id: userId,
        points_claimed: dto.points,
        xlt_amount: xltAmount,
        wallet_address: dto.walletAddress,
        status: XltClaimStatus.PENDING,
        memo: dto.memo,
      },
    });

    return {
      success: true,
      message: 'XLT Claim request submitted successfully',
      claimId: claimRequest.id,
      pointsClaimed: claimRequest.points_claimed,
      xltAmount: Number(claimRequest.xlt_amount),
      status: claimRequest.status,
      note: 'XLT will be distributed after MVP period ends (2026.06.30)',
    };
  }

  /**
   * 내 XLT Claim 신청 내역 조회
   */
  async getMyXltClaims(
    userId: string,
    dto: GetXltClaimsDto,
  ): Promise<any> {
    const { status, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      user_id: userId,
    };

    if (status) {
      whereClause.status = status;
    }

    const [claims, total] = await Promise.all([
      this.prisma.xlt_claim_requests.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.xlt_claim_requests.count({ where: whereClause }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      claims: claims.map((claim) => ({
        id: claim.id,
        pointsClaimed: claim.points_claimed,
        xltAmount: Number(claim.xlt_amount),
        walletAddress: claim.wallet_address,
        status: claim.status,
        memo: claim.memo,
        rejectionReason: claim.rejection_reason,
        approvedAt: claim.approved_at,
        completedAt: claim.completed_at,
        createdAt: claim.created_at,
      })),
    };
  }

  /**
   * XLT Claim 전체 통계 조회
   */
  async getXltClaimStats(): Promise<any> {
    const [totalRequests, approvedSum, completedSum] = await Promise.all([
      this.prisma.xlt_claim_requests.count(),
      this.prisma.xlt_claim_requests.aggregate({
        where: { status: XltClaimStatus.APPROVED },
        _sum: { xlt_amount: true, points_claimed: true },
      }),
      this.prisma.xlt_claim_requests.aggregate({
        where: { status: XltClaimStatus.COMPLETED },
        _sum: { xlt_amount: true, points_claimed: true },
      }),
    ]);

    const totalXltClaimed =
      Number(approvedSum._sum.xlt_amount || 0) +
      Number(completedSum._sum.xlt_amount || 0);

    const remainingXlt = XLT_MAX_TOTAL_SUPPLY - totalXltClaimed;
    const progressPercentage = (totalXltClaimed / XLT_MAX_TOTAL_SUPPLY) * 100;

    return {
      totalRequests,
      totalXltClaimed,
      maxTotalXlt: XLT_MAX_TOTAL_SUPPLY,
      remainingXlt,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      mvpEndDate: MVP_END_DATE.toISOString(),
      exchangeRate: XLT_EXCHANGE_RATE,
    };
  }
}
