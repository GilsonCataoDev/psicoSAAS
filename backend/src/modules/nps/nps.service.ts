import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import { NpsResponse } from './entities/nps-response.entity'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class NpsService {
  constructor(
    @InjectRepository(NpsResponse) private repo: Repository<NpsResponse>,
    private notifications: NotificationsService,
  ) {}

  async sendNps(userId: string, opts: {
    patientId: string
    sessionId?: string
    patientPhone: string
    patientName: string
    frontendUrl: string
  }): Promise<{ token: string }> {
    const token = randomBytes(24).toString('hex')
    await this.repo.save(this.repo.create({
      userId,
      patientId: opts.patientId,
      sessionId: opts.sessionId,
      token,
    }))
    const link = `${opts.frontendUrl}/avaliar/${token}`
    const first = opts.patientName.split(' ')[0]
    const msg = `Olá, ${first}! Como foi seu atendimento de hoje?\n\nSua opinião é muito importante. Leva menos de 1 minuto:\n${link}`
    await this.notifications.sendDirectWhatsApp(opts.patientPhone, msg, userId, {
      type: 'NPS',
      patientId: opts.patientId,
      patientName: opts.patientName,
    })
    return { token }
  }

  async getSurvey(token: string): Promise<{ responded: boolean }> {
    const r = await this.repo.findOne({ where: { token } })
    if (!r) throw new NotFoundException('Pesquisa não encontrada')
    return { responded: r.responded }
  }

  async submitResponse(token: string, score: number, comment?: string): Promise<void> {
    const r = await this.repo.findOne({ where: { token } })
    if (!r) throw new NotFoundException('Pesquisa não encontrada')
    if (r.responded) throw new BadRequestException('Esta pesquisa já foi respondida')
    if (score < 0 || score > 10) throw new BadRequestException('Nota deve ser entre 0 e 10')
    r.score = score
    r.comment = comment?.trim() ?? undefined
    r.responded = true
    await this.repo.save(r)
  }

  async getResults(userId: string): Promise<{
    avg: number | null
    total: number
    responded: number
    promoters: number
    detractors: number
    npsScore: number | null
    recentComments: { score: number; comment: string; createdAt: Date }[]
  }> {
    const all = await this.repo.find({ where: { userId, responded: true }, order: { createdAt: 'DESC' } })
    if (all.length === 0) return { avg: null, total: 0, responded: 0, promoters: 0, detractors: 0, npsScore: null, recentComments: [] }
    const total = await this.repo.count({ where: { userId } })
    const scores = all.map(r => r.score!)
    const avg = Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10
    const promoters = scores.filter(s => s >= 9).length
    const detractors = scores.filter(s => s <= 6).length
    const npsScore = Math.round(((promoters - detractors) / scores.length) * 100)
    const recentComments = all.filter(r => r.comment).slice(0, 10).map(r => ({ score: r.score!, comment: r.comment!, createdAt: r.createdAt }))
    return { avg, total, responded: all.length, promoters, detractors, npsScore, recentComments }
  }
}
