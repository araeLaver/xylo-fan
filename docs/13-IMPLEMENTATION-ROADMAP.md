# 📋 XYLO Fans - 구현 로드맵

> **문서 작성일**: 2025-01-11
> **기준**: 위치스 화면기획_취합중_v2.pdf 분석 결과
> **목표**: MVP 출시를 위한 5주 구현 계획

---

## 📊 현재 상태 요약

### ✅ 완료된 핵심 기능
- X(Twitter) OAuth 인증 + JWT
- 유튜브 채널 등록/인증 시스템
- 포인트 적립 자동화 (일일 크롤링 + 계산)
- 리더보드 스냅샷 (5개 기간: ALL, 1D, 1W, 1M, 3M)
- 추천인 3단계 추적 시스템 (가입/디스코드/영상)
- 멀티 SNS 지원 DB 구조
- 유튜브 API 확장 필드 (status, category, language 등)

### ❌ 미구현 핵심 기능 (15개)
1. 이메일 복구 시스템 (6자리 인증번호)
2. 튜토리얼 플로우 (3-card 온보딩)
3. FAQ 시스템 (다국어, 검색)
4. NFT/SBT 클레임 로직 (User Pass)
5. Tier NFT 승급 시스템 (5단계)
6. 포인트 히스토리 API
7. 활동 상세 팝업 데이터
8. 디스코드 OAuth 연동
9. X 자동 포스팅 (추천링크)
10. Limited Edition NFT 발행
11. Burn NFT 소각 로직
12. 이메일 연결 플로우
13. Instagram OAuth
14. YouTube OAuth
15. SPONSOR 포인트 리더보드 표시

---

## 🗓️ 5주 구현 계획

### **Week 1: 인증 & 핵심 UX** (우선순위: 🔴 크리티컬)

#### 1.1 이메일 복구 시스템
**목표**: X 계정 없이도 계정 복구 가능

