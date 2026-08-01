import { IsBoolean, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator'
import { Transform, Type } from 'class-transformer'

/**
 * Preferências do psicólogo — todos os campos são opcionais.
 * O ValidationPipe com whitelist:true garante que nenhum campo fora
 * desta lista chegue ao service, mesmo que o cliente envie dados extras.
 */
export class UpdatePreferencesDto {
  // ── Lembretes ──────────────────────────────────────────────────────────────
  @IsOptional() @IsBoolean() reminder24h?: boolean
  @IsOptional() @IsBoolean() reminder2h?: boolean
  @IsOptional() @IsBoolean() dailyAgendaDigest?: boolean
  @IsOptional() @IsBoolean() chargeAfterSession?: boolean
  @IsOptional() @IsBoolean() bookingConfirmation?: boolean
  @IsOptional() @IsBoolean() googleCalendarInvitePatients?: boolean
  @IsOptional() @IsBoolean() marketingEmails?: boolean

  // ── PIX ────────────────────────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(20)  pixKeyType?: string
  @IsOptional() @IsString() @MaxLength(150) @Transform(({ value }) => value?.trim()) pixKey?: string
  @IsOptional() @IsString() @MaxLength(100) @Transform(({ value }) => value?.trim()) pixName?: string

  // ── Cobranças automáticas ──────────────────────────────────────────────────
  @IsOptional() @IsBoolean() autoCharge?: boolean
  @IsOptional() @IsBoolean() lateReminder?: boolean
  @IsOptional() @IsBoolean() includeReceipt?: boolean

  // ── Templates de mensagem ─────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(1000) chargeTemplate?: string
  @IsOptional() @IsString() @MaxLength(1000) lateReminderTemplate?: string
  @IsOptional() @IsString() @MaxLength(20)  @Transform(({ value }) => value?.replace(/\D/g, '')) whatsapp?: string
  @IsOptional() @IsString() @MaxLength(500) confirmationTemplate?: string
  /** @deprecated Use reminderTemplate24h/reminderTemplate2h. Mantido para contas com o template antigo já salvo. */
  @IsOptional() @IsString() @MaxLength(500) reminderTemplate?: string
  @IsOptional() @IsString() @MaxLength(500) reminderTemplate24h?: string
  @IsOptional() @IsString() @MaxLength(500) reminderTemplate2h?: string

  // ── Financeiro ─────────────────────────────────────────────────────────────
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) monthlyRevenueGoal?: number
}
