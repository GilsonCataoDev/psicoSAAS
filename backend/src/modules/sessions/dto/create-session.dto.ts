import { IsString, IsOptional, IsNumber, IsArray, IsIn, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateSessionDto {
  @IsString() patientId: string
  @IsString() date: string
  @IsNumber() @IsOptional() @Type(() => Number) duration?: number
  @IsString() @IsOptional() appointmentId?: string
  @IsNumber() @Min(1) @Max(5) @IsOptional() @Type(() => Number) mood?: number
  @IsString() @IsOptional() summary?: string
  @IsString() @IsOptional() privateNotes?: string
  @IsString() @IsOptional() nextSteps?: string
  @IsArray() @IsOptional() tags?: string[]
  @IsIn(['paid','pending','waived']) @IsOptional() paymentStatus?: string
}
