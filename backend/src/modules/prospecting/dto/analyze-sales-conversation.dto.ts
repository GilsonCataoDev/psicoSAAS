import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class AnalyzeSalesConversationDto {
  @IsIn(['whatsapp', 'direct'])
  channel: 'whatsapp' | 'direct'

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(12_000)
  conversation: string
}

