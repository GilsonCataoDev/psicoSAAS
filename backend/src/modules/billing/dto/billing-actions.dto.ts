import { Type } from 'class-transformer'
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'

export class PaidPlanDto {
  @IsIn(['pro'])
  plan: 'pro'
}

export class SubscribeDto extends PaidPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  creditCardToken?: string
}

export class UpdateCardDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  creditCardToken: string

  @IsOptional()
  @IsIn(['pro'])
  plan?: 'pro'
}

class CreditCardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  holderName: string

  @Matches(/^\d{13,19}$/)
  number: string

  @Matches(/^(0[1-9]|1[0-2])$/)
  expiryMonth: string

  @Matches(/^(\d{2}|\d{4})$/)
  expiryYear: string

  @Matches(/^\d{3,4}$/)
  ccv: string
}

class CreditCardHolderInfoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string

  @IsOptional()
  @IsEmail()
  email?: string

  @Matches(/^(\d{11}|\d{14})$/)
  cpfCnpj: string

  @Matches(/^\d{8}$/)
  postalCode: string

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  addressNumber: string

  @Matches(/^\d{10,13}$/)
  phone: string
}

export class TokenizeCreditCardDto {
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard: CreditCardDto

  @ValidateNested()
  @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo: CreditCardHolderInfoDto
}
