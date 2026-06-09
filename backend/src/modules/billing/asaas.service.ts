import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { User } from '../auth/entities/user.entity'

const PLAN_PRICES: Record<string, number> = {
  essencial: 79,
  pro: 149,
}

export interface TokenizeCreditCardInput {
  customerId: string
  remoteIp: string
  creditCard: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
  }
}

@Injectable()
export class AsaasService {
  private readonly api: AxiosInstance
  private readonly logger = new Logger(AsaasService.name)

  constructor(private readonly cfg: ConfigService) {
    const defaultBaseUrl = this.cfg.get<string>('NODE_ENV') === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3'

    this.api = axios.create({
      baseURL: this.cfg.get<string>('ASAAS_BASE_URL') ?? defaultBaseUrl,
      headers: {
        access_token: this.cfg.getOrThrow<string>('ASAAS_API_KEY'),
        'Content-Type': 'application/json',
        'User-Agent': 'UseCognia/1.0',
      },
    })
  }

  async createCustomer(user: User): Promise<string> {
    try {
      const { data: list } = await this.api.get('/customers', {
        params: { externalReference: user.id, limit: 1 },
      })
      if (list.data?.length) return list.data[0].id

      const { data } = await this.api.post('/customers', {
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
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
        customer: input.customerId,
        creditCard: {
          holderName: input.creditCard.holderName,
          number: input.creditCard.number,
          expiryMonth: input.creditCard.expiryMonth,
          expiryYear: input.creditCard.expiryYear,
          ccv: input.creditCard.ccv,
        },
        creditCardHolderInfo: {
          name: input.creditCardHolderInfo.name,
          email: input.creditCardHolderInfo.email,
          cpfCnpj: input.creditCardHolderInfo.cpfCnpj,
          postalCode: input.creditCardHolderInfo.postalCode,
          addressNumber: input.creditCardHolderInfo.addressNumber,
          phone: input.creditCardHolderInfo.phone,
        },
        remoteIp: input.remoteIp,
      })

      const token = data?.creditCardToken ?? data?.token
      if (!token) throw new BadRequestException('Nao foi possivel tokenizar o cartao')

      return token
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      this.logger.warn('[Asaas] Falha ao tokenizar cartao', err?.response?.data ?? err)
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Cartao invalido',
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
    if (!value) throw new BadRequestException('Plano invalido')

    try {
      const { data } = await this.api.post('/subscriptions', {
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value,
        nextDueDate,
        cycle: 'MONTHLY',
        description: `UseCognia - Plano ${plan}`,
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
      this.logger.warn('[Asaas] Falha ao atualizar cartao da assinatura')
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel atualizar o cartao',
      )
    }
  }

  async updateSubscriptionPlan(subscriptionId: string, plan: string): Promise<void> {
    const value = PLAN_PRICES[plan]
    if (!value) throw new BadRequestException('Plano invalido')

    try {
      await this.api.put(`/subscriptions/${subscriptionId}`, {
        value,
        description: `UseCognia - Plano ${plan}`,
        updatePendingPayments: true,
      })
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao atualizar plano da assinatura', err?.response?.data ?? err)
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel trocar o plano',
      )
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.api.delete(`/subscriptions/${subscriptionId}`)
      this.logger.log(`[Asaas] Assinatura cancelada: ${subscriptionId}`)
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao cancelar assinatura', err?.response?.data ?? err)
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel cancelar a assinatura',
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
      this.logger.warn('[Asaas] Falha ao tentar nova cobranca')
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel tentar a cobranca novamente',
      )
    }
  }

  addDays(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  private validateCreditCardInput(input: TokenizeCreditCardInput): void {
    const number = input.creditCard?.number?.replace(/\D/g, '')
    const ccv = input.creditCard?.ccv?.replace(/\D/g, '')
    const cpfCnpj = input.creditCardHolderInfo?.cpfCnpj?.replace(/\D/g, '')
    const postalCode = input.creditCardHolderInfo?.postalCode?.replace(/\D/g, '')
    const phone = input.creditCardHolderInfo?.phone?.replace(/\D/g, '')

    if (!input.customerId?.trim()) throw new BadRequestException('Cliente Asaas e obrigatorio')
    if (!input.remoteIp?.trim()) throw new BadRequestException('IP remoto e obrigatorio')
    if (!input.creditCard?.holderName?.trim()) throw new BadRequestException('Nome do cartao e obrigatorio')
    if (!number || number.length < 13 || number.length > 19) {
      throw new BadRequestException('Numero do cartao invalido')
    }
    if (!/^\d{1,2}$/.test(input.creditCard.expiryMonth) || Number(input.creditCard.expiryMonth) < 1 || Number(input.creditCard.expiryMonth) > 12) {
      throw new BadRequestException('Mes de validade invalido')
    }
    if (!/^\d{4}$/.test(input.creditCard.expiryYear)) {
      throw new BadRequestException('Ano de validade invalido')
    }
    if (!ccv || ccv.length < 3 || ccv.length > 4) {
      throw new BadRequestException('CVV invalido')
    }
    if (!input.creditCardHolderInfo.name?.trim()) {
      throw new BadRequestException('Nome do titular e obrigatorio')
    }
    if (!input.creditCardHolderInfo.email?.trim()) {
      throw new BadRequestException('E-mail do titular e obrigatorio')
    }
    if (!cpfCnpj || !/^\d{11}$|^\d{14}$/.test(cpfCnpj)) {
      throw new BadRequestException('CPF/CNPJ invalido')
    }
    if (!postalCode || postalCode.length !== 8) {
      throw new BadRequestException('CEP invalido')
    }
    if (!input.creditCardHolderInfo.addressNumber?.trim()) {
      throw new BadRequestException('Numero do endereco e obrigatorio')
    }
    if (!phone || phone.length < 10 || phone.length > 11) {
      throw new BadRequestException('Telefone invalido')
    }
  }

}
