import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateAppointmentDto {
  @IsString() @IsOptional() date?: string
  @IsString() @IsOptional() time?: string
  @IsNumber() @IsOptional() @Type(() => Number) duration?: number
  @IsIn(['presencial','online']) @IsOptional() modality?: string
  @IsString() @IsOptional() notes?: string
}
