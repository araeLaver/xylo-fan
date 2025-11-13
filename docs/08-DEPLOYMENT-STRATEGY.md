# XYLO 배포 전략 및 운영 가이드

> 작성일: 2025-01-07
> 대상: DevOps 팀, 운영팀
> 목적: 프로덕션 배포 및 운영 절차

---

## 📋 목차

1. [배포 환경](#1-배포-환경)
2. [CI/CD 파이프라인](#2-cicd-파이프라인)
3. [배포 절차](#3-배포-절차)
4. [모니터링](#4-모니터링)
5. [백업 및 복구](#5-백업-및-복구)
6. [보안](#6-보안)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. 배포 환경

### 1.1 환경 구성

| 환경 | 용도 | URL | 브랜치 |
|------|------|-----|--------|
| **Development** | 로컬 개발 | localhost:3000 | feature/* |
| **Staging** | 통합 테스트 | https://staging.xylomvp.world | develop |
| **Production** | 실제 운영 | https://xylomvp.world | main |

### 1.2 인프라 구성

```
┌─────────────────────────────────────────────┐
│            Cloudflare (CDN)                 │
│  - DDoS Protection                          │
│  - SSL/TLS Termination                      │
│  - Rate Limiting                            │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│         Load Balancer (Koyeb)               │
│  - Health Checks                            │
│  - Auto Scaling                             │
└──────────────────┬──────────────────────────┘
                   ↓
        ┌──────────┴──────────┐
        ↓                     ↓
┌────────────────┐    ┌────────────────┐
│  NestJS API 1  │    │  NestJS API 2  │
│   (Koyeb)      │    │   (Koyeb)      │
└────────────────┘    └────────────────┘
        ↓                     ↓
┌─────────────────────────────────────────────┐
│      PostgreSQL (Koyeb Managed)             │
│  - Master-Slave Replication                 │
│  - Automated Backups (Daily)                │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│         Redis (Upstash Managed)             │
│  - High Availability                        │
│  - Persistence (AOF)                        │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│       Polygon Mainnet (Alchemy RPC)         │
│  - Blockchain Nodes                         │
│  - Smart Contracts                          │
└─────────────────────────────────────────────┘
```

### 1.3 리소스 사양

#### Production (프로덕션)
- **Backend Instances**: 2개 (Auto-scaling: 2-4)
- **CPU**: 2 vCPU per instance
- **RAM**: 4GB per instance
- **PostgreSQL**: 20GB Storage, 4GB RAM
- **Redis**: 2GB Memory

#### Staging (스테이징)
- **Backend Instances**: 1개
- **CPU**: 1 vCPU
- **RAM**: 2GB
- **PostgreSQL**: 10GB Storage
- **Redis**: 1GB Memory

---

## 2. CI/CD 파이프라인

### 2.1 GitHub Actions Workflow

**.github/workflows/deploy-backend.yml**:
```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

env:
  NODE_VERSION: '18.20.0'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run linter
        working-directory: ./backend
        run: npm run lint

      - name: Run tests
        working-directory: ./backend
        run: npm test

      - name: Build
        working-directory: ./backend
        run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Koyeb Staging
        run: |
          curl -X POST https://app.koyeb.com/v1/deployments \
            -H "Authorization: Bearer ${{ secrets.KOYEB_API_TOKEN }}" \
            -d '{"service_id": "${{ secrets.STAGING_SERVICE_ID }}"}'

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Koyeb Production
        run: |
          curl -X POST https://app.koyeb.com/v1/deployments \
            -H "Authorization: Bearer ${{ secrets.KOYEB_API_TOKEN }}" \
            -d '{"service_id": "${{ secrets.PRODUCTION_SERVICE_ID }}"}'

      - name: Run database migrations
        run: |
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Slack Notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          text: 'Production deployment completed!'
```

### 2.2 Smart Contract Deployment

**.github/workflows/deploy-contracts.yml**:
```yaml
name: Deploy Smart Contracts

on:
  workflow_dispatch:
    inputs:
      network:
        description: 'Network to deploy to'
        required: true
        default: 'mumbai'
        type: choice
        options:
          - mumbai
          - polygon

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.20.0'

      - name: Install dependencies
        working-directory: ./contracts
        run: npm ci

      - name: Compile contracts
        working-directory: ./contracts
        run: npx hardhat compile

      - name: Deploy contracts
        working-directory: ./contracts
        run: |
          npx hardhat run scripts/deploy.ts --network ${{ github.event.inputs.network }}
        env:
          PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
          MUMBAI_RPC_URL: ${{ secrets.MUMBAI_RPC_URL }}
          POLYGON_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}

      - name: Verify contracts
        working-directory: ./contracts
        run: |
          npx hardhat verify --network ${{ github.event.inputs.network }} <CONTRACT_ADDRESS>
        env:
          POLYGONSCAN_API_KEY: ${{ secrets.POLYGONSCAN_API_KEY }}
```

---

## 3. 배포 절차

### 3.1 정기 배포 (Staging → Production)

#### Step 1: Staging 배포 (자동)
```bash
# develop 브랜치에 머지
git checkout develop
git pull origin develop
git merge feature/new-feature
git push origin develop

# GitHub Actions 자동 트리거
# - 테스트 실행
# - 빌드
# - Staging 환경 배포
```

#### Step 2: Staging 검증
```bash
# API Health Check
curl https://staging.xylomvp.world/health

# E2E 테스트
npm run test:e2e:staging

# 수동 테스트
# - 로그인 플로우
# - 유튜브 채널 인증
# - 포인트 적립
# - NFT 발행
```

#### Step 3: Production 배포 (자동)
```bash
# main 브랜치에 머지 (PR 승인 후)
git checkout main
git pull origin main
git merge develop
git push origin main

# GitHub Actions 자동 트리거
# - 테스트 실행
# - 빌드
# - Production 환경 배포
# - DB 마이그레이션
# - Slack 알림
```

#### Step 4: Production 검증
```bash
# Health Check
curl https://xylomvp.world/health

# Smoke Test
npm run test:smoke:production

# 모니터링 확인
# - Grafana 대시보드
# - Error Rate
# - Response Time
# - Active Users
```

### 3.2 핫픽스 배포 (긴급)

```bash
# 1. hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/critical-bug

# 2. 버그 수정
# ... 코드 수정 ...

# 3. 테스트
npm test

# 4. main에 직접 머지
git checkout main
git merge hotfix/critical-bug
git push origin main

# 5. develop에도 반영
git checkout develop
git merge hotfix/critical-bug
git push origin develop

# 6. 태그 생성
git tag -a v1.0.1 -m "Hotfix: Critical bug"
git push origin v1.0.1
```

### 3.3 롤백 절차

```bash
# 1. 이전 버전으로 롤백 (Koyeb)
curl -X POST https://app.koyeb.com/v1/services/<SERVICE_ID>/rollback \
  -H "Authorization: Bearer $KOYEB_API_TOKEN"

# 2. DB 마이그레이션 롤백
npx prisma migrate rollback

# 3. 스마트 컨트랙트 (Pausable)
npx hardhat run scripts/pause-contracts.ts --network polygon
```

---

## 4. 모니터링

### 4.1 애플리케이션 모니터링

#### Prometheus + Grafana
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'xylo-backend'
    static_configs:
      - targets: ['api.xylomvp.world:3000']
    metrics_path: '/metrics'

  - job_name: 'xylo-postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'xylo-redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

**주요 메트릭**:
- `http_request_duration_seconds`: API 응답 시간
- `http_request_total`: 총 요청 수
- `http_request_errors_total`: 에러 수
- `db_query_duration_seconds`: DB 쿼리 시간
- `redis_cache_hit_rate`: Redis 캐시 히트율

#### Grafana 대시보드
```json
{
  "dashboard": {
    "title": "XYLO Production Metrics",
    "panels": [
      {
        "title": "API Response Time (p95)",
        "query": "histogram_quantile(0.95, http_request_duration_seconds)"
      },
      {
        "title": "Error Rate",
        "query": "rate(http_request_errors_total[5m])"
      },
      {
        "title": "Active Users",
        "query": "count(active_sessions)"
      }
    ]
  }
}
```

### 4.2 로그 관리

#### NestJS Winston Logger
```typescript
// logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});
```

#### 로그 수집 (ELK Stack)
```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/xylo/*.log
    json.keys_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### 4.3 알림 설정

#### Slack Webhooks
```typescript
// alert.service.ts
async sendAlert(level: 'info' | 'warning' | 'error', message: string) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `[${level.toUpperCase()}] ${message}`,
    channel: level === 'error' ? '#alerts' : '#monitoring'
  });
}
```

**알림 트리거**:
- API Error Rate > 5%
- Response Time (p95) > 2초
- CPU Usage > 80%
- Memory Usage > 90%
- DB Connection Pool > 80%
- Smart Contract Event (NFT 발행, Vault 입금 등)

---

## 5. 백업 및 복구

### 5.1 데이터베이스 백업

#### 자동 백업 (Daily)
```bash
# Koyeb Managed Backups (자동)
# - 매일 03:00 UTC
# - 보관 기간: 30일
# - S3에 저장
```

#### 수동 백업
```bash
# 전체 DB 백업
pg_dump -h $DB_HOST -U $DB_USER -d unble -n xylo > backup-$(date +%Y%m%d).sql

# 압축
gzip backup-$(date +%Y%m%d).sql

# S3 업로드
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://xylo-backups/
```

### 5.2 복구 절차

```bash
# 1. DB 복구
gunzip backup-20250107.sql.gz
psql -h $DB_HOST -U $DB_USER -d unble -n xylo < backup-20250107.sql

# 2. Redis 복구 (AOF)
redis-cli --rdb /path/to/dump.rdb

# 3. 애플리케이션 재시작
curl -X POST https://app.koyeb.com/v1/services/<SERVICE_ID>/restart
```

### 5.3 재해 복구 계획 (Disaster Recovery)

**RTO (Recovery Time Objective)**: 4시간
**RPO (Recovery Point Objective)**: 24시간

```
재해 발생
  ↓
1. 상황 평가 (15분)
   - 영향 범위 확인
   - 팀 소집
  ↓
2. 백업 복구 (2시간)
   - 최신 백업 확인
   - DB 복구
   - Redis 복구
  ↓
3. 애플리케이션 재배포 (1시간)
   - 새 인스턴스 생성
   - 컨테이너 배포
   - Health Check
  ↓
4. 검증 및 모니터링 (1시간)
   - E2E 테스트
   - 사용자 알림
   - 모니터링 강화
```

---

## 6. 보안

### 6.1 환경변수 관리

```bash
# GitHub Secrets 사용
# Settings → Secrets and variables → Actions

# 필수 Secrets:
KOYEB_API_TOKEN
DATABASE_URL
JWT_SECRET
TWITTER_CONSUMER_KEY
TWITTER_CONSUMER_SECRET
YOUTUBE_API_KEY
PRIVATE_KEY (Blockchain)
SLACK_WEBHOOK_URL
```

### 6.2 SSL/TLS 인증서

```bash
# Cloudflare SSL (자동)
# - Full (strict) 모드
# - HSTS 활성화
# - TLS 1.3

# Let's Encrypt (Koyeb 자동)
```

### 6.3 Rate Limiting

```typescript
// main.ts
import rateLimit from 'express-rate-limit';

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 최대 100 요청
    message: 'Too many requests from this IP'
  })
);
```

### 6.4 보안 헤더

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 7. 트러블슈팅

### 7.1 일반적인 문제

#### API 응답 지연
```bash
# 원인 파악
# 1. DB 쿼리 확인
SELECT * FROM pg_stat_activity WHERE state = 'active';

# 2. Redis 연결 확인
redis-cli ping

# 3. 캐시 워밍
curl -X POST https://api.xylomvp.world/admin/cache/warm

# 4. 인덱스 확인
\d+ xylo.users
```

#### 메모리 부족
```bash
# 1. 메모리 사용량 확인
free -h

# 2. 프로세스별 메모리
ps aux --sort=-%mem | head -10

# 3. 스케일 업
# Koyeb Dashboard → Instance Type 변경
```

#### Smart Contract 에러
```bash
# 1. 이벤트 로그 확인
npx hardhat run scripts/check-events.ts --network polygon

# 2. 가스비 확인
curl https://gasstation-mainnet.matic.network

# 3. 컨트랙트 Pause
npx hardhat run scripts/pause-contract.ts --network polygon
```

### 7.2 긴급 대응 절차

```
1. 장애 감지 (Grafana Alert)
   ↓
2. Slack #alerts 채널 알림
   ↓
3. 온콜 엔지니어 확인 (15분 이내)
   ↓
4. 원인 파악 및 조치
   ├─ DB 문제 → Rollback 고려
   ├─ API 문제 → 롤백
   └─ 외부 API → Fallback 모드
   ↓
5. 상황 공지 (Status Page)
   ↓
6. 문제 해결
   ↓
7. Post-Mortem 작성
```

---

## 8. 체크리스트

### 8.1 배포 전 체크리스트

- [ ] 모든 테스트 통과 (Unit + E2E)
- [ ] ESLint/Prettier 통과
- [ ] 환경변수 확인
- [ ] DB 마이그레이션 스크립트 검증
- [ ] 롤백 계획 수립
- [ ] 팀원 공지

### 8.2 배포 후 체크리스트

- [ ] Health Check API 확인
- [ ] Smoke Test 실행
- [ ] Grafana 대시보드 확인
- [ ] Error Rate 모니터링 (30분)
- [ ] 사용자 피드백 확인
- [ ] 배포 결과 문서화

---

**작성자**: DevOps Team
**최종 업데이트**: 2025-01-07
**문서 버전**: 1.0
