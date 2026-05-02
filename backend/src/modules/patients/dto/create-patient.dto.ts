import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsIn, IsObject, Matches } from 'class-validator'

export class CreatePatientDto {
  @IsString() name: string
  @IsEmail() @IsOptional() email?: string
  @IsString() @IsOptional() phone?: string
  @IsString() @IsOptional() birthDate?: string
  @IsString() @IsOptional() pronouns?: string
  @IsNumber() @IsOptional() sessionPrice?: number
  @IsNumber() @IsOptional() sessionDuration?: number
  @IsString() @IsOptional() startDate?: string
  @IsArray() @IsOptional() tags?: string[]
  @IsIn(['active','paused','discharged']) @IsOptional() status?: 'active' | 'paused' | 'discharged'
  @IsString() @IsOptional() privateNotes?: string
  @IsObject() @IsOptional() prontuario?: Record<string, any>

  /** CPF (11) ou CNPJ (14) — apenas números, opcional no cadastro */
  @IsOptional()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'cpfCnpj deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' })
  cpfCnpj?: string
}
