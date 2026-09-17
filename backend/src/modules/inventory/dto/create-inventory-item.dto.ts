import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  MaxLength,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateInventoryItemDto {
  @IsString()
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsString()
  @MaxLength(20)
  unit: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  minQuantity?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string

  @IsOptional()
  @IsString()
  notes?: string
}
