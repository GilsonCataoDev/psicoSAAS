import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateGroupDto {
  @IsString() @IsOptional() time?: string
  @IsNumber() @Min(1) @IsOptional() @Type(() => Number) duration?: number
  @IsIn(['presencial', 'online']) @IsOptional() modality?: 'presencial' | 'online'
  @IsString() @IsOptional() notes?: string
}
