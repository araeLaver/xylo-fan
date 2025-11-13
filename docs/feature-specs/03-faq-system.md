# ❓ FAQ 시스템

> **우선순위**: 🔴 크리티컬
> **구현 주차**: Week 1
> **예상 작업 시간**: 6시간
> **의존성**: 없음

---

## 📋 개요

### 목적
유저 자가 해결 지원 + 운영팀 반복 질문 부담 감소

### 주요 기능
- 다국어 지원 (KO/EN)
- 키워드 검색 (Full-Text Search)
- 카테고리 필터링
- 어드민 CRUD (생성/수정/삭제)

### 화면기획 페이지
- FAQ (15 페이지)

---

## 🗄️ 데이터베이스 설계

### 마이그레이션 파일
`database/09-faq-system.sql`

```sql
-- ================================================
-- Migration 09: FAQ 시스템
-- ================================================

CREATE TABLE IF NOT EXISTS xylo.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 다국어 컨텐츠
    question_ko TEXT NOT NULL,
    question_en TEXT NOT NULL,
    answer_ko TEXT NOT NULL,
    answer_en TEXT NOT NULL,

    -- 분류
    category VARCHAR(50) DEFAULT 'General',
    order_index INTEGER DEFAULT 0,

    -- 공개 여부
    is_published BOOLEAN DEFAULT TRUE,

    -- 메타데이터
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_faqs_category ON xylo.faqs(category);
CREATE INDEX idx_faqs_published ON xylo.faqs(is_published);
CREATE INDEX idx_faqs_order ON xylo.faqs(order_index);
CREATE INDEX idx_faqs_pinned ON xylo.faqs(is_pinned, order_index);

-- Full-Text Search 인덱스 (한국어)
CREATE INDEX idx_faqs_search_ko
    ON xylo.faqs
    USING GIN (to_tsvector('korean', question_ko || ' ' || answer_ko));

-- Full-Text Search 인덱스 (영어)
CREATE INDEX idx_faqs_search_en
    ON xylo.faqs
    USING GIN (to_tsvector('english', question_en || ' ' || answer_en));

-- 코멘트
COMMENT ON TABLE xylo.faqs IS 'FAQ (자주 묻는 질문) 테이블';
COMMENT ON COLUMN xylo.faqs.category IS '카테고리 (General, Points, NFT, Referral, Technical)';
COMMENT ON COLUMN xylo.faqs.order_index IS '정렬 순서 (작을수록 상단)';
COMMENT ON COLUMN xylo.faqs.is_pinned IS '상단 고정 여부';

-- 초기 데이터 (샘플)
INSERT INTO xylo.faqs (question_ko, question_en, answer_ko, answer_en, category, order_index) VALUES
('XYLO Fans는 무엇인가요?', 'What is XYLO Fans?',
 'XYLO Fans는 위치스 커뮤니티 멤버들이 활동으로 포인트를 적립하고 XLT 토큰으로 교환할 수 있는 Web3 플랫폼입니다.',
 'XYLO Fans is a Web3 platform where WITCHES community members can earn points through activities and exchange them for XLT tokens.',
 'General', 1),

('포인트는 어떻게 적립하나요?', 'How do I earn points?',
 'YouTube에 #WITCHES 또는 #XYLO 태그가 포함된 영상을 업로드하면 조회수, 좋아요, 댓글 수에 따라 포인트가 자동으로 적립됩니다. (조회수 100회당 1P, 좋아요 50개당 1P, 댓글 10개당 1P)',
 'Upload videos with #WITCHES or #XYLO tags on YouTube. Points are automatically earned based on views (100 views = 1P), likes (50 likes = 1P), and comments (10 comments = 1P).',
 'Points', 2),

('User Pass NFT는 무엇인가요?', 'What is the User Pass NFT?',
 'User Pass는 XYLO 커뮤니티 멤버임을 증명하는 SBT(Soul-Bound Token)입니다. 첫 X 포스팅 또는 YouTube 채널 인증 후 자동으로 클레임할 수 있습니다.',
 'User Pass is an SBT (Soul-Bound Token) proving your XYLO community membership. It can be claimed automatically after your first X post or YouTube channel verification.',
 'NFT', 3);

-- 마이그레이션 기록
INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_09_applied',
  jsonb_build_object(
    'version', '09',
    'applied_at', NOW(),
    'description', 'FAQ system with multi-language and full-text search'
  ),
  'Migration 09: FAQ system',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
```

---

## 🔌 API 설계

### 1. FAQ 목록 조회 (사용자용)

**Endpoint**: `GET /api/v1/faqs`

**Query Parameters**:
- `lang` (선택): `ko` | `en` (기본값: `ko`)
- `search` (선택): 검색 키워드
- `category` (선택): 카테고리 필터
- `limit` (선택): 페이지당 개수 (기본값: 10)
- `offset` (선택): 오프셋 (기본값: 0)

