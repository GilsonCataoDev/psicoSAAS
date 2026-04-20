import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator'

export class CreateAppointmentDto {
  @IsString() patientId: string
  @IsString() date: string
  @IsString() time: string
  @IsNumber() @IsOptional() duration?: number
  @IsIn(['presencial','online']) @IsOptional() modality?: string
  @IsString() @IsOptional() notes?: string
}
