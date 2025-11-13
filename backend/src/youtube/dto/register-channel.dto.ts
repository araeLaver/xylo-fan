import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 채널 등록 DTO
 * 화면기획 My Page_6: Enter your channel URL to register
 *
 * 지원 형식:
 * - Channel ID: UC...
 * - Channel URL: https://www.youtube.com/channel/UC...
 * - Handle: @username
 * - Handle URL: https://www.youtube.com/@username
 * - Custom URL: https://www.youtube.com/c/CustomName
 */
export class RegisterChannelDto {
  @IsOptional()
  @IsString()
  channelId?: string; // 직접 채널 ID 제공 (기존 호환성)

  @IsOptional()
  @IsString()
  channelUrlOrHandle?: string; // URL 또는 핸들 (화면기획서 기준)
}
