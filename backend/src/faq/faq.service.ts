import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetFaqsDto } from './dto/get-faqs.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  /**
   * FAQ 목록 조회 (공개, Full-Text Search 지원)
   */
  async getFaqs(dto: GetFaqsDto) {
    const { lang = 'ko', search, category, limit = 20, offset = 0 } = dto;

    // WHERE 조건 구성
    const whereConditions: Prisma.faqsWhereInput = {
      is_published: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    // Full-Text Search 처리
    if (search && search.trim()) {
      // PostgreSQL Full-Text Search (GIN index 활용)
      const tsQuery = search.trim().replace(/\s+/g, ' & ');
      const langConfig = lang === 'ko' ? 'simple' : 'english';
      const questionCol = lang === 'ko' ? 'question_ko' : 'question_en';
      const answerCol = lang === 'ko' ? 'answer_ko' : 'answer_en';

      // Raw SQL을 사용한 Full-Text Search
      const faqs = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT id, question_ko, question_en, answer_ko, answer_en,
               category, order_index, is_pinned, view_count, created_at, updated_at
        FROM xylo.faqs
        WHERE is_published = true
          ${category ? `AND category = '${category}'` : ''}
          AND to_tsvector('${langConfig}', ${questionCol} || ' ' || ${answerCol})
              @@ to_tsquery('${langConfig}', '${tsQuery}')
        ORDER BY is_pinned DESC, order_index ASC
        LIMIT ${limit} OFFSET ${offset}
        `,
      );

      const total = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT COUNT(*) as count
        FROM xylo.faqs
        WHERE is_published = true
          ${category ? `AND category = '${category}'` : ''}
          AND to_tsvector('${langConfig}', ${questionCol} || ' ' || ${answerCol})
              @@ to_tsquery('${langConfig}', '${tsQuery}')
        `,
      );

      return {
        faqs: faqs.map((faq) => this.formatFaq(faq, lang)),
        total: parseInt(total[0].count, 10),
        limit,
        offset,
      };
    }

    // 일반 조회 (검색어 없음)
    const [faqs, total] = await Promise.all([
      this.prisma.faqs.findMany({
        where: whereConditions,
        orderBy: [{ is_pinned: 'desc' }, { order_index: 'asc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.faqs.count({ where: whereConditions }),
    ]);

    return {
      faqs: faqs.map((faq) => this.formatFaq(faq, lang)),
      total,
      limit,
      offset,
    };
  }

  /**
   * FAQ 단건 조회 (조회수 증가)
   */
  async getFaqById(id: string, lang: string = 'ko') {
    const faq = await this.prisma.faqs.findUnique({
      where: { id },
    });

    if (!faq || !faq.is_published) {
      throw new NotFoundException('FAQ not found');
    }

    // 조회수 증가
    await this.prisma.faqs.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });

    return this.formatFaq(faq, lang);
  }

  /**
   * FAQ 생성 (관리자)
   */
  async createFaq(dto: CreateFaqDto) {
    const faq = await this.prisma.faqs.create({
      data: {
        question_ko: dto.question_ko,
        question_en: dto.question_en,
        answer_ko: dto.answer_ko,
        answer_en: dto.answer_en,
        category: dto.category || 'General',
        order_index: dto.order_index ?? 0,
        is_published: dto.is_published ?? true,
        is_pinned: dto.is_pinned ?? false,
      },
    });

    return { success: true, message: 'FAQ created successfully', faq };
  }

  /**
   * FAQ 수정 (관리자)
   */
  async updateFaq(id: string, dto: UpdateFaqDto) {
    const existing = await this.prisma.faqs.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('FAQ not found');
    }

    const faq = await this.prisma.faqs.update({
      where: { id },
      data: {
        ...(dto.question_ko && { question_ko: dto.question_ko }),
        ...(dto.question_en && { question_en: dto.question_en }),
        ...(dto.answer_ko && { answer_ko: dto.answer_ko }),
        ...(dto.answer_en && { answer_en: dto.answer_en }),
        ...(dto.category && { category: dto.category }),
        ...(dto.order_index !== undefined && { order_index: dto.order_index }),
        ...(dto.is_published !== undefined && { is_published: dto.is_published }),
        ...(dto.is_pinned !== undefined && { is_pinned: dto.is_pinned }),
        updated_at: new Date(),
      },
    });

    return { success: true, message: 'FAQ updated successfully', faq };
  }

  /**
   * FAQ 삭제 (관리자)
   */
  async deleteFaq(id: string) {
    const existing = await this.prisma.faqs.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('FAQ not found');
    }

    await this.prisma.faqs.delete({ where: { id } });
    return { success: true, message: 'FAQ deleted successfully' };
  }

  /**
   * FAQ 카테고리 목록 조회
   */
  async getCategories() {
    const categories = await this.prisma.faqs.findMany({
      where: { is_published: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => c.category);
  }

  /**
   * FAQ 데이터 포맷팅 (언어별)
   */
  private formatFaq(faq: any, lang: string) {
    return {
      id: faq.id,
      question: lang === 'ko' ? faq.question_ko : faq.question_en,
      answer: lang === 'ko' ? faq.answer_ko : faq.answer_en,
      category: faq.category,
      isPinned: faq.is_pinned,
      viewCount: faq.view_count,
      createdAt: faq.created_at,
      updatedAt: faq.updated_at,
    };
  }
}
