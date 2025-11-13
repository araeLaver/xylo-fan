import { IsOptional, IsString } from 'class-validator';

export class BurnNftDto {
  @IsOptional()
  @IsString()
  reason?: string; // 소각 사유 (이벤트 참여 등)
}
