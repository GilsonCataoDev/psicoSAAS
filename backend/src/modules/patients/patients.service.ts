import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Patient } from './entities/patient.entity'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'
import { Subscription } from '../subscriptions/entities/subscription.entity'
import { PLAN_LIMITS } from '../../common/guards/plan.guard'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private repo: Repository<Patient>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
  ) {}

  // ─── Helpers de criptografia ────────────────────────────────────────────────

  /**
   * Retorna uma cópia do DTO com privateNotes criptografadas.
   * Campos ausentes não são modificados.
   */
  private encryptFields<T extends { privateNotes?: string }>(dto: T): T {
    if (!dto.privateNotes) return dto
    return { ...dto, privateNotes: encrypt(dto.privateNotes) }
  }

  /**
   * Retorna um objeto com privateNotes descriptografadas.
   * Também descriptografa campos das sessões carregadas via relação.
   */
  private dec(patient: Patient): Patient {
    const p: any = { ...patient }

    if (p.privateNotes) p.privateNotes = safeDecrypt(p.privateNotes)

    // Descriptografa anotações das sessões se foram carregadas via relação
    if (p.sessions?.length) {
      p.sessions = p.sessions.map((s: any) => ({
        ...s,
        summary:      safeDecrypt(s.summary),
        privateNotes: safeDecrypt(s.privateNotes),
        nextSteps:    safeDecrypt(s.nextSteps),
      }))
    }

    return p as Patient
  }

  // ─── Finder interno (entidade bruta para saves) ──────────────────────────────

  private async findRaw(id: string, psychologistId: string, relations?: string[]): Promise<Patient> {
    const patient = await this.repo.findOne({
      where: { id },
      ...(relations ? { relations } : {}),
    })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
    if (patient.psychologistId !== psychologistId) throw new ForbiddenException()
    return patient
  }

  // ─── Limites de plano ────────────────────────────────────────────────────────

  private async checkPatientLimit(userId: string) {
    const sub  = await this.subs.findOne({ where: { userId } })
    const plan = (sub?.status === 'active' || sub?.status === 'trialing')
      ? (sub.planId as keyof typeof PLAN_LIMITS)
      : 'free'

    const limit = PLAN_LIMITS[plan]?.maxPatients ?? 2
    if (limit === -1) return

    const count = await this.repo.count({ where: { psychologistId: userId, status: 'active' } })
    if (count >= limit) {
      throw new ForbiddenException({
        message: `Limite de ${limit} pessoa${limit !== 1 ? 's' : ''} atingido para o plano ${plan}. Faça upgrade para adicionar mais.`,
        upgradeUrl: '/planos',
        currentPlan: plan,
      })
    }
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  async findAll(psychologistId: string): Promise<Patient[]> {
    const patients = await this.repo.find({
      where: { psychologistId },
      order: { name: 'ASC' },
    })
    return patients.map(p => this.dec(p))
  }

  async findOne(id: string, psychologistId: string): Promise<Patient> {
    const patient = await this.findRaw(id, psychologistId, ['sessions', 'appointments'])
    return this.dec(patient)
  }

  async create(dto: CreatePatientDto, psychologistId: string): Promise<Patient> {
    await this.checkPatientLimit(psychologistId)
    const encrypted = this.encryptFields(dto)
    // status 'active' definido explicitamente (não depende só do default DB)
    const patient   = this.repo.create({ status: 'active', ...encrypted, psychologistId })
    return this.dec(await this.repo.save(patient))
  }

  async update(id: string, dto: UpdatePatientDto, psychologistId: string): Promise<Patient> {
    // Carrega entidade bruta (privateNotes ainda criptografadas)
    const patient   = await this.findRaw(id, psychologistId)
    const encrypted = this.encryptFields(dto)
    Object.assign(patient, encrypted)
    return this.dec(await this.repo.save(patient))
  }

  async remove(id: string, psychologistId: string) {
    const patient = await this.findRaw(id, psychologistId)
    return this.repo.softRemove(patient)
  }
}
