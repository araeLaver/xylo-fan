-- Migration 10: Update point_category enum (MGM → REFERRAL, remove SPONSOR)
-- Date: 2025-11-11
-- Author: Backend Team

\c xylo

SET search_path TO xylo;

-- 1. 기존 MGM 값을 REFERRAL로 변경
UPDATE xylo.point_transactions
SET category = 'REFERRAL'
WHERE category = 'MGM';

-- 2. SPONSOR 값 확인 (있으면 에러, 없으면 계속)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM xylo.point_transactions WHERE category = 'SPONSOR') THEN
    RAISE EXCEPTION 'SPONSOR category is in use. Please handle existing SPONSOR records before migration.';
  END IF;
END $$;

-- 3. enum 타입 재정의
-- PostgreSQL에서 enum 값 수정은 직접 불가능하므로 타입 재생성 필요
ALTER TYPE xylo.point_category RENAME TO point_category_old;

CREATE TYPE xylo.point_category AS ENUM (
  'CONTENT',
  'REFERRAL',
  'EVENT',
  'PROFIT',
  'BOOST'
);

-- 4. point_transactions 테이블 컬럼 타입 변경
ALTER TABLE xylo.point_transactions
  ALTER COLUMN category TYPE xylo.point_category
  USING category::text::xylo.point_category;

-- 5. 이전 타입 삭제
DROP TYPE xylo.point_category_old;

-- 6. 검증
SELECT category, COUNT(*)
FROM xylo.point_transactions
GROUP BY category
ORDER BY category;

-- 예상 결과:
-- CONTENT  | ...
-- REFERRAL | ... (기존 MGM 값들)
-- EVENT    | ...
-- PROFIT   | ...
-- BOOST    | ...

COMMIT;
