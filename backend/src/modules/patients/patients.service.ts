import { Injectable, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, MoreThanOrEqual, Not, Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import PDFDocument = require('pdfkit')
import { Patient } from './entities/patient.entity'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'
import { UpdatePatientPortalIntakeDto } from './dto/patient-portal.dto'
import { Appointment } from '../appointments/entities/appointment.entity'
import { PLAN_LIMITS } from '../../common/plans'
import { PlanAccessService } from '../../common/plan-access/plan-access.service'
import { blindIndex, encrypt, hashToken, safeDecrypt } from '../../common/crypto/encrypt.util'
import { FinancialService } from '../financial/financial.service'
import { formatCrpForDisplay } from '../auth/entities/user.entity'
import { ProntuarioExportOptions, canIncludePrivateNotes, filterProntuarioSessions, normalizeProntuarioExportOptions } from './prontuario-export.util'
import { ProspectLifecycleService } from '../../common/prospect-lifecycle/prospect-lifecycle.service'
import { Document } from '../documents/entities/document.entity'
import { PatientAttachment } from './entities/patient-attachment.entity'
import { StorageService } from '../../common/storage/storage.service'
import { DEFAULT_PROFESSION } from '../../common/professions'
import { termsFor } from '../../common/terms'
import { WhatsAppDeliveryLog } from '../notifications/entities/whatsapp-delivery-log.entity'

type EncryptedProntuario = {
  __encrypted: 'usecognia.prontuario.v1' | 'psicosaas.prontuario.v1'
  data: string
}

export type PatientListItemDto = Pick<
  Patient,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'birthDate'
  | 'pronouns'
  | 'race'
  | 'gender'
  | 'sexualOrientation'
  | 'careMode'
  | 'sessionPrice'
  | 'billingType'
  | 'monthlyPackagePrice'
  | 'monthlyIncludedSessions'
  | 'billingDay'
  | 'sessionDuration'
  | 'startDate'
  | 'hasFixedSchedule'
  | 'fixedScheduleWeekday'
  | 'fixedScheduleTime'
  | 'fixedScheduleFrequency'
  | 'fixedScheduleModality'
  | 'tags'
  | 'status'
  | 'cpfCnpj'
  | 'createdAt'
  | 'updatedAt'
>

type PatientPortalDto = {
  patient: {
    name: string
    email?: string | null
    phone?: string | null
    birthDate?: string | null
    pronouns?: string | null
    race?: string | null
    gender?: string | null
    sexualOrientation?: string | null
  }
  psychologist: {
    name: string
    crp?: string | null
    profession: string
  }
  appointments: Array<{
    id: string
    date: string
    time: string
    duration: number
    modality: string
    status: string
  }>
  intake: {
    queixaPrincipal?: string
    contatoEmergenciaNome?: string
    contatoEmergenciaPhone?: string
    contatoEmergenciaRelacao?: string
  }
}

const PRONTUARIO_ENCRYPTED_MARKER = 'usecognia.prontuario.v1'
const LEGACY_PRONTUARIO_ENCRYPTED_MARKER = 'psicosaas.prontuario.v1'
const PATIENT_ENCRYPTED_FIELDS = [
  'birthDate', 'pronouns', 'race', 'gender', 'sexualOrientation', 'cpfCnpj',
] as const

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name)

  constructor(
    @InjectRepository(Patient) private repo: Repository<Patient>,
    @InjectRepository(Appointment) private appointments: Repository<Appointment>,
    @InjectRepository(Document) private documents: Repository<Document>,
    @InjectRepository(PatientAttachment) private patientAttachments: Repository<PatientAttachment>,
    @InjectRepository(WhatsAppDeliveryLog) private waLogs: Repository<WhatsAppDeliveryLog>,
    private financial: FinancialService,
    private readonly planAccess: PlanAccessService,
    private readonly storage: StorageService,
    private readonly dataSource: DataSource,
    @Optional() private readonly prospectLifecycle?: ProspectLifecycleService,
  ) {}

  // ─── Helpers de criptografia ────────────────────────────────────────────────

  /**
   * Retorna uma cópia do DTO com privateNotes criptografadas.
   * Campos ausentes não são modificados.
   */
  encryptFields<T extends { privateNotes?: string; prontuario?: object } & Record<string, any>>(dto: T): T {
    const encrypted: any = { ...dto }
    if (dto.privateNotes) encrypted.privateNotes = encrypt(dto.privateNotes)
    if (dto.prontuario) encrypted.prontuario = this.encryptProntuario(dto.prontuario as Record<string, any>)
    for (const field of PATIENT_ENCRYPTED_FIELDS) {
      if (typeof dto[field] === 'string' && dto[field].length > 0) encrypted[field] = encrypt(dto[field])
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'email')) {
      encrypted.emailHash = dto.email
        ? blindIndex(String(dto.email), 'patient-email')
        : null
    }
    if (Object.prototype.hasOwnProperty.call(dto, 'phone')) {
      const phone = dto.phone ? String(dto.phone).replace(/\D/g, '') : ''
      encrypted.phoneHash = phone ? blindIndex(phone, 'patient-phone') : null
    }
    return encrypted
  }

  /**
   * Retorna um objeto com privateNotes descriptografadas.
   * Também descriptografa campos das sessões carregadas via relação.
   */
  private dec(patient: Patient): Patient {
    const p: any = { ...patient }

    if (p.privateNotes) p.privateNotes = safeDecrypt(p.privateNotes)
    if (p.prontuario) p.prontuario = this.decryptProntuario(p.prontuario)
    for (const field of PATIENT_ENCRYPTED_FIELDS) {
      if (p[field]) p[field] = safeDecrypt(p[field])
    }

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

  private encryptProntuario(value: Record<string, any>): EncryptedProntuario {
    return {
      __encrypted: PRONTUARIO_ENCRYPTED_MARKER,
      data: encrypt(JSON.stringify(value)),
    }
  }

  private decryptProntuario(value: Record<string, any>): Record<string, any> {
    if (
      value
      && [PRONTUARIO_ENCRYPTED_MARKER, LEGACY_PRONTUARIO_ENCRYPTED_MARKER].includes(value.__encrypted)
      && typeof value.data === 'string'
    ) {
      try {
        return JSON.parse(safeDecrypt(value.data) ?? '{}')
      } catch {
        return {}
      }
    }

    return value
  }

  // ─── Finder interno (entidade bruta para saves) ──────────────────────────────

  private async findRaw(id: string, psychologistId: string, relations?: string[]): Promise<Patient> {
    const patient = await this.repo.findOne({
      where: { id, psychologistId }, // Evita revelar que um registro de outro psicólogo existe.
      ...(relations ? { relations } : {}),
    })
    if (!patient) throw new NotFoundException('Pessoa não encontrada')
    return patient
  }

  async getContactLogs(patientId: string, userId: string) {
    return this.waLogs.find({
      where: { patientId, userId },
      order: { createdAt: 'DESC' },
      take: 50,
      select: ['id', 'type', 'status', 'error', 'createdAt', 'providerStatus'],
    })
  }

  // ─── Limites de plano ────────────────────────────────────────────────────────

  private async checkPatientLimit(userId: string) {
    const { plan, limit, count } = await this.getPlanUsage(userId)
    if (limit === -1) return

    if (count >= limit) {
      throw new ForbiddenException({
        message: `Limite de ${limit} pessoa${limit !== 1 ? 's' : ''} atingido para o plano ${plan}. Faça upgrade para adicionar mais.`,
        upgradeUrl: '/planos',
        currentPlan: plan,
      })
    }
  }

  async getPlanUsage(userId: string): Promise<{ plan: string; limit: number; count: number }> {
    const plan = await this.planAccess.getCurrentPlan(userId)
    const limit = PLAN_LIMITS[plan].maxPatients
    const count = await this.repo.count({ where: { psychologistId: userId, status: 'active' } })
    return { plan, limit, count }
  }

  /**
   * Vagas restantes de pacientes ativos para o plano do usuário.
   * Retorna Number.MAX_SAFE_INTEGER para planos sem limite (pro/premium).
   * Usado pela importação em massa para truncar o lote de uma vez, sem
   * recontar o banco a cada linha processada.
   */
  async getRemainingPatientSlots(userId: string): Promise<number> {
    const { limit, count } = await this.getPlanUsage(userId)
    if (limit === -1) return Number.MAX_SAFE_INTEGER
    return Math.max(0, limit - count)
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  async findAll(
    psychologistId: string,
    opts: { page?: number; limit?: number; search?: string; status?: string } = {},
  ): Promise<{ data: PatientListItemDto[]; total: number; page: number; totalPages: number }> {
    const page  = Math.max(1, opts.page  ?? 1)
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50))
    const skip  = (page - 1) * limit

    const qb = this.repo.createQueryBuilder('p')
      .where('p."psychologistId" = :uid', { uid: psychologistId })
      .select([
        'p.id', 'p.name', 'p.email', 'p.phone', 'p.birthDate', 'p.pronouns',
        'p.race', 'p.gender', 'p.sexualOrientation', 'p.careMode',
        'p.sessionPrice', 'p.billingType', 'p.monthlyPackagePrice',
        'p.monthlyIncludedSessions', 'p.billingDay', 'p.sessionDuration',
        'p.startDate', 'p.hasFixedSchedule', 'p.fixedScheduleWeekday',
        'p.fixedScheduleTime', 'p.fixedScheduleFrequency',
        'p.fixedScheduleModality', 'p.tags', 'p.status',
        'p.cpfCnpj', 'p.createdAt', 'p.updatedAt',
      ])

    if (opts.status && opts.status !== 'all') {
      qb.andWhere('p.status = :status', { status: opts.status })
    }
    if (opts.search?.trim()) {
      qb.andWhere('unaccent(lower(p.name)) LIKE unaccent(lower(:search))', {
        search: `%${opts.search.trim()}%`,
      })
    }

    qb.orderBy('p.name', 'ASC').skip(skip).take(limit)

    const [patients, total] = await qb.getManyAndCount()
    return {
      data: patients.map(p => this.dec(p) as PatientListItemDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(id: string, psychologistId: string): Promise<Patient> {
    const patient = await this.findRaw(id, psychologistId)
    return this.dec(patient)
  }

  async create(dto: CreatePatientDto, psychologistId: string): Promise<Patient> {
    await this.checkPatientLimit(psychologistId)
    const encrypted = this.encryptFields(dto)
    // status 'active' definido explicitamente (não depende só do default DB)
    const patient   = this.repo.create({ status: 'active', ...encrypted, psychologistId })
    const saved = await this.repo.save(patient)
    await this.ensureCurrentMonthlyCharge(saved)
    await this.prospectLifecycle?.markActivated(psychologistId).catch(err => this.logger.warn(
      `[CreatePatient] Falha ao sincronizar funil user=${psychologistId}: ${err?.message ?? err}`,
    ))
    return this.dec(saved)
  }

  async update(id: string, dto: UpdatePatientDto, psychologistId: string): Promise<Patient> {
    // Carrega entidade bruta (privateNotes ainda criptografadas)
    const patient   = await this.findRaw(id, psychologistId)
    const encrypted = this.encryptFields(dto)
    Object.assign(patient, encrypted)
    const saved = await this.repo.save(patient)
    await this.ensureCurrentMonthlyCharge(saved)
    return this.dec(saved)
  }

  private async ensureCurrentMonthlyCharge(patient: Patient): Promise<void> {
    if (patient.status !== 'active' || patient.billingType !== 'monthly_package') return
    await this.financial.ensureMonthlyPackageCharge(patient, new Date()).catch(() => undefined)
  }

  async createPortalLink(id: string, psychologistId: string): Promise<{ url: string }> {
    const patient = await this.findRaw(id, psychologistId)
    const token = randomBytes(32).toString('base64url')
    patient.portalTokenHash = hashToken(token)
    patient.portalTokenCreatedAt = new Date()
    await this.repo.save(patient)

    const baseUrl = (process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || 'https://usecognia.com.br').replace(/\/$/, '')
    return { url: `${baseUrl}/portal/${token}` }
  }

  async getPortal(token: string): Promise<PatientPortalDto> {
    const patient = await this.findByPortalToken(token, ['psychologist'])
    const decrypted = this.dec(patient)
    const today = new Date().toISOString().slice(0, 10)
    const appointments = await this.appointments.find({
      where: {
        patientId: patient.id,
        psychologistId: patient.psychologistId,
        date: MoreThanOrEqual(today),
        status: Not(In(['cancelled', 'no_show', 'completed'])),
      },
      order: { date: 'ASC', time: 'ASC' },
      take: 5,
    })

    const upcoming = appointments

    const pr = (decrypted.prontuario ?? {}) as Record<string, string>
    return {
      patient: {
        name: decrypted.name,
        email: decrypted.email ?? null,
        phone: decrypted.phone ?? null,
        birthDate: decrypted.birthDate ?? null,
        pronouns: decrypted.pronouns ?? null,
        race: decrypted.race ?? null,
        gender: decrypted.gender ?? null,
        sexualOrientation: decrypted.sexualOrientation ?? null,
      },
      psychologist: {
        name: patient.psychologist?.name ?? 'Profissional responsável',
        crp: patient.psychologist ? formatCrpForDisplay(patient.psychologist) : null,
        // Portal é aberto pelo paciente sem sessão: o vocabulário da tela
        // precisa vir daqui, não de um usuário logado.
        profession: patient.psychologist?.profession ?? DEFAULT_PROFESSION,
      },
      appointments: upcoming.map(appointment => ({
        id: appointment.id,
        date: appointment.date,
        time: String(appointment.time).slice(0, 5),
        duration: appointment.duration,
        modality: appointment.modality,
        status: appointment.status,
      })),
      intake: {
        queixaPrincipal: pr.queixaPrincipal,
        contatoEmergenciaNome: pr.contatoEmergenciaNome,
        contatoEmergenciaPhone: pr.contatoEmergenciaPhone,
        contatoEmergenciaRelacao: pr.contatoEmergenciaRelacao,
      },
    }
  }

  async updatePortalIntake(token: string, dto: UpdatePatientPortalIntakeDto): Promise<{ saved: boolean }> {
    const patient = await this.findByPortalToken(token)
    const decrypted = this.dec(patient)
    const prontuario = {
      ...((decrypted.prontuario ?? {}) as Record<string, string>),
      ...this.pickDefined({
        queixaPrincipal: dto.queixaPrincipal,
        contatoEmergenciaNome: dto.contatoEmergenciaNome,
        contatoEmergenciaPhone: dto.contatoEmergenciaPhone,
        contatoEmergenciaRelacao: dto.contatoEmergenciaRelacao,
      }),
    }

    Object.assign(patient, this.encryptFields(this.pickDefined({
      email: dto.email,
      phone: dto.phone,
      birthDate: dto.birthDate,
      pronouns: dto.pronouns,
      race: dto.race,
      gender: dto.gender,
      sexualOrientation: dto.sexualOrientation,
      prontuario,
    })))

    await this.repo.save(patient)
    return { saved: true }
  }

  /**
   * Exclui a pessoa e todo o histórico clínico dependente. Sessões, agendamentos,
   * avaliações neuropsicológicas, anexos e vínculos de instrumentos já têm ON
   * DELETE CASCADE no banco. Documento é a exceção — não tem FK pra Patient (só
   * a coluna patientId) — por isso é apagado explicitamente aqui, na mesma
   * transação da remoção da pessoa, pra nunca sobrar linha órfã se uma das duas
   * falhar no meio. Lançamentos financeiros ficam de propósito (SET NULL) —
   * preserva o histórico de faturamento mesmo após a exclusão da pessoa.
   *
   * Os storageKeys dos anexos em R2 são coletados antes da transação: a
   * CASCADE apaga a linha no Postgres, mas não aciona storage.delete() (isso
   * só acontece em PatientAttachmentsService.remove(), usado no fluxo normal
   * de exclusão avulsa). A limpeza do bucket roda depois do commit, best-effort
   * — storage.delete() já engole falhas de rede/S3 internamente.
   */
  async remove(id: string, psychologistId: string) {
    const patient = await this.findRaw(id, psychologistId)

    const attachments = await this.patientAttachments.find({
      where: { patientId: id, psychologistId },
      select: ['storageKey'],
    })

    const removed = await this.dataSource.transaction(async manager => {
      await manager.delete(Document, { patientId: id, userId: psychologistId })
      return manager.remove(patient)
    })

    const storageKeys = attachments.map(a => a.storageKey).filter((key): key is string => !!key)
    await Promise.all(storageKeys.map(key => this.storage.delete(key)))

    return removed
  }

  private async findByPortalToken(token: string, relations?: string[]): Promise<Patient> {
    if (!token || token.length < 32) throw new NotFoundException('Portal não encontrado')
    const patient = await this.repo.findOne({
      where: { portalTokenHash: hashToken(token) },
      ...(relations ? { relations } : {}),
    })
    if (!patient) throw new NotFoundException('Portal não encontrado')

    // Expiracao obrigatoria: configuracao invalida volta ao limite seguro de 30 dias.
    const configuredTtl = Number(process.env.PORTAL_TOKEN_TTL_DAYS)
    const ttlDays = Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 30
    if (!patient.portalTokenCreatedAt) {
      throw new NotFoundException('Link expirado. Solicite um novo ao seu profissional.')
    }
    if (patient.portalTokenCreatedAt) {
      const ageMs = Date.now() - new Date(patient.portalTokenCreatedAt).getTime()
      if (ageMs > ttlDays * 24 * 60 * 60 * 1000) {
        throw new NotFoundException('Link expirado. Solicite um novo ao seu profissional.')
      }
    }

    return patient
  }

  private pickDefined<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
  }

  // ─── Exportação de prontuário em PDF ────────────────────────────────────────

  async exportProntuario(
    patientId: string,
    psychologistId: string,
    psychologistName: string,
    psychologistCrp: string,
    exportOptions: ProntuarioExportOptions = {},
    profession?: string,
  ): Promise<{ filename: string; stream: PDFKit.PDFDocument }> {
    const t = termsFor(profession)
    const patient = await this.findRaw(patientId, psychologistId, ['sessions'])
    const p = this.dec(patient)
    const options = normalizeProntuarioExportOptions(exportOptions)
    const patientCopy = options.audience === 'patient'
    const includePrivateNotes = canIncludePrivateNotes(options)

    const sessions = options.sections.has('evolutions')
      ? filterProntuarioSessions(p.sessions ?? [], options)
        .filter(s => s.summary || (includePrivateNotes && s.privateNotes) || s.nextSteps)
        .sort((a, b) => a.date.localeCompare(b.date))
      : []

    const pdf = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, info: {
      Title: `${patientCopy ? t.recordCopyTitle : t.recordCapitalized} — ${p.name}`,
      Author: psychologistName,
      Subject: t.recordTitle,
      Keywords: `UseCognia, ${t.record}`,
    } })
    const W = pdf.page.width
    const H = pdf.page.height
    const L = 44, R = W - 44
    const CW = R - L

    const sage     = '#2F6F52'
    const sageDark = '#21372D'
    const ink      = '#252725'
    const muted    = '#6A6F69'
    const line     = '#D9E3DC'
    const paper    = '#FBFCFA'

    const drawPageBase = () => {
      pdf.rect(0, 0, W, H).fill(paper)
      pdf.rect(0, 0, W, 8).fill(sageDark)
    }

    const drawFooter = (page: number, total: number) => {
      const fy = H - 38
      pdf.strokeColor(line).lineWidth(0.8).moveTo(L, fy).lineTo(R, fy).stroke()
      pdf.fillColor(muted).font('Helvetica').fontSize(7)
        .text(`UseCognia  |  ${patientCopy ? `Cópia entregue ao ${t.patient}` : t.recordTitle} — ${p.name}`, L, fy + 8, { width: CW - 80, lineBreak: false })
      pdf.text(`Página ${page} de ${total}`, R - 60, fy + 8, { width: 60, align: 'right', lineBreak: false })
    }

    const sectionTitle = (title: string, y?: number) => {
      const ty = y ?? pdf.y
      pdf.rect(L, ty, CW, 20).fill('#EEF8F3')
      pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(8)
        .text(title.toUpperCase(), L + 10, ty + 6, { width: CW - 20, lineBreak: false })
      pdf.y = ty + 28
    }

    const field = (label: string, value: string | undefined | null, opts?: { wide?: boolean }) => {
      if (!value?.trim()) return
      const fw = opts?.wide ? CW : CW / 2 - 8
      pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text(label, { width: fw, lineBreak: false })
      pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(value, { width: fw, lineGap: 1.5 })
      pdf.moveDown(0.5)
    }

    const fieldPair = (l1: string, v1: string | undefined, l2: string, v2: string | undefined) => {
      const fw = CW / 2 - 10
      const startY = pdf.y
      const startX = L

      pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text(l1, startX, startY, { width: fw, lineBreak: false })
      pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(v1 || '—', startX, pdf.y, { width: fw })
      const afterLeft = pdf.y

      if (v2?.trim()) {
        pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text(l2, startX + fw + 20, startY, { width: fw, lineBreak: false })
        pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(v2, startX + fw + 20, pdf.y > startY + 12 ? startY + 12 : pdf.y, { width: fw })
      }

      pdf.y = afterLeft + 6
    }

    const checkPageBreak = (needed = 60) => {
      if (pdf.y > H - 80 - needed) {
        pdf.addPage()
        drawPageBase()
        pdf.y = 24
      }
    }

    // ── Capa ──────────────────────────────────────────────────────────────────
    drawPageBase()

    pdf.rect(0, 8, W, 100).fill('#F4F8F5')
    pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(10).text('UseCognia', L, 24, { lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(7).text('Plataforma para psicólogos e terapeutas', L, 38, { lineBreak: false })

    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(18).text(patientCopy ? t.recordCopyTitle : t.recordTitle, L, 56, { width: CW })
    pdf.fillColor(sage).font('Helvetica-Bold').fontSize(12).text(p.name, L, 78, { width: CW })

    pdf.strokeColor(line).lineWidth(1).moveTo(L, 110).lineTo(R, 110).stroke()
    pdf.y = 120

    // Meta box
    pdf.roundedRect(L, 120, CW, 44, 6).fillAndStroke('#FFFFFF', '#DCE8DF')
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.5).text('PROFISSIONAL', L + 14, 133, { width: 150, lineBreak: false })
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.5).text(psychologistName, L + 14, 144, { width: 200, lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(7).text(`CRP ${psychologistCrp}`, L + 14, 156, { width: 150, lineBreak: false })

    pdf.strokeColor('#EDF1EE').lineWidth(0.8).moveTo(L + 240, 131).lineTo(L + 240, 159).stroke()
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.5).text('GERADO EM', L + 255, 133, { width: 120, lineBreak: false })
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.5).text(new Date().toLocaleDateString('pt-BR'), L + 255, 144, { width: 120, lineBreak: false })

    pdf.strokeColor('#EDF1EE').lineWidth(0.8).moveTo(R - 100, 131).lineTo(R - 100, 159).stroke()
    pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.5).text('SESSÕES', R - 86, 133, { width: 72, align: 'right', lineBreak: false })
    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(8.5).text(String(sessions.length), R - 86, 144, { width: 72, align: 'right', lineBreak: false })

    pdf.y = 178

    // ── Dados do Paciente ─────────────────────────────────────────────────────
    if (options.sections.has('identification')) {
      sectionTitle('Dados do Paciente')
      fieldPair('NOME COMPLETO', p.name, 'STATUS', p.status === 'active' ? 'Em atendimento' : p.status === 'paused' ? 'Pausado' : 'Alta')
      fieldPair('DATA DE NASCIMENTO', p.birthDate ? new Date(p.birthDate).toLocaleDateString('pt-BR') : undefined, 'CPF / CNPJ', p.cpfCnpj)
      fieldPair('E-MAIL', p.email, 'TELEFONE', p.phone)
      fieldPair('INÍCIO DO ACOMPANHAMENTO', p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : undefined, 'PRONOMES', p.pronouns)
    }

    if (includePrivateNotes && p.privateNotes?.trim()) {
      checkPageBreak(40)
      field('ANOTAÇÕES PRIVADAS', p.privateNotes, { wide: true })
    }

    // ── Prontuário Clínico ────────────────────────────────────────────────────
    const pr = p.prontuario as Record<string, string> | undefined

    if (pr) {
      const hasAnamnese = pr.queixaPrincipal || pr.historicoDoenca || pr.antecedentesPessoais || pr.historicoFamiliar || pr.medicamentos || pr.condicoesMedicas || pr.exameFisico
      const hasPlano    = pr.abordagem || pr.objetivos || pr.frequencia || pr.duracaoPrevista
        || pr.diagnosticoFuncional || pr.prognosticoFuncional || pr.recursosTerapeuticos || pr.quantitativoAtendimentos
      const hasDados    = pr.escolaridade || pr.profissao || pr.estadoCivil || pr.religiao

      if (hasAnamnese && options.sections.has('anamnesis')) {
        checkPageBreak(80)
        sectionTitle('Anamnese')
        field('QUEIXA PRINCIPAL', pr.queixaPrincipal, { wide: true })
        field('HISTÓRICO DA DOENÇA', pr.historicoDoenca, { wide: true })
        field('ANTECEDENTES PESSOAIS', pr.antecedentesPessoais, { wide: true })
        field('HISTÓRICO FAMILIAR', pr.historicoFamiliar, { wide: true })
        field('MEDICAMENTOS', pr.medicamentos, { wide: true })
        field('CONDIÇÕES MÉDICAS', pr.condicoesMedicas, { wide: true })
        field('EXAME FÍSICO', pr.exameFisico, { wide: true })
      }

      if (hasPlano && options.sections.has('treatment_plan')) {
        checkPageBreak(80)
        sectionTitle('Plano Terapêutico')
        field('DIAGNÓSTICO CINESIOFUNCIONAL', pr.diagnosticoFuncional, { wide: true })
        field('PROGNÓSTICO FUNCIONAL', pr.prognosticoFuncional, { wide: true })
        field('ABORDAGEM', pr.abordagem, { wide: true })
        field('RECURSOS E MÉTODOS TERAPÊUTICOS', pr.recursosTerapeuticos, { wide: true })
        field('OBJETIVOS', pr.objetivos, { wide: true })
        fieldPair('FREQUÊNCIA', pr.frequencia, 'DURAÇÃO PREVISTA', pr.duracaoPrevista)
        field('QUANTITATIVO PROVÁVEL DE ATENDIMENTOS', pr.quantitativoAtendimentos)
      }

      if (hasDados && options.sections.has('identification')) {
        checkPageBreak(60)
        sectionTitle('Dados Complementares')
        fieldPair('ESCOLARIDADE', pr.escolaridade, 'PROFISSÃO', pr.profissao)
        fieldPair('ESTADO CIVIL', pr.estadoCivil, 'RELIGIÃO', pr.religiao)
      }

      if (!patientCopy && pr.contatoEmergenciaNome && options.sections.has('identification')) {
        checkPageBreak(50)
        sectionTitle('Contato de Emergência')
        fieldPair('NOME', pr.contatoEmergenciaNome, 'RELAÇÃO', pr.contatoEmergenciaRelacao)
        field('TELEFONE', pr.contatoEmergenciaPhone)
      }
    }

    // ── Evolução (sessões) ────────────────────────────────────────────────────
    if (sessions.length > 0 && options.sections.has('evolutions')) {
      checkPageBreak(60)
      sectionTitle('Evolução — Registro de Sessões')

      for (const s of sessions) {
        checkPageBreak(70)

        const sessionDate = new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')
        const headerY = pdf.y

        pdf.roundedRect(L, headerY, CW, 18, 4).fill('#F0F6F3')
        pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(8)
          .text(sessionDate, L + 10, headerY + 5, { width: 100, lineBreak: false })
        if (s.duration) {
          pdf.fillColor(muted).font('Helvetica').fontSize(7)
            .text(`${s.duration} min`, L + 120, headerY + 5, { width: 60, lineBreak: false })
        }
        if (s.mood) {
          const moods = ['', '😞', '😕', '😐', '🙂', '😊']
          pdf.fillColor(muted).font('Helvetica').fontSize(7)
            .text(`Humor: ${moods[s.mood] ?? s.mood}`, L + 190, headerY + 5, { width: 80, lineBreak: false })
        }
        if (s.tags?.length) {
          pdf.fillColor(sage).font('Helvetica').fontSize(6.5)
            .text(s.tags.join(' · '), R - 160, headerY + 5, { width: 156, align: 'right', lineBreak: false })
        }
        pdf.y = headerY + 24

        if (s.summary?.trim()) {
          pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text('EVOLUÇÃO', L + 6, pdf.y, { width: CW - 12, lineBreak: false })
          pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(s.summary, L + 6, pdf.y + 10, { width: CW - 12, lineGap: 1.5 })
          pdf.moveDown(0.6)
        }

        if (s.nextSteps?.trim()) {
          checkPageBreak(40)
          pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text('PRÓXIMOS PASSOS', L + 6, pdf.y, { width: CW - 12, lineBreak: false })
          pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(s.nextSteps, L + 6, pdf.y + 10, { width: CW - 12, lineGap: 1.5 })
          pdf.moveDown(0.6)
        }

        if (includePrivateNotes && s.privateNotes?.trim()) {
          checkPageBreak(40)
          pdf.rect(L, pdf.y, 3, 0).fill(sage)
          pdf.fillColor(muted).font('Helvetica-Bold').fontSize(6.8).text('ANOTAÇÕES PRIVADAS', L + 6, pdf.y, { width: CW - 12, lineBreak: false })
          pdf.fillColor(ink).font('Helvetica').fontSize(8.5).text(s.privateNotes, L + 6, pdf.y + 10, { width: CW - 12, lineGap: 1.5 })
          pdf.moveDown(0.6)
        }

        pdf.strokeColor(line).lineWidth(0.5).moveTo(L, pdf.y + 4).lineTo(R, pdf.y + 4).stroke()
        pdf.moveDown(1.2)
      }
    }

    // ── Rodapé confidencialidade ──────────────────────────────────────────────
    checkPageBreak(50)
    pdf.moveDown(1)
    pdf.roundedRect(L, pdf.y, CW, 38, 6).fillAndStroke('#EEF8F3', '#CFE5D9')
    pdf.fillColor(sageDark).font('Helvetica-Bold').fontSize(7.5)
      .text(patientCopy ? 'CÓPIA DISPONIBILIZADA AO PACIENTE' : 'DOCUMENTO CONFIDENCIAL', L + 14, pdf.y + 8, { width: CW - 28, lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(7)
      .text(patientCopy
        ? 'Documento com dados pessoais e clínicos. Armazene e compartilhe de forma segura. Anotações privadas do profissional não fazem parte desta cópia.'
        : 'Este prontuário contém informações sigilosas protegidas pelo sigilo profissional (CFP). Uso restrito ao profissional responsável.', L + 14, pdf.y + 10, { width: CW - 28, lineGap: 1.2 })

    const range = pdf.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i)
      drawFooter(i + 1, range.count)
    }

    const safeName = p.name.replace(/[^a-zA-Z0-9À-ɏ\s]/g, '').trim().replace(/\s+/g, '_')
    const filename = `${patientCopy ? 'Copia_Prontuario' : 'Backup_Profissional'}_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`

    // Não bufferizamos o PDF inteiro em memória (chunks[] + Buffer.concat) — o
    // chamador faz pdf.pipe(res) e só então chama pdf.end(), deixando o stream
    // fluir direto pro socket em vez de duplicar o documento inteiro no heap.
    return { filename, stream: pdf }
  }
}
