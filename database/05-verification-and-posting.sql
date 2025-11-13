-- ================================================
-- Migration 05: YouTube 인증 히스토리 & X 자동 포스팅
-- ================================================
-- 작성일: 2025-01-11
-- 목적:
--   1. YouTube 채널 인증 히스토리 추적
--   2. 중복 인증 방지 강화 (1채널-1인증 불변)
--   3. X(Twitter) 자동 포스팅 큐 시스템
-- ================================================

-- ================================================
-- 1. YouTube 채널 인증 히스토리 테이블
-- ================================================
-- 용도: 모든 인증 시도 기록, 감사 추적, 중복 방지
CREATE TABLE IF NOT EXISTS xylo.channel_verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 채널 정보
    channel_id VARCHAR(255) NOT NULL,  -- YouTube 채널 ID (불변)
    user_id UUID NOT NULL,             -- 시도한 사용자

    -- 인증 정보
    verification_code VARCHAR(8) NOT NULL,  -- 발급된 인증 코드
    action_type VARCHAR(50) NOT NULL,       -- 'CODE_ISSUED', 'VERIFICATION_SUCCESS', 'VERIFICATION_FAILED'

    -- 메타데이터
    metadata JSONB,                    -- 추가 정보 (실패 사유, IP, User-Agent 등)

    -- 타임스탬프
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- 외래키
    CONSTRAINT fk_verification_user FOREIGN KEY (user_id) REFERENCES xylo.users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_verification_history_channel_id ON xylo.channel_verification_history(channel_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_user_id ON xylo.channel_verification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created_at ON xylo.channel_verification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_action_type ON xylo.channel_verification_history(action_type);

COMMENT ON TABLE xylo.channel_verification_history IS 'YouTube 채널 인증 히스토리 (모든 시도 기록)';
COMMENT ON COLUMN xylo.channel_verification_history.action_type IS 'CODE_ISSUED: 코드 발급, VERIFICATION_SUCCESS: 인증 성공, VERIFICATION_FAILED: 인증 실패';

-- ================================================
-- 2. YouTube 채널 테이블 개선
-- ================================================
-- 목적: 인증 상태 강화, 재발급 방지

-- 첫 인증 시간 추가 (불변, 중복 방지용)
ALTER TABLE xylo.youtube_channels
  ADD COLUMN IF NOT EXISTS first_registered_at TIMESTAMP;

-- 기존 레코드의 first_registered_at를 created_at으로 채우기
UPDATE xylo.youtube_channels
  SET first_registered_at = created_at
  WHERE first_registered_at IS NULL;

-- 인증 시도 횟수 추가
ALTER TABLE xylo.youtube_channels
  ADD COLUMN IF NOT EXISTS verification_attempts INT DEFAULT 0;

COMMENT ON COLUMN xylo.youtube_channels.first_registered_at IS '최초 등록 시간 (불변, 중복 방지용)';
COMMENT ON COLUMN xylo.youtube_channels.verification_attempts IS '인증 시도 횟수';

-- ================================================
-- 3. X 포스팅 큐 테이블
-- ================================================
-- 용도: Shorts 자동 포스팅 스케줄링
CREATE TYPE xylo.post_status AS ENUM (
    'PENDING',      -- 대기 중
    'PROCESSING',   -- 처리 중
    'POSTED',       -- 포스팅 완료
    'FAILED',       -- 실패
    'CANCELLED'     -- 취소됨
);

CREATE TABLE IF NOT EXISTS xylo.x_post_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 연결 정보
    video_id UUID NOT NULL,            -- youtube_videos.id
    user_id UUID NOT NULL,             -- 포스팅할 사용자
    channel_id UUID NOT NULL,          -- youtube_channels.id

    -- 포스팅 내용
    post_text TEXT NOT NULL,           -- 포스팅 텍스트 (해시태그 포함)
    media_url TEXT,                    -- 비디오 썸네일 또는 미디어 URL

    -- 스케줄링
    scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- 예약 시간
    posted_at TIMESTAMP,                            -- 실제 포스팅 시간

    -- 상태 관리
    status xylo.post_status NOT NULL DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,                      -- 재시도 횟수
    max_retries INT DEFAULT 3,                      -- 최대 재시도

    -- 에러 추적
    error_message TEXT,                -- 실패 사유
    last_error_at TIMESTAMP,           -- 마지막 에러 시간

    -- 메타데이터
    metadata JSONB,                    -- 추가 정보

    -- 타임스탬프
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- 외래키
    CONSTRAINT fk_post_queue_video FOREIGN KEY (video_id) REFERENCES xylo.youtube_videos(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_queue_user FOREIGN KEY (user_id) REFERENCES xylo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_queue_channel FOREIGN KEY (channel_id) REFERENCES xylo.youtube_channels(id) ON DELETE CASCADE,

    -- 제약조건: 같은 비디오를 여러 번 포스팅하지 않도록
    CONSTRAINT uq_post_queue_video UNIQUE (video_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_post_queue_status ON xylo.x_post_queue(status);
CREATE INDEX IF NOT EXISTS idx_post_queue_scheduled_at ON xylo.x_post_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_post_queue_user_id ON xylo.x_post_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_post_queue_video_id ON xylo.x_post_queue(video_id);
CREATE INDEX IF NOT EXISTS idx_post_queue_created_at ON xylo.x_post_queue(created_at DESC);

COMMENT ON TABLE xylo.x_post_queue IS 'X(Twitter) 자동 포스팅 큐';
COMMENT ON COLUMN xylo.x_post_queue.status IS 'PENDING: 대기, PROCESSING: 처리중, POSTED: 완료, FAILED: 실패, CANCELLED: 취소';

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION xylo.update_x_post_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_x_post_queue_updated_at
    BEFORE UPDATE ON xylo.x_post_queue
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_x_post_queue_updated_at();

-- ================================================
-- 4. X 포스팅 완료 기록 테이블
-- ================================================
-- 용도: 포스팅된 내용 추적, 분석, 삭제 방지
CREATE TABLE IF NOT EXISTS xylo.x_posted_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 연결 정보
    queue_id UUID NOT NULL,            -- x_post_queue.id
    video_id UUID NOT NULL,            -- youtube_videos.id
    user_id UUID NOT NULL,             -- 포스팅한 사용자

    -- X(Twitter) 정보
    x_post_id VARCHAR(255) UNIQUE,     -- Tweet ID (삭제/조회용)
    x_post_url TEXT,                   -- Tweet URL

    -- 포스팅 내용
    post_text TEXT NOT NULL,           -- 실제 포스팅된 텍스트

    -- 성과 추적 (선택적, X API로 주기적 업데이트)
    like_count INT DEFAULT 0,
    retweet_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    impression_count INT DEFAULT 0,

    -- 타임스탬프
    posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    stats_updated_at TIMESTAMP,        -- 통계 마지막 업데이트 시간

    -- 메타데이터
    metadata JSONB,

    -- 외래키
    CONSTRAINT fk_posted_content_queue FOREIGN KEY (queue_id) REFERENCES xylo.x_post_queue(id) ON DELETE CASCADE,
    CONSTRAINT fk_posted_content_video FOREIGN KEY (video_id) REFERENCES xylo.youtube_videos(id) ON DELETE CASCADE,
    CONSTRAINT fk_posted_content_user FOREIGN KEY (user_id) REFERENCES xylo.users(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_posted_content_video_id ON xylo.x_posted_content(video_id);
CREATE INDEX IF NOT EXISTS idx_posted_content_user_id ON xylo.x_posted_content(user_id);
CREATE INDEX IF NOT EXISTS idx_posted_content_posted_at ON xylo.x_posted_content(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_posted_content_x_post_id ON xylo.x_posted_content(x_post_id);

COMMENT ON TABLE xylo.x_posted_content IS 'X(Twitter)에 포스팅 완료된 콘텐츠 기록';
COMMENT ON COLUMN xylo.x_posted_content.x_post_id IS 'Twitter/X Tweet ID (삭제/조회용)';

-- ================================================
-- 5. YouTube 비디오 테이블에 포스팅 상태 컬럼 추가
-- ================================================
-- 목적: 빠른 필터링 (이미 포스팅된 비디오 제외)

ALTER TABLE xylo.youtube_videos
  ADD COLUMN IF NOT EXISTS is_posted_to_x BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_youtube_videos_is_posted_to_x
  ON xylo.youtube_videos(is_posted_to_x);

COMMENT ON COLUMN xylo.youtube_videos.is_posted_to_x IS 'X(Twitter)에 포스팅 완료 여부';

-- ================================================
-- 6. 데이터 무결성 트리거
-- ================================================

-- 트리거 1: 인증 코드 발급 시 히스토리 자동 기록
CREATE OR REPLACE FUNCTION xylo.log_verification_code_issuance()
RETURNS TRIGGER AS $$
BEGIN
    -- 신규 채널 등록 시 (verification_code가 생성된 경우)
    IF TG_OP = 'INSERT' AND NEW.verification_code IS NOT NULL THEN
        INSERT INTO xylo.channel_verification_history (
            channel_id,
            user_id,
            verification_code,
            action_type,
            metadata
        ) VALUES (
            NEW.channel_id,
            NEW.user_id,
            NEW.verification_code,
            'CODE_ISSUED',
            jsonb_build_object(
                'channel_title', NEW.channel_title,
                'subscriber_count', NEW.subscriber_count
            )
        );
    END IF;

    -- 인증 성공 시
    IF TG_OP = 'UPDATE' AND OLD.is_verified = FALSE AND NEW.is_verified = TRUE THEN
        INSERT INTO xylo.channel_verification_history (
            channel_id,
            user_id,
            verification_code,
            action_type,
            metadata
        ) VALUES (
            NEW.channel_id,
            NEW.user_id,
            NEW.verification_code,
            'VERIFICATION_SUCCESS',
            jsonb_build_object(
                'verified_at', NEW.verified_at,
                'attempts', NEW.verification_attempts
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_verification
    AFTER INSERT OR UPDATE ON xylo.youtube_channels
    FOR EACH ROW
    EXECUTE FUNCTION xylo.log_verification_code_issuance();

-- 트리거 2: X 포스팅 완료 시 youtube_videos.is_posted_to_x 자동 업데이트
CREATE OR REPLACE FUNCTION xylo.mark_video_as_posted()
RETURNS TRIGGER AS $$
BEGIN
    -- x_posted_content에 레코드 생성되면 해당 비디오를 posted로 마킹
    UPDATE xylo.youtube_videos
    SET is_posted_to_x = TRUE
    WHERE id = NEW.video_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mark_video_posted
    AFTER INSERT ON xylo.x_posted_content
    FOR EACH ROW
    EXECUTE FUNCTION xylo.mark_video_as_posted();

-- ================================================
-- 7. 중복 인증 방지 함수 (애플리케이션에서 호출)
-- ================================================
-- 용도: 1채널-1인증 불변 원칙 검증

CREATE OR REPLACE FUNCTION xylo.check_channel_verification_eligibility(
    p_channel_id VARCHAR(255),
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_existing_channel RECORD;
    v_result JSONB;
BEGIN
    -- 해당 channel_id로 이미 등록된 채널이 있는지 확인 (모든 사용자 대상)
    SELECT * INTO v_existing_channel
    FROM xylo.youtube_channels
    WHERE channel_id = p_channel_id
    LIMIT 1;

    -- 채널이 존재하지 않으면 OK
    IF v_existing_channel IS NULL THEN
        RETURN jsonb_build_object(
            'eligible', true,
            'reason', 'NEW_CHANNEL'
        );
    END IF;

    -- 이미 인증 완료된 채널이면 REJECT
    IF v_existing_channel.is_verified = TRUE THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'ALREADY_VERIFIED',
            'verified_at', v_existing_channel.verified_at,
            'verified_by_user_id', v_existing_channel.user_id
        );
    END IF;

    -- 인증 대기 중인 채널이면 REJECT (같은 유저든 다른 유저든)
    IF v_existing_channel.is_verified = FALSE THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'VERIFICATION_PENDING',
            'pending_user_id', v_existing_channel.user_id,
            'verification_code', v_existing_channel.verification_code,
            'registered_at', v_existing_channel.created_at
        );
    END IF;

    -- 기타 경우
    RETURN jsonb_build_object(
        'eligible', false,
        'reason', 'UNKNOWN'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION xylo.check_channel_verification_eligibility IS '채널 인증 가능 여부 검증 (1채널-1인증 불변 원칙)';

-- ================================================
-- 마이그레이션 완료
-- ================================================

-- 마이그레이션 정보 기록
INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
    'migration_05_applied',
    jsonb_build_object(
        'version', '05',
        'applied_at', NOW(),
        'description', 'YouTube verification history and X auto-posting system'
    ),
    'Migration 05: Verification history and X posting',
    NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 05 completed successfully!';
    RAISE NOTICE '   - channel_verification_history table created';
    RAISE NOTICE '   - x_post_queue table created';
    RAISE NOTICE '   - x_posted_content table created';
    RAISE NOTICE '   - youtube_channels enhanced with first_registered_at and verification_attempts';
    RAISE NOTICE '   - youtube_videos enhanced with is_posted_to_x flag';
    RAISE NOTICE '   - Auto-logging triggers installed';
    RAISE NOTICE '   - Verification eligibility function created';
END $$;
