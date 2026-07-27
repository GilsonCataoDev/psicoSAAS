import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProspectConversation, ConversationChannel, ConversationStatus } from '../entities/prospect-conversation.entity'
import { Prospect } from '../entities/prospect.entity'
import { ProspectActivity } from '../entities/prospect-activity.entity'

@Injectable()
export class ProspectingConversationService {
  private readonly logger = new Logger(ProspectingConversationService.name)

  constructor(
    @InjectRepository(ProspectConversation) private readonly conversations: Repository<ProspectConversation>,
    @InjectRepository(Prospect) private readonly prospects: Repository<Prospect>,
    @InjectRepository(ProspectActivity) private readonly activities: Repository<ProspectActivity>,
  ) {}

  async createConversation(
    prospectId: string,
    channel: ConversationChannel,
    actorUserId?: string,
  ): Promise<ProspectConversation> {
    const prospect = await this.prospects.findOne({ where: { id: prospectId } })
    if (!prospect) throw new NotFoundException('Prospect não encontrado')
    if (prospect.doNotContact) throw new BadRequestException('Prospect marcado como "não contatar"')

    const existing = await this.conversations.findOne({
      where: { prospectId, channel },
    })
    if (existing && existing.status !== 'closed' && existing.status !== 'opted_out') {
      return existing
    }

    const conversation = await this.conversations.save(
      this.conversations.create({
        prospectId,
        channel,
        status: 'draft',
      }),
    )

    await this.activities.save(
      this.activities.create({
        prospectId,
        action: 'status_changed',
        actorUserId: actorUserId ?? null,
        notes: `Conversa criada via ${channel}`,
        metadata: { conversationId: conversation.id, channel },
      }),
    )

    return conversation
  }

  async getConversation(id: string): Promise<ProspectConversation> {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: ['messages', 'prospect'],
    })
    if (!conversation) throw new NotFoundException('Conversa não encontrada')
    return conversation
  }

  async listConversations(prospectId: string): Promise<ProspectConversation[]> {
    return this.conversations.find({
      where: { prospectId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    })
  }

  async updateStatus(
    id: string,
    newStatus: ConversationStatus,
    actorUserId?: string,
    notes?: string,
  ): Promise<ProspectConversation> {
    const conversation = await this.getConversation(id)

    if (conversation.status === newStatus) return conversation

    const allowed = this.allowedTransitions(conversation.status)
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Transição de "${conversation.status}" para "${newStatus}" não permitida`)
    }

    conversation.status = newStatus
    const updated = await this.conversations.save(conversation)

    await this.activities.save(
      this.activities.create({
        prospectId: conversation.prospectId,
        action: 'status_changed',
        actorUserId: actorUserId ?? null,
        notes: notes || `Status alterado para ${newStatus}`,
        metadata: { conversationId: id, from: conversation.status, to: newStatus },
      }),
    )

    return updated
  }

  async pause(id: string, actorUserId?: string): Promise<ProspectConversation> {
    return this.updateStatus(id, 'paused', actorUserId, 'Conversa pausada')
  }

  async optOut(id: string, actorUserId?: string): Promise<ProspectConversation> {
    const conversation = await this.getConversation(id)
    const prospect = await this.prospects.findOne({ where: { id: conversation.prospectId } })
    if (!prospect) throw new NotFoundException('Prospect não encontrado')

    prospect.doNotContact = true
    prospect.doNotContactAt = new Date()
    await this.prospects.save(prospect)

    await this.activities.save(
      this.activities.create({
        prospectId: conversation.prospectId,
        action: 'do_not_contact',
        actorUserId: actorUserId ?? null,
        notes: 'Prospect marcado como "não contatar" via conversa',
        metadata: { conversationId: id },
      }),
    )

    return this.updateStatus(id, 'opted_out', actorUserId, 'Prospect optou por não receber mais contatos')
  }

  async convert(id: string, actorUserId?: string): Promise<ProspectConversation> {
    const conversation = await this.getConversation(id)
    const prospect = await this.prospects.findOne({ where: { id: conversation.prospectId } })
    if (!prospect) throw new NotFoundException('Prospect não encontrado')

    prospect.status = 'activated'
    prospect.lastContactAt = new Date()
    await this.prospects.save(prospect)

    return this.updateStatus(id, 'converted', actorUserId, 'Prospect convertido para cliente')
  }

  private allowedTransitions(from: ConversationStatus): ConversationStatus[] {
    const transitions: Record<ConversationStatus, ConversationStatus[]> = {
      draft: ['awaiting_approval', 'closed'],
      awaiting_approval: ['approved', 'closed'],
      approved: ['active', 'closed'],
      active: ['paused', 'converted', 'closed'],
      paused: ['active', 'closed'],
      converted: ['closed'],
      opted_out: ['closed'],
      closed: [],
    }
    return transitions[from] ?? []
  }
}
