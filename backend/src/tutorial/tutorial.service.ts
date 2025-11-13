import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUTORIAL_CARDS } from './constants/tutorial-cards.constant';

@Injectable()
export class TutorialService {
  constructor(private prisma: PrismaService) {}

  /**
   * 튜토리얼 카드 조회
   */
  getCards() {
    return {
      cards: TUTORIAL_CARDS,
    };
  }

  /**
   * 튜토리얼 완료/스킵
   */
  async completeTutorial(userId: string, action: 'complete' | 'skip') {
    const updateData =
      action === 'complete'
        ? {
            has_completed_tutorial: true,
            tutorial_completed_at: new Date(),
          }
        : {
            has_completed_tutorial: true, // Skip도 다시 안 보여주기
            tutorial_skipped_at: new Date(),
          };

    await this.prisma.users.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      success: true,
      message: action === 'complete' ? 'Tutorial completed' : 'Tutorial skipped',
    };
  }

  /**
   * 튜토리얼 상태 조회
   */
  async getStatus(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        has_completed_tutorial: true,
        tutorial_completed_at: true,
        tutorial_skipped_at: true,
      },
    });

    return {
      hasCompleted: user?.has_completed_tutorial || false,
      completedAt: user?.tutorial_completed_at,
      skippedAt: user?.tutorial_skipped_at,
    };
  }
}
