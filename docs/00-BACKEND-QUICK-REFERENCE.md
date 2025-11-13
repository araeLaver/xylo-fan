# 백엔드 개발자 Quick Reference

> 작성일: 2025-01-07
> 대상: **백엔드 개발자 (당신!)**
> 목적: 비즈니스 로직 개발 시 즉시 참고할 핵심 정보

---

## 🎯 당신의 역할

**백엔드 개발자**로서 담당하는 핵심 영역:
- ✅ **비즈니스 로직 구현** (포인트 계산, 검증, 워크플로우)
- ✅ **API 개발** (NestJS Controllers, Services)
- ✅ **데이터베이스 작업** (Prisma ORM)
- ✅ **외부 API 연동** (Twitter OAuth, YouTube Data API)
- ✅ **작업 큐 관리** (Bull Queue - 크롤링, 정산)
- ✅ **캐싱 전략** (Redis)
- ✅ **블록체인 연동 준비** (ethers.js - 블록체인 개발자와 협업)

**다른 팀원 역할**:
- 🎨 **프론트엔드 개발자**: React 컴포넌트, UI/UX 구현
- ⛓️ **블록체인 개발자**: 스마트 컨트랙트 (Solidity), 배포, 이벤트 리스닝

---

## 📚 핵심 문서 (중요도 순)

### ⭐⭐⭐ 매일 참고해야 할 문서

| 문서 | 용도 | 바로가기 |
|------|------|---------|
| **09-BACKEND-LOGIC-SPEC.md** | 비즈니스 로직 상세 명세 (포인트 계산, 검증 로직) | 👈 **지금 작성 예정** |
| **03-API-DESIGN.md** | API 엔드포인트, 요청/응답 구조 | [링크](03-API-DESIGN.md) |
| **02-DATABASE-SCHEMA.md** | DB 테이블, 관계, 인덱스 | [링크](02-DATABASE-SCHEMA.md) |

### ⭐⭐ 자주 참고할 문서

| 문서 | 용도 | 바로가기 |
|------|------|---------|
| **10-EXTERNAL-API-INTEGRATION.md** | Twitter/YouTube API 연동 가이드 | 👈 **지금 작성 예정** |
| **11-QUEUE-JOBS-SPEC.md** | Bull Queue 작업 정의 (크롤링, 정산) | 👈 **지금 작성 예정** |
| **05-SYSTEM-ARCHITECTURE.md** | 시스템 구조, 모듈 간 통신 | [링크](05-SYSTEM-ARCHITECTURE.md) |

### ⭐ 필요 시 참고할 문서

| 문서 | 용도 | 바로가기 |
|------|------|---------|
| **07-CODING-GUIDELINES.md** | TypeScript/NestJS 컨벤션 | [링크](07-CODING-GUIDELINES.md) |
| **12-ERROR-HANDLING.md** | 예외 처리, 에러 핸들링 전략 | 👈 **지금 작성 예정** |
| **06-DEVELOPMENT-SETUP.md** | 로컬 환경 설정 | [링크](06-DEVELOPMENT-SETUP.md) |

---

## 🔥 지금 당장 알아야 할 핵심 비즈니스 로직

### 1. 포인트 시스템 (6개 슬롯)

```typescript
// SLOT-01: 콘텐츠 확산
조회수 +100 → +1P
좋아요 +50  → +1P
공유 +10    → +1P

// SLOT-02: 신규 팬 유입 (MGM)
추천인 조건 충족 시 → +2P (추천인)
피추천인 조건:
  ✅ 커뮤니티 가입
  ✅ 디스코드 가입
  ✅ 영상 1개 업로드 (해시태그 필수)
→ 모두 완료 시 피추천인 +1P

// SLOT-03: 팬 협업 이벤트
의결권 행사 → +1P
투표 → 누적 포인트 비례

// SLOT-04: 실물 판매형
굿즈 구매 → +2P
매출 기여 → 전체 순수익 / 누적포인트 비례

// SLOT-05: 브랜드 협찬형
투표 참여자 대상 → 전체 순수익 / 누적포인트 비례

// SLOT-06: MVP Boost
XLT Claim 시 → +300P (고정)
```

