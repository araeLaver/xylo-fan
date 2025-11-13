import { IsUUID, IsNotEmpty } from 'class-validator';

export class RecoverAccountDto {
  @IsUUID('4', { message: 'Invalid verification ID format' })
  @IsNotEmpty({ message: 'Verification ID is required' })
  verificationId: string;
}
