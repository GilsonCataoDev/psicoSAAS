import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import PDFDocument = require('pdfkit')
import { Patient } from './entities/patient.entity'
import { CreatePatientDto } from './dto/create-patient.dto'
import { UpdatePatientDto } from './dto/update-patient.dto'
import { Subscription } from '../billing/entities/subscription.entity'
import { PLAN_LIMITS, normalizePlan } from '../../common/plans'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'

type EncryptedProntuario = {
  __encrypted: 'psicosaas.prontuario.v1'
  data: string
}

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
  private encryptFields<T extends { privateNotes?: string; prontuario?: Record<string, any> }>(dto: T): T {
    const encrypted: any = { ...dto }
    if (dto.privateNotes) encrypted.privateNotes = encrypt(dto.privateNotes)
    if (dto.prontuario) encrypted.prontuario = this.encryptProntuario(dto.prontuario)
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
      __encrypted: 'psicosaas.prontuario.v1',
      data: encrypt(JSON.stringify(value)),
    }
  }

  private decryptProntuario(value: Record<string, any>): Record<string, any> {
    if (
      value
      && value.__encrypted === 'psicosaas.prontuario.v1'
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
    const plan = normalizePlan((sub?.status === 'active' || sub?.status === 'trialing') ? sub.plan : 'free')

    const limit = PLAN_LIMITS[plan].maxPatients
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

  // ─── Exportação de prontuário em PDF ────────────────────────────────────────

  async exportProntuario(
    patientId: string,
    psychologistId: string,
    psychologistName: string,
    psychologistCrp: string,
  ): Promise<{ filename: string; buffer: Buffer }> {
    const patient = await this.findRaw(patientId, psychologistId, ['sessions'])
    const p = this.dec(patient)

    const sessions = (p.sessions ?? [])
      .filter(s => s.summary || s.privateNotes || s.nextSteps)
      .sort((a, b) => a.date.localeCompare(b.date))

    const pdf = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, info: {
      Title: `Prontuário — ${p.name}`,
      Author: psychologistName,
      Subject: 'Prontuário Clínico',
      Keywords: 'UseCognia, prontuário, psicologia',
    } })
    const done = this.collectPdf(pdf)

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
        .text(`UseCognia  |  Prontuário Clínico — ${p.name}`, L, fy + 8, { width: CW - 80, lineBreak: false })
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
    pdf.fillColor(muted).font('Helvetica').fontSize(7).text('Plataforma para psicólogos', L, 38, { lineBreak: false })

    pdf.fillColor(ink).font('Helvetica-Bold').fontSize(18).text('Prontuário Clínico', L, 56, { width: CW })
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
    sectionTitle('Dados do Paciente')
    fieldPair('NOME COMPLETO', p.name, 'STATUS', p.status === 'active' ? 'Em atendimento' : p.status === 'paused' ? 'Pausado' : 'Alta')
    fieldPair('DATA DE NASCIMENTO', p.birthDate ? new Date(p.birthDate).toLocaleDateString('pt-BR') : undefined, 'CPF / CNPJ', p.cpfCnpj)
    fieldPair('E-MAIL', p.email, 'TELEFONE', p.phone)
    fieldPair('INÍCIO DO ACOMPANHAMENTO', p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : undefined, 'PRONOMES', p.pronouns)

    if (p.privateNotes?.trim()) {
      checkPageBreak(40)
      field('ANOTAÇÕES PRIVADAS', p.privateNotes, { wide: true })
    }

    // ── Prontuário Clínico ────────────────────────────────────────────────────
    const pr = p.prontuario as Record<string, string> | undefined

    if (pr) {
      const hasAnamnese = pr.queixaPrincipal || pr.historicoDoenca || pr.antecedentesPessoais || pr.historicoFamiliar || pr.medicamentos || pr.condicoesMedicas
      const hasPlano    = pr.abordagem || pr.objetivos || pr.frequencia || pr.duracaoPrevista
      const hasDados    = pr.escolaridade || pr.profissao || pr.estadoCivil || pr.religiao

      if (hasAnamnese) {
        checkPageBreak(80)
        sectionTitle('Anamnese')
        field('QUEIXA PRINCIPAL', pr.queixaPrincipal, { wide: true })
        field('HISTÓRICO DA DOENÇA', pr.historicoDoenca, { wide: true })
        field('ANTECEDENTES PESSOAIS', pr.antecedentesPessoais, { wide: true })
        field('HISTÓRICO FAMILIAR', pr.historicoFamiliar, { wide: true })
        field('MEDICAMENTOS', pr.medicamentos, { wide: true })
        field('CONDIÇÕES MÉDICAS', pr.condicoesMedicas, { wide: true })
      }

      if (hasPlano) {
        checkPageBreak(80)
        sectionTitle('Plano Terapêutico')
        field('ABORDAGEM', pr.abordagem, { wide: true })
        field('OBJETIVOS', pr.objetivos, { wide: true })
        fieldPair('FREQUÊNCIA', pr.frequencia, 'DURAÇÃO PREVISTA', pr.duracaoPrevista)
      }

      if (hasDados) {
        checkPageBreak(60)
        sectionTitle('Dados Complementares')
        fieldPair('ESCOLARIDADE', pr.escolaridade, 'PROFISSÃO', pr.profissao)
        fieldPair('ESTADO CIVIL', pr.estadoCivil, 'RELIGIÃO', pr.religiao)
      }

      if (pr.contatoEmergenciaNome) {
        checkPageBreak(50)
        sectionTitle('Contato de Emergência')
        fieldPair('NOME', pr.contatoEmergenciaNome, 'RELAÇÃO', pr.contatoEmergenciaRelacao)
        field('TELEFONE', pr.contatoEmergenciaPhone)
      }
    }

    // ── Evolução (sessões) ────────────────────────────────────────────────────
    if (sessions.length > 0) {
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

        if (s.privateNotes?.trim()) {
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
      .text('DOCUMENTO CONFIDENCIAL', L + 14, pdf.y + 8, { width: CW - 28, lineBreak: false })
    pdf.fillColor(muted).font('Helvetica').fontSize(7)
      .text('Este prontuário contém informações sigilosas protegidas pelo sigilo profissional (CFP). Uso restrito ao profissional responsável.', L + 14, pdf.y + 10, { width: CW - 28, lineGap: 1.2 })

    const range = pdf.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i)
      drawFooter(i + 1, range.count)
    }

    pdf.end()

    const safeName = p.name.replace(/[^a-zA-Z0-9À-ɏ\s]/g, '').trim().replace(/\s+/g, '_')
    const filename = `Prontuario_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`

    return { filename, buffer: await done }
  }

  private collectPdf(pdf: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      pdf.on('data', chunk => chunks.push(Buffer.from(chunk)))
      pdf.on('end', () => resolve(Buffer.concat(chunks)))
      pdf.on('error', reject)
    })
  }
}
