# XYLO DB 설계 검토 및 평가

> 📅 검토일: 2025-11-12
> 🎯 목적: 현재 DB 스키마의 품질 평가 및 개선사항 제안

---

## 📊 전체 평가

### 종합 점수: **85/100** ⭐⭐⭐⭐☆

| 항목 | 점수 | 평가 |
|------|------|------|
| **테이블 구조** | 90/100 | ✅ 우수 |
| **정규화** | 85/100 | ✅ 양호 |
| **인덱스 전략** | 95/100 | ✅ 매우 우수 |
| **제약조건** | 80/100 | ⚠️ 보완 필요 |
| **데이터 타입** | 90/100 | ✅ 우수 |
| **확장성** | 90/100 | ✅ 우수 |
| **성능 고려** | 85/100 | ✅ 양호 |
| **보안** | 70/100 | ⚠️ 개선 필요 |

---

## ✅ 잘 설계된 부분

### 1. 인덱스 전략 (95점)

**매우 우수한 인덱스 설계:**

```sql
-- users 테이블
@@index([primary_platform], map: "idx_users_primary_platform")
@@index([has_completed_tutorial], map: "idx_users_tutorial_completed")

-- youtube_videos 테이블
@@index([channel_id])
@@index([published_at(sort: Desc)])
@@index([tags], type: Gin)  -- ✅ GIN 인덱스로 배열 검색 최적화
@@index([is_posted_to_x])

-- point_transactions
@@index([user_id, created_at(sort: Desc)])  -- ✅ 복합 인덱스
@@index([category])

-- leaderboard_entries
@@unique([period, rank, snapshot_date])  -- ✅ 복합 UNIQUE
@@index([period, rank])
```

**장점:**
- ✅ 쿼리 패턴에 맞는 인덱스
- ✅ 정렬 방향 지정 (Desc)
- ✅ GIN 인덱스로 배열 검색 최적화
- ✅ 복합 인덱스 적절히 사용

---

### 2. CASCADE 관계 (90점)

**외래키 CASCADE 설정이 완벽함:**

```prisma
// 사용자 삭제 시 모든 관련 데이터 자동 삭제
users (삭제)
  ↓ CASCADE
  ├─ user_points (자동 삭제)
  ├─ youtube_channels (자동 삭제)
  │    ↓ CASCADE
  │    └─ youtube_videos (자동 삭제)
  │         ↓ CASCADE
  │         └─ youtube_video_snapshots (자동 삭제)
  ├─ point_transactions (자동 삭제)
  ├─ referrals (자동 삭제)
  ├─ user_nfts (자동 삭제)
  └─ x_posted_content (자동 삭제)
```

**장점:**
- ✅ 데이터 정합성 보장
- ✅ 고아 레코드 방지
- ✅ 트랜잭션 간소화

---

### 3. UNIQUE 제약 조건 (90점)

```prisma
// 중복 방지가 완벽함
users {
  x_id                 @unique  // X 계정 중복 방지
  email                @unique  // 이메일 중복 방지
  wallet_address       @unique  // 지갑 주소 중복 방지
  referral_code        @unique  // 추천 코드 중복 방지
}

youtube_channels {
  channel_id           @unique  // 채널 중복 방지
  verification_code    @unique  // 인증 코드 중복 방지
}

youtube_videos {
  video_id             @unique  // 비디오 중복 방지
}

// 복합 UNIQUE (중복 조합 방지)
referrals {
  @@unique([referrer_id, referee_id])  // 동일인 재추천 방지
}

social_accounts {
  @@unique([user_id, platform, account_id])  // 동일 SNS 재연동 방지
}

point_history {
  @@unique([user_id, date])  // 일별 포인트 기록 중복 방지
}
```

---

### 4. 타임스탬프 관리 (85점)

```prisma
// 거의 모든 테이블에 타임스탬프
{
  created_at DateTime @default(now())
  updated_at DateTime @default(now())
}

// 특정 이벤트 추적
{
  joined_at DateTime              // 가입일
  verified_at DateTime?           // 인증일
  completed_at DateTime?          // 완료일
  posted_at DateTime?             // 포스팅일
  last_calculated DateTime        // 마지막 계산일
}
```

**장점:**
- ✅ 모든 데이터 변경 추적 가능
- ✅ 비즈니스 이벤트 타임스탬프 명확

---

### 5. NULL 처리 (90점)

