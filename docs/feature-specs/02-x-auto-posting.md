# X(Twitter) 자동 포스팅 구현 가이드

> 📅 작성일: 2025-11-12
> 🎯 목적: YouTube 쇼츠 영상을 X(Twitter)에 자동으로 포스팅하는 시스템 구현

## 목차
1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [구현 단계](#구현-단계)
4. [코드 구현](#코드-구현)
5. [테스트 방법](#테스트-방법)
6. [주의사항](#주의사항)

---

## 개요

### 요구사항
- YouTube 쇼츠 영상이 업로드되면 자동으로 X에 포스팅
- 사용자별 OAuth 토큰으로 개별 계정에 포스팅
- 포스팅 실패 시 재시도 로직
- 포스팅 히스토리 관리

### 핵심 기능
1. **자동 포스팅**: YouTube 쇼츠 → X 트윗
2. **큐 시스템**: 대량 포스팅 시 순차 처리
3. **OAuth 관리**: 사용자별 토큰 저장/갱신
4. **포스팅 기록**: 성공/실패 로그

---

## 시스템 아키텍처

```
┌─────────────────┐
│ YouTube Shorts  │
│   Upload Event  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Posting Queue  │  ← Bull Queue (Redis)
│   (PENDING)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ X Posting Job   │  ← BullMQ Worker
│   Processor     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  X API v2       │  ← twitter-api-v2
│  (OAuth 2.0)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Posted Content  │  ← DB 저장
│   (SUCCESS)     │
└─────────────────┘
```

---

## 구현 단계

### 1단계: X API 설정

#### 1.1 Developer Portal 설정
```
https://developer.twitter.com/en/portal/dashboard
```

**필요한 권한:**
- ✅ Read and write tweets
- ✅ Read and write direct messages (선택)
- ✅ Upload media (썸네일/이미지 포함 시)

#### 1.2 OAuth 2.0 설정
```env
# .env 파일
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
X_CALLBACK_URL=http://localhost:3001/api/v1/auth/x/callback
```

#### 1.3 App Permissions
- **App Type**: Web App, Native App
- **OAuth 2.0**: Enabled
- **Callback URL**: 설정 필수

---

### 2단계: OAuth 토큰 저장

#### 2.1 DB 스키마 (이미 준비됨)
```sql
-- users 테이블에 OAuth 토큰 필드 추가
ALTER TABLE xylo.users ADD COLUMN IF NOT EXISTS x_access_token TEXT;
ALTER TABLE xylo.users ADD COLUMN IF NOT EXISTS x_refresh_token TEXT;
ALTER TABLE xylo.users ADD COLUMN IF NOT EXISTS x_token_expires_at TIMESTAMPTZ;
```

#### 2.2 토큰 저장 로직
사용자가 X 로그인 시 OAuth 토큰을 DB에 저장:

```typescript
// auth.service.ts
async saveXTokens(userId: string, tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);

  await this.prisma.users.update({
    where: { id: userId },
    data: {
      x_access_token: tokens.accessToken,
      x_refresh_token: tokens.refreshToken,
      x_token_expires_at: expiresAt,
    },
  });
}
```

---

### 3단계: X Posting 모듈 생성

#### 3.1 모듈 구조
```
src/x-posting/
├── x-posting.module.ts
├── x-posting.service.ts
├── x-posting.controller.ts
├── processors/
│   └── x-posting.processor.ts
└── dto/
    └── create-post.dto.ts
```

#### 3.2 의존성
```bash
npm install twitter-api-v2  # 이미 설치됨
```

---

### 4단계: 포스팅 로직 구현

#### 4.1 X Client 초기화
```typescript
// x-posting.service.ts
import { TwitterApi } from 'twitter-api-v2';

private async getXClient(userId: string): Promise<TwitterApi> {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    select: {
      x_access_token: true,
      x_refresh_token: true,
      x_token_expires_at: true,
    },
  });

  if (!user?.x_access_token) {
    throw new Error('X token not found. Please login with X first.');
  }

  // 토큰 만료 체크
  if (new Date() >= user.x_token_expires_at) {
    // 토큰 갱신 로직
    await this.refreshXToken(userId, user.x_refresh_token);
    return this.getXClient(userId); // 재귀 호출
  }

  // X API Client 생성
  const client = new TwitterApi(user.x_access_token);
  return client;
}
```

#### 4.2 트윗 생성
```typescript
async postToX(userId: string, content: {
  text: string;
  videoUrl?: string;
  mediaUrl?: string;
}) {
  const client = await this.getXClient(userId);

  try {
    // 텍스트만 포스팅
    if (!content.mediaUrl && !content.videoUrl) {
      const tweet = await client.v2.tweet(content.text);
      return tweet.data;
    }

    // 미디어 포함 포스팅
    const mediaIds: string[] = [];

    // 이미지 업로드
    if (content.mediaUrl) {
      const mediaId = await this.uploadMedia(client, content.mediaUrl);
      mediaIds.push(mediaId);
    }

    // 트윗 생성 (미디어 포함)
    const tweet = await client.v2.tweet({
      text: content.text,
      media: { media_ids: mediaIds },
    });

    return tweet.data;
  } catch (error) {
    this.logger.error(`[X Posting] 실패: ${error.message}`);
    throw error;
  }
}
```

#### 4.3 미디어 업로드
```typescript
private async uploadMedia(
  client: TwitterApi,
  mediaUrl: string
): Promise<string> {
  // 미디어 다운로드
  const response = await fetch(mediaUrl);
  const buffer = await response.buffer();

  // X에 업로드
  const mediaId = await client.v1.uploadMedia(buffer, {
    mimeType: response.headers.get('content-type'),
  });

  return mediaId;
}
```

---

### 5단계: Bull Queue 설정

#### 5.1 큐 등록
```typescript
// x-posting.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'x-posting',
    }),
  ],
  // ...
})
export class XPostingModule {}
```

#### 5.2 Job 추가
```typescript
// x-posting.service.ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

constructor(
  @InjectQueue('x-posting') private xPostingQueue: Queue,
) {}

async addToPostingQueue(data: {
  userId: string;
  videoId: string;
  text: string;
}) {
  // DB에 큐 엔트리 생성
  const queueEntry = await this.prisma.x_post_queue.create({
    data: {
      user_id: data.userId,
      video_id: data.videoId,
      post_content: data.text,
      status: 'PENDING',
    },
  });

  // Bull Queue에 Job 추가
  await this.xPostingQueue.add('post-to-x', {
    queueId: queueEntry.id,
    userId: data.userId,
    text: data.text,
  }, {
    attempts: 3, // 3번 재시도
    backoff: {
      type: 'exponential',
      delay: 5000, // 5초 후 재시도
    },
  });

  return queueEntry;
}
```

#### 5.3 Processor 구현
```typescript
// processors/x-posting.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('x-posting')
export class XPostingProcessor {
  constructor(
    private readonly xPostingService: XPostingService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('post-to-x')
  async handlePostToX(job: Job) {
    const { queueId, userId, text } = job.data;

    this.logger.log(`[X Posting] Processing job ${job.id} for queue ${queueId}`);

    try {
      // X에 포스팅
      const tweet = await this.xPostingService.postToX(userId, { text });

      // DB 큐 상태 업데이트 (SUCCESS)
      await this.prisma.x_post_queue.update({
        where: { id: queueId },
        data: {
          status: 'SUCCESS',
          processed_at: new Date(),
        },
      });

      // 포스팅 완료 기록 저장
      await this.prisma.x_posted_content.create({
        data: {
          user_id: userId,
          x_post_id: tweet.id, // Tweet ID
          x_post_url: `https://twitter.com/i/web/status/${tweet.id}`,
          post_content: text,
          posted_at: new Date(),
        },
      });

      this.logger.log(`[X Posting] ✓ Success: ${tweet.id}`);
      return { success: true, tweetId: tweet.id };

    } catch (error) {
      this.logger.error(`[X Posting] ✗ Failed: ${error.message}`);

      // 최종 실패 시 (모든 재시도 완료 후)
      if (job.attemptsMade >= job.opts.attempts) {
        await this.prisma.x_post_queue.update({
          where: { id: queueId },
          data: {
            status: 'FAILED',
            error_message: error.message,
            processed_at: new Date(),
          },
        });
      }

      throw error; // Bull이 자동 재시도
    }
  }
}
```

---

### 6단계: YouTube 연동

#### 6.1 쇼츠 업로드 시 자동 포스팅
```typescript
// youtube.service.ts
async onShortsUploaded(videoId: string, userId: string) {
  // 비디오 정보 조회
  const video = await this.prisma.youtube_videos.findUnique({
    where: { video_id: videoId },
    include: {
      youtube_channels: {
        include: {
          users: true,
        },
      },
    },
  });

  // 포스팅 텍스트 생성
  const text = this.generatePostText(video);

  // X 포스팅 큐에 추가
  await this.xPostingService.addToPostingQueue({
    userId,
    videoId,
    text,
  });
}

