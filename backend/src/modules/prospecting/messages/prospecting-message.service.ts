import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProspectMessage } from '../entities/prospect-message.entity'
import { ProspectConversation } from '../entities/prospect-conversation.entity'
import { Prospect } from '../entities/prospect.entity'
import { ProspectActivity } from '../entities/prospect-activity.entity'

export type InboundClassification = 'interested' | 'question' | 'objection' | 'not_interested' | 'opt_out' | 'unknown'

@Injectable()
export class ProspectingMessageService {
  private readonly logger = new Logger(ProspectingMessageService.name)

  constructor(
    @InjectRepository(ProspectMessage) private readonly messages: Repository<ProspectMessage>,
    @InjectRepository(ProspectConversation) private readonly conversations: Repository<ProspectConversation>,
    @InjectRepository(Prospect) private readonly prospects: Repository<Prospect>,
    @InjectRepository(ProspectActivity) private readonly activities: Repository<ProspectActivity>,
  ) {}

  async createDraft(
    conversationId: string,
    content: string,
    aiGenerated: boolean = false,
    actorUserId?: string,
  ): Promise<ProspectMessage> {
    if (!content || content.length === 0 || content.length > 5000) {
      throw new BadRequestException('Content must be between 1 and 5000 characters')
    }

    const conversation = await this.conversations.findOne({ where: { id: conversationId } })
    if (!conversation) throw new NotFoundException('Conversa não encontrada')

    const prospect = await this.prospects.findOne({ where: { id: conversation.prospectId } })
    if (!prospect) throw new NotFoundException('Prospect não encontrado')
    if (prospect.doNotContact) throw new BadRequestException('Prospect marcado como "não contatar"')

    const message = await this.messages.save(
      this.messages.create({
        conversationId,
        direction: 'outbound',
        status: 'draft',
        content,
        aiGenerated,
      }),
    )

    if (conversation.status === 'draft') {
      conversation.status = 'awaiting_approval'
      await this.conversations.save(conversation)
    }

    await this.activities.save(
      this.activities.create({
        prospectId: conversation.prospectId,
        action: 'status_changed',
        actorUserId: actorUserId ?? null,
        notes: `Rascunho de mensagem criado (IA: ${aiGenerated})`,
        metadata: { messageId: message.id, aiGenerated },
      }),
    )

    return message
  }

  async getMessage(id: string): Promise<ProspectMessage> {
    const message = await this.messages.findOne({ where: { id } })
    if (!message) throw new NotFoundException('Mensagem não encontrada')
    return message
  }

  async approve(
    id: string,
    approvedByUserId: string,
    notes?: string,
  ): Promise<ProspectMessage> {
    const message = await this.getMessage(id)
    if (message.status !== 'draft' && message.status !== 'awaiting_approval') {
      throw new BadRequestException(`Não pode aprovar mensagem com status "${message.status}"`)
    }

    message.status = 'approved'
    message.approvedByUserId = approvedByUserId
    message.approvedAt = new Date()

    const updated = await this.messages.save(message)

    const conversation = await this.conversations.findOne({ where: { id: message.conversationId } })
    if (conversation) {
      if (conversation.status === 'draft' || conversation.status === 'awaiting_approval') {
        conversation.status = 'approved'
        await this.conversations.save(conversation)
      }
      await this.activities.save(
        this.activities.create({
          prospectId: conversation.prospectId,
          action: 'status_changed',
          actorUserId: approvedByUserId,
          notes: notes || 'Mensagem aprovada',
          metadata: { messageId: id },
        }),
      )
    }

    return updated
  }

  async requestApproval(id: string): Promise<ProspectMessage> {
    const message = await this.getMessage(id)
    if (message.status !== 'draft') {
      throw new BadRequestException(`Não pode solicitar aprovação para status "${message.status}"`)
    }

    message.status = 'awaiting_approval'
    return this.messages.save(message)
  }

