import { IsOptional, IsDateString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPointsHistoryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['CONTENT', 'REFERRAL', 'EVENT', 'PROFIT', 'BOOST'])
  category?: 'CONTENT' | 'REFERRAL' | 'EVENT' | 'PROFIT' | 'BOOST';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
