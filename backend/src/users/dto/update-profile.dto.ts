import { IsOptional, IsString, IsUrl, IsEmail } from 'class-validator';

/**
 * 프로필 업데이트 DTO
 * 화면기획 My Page_6: Connect your email
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  xDisplayName?: string;

  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  walletAddress?: string;

  @IsOptional()
  @IsEmail()
  email?: string; // 화면기획 My Page_6: 이메일 연결
}
