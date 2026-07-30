import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class ChurnContactService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async sendWhatsApp(targetUserId: string, message: string, adminUserId: string) {
    const target = await this.users.findOne({
      where: { id: targetUserId, isActive: true },
      select: ['id', 'phone'],
    })

    if (!target) throw new NotFoundException('Conta não encontrada')

    const phone = this.normalizeBrazilianPhone(target.phone)
    if (!phone) throw new BadRequestException('Conta sem WhatsApp válido cadastrado')

    const normalizedMessage = typeof message === 'string' ? message.trim() : ''
    if (!normalizedMessage || normalizedMessage.length > 2000) {
      throw new BadRequestException('Mensagem inválida')
    }

    return this.notifications.sendDirectWhatsApp(phone, normalizedMessage, adminUserId, {
      type: 'churn_admin_message',
    })
  }

  private normalizeBrazilianPhone(value?: string | null): string | null {
    const digits = value?.replace(/\D/g, '') ?? ''
    const national = digits.startsWith('55') && [12, 13].includes(digits.length)
      ? digits.slice(2)
      : digits

    if (![10, 11].includes(national.length)) return null
    return `55${national}`
  }
}
