import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { google, youtube_v3 } from 'googleapis';

export interface YoutubeCrawlJob {
  channelId?: string; // 특정 채널만 크롤링 (없으면 모든 인증된 채널)
}

/**
 * YouTube 크롤링 Processor
 *
 * 스케줄:
 * - 매일 02:00 KST (jobs.service.ts)
 *
 * 처리 순서:
 * 1. 채널 통계 업데이트 (구독자, 영상 수, 조회수)
 * 2. 최근 7일 영상 크롤링 (#WITCHES, #XYLO 태그 체크)
 * 3. 채널 일일 스냅샷 생성 (리더보드용)
 *
 * YouTube Data API v3 사용:
 * - channels.list: 채널 통계
 * - search.list: 최근 영상 검색
 * - videos.list: 영상 상세 정보 (태그, duration, 조회수 등)
 *
 * 포인트 적립 조건:
 * - is_eligible: true (#WITCHES 또는 #XYLO 태그 포함)
 * - is_shorts: false (Shorts는 제외, 60초 이하)
 */
@Processor('youtube-crawl')
export class YoutubeCrawlProcessor {
  private readonly logger = new Logger(YoutubeCrawlProcessor.name);
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

  @Process('crawl-channels')
  async handleCrawlChannels(job: Bull.Job<YoutubeCrawlJob>) {
    this.logger.log('Starting YouTube channel crawl job');

    try {
      let channels;

      if (job.data.channelId) {
        // Crawl specific channel
        channels = await this.prisma.youtube_channels.findMany({
          where: {
            channel_id: job.data.channelId,
            is_verified: true,
          },
        });
      } else {
        // Crawl all verified channels
        channels = await this.prisma.youtube_channels.findMany({
          where: { is_verified: true },
        });
      }

      this.logger.log(`Found ${channels.length} channels to crawl`);

      let totalVideosProcessed = 0;

      for (const channel of channels) {
        try {
          job.progress(20);

          // 1. 채널 통계 업데이트
          await this.updateChannelStatistics(channel);

          job.progress(40);

          // 2. 최근 비디오 크롤링 (최근 7일)
          const videosProcessed = await this.crawlChannelVideos(channel);
          totalVideosProcessed += videosProcessed;

          job.progress(80);

          // 3. 채널 일일 스냅샷 생성
          await this.createChannelSnapshot(channel);

          job.progress(100);

          this.logger.log(
            `Crawled channel ${channel.channel_id}: processed ${videosProcessed} videos`,
          );
        } catch (error: any) {
          this.logger.error(
            `Error crawling channel ${channel.channel_id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `YouTube channel crawl job completed: ${totalVideosProcessed} videos processed`,
      );
      return {
        success: true,
        crawledCount: channels.length,
        videosProcessed: totalVideosProcessed,
      };
    } catch (error: any) {
      this.logger.error(`YouTube crawl job failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 채널 통계 업데이트
   */
  private async updateChannelStatistics(channel: any): Promise<void> {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channel.channel_id],
    });

    const ytChannel = response.data.items?.[0];
    if (!ytChannel) {
      this.logger.warn(`Channel ${channel.channel_id} not found on YouTube`);
      return;
    }

    const newSubscriberCount = parseInt(
      ytChannel.statistics?.subscriberCount || '0',
    );
    const newVideoCount = parseInt(ytChannel.statistics?.videoCount || '0');
    const newViewCount = BigInt(ytChannel.statistics?.viewCount || '0');

    // Update channel statistics
    await this.prisma.youtube_channels.update({
      where: { id: channel.id },
      data: {
        subscriber_count: newSubscriberCount,
        video_count: newVideoCount,
        view_count: newViewCount,
        channel_title: ytChannel.snippet?.title,
        thumbnail_url: ytChannel.snippet?.thumbnails?.default?.url,
      },
    });

    this.logger.log(
      `Updated channel ${channel.channel_id}: ${newSubscriberCount} subscribers`,
    );
  }

  /**
   * 채널의 최근 비디오 크롤링
   */
  private async crawlChannelVideos(channel: any): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // YouTube API로 최근 비디오 검색
    const searchResponse = await this.youtube.search.list({
      part: ['id', 'snippet'],
      channelId: channel.channel_id,
      type: ['video'],
      order: 'date',
      publishedAfter: sevenDaysAgo.toISOString(),
      maxResults: 50,
    });

    const videos = searchResponse.data.items || [];

    if (videos.length === 0) {
      this.logger.log(`No recent videos for channel ${channel.channel_id}`);
      return 0;
    }

    // 비디오 ID 추출
    const videoIds = videos
      .map((v) => v.id?.videoId)
      .filter((id): id is string => !!id);

    if (videoIds.length === 0) {
      return 0;
    }

    // 비디오 상세 정보 조회 (배치)
    // status part 추가: 공개 상태, 업로드 상태 등 (우선순위 1)
    const videoDetailsResponse = await this.youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics', 'status'],
      id: videoIds,
    });

