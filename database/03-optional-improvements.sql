-- =============================================
-- XYLO 선택적 DB 개선 스크립트
-- 작성일: 2025-01-10
-- 주의: 프로덕션 적용 전 반드시 백업!
-- =============================================

SET search_path TO xylo, public;

-- =============================================
-- 개선 1: leaderboard_entries UNIQUE 제약 조건 변경
-- 목적: 공동 순위 허용 (같은 포인트의 여러 사용자)
-- =============================================

-- 기존 제약 삭제
ALTER TABLE xylo.leaderboard_entries
DROP CONSTRAINT IF EXISTS leaderboard_entries_period_rank_snapshot_date_key;

-- 새로운 제약: 기간/채널/날짜 조합으로 유일성 보장
ALTER TABLE xylo.leaderboard_entries
ADD CONSTRAINT leaderboard_entries_period_channel_snapshot_unique
UNIQUE(period, channel_id, snapshot_date);

COMMENT ON CONSTRAINT leaderboard_entries_period_channel_snapshot_unique
ON xylo.leaderboard_entries
IS '기간별 채널별 유일성 보장 (공동 순위 허용)';

-- =============================================
-- 개선 2: channel_daily_snapshots.rank 컬럼 삭제
-- 목적: 미사용 컬럼 제거
-- =============================================

-- 인덱스 먼저 삭제
DROP INDEX IF EXISTS xylo.idx_channel_snapshots_rank;

-- 컬럼 삭제
ALTER TABLE xylo.channel_daily_snapshots
DROP COLUMN IF EXISTS rank;

-- =============================================
-- 검증 쿼리
-- =============================================

-- 1. leaderboard_entries 제약 조건 확인
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'xylo.leaderboard_entries'::regclass
  AND contype = 'u';

-- 2. channel_daily_snapshots 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'xylo'
  AND table_name = 'channel_daily_snapshots'
ORDER BY ordinal_position;

-- =============================================
-- 롤백 스크립트 (필요 시 사용)
-- =============================================

/*
-- 개선 1 롤백
ALTER TABLE xylo.leaderboard_entries
DROP CONSTRAINT IF EXISTS leaderboard_entries_period_channel_snapshot_unique;

ALTER TABLE xylo.leaderboard_entries
ADD CONSTRAINT leaderboard_entries_period_rank_snapshot_date_key
UNIQUE(period, rank, snapshot_date);

-- 개선 2 롤백
ALTER TABLE xylo.channel_daily_snapshots
ADD COLUMN rank INTEGER;

CREATE INDEX idx_channel_snapshots_rank
ON xylo.channel_daily_snapshots(rank)
WHERE rank IS NOT NULL;
*/
