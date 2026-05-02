import { Type } from 'class-transformer'
import {
  IsString, IsOptional, IsNotEmpty, Length, Matches,
  ValidateNested,
} from 'class-validator'

export class CreditCardDto {
  @IsString() @IsNotEmpty() holderName: string

  /** Número do cartão — pode ter espaços, serão removidos */
  @IsString() @IsNotEmpty() number: string

  /** Mês de validade: "01" a "12" */
  @IsString() @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expiryMonth inválido (01-12)' })
  expiryMonth: string

  /** Ano de validade: 4 dígitos ex: "2027" */
  @IsString() @Matches(/^\d{4}$/, { message: 'expiryYear inválido (ex: 2027)' })
  expiryYear: string

  @IsString() @Length(3, 4) ccv: string
}

export class CreditCardHolderInfoDto {
  @IsString() @IsNotEmpty() name: string
  @IsString() @IsNotEmpty() email: string

  /** CPF (11 dígitos) ou CNPJ (14 dígitos), apenas números */
  @IsString() @Matches(/^\d{11}(\d{3})?$/, { message: 'cpfCnpj deve ter 11 (CPF) ou 14 (CNPJ) dígitos' })
  cpfCnpj: string

  /** CEP apenas números, 8 dígitos */
  @IsString() @Matches(/^\d{8}$/, { message: 'postalCode deve ter 8 dígitos' })
  postalCode: string

  @IsString() @IsNotEmpty() addressNumber: string

  @IsString() @IsOptional() addressComplement?: string

  /** Telefone apenas números, 10-11 dígitos */
  @IsString() @Matches(/^\d{10,11}$/, { message: 'phone inválido' })
  phone: string

  @IsString() @IsOptional() mobilePhone?: string
}

export class ChargeCardDto {
  @ValidateNested() @Type(() => CreditCardDto)
  creditCard: CreditCardDto

  @ValidateNested() @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo: CreditCardHolderInfoDto

  /** Se true, salva o customerId Asaas no cadastro do paciente para futuras cobranças */
  @IsOptional() saveCustomer?: boolean
}
