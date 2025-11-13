-- =============================================
-- 리더보드 테이블 업데이트 (채널별 랭킹 추가)
-- =============================================

SET search_path TO xylo, public;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS xylo.leaderboard_entries CASCADE;

-- 새로운 리더보드 테이블 생성 (채널별 랭킹)
CREATE TABLE xylo.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES xylo.youtube_channels(id) ON DELETE SET NULL,
    period xylo.leaderboard_period NOT NULL,
    rank INTEGER NOT NULL,

    -- 포인트 상세
    total_current INTEGER NOT NULL,
    contents INTEGER NOT NULL,
    mgm INTEGER NOT NULL,
    event INTEGER NOT NULL,
    profit INTEGER NOT NULL,
    boost INTEGER NOT NULL,

    -- 채널 정보 스냅샷 (스냅샷 시점의 채널 정보 보존)
    channel_title VARCHAR(255),
    channel_image_url TEXT,

    -- 사용자 정보 스냅샷 (표시용)
    x_handle VARCHAR(255),
    profile_image_url TEXT,

    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(period, rank, snapshot_date)
);

-- 인덱스 생성
CREATE INDEX idx_leaderboard_period ON xylo.leaderboard_entries(period, rank);
CREATE INDEX idx_leaderboard_user ON xylo.leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_channel ON xylo.leaderboard_entries(channel_id);
CREATE INDEX idx_leaderboard_snapshot ON xylo.leaderboard_entries(snapshot_date DESC);

-- 코멘트 추가
COMMENT ON TABLE xylo.leaderboard_entries IS '기간별 채널별 리더보드 스냅샷 (캐싱용)';
COMMENT ON COLUMN xylo.leaderboard_entries.user_id IS '사용자 ID';
COMMENT ON COLUMN xylo.leaderboard_entries.channel_id IS '유튜브 채널 ID (대표 채널)';
COMMENT ON COLUMN xylo.leaderboard_entries.period IS '집계 기간 (ALL: 전체, 1D: 1일, 1W: 1주, 1M: 1개월, 3M: 3개월)';
COMMENT ON COLUMN xylo.leaderboard_entries.rank IS '순위';
COMMENT ON COLUMN xylo.leaderboard_entries.total_current IS '총 포인트 (순위 결정 기준)';
COMMENT ON COLUMN xylo.leaderboard_entries.channel_title IS '채널명 (스냅샷 시점)';
COMMENT ON COLUMN xylo.leaderboard_entries.channel_image_url IS '채널 이미지 URL (스냅샷 시점)';
COMMENT ON COLUMN xylo.leaderboard_entries.x_handle IS 'X 핸들 (스냅샷 시점)';
COMMENT ON COLUMN xylo.leaderboard_entries.profile_image_url IS '사용자 프로필 이미지 URL (업로드 이미지 우선, 없으면 채널 이미지)';
COMMENT ON COLUMN xylo.leaderboard_entries.snapshot_date IS '스냅샷 생성 날짜';

-- 검증
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'xylo' AND tablename = 'leaderboard_entries';
