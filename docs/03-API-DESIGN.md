# XYLO API 설계 문서

> 작성일: 2025-01-07
> 대상: 백엔드/프론트엔드 개발자
> 목적: RESTful API 엔드포인트 설계

---

## 📋 목차

1. [개요](#1-개요)
2. [인증/사용자 API](#2-인증사용자-api)
3. [유튜브 API](#3-유튜브-api)
4. [포인트/리더보드 API](#4-포인트리더보드-api)
5. [NFT/블록체인 API](#5-nft블록체인-api)
6. [레퍼럴 API](#6-레퍼럴-api)
7. [이벤트 API](#7-이벤트-api)
8. [에러 코드](#8-에러-코드)

---

## 1. 개요

### 1.1 Base URL

```
개발: http://localhost:3000/api/v1
프로덕션: https://api.xylomvp.world/api/v1
```

### 1.2 인증 방식

**JWT Bearer Token**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.3 공통 응답 구조

**성공 응답**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

**에러 응답**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

### 1.4 페이지네이션

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15
    }
  }
}
```

---

## 2. 인증/사용자 API

### 2.1 X(트위터) OAuth 로그인

#### 요청 URL 생성
```http
GET /auth/twitter/request
```

**Response**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.twitter.com/oauth/authenticate?oauth_token=...",
    "oauthToken": "...",
    "oauthTokenSecret": "..."
  }
}
```

#### 콜백 처리
```http
GET /auth/twitter/callback?oauth_token=...&oauth_verifier=...
```

**Response**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": "uuid",
      "xHandle": "@username",
      "xDisplayName": "Display Name",
      "profileImage": "https://...",
      "referralCode": "ABC123",
      "joinedAt": "2025-01-07T00:00:00Z"
    }
  }
}
```

### 2.2 현재 사용자 정보 조회

```http
GET /users/me
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "xHandle": "@username",
    "xDisplayName": "Display Name",
    "email": "user@example.com",
    "emailVerified": true,
    "walletAddress": "0x1234...",
    "profileImage": "https://...",
    "referralCode": "ABC123",
    "socialAccounts": [
      {
        "platform": "X",
        "handle": "@username",
        "isVerified": true,
        "isPrimary": true
      },
      {
        "platform": "YOUTUBE",
        "handle": "@channelname",
        "isVerified": true,
        "isPrimary": false
      }
    ],
    "joinedAt": "2025-01-07T00:00:00Z"
  }
}
```

### 2.3 프로필 수정

```http
PATCH /users/me
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "profileImage": "data:image/png;base64,...",
  "email": "user@example.com"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "profileImage": "https://cdn.xylomvp.world/profiles/uuid.png",
    "email": "user@example.com"
  }
}
```

### 2.4 이메일 인증 코드 발송

```http
POST /users/me/email/verify
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "user@example.com"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "message": "Verification code sent to user@example.com",
    "expiresIn": 600
  }
}
```

### 2.5 이메일 인증 확인

```http
POST /users/me/email/confirm
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "code": "123456"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

### 2.6 지갑 연동

```http
POST /users/me/wallet
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "walletAddress": "0x1234567890abcdef...",
  "signature": "0xabc..."
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x1234567890abcdef...",
    "connectedAt": "2025-01-07T00:00:00Z"
  }
}
```

---

## 3. 유튜브 API

### 3.1 채널 인증 시작

```http
POST /youtube/channels/verify
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "channelUrl": "https://youtube.com/@channelname"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "channelId": "UC...",
    "verificationCode": "XYLO-AB12CD34",
    "instructions": "Please add this code to your channel description and click confirm.",
    "expiresIn": 3600
  }
}
```

### 3.2 채널 인증 확인

```http
POST /youtube/channels/verify/confirm
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "verificationCode": "XYLO-AB12CD34"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "channelId": "UC...",
    "channelUrl": "https://youtube.com/@channelname",
    "channelTitle": "Channel Name",
    "thumbnailUrl": "https://...",
    "subscriberCount": 1000,
    "isVerified": true,
    "verifiedAt": "2025-01-07T00:00:00Z"
  }
}
```

