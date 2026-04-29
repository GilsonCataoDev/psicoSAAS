import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class ResetPasswordDto {
  /** Token bruto recebido por e-mail — validado no service via SHA-256 */
  @IsString()
  @IsNotEmpty({ message: 'Token obrigatório' })
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  token: string

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])[A-Za-z\d@$!%*?&\-_#]{8,}$/,
    { message: 'A senha deve conter: maiúscula, minúscula, número e símbolo (@$!%*?&-_#)' },
  )
  password: string
}
