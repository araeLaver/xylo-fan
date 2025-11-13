-- =============================================
-- XYLO 데이터베이스 스키마 생성 스크립트
-- 작성일: 2025-01-07
-- 스키마: xylo
-- =============================================

-- 스키마 생성 (존재하지 않는 경우에만)
CREATE SCHEMA IF NOT EXISTS xylo;

-- 스키마 설정
SET search_path TO xylo, public;

-- =============================================
-- 1. ENUM 타입 정의
-- =============================================

-- 소셜 플랫폼 타입
DO $$ BEGIN
    CREATE TYPE xylo.social_platform AS ENUM ('X', 'YOUTUBE', 'INSTAGRAM', 'DISCORD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE xylo.social_platform IS '연동 가능한 소셜 미디어 플랫폼 목록';

-- 포인트 카테고리 타입
DO $$ BEGIN
    CREATE TYPE xylo.point_category AS ENUM ('CONTENT', 'MGM', 'EVENT', 'PROFIT', 'SPONSOR', 'BOOST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE xylo.point_category IS '포인트 카테고리 - ERC-3525 슬롯에 매핑';

-- 리더보드 기간 타입
DO $$ BEGIN
    CREATE TYPE xylo.leaderboard_period AS ENUM ('ALL', '1D', '1W', '1M', '3M');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE xylo.leaderboard_period IS '리더보드 집계 기간';

-- NFT 타입
DO $$ BEGIN
    CREATE TYPE xylo.nft_type AS ENUM ('SBT', 'TIER', 'REWARD', 'CONNECTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE xylo.nft_type IS 'NFT 유형 - SBT(User Pass), TIER(등급형), REWARD(리워드형), CONNECTION(소각형)';

-- 이벤트 타입
DO $$ BEGIN
    CREATE TYPE xylo.event_type AS ENUM ('VOTE', 'CONTEST', 'COMMUNITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE xylo.event_type IS '이벤트 유형 - VOTE(투표), CONTEST(공모전), COMMUNITY(커뮤니티 활동)';

-- =============================================
-- 2. 사용자 관리 테이블
-- =============================================

-- 사용자 기본 정보
CREATE TABLE IF NOT EXISTS xylo.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    x_id VARCHAR(255) NOT NULL UNIQUE,
    x_handle VARCHAR(255) NOT NULL,
    x_display_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    wallet_address VARCHAR(42) UNIQUE,
    profile_image_url TEXT,
    referral_code VARCHAR(20) NOT NULL UNIQUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE xylo.users IS '사용자 기본 정보 - X(트위터) OAuth 기반 가입';
COMMENT ON COLUMN xylo.users.id IS '사용자 고유 ID (UUID)';
COMMENT ON COLUMN xylo.users.x_id IS 'X(트위터) 고유 사용자 ID';
COMMENT ON COLUMN xylo.users.x_handle IS 'X(트위터) 핸들 (@username)';
COMMENT ON COLUMN xylo.users.x_display_name IS 'X(트위터) 표시 이름';
COMMENT ON COLUMN xylo.users.email IS '이메일 주소 (선택, 인증 필요)';
COMMENT ON COLUMN xylo.users.email_verified IS '이메일 인증 여부';
COMMENT ON COLUMN xylo.users.wallet_address IS '연동된 지갑 주소 (Ethereum)';
COMMENT ON COLUMN xylo.users.profile_image_url IS '프로필 이미지 URL';
COMMENT ON COLUMN xylo.users.referral_code IS '레퍼럴 코드 (6자리 영숫자, 고유값)';
COMMENT ON COLUMN xylo.users.joined_at IS '가입 일시';

-- 소셜 계정 연동 정보
CREATE TABLE IF NOT EXISTS xylo.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    platform xylo.social_platform NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    handle VARCHAR(255),
    display_name VARCHAR(255),
    profile_image TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, platform, account_id)
);

CREATE INDEX idx_social_accounts_user_id ON xylo.social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON xylo.social_accounts(platform);

COMMENT ON TABLE xylo.social_accounts IS '소셜 미디어 계정 연동 정보';
COMMENT ON COLUMN xylo.social_accounts.user_id IS '사용자 ID (FK)';
COMMENT ON COLUMN xylo.social_accounts.platform IS '소셜 플랫폼 (X, YOUTUBE, INSTAGRAM, DISCORD)';
COMMENT ON COLUMN xylo.social_accounts.account_id IS '플랫폼별 고유 계정 ID';
COMMENT ON COLUMN xylo.social_accounts.handle IS '플랫폼 핸들/사용자명';
COMMENT ON COLUMN xylo.social_accounts.is_verified IS '인증 완료 여부';
COMMENT ON COLUMN xylo.social_accounts.is_primary IS '메인 계정 여부 (프로필 표시용)';

-- =============================================
-- 3. 유튜브 채널 관리 테이블
-- =============================================

-- 유튜브 채널 정보
CREATE TABLE IF NOT EXISTS xylo.youtube_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    channel_url TEXT NOT NULL,
    channel_title VARCHAR(255),
    channel_description TEXT,
    thumbnail_url TEXT,
    subscriber_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    verification_code VARCHAR(50) UNIQUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youtube_channels_user_id ON xylo.youtube_channels(user_id);
CREATE INDEX idx_youtube_channels_verified ON xylo.youtube_channels(is_verified);

COMMENT ON TABLE xylo.youtube_channels IS '유튜브 채널 정보 및 인증';
COMMENT ON COLUMN xylo.youtube_channels.channel_id IS '유튜브 채널 ID (UC...)';
COMMENT ON COLUMN xylo.youtube_channels.verification_code IS '채널 인증 코드 (XYLO-XXXXXXXX)';
COMMENT ON COLUMN xylo.youtube_channels.is_verified IS '채널 인증 완료 여부';
COMMENT ON COLUMN xylo.youtube_channels.verified_at IS '채널 인증 완료 일시';

-- 유튜브 비디오 정보
CREATE TABLE IF NOT EXISTS xylo.youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES xylo.youtube_channels(id) ON DELETE CASCADE,
    video_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(500),
    description TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMPTZ,
    duration INTEGER,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    tags TEXT[],
    is_shorts BOOLEAN DEFAULT FALSE,
    is_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youtube_videos_channel_id ON xylo.youtube_videos(channel_id);
CREATE INDEX idx_youtube_videos_published ON xylo.youtube_videos(published_at DESC);
CREATE INDEX idx_youtube_videos_shorts ON xylo.youtube_videos(is_shorts) WHERE is_shorts = TRUE;
CREATE INDEX idx_youtube_videos_tags ON xylo.youtube_videos USING GIN(tags);

COMMENT ON TABLE xylo.youtube_videos IS '유튜브 비디오 정보';
COMMENT ON COLUMN xylo.youtube_videos.video_id IS '유튜브 비디오 ID';
COMMENT ON COLUMN xylo.youtube_videos.duration IS '비디오 길이 (초)';
COMMENT ON COLUMN xylo.youtube_videos.tags IS '비디오 태그 배열';
COMMENT ON COLUMN xylo.youtube_videos.is_shorts IS 'Shorts 여부 (60초 이하)';
COMMENT ON COLUMN xylo.youtube_videos.is_eligible IS '포인트 적립 대상 여부 (#WITCHES, #XYLO 태그 포함)';

-- 유튜브 비디오 통계 스냅샷 (일별)
CREATE TABLE IF NOT EXISTS xylo.youtube_video_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES xylo.youtube_videos(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(video_id, snapshot_date)
);

CREATE INDEX idx_youtube_snapshots_video ON xylo.youtube_video_snapshots(video_id);
CREATE INDEX idx_youtube_snapshots_date ON xylo.youtube_video_snapshots(snapshot_date DESC);

COMMENT ON TABLE xylo.youtube_video_snapshots IS '일별 비디오 통계 스냅샷 (포인트 증가분 계산용)';
COMMENT ON COLUMN xylo.youtube_video_snapshots.snapshot_date IS '스냅샷 날짜 (매일 00:00 UTC+9 생성)';
COMMENT ON COLUMN xylo.youtube_video_snapshots.view_count IS '해당 시점의 조회수';
COMMENT ON COLUMN xylo.youtube_video_snapshots.like_count IS '해당 시점의 좋아요 수';

-- =============================================
-- 4. 포인트 시스템 테이블
-- =============================================

-- 사용자별 포인트 집계
CREATE TABLE IF NOT EXISTS xylo.user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES xylo.users(id) ON DELETE CASCADE,

    -- 총 포인트
    total_points INTEGER NOT NULL DEFAULT 0,

    -- 슬롯별 포인트 (ERC-3525 슬롯 구조 매핑)
    slot_01_content INTEGER NOT NULL DEFAULT 0,
    slot_02_mgm INTEGER NOT NULL DEFAULT 0,
    slot_03_event INTEGER NOT NULL DEFAULT 0,
    slot_04_profit INTEGER NOT NULL DEFAULT 0,
    slot_05_sponsor INTEGER NOT NULL DEFAULT 0,
    slot_06_boost INTEGER NOT NULL DEFAULT 0,

    -- SBT 총 밸류 (SLOT-01~05 합계, 캐시용)
    sbt_value INTEGER NOT NULL DEFAULT 0,

    last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_points_positive CHECK (total_points >= 0)
);

CREATE INDEX idx_user_points_total ON xylo.user_points(total_points DESC);
CREATE INDEX idx_user_points_sbt ON xylo.user_points(sbt_value DESC);

COMMENT ON TABLE xylo.user_points IS '사용자별 포인트 집계 (실시간 업데이트)';
COMMENT ON COLUMN xylo.user_points.total_points IS '총 포인트 (SLOT-01~06 합계)';
COMMENT ON COLUMN xylo.user_points.slot_01_content IS 'SLOT-01: 콘텐츠 확산 포인트 (조회수, 좋아요, 공유)';
COMMENT ON COLUMN xylo.user_points.slot_02_mgm IS 'SLOT-02: 신규 팬 유입 포인트 (레퍼럴)';
COMMENT ON COLUMN xylo.user_points.slot_03_event IS 'SLOT-03: 팬 협업 이벤트 포인트 (투표, 공모전)';
COMMENT ON COLUMN xylo.user_points.slot_04_profit IS 'SLOT-04: 실물 판매형 수익 포인트';
COMMENT ON COLUMN xylo.user_points.slot_05_sponsor IS 'SLOT-05: 브랜드 협찬형 포인트';
COMMENT ON COLUMN xylo.user_points.slot_06_boost IS 'SLOT-06: MVP 종료 후 Boost 포인트 (300P 고정)';
COMMENT ON COLUMN xylo.user_points.sbt_value IS 'SBT 총 밸류 (SLOT-01~05 합계, XLT 교환 비율 계산용)';

-- 일별 포인트 히스토리
CREATE TABLE IF NOT EXISTS xylo.point_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- 일별 총계
    day_total INTEGER NOT NULL DEFAULT 0,

    -- 카테고리별 상세
    contents INTEGER NOT NULL DEFAULT 0,
    referral INTEGER NOT NULL DEFAULT 0,
    event INTEGER NOT NULL DEFAULT 0,
    profit INTEGER NOT NULL DEFAULT 0,
    boost INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX idx_point_history_user ON xylo.point_history(user_id, date DESC);
CREATE INDEX idx_point_history_date ON xylo.point_history(date DESC);

COMMENT ON TABLE xylo.point_history IS '일별 포인트 획득 내역 (마이페이지 Point History용)';
COMMENT ON COLUMN xylo.point_history.date IS '날짜 (매일 자정 00:00 UTC+9 집계)';
COMMENT ON COLUMN xylo.point_history.day_total IS '해당 날짜의 총 획득 포인트';

-- 포인트 거래 로그
CREATE TABLE IF NOT EXISTS xylo.point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    category xylo.point_category NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_point_tx_user ON xylo.point_transactions(user_id, created_at DESC);
CREATE INDEX idx_point_tx_category ON xylo.point_transactions(category);
CREATE INDEX idx_point_tx_created ON xylo.point_transactions(created_at DESC);

COMMENT ON TABLE xylo.point_transactions IS '포인트 거래 로그 (감사 추적용, 불변)';
COMMENT ON COLUMN xylo.point_transactions.category IS '포인트 카테고리 (CONTENT, MGM, EVENT, PROFIT, SPONSOR, BOOST)';
COMMENT ON COLUMN xylo.point_transactions.amount IS '포인트 수량 (양수: 획득, 음수: 차감)';
COMMENT ON COLUMN xylo.point_transactions.reason IS '포인트 지급/차감 사유';
COMMENT ON COLUMN xylo.point_transactions.metadata IS '추가 정보 (video_id, referral_id 등 JSON 형식)';

-- =============================================
-- 5. 리더보드 테이블 (채널별 랭킹)
-- =============================================

CREATE TABLE IF NOT EXISTS xylo.leaderboard_entries (
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

CREATE INDEX idx_leaderboard_period ON xylo.leaderboard_entries(period, rank);
CREATE INDEX idx_leaderboard_user ON xylo.leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_channel ON xylo.leaderboard_entries(channel_id);
CREATE INDEX idx_leaderboard_snapshot ON xylo.leaderboard_entries(snapshot_date DESC);

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

-- =============================================
-- 6. NFT 관리 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS xylo.user_nfts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    nft_type xylo.nft_type NOT NULL,

    -- 블록체인 정보
    token_id BIGINT,
    contract_address VARCHAR(42),
    chain_id INTEGER DEFAULT 80001,

    -- 메타데이터
    name VARCHAR(255),
    description TEXT,
    image_url TEXT,
    tier INTEGER,
    metadata JSONB,

    -- 소각형 NFT용
    is_burned BOOLEAN DEFAULT FALSE,
    burned_at TIMESTAMPTZ,

    minted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tier_range CHECK (tier IS NULL OR (tier BETWEEN 1 AND 5))
);

CREATE INDEX idx_user_nfts_user ON xylo.user_nfts(user_id);
CREATE INDEX idx_user_nfts_type ON xylo.user_nfts(nft_type);
CREATE INDEX idx_user_nfts_token ON xylo.user_nfts(contract_address, token_id);

COMMENT ON TABLE xylo.user_nfts IS '사용자 NFT 컬렉션';
COMMENT ON COLUMN xylo.user_nfts.nft_type IS 'NFT 유형 (SBT: User Pass, TIER: 등급형, REWARD: 리워드형, CONNECTION: 소각형)';
COMMENT ON COLUMN xylo.user_nfts.token_id IS '온체인 토큰 ID';
COMMENT ON COLUMN xylo.user_nfts.contract_address IS '스마트 컨트랙트 주소';
COMMENT ON COLUMN xylo.user_nfts.chain_id IS '체인 ID (80001: Mumbai, 137: Polygon)';
COMMENT ON COLUMN xylo.user_nfts.tier IS '티어 레벨 (1~5, TIER 타입만 해당)';
COMMENT ON COLUMN xylo.user_nfts.metadata IS 'NFT 메타데이터 (JSON)';
COMMENT ON COLUMN xylo.user_nfts.is_burned IS '소각 여부 (CONNECTION 타입만 가능)';

-- =============================================
-- 7. 레퍼럴 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS xylo.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,

    -- 완료 조건 추적
    is_joined BOOLEAN DEFAULT FALSE,
    is_discord_joined BOOLEAN DEFAULT FALSE,
    is_video_posted BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,

    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(referrer_id, referee_id),
    CONSTRAINT chk_no_self_referral CHECK (referrer_id != referee_id)
);

