/**
 * XLT Claim 정책 상수
 *
 * 정책 문서 기준 (2025.11.10):
 * - XLT 교환 Claim 신청 최소 포인트: 20,000P
 * - 보상 최대 한도: 1억원 (XLT 50만개, 1XLT = 200원 가정)
 * - MVP 종료 시점: 2026.06.30 (6개월)
 * - 조기 마감 가능: 최대 한도 소진 시
 */

/**
 * XLT Claim 신청 최소 포인트
 */
export const XLT_CLAIM_MIN_POINTS = 20000;

/**
 * XLT 교환 비율 (1 XLT = 200원 가정)
 */
export const XLT_EXCHANGE_RATE = 200; // KRW per 1 XLT

/**
 * 보상 최대 한도 (XLT)
 */
export const XLT_MAX_TOTAL_SUPPLY = 500000; // 50만 XLT

/**
 * 보상 최대 한도 (원)
 */
export const XLT_MAX_TOTAL_KRW = 100000000; // 1억원

/**
 * MVP 종료 시점
 */
export const MVP_END_DATE = new Date('2026-06-30T23:59:59+09:00');

/**
 * XLT Claim 상태
 */
export enum XltClaimStatus {
  PENDING = 'PENDING', // 신청 완료 (승인 대기)
  APPROVED = 'APPROVED', // 승인 완료
  REJECTED = 'REJECTED', // 거부됨
  COMPLETED = 'COMPLETED', // XLT 지급 완료
  CANCELLED = 'CANCELLED', // 신청 취소
}

/**
 * XLT Claim 신청 가능 여부 판단 기준
 */
export interface XltClaimEligibility {
  eligible: boolean;
  reason?: string;
  minPoints: number;
  currentPoints: number;
  hasSbt: boolean;
  totalClaimedXlt: number;
  maxTotalXlt: number;
  isWithinMvpPeriod: boolean;
}