### 2. 핵심 검증 로직

```typescript
// 레퍼럴 완료 조건 (SLOT-02)
async checkReferralCompletion(refereeId: string): Promise<boolean> {
  const referral = await prisma.referral.findFirst({
    where: { refereeId }
  });

  return (
    referral.isJoined &&           // 커뮤니티 가입
    referral.isDiscordJoined &&    // 디스코드 가입
    referral.isVideoPosted         // 영상 업로드
  );
}

// 포인트 지급 조건
if (await checkReferralCompletion(refereeId)) {
  await addPoints(referrerId, 'MGM', 2);  // 추천인
  await addPoints(refereeId, 'MGM', 1);   // 피추천인
}
```

### 3. 유튜브 크롤링 로직

```typescript
// 매일 00:00 UTC+9 실행
@Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
async crawlAllChannels() {
  const channels = await prisma.youtubeChannel.findMany({
    where: { isVerified: true }
  });

  for (const channel of channels) {
    // 1. 최근 숏츠 조회 (YouTube Data API)
    const videos = await youtubeApi.getChannelVideos(channel.channelId, {
      type: 'shorts',
      publishedAfter: yesterday,
      maxResults: 50
    });

    // 2. 필수 태그 필터링
    const eligibleVideos = videos.filter(v =>
      v.tags.includes('#WITCHES') || v.tags.includes('#XYLO')
    );

    // 3. DB 저장
    for (const video of eligibleVideos) {
      await prisma.youtubeVideo.upsert({
        where: { videoId: video.id },
        create: { ...video, isEligible: true },
        update: { viewCount: video.viewCount, likeCount: video.likeCount }
      });
    }

    // 4. 전날과 비교하여 포인트 계산
    await calculatePointsFromVideos(channel.userId);
  }
}
```

---

## 📊 데이터베이스 핵심 테이블

### 자주 쓰는 테이블 (우선순위 순)

#### 1. `users` - 사용자 기본 정보
```typescript
{
  id: string (UUID)
  xId: string (Twitter ID)
  xHandle: string (@username)
  email?: string
  walletAddress?: string
  referralCode: string (고유 코드)
}
```

#### 2. `user_points` - 사용자 포인트 집계 (1:1)
```typescript
{
  userId: string (FK → users.id)
  totalPoints: number
  slot01Content: number   // SLOT-01
  slot02Mgm: number       // SLOT-02
  slot03Event: number     // SLOT-03
  slot04Profit: number    // SLOT-04
  slot05Sponsor: number   // SLOT-05
  slot06Boost: number     // SLOT-06
  sbtValue: number        // SLOT-01~05 합계
}
```

#### 3. `point_transactions` - 포인트 거래 로그
```typescript
{
  id: string
  userId: string
  category: 'CONTENT' | 'MGM' | 'EVENT' | 'PROFIT' | 'SPONSOR' | 'BOOST'
  amount: number
  reason?: string
  metadata?: JSONB  // 추가 정보 (video_id, referral_id 등)
}
```

#### 4. `youtube_channels` - 유튜브 채널
```typescript
{
  userId: string
  channelId: string (UC...)
  verificationCode: string (XYLO-AB12CD34)
  isVerified: boolean
  subscriberCount: number
}
```

#### 5. `youtube_videos` - 유튜브 비디오
```typescript
{
  channelId: string
  videoId: string
  tags: string[]
  isShorts: boolean
  isEligible: boolean  // 포인트 대상 여부
  viewCount: number
  likeCount: number
}
```

#### 6. `referrals` - 레퍼럴 관계
```typescript
{
  referrerId: string  // 추천인
  refereeId: string   // 피추천인
  isJoined: boolean
  isDiscordJoined: boolean
  isVideoPosted: boolean
  isCompleted: boolean  // 3가지 모두 완료
}
```

---

## 🔄 핵심 비즈니스 플로우

### 플로우 1: 회원가입 → 자동 포스팅

