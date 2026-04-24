import {
  IsEnum, IsBoolean, IsOptional, IsString,
  ValidateNested, IsNotEmpty, Length, Matches,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreditCardDto {
  @IsString() @IsNotEmpty() holderName: string
  @IsString() @Length(13, 19) number: string
  @IsString() @Matches(/^(0[1-9]|1[0-2])$/) expiryMonth: string
  @IsString() @Matches(/^\d{2,4}$/) expiryYear: string
  @IsString() @Length(3, 4) ccv: string
}

export class CreditCardHolderInfoDto {
  @IsString() @IsNotEmpty() name: string
  @IsString() @IsNotEmpty() email: string
  @IsString() @Matches(/^\d{11,14}$/, { message: 'CPF/CNPJ inválido (somente dígitos)' }) cpfCnpj: string
  @IsString() @IsNotEmpty() postalCode: string
  @IsString() @IsNotEmpty() addressNumber: string
  @IsString() @IsNotEmpty() phone: string
}

export class CreateSubscriptionDto {
  @IsEnum(['essencial', 'pro']) planId: 'essencial' | 'pro'
  @IsEnum(['CREDIT_CARD', 'PIX', 'BOLETO']) billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO'
  @IsBoolean() yearly: boolean

  // CPF do titular (necessário para criar customer no Asaas)
  @IsString() @Matches(/^\d{11}$/, { message: 'CPF inválido (somente 11 dígitos)' })
  cpfCnpj: string

  @IsOptional() @ValidateNested() @Type(() => CreditCardDto)
  creditCard?: CreditCardDto

  @IsOptional() @ValidateNested() @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo?: CreditCardHolderInfoDto
}
