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

  async sendReactivationWhatsApp(targetUserId: string, adminUserId: string) {
    const target = await this.users.findOne({
      where: { id: targetUserId, isActive: true },
      select: ['id', 'name', 'phone'],
    })

    if (!target) throw new NotFoundException('Conta não encontrada')

    const phone = this.normalizeBrazilianPhone(target.phone)
    if (!phone) throw new BadRequestException('Conta sem WhatsApp válido cadastrado')

    const firstName = target.name?.trim().split(/\s+/)[0]?.replace(/[\r\n\t]/g, '') ?? ''
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!'
    const message = `${greeting} Aqui é a equipe do UseCognia. Vimos que faz um tempo desde seu último acesso e queremos saber se podemos ajudar com alguma dúvida ou dificuldade. 😊`

    return this.notifications.sendDirectWhatsApp(phone, message, adminUserId, {
      type: 'churn_reactivation',
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
