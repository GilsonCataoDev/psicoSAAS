import { Transform } from 'class-transformer'
import { IsString, IsEmail, IsOptional, IsNumber, IsArray, IsIn, IsObject, Matches, IsBoolean, Min, Max } from 'class-validator'

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

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @IsOptional()
  race?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @IsOptional()
  gender?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @IsOptional()
  sexualOrientation?: string

  @IsNumber() @IsOptional() sessionPrice?: number
  @IsNumber() @IsOptional() sessionDuration?: number
  @IsString() @IsOptional() startDate?: string
  @IsBoolean() @IsOptional() hasFixedSchedule?: boolean
  @IsNumber() @Min(0) @Max(6) @IsOptional() fixedScheduleWeekday?: number
  @IsString() @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) fixedScheduleTime?: string
  @IsIn(['weekly','biweekly']) @IsOptional() fixedScheduleFrequency?: 'weekly' | 'biweekly'
  @IsIn(['presencial','online']) @IsOptional() fixedScheduleModality?: 'presencial' | 'online'
  @IsArray() @IsOptional() tags?: string[]
  @IsIn(['active','paused','discharged']) @IsOptional() status?: 'active' | 'paused' | 'discharged'
  @IsString() @IsOptional() privateNotes?: string
  @IsObject() @IsOptional() prontuario?: Record<string, any>

  @Transform(({ value }) => typeof value === 'string' ? emptyToUndefined(value.replace(/\D/g, '')) : value)
  @IsOptional()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'cpfCnpj deve ter 11 digitos (CPF) ou 14 digitos (CNPJ)' })
  cpfCnpj?: string
}
