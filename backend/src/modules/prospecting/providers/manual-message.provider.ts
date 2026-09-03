import { Injectable, Logger } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { IMessageProvider } from './message-provider.interface'
import { ProspectMessage } from '../entities/prospect-message.entity'
import { ProspectConversation } from '../entities/prospect-conversation.entity'

/**
 * Manual provider — não tenta enviar de verdade. Apenas registra e retorna um ID único.
 * Usado quando admin copia a mensagem manualmente para enviar via WhatsApp/Email/etc.
 */
@Injectable()
export class ManualMessageProvider implements IMessageProvider {
  private readonly logger = new Logger(ManualMessageProvider.name)
  readonly name = 'manual' as const

  canSend(channel: string): boolean {
    return channel === 'manual'
  }

  async send(message: ProspectMessage, conversation: ProspectConversation): Promise<{ messageId: string }> {
    const id = `manual-${randomUUID()}`
    this.logger.log(`manual_send conversationId=${conversation.id} channel=${conversation.channel} content_length=${message.content.length}`)
    return { messageId: id }
  }
}
