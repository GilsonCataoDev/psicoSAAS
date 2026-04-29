import { IsEmail, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string
}
