import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'
import { COUNCIL_REGISTRATION_FORMAT, PROFESSIONS, type Profession } from '../../../common/professions'

export class UpdateProfileDto {
  @IsOptional()
  @IsIn(PROFESSIONS, { message: 'Profissão inválida' })
  profession?: Profession

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name?: string

  /**
   * Registro no conselho de classe — CRP, CRN, CREFITO, CRO... O formato varia
   * por conselho, entao aqui so restringimos o charset. O formato do CRP e
   * cobrado em AuthService.updateProfile, que conhece a profissao efetiva.
   */
  @IsOptional()
  @IsString()
  @Matches(COUNCIL_REGISTRATION_FORMAT, { message: 'Registro profissional inválido' })
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
