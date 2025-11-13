import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { randomBytes } from 'crypto';

/**
 * 인증 서비스
 *
 * 역할:
 * - Twitter OAuth 로그인/회원가입 처리
 * - JWT 토큰 생성 및 검증
 * - 추천 코드 생성
 * - Social Account 연동 관리
 *
 * 확장 가능:
 * - Instagram, YouTube, Discord OAuth (DB 준비 완료)
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  /**
   * 고유한 추천 코드 생성 (6자리 영숫자)
   *
   * @returns {Promise<string>} 생성된 추천 코드 (예: "A3X9K2")
   *
   * 로직:
   * 1. A-Z, 0-9 조합으로 6자리 랜덤 생성
   * 2. DB에서 중복 체크
   * 3. 중복이면 재생성, 유니크하면 반환
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;

    // 중복되지 않는 코드를 찾을 때까지 반복
    while (!isUnique) {
      code = '';
      // 6자리 랜덤 생성
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // DB에서 중복 확인
      const existing = await this.prisma.users.findUnique({
        where: { referral_code: code },
      });

      // 중복되지 않으면 종료
      if (!existing) {
        isUnique = true;
      }
    }

    return code;
  }

  /**
   * Twitter OAuth 로그인 또는 회원가입
   *
   * @param {object} twitterProfile - Passport Twitter 전략에서 전달받은 프로필
   * @returns {Promise<{user, accessToken}>} 사용자 정보 + JWT 토큰
   *
   * 플로우:
   * 1. x_id로 기존 사용자 조회
   * 2-A. 기존 사용자 → 프로필 정보 업데이트 + social_accounts 업데이트
   * 2-B. 신규 사용자 → users 생성 + user_points 초기화 + social_accounts 생성
   * 3. JWT 토큰 생성 및 반환
   */
  async loginOrRegister(twitterProfile: {
    xId: string;
    xHandle: string;
    xDisplayName: string;
    profileImageUrl?: string;
    email?: string;
    accessToken: string;
    accessTokenSecret: string;
  }) {
    // Step 1: X ID로 기존 사용자 찾기
    let user = await this.prisma.users.findUnique({
      where: { x_id: twitterProfile.xId },
    });

    if (user) {
      // Step 2-A: 기존 사용자 정보 업데이트 (로그인할 때마다 최신 프로필 반영)
      user = await this.prisma.users.update({
        where: { id: user.id },
        data: {
          x_handle: twitterProfile.xHandle,
          x_display_name: twitterProfile.xDisplayName,
          profile_image_url: twitterProfile.profileImageUrl,
        },
      });

      // Social account 연동 정보도 최신화
      await this.upsertSocialAccount(user.id, 'X', {
        accountId: twitterProfile.xId,
        handle: twitterProfile.xHandle,
        displayName: twitterProfile.xDisplayName,
        profileImage: twitterProfile.profileImageUrl,
      });
    } else {
      // Step 2-B: 신규 사용자 생성
      const referralCode = await this.generateUniqueReferralCode();

      user = await this.prisma.users.create({
        data: {
          x_id: twitterProfile.xId,
          x_handle: twitterProfile.xHandle,
          x_display_name: twitterProfile.xDisplayName,
          profile_image_url: twitterProfile.profileImageUrl,
          email: twitterProfile.email,
          wallet_address: null, // 초기에는 지갑 연결 안 됨
          referral_code: referralCode, // 고유한 추천 코드 부여
          primary_platform: 'X', // ✅ Multi-SNS 확장성: 메인 플랫폼 표시
        },
      });

      // user_points 초기화 (모든 슬롯 0P로 시작)
      // DB 트리거로도 생성되지만, 명시적으로 생성하여 안정성 확보
      await this.prisma.user_points.create({
        data: {
          user_id: user.id,
        },
      });

      // Social account 연동 정보 생성
      await this.upsertSocialAccount(user.id, 'X', {
        accountId: twitterProfile.xId,
        handle: twitterProfile.xHandle,
        displayName: twitterProfile.xDisplayName,
        profileImage: twitterProfile.profileImageUrl,
      });
    }

    // Step 3: JWT 토큰 생성
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        xId: user.x_id,
        xHandle: user.x_handle,
        xDisplayName: user.x_display_name,
        profileImageUrl: user.profile_image_url,
        email: user.email,
        walletAddress: user.wallet_address,
      },
      accessToken: token,
    };
  }

  /**
   * Social Account 생성/업데이트 (플랫폼별 확장 가능)
   *
   * @param {string} userId - 사용자 ID
   * @param {string} platform - 플랫폼 종류 (X, YOUTUBE, INSTAGRAM, DISCORD)
   * @param {object} accountData - 플랫폼별 계정 정보
   *
   * 역할:
   * - users 테이블과 별도로 social_accounts 테이블에 플랫폼별 계정 저장
   * - 한 사용자가 여러 플랫폼 계정을 연결할 수 있음 (멀티 SNS 지원)
   * - is_primary: 메인 계정 표시 (최초 가입 플랫폼)
   *
   * 예시:
   * - X로 가입 → is_primary: true
   * - 이후 Instagram 연결 → is_primary: false
   */
  private async upsertSocialAccount(
    userId: string,
    platform: 'X' | 'YOUTUBE' | 'INSTAGRAM' | 'DISCORD',
    accountData: {
      accountId: string;
      handle?: string;
      displayName?: string;
      profileImage?: string;
    },
  ): Promise<void> {
    await this.prisma.social_accounts.upsert({
      where: {
        // 복합 유니크 키: 같은 사용자의 같은 플랫폼 계정은 1개만
        user_id_platform_account_id: {
          user_id: userId,
          platform: platform,
          account_id: accountData.accountId,
        },
      },
      create: {
        user_id: userId,
        platform: platform,
        account_id: accountData.accountId,
        handle: accountData.handle || null,
        display_name: accountData.displayName || null,
        profile_image: accountData.profileImage || null,
        is_verified: true, // OAuth 성공 = 인증 완료
        is_primary: platform === 'X', // 현재는 X만 메인 계정
      },
      update: {
        // 로그인할 때마다 최신 프로필 정보 반영
        handle: accountData.handle || null,
        display_name: accountData.displayName || null,
        profile_image: accountData.profileImage || null,
        is_verified: true,
      },
    });
  }

  /**
   * JWT 토큰 생성
   *
   * @param {object} user - users 테이블 레코드
   * @returns {string} JWT 토큰
   *
   * Payload 구성:
   * - sub: 사용자 ID (표준 JWT 클레임)
   * - xId: X(Twitter) ID
   * - xHandle: X 핸들 (@username)
   *
   * 보안:
   * - .env의 JWT_SECRET으로 서명
   * - 만료 시간은 JwtModule 설정 참조
   */
  generateToken(user: any): string {
    const payload = {
      sub: user.id, // JWT 표준: subject (사용자 식별자)
      xId: user.x_id, // X(Twitter) 고유 ID
      xHandle: user.x_handle, // @username
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 사용자 검증 (JWT Guard에서 호출)
   *
   * @param {string} userId - JWT payload의 sub (사용자 ID)
   * @returns {Promise<User>} 사용자 정보 (비밀번호 제외)
   *
   * 플로우:
   * 1. JwtStrategy에서 토큰 검증 후 payload.sub 추출
   * 2. 이 메서드로 실제 사용자 존재 여부 확인
   * 3. 존재하면 req.user에 주입
   */
  async validateUser(userId: string) {
    return await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        x_id: true,
        x_handle: true,
        x_display_name: true,
        profile_image_url: true,
        email: true,
        wallet_address: true,
        created_at: true,
      },
    });
  }

  /**
   * 이메일로 인증번호 발송
   *
   * @param {string} email - 사용자 이메일
   * @param {string} ipAddress - 요청 IP 주소 (선택)
   * @param {string} userAgent - User-Agent (선택)
   * @returns {Promise<{success: boolean, message: string, expiresIn: number}>}
   *
   * 플로우:
   * 1. 이메일로 사용자 조회
   * 2. 6자리 랜덤 숫자 생성
   * 3. DB에 저장 (15분 만료)
   * 4. 이메일 발송
   */
  async sendVerificationCode(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. 이메일로 사용자 조회
    const user = await this.prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('No account found with this email');
    }

    // 2. 6자리 랜덤 숫자 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. 만료 시간 설정 (환경변수에서 읽기, 기본 15분)
    const expiresMinutes =
      this.configService.get<number>('VERIFICATION_CODE_EXPIRES_MINUTES') || 15;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresMinutes);

    // 4. DB에 저장
    await this.prisma.email_verification_codes.create({
      data: {
        email,
        code,
        expires_at: expiresAt,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
      },
    });

    // 5. 이메일 발송
    await this.emailService.sendVerificationCode(email, code);

    return {
      success: true,
      message: `Verification code sent to ${email}`,
      expiresIn: expiresMinutes * 60, // 초 단위로 반환
    };
  }

  /**
   * 인증번호 검증
   *
   * @param {string} email - 사용자 이메일
   * @param {string} code - 6자리 인증번호
   * @returns {Promise<{success: boolean, message: string, verificationId: string}>}
   *
   * 플로우:
   * 1. 이메일 + 코드로 인증번호 조회 (미사용, 만료 안 됨)
   * 2. 시도 횟수 체크 (최대 3회)
   * 3. 인증번호 사용 처리
   * 4. verificationId 반환
   */
  async verifyCode(email: string, code: string) {
    // 1. 인증번호 조회
    const verification = await this.prisma.email_verification_codes.findFirst({
      where: {
        email,
        code,
        is_used: false,
        expires_at: { gte: new Date() }, // 만료되지 않음
      },
      orderBy: { created_at: 'desc' },
    });

    if (!verification) {
      // 시도 횟수 증가
      await this.prisma.email_verification_codes.updateMany({
        where: {
          email,
          is_used: false,
          expires_at: { gte: new Date() },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      throw new BadRequestException('Invalid verification code');
    }

    // 2. 시도 횟수 체크
    const maxAttempts =
      this.configService.get<number>('MAX_VERIFICATION_ATTEMPTS') || 3;

    if ((verification.attempts ?? 0) >= maxAttempts) {
      throw new BadRequestException(
        'Too many attempts. Please request a new code.',
      );
    }

    // 3. 인증번호 사용 처리
    await this.prisma.email_verification_codes.update({
      where: { id: verification.id },
      data: {
        is_used: true,
        used_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'Code verified successfully',
      verificationId: verification.id,
    };
  }

  /**
   * 계정 복구 (JWT 발급)
   *
   * @param {string} verificationId - 검증된 인증번호 ID
   * @returns {Promise<{user, accessToken}>}
   *
   * 플로우:
   * 1. verificationId로 인증번호 확인 (사용 완료 상태)
   * 2. 이메일로 사용자 조회
   * 3. JWT 토큰 생성
   */
  async recoverAccount(verificationId: string) {
    // 1. 인증번호 확인
    const verification = await this.prisma.email_verification_codes.findUnique({
      where: { id: verificationId },
    });

    if (!verification || !verification.is_used) {
      throw new BadRequestException('Invalid verification ID');
    }

    // 2. 사용자 조회
    const user = await this.prisma.users.findFirst({
      where: { email: verification.email },
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
        xDisplayName: user.x_display_name,
        email: user.email,
        profileImageUrl: user.profile_image_url,
        walletAddress: user.wallet_address,
      },
      accessToken: token,
    };
  }

  /**
   * Discord OAuth 콜백 처리
   */
  async handleDiscordCallback(discordData: any) {
    const { discordId, username, discriminator, guilds } = discordData;

    // Discord 서버 ID (XYLO Fans 공식 서버)
    const xyloDiscordServerId = this.configService.get<string>('DISCORD_SERVER_ID');

    // 서버 가입 여부 확인
    const isInServer = guilds?.some((guild: any) => guild.id === xyloDiscordServerId) || false;

    return {
      success: true,
      discordId,
      username,
      discriminator,
      isInServer,
      message: isInServer
        ? 'Discord server verified!'
        : 'Please join the XYLO Fans Discord server',
    };
  }

  /**
   * Discord 서버 가입 확인 및 referral 업데이트
   */
  async verifyDiscordServerJoin(userId: string, isInServer: boolean) {
    if (!isInServer) {
      return { success: false, message: 'Not in Discord server' };
    }

    // 사용자의 referral 관계 업데이트 (피추천인으로 등록된 경우)
    await this.prisma.referrals.updateMany({
      where: {
        referee_id: userId,
        is_discord_joined: false, // 아직 디스코드 미가입
      },
      data: {
        is_discord_joined: true,
      },
    });

    return {
      success: true,
      message: 'Discord server join verified',
    };
  }
}
