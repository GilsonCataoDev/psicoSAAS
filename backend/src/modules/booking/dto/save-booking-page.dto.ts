import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator'

export class SaveBookingPageDto {
  @IsBoolean() @IsOptional() isActive?: boolean
  @IsString() @IsOptional() title?: string
  @IsString() @IsOptional() description?: string
  @IsNumber() @IsOptional() sessionPrice?: number
  @IsNumber() @IsOptional() sessionDuration?: number
  @IsNumber() @IsOptional() slotInterval?: number
  @IsBoolean() @IsOptional() allowPresencial?: boolean
  @IsBoolean() @IsOptional() allowOnline?: boolean
  @IsNumber() @IsOptional() minAdvanceDays?: number
  @IsNumber() @IsOptional() maxAdvanceDays?: number
  @IsBoolean() @IsOptional() requirePaymentUpfront?: boolean
  @IsString() @IsOptional() pixKey?: string
  @IsString() @IsOptional() confirmationMessage?: string
}
