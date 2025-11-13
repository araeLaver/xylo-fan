# Frontend

React 기반 프론트엔드. 백엔드 API(`backend/`) 연동.

## Tech Stack

- React 18 + TypeScript
- Zustand (state)
- Material-UI
- ethers.js (Web3)
- Axios

## Directory

```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── api/          # Backend API calls
│   ├── hooks/
│   ├── types/
│   └── utils/
├── public/
└── package.json
```

## Setup

```bash
cd frontend

# TODO: 프론트 개발자가 프로젝트 초기화
# npx create-next-app@latest . --typescript --tailwind --app
# 또는
# npx create-react-app . --template typescript

npm install
npm start
```

## Backend API

Base URL: `http://localhost:3000/api/v1` (개발)

### 주요 엔드포인트

**Auth**
```
GET  /auth/twitter
GET  /auth/discord
POST /auth/login
POST /auth/logout
```

**Users**
```
GET   /users/me
PATCH /users/me
POST  /users/wallet
GET   /users/me/channels
GET   /users/me/activity-stats?period=7d
```

**NFT**
```
GET  /nft/my-nfts
GET  /nft/benefits
POST /nft/:nftId/burn
```

**Referral**
```
POST /referrals/register
GET  /referrals/my-link
GET  /referrals/x-share-url?type=referral
GET  /referrals/my-referrals
GET  /referrals/stats
```

**Points**
```
GET /points/my-points
GET /points/history
```

**Leaderboard**
```
GET /leaderboard/top-users?type=TOTAL&limit=100
GET /leaderboard/my-rank?type=TOTAL
```

**Tutorial**
```
GET  /tutorial/progress
POST /tutorial/complete/:stepId
```

**FAQ**
```
GET /faq/list?category=GENERAL
GET /faq/:id
```

**Events**
```
POST /events/participate
GET  /events/my-participations
```

전체 API 스펙: `backend/README.md` 또는 `docs/03-API-DESIGN.md`

## Environment Variables

`.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
```

## 구현 필요 기능

- [ ] Twitter/Discord OAuth 로그인 플로우
- [ ] 이메일 로그인
- [ ] 마이페이지 (프로필, 포인트, NFT)
- [ ] YouTube 채널 등록/검증 UI
- [ ] 레퍼럴 링크 공유 (QR 코드, X 공유)
- [ ] 리더보드 (필터: ALL/TOTAL/CONTENT/COMMUNITY/EVENT/SPONSOR)
- [ ] NFT 갤러리
- [ ] 지갑 연결 (MetaMask)
- [ ] 튜토리얼 플로우 (5단계)
- [ ] FAQ 페이지

## 백엔드 연동 예시

```typescript
// src/api/auth.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const login = async (email: string, password: string) => {
  const { data } = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  return data;
};

export const getProfile = async (token: string) => {
  const { data } = await axios.get(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};
```

## Notes

- 백엔드 27개 API 이미 구현 완료
- JWT Bearer Token 인증 (`Authorization: Bearer <token>`)
- CORS는 백엔드에서 `FRONTEND_URL` 기준으로 설정됨
- 블록체인 연동은 `blockchain/` 폴더 참고
