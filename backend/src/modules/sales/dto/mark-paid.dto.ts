import { IsString, MaxLength, MinLength } from 'class-validator'

export class MarkPaidDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  payoutReference: string
}
