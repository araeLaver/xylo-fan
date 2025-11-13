# 🎓 튜토리얼 플로우

> **우선순위**: 🟡 높음
> **구현 주차**: Week 1
> **예상 작업 시간**: 4시간
> **의존성**: 없음

---

## 📋 개요

### 목적
신규 유저에게 XYLO Fans의 핵심 기능 온보딩 제공

### 사용자 시나리오
1. 첫 로그인 완료 (X OAuth 성공)
2. 3-card 캐러셀 자동 표시
3. 유저가 카드를 스와이프하며 학습
4. "Skip" 또는 "Done" 클릭 시 완료
5. 다시 표시 안 함

### 화면기획 페이지
- Sign in_3: 웰컴 튜토리얼 (3-card)
- Sign in_9: 튜토리얼 팝업 (동일)

---

## 🎨 튜토리얼 카드 내용

### Card 1: Community Points
```json
{
  "title": "Earn Points for Your Activity",
  "description": "Upload videos with #WITCHES or #XYLO tags and earn points based on views, likes, and comments!",
  "image": "/assets/tutorial/points-icon.svg",
  "highlights": [
    "100 views = 1 point",
    "50 likes = 1 point",
    "10 comments = 1 point"
  ]
}
```

### Card 2: Referral System
```json
{
  "title": "Invite Friends and Earn Together",
  "description": "Share your referral link and earn bonus points when friends complete 3 steps: Sign up, Join Discord, Upload video.",
  "image": "/assets/tutorial/referral-icon.svg",
  "highlights": [
    "Step 1: Friend signs up (+100P)",
    "Step 2: Joins Discord (+200P)",
    "Step 3: Uploads video (+300P)"
  ]
}
```

### Card 3: Token Exchange
```json
{
  "title": "Exchange Points for XLT Tokens",
  "description": "Convert your earned points into XLT tokens and trade on decentralized exchanges!",
  "image": "/assets/tutorial/token-icon.svg",
  "highlights": [
    "1,000 points = 10 XLT",
    "Claim monthly",
    "NFT tiers boost rewards"
  ]
}
```

---

## 🗄️ 데이터베이스 설계

### 마이그레이션 파일
`database/08-tutorial-tracking.sql`

```sql
-- ================================================
-- Migration 08: 튜토리얼 추적
-- ================================================

-- users 테이블에 컬럼 추가
ALTER TABLE xylo.users
    ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tutorial_skipped_at TIMESTAMPTZ;

-- 인덱스
CREATE INDEX idx_users_tutorial_completed
    ON xylo.users(has_completed_tutorial);

-- 코멘트
COMMENT ON COLUMN xylo.users.has_completed_tutorial IS '튜토리얼 완료 여부';
COMMENT ON COLUMN xylo.users.tutorial_completed_at IS '튜토리얼 완료 시각';
COMMENT ON COLUMN xylo.users.tutorial_skipped_at IS '튜토리얼 스킵 시각 (완료 안 했지만 Skip 클릭)';

-- 마이그레이션 기록
INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_08_applied',
  jsonb_build_object(
    'version', '08',
    'applied_at', NOW(),
    'description', 'Tutorial tracking'
  ),
  'Migration 08: Tutorial flow',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
```

---

## 🔌 API 설계

### 1. 튜토리얼 카드 조회

**Endpoint**: `GET /api/v1/tutorial/cards`

**인증**: 선택 (비로그인도 조회 가능)

**Response**:
```json
{
  "cards": [
    {
      "id": 1,
      "title": "Earn Points for Your Activity",
      "description": "Upload videos with #WITCHES or #XYLO tags...",
      "image": "/assets/tutorial/points-icon.svg",
      "highlights": [
        "100 views = 1 point",
        "50 likes = 1 point",
        "10 comments = 1 point"
      ]
    },
    {
      "id": 2,
      "title": "Invite Friends and Earn Together",
      "description": "Share your referral link...",
      "image": "/assets/tutorial/referral-icon.svg",
      "highlights": [
        "Step 1: Friend signs up (+100P)",
        "Step 2: Joins Discord (+200P)",
        "Step 3: Uploads video (+300P)"
      ]
    },
    {
      "id": 3,
      "title": "Exchange Points for XLT Tokens",
      "description": "Convert your earned points...",
      "image": "/assets/tutorial/token-icon.svg",
      "highlights": [
        "1,000 points = 10 XLT",
        "Claim monthly",
        "NFT tiers boost rewards"
      ]
    }
  ]
}
```

---

### 2. 튜토리얼 완료

**Endpoint**: `POST /api/v1/tutorial/complete`

**인증**: JWT 필수

**Request Body**:
```json
{
  "action": "complete" // 또는 "skip"
}
```

**Validation** (`CompleteTutorialDto`):
```typescript
export class CompleteTutorialDto {
  @IsIn(['complete', 'skip'])
  action: 'complete' | 'skip';
}
```

**Response**:
```json
{
  "success": true,
  "message": "Tutorial completed"
}
```

---

### 3. 튜토리얼 상태 조회

**Endpoint**: `GET /api/v1/tutorial/status`

**인증**: JWT 필수

**Response**:
```json
{
  "hasCompleted": true,
  "completedAt": "2025-01-15T12:00:00Z",
  "skippedAt": null
}
```

