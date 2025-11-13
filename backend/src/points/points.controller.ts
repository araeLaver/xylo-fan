import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetPointsHistoryDto } from './dto/get-points-history.dto';
import type { Request } from 'express';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private pointsService: PointsService) {}

  /**
   * 현재 포인트 조회 (6-slot)
   * GET /api/v1/points
   */
  @Get()
  async getCurrentPoints(@Req() req: Request) {
    const { userId } = req.user as any;
    const points = await this.pointsService.getCurrentPoints(userId);

    return {
      success: true,
      data: points,
    };
  }

  /**
   * 포인트 트랜잭션 히스토리 조회
   * GET /api/v1/points/history
   */
  @Get('history')
  async getPointsHistory(
    @Req() req: Request,
    @Query() query: GetPointsHistoryDto,
  ) {
    const { userId } = req.user as any;
    const history = await this.pointsService.getPointsHistory(userId, query);

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Daily 포인트 히스토리 조회
   * GET /api/v1/points/daily?days=30
   */
  @Get('daily')
  async getDailyHistory(
    @Req() req: Request,
    @Query('days') days?: string,
  ) {
    const { userId } = req.user as any;
    const daysNum = days ? parseInt(days) : 30;
    const history = await this.pointsService.getDailyHistory(userId, daysNum);

    return {
      success: true,
      data: history,
    };
  }

  /**
   * 슬롯별 포인트 조회
   * GET /api/v1/points/by-slot
   */
  @Get('by-slot')
  async getPointsBySlot(@Req() req: Request) {
    const { userId } = req.user as any;
    const points = await this.pointsService.getPointsBySlot(userId);

    return {
      success: true,
      data: points,
    };
  }
}