```prisma
// 필수 vs 선택 필드 명확히 구분
users {
  id              String   // NOT NULL (필수)
  x_id            String?  // NULLABLE (선택)
  email           String?  // NULLABLE (선택)
  referral_code   String   // NOT NULL (필수)
}
```

**장점:**
- ✅ 비즈니스 로직 명확
- ✅ NULL 허용 여부 일관성 있음

---

### 6. Enum 사용 (95점)

```prisma
enum social_platform {
  X
  YOUTUBE
  INSTAGRAM
  DISCORD
}

enum point_category {
  CONTENT
  REFERRAL
  EVENT
  PROFIT
  BOOST
}

enum post_status {
  PENDING
  PROCESSING
  POSTED
  FAILED
  CANCELLED
}

enum nft_type {
  SBT
  TIER
  REWARD
  CONNECTION
}
```

**장점:**
- ✅ 타입 안정성
- ✅ 잘못된 값 입력 방지
- ✅ DB 레벨 제약

---

### 7. 확장성 (90점)

**멀티 플랫폼 확장 대비:**

```prisma
// users 테이블
primary_platform  social_platform @default(X)

// social_accounts 테이블 (여러 SNS 연동 가능)
social_accounts {
  user_id   String
  platform  social_platform  // X, YOUTUBE, INSTAGRAM, DISCORD
  // ...
}
```

**장점:**
- ✅ 멀티 SNS 로그인 준비 완료
- ✅ 플랫폼 추가가 쉬움

---

## ⚠️ 개선이 필요한 부분

### 1. 보안 관련 (70점) - **중요!**

#### 문제 1: Access Token 평문 저장 위험

```prisma
users {
  // ❌ 문제: OAuth 토큰이 DB 스키마에 없음
  // 토큰을 어디에 저장하고 있는지 불명확
}
```

**권장 사항:**
```prisma
users {
  x_access_token         String?    // 암호화 필요
  x_refresh_token        String?    // 암호화 필요
  x_token_expires_at     DateTime?
  x_token_encrypted      Boolean?   @default(true)
}
```

**구현:**
```typescript
// 토큰 암호화 저장
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptToken(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encryptedText) + decipher.final('utf8');
}
```

---

#### 문제 2: 이메일 인증 코드 보안

```prisma
email_verification_codes {
  code       String  @db.VarChar(6)  // ❌ 평문 저장
}
```

**권장 사항:**
```prisma
email_verification_codes {
  code_hash  String  @db.VarChar(64)  // SHA-256 해시
}
```

---

### 2. 제약조건 누락 (80점)

#### 문제 1: CHECK 제약 없음

```sql
-- ❌ 문제: 음수 값 방지 제약 없음
user_points {
  total_points    Int  -- 음수 가능?
  slot_01_content Int  -- 음수 가능?
}

youtube_channels {
  subscriber_count Int?  -- 음수 가능?
  video_count      Int?  -- 음수 가능?
}
```

**권장 추가:**
```sql
ALTER TABLE user_points
ADD CONSTRAINT check_total_points_positive
CHECK (total_points >= 0);

ALTER TABLE user_points
ADD CONSTRAINT check_slot_01_positive
CHECK (slot_01_content >= 0);

ALTER TABLE youtube_channels
ADD CONSTRAINT check_subscriber_count_positive
CHECK (subscriber_count >= 0);
```

---

#### 문제 2: 날짜 제약 없음

```sql
-- ❌ 문제: 미래 날짜 방지 제약 없음
users {
  joined_at  DateTime  -- 미래 날짜 가능?
}

youtube_videos {
  published_at DateTime?  -- 미래 날짜 가능?
}
```

**권장 추가:**
```sql
ALTER TABLE users
ADD CONSTRAINT check_joined_at_past
CHECK (joined_at <= NOW());
```

---

#### 문제 3: 문자열 길이 제약 부족

```prisma
users {
  x_handle        String?  @db.VarChar(255)  // ❌ 너무 김 (X는 최대 15자)
}
```

**권장 수정:**
```prisma
users {
  x_handle        String?  @db.VarChar(15)  // ✅ X 규격에 맞춤
}
```

---

### 3. 정규화 문제 (85점)

#### 문제 1: 중복 데이터

```prisma
leaderboard_entries {
  channel_title     String?  // ❌ youtube_channels에 이미 있음
  channel_image_url String?  // ❌ 중복
  x_handle          String?  // ❌ users에 이미 있음
  profile_image_url String?  // ❌ 중복
}
```

