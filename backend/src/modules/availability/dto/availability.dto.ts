import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number

  @Matches(TIME_PATTERN)
  startTime: string

  @Matches(TIME_PATTERN)
  endTime: string

  @IsOptional()
  @IsIn(['presencial', 'online'])
  modality?: 'presencial' | 'online'
}

export class SaveAvailabilitySlotsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[]
}

export class ExtraAvailabilitySlotDto {
  @Matches(DATE_PATTERN)
  date: string

  @Matches(TIME_PATTERN)
  startTime: string

  @Matches(TIME_PATTERN)
  endTime: string

  @IsOptional()
  @IsIn(['presencial', 'online'])
  modality?: 'presencial' | 'online'
}

export class BlockedDateDto {
  @Matches(DATE_PATTERN)
  date: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string
}

export class AvailabilityBlockDto {
  @IsIn(['weekly', 'date'])
  type: 'weekly' | 'date'

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number

  @IsOptional()
  @Matches(DATE_PATTERN)
  date?: string

  @Matches(TIME_PATTERN)
  startTime: string

  @Matches(TIME_PATTERN)
  endTime: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string
}
