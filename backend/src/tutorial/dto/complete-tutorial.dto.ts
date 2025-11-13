import { IsIn, IsNotEmpty } from 'class-validator';

export class CompleteTutorialDto {
  @IsIn(['complete', 'skip'], { message: 'Action must be either "complete" or "skip"' })
  @IsNotEmpty({ message: 'Action is required' })
  action: 'complete' | 'skip';
}
