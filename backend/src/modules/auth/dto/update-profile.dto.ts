import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\/\d{4,6}$/, { message: 'CRP inválido. Formato: 00/000000' })
  @Transform(({ value }) => value?.trim())
  crp?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  specialty?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  phone?: string

  /** CPF (11 dígitos) ou CNPJ (14 dígitos) — para assinatura via Asaas */
  @IsOptional()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'cpfCnpj deve ter 11 (CPF) ou 14 (CNPJ) dígitos' })
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  cpfCnpj?: string
}
