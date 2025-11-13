import { Controller, Get, Query, Param } from '@nestjs/common';
import { FaqService } from './faq.service';
import { GetFaqsDto } from './dto/get-faqs.dto';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * FAQ 목록 조회 (공개)
   * GET /api/v1/faq?lang=ko&search=포인트&category=Points&limit=20&offset=0
   */
  @Get()
  async getFaqs(@Query() dto: GetFaqsDto) {
    return this.faqService.getFaqs(dto);
  }

  /**
   * FAQ 단건 조회 (공개, 조회수 증가)
   * GET /api/v1/faq/:id?lang=ko
   */
  @Get(':id')
  async getFaqById(@Param('id') id: string, @Query('lang') lang?: string) {
    return this.faqService.getFaqById(id, lang || 'ko');
  }

  /**
   * FAQ 카테고리 목록 조회
   * GET /api/v1/faq/categories/list
   */
  @Get('categories/list')
  async getCategories() {
    return this.faqService.getCategories();
  }
}
