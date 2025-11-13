import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NftController } from './nft.controller';
import { NftService } from './nft.service';

@Module({
  imports: [ConfigModule],
  controllers: [NftController],
  providers: [NftService],
  exports: [NftService],
})
export class NftModule {}
