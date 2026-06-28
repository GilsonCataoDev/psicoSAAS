export const DEFAULT_PREFS = {
  reminder24h: true,
  reminder2h: true,
  dailyAgendaDigest: false,
  chargeAfterSession: false,
  bookingConfirmation: true,
  pixKeyType: 'phone',
  pixKey: '',
  pixName: '',
  autoCharge: true,
  lateReminder: true,
  includeReceipt: false,
  chargeTemplate: 'Ola, {{nome}}!\n\nSegue o valor da sessao: *{{valor}}*.\n\nPIX: `{{pix}}`\n\n{{comprovante}}\n\nObrigado(a).',
  googleCalendarConnected: false,
  googleCalendarEmail: '',
  whatsapp: '',
  confirmationTemplate: 'Ola, {{nome}}! Sua sessao esta confirmada para {{data}} as {{hora}}. Se precisar cancelar ou remarcar, me avise com antecedencia.',
  reminderTemplate: 'Ola, {{nome}}! Passando para lembrar da nossa sessao em {{data}} as {{hora}}. Qualquer imprevisto, me avise.',
}

export type Prefs = typeof DEFAULT_PREFS

export type AuditLog = {
  id: string
  action: string
  resource: string
  resourceId?: string
  createdAt: string
}

export type WhatsAppLog = {
  id: string
  type: string
  status: 'sent' | 'failed'
  patientName?: string | null
  recipientPhone?: string | null
  error?: string | null
  createdAt: string
}

export type WhatsAppStatus = {
  connected: boolean
  configured: boolean
  state?: string
  phone?: string | null
  profileName?: string | null
}

export const AUDIT_LABELS: Record<string, string> = {
  'patient.viewed': 'Paciente visualizado',
  'patient.created': 'Paciente criado',
  'patient.updated': 'Paciente atualizado',
  'patient.deleted': 'Paciente excluido',
  'document.created': 'Documento criado',
  'document.pdf_downloaded': 'PDF baixado',
  'document.email_sent': 'Documento enviado por email',
  'document.deleted': 'Documento excluido',
  'data_export.downloaded': 'Exportacao de dados baixada',
}
