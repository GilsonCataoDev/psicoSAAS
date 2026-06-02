import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateAppointmentDto {
  @IsString() patientId: string
  @IsString() date: string
  @IsString() time: string
  @IsNumber() @IsOptional() @Type(() => Number) duration?: number
  @IsIn(['presencial','online']) @IsOptional() modality?: string
  @IsString() @IsOptional() notes?: string
  @IsIn(['none','weekly','biweekly']) @IsOptional() recurrence?: 'none' | 'weekly' | 'biweekly'
  @IsString() @IsOptional() repeatUntil?: string
  @IsBoolean() @IsOptional() fromFixedSchedule?: boolean
}
