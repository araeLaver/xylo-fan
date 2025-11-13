import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { YoutubeModule } from './youtube/youtube.module';
import { PointsModule } from './points/points.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ReferralModule } from './referral/referral.module';
import { NftModule } from './nft/nft.module';
import { EventsModule } from './events/events.module';
import { JobsModule } from './jobs/jobs.module';
import { TutorialModule } from './tutorial/tutorial.module';
import { FaqModule } from './faq/faq.module';
import { TestModule } from './test/test.module';
import { XltClaimModule } from './xlt-claim/xlt-claim.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    // Rate Limiting (기본값: 10초당 10회)
    ThrottlerModule.forRoot([
      {
        ttl: 10000, // 10초
        limit: 10, // 10회
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    YoutubeModule,
    PointsModule,
    JobsModule,
    LeaderboardModule,
    ReferralModule,
    NftModule,
    EventsModule,
    TutorialModule,
    FaqModule,
    XltClaimModule,
    TestModule, // YouTube Shorts 테스트 모듈
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 전역 Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
