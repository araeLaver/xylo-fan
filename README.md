# XYLO × WITCHES

K-POP 팬덤 기반 RWA 블록체인 플랫폼

---

## 프로젝트 개요

팬 활동을 정량화하여 포인트로 전환하고, 리더보드를 통해 순위를 관리하며, NFT와 토큰 보상을 제공하는 팬덤 플랫폼입니다.

### 핵심 기능

- 팬 활동 정량화 및 포인트 시스템
- 실시간 리더보드 (ALL, 1D, 1W, 1M, 3M)
- ERC-3525 SBT 기반 활동 기록
- NFT 시스템 (티어형, 리워드형, 커넥션형)
- 추천 시스템

---

## 기술 스택

### Backend
- NestJS 11.x + TypeScript 5.7.x
- PostgreSQL 15 + Prisma ORM
- Redis + Bull Queue
- Passport.js (OAuth, JWT)
- Node.js 18.20.0 LTS

### Frontend (예정)
- React

### Blockchain (예정)
- Solidity + Polygon

---

## 프로젝트 구조

```
xylo-fan/
├── backend/                              # NestJS Backend
│   ├── src/
│   │   ├── auth/                         # 인증 모듈
│   │   │   ├── strategies/               # Passport 전략
│   │   │   │   ├── jwt.strategy.ts       # JWT 인증
│   │   │   │   ├── twitter.strategy.ts   # Twitter OAuth 1.0a
│   │   │   │   └── discord.strategy.ts   # Discord OAuth(X)
│   │   │   ├── guards/                   # 인증 가드
│   │   │   ├── email/                    # 이메일 서비스
│   │   │   ├── dto/                      # DTO (인증 관련)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── users/                        # 사용자 관리
│   │   │   ├── dto/                      # DTO (사용자 관련)
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   │
│   │   ├── youtube/                      # 유튜브 연동
│   │   │   ├── dto/
│   │   │   ├── youtube.controller.ts
│   │   │   ├── youtube.service.ts        # YouTube Data API v3
│   │   │   └── youtube.module.ts
│   │   │
│   │   ├── points/                       # 포인트 시스템
│   │   │   ├── dto/
│   │   │   ├── points.controller.ts
│   │   │   ├── points.service.ts         # 6-slot 포인트 관리
│   │   │   └── points.module.ts
│   │   │
│   │   ├── leaderboard/                  # 리더보드
│   │   │   ├── dto/
│   │   │   ├── leaderboard.controller.ts
│   │   │   ├── leaderboard.service.ts
│   │   │   └── leaderboard.module.ts
│   │   │
│   │   ├── referral/                     # 추천 시스템
│   │   │   ├── dto/
│   │   │   ├── referral.controller.ts
│   │   │   ├── referral.service.ts       # 3단계 추천 추적
│   │   │   └── referral.module.ts
│   │   │
│   │   ├── nft/                          # NFT 관리
│   │   │   ├── dto/
│   │   │   ├── enums/                    # NFT 타입 정의
│   │   │   ├── constants/                # NFT 메타데이터
│   │   │   ├── nft.controller.ts
│   │   │   ├── nft.service.ts
│   │   │   └── nft.module.ts
│   │   │
│   │   ├── events/                       # 이벤트 참여
│   │   │   ├── dto/
│   │   │   ├── events.controller.ts
│   │   │   ├── events.service.ts
│   │   │   └── events.module.ts
│   │   │
│   │   ├── tutorial/                     # 튜토리얼
│   │   │   ├── constants/                # 튜토리얼 카드 데이터
│   │   │   ├── dto/
│   │   │   ├── tutorial.controller.ts
│   │   │   ├── tutorial.service.ts
│   │   │   └── tutorial.module.ts
│   │   │
│   │   ├── faq/                          # FAQ
│   │   │   ├── dto/
│   │   │   ├── guards/                   # 관리자 가드
│   │   │   ├── faq.controller.ts
│   │   │   ├── admin-faq.controller.ts
│   │   │   ├── faq.service.ts
│   │   │   └── faq.module.ts
│   │   │
│   │   ├── xlt-claim/                    # XLT 클레임
│   │   │   ├── dto/
│   │   │   ├── constants/
│   │   │   ├── xlt-claim.controller.ts
│   │   │   ├── xlt-claim.service.ts
│   │   │   └── xlt-claim.module.ts
│   │   │
│   │   ├── jobs/                         # Queue Jobs (Bull)
│   │   │   ├── processors/
│   │   │   │   ├── youtube-crawl.processor.ts
│   │   │   │   ├── point-calculation.processor.ts
│   │   │   │   ├── leaderboard-snapshot.processor.ts
│   │   │   │   ├── referral.processor.ts
│   │   │   │   └── tier-nft-upgrade.processor.ts
│   │   │   ├── jobs.service.ts
│   │   │   └── jobs.module.ts
│   │   │
│   │   ├── prisma/                       # Prisma ORM
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   │
│   │   ├── test/                         # 테스트용 모듈
│   │   │   ├── templates/                # HTML 템플릿
│   │   │   ├── test.controller.ts
│   │   │   ├── test.service.ts
│   │   │   └── test.module.ts
│   │   │
│   │   ├── app.module.ts                 # 루트 모듈
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── main.ts                       # 애플리케이션 진입점
│   │
│   ├── prisma/
│   │   └── schema.prisma                 # 데이터베이스 스키마
│   │
│   ├── test/                             # E2E 테스트
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example                      # 환경변수 템플릿
│   ├── .prettierrc                       # Prettier 설정
│   ├── eslint.config.mjs                 # ESLint 설정
│   └── README.md
│
├── database/                             # 데이터베이스 마이그레이션
│   ├── 01-create-tables.sql             # 기본 테이블 생성
│   ├── 02-add-channel-snapshots.sql     # 채널 스냅샷
│   ├── 03-optional-improvements.sql     # 선택적 개선
│   ├── 04-multi-sns-support.sql         # 멀티 SNS 지원
│   ├── 05-verification-and-posting.sql  # 인증 및 포스팅
│   ├── 06-youtube-extended-fields.sql   # 유튜브 확장 필드
│   ├── 07-email-verification.sql        # 이메일 인증
│   ├── 08-tutorial-tracking.sql         # 튜토리얼 추적
│   ├── 09-faq-system.sql                # FAQ 시스템
│   ├── 10-update-point-category-enum.sql
│   ├── 11-xlt-claim-requests.sql        # XLT 클레임
│   ├── run-migration.js                 # 마이그레이션 실행 스크립트
│   ├── verify-tables.js                 # 테이블 검증
│   ├── ERD.md                            # ERD 문서
│   └── DATABASE-SETUP-RESULT.md
│
├── docs/                                 # 프로젝트 문서
│   ├── 00-BACKEND-QUICK-REFERENCE.md    # 백엔드 빠른 참조
│   ├── 00-BUSINESS-REQUIREMENTS.md      # 비즈니스 요구사항
│   ├── 01-TECH-STACK.md                 # 기술 스택
│   ├── 02-DATABASE-SCHEMA.md            # 데이터베이스 스키마
│   ├── 03-API-DESIGN.md                 # API 설계
│   ├── 04-SMART-CONTRACT-DESIGN.md      # 스마트 컨트랙트 설계
│   ├── 05-SYSTEM-ARCHITECTURE.md        # 시스템 아키텍처
│   ├── 06-DEVELOPMENT-SETUP.md          # 개발 환경 설정
│   ├── 07-CODING-GUIDELINES.md          # 코딩 가이드라인
│   ├── 08-DEPLOYMENT-STRATEGY.md        # 배포 전략
│   ├── 09-BACKEND-LOGIC-SPEC.md         # 백엔드 로직 상세
│   ├── 10-EXTERNAL-API-INTEGRATION.md   # 외부 API 연동
│   ├── 11-QUEUE-JOBS-SPEC.md            # Queue Jobs 스펙
│   ├── 12-MULTI-SNS-MIGRATION-GUIDE.md
│   ├── 13-IMPLEMENTATION-ROADMAP.md
│   ├── 14-SCREEN-PLANNING-GAP-ANALYSIS.md
│   ├── 15-DEVELOPMENT-SCHEDULE.md
│   ├── 16-WBS-BY-FEATURE.md
│   ├── 17-BACKEND-WBS-DETAILED.md
│   ├── feature-specs/                   # 기능 상세 스펙
│   │   ├── 01-email-recovery.md
│   │   ├── 02-tutorial-flow.md
│   │   ├── 02-x-auto-posting.md
│   │   └── 03-faq-system.md
│   └── youtube-api-additional-fields.md
│
├── frontend/                             # React Frontend (예정)
│   └── README.md
│
├── blockchain/                           # Smart Contracts (예정)
│   └── README.md
│
├── .github/                              # GitHub Actions
│   └── workflows/
│       └── ci.yml                        # CI 워크플로우
│
├── package.json
└── README.md
```

