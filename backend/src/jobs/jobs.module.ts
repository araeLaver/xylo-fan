import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { YoutubeCrawlProcessor } from './processors/youtube-crawl.processor';
import { PointCalculationProcessor } from './processors/point-calculation.processor';
import { LeaderboardSnapshotProcessor } from './processors/leaderboard-snapshot.processor';
import { ReferralProcessor } from './processors/referral.processor';
import { TierNftUpgradeProcessor } from './processors/tier-nft-upgrade.processor';
import { JobsService } from './jobs.service';
import { NftModule } from '../nft/nft.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'youtube-crawl' },
      { name: 'point-calculation' },
      { name: 'leaderboard-snapshot' },
      { name: 'referral' },
      { name: 'tier-nft-upgrade' },
    ),
    NftModule,
  ],
  providers: [
    YoutubeCrawlProcessor,
    PointCalculationProcessor,
    LeaderboardSnapshotProcessor,
    ReferralProcessor,
    TierNftUpgradeProcessor,
    JobsService,
  ],
  exports: [BullModule, JobsService],
})
export class JobsModule {}
