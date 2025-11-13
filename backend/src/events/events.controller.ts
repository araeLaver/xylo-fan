import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { ParticipateEventDto } from './dto/participate-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * 이벤트 참여
   * POST /api/v1/events/participate
   */
  @Post('participate')
  @UseGuards(JwtAuthGuard)
  async participateEvent(@Req() req, @Body() dto: ParticipateEventDto) {
    return this.eventsService.participateEvent(req.user.userId, dto);
  }

  /**
   * 내 이벤트 참여 내역 조회
   * GET /api/v1/events/my-participations?eventType=VOTE
   */
  @Get('my-participations')
  @UseGuards(JwtAuthGuard)
  async getMyParticipations(
    @Req() req,
    @Query('eventType') eventType?: string,
  ) {
    return this.eventsService.getMyParticipations(req.user.userId, eventType);
  }

  /**
   * 특정 이벤트의 참여자 목록 조회
   * GET /api/v1/events/:eventId/participants
   */
  @Get(':eventId/participants')
  async getEventParticipants(@Param('eventId') eventId: string) {
    return this.eventsService.getEventParticipants(eventId);
  }
}