**분석:**
- 스냅샷 목적이므로 의도적 비정규화
- 성능을 위한 트레이드오프
- ✅ 허용 가능 (읽기 최적화)

**단, 주의사항:**
```typescript
// 데이터 동기화 로직 필요
async updateLeaderboard(userId: string) {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
  });

  // 리더보드의 중복 데이터도 업데이트
  await this.prisma.leaderboard_entries.updateMany({
    where: { user_id: userId },
    data: {
      x_handle: user.x_handle,
      profile_image_url: user.profile_image_url,
    },
  });
}
```

---

#### 문제 2: JSON 필드 과다 사용

```prisma
point_transactions {
  metadata  Json?  // ❌ 검색/인덱스 불가
}

user_nfts {
  metadata  Json?  // ❌ 쿼리 어려움
}

x_post_queue {
  metadata  Json?
}
```

**문제점:**
- 검색 불가
- 인덱스 불가
- 타입 안정성 없음

**권장:**
```prisma
// 자주 검색하는 필드는 컬럼으로 분리
point_transactions {
  metadata          Json?
  video_id          String?  @db.Uuid  // ✅ 메타데이터에서 분리
  youtube_channel_id String?  @db.Uuid
}
```

---

### 4. 누락된 인덱스 (85점)

#### 추가 권장 인덱스:

```prisma
// 1. users 테이블
users {
  @@index([email])  // 이메일 검색
  @@index([x_handle])  // 핸들 검색
  @@index([created_at(sort: Desc)])  // 최신 가입자 조회
}

// 2. referrals 테이블
referrals {
  @@index([created_at(sort: Desc)])  // 최근 추천 조회
  @@index([referrer_id, is_completed])  // 완료된 추천 조회
}

// 3. x_posted_content 테이블
x_posted_content {
  @@index([like_count(sort: Desc)])  // 인기 포스트 조회
  @@index([impression_count(sort: Desc)])  // 노출 많은 포스트
}
```

---

### 5. 데이터 타입 개선 (90점)

#### 문제 1: BigInt vs Int 혼용

```prisma
youtube_channels {
  view_count  BigInt?  @default(0)  // ✅ BigInt
}

youtube_videos {
  view_count  Int?     @default(0)  // ❌ Int (BigInt 권장)
}
```

**권장 수정:**
```prisma
youtube_videos {
  view_count  BigInt?  @default(0)  // ✅ 일관성
}
```

---

#### 문제 2: VARCHAR 길이 최적화

```prisma
users {
  x_id  String?  @db.VarChar(255)  // ❌ 너무 김 (숫자 ID는 최대 20자)
}

youtube_videos {
  video_id  String  @unique @db.VarChar(255)  // ❌ YouTube ID는 11자
}
```

**권장 수정:**
```prisma
users {
  x_id  String?  @db.VarChar(20)  // ✅ 최적화
}

youtube_videos {
  video_id  String  @unique @db.VarChar(11)  // ✅ YouTube 규격
}
```

---

### 6. 트랜잭션 고려 (85점)

#### 문제: 포인트 업데이트 동시성 제어

```prisma
user_points {
  total_points  Int
  // ❌ 동시 업데이트 시 race condition 가능
}
```

**권장:**
```sql
-- Optimistic Locking
ALTER TABLE user_points
ADD COLUMN version INT NOT NULL DEFAULT 0;

-- 업데이트 시
UPDATE user_points
SET total_points = total_points + 100,
    version = version + 1
WHERE user_id = $1 AND version = $2;
```

**또는 Prisma 트랜잭션:**
```typescript
await this.prisma.$transaction(async (tx) => {
  const current = await tx.user_points.findUnique({
    where: { user_id: userId },
  });

  await tx.user_points.update({
    where: { user_id: userId },
    data: {
      total_points: current.total_points + amount,
    },
  });
});
```

---

## 📋 우선순위별 개선 사항

### 🔴 High Priority (즉시 수정 권장)

1. **OAuth 토큰 암호화 저장**
   ```prisma
   users {
     x_access_token         String?
     x_refresh_token        String?
     x_token_expires_at     DateTime?
   }
   ```

2. **CHECK 제약 조건 추가**
   ```sql
   ALTER TABLE user_points
   ADD CONSTRAINT check_total_points_positive
   CHECK (total_points >= 0);
   ```

3. **VARCHAR 길이 최적화**
   ```prisma
   x_id      String?  @db.VarChar(20)  -- 255 → 20
   video_id  String   @db.VarChar(11)  -- 255 → 11
   ```

