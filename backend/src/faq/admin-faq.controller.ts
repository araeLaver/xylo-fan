import { Controller, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@Controller('admin/faq')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}

  /**
   * FAQ 생성 (관리자 전용)
   * POST /api/v1/admin/faq
   */
  @Post()
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.faqService.createFaq(dto);
  }

  /**
   * FAQ 수정 (관리자 전용)
   * PATCH /api/v1/admin/faq/:id
   */
  @Patch(':id')
  async updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqService.updateFaq(id, dto);
  }

  /**
   * FAQ 삭제 (관리자 전용)
   * DELETE /api/v1/admin/faq/:id
   */
  @Delete(':id')
  async deleteFaq(@Param('id') id: string) {
    return this.faqService.deleteFaq(id);
  }
}
