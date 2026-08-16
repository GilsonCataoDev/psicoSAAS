import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateSnippetDto {
  @IsString() @MinLength(1) @MaxLength(60)
  label: string

  @IsString() @MinLength(1) @MaxLength(2000)
  content: string
}
