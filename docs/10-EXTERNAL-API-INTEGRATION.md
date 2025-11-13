# XYLO 외부 API 통합 가이드

> 작성일: 2025-01-07
> 대상: 백엔드 개발자
> 목적: Twitter, YouTube, Discord API 연동 실무 가이드

---

## 📋 목차

1. [X (Twitter) API](#1-x-twitter-api)
2. [YouTube Data API v3](#2-youtube-data-api-v3)
3. [Discord Webhooks](#3-discord-webhooks)
4. [에러 핸들링](#4-에러-핸들링)
5. [Rate Limiting 전략](#5-rate-limiting-전략)

---

## 1. X (Twitter) API

### 1.1 OAuth 1.0a 로그인

**필요한 패키지**:
```bash
npm install passport-twitter
npm install @types/passport-twitter --save-dev
```

**환경변수**:
```bash
TWITTER_CONSUMER_KEY=your_consumer_key
TWITTER_CONSUMER_SECRET=your_consumer_secret
TWITTER_CALLBACK_URL=http://localhost:3000/api/v1/auth/twitter/callback
```

**Passport Strategy**:
```typescript
// twitter.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor() {
    super({
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      includeEmail: true
    });
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: any
  ): Promise<any> {
    return {
      xId: profile.id,
      xHandle: profile.username,
      xDisplayName: profile.displayName,
      profileImageUrl: profile.photos?.[0]?.value,
      email: profile.emails?.[0]?.value,
      token,
      tokenSecret
    };
  }
}
```

### 1.2 자동 포스팅

**Twitter API v2 사용**:
```typescript
import axios from 'axios';

async autoTweet(userId: string, referralCode: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const tweetText = `XYLO × WITCHES
Own your Idol, On your XYLO

@Xylo_Token is identifying a variety of RWA products using its RWA tokenization engine.

Just claimed my social channel and I'm accumulating points in real-time
Share news, Get rewards!

Claim yours
https://xylomvp.world/referral/${referralCode}`;

  try {
    await axios.post(
      'https://api.twitter.com/2/tweets',
      { text: tweetText },
      {
        headers: {
          Authorization: `Bearer ${user.twitterAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    this.logger.log(`Auto tweet posted for user ${userId}`);
  } catch (error) {
    this.logger.error(`Failed to post tweet: ${error.message}`);
    throw new ServiceUnavailableException('Failed to post tweet');
  }
}
```

**Rate Limit**: 50 tweets/15분 (사용자당)

---

## 2. YouTube Data API v3

### 2.1 API Client 설정

**필요한 패키지**:
```bash
npm install googleapis
```

**환경변수**:
```bash
YOUTUBE_API_KEY=AIzaSy...
```

**Client 초기화**:
```typescript
import { google, youtube_v3 } from 'googleapis';

@Injectable()
export class YouTubeApiClient {
  private youtube: youtube_v3.Youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  async getChannelInfo(channelId: string): Promise<any> {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [channelId]
    });

    return response.data.items?.[0];
  }

  async searchVideos(params: {
    channelId: string;
    publishedAfter: Date;
    maxResults: number;
  }): Promise<any[]> {
    const response = await this.youtube.search.list({
      part: ['id', 'snippet'],
      channelId: params.channelId,
      publishedAfter: params.publishedAfter.toISOString(),
      maxResults: params.maxResults,
      type: ['video'],
      order: 'date'
    });

    return response.data.items || [];
  }

  async getVideos(videoIds: string[]): Promise<any[]> {
    const response = await this.youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: videoIds
    });

    return response.data.items || [];
  }
}
```

### 2.2 Quota 관리 (매우 중요!)

**YouTube API Quota**: 10,000 units/day

| 작업 | Cost |
|------|------|
| channels.list | 1 unit |
| search.list | 100 units |
| videos.list | 1 unit |

**최적화 전략**:
1. **캐싱**: 1시간 TTL
2. **배치 처리**: videos.list는 최대 50개씩
3. **스케줄링**: 매일 1회만 (00:00)
4. **선택적 크롤링**: 인증된 채널만

```typescript
async getCachedChannelInfo(channelId: string): Promise<any> {
  // 1. Redis 캐시 확인
  const cacheKey = `youtube:channel:${channelId}`;
  const cached = await this.redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // 2. API 호출
  const data = await this.youtubeApi.getChannelInfo(channelId);

  // 3. 캐시 저장 (1시간)
  await this.redis.setex(cacheKey, 3600, JSON.stringify(data));

  return data;
}
```

### 2.3 에러 처리

```typescript
try {
  const videos = await this.youtube.search.list({ ... });
} catch (error) {
  if (error.code === 403) {
    if (error.message.includes('quota')) {
      // Quota 초과
      throw new ServiceUnavailableException('YouTube API quota exceeded');
    } else {
      // API Key 문제
      throw new UnauthorizedException('Invalid YouTube API key');
    }
  }

  if (error.code === 404) {
    throw new NotFoundException('YouTube channel not found');
  }

  throw new InternalServerErrorException('YouTube API error');
}
```

---

## 3. Discord Webhooks

### 3.1 Webhook 수신 설정

**엔드포인트**:
```typescript
@Controller('webhooks/discord')
export class DiscordWebhookController {
  @Post('joined')
  async handleMemberJoined(@Body() body: DiscordWebhookPayload): Promise<void> {
    const { user_id, guild_id, username } = body;

    // 1. Discord ID로 XYLO 사용자 찾기 (이메일 연동 전제)
    const user = await this.findUserByDiscordId(user_id);

    if (!user) {
      this.logger.warn(`Discord user ${user_id} not linked to XYLO account`);
      return;
    }

    // 2. Social Account 연동
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountId: {
          userId: user.id,
          platform: 'DISCORD',
          accountId: user_id
        }
      },
      create: {
        userId: user.id,
        platform: 'DISCORD',
        accountId: user_id,
        handle: username,
        isVerified: true
      },
      update: {
        isVerified: true
      }
    });

    // 3. Referral 조건 체크
    this.eventEmitter.emit('discord.joined', { userId: user.id });
  }
}
```

### 3.2 Discord Bot 명령어 (선택)

```typescript
// Discord 봇으로 /link 명령어 처리
@Injectable()
export class DiscordBotService {
  private client: Client;

  constructor() {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === 'link') {
        const email = interaction.options.getString('email');

        // 이메일로 유저 조회
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          await interaction.reply('이메일이 등록되지 않았습니다.');
          return;
        }

        // Discord 계정 연동
        await prisma.socialAccount.create({
          data: {
            userId: user.id,
            platform: 'DISCORD',
            accountId: interaction.user.id,
            handle: interaction.user.username,
            isVerified: true
          }
        });

        await interaction.reply('XYLO 계정 연동 완료!');
      }
    });

    this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}
```

---

## 4. 에러 핸들링

### 4.1 외부 API 에러 분류

```typescript
export enum ExternalApiError {
  // Twitter
  TWITTER_RATE_LIMIT = 'TWITTER_RATE_LIMIT',
  TWITTER_AUTH_FAILED = 'TWITTER_AUTH_FAILED',
  TWITTER_API_DOWN = 'TWITTER_API_DOWN',

  // YouTube
  YOUTUBE_QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED',
  YOUTUBE_INVALID_KEY = 'YOUTUBE_INVALID_KEY',
  YOUTUBE_CHANNEL_NOT_FOUND = 'YOUTUBE_CHANNEL_NOT_FOUND',

  // Discord
  DISCORD_WEBHOOK_FAILED = 'DISCORD_WEBHOOK_FAILED'
}
```

### 4.2 Retry 전략

```typescript
import { retry } from 'rxjs/operators';
import { timer } from 'rxjs';

async callExternalApi<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Rate Limit은 재시도
      if (error.code === 429) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        this.logger.warn(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 다른 에러는 즉시 throw
      throw error;
    }
  }
}
```

### 4.3 Fallback 모드

```typescript
async getChannelInfoWithFallback(channelId: string): Promise<any> {
  try {
    // 1차: YouTube API
    return await this.youtubeApi.getChannelInfo(channelId);
  } catch (error) {
    if (error.code === 403 && error.message.includes('quota')) {
      // 2차: 캐시된 데이터 사용
      const cached = await this.redis.get(`youtube:channel:${channelId}`);
      if (cached) {
        this.logger.warn('Using cached data due to quota limit');
        return JSON.parse(cached);
      }

      // 3차: DB에 저장된 마지막 정보
      const dbData = await prisma.youtubeChannel.findUnique({
        where: { channelId }
      });

      if (dbData) {
        this.logger.warn('Using database data due to quota limit');
        return dbData;
      }

      throw new ServiceUnavailableException('YouTube API unavailable');
    }

    throw error;
  }
}
```

---

## 5. Rate Limiting 전략

### 5.1 API별 제한

| API | 제한 | 전략 |
|-----|------|------|
| **Twitter OAuth** | 15 requests/15분 (앱당) | 큐잉 |
| **Twitter Post** | 50 tweets/15분 (사용자당) | 사용자별 캐운터 |
| **YouTube API** | 10,000 units/day | Quota 모니터링 + 캐싱 |
| **Discord Webhook** | 5 requests/초 | Bull Queue |

### 5.2 Redis 기반 Rate Limiter

```typescript
async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const current = await this.redis.incr(key);

  if (current === 1) {
    await this.redis.expire(key, window);
  }

  return current <= limit;
}

// 사용 예시
async postTweet(userId: string, text: string): Promise<void> {
  const key = `ratelimit:twitter:post:${userId}`;
  const allowed = await this.checkRateLimit(key, 50, 900); // 15분

  if (!allowed) {
    throw new TooManyRequestsException('Twitter posting rate limit exceeded');
  }

  await this.twitter.post(text);
}
```

### 5.3 YouTube API Quota 모니터링

```typescript
async trackYouTubeQuota(operation: string, cost: number): Promise<void> {
  const key = 'youtube:quota:daily';
  const used = await this.redis.incrby(key, cost);

  // 첫 사용 시 자정에 만료
  if (used === cost) {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    await this.redis.expire(key, ttl);
  }

  this.logger.log(`YouTube quota used: ${used}/10000`);

  if (used >= 10000) {
    throw new ServiceUnavailableException('YouTube API daily quota exceeded');
  }
}

// 사용 예시
async searchVideos(params: any): Promise<any[]> {
  await this.trackYouTubeQuota('search.list', 100);
  return await this.youtube.search.list(params);
}
```

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-07
**다음 업데이트**: API 구현 완료 후
