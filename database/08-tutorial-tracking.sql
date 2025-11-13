-- ================================================
-- Migration 08: 튜토리얼 추적 시스템
-- ================================================
-- 작성일: 2025-01-11
-- 목적:
--   1. 신규 유저 온보딩 튜토리얼 완료 상태 추적
--   2. 튜토리얼 스킵 여부 기록
-- ================================================

-- ================================================
-- 1. users 테이블에 컬럼 추가
-- ================================================

ALTER TABLE xylo.users
    ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tutorial_skipped_at TIMESTAMPTZ;

-- ================================================
-- 2. 인덱스 생성
-- ================================================

-- 튜토리얼 완료 여부로 조회 (통계용)
CREATE INDEX IF NOT EXISTS idx_users_tutorial_completed
    ON xylo.users(has_completed_tutorial);

-- ================================================
-- 3. 코멘트
-- ================================================

COMMENT ON COLUMN xylo.users.has_completed_tutorial IS '튜토리얼 완료 여부 (완료 또는 스킵)';
COMMENT ON COLUMN xylo.users.tutorial_completed_at IS '튜토리얼 완료 시각 (Done 클릭)';
COMMENT ON COLUMN xylo.users.tutorial_skipped_at IS '튜토리얼 스킵 시각 (Skip 클릭)';

-- ================================================
-- 4. 마이그레이션 기록
-- ================================================

INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_08_applied',
  jsonb_build_object(
    'version', '08',
    'applied_at', NOW(),
    'description', 'Tutorial tracking system'
  ),
  'Migration 08: Tutorial flow tracking',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- ================================================
-- 완료 메시지
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 08 completed successfully!';
  RAISE NOTICE '   - Added has_completed_tutorial column';
  RAISE NOTICE '   - Added tutorial_completed_at column';
  RAISE NOTICE '   - Added tutorial_skipped_at column';
  RAISE NOTICE '   - Created index on has_completed_tutorial';
END $$;
