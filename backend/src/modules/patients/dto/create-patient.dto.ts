import { Transform } from 'class-transformer'
import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsIn, IsObject, Matches } from 'class-validator'

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

export class CreatePatientDto {
  @IsString() name: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsEmail()
  @IsOptional()
  email?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @IsOptional()
  phone?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @IsOptional()
  birthDate?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @IsOptional()
  pronouns?: string

  @IsNumber() @IsOptional() sessionPrice?: number
  @IsNumber() @IsOptional() sessionDuration?: number
  @IsString() @IsOptional() startDate?: string
  @IsArray() @IsOptional() tags?: string[]
  @IsIn(['active','paused','discharged']) @IsOptional() status?: 'active' | 'paused' | 'discharged'
  @IsString() @IsOptional() privateNotes?: string
  @IsObject() @IsOptional() prontuario?: Record<string, any>

  @Transform(({ value }) => typeof value === 'string' ? emptyToUndefined(value.replace(/\D/g, '')) : value)
  @IsOptional()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'cpfCnpj deve ter 11 digitos (CPF) ou 14 digitos (CNPJ)' })
  cpfCnpj?: string
}
