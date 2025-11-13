import { IsOptional, IsIn } from 'class-validator';

export class GetXShareUrlDto {
  @IsOptional()
  @IsIn(['referral', 'achievement', 'nft_upgrade'], {
    message: 'Type must be referral, achievement, or nft_upgrade',
  })
  type?: string = 'referral';
}