**예시 요청**:
```
GET /api/v1/faqs?lang=ko&search=포인트&category=Points&limit=10&offset=0
```

**Response**:
```json
{
  "total": 25,
  "faqs": [
    {
      "id": "uuid",
      "question": "포인트는 어떻게 적립하나요?",
      "answer": "YouTube에 #WITCHES 또는 #XYLO 태그가 포함된 영상을...",
      "category": "Points",
      "isPinned": false,
      "viewCount": 450,
      "createdAt": "2025-01-10T00:00:00Z"
    }
  ],
  "categories": ["General", "Points", "NFT", "Referral", "Technical"]
}
```

---

### 2. FAQ 단일 조회

**Endpoint**: `GET /api/v1/faqs/:id`

**Query Parameters**:
- `lang` (선택): `ko` | `en` (기본값: `ko`)

**예시 요청**:
```
GET /api/v1/faqs/uuid-here?lang=ko
```

**Response**:
```json
{
  "id": "uuid",
  "question": "XYLO Fans는 무엇인가요?",
  "answer": "XYLO Fans는 위치스 커뮤니티...",
  "category": "General",
  "isPinned": true,
  "viewCount": 1200,
  "createdAt": "2025-01-10T00:00:00Z",
  "updatedAt": "2025-01-11T00:00:00Z"
}
```

**Side Effect**: `view_count` 자동 증가

---

### 3. FAQ 생성 (어드민)

**Endpoint**: `POST /api/v1/admin/faqs`

**인증**: JWT + Admin Role 필요

**Request Body**:
```json
{
  "questionKo": "질문 (한국어)",
  "questionEn": "Question (English)",
  "answerKo": "답변 (한국어)",
  "answerEn": "Answer (English)",
  "category": "Points",
  "orderIndex": 10,
  "isPinned": false,
  "isPublished": true
}
```

**Response**:
```json
{
  "success": true,
  "faq": {
    "id": "new-uuid",
    "questionKo": "질문 (한국어)",
    ...
  }
}
```

---

### 4. FAQ 수정 (어드민)

**Endpoint**: `PATCH /api/v1/admin/faqs/:id`

**인증**: JWT + Admin Role 필요

**Request Body** (부분 수정 가능):
```json
{
  "answerKo": "업데이트된 답변",
  "isPinned": true
}
```

---

### 5. FAQ 삭제 (어드민)

**Endpoint**: `DELETE /api/v1/admin/faqs/:id`

**인증**: JWT + Admin Role 필요

**Response**:
```json
{
  "success": true,
  "message": "FAQ deleted successfully"
}
```

---

## 💻 백엔드 구현

### 모듈 구조
```
backend/src/faq/
├── faq.module.ts
├── faq.controller.ts
├── faq.service.ts
├── dto/
│   ├── get-faqs.dto.ts
│   ├── create-faq.dto.ts
│   └── update-faq.dto.ts
└── admin/
    ├── admin-faq.controller.ts
    └── guards/
        └── admin.guard.ts
```

---

### FaqService 구현

