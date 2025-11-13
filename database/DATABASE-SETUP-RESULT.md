# XYLO 데이터베이스 구축 결과

> 작성일: 2025-01-07
> 데이터베이스: PostgreSQL 15 (Koyeb)
> 스키마: xylo

---

## ✅ 구축 완료

### 1️⃣ 데이터베이스 연결 정보

```
HOST: ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app
PORT: 5432
DATABASE: unble
USER: unble
SCHEMA: xylo
SSL: Required
```

### 2️⃣ 생성된 객체 요약

| 항목 | 개수 | 비고 |
|------|------|------|
| ENUM 타입 | 5 | social_platform, point_category, leaderboard_period, nft_type, event_type |
| 테이블 | 13 | 총 528 kB |
| 인덱스 | 57 | 성능 최적화 (채널별 리더보드 인덱스 포함) |
| 트리거 | 7 | 자동 집계 및 updated_at 관리 |
| 외래키 제약조건 | 13 | 데이터 무결성 보장 (채널별 랭킹 FK 포함) |
| 시스템 설정 | 4 | MVP 설정값 초기화 완료 |

---

## 📊 ENUM 타입 (5개)

### 1. `social_platform`
소셜 미디어 플랫폼 목록
```
- X
- YOUTUBE
- INSTAGRAM
- DISCORD
```

### 2. `point_category`
포인트 카테고리 (ERC-3525 슬롯 매핑)
```
- CONTENT (SLOT-01)
- MGM (SLOT-02)
- EVENT (SLOT-03)
- PROFIT (SLOT-04)
- SPONSOR (SLOT-05)
- BOOST (SLOT-06)
```

### 3. `leaderboard_period`
리더보드 집계 기간
```
- ALL (전체)
- 1D (1일)
- 1W (1주)
- 1M (1개월)
- 3M (3개월)
```

### 4. `nft_type`
NFT 유형
```
- SBT (User Pass, Soul-Bound Token)
- TIER (등급형 NFT)
- REWARD (리워드형 NFT)
- CONNECTION (소각형 NFT)
```

### 5. `event_type`
이벤트 유형
```
- VOTE (투표)
- CONTEST (공모전)
- COMMUNITY (커뮤니티 활동)
```

---

## 📁 테이블 구조 (13개)

### 1️⃣ 사용자 관리 (2개)

#### `users` (48 kB)
사용자 기본 정보 - X(트위터) OAuth 기반 가입
- **Primary Key**: id (UUID)
- **Unique Keys**: x_id, email, wallet_address, referral_code
- **주요 컬럼**: x_handle, x_display_name, profile_image_url
- **트리거**: updated_at 자동 업데이트

#### `social_accounts` (40 kB)
소셜 미디어 계정 연동 정보
- **Primary Key**: id (UUID)
- **Foreign Key**: user_id → users.id
- **Unique Constraint**: (user_id, platform, account_id)
- **인덱스**: user_id, platform
- **트리거**: updated_at 자동 업데이트

---

### 2️⃣ 유튜브 관리 (3개)

#### `youtube_channels` (48 kB)
유튜브 채널 정보 및 인증
- **Primary Key**: id (UUID)
- **Foreign Key**: user_id → users.id
- **Unique Keys**: channel_id, verification_code
- **주요 컬럼**: channel_url, subscriber_count, is_verified
- **인덱스**: user_id, is_verified
- **트리거**: updated_at 자동 업데이트

#### `youtube_videos` (64 kB)
유튜브 비디오 정보
- **Primary Key**: id (UUID)
- **Foreign Key**: channel_id → youtube_channels.id
- **Unique Key**: video_id
- **주요 컬럼**: title, view_count, like_count, tags[], is_shorts, is_eligible
- **인덱스**: channel_id, published_at, is_shorts, tags (GIN)
- **트리거**: updated_at 자동 업데이트

#### `youtube_video_snapshots` (32 kB)
일별 비디오 통계 스냅샷 (포인트 증가분 계산용)
- **Primary Key**: id (UUID)
- **Foreign Key**: video_id → youtube_videos.id
- **Unique Constraint**: (video_id, snapshot_date)
- **주요 컬럼**: snapshot_date, view_count, like_count
- **인덱스**: video_id, snapshot_date

