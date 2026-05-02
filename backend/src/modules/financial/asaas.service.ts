import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import axios, { AxiosInstance } from 'axios'

/**
 * Serviço Asaas para cobrança de PACIENTES via a conta do próprio psicólogo.
 *
 * Diferente do billing/asaas.service.ts (que usa a chave fixa da plataforma),
 * este serviço recebe a apiKey do psicólogo dinamicamente — cada psicólogo tem
 * sua própria conta Asaas e recebe os pagamentos diretamente.
 *
 * Fluxo: findOrCreateCustomer → tokenizeCard → createPayment
 */
@Injectable()
export class PatientAsaasService {
  private readonly logger = new Logger(PatientAsaasService.name)

  // ── Fábrica de cliente Axios por psicólogo ────────────────────────────────

  private buildApi(apiKey: string): AxiosInstance {
    const isSandbox = process.env.NODE_ENV !== 'production'
    return axios.create({
      baseURL: isSandbox
        ? 'https://sandbox.asaas.com/api/v3'
        : 'https://api.asaas.com/v3',
      headers: {
        'access_token':  apiKey,
        'Content-Type':  'application/json',
        'User-Agent':    'PsicoSaaS/1.0',
      },
    })
  }

  // ── 1. Clientes ───────────────────────────────────────────────────────────

  /**
   * Localiza o cliente no Asaas pelo externalReference (patientId).
   * Se não existir, cria um novo.
   *
   * Payload mínimo obrigatório pelo Asaas: name + cpfCnpj
   * Referência: POST https://sandbox.asaas.com/api/v3/customers
   *   { name: "...", cpfCnpj: "..." }
   */
  async findOrCreateCustomer(
    apiKey:    string,
    patientId: string,
    name:      string,
    cpfCnpj:   string,
    email?:    string,
  ): Promise<string> {
    if (!cpfCnpj) {
      throw new BadRequestException(
        'O CPF/CNPJ do paciente é obrigatório para cobrança via Asaas. ' +
        'Cadastre-o na ficha do paciente antes de cobrar.',
      )
    }

    const api = this.buildApi(apiKey)

    try {
      // Tenta localizar pelo externalReference (nosso ID interno)
      const { data: list } = await api.get('/customers', {
        params: { externalReference: patientId, limit: 1 },
      })

      if (list.data?.length) {
        this.logger.log(`[Asaas] Customer existente: ${list.data[0].id} (patientId=${patientId})`)
        return list.data[0].id
      }

      // Cria novo cliente
      const payload: Record<string, any> = {
        name,
        cpfCnpj:           cpfCnpj.replace(/\D/g, ''),
        externalReference: patientId,
        notificationDisabled: false,
      }
      if (email) payload.email = email

      const { data: customer } = await api.post('/customers', payload)
      this.logger.log(`[Asaas] Customer criado: ${customer.id} (patientId=${patientId})`)
      return customer.id
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas'
      this.logger.error('[Asaas] Erro ao criar customer', err?.response?.data)
      throw new BadRequestException(msg)
    }
  }

  // ── 2. Tokenização ────────────────────────────────────────────────────────