```
User clicks "Sign in"
  ↓
Twitter OAuth 승인
  ↓
DB에 users 생성 + referralCode 발급
  ↓
X API로 자동 포스팅 (레퍼럴 링크 포함)
  POST /statuses/update.json
  Body: "XYLO × WITCHES ... https://xylomvp.world/referral/{code}"
  ↓
JWT 토큰 발급
  ↓
Frontend로 리다이렉트
```

**당신이 구현할 코드**:
- `AuthService.twitterCallback()`: OAuth 처리
- `AuthService.autoTweet()`: 자동 포스팅
- `UsersService.createUser()`: 유저 생성 + referralCode 발급

### 플로우 2: 유튜브 채널 인증

```
User: Edit Profile → Youtube "Register"
  ↓
User 입력: 채널 URL
  ↓
Backend: 인증코드 발급 (XYLO-AB12CD34)
  ↓
User: 채널 설명란에 인증코드 추가
  ↓
User: "Confirm" 클릭
  ↓
Backend: YouTube Data API로 채널 설명 조회
  GET https://youtube.googleapis.com/youtube/v3/channels?part=snippet
  ↓
Backend: 인증코드 매칭 확인
  if (description.includes(verificationCode)) {
    isVerified = true
  }
  ↓
Response: { isVerified: true, channelInfo }
```

**당신이 구현할 코드**:
- `YouTubeService.initiateVerification()`: 인증코드 발급
- `YouTubeService.confirmVerification()`: YouTube API 호출 + 검증
- `YouTubeApiClient.getChannelInfo()`: YouTube API 래퍼

### 플로우 3: 포인트 계산 (매일 00:00)

```
Cron Job 트리거 (00:00 UTC+9)
  ↓
Bull Queue: "youtube-crawl" Job 추가
  ↓
Worker: 모든 인증된 채널 순회
  ↓
각 채널마다:
  1. YouTube API로 최근 숏츠 조회
  2. 필수 태그 필터링 (#WITCHES, #XYLO)
  3. DB에 저장 (youtube_videos)
  4. 스냅샷 생성 (youtube_video_snapshots)
  5. 전날과 비교:
     - viewCount 증가분 → ÷100 → SLOT-01 포인트
     - likeCount 증가분 → ÷50 → SLOT-01 포인트
  6. point_transactions 기록
  ↓
Trigger: update_user_points() 실행
  → user_points 자동 업데이트
  ↓
Redis: 리더보드 업데이트
  ZADD leaderboard:all userId totalPoints
  ↓
완료
```

**당신이 구현할 코드**:
- `YouTubeProcessor.handleCrawl()`: Bull Queue Worker
- `PointsService.calculateFromVideos()`: 포인트 계산 로직
- `PointsService.addPoints()`: point_transactions 기록
- `LeaderboardService.updateCache()`: Redis 업데이트

### 플로우 4: 레퍼럴 완료 체크

```
피추천인 액션 (가입, 디스코드, 영상 업로드)
  ↓
EventEmitter: referral.action 이벤트 발행
  ↓
ReferralService: 조건 체크
  isJoined && isDiscordJoined && isVideoPosted?
  ↓
YES:
  1. referrals.isCompleted = true
  2. 추천인 +2P (SLOT-02)
  3. 피추천인 +1P (SLOT-02)
  4. point_transactions 기록
  ↓
NO:
  대기 (다음 액션까지)
```

**당신이 구현할 코드**:
- `ReferralService.checkCompletion()`: 조건 검증
- `ReferralService.completeReferral()`: 포인트 지급
- `EventListener`: referral.* 이벤트 리스너

---

## 🚨 주의해야 할 비즈니스 규칙

### ⚠️ 반드시 지켜야 할 제약사항

1. **레퍼럴 자기 참조 금지**
   ```typescript
   if (referrerId === refereeId) {
     throw new BadRequestException('Cannot refer yourself');
   }
   ```

2. **포인트 음수 방지**
   ```typescript
   if (amount < 0) {
     throw new BadRequestException('Amount must be positive');
   }
   ```

3. **중복 발급 방지**
   ```typescript
   // User Pass (SBT) 1인당 1개만
   const existing = await prisma.userNFT.findFirst({
     where: { userId, nftType: 'SBT' }
   });
   if (existing) {
     throw new ConflictException('Already minted');
   }
   ```

