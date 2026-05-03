import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'

export interface AsaasCustomer {
  id: string
  name: string
  email: string
}

export interface AsaasSubscription {
  id: string
  status: string
  nextDueDate: string
  billingType: string
  value: number
}

export interface CreateSubscriptionDto {
  customerId: string
  planId: 'essencial' | 'pro' | 'premium'
  billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO'
  yearly: boolean
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo?: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
  remoteIp?: string
}

/**
 * Preços em R$ — mantidos aqui e no frontend/store/subscription.ts em sync
 * Em produção: buscar os IDs de produto do Asaas via env vars
 */
const PLAN_PRICES: Record<string, Record<string, number>> = {
  essencial: { monthly: 79, yearly: 63 },
  pro:       { monthly: 149, yearly: 119 },
  premium:   { monthly: 249, yearly: 199 },
}

@Injectable()
export class AsaasService {
  private readonly api: AxiosInstance
  private readonly logger = new Logger(AsaasService.name)
  private readonly isSandbox: boolean

  constructor(private cfg: ConfigService) {
    this.isSandbox = cfg.get('NODE_ENV') !== 'production'

    const baseURL = this.isSandbox
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'

    this.api = axios.create({
      baseURL,
      headers: {
        'access_token': cfg.getOrThrow('ASAAS_API_KEY'),
        'Content-Type': 'application/json',
        'User-Agent': 'PsicoSaaS/1.0',
      },
    })
  }

  // ─── Clientes ─────────────────────────────────────────────────────────────

  async findOrCreateCustomer(userId: string, name: string, email: string, cpfCnpj: string): Promise<string> {
    try {
      // Tenta encontrar pelo externalReference (nosso userId)
      const { data: list } = await this.api.get('/customers', {
        params: { externalReference: userId, limit: 1 },
      })
      if (list.data?.length) return list.data[0].id

      // Cria novo
      const { data: customer } = await this.api.post('/customers', {
        name,
        email,
        cpfCnpj,
        externalReference: userId,
        notificationDisabled: false,
      })
      this.logger.log(`[Asaas] Customer criado: ${customer.id} para userId=${userId}`)
      return customer.id
    } catch (err: any) {
      this.logger.error('[Asaas] Erro ao criar customer', err?.response?.data)
      throw new BadRequestException(err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas')
    }
  }

  // ─── Assinaturas ─────────────────────────────────────────────────────────

  async createSubscription(dto: CreateSubscriptionDto): Promise<AsaasSubscription> {
    const price = PLAN_PRICES[dto.planId]?.[dto.yearly ? 'yearly' : 'monthly']
    if (!price) throw new BadRequestException('Plano inválido')

    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)

    const payload: Record<string, any> = {
      customer: dto.customerId,
      billingType: dto.billingType,
      value: price,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      cycle: dto.yearly ? 'YEARLY' : 'MONTHLY',
      description: `PsicoSaaS — Plano ${dto.planId.charAt(0).toUpperCase() + dto.planId.slice(1)}`,
      externalReference: dto.planId,
    }

    // Cartão: envia dados completos (Asaas é PCI-DSS Level 1)
    if (dto.billingType === 'CREDIT_CARD' && dto.creditCard) {
      payload.creditCard = dto.creditCard
      payload.creditCardHolderInfo = dto.creditCardHolderInfo
      payload.remoteIp = dto.remoteIp ?? '0.0.0.0'
    }

    try {
      const { data } = await this.api.post('/subscriptions', payload)
      this.logger.log(`[Asaas] Assinatura criada: ${data.id} (${dto.billingType})`)
      return data
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar assinatura'
      this.logger.error('[Asaas] Erro ao criar assinatura', err?.response?.data)
      throw new BadRequestException(msg)
    }
  }

  async cancelSubscription(asaasSubscriptionId: string): Promise<void> {
    try {
      await this.api.delete(`/subscriptions/${asaasSubscriptionId}`)
      this.logger.log(`[Asaas] Assinatura cancelada: ${asaasSubscriptionId}`)
    } catch (err: any) {
      this.logger.error('[Asaas] Erro ao cancelar', err?.response?.data)
      throw new BadRequestException('Erro ao cancelar assinatura')
    }
  }

  async getSubscription(asaasSubscriptionId: string): Promise<AsaasSubscription> {
    const { data } = await this.api.get(`/subscriptions/${asaasSubscriptionId}`)
    return data
  }

  /** Retorna o link de pagamento PIX/Boleto do último charge da assinatura */
  async getPaymentLink(asaasSubscriptionId: string): Promise<{ pixCode?: string; pixQrCode?: string; boletoUrl?: string; boletoLine?: string }> {
    try {
      const { data: charges } = await this.api.get(`/subscriptions/${asaasSubscriptionId}/payments`, {
        params: { limit: 1, offset: 0 },
      })
      const payment = charges.data?.[0]
      if (!payment) return {}

      if (payment.billingType === 'PIX') {
        const { data: pix } = await this.api.get(`/payments/${payment.id}/pixQrCode`)
        return { pixCode: pix.payload, pixQrCode: pix.encodedImage }
      }

      if (payment.billingType === 'BOLETO') {
        return { boletoUrl: payment.bankSlipUrl, boletoLine: payment.nossoNumero }
      }

      return {}
    } catch {
      return {}
    }
  }

  /** Valida o token do webhook Asaas */
  validateWebhookToken(token: string): boolean {
    return token === this.cfg.get('ASAAS_WEBHOOK_TOKEN')
  }
}
