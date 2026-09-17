import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'
import { Transform } from 'class-transformer'

const PIX_KEY_TYPES = ['cpf', 'cnpj', 'email', 'phone', 'random'] as const

export class CreateSalesRepDto {
  @IsString()
  @MaxLength(200)
  name: string

  @IsEmail()
  @MaxLength(200)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @IsString()
  pixKey: string

  @IsIn(PIX_KEY_TYPES)
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim().toUpperCase())
  couponCode: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionAmount?: number
}