4. **유튜브 채널 중복 인증 방지**
   ```typescript
   const existing = await prisma.youtubeChannel.findUnique({
     where: { channelId }
   });
   if (existing && existing.userId !== currentUserId) {
     throw new ConflictException('Channel already verified by another user');
   }
   ```

5. **MVP 종료 전 Boost 지급 금지**
   ```typescript
   const mvpEndDate = new Date('2025-06-30');
   if (new Date() < mvpEndDate) {
     throw new BadRequestException('Boost only available after MVP ends');
   }
   ```

---

## 🔧 자주 쓰는 코드 스니펫

### 포인트 추가 (표준 패턴)
```typescript
async addPoints(
  userId: string,
  category: PointCategory,
  amount: number,
  reason?: string,
  metadata?: any
): Promise<void> {
  // 1. Validation
  if (amount <= 0) throw new BadRequestException('Amount must be positive');

  // 2. DB Transaction
  await this.prisma.$transaction(async (tx) => {
    // 포인트 거래 기록
    await tx.pointTransaction.create({
      data: { userId, category, amount, reason, metadata }
    });
    // Trigger로 user_points 자동 업데이트됨
  });

  // 3. Cache Invalidation
  await this.redis.del(`user:${userId}:points`);

  // 4. Event Emit
  this.eventEmitter.emit('points.added', { userId, category, amount });

  // 5. Logging
  this.logger.log(`Added ${amount} ${category} points to user ${userId}`);
}
```

### YouTube API 호출 (Rate Limit 고려)
```typescript
async getChannelVideos(channelId: string): Promise<Video[]> {
  // 1. Cache Check
  const cacheKey = `youtube:channel:${channelId}:videos`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. API 호출
  try {
    const response = await this.youtube.search.list({
      part: ['snippet'],
      channelId,
      type: ['video'],
      maxResults: 50,
      order: 'date'
    });

    const videos = response.data.items;

    // 3. Cache 저장 (1시간)
    await this.redis.setex(cacheKey, 3600, JSON.stringify(videos));

    return videos;
  } catch (error) {
    if (error.code === 403) {
      // Quota 초과
      throw new ServiceUnavailableException('YouTube API quota exceeded');
    }
    throw error;
  }
}
```

### Bull Queue Job 추가
```typescript
// Job 추가
await this.queue.add('youtube-crawl', {
  channelId: 'UC...',
  userId: 'uuid'
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60000 },
  removeOnComplete: true
});

// Worker (Processor)
@Process('youtube-crawl')
async handleCrawl(job: Job) {
  const { channelId, userId } = job.data;

  try {
    await this.crawlChannel(channelId);
    this.logger.log(`Crawled channel ${channelId}`);
  } catch (error) {
    this.logger.error(`Failed to crawl ${channelId}: ${error.message}`);
    throw error; // 재시도
  }
}
```

---

## 📞 협업 인터페이스

### 프론트엔드 개발자와의 계약

**당신이 제공할 것**:
- ✅ RESTful API (docs/03-API-DESIGN.md 참고)
- ✅ Swagger 문서 (`/api/docs`)
- ✅ WebSocket (실시간 포인트 업데이트 - 선택)
- ✅ 에러 응답 형식 (일관성 유지)

**프론트엔드가 제공할 것**:
- UI 컴포넌트 구현
- 사용자 입력 검증 (클라이언트 측)
- MetaMask 연동 (지갑 서명)

### 블록체인 개발자와의 계약

**당신이 제공할 것**:
- ✅ 포인트 데이터 (user_points 조회 API)
- ✅ NFT 메타데이터 (JSON)
- ✅ 지갑 주소 검증 (서명 확인)
- ✅ 트랜잭션 해시 저장

**블록체인 개발자가 제공할 것**:
- 스마트 컨트랙트 (SBT, NFT, Vault)
- 컨트랙트 주소, ABI
- 이벤트 리스너 (NFT 발행, Vault 입금 등)
- 가스비 추정 로직

