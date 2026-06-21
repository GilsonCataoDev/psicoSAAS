import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Testimonial } from './entities/testimonial.entity'
import { User } from '../auth/entities/user.entity'
import { Patient } from '../patients/entities/patient.entity'
import { Session } from '../sessions/entities/session.entity'
import { CreateTestimonialDto } from './dto/create-testimonial.dto'

const DAYS_THRESHOLD = 30
const PATIENTS_THRESHOLD = 10
const SESSIONS_THRESHOLD = 20

@Injectable()
export class TestimonialService {
  constructor(
    @InjectRepository(Testimonial) private readonly repo: Repository<Testimonial>,
    @InjectRepository(User)        private readonly users: Repository<User>,
    @InjectRepository(Patient)     private readonly patients: Repository<Patient>,
    @InjectRepository(Session)     private readonly sessions: Repository<Session>,
  ) {}

  async getStatus(userId: string): Promise<{ shouldShow: boolean }> {
    const existing = await this.repo.findOne({ where: { userId } })
    if (existing) return { shouldShow: false }

    const user = await this.users.findOne({ where: { id: userId }, select: ['createdAt'] })
    if (!user) return { shouldShow: false }

    const daysSinceRegistration = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000)
    if (daysSinceRegistration >= DAYS_THRESHOLD) return { shouldShow: true }

    const patientCount = await this.patients.count({ where: { psychologistId: userId } })
    if (patientCount >= PATIENTS_THRESHOLD) return { shouldShow: true }

    const sessionCount = await this.sessions.count({ where: { psychologistId: userId } })
    if (sessionCount >= SESSIONS_THRESHOLD) return { shouldShow: true }

    return { shouldShow: false }
  }

  async create(userId: string, dto: CreateTestimonialDto): Promise<void> {
    const existing = await this.repo.findOne({ where: { userId } })
    if (existing) return

    const dismissed = dto.dismissed === true
    if (!dismissed && !dto.rating) {
      throw new BadRequestException('A nota é obrigatória')
    }

    const text = dismissed ? null : dto.text?.trim() || null

    try {
      await this.repo.save({
        userId,
        rating: dismissed ? null : dto.rating!,
        text,
        dismissed,
        publicConsent: Boolean(dto.publicConsent && text),
        approvedForPublic: false,
      })
    } catch (err: any) {
      // Duas abas podem responder ao mesmo tempo; a restrição única mantém a operação idempotente.
      if (err?.code === '23505' || err?.driverError?.code === '23505') return
      throw err
    }
  }

  async listAdmin(): Promise<Testimonial[]> {
    return this.repo.find({
      where: { dismissed: false },
      order: { createdAt: 'DESC' },
    })
  }

  async setApproved(id: string, approvedForPublic: boolean): Promise<void> {
    const testimonial = await this.repo.findOne({ where: { id } })
    if (!testimonial) throw new NotFoundException('Depoimento não encontrado')
    if (approvedForPublic && (!testimonial.publicConsent || !testimonial.text?.trim())) {
      throw new BadRequestException('Este depoimento não possui autorização para divulgação')
    }

    testimonial.approvedForPublic = approvedForPublic
    await this.repo.save(testimonial)
  }
}