  async send(
    id: string,
    providerMessageId?: string,
  ): Promise<ProspectMessage> {
    const message = await this.getMessage(id)
    if (message.status !== 'approved') {
      throw new BadRequestException(`Mensagem deve estar aprovada antes de enviar (atual: "${message.status}")`)
    }

    message.status = 'sent'
    message.sentAt = new Date()
    if (providerMessageId) {
      message.providerMessageId = providerMessageId
    }

    const updated = await this.messages.save(message)

    const conversation = await this.conversations.findOne({ where: { id: message.conversationId } })
    if (conversation) {
      conversation.lastOutboundAt = new Date()
      if (conversation.status === 'approved' || conversation.status === 'awaiting_approval' || conversation.status === 'draft') {
        conversation.status = 'active'
      }
      await this.conversations.save(conversation)
    }

    return updated
  }

  async recordInbound(
    conversationId: string,
    content: string,
    providerMessageId?: string,
    classification: InboundClassification = 'unknown',
    actorUserId?: string,
  ): Promise<ProspectMessage> {
    if (!content || content.length === 0 || content.length > 5000) {
      throw new BadRequestException('Content must be between 1 and 5000 characters')
    }

    const conversation = await this.conversations.findOne({ where: { id: conversationId } })
    if (!conversation) throw new NotFoundException('Conversa não encontrada')

    const existing = providerMessageId
      ? await this.messages.findOne({ where: { providerMessageId } })
      : null

    if (existing) {
      this.logger.debug(`inbound_message_idempotent providerMessageId=${providerMessageId}`)
      return existing
    }

    const message = await this.messages.save(
      this.messages.create({
        conversationId,
        direction: 'inbound',
        status: 'delivered',
        content,
        providerMessageId: providerMessageId ?? null,
        deliveredAt: new Date(),
      }),
    )

    conversation.lastInboundAt = new Date()
    if (conversation.status !== 'converted' && conversation.status !== 'opted_out' && conversation.status !== 'closed') {
      conversation.status = 'active'
    }
    await this.conversations.save(conversation)

    await this.activities.save(
      this.activities.create({
        prospectId: conversation.prospectId,
        action: 'status_changed',
        actorUserId: actorUserId ?? null,
        notes: `Mensagem inbound recebida: ${classification}`,
        metadata: { messageId: message.id, classification },
      }),
    )

    return message
  }

  private classifyInbound(content: string): InboundClassification {
    const lower = content.toLowerCase()

    if (/\b(opt out|sair|não quero|pare|stop|bloquear|não contatar)\b/.test(lower)) {
      return 'opt_out'
    }
    if (/\b(sim|ok|obrigad|interested|sim!|pode enviar|ótimo)\b/.test(lower)) {
      return 'interested'
    }
    if (/\b(qual|como|quando|onde|por que|pode me|\?)\b/.test(lower)) {
      return 'question'
    }
    if (/\b(não tenho interesse|não preciso|não uso|não quero mesmo)\b/.test(lower)) {
      return 'not_interested'
    }
    if (/\b(mas|porém|contudo|entendo|porém)\b/.test(lower)) {
      return 'objection'
    }

    return 'unknown'
  }

  async autoClassifyAndHandle(
    conversationId: string,
    content: string,
    providerMessageId?: string,
    actorUserId?: string,
  ): Promise<{ message: ProspectMessage; classification: InboundClassification }> {
    const classification = this.classifyInbound(content)
    const message = await this.recordInbound(
      conversationId,
      content,
      providerMessageId,
      classification,
      actorUserId,
    )

    if (classification === 'opt_out') {
      const conversation = await this.conversations.findOne({ where: { id: conversationId } })
      if (conversation) {
        const prospect = await this.prospects.findOne({ where: { id: conversation.prospectId } })
        if (prospect) {
          prospect.doNotContact = true
          prospect.doNotContactAt = new Date()
          await this.prospects.save(prospect)

          conversation.status = 'opted_out'
          await this.conversations.save(conversation)

          await this.activities.save(
            this.activities.create({
              prospectId: conversation.prospectId,
              action: 'do_not_contact',
              actorUserId: actorUserId ?? null,
              notes: 'Opt-out automático via inbound message classification',
              metadata: { conversationId, messageId: message.id },
            }),
          )
        }
      }
    }

    return { message, classification }
  }
}