CREATE INDEX idx_referrals_referrer ON xylo.referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON xylo.referrals(referee_id);
CREATE INDEX idx_referrals_code ON xylo.referrals(referral_code);
CREATE INDEX idx_referrals_completed ON xylo.referrals(is_completed);

COMMENT ON TABLE xylo.referrals IS '추천인-피추천인 관계';
COMMENT ON COLUMN xylo.referrals.referrer_id IS '추천인 (포인트 +2P)';
COMMENT ON COLUMN xylo.referrals.referee_id IS '피추천인 (포인트 +1P)';
COMMENT ON COLUMN xylo.referrals.is_joined IS '1단계: 커뮤니티 가입 완료';
COMMENT ON COLUMN xylo.referrals.is_discord_joined IS '2단계: 디스코드 가입 완료';
COMMENT ON COLUMN xylo.referrals.is_video_posted IS '3단계: 영상 업로드 완료 (필수 태그 포함)';
COMMENT ON COLUMN xylo.referrals.is_completed IS '모든 조건 완료 여부 (완료 시 포인트 자동 지급)';

-- =============================================
-- 8. 이벤트 참여 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS xylo.event_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
    event_type xylo.event_type NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    event_name VARCHAR(255),

    -- 투표형
    vote_weight INTEGER,

    -- 공모전형
    submission_url TEXT,
    is_winner BOOLEAN DEFAULT FALSE,
    prize VARCHAR(255),

    participated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user ON xylo.event_participations(user_id);
