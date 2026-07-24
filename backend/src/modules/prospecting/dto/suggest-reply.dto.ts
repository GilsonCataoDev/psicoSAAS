import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class SuggestReplyDto {
  @IsIn(['whatsapp', 'direct'])
  channel: 'whatsapp' | 'direct'

  @IsString() @IsNotEmpty() @MaxLength(4000)
  leadReplyText: string

  @IsString() @IsOptional() @MaxLength(2000)
  priorMessage?: string
}
