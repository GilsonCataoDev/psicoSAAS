import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import { User } from '../auth/entities/user.entity'
import { PLAN_PRICES } from '../../common/plans'

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

export interface AsaasBillingSnapshot {
  subscription: {
    status: string
    nextDueDate: string | null
  }
  payments: Array<{
    id: string
    status: string
    value: number
    dueDate: string
    paymentDate: string | null
    confirmedDate: string | null
  }>
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
      this.logger.error('[Asaas] Erro ao criar customer', this.safeAsaasError(err))
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
      this.logger.warn('[Asaas] Falha ao tokenizar cartao', this.safeAsaasError(err))
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
    options?: { valueOverride?: number; descriptionSuffix?: string },
  ): Promise<string> {
    const value = options?.valueOverride ?? PLAN_PRICES[plan]
    if (!value) throw new BadRequestException('Plano invalido')

    try {
      const { data } = await this.api.post('/subscriptions', {
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value,
        nextDueDate,
        cycle: 'MONTHLY',
        description: `UseCognia - Plano ${plan}${options?.descriptionSuffix ? ` (${options.descriptionSuffix})` : ''}`,
        externalReference,
        creditCardToken,
      })

      return data.id
    } catch (err: any) {
      this.logger.error('[Asaas] Erro ao criar subscription', this.safeAsaasError(err))
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

  async updateSubscriptionPlan(
    subscriptionId: string,
    plan: string,
    options?: { updatePendingPayments?: boolean },
  ): Promise<void> {
    const value = PLAN_PRICES[plan]
    if (!value) throw new BadRequestException('Plano invalido')

    try {
      await this.api.put(`/subscriptions/${subscriptionId}`, {
        value,
        description: `UseCognia - Plano ${plan}`,
        updatePendingPayments: options?.updatePendingPayments ?? false,
      })
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao atualizar plano da assinatura', this.safeAsaasError(err))
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel trocar o plano',
      )
    }
  }

  async updateSubscriptionNextDueDate(subscriptionId: string, nextDueDate: string): Promise<void> {
    try {
      await this.api.put(`/subscriptions/${subscriptionId}`, {
        nextDueDate,
      })
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao prorrogar proxima cobranca da assinatura', this.safeAsaasError(err))
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel prorrogar a assinatura',
      )
    }
  }

  async postponeSubscriptionOpenPayments(subscriptionId: string, dueDate: string): Promise<number> {
    try {
      const { data } = await this.api.get(`/subscriptions/${subscriptionId}/payments`, {
        params: { limit: 20, offset: 0 },
      })
      const openPayments = (data?.data ?? []).filter((payment: any) =>
        payment?.id
        && ['PENDING', 'OVERDUE'].includes(String(payment.status ?? ''))
        && payment.dueDate !== dueDate,
      )

      await Promise.all(
        openPayments.map((payment: any) =>
          this.api.put(`/payments/${payment.id}`, { dueDate }),
        ),
      )

      return openPayments.length
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao prorrogar cobrancas pendentes da assinatura', this.safeAsaasError(err))
      throw new BadRequestException(
        err?.response?.data?.errors?.[0]?.description ?? 'Nao foi possivel prorrogar as cobrancas pendentes',
      )
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.api.delete(`/subscriptions/${subscriptionId}`)
      this.logger.log(`[Asaas] Assinatura cancelada: ${subscriptionId}`)
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao cancelar assinatura', this.safeAsaasError(err))
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

  async getSubscriptionBilling(subscriptionId: string): Promise<AsaasBillingSnapshot> {
    try {
      const [{ data: subscription }, { data: paymentPage }] = await Promise.all([
        this.api.get(`/subscriptions/${subscriptionId}`),
        this.api.get(`/subscriptions/${subscriptionId}/payments`, {
          params: { limit: 20, offset: 0 },
        }),
      ])

      return {
        subscription: {
          status: String(subscription?.status ?? ''),
          nextDueDate: subscription?.nextDueDate ?? null,
        },
        payments: (paymentPage?.data ?? []).map((payment: any) => ({
          id: String(payment.id),
          status: String(payment.status ?? ''),
          value: Number(payment.value ?? 0),
          dueDate: String(payment.dueDate ?? ''),
          paymentDate: payment.paymentDate ?? null,
          confirmedDate: payment.confirmedDate ?? null,
        })),
      }
    } catch (err: any) {
      this.logger.warn('[Asaas] Falha ao consultar assinatura', this.safeAsaasError(err))
      throw err
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

  private safeAsaasError(err: any): Record<string, unknown> {
    const data = err?.response?.data
    const firstError = Array.isArray(data?.errors) ? data.errors[0] : undefined
    return {
      status: err?.response?.status ?? null,
      code: firstError?.code ?? data?.code ?? err?.code ?? null,
      message: this.sanitizeMessage(firstError?.description ?? data?.message ?? err?.message),
    }
  }

  private sanitizeMessage(value: unknown): string {
    return String(value ?? 'Erro desconhecido')
      .replace(/\b\d{11,19}\b/g, '[redacted-number]') // Remove CPF/CNPJ/cartão/ids numéricos longos.
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .slice(0, 240)
  }

}
