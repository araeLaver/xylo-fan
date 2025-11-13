import { IsString, IsEnum, IsOptional, IsInt, Min, IsUrl } from 'class-validator';

export class ParticipateEventDto {
  @IsEnum(['VOTE', 'CONTEST', 'COMMUNITY'])
  eventType: 'VOTE' | 'CONTEST' | 'COMMUNITY';

  @IsString()
  eventId: string;

  @IsString()
  eventName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  voteWeight?: number; // 투표권 (투표 이벤트만)

  @IsOptional()
  @IsUrl()
  submissionUrl?: string; // 제출 URL (공모전만)
}
