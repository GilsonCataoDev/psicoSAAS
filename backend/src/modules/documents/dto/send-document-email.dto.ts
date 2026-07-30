import { IsEmail, MaxLength } from 'class-validator'

export class SendDocumentEmailDto {
  @IsEmail()
  @MaxLength(254)
  to: string
}