    const videoDetails = videoDetailsResponse.data.items || [];

    // 필수 태그 설정
    const requiredTags = await this.getRequiredTags();

    let processedCount = 0;

    for (const video of videoDetails) {
      if (!video.id) continue;

      try {
        // 태그 추출
        const tags = video.snippet?.tags || [];

        // Shorts 여부 확인 (60초 이하)
        const duration = this.parseDuration(
          video.contentDetails?.duration || '',
        );
        const isShorts = duration <= 60;

        // 필수 태그 포함 여부 확인
        const isEligible = this.checkEligibility(tags, requiredTags);

        // 비디오 정보 저장/업데이트
        await this.prisma.youtube_videos.upsert({
          where: { video_id: video.id },
          create: {
            channel_id: channel.id,
            video_id: video.id,

            // snippet: 기본 정보
            title: video.snippet?.title || '',
            description: video.snippet?.description || '',
            thumbnail_url: video.snippet?.thumbnails?.default?.url || '',
            published_at: video.snippet?.publishedAt
              ? new Date(video.snippet.publishedAt)
              : new Date(),

            // snippet: 추가 필드 (비용 추가 없음)
            category_id: video.snippet?.categoryId || null,
            default_language: video.snippet?.defaultLanguage || null,
            default_audio_language:
              video.snippet?.defaultAudioLanguage || null,
            channel_title: video.snippet?.channelTitle || null,
            live_broadcast_content:
              video.snippet?.liveBroadcastContent || 'none',

            // snippet: 고해상도 썸네일
            thumbnail_medium_url:
              video.snippet?.thumbnails?.medium?.url || null,
            thumbnail_high_url: video.snippet?.thumbnails?.high?.url || null,
            thumbnail_standard_url:
              video.snippet?.thumbnails?.standard?.url || null,
            thumbnail_maxres_url:
              video.snippet?.thumbnails?.maxres?.url || null,

            // contentDetails: 기본 정보
            duration,

            // contentDetails: 추가 필드 (비용 추가 없음)
            definition: video.contentDetails?.definition || null,
            dimension: video.contentDetails?.dimension || '2d',
            has_caption: video.contentDetails?.caption === 'true',
            is_licensed_content:
              video.contentDetails?.licensedContent || false,
            projection: video.contentDetails?.projection || 'rectangular',

            // statistics: 조회수, 좋아요, 댓글
            view_count: parseInt(video.statistics?.viewCount || '0'),
            like_count: parseInt(video.statistics?.likeCount || '0'),
            comment_count: parseInt(video.statistics?.commentCount || '0'),

            // status: 공개 상태 및 업로드 상태 (우선순위 1)
            privacy_status: video.status?.privacyStatus || 'public',
            upload_status: video.status?.uploadStatus || 'processed',
            is_embeddable: video.status?.embeddable ?? true,
            license: video.status?.license || 'youtube',
            is_made_for_kids: video.status?.madeForKids ?? false,
            is_public_stats_viewable:
              video.status?.publicStatsViewable ?? true,

            // 태그 및 분류
            tags,
            is_shorts: isShorts,
            is_eligible: isEligible,
          },
          update: {
            // 통계는 매일 업데이트
            view_count: parseInt(video.statistics?.viewCount || '0'),
            like_count: parseInt(video.statistics?.likeCount || '0'),
            comment_count: parseInt(video.statistics?.commentCount || '0'),

            // 태그 업데이트 (변경 가능)
            tags,
            is_shorts: isShorts,
            is_eligible: isEligible,

            // 상태 업데이트 (공개→비공개 전환 감지)
            privacy_status: video.status?.privacyStatus || 'public',
            upload_status: video.status?.uploadStatus || 'processed',
            is_embeddable: video.status?.embeddable ?? true,

            // 썸네일 업데이트 (변경 가능)
            thumbnail_url: video.snippet?.thumbnails?.default?.url || '',
            thumbnail_medium_url:
              video.snippet?.thumbnails?.medium?.url || null,
            thumbnail_high_url: video.snippet?.thumbnails?.high?.url || null,
            thumbnail_standard_url:
              video.snippet?.thumbnails?.standard?.url || null,
            thumbnail_maxres_url:
              video.snippet?.thumbnails?.maxres?.url || null,

            // 제목/설명 업데이트 (변경 가능)
            title: video.snippet?.title || '',
            description: video.snippet?.description || '',
          },
        });

        // 비디오 스냅샷 생성 (오늘자)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const videoRecord = await this.prisma.youtube_videos.findUnique({
          where: { video_id: video.id },
        });

