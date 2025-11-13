# 📱 화면기획 vs 백엔드 구현 갭 분석

> **문서 작성일**: 2025-01-11
> **분석 대상**: 위치스 화면기획_취합중_v2.pdf (23 페이지)
> **목적**: 화면기획서와 현재 백엔드 구현 상태 비교 분석

---

## 📋 문서 구조 분석

### PDF 구성 (23 페이지)
1. **Platform Brief & Navigation** (1-2 페이지)
   - XYLO Fans 플랫폼 개요
   - 메인 네비게이션: Leaderboards, My page, Vote, FAQ, Sign in

2. **Sign in UX Flow** (3-13 페이지, 10개 화면)
   - Sign in_1: 초기 로그인 모달
   - Sign in_2: X 계정 인증
   - Sign in_3: 웰컴 튜토리얼 (3-card)
   - Sign in_4: X 포스팅 (추천링크)
   - Sign in_5: 이메일 복구 입력
   - Sign in_6: 6자리 인증번호 입력
   - Sign in_7: 인증 이메일 템플릿
   - Sign in_8: 추천링크 검증
   - Sign in_9: 튜토리얼 팝업
   - Sign in_10: 디스코드 연동

3. **Leaderboards** (14 페이지)
   - Top 3 채널 특별 표시
   - 기간 필터: ALL, 1D, 1W, 1M, 3M
   - 포인트 카테고리: Total Current, Contents, Referral, Event, Profit, Boost
   - 정렬: Highest first / Lowest first
   - 페이지네이션: 10개씩

4. **FAQ** (15 페이지)
   - 검색 기능
   - 다국어: KO/EN
   - 질문 목록 (10개)

5. **My page** (16-23 페이지, 8개 화면)
   - My page_1: 프로필, 추천링크, 활동 포인트, User Pass 클레임
   - My page_2: 포인트 히스토리 테이블 (일별 상세)
   - My page_3: 활동 상세 팝업 (조회수, 좋아요, 댓글, 영상 수)
   - My page_4: 혜택 팝업 (XLT Claim boost, NFT 업그레이드, 에어드랍)
   - My page_5: NFT/SBT 캐러셀 (4종)
   - My page_6: 프로필 편집 + 채널 등록
   - My page_7: 이메일 연결
   - My page_8: 지갑 연결

---

## 1. Sign in UX Flow 상세 비교

### Sign in_1: 초기 로그인 모달

#### PDF 화면 구성
- "Continue with X" 버튼
- "Recover With Email" 링크
- XYLO 로고 + 타이틀

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| X 로그인 | ✅ 완료 | `GET /api/v1/auth/twitter` | `auth.controller.ts:15` |
| 이메일 복구 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] 이메일 복구 API 구현 (Week 1)

---

### Sign in_2: X 계정 인증

#### PDF 화면 구성
- X OAuth 인증 화면
- 권한 승인: 프로필 정보, 트윗 게시

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| OAuth 콜백 | ✅ 완료 | `GET /api/v1/auth/twitter/callback` | `auth.controller.ts:25` |
| 자동 회원가입 | ✅ 완료 | - | `auth.service.ts:74` |
| JWT 발급 | ✅ 완료 | - | `auth.service.ts:140` |
| 추천코드 생성 | ✅ 완료 | - | `auth.service.ts:35` |

#### 필요한 작업
- 없음 (완성)

---

### Sign in_3: 웰컴 튜토리얼 (3-card)

#### PDF 화면 구성
- **Card 1: Community Points**
  - 제목: "Earn Points for Your Activity"
  - 내용: 조회수, 좋아요, 댓글로 포인트 적립
  - 이미지: 포인트 아이콘

- **Card 2: Referral System**
  - 제목: "Invite Friends and Earn Together"
  - 내용: 3단계 검증 (가입/디스코드/영상)
  - 이미지: 추천인 아이콘

- **Card 3: Token Exchange**
  - 제목: "Exchange Points for XLT Tokens"
  - 내용: 포인트를 XLT로 교환
  - 이미지: 토큰 아이콘

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 튜토리얼 카드 데이터 | ❌ 미구현 | - | - |
| 완료 상태 추적 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `GET /api/v1/tutorial/cards` - 카드 3개 반환
- [ ] `POST /api/v1/tutorial/complete` - 완료 상태 저장
- [ ] DB: `users.has_completed_tutorial` 컬럼 추가

---

### Sign in_4: X 포스팅 (추천링크)

