import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'
import { TemplateType } from '../entities/template.entity'

export class CreateTemplateDto {
  @IsIn(['patient_form', 'session_note', 'document', 'whatsapp_message', 'receipt'])
  type: TemplateType

  @IsString()
  name: string

  @IsString()
  content: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[]

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean
}