private generatePostText(video: any): string {
  return `
🎬 New Short: ${video.title}

#Shorts #XYLO #WITCHES
${video.url}
`.trim();
}
```

---

### 7단계: API 엔드포인트

#### 7.1 수동 포스팅 API
```typescript
// x-posting.controller.ts
@Post('post')
@UseGuards(JwtAuthGuard)
async createPost(
  @Request() req,
  @Body() dto: CreatePostDto,
) {
  const userId = req.user.userId;

  // 포스팅 큐에 추가
  const queueEntry = await this.xPostingService.addToPostingQueue({
    userId,
    videoId: dto.videoId,
    text: dto.text,
  });

  return {
    success: true,
    queueId: queueEntry.id,
    status: 'PENDING',
    message: '포스팅 큐에 추가되었습니다.',
  };
}
```

#### 7.2 포스팅 상태 조회
```typescript
@Get('status/:queueId')
@UseGuards(JwtAuthGuard)
async getPostingStatus(@Param('queueId') queueId: string) {
  const queueEntry = await this.prisma.x_post_queue.findUnique({
    where: { id: queueId },
  });

  return queueEntry;
}
```

#### 7.3 포스팅 히스토리
```typescript
@Get('history')
@UseGuards(JwtAuthGuard)
async getPostingHistory(@Request() req) {
  const userId = req.user.userId;

  const posts = await this.prisma.x_posted_content.findMany({
    where: { user_id: userId },
    orderBy: { posted_at: 'desc' },
    take: 50,
  });

  return posts;
}
```

---

## 토큰 갱신 (Refresh Token)

### OAuth 2.0 Refresh Logic
```typescript
private async refreshXToken(
  userId: string,
  refreshToken: string
): Promise<void> {
  const client = new TwitterApi({
    clientId: this.configService.get('X_CLIENT_ID'),
    clientSecret: this.configService.get('X_CLIENT_SECRET'),
  });

  try {
    // 토큰 갱신
    const { accessToken, refreshToken: newRefreshToken, expiresIn } =
      await client.refreshOAuth2Token(refreshToken);

    // DB 업데이트
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        x_access_token: accessToken,
        x_refresh_token: newRefreshToken,
        x_token_expires_at: expiresAt,
      },
    });

    this.logger.log(`[X Token] ✓ 토큰 갱신 완료: ${userId}`);
  } catch (error) {
    this.logger.error(`[X Token] ✗ 갱신 실패: ${error.message}`);
    throw new Error('X 토큰 갱신 실패. 재로그인이 필요합니다.');
  }
}
```

---

## 테스트 방법

### 1. 수동 포스팅 테스트
```bash
curl -X POST http://localhost:3001/api/v1/x-posting/post \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "abc123",
    "text": "Test post from XYLO! #Shorts"
  }'
