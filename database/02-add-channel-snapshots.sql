-- =============================================
-- 채널 일별 스냅샷 테이블 추가
-- 작성일: 2025-01-07
-- =============================================

SET search_path TO xylo, public;

-- 채널 일별 통계 스냅샷
CREATE TABLE IF NOT EXISTS xylo.channel_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES xylo.youtube_channels(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,

    -- 채널 통계 (스냅샷 시점)
    subscriber_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,

    -- 랭킹 정보
    rank INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, snapshot_date)
);

CREATE INDEX idx_channel_snapshots_channel ON xylo.channel_daily_snapshots(channel_id);
CREATE INDEX idx_channel_snapshots_date ON xylo.channel_daily_snapshots(snapshot_date DESC);
CREATE INDEX idx_channel_snapshots_rank ON xylo.channel_daily_snapshots(rank) WHERE rank IS NOT NULL;

COMMENT ON TABLE xylo.channel_daily_snapshots IS '채널 일별 통계 스냅샷 (성장률 계산 및 포인트 지급용)';
COMMENT ON COLUMN xylo.channel_daily_snapshots.snapshot_date IS '스냅샷 날짜 (매일 새벽 자동 생성)';
COMMENT ON COLUMN xylo.channel_daily_snapshots.subscriber_count IS '해당 시점의 구독자 수';
COMMENT ON COLUMN xylo.channel_daily_snapshots.video_count IS '해당 시점의 비디오 수';
COMMENT ON COLUMN xylo.channel_daily_snapshots.view_count IS '해당 시점의 총 조회수';
COMMENT ON COLUMN xylo.channel_daily_snapshots.rank IS '해당 시점의 랭킹 (구독자 기준)';

-- 검증
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'xylo' AND tablename = 'channel_daily_snapshots';
