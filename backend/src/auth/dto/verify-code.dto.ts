import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyCodeDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code: string;
}
