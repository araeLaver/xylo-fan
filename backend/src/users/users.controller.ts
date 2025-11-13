import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConnectWalletDto } from './dto/connect-wallet.dto';
import { GetActivityStatsDto } from './dto/get-activity-stats.dto';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * 현재 로그인한 사용자 프로필 조회
   * GET /api/v1/users/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Req() req: Request) {
    const { userId } = req.user as any;
    const user = await this.usersService.findById(userId);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * 현재 로그인한 사용자 프로필 업데이트
   * PATCH /api/v1/users/me
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const { userId } = req.user as any;
    const user = await this.usersService.updateProfile(userId, updateProfileDto);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * 지갑 연결
   * POST /api/v1/users/me/wallet
   */
  @Post('me/wallet')
  @UseGuards(JwtAuthGuard)
  async connectWallet(
    @Req() req: Request,
    @Body() connectWalletDto: ConnectWalletDto,
  ) {
    const { userId } = req.user as any;
    const user = await this.usersService.connectWallet(userId, connectWalletDto);

    return {
      success: true,
      data: user,
    };
  }

  /**
   * 현재 로그인한 사용자의 YouTube 채널 목록 조회
   * GET /api/v1/users/me/channels
   */
  @Get('me/channels')
  @UseGuards(JwtAuthGuard)
  async getMyChannels(@Req() req: Request) {
    const { userId } = req.user as any;
    const channels = await this.usersService.getUserChannels(userId);

    return {
      success: true,
      data: channels,
    };
  }

  /**
   * 소셜 계정 연동 상태 조회
   * GET /api/v1/users/me/social-accounts
   *
   * 화면기획 My Page_6: 채널 버튼 상태 표시
   */
  @Get('me/social-accounts')
  @UseGuards(JwtAuthGuard)
  async getSocialAccounts(@Req() req: Request) {
    const { userId } = req.user as any;
    const accounts = await this.usersService.getSocialAccountsStatus(userId);

    return {
      success: true,
      data: accounts,
    };
  }

  /**
   * 활동 상세 통계 조회
   * GET /api/v1/users/me/activity-stats?period=7d
   */
  @Get('me/activity-stats')
  @UseGuards(JwtAuthGuard)
  async getActivityStats(@Req() req: Request, @Query() dto: GetActivityStatsDto) {
    const { userId } = req.user as any;
    const stats = await this.usersService.getActivityStats(userId, dto);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 특정 사용자 프로필 조회 (공개)
   * GET /api/v1/users/:id
   */
  @Get(':id')
  async getUserProfile(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    return {
      success: true,
      data: user,
    };
  }
}
