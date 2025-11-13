import { IsNotEmpty, IsUUID } from 'class-validator';

export class VerifyChannelDto {
  @IsNotEmpty()
  @IsUUID()
  channelDbId: string;
}
