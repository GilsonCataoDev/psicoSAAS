import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max, MaxLength, Matches } from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class SaveBookingPageDto {
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @IsString() @IsOptional()
  @Transform(({ value }) => typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    : value)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Use apenas letras, números e hífens na URL' })
  @MaxLength(60)
  slug?: string

  @IsString() @IsOptional() @MaxLength(90) title?: string
  @IsString() @IsOptional() @MaxLength(600) description?: string
  @IsString() @IsOptional() avatarUrl?: string

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) sessionPrice?: number
  @IsNumber() @Min(15) @Max(240) @IsOptional() @Type(() => Number) sessionDuration?: number
  @IsNumber() @Min(15) @Max(240) @IsOptional() @Type(() => Number) presencialSessionDuration?: number
  @IsNumber() @Min(15) @Max(240) @IsOptional() @Type(() => Number) onlineSessionDuration?: number
  @IsNumber() @Min(15) @Max(240) @IsOptional() @Type(() => Number) slotInterval?: number
  @IsNumber() @Min(0) @Max(180) @IsOptional() @Type(() => Number) presencialSlotInterval?: number
  @IsNumber() @Min(0) @Max(180) @IsOptional() @Type(() => Number) onlineSlotInterval?: number
  @IsNumber() @Min(0) @Max(30) @IsOptional() @Type(() => Number) minAdvanceDays?: number
  @IsNumber() @Min(1) @Max(180) @IsOptional() @Type(() => Number) maxAdvanceDays?: number

  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowPresencial?: boolean

  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowOnline?: boolean

  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requirePaymentUpfront?: boolean

  @IsString() @IsOptional() @MaxLength(180) pixKey?: string
  @IsString() @IsOptional() @MaxLength(500) confirmationMessage?: string
}
