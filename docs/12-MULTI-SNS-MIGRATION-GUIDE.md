# Multi-SNS 로그인 지원 마이그레이션 가이드

> 작성일: 2025-01-10
> 목적: Instagram, YouTube, Discord 로그인 지원
> 영향: DB 스키마, Auth 로직, JWT 토큰

---

## 📋 목차

1. [문제 상황](#1-문제-상황)
2. [DB 마이그레이션](#2-db-마이그레이션)
3. [코드 수정](#3-코드-수정)
4. [테스트 시나리오](#4-테스트-시나리오)
5. [롤백 계획](#5-롤백-계획)

---

## 1. 문제 상황

### 현재 설계의 한계

```sql
-- users 테이블이 X(Twitter) 전용
CREATE TABLE users (
  x_id VARCHAR(255) NOT NULL UNIQUE,  -- ❌ Instagram 로그인 불가
  x_handle VARCHAR(255) NOT NULL,     -- ❌ YouTube 로그인 불가
);
```

**문제점:**
- Instagram으로 가입 시 `x_id`가 없음 → NOT NULL 위반 → 가입 불가
- YouTube로 가입 시 `x_id`가 없음 → NOT NULL 위반 → 가입 불가
- JWT 토큰에 `xId` 하드코딩 → 다른 플랫폼 사용자 로그인 불가

---

## 2. DB 마이그레이션

### 실행 순서

```bash
# 1. DB 백업 (필수!)
pg_dump -h <host> -U <user> -d unble --schema=xylo > backup_xylo_$(date +%Y%m%d).sql

# 2. 마이그레이션 실행
psql -h <host> -U <user> -d unble -f database/04-multi-sns-support.sql

# 3. 검증
psql -h <host> -U <user> -d unble -c "
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'xylo' AND table_name = 'users'
  AND column_name IN ('x_id', 'x_handle', 'primary_platform')
ORDER BY ordinal_position;
"
```

### 변경 사항

| 항목 | Before | After |
|------|--------|-------|
| `users.x_id` | NOT NULL UNIQUE | **NULLABLE** UNIQUE |
| `users.x_handle` | NOT NULL | **NULLABLE** |
| `users.primary_platform` | (없음) | **NOT NULL** (NEW) |

---

## 3. 코드 수정

### 3.1 Prisma Schema 업데이트

```prisma
// backend/prisma/schema.prisma

model users {
  id                String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  x_id              String?          @unique @db.VarChar(255)  // ✅ nullable
  x_handle          String?          @db.VarChar(255)          // ✅ nullable
  x_display_name    String?          @db.VarChar(255)
  primary_platform  social_platform  @default(X)               // ✅ NEW
  // ... 나머지 컬럼
}
```

```bash
# Prisma 재생성
cd backend
npx prisma db pull  # DB에서 스키마 가져오기
npx prisma generate # 클라이언트 재생성
```

---

### 3.2 Auth Service 리팩토링

#### A. 플랫폼별 로그인 메서드 분리

```typescript
// backend/src/auth/auth.service.ts

/**
 * X(Twitter) OAuth 로그인
 */
async loginWithTwitter(twitterProfile: TwitterProfile) {
  return this.loginOrRegister('X', {
    platformId: twitterProfile.xId,
    handle: twitterProfile.xHandle,
    displayName: twitterProfile.xDisplayName,
    profileImage: twitterProfile.profileImageUrl,
    email: twitterProfile.email,
  });
}

/**
 * Instagram OAuth 로그인
 */
async loginWithInstagram(instagramProfile: InstagramProfile) {
  return this.loginOrRegister('INSTAGRAM', {
    platformId: instagramProfile.id,
    handle: instagramProfile.username,
    displayName: instagramProfile.fullName,
    profileImage: instagramProfile.profilePicture,
    email: instagramProfile.email,
  });
}

/**
 * YouTube OAuth 로그인
 */
async loginWithYouTube(youtubeProfile: YouTubeProfile) {
  return this.loginOrRegister('YOUTUBE', {
    platformId: youtubeProfile.id,
    handle: youtubeProfile.channelHandle,
    displayName: youtubeProfile.channelName,
    profileImage: youtubeProfile.thumbnailUrl,
    email: youtubeProfile.email,
  });
}
```

#### B. 통합 로그인 로직

```typescript
/**
 * 플랫폼 독립적인 로그인/가입 처리
 */
private async loginOrRegister(
  platform: 'X' | 'YOUTUBE' | 'INSTAGRAM' | 'DISCORD',
  profile: {
    platformId: string;
    handle?: string;
    displayName?: string;
    profileImage?: string;
    email?: string;
  }
) {
  // 1. social_accounts에서 기존 사용자 찾기
  let socialAccount = await this.prisma.social_accounts.findFirst({
    where: {
      platform: platform,
      account_id: profile.platformId,
    },
    include: { users: true },
  });

  let user;

  if (socialAccount) {
    // 기존 사용자
    user = socialAccount.users;

    // 소셜 계정 정보 업데이트
    await this.upsertSocialAccount(user.id, platform, profile);
  } else {
    // 신규 사용자 생성
    const referralCode = await this.generateUniqueReferralCode();

    // users 테이블 데이터 준비
    const userData: any = {
      referral_code: referralCode,
      primary_platform: platform,
      wallet_address: null,
    };

    // 플랫폼별 전용 컬럼 설정
    if (platform === 'X') {
      userData.x_id = profile.platformId;
      userData.x_handle = profile.handle;
      userData.x_display_name = profile.displayName;
      userData.profile_image_url = profile.profileImage;
      userData.email = profile.email;
    } else {
      // X가 아닌 경우 handle을 임시 프로필로 사용
      userData.x_handle = null;  // nullable
      userData.x_id = null;      // nullable
      userData.profile_image_url = profile.profileImage;
      userData.email = profile.email;
    }

    user = await this.prisma.users.create({
      data: userData,
    });

    // user_points 초기화
    await this.prisma.user_points.create({
      data: { user_id: user.id },
    });

    // social_accounts 생성
    await this.upsertSocialAccount(user.id, platform, profile);
  }

  // JWT 토큰 생성
  const token = this.generateToken(user, platform);

  return {
    user: this.formatUserResponse(user, platform),
    accessToken: token,
  };
}
```

#### C. JWT 토큰 수정

```typescript
/**
 * 플랫폼 독립적인 JWT 토큰 생성
 */
generateToken(user: any, platform: social_platform): string {
  const payload = {
    sub: user.id,
    platform: platform,  // ✅ 플랫폼 정보 추가
    // xId 제거 (플랫폼 독립적으로)
  };

  return this.jwtService.sign(payload);
}
```

#### D. 사용자 응답 포맷 수정

```typescript
/**
 * 플랫폼별 사용자 정보 포맷
 */
private formatUserResponse(user: any, platform: social_platform) {
  const baseInfo = {
    id: user.id,
    primaryPlatform: user.primary_platform || platform,
    walletAddress: user.wallet_address,
    referralCode: user.referral_code,
  };

  // 플랫폼별 추가 정보
  if (platform === 'X' || user.primary_platform === 'X') {
    return {
      ...baseInfo,
      xId: user.x_id,
      xHandle: user.x_handle,
      xDisplayName: user.x_display_name,
      profileImageUrl: user.profile_image_url,
      email: user.email,
    };
  } else {
    // Instagram, YouTube 등
    return {
      ...baseInfo,
      profileImageUrl: user.profile_image_url,
      email: user.email,
    };
  }
}
```

---

### 3.3 Users Service 수정

```typescript
// backend/src/users/users.service.ts

async getProfile(userId: string) {
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    include: {
      social_accounts: {
        where: { is_primary: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // primary_platform에 따라 응답 포맷
  const primaryAccount = user.social_accounts[0];

  return {
    id: user.id,
    primaryPlatform: user.primary_platform,
    handle: primaryAccount?.handle || user.x_handle,
    displayName: primaryAccount?.display_name || user.x_display_name,
    profileImageUrl: user.profile_image_url,
    email: user.email,
    walletAddress: user.wallet_address,
    referralCode: user.referral_code,
  };
}
```

---

### 3.4 Controller 추가

```typescript
// backend/src/auth/auth.controller.ts

// Instagram OAuth
@Get('instagram')
@UseGuards(AuthGuard('instagram'))
async instagramAuth() {
  // Passport가 처리
}

@Get('instagram/callback')
@UseGuards(AuthGuard('instagram'))
async instagramAuthCallback(@Req() req) {
  return this.authService.loginWithInstagram(req.user);
}

// YouTube OAuth
@Get('youtube')
@UseGuards(AuthGuard('youtube'))
async youtubeAuth() {
  // Passport가 처리
}

@Get('youtube/callback')
@UseGuards(AuthGuard('youtube'))
async youtubeAuthCallback(@Req() req) {
  return this.authService.loginWithYouTube(req.user);
}
```

---

## 4. 테스트 시나리오

### 4.1 X(Twitter) 로그인 (기존 사용자)

```bash
# 1. X로 로그인
curl -X GET http://localhost:3000/api/v1/auth/twitter

# 2. users 테이블 확인
SELECT id, x_id, primary_platform FROM xylo.users WHERE x_id = '<twitter_id>';

# 3. social_accounts 확인
SELECT * FROM xylo.social_accounts WHERE platform = 'X';
```

**예상 결과:**
- `primary_platform = 'X'`
- `x_id` 값 존재
- `social_accounts`에 X 계정 1건

---

### 4.2 Instagram 로그인 (신규 사용자)

```bash
# 1. Instagram으로 로그인
curl -X GET http://localhost:3000/api/v1/auth/instagram

# 2. users 테이블 확인
SELECT id, x_id, primary_platform FROM xylo.users
WHERE primary_platform = 'INSTAGRAM'
LIMIT 1;

# 3. social_accounts 확인
SELECT * FROM xylo.social_accounts
WHERE platform = 'INSTAGRAM';
```

**예상 결과:**
- `primary_platform = 'INSTAGRAM'`
- `x_id = NULL` ✅
- `social_accounts`에 INSTAGRAM 계정 1건 (is_primary = true)

---

### 4.3 멀티 플랫폼 연동

```bash
# 1. X로 가입
POST /api/v1/auth/twitter/callback

# 2. 같은 이메일로 Instagram 연동
POST /api/v1/auth/instagram/callback

# 3. social_accounts 확인
SELECT platform, is_primary FROM xylo.social_accounts
WHERE user_id = '<user_id>';
```

**예상 결과:**
```
platform   | is_primary
-----------+-----------
X          | true
INSTAGRAM  | false
```

---

## 5. 롤백 계획

### 문제 발생 시

```sql
-- 1. 트랜잭션으로 롤백
BEGIN;
\i database/04-multi-sns-support.sql  -- 롤백 스크립트 실행
COMMIT;

-- 2. Prisma 재생성
cd backend
npx prisma db pull
npx prisma generate

-- 3. 서버 재시작
npm run start:dev
```

---

## 6. 체크리스트

### DB 마이그레이션
- [ ] 프로덕션 DB 백업 완료
- [ ] `04-multi-sns-support.sql` 실행
- [ ] 검증 쿼리 통과

### 코드 수정
- [ ] Prisma schema 업데이트
- [ ] `auth.service.ts` 리팩토링
- [ ] `users.service.ts` 수정
- [ ] Instagram/YouTube Controller 추가

### 테스트
- [ ] X 로그인 정상 작동
- [ ] Instagram 로그인 정상 작동
- [ ] YouTube 로그인 정상 작동
- [ ] 멀티 플랫폼 연동 테스트

### 배포
- [ ] Staging 환경 배포 및 테스트
- [ ] Production 배포
- [ ] 모니터링 설정

---

**작성자**: Backend Team
**최종 업데이트**: 2025-01-10
**다음 업데이트**: 마이그레이션 완료 후
