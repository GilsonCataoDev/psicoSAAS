import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class SaveBookingPageDto {
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean

  @IsString() @IsOptional() title?: string
  @IsString() @IsOptional() description?: string
  @IsString() @IsOptional() avatarUrl?: string

  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) sessionPrice?: number
  @IsNumber() @Min(1) @IsOptional() @Type(() => Number) sessionDuration?: number
  @IsNumber() @Min(1) @IsOptional() @Type(() => Number) slotInterval?: number
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) minAdvanceDays?: number
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) maxAdvanceDays?: number

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
