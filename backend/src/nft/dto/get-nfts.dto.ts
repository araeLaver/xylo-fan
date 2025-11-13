import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetNftsDto {
  @IsOptional()
  @IsIn(['SBT', 'TIER', 'REWARD', 'CONNECTION'], { message: 'Invalid NFT type' })
  type?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_burned?: boolean;
}