CREATE INDEX idx_events_type ON xylo.event_participations(event_type);
CREATE INDEX idx_events_id ON xylo.event_participations(event_id);

COMMENT ON TABLE xylo.event_participations IS '이벤트 참여 내역 (투표, 공모전, 커뮤니티 활동)';
COMMENT ON COLUMN xylo.event_participations.event_type IS '이벤트 유형 (VOTE: 투표, CONTEST: 공모전, COMMUNITY: 커뮤니티)';
COMMENT ON COLUMN xylo.event_participations.vote_weight IS '투표권 (누적 포인트에 비례, 100P당 1표)';
COMMENT ON COLUMN xylo.event_participations.is_winner IS '공모전 당선 여부';

-- =============================================
-- 9. 시스템 설정 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS xylo.system_configs (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE xylo.system_configs IS '시스템 설정 (Key-Value 저장소)';
COMMENT ON COLUMN xylo.system_configs.key IS '설정 키';
COMMENT ON COLUMN xylo.system_configs.value IS '설정 값 (JSON 형식)';

-- 기본 설정값 삽입
INSERT INTO xylo.system_configs (key, value, description) VALUES
    ('mvp_end_date', '"2025-06-30"', 'MVP 종료일 (이후 XLT Claim 가능)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO xylo.system_configs (key, value, description) VALUES
    ('boost_points', '300', 'SLOT-06 Boost 고정 포인트')
ON CONFLICT (key) DO NOTHING;

INSERT INTO xylo.system_configs (key, value, description) VALUES
    ('required_tags', '["#WITCHES", "#XYLO"]', '필수 해시태그 (포인트 적립 대상)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO xylo.system_configs (key, value, description) VALUES
    ('point_rules', '{
        "view": 1,
        "like": 1,
        "share": 1,
        "referrer": 2,
        "referee": 1
    }', '포인트 지급 규칙')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 10. 트리거 함수 정의
-- =============================================

-- 포인트 자동 집계 트리거 함수
CREATE OR REPLACE FUNCTION xylo.update_user_points()
RETURNS TRIGGER AS $$
DECLARE
    v_content INTEGER;
    v_mgm INTEGER;
    v_event INTEGER;
    v_profit INTEGER;
    v_sponsor INTEGER;
    v_boost INTEGER;
    v_sbt_value INTEGER;
    v_total_points INTEGER;
BEGIN
    -- user_points 테이블이 존재하지 않으면 생성
    INSERT INTO xylo.user_points (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 각 카테고리별 포인트 합계 계산
    SELECT
        COALESCE(SUM(CASE WHEN category = 'CONTENT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'MGM' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'EVENT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'PROFIT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'SPONSOR' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'BOOST' THEN amount ELSE 0 END), 0)
    INTO v_content, v_mgm, v_event, v_profit, v_sponsor, v_boost
    FROM xylo.point_transactions
    WHERE user_id = NEW.user_id;

    -- SBT 밸류 및 총 포인트 계산
    v_sbt_value := v_content + v_mgm + v_event + v_profit + v_sponsor;
    v_total_points := v_sbt_value + v_boost;

    -- user_points 업데이트
    UPDATE xylo.user_points
    SET
        slot_01_content = v_content,
        slot_02_mgm = v_mgm,
        slot_03_event = v_event,
        slot_04_profit = v_profit,
        slot_05_sponsor = v_sponsor,
        slot_06_boost = v_boost,
        sbt_value = v_sbt_value,
        total_points = v_total_points,
        last_calculated = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION xylo.update_user_points() IS '포인트 거래 발생 시 user_points 자동 집계 (트리거)';

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_update_user_points ON xylo.point_transactions;
CREATE TRIGGER trg_update_user_points
    AFTER INSERT ON xylo.point_transactions
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_user_points();

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION xylo.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION xylo.update_updated_at_column() IS 'updated_at 컬럼 자동 업데이트';

-- updated_at 트리거 생성 (모든 테이블에 적용)
DROP TRIGGER IF EXISTS trg_users_updated_at ON xylo.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON xylo.users
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_social_accounts_updated_at ON xylo.social_accounts;
CREATE TRIGGER trg_social_accounts_updated_at
    BEFORE UPDATE ON xylo.social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_youtube_channels_updated_at ON xylo.youtube_channels;
CREATE TRIGGER trg_youtube_channels_updated_at
    BEFORE UPDATE ON xylo.youtube_channels
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_youtube_videos_updated_at ON xylo.youtube_videos;
CREATE TRIGGER trg_youtube_videos_updated_at
    BEFORE UPDATE ON xylo.youtube_videos
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_points_updated_at ON xylo.user_points;
CREATE TRIGGER trg_user_points_updated_at
    BEFORE UPDATE ON xylo.user_points
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_nfts_updated_at ON xylo.user_nfts;
CREATE TRIGGER trg_user_nfts_updated_at
    BEFORE UPDATE ON xylo.user_nfts
    FOR EACH ROW
    EXECUTE FUNCTION xylo.update_updated_at_column();

-- =============================================
-- 완료!
-- =============================================

-- 생성된 테이블 확인
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'xylo'
ORDER BY tablename;
