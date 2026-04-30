import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { User } from '../auth/entities/user.entity'

const PLAN_PRICES: Record<string, number> = {
  basic: 79,
  premium: 249,
  essencial: 79,
  pro: 149,
}

export interface TokenizeCreditCardInput {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

@Injectable()
export class AsaasService {
  private readonly api: AxiosInstance
  private readonly logger = new Logger(AsaasService.name)

  constructor(private readonly cfg: ConfigService) {
    this.api = axios.create({
      baseURL: this.cfg.get<string>('ASAAS_BASE_URL') ?? 'https://sandbox.asaas.com/api/v3',
      headers: {
        access_token: this.cfg.getOrThrow<string>('ASAAS_API_KEY'),
        'Content-Type': 'application/json',
        'User-Agent': 'PsicoSaaS/1.0',
      },
    })
  }

  async createCustomer(user: User): Promise<string> {
    try {
      const { data } = await this.api.post('/customers', {
        name: user.name,
        email: user.email,
        externalReference: user.id,
      })

      return data.id
    } catch (err: any) {
      this.logger.error('[Asaas] Erro ao criar customer', err?.response?.data ?? err)
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas',
      )
    }
  }

  async tokenizeCreditCard(input: TokenizeCreditCardInput): Promise<string> {
    this.validateCreditCardInput(input)

    try {
      const { data } = await this.api.post('/creditCard/tokenize', {
        creditCard: {
          holderName: input.holderName,
          number: input.number,
          expiryMonth: input.expiryMonth,
          expiryYear: input.expiryYear,
          ccv: input.ccv,
        },
      })

      const token = data?.creditCardToken ?? data?.token
      if (!token) throw new BadRequestException('Não foi possível tokenizar o cartão')

      return token
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      this.logger.warn('[Asaas] Falha ao tokenizar cartão')
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Cartão inválido',
      )
    }
  }

  async createSubscription(
    customerId: string,
    plan: string,
    externalReference: string,
    creditCardToken: string,
    nextDueDate = this.addDays(7),
  ): Promise<string> {
    const value = PLAN_PRICES[plan]
    if (!value) throw new BadRequestException('Plano inválido')

    try {
      const { data } = await this.api.post('/subscriptions', {
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value,
        nextDueDate,
        cycle: 'MONTHLY',
        description: `PsicoSaaS - Plano ${plan}`,
        externalReference,
        creditCardToken,
      })

      return data.id
    } catch (err: any) {
      this.logger.error('[Asaas] Erro ao criar subscription', err?.response?.data ?? err)
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar assinatura no Asaas',
      )
    }
  }

  async updateSubscriptionCreditCard(subscriptionId: string, creditCardToken: string): Promise<void> {
    try {
      await this.api.put(`/subscriptions/${subscriptionId}/creditCard`, {
        creditCardToken,
        updatePendingPayments: true,
      })
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao atualizar cartão da assinatura')
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Não foi possível atualizar o cartão',
      )
    }
  }

  async retryLatestSubscriptionPayment(subscriptionId: string, creditCardToken: string): Promise<void> {
    try {
      const { data } = await this.api.get(`/subscriptions/${subscriptionId}/payments`, {
        params: { limit: 1, offset: 0 },
      })
      const payment = data?.data?.[0]
      if (!payment?.id) return
      if (!['OVERDUE', 'PENDING'].includes(payment.status)) return

      await this.api.post(`/payments/${payment.id}/payWithCreditCard`, {
        creditCardToken,
      })
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao tentar nova cobrança')
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Não foi possível tentar a cobrança novamente',
      )
    }
  }

  addDays(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  private validateCreditCardInput(input: TokenizeCreditCardInput): void {
    const number = input.number?.replace(/\D/g, '')
    const ccv = input.ccv?.replace(/\D/g, '')

    if (!input.holderName?.trim()) throw new BadRequestException('Nome do cartão é obrigatório')
    if (!number || number.length < 13 || number.length > 19) {
      throw new BadRequestException('Número do cartão inválido')
    }
    if (!/^\d{1,2}$/.test(input.expiryMonth) || Number(input.expiryMonth) < 1 || Number(input.expiryMonth) > 12) {
      throw new BadRequestException('Mês de validade inválido')
    }
    if (!/^\d{4}$/.test(input.expiryYear)) {
      throw new BadRequestException('Ano de validade inválido')
    }
    if (!ccv || ccv.length < 3 || ccv.length > 4) {
      throw new BadRequestException('CVV inválido')
    }
  }
}
