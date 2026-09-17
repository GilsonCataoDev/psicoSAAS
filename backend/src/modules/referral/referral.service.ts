import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm'
import { Referral } from './entities/referral.entity'
import { ReferralPayoutProfile } from './entities/referral-payout-profile.entity'
import { User } from '../auth/entities/user.entity'
import { UpdateReferralPayoutProfileDto } from './dto/referral-payout.dto'

const COMMISSION_AMOUNT = 48.95
const VALIDATION_DAYS = 30
const TERMS_VERSION = '2026-09-17'
const TERMS_TEXT = 'Comissão única de até R$ 48,95 sobre o primeiro pagamento aprovado; liberação após 30 dias sem estorno ou chargeback; pagamento mensal por Pix; autoindicação, contas duplicadas, fraude e publicidade enganosa não são elegíveis.'

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(Referral) private readonly refs: Repository<Referral>,
    @InjectRepository(ReferralPayoutProfile) private readonly profiles: Repository<ReferralPayoutProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async getOrCreateCode(user: User): Promise<string> {
    let master = await this.refs.findOne({ where: { referrerId: user.id, referredId: IsNull() } })

    if (!master) {
      const base = user.name.split(' ')[0].toUpperCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '').slice(0, 8) || 'COGNIA'
      let code = base
      let attempt = 0
      while (await this.refs.findOne({ where: { code, referredId: IsNull() } })) {
        attempt += 1
        code = `${base}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
        if (attempt >= 5) code = `${base}${Date.now().toString(36).slice(-5).toUpperCase()}`
      }
      master = await this.refs.save(this.refs.create({ referrerId: user.id, code }))
    }

    return master.code
  }

  /** Registra atribuição. Não concede desconto nem benefício gratuito. */
  async applyReferral(code: string, newUser: User): Promise<void> {
    const master = await this.refs.findOne({
      where: { code: code.trim().toUpperCase(), referredId: IsNull() },
      relations: ['referrer'],
    })
    if (!master || master.referrerId === newUser.id) return
    const normalize = (value?: string | null) => value?.replace(/\D/g, '') || null
    const referrerEmail = master.referrer?.email?.toLowerCase() || null
    const newUserEmail = newUser.email?.toLowerCase() || null
    if (
      (referrerEmail && referrerEmail === newUserEmail)
      || (normalize(master.referrer?.cpfCnpj) && normalize(master.referrer?.cpfCnpj) === normalize(newUser.cpfCnpj))
      || (normalize(master.referrer?.phone) && normalize(master.referrer?.phone) === normalize(newUser.phone))
    ) return
    if (await this.refs.findOne({ where: { referredId: newUser.id } })) return

    await this.refs.save(this.refs.create({
      referrerId: master.referrerId,
      code: master.code,
      referredId: newUser.id,
      rewardGranted: false,
      status: 'captured',
    }))
    await this.users.update(newUser.id, { referralCode: master.code })
  }

  async isValidCode(code: string): Promise<boolean> {
    if (!code?.trim()) return false
    return Boolean(await this.refs.findOne({
      where: { code: code.trim().toUpperCase(), referredId: IsNull() },
    }))
  }

  /** Idempotente: apenas o primeiro pagamento aprovado gera comissão. */
  async handlePaymentApproved(userId: string, paymentId?: string, grossAmount?: number): Promise<void> {
    if (!paymentId) return
    if (!Number.isFinite(grossAmount) || Number(grossAmount) <= 0) return
    const referral = await this.refs.findOne({ where: { referredId: userId } })
    if (!referral || referral.status === 'ineligible' || referral.firstPaymentId) return

    const approvedAt = new Date()
    const availableAt = new Date(approvedAt)
    availableAt.setDate(availableAt.getDate() + VALIDATION_DAYS)
    Object.assign(referral, {
      firstPaymentId: paymentId,
      firstPaymentGross: Number.isFinite(grossAmount) ? Number(grossAmount).toFixed(2) : null,
      commissionAmount: Math.min(COMMISSION_AMOUNT, Number(grossAmount) / 2).toFixed(2),
      paymentApprovedAt: approvedAt,
      commissionAvailableAt: availableAt,
      status: 'validating',
      ineligibleReason: null,
    })
    await this.refs.save(referral)
  }

  async handlePaymentReversed(userId: string, paymentId: string | undefined, reason: string): Promise<void> {
    if (!paymentId) return
    const referral = await this.refs.findOne({ where: { referredId: userId, firstPaymentId: paymentId } })
    if (!referral) return
    referral.status = reason.includes('CHARGEBACK') ? 'chargeback' : 'refunded'
    referral.ineligibleReason = reason.slice(0, 240)
    await this.refs.save(referral)
  }

  async getStats(userId: string) {
    await this.releaseValidatedCommissions(userId)
    const [master, uses, profile] = await Promise.all([
      this.refs.findOne({ where: { referrerId: userId, referredId: IsNull() } }),
      this.refs.find({
        where: { referrerId: userId, referredId: Not(IsNull()) },
        relations: ['referred'],
        order: { createdAt: 'DESC' },
      }),
      this.profiles.findOne({ where: { userId } }),
    ])
    const sum = (statuses: Referral['status'][]) => uses
      .filter(item => statuses.includes(item.status))
      .reduce((total, item) => total + Number(item.commissionAmount ?? 0), 0)

    return {
      code: master?.code ?? null,
      commissionAmount: COMMISSION_AMOUNT,
      validationDays: VALIDATION_DAYS,
      termsVersion: TERMS_VERSION,
      termsText: TERMS_TEXT,
      totalInvited: uses.length,
      totalPending: uses.filter(item => ['captured', 'validating'].includes(item.status)).length,
      totalPayable: uses.filter(item => item.status === 'payable').length,
      totalPaid: uses.filter(item => item.status === 'paid').length,
      pendingAmount: sum(['validating']),
      payableAmount: sum(['payable']),
      paidAmount: sum(['paid']),
      payoutProfile: profile ? {
        configured: true,
        pixKeyType: profile.pixKeyType,
        pixKeyMasked: this.mask(profile.pixKey),
        termsVersion: profile.termsVersion,
      } : { configured: false },
      invited: uses.map(item => ({
        id: item.id,
        name: item.referred?.name?.split(' ')[0] ?? 'Cliente indicado',
        createdAt: item.createdAt,
        status: item.status,
        commissionAmount: item.commissionAmount ? Number(item.commissionAmount) : null,
        commissionAvailableAt: item.commissionAvailableAt,
        commissionPaidAt: item.commissionPaidAt,
      })),
    }
  }

  async savePayoutProfile(userId: string, dto: UpdateReferralPayoutProfileDto) {
    const taxpayerId = dto.taxpayerId.replace(/\D/g, '')
    let pixKey = dto.pixKey.trim()
    if (['cpf', 'cnpj', 'phone'].includes(dto.pixKeyType)) pixKey = pixKey.replace(/\D/g, '')
    if (dto.pixKeyType === 'email') pixKey = pixKey.toLowerCase()
    if (!pixKey) throw new BadRequestException('Chave Pix inválida')

    const current = await this.profiles.findOne({ where: { userId } })
    const profile = current ?? this.profiles.create({ userId })
    Object.assign(profile, {
      userId,
      pixKeyType: dto.pixKeyType,
      pixKey,
      taxpayerId,
      termsVersion: TERMS_VERSION,
      termsText: TERMS_TEXT,
      termsAcceptedAt: new Date(),
    })
    await this.profiles.save(profile)
    return { configured: true, pixKeyType: profile.pixKeyType, pixKeyMasked: this.mask(profile.pixKey), termsVersion: TERMS_VERSION }
  }

  async listAdminCommissions(status?: Referral['status']) {
    const validStatuses: Referral['status'][] = ['captured', 'validating', 'payable', 'paid', 'refunded', 'chargeback', 'ineligible']
    if (status && !validStatuses.includes(status)) throw new BadRequestException('Status de comissão inválido')
    await this.releaseValidatedCommissions()
    const statuses = status ? [status] : ['validating', 'payable', 'paid', 'refunded', 'chargeback'] as Referral['status'][]
    const referrals = await this.refs.find({
      where: { status: In(statuses) }, relations: ['referrer', 'referred'], order: { paymentApprovedAt: 'DESC' },
    })
    const ids = [...new Set(referrals.map(item => item.referrerId))]
    const profiles = ids.length ? await this.profiles.findBy({ userId: In(ids) }) : []
    const profilesByUser = new Map(profiles.map(profile => [profile.userId, profile]))

    return referrals.map(item => {
      const profile = profilesByUser.get(item.referrerId)
      return {
        id: item.id,
        status: item.status,
        referrer: { id: item.referrerId, name: item.referrer?.name, email: item.referrer?.email },
        referred: { id: item.referredId, name: item.referred?.name },
        firstPaymentGross: Number(item.firstPaymentGross ?? 0),
        commissionAmount: Number(item.commissionAmount ?? 0),
        paymentApprovedAt: item.paymentApprovedAt,
        commissionAvailableAt: item.commissionAvailableAt,
        commissionPaidAt: item.commissionPaidAt,
        payoutReference: item.payoutReference,
        payout: profile ? {
          pixKeyType: profile.pixKeyType,
          pixKey: profile.pixKey,
          taxpayerId: profile.taxpayerId,
          termsAcceptedAt: profile.termsAcceptedAt,
        } : null,
      }
    })
  }

  async markCommissionPaid(id: string, payoutReference: string) {
    await this.releaseValidatedCommissions()
    const referral = await this.refs.findOne({ where: { id } })
    if (!referral) throw new NotFoundException('Comissão não encontrada')
    if (referral.status !== 'payable') throw new BadRequestException('Comissão ainda não está liberada para pagamento')
    if (!await this.profiles.findOne({ where: { userId: referral.referrerId } })) {
      throw new BadRequestException('O indicador ainda não cadastrou os dados de pagamento')
    }

    referral.status = 'paid'
    referral.commissionPaidAt = new Date()
    referral.payoutReference = payoutReference.trim()
    referral.rewardGranted = true
    referral.rewardGrantedAt = referral.commissionPaidAt
    await this.refs.save(referral)
    return { id: referral.id, status: referral.status, commissionPaidAt: referral.commissionPaidAt }
  }

  private async releaseValidatedCommissions(referrerId?: string): Promise<void> {
    const due = await this.refs.find({
      where: {
        ...(referrerId ? { referrerId } : {}),
        status: 'validating',
        commissionAvailableAt: LessThanOrEqual(new Date()),
      },
    })
    if (!due.length) return
    for (const item of due) item.status = 'payable'
    await this.refs.save(due)
  }

  private mask(value: string): string {
    if (value.length <= 4) return '••••'
    return `${value.slice(0, 2)}${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`
  }
}