`backend/src/faq/faq.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetFaqsDto } from './dto/get-faqs.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  /**
   * FAQ 목록 조회 (사용자용)
   */
  async getFaqs(dto: GetFaqsDto) {
    const { lang = 'ko', search, category, limit = 10, offset = 0 } = dto;

    // WHERE 조건
    const where: any = {
      is_published: true
    };

    if (category) {
      where.category = category;
    }

    // Full-Text Search
    if (search) {
      const tsQuery = search.replace(/\s+/g, ' & '); // AND 검색
      const langConfig = lang === 'ko' ? 'korean' : 'english';
      const searchField = lang === 'ko'
        ? `question_ko || ' ' || answer_ko`
        : `question_en || ' ' || answer_en`;

      where.AND = [
        {
          [`to_tsvector('${langConfig}', ${searchField})`]: {
            _search: tsQuery
          }
        }
      ];
    }

    // 쿼리 실행
    const [faqs, total] = await Promise.all([
      this.prisma.faqs.findMany({
        where,
        orderBy: [
          { is_pinned: 'desc' },
          { order_index: 'asc' },
          { created_at: 'desc' }
        ],
        skip: offset,
        take: limit,
        select: {
          id: true,
          question_ko: true,
          question_en: true,
          answer_ko: true,
          answer_en: true,
          category: true,
          is_pinned: true,
          view_count: true,
          created_at: true
        }
      }),
      this.prisma.faqs.count({ where })
    ]);

    // 카테고리 목록
    const categories = await this.prisma.faqs.findMany({
      where: { is_published: true },
      distinct: ['category'],
      select: { category: true }
    });

    return {
      total,
      faqs: faqs.map(faq => ({
        id: faq.id,
        question: lang === 'ko' ? faq.question_ko : faq.question_en,
        answer: lang === 'ko' ? faq.answer_ko : faq.answer_en,
        category: faq.category,
        isPinned: faq.is_pinned,
        viewCount: faq.view_count,
        createdAt: faq.created_at
      })),
      categories: categories.map(c => c.category)
    };
  }

  /**
   * FAQ 단일 조회 (view_count 증가)
   */
  async getFaqById(id: string, lang: 'ko' | 'en' = 'ko') {
    const faq = await this.prisma.faqs.findUnique({
      where: { id }
    });

    if (!faq || !faq.is_published) {
      throw new NotFoundException('FAQ not found');
    }

    // 조회수 증가
    await this.prisma.faqs.update({
      where: { id },
      data: { view_count: { increment: 1 } }
    });

    return {
      id: faq.id,
      question: lang === 'ko' ? faq.question_ko : faq.question_en,
      answer: lang === 'ko' ? faq.answer_ko : faq.answer_en,
      category: faq.category,
      isPinned: faq.is_pinned,
      viewCount: faq.view_count + 1,
      createdAt: faq.created_at,
      updatedAt: faq.updated_at
    };
  }

  /**
   * FAQ 생성 (어드민)
   */
  async createFaq(dto: CreateFaqDto) {
    const faq = await this.prisma.faqs.create({
      data: {
        question_ko: dto.questionKo,
        question_en: dto.questionEn,
        answer_ko: dto.answerKo,
        answer_en: dto.answerEn,
        category: dto.category || 'General',
        order_index: dto.orderIndex || 0,
        is_pinned: dto.isPinned || false,
        is_published: dto.isPublished ?? true
      }
    });

    return { success: true, faq };
  }

  /**
   * FAQ 수정 (어드민)
   */
  async updateFaq(id: string, dto: UpdateFaqDto) {
    const faq = await this.prisma.faqs.update({
      where: { id },
      data: {
        ...dto,
        updated_at: new Date()
      }
    });

    return { success: true, faq };
  }

  /**
   * FAQ 삭제 (어드민)
   */
  async deleteFaq(id: string) {
    await this.prisma.faqs.delete({
      where: { id }
    });

    return {
      success: true,
      message: 'FAQ deleted successfully'
    };
  }
}
```

---

### FaqController 구현

`backend/src/faq/faq.controller.ts`:

```typescript
import { Controller, Get, Query, Param } from '@nestjs/common';
import { FaqService } from './faq.service';
import { GetFaqsDto } from './dto/get-faqs.dto';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * FAQ 목록 조회
   * GET /api/v1/faqs?lang=ko&search=포인트
   */
  @Get()
  async getFaqs(@Query() dto: GetFaqsDto) {
    return this.faqService.getFaqs(dto);
  }

  /**
   * FAQ 단일 조회
   * GET /api/v1/faqs/:id?lang=ko
   */
  @Get(':id')
  async getFaqById(
    @Param('id') id: string,
    @Query('lang') lang: 'ko' | 'en' = 'ko'
  ) {
    return this.faqService.getFaqById(id, lang);
  }
}
```

---

### AdminFaqController 구현

`backend/src/faq/admin/admin-faq.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards
} from '@nestjs/common';
import { FaqService } from '../faq.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CreateFaqDto } from '../dto/create-faq.dto';
import { UpdateFaqDto } from '../dto/update-faq.dto';

@Controller('admin/faqs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * FAQ 생성
   * POST /api/v1/admin/faqs
   */
  @Post()
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.faqService.createFaq(dto);
  }

  /**
   * FAQ 수정
   * PATCH /api/v1/admin/faqs/:id
   */
  @Patch(':id')
  async updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto
  ) {
    return this.faqService.updateFaq(id, dto);
  }

  /**
   * FAQ 삭제
   * DELETE /api/v1/admin/faqs/:id
   */
  @Delete(':id')
  async deleteFaq(@Param('id') id: string) {
    return this.faqService.deleteFaq(id);
  }
}
```

---

## 🔒 어드민 권한 가드

### AdminGuard 구현

`backend/src/faq/admin/guards/admin.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // TODO: users 테이블에 is_admin 컬럼 추가 필요
    // 현재는 특정 X handle로만 체크 (임시)
    const ADMIN_HANDLES = ['@witches_official', '@xylo_admin'];

    if (!ADMIN_HANDLES.includes(user.xHandle)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
```

---

## ✅ 체크리스트

- [ ] DB 마이그레이션 09 실행
- [ ] Prisma 스키마 pull & generate
- [ ] FAQ 모듈 생성
- [ ] FaqService 구현
- [ ] FaqController 구현
- [ ] AdminFaqController 구현
- [ ] AdminGuard 구현
- [ ] DTO 생성 (GetFaqsDto, CreateFaqDto, UpdateFaqDto)
- [ ] AppModule에 FaqModule 등록
- [ ] 초기 FAQ 데이터 입력
- [ ] 빌드 테스트 통과
- [ ] Postman 테스트 (검색 포함)

---

**다음 문서**: Week 2 NFT 기능 스펙