```

### 2. 큐 상태 확인
```bash
curl http://localhost:3001/api/v1/x-posting/status/{queueId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Redis 큐 확인
```bash
# Redis CLI
redis-cli

# 큐 확인
KEYS bull:x-posting:*

# Job 상태 확인
GET bull:x-posting:1
```

### 4. DB 확인
```sql
-- 포스팅 큐 상태
SELECT * FROM xylo.x_post_queue
ORDER BY created_at DESC LIMIT 10;

-- 포스팅 완료 기록
SELECT * FROM xylo.x_posted_content
ORDER BY posted_at DESC LIMIT 10;

-- 사용자 토큰 확인
SELECT id, x_handle, x_token_expires_at
FROM xylo.users
WHERE x_access_token IS NOT NULL;
```

---

## 주의사항

### 1. Rate Limits
X API v2 Rate Limits:
- **Tweet creation**: 50 requests / 15분 (사용자당)
- **Media upload**: 500 requests / 15분

**대응 방법:**
```typescript
// 사용자별 Rate Limit 체크
private async checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:x:post:${userId}`;
  const count = await this.redis.get(key);

  if (count && parseInt(count) >= 50) {
    throw new TooManyRequestsException(
      'X 포스팅 제한 초과. 15분 후 재시도하세요.'
    );
  }

  // 카운터 증가
  await this.redis.incr(key);
  await this.redis.expire(key, 15 * 60); // 15분

  return true;
}
```

### 2. 에러 처리
```typescript
// X API 에러 핸들링
try {
  await client.v2.tweet(text);
} catch (error) {
  if (error.code === 429) {
    // Rate Limit 초과
    throw new TooManyRequestsException('Rate limit exceeded');
  } else if (error.code === 403) {
    // 권한 없음 (토큰 만료 등)
    throw new UnauthorizedException('X token expired. Please re-login.');
  } else if (error.code === 401) {
    // 인증 실패
    throw new UnauthorizedException('Invalid X credentials');
  } else {
    // 기타 에러
    throw new InternalServerErrorException(`X API Error: ${error.message}`);
  }
}
```

### 3. 보안
- ✅ Access Token을 DB에 암호화하여 저장 (고려 사항)
- ✅ Refresh Token은 절대 클라이언트에 노출 금지
- ✅ HTTPS 필수 (프로덕션)
- ✅ Rate Limit 준수

### 4. 모니터링
```typescript
// 포스팅 성공률 모니터링
async getPostingStats(userId: string) {
  const stats = await this.prisma.x_post_queue.groupBy({
    by: ['status'],
    where: { user_id: userId },
    _count: true,
  });

  return {
    total: stats.reduce((sum, s) => sum + s._count, 0),
    success: stats.find(s => s.status === 'SUCCESS')?._count || 0,
    failed: stats.find(s => s.status === 'FAILED')?._count || 0,
    pending: stats.find(s => s.status === 'PENDING')?._count || 0,
  };
}
```

---

## 추가 기능 (선택 사항)

### 1. 예약 포스팅
```typescript
async schedulePost(userId: string, data: {
  text: string;
  scheduledAt: Date;
}) {
  await this.xPostingQueue.add('post-to-x', data, {
    delay: data.scheduledAt.getTime() - Date.now(),
  });
}
```

### 2. 스레드 포스팅 (Thread)
```typescript
async postThread(userId: string, tweets: string[]) {
  const client = await this.getXClient(userId);

  let previousTweetId: string | undefined;

  for (const text of tweets) {
    const tweet = await client.v2.tweet({
      text,
      reply: previousTweetId ? { in_reply_to_tweet_id: previousTweetId } : undefined,
    });
    previousTweetId = tweet.data.id;
  }
}
```

### 3. 트윗 삭제
```typescript
async deletePost(userId: string, tweetId: string) {
  const client = await this.getXClient(userId);
  await client.v2.deleteTweet(tweetId);

  // DB 업데이트
  await this.prisma.x_posted_content.update({
    where: { x_post_id: tweetId },
    data: { is_deleted: true },
  });
}
```

---

## 다음 단계

1. ✅ X Posting 모듈 생성
2. ✅ OAuth 토큰 저장 로직 구현
3. ✅ Bull Queue Processor 구현
4. ✅ API 엔드포인트 추가
5. ⏳ YouTube 쇼츠 업로드 이벤트 연동
6. ⏳ 테스트 및 디버깅
7. ⏳ 프로덕션 배포

---

## 참고 자료

- [X API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [twitter-api-v2 npm](https://www.npmjs.com/package/twitter-api-v2)
- [NestJS Bull Queue](https://docs.nestjs.com/techniques/queues)
- [OAuth 2.0 Flow](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
