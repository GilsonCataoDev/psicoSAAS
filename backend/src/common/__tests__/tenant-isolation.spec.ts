/**
 * Testes de isolamento entre contas (multi-tenancy).
 *
 * Cenário: psicólogo A e psicólogo B, cada um com seu paciente e seus
 * registros (sessão, lançamento financeiro, documento, agendamento, anexo).
 *
 * O fake repository abaixo se comporta como o banco: honra os filtros
 * `where` com igualdade (incluindo arrays = OR). Se um service esquecer
 * de filtrar por psychologistId/userId, o teste FALHA — o registro do
 * outro tenant seria retornado.
 */
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'

import { PatientsService } from '../../modules/patients/patients.service'
import { PatientAttachmentsService } from '../../modules/patients/patient-attachments.service'
import { SessionsService } from '../../modules/sessions/sessions.service'
import { FinancialService } from '../../modules/financial/financial.service'
import { DocumentsService } from '../../modules/documents/documents.service'
import { AppointmentsService } from '../../modules/appointments/appointments.service'
import { StorageService } from '../storage/storage.service'
import { PlanAccessService } from '../plan-access/plan-access.service'

import { Patient } from '../../modules/patients/entities/patient.entity'
import { PatientAttachment } from '../../modules/patients/entities/patient-attachment.entity'
import { Session } from '../../modules/sessions/entities/session.entity'
import { FinancialRecord } from '../../modules/financial/entities/financial-record.entity'
import { RecurringExpense } from '../../modules/financial/entities/recurring-expense.entity'
import { Document } from '../../modules/documents/entities/document.entity'
import { Appointment } from '../../modules/appointments/entities/appointment.entity'
import { Booking } from '../../modules/booking/entities/booking.entity'
import { User } from '../../modules/auth/entities/user.entity'
import { NeuropsychAssessment } from '../../modules/neuropsych-assessments/entities/neuropsych-assessment.entity'

import { FinancialService as FinService } from '../../modules/financial/financial.service'
import { NotificationsService } from '../../modules/notifications/notifications.service'
import { ClinicalAiDraftService } from '../../modules/ai-governance/clinical-ai-draft.service'
import { EmailService } from '../../modules/email/email.service'
import { GoogleCalendarService } from '../../modules/google-calendar/google-calendar.service'

// ── Fake repository que honra filtros where ─────────────────────────────────

function matchesWhere(row: Record<string, any>, where: any): boolean {
  if (Array.isArray(where)) return where.some((w) => matchesWhere(row, w))
  return Object.entries(where ?? {}).every(([key, value]) => {
    if (value === undefined) return true
    return row[key] === value
  })
}

function fakeRepo(rows: Record<string, any>[] = []) {
  const data = [...rows]
  return {
    findOne:   jest.fn(async (opts: any) => data.find((r) => matchesWhere(r, opts?.where)) ?? null),
    findOneBy: jest.fn(async (where: any) => data.find((r) => matchesWhere(r, where)) ?? null),
    find:      jest.fn(async (opts: any) => data.filter((r) => matchesWhere(r, opts?.where))),
    count:     jest.fn(async (opts: any) => data.filter((r) => matchesWhere(r, opts?.where)).length),
    exist:     jest.fn(async (opts: any) => data.some((r) => matchesWhere(r, opts?.where))),
    save:      jest.fn(async (e: any) => e),
    create:    jest.fn((e: any) => e),
    softRemove: jest.fn(async (e: any) => e),
    remove:    jest.fn(async (e: any) => e),
    update:    jest.fn(async () => undefined),
    delete:    jest.fn(async (criteria: any) => {
      const before = data.length
      const kept = data.filter((r) => !matchesWhere(r, criteria))
      data.length = 0
      data.push(...kept)
      return { affected: before - kept.length }
    }),
  }
}

// ── Massa de dados: A e B convivendo na mesma "tabela" ──────────────────────

const PSY_A = 'psy-aaaa'
const PSY_B = 'psy-bbbb'

