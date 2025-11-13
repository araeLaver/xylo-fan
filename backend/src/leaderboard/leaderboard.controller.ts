import { Controller, Get, Query, Param } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * 리더보드 조회
   * GET /api/v1/leaderboard?period=1D&limit=100&offset=0
   */
  @Get()
  async getLeaderboard(@Query() query: GetLeaderboardDto) {
    return this.leaderboardService.getLeaderboard(query);
  }

  /**
   * 특정 사용자의 랭킹 조회
   * GET /api/v1/leaderboard/user/:userId?period=ALL
   */
  @Get('user/:userId')
  async getUserRank(
    @Param('userId') userId: string,
    @Query('period') period?: string,
  ) {
    return this.leaderboardService.getUserRank(userId, period);
  }

  /**
   * Top3 리더보드 조회
   * GET /api/v1/leaderboard/top3?period=1W
   *
   * 화면기획 Leaderboards 4번: Top3 카드 노출
   */
  @Get('top3')
  async getTop3(@Query('period') period?: string) {
    return this.leaderboardService.getTop3(period);
  }

  /**
   * 리더보드 통계 조회
   * GET /api/v1/leaderboard/stats?period=ALL
   */
  @Get('stats')
  async getStats(@Query('period') period?: string) {
    return this.leaderboardService.getLeaderboardStats(period);
  }
}
