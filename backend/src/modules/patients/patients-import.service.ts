import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import * as Papa from 'papaparse'
import { Patient } from './entities/patient.entity'
import { CreatePatientDto } from './dto/create-patient.dto'
import { ImportResultDto } from './dto/import-patients.dto'
import { PatientsService } from './patients.service'

export const IMPORT_MAX_ROWS = 500

/** Aliases pt-BR normalizados (sem acento, minúsculo) -> campo do CreatePatientDto. */
const HEADER_ALIASES: Record<string, keyof CreatePatientDto> = {
  'nome completo': 'name',
  'nome do paciente': 'name',
  'nome': 'name',
  'e-mail': 'email',
  'email': 'email',
  'telefone': 'phone',
  'celular': 'phone',
  'cpf ou cnpj': 'cpfCnpj',
  'cpf/cnpj': 'cpfCnpj',
  'cpf': 'cpfCnpj',
  'cnpj': 'cpfCnpj',
  'data de nascimento': 'birthDate',
  'nascimento': 'birthDate',
  'data de inicio': 'startDate',
  'inicio do acompanhamento': 'startDate',
  'valor da sessao (r$)': 'sessionPrice',
  'valor da sessao': 'sessionPrice',
  'tipo de cobranca': 'billingType',
  'modalidade de atendimento': 'careMode',
  'genero': 'gender',
  'observacoes': 'privateNotes',
}

const BILLING_TYPE_ALIASES: Record<string, 'per_session' | 'monthly_package'> = {
  'por sessao': 'per_session',
  'pacote mensal': 'monthly_package',
}

const CARE_MODE_ALIASES: Record<string, 'psychotherapy' | 'neuropsychological_assessment'> = {
  'psicoterapia': 'psychotherapy',
  'avaliacao neuropsicologica': 'neuropsychological_assessment',
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function normalizeValue(value: string): string {
  return normalizeHeader(value)
}

/** Converte DD/MM/AAAA -> AAAA-MM-DD. Retorna o valor original se não bater o formato. */
function convertBrDate(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return value.trim()
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

/** Converte "150,00" -> 150.00. */
function convertBrCurrency(value: string): number | undefined {
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

type ParsedRow = { row: number; data: Record<string, unknown> }

@Injectable()
export class PatientsImportService {
  constructor(
    @InjectRepository(Patient) private repo: Repository<Patient>,
    private patients: PatientsService,
  ) {}

  async import(buffer: Buffer, psychologistId: string): Promise<ImportResultDto> {
    const rows = this.parseCsv(buffer)

    if (rows.length === 0) {
      throw new BadRequestException('O arquivo CSV está vazio ou não pôde ser lido.')
    }
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new BadRequestException(`O arquivo tem ${rows.length} linhas. O limite por importação é ${IMPORT_MAX_ROWS} linhas — divida em arquivos menores.`)
    }

    const [{ plan, limit }, existing] = await Promise.all([
      this.patients.getPlanUsage(psychologistId),
      this.repo.find({ where: { psychologistId }, select: ['id', 'name', 'cpfCnpj', 'email'] }),
    ])
    let remainingSlots = await this.patients.getRemainingPatientSlots(psychologistId)

    const existingCpfCnpj = new Map(existing.filter(p => p.cpfCnpj).map(p => [p.cpfCnpj as string, p]))
    const existingEmail = new Map(existing.filter(p => p.email).map(p => [(p.email as string).toLowerCase(), p]))
    const seenCpfCnpj = new Set<string>()
    const seenEmail = new Set<string>()

    const result: ImportResultDto = {
      totalRows: rows.length,
      importedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      imported: [],
      skipped: [],
      errors: [],
    }

    const toPersist: { row: number; entity: Patient }[] = []

    for (const { row, data } of rows) {
      const mapped = this.mapRow(data)
      const name = typeof mapped.name === 'string' ? mapped.name : undefined

      const instance = plainToInstance(CreatePatientDto, mapped)
      const violations = await validate(instance, { whitelist: true })
      if (violations.length > 0) {
        result.errors.push({
          row,
          name,
          errors: violations.flatMap(v => Object.values(v.constraints ?? {})),
        })
        continue
      }

      const cpfCnpj = instance.cpfCnpj
      const email = instance.email?.toLowerCase()
      const dupExisting = (cpfCnpj && existingCpfCnpj.get(cpfCnpj)) || (email && existingEmail.get(email))
      const dupInFile = (cpfCnpj && seenCpfCnpj.has(cpfCnpj)) || (email && seenEmail.has(email))
      if (dupExisting || dupInFile) {
        result.skipped.push({
          row,
          name,
          reason: 'duplicate',
          details: dupExisting ? `Já existe um paciente com esse CPF/CNPJ ou e-mail (${dupExisting.name}).` : 'Duplicado dentro do próprio arquivo.',
        })
        continue
      }

      if (remainingSlots <= 0) {
        result.skipped.push({ row, name, reason: 'plan_limit_reached' })
        continue
      }

      if (cpfCnpj) seenCpfCnpj.add(cpfCnpj)
      if (email) seenEmail.add(email)
      remainingSlots -= 1

      const encrypted = this.patients.encryptFields(instance)
      const entity = this.repo.create({ status: 'active', ...encrypted, psychologistId })
      toPersist.push({ row, entity })
    }

    if (toPersist.length > 0) {
      const saved = await this.repo.save(toPersist.map(t => t.entity))
      saved.forEach((patient, i) => {
        result.imported.push({ row: toPersist[i].row, id: patient.id, name: patient.name })
      })
    }

    result.importedCount = result.imported.length
    result.skippedCount = result.skipped.length
    result.errorCount = result.errors.length

    if (result.skipped.some(s => s.reason === 'plan_limit_reached')) {
      result.upgradeUrl = '/planos'
      result.currentPlan = plan
    }
    void limit

    return result
  }

  private parseCsv(buffer: Buffer): ParsedRow[] {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '')
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizeHeader(h),
    })
    return parsed.data.map((data, i) => ({ row: i + 2, data })) // +2: linha 1 é o header, dados começam na 2
  }

  private mapRow(data: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {}
    for (const [header, rawValue] of Object.entries(data)) {
      const field = HEADER_ALIASES[header]
      if (!field || rawValue === undefined || rawValue === null) continue
      const value = String(rawValue).trim()
      if (value === '') continue

      switch (field) {
        case 'birthDate':
        case 'startDate':
          mapped[field] = convertBrDate(value)
          break
        case 'sessionPrice':
          mapped[field] = convertBrCurrency(value)
          break
        case 'billingType':
          mapped[field] = BILLING_TYPE_ALIASES[normalizeValue(value)] ?? value
          break
        case 'careMode':
          mapped[field] = CARE_MODE_ALIASES[normalizeValue(value)] ?? value
          break
        default:
          mapped[field] = value
      }
    }
    return mapped
  }
}
