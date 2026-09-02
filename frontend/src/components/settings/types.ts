export const LEGACY_DEFAULT_REMINDER_1H_TEMPLATE = 'Ola, {{nome}}! Passando para lembrar que nossa sessao acontece em {{data}} as {{hora}}. Ate daqui a pouco!'

export const DEFAULT_PREFS = {
  reminder24h: true,
  reminder2h: true,
  dailyAgendaDigest: false,
  marketingEmails: true,
  chargeAfterSession: false,
  bookingConfirmation: true,
  pixKeyType: 'phone',
  pixKey: '',
  pixName: '',
  autoCharge: true,
  lateReminder: true,
  includeReceipt: false,
  chargeTemplate: 'Ola, {{nome}}!\n\nSegue o valor da sessao: *{{valor}}*.\n\nPIX: `{{pix}}`\n\n{{comprovante}}\n\nObrigado(a).',
  lateReminderTemplate: 'Ola, {{nome}}!\n\nPassando para lembrar do pagamento pendente da sessao (*{{valor}}*).\n\nChave PIX: `{{pix}}`\n\nQualquer duvida, e so me chamar.',
  googleCalendarConnected: false,
  googleCalendarEmail: '',
  googleCalendarInvitePatients: false,
  whatsapp: '',
  confirmationTemplate: 'Ola, {{nome}}! Sua sessao esta confirmada para {{data}} as {{hora}}. Se precisar cancelar ou remarcar, me avise com antecedencia.',
  reminderTemplate: 'Ola, {{nome}}! Passando para lembrar da nossa sessao em {{data}} as {{hora}}. Qualquer imprevisto, me avise.',
  reminderTemplate24h: 'Ola, {{nome}}! Lembrando que temos nosso encontro em {{data}} as {{hora}}. Ate la!',
  reminderTemplate2h: 'Ola, {{nome}}! Passando para lembrar do nosso encontro hoje as {{hora}}. Ate daqui a pouco!',
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
  providerMessageId?: string | null
  providerStatus?: string | null
  contentLength?: number | null
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
