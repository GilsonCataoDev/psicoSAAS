import { IsString, IsEmail, IsOptional, Matches } from 'class-validator'

export class CreateBookingDto {
  @IsString() patientName: string
  @IsEmail() patientEmail: string
  @IsString() @IsOptional() patientPhone?: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida (use YYYY-MM-DD)' })
  date: string

  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário inválido (use HH:MM)' })
  time: string

  @IsString() @IsOptional() modality?: 'presencial' | 'online'
  @IsString() @IsOptional() patientNotes?: string
}
