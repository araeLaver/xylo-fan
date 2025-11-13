# XYLO 개발 환경 설정 가이드

> 작성일: 2025-01-07
> 대상: 개발자 (백엔드, 프론트엔드, 블록체인)
> 목적: 로컬 개발 환경 구축 단계별 가이드

---

## 📋 목차

1. [사전 요구사항](#1-사전-요구사항)
2. [백엔드 설정](#2-백엔드-설정)
3. [프론트엔드 설정](#3-프론트엔드-설정)
4. [블록체인 설정](#4-블록체인-설정)
5. [데이터베이스 설정](#5-데이터베이스-설정)
6. [외부 API 설정](#6-외부-api-설정)
7. [통합 테스트](#7-통합-테스트)

---

## 1. 사전 요구사항

### 1.1 필수 소프트웨어

| 소프트웨어 | 버전 | 설치 링크 |
|-----------|------|----------|
| **Node.js** | 18.20.0 LTS | https://nodejs.org |
| **npm** | 10.x | (Node.js 포함) |
| **Git** | 2.40+ | https://git-scm.com |
| **PostgreSQL** | 15+ | https://postgresql.org (또는 Koyeb 사용) |
| **Redis** | 7+ | https://redis.io (또는 Docker) |
| **VS Code** | Latest | https://code.visualstudio.com |
| **MetaMask** | Latest | https://metamask.io |

### 1.2 권장 VS Code 확장

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "juanblanco.solidity",
    "nomicfoundation.hardhat-solidity"
  ]
}
```

### 1.3 시스템 요구사항

- **OS**: Windows 10/11, macOS 12+, Ubuntu 20.04+
- **RAM**: 최소 8GB (권장 16GB)
- **Disk**: 최소 10GB 여유 공간

---

## 2. 백엔드 설정

### 2.1 프로젝트 클론

```bash
cd C:\Develop\Creativehill\XYLO
mkdir backend
cd backend
```

### 2.2 NestJS 프로젝트 초기화

```bash
# NestJS CLI 전역 설치
npm install -g @nestjs/cli

# 프로젝트 생성
nest new backend
# Package manager: npm 선택

cd backend
```

### 2.3 필수 패키지 설치

```bash
# Core Dependencies
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install @nestjs/typeorm @prisma/client passport passport-jwt
npm install passport-twitter bcrypt class-validator class-transformer

# Redis & Bull
npm install @nestjs/bull bull ioredis

# Blockchain
npm install ethers@6

# YouTube API
npm install googleapis axios

# Utilities
npm install uuid date-fns

# Dev Dependencies
npm install -D @types/node @types/passport-jwt @types/passport-twitter
npm install -D @types/bcrypt prisma typescript ts-node
npm install -D eslint prettier @typescript-eslint/parser
```

### 2.4 Prisma 초기화

```bash
# Prisma CLI 초기화
npx prisma init

# schema.prisma 파일 자동 생성됨
```

**prisma/schema.prisma 수정**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 테이블 정의는 docs/02-DATABASE-SCHEMA.md 참고
model User {
  id                String   @id @default(uuid())
  xId               String   @unique @map("x_id")
  xHandle           String   @map("x_handle")
  xDisplayName      String?  @map("x_display_name")
  email             String?  @unique
  emailVerified     Boolean  @default(false) @map("email_verified")
  walletAddress     String?  @unique @map("wallet_address")
  profileImageUrl   String?  @map("profile_image_url")
  referralCode      String   @unique @map("referral_code")
  joinedAt          DateTime @default(now()) @map("joined_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("users")
}

// 추가 모델들...
```

### 2.5 환경변수 설정

**.env 파일 생성**:
```bash
# .env
NODE_ENV=development
PORT=3000

# Database (Koyeb PostgreSQL)
DATABASE_URL="postgresql://unble:password@ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app:5432/unble?schema=xylo&sslmode=require"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Twitter OAuth
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:3000/api/v1/auth/twitter/callback

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Blockchain (Polygon Mumbai Testnet)
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
CHAIN_ID=80001
PRIVATE_KEY=0xYourPrivateKeyHere

# Smart Contracts
SBT_CONTRACT_ADDRESS=0x...
NFT_CONTRACT_ADDRESS=0x...
VAULT_CONTRACT_ADDRESS=0x...
XLT_CONTRACT_ADDRESS=0x...
```

**⚠️ 보안 주의**:
```bash
# .gitignore에 추가
echo ".env" >> .gitignore
echo "*.log" >> .gitignore
echo "node_modules/" >> .gitignore
```

### 2.6 Prisma 마이그레이션

```bash
# 스키마를 DB에 적용
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate

# Prisma Studio 실행 (GUI로 DB 확인)
npx prisma studio
# http://localhost:5555 오픈됨
```

### 2.7 프로젝트 구조 생성

```bash
# 모듈 생성
nest g module auth
nest g module users
nest g module youtube
nest g module points
nest g module leaderboard
nest g module blockchain
nest g module events

# 컨트롤러 생성
nest g controller auth
nest g controller users
nest g controller youtube
nest g controller points
nest g controller leaderboard
nest g controller blockchain
nest g controller events

# 서비스 생성
nest g service auth
nest g service users
nest g service youtube
nest g service points
nest g service leaderboard
nest g service blockchain
nest g service events
```

**결과 구조**:
```
backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── twitter.strategy.ts
│   │   └── guards/
│   │       └── jwt-auth.guard.ts
│   ├── users/
│   ├── youtube/
│   ├── points/
│   ├── leaderboard/
│   ├── blockchain/
│   ├── events/
│   ├── common/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   └── pipes/
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── blockchain.config.ts
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── test/
├── .env
├── .gitignore
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### 2.8 로컬 실행

```bash
# 개발 모드 (Hot Reload)
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

**확인**:
```bash
curl http://localhost:3000
# "Hello World!" 응답 확인
```

---

## 3. 프론트엔드 설정

### 3.1 React 프로젝트 생성

```bash
cd C:\Develop\Creativehill\XYLO
npx create-react-app frontend --template typescript
cd frontend
```

### 3.2 필수 패키지 설치

```bash
# UI Framework
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material

# Routing
npm install react-router-dom

# State Management
npm install zustand

# API Client
npm install axios

# Blockchain
npm install ethers@6 wagmi viem

# Utilities
npm install react-query date-fns

# Dev Dependencies
npm install -D @types/react-router-dom
```

### 3.3 환경변수 설정

**.env 파일 생성**:
```bash
# .env
REACT_APP_API_BASE_URL=http://localhost:3000/api/v1
REACT_APP_CHAIN_ID=80001
REACT_APP_SBT_CONTRACT_ADDRESS=0x...
REACT_APP_NFT_CONTRACT_ADDRESS=0x...
```

### 3.4 프로젝트 구조

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Leaderboard/
│   │   ├── MyPage/
│   │   ├── EditProfile/
│   │   └── NFTCard/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   └── MyPagePage.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── blockchain.ts
│   ├── stores/
│   │   └── authStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   ├── App.tsx
│   └── index.tsx
├── .env
└── package.json
```

### 3.5 로컬 실행

```bash
npm start
# http://localhost:3000 자동 오픈
```

---

## 4. 블록체인 설정

### 4.1 Hardhat 프로젝트 초기화

```bash
cd C:\Develop\Creativehill\XYLO
mkdir contracts
cd contracts

npm init -y
npm install --save-dev hardhat
npx hardhat init
# "Create a TypeScript project" 선택
```

### 4.2 필수 패키지 설치

```bash
# OpenZeppelin Contracts
npm install @openzeppelin/contracts

# ERC-3525 (SOLV Protocol)
npm install @solvprotocol/erc-3525

# Testing
npm install --save-dev @nomicfoundation/hardhat-toolbox
npm install --save-dev @nomicfoundation/hardhat-ethers ethers

# Verification
npm install --save-dev @nomiclabs/hardhat-etherscan
```

### 4.3 Hardhat 설정

**hardhat.config.ts**:
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80001
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
```

### 4.4 스마트 컨트랙트 작성

```bash
# contracts/ 디렉토리에 파일 생성
contracts/
├── XYLOUserPass.sol
├── XYLONFTCollection.sol
├── RWAVault.sol
└── XLTToken.sol
```

**컨트랙트 코드는 docs/04-SMART-CONTRACT-DESIGN.md 참고**

### 4.5 로컬 블록체인 실행

```bash
# Terminal 1: Hardhat 네트워크 실행
npx hardhat node
# http://127.0.0.1:8545/ 에서 실행됨

# Terminal 2: 컨트랙트 배포
npx hardhat run scripts/deploy.ts --network localhost
```

### 4.6 Mumbai Testnet 배포

```bash
# Mumbai Testnet에 배포
npx hardhat run scripts/deploy.ts --network mumbai

# 컨트랙트 검증 (Polygonscan)
npx hardhat verify --network mumbai <CONTRACT_ADDRESS>
```

### 4.7 MetaMask 설정

1. **MetaMask 설치** (https://metamask.io)
2. **네트워크 추가**:
   - **Polygon Mumbai Testnet**
     - Network Name: Polygon Mumbai
     - RPC URL: https://rpc-mumbai.maticvigil.com
     - Chain ID: 80001
     - Currency Symbol: MATIC
     - Block Explorer: https://mumbai.polygonscan.com

3. **테스트 MATIC 받기**:
   - https://faucet.polygon.technology
   - 지갑 주소 입력 → 0.1 MATIC 수령

---

## 5. 데이터베이스 설정

### 5.1 로컬 PostgreSQL 설치 (선택사항)

**Windows**:
```bash
# Scoop 사용
scoop install postgresql

# 서비스 시작
pg_ctl start -D C:\Users\<username>\scoop\apps\postgresql\current\data
```

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu**:
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

### 5.2 Koyeb PostgreSQL 사용 (권장)

이미 제공된 Koyeb PostgreSQL 사용:

```bash
# 연결 테스트
psql "postgresql://unble:password@ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app:5432/unble?sslmode=require"

# xylo 스키마 확인
\c unble
SET search_path TO xylo;
\dt
```

### 5.3 Redis 설치

**Docker 사용 (권장)**:
```bash
docker run -d --name xylo-redis -p 6379:6379 redis:7-alpine

# 연결 테스트
redis-cli ping
# PONG 응답 확인
```

**Windows (Memurai)**:
```bash
# https://www.memurai.com/get-memurai 다운로드
# 설치 후 서비스 자동 시작
```

---

## 6. 외부 API 설정

### 6.1 Twitter Developer Account

1. **Developer Portal**: https://developer.twitter.com/en/portal/dashboard
2. **앱 생성**:
   - App name: XYLO Development
   - App permissions: Read and Write
   - Callback URL: `http://localhost:3000/api/v1/auth/twitter/callback`

3. **Keys 확인**:
   ```
   API Key (Consumer Key)
   API Secret (Consumer Secret)
   ```

4. **.env에 추가**:
   ```bash
   TWITTER_CONSUMER_KEY=your_key_here
   TWITTER_CONSUMER_SECRET=your_secret_here
   ```

### 6.2 YouTube Data API v3

1. **Google Cloud Console**: https://console.cloud.google.com
2. **프로젝트 생성**: XYLO Development
3. **API 활성화**:
   - YouTube Data API v3 검색
   - "사용 설정" 클릭

4. **API Key 생성**:
   - "사용자 인증 정보" → "API 키 만들기"

5. **.env에 추가**:
   ```bash
   YOUTUBE_API_KEY=AIzaSy...
   ```

### 6.3 Discord Webhook

1. **디스코드 서버 생성** (테스트용)
2. **Webhook 생성**:
   - 서버 설정 → 연동 → 웹후크
   - "새 웹후크" 클릭

3. **.env에 추가**:
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

---

## 7. 통합 테스트

### 7.1 전체 시스템 실행

**4개 터미널 필요**:

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Redis
docker start xylo-redis

# Terminal 4: Hardhat Node (로컬 블록체인)
cd contracts
npx hardhat node
```

### 7.2 Health Check

```bash
# API 서버
curl http://localhost:3000/health

# PostgreSQL
psql $DATABASE_URL -c "SELECT 1;"

# Redis
redis-cli ping

# Frontend
curl http://localhost:3000
```

### 7.3 E2E 테스트 플로우

1. **회원가입**:
   - Frontend → "Sign in" 버튼 클릭
   - X OAuth 로그인 (실제 Twitter 계정 필요)
   - 자동 포스팅 확인

2. **유튜브 채널 인증**:
   - My Page → Edit Profile → Youtube "Register"
   - 인증코드 복사 → 유튜브 채널 설명 추가
   - "Confirm" 클릭 → 인증 완료

3. **포인트 확인**:
   - My Page → Activity Points 섹션
   - Point History 테이블 확인

4. **NFT 발행**:
   - My Page → "Claim User Pass" 버튼
   - MetaMask 연결 → 서명
   - NFT 카드 표시 확인

---

## 8. 문제 해결

### 8.1 일반적인 오류

#### Error: `EADDRINUSE: address already in use :::3000`
```bash
# 포트 사용 중 - 프로세스 종료
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

#### Error: `Prisma Client could not locate the Query Engine`
```bash
npx prisma generate
```

#### Error: `Cannot connect to PostgreSQL`
```bash
# DATABASE_URL 확인
echo $DATABASE_URL

# SSL 모드 추가
?sslmode=require
```

#### Error: `MetaMask: Transaction rejected`
- Mumbai Testnet 선택 확인
- 테스트 MATIC 잔액 확인
- 가스 리밋 증가 시도

### 8.2 유용한 명령어

```bash
# NestJS 모듈 생성
nest g resource <name>

# Prisma 스키마 동기화
npx prisma db push

# Prisma Studio 열기
npx prisma studio

# Hardhat 컨트랙트 컴파일
npx hardhat compile

# 로그 확인
npm run start:dev | tee backend.log
```

---

## 9. 다음 단계

✅ 개발 환경 설정 완료 후:
1. **API 구현** 시작 (`docs/03-API-DESIGN.md` 참고)
2. **코딩 컨벤션** 숙지 (`docs/07-CODING-GUIDELINES.md`)
3. **첫 기능 구현**: X OAuth 로그인
4. **테스트 작성**: E2E 테스트

---

**작성자**: DevOps Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