---

## Backend 설정 및 실행

### 1. 환경 요구사항

- Node.js 18.20.0 LTS
- PostgreSQL 15
- Redis 7

### 2. 설치

```bash
cd backend
npm install
```

### 3. 환경변수 설정

`backend/.env` 파일 생성:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/xylo?schema=xylo"

# JWT
JWT_SECRET="your-jwt-secret-key"

# Twitter OAuth
TWITTER_CONSUMER_KEY="your-key"
TWITTER_CONSUMER_SECRET="your-secret"
TWITTER_CALLBACK_URL="http://localhost:3000/api/v1/auth/twitter/callback"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="XYLO <noreply@xylo.world>"

# YouTube API
YOUTUBE_API_KEY="your-youtube-api-key"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Frontend
FRONTEND_URL="http://localhost:3001"

# Server
NODE_ENV="development"
PORT="3000"
```

### 4. 데이터베이스 설정

```bash
# PostgreSQL 데이터베이스 생성
psql -U postgres
CREATE DATABASE xylo;
\c xylo
CREATE SCHEMA xylo;
\q

# Migration 실행
cd database
node run-migration.js
```

### 5. Redis 실행

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 6. Prisma 설정

```bash
cd backend
npx prisma generate
```

### 7. 서버 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션
npm run build
npm run start
```