### 3.3 채널 정보 조회

```http
GET /youtube/channels/me
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "channelId": "UC...",
    "channelTitle": "Channel Name",
    "subscriberCount": 1000,
    "videoCount": 50,
    "viewCount": 100000,
    "isVerified": true,
    "verifiedAt": "2025-01-07T00:00:00Z"
  }
}
```

### 3.4 숏츠 목록 조회

```http
GET /youtube/videos?type=shorts&page=1&limit=10
Authorization: Bearer {token}
```

**Query Parameters**
- `type`: shorts | all
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지당 항목 수 (default: 10, max: 50)
- `tags`: 필터링할 태그 (예: #WITCHES)

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "videoId": "abc123",
        "title": "Video Title",
        "thumbnailUrl": "https://...",
        "publishedAt": "2025-01-07T00:00:00Z",
        "viewCount": 1000,
        "likeCount": 100,
        "commentCount": 10,
        "tags": ["#WITCHES", "#XYLO"],
        "isEligible": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

## 4. 포인트/리더보드 API

### 4.1 내 포인트 조회

```http
GET /points/me
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "totalPoints": 14252,
    "slot01Content": 7300,
    "slot02Mgm": 50,
    "slot03Event": 4150,
    "slot04Profit": 1000,
    "slot05Sponsor": 0,
    "slot06Boost": 300,
    "sbtValue": 12652,
    "lastCalculated": "2025-01-07T00:00:00Z"
  }
}
```

### 4.2 포인트 내역 조회

```http
GET /points/me/history?page=1&limit=10&sort=latest
Authorization: Bearer {token}
```

**Query Parameters**
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수
- `sort`: latest | oldest

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "date": "2025-01-07",
        "dayTotal": 150,
        "contents": 100,
        "referral": 2,
        "event": 48,
        "profit": 0,
        "boost": 0
      },
      {
        "date": "2025-01-06",
        "dayTotal": 200,
        "contents": 180,
        "referral": 0,
        "event": 20,
        "profit": 0,
        "boost": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 30,
      "totalPages": 3
    }
  }
}
```

### 4.3 리더보드 조회

```http
GET /leaderboard?period=ALL&sort=total&order=desc&page=1&limit=10
```

**Query Parameters**
- `period`: ALL | 1D | 1W | 1M | 3M
- `sort`: total | contents | mgm | event | profit | boost
- `order`: asc | desc
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수 (default: 10)

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "rank": 1,
        "user": {
          "id": "uuid",
          "xHandle": "@username",
          "profileImage": "https://..."
        },
        "totalCurrent": 15000,
        "contents": 9800,
        "mgm": 50,
        "event": 4150,
        "profit": 1000,
        "boost": 300
      },
      {
        "rank": 2,
        "user": {
          "id": "uuid",
          "xHandle": "@username2",
          "profileImage": "https://..."
        },
        "totalCurrent": 12000,
        "contents": 8000,
        "mgm": 100,
        "event": 3000,
        "profit": 900,
        "boost": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1000,
      "totalPages": 100
    },
    "snapshotDate": "2025-01-07"
  }
}
```

### 4.4 Top 3 조회

```http
GET /leaderboard/top3?period=ALL
```

**Response**
```json
{
  "success": true,
  "data": {
    "top3": [
      {
        "rank": 1,
        "user": {
          "id": "uuid",
          "xHandle": "@username",
          "profileImage": "https://..."
        },
        "totalCurrent": 15000
      },
      {
        "rank": 2,
        "user": {
          "id": "uuid",
          "xHandle": "@username2",
          "profileImage": "https://..."
        },
        "totalCurrent": 12000
      },
      {
        "rank": 3,
        "user": {
          "id": "uuid",
          "xHandle": "@username3",
          "profileImage": "https://..."
        },
        "totalCurrent": 10000
      }
    ]
  }
}
```

