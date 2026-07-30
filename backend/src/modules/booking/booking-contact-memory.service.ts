import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import { BookingContactMemory } from './entities/booking-contact-memory.entity'
import { encrypt, hashToken, safeDecrypt } from '../../common/crypto/encrypt.util'

const MEMORY_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export type RememberedContact = {
  patientName: string
  patientEmail?: string
  patientPhone?: string
}

@Injectable()
export class BookingContactMemoryService {
  constructor(
    @InjectRepository(BookingContactMemory)
    private readonly memories: Repository<BookingContactMemory>,
  ) {}

  async remember(contact: RememberedContact): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + MEMORY_DAYS * DAY_MS)
    await this.memories.save(this.memories.create({
      tokenHash: hashToken(token),
      patientName: encrypt(contact.patientName.trim()),
      patientEmail: contact.patientEmail ? encrypt(contact.patientEmail.trim().toLowerCase()) : undefined,
      patientPhone: contact.patientPhone ? encrypt(contact.patientPhone.replace(/\D/g, '')) : undefined,
      expiresAt,
    }))
    return { token, expiresAt }
  }

  async resolve(token?: string): Promise<RememberedContact | null> {
    if (!token) return null
    const memory = await this.memories.findOne({
      where: { tokenHash: hashToken(token) },
      select: ['id', 'tokenHash', 'patientName', 'patientEmail', 'patientPhone', 'expiresAt'],
    })
    if (!memory) return null
    if (memory.expiresAt.getTime() <= Date.now()) {
      await this.memories.delete({ id: memory.id })
      return null
    }
    return {
      patientName: safeDecrypt(memory.patientName) ?? '',
      patientEmail: safeDecrypt(memory.patientEmail),
      patientPhone: safeDecrypt(memory.patientPhone),
    }
  }

  async preview(token?: string) {
    const contact = await this.resolve(token)
    if (!contact) return { available: false as const }
    const [firstName] = contact.patientName.trim().split(/\s+/)
    return {
      available: true as const,
      name: firstName,
      email: contact.patientEmail ? maskEmail(contact.patientEmail) : undefined,
      phone: contact.patientPhone ? `final ${contact.patientPhone.slice(-4)}` : undefined,
    }
  }

  async forget(token?: string): Promise<void> {
    if (!token) return
    await this.memories.delete({ tokenHash: hashToken(token) })
  }

  async deleteExpired(now = new Date()): Promise<number> {
    const result = await this.memories.delete({ expiresAt: LessThan(now) })
    return result.affected ?? 0
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return 'e-mail salvo'
  return `${local.slice(0, 1)}***@${domain}`
}
