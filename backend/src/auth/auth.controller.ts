import { Controller, Get, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TwitterAuthGuard } from './guards/twitter-auth.guard';
import { DiscordAuthGuard } from './guards/discord-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RecoverAccountDto } from './dto/recover-account.dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Twitter OAuth 로그인 시작
   * GET /api/v1/auth/twitter
   */
  @Get('twitter')
  @UseGuards(TwitterAuthGuard)
  async twitterLogin() {
    // TwitterAuthGuard가 자동으로 리다이렉트 처리
  }

  /**
   * Twitter OAuth 콜백
   * GET /api/v1/auth/twitter/callback
   */
  @Get('twitter/callback')
  @UseGuards(TwitterAuthGuard)
  async twitterCallback(@Req() req: Request, @Res() res: Response) {
    // req.user에 TwitterStrategy의 validate 결과가 담김
    const twitterProfile = req.user as any;

    // 로그인/회원가입 처리
    const result = await this.authService.loginOrRegister({
      xId: twitterProfile.xId,
      xHandle: twitterProfile.xHandle,
      xDisplayName: twitterProfile.xDisplayName,
      profileImageUrl: twitterProfile.profileImageUrl,
      email: twitterProfile.email,
      accessToken: twitterProfile.accessToken,
      accessTokenSecret: twitterProfile.accessTokenSecret,
    });

    // TODO: 프론트엔드 URL로 리다이렉트하면서 토큰 전달
    // 개발 환경에서는 JSON으로 반환
    return res.json({
      success: true,
      data: result,
    });
  }

  /**
   * 현재 로그인한 사용자 정보 조회
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    // req.user에 JwtStrategy의 validate 결과가 담김
    const { userId } = req.user as any;

    const user = await this.authService.validateUser(userId);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * 이메일로 인증번호 발송
   * POST /api/v1/auth/email/send-code
   * Rate Limit: 동일 IP 1분당 3회
   */
  @Post('email/send-code')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1분당 3회
  async sendVerificationCode(@Body() dto: SendCodeDto, @Req() req: Request) {
    return this.authService.sendVerificationCode(
      dto.email,
      req.ip,
      req.headers['user-agent'],
    );
  }

  /**
   * 인증번호 검증
   * POST /api/v1/auth/email/verify-code
   */
  @Post('email/verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.email, dto.code);
  }

  /**
   * 계정 복구 (JWT 발급)
   * POST /api/v1/auth/email/recover
   */
  @Post('email/recover')
  async recoverAccount(@Body() dto: RecoverAccountDto) {
    return this.authService.recoverAccount(dto.verificationId);
  }

  /**
   * Discord OAuth 로그인 시작
   * GET /api/v1/auth/discord
   */
  @Get('discord')
  @UseGuards(DiscordAuthGuard)
  async discordLogin() {
    // DiscordAuthGuard가 자동으로 리다이렉트 처리
  }

  /**
   * Discord OAuth 콜백
   * GET /api/v1/auth/discord/callback
   */
  @Get('discord/callback')
  @UseGuards(DiscordAuthGuard)
  async discordCallback(@Req() req: Request, @Res() res: Response) {
    const discordData = req.user as any;

    try {
      // Discord 연동 처리
      const result = await this.authService.handleDiscordCallback(discordData);

      // 프론트엔드로 리다이렉트
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/discord/success?data=${encodeURIComponent(JSON.stringify(result))}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/discord/error?message=${encodeURIComponent(error.message)}`);
    }
  }
}
