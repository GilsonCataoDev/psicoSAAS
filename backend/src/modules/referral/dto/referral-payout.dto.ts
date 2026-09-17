import { Equals, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class UpdateReferralPayoutProfileDto {
  @IsIn(['cpf', 'cnpj', 'email', 'phone', 'random'])
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

  @IsString()
  @MinLength(3)
  @MaxLength(140)
  pixKey: string

  @Matches(/^\d{11}$|^\d{14}$/, { message: 'CPF/CNPJ deve conter 11 ou 14 dígitos' })
  taxpayerId: string

  @Equals(true, { message: 'É necessário aceitar o regulamento do programa' })
  acceptedTerms: true
}

export class MarkReferralCommissionPaidDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  payoutReference: string
}
