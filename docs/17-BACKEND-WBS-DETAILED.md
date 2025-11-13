# XYLO 백엔드 WBS (Work Breakdown Structure) - 상세

## 문서 정보
- **작성일**: 2025-01-11
- **프로젝트**: XYLO 백엔드 API 서버
- **기술 스택**: NestJS, Prisma, PostgreSQL, Redis, Bull Queue
- **목적**: 백엔드 기능별 상세 작업 분해 구조

---

## 목차
1. [WBS 1.1.1 - 인증 & 사용자 관리](#wbs-111---인증--사용자-관리)
2. [WBS 1.1.2 - YouTube 크롤링 & 데이터 수집](#wbs-112---youtube-크롤링--데이터-수집)
3. [WBS 1.1.3 - 포인트 시스템](#wbs-113---포인트-시스템)
4. [WBS 1.1.4 - 리더보드 시스템](#wbs-114---리더보드-시스템)
5. [WBS 1.1.5 - 리퍼럴 시스템](#wbs-115---리퍼럴-시스템)
6. [WBS 1.1.6 - NFT 시스템](#wbs-116---nft-시스템)
7. [WBS 1.1.7 - XLT Claim 시스템](#wbs-117---xlt-claim-시스템)
8. [WBS 1.1.8 - 이벤트 시스템](#wbs-118---이벤트-시스템)
9. [WBS 1.1.9 - 튜토리얼 시스템](#wbs-119---튜토리얼-시스템)
10. [WBS 1.1.10 - FAQ 시스템](#wbs-1110---faq-시스템)
11. [WBS 1.1.11 - 알림 시스템](#wbs-1111---알림-시스템)
12. [WBS 1.1.12 - 관리자 대시보드](#wbs-1112---관리자-대시보드)
13. [WBS 1.1.13 - Discord 연동](#wbs-1113---discord-연동)
14. [WBS 1.1.14 - 활동 통계 API](#wbs-1114---활동-통계-api)
15. [WBS 1.1.15 - X 자동 포스팅](#wbs-1115---x-자동-포스팅)

---

## WBS 1.1.1 - 인증 & 사용자 관리

### 기본 정보
- **상태**: ✅ 95% 완료 (Discord OAuth 제외)
- **공수**: 완료 10일, 잔여 2일
- **우선순위**: P0 (Core)
- **담당 모듈**: `src/auth/`, `src/users/`

### 업무 분해 구조

#### 1.1.1.1 X OAuth 2.0 인증 ✅ 완료
**설명**: X(Twitter) OAuth 2.0 기반 로그인 플로우 구현

**세부 작업**:
- [x] Twitter Strategy 구현 (`auth/strategies/twitter.strategy.ts`)
- [x] OAuth 콜백 핸들러 (`auth/auth.controller.ts:twitterCallback`)
- [x] 사용자 정보 추출 및 DB 저장
- [x] 신규 사용자 자동 생성 로직
- [x] 기존 사용자 로그인 처리

**관련 파일**:
```
backend/src/auth/
├── strategies/
│   └── twitter.strategy.ts           ✅ 완료
├── auth.controller.ts                 ✅ 완료
├── auth.service.ts                    ✅ 완료
└── auth.module.ts                     ✅ 완료
```

**API 엔드포인트**:
```
GET  /api/v1/auth/twitter              - X OAuth 시작
GET  /api/v1/auth/twitter/callback     - X OAuth 콜백
```

**데이터베이스 테이블**:
- `xylo.users` - 사용자 기본 정보
  - `twitter_id`, `twitter_username`, `twitter_name`, `profile_image_url`

**테스트 케이스**:
- [x] X OAuth 플로우 통합 테스트
- [x] 신규 사용자 생성 테스트
- [x] 기존 사용자 로그인 테스트

---

#### 1.1.1.2 JWT 토큰 발급 및 검증 ✅ 완료
**설명**: JWT 기반 세션 관리 및 API 인증

**세부 작업**:
- [x] JWT Strategy 구현 (`auth/strategies/jwt.strategy.ts`)
- [x] JWT 토큰 생성 로직 (`auth/auth.service.ts:generateJwt`)
- [x] JWT Guard 구현 (`auth/guards/jwt-auth.guard.ts`)
- [x] Access Token 발급 (1일 만료)
- [x] Refresh Token 미구현 (MVP 범위 외)

**관련 파일**:
```
backend/src/auth/
├── strategies/
│   └── jwt.strategy.ts                ✅ 완료
├── guards/
│   └── jwt-auth.guard.ts              ✅ 완료
└── auth.service.ts                    ✅ 완료
```

**환경 변수**:
```
JWT_SECRET=<secret_key>
JWT_EXPIRES_IN=1d
```

**사용 예시**:
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@Req() req: Request) {
  const { userId } = req.user;
  // ...
}
```

---

#### 1.1.1.3 이메일 인증 시스템 ✅ 완료
**설명**: 사용자 이메일 인증 및 인증 메일 발송

**세부 작업**:
- [x] 이메일 서비스 구현 (`auth/email/email.service.ts`)
- [x] 인증 코드 생성 및 저장
- [x] 인증 메일 발송 (Nodemailer)
- [x] 이메일 인증 완료 처리
- [x] 인증 코드 만료 처리 (15분)

**관련 파일**:
```
backend/src/auth/
├── email/
│   └── email.service.ts               ✅ 완료
├── dto/
│   ├── send-verification-email.dto.ts ✅ 완료
│   └── verify-email.dto.ts            ✅ 완료
└── auth.controller.ts                 ✅ 완료
```

**API 엔드포인트**:
```
POST /api/v1/auth/send-verification-email   - 인증 메일 발송
POST /api/v1/auth/verify-email              - 이메일 인증 완료
```

**데이터베이스 테이블**:
- `xylo.users` - `email`, `email_verified`, `email_verified_at`

**환경 변수**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASSWORD=<password>
```

---

#### 1.1.1.4 사용자 프로필 관리 ✅ 완료
**설명**: 사용자 프로필 조회 및 업데이트 API

**세부 작업**:
- [x] 내 프로필 조회 API (`users/users.controller.ts:getMyProfile`)
- [x] 프로필 업데이트 API (`users/users.controller.ts:updateProfile`)
- [x] 프로필 이미지 업로드 (Base64)
- [x] 닉네임, 소개 수정

**관련 파일**:
```
backend/src/users/
├── users.controller.ts                ✅ 완료
├── users.service.ts                   ✅ 완료
├── users.module.ts                    ✅ 완료
└── dto/
    └── update-profile.dto.ts          ✅ 완료
```

**API 엔드포인트**:
```
GET   /api/v1/users/me                 - 내 프로필 조회
PATCH /api/v1/users/me                 - 프로필 업데이트
```

**데이터베이스 테이블**:
- `xylo.users` - `nickname`, `bio`, `profile_image_url`

---

#### 1.1.1.5 Discord OAuth 인증 ⚠️ 미완료
**설명**: Discord OAuth 2.0 로그인 및 계정 연동

**세부 작업**:
- [ ] Discord Strategy 구현 (`auth/strategies/discord.strategy.ts`)
- [ ] Discord OAuth 콜백 핸들러
- [ ] Discord 계정 연동 (사용자 테이블에 discord_id 저장)
- [ ] JWT + State 암호화 (X 사용자와 Discord 사용자 매칭)
- [ ] Discord 연동 해제 API

**관련 파일** (예정):
```
backend/src/auth/
├── strategies/
│   └── discord.strategy.ts            ⚠️ 미완료
├── guards/
│   └── discord-auth.guard.ts          ⚠️ 미완료
└── auth.controller.ts                 수정 필요
```

**API 엔드포인트** (예정):
```
GET  /api/v1/auth/discord              - Discord OAuth 시작
GET  /api/v1/auth/discord/callback     - Discord OAuth 콜백
POST /api/v1/auth/discord/unlink       - Discord 연동 해제
```

**데이터베이스 테이블**:
- `xylo.users` - `discord_id`, `discord_username`, `discord_discriminator`

**환경 변수** (필요):
```
DISCORD_CLIENT_ID=<client_id>
DISCORD_CLIENT_SECRET=<secret>
DISCORD_CALLBACK_URL=http://localhost:3000/api/v1/auth/discord/callback
```

**JWT + State 암호화 방식**:
```typescript
// 1. Discord OAuth 시작 전 State 생성
const state = jwt.sign({ userId: req.user.userId }, JWT_SECRET, { expiresIn: '5m' });
// 2. Discord OAuth URL에 state 포함
// 3. 콜백에서 state 검증 후 userId 추출
```

**공수**: 2일
**우선순위**: P1 (High)
**차단 사유**: 없음 (독립 작업 가능)

---

### 완료 체크리스트
- [x] X OAuth 2.0 인증 플로우
- [x] JWT 토큰 발급 및 검증
- [x] 이메일 인증 시스템
- [x] 사용자 프로필 CRUD
- [ ] Discord OAuth 인증
- [ ] Discord 서버 가입 검증 (1.1.13에서 구현)

---

## WBS 1.1.2 - YouTube 크롤링 & 데이터 수집

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 5일 (완료)
- **우선순위**: P0 (Core)
- **담당 모듈**: `src/youtube/`, `src/jobs/processors/`

### 업무 분해 구조

#### 1.1.2.1 YouTube Data API 연동 ✅ 완료
**설명**: YouTube Data API v3 연동 및 채널/영상 정보 수집

**세부 작업**:
- [x] YouTube API 클라이언트 설정 (`youtube/youtube.service.ts`)
- [x] API 키 환경 변수 설정
- [x] Rate Limit 처리 (10,000 quota/day)
- [x] API 에러 핸들링

**관련 파일**:
```
backend/src/youtube/
├── youtube.service.ts                 ✅ 완료
├── youtube.controller.ts              ✅ 완료
└── youtube.module.ts                  ✅ 완료
```

**환경 변수**:
```
YOUTUBE_API_KEY=<api_key>
```

---

#### 1.1.2.2 채널 등록 및 검증 ✅ 완료
**설명**: 사용자 YouTube 채널 등록 및 소유권 검증

**세부 작업**:
- [x] 채널 등록 API (`youtube/youtube.controller.ts:registerChannel`)
- [x] 채널 ID 또는 Handle로 검증
- [x] 채널 정보 수집 (구독자, 영상 수, 설명)
- [x] 채널 소유권 검증 (채널 설명에 인증 코드 삽입)
- [x] 채널 정보 DB 저장

**관련 파일**:
```
backend/src/youtube/
├── youtube.service.ts                 ✅ 완료
├── dto/
│   └── register-channel.dto.ts        ✅ 완료
└── youtube.controller.ts              ✅ 완료
```

**API 엔드포인트**:
```
POST /api/v1/youtube/register-channel  - 채널 등록
GET  /api/v1/youtube/my-channel        - 내 채널 정보 조회
```

**데이터베이스 테이블**:
- `xylo.youtube_channels` - 채널 정보
  - `channel_id`, `channel_title`, `subscriber_count`, `video_count`

---

#### 1.1.2.3 Shorts 영상 크롤링 ✅ 완료
**설명**: YouTube Shorts 영상 데이터 주기적 수집

**세부 작업**:
- [x] Shorts 영상 목록 수집 (`youtube/youtube.service.ts:fetchShorts`)
- [x] 영상 통계 수집 (조회수, 좋아요, 댓글)
- [x] 영상 메타데이터 저장 (제목, 설명, 태그)
- [x] 중복 영상 필터링
- [x] 크롤링 이력 저장

**관련 파일**:
```
backend/src/jobs/processors/
└── youtube-crawl.processor.ts         ✅ 완료
```

**데이터베이스 테이블**:
- `xylo.youtube_videos` - 영상 정보
  - `video_id`, `title`, `view_count`, `like_count`, `comment_count`

---

#### 1.1.2.4 배치 처리 스케줄러 ✅ 완료
**설명**: Bull Queue 기반 주기적 크롤링 스케줄러

**세부 작업**:
- [x] Bull Queue 설정 (`jobs/jobs.module.ts`)
- [x] YouTube 크롤링 Job 등록
- [x] 매일 04:00 크롤링 실행 (Cron)
- [x] Job 실패 시 재시도 로직 (3회)
- [x] Job 실행 로그 저장

**관련 파일**:
```
backend/src/jobs/
├── jobs.module.ts                     ✅ 완료
├── jobs.service.ts                    ✅ 완료
└── processors/
    └── youtube-crawl.processor.ts     ✅ 완료
```

**Cron 설정**:
```typescript
@Cron('0 4 * * *') // 매일 04:00
async handleYoutubeCrawl() {
  await this.youtubeQueue.add('crawl', {});
}
```

---

#### 1.1.2.5 에러 핸들링 및 재시도 ✅ 완료
**설명**: YouTube API 에러 처리 및 Rate Limit 대응

**세부 작업**:
- [x] API Quota 초과 시 재시도 (다음 날)
- [x] 네트워크 에러 재시도 (Exponential Backoff)
- [x] 채널 삭제 또는 비공개 처리
- [x] 에러 로그 저장

---

### 완료 체크리스트
- [x] YouTube Data API 연동
- [x] 채널 등록 및 검증
- [x] Shorts 영상 크롤링
- [x] Bull Queue 배치 처리
- [x] 에러 핸들링 및 재시도

---

## WBS 1.1.3 - 포인트 시스템

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 5일 (완료)
- **우선순위**: P0 (Core)
- **담당 모듈**: `src/points/`

### 업무 분해 구조

#### 1.1.3.1 포인트 트랜잭션 시스템 ✅ 완료
**설명**: 포인트 적립/차감 트랜잭션 관리

**세부 작업**:
- [x] 트랜잭션 테이블 설계 (`point_transactions`)
- [x] 포인트 적립 로직 (`points/points.service.ts:addPoints`)
- [x] 포인트 차감 로직 (`points/points.service.ts:deductPoints`)
- [x] 트랜잭션 원자성 보장 (Prisma Transaction)
- [x] 포인트 카테고리별 분류 (6개)

**관련 파일**:
```
backend/src/points/
├── points.service.ts                  ✅ 완료
├── points.controller.ts               ✅ 완료
└── points.module.ts                   ✅ 완료
```

**데이터베이스 테이블**:
- `xylo.point_transactions` - 포인트 거래 내역
  - `user_id`, `category`, `amount`, `reason`, `created_at`

**포인트 카테고리**:
1. `CONTENTS` - 콘텐츠 활동 (조회수, 좋아요)
2. `MGM` - 리퍼럴 (추천인/피추천인)
3. `EVENT` - 이벤트 참여
4. `PROFIT` - 수익 공유
5. `BOOST` - 부스트 (Tier 업그레이드 보너스)
6. `SPONSOR` - 스폰서 지원

---

#### 1.1.3.2 사용자 포인트 집계 ✅ 완료
**설명**: 사용자별 포인트 집계 및 실시간 업데이트

**세부 작업**:
- [x] 포인트 집계 테이블 설계 (`user_points`)
- [x] 카테고리별 포인트 집계 (6개 슬롯)
- [x] 총 포인트 계산 (`total_points`)
- [x] 리더보드용 현재 포인트 (`total_current`)
- [x] 스냅샷 기능 (일별 백업)

**데이터베이스 테이블**:
- `xylo.user_points` - 사용자 포인트 집계
  - `user_id`, `slot_01_contents`, `slot_02_mgm`, `slot_03_event`, `slot_04_profit`, `slot_05_boost`, `slot_06_sponsor`
  - `total_points`, `total_current`

---

#### 1.1.3.3 포인트 계산 프로세서 ✅ 완료
**설명**: YouTube 영상 데이터 기반 포인트 자동 계산

**세부 작업**:
- [x] 포인트 계산 Job 구현 (`jobs/processors/point-calculation.processor.ts`)
- [x] 조회수 기반 포인트 (1,000 조회수 = 100P)
- [x] 좋아요 기반 포인트 (100 좋아요 = 50P)
- [x] 댓글 기반 포인트 (10 댓글 = 10P)
- [x] 매일 05:00 포인트 계산 (Cron)

**관련 파일**:
```
backend/src/jobs/processors/
└── point-calculation.processor.ts     ✅ 완료
```

**계산 로직**:
```typescript
const points = Math.floor(
  (viewCount / 1000) * 100 +
  (likeCount / 100) * 50 +
  (commentCount / 10) * 10
);
```

---

#### 1.1.3.4 포인트 히스토리 API ✅ 완료
**설명**: 포인트 거래 내역 조회 API

**세부 작업**:
- [x] 포인트 히스토리 조회 API (`points/points.controller.ts:getPointsHistory`)
- [x] 카테고리별 필터링
- [x] 기간별 필터링 (startDate, endDate)
- [x] 페이지네이션 (page, limit)
- [x] 정렬 (최신순/오래된순)

**API 엔드포인트**:
```
GET /api/v1/points/history?category=CONTENTS&startDate=2025-01-01&endDate=2025-01-31&page=1&limit=20
```

**관련 파일**:
```
backend/src/points/
├── dto/
│   └── get-points-history.dto.ts      ✅ 완료
└── points.controller.ts               ✅ 완료
```

---

#### 1.1.3.5 포인트 통계 API ✅ 완료
**설명**: 내 포인트 요약 및 통계 조회

**세부 작업**:
- [x] 내 포인트 요약 API (`points/points.controller.ts:getMyPoints`)
- [x] 카테고리별 포인트 표시
- [x] 총 포인트 및 현재 포인트 표시
- [x] 최근 30일 포인트 증감

**API 엔드포인트**:
```
GET /api/v1/points/me
```

**응답 예시**:
```json
{
  "totalPoints": 150000,
  "totalCurrent": 150000,
  "breakdown": {
    "contents": 100000,
    "mgm": 30000,
    "event": 10000,
    "profit": 5000,
    "boost": 3000,
    "sponsor": 2000
  },
  "last30Days": {
    "gained": 15000,
    "spent": 0
  }
}
```

---

### 완료 체크리스트
- [x] 포인트 트랜잭션 시스템
- [x] 사용자 포인트 집계
- [x] 포인트 계산 프로세서
- [x] 포인트 히스토리 API
- [x] 포인트 통계 API

---

## WBS 1.1.4 - 리더보드 시스템

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 3일 (완료)
- **우선순위**: P0 (Core)
- **담당 모듈**: `src/leaderboard/`

### 업무 분해 구조

#### 1.1.4.1 리더보드 조회 API ✅ 완료
**설명**: 전체 사용자 리더보드 조회

**세부 작업**:
- [x] 리더보드 조회 API (`leaderboard/leaderboard.controller.ts:getLeaderboard`)
- [x] 페이지네이션 (page, limit)
- [x] 정렬 (asc/desc)
- [x] 사용자 정보 포함 (닉네임, 프로필 이미지)

**API 엔드포인트**:
```
GET /api/v1/leaderboard?page=1&limit=50&sort=desc
```

**관련 파일**:
```
backend/src/leaderboard/
├── leaderboard.service.ts             ✅ 완료
├── leaderboard.controller.ts          ✅ 완료
├── leaderboard.module.ts              ✅ 완료
└── dto/
    └── get-leaderboard.dto.ts         ✅ 완료
```

---

#### 1.1.4.2 카테고리별 정렬 ✅ 완료
**설명**: 포인트 카테고리별 리더보드 필터링

**세부 작업**:
- [x] 카테고리 파라미터 추가 (`category`)
- [x] 카테고리별 정렬 로직 (contents, referral, event, profit, boost, sponsor)
- [x] 기본값: total (전체 포인트)

**API 엔드포인트**:
```
GET /api/v1/leaderboard?category=contents&page=1&limit=50
```

**카테고리 매핑**:
```typescript
const getCategoryField = (cat: string) => {
  switch (cat) {
    case 'contents': return 'slot_01_contents';
    case 'referral': return 'slot_02_mgm';
    case 'event': return 'slot_03_event';
    case 'profit': return 'slot_04_profit';
    case 'boost': return 'slot_05_boost';
    case 'sponsor': return 'slot_06_sponsor';
    default: return 'total_current';
  }
};
```

---

#### 1.1.4.3 일별 스냅샷 저장 ✅ 완료
**설명**: 리더보드 일별 스냅샷 저장 (순위 변동 추적)

**세부 작업**:
- [x] 스냅샷 Job 구현 (`jobs/processors/leaderboard-snapshot.processor.ts`)
- [x] 매일 23:59 스냅샷 저장 (Cron)
- [x] 순위 변동 계산 (전일 대비 ↑↓)
- [x] 스냅샷 데이터 압축 저장

**관련 파일**:
```
backend/src/jobs/processors/
└── leaderboard-snapshot.processor.ts  ✅ 완료
```

**데이터베이스 테이블**:
- `xylo.leaderboard_snapshots` - 일별 스냅샷
  - `snapshot_date`, `user_id`, `rank`, `points`, `rank_change`

---

#### 1.1.4.4 페이지네이션 처리 ✅ 완료
**설명**: 효율적인 페이지네이션 구현

**세부 작업**:
- [x] Offset 기반 페이지네이션 (`skip`, `take`)
- [x] 총 사용자 수 반환 (`totalCount`)
- [x] 총 페이지 수 계산 (`totalPages`)
- [x] 현재 페이지 정보 (`currentPage`)

**응답 예시**:
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 100,
    "totalCount": 5000,
    "limit": 50
  }
}
```

---

#### 1.1.4.5 내 순위 조회 API ✅ 완료
**설명**: 현재 로그인 사용자 순위 조회

**세부 작업**:
- [x] 내 순위 조회 API (`leaderboard/leaderboard.controller.ts:getMyRank`)
- [x] 카테고리별 순위 표시
- [x] 순위 변동 표시 (전일 대비)

**API 엔드포인트**:
```
GET /api/v1/leaderboard/me?category=total
```

**응답 예시**:
```json
{
  "rank": 42,
  "points": 150000,
  "rankChange": 3,
  "percentile": 1.5
}
```

---

### 완료 체크리스트
- [x] 리더보드 조회 API
- [x] 카테고리별 정렬
- [x] 일별 스냅샷 저장
- [x] 페이지네이션 처리
- [x] 내 순위 조회 API

---

## WBS 1.1.5 - 리퍼럴 시스템

### 기본 정보
- **상태**: ✅ 90% 완료 (Discord 검증 제외)
- **공수**: 완료 3일, 잔여 1일
- **우선순위**: P1 (High)
- **담당 모듈**: `src/referral/`

### 업무 분해 구조

#### 1.1.5.1 추천인 코드 생성 ✅ 완료
**설명**: 사용자별 고유 추천인 코드 생성

**세부 작업**:
- [x] 추천인 코드 자동 생성 (6자리 영숫자)
- [x] 중복 체크 및 재생성
- [x] 회원가입 시 자동 생성
- [x] 추천인 코드 조회 API

**관련 파일**:
```
backend/src/referral/
├── referral.service.ts                ✅ 완료
├── referral.controller.ts             ✅ 완료
└── referral.module.ts                 ✅ 완료
```

**데이터베이스 테이블**:
- `xylo.users` - `referral_code` (UNIQUE)
- `xylo.referral_relationships` - 추천인-피추천인 관계

---

#### 1.1.5.2 리퍼럴 관계 저장 ✅ 완료
**설명**: 추천인 코드 입력 및 관계 저장

**세부 작업**:
- [x] 추천인 코드 적용 API (`referral/referral.controller.ts:applyReferralCode`)
- [x] 추천인 코드 검증 (존재 여부, 자기 자신 방지)
- [x] 리퍼럴 관계 저장 (`referral_relationships`)
- [x] 중복 적용 방지 (1회만 가능)
- [x] 리퍼럴 포인트 지급 (추천인 1,000P, 피추천인 500P)

**API 엔드포인트**:
```
POST /api/v1/referral/apply
Body: { "referralCode": "ABC123" }
```

---

#### 1.1.5.3 X 공유 URL 생성 ✅ 완료
**설명**: X(Twitter) 공유용 리퍼럴 URL 생성

**세부 작업**:
- [x] X 공유 URL 생성 API (`referral/referral.controller.ts:getXShareUrl`)
- [x] 공유 텍스트 템플릿 생성
- [x] 추천인 코드 포함한 랜딩 URL 생성
- [x] X Web Intent URL 생성

**API 엔드포인트**:
```
GET /api/v1/referral/x-share-url
```

**응답 예시**:
```json
{
  "shareUrl": "https://twitter.com/intent/tweet?text=Join%20XYLO%20with%20my%20code%20ABC123&url=https://xylo.io?ref=ABC123",
  "referralCode": "ABC123",
  "referralUrl": "https://xylo.io?ref=ABC123"
}
```

**관련 파일**:
```
backend/src/referral/
├── dto/
│   └── get-x-share-url.dto.ts         ✅ 완료
└── referral.controller.ts             ✅ 완료
```

---

#### 1.1.5.4 리퍼럴 통계 조회 ✅ 완료
**설명**: 내가 초대한 사용자 목록 및 통계

**세부 작업**:
- [x] 내 리퍼럴 통계 API (`referral/referral.controller.ts:getMyReferrals`)
- [x] 초대한 사용자 목록 (페이지네이션)
- [x] 총 초대 수, 획득 포인트
- [x] 리퍼럴 성공률 (가입 완료 비율)

**API 엔드포인트**:
```
GET /api/v1/referral/my-referrals?page=1&limit=20
```

**응답 예시**:
```json
{
  "totalReferrals": 15,
  "totalPoints": 15000,
  "referrals": [
    {
      "userId": "...",
      "nickname": "user123",
      "joinedAt": "2025-01-10T12:00:00Z",
      "points": 1000
    }
  ]
}
```

---

#### 1.1.5.5 Discord 서버 가입 검증 ⚠️ 미완료
**설명**: 추천인/피추천인 모두 Discord 서버 가입 시 포인트 지급

**세부 작업**:
- [ ] Discord 서버 가입 여부 확인 API (1.1.13에서 구현)
- [ ] 추천인/피추천인 Discord 가입 확인
- [ ] 양쪽 모두 가입 시 리퍼럴 포인트 지급
- [ ] 미가입 시 포인트 지급 보류

**API 엔드포인트** (예정):
```
POST /api/v1/referral/verify-discord  - Discord 가입 확인 후 포인트 지급
```

**의존성**: 1.1.13 Discord 연동
**공수**: 1일
**우선순위**: P1 (High)

---

### 완료 체크리스트
- [x] 추천인 코드 생성
- [x] 리퍼럴 관계 저장
- [x] X 공유 URL 생성
- [x] 리퍼럴 통계 조회
- [ ] Discord 서버 가입 검증

---

## WBS 1.1.6 - NFT 시스템

### 기본 정보
- **상태**: ✅ 100% 완료 (MVP - 모의 발행)
- **공수**: 4일 (완료)
- **우선순위**: P0 (Core)
- **담당 모듈**: `src/nft/`

### 업무 분해 구조

#### 1.1.6.1 NFT 메타데이터 설계 ✅ 완료
**설명**: User Pass (SBT) 및 Tier NFT 메타데이터 정의

**세부 작업**:
- [x] User Pass 메타데이터 (`nft/constants/nft-metadata.constant.ts`)
- [x] Tier NFT 메타데이터 (Bronze, Silver, Gold, Platinum, Diamond)
- [x] NFT 이미지 URL 설정
- [x] Tier별 포인트 임계값 정의
- [x] Tier 업그레이드 보너스 정의

**관련 파일**:
```
backend/src/nft/
├── constants/
│   └── nft-metadata.constant.ts       ✅ 완료
├── enums/
│   └── nft-tier.enum.ts               ✅ 완료
└── nft.service.ts                     ✅ 완료
```

**Tier 정책**:
| Tier | 포인트 범위 | 업그레이드 보너스 |
|------|------------|-----------------|
| Bronze | 20,000 ~ 100,000P | 1% |
| Silver | 100,001 ~ 500,000P | 2% |
| Gold | 500,001 ~ 1,000,000P | 3% |
| Platinum | 1,000,001 ~ 10,000,000P | 5% |
| Diamond | 10,000,001P+ | 7% |

---

#### 1.1.6.2 User Pass Claim API ✅ 완료
**설명**: User Pass (SBT) 발급 API

**세부 작업**:
- [x] User Pass Claim API (`nft/nft.controller.ts:claimUserPass`)
- [x] 이메일 인증 확인 (필수)
- [x] 중복 발급 방지 (1회만)
- [x] NFT 정보 DB 저장
- [x] 지갑 주소 입력 (선택)

**API 엔드포인트**:
```
POST /api/v1/nft/claim-user-pass
Body: { "walletAddress": "0x..." }
```

**데이터베이스 테이블**:
- `xylo.nft_holdings` - NFT 보유 정보
  - `user_id`, `nft_type`, `tier`, `wallet_address`, `claimed_at`

**조건**:
- 이메일 인증 완료 필수
- 1회만 발급 가능

---

#### 1.1.6.3 Tier NFT 업그레이드 로직 ✅ 완료
**설명**: 포인트 기반 Tier NFT 자동 업그레이드

**세부 작업**:
- [x] Tier 계산 로직 (`nft/nft.service.ts:calculateTier`)
- [x] Tier NFT 업그레이드 API (`nft/nft.service.ts:upgradeTierNft`)
- [x] User Pass 보유 확인 (필수)
- [x] 현재 Tier 확인 및 업그레이드 여부 판단
- [x] 업그레이드 보너스 포인트 계산 및 지급

**Tier 계산 로직**:
```typescript
private calculateTierFromPoints(totalPoints: number): NftTier | null {
  if (totalPoints >= 10000001) return NftTier.DIAMOND;
  if (totalPoints >= 1000001) return NftTier.PLATINUM;
  if (totalPoints >= 500001) return NftTier.GOLD;
  if (totalPoints >= 100001) return NftTier.SILVER;
  if (totalPoints >= 20000) return NftTier.BRONZE;
  return null;
}
```

**업그레이드 보너스 계산**:
```typescript
// Bronze (1%) 예시
const bonusPoints = Math.floor(currentTotalPoints * 0.01);
```

---

#### 1.1.6.4 Tier NFT 자동 업그레이드 스케줄러 ✅ 완료
**설명**: 배치 작업으로 Tier NFT 자동 업그레이드

**세부 작업**:
- [x] Tier NFT 업그레이드 Job (`jobs/processors/tier-nft-upgrade.processor.ts`)
- [x] 매일 06:00 전체 사용자 Tier 확인 (Cron)
- [x] 업그레이드 대상 사용자 필터링
- [x] 자동 업그레이드 및 보너스 지급
- [x] 업그레이드 알림 발송 (1.1.11 구현 후)

**관련 파일**:
```
backend/src/jobs/processors/
└── tier-nft-upgrade.processor.ts      ✅ 완료
```

**Cron 설정**:
```typescript
@Cron('0 6 * * *') // 매일 06:00
async handleTierNftUpgrade() {
  await this.tierNftQueue.add('upgrade', {});
}
```

---

#### 1.1.6.5 NFT 보유 목록 조회 API ✅ 완료
**설명**: 내가 보유한 NFT 목록 조회

**세부 작업**:
- [x] NFT 보유 목록 API (`nft/nft.controller.ts:getMyNfts`)
- [x] User Pass 및 Tier NFT 정보 반환
- [x] 현재 Tier 진행 상황 표시 (다음 Tier까지 필요한 포인트)

**API 엔드포인트**:
```
GET /api/v1/nft/my-nfts
```

**응답 예시**:
```json
{
  "userPass": {
    "claimed": true,
    "claimedAt": "2025-01-10T10:00:00Z"
  },
  "tierNft": {
    "currentTier": "GOLD",
    "currentPoints": 750000,
    "nextTier": "PLATINUM",
    "pointsToNextTier": 250001,
    "upgradeBonus": 0.03
  }
}
```

---

### 완료 체크리스트
- [x] NFT 메타데이터 설계
- [x] User Pass Claim API
- [x] Tier NFT 업그레이드 로직
- [x] Tier NFT 자동 업그레이드 스케줄러
- [x] 업그레이드 보너스 포인트 지급
- [x] NFT 보유 목록 조회 API

---

## WBS 1.1.7 - XLT Claim 시스템

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 3일 (완료)
- **우선순위**: P0 (Core)
- **담당 모듈**: `src/xlt-claim/`

### 업무 분해 구조

#### 1.1.7.1 XLT Claim 데이터베이스 설계 ✅ 완료
**설명**: XLT Claim 테이블 및 ENUM 설계

**세부 작업**:
- [x] `xlt_claim_status` ENUM 생성 (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED)
- [x] `xlt_claim_requests` 테이블 생성
- [x] Prisma Schema 업데이트
- [x] 마이그레이션 SQL 파일 작성 (`database/11-xlt-claim-requests.sql`)

**데이터베이스 테이블**:
- `xylo.xlt_claim_requests`
  - `id`, `user_id`, `points_claimed`, `xlt_amount`, `wallet_address`, `status`, `memo`, `rejection_reason`
  - `approved_at`, `completed_at`, `created_at`, `updated_at`

**관련 파일**:
```
backend/prisma/schema.prisma           ✅ 완료
database/11-xlt-claim-requests.sql     ✅ 완료
```

---

#### 1.1.7.2 XLT Claim 자격 검증 API ✅ 완료
**설명**: XLT Claim 신청 자격 확인 API

**세부 작업**:
- [x] 자격 검증 API (`xlt-claim/xlt-claim.controller.ts:checkEligibility`)
- [x] 최소 20,000 포인트 확인
- [x] User Pass (SBT) 보유 확인
- [x] MVP 기간 확인 (2026-06-30까지)
- [x] XLT 총 한도 확인 (500,000 XLT)
- [x] 예상 XLT 수량 계산 (포인트 ÷ 200)

**API 엔드포인트**:
```
GET /api/v1/xlt-claim/eligibility
```

**응답 예시**:
```json
{
  "eligible": true,
  "currentPoints": 50000,
  "minPointsRequired": 20000,
  "hasUserPass": true,
  "mvpActive": true,
  "xltRemaining": 450000,
  "estimatedXlt": 250
}
```

**관련 파일**:
```
backend/src/xlt-claim/
├── xlt-claim.service.ts               ✅ 완료
├── xlt-claim.controller.ts            ✅ 완료
├── constants/
│   └── xlt-claim.constant.ts          ✅ 완료
└── dto/
    └── request-xlt-claim.dto.ts       ✅ 완료
```

---

#### 1.1.7.3 XLT Claim 신청 API ✅ 완료
**설명**: XLT 교환 신청 API

**세부 작업**:
- [x] XLT Claim 신청 API (`xlt-claim/xlt-claim.controller.ts:requestXltClaim`)
- [x] 자격 검증 (checkEligibility 재사용)
- [x] XLT 수량 계산 (포인트 ÷ 200)
- [x] 지갑 주소 검증 (Polygon)
- [x] 신청 내역 저장 (상태: PENDING)
- [x] 중복 신청 방지 (진행 중인 신청 확인)

**API 엔드포인트**:
```
POST /api/v1/xlt-claim/request
Body: {
  "points": 50000,
  "walletAddress": "0x...",
  "memo": "Optional memo"
}
```

**검증 규칙**:
- 최소 20,000 포인트
- User Pass (SBT) 보유 필수
- MVP 기간 내 (2026-06-30까지)
- XLT 총 한도 미초과 (500,000 XLT)
- 진행 중인 신청 없음 (PENDING/APPROVED 상태)

---

#### 1.1.7.4 내 XLT Claim 신청 내역 조회 ✅ 완료
**설명**: 내가 신청한 XLT Claim 목록 조회

**세부 작업**:
- [x] 내 신청 내역 API (`xlt-claim/xlt-claim.controller.ts:getMyXltClaims`)
- [x] 상태별 필터링 (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED)
- [x] 페이지네이션 (page, limit)
- [x] 최신순 정렬

**API 엔드포인트**:
```
GET /api/v1/xlt-claim/my-claims?status=PENDING&page=1&limit=10
```

**응답 예시**:
```json
{
  "data": [
    {
      "id": "...",
      "pointsClaimed": 50000,
      "xltAmount": 250,
      "walletAddress": "0x...",
      "status": "PENDING",
      "createdAt": "2025-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCount": 1
  }
}
```

**관련 파일**:
```
backend/src/xlt-claim/
└── dto/
    └── get-xlt-claims.dto.ts          ✅ 완료
```

---

#### 1.1.7.5 XLT Claim 통계 조회 API ✅ 완료
**설명**: XLT Claim 전체 통계 조회 (공개)

**세부 작업**:
- [x] XLT 통계 API (`xlt-claim/xlt-claim.controller.ts:getXltClaimStats`)
- [x] 총 신청 수, 승인 수, 완료 수
- [x] 총 XLT 지급량
- [x] XLT 잔여 한도
- [x] 평균 신청 포인트

**API 엔드포인트**:
```
GET /api/v1/xlt-claim/stats
```

**응답 예시**:
```json
{
  "totalRequests": 100,
  "totalApproved": 80,
  "totalCompleted": 70,
  "totalXltClaimed": 50000,
  "xltRemaining": 450000,
  "maxSupply": 500000,
  "averagePointsClaimed": 100000
}
```

---

### 완료 체크리스트
- [x] XLT Claim 데이터베이스 설계
- [x] 자격 검증 API
- [x] XLT Claim 신청 API
- [x] 내 신청 내역 조회 API
- [x] XLT 통계 조회 API
- [ ] 관리자 승인/거부 API (1.1.12에서 구현)

---

## WBS 1.1.8 - 이벤트 시스템

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 2일 (완료)
- **우선순위**: P2 (Medium)
- **담당 모듈**: `src/events/`

### 업무 분해 구조

#### 1.1.8.1 이벤트 CRUD API ✅ 완료
**설명**: 이벤트 생성, 조회, 수정, 삭제 API

**세부 작업**:
- [x] 이벤트 목록 조회 API (`events/events.controller.ts:getEvents`)
- [x] 이벤트 상세 조회 API (`events/events.controller.ts:getEvent`)
- [x] 이벤트 생성 API (관리자용) (`events/events.controller.ts:createEvent`)
- [x] 이벤트 수정/삭제 API (관리자용)

**API 엔드포인트**:
```
GET    /api/v1/events                  - 이벤트 목록 조회
GET    /api/v1/events/:id              - 이벤트 상세 조회
POST   /api/v1/events                  - 이벤트 생성 (관리자)
PATCH  /api/v1/events/:id              - 이벤트 수정 (관리자)
DELETE /api/v1/events/:id              - 이벤트 삭제 (관리자)
```

**데이터베이스 테이블**:
- `xylo.events`
  - `id`, `title`, `description`, `points_reward`, `start_date`, `end_date`, `is_active`

---

#### 1.1.8.2 이벤트 참여 기록 ✅ 완료
**설명**: 사용자 이벤트 참여 및 포인트 지급

**세부 작업**:
- [x] 이벤트 참여 API (`events/events.controller.ts:participateEvent`)
- [x] 중복 참여 방지
- [x] 이벤트 포인트 지급 (EVENT 카테고리)
- [x] 참여 이력 저장

**API 엔드포인트**:
```
POST /api/v1/events/:id/participate    - 이벤트 참여
```

**데이터베이스 테이블**:
- `xylo.event_participations`
  - `user_id`, `event_id`, `participated_at`, `points_awarded`

---

### 완료 체크리스트
- [x] 이벤트 CRUD API
- [x] 이벤트 참여 기록
- [x] 포인트 지급 연동

---

## WBS 1.1.9 - 튜토리얼 시스템

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 1일 (완료)
- **우선순위**: P2 (Medium)
- **담당 모듈**: `src/tutorial/`

### 업무 분해 구조

#### 1.1.9.1 튜토리얼 진행 상태 API ✅ 완료
**설명**: 튜토리얼 단계별 진행 상태 저장 및 조회

**세부 작업**:
- [x] 튜토리얼 진행 상태 조회 API (`tutorial/tutorial.controller.ts:getProgress`)
- [x] 튜토리얼 단계 완료 API (`tutorial/tutorial.controller.ts:completeStep`)
- [x] 튜토리얼 전체 완료 API

**API 엔드포인트**:
```
GET  /api/v1/tutorial/progress         - 튜토리얼 진행 상태 조회
POST /api/v1/tutorial/complete-step    - 튜토리얼 단계 완료
POST /api/v1/tutorial/complete-all     - 튜토리얼 전체 완료
```

**데이터베이스 테이블**:
- `xylo.tutorial_progress`
  - `user_id`, `step_id`, `completed`, `completed_at`

---

### 완료 체크리스트
- [x] 튜토리얼 진행 상태 저장
- [x] 튜토리얼 단계 완료 처리
- [x] 튜토리얼 전체 완료 처리

---

## WBS 1.1.10 - FAQ 시스템

### 기본 정보
- **상태**: ✅ 100% 완료
- **공수**: 1일 (완료)
- **우선순위**: P2 (Medium)
- **담당 모듈**: `src/faq/`

### 업무 분해 구조

#### 1.1.10.1 FAQ CRUD API ✅ 완료
**설명**: FAQ 생성, 조회, 수정, 삭제 API

**세부 작업**:
- [x] FAQ 목록 조회 API (`faq/faq.controller.ts:getFaqs`)
- [x] FAQ 카테고리별 조회
- [x] FAQ 생성/수정/삭제 API (관리자용)

**API 엔드포인트**:
```
GET    /api/v1/faq                     - FAQ 목록 조회
GET    /api/v1/faq/:id                 - FAQ 상세 조회
POST   /api/v1/faq                     - FAQ 생성 (관리자)
PATCH  /api/v1/faq/:id                 - FAQ 수정 (관리자)
DELETE /api/v1/faq/:id                 - FAQ 삭제 (관리자)
```

**데이터베이스 테이블**:
- `xylo.faqs`
  - `id`, `category`, `question`, `answer`, `order`, `is_active`

---

### 완료 체크리스트
- [x] FAQ CRUD API
- [x] FAQ 카테고리별 조회
- [x] FAQ 관리 API (관리자용)

---

## WBS 1.1.11 - 알림 시스템

### 기본 정보
- **상태**: ⚠️ 0% 미완료
- **공수**: 3일 (잔여)
- **우선순위**: P1 (High)
- **담당 모듈**: `src/notifications/` (생성 필요)

### 업무 분해 구조

#### 1.1.11.1 알림 데이터베이스 설계 ⚠️ 미완료
**설명**: 알림 테이블 및 ENUM 설계

**세부 작업**:
- [ ] `notification_type` ENUM 생성 (POINT, NFT_UPGRADE, REFERRAL, EVENT, XLT_CLAIM, SYSTEM)
- [ ] `notifications` 테이블 생성
- [ ] Prisma Schema 업데이트
- [ ] 마이그레이션 SQL 파일 작성

**데이터베이스 테이블** (예정):
```sql
CREATE TABLE xylo.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES xylo.users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON xylo.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON xylo.notifications(created_at DESC);
```

**공수**: 0.5일

---

#### 1.1.11.2 알림 발송 서비스 ⚠️ 미완료
**설명**: 알림 생성 및 발송 로직

**세부 작업**:
- [ ] NotificationsService 구현 (`notifications/notifications.service.ts`)
- [ ] 알림 생성 메서드 (`createNotification`)
- [ ] 사용자별 알림 조회 (`getMyNotifications`)
- [ ] 알림 읽음 처리 (`markAsRead`, `markAllAsRead`)
- [ ] 알림 삭제 (`deleteNotification`)

**관련 파일** (예정):
```
backend/src/notifications/
├── notifications.service.ts           ⚠️ 미완료
├── notifications.controller.ts        ⚠️ 미완료
├── notifications.module.ts            ⚠️ 미완료
└── dto/
    ├── create-notification.dto.ts     ⚠️ 미완료
    └── get-notifications.dto.ts       ⚠️ 미완료
```

**공수**: 1일

---

#### 1.1.11.3 WebSocket Gateway 구현 ⚠️ 미완료
**설명**: 실시간 알림 전송 (Socket.io)

**세부 작업**:
- [ ] Socket.io 설치 및 설정
- [ ] NotificationsGateway 구현 (`notifications/notifications.gateway.ts`)
- [ ] 사용자 연결 관리 (userId 기반)
- [ ] 실시간 알림 Emit (`notification:new`)
- [ ] JWT 기반 WebSocket 인증

**관련 파일** (예정):
```
backend/src/notifications/
└── notifications.gateway.ts           ⚠️ 미완료
```

**WebSocket 이벤트**:
```typescript
// Server -> Client
socket.emit('notification:new', {
  id: '...',
  type: 'POINT',
  title: '포인트 적립',
  message: '1,000P가 적립되었습니다.',
  createdAt: '2025-01-11T10:00:00Z'
});

// Client -> Server
socket.on('notification:read', { notificationId: '...' });
```

**공수**: 1일

---

#### 1.1.11.4 알림 API 엔드포인트 ⚠️ 미완료
**설명**: 알림 조회 및 관리 REST API

**세부 작업**:
- [ ] 내 알림 목록 조회 API (`GET /api/v1/notifications`)
- [ ] 읽지 않은 알림 수 조회 API (`GET /api/v1/notifications/unread-count`)
- [ ] 알림 읽음 처리 API (`PATCH /api/v1/notifications/:id/read`)
- [ ] 전체 알림 읽음 처리 API (`PATCH /api/v1/notifications/read-all`)
- [ ] 알림 삭제 API (`DELETE /api/v1/notifications/:id`)

**API 엔드포인트** (예정):
```
GET    /api/v1/notifications            - 알림 목록 조회
GET    /api/v1/notifications/unread-count - 읽지 않은 알림 수
PATCH  /api/v1/notifications/:id/read   - 알림 읽음 처리
PATCH  /api/v1/notifications/read-all   - 전체 알림 읽음
DELETE /api/v1/notifications/:id        - 알림 삭제
```

**공수**: 0.5일

---

#### 1.1.11.5 알림 트리거 연동 ⚠️ 미완료
**설명**: 각 기능에서 알림 발송 연동

**세부 작업**:
- [ ] 포인트 적립 시 알림 (`POINT`)
- [ ] Tier NFT 업그레이드 시 알림 (`NFT_UPGRADE`)
- [ ] 리퍼럴 성공 시 알림 (`REFERRAL`)
- [ ] 이벤트 참여 시 알림 (`EVENT`)
- [ ] XLT Claim 승인/거부 시 알림 (`XLT_CLAIM`)

**연동 예시**:
```typescript
// points.service.ts
async addPoints(userId: string, amount: number) {
  // 포인트 적립 로직
  // ...

  // 알림 발송
  await this.notificationsService.createNotification({
    userId,
    type: 'POINT',
    title: '포인트 적립',
    message: `${amount}P가 적립되었습니다.`,
    link: '/points/history'
  });
}
```

**공수**: 1일 (병렬 작업 가능)

---

### 완료 체크리스트
- [ ] 알림 데이터베이스 설계
- [ ] 알림 발송 서비스 구현
- [ ] WebSocket Gateway 구현
- [ ] 알림 API 엔드포인트
- [ ] 알림 트리거 연동

### 의존성
- 없음 (독립 작업 가능)

### 우선 작업 순서
1. 데이터베이스 설계 (0.5일)
2. 알림 서비스 구현 (1일)
3. REST API 구현 (0.5일)
4. WebSocket 구현 (1일) - 병렬 가능
5. 알림 트리거 연동 (1일) - 병렬 가능

---

## WBS 1.1.12 - 관리자 대시보드

### 기본 정보
- **상태**: ⚠️ 0% 미완료
- **공수**: 3일 (잔여)
- **우선순위**: P1 (High)
- **담당 모듈**: `src/admin/` (생성 필요)

### 업무 분해 구조

#### 1.1.12.1 관리자 권한 시스템 ⚠️ 미완료
**설명**: 관리자 권한 확인 Guard 구현

**세부 작업**:
- [ ] `users` 테이블에 `role` 컬럼 추가 (USER, ADMIN)
- [ ] AdminGuard 구현 (`auth/guards/admin.guard.ts`)
- [ ] JWT 토큰에 role 포함
- [ ] 관리자 전용 API 보호

**관련 파일** (예정):
```
backend/src/auth/guards/
└── admin.guard.ts                     ⚠️ 미완료
```

**사용 예시**:
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Post('xlt-claim/approve/:id')
async approveXltClaim(@Param('id') id: string) {
  // 관리자만 접근 가능
}
```

**공수**: 0.5일

---

#### 1.1.12.2 XLT Claim 승인/거부 API ⚠️ 미완료
**설명**: XLT Claim 신청 승인 및 거부 처리

**세부 작업**:
- [ ] XLT Claim 승인 API (`admin/admin.controller.ts:approveXltClaim`)
- [ ] XLT Claim 거부 API (`admin/admin.controller.ts:rejectXltClaim`)
- [ ] 승인 시 상태 변경 (PENDING → APPROVED)
- [ ] 거부 시 거부 사유 입력 필수
- [ ] 승인/거부 시 알림 발송 (1.1.11 구현 후)

**API 엔드포인트** (예정):
```
POST /api/v1/admin/xlt-claim/:id/approve  - XLT Claim 승인
POST /api/v1/admin/xlt-claim/:id/reject   - XLT Claim 거부
Body: { "rejectionReason": "..." }
```

**공수**: 1일

---

#### 1.1.12.3 FAQ 관리 API ⚠️ 미완료
**설명**: FAQ 생성, 수정, 삭제 (관리자용)

**세부 작업**:
- [ ] FAQ 생성 API (`admin/admin.controller.ts:createFaq`)
- [ ] FAQ 수정 API (`admin/admin.controller.ts:updateFaq`)
- [ ] FAQ 삭제 API (`admin/admin.controller.ts:deleteFaq`)
- [ ] FAQ 순서 변경 API

**API 엔드포인트** (예정):
```
POST   /api/v1/admin/faq                - FAQ 생성
PATCH  /api/v1/admin/faq/:id            - FAQ 수정
DELETE /api/v1/admin/faq/:id            - FAQ 삭제
PATCH  /api/v1/admin/faq/reorder        - FAQ 순서 변경
```

**공수**: 0.5일

---

#### 1.1.12.4 사용자 관리 API ⚠️ 미완료
**설명**: 사용자 목록 조회 및 상세 정보 관리

**세부 작업**:
- [ ] 전체 사용자 목록 API (`admin/admin.controller.ts:getUsers`)
- [ ] 사용자 상세 조회 API (`admin/admin.controller.ts:getUserDetail`)
- [ ] 사용자 검색 (닉네임, 이메일)
- [ ] 사용자 상태 변경 (활성/비활성)

**API 엔드포인트** (예정):
```
GET   /api/v1/admin/users              - 사용자 목록 조회
GET   /api/v1/admin/users/:id          - 사용자 상세 조회
PATCH /api/v1/admin/users/:id/status   - 사용자 상태 변경
```

**공수**: 0.5일

---

#### 1.1.12.5 시스템 통계 대시보드 API ⚠️ 미완료
**설명**: 전체 시스템 통계 조회 (관리자용)

**세부 작업**:
- [ ] 전체 통계 API (`admin/admin.controller.ts:getStats`)
- [ ] 일일 활성 사용자 수 (DAU)
- [ ] 총 포인트 발행량
- [ ] NFT 발행 현황
- [ ] XLT Claim 통계
- [ ] 리퍼럴 통계

**API 엔드포인트** (예정):
```
GET /api/v1/admin/stats                - 시스템 전체 통계
```

**응답 예시**:
```json
{
  "users": {
    "total": 10000,
    "active": 5000,
    "newToday": 100
  },
  "points": {
    "totalIssued": 5000000000,
    "totalClaimed": 1000000000
  },
  "nft": {
    "userPassClaimed": 8000,
    "tierNftDistribution": {
      "BRONZE": 2000,
      "SILVER": 500,
      "GOLD": 200,
      "PLATINUM": 50,
      "DIAMOND": 10
    }
  },
  "xlt": {
    "totalClaimed": 50000,
    "remaining": 450000,
    "pendingRequests": 50
  },
  "referral": {
    "totalReferrals": 3000,
    "successRate": 0.75
  }
}
```

**공수**: 0.5일

---

### 완료 체크리스트
- [ ] 관리자 권한 시스템
- [ ] XLT Claim 승인/거부 API
- [ ] FAQ 관리 API
- [ ] 사용자 관리 API
- [ ] 시스템 통계 대시보드 API

### 의존성
- XLT Claim 시스템 (1.1.7) - ✅ 완료
- FAQ 시스템 (1.1.10) - ✅ 완료
- 알림 시스템 (1.1.11) - ⚠️ 미완료 (알림 연동 시 필요)

### 우선 작업 순서
1. 관리자 권한 시스템 (0.5일)
2. XLT Claim 승인/거부 API (1일)
3. 사용자 관리 API (0.5일) - 병렬 가능
4. FAQ 관리 API (0.5일) - 병렬 가능
5. 시스템 통계 대시보드 (0.5일) - 병렬 가능

---

## WBS 1.1.13 - Discord 연동

### 기본 정보
- **상태**: ⚠️ 0% 미완료
- **공수**: 2일 (잔여)
- **우선순위**: P1 (High)
- **담당 모듈**: `src/auth/`, `src/discord/` (생성 필요)

### 업무 분해 구조

#### 1.1.13.1 Discord OAuth 인증 ⚠️ 미완료
**설명**: Discord OAuth 2.0 로그인 및 계정 연동

**세부 작업**:
- [ ] Discord Strategy 구현 (`auth/strategies/discord.strategy.ts`)
- [ ] Discord OAuth 콜백 핸들러 (`auth/auth.controller.ts:discordCallback`)
- [ ] JWT + State 암호화 (X 사용자 매칭)
- [ ] Discord 계정 정보 저장 (discord_id, discord_username)
- [ ] Discord 연동 해제 API

**관련 파일** (예정):
```
backend/src/auth/
├── strategies/
│   └── discord.strategy.ts            ⚠️ 미완료
├── guards/
│   └── discord-auth.guard.ts          ⚠️ 미완료
└── auth.controller.ts                 수정 필요
```

**API 엔드포인트** (예정):
```
GET  /api/v1/auth/discord              - Discord OAuth 시작
GET  /api/v1/auth/discord/callback     - Discord OAuth 콜백
POST /api/v1/auth/discord/unlink       - Discord 연동 해제
```

**데이터베이스 테이블**:
- `xylo.users` - `discord_id`, `discord_username`, `discord_discriminator`, `discord_linked_at`

**환경 변수** (필요):
```
DISCORD_CLIENT_ID=<client_id>
DISCORD_CLIENT_SECRET=<secret>
DISCORD_CALLBACK_URL=http://localhost:3000/api/v1/auth/discord/callback
DISCORD_GUILD_ID=<server_id>
```

**JWT + State 암호화 방식**:
```typescript
// 1. Discord OAuth 시작 시 State 생성
@Get('discord')
@UseGuards(JwtAuthGuard)
async discordAuth(@Req() req: Request, @Res() res: Response) {
  const { userId } = req.user;

  // JWT State 생성 (5분 만료)
  const state = this.jwtService.sign(
    { userId, timestamp: Date.now() },
    { secret: process.env.JWT_SECRET, expiresIn: '5m' }
  );

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds.members.read&state=${state}`;

  res.redirect(discordAuthUrl);
}

// 2. Discord OAuth 콜백에서 State 검증
@Get('discord/callback')
async discordCallback(@Query('code') code: string, @Query('state') state: string) {
  // State 검증 및 userId 추출
  const decoded = this.jwtService.verify(state, { secret: process.env.JWT_SECRET });
  const { userId } = decoded;

  // Discord OAuth 토큰 교환
  const discordToken = await this.getDiscordToken(code);

  // Discord 사용자 정보 가져오기
  const discordUser = await this.getDiscordUser(discordToken);

  // DB에 Discord 정보 저장
  await this.prisma.users.update({
    where: { id: userId },
    data: {
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      discord_discriminator: discordUser.discriminator,
      discord_linked_at: new Date()
    }
  });

  return { success: true, message: 'Discord 연동 완료' };
}
```

**공수**: 1일

---

#### 1.1.13.2 Discord API 연동 ⚠️ 미완료
**설명**: Discord API 클라이언트 및 서버 가입 검증

**세부 작업**:
- [ ] DiscordService 구현 (`discord/discord.service.ts`)
- [ ] Discord API 클라이언트 설정
- [ ] 서버 가입 여부 확인 (`checkGuildMembership`)
- [ ] 사용자 서버 정보 조회

**관련 파일** (예정):
```
backend/src/discord/
├── discord.service.ts                 ⚠️ 미완료
├── discord.controller.ts              ⚠️ 미완료
└── discord.module.ts                  ⚠️ 미완료
```

**API 메서드**:
```typescript
// Discord 서버 가입 확인
async checkGuildMembership(userId: string): Promise<boolean> {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    select: { discord_id: true }
  });

  if (!user?.discord_id) return false;

  // Discord API 호출
  const response = await axios.get(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.discord_id}`,
    {
      headers: { Authorization: `Bot ${BOT_TOKEN}` }
    }
  );

  return response.status === 200;
}
```

**공수**: 0.5일

---

#### 1.1.13.3 리퍼럴 Discord 검증 연동 ⚠️ 미완료
**설명**: 리퍼럴 시스템에 Discord 서버 가입 검증 추가

**세부 작업**:
- [ ] 리퍼럴 포인트 지급 전 Discord 가입 확인
- [ ] 추천인/피추천인 모두 Discord 가입 시 포인트 지급
- [ ] Discord 미가입 시 포인트 보류 (pending 상태)
- [ ] Discord 가입 완료 시 보류 포인트 지급

**관련 파일** (수정 필요):
```
backend/src/referral/
└── referral.service.ts                수정 필요
```

**로직 수정**:
```typescript
async applyReferralCode(userId: string, referralCode: string) {
  // 기존 리퍼럴 로직
  // ...

  // Discord 가입 확인
  const referrerInDiscord = await this.discordService.checkGuildMembership(referrerId);
  const refereeInDiscord = await this.discordService.checkGuildMembership(userId);

  if (referrerInDiscord && refereeInDiscord) {
    // 즉시 포인트 지급
    await this.pointsService.addPoints(referrerId, 1000, 'MGM', 'Referral reward');
    await this.pointsService.addPoints(userId, 500, 'MGM', 'Referral reward');
  } else {
    // 포인트 보류 (pending_referral_rewards 테이블)
    await this.createPendingReferralReward(referrerId, userId);
  }
}

// Discord 가입 완료 시 호출
async processPendingReferralRewards(userId: string) {
  const pendingRewards = await this.prisma.pending_referral_rewards.findMany({
    where: {
      OR: [
        { referrer_id: userId },
        { referee_id: userId }
      ]
    }
  });

  for (const reward of pendingRewards) {
    const referrerInDiscord = await this.discordService.checkGuildMembership(reward.referrer_id);
    const refereeInDiscord = await this.discordService.checkGuildMembership(reward.referee_id);

    if (referrerInDiscord && refereeInDiscord) {
      // 포인트 지급
      await this.pointsService.addPoints(reward.referrer_id, 1000, 'MGM', 'Referral reward (Discord verified)');
      await this.pointsService.addPoints(reward.referee_id, 500, 'MGM', 'Referral reward (Discord verified)');

      // pending 삭제
      await this.prisma.pending_referral_rewards.delete({ where: { id: reward.id } });
    }
  }
}
```

**데이터베이스 테이블** (추가 필요):
```sql
CREATE TABLE xylo.pending_referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES xylo.users(id),
  referee_id UUID NOT NULL REFERENCES xylo.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**공수**: 0.5일

---

### 완료 체크리스트
- [ ] Discord OAuth 인증 (JWT + State)
- [ ] Discord API 연동
- [ ] Discord 서버 가입 검증
- [ ] Discord 연동 해제 API
- [ ] 리퍼럴 Discord 검증 연동

### 의존성
- 리퍼럴 시스템 (1.1.5) - ✅ 완료

### 우선 작업 순서
1. Discord OAuth 인증 (1일)
2. Discord API 연동 (0.5일)
3. 리퍼럴 Discord 검증 연동 (0.5일)

---

## WBS 1.1.14 - 활동 통계 API

### 기본 정보
- **상태**: ⚠️ 0% 미완료
- **공수**: 1일 (잔여)
- **우선순위**: P2 (Medium)
- **담당 모듈**: `src/users/`

### 업무 분해 구조

#### 1.1.14.1 활동 통계 API 구현 ⚠️ 미완료
**설명**: 마이페이지용 사용자 활동 통계 조회

**세부 작업**:
- [ ] 활동 통계 DTO 구현 (`users/dto/get-activity-stats.dto.ts`)
- [ ] 일별/주별/월별 영상 업로드 수
- [ ] 일별/주별/월별 포인트 증감
- [ ] 총 조회수, 좋아요, 댓글 수
- [ ] 활동 통계 API 엔드포인트 추가

**API 엔드포인트** (예정):
```
GET /api/v1/users/me/activity-stats?period=30d
```

**응답 예시**:
```json
{
  "period": "30d",
  "videos": {
    "totalUploaded": 50,
    "dailyAverage": 1.67,
    "trend": "up"
  },
  "engagement": {
    "totalViews": 500000,
    "totalLikes": 50000,
    "totalComments": 5000,
    "avgViewsPerVideo": 10000
  },
  "points": {
    "totalGained": 15000,
    "dailyAverage": 500,
    "breakdown": {
      "contents": 10000,
      "referral": 3000,
      "event": 2000
    }
  },
  "dailyStats": [
    {
      "date": "2025-01-11",
      "videos": 2,
      "views": 20000,
      "points": 600
    }
    // ... 30일치
  ]
}
```

**관련 파일** (예정):
```
backend/src/users/
├── dto/
│   └── get-activity-stats.dto.ts      ⚠️ 미완료
├── users.service.ts                   수정 필요
└── users.controller.ts                수정 필요
```

**데이터베이스 쿼리**:
```typescript
async getActivityStats(userId: string, period: string) {
  const days = this.parsePeriod(period); // "30d" -> 30
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 영상 통계
  const videoStats = await this.prisma.youtube_videos.groupBy({
    by: ['published_at'],
    where: {
      user_id: userId,
      published_at: { gte: startDate }
    },
    _count: true,
    _sum: {
      view_count: true,
      like_count: true,
      comment_count: true
    }
  });

  // 포인트 통계
  const pointStats = await this.prisma.point_transactions.groupBy({
    by: ['category', 'created_at'],
    where: {
      user_id: userId,
      created_at: { gte: startDate }
    },
    _sum: { amount: true }
  });

  // 데이터 가공 및 반환
  return this.formatActivityStats(videoStats, pointStats, days);
}
```

**공수**: 1일

---

### 완료 체크리스트
- [ ] 활동 통계 DTO 구현
- [ ] 영상 업로드 통계 조회
- [ ] 포인트 증감 통계 조회
- [ ] 일별 통계 차트 데이터
- [ ] API 엔드포인트 추가

### 의존성
- YouTube 크롤링 (1.1.2) - ✅ 완료
- 포인트 시스템 (1.1.3) - ✅ 완료

---

## WBS 1.1.15 - X 자동 포스팅

### 기본 정보
- **상태**: ⚠️ 0% 미완료
- **공수**: 2일 (잔여)
- **우선순위**: P2 (Medium)
- **담당 모듈**: `src/twitter/` (생성 필요)
- **비용**: Twitter API v2 유료 플랜 ($100/월)

### 업무 분해 구조

#### 1.1.15.1 Twitter API v2 연동 ⚠️ 미완료
**설명**: Twitter API v2 클라이언트 설정 및 인증

**세부 작업**:
- [ ] Twitter API v2 유료 플랜 가입 ($100/월)
- [ ] OAuth 2.0 User Context 인증
- [ ] Access Token 저장 (사용자별)
- [ ] TwitterService 구현 (`twitter/twitter.service.ts`)

**환경 변수** (필요):
```
TWITTER_API_KEY=<api_key>
TWITTER_API_SECRET=<api_secret>
TWITTER_ACCESS_TOKEN=<user_token>
TWITTER_ACCESS_TOKEN_SECRET=<user_token_secret>
TWITTER_BEARER_TOKEN=<bearer_token>
```

**관련 파일** (예정):
```
backend/src/twitter/
├── twitter.service.ts                 ⚠️ 미완료
├── twitter.controller.ts              ⚠️ 미완료
└── twitter.module.ts                  ⚠️ 미완료
```

**공수**: 0.5일

---

#### 1.1.15.2 자동 포스팅 API ⚠️ 미완료
**설명**: X(Twitter) 자동 게시 기능

**세부 작업**:
- [ ] 포스팅 작성 API (`twitter/twitter.controller.ts:createPost`)
- [ ] 포스팅 미리보기 API
- [ ] 포스팅 발행 API
- [ ] 이미지 업로드 지원 (Media Upload API)
- [ ] 해시태그 자동 추가

**API 엔드포인트** (예정):
```
POST /api/v1/twitter/create-post       - 포스팅 작성
POST /api/v1/twitter/publish           - 포스팅 발행
GET  /api/v1/twitter/preview           - 포스팅 미리보기
```

**포스팅 요청 예시**:
```json
{
  "text": "Just uploaded a new YouTube Short! Check it out 🔥",
  "videoUrl": "https://youtube.com/shorts/abc123",
  "hashtags": ["YouTubeShorts", "XYLO"],
  "imageUrl": "https://..."
}
```

**Twitter API 호출**:
```typescript
async createPost(userId: string, text: string, mediaIds?: string[]) {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    select: { twitter_access_token: true, twitter_access_token_secret: true }
  });

  // OAuth 1.0a User Context
  const oauth = new OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    process.env.TWITTER_API_KEY,
    process.env.TWITTER_API_SECRET,
    '1.0A',
    null,
    'HMAC-SHA1'
  );

  // Tweet 생성 (v2 API)
  const response = await axios.post(
    'https://api.twitter.com/2/tweets',
    {
      text,
      media: { media_ids: mediaIds }
    },
    {
      headers: {
        Authorization: oauth.authHeader(
          'https://api.twitter.com/2/tweets',
          user.twitter_access_token,
          user.twitter_access_token_secret,
          'POST'
        )
      }
    }
  );

  return response.data;
}
```

**공수**: 1일

---

#### 1.1.15.3 포스팅 히스토리 ⚠️ 미완료
**설명**: 포스팅 히스토리 저장 및 조회

**세부 작업**:
- [ ] 포스팅 히스토리 테이블 설계 (`twitter_posts`)
- [ ] 포스팅 히스토리 저장
- [ ] 포스팅 히스토리 조회 API
- [ ] 포스팅 삭제 API

**데이터베이스 테이블** (예정):
```sql
CREATE TABLE xylo.twitter_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES xylo.users(id),
  tweet_id VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twitter_posts_user ON xylo.twitter_posts(user_id);
```

**API 엔드포인트** (예정):
```
GET    /api/v1/twitter/posts           - 내 포스팅 히스토리
DELETE /api/v1/twitter/posts/:id       - 포스팅 삭제
```

**공수**: 0.5일

---

### 완료 체크리스트
- [ ] Twitter API v2 유료 플랜 가입
- [ ] Twitter API v2 클라이언트 설정
- [ ] 자동 포스팅 API 구현
- [ ] 이미지 업로드 지원
- [ ] 포스팅 히스토리 저장 및 조회

### 의존성
- X OAuth (1.1.1) - ✅ 완료
- Twitter API v2 유료 플랜 ($100/월) - ⚠️ 결제 필요

### 비고
- Twitter API v2 유료 플랜 필요 ($100/월)
- 비용 대비 우선순위 낮음 (P2)
- MVP 범위에서 제외 가능

---

## 전체 백엔드 요약

### 완료 현황
| 기능 | 상태 | 완료율 | 공수 |
|------|------|--------|------|
| 1.1.1 인증 & 사용자 관리 | ✅ 95% | 10/12일 | Discord OAuth 제외 |
| 1.1.2 YouTube 크롤링 | ✅ 100% | 5/5일 | 완료 |
| 1.1.3 포인트 시스템 | ✅ 100% | 5/5일 | 완료 |
| 1.1.4 리더보드 | ✅ 100% | 3/3일 | 완료 |
| 1.1.5 리퍼럴 | ✅ 90% | 3/4일 | Discord 검증 제외 |
| 1.1.6 NFT 시스템 | ✅ 100% | 4/4일 | 완료 |
| 1.1.7 XLT Claim | ✅ 100% | 3/3일 | 완료 |
| 1.1.8 이벤트 | ✅ 100% | 2/2일 | 완료 |
| 1.1.9 튜토리얼 | ✅ 100% | 1/1일 | 완료 |
| 1.1.10 FAQ | ✅ 100% | 1/1일 | 완료 |
| 1.1.11 알림 시스템 | ⚠️ 0% | 0/3일 | 미완료 |
| 1.1.12 관리자 대시보드 | ⚠️ 0% | 0/3일 | 미완료 |
| 1.1.13 Discord 연동 | ⚠️ 0% | 0/2일 | 미완료 |
| 1.1.14 활동 통계 API | ⚠️ 0% | 0/1일 | 미완료 |
| 1.1.15 X 자동 포스팅 | ⚠️ 0% | 0/2일 | 미완료 |
| **총합** | **73%** | **37/51일** | **14일 잔여** |

### 우선순위별 잔여 작업
**P0 (Core) - 완료** ✅
- 모든 Core 기능 완료 (인증, YouTube, 포인트, 리더보드, NFT, XLT Claim)

**P1 (High) - 8일 잔여** ⚠️
1. 알림 시스템 (3일)
2. 관리자 대시보드 (3일)
3. Discord 연동 (2일)

**P2 (Medium) - 3일 잔여** ⚠️
1. 활동 통계 API (1일)
2. X 자동 포스팅 (2일)

### 다음 단계 추천
1. **즉시 착수 가능** (독립 작업):
   - 알림 시스템 (3일)
   - 활동 통계 API (1일)

2. **병렬 작업 가능**:
   - 알림 시스템 + 관리자 대시보드 (동시 진행 가능)

3. **순차 작업**:
   - Discord 연동 → 리퍼럴 Discord 검증 (의존성 있음)

4. **선택적 작업** (비용 고려):
   - X 자동 포스팅 (Twitter API $100/월)

---

**문서 끝**
