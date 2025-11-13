import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateFaqDto {
  @IsNotEmpty({ message: 'Korean question is required' })
  @IsString()
  question_ko: string;

  @IsNotEmpty({ message: 'English question is required' })
  @IsString()
  question_en: string;

  @IsNotEmpty({ message: 'Korean answer is required' })
  @IsString()
  answer_ko: string;

  @IsNotEmpty({ message: 'English answer is required' })
  @IsString()
  answer_en: string;

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
