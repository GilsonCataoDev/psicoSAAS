import { IsString, MinLength, Equals } from 'class-validator'

export class DeleteAccountDto {
  @IsString()
  @MinLength(8)
  password: string

  @IsString()
  @Equals('EXCLUIR', { message: 'Digite EXCLUIR para confirmar a exclusao definitiva da conta' })
  confirmation: string
}