---

## 5. NFT/블록체인 API

### 5.1 User Pass (SBT) 발행 준비

```http
POST /nfts/user-pass/prepare
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "name": "XYLO User Pass",
      "description": "Account SBT for XYLO × WITCHES",
      "type": "SBT",
      "attributes": [
        {
          "trait_type": "Total Points",
          "value": 14252
        },
        {
          "trait_type": "Contents",
          "value": 7300
        },
        {
          "trait_type": "MGM",
          "value": 50
        },
        {
          "trait_type": "Event",
          "value": 4150
        },
        {
          "trait_type": "Profit",
          "value": 1000
        },
        {
          "trait_type": "Boost",
          "value": 300
        }
      ]
    },
    "contractAddress": "0xSBTContractAddress",
    "estimatedGasFee": "0.05"
  }
}
```

### 5.2 User Pass (SBT) 발행 확인

```http
POST /nfts/user-pass/confirm
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "txHash": "0x...",
  "tokenId": "1"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nftType": "SBT",
    "tokenId": 1,
    "contractAddress": "0x...",
    "chainId": 80001,
    "metadata": { ... },
    "mintedAt": "2025-01-07T00:00:00Z"
  }
}
```

### 5.3 내 NFT 목록 조회

```http
GET /nfts/me
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "nfts": [
      {
        "id": "uuid",
        "nftType": "SBT",
        "name": "XYLO User Pass",
        "imageUrl": "https://...",
        "tokenId": 1,
        "contractAddress": "0x...",
        "tier": null,
        "isBurned": false,
        "mintedAt": "2025-01-07T00:00:00Z"
      },
      {
        "id": "uuid",
        "nftType": "TIER",
        "name": "Silver Tier",
        "imageUrl": "https://...",
        "tokenId": 2,
        "tier": 2,
        "isBurned": false,
        "mintedAt": "2025-01-06T00:00:00Z"
      }
    ]
  }
}
```

### 5.4 NFT 소각 (커넥션형)

```http
POST /nfts/{nftId}/burn
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**
```json
{
  "txHash": "0x..."
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isBurned": true,
    "burnedAt": "2025-01-07T00:00:00Z",
    "reward": "Access to exclusive fan meeting"
  }
}
```

---

## 6. 레퍼럴 API

### 6.1 레퍼럴 링크 생성

```http
POST /referrals/generate
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "referralCode": "ABC123",
    "referralUrl": "https://xylomvp.world/referral/ABC123"
  }
}
```

### 6.2 내 레퍼럴 현황 조회

```http
GET /referrals/me/stats
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 10,
    "completedReferrals": 5,
    "pendingReferrals": 5,
    "totalPoints": 10,
    "referrals": [
      {
        "id": "uuid",
        "referee": {
          "xHandle": "@newuser",
          "profileImage": "https://..."
        },
        "isJoined": true,
        "isDiscordJoined": true,
        "isVideoPosted": false,
        "isCompleted": false,
        "createdAt": "2025-01-06T00:00:00Z"
      }
    ]
  }
}
```

### 6.3 레퍼럴 코드로 가입

```http
POST /auth/twitter/callback?referralCode=ABC123
```

**Response**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "user": { ... },
    "referrer": {
      "xHandle": "@referrer",
      "profileImage": "https://..."
    },
    "bonus": {
      "points": 1,
      "message": "Complete 3 tasks to earn 2 points for your referrer!"
    }
  }
}
```

---

## 7. 이벤트 API

### 7.1 진행 중인 이벤트 목록

```http
GET /events?status=active&page=1&limit=10
```

**Query Parameters**
- `status`: active | ended | all
- `type`: VOTE | CONTEST | COMMUNITY
- `page`: 페이지 번호
- `limit`: 페이지당 항목 수

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "eventId": "EVENT001",
        "eventType": "CONTEST",
        "name": "위치스 굿즈 디자인 공모전",
        "description": "Create the best WITCHES merchandise design",
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-01-31T23:59:59Z",
        "rewardPoints": 1000,
        "participants": 50
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 7.2 이벤트 참여

