# XYLO 시스템 아키텍처

> 작성일: 2025-01-07
> 대상: 전체 개발팀
> 목적: 시스템 전체 구조 및 컴포넌트 간 통신 설계

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [아키텍처 다이어그램](#2-아키텍처-다이어그램)
3. [컴포넌트 상세](#3-컴포넌트-상세)
4. [데이터 플로우](#4-데이터-플로우)
5. [보안 설계](#5-보안-설계)
6. [확장성 전략](#6-확장성-전략)

---

## 1. 시스템 개요

### 1.1 전체 구조

XYLO는 **3-Tier 아키텍처** + **블록체인 레이어**로 구성됩니다.

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Web Frontend │  │ Admin Panel  │  │ Mobile (향후) │  │
│  │   React.js   │  │   Next.js    │  │ React Native │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS/REST API
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│                      ┌──────────────┐                    │
│                      │  NestJS API  │                    │
│                      │   Gateway    │                    │
│                      └──────────────┘                    │
│         ┌────────────────┼────────────────┐             │
│         ↓                ↓                ↓             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   Auth     │  │   Points   │  │ Blockchain │       │
│  │  Module    │  │   Module   │  │   Module   │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  YouTube   │  │ Leaderboard│  │   Events   │       │
│  │  Module    │  │   Module   │  │   Module   │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
        ↕                  ↕                  ↕
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │     Bull     │  │
│  │   (Koyeb)    │  │   (Cache)    │  │ (Job Queue)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ Web3/ethers.js
┌─────────────────────────────────────────────────────────┐
│                    Blockchain Layer                      │
│                  (Polygon Mumbai/Mainnet)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ XYLOUserPass │  │ XYLONFTCol-  │  │   RWAVault   │  │
│  │   (SBT)      │  │   lection    │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ API
┌─────────────────────────────────────────────────────────┐
│                   External Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ X (Twitter)  │  │  YouTube API │  │   Discord    │  │
│  │  OAuth 1.0a  │  │   Data v3    │  │   Webhooks   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택 요약

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **Frontend** | React.js + TypeScript | 18.x |
| **Backend** | NestJS + TypeScript | 11.x |
| **Database** | PostgreSQL (Koyeb) | 15 |
| **Cache** | Redis | 7 |
| **Queue** | Bull (Redis 기반) | 4.12.x |
| **Blockchain** | Solidity + ethers.js | 0.8.20 / 6.x |
| **Network** | Polygon Mumbai/Mainnet | 80001 / 137 |

---

## 2. 아키텍처 다이어그램

### 2.1 사용자 플로우 (회원가입)

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. "Continue with X" 클릭
     ↓
┌──────────────────┐
│  NestJS Auth     │
│  Module          │
└────┬─────────────┘
     │ 2. OAuth Request URL 생성
     ↓
┌──────────────────┐
│  X (Twitter)     │
│  OAuth Server    │
└────┬─────────────┘
     │ 3. 사용자 승인
     ↓
┌──────────────────┐
│  Callback        │
│  /auth/callback  │
└────┬─────────────┘
     │ 4. Access Token 발급
     ↓
┌──────────────────┐
│  PostgreSQL      │
│  users 테이블    │
└────┬─────────────┘
     │ 5. 계정 생성 + referralCode 발급
     ↓
┌──────────────────┐
│  X API           │
│  Post Tweet      │
└────┬─────────────┘
     │ 6. 자동 포스팅 (레퍼럴 링크 포함)
     ↓
┌──────────────────┐
│  JWT Token       │
│  Response        │
└──────────────────┘
```

### 2.2 포인트 계산 플로우

```
┌──────────────────┐
│  YouTube         │
│  Shorts 업로드   │
└────┬─────────────┘
     │ 매일 00:00 UTC+9
     ↓
┌──────────────────┐
│  Bull Queue      │
│  "youtube-crawl" │
└────┬─────────────┘
     │ Job 실행
     ↓
┌──────────────────┐
│  YouTube API v3  │
│  /videos.list    │
└────┬─────────────┘
     │ 비디오 정보 조회
     ↓
┌──────────────────┐
│  PostgreSQL      │
│  youtube_videos  │
│  + snapshots     │
└────┬─────────────┘
     │ 전날과 비교하여 증가분 계산
     ↓
┌──────────────────┐
│  Point           │
│  Calculation     │
└────┬─────────────┘
     │ 조회수 +100 → +1P
     │ 좋아요 +50  → +1P
     ↓
┌──────────────────┐
│  point_          │
│  transactions    │
└────┬─────────────┘
     │ INSERT INTO
     ↓
┌──────────────────┐
│  Trigger:        │
│  update_user_    │
│  points()        │
└────┬─────────────┘
     │ user_points 자동 업데이트
     ↓
┌──────────────────┐
│  Redis           │
│  Sorted Set      │
│  "leaderboard"   │
└────┬─────────────┘
     │ ZADD user:id score
     ↓
┌──────────────────┐
│  Blockchain      │
│  XYLOUserPass    │
└────┬─────────────┘
     │ updateSlotValue(tokenId, SLOT_CONTENT, newValue)
     ↓
┌──────────────────┐
│  Event Emitted   │
│  PointsUpdated   │
└──────────────────┘
```

### 2.3 NFT 발행 플로우

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. "Claim User Pass" 클릭
     ↓
┌──────────────────┐
│  Frontend        │
│  /nfts/prepare   │
└────┬─────────────┘
     │ 2. 메타데이터 요청
     ↓
┌──────────────────┐
│  Backend         │
│  NFT Module      │
└────┬─────────────┘
     │ 3. user_points 조회
     ↓
┌──────────────────┐
│  PostgreSQL      │
└────┬─────────────┘
     │ 4. 포인트 데이터 반환
     ↓
┌──────────────────┐
│  Metadata 생성   │
│  (attributes)    │
└────┬─────────────┘
     │ 5. contractAddress + metadata 반환
     ↓
┌──────────────────┐
│  Frontend        │
│  MetaMask 호출   │
└────┬─────────────┘
     │ 6. 사용자 서명
     ↓
┌──────────────────┐
│  XYLOUserPass    │
│  Contract        │
└────┬─────────────┘
     │ 7. mintUserPass(userAddress)
     │ 가스비 지불 ($0.05)
     ↓
┌──────────────────┐
│  Transaction     │
│  Confirmed       │
└────┬─────────────┘
     │ 8. txHash + tokenId
     ↓
┌──────────────────┐
│  Backend         │
│  /nfts/confirm   │
└────┬─────────────┘
     │ 9. user_nfts 저장
     ↓
┌──────────────────┐
│  PostgreSQL      │
│  user_nfts       │
└────┬─────────────┘
     │ 10. NFT 발행 완료
     ↓
┌──────────────────┐
│  Frontend        │
│  NFT 카드 표시   │
└──────────────────┘
```

---

## 3. 컴포넌트 상세

### 3.1 Backend Modules

#### Auth Module
```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwitterStrategy,
    JwtStrategy
  ]
})
export class AuthModule {}
```

**역할**:
- X(트위터) OAuth 1.0a 로그인
- JWT 토큰 발급/검증
- 이메일 인증 코드 발송
- 지갑 연동 서명 검증

#### YouTube Module
```typescript
@Module({
  imports: [BullModule.registerQueue({ name: 'youtube-crawl' })],
  controllers: [YouTubeController],
  providers: [
    YouTubeService,
    YouTubeProcessor,  // Bull Queue Processor
    YouTubeApiClient
  ]
})
export class YouTubeModule {}
```

**역할**:
- 채널 인증 (인증코드 방식)
- YouTube Data API v3 연동
- 숏츠 크롤링 (매일 00:00 스케줄링)
- 태그 기반 필터링 (#WITCHES, #XYLO)

#### Points Module
```typescript
@Module({
  imports: [RedisModule],
  controllers: [PointsController],
  providers: [
    PointsService,
    PointsCalculator,
    LeaderboardService
  ]
})
export class PointsModule {}
```

**역할**:
- 포인트 계산 (SLOT-01~06)
- point_transactions 기록
- user_points 집계
- Redis 리더보드 업데이트

#### Blockchain Module
```typescript
@Module({
  controllers: [BlockchainController],
  providers: [
    BlockchainService,
    SBTContractService,
    NFTContractService,
    VaultContractService,
    EthersProvider
  ]
})
export class BlockchainModule {}
```

**역할**:
- ethers.js 초기화
- 스마트 컨트랙트 호출
- 트랜잭션 모니터링
- 이벤트 리스닝

### 3.2 Database 연결

```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: ['query', 'info', 'warn', 'error']
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**환경변수 (DATABASE_URL)**:
```
postgresql://unble:password@ep-divine-bird-a1f4mly5.ap-southeast-1.pg.koyeb.app:5432/unble?schema=xylo&sslmode=require
```

### 3.3 Redis 캐싱

```typescript
// redis.config.ts
export const redisConfig: RedisModuleOptions = {
  config: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0
  }
};

// 사용 예시: 리더보드
async updateLeaderboard(userId: string, totalPoints: number) {
  await this.redis.zadd('leaderboard:all', totalPoints, userId);
  await this.redis.zadd('leaderboard:1d', totalPoints, userId);
  await this.redis.expire('leaderboard:1d', 86400); // 24시간
}

async getTop10() {
  return this.redis.zrevrange('leaderboard:all', 0, 9, 'WITHSCORES');
}
```

### 3.4 Bull Queue (작업 큐)

```typescript
// youtube.processor.ts
@Processor('youtube-crawl')
export class YouTubeProcessor {
  @Process('crawl-all-channels')
  async handleCrawl(job: Job) {
    const channels = await this.prisma.youtubeChannel.findMany({
      where: { isVerified: true }
    });

    for (const channel of channels) {
      await this.crawlChannelVideos(channel.channelId);
    }
  }

  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  async scheduleCrawl() {
    await this.queue.add('crawl-all-channels', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 }
    });
  }
}
```

---

## 4. 데이터 플로우

### 4.1 읽기 작업 (Read Path)

```
User Request → NestJS Controller → Service Layer
                                        ↓
                                  Redis Cache?
                                   ↙       ↘
                              Cache Hit   Cache Miss
                                 ↓           ↓
                              Return    PostgreSQL Query
                                           ↓
                                      Save to Cache
                                           ↓
                                        Return
```

**캐싱 전략**:
| 데이터 | TTL | 키 패턴 |
|--------|-----|---------|
| 리더보드 | 5분 | `leaderboard:{period}` |
| 사용자 프로필 | 1시간 | `user:{userId}:profile` |
| 유튜브 비디오 | 1시간 | `youtube:video:{videoId}` |
| NFT 메타데이터 | 24시간 | `nft:{tokenId}:metadata` |

### 4.2 쓰기 작업 (Write Path)

```
User Request → NestJS Controller → Service Layer
                                        ↓
                                  PostgreSQL Write
                                        ↓
                                  Invalidate Cache
                                        ↓
                                  Emit Event
                                   ↙       ↘
                          Redis Update   Blockchain Update
                                              (비동기)
```

**Write-Through 패턴**:
- DB 쓰기 성공 후 캐시 무효화
- 다음 읽기 요청 시 캐시 재구축

### 4.3 이벤트 기반 아키텍처

```typescript
// events/points-updated.event.ts
export class PointsUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly category: string,
    public readonly amount: number
  ) {}
}

// points.service.ts
async addPoints(userId: string, category: string, amount: number) {
  // 1. DB 업데이트
  await this.prisma.pointTransaction.create({ ... });

  // 2. 이벤트 발행
  this.eventEmitter.emit('points.updated', new PointsUpdatedEvent(
    userId, category, amount
  ));
}

// blockchain.listener.ts
@OnEvent('points.updated')
async handlePointsUpdated(event: PointsUpdatedEvent) {
  // SBT 업데이트 (비동기)
  const tokenId = await this.getTokenId(event.userId);
  const slot = this.getSlotByCategory(event.category);
  const newValue = await this.calculateNewValue(tokenId, slot);

  await this.sbtContract.updateSlotValue(tokenId, slot, newValue);
}
```

---

## 5. 보안 설계

### 5.1 인증/인가

```typescript
// JWT Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

// Role Guard
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// 사용 예시
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles('ADMIN')
  async getAllUsers() { ... }
}
```

### 5.2 Rate Limiting

```typescript
// rate-limit.config.ts
export const rateLimitConfig = {
  global: { ttl: 60, limit: 100 },      // 분당 100 요청
  auth: { ttl: 300, limit: 5 },         // 5분당 5 로그인 시도
  youtube: { ttl: 3600, limit: 1000 },  // 시간당 1000 YouTube API 호출
  blockchain: { ttl: 60, limit: 10 }    // 분당 10 트랜잭션
};

