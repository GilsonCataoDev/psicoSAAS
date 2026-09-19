import { IsString, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class MarkPaidDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Transform(({ value }) => value?.trim())
  payoutReference: string
}