        if (videoRecord) {
          await this.prisma.youtube_video_snapshots.upsert({
            where: {
              video_id_snapshot_date: {
                video_id: videoRecord.id,
                snapshot_date: today,
              },
            },
            create: {
              video_id: videoRecord.id,
              snapshot_date: today,
              view_count: parseInt(video.statistics?.viewCount || '0'),
              like_count: parseInt(video.statistics?.likeCount || '0'),
              comment_count: parseInt(video.statistics?.commentCount || '0'),
            },
            update: {
              view_count: parseInt(video.statistics?.viewCount || '0'),
              like_count: parseInt(video.statistics?.likeCount || '0'),
              comment_count: parseInt(video.statistics?.commentCount || '0'),
            },
          });
        }

        processedCount++;
      } catch (error: any) {
        this.logger.error(
          `Error processing video ${video.id}: ${error.message}`,
        );
      }
    }

    return processedCount;
  }

  /**
   * 채널 일일 스냅샷 생성
   */
  private async createChannelSnapshot(channel: any): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.channel_daily_snapshots.upsert({
      where: {
        channel_id_snapshot_date: {
          channel_id: channel.id,
          snapshot_date: today,
        },
      },
      create: {
        channel_id: channel.id,
        snapshot_date: today,
        subscriber_count: channel.subscriber_count || 0,
        video_count: channel.video_count || 0,
        view_count: channel.view_count || BigInt(0),
      },
      update: {
        subscriber_count: channel.subscriber_count || 0,
        video_count: channel.video_count || 0,
        view_count: channel.view_count || BigInt(0),
      },
    });
  }

  /**
   * YouTube 비디오 duration 파싱 (ISO 8601 형식)
   * 예: PT1H2M10S → 3730초
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
  private checkEligibility(tags: string[], requiredTags: string[]): boolean {
    const lowerTags = tags.map((t) => t.toLowerCase());

    return requiredTags.some((required) =>
      lowerTags.some((tag) => tag.includes(required.toLowerCase())),
    );
  }

  /**
   * 시스템 설정에서 필수 태그 가져오기
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
}