---

### 🟡 Medium Priority (가능한 빨리)

4. **인덱스 추가**
   ```prisma
   @@index([email])
   @@index([x_handle])
   @@index([created_at(sort: Desc)])
   ```

5. **BigInt 일관성**
   ```prisma
   view_count  BigInt?  @default(0)  // 모든 카운트 BigInt로
   ```

6. **포인트 동시성 제어**
   ```prisma
   user_points {
     version  Int  @default(0)
   }
   ```

---

### 🟢 Low Priority (여유 있을 때)

7. **metadata JSON → 컬럼 분리**
   - 자주 검색하는 필드만

8. **soft delete 고려**
   ```prisma
   users {
     deleted_at  DateTime?
   }
   ```

9. **파티셔닝 고려** (데이터 증가 시)
   ```sql
   -- 날짜별 파티션
   CREATE TABLE point_history_2025_01
   PARTITION OF point_history
   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
   ```

---

## 📊 테이블별 평가

| 테이블 | 점수 | 주요 이슈 |
|--------|------|-----------|
| **users** | 85/100 | 토큰 암호화 필요, VARCHAR 최적화 |
| **user_points** | 90/100 | CHECK 제약 추가, 동시성 제어 |
| **youtube_channels** | 95/100 | ✅ 우수 |
| **youtube_videos** | 90/100 | BigInt 일관성, VARCHAR 최적화 |
| **leaderboard_entries** | 95/100 | ✅ 우수 (의도적 비정규화) |
| **referrals** | 90/100 | 인덱스 추가 권장 |
| **point_transactions** | 85/100 | JSON → 컬럼 분리 고려 |
| **social_accounts** | 95/100 | ✅ 우수 |
| **user_nfts** | 90/100 | ✅ 양호 |
| **x_post_queue** | 90/100 | ✅ 양호 |
| **x_posted_content** | 90/100 | 인덱스 추가 권장 |

---

## 🎯 결론

### 전반적인 평가:
**✅ 매우 양호한 설계 (85/100)**

### 강점:
1. ✅ **인덱스 전략이 탁월함** (95점)
2. ✅ **CASCADE 관계 완벽함** (90점)
3. ✅ **확장성 고려 우수** (90점)
4. ✅ **Enum 활용 적절** (95점)
5. ✅ **UNIQUE 제약 완벽** (90점)

### 약점:
1. ⚠️ **보안 강화 필요** (70점) - OAuth 토큰 암호화
2. ⚠️ **CHECK 제약 부족** (80점) - 음수 방지 등
3. ⚠️ **VARCHAR 길이 최적화** - 공간 낭비

### 종합:
**프로덕션에 사용 가능하나, 보안 관련 개선 사항은 반드시 적용 권장**

---

## 🔧 즉시 적용 가능한 마이그레이션

```sql
-- 1. CHECK 제약 추가
ALTER TABLE xylo.user_points
ADD CONSTRAINT check_total_points_positive CHECK (total_points >= 0),
ADD CONSTRAINT check_slot_01_positive CHECK (slot_01_content >= 0),
ADD CONSTRAINT check_slot_02_positive CHECK (slot_02_mgm >= 0),
ADD CONSTRAINT check_slot_03_positive CHECK (slot_03_event >= 0),
ADD CONSTRAINT check_slot_04_positive CHECK (slot_04_profit >= 0),
ADD CONSTRAINT check_slot_05_positive CHECK (slot_05_sponsor >= 0),
ADD CONSTRAINT check_slot_06_positive CHECK (slot_06_boost >= 0),
ADD CONSTRAINT check_sbt_value_positive CHECK (sbt_value >= 0);

-- 2. 인덱스 추가
CREATE INDEX idx_users_email ON xylo.users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_x_handle ON xylo.users(x_handle) WHERE x_handle IS NOT NULL;
CREATE INDEX idx_users_created_at ON xylo.users(created_at DESC);

-- 3. 토큰 필드 추가
ALTER TABLE xylo.users
ADD COLUMN x_access_token TEXT,
ADD COLUMN x_refresh_token TEXT,
ADD COLUMN x_token_expires_at TIMESTAMPTZ;

-- 4. 동시성 제어 버전 필드
ALTER TABLE xylo.user_points
ADD COLUMN version INT NOT NULL DEFAULT 0;
```

---

## 📚 참고 자료

- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [Index Design Guidelines](https://use-the-index-luke.com/)