```http
POST /events/{eventId}/participate
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (공모전)**
```json
{
  "submissionUrl": "https://..."
}
```

**Request Body (투표)**
```json
{
  "voteOptionId": "option1"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "eventId": "EVENT001",
    "participatedAt": "2025-01-07T00:00:00Z",
    "points": 1
  }
}
```

### 7.3 내 이벤트 참여 내역

```http
GET /events/me/participations
Authorization: Bearer {token}
```

**Response**
```json
{
  "success": true,
  "data": {
    "participations": [
      {
        "id": "uuid",
        "event": {
          "eventId": "EVENT001",
          "name": "위치스 굿즈 디자인 공모전",
          "eventType": "CONTEST"
        },
        "submissionUrl": "https://...",
        "isWinner": false,
        "participatedAt": "2025-01-07T00:00:00Z"
      }
    ]
  }
}
```

---

## 8. 에러 코드

### 8.1 인증 에러 (401)

| 코드 | 메시지 |
|------|--------|
| `AUTH_TOKEN_MISSING` | Authorization token is missing |
| `AUTH_TOKEN_INVALID` | Invalid or expired token |
| `AUTH_TOKEN_EXPIRED` | Token has expired |

### 8.2 권한 에러 (403)

| 코드 | 메시지 |
|------|--------|
| `PERMISSION_DENIED` | You don't have permission to access this resource |

### 8.3 리소스 에러 (404)

| 코드 | 메시지 |
|------|--------|
| `USER_NOT_FOUND` | User not found |
| `CHANNEL_NOT_FOUND` | YouTube channel not found |
| `NFT_NOT_FOUND` | NFT not found |

### 8.4 검증 에러 (400)

| 코드 | 메시지 |
|------|--------|
| `VALIDATION_ERROR` | Invalid input data |
| `EMAIL_INVALID` | Invalid email format |
| `WALLET_ADDRESS_INVALID` | Invalid wallet address |
| `VERIFICATION_CODE_INVALID` | Invalid verification code |
| `VERIFICATION_CODE_EXPIRED` | Verification code has expired |

### 8.5 비즈니스 로직 에러 (422)

| 코드 | 메시지 |
|------|--------|
| `CHANNEL_ALREADY_VERIFIED` | This channel is already verified |
| `WALLET_ALREADY_CONNECTED` | This wallet is already connected to another account |
| `REFERRAL_SELF_NOT_ALLOWED` | You cannot refer yourself |
| `NFT_ALREADY_MINTED` | User Pass already minted |
| `NFT_CANNOT_BURN` | This NFT type cannot be burned |

### 8.6 외부 API 에러 (502, 503)

| 코드 | 메시지 |
|------|--------|
| `YOUTUBE_API_ERROR` | YouTube API is unavailable |
| `TWITTER_API_ERROR` | Twitter API is unavailable |
| `BLOCKCHAIN_ERROR` | Blockchain network error |

### 8.7 Rate Limiting (429)

| 코드 | 메시지 |
|------|--------|
| `RATE_LIMIT_EXCEEDED` | Too many requests. Please try again later. |

---

## 9. Webhook

### 9.1 포인트 업데이트 이벤트

**POST {client_webhook_url}**

```json
{
  "event": "points.updated",
  "userId": "uuid",
  "data": {
    "totalPoints": 14252,
    "deltaPoints": 150,
    "category": "CONTENT",
    "timestamp": "2025-01-07T00:00:00Z"
  }
}
```

### 9.2 NFT 발행 이벤트

**POST {client_webhook_url}**

```json
{
  "event": "nft.minted",
  "userId": "uuid",
  "data": {
    "nftId": "uuid",
    "nftType": "SBT",
    "tokenId": 1,
    "contractAddress": "0x...",
    "timestamp": "2025-01-07T00:00:00Z"
  }
}
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
