import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterChannelDto } from './dto/register-channel.dto';
import { VerifyChannelDto } from './dto/verify-channel.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class YoutubeService {
  private youtube: youtube_v3.Youtube;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * 인증 코드 생성 (8자리 hex)
   */
  private generateVerificationCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * 채널 URL/핸들에서 채널 ID 추출
   * 화면기획 My Page_6: Enter your channel URL to register
   *
   * 지원 형식:
   * - Channel ID: UC... → UC... 반환
   * - Channel URL: https://www.youtube.com/channel/UC... → UC... 반환
   * - Handle: @username → API 조회하여 채널 ID 반환
   * - Handle URL: https://www.youtube.com/@username → API 조회하여 채널 ID 반환
   * - Custom URL: https://www.youtube.com/c/CustomName → API 조회하여 채널 ID 반환
   */
  private async parseChannelIdentifier(input: string): Promise<string> {
    // 1. 이미 채널 ID 형식 (UC로 시작)
    if (/^UC[\w-]{22}$/.test(input)) {
      return input;
    }

    // 2. 채널 URL에서 ID 추출
    const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
    if (channelIdMatch) {
      return channelIdMatch[1];
    }

    // 3. 핸들 또는 커스텀 URL 처리
    let handle = input;

    // URL에서 핸들 추출
    const handleMatch = input.match(/youtube\.com\/@([\w-]+)/);
    if (handleMatch) {
      handle = `@${handleMatch[1]}`;
    } else if (input.match(/youtube\.com\/c\/([\w-]+)/)) {
      const customMatch = input.match(/youtube\.com\/c\/([\w-]+)/);
      handle = customMatch![1];
    } else if (!input.startsWith('@')) {
      // @가 없으면 추가
      handle = `@${input}`;
    }

    // YouTube API로 핸들/커스텀URL → 채널 ID 변환
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1,
      });

      const channelId = response.data.items?.[0]?.snippet?.channelId;
      if (!channelId) {
        throw new NotFoundException(
          `Channel not found for handle/URL: ${input}`,
        );
      }

      return channelId;
    } catch (error: any) {
      throw new BadRequestException(
        `Invalid channel URL or handle: ${input}`,
      );
    }
  }

  /**
   * YouTube API로 채널 정보 가져오기
   */
  private async fetchChannelInfo(channelId: string) {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId],
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new NotFoundException('YouTube channel not found');
      }

      return {
        channelId: channel.id!,
        channelTitle: channel.snippet?.title!,
        channelCustomUrl: channel.snippet?.customUrl || null,
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
        description: channel.snippet?.description || null,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        viewCount: parseInt(channel.statistics?.viewCount || '0'),
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundException('YouTube channel not found');
      }
      throw new BadRequestException('Failed to fetch YouTube channel');
    }
  }

  /**
   * 채널 등록
   *
   * 중복 방지 정책 (1채널-1인증 불변 원칙):
   * 1. 이미 인증된 채널 → REJECT
   * 2. 인증 대기 중인 채널 → REJECT (같은 유저든 다른 유저든)
   * 3. 새 채널 → OK
   *
   * 화면기획 My Page_6: Enter your channel URL to register
   */
  async registerChannel(userId: string, registerChannelDto: RegisterChannelDto) {
    // 0. 채널 ID 또는 URL/핸들에서 채널 ID 추출
    let channelId: string;

    if (registerChannelDto.channelId) {
      // 기존 방식: 직접 채널 ID 제공
      channelId = registerChannelDto.channelId;
    } else if (registerChannelDto.channelUrlOrHandle) {
      // 새 방식: URL 또는 핸들 파싱
      channelId = await this.parseChannelIdentifier(
        registerChannelDto.channelUrlOrHandle,
      );
    } else {
      throw new BadRequestException(
        'Either channelId or channelUrlOrHandle is required',
      );
    }

    // 1. 중복 인증 방지: DB 함수로 채널 인증 가능 여부 확인
    const eligibilityResult = await this.prisma.$queryRaw<
      Array<{ check_channel_verification_eligibility: any }>
    >`
      SELECT xylo.check_channel_verification_eligibility(
        ${channelId}::VARCHAR,
        ${userId}::UUID
      );
    `;

    const eligibility = eligibilityResult[0]
      ?.check_channel_verification_eligibility;

    if (!eligibility.eligible) {
      // 이미 인증된 채널
      if (eligibility.reason === 'ALREADY_VERIFIED') {
        throw new ConflictException(
          `This channel is already verified (verified at: ${eligibility.verified_at})`,
        );
      }

      // 인증 대기 중인 채널 (다른 유저가 이미 등록했거나 본인이 이미 등록함)
      if (eligibility.reason === 'VERIFICATION_PENDING') {
        throw new ConflictException(
          `This channel is already registered and waiting for verification (registered at: ${eligibility.registered_at})`,
        );
      }

      // 기타 사유
      throw new ConflictException('Channel registration not allowed');
    }

    // 2. YouTube API로 채널 정보 가져오기
    const channelInfo = await this.fetchChannelInfo(channelId);

    // 3. 인증 코드 생성
    const verificationCode = this.generateVerificationCode();

    // 4. DB에 채널 저장 (트리거가 자동으로 히스토리 기록)
    const channel = await this.prisma.youtube_channels.create({
      data: {
        user_id: userId,
        channel_id: channelInfo.channelId,
        channel_url: channelInfo.channelCustomUrl
          ? `https://www.youtube.com/@${channelInfo.channelCustomUrl}`
          : `https://www.youtube.com/channel/${channelInfo.channelId}`,
        channel_title: channelInfo.channelTitle,
        thumbnail_url: channelInfo.thumbnailUrl,
        subscriber_count: channelInfo.subscriberCount,
        video_count: channelInfo.videoCount,
        view_count: channelInfo.viewCount,
        verification_code: verificationCode,
        is_verified: false,
        first_registered_at: new Date(), // 최초 등록 시간 (불변)
        verification_attempts: 0,
      },
    });

    return {
      id: channel.id,
      channelId: channel.channel_id,
      channelTitle: channel.channel_title,
      channelUrl: channel.channel_url,
      thumbnailUrl: channel.thumbnail_url,
      subscriberCount: channel.subscriber_count,
      videoCount: channel.video_count,
      viewCount: channel.view_count,
      verificationCode: channel.verification_code,
      isVerified: channel.is_verified,
      createdAt: channel.created_at,
    };
  }

  /**
   * 채널 인증 (description에 verification code가 있는지 확인)
   *
   * 프로세스:
   * 1. 채널 존재 및 소유권 확인
   * 2. 이미 인증되었는지 확인
   * 3. YouTube API로 최신 description 가져오기
   * 4. verification code 포함 여부 확인
   * 5. 성공 시 인증 완료 + 히스토리 기록 (트리거 자동)
   * 6. 실패 시 시도 횟수 증가 + 히스토리 기록
   */
  async verifyChannel(userId: string, verifyChannelDto: VerifyChannelDto) {
    // 1. DB에서 채널 찾기
    const channel = await this.prisma.youtube_channels.findFirst({
      where: {
        id: verifyChannelDto.channelDbId,
        user_id: userId,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // 2. 이미 인증되었는지 확인
    if (channel.is_verified) {
      throw new BadRequestException('Channel already verified');
    }

    // 3. YouTube API로 최신 채널 정보 가져오기
    const channelInfo = await this.fetchChannelInfo(channel.channel_id);

    // 4. description에 verification code가 있는지 확인
    const description = channelInfo.description || '';
    const verificationCode = channel.verification_code!;

    if (!description.includes(verificationCode)) {
      // 실패: 시도 횟수 증가 + 히스토리 기록
      await this.prisma.$transaction([
        // 시도 횟수 증가
        this.prisma.youtube_channels.update({
          where: { id: channel.id },
          data: {
            verification_attempts: (channel.verification_attempts || 0) + 1,
          },
        }),
        // 실패 히스토리 기록
        this.prisma.channel_verification_history.create({
          data: {
            channel_id: channel.channel_id,
            user_id: userId,
            verification_code: verificationCode,
            action_type: 'VERIFICATION_FAILED',
            metadata: {
              reason: 'Code not found in description',
              attempt_number: (channel.verification_attempts || 0) + 1,
            },
          },
        }),
      ]);

      throw new BadRequestException(
        `Verification code not found in channel description. Please add "${verificationCode}" to your channel description.`,
      );
    }

    // 5. 인증 성공: DB 업데이트 (트리거가 자동으로 성공 히스토리 기록)
    const updatedChannel = await this.prisma.youtube_channels.update({
      where: { id: channel.id },
      data: {
        is_verified: true,
        verified_at: new Date(),
        verification_attempts: (channel.verification_attempts || 0) + 1,
      },
    });

    return {
      id: updatedChannel.id,
      channelId: updatedChannel.channel_id,
      channelTitle: updatedChannel.channel_title,
      isVerified: updatedChannel.is_verified,
      verifiedAt: updatedChannel.verified_at,
    };
  }

  /**
   * 채널 삭제
   */
  async deleteChannel(userId: string, channelDbId: string) {
    const channel = await this.prisma.youtube_channels.findFirst({
      where: {
        id: channelDbId,
        user_id: userId,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.prisma.youtube_channels.delete({
      where: { id: channel.id },
    });

    return {
      success: true,
      message: 'Channel deleted successfully',
    };
  }

  /**
   * 채널 상세 정보 조회
   */
  async getChannelDetails(userId: string, channelDbId: string) {
    const channel = await this.prisma.youtube_channels.findFirst({
      where: {
        id: channelDbId,
        user_id: userId,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return {
      id: channel.id,
      channelId: channel.channel_id,
      channelTitle: channel.channel_title,
      channelUrl: channel.channel_url,
      thumbnailUrl: channel.thumbnail_url,
      subscriberCount: channel.subscriber_count,
      videoCount: channel.video_count,
      viewCount: channel.view_count,
      verificationCode: channel.verification_code,
      isVerified: channel.is_verified,
      verifiedAt: channel.verified_at,
      createdAt: channel.created_at,
      updatedAt: channel.updated_at,
    };
  }
}
