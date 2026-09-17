import { Type } from 'class-transformer'
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

export class CreateNutritionAssessmentDto {
  @IsUUID() patientId: string
  @IsDateString() @IsOptional() assessedAt?: string
  @IsNumber() @Min(1) @Max(500) @Type(() => Number) weightKg: number
  @IsNumber() @Min(30) @Max(250) @Type(() => Number) @IsOptional() heightCm?: number
  @IsNumber() @Min(20) @Max(250) @Type(() => Number) @IsOptional() waistCm?: number
  @IsNumber() @Min(1) @Max(100) @Type(() => Number) @IsOptional() bodyFatPercent?: number
  @IsString() @MaxLength(4000) @IsOptional() notes?: string
}
