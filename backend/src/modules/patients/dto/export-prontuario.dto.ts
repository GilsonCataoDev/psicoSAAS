import { Transform } from 'class-transformer'
import { ArrayNotEmpty, IsArray, IsIn, IsOptional, Matches } from 'class-validator'

export const PRONTUARIO_EXPORT_SECTIONS = [
  'identification',
  'anamnesis',
  'treatment_plan',
  'evolutions',
] as const

export type ProntuarioExportSection = typeof PRONTUARIO_EXPORT_SECTIONS[number]

export class ExportProntuarioQueryDto {
  @IsOptional()
  @IsIn(['professional', 'patient'])
  audience?: 'professional' | 'patient'

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string

  @IsOptional()
  @Transform(({ value }) => Array.isArray(value) ? value : String(value).split(','))
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PRONTUARIO_EXPORT_SECTIONS, { each: true })
  sections?: ProntuarioExportSection[]
}
