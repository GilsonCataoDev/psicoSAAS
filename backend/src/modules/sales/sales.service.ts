import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, LessThanOrEqual, Repository } from 'typeorm'
import { SalesRep } from './entities/sales-rep.entity'
import { SalesCommission } from './entities/sales-commission.entity'
import { CreateSalesRepDto } from './dto/create-sales-rep.dto'
import { UpdateSalesRepDto } from './dto/update-sales-rep.dto'

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name)

  constructor(
    @InjectRepository(SalesRep) private readonly reps: Repository<SalesRep>,
    @InjectRepository(SalesCommission) private readonly commissions: Repository<SalesCommission>,
  ) {}

  async findRepByCoupon(code: string): Promise<SalesRep | null> {
    return this.reps.findOne({
      where: { couponCode: code.toUpperCase(), status: 'active' },
    })
  }

  async getRepByToken(token: string): Promise<SalesRep | null> {
    return this.reps.findOne({ where: { accessToken: token, status: 'active' } })
  }

  async hasAttribution(userId: string): Promise<boolean> {
    return this.commissions.exist({ where: { userId } })
  }

  async createRep(dto: CreateSalesRepDto): Promise<SalesRep> {
    const rep = this.reps.create({
      ...dto,
      couponCode: dto.couponCode.toUpperCase(),
      accessToken: crypto.randomUUID(),
    })
    return this.reps.save(rep)
  }

  async updateRep(id: string, dto: UpdateSalesRepDto): Promise<SalesRep> {
    const rep = await this.reps.findOneBy({ id })
    if (!rep) throw new NotFoundException('Vendedor não encontrado')
    if (dto.couponCode) dto.couponCode = dto.couponCode.toUpperCase()
    Object.assign(rep, dto)
    return this.reps.save(rep)
  }

  async listReps(): Promise<SalesRep[]> {
    return this.reps.find({ order: { name: 'ASC' } })
  }

  async handlePaymentApproved(
    userId: string,
    paymentId: string | undefined,
    grossAmount: number,
  ): Promise<void> {
    if (!paymentId?.trim() || !Number.isFinite(grossAmount) || grossAmount <= 0) {
      this.logger.warn(`[Sales] Pagamento inválido ignorado userId=${userId}`)
      return
    }
    const commission = await this.commissions.findOne({
      where: { userId, status: 'pending' },
    })
    if (!commission) return
    if (commission.paymentId) return // idempotente

    const availableAt = new Date()
    availableAt.setDate(availableAt.getDate() + 30)

    const commissionAmount = Math.round(
      Math.min(Number(commission.commissionAmount), grossAmount / 2) * 100,
    ) / 100
    const result = await this.commissions.update(
      { id: commission.id, status: 'pending', paymentId: IsNull() },
      {
        paymentId: paymentId.trim(),
        grossAmount,
        commissionAmount,
        paymentApprovedAt: new Date(),
        commissionAvailableAt: availableAt,
        status: 'validating',
      },
    )
    if (!result.affected) return
    this.logger.log(
      `[Sales] Comissão ${commission.id} movida para validating userId=${userId} paymentId=${paymentId}`,
    )
  }

  async handlePaymentReversed(
    userId: string,
    paymentId: string,
    reason: string,
  ): Promise<void> {
    const newStatus = reason.toLowerCase().includes('chargeback') ? 'chargeback' : 'refunded'
    const paid = await this.commissions.update(
      { userId, paymentId, status: 'paid' },
      { status: 'clawback', ineligibleReason: reason.slice(0, 240) },
    )
    const reversed = await this.commissions.update(
      { userId, paymentId, status: In(['validating', 'payable']) },
      { status: newStatus, ineligibleReason: reason.slice(0, 240) },
    )
    if (!paid.affected && !reversed.affected) return
    this.logger.log(
      `[Sales] Comissão revertida para ${paid.affected ? 'clawback' : newStatus} userId=${userId}`,
    )
  }

  async releaseDueCommissions(salesRepId?: string): Promise<number> {
    const where: Record<string, unknown> = {
      status: 'validating',
      commissionAvailableAt: LessThanOrEqual(new Date()),
    }
    if (salesRepId) where['salesRepId'] = salesRepId

    const result = await this.commissions.update(where as any, { status: 'payable' })
    return result.affected ?? 0
  }

  async getStats(salesRepId: string) {
    await this.releaseDueCommissions(salesRepId)

    const all = await this.commissions.find({
      where: { salesRepId },
      order: { createdAt: 'DESC' },
    })

    const sum = (status: string) =>
      all
        .filter(c => c.status === status)
        .reduce((acc, c) => acc + Number(c.commissionAmount), 0)

    const count = (status: string) => all.filter(c => c.status === status).length

    const nextValidation = all
      .filter(c => c.status === 'validating' && c.commissionAvailableAt)
      .sort((a, b) => (a.commissionAvailableAt?.getTime() ?? 0) - (b.commissionAvailableAt?.getTime() ?? 0))[0]

    return {
      totalSales: all.length,
      pendingCount: count('pending') + count('validating'),
      payableCount: count('payable'),
      paidCount: count('paid'),
      pendingAmount: sum('pending') + sum('validating'),
      payableAmount: sum('payable'),
      paidAmount: sum('paid'),
      nextPaymentAt: nextValidation?.commissionAvailableAt ?? null,
      commissions: all.map(c => ({
        id: c.id,
        status: c.status,
        couponCode: c.couponCode,
        commissionAmount: Number(c.commissionAmount),
        grossAmount: c.grossAmount ? Number(c.grossAmount) : null,
        paymentApprovedAt: c.paymentApprovedAt,
        commissionAvailableAt: c.commissionAvailableAt,
        commissionPaidAt: c.commissionPaidAt,
        createdAt: c.createdAt,
        clientReference: this.clientReference(c.userId, c.id),
      })),
    }
  }

  async markPaid(commissionId: string, payoutReference: string): Promise<void> {
    const reference = payoutReference.trim()
    if (reference.length < 3) throw new BadRequestException('Informe uma referência de pagamento válida')
    const result = await this.commissions.update(
      { id: commissionId, status: 'payable' },
      { status: 'paid', commissionPaidAt: new Date(), payoutReference: reference },
    )
    if (!result.affected) {
      const commission = await this.commissions.findOneBy({ id: commissionId })
      if (!commission) throw new NotFoundException('Comissão não encontrada')
      throw new BadRequestException(`Comissão não está no status payable (status atual: ${commission.status})`)
    }
    this.logger.log(`[Sales] Comissão ${commissionId} marcada como paga ref=${reference}`)
  }

  async adminListCommissions(filters?: { status?: string; salesRepId?: string }) {
    await this.releaseDueCommissions()

    const qb = this.commissions
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.salesRep', 'rep')
      .leftJoinAndSelect('c.user', 'u')
      .orderBy('c.createdAt', 'DESC')

    if (filters?.status) qb.andWhere('c.status = :status', { status: filters.status })
    if (filters?.salesRepId) qb.andWhere('c.salesRepId = :salesRepId', { salesRepId: filters.salesRepId })

    const all = await qb.getMany()

    return all.map(c => ({
      id: c.id,
      status: c.status,
      couponCode: c.couponCode,
      commissionAmount: Number(c.commissionAmount),
      grossAmount: c.grossAmount ? Number(c.grossAmount) : null,
      paymentApprovedAt: c.paymentApprovedAt,
      commissionAvailableAt: c.commissionAvailableAt,
      commissionPaidAt: c.commissionPaidAt,
      payoutReference: c.payoutReference,
      createdAt: c.createdAt,
      salesRep: c.salesRep
        ? {
            id: c.salesRep.id,
            name: c.salesRep.name,
            email: c.salesRep.email,
            pixKey: c.salesRep.pixKey,
            pixKeyType: c.salesRep.pixKeyType,
          }
        : null,
      user: c.user ? { name: c.user.name, email: c.user.email } : null,
    }))
  }

  async createCommission(data: {
    salesRepId: string
    userId: string
    couponCode: string
    commissionAmount: number
  }, manager?: EntityManager): Promise<SalesCommission> {
    const repository = manager?.getRepository(SalesCommission) ?? this.commissions
    const existing = await repository.findOne({ where: { userId: data.userId } })
    if (existing) return existing

    const commission = repository.create({
      salesRepId: data.salesRepId,
      userId: data.userId,
      couponCode: data.couponCode,
      commissionAmount: data.commissionAmount,
      status: 'pending',
    })
    return repository.save(commission)
  }

  private clientReference(userId: string | null, commissionId: string): string {
    const source = userId ?? commissionId
    return `Cliente ${source.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`
  }
}
