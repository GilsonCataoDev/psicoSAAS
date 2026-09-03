import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateAppointmentDto {
  @IsString() @IsOptional() date?: string
  @IsString() @IsOptional() time?: string
  @IsNumber() @IsOptional() @Type(() => Number) duration?: number
  @IsIn(['presencial','online']) @IsOptional() modality?: string
  @IsString() @IsOptional() meetingUrl?: string
  @IsString() @IsOptional() notes?: string
  @IsBoolean() @IsOptional() autoVideoRoom?: boolean
}

export class UpdateAppointmentStatusDto {
  @IsIn(['scheduled', 'completed', 'cancelled', 'no_show'])
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
}
