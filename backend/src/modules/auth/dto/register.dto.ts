import { Equals, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator'
import { Transform } from 'class-transformer'
import { PROFESSIONS, type Profession } from '../../../common/professions'

export class RegisterDto {
  /** Ausente = 'psicologia' (comportamento histórico). */
  @IsOptional()
  @IsIn(PROFESSIONS, { message: 'Profissão inválida' })
  profession?: Profession

  @IsString()
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string

  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @IsOptional()
  @IsBoolean()
  isStudent?: boolean

  /**
   * CRP é obrigatório só para psicologia (o padrão). Estudante sem CRP
   * (isStudent=true) pula a validação de formato — completa depois no perfil.
   * Outras profissões têm outros conselhos e não passam por aqui.
   */
  @ValidateIf(o => !o.isStudent && (!o.profession || o.profession === 'psicologia'))
  @IsString()
  @Matches(/^(0[1-9]|1[0-9]|2[0-4])\/\d{4,6}$/, { message: 'CRP inválido. Use uma região entre 01 e 24' })
  @Transform(({ value }) => value?.trim())
  crp?: string

  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Telefone inválido. Use DDD + número (10 ou 11 dígitos)' })
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  phone: string

  /**
   * Senha forte: 8+ chars, maiúscula, minúscula, número e símbolo.
   * Mesma política usada no ResetPasswordDto e ChangePasswordDto.
   */
  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])[A-Za-z\d@$!%*?&\-_#]{8,}$/,
    { message: 'A senha deve conter: maiúscula, minúscula, número e símbolo (@$!%*?&-_#)' },
  )
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  specialty?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim().toUpperCase())
  referralCode?: string

  @IsBoolean()
  @Equals(true, { message: 'E necessario aceitar os Termos de Uso' })
  termsAccepted: boolean

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  termsVersion?: string
}
