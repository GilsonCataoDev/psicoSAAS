import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Testimonial } from './entities/testimonial.entity'
import { CreateTestimonialDto } from './dto/create-testimonial.dto'

const DAYS_THRESHOLD = 30
const PATIENTS_THRESHOLD = 10
const SESSIONS_THRESHOLD = 20

@Injectable()
export class TestimonialService {
  private readonly logger = new Logger(TestimonialService.name)

  constructor(
    @InjectRepository(Testimonial) private readonly repo: Repository<Testimonial>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getStatus(userId: string): Promise<{ shouldShow: boolean }> {
    type Row = { hasRecord: boolean; daysSince: number; patients: number; sessions: number }
    const [row] = await this.dataSource.query<Row[]>(`
      SELECT
        EXISTS(SELECT 1 FROM testimonials WHERE "userId" = $1)::bool           AS "hasRecord",
        FLOOR(EXTRACT(EPOCH FROM (NOW() - u."createdAt")) / 86400)::int        AS "daysSince",
        (SELECT COUNT(*)::int FROM patients  WHERE "psychologistId" = $1)      AS patients,
        (SELECT COUNT(*)::int FROM sessions  WHERE "psychologistId" = $1)      AS sessions
      FROM users u
      WHERE u.id = $1
    `, [userId])

    if (!row || row.hasRecord) return { shouldShow: false }

    return {
      shouldShow:
        Number(row.daysSince) >= DAYS_THRESHOLD ||
        Number(row.patients)  >= PATIENTS_THRESHOLD ||
        Number(row.sessions)  >= SESSIONS_THRESHOLD,
    }
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

  async listAdmin() {
    type Row = {
      id: string; userId: string; userName: string; userEmail: string
      rating: number | null; text: string | null
      approvedForPublic: boolean; publicConsent: boolean; createdAt: string
    }
    return this.dataSource.query<Row[]>(`
      SELECT
        t.id,
        t."userId",
        u.name      AS "userName",
        u.email     AS "userEmail",
        t.rating,
        t.text,
        t."approvedForPublic",
        t."publicConsent",
        t."createdAt"
      FROM testimonials t
      JOIN users u ON u.id = t."userId"
      WHERE t.dismissed = false
      ORDER BY t."createdAt" DESC
    `)
  }

  async setApproved(id: string, approvedForPublic: boolean): Promise<void> {
    const testimonial = await this.repo.findOne({ where: { id } })
    if (!testimonial) throw new NotFoundException('Depoimento não encontrado')
    if (approvedForPublic && (!testimonial.publicConsent || !testimonial.text?.trim())) {
      throw new BadRequestException('Este depoimento não possui autorização para divulgação')
    }

    testimonial.approvedForPublic = approvedForPublic
    await this.repo.save(testimonial)
    this.logger.log(`testimonial:${id} ${approvedForPublic ? 'aprovado' : 'reprovado'} para exibição pública`)
  }
}
