import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  question_ko?: string;

  @IsOptional()
  @IsString()
  question_en?: string;

  @IsOptional()
  @IsString()
  answer_ko?: string;

  @IsOptional()
  @IsString()
  answer_en?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;
}
