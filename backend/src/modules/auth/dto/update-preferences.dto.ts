import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

/**
 * Preferências do psicólogo — todos os campos são opcionais.
 * O ValidationPipe com whitelist:true garante que nenhum campo fora
 * desta lista chegue ao service, mesmo que o cliente envie dados extras.
 */
export class UpdatePreferencesDto {
  // ── Lembretes ──────────────────────────────────────────────────────────────
  @IsOptional() @IsBoolean() reminder24h?: boolean
  @IsOptional() @IsBoolean() reminder2h?: boolean
  @IsOptional() @IsBoolean() chargeAfterSession?: boolean
  @IsOptional() @IsBoolean() bookingConfirmation?: boolean

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
  @IsOptional() @IsString() @MaxLength(20)  @Transform(({ value }) => value?.replace(/\D/g, '')) whatsapp?: string
  @IsOptional() @IsString() @MaxLength(500) confirmationTemplate?: string
  @IsOptional() @IsString() @MaxLength(500) reminderTemplate?: string

  // ── Integrações ───────────────────────────────────────────────────────────
  /** Chave API Asaas do próprio psicólogo — para geração de links de pagamento */
  @IsOptional() @IsString() @MaxLength(200) @Transform(({ value }) => value?.trim()) asaasApiKey?: string
}