const patients = [
  { id: 'pat-a', psychologistId: PSY_A, name: 'Paciente A', status: 'active' },
  { id: 'pat-b', psychologistId: PSY_B, name: 'Paciente B', status: 'active' },
]
const sessions = [
  { id: 'ses-a', psychologistId: PSY_A, patientId: 'pat-a', notes: 'nota-a' },
  { id: 'ses-b', psychologistId: PSY_B, patientId: 'pat-b', notes: 'nota-b' },
]
const financialRecords = [
  { id: 'fin-a', psychologistId: PSY_A, amount: 100, status: 'pending' },
  { id: 'fin-b', psychologistId: PSY_B, amount: 200, status: 'pending' },
]
const documents = [
  { id: 'doc-a', userId: PSY_A, content: 'conteudo-a' },
  { id: 'doc-b', userId: PSY_B, content: 'conteudo-b' },
]
const appointments = [
  { id: 'apt-a', psychologistId: PSY_A, patientId: 'pat-a' },
  { id: 'apt-b', psychologistId: PSY_B, patientId: 'pat-b' },
]
const attachments = [
  { id: 'att-a', psychologistId: PSY_A, patientId: 'pat-a', filename: 'a.pdf', mimeType: 'application/pdf', data: 'x', size: 10 },
  { id: 'att-b', psychologistId: PSY_B, patientId: 'pat-b', filename: 'b.pdf', mimeType: 'application/pdf', data: 'x', size: 10 },
]
const neuropsychAssessments = [
  { id: 'ass-a', psychologistId: PSY_A, patientId: 'pat-a', status: 'planning' },
  { id: 'ass-b', psychologistId: PSY_B, patientId: 'pat-b', status: 'planning' },
]

const stub = () => ({}) as any

