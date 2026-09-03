import { Transform } from 'class-transformer'
import { IsOptional, Matches } from 'class-validator'

export class TestWhatsAppDto {
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/\D/g, '') : value)
  @IsOptional()
  @Matches(/^\d{10,13}$/)
  phone?: string
}
