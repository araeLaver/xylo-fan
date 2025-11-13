import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterChannelDto } from './dto/register-channel.dto';
import { VerifyChannelDto } from './dto/verify-channel.dto';
import type { Request } from 'express';

@Controller('youtube')
@UseGuards(JwtAuthGuard)
export class YoutubeController {
  constructor(private youtubeService: YoutubeService) {}

  /**
   * 채널 등록
   * POST /api/v1/youtube/channels
   */
  @Post('channels')
  async registerChannel(
    @Req() req: Request,
    @Body() registerChannelDto: RegisterChannelDto,
  ) {
    const { userId } = req.user as any;
    const channel = await this.youtubeService.registerChannel(
      userId,
      registerChannelDto,
    );

    return {
      success: true,
      data: channel,
    };
  }

  /**
   * 채널 인증
   * POST /api/v1/youtube/channels/verify
   */
  @Post('channels/verify')
  async verifyChannel(
    @Req() req: Request,
    @Body() verifyChannelDto: VerifyChannelDto,
  ) {
    const { userId } = req.user as any;
    const result = await this.youtubeService.verifyChannel(
      userId,
      verifyChannelDto,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 채널 상세 정보 조회
   * GET /api/v1/youtube/channels/:id
   */
  @Get('channels/:id')
  async getChannelDetails(@Req() req: Request, @Param('id') id: string) {
    const { userId } = req.user as any;
    const channel = await this.youtubeService.getChannelDetails(userId, id);

    return {
      success: true,
      data: channel,
    };
  }

  /**
   * 채널 삭제
   * DELETE /api/v1/youtube/channels/:id
   */
  @Delete('channels/:id')
  async deleteChannel(@Req() req: Request, @Param('id') id: string) {
    const { userId } = req.user as any;
    const result = await this.youtubeService.deleteChannel(userId, id);

    return {
      success: true,
      data: result,
    };
  }
}