describe('Isolamento entre contas — psicólogo A não acessa dados de B', () => {

  describe('Pacientes', () => {
    let svc: PatientsService
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        providers: [
          PatientsService,
          { provide: getRepositoryToken(Patient),      useValue: fakeRepo(patients) },
          { provide: getRepositoryToken(Appointment),  useValue: fakeRepo(appointments) },
          { provide: FinService, useValue: stub() },
          { provide: PlanAccessService, useValue: { getCurrentPlan: jest.fn().mockResolvedValue('pro') } },
        ],
      }).compile()
      svc = mod.get(PatientsService)
    })

    it('A lê o próprio paciente', async () => {
      const p = await svc.findOne('pat-a', PSY_A)
      expect(p.id).toBe('pat-a')
    })

    it('A NÃO lê paciente de B, mesmo com o ID correto', async () => {
      await expect(svc.findOne('pat-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO atualiza paciente de B', async () => {
      await expect(svc.update('pat-b', { name: 'hackeado' } as any, PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO exclui paciente de B', async () => {
      await expect(svc.remove('pat-b', PSY_A)).rejects.toThrow(NotFoundException)
    })
  })

  describe('Sessões (prontuário)', () => {
    let svc: SessionsService
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        providers: [
          SessionsService,
          { provide: getRepositoryToken(Session),     useValue: fakeRepo(sessions) },
          { provide: getRepositoryToken(Patient),     useValue: fakeRepo(patients) },
          { provide: getRepositoryToken(User),        useValue: fakeRepo() },
          { provide: getRepositoryToken(Appointment), useValue: fakeRepo(appointments) },
          { provide: getRepositoryToken(Booking),     useValue: fakeRepo() },
          { provide: FinService,            useValue: stub() },
          { provide: NotificationsService,  useValue: stub() },
          { provide: ClinicalAiDraftService, useValue: stub() },
        ],
      }).compile()
      svc = mod.get(SessionsService)
    })

    it('A lê a própria sessão', async () => {
      const s = await svc.findOne('ses-a', PSY_A)
      expect(s.id).toBe('ses-a')
    })

    it('A NÃO lê sessão clínica de B', async () => {
      await expect(svc.findOne('ses-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO cria sessão apontando para paciente de B (recurso relacionado)', async () => {
      await expect(svc.create({ patientId: 'pat-b', date: '2026-07-15' } as any, PSY_A))
        .rejects.toThrow()
    })
  })

  describe('Financeiro', () => {
    let svc: FinancialService
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        providers: [
          FinancialService,
          { provide: getRepositoryToken(FinancialRecord), useValue: fakeRepo(financialRecords) },
          { provide: getRepositoryToken(RecurringExpense), useValue: fakeRepo() },
          { provide: getRepositoryToken(User),        useValue: fakeRepo() },
          { provide: getRepositoryToken(Patient),     useValue: fakeRepo(patients) },
          { provide: getRepositoryToken(Session),     useValue: fakeRepo(sessions) },
          { provide: getRepositoryToken(Booking),     useValue: fakeRepo() },
          { provide: getRepositoryToken(Appointment), useValue: fakeRepo(appointments) },
          { provide: NotificationsService, useValue: stub() },
        ],
      }).compile()
      svc = mod.get(FinancialService)
    })

    it('A lê o próprio lançamento', async () => {
      const r = await svc.findOne('fin-a', PSY_A)
      expect(r.id).toBe('fin-a')
    })

    it('A NÃO lê lançamento financeiro de B', async () => {
      await expect(svc.findOne('fin-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO exclui lançamento de B', async () => {
      await expect(svc.remove('fin-b', PSY_A)).rejects.toThrow(NotFoundException)
    })
  })

  describe('Documentos psicológicos', () => {
    let svc: DocumentsService
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        providers: [
          DocumentsService,
          { provide: getRepositoryToken(Document),     useValue: fakeRepo(documents) },
          { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn().mockReturnValue('sign-secret-de-teste-com-32-chars!') } },
          { provide: EmailService,  useValue: stub() },
          { provide: PlanAccessService, useValue: { getCurrentPlan: jest.fn().mockResolvedValue('pro') } },
        ],
      }).compile()
      svc = mod.get(DocumentsService)
    })

    it('A lê o próprio documento', async () => {
      const d = await svc.findOneForUser('doc-a', PSY_A)
      expect(d.id).toBe('doc-a')
    })

    it('A NÃO lê documento de B', async () => {
      await expect(svc.findOneForUser('doc-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO gera PDF de documento de B (checagem pós-busca)', async () => {
      await expect(svc.generatePdf('doc-b', PSY_A)).rejects.toThrow(NotFoundException)
    })
  })

  describe('Agenda', () => {
    let svc: AppointmentsService
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        providers: [
          AppointmentsService,
          { provide: getRepositoryToken(Appointment),     useValue: fakeRepo(appointments) },
          { provide: getRepositoryToken(Booking),         useValue: fakeRepo() },
          { provide: getRepositoryToken(Patient),         useValue: fakeRepo(patients) },
          { provide: getRepositoryToken(Session),         useValue: fakeRepo(sessions) },
          { provide: getRepositoryToken(FinancialRecord), useValue: fakeRepo(financialRecords) },
          { provide: DataSource,             useValue: { transaction: jest.fn(), query: jest.fn() } },
          { provide: NotificationsService,   useValue: stub() },
          { provide: GoogleCalendarService,  useValue: stub() },
        ],
      }).compile()
      svc = mod.get(AppointmentsService)
    })

    it('A lê o próprio agendamento', async () => {
      const a = await svc.findOne('apt-a', PSY_A)
      expect(a.id).toBe('apt-a')
    })

    it('A NÃO lê agendamento de B', async () => {
      await expect(svc.findOne('apt-b', PSY_A)).rejects.toThrow(NotFoundException)
    })
  })

  describe('Arquivos anexados', () => {
    let svc: PatientAttachmentsService
    beforeEach(async () => {
      const mod = await Test.createTestingModule({
        providers: [
          PatientAttachmentsService,
          { provide: getRepositoryToken(PatientAttachment), useValue: fakeRepo(attachments) },
          { provide: getRepositoryToken(Patient),           useValue: fakeRepo(patients) },
          { provide: getRepositoryToken(NeuropsychAssessment), useValue: fakeRepo(neuropsychAssessments) },
          { provide: StorageService, useValue: { isPrivateConfigured: () => false } },
        ],
      }).compile()
      svc = mod.get(PatientAttachmentsService)
    })

    it('A NÃO lista anexos de paciente de B', async () => {
      await expect(svc.list('pat-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO baixa anexo de B, mesmo com IDs corretos', async () => {
      await expect(svc.download('att-b', 'pat-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO exclui anexo de B', async () => {
      await expect(svc.remove('att-b', 'pat-b', PSY_A)).rejects.toThrow(NotFoundException)
    })

    it('A NÃO envia arquivo para paciente de B', async () => {
      const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(16)])
      await expect(svc.add('pat-b', PSY_A, { originalname: 'x.pdf', mimetype: 'application/pdf', size: 25, buffer: pdf }))
        .rejects.toThrow(NotFoundException)
    })

    it('A NÃO vincula anexo a avaliação de B', async () => {
      const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(16)])
      await expect(svc.add(
        'pat-a',
        PSY_A,
        { originalname: 'x.pdf', mimetype: 'application/pdf', size: 25, buffer: pdf },
        { assessmentId: 'ass-b', kind: 'test_result' },
      )).rejects.toThrow(NotFoundException)
    })
  })
})
