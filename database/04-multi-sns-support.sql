-- =============================================
-- XYLO Multi-SNS Support Migration
-- 작성일: 2025-01-10
-- 목적: Instagram, YouTube, Discord 로그인 지원
-- =============================================

SET search_path TO xylo, public;

-- =============================================
-- Step 1: 제약 조건 완화
-- =============================================

-- x_id를 nullable로 변경 (Instagram/YouTube 로그인 지원)
ALTER TABLE xylo.users ALTER COLUMN x_id DROP NOT NULL;

-- x_handle을 nullable로 변경
ALTER TABLE xylo.users ALTER COLUMN x_handle DROP NOT NULL;

-- 기존 UNIQUE 제약은 유지 (null 허용)
-- PostgreSQL에서 UNIQUE는 null을 여러 개 허용함

-- =============================================
-- Step 2: 메인 플랫폼 추적 컬럼 추가
-- =============================================

ALTER TABLE xylo.users
ADD COLUMN IF NOT EXISTS primary_platform social_platform DEFAULT 'X';

COMMENT ON COLUMN xylo.users.primary_platform
IS '사용자의 메인 로그인 플랫폼 (X, INSTAGRAM, YOUTUBE, DISCORD)';

-- 기존 사용자는 모두 X로 설정
UPDATE xylo.users SET primary_platform = 'X' WHERE primary_platform IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE xylo.users ALTER COLUMN primary_platform SET NOT NULL;

-- =============================================
-- Step 3: 인덱스 추가
-- =============================================

-- primary_platform 인덱스 (조회 최적화)
CREATE INDEX IF NOT EXISTS idx_users_primary_platform
ON xylo.users(primary_platform);

-- x_id 부분 인덱스 (null이 아닌 경우만)
CREATE INDEX IF NOT EXISTS idx_users_x_id_not_null
ON xylo.users(x_id) WHERE x_id IS NOT NULL;

-- =============================================
-- Step 4: 체크 제약 조건 (논리적 정합성)
-- =============================================

-- 체크 함수: primary_platform에 따라 해당 SNS ID 필수
CREATE OR REPLACE FUNCTION xylo.check_primary_platform_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- X가 메인이면 x_id 필수
  IF NEW.primary_platform = 'X' AND NEW.x_id IS NULL THEN
    RAISE EXCEPTION 'x_id is required when primary_platform is X';
  END IF;

  -- 다른 플랫폼은 social_accounts에서 체크 (애플리케이션 레벨)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_check_primary_platform ON xylo.users;
CREATE TRIGGER trg_check_primary_platform
  BEFORE INSERT OR UPDATE ON xylo.users
  FOR EACH ROW
  EXECUTE FUNCTION xylo.check_primary_platform_consistency();

-- =============================================
-- Step 5: social_accounts 개선
-- =============================================

-- is_primary 인덱스 추가 (메인 계정 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_social_accounts_primary
ON xylo.social_accounts(user_id, is_primary)
WHERE is_primary = true;

-- =============================================
-- Step 6: 데이터 검증
-- =============================================

-- 1. X 사용자가 social_accounts에 없는 경우 생성
INSERT INTO xylo.social_accounts (user_id, platform, account_id, handle, display_name, profile_image, is_verified, is_primary)
SELECT
  id,
  'X' AS platform,
  x_id AS account_id,
  x_handle AS handle,
  x_display_name AS display_name,
  profile_image_url AS profile_image,
  true AS is_verified,
  true AS is_primary
FROM xylo.users
WHERE x_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM xylo.social_accounts sa
    WHERE sa.user_id = users.id AND sa.platform = 'X'
  )
ON CONFLICT (user_id, platform, account_id) DO NOTHING;

-- =============================================
-- Step 7: 검증 쿼리
-- =============================================

-- 모든 사용자의 플랫폼별 계정 현황
SELECT
  u.id,
  u.primary_platform,
  u.x_id IS NOT NULL AS has_x_id,
  COUNT(sa.id) AS social_account_count,
  STRING_AGG(sa.platform::text, ', ' ORDER BY sa.is_primary DESC) AS platforms
FROM xylo.users u
LEFT JOIN xylo.social_accounts sa ON u.id = sa.user_id
GROUP BY u.id, u.primary_platform, u.x_id
ORDER BY u.created_at DESC
LIMIT 10;

-- primary_platform이 X인데 x_id가 null인 경우 (에러)
SELECT id, primary_platform, x_id
FROM xylo.users
WHERE primary_platform = 'X' AND x_id IS NULL;

-- social_accounts에 primary가 없는 사용자 (경고)
SELECT u.id, u.primary_platform
FROM xylo.users u
WHERE NOT EXISTS (
  SELECT 1 FROM xylo.social_accounts sa
  WHERE sa.user_id = u.id AND sa.is_primary = true
);

-- =============================================
-- 롤백 스크립트
-- =============================================

/*
-- 컬럼 삭제
ALTER TABLE xylo.users DROP COLUMN IF EXISTS primary_platform;

-- 제약 조건 복원
ALTER TABLE xylo.users ALTER COLUMN x_id SET NOT NULL;
ALTER TABLE xylo.users ALTER COLUMN x_handle SET NOT NULL;

-- 트리거 삭제
DROP TRIGGER IF EXISTS trg_check_primary_platform ON xylo.users;
DROP FUNCTION IF EXISTS xylo.check_primary_platform_consistency();

-- 인덱스 삭제
DROP INDEX IF EXISTS xylo.idx_users_primary_platform;
DROP INDEX IF EXISTS xylo.idx_users_x_id_not_null;
DROP INDEX IF EXISTS xylo.idx_social_accounts_primary;
*/