  /**
   * Tokeniza o cartão de crédito do paciente.
   *
   * Payload obrigatório (conforme doc Asaas):
   *   customer, creditCard, remoteIp, creditCardHolderInfo
   *
   * O remoteIp é obrigatório para antifraude — extrair do request (X-Forwarded-For em produção).
   */
  async tokenizeCard(
    apiKey:     string,
    customerId: string,
    card: {
      holderName:  string
      number:      string
      expiryMonth: string
      expiryYear:  string
      ccv:         string
    },
    holderInfo: {
      name:              string
      email:             string
      cpfCnpj:           string
      postalCode:        string
      addressNumber:     string
      addressComplement?: string
      phone:             string
      mobilePhone?:      string
    },
    remoteIp: string,
  ): Promise<string> {
    const api = this.buildApi(apiKey)

    const payload = {
      customer: customerId,
      creditCard: {
        holderName:  card.holderName,
        number:      card.number.replace(/\s/g, ''),
        expiryMonth: card.expiryMonth,
        expiryYear:  card.expiryYear,
        ccv:         card.ccv,
      },
      remoteIp,
      creditCardHolderInfo: {
        name:              holderInfo.name,
        email:             holderInfo.email,
        cpfCnpj:           holderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode:        holderInfo.postalCode.replace(/\D/g, ''),
        addressNumber:     holderInfo.addressNumber,
        addressComplement: holderInfo.addressComplement ?? null,
        phone:             holderInfo.phone.replace(/\D/g, ''),
        mobilePhone:       holderInfo.mobilePhone?.replace(/\D/g, '') ?? null,
      },
    }

    try {
      const { data } = await api.post('/creditCard/tokenize', payload)
      const token = data?.creditCardToken
      if (!token) throw new BadRequestException('Tokenização não retornou token')
      this.logger.log(`[Asaas] Cartão tokenizado para customer=${customerId}`)
      return token
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err
      const msg = err?.response?.data?.errors?.[0]?.description ?? 'Cartão inválido ou recusado'
      this.logger.error('[Asaas] Erro na tokenização', err?.response?.data)
      throw new BadRequestException(msg)
    }
  }

  // ── 3. Cobrança via link (UNDEFINED) ────────────────────────────────────

  /**
   * Cria uma cobrança com billingType UNDEFINED — paciente escolhe cartão, PIX ou boleto.
   * Retorna { id, invoiceUrl } para enviar ao paciente.
   */
  async createInvoicePayment(
    apiKey:     string,
    customerId: string,
    params: {
      value:       number
      dueDate:     string
      description: string
      externalRef: string
    },
  ): Promise<{ id: string; invoiceUrl?: string; status: string }> {
    const api = this.buildApi(apiKey)
    try {
      const { data } = await api.post('/payments', {
        customer:          customerId,
        billingType:       'UNDEFINED',
        value:             params.value,
        dueDate:           params.dueDate,
        description:       params.description,
        externalReference: params.externalRef,
      })
      return { id: data.id, invoiceUrl: data.invoiceUrl, status: data.status }
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao gerar link de pagamento'
      this.logger.error('[Asaas] Erro ao criar invoice payment', err?.response?.data)
      throw new BadRequestException(msg)
    }
  }

  // ── 4. Cobrança por token ────────────────────────────────────────────────

  /**
   * Cria uma cobrança de cartão usando o token gerado.
   *
   * Retorna o payment do Asaas com { id, invoiceUrl, status, ... }
   */
  async createCardPayment(
    apiKey:     string,
    customerId: string,
    params: {
      value:        number
      dueDate:      string
      description:  string
      externalRef:  string
      creditCardToken: string
      holderInfo: {
        name:              string
        email:             string
        cpfCnpj:           string
        postalCode:        string
        addressNumber:     string
        addressComplement?: string
        phone:             string
        mobilePhone?:      string
      }
    },
  ): Promise<{ id: string; status: string; invoiceUrl?: string }> {
    const api = this.buildApi(apiKey)

    const payload = {
      customer:         customerId,
      billingType:      'CREDIT_CARD',
      value:            params.value,
      dueDate:          params.dueDate,
      description:      params.description,
      externalReference: params.externalRef,
      creditCardToken:  params.creditCardToken,
      creditCardHolderInfo: {
        name:              params.holderInfo.name,
        email:             params.holderInfo.email,
        cpfCnpj:           params.holderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode:        params.holderInfo.postalCode.replace(/\D/g, ''),
        addressNumber:     params.holderInfo.addressNumber,
        addressComplement: params.holderInfo.addressComplement ?? null,
        phone:             params.holderInfo.phone.replace(/\D/g, ''),
        mobilePhone:       params.holderInfo.mobilePhone?.replace(/\D/g, '') ?? null,
      },
    }

    try {
      const { data } = await api.post('/payments', payload)
      this.logger.log(`[Asaas] Pagamento criado: ${data.id} status=${data.status}`)
      return { id: data.id, status: data.status, invoiceUrl: data.invoiceUrl }
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.[0]?.description ?? 'Erro ao processar pagamento'
      this.logger.error('[Asaas] Erro ao criar pagamento', err?.response?.data)
      throw new BadRequestException(msg)
    }
  }
}