---

## 💻 백엔드 구현

### 모듈 구조
```
backend/src/tutorial/
├── tutorial.module.ts
├── tutorial.controller.ts
├── tutorial.service.ts
├── dto/
│   └── complete-tutorial.dto.ts
└── constants/
    └── tutorial-cards.constant.ts
```

### TutorialService 구현

`backend/src/tutorial/tutorial.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUTORIAL_CARDS } from './constants/tutorial-cards.constant';

@Injectable()
export class TutorialService {
  constructor(private prisma: PrismaService) {}

  /**
   * 튜토리얼 카드 조회
   */
  getCards() {
    return {
      cards: TUTORIAL_CARDS
    };
  }

  /**
   * 튜토리얼 완료/스킵
   */
  async completeTutorial(userId: string, action: 'complete' | 'skip') {
    const updateData = action === 'complete'
      ? {
          has_completed_tutorial: true,
          tutorial_completed_at: new Date()
        }
      : {
          has_completed_tutorial: true, // Skip도 다시 안 보여주기
          tutorial_skipped_at: new Date()
        };

    await this.prisma.users.update({
      where: { id: userId },
      data: updateData
    });

    return {
      success: true,
      message: action === 'complete' ? 'Tutorial completed' : 'Tutorial skipped'
    };
  }

  /**
   * 튜토리얼 상태 조회
   */
  async getStatus(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        has_completed_tutorial: true,
        tutorial_completed_at: true,
        tutorial_skipped_at: true
      }
    });

    return {
      hasCompleted: user?.has_completed_tutorial || false,
      completedAt: user?.tutorial_completed_at,
      skippedAt: user?.tutorial_skipped_at
    };
  }
}
```

---

### 튜토리얼 카드 상수

`backend/src/tutorial/constants/tutorial-cards.constant.ts`:

```typescript
export const TUTORIAL_CARDS = [
  {
    id: 1,
    title: 'Earn Points for Your Activity',
    description: 'Upload videos with #WITCHES or #XYLO tags and earn points based on views, likes, and comments!',
    image: '/assets/tutorial/points-icon.svg',
    highlights: [
      '100 views = 1 point',
      '50 likes = 1 point',
      '10 comments = 1 point'
    ]
  },
  {
    id: 2,
    title: 'Invite Friends and Earn Together',
    description: 'Share your referral link and earn bonus points when friends complete 3 steps: Sign up, Join Discord, Upload video.',
    image: '/assets/tutorial/referral-icon.svg',
    highlights: [
      'Step 1: Friend signs up (+100P)',
      'Step 2: Joins Discord (+200P)',
      'Step 3: Uploads video (+300P)'
    ]
  },
  {
    id: 3,
    title: 'Exchange Points for XLT Tokens',
    description: 'Convert your earned points into XLT tokens and trade on decentralized exchanges!',
    image: '/assets/tutorial/token-icon.svg',
    highlights: [
      '1,000 points = 10 XLT',
      'Claim monthly',
      'NFT tiers boost rewards'
    ]
  }
];
```

---

### TutorialController 구현

`backend/src/tutorial/tutorial.controller.ts`:

```typescript
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { TutorialService } from './tutorial.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompleteTutorialDto } from './dto/complete-tutorial.dto';

@Controller('tutorial')
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  /**
   * 튜토리얼 카드 조회
   * GET /api/v1/tutorial/cards
   */
  @Get('cards')
  getCards() {
    return this.tutorialService.getCards();
  }

  /**
   * 튜토리얼 완료/스킵
   * POST /api/v1/tutorial/complete
   */
  @Post('complete')
  @UseGuards(JwtAuthGuard)
  async completeTutorial(
    @Req() req,
    @Body() dto: CompleteTutorialDto
  ) {
    return this.tutorialService.completeTutorial(req.user.userId, dto.action);
  }

  /**
   * 튜토리얼 상태 조회
   * GET /api/v1/tutorial/status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req) {
    return this.tutorialService.getStatus(req.user.userId);
  }
}
```

---

## 🎯 프론트엔드 연동

### 튜토리얼 표시 로직 (React 예시)

```typescript
// 로그인 성공 후
useEffect(() => {
  const checkTutorial = async () => {
    const { hasCompleted } = await api.get('/tutorial/status');

    if (!hasCompleted) {
      setShowTutorial(true);
    }
  };

  if (isAuthenticated) {
    checkTutorial();
  }
}, [isAuthenticated]);

// 튜토리얼 완료
const handleCompleteTutorial = async (action: 'complete' | 'skip') => {
  await api.post('/tutorial/complete', { action });
  setShowTutorial(false);
};
```

---

## ✅ 체크리스트

- [ ] DB 마이그레이션 08 실행
- [ ] Prisma 스키마 pull & generate
- [ ] Tutorial 모듈 생성
- [ ] TutorialService 구현
- [ ] TutorialController 구현
- [ ] TUTORIAL_CARDS 상수 정의
- [ ] CompleteTutorialDto 생성
- [ ] AppModule에 TutorialModule 등록
- [ ] 빌드 테스트 통과
- [ ] Postman 테스트
- [ ] (프론트엔드) 튜토리얼 이미지 준비

---

**다음 문서**: `03-faq-system.md`
