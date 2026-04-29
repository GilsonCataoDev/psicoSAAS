import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  /** Validação mínima — não revela política de senha (evita enumeração por mensagem) */
  @IsString()
  @IsNotEmpty({ message: 'Senha obrigatória' })
  @MinLength(1)
  @MaxLength(128)
  password: string
}
