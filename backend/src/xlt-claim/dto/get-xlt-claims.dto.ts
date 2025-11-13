import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { XltClaimStatus } from '../constants/xlt-claim.constant';

/**
 * XLT Claim 이력 조회 DTO
 */
export class GetXltClaimsDto {
  /**
   * 상태 필터
   */
  @IsOptional()
  @IsEnum(XltClaimStatus)
  status?: XltClaimStatus;

  /**
   * 페이지 번호
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * 페이지당 항목 수
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
