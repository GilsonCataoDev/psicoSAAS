import { Injectable, Logger } from '@nestjs/common'
import { IMessageProvider } from './message-provider.interface'
import { ProspectMessage } from '../entities/prospect-message.entity'
import { ProspectConversation } from '../entities/prospect-conversation.entity'

/**
 * Mock provider — simula envio para testes. Retorna ID mockado determinístico.
 * Nunca é usado em produção.
 */
@Injectable()
export class MockMessageProvider implements IMessageProvider {
  private readonly logger = new Logger(MockMessageProvider.name)
  readonly name = 'mock' as const

  canSend(channel: string): boolean {
    return ['whatsapp', 'email', 'instagram'].includes(channel)
  }

  async send(message: ProspectMessage, conversation: ProspectConversation): Promise<{ messageId: string }> {
    const mockId = `mock-${conversation.id}-${Date.now()}`
    this.logger.debug(`mock_send channel=${conversation.channel} messageId=${mockId}`)
    return { messageId: mockId }
  }
}
