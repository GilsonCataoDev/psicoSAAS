import { Transform, Type } from 'class-transformer'
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator'

export class ConversationTurnDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model'

  @IsString()
  @MaxLength(1600)
  text: string
}

export class AskProductHelpDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  question: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  history?: ConversationTurnDto[]
}
