import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { TutorialService } from './tutorial.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompleteTutorialDto } from './dto/complete-tutorial.dto';

@Controller('tutorial')
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  /**
   * 튜토리얼 카드 조회
   * GET /api/v1/tutorial/cards
   */
  @Get('cards')
  getCards() {
    return this.tutorialService.getCards();
  }

  /**
   * 튜토리얼 완료/스킵
   * POST /api/v1/tutorial/complete
   */
  @Post('complete')
  @UseGuards(JwtAuthGuard)
  async completeTutorial(@Req() req, @Body() dto: CompleteTutorialDto) {
    const { userId } = req.user as any;
    return this.tutorialService.completeTutorial(userId, dto.action);
  }

  /**
   * 튜토리얼 상태 조회
   * GET /api/v1/tutorial/status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req) {
    const { userId } = req.user as any;
    return this.tutorialService.getStatus(userId);
  }
}