**협업 플로우 예시 (NFT 발행)**:
```
1. Frontend: "Claim User Pass" 클릭
   ↓
2. Backend (당신): 메타데이터 생성
   GET /nfts/user-pass/prepare
   Response: { metadata, contractAddress, gasFee }
   ↓
3. Frontend: MetaMask 서명 요청
   ↓
4. Blockchain: SBT 발행 (mintUserPass)
   Event: UserPassMinted(userId, tokenId)
   ↓
5. Backend (당신): user_nfts 저장
   POST /nfts/user-pass/confirm
   Body: { txHash, tokenId }
```

---

## 🎯 당신의 개발 우선순위 (추천)

### Week 1: 기반 구축
1. ✅ NestJS 프로젝트 초기화
2. ✅ Prisma 스키마 작성 + 마이그레이션
3. ✅ 기본 모듈 생성 (Auth, Users, Points)
4. ✅ JWT 인증 구현

### Week 2: 인증 시스템
1. ✅ Twitter OAuth 로그인
2. ✅ 자동 포스팅 (X API)
3. ✅ 레퍼럴 코드 발급
4. ✅ 사용자 프로필 CRUD

### Week 3: 유튜브 연동
1. ✅ 채널 인증 (인증코드 방식)
2. ✅ YouTube Data API 클라이언트
3. ✅ 비디오 조회 + 태그 필터링
4. ✅ Bull Queue 스케줄러 (크롤링)

### Week 4: 포인트 시스템
1. ✅ 포인트 계산 로직 (SLOT-01~06)
2. ✅ point_transactions 기록
3. ✅ user_points 집계 (Trigger)
4. ✅ 리더보드 (Redis Sorted Set)

### Week 5: 레퍼럴 & 이벤트
1. ✅ 레퍼럴 조건 검증
2. ✅ 이벤트 참여 API
3. ✅ 포인트 히스토리 조회
4. ✅ 통계 API (Top 3, 내 순위 등)

### Week 6: 블록체인 연동 준비
1. ✅ NFT 메타데이터 생성 API
2. ✅ 지갑 연동 (서명 검증)
3. ✅ user_nfts 저장
4. ✅ 블록체인 개발자 협업 인터페이스 정의

---

## 📝 문서 업데이트 규칙 (중요!)

**당신이 코드를 수정할 때마다 문서도 업데이트하세요!**

### 업데이트해야 할 문서

| 변경 사항 | 업데이트할 문서 |
|----------|----------------|
| API 엔드포인트 추가/수정 | `03-API-DESIGN.md` |
| DB 스키마 변경 | `02-DATABASE-SCHEMA.md` |
| 비즈니스 로직 변경 | `09-BACKEND-LOGIC-SPEC.md` (지금 작성 예정) |
| Bull Queue Job 추가 | `11-QUEUE-JOBS-SPEC.md` (지금 작성 예정) |
| 외부 API 통합 변경 | `10-EXTERNAL-API-INTEGRATION.md` (지금 작성 예정) |
| 에러 처리 방식 변경 | `12-ERROR-HANDLING.md` (지금 작성 예정) |

### 문서 업데이트 체크리스트
```
코드 수정 완료
  ↓
[ ] 관련 문서 확인
  ↓
[ ] 문서 내용 수정
  ↓
[ ] Git Commit (코드 + 문서 함께)
  ↓
[ ] 팀원에게 공지 (Slack)
```

---

## 🆘 막혔을 때 참고할 곳

1. **비즈니스 로직 궁금**: `docs/09-BACKEND-LOGIC-SPEC.md` (지금 작성 예정)
2. **API 설계**: `docs/03-API-DESIGN.md`
3. **DB 스키마**: `docs/02-DATABASE-SCHEMA.md`
4. **외부 API 에러**: `docs/10-EXTERNAL-API-INTEGRATION.md` (지금 작성 예정)
5. **코딩 스타일**: `docs/07-CODING-GUIDELINES.md`
6. **배포 문제**: `docs/08-DEPLOYMENT-STRATEGY.md`

---

**작성자**: Lead Backend Engineer
**최종 업데이트**: 2025-01-07
**다음 업데이트**: 비즈니스 로직 구현 시작 시점
