import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { AdminFaqController } from './admin-faq.controller';
import { FaqService } from './faq.service';

@Module({
  controllers: [FaqController, AdminFaqController],
  providers: [FaqService],
  exports: [FaqService],
})
export class FaqModule {}