---

### 3️⃣ 포인트 시스템 (3개)

#### `user_points` (32 kB)
사용자별 포인트 집계 (실시간 업데이트)
- **Primary Key**: id (UUID)
- **Unique Key**: user_id
- **Foreign Key**: user_id → users.id
- **주요 컬럼**:
  - total_points (SLOT-01~06 합계)
  - slot_01_content (콘텐츠 확산)
  - slot_02_mgm (신규 팬 유입)
  - slot_03_event (팬 협업 이벤트)
  - slot_04_profit (실물 판매형 수익)
  - slot_05_sponsor (브랜드 협찬)
  - slot_06_boost (MVP 종료 후 Boost 300P)
  - sbt_value (SLOT-01~05 합계, XLT 교환용)
- **인덱스**: total_points, sbt_value
- **트리거**:
  - point_transactions INSERT 시 자동 집계
  - updated_at 자동 업데이트
- **제약조건**: total_points >= 0

#### `point_history` (32 kB)
일별 포인트 획득 내역 (마이페이지 Point History용)
- **Primary Key**: id (UUID)
- **Foreign Key**: user_id → users.id
- **Unique Constraint**: (user_id, date)
- **주요 컬럼**: date, day_total, contents, referral, event, profit, boost
- **인덱스**: (user_id, date), date

#### `point_transactions` (40 kB)
포인트 거래 로그 (감사 추적용, 불변)
- **Primary Key**: id (UUID)
- **Foreign Key**: user_id → users.id
- **주요 컬럼**: category, amount, reason, metadata (JSONB)
- **인덱스**: (user_id, created_at), category, created_at
- **트리거**: INSERT 시 user_points 자동 집계

---

### 4️⃣ 리더보드 (1개)

#### `leaderboard_entries` (56 kB)
기간별 **채널별** 리더보드 스냅샷 (캐싱용)
- **Primary Key**: id (UUID)
- **Foreign Keys**:
  - user_id → users.id
  - channel_id → youtube_channels.id (ON DELETE SET NULL)
- **Unique Constraint**: (period, rank, snapshot_date)
- **주요 컬럼**:
  - **기간**: period (ALL, 1D, 1W, 1M, 3M)
  - **순위**: rank
  - **포인트**: total_current, contents, mgm, event, profit, boost
  - **채널 스냅샷**: channel_title, channel_image_url
  - **사용자 스냅샷**: x_handle, profile_image_url
- **인덱스**: (period, rank), user_id, channel_id, snapshot_date
- **설명**:
  - 리더보드 표시는 **채널명 기준**으로 표시
  - 이미지 우선순위: 사용자 업로드 이미지 > 채널 이미지
  - 스냅샷 시점의 정보를 보존하여 히스토리 추적 가능

---

### 5️⃣ NFT 관리 (1개)

#### `user_nfts` (40 kB)
사용자 NFT 컬렉션
- **Primary Key**: id (UUID)
- **Foreign Key**: user_id → users.id
- **주요 컬럼**:
  - nft_type (SBT, TIER, REWARD, CONNECTION)
  - token_id, contract_address, chain_id
  - tier (1~5, TIER 타입만)
  - metadata (JSONB)
  - is_burned, burned_at (CONNECTION 타입용)
- **인덱스**: user_id, nft_type, (contract_address, token_id)
- **트리거**: updated_at 자동 업데이트
- **제약조건**: tier BETWEEN 1 AND 5

---

### 6️⃣ 레퍼럴 (1개)

#### `referrals` (48 kB)
추천인-피추천인 관계
- **Primary Key**: id (UUID)
- **Foreign Keys**:
  - referrer_id → users.id (추천인, +2P)
  - referee_id → users.id (피추천인, +1P)
- **Unique Constraint**: (referrer_id, referee_id)
- **주요 컬럼**:
  - is_joined (1단계: 커뮤니티 가입)
  - is_discord_joined (2단계: 디스코드 가입)
  - is_video_posted (3단계: 영상 업로드)
  - is_completed (완료 시 포인트 자동 지급)
- **인덱스**: referrer_id, referee_id, referral_code, is_completed
- **제약조건**: referrer_id ≠ referee_id (자기 추천 방지)

