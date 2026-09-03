import { ProspectMessage } from '../entities/prospect-message.entity'
import { ProspectConversation } from '../entities/prospect-conversation.entity'

export interface IMessageProvider {
  name: 'manual' | 'mock' | 'whatsapp' | 'email' | 'instagram'
  canSend(channel: string): boolean
  send(message: ProspectMessage, conversation: ProspectConversation): Promise<{ messageId: string }>
}

export const MESSAGE_PROVIDER = Symbol('MESSAGE_PROVIDER')
export const MESSAGE_PROVIDER_FACTORY = Symbol('MESSAGE_PROVIDER_FACTORY')
