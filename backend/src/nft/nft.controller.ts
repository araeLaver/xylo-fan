import { Controller, Get, Post, Query, Param, UseGuards, Req, Body, Delete } from '@nestjs/common';
import { NftService } from './nft.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetNftsDto } from './dto/get-nfts.dto';
import { ClaimUserPassDto } from './dto/claim-user-pass.dto';
import { BurnNftDto } from './dto/burn-nft.dto';
import { IssueRewardNftDto } from './dto/issue-reward-nft.dto';

@Controller('nfts')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  /**
   * 내 NFT 컬렉션 조회
   * GET /api/v1/nfts/my-collection?type=TIER&is_burned=false
   */
  @Get('my-collection')
  @UseGuards(JwtAuthGuard)
  async getMyNfts(@Req() req, @Query() dto: GetNftsDto) {
    const { userId } = req.user as any;
    return this.nftService.getMyNfts(userId, dto);
  }

  /**
   * NFT 타입별 설명 조회
   * GET /api/v1/nfts/types
   */
  @Get('types')
  getNftTypes() {
    return this.nftService.getNftTypes();
  }

  /**
   * User Pass 클레임 자격 확인
   * GET /api/v1/nfts/user-pass/eligibility
   */
  @Get('user-pass/eligibility')
  @UseGuards(JwtAuthGuard)
  async checkEligibility(@Req() req) {
    const { userId } = req.user as any;
    return this.nftService.checkUserPassEligibility(userId);
  }

  /**
   * User Pass 클레임
   * POST /api/v1/nfts/claim-user-pass
   */
  @Post('claim-user-pass')
  @UseGuards(JwtAuthGuard)
  async claimUserPass(@Req() req, @Body() dto: ClaimUserPassDto) {
    const { userId } = req.user as any;
    return this.nftService.claimUserPass(userId, dto);
  }

  /**
   * NFT 혜택 안내 조회
   * GET /api/v1/nfts/benefits
   */
  @Get('benefits')
  @UseGuards(JwtAuthGuard)
  async getNftBenefits(@Req() req) {
    const { userId } = req.user as any;
    return this.nftService.getNftBenefits(userId);
  }

  /**
   * NFT 소각
   * POST /api/v1/nfts/burn/:id
   */
  @Post('burn/:id')
  @UseGuards(JwtAuthGuard)
  async burnNft(@Param('id') id: string, @Req() req, @Body() dto: BurnNftDto) {
    const { userId } = req.user as any;
    return this.nftService.burnNft(id, userId, dto);
  }

  /**
   * 리워드 NFT 발급 (관리자용)
   * POST /api/v1/nfts/issue-reward
   *
   * TODO: AdminGuard 추가 필요
   */
  @Post('issue-reward')
  @UseGuards(JwtAuthGuard) // TODO: AdminGuard로 변경
  async issueRewardNft(@Body() dto: IssueRewardNftDto) {
    return this.nftService.issueRewardNft(dto);
  }

  /**
   * NFT 단건 조회
   * GET /api/v1/nfts/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getNftById(@Param('id') id: string, @Req() req) {
    const { userId } = req.user as any;
    return this.nftService.getNftById(id, userId);
  }
}
