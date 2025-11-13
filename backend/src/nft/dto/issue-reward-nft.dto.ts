import { IsNotEmpty, IsString, IsUUID, IsOptional, IsUrl } from 'class-validator';

/**
 * 리워드 NFT 발급 DTO (관리자용)
 * 화면기획 My Page_5: Limited Edition NFT
 *
 * 발급 가능 용도:
 * - 공모전 등 이벤트 참여 당선
 * - 위치스 굿즈 or 한정판 굿즈 판매 구매자 대상
 */
export class IssueRewardNftDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string; // 발급 대상 사용자 ID

  @IsNotEmpty()
  @IsString()
  name: string; // NFT 이름 (예: "W!TCHX Merch Contest 1st Place")

  @IsNotEmpty()
  @IsString()
  description: string; // NFT 설명 (예: "This is an exclusive NFT awarded only to...")

  @IsNotEmpty()
  @IsUrl()
  imageUrl: string; // NFT 이미지 URL

  @IsOptional()
  @IsString()
  eventType?: string; // 이벤트 타입 (CONTEST, MERCH_PURCHASE, LIMITED_EDITION)

  @IsOptional()
  metadata?: Record<string, any>; // 추가 메타데이터
}
