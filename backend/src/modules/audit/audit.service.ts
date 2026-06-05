import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from './entities/audit-log.entity'

type AuditInput = {
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async findForUser(userId: string): Promise<AuditLog[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    })
  }

  async record(input: AuditInput): Promise<void> {
    try {
      await this.repo.save(this.repo.create(input))
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria: ${error instanceof Error ? error.message : error}`)
    }
  }
}
