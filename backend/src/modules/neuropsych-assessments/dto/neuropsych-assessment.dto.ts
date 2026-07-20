import { Type } from 'class-transformer'
import {
  ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional,
  IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator'
import { PartialType } from '@nestjs/mapped-types'
import { NEUROPSYCH_DOMAINS } from '../entities/neuropsych-assessment.entity'

const ASSESSMENT_STATUSES = ['planning', 'in_progress', 'integration', 'completed', 'archived'] as const
const ITEM_STATUSES = ['planned', 'applied', 'integrated', 'not_applied'] as const
const PROCEDURE_TYPES = [
  'psychological_test', 'neuropsychological_procedure', 'behavioral_scale',
  'clinical_interview', 'observation', 'other',
] as const

export class CreateNeuropsychAssessmentDto {
  @IsUUID() patientId: string
  @IsDateString() @IsOptional() startedAt?: string
  @IsDateString() @IsOptional() targetCompletionDate?: string
  @IsString() @MaxLength(10000) @IsOptional() referralQuestion?: string
  @IsString() @MaxLength(20000) @IsOptional() clinicalHistory?: string
  @IsString() @MaxLength(10000) @IsOptional() clinicalHypotheses?: string
  @IsArray() @ArrayMaxSize(8) @IsIn(NEUROPSYCH_DOMAINS, { each: true }) @IsOptional()
  evaluatedDomains?: string[]
}

export class UpdateNeuropsychAssessmentDto extends PartialType(CreateNeuropsychAssessmentDto) {
  @IsIn(ASSESSMENT_STATUSES) @IsOptional() status?: typeof ASSESSMENT_STATUSES[number]
  @IsString() @MaxLength(20000) @IsOptional() qualitativeObservations?: string
  @IsString() @MaxLength(30000) @IsOptional() integrationDraft?: string
  @IsString() @MaxLength(30000) @IsOptional() professionalConclusion?: string
  @IsInt() @Min(1) @Type(() => Number) @IsOptional() version?: number
}

export class CreateNeuropsychBatteryItemDto {
  @IsString() @MaxLength(160) name: string
  @IsIn(PROCEDURE_TYPES) procedureType: typeof PROCEDURE_TYPES[number]
  @IsArray() @ArrayMaxSize(8) @IsIn(NEUROPSYCH_DOMAINS, { each: true }) domains: string[]
  @IsString() @MaxLength(5000) @IsOptional() purpose?: string
  @IsDateString() @IsOptional() plannedDate?: string
  @IsInt() @Min(0) @Max(500) @Type(() => Number) @IsOptional() sortOrder?: number
  @IsUUID() @IsOptional() instrumentAssignmentId?: string
}

export class UpdateNeuropsychBatteryItemDto extends PartialType(CreateNeuropsychBatteryItemDto) {
  @IsIn(ITEM_STATUSES) @IsOptional() status?: typeof ITEM_STATUSES[number]
  @IsDateString() @IsOptional() appliedDate?: string
  @IsString() @MaxLength(15000) @IsOptional() resultSummary?: string
  @IsString() @MaxLength(10000) @IsOptional() qualitativeNotes?: string
}

export const NEUROPSYCH_AI_ANALYSIS_FIELDS = [
  'referralQuestion', 'clinicalHistory', 'clinicalHypotheses',
  'qualitativeObservations', 'batteryItems',
] as const

export class CreateNeuropsychAiAnalysisDto {
  @IsArray() @ArrayMaxSize(5) @IsIn(NEUROPSYCH_AI_ANALYSIS_FIELDS, { each: true })
  fields: string[]
}
