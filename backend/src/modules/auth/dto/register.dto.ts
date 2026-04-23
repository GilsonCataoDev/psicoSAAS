import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email: string

  @IsString()
  @Matches(/^\d{2}\/\d{4,6}$/, { message: 'CRP inválido. Formato: 00/000000' })
  crp: string

  /**
   * Senha forte: 8+ chars com maiúscula, minúscula, número e símbolo
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
  specialty?: string
}
