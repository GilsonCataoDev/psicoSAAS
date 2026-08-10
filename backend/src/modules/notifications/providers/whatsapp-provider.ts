export type WhatsAppTemplate = {
  name: string
  language: string
  bodyParameters: string[]
}

export type WhatsAppProviderCommand = {
  ownerId: string
  phone: string
  text: string
  template?: WhatsAppTemplate
}

export type WhatsAppProviderResult = {
  sent: boolean
  reason?: 'not_configured' | 'disconnected' | 'api_error' | 'invalid_content'
  error?: string
  nonRetryable?: boolean
  providerMessageId?: string
  providerStatus?: string
  contentLength?: number
}

export interface WhatsAppProvider {
  readonly name: 'evolution' | 'cloud_api'
  isConfigured(): boolean
  send(command: WhatsAppProviderCommand): Promise<WhatsAppProviderResult>
}
