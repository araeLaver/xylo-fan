import { IsString, Length } from 'class-validator';

export class RegisterReferralDto {
  @IsString()
  @Length(6, 20)
  referralCode: string;
}
