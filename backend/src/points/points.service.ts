import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetPointsHistoryDto } from './dto/get-points-history.dto';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 사용자의 현재 포인트 조회 (6-slot)
   */
  async getCurrentPoints(userId: string) {
    // user_points 테이블에서 사용자의 최신 포인트 조회
    const summary = await this.prisma.user_points.findUnique({
      where: { user_id: userId },
    });

    if (!summary) {
      // 사용자가 존재하지만 포인트 요약이 없는 경우 초기화
      return {
        userId,
        contents: 0,
        mgm: 0,
        event: 0,
        profit: 0,
        sponsor: 0,
        boost: 0,
        current: 0,
        updatedAt: new Date(),
      };
    }

    return {
      userId: summary.user_id,
      contents: summary.slot_01_content,
      mgm: summary.slot_02_mgm,
      event: summary.slot_03_event,
      profit: summary.slot_04_profit,
      sponsor: summary.slot_05_sponsor,
      boost: summary.slot_06_boost,
      current: summary.total_points,
      updatedAt: summary.updated_at,
    };
  }

  /**
   * 포인트 트랜잭션 히스토리 조회
   */
  async getPointsHistory(userId: string, query: GetPointsHistoryDto) {
    const { startDate, endDate, category, limit = 30, offset = 0 } = query;

    const whereClause: any = {
      user_id: userId,
    };

    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) {
        whereClause.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.created_at.lte = new Date(endDate);
      }
    }

    if (category) {
      whereClause.category = category;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.point_transactions.findMany({
        where: whereClause,
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.point_transactions.count({ where: whereClause }),
    ]);

    return {
      total,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        category: tx.category,
        amount: tx.amount,
        reason: tx.reason,
        metadata: tx.metadata,
        createdAt: tx.created_at,
      })),
      limit,
      offset,
    };
  }

  /**
   * Daily 포인트 히스토리 조회
   */
  async getDailyHistory(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.prisma.point_history.findMany({
      where: {
        user_id: userId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return history.map((h) => ({
      date: h.date,
      contents: h.contents,
      mgm: h.referral, // DB에서는 referral이지만 API에서는 mgm으로 반환
      event: h.event,
      profit: h.profit,
      boost: h.boost,
      current: h.day_total,
    }));
  }

  /**
   * 사용자별 슬롯별 포인트 합계 조회
   */
  async getPointsBySlot(userId: string) {
    const summary = await this.prisma.user_points.findUnique({
      where: { user_id: userId },
    });

    if (!summary) {
      return {
        contents: 0,
        mgm: 0,
        event: 0,
        profit: 0,
        sponsor: 0,
        boost: 0,
        current: 0,
      };
    }

    return {
      contents: summary.slot_01_content,
      mgm: summary.slot_02_mgm,
      event: summary.slot_03_event,
      profit: summary.slot_04_profit,
      sponsor: summary.slot_05_sponsor,
      boost: summary.slot_06_boost,
      current: summary.total_points,
    };
  }

  /**
   * 포인트 추가 (내부 사용)
   * 실제로는 트랜잭션이 발생하고 트리거가 자동으로 summary를 업데이트
   */
  async addPoints(
    userId: string,
    slotType: 'CONTENT' | 'REFERRAL' | 'EVENT' | 'PROFIT' | 'BOOST',
    amount: number,
    reason: string,
    metadata?: any,
  ) {
    // 포인트 트랜잭션 생성
    const transaction = await this.prisma.point_transactions.create({
      data: {
        user_id: userId,
        category: slotType,
        amount,
        reason,
        metadata,
      },
    });

    // 트리거가 자동으로 user_points를 업데이트

    return {
      id: transaction.id,
      userId: transaction.user_id,
      slotType: transaction.category.toLowerCase(),
      amount: transaction.amount,
      reason: transaction.reason,
      createdAt: transaction.created_at,
    };
  }
}
