import { SetMetadata } from '@nestjs/common'

export const AUDITABLE_KEY = 'auditable'

export interface AuditableOptions {
  action:      string   // ex: 'patient.created', 'session.deleted'
  resource:    string   // ex: 'patient', 'session'
  /** Chave no resultado para usar como resourceId (ex: 'id') */
  resultIdKey?: string
  /** Chave no param da rota para usar como resourceId (ex: 'id') */
  paramIdKey?:  string
}

/**
 * Decora um controller method para registrar auditoria automaticamente
 * ao concluir com sucesso (erros não são auditados — a mutação não ocorreu).
 *
 * @example
 * @Post()
 * @Auditable({ action: 'patient.created', resource: 'patient', resultIdKey: 'id' })
 * create(@Body() dto: CreatePatientDto) { ... }
 */
export const Auditable = (options: AuditableOptions) =>
  SetMetadata(AUDITABLE_KEY, options)
