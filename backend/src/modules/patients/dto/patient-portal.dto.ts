import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

export class UpdatePatientPortalIntakeDto {
  @Transform(({ value }) => emptyToUndefined(value))
  @IsEmail()
  @IsOptional()
  email?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(20)
  @IsOptional()
  birthDate?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  @IsOptional()
  pronouns?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  race?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  gender?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  sexualOrientation?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(3000)
  @IsOptional()
  queixaPrincipal?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(120)
  @IsOptional()
  contatoEmergenciaNome?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(30)
  @IsOptional()
  contatoEmergenciaPhone?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  @IsOptional()
  contatoEmergenciaRelacao?: string
}