// main.ts
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
}));
```

### 5.3 입력 검증

```typescript
// DTOs with class-validator
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsEthereumAddress()
  @IsOptional()
  walletAddress?: string;
}

// Pipe
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
```

### 5.4 환경변수 관리

```bash
# .env (절대 Git에 커밋 금지!)
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# Twitter OAuth
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_CALLBACK_URL=

# YouTube
YOUTUBE_API_KEY=

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=0x...
SBT_CONTRACT_ADDRESS=0x...
NFT_CONTRACT_ADDRESS=0x...
VAULT_CONTRACT_ADDRESS=0x...
```

---

## 6. 확장성 전략

### 6.1 수평 확장 (Horizontal Scaling)

```
┌──────────┐
│   Load   │
│  Balancer│
└────┬─────┘
     │
     ├────→ NestJS Instance 1
     ├────→ NestJS Instance 2
     ├────→ NestJS Instance 3
     └────→ NestJS Instance N
           ↓
     ┌──────────┐
     │ Shared   │
     │ Redis    │
     └──────────┘
```

**무상태 설계 (Stateless)**:
- 세션은 Redis에 저장
- JWT 토큰 사용 (서버 메모리 불필요)
- Bull Queue는 Redis 기반 (인스턴스 간 공유)

### 6.2 데이터베이스 최적화

**Read Replica**:
```typescript
// prisma.service.ts
export class PrismaService {
  primary: PrismaClient;  // 쓰기
  replica: PrismaClient;  // 읽기

