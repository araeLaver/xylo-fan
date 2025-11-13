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
- 소셜 통합 (Twitter, Discord, YouTube)
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
├── backend/              # NestJS Backend
│   ├── src/
│   │   ├── auth/         # 인증
│   │   ├── users/        # 사용자 관리
│   │   ├── youtube/      # 유튜브 연동
│   │   ├── points/       # 포인트 시스템
│   │   ├── leaderboard/  # 리더보드
│   │   ├── referral/     # 추천 시스템
│   │   ├── nft/          # NFT 관리
│   │   └── jobs/         # Queue Jobs
│   └── prisma/
│       └── schema.prisma
│
├── frontend/             # React (예정)
├── blockchain/           # Smart Contracts (예정)
├── database/             # DB Migrations
└── docs/                 # 문서
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

# Discord OAuth
DISCORD_CLIENT_ID="your-client-id"
DISCORD_CLIENT_SECRET="your-client-secret"
DISCORD_CALLBACK_URL="http://localhost:3000/api/v1/auth/discord/callback"
DISCORD_SERVER_ID="your-server-id"

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
- `GET /api/v1/auth/discord` - Discord OAuth
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

### Discord OAuth
1. https://discord.com/developers/applications
2. New Application 생성
3. OAuth2 → Client ID/Secret 복사

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
