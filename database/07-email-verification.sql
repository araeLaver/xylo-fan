-- ================================================
-- Migration 07: 이메일 인증 시스템
-- ================================================
-- 작성일: 2025-01-11
-- 목적:
--   1. 이메일 기반 계정 복구 시스템
--   2. 6자리 인증번호 발송 및 검증
--   3. 보안: 만료 시간, 시도 횟수 제한
-- ================================================

-- ================================================
-- 1. 이메일 인증번호 테이블 생성
-- ================================================

CREATE TABLE IF NOT EXISTS xylo.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,

    -- 만료 관리
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,

    -- IP 추적 (보안)
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- 재발송 방지
    attempts INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- 2. 인덱스 생성
-- ================================================

-- 이메일로 조회 (발송 이력 확인)
CREATE INDEX idx_email_verification_email
    ON xylo.email_verification_codes(email);

-- 인증번호 검증 (미사용, 만료되지 않은 코드)
CREATE INDEX idx_email_verification_code
    ON xylo.email_verification_codes(code)
    WHERE is_used = FALSE;

-- 만료 시간 체크
CREATE INDEX idx_email_verification_expires
    ON xylo.email_verification_codes(expires_at)
    WHERE is_used = FALSE;

-- 생성 시간 (정리용)
CREATE INDEX idx_email_verification_created
    ON xylo.email_verification_codes(created_at);

-- ================================================
-- 3. 코멘트
-- ================================================

COMMENT ON TABLE xylo.email_verification_codes IS '이메일 인증번호 관리 (계정 복구용)';
COMMENT ON COLUMN xylo.email_verification_codes.code IS '6자리 숫자 인증번호';
COMMENT ON COLUMN xylo.email_verification_codes.expires_at IS '만료 시간 (발급 후 15분)';
COMMENT ON COLUMN xylo.email_verification_codes.is_used IS '사용 여부 (1회용)';
COMMENT ON COLUMN xylo.email_verification_codes.attempts IS '검증 시도 횟수 (최대 3회)';
COMMENT ON COLUMN xylo.email_verification_codes.ip_address IS 'IP 주소 (보안 로깅용)';

-- ================================================
-- 4. 자동 정리 함수
-- ================================================

-- 24시간 지난 인증번호 자동 삭제
CREATE OR REPLACE FUNCTION xylo.cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM xylo.email_verification_codes
    WHERE created_at < NOW() - INTERVAL '24 hours';

    RAISE NOTICE 'Cleaned up expired verification codes';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION xylo.cleanup_expired_verification_codes IS '24시간 지난 인증번호 자동 삭제 (CRON Job용)';

-- ================================================
-- 5. 마이그레이션 기록
-- ================================================

INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_07_applied',
  jsonb_build_object(
    'version', '07',
    'applied_at', NOW(),
    'description', 'Email verification system for account recovery'
  ),
  'Migration 07: Email verification codes',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- ================================================
-- 완료 메시지
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 07 completed successfully!';
  RAISE NOTICE '   - Created email_verification_codes table';
  RAISE NOTICE '   - Added 4 indexes for performance';
  RAISE NOTICE '   - Created cleanup function';
END $$;