#### PDF 화면 구성
- 추천링크 자동 생성: `https://xylo.world/?ref={referral_code}`
- X 포스팅 버튼
- 포스팅 템플릿:
  ```
  🎉 Join XYLO Fans with my referral link:
  https://xylo.world/?ref=ABC123

  #XYLO #WITCHES
  ```

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 추천링크 생성 | ✅ 완료 | - | `users.referral_code` |
| X 자동 포스팅 | ❌ 미구현 | - | - |
| x_postings 기록 | ⚠️ 테이블만 | - | `database/05-verification-and-posting.sql` |

#### 필요한 작업
- [ ] `POST /api/v1/x-posting/share-referral` - 자동 포스팅
- [ ] Twitter API v2 연동 (`twitter-api-v2` 라이브러리)
- [ ] x_postings 테이블에 기록

---

### Sign in_5, 6, 7: 이메일 복구 플로우

#### PDF 화면 구성
- **Sign in_5**: 이메일 입력 폼
- **Sign in_6**: 6자리 인증번호 입력 (15분 제한)
- **Sign in_7**: 이메일 템플릿
  ```
  From: info@xylo.world
  Subject: [XYLO] Your Verification Code

  Your code: 123456
  Expires in 15 minutes.
  ```

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 인증번호 발송 | ❌ 미구현 | - | - |
| 인증번호 검증 | ❌ 미구현 | - | - |
| 계정 복구 (JWT) | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] DB: `email_verification_codes` 테이블 생성
- [ ] `POST /api/v1/auth/email/send-code`
- [ ] `POST /api/v1/auth/email/verify-code`
- [ ] `POST /api/v1/auth/email/recover`
- [ ] 이메일 서비스: `@nestjs-modules/mailer` + `nodemailer`

---

### Sign in_8: 추천링크 검증

#### PDF 화면 구성
- URL 파라미터 `?ref=ABC123` 감지
- 추천인 정보 표시
- "Accept Referral" 버튼

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 추천코드 검증 | ✅ 완료 | `POST /api/v1/referrals/register` | `referral.controller.ts:15` |
| 추천인 정보 조회 | ⚠️ 부분 | - | `referral_code` 조회만 가능 |

#### 필요한 작업
- [ ] `GET /api/v1/referrals/validate/:code` - 추천코드로 추천인 정보 반환

---

### Sign in_9: 튜토리얼 팝업

#### PDF 화면 구성
- Sign in_3과 동일한 3-card 캐러셀
- "Skip" 버튼
- "Next" / "Done" 버튼

#### 백엔드 구현 상태
- Sign in_3과 동일 (미구현)

---

### Sign in_10: 디스코드 연동

#### PDF 화면 구성
- "Connect Discord" 버튼
- Discord OAuth 인증
- 서버 가입 확인

#### 백엔드 구현 상태
| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| Discord OAuth | ❌ 미구현 | - | - |
| is_discord_joined | ⚠️ 컬럼만 | - | `referrals.is_discord_joined` |

#### 필요한 작업
- [ ] `GET /api/v1/auth/discord` - OAuth 시작
- [ ] `GET /api/v1/auth/discord/callback` - 콜백 처리
- [ ] Discord API로 서버 가입 확인
- [ ] `referrals.is_discord_joined` 자동 업데이트

---

## 2. Leaderboards 상세 비교

### PDF 화면 구성
- **Top 3 특별 표시**: 1~3위 큰 카드
- **필터**:
  - Period: ALL, 1D, 1W, 1M, 3M
  - Category: Total Current, Contents, Referral, Event, Profit, Boost
- **정렬**: Highest first / Lowest first
- **페이지네이션**: 10개씩

### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 기간 필터링 | ✅ 완료 | `GET /api/v1/leaderboard?period=1D` | `leaderboard.controller.ts:13` |
| 포인트 카테고리 | ✅ 완료 | - | `leaderboard.service.ts:56` |
| 유저 랭킹 조회 | ✅ 완료 | `GET /api/v1/leaderboard/user/:userId` | `leaderboard.controller.ts:22` |
| 페이지네이션 | ✅ 완료 | `?limit=10&offset=0` | `leaderboard.service.ts:39` |
| Top 3 특별 처리 | ⚠️ 프론트 | - | 백엔드 수정 불필요 |
| 정렬 옵션 | ⚠️ ASC만 | - | rank ASC 고정 |
| SPONSOR 카테고리 | ❌ 미포함 | - | - |

### 포인트 카테고리 명칭 이슈

| PDF 명칭 | 백엔드 명칭 | DB 컬럼명 | 일치 여부 |
|----------|------------|----------|----------|
| Total Current | totalPoints | total_current | ✅ |
| Contents | contents | contents | ✅ |
| Referral | mgm | mgm | ⚠️ 명칭 불일치 |
| Event | event | event | ✅ |
| Profit | profit | profit | ✅ |
| Boost | boost | boost | ✅ |
| - | - | sponsor | ❌ 리더보드 미포함 |

