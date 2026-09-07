import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize, IsString, IsEmail, IsOptional, IsNumber, IsArray, IsIn,
  IsObject, Matches, IsBoolean, Min, Max, MaxLength, MinLength, Validate,
  ValidateNested, ValidatorConstraint, ValidatorConstraintInterface,
} from 'class-validator'

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? undefined : value
}

@ValidatorConstraint({ name: 'prontuarioSize', async: false })
class ProntuarioSizeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true
    try {
      return JSON.stringify(value).length <= 20_000
    } catch {
      return false
    }
  }

  defaultMessage(): string {
    return 'prontuario excede o limite de 20KB'
  }
}

class PatientProntuarioDto {
  @IsString() @MaxLength(3000) @IsOptional() queixaPrincipal?: string
  @IsString() @MaxLength(3000) @IsOptional() historicoDoenca?: string
  @IsString() @MaxLength(3000) @IsOptional() antecedentesPessoais?: string
  @IsString() @MaxLength(3000) @IsOptional() historicoFamiliar?: string
  @IsString() @MaxLength(1500) @IsOptional() medicamentos?: string
  @IsString() @MaxLength(1500) @IsOptional() condicoesMedicas?: string
  @IsString() @MaxLength(1500) @IsOptional() abordagem?: string
  @IsString() @MaxLength(3000) @IsOptional() objetivos?: string
  @IsString() @MaxLength(120) @IsOptional() frequencia?: string
  @IsString() @MaxLength(120) @IsOptional() duracaoPrevista?: string
  @IsString() @MaxLength(120) @IsOptional() contatoEmergenciaNome?: string
  @IsString() @MaxLength(30) @IsOptional() contatoEmergenciaPhone?: string
  @IsString() @MaxLength(80) @IsOptional() contatoEmergenciaRelacao?: string
  @IsString() @MaxLength(120) @IsOptional() escolaridade?: string
  @IsString() @MaxLength(120) @IsOptional() profissao?: string
  @IsString() @MaxLength(80) @IsOptional() estadoCivil?: string
  @IsString() @MaxLength(120) @IsOptional() religiao?: string

  // Fisioterapia — conteúdo mínimo do prontuário exigido pela Res. COFFITO 414/2012.
  @IsString() @MaxLength(3000) @IsOptional() exameFisico?: string
  @IsString() @MaxLength(3000) @IsOptional() diagnosticoFuncional?: string
  @IsString() @MaxLength(1500) @IsOptional() prognosticoFuncional?: string
  @IsString() @MaxLength(3000) @IsOptional() recursosTerapeuticos?: string
  @IsString() @MaxLength(120) @IsOptional() quantitativoAtendimentos?: string
}

export class CreatePatientDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string

  @Transform(({ value }) => {
    const normalized = emptyToUndefined(value)
    return typeof normalized === 'string' ? normalized.toLowerCase().trim() : normalized
  })
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
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate deve estar no formato AAAA-MM-DD' })
  @IsOptional()
  birthDate?: string

  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
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
  @IsIn(['psychotherapy', 'neuropsychological_assessment']) @IsOptional()
  careMode?: 'psychotherapy' | 'neuropsychological_assessment'
  @IsIn(['per_session','monthly_package','session_package']) @IsOptional() billingType?: 'per_session' | 'monthly_package' | 'session_package'
  @IsNumber() @Min(0) @Type(() => Number) @IsOptional() monthlyPackagePrice?: number
  @IsNumber() @Min(1) @Max(31) @Type(() => Number) @IsOptional() monthlyIncludedSessions?: number
  @IsNumber() @Min(1) @Max(31) @Type(() => Number) @IsOptional() billingDay?: number
  @IsNumber() @IsOptional() sessionDuration?: number
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate deve estar no formato AAAA-MM-DD' })
  @IsOptional()
  startDate?: string
  @IsBoolean() @IsOptional() hasFixedSchedule?: boolean
  @IsNumber() @Min(0) @Max(6) @IsOptional() fixedScheduleWeekday?: number
  @IsString() @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) fixedScheduleTime?: string
  @IsIn(['weekly','biweekly']) @IsOptional() fixedScheduleFrequency?: 'weekly' | 'biweekly'
  @IsIn(['presencial','online']) @IsOptional() fixedScheduleModality?: 'presencial' | 'online'
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(40, { each: true }) @IsOptional() tags?: string[]
  @IsIn(['active','paused','discharged']) @IsOptional() status?: 'active' | 'paused' | 'discharged'
  @IsString() @MaxLength(5000) @IsOptional() privateNotes?: string
  @IsObject() @ValidateNested() @Type(() => PatientProntuarioDto) @Validate(ProntuarioSizeConstraint) @IsOptional()
  prontuario?: PatientProntuarioDto // Schema mínimo: só campos clínicos conhecidos, com limite total e por campo.

  @Transform(({ value }) => typeof value === 'string' ? emptyToUndefined(value.replace(/\D/g, '')) : value)
  @IsOptional()
  @Matches(/^\d{11}$|^\d{14}$/, { message: 'cpfCnpj deve ter 11 digitos (CPF) ou 14 digitos (CNPJ)' })
  cpfCnpj?: string
}
