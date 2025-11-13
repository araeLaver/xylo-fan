import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 리더보드 조회 DTO
 * 화면기획 Leaderboards: 기간 필터, 정렬, 페이지네이션
 */
export class GetLeaderboardDto {
  /**
   * 기간 필터 (화면기획 7번)
   * ALL: 전체 기간
   * 1D: 최근 24시간
   * 1W: 최근 1주
   * 1M: 최근 1개월
   * 3M: 최근 3개월
   */
  @IsOptional()
  @IsEnum(['ALL', '1D', '1W', '1M', '3M'])
  period?: 'ALL' | '1D' | '1W' | '1M' | '3M' = 'ALL';

  /**
   * 포인트 카테고리 필터 (화면기획 3번)
   * total: Total Current (기본값)
   * contents: Contents 포인트만
   * referral: Referral (MGM) 포인트만
   * event: Event 포인트만
   * profit: Profit 포인트만
   * boost: Boost 포인트만
   */
  @IsOptional()
  @IsEnum(['total', 'contents', 'referral', 'event', 'profit', 'boost', 'sponsor'])
  category?: 'total' | 'contents' | 'referral' | 'event' | 'profit' | 'boost' | 'sponsor' = 'total';

  /**
   * 정렬 옵션 (화면기획 5번)
   * desc: Highest first (기본값)
   * asc: Lowest first
   */
  @IsOptional()
  @IsEnum(['desc', 'asc'])
  sort?: 'desc' | 'asc' = 'desc';

  /**
   * 페이지 번호 (화면기획 8번: Top10 기준)
   * 1부터 시작
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * 페이지당 항목 수 (화면기획 8번: Top10)
   * 기본값: 10
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // 하위 호환성을 위한 offset (deprecated)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
