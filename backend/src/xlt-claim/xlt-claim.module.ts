import { Module } from '@nestjs/common';
import { XltClaimService } from './xlt-claim.service';
import { XltClaimController } from './xlt-claim.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [XltClaimController],
  providers: [XltClaimService],
  exports: [XltClaimService],
})
export class XltClaimModule {}
