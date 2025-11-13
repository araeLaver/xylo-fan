import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { RegisterReferralDto } from './dto/register-referral.dto';
import { GetXShareUrlDto } from './dto/get-x-share-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * 레퍼럴 코드 등록
   * POST /api/v1/referrals/register
   */
  @Post('register')
  async registerReferral(@Req() req, @Body() dto: RegisterReferralDto) {
    return this.referralService.registerReferral(req.user.userId, dto);
  }

  /**
   * 내가 추천한 사용자 목록 조회
   * GET /api/v1/referrals/my-referrals
   */
  @Get('my-referrals')
  async getMyReferrals(@Req() req) {
    return this.referralService.getMyReferrals(req.user.userId);
  }

  /**
   * 나를 추천한 사용자 정보 조회
   * GET /api/v1/referrals/my-referrer
   */
  @Get('my-referrer')
  async getMyReferrer(@Req() req) {
    return this.referralService.getMyReferrer(req.user.userId);
  }

  /**
   * 레퍼럴 통계 조회
   * GET /api/v1/referrals/stats
   */
  @Get('stats')
  async getReferralStats(@Req() req) {
    return this.referralService.getReferralStats(req.user.userId);
  }

  /**
   * 내 추천링크 정보 조회
   * GET /api/v1/referrals/my-link
   */
  @Get('my-link')
  async getMyReferralLink(@Req() req) {
    return this.referralService.getMyReferralLink(req.user.userId);
  }

  /**
   * X(Twitter) 공유 URL 생성
   * GET /api/v1/referrals/x-share-url?type=referral
   */
  @Get('x-share-url')
  async getXShareUrl(@Req() req, @Query() dto: GetXShareUrlDto) {
    return this.referralService.getXShareUrl(req.user.userId, dto.type);
  }
}
