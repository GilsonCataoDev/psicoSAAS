import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Senha atual obrigatória' })
  @MaxLength(128)
  currentPassword: string

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter ao menos 8 caracteres' })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-_#])[A-Za-z\d@$!%*?&\-_#]{8,}$/,
    { message: 'A nova senha deve conter: maiúscula, minúscula, número e símbolo (@$!%*?&-_#)' },
  )
  newPassword: string
}
