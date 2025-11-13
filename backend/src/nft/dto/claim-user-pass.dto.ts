import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * User Pass 클레임 DTO
 * 화면기획 My Page_5: 지갑 연동 필수
 */
export class ClaimUserPassDto {
  @IsNotEmpty({ message: 'Wallet address is required' })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Ethereum wallet address format',
  })
  walletAddress: string; // 지갑 연동 필수 (화면기획서 기준)
}
