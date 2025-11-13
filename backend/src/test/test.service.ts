import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);
  private youtube: youtube_v3.Youtube;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * 인증 코드 생성
   */
  private generateVerificationCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * 채널 URL/핸들에서 채널 ID 추출
   */
  private async parseChannelIdentifier(input: string): Promise<string> {
    this.logger.log(`[채널 검색] 입력값: ${input}`);

    // 1. 이미 채널 ID 형식
    if (/^UC[\w-]{22}$/.test(input)) {
      this.logger.log(`[채널 검색] ✓ 유효한 채널 ID 형식: ${input}`);
      return input;
    }

    // 2. 채널 URL에서 ID 추출
    const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
    if (channelIdMatch) {
      this.logger.log(
        `[채널 검색] ✓ URL에서 채널 ID 추출 성공: ${channelIdMatch[1]}`,
      );
      return channelIdMatch[1];
    }

    // 3. 핸들 또는 커스텀 URL 처리
    let handle = input;
    const handleMatch = input.match(/youtube\.com\/@([\w-]+)/);
    if (handleMatch) {
      handle = handleMatch[1]; // @ 제거한 순수 핸들
    } else if (input.match(/youtube\.com\/c\/([\w-]+)/)) {
      const customMatch = input.match(/youtube\.com\/c\/([\w-]+)/);
      handle = customMatch![1];
    } else if (input.startsWith('@')) {
      handle = input.substring(1); // @ 제거
    }

    this.logger.log(`[채널 검색] 핸들로 정확한 매칭 시도: @${handle}`);

    // 먼저 forHandle 파라미터로 정확한 핸들 매칭 시도
    try {
      const exactMatchResponse = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        forHandle: handle,
      });

      this.logger.log(
        `[채널 검색] forHandle API 응답 상태: ${exactMatchResponse.status} ${exactMatchResponse.statusText}`,
      );

      if (exactMatchResponse.status === 200 && exactMatchResponse.data.items && exactMatchResponse.data.items.length > 0) {
        const channelId = exactMatchResponse.data.items[0].id;
        const channelTitle = exactMatchResponse.data.items[0].snippet?.title;
        const customUrl = exactMatchResponse.data.items[0].snippet?.customUrl;

        this.logger.log(
          `[채널 검색] ✓ 정확한 핸들 매칭 성공: @${handle} → ${channelTitle} (${channelId})`,
        );
        this.logger.log(
          `[채널 검색]   커스텀 URL: ${customUrl}`,
        );

        return channelId!;
      }

      this.logger.log(
        `[채널 검색] forHandle로 찾을 수 없음, 일반 검색으로 시도...`,
      );
    } catch (error: any) {
      this.logger.warn(
        `[채널 검색] forHandle 검색 실패, 일반 검색으로 전환: ${error.message}`,
      );
    }

    // forHandle로 못 찾으면 일반 검색 (하지만 결과 검증 강화)
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: `@${handle}`,
        type: ['channel'],
        maxResults: 5, // 여러 결과를 받아서 정확한 매칭 찾기
      });

      // API 응답 상태 확인
      this.logger.log(
        `[채널 검색] 일반 검색 API 응답 상태: ${response.status} ${response.statusText}`,
      );

      if (response.status !== 200) {
        this.logger.error(
          `[채널 검색] ✗ YouTube API 오류 - Status: ${response.status}`,
        );
        throw new BadRequestException(
          `YouTube API 오류가 발생했습니다 (Status: ${response.status})`,
        );
      }

      const items = response.data.items || [];
      this.logger.log(
        `[채널 검색] 일반 검색 결과 수: ${items.length}`,
      );

      if (items.length === 0) {
        this.logger.warn(`[채널 검색] ✗ 채널을 찾을 수 없음: ${input}`);
        throw new BadRequestException(
          `유효하지 않은 채널 주소입니다. 해당 채널이 존재하지 않습니다: ${input}`,
        );
      }

      // 검색 결과에서 정확히 일치하는 채널 찾기
      // customUrl을 확인하기 위해 각 채널 ID로 상세 정보 조회
      for (const item of items) {
        const searchedChannelId = item.snippet?.channelId;
        if (!searchedChannelId) continue;

        this.logger.log(
          `[채널 검색] 검색 결과 확인 중: ${item.snippet?.title} (${searchedChannelId})`,
        );

        // 채널 상세 정보로 customUrl 확인
        const detailResponse = await this.youtube.channels.list({
          part: ['snippet'],
          id: [searchedChannelId],
        });

        if (detailResponse.data.items && detailResponse.data.items.length > 0) {
          const channelDetail = detailResponse.data.items[0];
          const customUrl = channelDetail.snippet?.customUrl;

          this.logger.log(
            `[채널 검색]   - 커스텀 URL: ${customUrl}`,
          );

          // 커스텀 URL이 입력값과 정확히 일치하는지 확인
          if (customUrl === `@${handle}` || customUrl === handle) {
            this.logger.log(
              `[채널 검색] ✓ 정확한 매칭 찾음: ${channelDetail.snippet?.title} (${searchedChannelId})`,
            );
            return searchedChannelId;
          }
        }
      }

      // 정확한 매칭을 찾지 못함
      this.logger.warn(
        `[채널 검색] ✗ 검색 결과 중 정확히 일치하는 채널 없음: @${handle}`,
      );
      throw new BadRequestException(
        `유효하지 않은 채널 주소입니다. '@${handle}' 핸들을 가진 채널이 존재하지 않습니다.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[채널 검색] ✗ 오류 발생: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `유효하지 않은 채널 URL 또는 핸들입니다: ${input}`,
      );
    }
  }

  /**
   * ISO 8601 duration을 초로 변환
   * 예: PT1M30S → 90초
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 필수 태그 확인
   */
  private checkEligibility(
    videoTags: string[],
    requiredTags: string[],
  ): boolean {
    const normalizedVideoTags = videoTags.map((tag) =>
      tag.toUpperCase().replace(/\s/g, ''),
    );

    return requiredTags.some((requiredTag) =>
      normalizedVideoTags.includes(requiredTag.toUpperCase().replace(/\s/g, '')),
    );
  }

  /**
   * 시스템 설정에서 필수 태그 조회
   */
  private async getRequiredTags(): Promise<string[]> {
    const config = await this.prisma.system_configs.findUnique({
      where: { key: 'required_tags' },
    });

    if (config && Array.isArray(config.value)) {
      return config.value as string[];
    }

    // 기본값
    return ['#WITCHES', '#XYLO'];
  }

  /**
   * YouTube API Raw 응답 데이터 조회 (테스트용)
   * 전체 응답 구조를 확인하기 위한 메서드
   */
  async getYoutubeRawResponse(videoId: string) {
    this.logger.log(`[YouTube Raw Response] 비디오 ID: ${videoId}`);

    // videos.list API 호출 - 모든 part 요청
    const response = await this.youtube.videos.list({
      part: [
        'snippet',
        'contentDetails',
        'statistics',
        'status',
        'player',
        'topicDetails',
        'recordingDetails',
        'liveStreamingDetails',
        'localizations',
      ],
      id: [videoId],
    });

    // 전체 응답 데이터 반환
    return {
      success: true,
      message: 'YouTube API Raw Response',
      videoId,
      fullResponse: response.data,
      items: response.data.items,
      // 응답 구조 설명
      availableFields: {
        snippet: {
          description: '비디오 기본 정보 (제목, 설명, 썸네일, 태그 등)',
          fields: [
            'publishedAt',
            'channelId',
            'title',
            'description',
            'thumbnails',
            'channelTitle',
            'tags',
            'categoryId',
            'liveBroadcastContent',
            'defaultLanguage',
            'localized',
            'defaultAudioLanguage',
          ],
        },
        contentDetails: {
          description: '비디오 콘텐츠 세부 정보 (재생시간, 화질, 자막 등)',
          fields: [
            'duration',
            'dimension',
            'definition',
            'caption',
            'licensedContent',
            'projection',
            'hasCustomThumbnail',
          ],
        },
        statistics: {
          description: '통계 정보 (조회수, 좋아요, 댓글 수 등)',
          fields: ['viewCount', 'likeCount', 'commentCount', 'favoriteCount'],
        },
        status: {
          description: '비디오 상태 정보 (공개 여부, 업로드 상태 등)',
          fields: [
            'uploadStatus',
            'privacyStatus',
            'license',
            'embeddable',
            'publicStatsViewable',
            'madeForKids',
          ],
        },
        player: {
          description: '플레이어 임베드 정보',
          fields: ['embedHtml', 'embedHeight', 'embedWidth'],
        },
        topicDetails: {
          description: '주제 카테고리 정보',
          fields: ['topicIds', 'relevantTopicIds', 'topicCategories'],
        },
        recordingDetails: {
          description: '녹화 정보 (위치, 날짜 등)',
          fields: ['recordingDate'],
        },
        liveStreamingDetails: {
          description: '라이브 스트리밍 관련 정보',
          fields: [
            'actualStartTime',
            'actualEndTime',
            'scheduledStartTime',
            'scheduledEndTime',
            'concurrentViewers',
            'activeLiveChatId',
          ],
        },
        localizations: {
          description: '다국어 지역화 정보',
          fields: ['title', 'description'],
        },
      },
    };
  }

  /**
   * 채널 ID로 쇼츠 검색
   */
  async searchShorts(channelId: string, maxResults: number = 20) {
    this.logger.log(`Searching shorts for channel: ${channelId}`);

    // 채널 정보 조회
    const channelResponse = await this.youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId],
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      throw new Error('Channel not found');
    }

    // 최근 30일 영상 검색
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const searchResponse = await this.youtube.search.list({
      part: ['id', 'snippet'],
      channelId: channelId,
      type: ['video'],
      order: 'date',
      publishedAfter: thirtyDaysAgo.toISOString(),
      maxResults,
    });

    const videos = searchResponse.data.items || [];
    const videoIds = videos
      .map((v) => v.id?.videoId)
      .filter((id): id is string => !!id);

    if (videoIds.length === 0) {
      return {
        channel: {
          id: channel.id,
          title: channel.snippet?.title,
          thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
          subscriberCount: channel.statistics?.subscriberCount,
        },
        videos: [],
        shorts: [],
      };
    }

    // 비디오 상세 정보 조회
    const videoDetailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics', 'status'],
      id: videoIds,
    });

    const videoDetails = videoDetailsResponse.data.items || [];
    const requiredTags = await this.getRequiredTags();

    // 쇼츠와 일반 비디오 분류
    const allVideos = videoDetails.map((video) => {
      const duration = this.parseDuration(
        video.contentDetails?.duration || '',
      );
      const isShorts = duration <= 60;
      const tags = video.snippet?.tags || [];
      const isEligible = this.checkEligibility(tags, requiredTags);

      return {
        videoId: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
        publishedAt: video.snippet?.publishedAt,
        duration,
        isShorts,
        viewCount: parseInt(video.statistics?.viewCount || '0'),
        likeCount: parseInt(video.statistics?.likeCount || '0'),
        commentCount: parseInt(video.statistics?.commentCount || '0'),
        tags,
        isEligible,
        privacyStatus: video.status?.privacyStatus,
        url: `https://www.youtube.com/watch?v=${video.id}`,
      };
    });

    const shorts = allVideos.filter((v) => v.isShorts);
    const regularVideos = allVideos.filter((v) => !v.isShorts);

    return {
      channel: {
        id: channel.id,
        title: channel.snippet?.title,
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
      },
      videos: regularVideos,
      shorts,
      summary: {
        totalVideos: allVideos.length,
        shortsCount: shorts.length,
        regularVideosCount: regularVideos.length,
        eligibleCount: allVideos.filter((v) => v.isEligible).length,
      },
    };
  }

  /**
   * 쇼츠 정보를 DB에 저장
   */
  async saveShorts(channelId: string, videoIds: string[]) {
    this.logger.log(`Saving ${videoIds.length} videos for channel: ${channelId}`);

    // DB에서 채널 조회
    const dbChannel = await this.prisma.youtube_channels.findUnique({
      where: { channel_id: channelId },
    });

    if (!dbChannel) {
      throw new Error('Channel not found in database. Please register the channel first.');
    }

    // 비디오 상세 정보 조회
    const videoDetailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics', 'status'],
      id: videoIds,
    });

    const videoDetails = videoDetailsResponse.data.items || [];
    const requiredTags = await this.getRequiredTags();
    const savedVideos: Array<{
      id: string;
      videoId: string;
      title: string;
      isShorts: boolean;
      isEligible: boolean;
    }> = [];

    for (const video of videoDetails) {
      if (!video.id) continue;

      const tags = video.snippet?.tags || [];
      const duration = this.parseDuration(video.contentDetails?.duration || '');
      const isShorts = duration <= 60;
      const isEligible = this.checkEligibility(tags, requiredTags);

      // 비디오 저장/업데이트
      const savedVideo = await this.prisma.youtube_videos.upsert({
        where: { video_id: video.id },
        create: {
          channel_id: dbChannel.id,
          video_id: video.id,
          title: video.snippet?.title || '',
          description: video.snippet?.description || '',
          thumbnail_url: video.snippet?.thumbnails?.default?.url || '',
          published_at: video.snippet?.publishedAt
            ? new Date(video.snippet.publishedAt)
            : new Date(),
          category_id: video.snippet?.categoryId || null,
          channel_title: video.snippet?.channelTitle || null,
          thumbnail_medium_url: video.snippet?.thumbnails?.medium?.url || null,
          thumbnail_high_url: video.snippet?.thumbnails?.high?.url || null,
          duration,
          view_count: parseInt(video.statistics?.viewCount || '0'),
          like_count: parseInt(video.statistics?.likeCount || '0'),
          comment_count: parseInt(video.statistics?.commentCount || '0'),
          privacy_status: video.status?.privacyStatus || 'public',
          upload_status: video.status?.uploadStatus || 'processed',
          tags,
          is_shorts: isShorts,
          is_eligible: isEligible,
        },
        update: {
          view_count: parseInt(video.statistics?.viewCount || '0'),
          like_count: parseInt(video.statistics?.likeCount || '0'),
          comment_count: parseInt(video.statistics?.commentCount || '0'),
          tags,
          is_shorts: isShorts,
          is_eligible: isEligible,
          privacy_status: video.status?.privacyStatus || 'public',
          upload_status: video.status?.uploadStatus || 'processed',
        },
      });

      savedVideos.push({
        id: savedVideo.id,
        videoId: savedVideo.video_id,
        title: savedVideo.title || '',
        isShorts: savedVideo.is_shorts || false,
        isEligible: savedVideo.is_eligible || false,
      });
    }

    return {
      success: true,
      channelId: dbChannel.channel_id,
      channelTitle: dbChannel.channel_title,
      savedCount: savedVideos.length,
      videos: savedVideos,
    };
  }

  /**
   * DB에 저장된 쇼츠 목록 조회
   */
  async getSavedShorts(channelId?: string, limit: number = 50) {
    const where: any = {
      is_shorts: true,
    };

    if (channelId) {
      const dbChannel = await this.prisma.youtube_channels.findUnique({
        where: { channel_id: channelId },
      });

      if (dbChannel) {
        where.channel_id = dbChannel.id;
      }
    }

    const shorts = await this.prisma.youtube_videos.findMany({
      where,
      include: {
        youtube_channels: {
          select: {
            channel_id: true,
            channel_title: true,
            thumbnail_url: true,
          },
        },
      },
      orderBy: {
        published_at: 'desc',
      },
      take: limit,
    });

    return {
      total: shorts.length,
      shorts: shorts.map((short) => ({
        id: short.id,
        videoId: short.video_id,
        title: short.title,
        thumbnailUrl: short.thumbnail_url,
        publishedAt: short.published_at,
        duration: short.duration,
        viewCount: short.view_count,
        likeCount: short.like_count,
        commentCount: short.comment_count,
        isEligible: short.is_eligible,
        tags: short.tags,
        channel: {
          channelId: short.youtube_channels.channel_id,
          title: short.youtube_channels.channel_title,
          thumbnailUrl: short.youtube_channels.thumbnail_url,
        },
        url: `https://www.youtube.com/watch?v=${short.video_id}`,
      })),
    };
  }

  /**
   * 테스트용 채널 등록 (사용자 ID 필요 없음)
   */
  async registerChannelForTest(
    channelUrlOrId: string,
    userId: string = '00000000-0000-0000-0000-000000000000', // 테스트용 고정 UUID
  ) {
    this.logger.log(`Registering channel for test: ${channelUrlOrId}`);

    // Ensure test user exists for testing
    await this.prisma.users.upsert({
      where: { id: userId },
      create: {
        id: userId,
        referral_code: 'TEST0000',
        primary_platform: 'X',
        x_id: 'test_user_000',
        x_handle: 'test_user',
        x_display_name: 'Test User',
      },
      update: {}, // No updates needed if user exists
    });

    // 채널 ID 추출
    const channelId = await this.parseChannelIdentifier(channelUrlOrId);

    // 먼저 DB에서 채널 확인
    const existingChannel = await this.prisma.youtube_channels.findUnique({
      where: { channel_id: channelId },
    });

    // 이미 인증 완료된 채널
    if (existingChannel?.is_verified) {
      this.logger.log(
        `[채널 등록] ℹ 이미 인증 완료된 채널: ${existingChannel.channel_title}`,
      );
      return {
        success: true,
        message: '이미 인증 완료된 채널입니다',
        status: 'already_verified',
        channel: {
          id: existingChannel.id,
          channelId: existingChannel.channel_id,
          title: existingChannel.channel_title,
          thumbnailUrl: existingChannel.thumbnail_url,
          subscriberCount: existingChannel.subscriber_count,
          verificationCode: existingChannel.verification_code,
          isVerified: existingChannel.is_verified,
          channelUrl: existingChannel.channel_url,
        },
      };
    }

    // 인증 대기 중인 채널 (기존 코드 재사용)
    if (existingChannel && !existingChannel.is_verified) {
      this.logger.log(
        `[채널 등록] ⏳ 인증 대기 중인 채널 - 기존 코드 사용: ${existingChannel.channel_title}`,
      );
      this.logger.log(
        `[인증 코드] 기존 코드 재사용: ${existingChannel.verification_code}`,
      );

      // 채널 정보만 업데이트 (인증 코드는 유지)
      const updatedChannel = await this.prisma.youtube_channels.update({
        where: { id: existingChannel.id },
        data: {
          // 채널 정보는 최신화하되, 인증 코드는 유지
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        message: '인증 대기 중입니다. 기존 인증 코드를 사용하세요.',
        status: 'verification_pending',
        channel: {
          id: updatedChannel.id,
          channelId: updatedChannel.channel_id,
          title: updatedChannel.channel_title,
          thumbnailUrl: updatedChannel.thumbnail_url,
          subscriberCount: updatedChannel.subscriber_count,
          verificationCode: updatedChannel.verification_code,
          isVerified: updatedChannel.is_verified,
          channelUrl: updatedChannel.channel_url,
        },
        instructions: [
          '⏳ 이 채널은 이미 인증 코드가 발급되었습니다.',
          '',
          '📋 아래 인증 코드를 YouTube 채널 설명에 추가하세요:',
          `   XYLO_VERIFY:${updatedChannel.verification_code}`,
          '',
          '1. YouTube Studio (https://studio.youtube.com)에 접속하세요',
          '2. 왼쪽 메뉴에서 "맞춤 설정" 선택',
          '3. "기본 정보" 탭 선택',
          '4. "설명" 필드에 위 코드를 추가하세요',
          '5. 우측 상단 "게시" 버튼 클릭',
          '6. 저장 후 "인증 확인" 버튼을 클릭하세요',
        ],
      };
    }

    // 새로운 채널 등록
    // YouTube API로 채널 정보 가져오기 (최종 검증)
    this.logger.log(`[채널 정보] 채널 ID로 정보 조회 시작: ${channelId}`);

    let response;
    try {
      response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId],
      });

      // API 응답 상태 확인
      this.logger.log(
        `[채널 정보] YouTube API 응답 상태: ${response.status} ${response.statusText}`,
      );

      if (response.status !== 200) {
        this.logger.error(
          `[채널 정보] ✗ YouTube API 오류 - Status: ${response.status}`,
        );
        throw new BadRequestException(
          `유효하지 않은 채널입니다. YouTube API 오류 (Status: ${response.status})`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[채널 정보] ✗ YouTube API 호출 실패: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `채널 정보를 가져올 수 없습니다. 유효하지 않은 채널이거나 API 오류가 발생했습니다.`,
      );
    }

    const items = response.data.items || [];
    this.logger.log(`[채널 정보] API 응답 아이템 수: ${items.length}`);

    if (items.length === 0) {
      this.logger.warn(
        `[채널 정보] ✗ 유효하지 않은 채널 - YouTube에 존재하지 않음: ${channelId}`,
      );
      throw new BadRequestException(
        `유효하지 않은 채널 주소입니다. 해당 채널이 YouTube에 존재하지 않습니다.`,
      );
    }

    const channel = items[0];
    if (!channel.snippet || !channel.statistics) {
      this.logger.warn(
        `[채널 정보] ✗ 채널 정보가 불완전함`,
      );
      throw new BadRequestException(
        `채널 정보를 완전히 가져올 수 없습니다. 채널이 비정상적이거나 API 제한이 있을 수 있습니다.`,
      );
    }

    // 채널 정보 로그
    this.logger.log(`[채널 정보] ✓ 채널 정보 조회 성공 - 유효한 채널 확인됨`);
    this.logger.log(
      `  - 채널명: ${channel.snippet.title || '(제목 없음)'}`,
    );
    this.logger.log(
      `  - 채널 ID: ${channelId}`,
    );
    this.logger.log(
      `  - 구독자 수: ${parseInt(channel.statistics.subscriberCount || '0').toLocaleString()}명`,
    );
    this.logger.log(
      `  - 동영상 수: ${parseInt(channel.statistics.videoCount || '0').toLocaleString()}개`,
    );
    this.logger.log(
      `  - 총 조회수: ${parseInt(channel.statistics.viewCount || '0').toLocaleString()}회`,
    );

    // 새 인증 코드 생성 (최초 등록)
    const verificationCode = this.generateVerificationCode();
    this.logger.log(`[인증 코드] 새 코드 생성: ${verificationCode}`);

    // DB에 새 채널 저장
    const dbChannel = await this.prisma.youtube_channels.create({
      data: {
        user_id: userId,
        channel_id: channelId,
        channel_title: channel.snippet?.title || '',
        channel_url: `https://www.youtube.com/channel/${channelId}`,
        thumbnail_url: channel.snippet?.thumbnails?.default?.url || null,
        subscriber_count: parseInt(channel.statistics?.subscriberCount || '0'),
        video_count: parseInt(channel.statistics?.videoCount || '0'),
        view_count: BigInt(channel.statistics?.viewCount || '0'),
        verification_code: verificationCode,
        is_verified: false,
      },
    });

    this.logger.log(
      `[채널 등록] ✓ 새 채널 등록 완료 - 인증 코드 발급됨: ${verificationCode}`,
    );

    return {
      success: true,
      message: '인증 코드가 발급되었습니다',
      status: 'verification_code_issued',
      channel: {
        id: dbChannel.id,
        channelId: dbChannel.channel_id,
        title: dbChannel.channel_title,
        thumbnailUrl: dbChannel.thumbnail_url,
        subscriberCount: dbChannel.subscriber_count,
        verificationCode: dbChannel.verification_code,
        isVerified: dbChannel.is_verified,
        channelUrl: dbChannel.channel_url,
      },
      instructions: [
        '1. YouTube Studio에 접속하세요',
        '2. 채널 설정 > 기본 정보로 이동하세요',
        '3. 채널 설명(Description)에 다음 코드를 추가하세요:',
        `   XYLO_VERIFY:${verificationCode}`,
        '4. 저장 후 아래 "인증 확인" 버튼을 클릭하세요',
      ],
    };
  }

  /**
   * 채널 인증 확인
   */
  async verifyChannelForTest(channelId: string) {
    this.logger.log(`[채널 인증] 인증 확인 시작: ${channelId}`);

    // DB에서 채널 조회
    const dbChannel = await this.prisma.youtube_channels.findUnique({
      where: { channel_id: channelId },
    });

    if (!dbChannel) {
      this.logger.warn(`[채널 인증] ✗ 등록되지 않은 채널: ${channelId}`);
      throw new BadRequestException('등록되지 않은 채널입니다. 먼저 채널을 등록해주세요.');
    }

    this.logger.log(
      `[채널 인증] DB에서 채널 조회 완료: ${dbChannel.channel_title}`,
    );

    if (dbChannel.is_verified) {
      this.logger.log(`[채널 인증] ℹ 이미 인증된 채널입니다`);
      return {
        success: true,
        alreadyVerified: true,
        message: '이미 인증된 채널입니다',
      };
    }

    // YouTube API로 채널 description 조회
    this.logger.log(
      `[채널 인증] YouTube API로 채널 설명 조회 중...`,
    );

    let response;
    try {
      response = await this.youtube.channels.list({
        part: ['snippet'],
        id: [channelId],
      });

      // API 응답 상태 확인
      this.logger.log(
        `[채널 인증] YouTube API 응답 상태: ${response.status} ${response.statusText}`,
      );

      if (response.status !== 200) {
        this.logger.error(
          `[채널 인증] ✗ YouTube API 오류 - Status: ${response.status}`,
        );
        throw new BadRequestException(
          `YouTube API 오류가 발생했습니다 (Status: ${response.status})`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[채널 인증] ✗ YouTube API 호출 실패: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `채널 정보를 가져올 수 없습니다. API 오류가 발생했습니다.`,
      );
    }

    const items = response.data.items || [];
    if (items.length === 0) {
      this.logger.warn(`[채널 인증] ✗ YouTube에서 채널을 찾을 수 없음`);
      throw new BadRequestException('YouTube에서 채널을 찾을 수 없습니다. 채널이 삭제되었거나 비공개 상태일 수 있습니다.');
    }

    const channel = items[0];
    const description = channel.snippet?.description || '';
    const expectedCode = `XYLO_VERIFY:${dbChannel.verification_code}`;

    this.logger.log(
      `[채널 인증] 기대하는 코드: ${expectedCode}`,
    );
    this.logger.log(
      `[채널 인증] 채널 설명 (첫 200자): ${description.substring(0, 200)}...`,
    );

    // 인증 코드 확인
    if (!description.includes(expectedCode)) {
      this.logger.warn(
        `[채널 인증] ✗ 인증 코드를 찾을 수 없음`,
      );
      return {
        success: false,
        verified: false,
        message: `채널 설명에서 인증 코드를 찾을 수 없습니다. YouTube Studio에서 채널 설명에 "${expectedCode}"를 추가해주세요.`,
        expectedCode,
        foundDescription: description.substring(0, 200) + '...',
        instructions: [
          '1. YouTube Studio (https://studio.youtube.com)에 접속하세요',
          '2. 왼쪽 메뉴에서 "맞춤 설정" 선택',
          '3. "기본 정보" 탭 선택',
          '4. "설명" 필드에 아래 코드를 추가하세요:',
          `   ${expectedCode}`,
          '5. 우측 상단 "게시" 버튼 클릭',
          '6. 저장 후 다시 "인증 확인" 버튼을 클릭하세요',
        ],
      };
    }

    // 인증 완료 처리
    this.logger.log(`[채널 인증] ✓ 인증 코드 확인 완료! DB 업데이트 중...`);
    await this.prisma.youtube_channels.update({
      where: { id: dbChannel.id },
      data: {
        is_verified: true,
        verified_at: new Date(),
      },
    });

    this.logger.log(
      `[채널 인증] ✓✓✓ 채널 인증이 완료되었습니다: ${dbChannel.channel_title}`,
    );

    return {
      success: true,
      verified: true,
      message: '채널 인증이 완료되었습니다!',
      status: 'verification_completed',
      channel: {
        id: dbChannel.id,
        channelId: dbChannel.channel_id,
        title: dbChannel.channel_title,
        isVerified: true,
      },
    };
  }

  /**
   * 인증된 채널 목록 조회
   */
  async getVerifiedChannels() {
    const channels = await this.prisma.youtube_channels.findMany({
      where: { is_verified: true },
      select: {
        id: true,
        channel_id: true,
        channel_title: true,
        thumbnail_url: true,
        subscriber_count: true,
        video_count: true,
        verified_at: true,
      },
      orderBy: {
        verified_at: 'desc',
      },
    });

    return {
      total: channels.length,
      channels: channels.map((channel) => ({
        id: channel.id,
        channelId: channel.channel_id,
        title: channel.channel_title,
        thumbnailUrl: channel.thumbnail_url,
        subscriberCount: channel.subscriber_count,
        videoCount: channel.video_count,
        verifiedAt: channel.verified_at,
        url: `https://www.youtube.com/channel/${channel.channel_id}`,
      })),
    };
  }

  /**
   * 채널 삭제 (본인 계정 확인)
   */
  async deleteChannelForTest(channelId: string, userId?: string) {
    this.logger.log(`[채널 삭제] 요청: ${channelId}, 사용자: ${userId || '테스트 유저'}`);

    // DB에서 채널 조회
    const channel = await this.prisma.youtube_channels.findUnique({
      where: { channel_id: channelId },
      include: {
        users: {
          select: {
            id: true,
            x_handle: true,
          },
        },
      },
    });

    if (!channel) {
      this.logger.warn(`[채널 삭제] ✗ 채널을 찾을 수 없음: ${channelId}`);
      throw new BadRequestException('채널을 찾을 수 없습니다.');
    }

    // 본인 계정 확인 (userId가 제공된 경우에만 체크)
    if (userId && channel.user_id !== userId) {
      this.logger.warn(
        `[채널 삭제] ✗ 권한 없음 - 채널 소유자: ${channel.user_id}, 요청자: ${userId}`,
      );
      throw new BadRequestException('본인의 채널만 삭제할 수 있습니다.');
    }

    // 채널 정보 로그
    this.logger.log(
      `[채널 삭제] 채널 정보: ${channel.channel_title} (${channel.channel_id})`,
    );
    this.logger.log(
      `[채널 삭제] 인증 상태: ${channel.is_verified ? '인증 완료' : '미인증'}`,
    );

    // 채널 삭제 (Cascade로 관련 데이터도 함께 삭제됨)
    await this.prisma.youtube_channels.delete({
      where: { id: channel.id },
    });

    this.logger.log(
      `[채널 삭제] ✓ 삭제 완료: ${channel.channel_title}`,
    );

    return {
      success: true,
      message: '채널이 성공적으로 삭제되었습니다.',
      deletedChannel: {
        channelId: channel.channel_id,
        title: channel.channel_title,
        wasVerified: channel.is_verified,
      },
    };
  }

  /**
   * 특정 태그가 있는 쇼츠 자동 조회 및 저장
   */
  async searchAndSaveEligibleShorts(
    channelId: string,
    tags: string[] = ['#WITCHES', '#XYLO'],
    maxResults: number = 50,
  ) {
    this.logger.log(
      `Searching and saving eligible shorts for channel: ${channelId}`,
    );

    // DB에서 채널 조회
    const dbChannel = await this.prisma.youtube_channels.findUnique({
      where: { channel_id: channelId },
    });

    if (!dbChannel) {
      throw new BadRequestException('Channel not found in database');
    }

    if (!dbChannel.is_verified) {
      throw new BadRequestException('Channel is not verified');
    }

    // 쇼츠 검색
    const searchResult = await this.searchShorts(channelId, maxResults);

    // 태그가 포함된 쇼츠만 필터링
    const eligibleShorts = searchResult.shorts.filter((short) =>
      short.isEligible,
    );

    if (eligibleShorts.length === 0) {
      return {
        success: true,
        message: '태그가 포함된 쇼츠가 없습니다',
        searched: searchResult.shorts.length,
        eligible: 0,
        saved: 0,
        videos: [],
      };
    }

    // 쇼츠 저장
    const videoIds = eligibleShorts
      .map((short) => short.videoId)
      .filter((id): id is string => !!id);
    const saveResult = await this.saveShorts(channelId, videoIds);

    return {
      success: true,
      message: `${saveResult.savedCount}개의 적격 쇼츠가 저장되었습니다`,
      searched: searchResult.shorts.length,
      eligible: eligibleShorts.length,
      saved: saveResult.savedCount,
      tags,
      videos: saveResult.videos,
      channel: {
        channelId: dbChannel.channel_id,
        title: dbChannel.channel_title,
      },
    };
  }
}
