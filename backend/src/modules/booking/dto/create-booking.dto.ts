import { IsString, IsEmail, IsOptional, Matches, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateBookingDto {
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  patientName: string

  @IsEmail()
  @MaxLength(254)
  patientEmail: string

  @IsString() @IsOptional()
  @MaxLength(20)
  patientPhone?: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida (use YYYY-MM-DD)' })
  date: string

  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário inválido (use HH:MM)' })
  time: string

  @IsString() @IsOptional()
  modality?: 'presencial' | 'online'

  /**
   * Campo livre preenchido pelo paciente — strip de HTML para prevenir
   * eventual XSS caso algum componente use innerHTML no futuro.
   */
  @IsString() @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim()
      : value
  )
  patientNotes?: string
}
