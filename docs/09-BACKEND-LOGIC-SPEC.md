# XYLO 백엔드 비즈니스 로직 상세 명세서

> 작성일: 2025-01-07
> 대상: **백엔드 개발자**
> 목적: 모든 비즈니스 로직의 상세 구현 가이드

---

## 📋 목차

1. [포인트 시스템 상세](#1-포인트-시스템-상세)
2. [레퍼럴 시스템](#2-레퍼럴-시스템)
3. [유튜브 채널 인증](#3-유튜브-채널-인증)
4. [유튜브 크롤링 & 포인트 계산](#4-유튜브-크롤링--포인트-계산)
5. [리더보드 시스템](#5-리더보드-시스템)
6. [이벤트 참여](#6-이벤트-참여)
7. [검증 규칙 총정리](#7-검증-규칙-총정리)

---

## 1. 포인트 시스템 상세

### 1.1 6개 슬롯 구조 (ERC-3525 매핑)

```
user_points 테이블 구조:
├── slot01Content  (SLOT-01: 콘텐츠 확산)
├── slot02Mgm      (SLOT-02: 신규 팬 유입)
├── slot03Event    (SLOT-03: 팬 협업 이벤트)
├── slot04Profit   (SLOT-04: 실물 판매형 수익)
├── slot05Sponsor  (SLOT-05: 브랜드 협찬형)
├── slot06Boost    (SLOT-06: MVP Boost 300P)
├── sbtValue       = slot01 + slot02 + slot03 + slot04 + slot05
└── totalPoints    = sbtValue + slot06
```

### 1.2 SLOT-01: 콘텐츠 확산 포인트

**트리거**: 유튜브 비디오 통계 증가

**계산 로직**:
```typescript
async calculateContentPoints(videoId: string, userId: string): Promise<number> {
  // 1. 오늘과 어제 스냅샷 조회
  const today = await prisma.youtubeVideoSnapshot.findUnique({
    where: { videoId_snapshotDate: { videoId, snapshotDate: new Date() } }
  });

  const yesterday = await prisma.youtubeVideoSnapshot.findUnique({
    where: { videoId_snapshotDate: { videoId, snapshotDate: subDays(new Date(), 1) } }
  });

  if (!yesterday) return 0; // 첫날은 포인트 없음

  // 2. 증가분 계산
  const viewDelta = today.viewCount - yesterday.viewCount;
  const likeDelta = today.likeCount - yesterday.likeCount;
  const shareDelta = today.shareCount - yesterday.shareCount;

  // 3. 포인트 계산
  let points = 0;
  points += Math.floor(viewDelta / 100);  // 조회수 100회당 1P
  points += Math.floor(likeDelta / 50);   // 좋아요 50개당 1P
  points += Math.floor(shareDelta / 10);  // 공유 10회당 1P

  // 4. 최대 제한 (일일 1000P)
  points = Math.min(points, 1000);

  return points;
}
```

**호출 시점**: 매일 00:00 UTC+9 (Bull Queue)

**기록 방식**:
```typescript
await addPoints(userId, 'CONTENT', points,
  `Video ${videoId}: +${viewDelta} views, +${likeDelta} likes`,
  { videoId, viewDelta, likeDelta, shareDelta }
);
```

### 1.3 SLOT-02: 신규 팬 유입 (MGM)

**트리거**: 피추천인이 3가지 조건 모두 충족

**검증 로직**:
```typescript
async checkReferralCompletion(refereeId: string): Promise<boolean> {
  const referral = await prisma.referral.findFirst({
    where: { refereeId, isCompleted: false }
  });

  if (!referral) return false;

  // 1. 커뮤니티 가입 확인
  const user = await prisma.user.findUnique({ where: { id: refereeId } });
  const isJoined = user.joinedAt !== null;

  // 2. 디스코드 가입 확인
  const discordAccount = await prisma.socialAccount.findFirst({
    where: { userId: refereeId, platform: 'DISCORD', isVerified: true }
  });
  const isDiscordJoined = !!discordAccount;

  // 3. 영상 업로드 확인 (필수 해시태그 포함)
  const videos = await prisma.youtubeVideo.findFirst({
    where: {
      channel: { userId: refereeId },
      isEligible: true,  // #WITCHES 또는 #XYLO 포함
      publishedAt: { gte: user.joinedAt }  // 가입 이후 업로드
    }
  });
  const isVideoPosted = !!videos;

  // 4. 모두 충족 시
  if (isJoined && isDiscordJoined && isVideoPosted) {
    // Referral 완료 처리
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        isJoined: true,
        isDiscordJoined: true,
        isVideoPosted: true,
        isCompleted: true,
        completedAt: new Date()
      }
    });

    // 포인트 지급
    await addPoints(referral.referrerId, 'MGM', 2,
      `Referral completed by ${refereeId}`,
      { refereeId, referralId: referral.id }
    );

    await addPoints(refereeId, 'MGM', 1,
      `Referral completed`,
      { referrerId: referral.referrerId, referralId: referral.id }
    );

    return true;
  }

  return false;
}
```

**호출 시점**:
- 디스코드 가입 시 (Webhook)
- 영상 업로드 시 (크롤링 완료 후)

**이벤트 리스너**:
```typescript
@OnEvent('discord.joined')
async handleDiscordJoined(event: { userId: string }) {
  await this.checkReferralCompletion(event.userId);
}

@OnEvent('youtube.video.uploaded')
async handleVideoUploaded(event: { userId: string, videoId: string }) {
  await this.checkReferralCompletion(event.userId);
}
```

### 1.4 SLOT-03: 팬 협업 이벤트

**케이스 1: 의결권 행사 (투표)**
```typescript
async participateInVote(userId: string, eventId: string, voteOptionId: string): Promise<void> {
  // 1. 중복 투표 체크
  const existing = await prisma.eventParticipation.findFirst({
    where: { userId, eventId, eventType: 'VOTE' }
  });

  if (existing) {
    throw new ConflictException('Already voted');
  }

  // 2. 투표권 계산 (누적 포인트 비례)
  const userPoints = await prisma.userPoint.findUnique({
    where: { userId }
  });

  const voteWeight = Math.floor(userPoints.totalPoints / 100); // 100P당 1표

  // 3. 투표 기록
  await prisma.eventParticipation.create({
    data: {
      userId,
      eventType: 'VOTE',
      eventId,
      voteWeight,
      metadata: { voteOptionId }
    }
  });

  // 4. 포인트 지급 (의결권 행사 1P)
  await addPoints(userId, 'EVENT', 1, `Voted in event ${eventId}`, { eventId, voteOptionId });
}
```

**케이스 2: 공모전 참여**
```typescript
async participateInContest(userId: string, eventId: string, submissionUrl: string): Promise<void> {
  // 1. 중복 참여 체크
  const existing = await prisma.eventParticipation.findFirst({
    where: { userId, eventId, eventType: 'CONTEST' }
  });

  if (existing) {
    throw new ConflictException('Already participated');
  }

  // 2. 참여 기록
  await prisma.eventParticipation.create({
    data: {
      userId,
      eventType: 'CONTEST',
      eventId,
      submissionUrl
    }
  });

  // 3. 포인트 지급 (참여 1P)
  await addPoints(userId, 'EVENT', 1, `Participated in contest ${eventId}`, { eventId });
}
```

**케이스 3: 공모전 당선 (관리자 수동 처리)**
```typescript
async setContestWinner(participationId: string, prize: string): Promise<void> {
  const participation = await prisma.eventParticipation.update({
    where: { id: participationId },
    data: { isWinner: true, prize }
  });

  // 당선자 추가 포인트 (예: 100P)
  await addPoints(participation.userId, 'EVENT', 100,
    `Won contest ${participation.eventId}`,
    { eventId: participation.eventId, prize }
  );

  // NFT-03 (Reward NFT) 발행 준비
  this.eventEmitter.emit('nft.reward.mint', {
    userId: participation.userId,
    eventId: participation.eventId,
    prize
  });
}
```

### 1.5 SLOT-04: 실물 판매형 수익

**케이스 1: 굿즈 구매 (개인)**
```typescript
async recordGoodsPurchase(userId: string, orderId: string, amount: number): Promise<void> {
  // 1. 구매 기록
  await prisma.purchase.create({
    data: { userId, orderId, amount, type: 'GOODS' }
  });

  // 2. 포인트 지급 (2P 고정)
  await addPoints(userId, 'PROFIT', 2, `Goods purchase ${orderId}`, { orderId, amount });
}
```

**케이스 2: 매출 기여 정산 (전체 사용자 대상)**
```typescript
async distributeProfitSharing(totalRevenue: number, revenueSource: string): Promise<void> {
  // 1. 전체 사용자의 누적 포인트 합계
  const aggregate = await prisma.userPoint.aggregate({
    _sum: { sbtValue: true }
  });

  const totalSbtValue = aggregate._sum.sbtValue || 1;

  // 2. 순수익 계산 (30% 수수료 제외)
  const netRevenue = totalRevenue * 0.7;

  // 3. 사용자별 분배
  const users = await prisma.userPoint.findMany();

  for (const user of users) {
    if (user.sbtValue === 0) continue;

    // 개인 몫 = (개인 SBT Value / 전체 SBT Value) × 순수익
    const userShare = (user.sbtValue / totalSbtValue) * netRevenue;
    const points = Math.floor(userShare / 1000); // 1000원당 1P

    await addPoints(user.userId, 'PROFIT', points,
      `Profit sharing from ${revenueSource}`,
      { revenueSource, userShare, netRevenue }
    );
  }
}
```

### 1.6 SLOT-05: 브랜드 협찬형

**광고 수익 정산 (투표 참여자만)**
```typescript
async distributeSponsorRevenue(eventId: string, totalRevenue: number): Promise<void> {
  // 1. 해당 이벤트 투표 참여자 조회
  const participants = await prisma.eventParticipation.findMany({
    where: { eventId, eventType: 'VOTE' },
    include: { user: { include: { points: true } } }
  });

  // 2. 참여자의 누적 포인트 합계
  const totalSbtValue = participants.reduce((sum, p) =>
    sum + (p.user.points?.sbtValue || 0), 0
  );

  if (totalSbtValue === 0) return;

  // 3. 순수익 (30% 수수료 제외)
  const netRevenue = totalRevenue * 0.7;

  // 4. 참여자별 분배
  for (const participant of participants) {
    const userSbtValue = participant.user.points?.sbtValue || 0;
    if (userSbtValue === 0) continue;

    const userShare = (userSbtValue / totalSbtValue) * netRevenue;
    const points = Math.floor(userShare / 1000); // 1000원당 1P

    await addPoints(participant.userId, 'SPONSOR', points,
      `Sponsor revenue from event ${eventId}`,
      { eventId, userShare, netRevenue }
    );
  }
}
```

### 1.7 SLOT-06: MVP Boost (300P)

**조건**: MVP 종료 후 XLT Claim 시 자동 지급

```typescript
async claimXLT(userId: string): Promise<void> {
  // 1. MVP 종료 확인
  const mvpEndDate = new Date(await getSystemConfig('mvp_end_date'));
  if (new Date() < mvpEndDate) {
    throw new BadRequestException('MVP not ended yet');
  }

  // 2. 이미 Claim 했는지 확인
  const existing = await prisma.pointTransaction.findFirst({
    where: { userId, category: 'BOOST' }
  });

  if (existing) {
    throw new ConflictException('Already claimed boost');
  }

  // 3. Boost 지급 (300P 고정)
  await addPoints(userId, 'BOOST', 300, 'MVP Boost on XLT claim');

  // 4. 블록체인 팀에 이벤트 발행 (XLT 민팅)
  this.eventEmitter.emit('xlt.claim', {
    userId,
    sbtValue: (await prisma.userPoint.findUnique({ where: { userId } })).sbtValue + 300
  });
}
```

---

## 2. 레퍼럴 시스템

### 2.1 레퍼럴 링크 생성

```typescript
async generateReferralLink(userId: string): Promise<string> {
  // 1. 기존 레퍼럴 코드 확인
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user.referralCode) {
    return `https://xylomvp.world/referral/${user.referralCode}`;
  }

  // 2. 새 코드 생성 (6자리 영숫자)
  const code = generateUniqueCode(6);

  // 3. DB 업데이트
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code }
  });

  return `https://xylomvp.world/referral/${code}`;
}

function generateUniqueCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  });
  return code;
}
```

### 2.2 레퍼럴 링크로 가입

```typescript
async signupWithReferral(referralCode: string, oauthData: any): Promise<User> {
  // 1. 추천인 확인
  const referrer = await prisma.user.findUnique({
    where: { referralCode }
  });

  if (!referrer) {
    throw new NotFoundException('Invalid referral code');
  }

  // 2. 신규 유저 생성
  const newUser = await prisma.user.create({
    data: {
      xId: oauthData.id,
      xHandle: oauthData.screen_name,
      xDisplayName: oauthData.name,
      profileImageUrl: oauthData.profile_image_url,
      referralCode: generateUniqueCode(6)
    }
  });

  // 3. Referral 관계 생성
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: newUser.id,
      referralCode,
      isJoined: true,  // 가입 완료
      isDiscordJoined: false,
      isVideoPosted: false,
      isCompleted: false
    }
  });

  // 4. 이벤트 발행 (조건 체크용)
  this.eventEmitter.emit('referral.joined', { userId: newUser.id });

  return newUser;
}
```

### 2.3 레퍼럴 조건 체크 (실시간)

```typescript
// Discord 가입 Webhook 수신 시
@Post('webhooks/discord/joined')
async handleDiscordJoined(@Body() body: DiscordWebhookPayload): Promise<void> {
  const { userId, discordId } = body;

  // 1. Social Account 연동
  await prisma.socialAccount.create({
    data: {
      userId,
      platform: 'DISCORD',
      accountId: discordId,
      isVerified: true
    }
  });

  // 2. Referral 업데이트
  await prisma.referral.updateMany({
    where: { refereeId: userId, isCompleted: false },
    data: { isDiscordJoined: true }
  });

  // 3. 완료 조건 체크
  await this.checkReferralCompletion(userId);
}