서버 실행 주소: `http://localhost:3000`

### 8. 확인

```bash
# Health Check
curl http://localhost:3000

# 빌드 확인
npm run build

# 테스트
npm run test
```

---

## API 엔드포인트

### 인증
- `GET /api/v1/auth/twitter` - Twitter OAuth
- `POST /api/v1/auth/login` - 이메일 로그인

### 사용자
- `GET /api/v1/users/me` - 프로필 조회
- `PATCH /api/v1/users/me` - 프로필 업데이트
- `POST /api/v1/users/wallet` - 지갑 연결

### 유튜브
- `POST /api/v1/youtube/channels` - 채널 등록
- `POST /api/v1/youtube/channels/verify` - 채널 인증
- `DELETE /api/v1/youtube/channels/:id` - 채널 삭제

### 포인트
- `GET /api/v1/points/my-points` - 포인트 조회
- `GET /api/v1/points/history` - 히스토리 조회

### 리더보드
- `GET /api/v1/leaderboard/top-users` - 리더보드 조회
- `GET /api/v1/leaderboard/my-rank` - 내 순위 조회

### NFT
- `GET /api/v1/nft/my-nfts` - NFT 목록
- `POST /api/v1/nft/mint-user-pass` - User Pass 발급
- `POST /api/v1/nft/upgrade-tier` - 티어 업그레이드

### 추천
- `POST /api/v1/referrals/register` - 추천 코드 등록
- `GET /api/v1/referrals/my-referrals` - 추천한 사용자
- `GET /api/v1/referrals/stats` - 추천 통계

모든 API는 JWT 인증 필요. 자세한 내용은 `docs/03-API-DESIGN.md` 참고

---

## 데이터베이스

### 주요 테이블

- users - 사용자 정보
- user_points - 포인트 관리
- social_accounts - 소셜 계정 연동
- youtube_channels - 유튜브 채널
- leaderboard_entries - 리더보드
- referrals - 추천 관계
- user_nfts - NFT 소유

자세한 스키마: `database/ERD.md`

---

## Queue Jobs

| Job | 실행 주기 | 설명 |
|-----|----------|------|
| youtube-crawl | 매시간 | 채널 영상 정보 수집 |
| point-calculation | 매일 00:00 | 포인트 계산 |
| leaderboard-snapshot | 매일 01:00 | 리더보드 스냅샷 |
| referral-tracking | 매일 02:00 | 추천 진행도 업데이트 |

---

## 외부 API 키 발급

### Twitter API
1. https://developer.twitter.com/en/portal/dashboard
2. Create Project → Create App
3. Keys and tokens 복사

### YouTube API
1. https://console.cloud.google.com/
2. Create Project
3. Enable APIs → YouTube Data API v3
4. Credentials → Create API Key

---

## 트러블슈팅

### 의존성 오류
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Prisma 오류
```bash
npx prisma generate
```

### Redis 연결 실패
```bash
docker ps | grep redis
docker restart <container-id>
```

---

## 보안

- `.env` 파일은 Git에 커밋 금지
- API 키 노출 금지
- JWT Secret 32자 이상
- PostgreSQL SSL 필수
- 정기적 백업

---

## 문서

| 문서 | 설명 |
|------|------|
| 00-BACKEND-QUICK-REFERENCE.md | 빠른 참조 |
| 01-TECH-STACK.md | 기술 스택 |
| 02-DATABASE-SCHEMA.md | DB 스키마 |
| 03-API-DESIGN.md | API 설계 |
| 04-SMART-CONTRACT-DESIGN.md | 스마트 컨트랙트 |
| 06-DEVELOPMENT-SETUP.md | 개발 환경 설정 |
| 07-CODING-GUIDELINES.md | 코딩 가이드 |

---

**Creative Hill Team**
