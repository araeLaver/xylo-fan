# XYLO 데이터베이스 스키마 설계

> 작성일: 2025-01-07
> 대상: 백엔드 개발자
> 목적: Koyeb PostgreSQL "xylo" 스키마 설계

---

## 📋 목차

1. [개요](#1-개요)
2. [ERD](#2-erd)
3. [테이블 정의](#3-테이블-정의)
4. [인덱스 전략](#4-인덱스-전략)
5. [데이터 정합성](#5-데이터-정합성)

---

## 1. 개요

### 1.1 데이터베이스 정보

```
Host:     ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app
Database: unble
Schema:   xylo
Engine:   PostgreSQL 15
SSL:      Required
```

### 1.2 설계 원칙

1. **정규화**: 3NF 수준 유지, 성능 필요 시 선택적 비정규화
2. **확장성**: 파티셔닝 고려 (특히 PointHistory, YouTubeVideoSnapshot)
3. **성능**: 적절한 인덱스, JSONB 활용
4. **감사**: createdAt, updatedAt 필수 포함

---

## 2. ERD

```
┌─────────────┐
│    User     │
└─────────────┘
      ↑
      │ 1:N
      ↓
┌─────────────────┐     ┌──────────────────┐
│ SocialAccount   │────→│ YouTubeChannel   │
└─────────────────┘     └──────────────────┘
                               ↓ 1:N
                        ┌──────────────────┐
                        │  YouTubeVideo    │
                        └──────────────────┘

┌─────────────┐
│    User     │
└─────────────┘
      ↑
      │ 1:1
      ↓
┌─────────────┐
│  UserPoint  │
└─────────────┘
      ↑
      │ 1:N
      ↓
┌─────────────┐
│ PointHistory│
└─────────────┘

┌─────────────┐
│    User     │
└─────────────┘
      ↑
      │ 1:N
      ↓
┌─────────────┐
│  UserNFT    │
└─────────────┘

┌─────────────┐       ┌─────────────┐
│    User     │──────→│   Referral  │
│ (Referrer)  │ 1:N   │             │
└─────────────┘       └─────────────┘
                            ↑
                            │ N:1
                      ┌─────────────┐
                      │    User     │
                      │  (Referee)  │
                      └─────────────┘
```

---

## 3. 테이블 정의

### 3.1 사용자 관리

#### `users`

```sql
CREATE TABLE xylo.users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_id              VARCHAR(255) NOT NULL UNIQUE,  -- X(Twitter) user ID
  x_handle          VARCHAR(255) NOT NULL,         -- @username
  x_display_name    VARCHAR(255),
  email             VARCHAR(255) UNIQUE,
  email_verified    BOOLEAN DEFAULT FALSE,
  wallet_address    VARCHAR(42) UNIQUE,            -- Ethereum address
  profile_image_url TEXT,
  referral_code     VARCHAR(20) NOT NULL UNIQUE,   -- 고유 추천 코드
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE xylo.users IS '사용자 계정';
COMMENT ON COLUMN xylo.users.x_id IS 'X(Twitter) 고유 ID';
COMMENT ON COLUMN xylo.users.referral_code IS '레퍼럴 링크 생성용 고유 코드';
```

#### `social_accounts`

```sql
CREATE TYPE xylo.social_platform AS ENUM ('X', 'YOUTUBE', 'INSTAGRAM', 'DISCORD');

CREATE TABLE xylo.social_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  platform         xylo.social_platform NOT NULL,
  account_id       VARCHAR(255) NOT NULL,  -- 플랫폼별 고유 ID
  handle           VARCHAR(255),
  display_name     VARCHAR(255),
  profile_image    TEXT,
  is_verified      BOOLEAN DEFAULT FALSE,
  is_primary       BOOLEAN DEFAULT FALSE,  -- 메인 채널 여부
  connected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform, account_id)
);

CREATE INDEX idx_social_accounts_user_id ON xylo.social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON xylo.social_accounts(platform);

COMMENT ON TABLE xylo.social_accounts IS '소셜 계정 연동 정보';
```

---

### 3.2 유튜브 채널 관리

#### `youtube_channels`

```sql
CREATE TABLE xylo.youtube_channels (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  channel_id           VARCHAR(255) NOT NULL UNIQUE,
  channel_url          TEXT NOT NULL,
  channel_title        VARCHAR(255),
  channel_description  TEXT,
  thumbnail_url        TEXT,
  subscriber_count     INTEGER DEFAULT 0,
  video_count          INTEGER DEFAULT 0,
  view_count           BIGINT DEFAULT 0,
  verification_code    VARCHAR(50) UNIQUE,  -- 인증코드 (예: XYLO-AB12CD34)
  is_verified          BOOLEAN DEFAULT FALSE,
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youtube_channels_user_id ON xylo.youtube_channels(user_id);
CREATE INDEX idx_youtube_channels_verified ON xylo.youtube_channels(is_verified);

COMMENT ON TABLE xylo.youtube_channels IS '유튜브 채널 정보';
COMMENT ON COLUMN xylo.youtube_channels.verification_code IS '채널 설명란에 입력할 인증 코드';
```

#### `youtube_videos`

```sql
CREATE TABLE xylo.youtube_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        UUID NOT NULL REFERENCES xylo.youtube_channels(id) ON DELETE CASCADE,
  video_id          VARCHAR(255) NOT NULL UNIQUE,
  title             VARCHAR(500),
  description       TEXT,
  thumbnail_url     TEXT,
  published_at      TIMESTAMPTZ,
  duration          INTEGER,  -- 초 단위
  view_count        INTEGER DEFAULT 0,
  like_count        INTEGER DEFAULT 0,
  comment_count     INTEGER DEFAULT 0,
  tags              TEXT[],   -- 해시태그 배열
  is_shorts         BOOLEAN DEFAULT FALSE,
  is_eligible       BOOLEAN DEFAULT FALSE,  -- 포인트 대상 여부 (특정 태그 포함)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_youtube_videos_channel_id ON xylo.youtube_videos(channel_id);
CREATE INDEX idx_youtube_videos_published ON xylo.youtube_videos(published_at DESC);
CREATE INDEX idx_youtube_videos_shorts ON xylo.youtube_videos(is_shorts) WHERE is_shorts = TRUE;
CREATE INDEX idx_youtube_videos_tags ON xylo.youtube_videos USING GIN(tags);

COMMENT ON TABLE xylo.youtube_videos IS '유튜브 비디오 정보';
COMMENT ON COLUMN xylo.youtube_videos.is_eligible IS '포인트 계산 대상 여부 (#WITCHES 등 필수 태그 포함)';
```

#### `youtube_video_snapshots`

```sql
CREATE TABLE xylo.youtube_video_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id          UUID NOT NULL REFERENCES xylo.youtube_videos(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,
  view_count        INTEGER DEFAULT 0,
  like_count        INTEGER DEFAULT 0,
  comment_count     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(video_id, snapshot_date)
);

CREATE INDEX idx_youtube_snapshots_video ON xylo.youtube_video_snapshots(video_id);
CREATE INDEX idx_youtube_snapshots_date ON xylo.youtube_video_snapshots(snapshot_date DESC);

COMMENT ON TABLE xylo.youtube_video_snapshots IS '일별 비디오 통계 스냅샷 (포인트 계산용)';
```

---

### 3.3 포인트 시스템

#### `user_points`

```sql
CREATE TABLE xylo.user_points (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES xylo.users(id) ON DELETE CASCADE,

  -- 총 포인트
  total_points     INTEGER NOT NULL DEFAULT 0,

  -- 슬롯별 포인트 (ERC-3525 슬롯 구조 매핑)
  slot_01_content  INTEGER NOT NULL DEFAULT 0,  -- SLOT-01: 콘텐츠 확산
  slot_02_mgm      INTEGER NOT NULL DEFAULT 0,  -- SLOT-02: 신규 팬 유입 (MGM)
  slot_03_event    INTEGER NOT NULL DEFAULT 0,  -- SLOT-03: 팬 협업 이벤트
  slot_04_profit   INTEGER NOT NULL DEFAULT 0,  -- SLOT-04: 실물 판매형 수익
  slot_05_sponsor  INTEGER NOT NULL DEFAULT 0,  -- SLOT-05: 브랜드 협찬형
  slot_06_boost    INTEGER NOT NULL DEFAULT 0,  -- SLOT-06: MVP 종료 Boost (고정 300P)

  -- SBT 총 밸류 (SLOT-01~05 합계, 캐시용)
  sbt_value        INTEGER NOT NULL DEFAULT 0,

  last_calculated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_points_total ON xylo.user_points(total_points DESC);
CREATE INDEX idx_user_points_sbt ON xylo.user_points(sbt_value DESC);

COMMENT ON TABLE xylo.user_points IS '사용자별 포인트 집계';
COMMENT ON COLUMN xylo.user_points.sbt_value IS 'SLOT-01~05 합계 (XLT 교환 비율 계산용)';
```

#### `point_history`

```sql
CREATE TYPE xylo.point_category AS ENUM ('CONTENT', 'MGM', 'EVENT', 'PROFIT', 'SPONSOR', 'BOOST');

CREATE TABLE xylo.point_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,  -- 일별 집계

  -- 일별 총계
  day_total        INTEGER NOT NULL DEFAULT 0,

  -- 카테고리별 상세
  contents         INTEGER NOT NULL DEFAULT 0,
  referral         INTEGER NOT NULL DEFAULT 0,
  event            INTEGER NOT NULL DEFAULT 0,
  profit           INTEGER NOT NULL DEFAULT 0,
  boost            INTEGER NOT NULL DEFAULT 0,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_point_history_user ON xylo.point_history(user_id, date DESC);
CREATE INDEX idx_point_history_date ON xylo.point_history(date DESC);

COMMENT ON TABLE xylo.point_history IS '일별 포인트 획득 내역';
```

#### `point_transactions`

```sql
CREATE TABLE xylo.point_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  category         xylo.point_category NOT NULL,
  amount           INTEGER NOT NULL,
  reason           TEXT,  -- 예: "Video ID abc123 조회수 100회"
  metadata         JSONB,  -- 추가 정보 (video_id, referral_id 등)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_point_tx_user ON xylo.point_transactions(user_id, created_at DESC);
CREATE INDEX idx_point_tx_category ON xylo.point_transactions(category);
CREATE INDEX idx_point_tx_created ON xylo.point_transactions(created_at DESC);

COMMENT ON TABLE xylo.point_transactions IS '포인트 거래 로그 (감사용)';
```

---

### 3.4 리더보드 (채널별 랭킹)

#### `leaderboard_entries`

```sql
CREATE TYPE xylo.leaderboard_period AS ENUM ('ALL', '1D', '1W', '1M', '3M');

CREATE TABLE xylo.leaderboard_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  channel_id       UUID REFERENCES xylo.youtube_channels(id) ON DELETE SET NULL,
  period           xylo.leaderboard_period NOT NULL,
  rank             INTEGER NOT NULL,

  -- 포인트 상세
  total_current    INTEGER NOT NULL,
  contents         INTEGER NOT NULL,
  mgm              INTEGER NOT NULL,
  event            INTEGER NOT NULL,
  profit           INTEGER NOT NULL,
  boost            INTEGER NOT NULL,

  -- 채널 정보 스냅샷 (스냅샷 시점의 채널 정보 보존)
  channel_title       VARCHAR(255),
  channel_image_url   TEXT,

  -- 사용자 정보 스냅샷 (표시용)
  x_handle            VARCHAR(255),
  profile_image_url   TEXT,

  snapshot_date    DATE NOT NULL,  -- 스냅샷 기준일
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(period, rank, snapshot_date)
);

CREATE INDEX idx_leaderboard_period ON xylo.leaderboard_entries(period, rank);
CREATE INDEX idx_leaderboard_user ON xylo.leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_channel ON xylo.leaderboard_entries(channel_id);
CREATE INDEX idx_leaderboard_snapshot ON xylo.leaderboard_entries(snapshot_date DESC);

COMMENT ON TABLE xylo.leaderboard_entries IS '기간별 채널별 리더보드 스냅샷';
COMMENT ON COLUMN xylo.leaderboard_entries.channel_id IS '유튜브 채널 ID (대표 채널)';
COMMENT ON COLUMN xylo.leaderboard_entries.channel_title IS '채널명 (스냅샷 시점)';
COMMENT ON COLUMN xylo.leaderboard_entries.profile_image_url IS '프로필 이미지 (사용자 업로드 우선, 없으면 채널 이미지)';
```

**리더보드 표시 로직**:
- 리더보드는 **채널명 기준**으로 표시
- 이미지 우선순위: 사용자가 업로드한 이미지 > 채널 썸네일 이미지
- Top3 채널 이미지 + 채널 ID 하이라이트 표시
- 기간별 필터: ALL (전체), 1D (1일), 1W (1주), 1M (1개월), 3M (3개월)

---

### 3.5 NFT 관리

#### `user_nfts`

```sql
CREATE TYPE xylo.nft_type AS ENUM ('SBT', 'TIER', 'REWARD', 'CONNECTION');

CREATE TABLE xylo.user_nfts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  nft_type            xylo.nft_type NOT NULL,

  -- 블록체인 정보
  token_id            BIGINT,
  contract_address    VARCHAR(42),
  chain_id            INTEGER DEFAULT 80001,  -- Polygon Mumbai

  -- 메타데이터
  name                VARCHAR(255),
  description         TEXT,
  image_url           TEXT,
  tier                INTEGER,  -- 티어형 NFT용 (1~5)
  metadata            JSONB,    -- 추가 속성

  -- 소각형 NFT용
  is_burned           BOOLEAN DEFAULT FALSE,
  burned_at           TIMESTAMPTZ,

  minted_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_nfts_user ON xylo.user_nfts(user_id);
CREATE INDEX idx_user_nfts_type ON xylo.user_nfts(nft_type);
CREATE INDEX idx_user_nfts_token ON xylo.user_nfts(contract_address, token_id);

COMMENT ON TABLE xylo.user_nfts IS '사용자 NFT 컬렉션';
COMMENT ON COLUMN xylo.user_nfts.is_burned IS '커넥션형 NFT 소각 여부';
```

---

### 3.6 레퍼럴

#### `referrals`

```sql
CREATE TABLE xylo.referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  referee_id        UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  referral_code     VARCHAR(20) NOT NULL,

  -- 완료 조건 추적
  is_joined         BOOLEAN DEFAULT FALSE,
  is_discord_joined BOOLEAN DEFAULT FALSE,
  is_video_posted   BOOLEAN DEFAULT FALSE,
  is_completed      BOOLEAN DEFAULT FALSE,  -- 3가지 모두 완료

  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(referrer_id, referee_id)
);

CREATE INDEX idx_referrals_referrer ON xylo.referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON xylo.referrals(referee_id);
CREATE INDEX idx_referrals_code ON xylo.referrals(referral_code);
CREATE INDEX idx_referrals_completed ON xylo.referrals(is_completed);

COMMENT ON TABLE xylo.referrals IS '추천인-피추천인 관계';
COMMENT ON COLUMN xylo.referrals.is_completed IS '모든 조건 완료 시 포인트 지급';
```

---

### 3.7 이벤트 참여

#### `event_participations`

```sql
CREATE TYPE xylo.event_type AS ENUM ('VOTE', 'CONTEST', 'COMMUNITY');

CREATE TABLE xylo.event_participations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES xylo.users(id) ON DELETE CASCADE,
  event_type       xylo.event_type NOT NULL,
  event_id         VARCHAR(255) NOT NULL,  -- 이벤트 고유 ID
  event_name       VARCHAR(255),

  -- 투표형
  vote_weight      INTEGER,  -- 누적 포인트에 비례한 투표권

  -- 공모전형
  submission_url   TEXT,
  is_winner        BOOLEAN DEFAULT FALSE,
  prize            VARCHAR(255),

  participated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user ON xylo.event_participations(user_id);
CREATE INDEX idx_events_type ON xylo.event_participations(event_type);
CREATE INDEX idx_events_id ON xylo.event_participations(event_id);

COMMENT ON TABLE xylo.event_participations IS '이벤트 참여 내역';
```

---

### 3.8 시스템 설정

#### `system_configs`

```sql
CREATE TABLE xylo.system_configs (
  key              VARCHAR(255) PRIMARY KEY,
  value            JSONB NOT NULL,
  description      TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO xylo.system_configs (key, value, description) VALUES
  ('mvp_end_date', '"2025-06-30"', 'MVP 종료일'),
  ('boost_points', '300', 'SLOT-06 Boost 고정 포인트'),
  ('required_tags', '["#WITCHES", "#XYLO"]', '필수 해시태그'),
  ('point_rules', '{
    "view": 1,
    "like": 1,
    "share": 1,
    "referrer": 2,
    "referee": 1
  }', '포인트 지급 규칙');

COMMENT ON TABLE xylo.system_configs IS '시스템 설정 (key-value 저장소)';
```

---

## 4. 인덱스 전략

### 4.1 성능 최적화 인덱스

```sql
-- 리더보드 조회 최적화
CREATE INDEX idx_user_points_leaderboard
  ON xylo.user_points(total_points DESC, user_id);

-- 일별 포인트 조회 최적화
CREATE INDEX idx_point_history_recent
  ON xylo.point_history(user_id, date DESC)
  INCLUDE (day_total, contents, referral, event, profit, boost);

-- 유튜브 비디오 검색 최적화
CREATE INDEX idx_youtube_videos_search
  ON xylo.youtube_videos(channel_id, published_at DESC)
  WHERE is_shorts = TRUE AND is_eligible = TRUE;
```

### 4.2 파티셔닝 전략

```sql
-- point_history 월별 파티셔닝 (향후 적용)
-- ALTER TABLE xylo.point_history
--   PARTITION BY RANGE (date);

-- youtube_video_snapshots 월별 파티셔닝
-- ALTER TABLE xylo.youtube_video_snapshots
--   PARTITION BY RANGE (snapshot_date);
```

---

## 5. 데이터 정합성

### 5.1 트리거 예시

#### 포인트 자동 집계

```sql
CREATE OR REPLACE FUNCTION xylo.update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE xylo.user_points
  SET
    slot_01_content = (SELECT COALESCE(SUM(amount), 0) FROM xylo.point_transactions WHERE user_id = NEW.user_id AND category = 'CONTENT'),
    slot_02_mgm = (SELECT COALESCE(SUM(amount), 0) FROM xylo.point_transactions WHERE user_id = NEW.user_id AND category = 'MGM'),
    slot_03_event = (SELECT COALESCE(SUM(amount), 0) FROM xylo.point_transactions WHERE user_id = NEW.user_id AND category = 'EVENT'),
    slot_04_profit = (SELECT COALESCE(SUM(amount), 0) FROM xylo.point_transactions WHERE user_id = NEW.user_id AND category = 'PROFIT'),
    slot_05_sponsor = (SELECT COALESCE(SUM(amount), 0) FROM xylo.point_transactions WHERE user_id = NEW.user_id AND category = 'SPONSOR'),
    slot_06_boost = (SELECT COALESCE(SUM(amount), 0) FROM xylo.point_transactions WHERE user_id = NEW.user_id AND category = 'BOOST'),
    total_points = slot_01_content + slot_02_mgm + slot_03_event + slot_04_profit + slot_05_sponsor + slot_06_boost,
    sbt_value = slot_01_content + slot_02_mgm + slot_03_event + slot_04_profit + slot_05_sponsor,
    last_calculated = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_points
  AFTER INSERT ON xylo.point_transactions
  FOR EACH ROW
  EXECUTE FUNCTION xylo.update_user_points();
```

### 5.2 제약 조건

```sql
-- 레퍼럴 자기 참조 방지
ALTER TABLE xylo.referrals
  ADD CONSTRAINT chk_no_self_referral CHECK (referrer_id != referee_id);

-- 포인트 음수 방지
ALTER TABLE xylo.user_points
  ADD CONSTRAINT chk_points_positive CHECK (total_points >= 0);

-- 티어 범위 검증
ALTER TABLE xylo.user_nfts
  ADD CONSTRAINT chk_tier_range CHECK (tier BETWEEN 1 AND 5);
```

---

## 6. 마이그레이션 계획

### Phase 1: 기본 구조 (Week 1)
```sql
-- users, social_accounts, youtube_channels
```

### Phase 2: 포인트 시스템 (Week 2)
```sql
-- user_points, point_history, point_transactions
```

### Phase 3: 리더보드 & NFT (Week 3)
```sql
-- leaderboard_entries, user_nfts
```

### Phase 4: 레퍼럴 & 이벤트 (Week 4)
```sql
-- referrals, event_participations
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
