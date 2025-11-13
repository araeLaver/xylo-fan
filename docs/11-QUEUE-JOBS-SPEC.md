# XYLO Bull Queue 작업 정의서

> 작성일: 2025-01-07
> 대상: 백엔드 개발자
> 목적: 비동기 작업 (Job) 정의 및 스케줄링 전략

---

## 📋 목차

1. [Queue 구조](#1-queue-구조)
2. [YouTube 크롤링 Jobs](#2-youtube-크롤링-jobs)
3. [포인트 정산 Jobs](#3-포인트-정산-jobs)
4. [알림 Jobs](#4-알림-jobs)
5. [모니터링](#5-모니터링)

---

## 1. Queue 구조

### 1.1 Queue 목록

```typescript
// app.module.ts
BullModule.forRoot({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD
  }
}),
BullModule.registerQueue(
  { name: 'youtube-crawl' },      // 유튜브 크롤링
  { name: 'points-calculation' }, // 포인트 계산
  { name: 'notifications' },      // 알림 발송
  { name: 'blockchain-sync' }     // 블록체인 동기화
)
```

### 1.2 Job 우선순위

```typescript
enum JobPriority {
  CRITICAL = 1,   // 즉시 처리 (알림, 에러)
  HIGH = 5,       // 높음 (포인트 계산)
  NORMAL = 10,    // 보통 (크롤링)
  LOW = 20        // 낮음 (통계, 백업)
}
```

---

## 2. YouTube 크롤링 Jobs

### 2.1 Job: `crawl-channel`

**목적**: 개별 채널의 최근 비디오 크롤링

**스케줄**: 매일 00:00 UTC+9

**데이터**:
```typescript
interface CrawlChannelJobData {
  channelId: string;
  userId: string;
  options?: {
    maxResults?: number;  // default: 50
    publishedAfter?: Date;  // default: 어제
  };
}
```

**Processor**:
```typescript
@Processor('youtube-crawl')
export class YouTubeProcessor {
  @Process('crawl-channel')
  async handleCrawlChannel(job: Job<CrawlChannelJobData>) {
    const { channelId, userId, options } = job.data;

    try {
      // 1. Progress 업데이트
      await job.progress(10);

      // 2. YouTube API 호출
      const videos = await this.youtubeApi.searchVideos({
        channelId,
        publishedAfter: options?.publishedAfter || subDays(new Date(), 1),
        maxResults: options?.maxResults || 50
      });

      await job.progress(40);

      // 3. 비디오 상세 조회
      const videoIds = videos.map(v => v.id.videoId);
      const videoDetails = await this.youtubeApi.getVideos(videoIds);

      await job.progress(70);

      // 4. DB 저장
      for (const video of videoDetails) {
        await this.saveVideo(video, channelId);
      }

      await job.progress(90);

      // 5. 포인트 계산
      await this.pointsQueue.add('calculate-user-points', {
        userId,
        source: 'youtube'
      }, {
        priority: JobPriority.HIGH
      });

      await job.progress(100);

      return { success: true, videoCount: videos.length };

    } catch (error) {
      this.logger.error(`Failed to crawl channel ${channelId}: ${error.message}`);
      throw error;  // 재시도
    }
  }
}
```

**Job 옵션**:
```typescript
await this.queue.add('crawl-channel', jobData, {
  attempts: 3,                    // 최대 3회 재시도
  backoff: {
    type: 'exponential',
    delay: 60000                  // 1분부터 시작
  },
  removeOnComplete: true,         // 완료 시 제거
  removeOnFail: false,            // 실패 시 보관 (디버깅용)
  timeout: 300000,                // 5분 타임아웃
  priority: JobPriority.NORMAL
});
```

### 2.2 Job: `crawl-all-channels`

**목적**: 모든 인증된 채널 크롤링 트리거

**스케줄**: Cron (매일 00:00)

**Scheduler**:
```typescript
@Injectable()
export class YouTubeCronService {
  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  async scheduleDailyCrawl() {
    this.logger.log('Starting daily YouTube crawl...');

    const channels = await prisma.youtubeChannel.findMany({
      where: { isVerified: true }
    });

    // 배치로 Job 추가 (한 번에 10개씩)
    const chunks = chunk(channels, 10);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(channel =>
          this.queue.add('crawl-channel', {
            channelId: channel.channelId,
            userId: channel.userId
          }, {
            priority: JobPriority.NORMAL
          })
        )
      );

      // 10개씩 추가 후 10초 대기 (Rate Limit 회피)
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    this.logger.log(`Scheduled ${channels.length} crawl jobs`);
  }
}
```

---

## 3. 포인트 정산 Jobs

### 3.1 Job: `calculate-user-points`

**목적**: 사용자별 포인트 계산 (크롤링 완료 후)

**데이터**:
```typescript
interface CalculatePointsJobData {
  userId: string;
  source: 'youtube' | 'referral' | 'event';
  metadata?: any;
}
```

**Processor**:
```typescript
@Process('calculate-user-points')
async handleCalculatePoints(job: Job<CalculatePointsJobData>) {
  const { userId, source } = job.data;

  if (source === 'youtube') {
    // 유튜브 비디오 증가분 계산
    await this.calculateYouTubePoints(userId);
  } else if (source === 'referral') {
    // 레퍼럴 완료 체크
    await this.checkReferralCompletion(userId);
  } else if (source === 'event') {
    // 이벤트 참여 포인트
    await this.calculateEventPoints(userId);
  }

  // Redis 리더보드 업데이트
  await this.leaderboardService.updateCache(userId);

  return { success: true, userId };
}
```

### 3.2 Job: `daily-point-snapshot`

**목적**: 일별 포인트 히스토리 생성

**스케줄**: 매일 23:55 UTC+9

**Processor**:
```typescript
@Cron('55 23 * * *', { timeZone: 'Asia/Seoul' })
async createDailySnapshot() {
  const today = startOfDay(new Date());

  const users = await prisma.user.findMany({
    include: { points: true }
  });

  for (const user of users) {
    // 오늘 추가된 포인트 집계
    const todayTransactions = await prisma.pointTransaction.groupBy({
      by: ['category'],
      where: {
        userId: user.id,
        createdAt: {
          gte: today,
          lt: addDays(today, 1)
        }
      },
      _sum: { amount: true }
    });

    // point_history 생성
    await prisma.pointHistory.create({
      data: {
        userId: user.id,
        date: today,
        dayTotal: todayTransactions.reduce((sum, t) => sum + (t._sum.amount || 0), 0),
        contents: todayTransactions.find(t => t.category === 'CONTENT')?._sum.amount || 0,
        referral: todayTransactions.find(t => t.category === 'MGM')?._sum.amount || 0,
        event: todayTransactions.find(t => t.category === 'EVENT')?._sum.amount || 0,
        profit: (todayTransactions.find(t => t.category === 'PROFIT')?._sum.amount || 0) +
                (todayTransactions.find(t => t.category === 'SPONSOR')?._sum.amount || 0),
        boost: todayTransactions.find(t => t.category === 'BOOST')?._sum.amount || 0
      }
    });
  }

  this.logger.log(`Created daily snapshots for ${users.length} users`);
}
```

---

## 4. 알림 Jobs

### 4.1 Job: `send-notification`

**목적**: 사용자 알림 발송

**데이터**:
```typescript
interface SendNotificationJobData {
  userId: string;
  type: 'email' | 'push' | 'webhook';
  template: string;
  data: any;
}
```

**Processor**:
```typescript
@Process('send-notification')
async handleSendNotification(job: Job<SendNotificationJobData>) {
  const { userId, type, template, data } = job.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (type === 'email' && user.email) {
    await this.emailService.send(user.email, template, data);
  } else if (type === 'push') {
    // Push notification (향후 구현)
  } else if (type === 'webhook') {
    // Webhook 호출
  }

  return { success: true, userId };
}
```

### 4.2 알림 트리거

```typescript
// 레퍼럴 완료 시
this.notificationQueue.add('send-notification', {
  userId: referrerId,
  type: 'email',
  template: 'referral-completed',
  data: { refereeName: referee.xHandle, points: 2 }
}, {
  priority: JobPriority.HIGH
});

// NFT 발행 완료 시
this.notificationQueue.add('send-notification', {
  userId,
  type: 'email',
  template: 'nft-minted',
  data: { nftType: 'User Pass', tokenId }
}, {
  priority: JobPriority.NORMAL
});
```

---

## 5. 모니터링

### 5.1 Bull Board 설정

```typescript
// main.ts
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(youtubeCrawlQueue),
    new BullAdapter(pointsCalculationQueue),
    new BullAdapter(notificationsQueue),
    new BullAdapter(blockchainSyncQueue)
  ],
  serverAdapter
});

app.use('/admin/queues', serverAdapter.getRouter());
```

**접속**: `http://localhost:3000/admin/queues`

### 5.2 Queue 통계

```typescript
async getQueueStats(queueName: string): Promise<any> {
  const queue = this.getQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount()
  ]);

  return {
    queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
}
```

### 5.3 실패한 Job 재시도

```typescript
async retryFailedJobs(queueName: string): Promise<number> {
  const queue = this.getQueue(queueName);
  const failed = await queue.getFailed();

  for (const job of failed) {
    await job.retry();
  }

  return failed.length;
}
```

---

## 6. Job 테스트

### 6.1 단위 테스트

```typescript
describe('YouTubeProcessor', () => {
  it('should crawl channel successfully', async () => {
    const job = {
      data: {
        channelId: 'UC123',
        userId: 'user-id'
      },
      progress: jest.fn()
    } as any;

    const result = await processor.handleCrawlChannel(job);

    expect(result.success).toBe(true);
    expect(job.progress).toHaveBeenCalledWith(100);
  });
});
```

### 6.2 수동 Job 트리거 (테스트용)

```typescript
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class JobsController {
  @Post('youtube/crawl')
  async triggerYouTubeCrawl(@Body() body: { channelId: string }): Promise<any> {
    const job = await this.youtubeCrawlQueue.add('crawl-channel', {
      channelId: body.channelId,
      userId: 'admin-trigger'
    });

    return {
      jobId: job.id,
      status: 'queued'
    };
  }
}
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-07
**다음 업데이트**: Queue 구현 시작 시점
