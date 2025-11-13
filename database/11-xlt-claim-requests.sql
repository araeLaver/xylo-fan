-- =============================================
-- XLT Claim 신청 시스템
-- =============================================
-- 작성일: 2025-01-11
-- 목적: XLT 교환 Claim 신청 및 관리
-- 정책: 최소 20,000P, 최대 한도 50만 XLT

-- XLT Claim 상태 ENUM
CREATE TYPE xylo.xlt_claim_status AS ENUM (
    'PENDING',    -- 신청 완료 (승인 대기)
    'APPROVED',   -- 승인 완료
    'REJECTED',   -- 거부됨
    'COMPLETED',  -- XLT 지급 완료
    'CANCELLED'   -- 신청 취소
);

COMMENT ON TYPE xylo.xlt_claim_status IS 'XLT Claim 신청 상태';

-- XLT Claim 신청 테이블
CREATE TABLE IF NOT EXISTS xylo.xlt_claim_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,

    -- 신청 정보
    points_claimed INTEGER NOT NULL CHECK (points_claimed >= 20000),
    xlt_amount DECIMAL(20, 8) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,

    -- 상태
    status xylo.xlt_claim_status NOT NULL DEFAULT 'PENDING',
    memo TEXT,
    rejection_reason TEXT,

    -- 타임스탬프
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_xlt_claims_user ON xylo.xlt_claim_requests(user_id);
CREATE INDEX idx_xlt_claims_status ON xylo.xlt_claim_requests(status);
CREATE INDEX idx_xlt_claims_created ON xylo.xlt_claim_requests(created_at DESC);

-- 코멘트
COMMENT ON TABLE xylo.xlt_claim_requests IS 'XLT 교환 Claim 신청 내역';
COMMENT ON COLUMN xylo.xlt_claim_requests.points_claimed IS '신청한 포인트 수량 (최소 20,000P)';
COMMENT ON COLUMN xylo.xlt_claim_requests.xlt_amount IS '예상 XLT 수량 (포인트 ÷ 200)';
COMMENT ON COLUMN xylo.xlt_claim_requests.wallet_address IS 'XLT 수령 지갑 주소 (Polygon)';
COMMENT ON COLUMN xylo.xlt_claim_requests.status IS '신청 상태 (PENDING/APPROVED/REJECTED/COMPLETED/CANCELLED)';
COMMENT ON COLUMN xylo.xlt_claim_requests.memo IS '신청 메모';
COMMENT ON COLUMN xylo.xlt_claim_requests.rejection_reason IS '거부 사유 (status=REJECTED인 경우)';
COMMENT ON COLUMN xylo.xlt_claim_requests.approved_at IS '승인 일시';
COMMENT ON COLUMN xylo.xlt_claim_requests.completed_at IS 'XLT 지급 완료 일시';

-- system_configs에 XLT 한도 설정 추가
INSERT INTO xylo.system_configs (config_key, config_value, description)
VALUES
    ('xlt_max_total_supply', '500000', 'XLT 보상 최대 한도 (개)'),
    ('xlt_exchange_rate', '200', 'XLT 교환 비율 (1 XLT = 200원)'),
    ('xlt_claim_min_points', '20000', 'XLT Claim 신청 최소 포인트'),
    ('mvp_end_date', '2026-06-30', 'MVP 종료 시점')
ON CONFLICT (config_key) DO UPDATE
SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 성공 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ XLT Claim 테이블 및 설정 생성 완료';
    RAISE NOTICE '   - xlt_claim_status ENUM 생성';
    RAISE NOTICE '   - xlt_claim_requests 테이블 생성';
    RAISE NOTICE '   - 인덱스 3개 생성';
    RAISE NOTICE '   - system_configs에 XLT 정책 4개 추가';
END $$;
