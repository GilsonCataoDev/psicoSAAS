import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class SaveBookingPageDto {
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @IsString() @IsOptional() title?: string
  @IsString() @IsOptional() description?: string

  @IsNumber() @IsOptional() @Type(() => Number) sessionPrice?: number
  @IsNumber() @IsOptional() @Type(() => Number) sessionDuration?: number
  @IsNumber() @IsOptional() @Type(() => Number) slotInterval?: number
  @IsNumber() @IsOptional() @Type(() => Number) minAdvanceDays?: number
  @IsNumber() @IsOptional() @Type(() => Number) maxAdvanceDays?: number

  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowPresencial?: boolean

  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  allowOnline?: boolean

  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  requirePaymentUpfront?: boolean

  @IsString() @IsOptional() pixKey?: string
  @IsString() @IsOptional() confirmationMessage?: string
}
