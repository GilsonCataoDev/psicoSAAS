import { IsString, IsOptional, IsBoolean, IsNumber, IsUrl, Matches } from 'class-validator'

export class SaveBookingPageDto {
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug inválido — use apenas letras minúsculas, números e hífens' })
  slug: string

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