### 필요한 작업
- [ ] 리더보드 응답에 `sponsor` 필드 추가
- [ ] (선택) Lowest first 정렬 옵션 추가

---

## 3. FAQ 상세 비교

### PDF 화면 구성
- **검색 바**: "Search questions..."
- **언어 토글**: KO / EN
- **질문 목록**: 10개
- **카테고리**: General, Points, NFT, Referral

### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| FAQ 테이블 | ❌ 없음 | - | - |
| FAQ 조회 | ❌ 미구현 | - | - |
| 검색 기능 | ❌ 미구현 | - | - |
| 다국어 | ❌ 미구현 | - | - |

### 필요한 작업
- [ ] DB: `faqs` 테이블 생성
- [ ] `GET /api/v1/faqs?lang=ko&search=포인트&category=Points`
- [ ] `GET /api/v1/faqs/:id?lang=ko`
- [ ] 어드민 API: POST, PATCH, DELETE
- [ ] PostgreSQL Full-Text Search 구현

---

## 4. My page 상세 비교

### My page_1: 메인 프로필

#### PDF 화면 구성
- **프로필 영역**: X handle, 프로필 이미지, 가입일
- **추천링크**: `https://xylo.world/?ref=ABC123` + Copy 버튼
- **활동 포인트**: 카테고리별 포인트 표시
- **User Pass Claim**: "Claim Your User Pass" 버튼

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 프로필 조회 | ✅ 완료 | `GET /api/v1/users/me` | `users.controller.ts` |
| 추천코드 | ✅ 완료 | - | `users.referral_code` |
| 포인트 조회 | ⚠️ 부분 | - | `user_points` 테이블만 |
| User Pass 클레임 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `GET /api/v1/users/me/points` - 카테고리별 포인트 반환
- [ ] `POST /api/v1/nfts/claim-user-pass` - SBT 클레임

---

### My page_2: 포인트 히스토리

#### PDF 화면 구성
- **테이블 컬럼**: Date, Category, Amount, Reason
- **예시 데이터**:
  ```
  2025-01-10 | CONTENT | +120P | Video ABC123: +12000 views, +600 likes
  2025-01-09 | MGM     | +500P | Referral completed (user @john_doe)
  2025-01-08 | EVENT   | +200P | Vote participation
  ```

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| point_transactions | ✅ 테이블 | - | `database/01-create-tables.sql:277` |
| 히스토리 API | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `GET /api/v1/points/history?limit=30&offset=0&category=CONTENT`
- [ ] 날짜 범위 필터: `?startDate=2025-01-01&endDate=2025-01-10`

---

### My page_3: 활동 상세 팝업

#### PDF 화면 구성
- **기간**: Last 7 days
- **통계**:
  - Total Videos: 5
  - Total Views: 45,000
  - Total Likes: 2,300
  - Total Comments: 180
- **포인트 계산 근거**:
  - From Views: 450P
  - From Likes: 46P
  - From Comments: 18P
  - **Total Earned**: 514P

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 활동 통계 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `GET /api/v1/users/me/activity-stats?period=7d`
- [ ] `youtube_video_snapshots` 집계 쿼리

---

### My page_4: 혜택 팝업

#### PDF 화면 구성
- **현재 등급**: Silver (Tier 2)
- **XLT Claim Boost**: 1.2x
- **다음 등급 조건**:
  - Gold (Tier 3) 필요 포인트: 10,000P
  - 현재 포인트: 7,700P
  - 부족: 2,300P
- **혜택 목록**:
  - XLT Claim 30% 증가
  - 리더보드 Gold 뱃지
  - 분기별 에어드랍 자격

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| NFT 혜택 | ❌ 미구현 | - | - |
| Tier 진행률 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `GET /api/v1/nfts/benefits?userId=me`
- [ ] Tier 기준 정의 (Bronze 1K → Diamond 100K)

---

### My page_5: NFT/SBT 캐러셀