// 영상 업로드 크롤링 완료 시
@OnEvent('youtube.video.uploaded')
async handleVideoUploaded(event: { userId: string, videoId: string }): Promise<void> {
  const video = await prisma.youtubeVideo.findUnique({
    where: { videoId: event.videoId }
  });

  // 필수 태그 확인
  if (video.isEligible) {
    await prisma.referral.updateMany({
      where: { refereeId: event.userId, isCompleted: false },
      data: { isVideoPosted: true }
    });

    await this.checkReferralCompletion(event.userId);
  }
}
```

---

## 3. 유튜브 채널 인증

### 3.1 인증 시작

```typescript
async initiateChannelVerification(userId: string, channelUrl: string): Promise<VerificationData> {
  // 1. URL에서 channelId 추출
  const channelId = extractChannelId(channelUrl);
  if (!channelId) {
    throw new BadRequestException('Invalid channel URL');
  }

  // 2. 중복 인증 체크
  const existing = await prisma.youtubeChannel.findUnique({
    where: { channelId }
  });

  if (existing && existing.userId !== userId) {
    throw new ConflictException('Channel already verified by another user');
  }

  // 3. 인증코드 생성 (XYLO-XXXXXX)
  const verificationCode = `XYLO-${generateRandomString(8).toUpperCase()}`;

  // 4. DB 저장
  await prisma.youtubeChannel.upsert({
    where: { channelId },
    create: {
      userId,
      channelId,
      channelUrl,
      verificationCode,
      isVerified: false
    },
    update: {
      verificationCode
    }
  });

  return {
    channelId,
    verificationCode,
    instructions: 'Please add this code to your channel description and click confirm.',
    expiresIn: 3600  // 1시간
  };
}

