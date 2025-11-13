# XYLO × WITCHES

> K-POP 팬덤 기반 RWA(Real World Asset) 블록체인 플랫폼

![XYLO](https://img.shields.io/badge/XYLO-v1.0.0-blue)
![NestJS](https://img.shields.io/badge/NestJS-11.x-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Polygon](https://img.shields.io/badge/Polygon-Mainnet-purple)
![License](https://img.shields.io/badge/License-Proprietary-yellow)

---

프로젝트 개요

핵심 기능

- **팬 활동 정량화**: 콘텐츠 확산, 신규 유입, 이벤트 참여 → 포인트 전환
- **실시간 리더보드**: 기여도 기반 순위 시스템 (ALL, 1D, 1W, 1M, 3M)
- **ERC-3525 SBT**: 6개 슬롯 구조로 활동 히스토리 온체인 기록
- **NFT 시스템**: 티어형, 리워드형, 커넥션형(소각형) NFT
- **RWA Vault**: 실물 수익과 직접 연결된 투명 정산
- **XLT 토큰**: MVP 종료 후 SBT 비율에 따라 Claim 가능
- **소셜 통합**: Twitter OAuth 1.0a, YouTube Data API v3 연동
- **추천 시스템**: 3단계 추천 추적 (가입, 디스코드, 영상)

### 대표 IP

- **위치스 (WITCHES)**: K-POP 걸그룹
- **다영**: 솔로 아티스트

---

## 기술 스택

### Backend 
- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7.x
- **Runtime**: Node.js 18.20.0 LTS
- **Database**: PostgreSQL 15 (Koyeb Managed)
- **ORM**: Prisma 6.x
- **Cache/Queue**: Redis 7 + Bull Queue
- **Authentication**: Passport.js (Twitter/Discord OAuth, JWT)
- **Email**: @nestjs-modules/mailer
- **External APIs**: Google YouTube Data API v3

### Frontend (🚧 예정)

### Blockchain (🚧 예정)

### Deployment
- **Backend**: Koyeb (PostgreSQL, Backend Hosting)
- **Redis**: External Redis Service
- **CI/CD**: GitHub Actions
- **Version Control**: Git + GitHub

---

##  프로젝트 구조

```
C:\Develop\Creativehill\XYLO\
├── .github/                              # ⚙️ GitHub Actions Workflows
│   └── workflows/
│       ├── ci.yml                        # CI: TypeScript 컴파일, 테스트
│       └── cd.yml                        # CD: 배포 자동화
│
├── docs/                                 # 📚 프로젝트 문서
│   ├── 00-BACKEND-QUICK-REFERENCE.md     # 백엔드 빠른 참조
│   ├── 00-BUSINESS-REQUIREMENTS.md       # 비즈니스 요구사항
│   ├── 01-TECH-STACK.md                  # 기술 스택 선정
│   ├── 02-DATABASE-SCHEMA.md             # DB 스키마 설계
│   ├── 03-API-DESIGN.md                  # API 엔드포인트 설계
│   ├── 04-SMART-CONTRACT-DESIGN.md       # 스마트 컨트랙트 설계
│   ├── 05-SYSTEM-ARCHITECTURE.md         # 시스템 아키텍처
│   ├── 06-DEVELOPMENT-SETUP.md           # 개발 환경 설정
│   ├── 07-CODING-GUIDELINES.md           # 코딩 컨벤션
│   ├── 08-DEPLOYMENT-STRATEGY.md         # 배포 전략
│   ├── 09-BACKEND-LOGIC-SPEC.md          # 백엔드 로직 상세
│   ├── 10-EXTERNAL-API-INTEGRATION.md    # 외부 API 연동
│   └── 11-QUEUE-JOBS-SPEC.md             # Queue Jobs 스펙
│
├── database/                             # 💾 Database Migrations & Scripts
│   ├── 01-create-tables.sql              # 14개 테이블 스키마
│   ├── 02-add-channel-snapshots.sql      # 채널 스냅샷 테이블 추가
│   ├── update-leaderboard.sql            # 리더보드 업데이트
│   ├── run-migration.js                  # Migration 실행 스크립트
│   ├── verify-tables.js                  # 테이블 검증
│   ├── ERD.md                            # ERD 문서 (Mermaid + dbdiagram.io)
│   └── DATABASE-SETUP-RESULT.md          # DB 설정 결과
│
├── backend/                              # 🚀 NestJS Backend (✅ 구현 완료)
│   ├── src/
│   │   ├── auth/                         # 인증 모듈 (X OAuth, JWT)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts       # JWT Bearer Token
│   │   │   │   └── twitter.strategy.ts   # Twitter OAuth 1.0a
│   │   │   └── guards/
│   │   │       ├── jwt-auth.guard.ts
│   │   │       └── twitter-auth.guard.ts
│   │   │
│   │   ├── users/                        # 사용자 관리 모듈
│   │   │   ├── users.controller.ts       # 프로필, 지갑, 채널 관리
│   │   │   └── users.service.ts
│   │   │
│   │   ├── youtube/                      # 유튜브 연동 모듈
│   │   │   ├── youtube.controller.ts     # 채널 등록/인증/삭제
│   │   │   └── youtube.service.ts        # YouTube API v3 통합
│   │   │
│   │   ├── points/                       # 포인트 시스템 (6-slot)
│   │   │   ├── points.controller.ts      # 포인트 조회, 히스토리
│   │   │   └── points.service.ts
│   │   │
│   │   ├── leaderboard/                  # 리더보드 모듈
│   │   │   ├── leaderboard.controller.ts # 순위 조회, 통계
│   │   │   └── leaderboard.service.ts
│   │   │
│   │   ├── referral/                     # 추천 시스템
│   │   │   ├── referral.controller.ts    # 추천 등록, 통계
│   │   │   └── referral.service.ts
│   │   │
│   │   ├── events/                       # 이벤트 참여 모듈
│   │   │   ├── events.controller.ts      # VOTE, CONTEST, COMMUNITY
│   │   │   └── events.service.ts
│   │   │
│   │   ├── jobs/                         # Queue Jobs (Bull)
│   │   │   ├── jobs.service.ts
│   │   │   └── processors/
│   │   │       ├── youtube-crawl.processor.ts       # 유튜브 크롤링
│   │   │       ├── point-calculation.processor.ts   # 포인트 계산
│   │   │       ├── leaderboard-snapshot.processor.ts # 리더보드 스냅샷
│   │   │       └── referral.processor.ts            # 추천 추적
│   │   │
│   │   ├── nft/                          # NFT 관리 모듈 (예정)
│   │   ├── prisma/                       # Prisma ORM
│   │   │   └── prisma.service.ts
│   │   └── main.ts                       # 애플리케이션 엔트리포인트
│   │
│   ├── prisma/
│   │   └── schema.prisma                 # 14개 테이블 스키마
│   │
│   ├── .env                              # 환경변수 (Git 무시됨)
│   ├── .env.example                      # 환경변수 템플릿
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── frontend/                             # 🎨 React Frontend (🚧 예정)
│   ├── src/
│   │   ├── components/                   # React 컴포넌트
│   │   ├── pages/                        # 페이지
│   │   ├── api/                          # Backend API 호출 함수
│   │   ├── hooks/                        # 커스텀 Hooks
│   │   ├── types/                        # TypeScript 타입
│   │   └── utils/                        # 유틸리티
│   ├── public/                           # 정적 파일
│   └── README.md                         # 프론트엔드 개발 가이드
│
├── blockchain/                           # 🔗 Smart Contracts (🚧 예정)
│   ├── contracts/                        # Solidity 컨트랙트
│   ├── scripts/                          # 배포 스크립트
│   ├── test/                             # 컨트랙트 테스트
│   ├── deploy/                           # 배포 설정
│   └── README.md                         # 블록체인 개발 가이드
│
├── 기능분석.txt                          # 📋 기능 요구사항 (27개 항목)
├── ip_수익모델_팬덤_참여형_모델.pdf       # 💼 비즈니스 모델 (14p)
├── 마이 페이지 화면 디자인.pdf            # 🎨 UI/UX 설계 - 마이페이지 (15p)
├── 위치스_리더보드_화면기획(다 추가).pdf   # 🎨 UI/UX 설계 - 리더보드 (15p)
├── 1차 ERD.pdf                           # 📊 초기 ERD
└── README.md                             # 📄 이 파일
```

---

## 빠른 시작

### 요구사항

- **Node.js**: 18.20.0 LTS
- **npm**: 10.x
- **PostgreSQL**: 15 (로컬 또는 Koyeb)
- **Redis**: 7 (Docker 권장)
- **Git**: 최신 버전

### 1. 저장소 클론

```bash
git clone https://github.com/araeLaver/XYLO.git
cd XYLO
```

### 2. 데이터베이스 설정

#### 옵션 A: Koyeb Managed PostgreSQL 사용 (권장)

```bash
# Koyeb 대시보드에서 PostgreSQL 인스턴스 생성
# DATABASE_URL 복사
```

#### 옵션 B: 로컬 PostgreSQL 사용

```bash
# PostgreSQL 설치 (Windows)
# https://www.postgresql.org/download/windows/

# psql로 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE xylo;

# 스키마 생성
\c xylo
CREATE SCHEMA xylo;

# migration 실행
cd database
node run-migration.js
```

### 3. Redis 설정

```bash
# Docker로 Redis 실행
docker run -d -p 6379:6379 redis:7-alpine

# 또는 Redis Cloud 사용 (무료)
# https://redis.io/cloud/
```

### 4. 백엔드 설정 및 실행

```bash
cd backend

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일 편집 (아래 환경변수 섹션 참고)

# Prisma Client 생성
npx prisma generate

# 개발 서버 실행 (Hot Reload)
npm run start:dev

# 또는 프로덕션 빌드
npm run build
npm run start
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 5. API 테스트

```bash
# Health Check
curl http://localhost:3000

# Swagger API Docs (예정)
# http://localhost:3000/api-docs
```

---

##  환경변수 설정

`backend/.env` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/xylo?schema=xylo"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Twitter OAuth 1.0a
TWITTER_CONSUMER_KEY="your-twitter-consumer-key"
TWITTER_CONSUMER_SECRET="your-twitter-consumer-secret"
TWITTER_CALLBACK_URL="http://localhost:3000/api/v1/auth/twitter/callback"

# Discord OAuth
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_CALLBACK_URL="http://localhost:3000/api/v1/auth/discord/callback"
DISCORD_SERVER_ID="your-xylo-server-id"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="XYLO Fans <noreply@xylo.world>"

# YouTube Data API v3
YOUTUBE_API_KEY="your-youtube-api-key"

# Redis (Bull Queue)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""  # 옵션

# Frontend URL (CORS)
FRONTEND_URL="http://localhost:3001"

# Node Environment
NODE_ENV="development"  # development | production
PORT="3000"
```

### 환경변수 발급 방법

#### Twitter API (X)
1. https://developer.twitter.com/en/portal/dashboard
2. "Create Project" → "Create App"
3. App Settings → Keys and tokens
4. API Key & Secret 복사

#### Discord OAuth
1. https://discord.com/developers/applications
2. "New Application" 생성
3. OAuth2 → Client ID/Secret 복사
4. Redirects에 Callback URL 추가

#### YouTube Data API
1. https://console.cloud.google.com/
2. "Create Project"
3. "Enable APIs" → "YouTube Data API v3"
4. "Credentials" → "Create API Key"

---

## 데이터베이스 스키마

### 14개 테이블 (PostgreSQL 15, Schema: xylo)

| 테이블명 | 설명 | 주요 컬럼 |
|---------|------|-----------|
| **users** | 사용자 정보 | id, x_id, x_handle, wallet_address, referral_code |
| **user_points** | 6-slot 포인트 | user_id, slot1~6, total_points |
| **point_transactions** | 포인트 트랜잭션 | user_id, point_type, amount, slot, status |
| **point_history** | 포인트 히스토리 | user_id, points, created_at |
| **social_accounts** | 소셜 계정 연동 | user_id, provider, provider_id, access_token |
| **youtube_channels** | 유튜브 채널 | user_id, channel_id, verification_code, is_verified |
| **youtube_videos** | 유튜브 영상 | channel_id, video_id, title, view_count |
| **youtube_video_snapshots** | 영상 스냅샷 | video_id, view_count, like_count, snapshot_date |
| **channel_daily_snapshots** | 채널 일일 스냅샷 | channel_id, subscriber_count, snapshot_date |
| **leaderboard_entries** | 리더보드 | user_id, channel_id, rank, period, points |
| **referrals** | 추천 관계 | referrer_id, referee_id, status |
| **event_participations** | 이벤트 참여 | user_id, event_type, vote_weight |
| **user_nfts** | NFT 소유 | user_id, nft_type, token_id, metadata |
| **system_configs** | 시스템 설정 | config_key, config_value |

자세한 스키마는 [database/ERD.md](database/ERD.md) 참고

---

## API 엔드포인트 (27개)

### 인증 (Auth) - 5개
- `GET /api/v1/auth/twitter` - Twitter OAuth 시작
- `GET /api/v1/auth/twitter/callback` - Twitter OAuth 콜백
- `GET /api/v1/auth/discord` - Discord OAuth 시작
- `GET /api/v1/auth/discord/callback` - Discord OAuth 콜백
- `POST /api/v1/auth/login` - 이메일 로그인

### 사용자 (Users) - 4개
- `GET /api/v1/users/me` - 내 프로필 조회 
- `PATCH /api/v1/users/me` - 프로필 업데이트 
- `POST /api/v1/users/wallet` - 지갑 연결 
- `GET /api/v1/users/me/channels` - 내 채널 목록 

### 유튜브 (YouTube) - 3개
- `POST /api/v1/youtube/channels` - 채널 등록 
- `POST /api/v1/youtube/channels/verify` - 채널 인증 
- `DELETE /api/v1/youtube/channels/:id` - 채널 삭제 

### 포인트 (Points) - 3개
- `GET /api/v1/points/my-points` - 현재 포인트 (6-slot) 
- `GET /api/v1/points/history` - 트랜잭션 히스토리 
- `GET /api/v1/points/daily?days=30` - 일일 히스토리 

### 리더보드 (Leaderboard) - 2개
- `GET /api/v1/leaderboard/top-users?type=TOTAL&limit=100` - 리더보드 조회 
- `GET /api/v1/leaderboard/my-rank?type=TOTAL` - 내 순위 

### NFT - 5개
- `GET /api/v1/nft/my-nfts` - 내 NFT 목록 
- `GET /api/v1/nft/benefits` - NFT 혜택 정보 
- `POST /api/v1/nft/mint-user-pass` - User Pass 발급 
- `POST /api/v1/nft/upgrade-tier` - Tier NFT 업그레이드 
- `POST /api/v1/nft/:nftId/burn` - NFT 소각 

### 추천 (Referral) - 6개
- `POST /api/v1/referrals/register` - 추천 코드 등록 
- `GET /api/v1/referrals/my-referrals` - 내가 추천한 사용자 
- `GET /api/v1/referrals/my-referrer` - 나를 추천한 사용자 
- `GET /api/v1/referrals/stats` - 추천 통계 
- `GET /api/v1/referrals/my-link` - 내 추천 링크 (QR 코드) 
- `GET /api/v1/referrals/x-share-url?type=referral` - X 공유 URL 

### 튜토리얼 (Tutorial) - 2개
- `GET /api/v1/tutorial/progress` - 튜토리얼 진행도 
- `POST /api/v1/tutorial/complete/:stepId` - 단계 완료 

### FAQ - 2개
- `GET /api/v1/faq/list?category=GENERAL` - FAQ 목록
- `GET /api/v1/faq/:id` - FAQ 상세

### 이벤트 (Events) - 2개
- `POST /api/v1/events/participate` - 이벤트 참여 
- `GET /api/v1/events/my-participations?eventType=VOTE` - 내 참여 내역 

JWT 인증 필요

자세한 API 명세는 [docs/03-API-DESIGN.md](docs/03-API-DESIGN.md) 참고

---

##  Queue Jobs (Bull + Redis)

### 구현된 Job 프로세서

| Job | 스케줄 | 설명 |
|-----|--------|------|
| **youtube-crawl** | 매시간 (0분) | 등록된 채널의 영상 정보 수집 |
| **point-calculation** | 매일 00:00 KST | 전날 활동 기반 포인트 계산 |
| **leaderboard-snapshot** | 매일 01:00 KST | 리더보드 스냅샷 생성 (ALL, 1D, 1W, 1M, 3M) |
| **referral-tracking** | 매일 02:00 KST | 추천 진행도 업데이트 |



---

## 🧪 테스트

```bash
cd backend

# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

---

## 📚 문서

| 문서 | 설명 | 링크 |
|------|------|------|
| **백엔드 빠른 참조** | API, 환경변수, 트러블슈팅 | [docs/00-BACKEND-QUICK-REFERENCE.md](docs/00-BACKEND-QUICK-REFERENCE.md) |
| **비즈니스 요구사항** | 프로젝트 목적, 핵심 기능, 사용자 플로우 | [docs/00-BUSINESS-REQUIREMENTS.md](docs/00-BUSINESS-REQUIREMENTS.md) |
| **기술 스택** | 백엔드/프론트/블록체인 기술 선정 근거 | [docs/01-TECH-STACK.md](docs/01-TECH-STACK.md) |
| **데이터베이스 스키마** | PostgreSQL 테이블 설계, ERD, 인덱스 전략 | [docs/02-DATABASE-SCHEMA.md](docs/02-DATABASE-SCHEMA.md) |
| **API 설계** | RESTful API 엔드포인트, 요청/응답 구조 | [docs/03-API-DESIGN.md](docs/03-API-DESIGN.md) |
| **스마트 컨트랙트** | ERC-3525 SBT, NFT, Vault 컨트랙트 설계 | [docs/04-SMART-CONTRACT-DESIGN.md](docs/04-SMART-CONTRACT-DESIGN.md) |
| **시스템 아키텍처** | 전체 구조, 컴포넌트 간 통신, 데이터 플로우 | [docs/05-SYSTEM-ARCHITECTURE.md](docs/05-SYSTEM-ARCHITECTURE.md) |
| **개발 환경 설정** | 로컬 환경 구축 단계별 가이드 | [docs/06-DEVELOPMENT-SETUP.md](docs/06-DEVELOPMENT-SETUP.md) |
| **코딩 가이드** | TypeScript/NestJS/React/Solidity 컨벤션 | [docs/07-CODING-GUIDELINES.md](docs/07-CODING-GUIDELINES.md) |
| **배포 전략** | CI/CD, 모니터링, 백업, 보안 | [docs/08-DEPLOYMENT-STRATEGY.md](docs/08-DEPLOYMENT-STRATEGY.md) |
| **백엔드 로직 상세** | 비즈니스 로직 구현 상세 | [docs/09-BACKEND-LOGIC-SPEC.md](docs/09-BACKEND-LOGIC-SPEC.md) |
| **외부 API 연동** | Twitter, YouTube API 통합 가이드 | [docs/10-EXTERNAL-API-INTEGRATION.md](docs/10-EXTERNAL-API-INTEGRATION.md) |
| **Queue Jobs 스펙** | Bull Queue 작업 상세 | [docs/11-QUEUE-JOBS-SPEC.md](docs/11-QUEUE-JOBS-SPEC.md) |

---

## 🎯 개발 로드맵

### Phase 1: MVP 개발 

- [x] 프로젝트 기획 및 설계
- [x] 문서화 완료 (12개 문서)
- [x] NestJS 백엔드 구현 (27개 API)
  - [x] Twitter/Discord OAuth 로그인
  - [x] 이메일 로그인 & 복구
  - [x] 유튜브 채널 인증
  - [x] 포인트 시스템 (6-slot)
  - [x] 리더보드 (5개 타입 필터)
  - [x] NFT 시스템 (SBT, Tier, Connection, Reward)
  - [x] 추천 시스템 (3단계 추적)
  - [x] 튜토리얼 플로우
  - [x] FAQ 시스템
  - [x] 이벤트 참여
  - [x] Queue Jobs (5개 프로세서)
  - [x] 이메일 알림 (HTML 템플릿)
- [x] PostgreSQL 데이터베이스 (14개 테이블)
- [x] TypeScript 컴파일 0 에러 달성
- [x] GitHub 저장소 설정
- [x] 프론트엔드/블록체인 폴더 구조 생성

### Phase 2: 스마트 컨트랙트 & 프론트엔드 진행 중

- [ ] 스마트 컨트랙트 개발
  - [ ] XYLOUserPass (ERC-721 SBT)
  - [ ] XYLOTierNFT (Bronze/Silver/Gold/Diamond)
  - [ ] XYLOConnectionNFT (YouTube/Discord)
  - [ ] XYLORewardNFT (Event Tickets)
- [ ] React 프론트엔드 구현
  - [ ] 로그인 / 대시보드
  - [ ] 마이페이지
  - [ ] 리더보드
  - [ ] NFT 갤러리
  - [ ] 레퍼럴 공유 (QR, X)
  - [ ] 튜토리얼 UI
  - [ ] 이벤트 참여 UI
- [ ] Polygon Mumbai 테스트넷 배포
- [ ] 통합 테스트

### Phase 3: 테스트 및 최적화 (1개월)

- [ ] E2E 테스트 완성도 향상
- [ ] 성능 최적화 (DB 인덱싱, 캐싱)
- [ ] 보안 감사 (스마트 컨트랙트, API)
- [ ] 베타 테스터 모집 (50명)
- [ ] 문서화 보완

### Phase 4: 정식 런칭 (1개월)

- [ ] Polygon Mainnet 배포
- [ ] 프로덕션 모니터링 설정
- [ ] 마케팅 캠페인
- [ ] 커뮤니티 운영 (Discord, Telegram)
- [ ] XLT Claim 기능 개발

### 타임라인

- **10-11월 2025**: 스펙 동결, 엔터사 제안
- **11월~ 2025**: 소규모 실운영
- **~1월 2026**: 레퍼런스 축적
- **최소 운영 기간**: 6개월

---

### 브랜치 전략

```
main (프로덕션)
  ↑
develop (개발)
  ↑
  ├── feature/login-oauth
  ├── feature/leaderboard-ranking
  ├── fix/points-calculation
  └── refactor/user-service
```

### Commit 규칙 (Conventional Commits)

```bash
# 기능 추가
feat(auth): add Twitter OAuth login
feat(points): implement 6-slot point system

# 버그 수정
fix(points): correct calculation logic for slot distribution
fix(youtube): handle API rate limit errors

# 문서
docs(api): update endpoint documentation
docs(readme): add environment variables section

# 리팩토링
refactor(users): extract wallet connection logic

# 테스트
test(auth): add unit tests for JWT strategy

# CI/CD
ci(github): add automated testing workflow

# 스타일 (포매팅)
style(backend): fix linting errors
```

### Pull Request 프로세스

1. `feature/*` 또는 `fix/*` 브랜치 생성
2. 코드 작성 및 테스트
3. Commit 메시지 작성 (Conventional Commits)
4. `develop` 브랜치로 PR 생성
5. CI 통과 확인 (TypeScript 컴파일, 테스트)
6. 코드 리뷰 후 머지
7. `main` 브랜치로 릴리스 (태그 생성)

자세한 내용은 [docs/07-CODING-GUIDELINES.md](docs/07-CODING-GUIDELINES.md) 참고

---

##  CI/CD

### GitHub Actions Workflows

- **CI (Continuous Integration)**: `.github/workflows/ci.yml`
  - 트리거: Push to `main`, `develop`, PR
  - 작업:
    - Node.js 18.x 환경 설정
    - 의존성 설치
    - TypeScript 컴파일 검사
    - 단위 테스트 실행
    - E2E 테스트 실행
    - 테스트 커버리지 리포트

- **CD (Continuous Deployment)**: `.github/workflows/cd.yml` (예정)
  - 트리거: Tag push (`v*`)
  - 작업:
    - 프로덕션 빌드
    - Docker 이미지 생성
    - Koyeb 배포

### 로컬에서 CI 시뮬레이션

```bash
cd backend

# TypeScript 컴파일 검사
npm run build

# 테스트 실행
npm run test

# E2E 테스트
npm run test:e2e

# 린팅
npm run lint
```

---

## 🛡️보안

### 환경변수 관리

- **절대** `.env` 파일을 Git에 커밋하지 마세요
- `.env.example` 템플릿만 저장소에 포함
- 프로덕션 환경변수는 Koyeb 대시보드에서 관리

### API 키 보안

- Twitter API Key, YouTube API Key는 절대 노출 금지
- JWT Secret은 최소 32자 이상 랜덤 문자열 사용
- 정기적으로 API 키 회전 (3-6개월)

### 데이터베이스 보안

- PostgreSQL 연결은 SSL 필수 (`sslmode=require`)
- 프로덕션 DB는 VPC 내부에서만 접근
- 정기적 백업 (일일 자동 백업)

---

## 📈 모니터링

### 로그

```bash
# 백엔드 로그 확인
cd backend
npm run start:dev  # 개발 환경 (콘솔 출력)

# 프로덕션 로그 (Koyeb)
# Koyeb 대시보드 → Logs 탭
```

### 성능 메트릭 (예정)

- **APM**: New Relic 또는 Datadog
- **Error Tracking**: Sentry
- **Uptime Monitoring**: UptimeRobot

---

## 🐛 트러블슈팅

### 컴파일 에러: "Cannot find module '@nestjs/core'"

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Prisma 에러: "Schema file not found"

```bash
cd backend
npx prisma generate
```

### Redis 연결 실패

```bash
# Redis가 실행 중인지 확인
docker ps | grep redis

# Redis 재시작
docker restart <redis-container-id>
```

### TypeScript 컴파일 에러

```bash
cd backend
npm run build  # 에러 확인
npx tsc --noEmit  # 타입 체크만 수행
```

---

---

**Built with ❤️ by Creative Hill Team**

**GitHub**: https://github.com/araeLaver/XYLO
