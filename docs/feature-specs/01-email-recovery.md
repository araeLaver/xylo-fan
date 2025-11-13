# 📧 이메일 복구 시스템

> **우선순위**: 🔴 크리티컬
> **구현 주차**: Week 1
> **예상 작업 시간**: 8시간
> **의존성**: 이메일 발송 서비스 (SMTP)

---

## 📋 개요

### 목적
X(Twitter) 계정 없이도 XYLO 계정 복구 가능하도록 이메일 기반 인증 제공

### 사용자 시나리오
1. 사용자가 "Recover With Email" 클릭
2. 이메일 주소 입력
3. 6자리 인증번호 수신 (15분 유효)
4. 인증번호 입력 후 JWT 토큰 발급
5. 로그인 완료

### 화면기획 페이지
- Sign in_5: 이메일 입력
- Sign in_6: 6자리 인증번호 입력
- Sign in_7: 이메일 템플릿

---

## 🗄️ 데이터베이스 설계

### 마이그레이션 파일
`database/07-email-verification.sql`

```sql
-- ================================================
-- Migration 07: 이메일 인증 시스템
-- ================================================

CREATE TABLE IF NOT EXISTS xylo.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,

    -- 만료 관리
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,

    -- IP 추적 (보안)
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- 재발송 방지
    attempts INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_email_verification_email
    ON xylo.email_verification_codes(email);

CREATE INDEX idx_email_verification_code
    ON xylo.email_verification_codes(code)
    WHERE is_used = FALSE;

CREATE INDEX idx_email_verification_expires
    ON xylo.email_verification_codes(expires_at)
    WHERE is_used = FALSE;

-- 코멘트
COMMENT ON TABLE xylo.email_verification_codes IS '이메일 인증번호 관리';
COMMENT ON COLUMN xylo.email_verification_codes.code IS '6자리 숫자 인증번호';
COMMENT ON COLUMN xylo.email_verification_codes.expires_at IS '만료 시간 (발급 후 15분)';
COMMENT ON COLUMN xylo.email_verification_codes.attempts IS '검증 시도 횟수 (최대 3회)';

-- 자동 정리: 24시간 지난 레코드 삭제 (선택)
CREATE OR REPLACE FUNCTION xylo.cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM xylo.email_verification_codes
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 마이그레이션 기록
INSERT INTO xylo.system_configs (key, value, description, updated_at)
VALUES (
  'migration_07_applied',
  jsonb_build_object(
    'version', '07',
    'applied_at', NOW(),
    'description', 'Email verification system'
  ),
  'Migration 07: Email verification codes',
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = NOW();
```

---

## 🔌 API 설계

### 1. 인증번호 발송

**Endpoint**: `POST /api/v1/auth/email/send-code`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Validation** (`SendCodeDto`):
```typescript
export class SendCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

**Response** (성공):
```json
{
  "success": true,
  "message": "Verification code sent to user@example.com",
  "expiresIn": 900 // 15분 = 900초
}
```

**Response** (실패 - 이메일 미등록):
```json
{
  "statusCode": 404,
  "message": "No account found with this email",
  "error": "Not Found"
}
```

**Rate Limit**: 동일 이메일 1분당 1회

---

### 2. 인증번호 검증

**Endpoint**: `POST /api/v1/auth/email/verify-code`

**Request Body**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Validation** (`VerifyCodeDto`):
```typescript
export class VerifyCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}
```

**Response** (성공):
```json
{
  "success": true,
  "message": "Code verified successfully",
  "verificationId": "uuid-here"
}
```

**Response** (실패 - 잘못된 코드):
```json
{
  "statusCode": 400,
  "message": "Invalid verification code",
  "attemptsLeft": 2
}
```

**Response** (실패 - 만료):
```json
{
  "statusCode": 400,
  "message": "Verification code expired. Please request a new one."
}
```

**Response** (실패 - 시도 초과):
```json
{
  "statusCode": 429,
  "message": "Too many attempts. Please request a new code."
}
```

---

### 3. 계정 복구 (JWT 발급)

**Endpoint**: `POST /api/v1/auth/email/recover`

**Request Body**:
```json
{
  "verificationId": "uuid-here"
}
```

**Response** (성공):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "xHandle": "@username",
      "email": "user@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 💻 백엔드 구현

### 모듈 구조
```
backend/src/auth/
├── auth.module.ts (수정)
├── auth.controller.ts (수정)
├── auth.service.ts (수정)
├── email/
│   ├── email.module.ts
│   ├── email.service.ts
│   └── templates/
│       └── verification-code.html
└── dto/
    ├── send-code.dto.ts
    ├── verify-code.dto.ts
    └── recover-account.dto.ts
