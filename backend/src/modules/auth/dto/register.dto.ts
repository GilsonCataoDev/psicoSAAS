import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: 'Nome deve ter ao menos 2 caracteres' })
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string

  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @IsString()
  @Matches(/^\d{2}\/\d{4,6}$/, { message: 'CRP inválido. Formato: 00/000000' })
  @Transform(({ value }) => value?.trim())
  crp: string

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
  @Equals(true, { message: 'E necessario aceitar os Termos de Uso e a Politica de Privacidade' })
  termsAccepted: boolean

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  termsVersion?: string
}
