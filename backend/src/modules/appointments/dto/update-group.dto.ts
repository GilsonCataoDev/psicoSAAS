import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateGroupDto {
  @IsString() @IsOptional() date?: string
  @IsString() @IsOptional() time?: string
  @IsNumber() @Min(1) @IsOptional() @Type(() => Number) duration?: number
  @IsIn(['presencial', 'online']) @IsOptional() modality?: 'presencial' | 'online'
  @IsString() @IsOptional() meetingUrl?: string
  @IsString() @IsOptional() notes?: string
  @IsBoolean() @IsOptional() autoVideoRoom?: boolean
}
