import { PartialType } from '@nestjs/mapped-types'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateNutritionPlanDto {
  @IsUUID()
  patientId: string

  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string

  @IsString()
  @MaxLength(50_000)
  content: string

  @IsInt()
  @Min(1)
  @Max(10_000)
  @Type(() => Number)
  @IsOptional()
  totalCalories?: number

  @IsDateString()
  @IsOptional()
  validFrom?: string

  @IsDateString()
  @IsOptional()
  validUntil?: string
}

export class UpdateNutritionPlanDto extends PartialType(CreateNutritionPlanDto) {
  // patientId não deve ser atualizado após criação
  @IsOptional()
  @IsUUID()
  override patientId?: string
}
