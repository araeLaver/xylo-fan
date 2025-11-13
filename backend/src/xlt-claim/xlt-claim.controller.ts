import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { XltClaimService } from './xlt-claim.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestXltClaimDto } from './dto/request-xlt-claim.dto';
import { GetXltClaimsDto } from './dto/get-xlt-claims.dto';
import type { Request } from 'express';

@Controller('xlt-claim')
export class XltClaimController {
  constructor(private readonly xltClaimService: XltClaimService) {}

  /**
   * XLT Claim 신청 자격 확인
   * GET /api/v1/xlt-claim/eligibility
   *
   * 조건:
   * - 최소 20,000 포인트 이상
   * - SBT (User Pass) 보유 필수
   * - MVP 기간 내 (2026.06.30까지)
   * - XLT 총 한도 미소진 (50만 XLT)
   */
  @Get('eligibility')
  @UseGuards(JwtAuthGuard)
  async checkEligibility(@Req() req: Request) {
    const { userId } = req.user as any;
    const eligibility = await this.xltClaimService.checkEligibility(userId);

    return {
      success: true,
      data: eligibility,
    };
  }

  /**
   * XLT Claim 신청
   * POST /api/v1/xlt-claim/request
   *
   * MVP 종료 후 실제 XLT 교환 가능
   */
  @Post('request')
  @UseGuards(JwtAuthGuard)
  async requestXltClaim(
    @Req() req: Request,
    @Body() dto: RequestXltClaimDto,
  ) {
    const { userId } = req.user as any;
    return this.xltClaimService.requestXltClaim(userId, dto);
  }

  /**
   * 내 XLT Claim 신청 내역 조회
   * GET /api/v1/xlt-claim/my-claims?status=PENDING&page=1&limit=10
   */
  @Get('my-claims')
  @UseGuards(JwtAuthGuard)
  async getMyXltClaims(@Req() req: Request, @Query() dto: GetXltClaimsDto) {
    const { userId } = req.user as any;
    return this.xltClaimService.getMyXltClaims(userId, dto);
  }

  /**
   * XLT Claim 전체 통계 조회 (공개)
   * GET /api/v1/xlt-claim/stats
   */
  @Get('stats')
  async getXltClaimStats() {
    return this.xltClaimService.getXltClaimStats();
  }
}
