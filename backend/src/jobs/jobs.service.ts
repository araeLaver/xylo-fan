import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  YoutubeCrawlJob,
} from './processors/youtube-crawl.processor';
import {
  PointCalculationJob,
} from './processors/point-calculation.processor';
import {
  LeaderboardSnapshotJob,
} from './processors/leaderboard-snapshot.processor';
import {
  ReferralProcessJob,
} from './processors/referral.processor';
import {
  TierNftUpgradeJob,
} from './processors/tier-nft-upgrade.processor';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('youtube-crawl') private youtubeCrawlQueue: Bull.Queue,
    @InjectQueue('point-calculation')
    private pointCalculationQueue: Bull.Queue,
    @InjectQueue('leaderboard-snapshot')
    private leaderboardSnapshotQueue: Bull.Queue,
    @InjectQueue('referral') private referralQueue: Bull.Queue,
    @InjectQueue('tier-nft-upgrade') private tierNftUpgradeQueue: Bull.Queue,
  ) {}

  /**
   * Schedule daily YouTube crawl at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleDailyYoutubeCrawl() {
    this.logger.log('Scheduling daily YouTube crawl job');
    await this.queueYoutubeCrawl({});
  }

  /**
   * Schedule daily point calculation at 3 AM (after crawl)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduleDailyPointCalculation() {
    this.logger.log('Scheduling daily point calculation job');
    await this.queuePointCalculation({});
  }

  /**
   * Schedule daily leaderboard snapshot at 4 AM (after points)
   */
  @Cron('0 4 * * *')
  async scheduleDailyLeaderboardSnapshot() {
    this.logger.log('Scheduling daily leaderboard snapshot job');
    await this.queueLeaderboardSnapshot({ period: 'ONE_DAY' });
  }

  /**
   * Schedule daily Tier NFT upgrade at 4:30 AM (after point calculation)
   */
  @Cron('30 4 * * *')
  async scheduleDailyTierNftUpgrade() {
    this.logger.log('Scheduling daily Tier NFT upgrade job');
    await this.queueTierNftUpgrade({});
  }

  /**
   * Schedule weekly leaderboard snapshot every Monday at 5 AM
   */
  @Cron(CronExpression.MONDAY_TO_FRIDAY_AT_5AM)
  async scheduleWeeklyLeaderboardSnapshot() {
    this.logger.log('Scheduling weekly leaderboard snapshot job');
    await this.queueLeaderboardSnapshot({ period: 'ONE_WEEK' });
  }

  /**
   * Manually queue YouTube crawl job
   */
  async queueYoutubeCrawl(data: YoutubeCrawlJob) {
    const job = await this.youtubeCrawlQueue.add('crawl-channels', data);
    this.logger.log(`YouTube crawl job queued with ID: ${job.id}`);
    return job;
  }

  /**
   * Manually queue point calculation job
   */
  async queuePointCalculation(data: PointCalculationJob) {
    const job = await this.pointCalculationQueue.add('calculate-points', data);
    this.logger.log(`Point calculation job queued with ID: ${job.id}`);
    return job;
  }

  /**
   * Manually queue leaderboard snapshot job
   */
  async queueLeaderboardSnapshot(data: LeaderboardSnapshotJob) {
    const job = await this.leaderboardSnapshotQueue.add(
      'create-snapshot',
      data,
    );
    this.logger.log(`Leaderboard snapshot job queued with ID: ${job.id}`);
    return job;
  }

  /**
   * Queue referral processing job
   */
  async queueReferralProcess(data: ReferralProcessJob) {
    const job = await this.referralQueue.add('process-referral', data);
    this.logger.log(`Referral process job queued with ID: ${job.id}`);
    return job;
  }

  /**
   * Manually queue Tier NFT upgrade job
   */
  async queueTierNftUpgrade(data: TierNftUpgradeJob) {
    const job = await this.tierNftUpgradeQueue.add('upgrade-tiers', data);
    this.logger.log(`Tier NFT upgrade job queued with ID: ${job.id}`);
    return job;
  }
}