---

### 7️⃣ 이벤트 참여 (1개)

#### `event_participations` (40 kB)
이벤트 참여 내역 (투표, 공모전, 커뮤니티 활동)
- **Primary Key**: id (UUID)
- **Foreign Key**: user_id → users.id
- **주요 컬럼**:
  - event_type, event_id, event_name
  - vote_weight (투표권, 100P당 1표)
  - submission_url, is_winner, prize (공모전용)
- **인덱스**: user_id, event_type, event_id

---

### 8️⃣ 시스템 설정 (1개)

#### `system_configs` (32 kB)
시스템 설정 (Key-Value 저장소)
- **Primary Key**: key (VARCHAR)
- **주요 컬럼**: value (JSONB), description

**초기 설정값**:
```json
{
  "mvp_end_date": "2025-06-30",
  "boost_points": 300,
  "required_tags": ["#WITCHES", "#XYLO"],
  "point_rules": {
    "view": 1,
    "like": 1,
    "share": 1,
    "referrer": 2,
    "referee": 1
  }
}
```

---

## 🔗 외래키 제약조건 (13개)

```
event_participations.user_id → users.id
leaderboard_entries.channel_id → youtube_channels.id (ON DELETE SET NULL)
leaderboard_entries.user_id → users.id
point_history.user_id → users.id
point_transactions.user_id → users.id
referrals.referee_id → users.id
referrals.referrer_id → users.id
social_accounts.user_id → users.id
user_nfts.user_id → users.id
user_points.user_id → users.id
youtube_channels.user_id → users.id
youtube_video_snapshots.video_id → youtube_videos.id
youtube_videos.channel_id → youtube_channels.id
```

**삭제 정책**:
- 대부분의 외래키: `ON DELETE CASCADE`
- `leaderboard_entries.channel_id`: `ON DELETE SET NULL` (히스토리 보존)

---

## ⚙️ 트리거 (7개)

### 1. 포인트 자동 집계
**트리거명**: `trg_update_user_points`
**이벤트**: `point_transactions` INSERT 시
**동작**: `user_points` 테이블의 슬롯별 포인트 자동 집계

### 2~7. updated_at 자동 업데이트
다음 테이블의 UPDATE 시 `updated_at` 컬럼 자동 업데이트:
- users
- social_accounts
- youtube_channels
- youtube_videos
- user_points
- user_nfts

---

## 🚀 다음 단계

### 1. Prisma 스키마 생성
```bash
cd backend
npx prisma db pull
npx prisma generate
```

### 2. NestJS 프로젝트 설정
```bash
npm install @nestjs/core @nestjs/common
npm install @prisma/client prisma
npm install @nestjs/bull bull
npm install ioredis
npm install passport passport-twitter
npm install googleapis
```

### 3. 환경변수 설정 (.env)
```bash
# Database
DATABASE_URL="postgresql://unble:npg_1kjV0mhECxqs@ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app/unble?schema=xylo&sslmode=require"

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Twitter
TWITTER_CONSUMER_KEY=your_consumer_key
TWITTER_CONSUMER_SECRET=your_consumer_secret

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key

# Blockchain
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR-API-KEY
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=deployed_contract_address
```

### 4. 백엔드 개발 시작
- [00-BACKEND-QUICK-REFERENCE.md](../docs/00-BACKEND-QUICK-REFERENCE.md) - 빠른 참조
- [09-BACKEND-LOGIC-SPEC.md](../docs/09-BACKEND-LOGIC-SPEC.md) - 비즈니스 로직 상세
- [10-EXTERNAL-API-INTEGRATION.md](../docs/10-EXTERNAL-API-INTEGRATION.md) - API 연동
- [11-QUEUE-JOBS-SPEC.md](../docs/11-QUEUE-JOBS-SPEC.md) - Queue 작업 정의

---

## 📝 검증 스크립트

### 테이블 구조 확인
```bash
node database/verify-tables.js
```

### 마이그레이션 재실행
```bash
node database/run-migration.js
```

---

**작성자**: Backend Team
**데이터베이스 생성 완료일**: 2025-01-07
**다음 업데이트**: Prisma 스키마 생성 후