- **DB 마이그레이션** (`database/07-email-verification.sql`)
  ```sql
  CREATE TABLE xylo.email_verification_codes (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **API 엔드포인트**
  - `POST /api/v1/auth/email/send-code` - 인증번호 발송
  - `POST /api/v1/auth/email/verify-code` - 인증번호 검증
  - `POST /api/v1/auth/email/recover` - 계정 복구 (JWT 발급)

- **이메일 발송 서비스**
  - 라이브러리: `@nestjs-modules/mailer` + `nodemailer`
  - SMTP: Gmail 또는 SendGrid
  - 템플릿: HTML (로고 + 6자리 코드)

- **상세 스펙**: `docs/feature-specs/01-email-recovery.md`

#### 1.2 튜토리얼 플로우
**목표**: 신규 유저 온보딩 UX 개선

- **DB 마이그레이션** (`database/08-tutorial-tracking.sql`)
  ```sql
  ALTER TABLE xylo.users
    ADD COLUMN has_completed_tutorial BOOLEAN DEFAULT FALSE,
    ADD COLUMN tutorial_completed_at TIMESTAMPTZ;
  ```

- **API 엔드포인트**
  - `GET /api/v1/tutorial/cards` - 튜토리얼 카드 3개 반환
  - `POST /api/v1/tutorial/complete` - 완료 상태 저장

- **튜토리얼 카드 내용**
  - Card 1: 커뮤니티 포인트 시스템 (6-slot 설명)
  - Card 2: 추천인 시스템 (3단계 혜택)
  - Card 3: XLT 토큰 교환 (향후 기능)

- **상세 스펙**: `docs/feature-specs/02-tutorial-flow.md`

#### 1.3 FAQ 시스템
**목표**: 자가 해결 지원 + 운영 부담 감소

- **DB 마이그레이션** (`database/09-faq-system.sql`)
  ```sql
  CREATE TABLE xylo.faqs (
    id UUID PRIMARY KEY,
    question_ko TEXT NOT NULL,
    question_en TEXT NOT NULL,
    answer_ko TEXT NOT NULL,
    answer_en TEXT NOT NULL,
    category VARCHAR(50), -- General, Points, NFT, Referral
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- **API 엔드포인트**
  - `GET /api/v1/faqs?lang=ko&search=포인트&category=Points` - 목록 조회
  - `GET /api/v1/faqs/:id?lang=ko` - 단일 조회
  - `POST /api/v1/admin/faqs` - 생성 (어드민 전용)
  - `PATCH /api/v1/admin/faqs/:id` - 수정
  - `DELETE /api/v1/admin/faqs/:id` - 삭제

- **검색 기능**: PostgreSQL `to_tsvector` + `to_tsquery`

- **상세 스펙**: `docs/feature-specs/03-faq-system.md`

**주차 목표**: 계정 복구 + 온보딩 + 자가 해결 완성

---

### **Week 2: NFT/SBT 기반 구축** (우선순위: 🔴 크리티컬)

#### 2.1 NFT 서비스 모듈 생성
**목표**: NFT 관리 인프라 구축

- **모듈 구조**
  ```
  backend/src/nft/
  ├── nft.module.ts
  ├── nft.controller.ts
  ├── nft.service.ts
  ├── dto/
  │   ├── claim-user-pass.dto.ts
  │   └── mint-nft.dto.ts
  └── enums/
      └── nft-type.enum.ts
  ```

- **기본 API 엔드포인트**
  - `GET /api/v1/nfts/my-collection` - 내 NFT 목록
  - `GET /api/v1/nfts/:id` - NFT 상세 정보
  - `GET /api/v1/nfts/types` - NFT 타입별 설명

- **상세 스펙**: `docs/feature-specs/04-nft-service-foundation.md`

#### 2.2 User Pass (SBT-01) 클레임 로직
**목표**: 온보딩 NFT 자동 발급

- **클레임 조건** (OR 조건)
  1. 첫 X 포스팅 완료 (추천링크 공유)
  2. YouTube 채널 인증 완료 (`is_verified = true`)

- **API 엔드포인트**
  - `POST /api/v1/nfts/claim-user-pass` - 수동 클레임
  - 자동 클레임: `x-posting.processor.ts`, `youtube-verification.processor.ts`에서 호출

- **메타데이터 구조**
  ```json
  {
    "name": "XYLO User Pass",
    "description": "XYLO Fans community member badge",
    "image": "https://cdn.xylo.world/nft/user-pass.png",
    "attributes": [
      {"trait_type": "Type", "value": "SBT"},
      {"trait_type": "Issue Date", "value": "2025-01-15"}
    ]
  }
  ```

- **DB 업데이트**
  ```sql
  INSERT INTO xylo.user_nfts (
    user_id, nft_type, name, description, image_url, metadata
  ) VALUES (
    $1, 'SBT', 'XYLO User Pass', ..., ...
  );
  ```

- **상세 스펙**: `docs/feature-specs/05-user-pass-claiming.md`

#### 2.3 내 NFT 컬렉션 API
**목표**: 마이페이지 NFT 캐러셀 데이터 제공

- **API 응답 구조**
  ```json
  {
    "total": 3,
    "nfts": [
      {
        "id": "uuid",
        "type": "SBT",
        "name": "XYLO User Pass",
        "description": "...",
        "imageUrl": "...",
        "tier": null,
        "isBurned": false,
        "mintedAt": "2025-01-15T12:00:00Z"
      },
      {
        "id": "uuid",
        "type": "TIER",
        "name": "Silver Tier NFT",
        "tier": 2,
        "metadata": {
          "pointsRequired": 5000,
          "boostMultiplier": 1.2
        }
      }
    ]
  }
  ```

- **필터링**: `?type=TIER`, `?is_burned=false`

- **상세 스펙**: `docs/feature-specs/06-nft-collection-api.md`

**주차 목표**: NFT 인프라 + User Pass 자동 발급

---

### **Week 3: 포인트 투명성** (우선순위: 🔴 크리티컬)

#### 3.1 포인트 히스토리 API
**목표**: 유저가 포인트 적립 내역 확인 가능

- **API 엔드포인트**
  - `GET /api/v1/points/history?limit=30&offset=0&category=CONTENT`
  - 응답: `point_transactions` 테이블 쿼리

- **응답 구조**
  ```json
  {
    "total": 150,
    "transactions": [
      {
        "id": "uuid",
        "category": "CONTENT",
        "amount": 120,
        "reason": "Video ABC123: +12000 views, +600 likes",
        "metadata": {
          "videoId": "uuid",
          "videoYtId": "ABC123",
          "viewDelta": 12000,
          "likeDelta": 600
        },
        "createdAt": "2025-01-10T03:00:00Z"
      }
    ]
  }
  ```

- **필터**: 카테고리별, 날짜 범위, 페이지네이션

- **상세 스펙**: `docs/feature-specs/07-point-history.md`

#### 3.2 활동 상세 팝업 API
**목표**: 포인트 계산 근거 투명화

- **API 엔드포인트**
  - `GET /api/v1/users/me/activity-stats?period=7d`

- **응답 구조**
  ```json
  {
    "period": "7d",
    "totalVideos": 5,
    "totalViews": 45000,
    "totalLikes": 2300,
    "totalComments": 180,
    "pointsEarned": {
      "fromViews": 450,
      "fromLikes": 46,
      "fromComments": 18,
      "total": 514
    },
    "topVideos": [
      {
        "videoId": "ABC123",
        "title": "...",
        "views": 12000,
        "pointsEarned": 120
      }
    ]
  }
  ```

- **데이터 소스**: `youtube_video_snapshots` 집계

- **상세 스펙**: `docs/feature-specs/08-activity-breakdown.md`

#### 3.3 혜택 안내 데이터 API
**목표**: NFT 업그레이드 동기 부여

- **API 엔드포인트**
  - `GET /api/v1/nfts/benefits?userId=me`

- **응답 구조**
  ```json
  {
    "currentTier": 1,
    "currentBoost": 1.0,
    "nextTier": {
      "tier": 2,
      "pointsRequired": 5000,
      "pointsRemaining": 2300,
      "boost": 1.2,
      "benefits": [
        "XLT Claim 20% 증가",
        "리더보드 Silver 뱃지",
        "월간 에어드랍 자격"
      ]
    }
  }
  ```

- **상세 스펙**: `docs/feature-specs/09-nft-benefits.md`

**주차 목표**: 포인트 계산 투명성 완성

---

### **Week 4: 추천인 시스템 완성** (우선순위: 🟡 높음)

#### 4.1 디스코드 OAuth 연동
**목표**: 추천인 3단계 검증 완성

- **Passport 전략**: `passport-discord`

- **API 엔드포인트**
  - `GET /api/v1/auth/discord` - OAuth 시작
  - `GET /api/v1/auth/discord/callback` - 콜백 처리

- **referrals 업데이트**
  ```typescript
  // Discord 인증 성공 시
  await prisma.referrals.updateMany({
    where: { referee_id: userId },
    data: { is_discord_joined: true }
  });
  ```

- **Discord 서버 가입 확인**: Discord API `GET /users/@me/guilds`

- **상세 스펙**: `docs/feature-specs/10-discord-integration.md`

#### 4.2 X 자동 포스팅 서비스
**목표**: 추천링크 공유 마찰 감소

- **라이브러리**: `twitter-api-v2`

- **API 엔드포인트**
  - `POST /api/v1/x-posting/share-referral` - 추천링크 자동 포스팅

- **포스팅 템플릿**
  ```
  🎉 Join XYLO Fans and earn rewards together!

  Use my referral link: https://xylo.world/?ref={referral_code}

  #XYLO #WITCHES #Web3Community
  ```

- **x_postings 테이블 업데이트**
  ```sql
  INSERT INTO xylo.x_postings (user_id, post_type, tweet_id, content)
  VALUES ($1, 'REFERRAL_SHARE', $2, $3);
  ```

- **상세 스펙**: `docs/feature-specs/11-x-auto-posting.md`

#### 4.3 추천링크 표시 헬퍼 API
**목표**: 프론트엔드에서 쉽게 추천링크 생성

- **API 엔드포인트**
  - `GET /api/v1/referrals/my-link` - 내 추천링크 정보

- **응답 구조**
  ```json
  {
    "referralCode": "A3X9K2",
    "referralUrl": "https://xylo.world/?ref=A3X9K2",
    "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?data=https://xylo.world/?ref=A3X9K2",
    "stats": {
      "totalReferrals": 5,
      "completedReferrals": 2,
      "pointsEarned": 1000
    }
  }
  ```

- **상세 스펙**: `docs/feature-specs/12-referral-link-helper.md`

**주차 목표**: 추천인 시스템 완전 자동화

---

### **Week 5: NFT 게이미피케이션** (우선순위: 🟡 높음)

#### 5.1 Tier NFT 승급 시스템
**목표**: 포인트 기반 자동 승급

- **Background Job** (`jobs/processors/tier-nft-upgrade.processor.ts`)
  - 스케줄: 매일 04:00 KST (포인트 계산 이후)
  - 로직:
    ```typescript
    // 모든 유저의 total_current 체크
    const users = await prisma.user_points.findMany();

    for (const user of users) {
      const currentTier = await getNFTTier(user.user_id);
      const targetTier = calculateTierFromPoints(user.total_current);

      if (targetTier > currentTier) {
        await mintTierNFT(user.user_id, targetTier);
        await sendUpgradeNotification(user.user_id, targetTier);
      }
    }
    ```

- **Tier 기준**
  ```typescript
  const TIER_THRESHOLDS = {
    1: 1000,    // Bronze
    2: 5000,    // Silver
    3: 10000,   // Gold
    4: 50000,   // Platinum
    5: 100000   // Diamond
  };
  ```

- **상세 스펙**: `docs/feature-specs/13-tier-nft-upgrade.md`

#### 5.2 등급 업그레이드 알림
**목표**: 유저 리텐션 증가

- **알림 채널**
  1. In-app notification (향후)
  2. 이메일 (즉시 구현)
  3. X DM (선택)

- **이메일 템플릿**
  ```html
  <h1>🎉 Congratulations! Tier Upgraded!</h1>
  <p>Your XYLO NFT has been upgraded to <strong>Silver Tier</strong>!</p>
  <ul>
    <li>XLT Claim Boost: 1.0x → 1.2x</li>
    <li>Monthly Airdrop Eligibility</li>
    <li>Silver Badge on Leaderboard</li>
  </ul>
  ```

- **상세 스펙**: `docs/feature-specs/14-upgrade-notification.md`

#### 5.3 Burn NFT 기능
**목표**: 이벤트 티켓팅 시스템

- **API 엔드포인트**
  - `POST /api/v1/nfts/burn/:nftId` - NFT 소각

- **로직**
  ```typescript
  async burnNFT(nftId: string, userId: string) {
    const nft = await prisma.user_nfts.findUnique({
      where: { id: nftId }
    });

    // 검증
    if (nft.user_id !== userId) throw new ForbiddenException();
    if (nft.nft_type !== 'CONNECTION') throw new BadRequestException();
    if (nft.is_burned) throw new BadRequestException('Already burned');

    // 소각
    await prisma.user_nfts.update({
      where: { id: nftId },
      data: {
        is_burned: true,
        burned_at: new Date()
      }
    });

    // 이벤트 참여 기록
    await prisma.event_participations.create({
      data: {
        user_id: userId,
        event_type: 'FAN_MEETING',
        metadata: { nftId, burnedAt: new Date() }
      }
    });
  }
  ```

- **상세 스펙**: `docs/feature-specs/15-burn-nft.md`

**주차 목표**: NFT 게이미피케이션 완성

---

## 🔄 추가 확장 기능 (Post-MVP)

### Week 6+: 멀티 SNS OAuth
- Instagram OAuth (`passport-instagram`)
- YouTube OAuth (`passport-google-oauth20` + YouTube scope)
- `social_accounts` 테이블 활용

### Week 7+: SPONSOR 포인트 리더보드
- `leaderboard_entries` 쿼리에 `sponsor` 필드 추가
- 스폰서 전용 리더보드 페이지

### Week 8+: Limited Edition NFT 어드민
- 어드민 대시보드
- `POST /api/v1/admin/nfts/mint-limited-edition`
- 이벤트 참여자에게 NFT 일괄 발급

---

## 📝 문서 구조

```
docs/
├── 13-IMPLEMENTATION-ROADMAP.md (본 문서)
├── 14-SCREEN-PLANNING-GAP-ANALYSIS.md (화면기획 vs 구현 갭 분석)
└── feature-specs/
    ├── 01-email-recovery.md
    ├── 02-tutorial-flow.md
    ├── 03-faq-system.md
    ├── 04-nft-service-foundation.md
    ├── 05-user-pass-claiming.md
    ├── 06-nft-collection-api.md
    ├── 07-point-history.md
    ├── 08-activity-breakdown.md
    ├── 09-nft-benefits.md
    ├── 10-discord-integration.md
    ├── 11-x-auto-posting.md
    ├── 12-referral-link-helper.md
    ├── 13-tier-nft-upgrade.md
    ├── 14-upgrade-notification.md
    └── 15-burn-nft.md
```

---

## ✅ 체크리스트

### Week 1
- [ ] 이메일 복구 시스템 완성
- [ ] 튜토리얼 플로우 완성
- [ ] FAQ 시스템 완성
- [ ] DB 마이그레이션 07, 08, 09 실행
- [ ] 빌드 테스트 통과

### Week 2
- [ ] NFT 서비스 모듈 생성
- [ ] User Pass 클레임 로직 완성
- [ ] 내 NFT 컬렉션 API 완성
- [ ] 자동 클레임 트리거 구현

### Week 3
- [ ] 포인트 히스토리 API 완성
- [ ] 활동 상세 API 완성
- [ ] 혜택 안내 API 완성

### Week 4
- [ ] 디스코드 OAuth 연동
- [ ] X 자동 포스팅 완성
- [ ] 추천링크 헬퍼 API 완성

### Week 5
- [ ] Tier NFT 승급 Job 완성
- [ ] 업그레이드 알림 완성
- [ ] Burn NFT 기능 완성

---

**다음 단계**: `docs/feature-specs/` 폴더에 각 기능별 상세 스펙 문서 작성