```

### 의존성 설치
```bash
npm install @nestjs-modules/mailer nodemailer
npm install -D @types/nodemailer
```

### 환경 변수 (`.env`)
```env
# SMTP 설정 (Gmail 예시)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@xylo.world
SMTP_PASS=your-app-password

# 발신자 정보
EMAIL_FROM=XYLO Fans <info@xylo.world>

# 인증 설정
VERIFICATION_CODE_EXPIRES_MINUTES=15
MAX_VERIFICATION_ATTEMPTS=3
```

---

### AuthService 구현

`backend/src/auth/auth.service.ts`에 추가:

```typescript
/**
 * 이메일로 인증번호 발송
 */
async sendVerificationCode(email: string, ipAddress?: string, userAgent?: string) {
  // 1. 이메일로 사용자 조회
  const user = await this.prisma.users.findFirst({
    where: { email }
  });

  if (!user) {
    throw new NotFoundException('No account found with this email');
  }

  // 2. 6자리 랜덤 숫자 생성
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. 만료 시간 설정 (15분 후)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  // 4. DB에 저장
  await this.prisma.email_verification_codes.create({
    data: {
      email,
      code,
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
    }
  });

  // 5. 이메일 발송
  await this.emailService.sendVerificationCode(email, code);

  return {
    success: true,
    message: `Verification code sent to ${email}`,
    expiresIn: 900 // 15분 = 900초
  };
}

/**
 * 인증번호 검증
 */
async verifyCode(email: string, code: string) {
  // 1. 인증번호 조회
  const verification = await this.prisma.email_verification_codes.findFirst({
    where: {
      email,
      code,
      is_used: false,
      expires_at: { gte: new Date() } // 만료되지 않음
    },
    orderBy: { created_at: 'desc' }
  });

  if (!verification) {
    // 시도 횟수 증가
    await this.prisma.email_verification_codes.updateMany({
      where: {
        email,
        is_used: false,
        expires_at: { gte: new Date() }
      },
      data: {
        attempts: { increment: 1 }
      }
    });

    throw new BadRequestException('Invalid verification code');
  }

  // 2. 시도 횟수 체크
  if (verification.attempts >= 3) {
    throw new BadRequestException('Too many attempts. Please request a new code.');
  }

  // 3. 인증번호 사용 처리
  await this.prisma.email_verification_codes.update({
    where: { id: verification.id },
    data: {
      is_used: true,
      used_at: new Date()
    }
  });

  return {
    success: true,
    message: 'Code verified successfully',
    verificationId: verification.id
  };
}

/**
 * 계정 복구 (JWT 발급)
 */
