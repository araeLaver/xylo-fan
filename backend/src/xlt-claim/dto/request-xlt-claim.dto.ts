import { IsInt, Min, IsOptional, IsString } from 'class-validator';

/**
 * XLT Claim 신청 DTO
 *
 * 정책:
 * - 최소 20,000 포인트 이상 보유 시 신청 가능
 * - SBT (User Pass) 보유 필수
 * - MVP 종료 후 실제 XLT 교환 가능
 */
export class RequestXltClaimDto {
  /**
   * 신청할 포인트 수량
   * 최소 20,000P 이상
   */
  @IsInt()
  @Min(20000, { message: 'Minimum 20,000 points required for XLT claim' })
  points: number;

  /**
   * 지갑 주소 (XLT 수령용)
   */
  @IsString()
  walletAddress: string;

  /**
   * 신청 메모 (선택)
   */
  @IsOptional()
  @IsString()
  memo?: string;
}