function extractChannelId(url: string): string | null {
  // https://youtube.com/@channelname
  // https://youtube.com/channel/UCxxxxxxxxx
  const patterns = [
    /youtube\.com\/@([^/?]+)/,
    /youtube\.com\/channel\/([^/?]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
```

### 3.2 인증 확인

```typescript
async confirmChannelVerification(userId: string, verificationCode: string): Promise<YouTubeChannel> {
  // 1. 인증코드로 채널 조회
  const channel = await prisma.youtubeChannel.findUnique({
    where: { verificationCode }
  });

  if (!channel) {
    throw new NotFoundException('Invalid verification code');
  }

  if (channel.userId !== userId) {
    throw new ForbiddenException('Not your channel');
  }

  if (channel.isVerified) {
    throw new ConflictException('Already verified');
  }

  // 2. YouTube API로 채널 정보 조회
  const response = await this.youtube.channels.list({
    part: ['snippet', 'statistics'],
    id: [channel.channelId]
  });

  const channelData = response.data.items?.[0];
  if (!channelData) {
    throw new NotFoundException('Channel not found on YouTube');
  }

  // 3. 채널 설명란에서 인증코드 확인
  const description = channelData.snippet.description;
  if (!description.includes(verificationCode)) {
    throw new BadRequestException('Verification code not found in channel description');
  }

  // 4. 인증 완료
  const verified = await prisma.youtubeChannel.update({
    where: { channelId: channel.channelId },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      channelTitle: channelData.snippet.title,
      channelDescription: description,
      thumbnailUrl: channelData.snippet.thumbnails.default.url,
      subscriberCount: parseInt(channelData.statistics.subscriberCount),
      videoCount: parseInt(channelData.statistics.videoCount),
      viewCount: parseInt(channelData.statistics.viewCount)
    }
  });

  // 5. Social Account 연동
  await prisma.socialAccount.create({
    data: {
      userId,
      platform: 'YOUTUBE',
      accountId: channel.channelId,
      handle: `@${channelData.snippet.customUrl || channelData.snippet.title}`,
      displayName: channelData.snippet.title,
      profileImage: channelData.snippet.thumbnails.default.url,
      isVerified: true,
      isPrimary: false
    }
  });

  // 6. 이벤트 발행
  this.eventEmitter.emit('youtube.channel.verified', { userId, channelId: channel.channelId });

  return verified;
}
```

---

## 4. 유튜브 크롤링 & 포인트 계산

### 4.1 스케줄러 설정

```typescript
@Injectable()
export class YouTubeCronService {
  constructor(
    @InjectQueue('youtube-crawl') private queue: Queue
  ) {}

  // 매일 00:00 UTC+9
  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  async scheduleDailyCrawl() {
    this.logger.log('Starting daily YouTube crawl...');

    // 모든 인증된 채널 조회
    const channels = await prisma.youtubeChannel.findMany({
      where: { isVerified: true }
    });

    // 각 채널별로 Job 추가
    for (const channel of channels) {
      await this.queue.add('crawl-channel', {
        channelId: channel.channelId,
        userId: channel.userId
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: true,
        removeOnFail: false
      });
    }

    this.logger.log(`Scheduled ${channels.length} crawl jobs`);
  }
}
```

### 4.2 크롤링 Worker

```typescript
@Processor('youtube-crawl')
export class YouTubeProcessor {
  @Process('crawl-channel')
  async handleChannelCrawl(job: Job<{ channelId: string; userId: string }>) {
    const { channelId, userId } = job.data;

    try {
      // 1. YouTube API로 최근 비디오 조회
      const videos = await this.youtubeApi.searchVideos({
        channelId,
        publishedAfter: subDays(new Date(), 1),  // 최근 1일
        type: 'video',
        maxResults: 50
      });

      job.progress(20);

      // 2. 비디오 상세 정보 조회 (배치)
      const videoIds = videos.map(v => v.id.videoId);
      const videoDetails = await this.youtubeApi.getVideos(videoIds);

      job.progress(50);

      // 3. 필터링 및 저장
      for (const video of videoDetails) {
        const tags = video.snippet.tags || [];
        const isShorts = video.contentDetails.duration.startsWith('PT') &&
                         parseInt(video.contentDetails.duration.match(/\d+/)?.[0]) <= 60;

        const isEligible = tags.some(tag =>
          tag.toLowerCase().includes('witches') ||
          tag.toLowerCase().includes('xylo')
        );

        // 4. DB Upsert
        await prisma.youtubeVideo.upsert({
          where: { videoId: video.id },
          create: {
            channelId,
            videoId: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnailUrl: video.snippet.thumbnails.default.url,
            publishedAt: new Date(video.snippet.publishedAt),
            duration: parseDuration(video.contentDetails.duration),
            viewCount: parseInt(video.statistics.viewCount),
            likeCount: parseInt(video.statistics.likeCount),
            commentCount: parseInt(video.statistics.commentCount),
            tags,
            isShorts,
            isEligible
          },
          update: {
            viewCount: parseInt(video.statistics.viewCount),
            likeCount: parseInt(video.statistics.likeCount),
            commentCount: parseInt(video.statistics.commentCount)
          }
        });

        // 5. 스냅샷 생성
        await prisma.youtubeVideoSnapshot.create({
          data: {
            videoId: video.id,
            snapshotDate: new Date(),
            viewCount: parseInt(video.statistics.viewCount),
            likeCount: parseInt(video.statistics.likeCount),
            commentCount: parseInt(video.statistics.commentCount)
          }
        });
      }

      job.progress(80);

      // 6. 포인트 계산
      await this.calculatePoints(userId, channelId);

      job.progress(100);

      this.logger.log(`Crawled ${videos.length} videos for channel ${channelId}`);

    } catch (error) {
      this.logger.error(`Failed to crawl channel ${channelId}: ${error.message}`);
      throw error;  // 재시도
    }
  }
}
```

### 4.3 포인트 계산 (전날 대비)

```typescript
async calculatePoints(userId: string, channelId: string): Promise<void> {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);

  // 1. 해당 채널의 적격 비디오 조회
  const videos = await prisma.youtubeVideo.findMany({
    where: { channelId, isEligible: true }
  });

  let totalPoints = 0;

  for (const video of videos) {
    // 2. 오늘/어제 스냅샷 조회
    const todaySnapshot = await prisma.youtubeVideoSnapshot.findUnique({
      where: {
        videoId_snapshotDate: { videoId: video.videoId, snapshotDate: today }
      }
    });

    const yesterdaySnapshot = await prisma.youtubeVideoSnapshot.findUnique({
      where: {
        videoId_snapshotDate: { videoId: video.videoId, snapshotDate: yesterday }
      }
    });

    if (!yesterdaySnapshot || !todaySnapshot) continue;

    // 3. 증가분 계산
    const viewDelta = Math.max(0, todaySnapshot.viewCount - yesterdaySnapshot.viewCount);
    const likeDelta = Math.max(0, todaySnapshot.likeCount - yesterdaySnapshot.likeCount);

    // 4. 포인트 계산
    const viewPoints = Math.floor(viewDelta / 100);   // 100회당 1P
    const likePoints = Math.floor(likeDelta / 50);    // 50개당 1P

    const points = viewPoints + likePoints;

    if (points > 0) {
      totalPoints += points;

      // 5. 거래 기록
      await this.addPoints(userId, 'CONTENT', points,
        `Video ${video.videoId}: +${viewDelta} views, +${likeDelta} likes`,
        { videoId: video.videoId, viewDelta, likeDelta }
      );
    }
  }

  this.logger.log(`Calculated ${totalPoints} points for user ${userId}`);
}
```

---

## 5. 리더보드 시스템

### 5.1 Redis Sorted Set 구조

```
Key: leaderboard:{period}
Score: totalPoints
Member: userId

예시:
leaderboard:all     → 전체 기간
leaderboard:1d      → 최근 1일 (TTL: 86400초)
leaderboard:1w      → 최근 1주 (TTL: 604800초)
leaderboard:1m      → 최근 1개월
leaderboard:3m      → 최근 3개월
```

### 5.2 리더보드 업데이트 (포인트 추가 시)

```typescript
async updateLeaderboard(userId: string): Promise<void> {
  // 1. 사용자 최신 포인트 조회
  const userPoints = await prisma.userPoint.findUnique({
    where: { userId }
  });

  if (!userPoints) return;

  // 2. Redis 업데이트
  await Promise.all([
    // 전체 기간
    this.redis.zadd('leaderboard:all', userPoints.totalPoints, userId),

    // 1일 (TTL 설정)
    this.redis.zadd('leaderboard:1d', userPoints.totalPoints, userId),
    this.redis.expire('leaderboard:1d', 86400),

    // 1주
    this.redis.zadd('leaderboard:1w', userPoints.totalPoints, userId),
    this.redis.expire('leaderboard:1w', 604800),

    // 1개월
    this.redis.zadd('leaderboard:1m', userPoints.totalPoints, userId),

    // 3개월
    this.redis.zadd('leaderboard:3m', userPoints.totalPoints, userId)
  ]);
}
```

### 5.3 리더보드 조회

```typescript
async getLeaderboard(period: string, page: number = 1, limit: number = 10): Promise<LeaderboardResponse> {
  const key = `leaderboard:${period}`;
  const offset = (page - 1) * limit;

  // 1. Redis에서 Top N 조회 (역순: 높은 점수부터)
  const results = await this.redis.zrevrange(key, offset, offset + limit - 1, 'WITHSCORES');

  // 2. User 정보 조회
  const leaderboard: LeaderboardEntry[] = [];
  for (let i = 0; i < results.length; i += 2) {
    const userId = results[i];
    const score = parseInt(results[i + 1]);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, xHandle: true, profileImageUrl: true }
    });

    const points = await prisma.userPoint.findUnique({
      where: { userId }
    });

    leaderboard.push({
      rank: offset + (i / 2) + 1,
      user,
      totalCurrent: points.totalPoints,
      contents: points.slot01Content,
      mgm: points.slot02Mgm,
      event: points.slot03Event,
      profit: points.slot04Profit + points.slot05Sponsor,
      boost: points.slot06Boost
    });
  }

  // 3. 전체 개수
  const total = await this.redis.zcard(key);

  return {
    items: leaderboard,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

---

## 6. 이벤트 참여

(이미 SLOT-03에서 다룸)

---

## 7. 검증 규칙 총정리

### 7.1 사용자 관련

```typescript
// 레퍼럴 자기 참조 금지
if (referrerId === refereeId) {
  throw new BadRequestException('REFERRAL_SELF_NOT_ALLOWED');
}

// 중복 계정 방지 (X ID 기준)
const existing = await prisma.user.findUnique({ where: { xId } });
if (existing) {
  throw new ConflictException('USER_ALREADY_EXISTS');
}

// 지갑 주소 중복 방지
const duplicateWallet = await prisma.user.findUnique({ where: { walletAddress } });
if (duplicateWallet && duplicateWallet.id !== userId) {
  throw new ConflictException('WALLET_ALREADY_CONNECTED');
}
```

### 7.2 포인트 관련

```typescript
// 포인트 음수 방지
if (amount <= 0) {
  throw new BadRequestException('AMOUNT_MUST_BE_POSITIVE');
}

// 일일 최대 포인트 제한 (SLOT-01)
const today = await prisma.pointTransaction.aggregate({
  where: {
    userId,
    category: 'CONTENT',
    createdAt: { gte: startOfDay(new Date()) }
  },
  _sum: { amount: true }
});

if (today._sum.amount + amount > 1000) {
  throw new BadRequestException('DAILY_LIMIT_EXCEEDED');
}
```

### 7.3 유튜브 관련

```typescript
// 채널 중복 인증 방지
const existing = await prisma.youtubeChannel.findUnique({ where: { channelId } });
if (existing && existing.userId !== userId) {
  throw new ConflictException('CHANNEL_ALREADY_VERIFIED');
}

// 인증코드 만료 (1시간)
const channel = await prisma.youtubeChannel.findUnique({ where: { verificationCode } });
if (new Date().getTime() - channel.createdAt.getTime() > 3600000) {
  throw new BadRequestException('VERIFICATION_CODE_EXPIRED');
}

// 필수 태그 확인
const isEligible = video.tags.some(tag =>
  tag.toLowerCase().includes('witches') || tag.toLowerCase().includes('xylo')
);
```

### 7.4 NFT 관련

```typescript
// User Pass 중복 발급 방지
const existing = await prisma.userNFT.findFirst({
  where: { userId, nftType: 'SBT' }
});
if (existing) {
  throw new ConflictException('NFT_ALREADY_MINTED');
}

// 지갑 미연동
if (!user.walletAddress) {
  throw new BadRequestException('WALLET_NOT_CONNECTED');
}

// 최소 포인트 요구 (티어 업그레이드)
if (userPoints.totalPoints < tierRequirements[newTier]) {
  throw new BadRequestException('INSUFFICIENT_POINTS');
}
```

### 7.5 MVP 관련

```typescript
// MVP 종료 전 Boost 지급 금지
const mvpEndDate = new Date(await getSystemConfig('mvp_end_date'));
if (new Date() < mvpEndDate) {
  throw new BadRequestException('MVP_NOT_ENDED');
}

// 중복 Claim 방지
const existing = await prisma.pointTransaction.findFirst({
  where: { userId, category: 'BOOST' }
});
if (existing) {
  throw new ConflictException('ALREADY_CLAIMED');
}
```

---

**작성자**: Backend Team Lead
**최종 업데이트**: 2025-01-07
**다음 업데이트**: 구현 시작 시점 (로직 검증 후)

**⚠️ 중요**: 이 문서는 코드 작성 전 반드시 팀 리뷰를 거쳐야 합니다!