  async findMany(...) {
    return this.replica.user.findMany(...);  // Replica 사용
  }

  async create(...) {
    return this.primary.user.create(...);    // Primary 사용
  }
}
```

**Connection Pooling**:
```
DATABASE_URL=postgresql://...?connection_limit=20&pool_timeout=10
```

### 6.3 캐싱 계층

```
Layer 1: Browser Cache (Static Assets)
   ↓
Layer 2: CDN (Cloudflare)
   ↓
Layer 3: Redis (Application Cache)
   ↓
Layer 4: PostgreSQL (Source of Truth)
```

### 6.4 비동기 처리

**Bull Queue 활용**:
```typescript
// 무거운 작업은 Queue로 처리
await this.queue.add('send-email', { userId, type: 'welcome' });
await this.queue.add('update-blockchain', { tokenId, slotValues });
await this.queue.add('generate-report', { userId, period });
```

### 6.5 모니터링

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.blockchain.pingCheck('polygon')
    ]);
  }
}
```

**메트릭 수집**:
- **Prometheus** + **Grafana**: API 응답 시간, 에러율
- **Bull Board**: Queue 모니터링
- **PostgreSQL Logs**: 슬로우 쿼리 분석

---

## 7. 배포 아키텍처

### 7.1 개발 환경

```
Developer Machine
  ↓
Docker Compose
  ├── NestJS (localhost:3000)
  ├── PostgreSQL (localhost:5432)
  ├── Redis (localhost:6379)
  └── Hardhat Node (localhost:8545)
```

### 7.2 프로덕션 환경

```
┌─────────────────────────────────────────┐
│         Cloudflare (CDN + DDoS)         │
└───────────────┬─────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│    Load Balancer (Koyeb/Vercel)        │
└───────────────┬─────────────────────────┘
                ↓
        ┌───────┴───────┐
        ↓               ↓
┌───────────────┐ ┌───────────────┐
│ NestJS API 1  │ │ NestJS API 2  │
└───────────────┘ └───────────────┘
        ↓               ↓
┌───────────────────────────────┐
│   PostgreSQL (Koyeb Managed)  │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│   Redis (Upstash/Railway)     │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│ Polygon Mainnet (Alchemy RPC) │
└───────────────────────────────┘
```

---

**작성자**: Architecture Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