async recoverAccount(verificationId: string) {
  // 1. 인증번호 확인
  const verification = await this.prisma.email_verification_codes.findUnique({
    where: { id: verificationId }
  });

  if (!verification || !verification.is_used) {
    throw new BadRequestException('Invalid verification ID');
  }

  // 2. 사용자 조회
  const user = await this.prisma.users.findFirst({
    where: { email: verification.email }
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // 3. JWT 토큰 생성
  const token = this.generateToken(user);

  return {
    user: {
      id: user.id,
      xId: user.x_id,
      xHandle: user.x_handle,
      email: user.email,
    },
    accessToken: token
  };
}
```

---

### EmailService 구현

`backend/src/auth/email/email.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  /**
   * 인증번호 이메일 발송
   */
  async sendVerificationCode(email: string, code: string) {
    await this.mailerService.sendMail({
      to: email,
      from: this.configService.get('EMAIL_FROM'),
      subject: '[XYLO] Your Verification Code',
      html: this.getVerificationTemplate(code),
    });
  }

  /**
   * 이메일 템플릿
   */
  private getVerificationTemplate(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .code-box {
            background: #f4f4f4;
            border: 2px dashed #333;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 XYLO Fans</h1>
            <h2>Email Verification</h2>
          </div>

          <p>Your verification code is:</p>

          <div class="code-box">${code}</div>

          <p><strong>This code will expire in 15 minutes.</strong></p>

          <p>If you didn't request this code, please ignore this email.</p>

          <div class="footer">
            <p>© 2025 XYLO Fans. All rights reserved.</p>
            <p>This email was sent to you because you requested account recovery.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
```

---

### AuthController 추가

`backend/src/auth/auth.controller.ts`에 추가:

```typescript
/**
 * 이메일로 인증번호 발송
 * POST /api/v1/auth/email/send-code
 */
@Post('email/send-code')
@Throttle({ default: { limit: 1, ttl: 60000 } }) // 1분당 1회
async sendVerificationCode(
  @Body() dto: SendCodeDto,
  @Req() req: Request
) {
  return this.authService.sendVerificationCode(
    dto.email,
    req.ip,
    req.headers['user-agent']
  );
}

/**
 * 인증번호 검증
 * POST /api/v1/auth/email/verify-code
 */
@Post('email/verify-code')
async verifyCode(@Body() dto: VerifyCodeDto) {
  return this.authService.verifyCode(dto.email, dto.code);
}

/**
 * 계정 복구 (JWT 발급)
 * POST /api/v1/auth/email/recover
 */
@Post('email/recover')
async recoverAccount(@Body() dto: RecoverAccountDto) {
  return this.authService.recoverAccount(dto.verificationId);
}
```

---

## 🧪 테스트

### 통합 테스트 시나리오

```typescript
describe('Email Recovery (e2e)', () => {
  it('전체 플로우: 발송 → 검증 → 복구', async () => {
    // 1. 인증번호 발송
    const sendResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/send-code')
      .send({ email: 'test@example.com' })
      .expect(201);

    expect(sendResponse.body.success).toBe(true);

    // 2. DB에서 코드 확인 (테스트용)
    const code = await prisma.email_verification_codes.findFirst({
      where: { email: 'test@example.com' },
      orderBy: { created_at: 'desc' }
    });

    // 3. 인증번호 검증
    const verifyResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify-code')
      .send({ email: 'test@example.com', code: code.code })
      .expect(201);

    expect(verifyResponse.body.verificationId).toBeDefined();

    // 4. 계정 복구
    const recoverResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/email/recover')
      .send({ verificationId: verifyResponse.body.verificationId })
      .expect(201);

    expect(recoverResponse.body.accessToken).toBeDefined();
  });

  it('만료된 코드는 거부', async () => {
    // 만료된 코드 생성 (테스트용)
    await prisma.email_verification_codes.create({
      data: {
        email: 'test@example.com',
        code: '999999',
        expires_at: new Date('2020-01-01'), // 과거 날짜
      }
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/email/verify-code')
      .send({ email: 'test@example.com', code: '999999' })
      .expect(400);
  });
});
```

---

## 🔒 보안 고려사항

### 1. Rate Limiting
- **동일 이메일**: 1분당 1회 발송
- **동일 IP**: 1시간당 10회 발송

### 2. 시도 제한
- 인증번호 검증: 3회 실패 시 새 코드 요청 필요

### 3. IP/User-Agent 로깅
- 의심스러운 활동 추적용

### 4. 자동 정리
- 24시간 지난 인증번호 자동 삭제 (CRON Job)

---

## ✅ 체크리스트

- [ ] DB 마이그레이션 07 실행
- [ ] Prisma 스키마 pull & generate
- [ ] SMTP 설정 (.env)
- [ ] `@nestjs-modules/mailer` 설치
- [ ] EmailService 구현
- [ ] AuthService 메서드 추가
- [ ] AuthController 엔드포인트 추가
- [ ] DTO 생성 (SendCodeDto, VerifyCodeDto, RecoverAccountDto)
- [ ] Rate Limiting 설정
- [ ] 이메일 템플릿 디자인
- [ ] 통합 테스트 작성
- [ ] 빌드 테스트 통과
- [ ] Postman 테스트

---

**다음 문서**: `02-tutorial-flow.md`
