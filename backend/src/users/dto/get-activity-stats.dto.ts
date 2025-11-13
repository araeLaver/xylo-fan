import { IsOptional, IsIn } from 'class-validator';

export class GetActivityStatsDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'all'], { message: 'Period must be 7d, 30d, 90d, or all' })
  period?: string = '7d';
}
