import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipateEventDto } from './dto/participate-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 이벤트 참여
   */
  async participateEvent(userId: string, dto: ParticipateEventDto) {
    // 이미 참여했는지 확인
    const existing = await this.prisma.event_participations.findFirst({
      where: {
        user_id: userId,
        event_id: dto.eventId,
      },
    });

    if (existing) {
      throw new BadRequestException('Already participated in this event');
    }

    // 투표 이벤트인 경우 투표권 계산
    let voteWeight = dto.voteWeight;
    if (dto.eventType === 'VOTE') {
      const userPoints = await this.prisma.user_points.findUnique({
        where: { user_id: userId },
      });

      if (!userPoints) {
        throw new BadRequestException('User points not found');
      }

      // 100 포인트당 1표
      voteWeight = Math.floor(userPoints.total_points / 100);

      if (voteWeight === 0) {
        throw new BadRequestException(
          'Insufficient points for voting (need at least 100 points)',
        );
      }
    }

    // 이벤트 참여 생성
    const participation = await this.prisma.event_participations.create({
      data: {
        user_id: userId,
        event_type: dto.eventType as any,
        event_id: dto.eventId,
        event_name: dto.eventName,
        vote_weight: voteWeight,
        submission_url: dto.submissionUrl,
        participated_at: new Date(),
      },
    });

    return {
      id: participation.id,
      eventType: participation.event_type,
      eventId: participation.event_id,
      eventName: participation.event_name,
      voteWeight: participation.vote_weight,
      submissionUrl: participation.submission_url,
      participatedAt: participation.participated_at,
    };
  }

  /**
   * 내 이벤트 참여 내역 조회
   */
  async getMyParticipations(userId: string, eventType?: string) {
    const whereClause: any = {
      user_id: userId,
    };

    if (eventType) {
      whereClause.event_type = eventType.toUpperCase();
    }

    const participations = await this.prisma.event_participations.findMany({
      where: whereClause,
      orderBy: { participated_at: 'desc' },
    });

    return participations.map((p) => ({
      id: p.id,
      eventType: p.event_type,
      eventId: p.event_id,
      eventName: p.event_name,
      voteWeight: p.vote_weight,
      submissionUrl: p.submission_url,
      isWinner: p.is_winner,
      prize: p.prize,
      participatedAt: p.participated_at,
    }));
  }

  /**
   * 특정 이벤트의 참여자 목록 조회
   */
  async getEventParticipants(eventId: string) {
    const participations = await this.prisma.event_participations.findMany({
      where: { event_id: eventId },
      orderBy: { participated_at: 'asc' },
    });

    // 사용자 정보 조회
    const participants = await Promise.all(
      participations.map(async (p) => {
        const user = await this.prisma.users.findUnique({
          where: { id: p.user_id },
          select: {
            id: true,
            x_handle: true,
            x_display_name: true,
            profile_image_url: true,
          },
        });

        // 사용자가 삭제된 경우 null 처리
        return {
          user: user || null,
          voteWeight: p.vote_weight,
          submissionUrl: p.submission_url,
          isWinner: p.is_winner,
          prize: p.prize,
          participatedAt: p.participated_at,
        };
      }),
    );

    return {
      eventId,
      totalParticipants: participants.length,
      totalVoteWeight: participations.reduce(
        (sum, p) => sum + (p.vote_weight || 0),
        0,
      ),
      participants,
    };
  }
}