#### PDF 화면 구성
- **4종 NFT 슬라이드**:

  1. **User Pass (SBT-01)**
     - Type: SBT (Soul-Bound Token)
     - Description: "XYLO community member badge"
     - Claim: 활동 기반 (X 포스팅 or 채널 인증)

  2. **Tier NFT (NFT-02)**
     - Type: NFT
     - Tiers: Bronze, Silver, Gold, Platinum, Diamond
     - Upgrade: 포인트 기반 자동 승급

  3. **Limited Edition (NFT-03)**
     - Type: NFT
     - Issue: 이벤트 보상
     - Rarity: 한정 수량

  4. **Burn NFT (NFT-04)**
     - Type: NFT (Burnable)
     - Use: 팬미팅 티켓
     - Status: "Ready to Burn" / "Burned"

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| user_nfts 테이블 | ✅ 완료 | - | `database/01-create-tables.sql:351` |
| NFT 컬렉션 API | ❌ 미구현 | - | - |
| User Pass 클레임 | ❌ 미구현 | - | - |
| Tier 승급 | ❌ 미구현 | - | - |
| Limited 발행 | ❌ 미구현 | - | - |
| Burn 로직 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `GET /api/v1/nfts/my-collection`
- [ ] `POST /api/v1/nfts/claim-user-pass`
- [ ] Background Job: `tier-nft-upgrade.processor.ts`
- [ ] `POST /api/v1/admin/nfts/mint-limited-edition`
- [ ] `POST /api/v1/nfts/burn/:nftId`

---

### My page_6: 프로필 편집 + 채널 등록

#### PDF 화면 구성
- **편집 가능 항목**:
  - Display Name
  - Profile Image (업로드)
- **채널 등록**:
  - YouTube Channel URL 입력
  - 인증 코드 확인

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 프로필 수정 | ✅ 완료 | `PATCH /api/v1/users/me` | `users.controller.ts` |
| 채널 등록 | ✅ 완료 | `POST /api/v1/youtube/register` | `youtube.controller.ts` |
| 채널 인증 | ✅ 완료 | `POST /api/v1/youtube/verify` | `youtube.controller.ts` |

#### 필요한 작업
- 없음 (완성)

---

### My page_7: 이메일 연결

#### PDF 화면 구성
- Sign in_5/6/7과 동일
- 이메일 입력 → 6자리 인증번호 → 연결 완료

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 이메일 연결 | ❌ 미구현 | - | - |

#### 필요한 작업
- [ ] `POST /api/v1/users/connect-email`
- [ ] Sign in_5/6/7과 동일한 인증 플로우

---

### My page_8: 지갑 연결

#### PDF 화면 구성
- "Connect Wallet" 버튼
- Rainbow Kit 라이브러리 사용
- Polygon Mumbai Testnet (80001)

#### 백엔드 구현 상태

| 기능 | 상태 | API 엔드포인트 | 파일 위치 |
|------|------|----------------|----------|
| 지갑 연결 | ✅ 완료 | `POST /api/v1/users/wallet` | `users.controller.ts` |
| 주소 검증 | ✅ 완료 | - | `ConnectWalletDto` |

#### 필요한 작업
- 없음 (완성)

---

## 📊 갭 분석 요약

### 구현 상태 통계

| 구분 | 완료 | 부분 구현 | 미구현 | 합계 |
|------|------|----------|--------|------|
| Sign in | 3 | 2 | 5 | 10 |
| Leaderboards | 4 | 2 | 1 | 7 |
| FAQ | 0 | 0 | 4 | 4 |
| My page | 3 | 2 | 8 | 13 |
| **총계** | **10** | **6** | **18** | **34** |

### 우선순위별 미구현 기능

#### 🔴 크리티컬 (5개)
1. 이메일 복구 시스템
2. FAQ 시스템
3. 포인트 히스토리 API
4. User Pass NFT 클레임
5. 디스코드 OAuth 연동

#### 🟡 높음 (6개)
6. 튜토리얼 플로우
7. 활동 상세 팝업
8. NFT 혜택 안내
9. Tier NFT 승급
10. X 자동 포스팅
11. NFT 컬렉션 API

#### 🟢 중간 (7개)
12. 추천링크 헬퍼
13. Burn NFT
14. Limited Edition NFT
15. 업그레이드 알림
16. 이메일 연결
17. SPONSOR 리더보드
18. 정렬 옵션

---

## 🎯 권장 구현 순서

### Phase 1: 계정 관리 (Week 1)
- 이메일 복구
- 튜토리얼
- FAQ

### Phase 2: NFT 기반 (Week 2)
- NFT 서비스 모듈
- User Pass 클레임
- NFT 컬렉션 API

### Phase 3: 투명성 (Week 3)
- 포인트 히스토리
- 활동 상세
- NFT 혜택

### Phase 4: 추천인 완성 (Week 4)
- 디스코드 연동
- X 자동 포스팅
- 추천링크 헬퍼

### Phase 5: 게이미피케이션 (Week 5)
- Tier 승급
- 업그레이드 알림
- Burn NFT

---

**다음 문서**: `docs/feature-specs/` - 각 기능별 상세 구현 스펙
