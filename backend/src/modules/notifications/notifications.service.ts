import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThanOrEqual, Repository } from 'typeorm'
import * as webpush from 'web-push'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { EmailService } from '../email/email.service'
import { User } from '../auth/entities/user.entity'
import { PushSubscriptionEntity } from './entities/push-subscription.entity'
import { NativePushTokenEntity, NativePushPlatform } from './entities/native-push-token.entity'
import { WhatsAppDeliveryLog } from './entities/whatsapp-delivery-log.entity'
import { WhatsAppOutbox } from './entities/whatsapp-outbox.entity'
import { CloudWhatsAppProvider } from './providers/cloud-whatsapp.provider'
import { WhatsAppTemplate } from './providers/whatsapp-provider'
import { SavePushSubscriptionDto } from './dto/push-subscription.dto'
import { RegisterNativePushTokenDto } from './dto/native-push-token.dto'
import { encrypt, safeDecrypt } from '../../common/crypto/encrypt.util'
import { PlanAccessService } from '../../common/plan-access/plan-access.service'
import {
  isMeaningfulAutomatedMessage,
  renderBookingConfirmationMessage,
  renderPaymentTemplate,
  renderReminderTemplate,
} from './notification-templates'

const WA_FETCH_TIMEOUT_MS = 10000

/**
 * fetch() nao tem timeout por padrao — sem isso, uma chamada travada na Evolution
 * API cai indefinidamente ate o socket estourar, deixando o envio num estado
 * ambiguo em vez de um erro claro e rapido.
 */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = WA_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

export type WhatsAppDeliveryResult = {
  sent: boolean
  reason?: 'plan' | 'not_configured' | 'disconnected' | 'api_error' | 'invalid_content'
  error?: string
  nonRetryable?: boolean
  providerMessageId?: string
  providerStatus?: string
  contentLength?: number
}

export type PushDeliveryResult = {
  sent: number
  removed: number
  reason?: 'not_configured' | 'no_subscription' | 'api_error'
  error?: string
}

type WhatsAppStatusInfo = {
  configured: boolean
  connected: boolean
  state: string
  instance: string
  phone?: string | null
  profileName?: string | null
}

type WhatsAppLogMeta = {
  type: string
  patientId?: string | null
  patientName?: string | null
  verifyDelivery?: boolean
  idempotencyKey?: string
  cloudTemplate?: WhatsAppTemplate
}

// Formato documentado da Evolution API v2 (POST /message/sendText/{instance}):
// https://doc.evolution-api.com/v2/api-reference/message-controller/send-text
// `text` no nível raiz — NÃO `textMessage.text` (formato legado de v1 que essa
// instância aceitava com 200 OK mas persistia o texto em branco no Baileys).
type WhatsAppTextPayload = {
  number: string
  text: string
  delay?: number
  linkPreview?: boolean
}

/**
 * NotificationsService
 * Mensagens via WhatsApp (Evolution API) + e-mail (Resend).
 * WhatsApp é o canal primário; e-mail é fallback.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly BASE_URL: string
  private readonly WA_URL: string
  private readonly WA_KEY: string
  private readonly WA_INSTANCE_PREFIX: string
  private readonly waEnabled: boolean
  private readonly pushEnabled: boolean
  private readonly VAPID_PUBLIC_KEY: string
  private readonly VAPID_PRIVATE_KEY: string
  private readonly firebaseEnabled: boolean

  constructor(
    private cfg: ConfigService,
    private email: EmailService,
    private readonly planAccess: PlanAccessService,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(PushSubscriptionEntity) private pushSubscriptions: Repository<PushSubscriptionEntity>,
    @InjectRepository(NativePushTokenEntity) private nativePushTokens: Repository<NativePushTokenEntity>,
    @InjectRepository(WhatsAppDeliveryLog) private whatsAppLogs: Repository<WhatsAppDeliveryLog>,
    @InjectRepository(WhatsAppOutbox) private whatsAppOutbox: Repository<WhatsAppOutbox>,
    private readonly cloudWhatsApp: CloudWhatsAppProvider,
  ) {
    this.BASE_URL     = cfg.get('FRONTEND_URL') ?? 'http://localhost:3000'
    this.WA_URL       = cfg.get('WHATSAPP_API_URL') ?? ''
    this.WA_KEY       = cfg.get('WHATSAPP_API_KEY') ?? ''
    this.WA_INSTANCE_PREFIX = cfg.get('WHATSAPP_INSTANCE_PREFIX') ?? 'usecognia'
    this.waEnabled    = !!(
      this.WA_URL &&
      this.WA_KEY &&
      !this.WA_URL.includes('your-evolution-api') &&
      this.WA_KEY !== 'your-api-key'
    )
    this.VAPID_PUBLIC_KEY = cfg.get('WEB_PUSH_PUBLIC_KEY') ?? ''
    this.VAPID_PRIVATE_KEY = cfg.get('WEB_PUSH_PRIVATE_KEY') ?? ''
    this.pushEnabled = !!(this.VAPID_PUBLIC_KEY && this.VAPID_PRIVATE_KEY)

    if (this.pushEnabled) {
      webpush.setVapidDetails(
        cfg.get('WEB_PUSH_SUBJECT') ?? 'mailto:suporte@usecognia.com.br',
        this.VAPID_PUBLIC_KEY,
        this.VAPID_PRIVATE_KEY,
      )
    }

    // Push nativo (Android/iOS via Firebase Cloud Messaging) — separado do
    // Web Push acima. FIREBASE_SERVICE_ACCOUNT_JSON é o JSON da service account
    // do Firebase (baixado no console) colado como uma unica variavel de ambiente,
    // sem precisar de arquivo google-services.json no servidor.
    const firebaseCredentialsJson = cfg.get('FIREBASE_SERVICE_ACCOUNT_JSON') ?? ''
    let firebaseInitialized = getApps().length > 0
    if (firebaseCredentialsJson && !firebaseInitialized) {
      try {
        initializeApp({ credential: cert(JSON.parse(firebaseCredentialsJson)) })
        firebaseInitialized = true
      } catch (err: any) {
        this.logger.error(`[FCM] Falha ao inicializar Firebase Admin: ${err?.message ?? 'erro desconhecido'}`)
      }
    }
    this.firebaseEnabled = firebaseInitialized
  }

  async canUseWhatsAppAutomation(userId?: string | null): Promise<boolean> {
    if (!userId) return false

    return this.planAccess.hasAccess(userId, 'pro')
  }

  /** Envio manual acionado pelo psicólogo (formulários, links). Liberado a partir do Pro. */
  private async canSendManualWhatsApp(userId?: string | null): Promise<boolean> {
    if (!userId) return false

    return this.planAccess.hasAccess(userId, 'pro')
  }

  // ─── Envio via WhatsApp (Evolution API) ──────────────────────────────────

  async getWhatsAppStatus(ownerId: string): Promise<WhatsAppStatusInfo> {
    const instance = this.getWhatsAppInstance(ownerId)
    if (!this.waEnabled) return { configured: false, connected: false, state: 'not_configured', instance }

    try {
      const res = await fetch(`${this.WA_URL}/instance/connectionState/${instance}`, {
        headers: { apikey: this.WA_KEY },
      })
      if (res.status === 404) return { configured: true, connected: false, state: 'not_created', instance }
      const data = await res.json() as { instance?: { state?: string } }
      const state = data.instance?.state ?? 'unknown'
      const details = state === 'open' ? await this.getWhatsAppInstanceDetails(instance) : {}
      return { configured: true, connected: state === 'open', state, instance, ...details }
    } catch {
      return { configured: true, connected: false, state: 'unavailable', instance }
    }
  }

  async getWhatsAppQrCode(ownerId: string): Promise<{ base64: string; instance: string }> {
    if (!this.waEnabled) throw new BadRequestException('WhatsApp nao configurado no servidor')
    const instance = this.getWhatsAppInstance(ownerId)
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    // Verifica o estado atual antes de recriar
    let currentState = 'unknown'
    try {
      const stateRes = await fetch(`${this.WA_URL}/instance/connectionState/${instance}`, {
        headers: { apikey: this.WA_KEY },
      })
      if (stateRes.ok) {
        const stateData = await stateRes.json() as { instance?: { state?: string } }
        currentState = stateData.instance?.state ?? 'unknown'
      } else if (stateRes.status === 404) {
        currentState = 'not_created'
      }
    } catch { /* ignora — vai recriar */ }

    // Só deleta+recria se já está conectado (troca de conta) ou não existe
    if (currentState === 'open') {
      await this.recreateWhatsAppInstance(instance)
    } else if (currentState === 'not_created') {
      await this.ensureWhatsAppInstance(instance)
      await delay(3000)
    }
    // Se está em estado intermediário (connecting, qrReadSuccess, etc.) apenas tenta buscar o QR

    return this.fetchWhatsAppQrCode(instance)
  }

  private async recreateWhatsAppInstance(instance: string): Promise<void> {
    await this.deleteWhatsAppInstance(instance)
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Cria direto, sem checar connectionState antes: acabamos de apagar a instancia,
    // e a Evolution API pode demorar para propagar isso — checar primeiro corre o risco
    // de ver um estado "ainda existe" desatualizado e pular a criacao, deixando a
    // instancia de fato inexistente na hora de buscar o QR Code (erro 404).
    await this.createWhatsAppInstance(instance)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  private async fetchWhatsAppQrCode(instance: string): Promise<{ base64: string; instance: string }> {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
    const maxAttempts = 4
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch(`${this.WA_URL}/instance/connect/${instance}`, {
        headers: { apikey: this.WA_KEY },
      })
      const raw = await res.text()
      let data: { base64?: string; qrcode?: { base64?: string }; message?: string; code?: string; pairingCode?: string } = {}
      try { data = JSON.parse(raw) } catch { /* not json */ }
      const qrCode = this.extractWhatsAppQrCode(data)
      this.logger.log(`[WA connect] attempt=${attempt} instance=${instance} status=${res.status} qr=${!!qrCode}`)

      if (res.status === 502 && attempt < maxAttempts) {
        this.logger.warn(`[WA connect] 502 — aguardando Baileys (tentativa ${attempt}/${maxAttempts})`)
        await delay(3000 * attempt)
        continue
      }
      if (!res.ok) {
        this.logger.error(`[WA connect] erro status=${res.status}`)
        throw new BadRequestException(data.message ?? `Evolution API retornou ${res.status}`)
      }
      if (!qrCode) {
        this.logger.error('[WA connect] resposta sem QR Code')
        throw new BadRequestException('QR Code nao disponivel — tente novamente em alguns segundos')
      }
      return { base64: qrCode, instance }
    }
    throw new BadRequestException('Nao foi possivel gerar o QR Code. Tente novamente.')
  }

  private extractWhatsAppQrCode(data: { base64?: string; qrcode?: { base64?: string }; code?: string; pairingCode?: string }): string | null {
    return data.base64 ?? data.qrcode?.base64 ?? data.code ?? data.pairingCode ?? null
  }

  private async getWhatsAppInstanceDetails(instance: string): Promise<Pick<WhatsAppStatusInfo, 'phone' | 'profileName'>> {
    try {
      const res = await fetch(`${this.WA_URL}/instance/fetchInstances`, {
        headers: { apikey: this.WA_KEY },
      })
      if (!res.ok) return {}
      const data = await res.json() as Array<Record<string, any>>
      const found = data.find(item => item.name === instance || item.instanceName === instance || item.instance?.instanceName === instance)
      if (!found) return {}

      const rawPhone = found.number ?? found.ownerJid ?? found.instance?.ownerJid ?? null
      return {
        phone: rawPhone ? String(rawPhone).split('@')[0].replace(/\D/g, '') : null,
        profileName: found.profileName ?? found.instance?.profileName ?? null,
      }
    } catch {
      return {}
    }
  }

  async getWhatsAppLogs(ownerId: string): Promise<WhatsAppDeliveryLog[]> {
    const logs = await this.whatsAppLogs.find({
      where: { userId: ownerId },
      order: { createdAt: 'DESC' },
      take: 20,
    })
    return logs.map(log => ({
      ...log,
      patientName: safeDecrypt(log.patientName),
      recipientPhone: safeDecrypt(log.recipientPhone),
      error: safeDecrypt(log.error),
    }))
  }

  async debugWhatsApp(ownerId: string) {
    const instance = this.getWhatsAppInstance(ownerId)
    const results: Record<string, any> = { waEnabled: this.waEnabled, instance }
    if (!this.waEnabled) return results

    const call = async (label: string, url: string, opts?: RequestInit) => {
      try {
        const res = await fetch(url, { headers: { apikey: this.WA_KEY }, ...opts })
        const text = await res.text()
        let json: any
        try { json = JSON.parse(text) } catch { json = text }
        results[label] = { status: res.status, body: json }
      } catch (e: any) {
        results[label] = { error: e.message }
      }
    }

    await call('connectionState', `${this.WA_URL}/instance/connectionState/${instance}`)
    await call('connect', `${this.WA_URL}/instance/connect/${instance}`)
    return results
  }

  private async deleteWhatsAppInstance(instance: string): Promise<void> {
    try {
      await fetch(`${this.WA_URL}/instance/delete/${instance}`, {
        method: 'DELETE',
        headers: { apikey: this.WA_KEY },
      })
      this.logger.log(`[WA] instancia deletada: ${instance}`)
    } catch {
      // OK — pode não existir ainda
    }
  }

  async resetWhatsAppConnection(ownerId: string): Promise<{ base64: string; instance: string }> {
    if (!this.waEnabled) throw new BadRequestException('WhatsApp nao configurado')
    const instance = this.getWhatsAppInstance(ownerId)

    await fetch(`${this.WA_URL}/instance/logout/${instance}`, {
      method: 'DELETE',
      headers: { apikey: this.WA_KEY },
    }).catch(() => undefined)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // O logout apenas desvincula o aparelho no WhatsApp — o estado de sessao Signal
    // (libsignal) guardado pela Evolution API para essa instancia pode continuar
    // corrompido (ex: erros "Bad MAC"). Apaga e recria a instancia do zero para
    // garantir uma sessao criptografica limpa antes de gerar o QR Code novo.
    await this.recreateWhatsAppInstance(instance)
    return this.fetchWhatsAppQrCode(instance)
  }

  async sendTestWhatsApp(ownerId: string, phone?: string): Promise<WhatsAppDeliveryResult> {
    const user = await this.users.findOneBy({ id: ownerId })
    const prefs = (user?.preferences ?? {}) as Record<string, any>
    const target = phone || prefs.whatsapp || user?.phone
    if (!target) throw new BadRequestException('Informe um numero de WhatsApp')

    const result = await this.sendWhatsApp(
      target,
      'Teste da UseCognia: seu WhatsApp esta conectado e pronto para as automacoes.',
      ownerId,
      { type: 'Teste' },
    )
    if (!result.sent) throw new BadRequestException(result.error ?? 'Mensagem nao enviada')
    return result
  }

  // ─── Web Push ─────────────────────────────────────────────────────────────

  async getPushStatus(userId: string): Promise<{
    configured: boolean; subscribed: boolean; publicKey: string | null; subscriptions: number
    nativeConfigured: boolean; nativeSubscribed: boolean; nativeTokens: number
  }> {
    const count = await this.pushSubscriptions.countBy({ userId })
    const nativeCount = await this.nativePushTokens.countBy({ userId })
    return {
      configured: this.pushEnabled,
      subscribed: count > 0,
      publicKey: this.pushEnabled ? this.VAPID_PUBLIC_KEY : null,
      subscriptions: count,
      nativeConfigured: this.firebaseEnabled,
      nativeSubscribed: nativeCount > 0,
      nativeTokens: nativeCount,
    }
  }

  async registerNativePushToken(userId: string, dto: RegisterNativePushTokenDto): Promise<{ registered: boolean }> {
    if (!this.firebaseEnabled) throw new BadRequestException('Push nativo nao configurado no servidor')
    const existing = await this.nativePushTokens.findOneBy({ userId, token: dto.token })
    const entity = existing ?? this.nativePushTokens.create({ userId, token: dto.token })
    entity.platform = dto.platform as NativePushPlatform
    await this.nativePushTokens.save(entity)
    return { registered: true }
  }

  async removeNativePushToken(userId: string, token?: string): Promise<{ registered: boolean }> {
    if (token) {
      await this.nativePushTokens.delete({ userId, token })
    } else {
      await this.nativePushTokens.delete({ userId })
    }
    const count = await this.nativePushTokens.countBy({ userId })
    return { registered: count > 0 }
  }

  async savePushSubscription(userId: string, subscription: SavePushSubscriptionDto, userAgent?: string): Promise<{ subscribed: boolean }> {
    if (!this.pushEnabled) throw new BadRequestException('Notificacoes push nao configuradas')
    const endpoint = subscription?.endpoint
    const p256dh = subscription?.keys?.p256dh
    const auth = subscription?.keys?.auth
    if (!endpoint || !p256dh || !auth) throw new BadRequestException('Inscricao push invalida')

    const existing = await this.pushSubscriptions.findOneBy({ userId, endpoint })
    const entity = existing ?? this.pushSubscriptions.create({ userId, endpoint })
    entity.p256dh = p256dh
    entity.auth = auth
    entity.userAgent = userAgent?.slice(0, 500)
    await this.pushSubscriptions.save(entity)
    return { subscribed: true }
  }

  async removePushSubscription(userId: string, endpoint?: string): Promise<{ subscribed: boolean }> {
    if (endpoint) {
      await this.pushSubscriptions.delete({ userId, endpoint })
    } else {
      await this.pushSubscriptions.delete({ userId })
    }
    const count = await this.pushSubscriptions.countBy({ userId })
    return { subscribed: count > 0 }
  }

  async sendTestPush(userId: string): Promise<PushDeliveryResult> {
    return this.sendPushToUser(userId, {
      title: 'UseCognia',
      body: 'Notificacoes ativadas neste navegador.',
      url: `${this.BASE_URL}/configuracoes?tab=notify`,
      tag: 'usecognia-push-test',
    })
  }

  async sendAppointmentPushReminder(appointment: any, lead: '24h' | '1h'): Promise<PushDeliveryResult> {
    if (!appointment.psychologistId) return { sent: 0, removed: 0, reason: 'no_subscription' }
    const timeLabel = String(appointment.time).slice(0, 5)
    const title = lead === '24h' ? 'Sessao amanha' : 'Sessao em breve'
    const body = lead === '24h'
      ? `Voce tem uma sessao agendada amanha as ${timeLabel}.`
      : `Voce tem uma sessao agendada hoje as ${timeLabel}.`

    return this.sendPushToUser(appointment.psychologistId, {
      title,
      body,
      url: `${this.BASE_URL}/agenda`,
      tag: `appointment-${appointment.id}-${lead}`,
    })
  }

  private async sendPushToUser(userId: string, payload: Record<string, string>): Promise<PushDeliveryResult> {
    const [webResult, nativeResult] = await Promise.all([
      this.sendWebPushToUser(userId, payload),
      this.sendNativePushToUser(userId, payload),
    ])

    if (webResult.reason === 'not_configured' && nativeResult.reason === 'not_configured') {
      return { sent: 0, removed: 0, reason: 'not_configured' }
    }
    const sent = webResult.sent + nativeResult.sent
    const removed = webResult.removed + nativeResult.removed
    if (sent > 0) return { sent, removed }
    if (webResult.reason === 'no_subscription' && nativeResult.reason === 'no_subscription') {
      return { sent, removed, reason: 'no_subscription' }
    }
    return { sent, removed, reason: 'api_error' }
  }

  private async sendWebPushToUser(userId: string, payload: Record<string, string>): Promise<PushDeliveryResult> {
    if (!this.pushEnabled) return { sent: 0, removed: 0, reason: 'not_configured' }
    const subscriptions = await this.pushSubscriptions.findBy({ userId })
    if (subscriptions.length === 0) return { sent: 0, removed: 0, reason: 'no_subscription' }

    let sent = 0
    let removed = 0
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, JSON.stringify(payload))
        sent++
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await this.pushSubscriptions.delete({ id: sub.id })
          removed++
        } else {
          this.logger.error(`[WebPush] Falha user=${userId} status=${err?.statusCode ?? 'unknown'}`)
        }
      }
    }

    return sent > 0 ? { sent, removed } : { sent, removed, reason: 'api_error' }
  }

  /** Push nativo (app Android/iOS) via Firebase Cloud Messaging — mesmo payload {title,body,url,tag} do Web Push. */
  private async sendNativePushToUser(userId: string, payload: Record<string, string>): Promise<PushDeliveryResult> {
    if (!this.firebaseEnabled) return { sent: 0, removed: 0, reason: 'not_configured' }
    const tokens = await this.nativePushTokens.findBy({ userId })
    if (tokens.length === 0) return { sent: 0, removed: 0, reason: 'no_subscription' }

    let sent = 0
    let removed = 0
    for (const tokenRow of tokens) {
      try {
        await getMessaging().send({
          token: tokenRow.token,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url ?? '', tag: payload.tag ?? '' },
        })
        sent++
      } catch (err: any) {
        const code = err?.errorInfo?.code ?? err?.code
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          await this.nativePushTokens.delete({ id: tokenRow.id })
          removed++
        } else {
          this.logger.error(`[FCM] Falha user=${userId} code=${code ?? 'unknown'}`)
        }
      }
    }

    return sent > 0 ? { sent, removed } : { sent, removed, reason: 'api_error' }
  }

  private async sendBookingPush(
    psychologistId: string | undefined,
    booking: any,
    title: string,
  ): Promise<void> {
    if (!psychologistId) return
    try {
      await this.sendPushToUser(psychologistId, {
        title,
        // Nomes e observacoes nao aparecem na tela bloqueada do dispositivo.
        body: `Data: ${booking.date} as ${String(booking.time).slice(0, 5)}.`,
        url: `${this.BASE_URL}/agendamentos`,
        tag: `booking-${booking.id}-${title.toLowerCase().replace(/\s+/g, '-')}`,
      })
    } catch (err: any) {
      // Push e complementar: uma falha nunca deve impedir o agendamento.
      this.logger.warn(`[WebPush] Aviso de agendamento nao enviado bookingId=${booking.id}: ${err?.message ?? 'erro desconhecido'}`)
    }
  }

  private async sendWhatsApp(phone: string, text: string, ownerId: string, meta: WhatsAppLogMeta): Promise<WhatsAppDeliveryResult> {
    let result: WhatsAppDeliveryResult
    if (!await this.canUseWhatsAppAutomation(ownerId)) {
      this.logger.log(`[WhatsApp bloqueado por plano] owner=${ownerId ?? 'unknown'}`)
      result = { sent: false, reason: 'plan', error: 'Automacao disponivel apenas no plano Pro' }
      await this.recordWhatsAppLog(ownerId, phone, meta, result)
      return result
    }

    const useCloud = this.cloudWhatsApp.isEnabledFor(ownerId) && this.cloudWhatsApp.isConfigured() && !!meta.cloudTemplate
    if (!this.waEnabled && !useCloud) {
      this.logger.log(`[WhatsApp DEV] envio simulado owner=${ownerId ?? 'unknown'} chars=${text.length}`)
      result = { sent: false, reason: 'not_configured', error: 'WhatsApp nao configurado' }
      await this.recordWhatsAppLog(ownerId, phone, meta, result)
      return result
    }

    const outbox = meta.idempotencyKey
      ? await this.claimOutbox(ownerId, phone, text, meta)
      : null
    if (outbox?.duplicate) {
      return outbox.completed
        ? { sent: true, providerStatus: 'idempotent_duplicate' }
        : {
            sent: false,
            reason: 'api_error',
            error: 'Mensagem aguardando confirmacao ou nova tentativa',
            providerStatus: 'retry_pending',
          }
    }
    result = useCloud
      ? await this.cloudWhatsApp.send({ ownerId, phone, text, template: meta.cloudTemplate })
      : await this.deliverWhatsApp(phone, text, ownerId, true, meta.verifyDelivery ?? true)
    if (outbox?.entity) await this.finishOutbox(outbox.entity, result)
    await this.recordWhatsAppLog(ownerId, phone, meta, result)
    return result
  }

  private async claimOutbox(ownerId: string, phone: string, text: string, meta: WhatsAppLogMeta): Promise<{ duplicate: boolean; completed?: boolean; entity?: WhatsAppOutbox }> {
    const key = meta.idempotencyKey!
    await this.whatsAppOutbox.createQueryBuilder().insert().values({
      userId: ownerId,
      idempotencyKey: key,
      type: meta.type,
      patientId: meta.patientId ?? null,
      recipientPhone: phone,
      content: text,
    }).orIgnore().execute()
    const entity = await this.whatsAppOutbox.findOneOrFail({ where: { idempotencyKey: key } })
    if (['accepted', 'delivered', 'read'].includes(entity.status)) return { duplicate: true, completed: true }
    if (entity.status === 'sending' && Date.now() - entity.updatedAt.getTime() < 5 * 60_000) {
      return { duplicate: true, completed: false }
    }
    if (entity.status === 'failed' && entity.nextAttemptAt && entity.nextAttemptAt.getTime() > Date.now()) {
      return { duplicate: true, completed: false }
    }
    entity.status = 'sending'
    entity.provider = this.cloudWhatsApp.isEnabledFor(ownerId) && meta.cloudTemplate ? 'cloud_api' : 'evolution'
    entity.attempts += 1
    entity.nextAttemptAt = null
    await this.whatsAppOutbox.save(entity)
    return { duplicate: false, entity }
  }

  private async finishOutbox(entity: WhatsAppOutbox, result: WhatsAppDeliveryResult): Promise<void> {
    entity.status = result.sent ? 'accepted' : 'failed'
    entity.providerMessageId = result.providerMessageId ?? null
    entity.providerStatus = result.providerStatus ?? null
    entity.lastError = result.sent ? null : (result.error ?? result.reason ?? 'Falha no envio').slice(0, 240)
    entity.nextAttemptAt = result.sent || result.nonRetryable ? null : new Date(Date.now() + Math.min(30, 2 ** entity.attempts) * 60_000)
    await this.whatsAppOutbox.save(entity)
  }

  /** Reprocessa falhas da Evolution respeitando backoff e limite de tentativas. */
  async retryDueWhatsAppOutbox(now = new Date(), limit = 20): Promise<number> {
    const staleSending = new Date(now.getTime() - 5 * 60_000)
    const candidates = await this.whatsAppOutbox.find({
      where: [
        { provider: 'evolution', status: 'pending' },
        { provider: 'evolution', status: 'failed', nextAttemptAt: LessThanOrEqual(now) },
        { provider: 'evolution', status: 'sending', updatedAt: LessThanOrEqual(staleSending) },
      ],
      order: { createdAt: 'ASC' },
      take: Math.max(1, Math.min(limit, 100)),
    })

    let processed = 0
    for (const entity of candidates) {
      if (entity.attempts >= 5) {
        entity.status = 'failed'
        entity.nextAttemptAt = null
        entity.lastError = entity.lastError ?? 'Limite de tentativas atingido'
        await this.whatsAppOutbox.save(entity)
        continue
      }

      entity.status = 'sending'
      entity.attempts += 1
      entity.nextAttemptAt = null
      await this.whatsAppOutbox.save(entity)

      if (/sem conteudo|vazia/i.test(entity.lastError ?? '')) {
        await this.restartWhatsAppConnection(this.getWhatsAppInstance(entity.userId))
      }

      const result = await this.deliverWhatsApp(
        entity.recipientPhone,
        entity.content,
        entity.userId,
        true,
        true,
        false,
      )
      await this.finishOutbox(entity, result)
      processed += 1
    }
    return processed
  }

  // ─── Agendamentos internos ─────────────────────────────────────────────────

  async sendDirectWhatsApp(phone: string, text: string, ownerId: string, meta: WhatsAppLogMeta = { type: 'manual' }): Promise<WhatsAppDeliveryResult> {
    let result: WhatsAppDeliveryResult
    if (!await this.canSendManualWhatsApp(ownerId)) {
      result = { sent: false, reason: 'plan', error: 'Envio via WhatsApp disponível a partir do plano Pro' }
      await this.recordWhatsAppLog(ownerId, phone, meta, result)
      return result
    }

    if (!this.waEnabled) {
      this.logger.log(`[WhatsApp DEV] envio manual simulado owner=${ownerId ?? 'unknown'} chars=${text.length}`)
      result = { sent: false, reason: 'not_configured', error: 'WhatsApp não configurado no servidor' }
      await this.recordWhatsAppLog(ownerId, phone, meta, result)
      return result
    }

    result = await this.deliverWhatsApp(phone, text, ownerId)
    await this.recordWhatsAppLog(ownerId, phone, meta, result)
    return result
  }

  private async deliverWhatsApp(
    phone: string,
    text: string,
    ownerId: string,
    allowClosedConnectionRecovery = true,
    allowDeliveryVerification = true,
    allowEmptyDeliveryRetry = true,
  ): Promise<WhatsAppDeliveryResult> {
    const normalizedText = typeof text === 'string' ? text.trim() : ''
    if (!normalizedText) {
      return {
        sent: false,
        reason: 'invalid_content',
        error: 'Mensagem sem conteúdo; envio bloqueado',
        nonRetryable: true,
        contentLength: 0,
      }
    }

    const normalized = phone.replace(/\D/g, '')
    const withDdi = normalized.startsWith('55') ? normalized : `55${normalized}`

    try {
      const instance = this.getWhatsAppInstance(ownerId)
      const { res, body } = await this.postWhatsAppText(instance, withDdi, normalizedText)

      if (!res.ok) {
        const nonRetryable = res.status >= 400 && res.status < 500 && res.status !== 429
        const error = this.formatWhatsAppError(res.status, body)
        this.logger.error(`[WhatsApp] Erro ${res.status} instance=${instance} nonRetryable=${nonRetryable}`)
        if (allowClosedConnectionRecovery && this.isClosedConnectionError(body)) {
          const recovered = await this.restartWhatsAppConnection(instance)
          if (recovered) {
            this.logger.warn(`[WhatsApp] Instancia reiniciada; repetindo envio uma vez instance=${instance}`)
            return this.deliverWhatsApp(phone, text, ownerId, false)
          }
        }
        return { sent: false, reason: 'api_error', error, nonRetryable, contentLength: normalizedText.length }
      }

      const provider = this.parseWhatsAppProviderResponse(body)
      if (!provider.messageId || !provider.text.trim()) {
        this.logger.error(`[WhatsApp] Resposta incompleta instance=${instance} status=${provider.status ?? 'unknown'} contentLength=${provider.text.trim().length}`)
        return {
          sent: false,
          reason: 'api_error',
          error: 'WhatsApp aceitou a requisição, mas retornou a mensagem sem conteúdo ou sem identificador',
          nonRetryable: true,
          providerMessageId: provider.messageId,
          providerStatus: provider.status,
          contentLength: provider.text.trim().length,
        }
      }

      if (provider.text.trim() !== normalizedText) {
        this.logger.error(`[WhatsApp] Conteudo divergente instance=${instance} expectedLength=${normalizedText.length} actualLength=${provider.text.trim().length}`)
        return {
          sent: false,
          reason: 'api_error',
          error: 'WhatsApp retornou um conteúdo diferente do texto enviado',
          nonRetryable: true,
          providerMessageId: provider.messageId,
          providerStatus: provider.status,
          contentLength: provider.text.trim().length,
        }
      }

      const acceptedResult: WhatsAppDeliveryResult = {
        sent: true,
        providerMessageId: provider.messageId,
        providerStatus: provider.status ?? 'accepted',
        contentLength: provider.text.trim().length,
      }

      // A resposta síncrona só confirma que a Evolution API recebeu o pedido — o envio real ao
      // WhatsApp acontece de forma assíncrona via Baileys e pode, em raras ocasiões, persistir
      // vazio mesmo com o texto correto no request (a psicóloga vê a mensagem certa na própria
      // conversa — é o eco local do que ELA enviou — mas o paciente pode receber em branco).
      // Confere o que foi de fato persistido antes de dar a entrega como confirmada.
      if (allowDeliveryVerification) {
        const verification = await this.verifyWhatsAppDelivery(instance, provider.messageId, normalizedText)

        if (verification === 'ok') {
          return acceptedResult
        }

        // A resposta sincrona da Evolution nao comprova entrega. Se a consulta
        // posterior continuar inconclusiva, a outbox agenda uma nova tentativa.
        if (verification === 'unknown') {
          this.logger.warn(`[WhatsApp] Verificacao inconclusiva instance=${instance} messageId=${provider.messageId}; envio mantido pendente`)
          return {
            sent: false,
            reason: 'api_error',
            error: 'Evolution aceitou a mensagem, mas a entrega nao foi confirmada',
            providerMessageId: provider.messageId,
            providerStatus: 'unverified',
            contentLength: provider.text.trim().length,
          }
        }

        if (verification === 'skipped') {
          return { ...acceptedResult, providerStatus: 'unverified' }
        }

        if (verification === 'empty' && allowEmptyDeliveryRetry) {
          this.logger.warn(`[WhatsApp] Entrega vazia confirmada instance=${instance} messageId=${provider.messageId}; reenvio imediato bloqueado`)
          return {
            sent: false,
            reason: 'api_error',
            error: 'WhatsApp persistiu mensagem sem conteudo; uma nova tentativa sera feita com intervalo',
            providerMessageId: provider.messageId,
            providerStatus: provider.status,
            contentLength: 0,
          }
        }

        if (verification === 'empty') {
          this.logger.error(`[WhatsApp] Reenvio tambem persistiu vazio instance=${instance} messageId=${provider.messageId}`)
          return {
            sent: false,
            reason: 'api_error',
            error: 'WhatsApp persistiu a mensagem sem conteúdo mesmo após uma nova tentativa',
            nonRetryable: true,
            providerMessageId: provider.messageId,
            providerStatus: provider.status,
            contentLength: 0,
          }
        }

        if (verification === 'mismatch') {
          this.logger.error(`[WhatsApp] Conteudo persistido divergente instance=${instance} messageId=${provider.messageId}; reenvio bloqueado`)
          return {
            sent: false,
            reason: 'api_error',
            error: 'WhatsApp persistiu conteudo diferente; reenvio automatico bloqueado para evitar duplicidade',
            nonRetryable: true,
            providerMessageId: provider.messageId,
            providerStatus: provider.status,
            contentLength: provider.text.trim().length,
          }
        }

      }

      return acceptedResult
    } catch {
      return {
        sent: false,
        reason: 'disconnected',
        error: 'WhatsApp desconectado ou indisponivel',
        contentLength: normalizedText.length,
      }
    }
  }

  /**
   * Confere, alguns segundos após o envio, se a Evolution API realmente persistiu o texto
   * enviado — a resposta síncrona do sendText só reflete o que ela recebeu, não o que o
   * Baileys efetivamente gravou/entregou.
   */
  // Atraso de cada tentativa de verificação — cresce a cada nova tentativa pra
  // cobrir indexação lenta do Baileys sob carga (tentativas em ~3s/6s/10s corridos).
  private static readonly WA_VERIFY_DELAYS_MS = [3000, 3000, 4000]

  private async verifyWhatsAppDelivery(
    instance: string,
    messageId: string,
    expectedText: string,
    attempt: 1 | 2 | 3 = 1,
  ): Promise<'ok' | 'empty' | 'mismatch' | 'unknown' | 'skipped'> {
    // Evita atraso real e chamadas de rede extras durante os testes (mocks cobrem só o fluxo de sendText).
    if (process.env.JEST_WORKER_ID !== undefined) return 'skipped'

    const maxAttempts = NotificationsService.WA_VERIFY_DELAYS_MS.length as 1 | 2 | 3
    await new Promise(resolve => setTimeout(resolve, NotificationsService.WA_VERIFY_DELAYS_MS[attempt - 1]))
    try {
      const res = await fetchWithTimeout(`${this.WA_URL}/chat/findMessages/${instance}`, {
        method: 'POST',
        headers: { apikey: this.WA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ where: { key: { id: messageId } } }),
      })
      if (!res.ok) {
        if (attempt < maxAttempts) {
          return this.verifyWhatsAppDelivery(instance, messageId, expectedText, (attempt + 1) as 1 | 2 | 3)
        }
        return 'unknown'
      }

      const data = await res.json().catch(() => null) as any
      const records: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.messages?.records)
          ? data.messages.records
          : Array.isArray(data?.messages)
            ? data.messages
            : []
      const match = records.find(record => record?.key?.id === messageId)
      if (!match) {
        // A mensagem pode ainda não ter sido indexada pelo Baileys sob carga —
        // tentativas adicionais (com atraso crescente) evitam marcar como "unknown"
        // só por lentidão pontual, sem reenviar (que criaria duplicidade).
        if (attempt < maxAttempts) return this.verifyWhatsAppDelivery(instance, messageId, expectedText, (attempt + 1) as 1 | 2 | 3)
        return 'unknown'
      }

      const persistedText = [
        match?.message?.conversation,
        match?.message?.extendedTextMessage?.text,
      ].find(value => typeof value === 'string')
      if (typeof persistedText !== 'string') return 'unknown'

      if (!persistedText.trim()) return 'empty'
      return persistedText.trim() === expectedText.trim() ? 'ok' : 'mismatch'
    } catch {
      if (attempt < maxAttempts) {
        return this.verifyWhatsAppDelivery(instance, messageId, expectedText, (attempt + 1) as 1 | 2 | 3)
      }
      return 'unknown'
    }
  }

  private parseWhatsAppProviderResponse(body: string): { messageId?: string; status?: string; text: string } {
    try {
      const payload = JSON.parse(body) as Record<string, any>
      const messageId = typeof payload?.key?.id === 'string' ? payload.key.id : undefined
      const status = typeof payload?.status === 'string' ? payload.status : undefined
      const text = [
        payload?.message?.conversation,
        payload?.message?.extendedTextMessage?.text,
        payload?.message?.imageMessage?.caption,
        payload?.message?.videoMessage?.caption,
      ].find(value => typeof value === 'string')
      return { messageId, status, text: typeof text === 'string' ? text : '' }
    } catch {
      return { text: '' }
    }
  }

  private async postWhatsAppText(instance: string, number: string, text: string): Promise<{ res: Response; body: string }> {
    const endpoint = `${this.WA_URL}/message/sendText/${instance}`
    const payload = this.buildWhatsAppTextPayload(number, text)

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { apikey: this.WA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.text().catch(() => '')

    return { res: response, body }
  }

  private buildWhatsAppTextPayload(number: string, text: string): WhatsAppTextPayload {
    return { number, text, delay: 1000, linkPreview: false }
  }

  private isClosedConnectionError(body: string): boolean {
    return /connection\s+closed|not\s+connected|instance\s+(?:is\s+)?(?:disconnected|closed)|stream\s+(?:errored|closed)|socket\s+closed/i.test(body)
  }

  private async restartWhatsAppConnection(instance: string): Promise<boolean> {
    try {
      const restart = await fetchWithTimeout(`${this.WA_URL}/instance/restart/${instance}`, {
        method: 'PUT',
        headers: { apikey: this.WA_KEY },
      })
      if (!restart.ok) return false

      const restartBody = await restart.json().catch(() => null) as Record<string, any> | null
      if (restartBody?.instance?.state === 'open') return true

      const delays = [1000, 1500, 2000, 2500, 3000, 4000]
      for (const delay of delays) {
        await new Promise(resolve => setTimeout(resolve, delay))
        const stateResponse = await fetchWithTimeout(`${this.WA_URL}/instance/connectionState/${instance}`, {
          headers: { apikey: this.WA_KEY },
        })
        if (!stateResponse.ok) continue
        const stateBody = await stateResponse.json().catch(() => null) as Record<string, any> | null
        if (stateBody?.instance?.state === 'open') return true
      }
      return false
    } catch {
      return false
    }
  }

  private async recordWhatsAppLog(ownerId: string, phone: string, meta: WhatsAppLogMeta, result: WhatsAppDeliveryResult): Promise<void> {
    try {
      const normalized = phone.replace(/\D/g, '')
      await this.whatsAppLogs.save(this.whatsAppLogs.create({
        userId: ownerId,
        type: meta.type,
        status: result.sent ? 'sent' : 'failed',
        patientId: meta.patientId ?? null,
        patientName: meta.patientName ? encrypt(meta.patientName.slice(0, 160)) : null,
        recipientPhone: normalized
          ? encrypt(normalized.startsWith('55') ? normalized : `55${normalized}`)
          : null,
        error: result.sent
          ? null
          : encrypt((result.error ?? result.reason ?? 'Falha no envio').slice(0, 240)),
        providerMessageId: result.providerMessageId?.slice(0, 160) ?? null,
        providerStatus: result.providerStatus?.slice(0, 80) ?? null,
        contentLength: Number.isInteger(result.contentLength) ? result.contentLength : null,
      }))
    } catch (err) {
      this.logger.warn(`[WhatsApp log] Falha ao registrar envio: ${err instanceof Error ? err.message : err}`)
    }
  }

  private formatWhatsAppError(status: number, body: string): string {
    let message: string
    try {
      const parsed = JSON.parse(body) as Record<string, any>
      const raw = parsed.message ?? parsed.error ?? parsed.response?.message
      message = Array.isArray(raw) ? raw.join(', ') : String(raw ?? '')
    } catch {
      message = body
    }

    const clean = message.replace(/\s+/g, ' ').trim()
    if (status >= 400 && status < 500 && status !== 429) {
      return clean
        ? `WhatsApp recusou envio (${status}): ${clean}`.slice(0, 240)
        : `WhatsApp recusou envio (${status}). Verifique número e conexão.`
    }
    return clean
      ? `WhatsApp respondeu ${status}: ${clean}`.slice(0, 240)
      : `WhatsApp respondeu ${status}`
  }

  private getWhatsAppInstance(ownerId: string): string {
    if (!ownerId) throw new BadRequestException('Identificador do psicologo ausente')
    const safeId = ownerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase()
    return `${this.WA_INSTANCE_PREFIX}-${safeId}`
  }

  private async ensureWhatsAppInstance(instance: string): Promise<void> {
    const status = await fetch(`${this.WA_URL}/instance/connectionState/${instance}`, {
      headers: { apikey: this.WA_KEY },
    }).catch(() => null)
    if (status && status.status !== 404) return

    await this.createWhatsAppInstance(instance)
  }

  private async createWhatsAppInstance(instance: string): Promise<void> {
    const res = await fetch(`${this.WA_URL}/instance/create`, {
      method: 'POST',
      headers: {
        apikey: this.WA_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: instance,
        qrcode: false,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })
    if (res.ok || res.status === 409 || res.status === 403) return

    this.logger.error(`[WA create instance] erro status=${res.status}`)
    throw new BadRequestException(`Nao foi possivel criar a instancia WhatsApp: erro ${res.status}`)
  }

  async scheduleReminder(appointment: any): Promise<void> {
    if (!appointment.patient?.phone) return
    const { patient, date, time } = appointment
    const first = patient.name.split(' ')[0]

    // Formata a data para pt-BR (ex: "terça-feira, 29 de abril")
    const dateLabel = (() => {
      try {
        const [y, m, d] = String(date).split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long',
        })
      } catch { return String(date) }
    })()

    const msg = `Ola, ${first}!\n\nLembrando que temos nosso encontro em *${dateLabel}* as *${String(time).slice(0, 5)}*.\n\nAte la!`
    await this.sendWhatsApp(patient.phone, msg, appointment.psychologistId, {
      type: 'Lembrete',
      patientId: patient.id,
      patientName: patient.name,
    })
  }

  async sendAppointmentReminder(appointment: any, lead: '24h' | '1h'): Promise<WhatsAppDeliveryResult> {
    const { patient, date, time } = appointment
    const prefs = (appointment.psychologist?.preferences ?? {}) as Record<string, any>
    const pushResult = await this.sendAppointmentPushReminder(appointment, lead)

    if (!patient?.phone) {
      const result = pushResult.sent > 0
        ? { sent: true }
        : { sent: false, error: 'Paciente sem WhatsApp e push nao enviado' }
      if (!result.sent) {
        await this.recordWhatsAppLog(appointment.psychologistId, '', {
          type: lead === '24h' ? 'Lembrete 24h' : 'Lembrete 1h',
          patientId: patient?.id,
          patientName: patient?.name,
        }, result)
      }
      return result
    }

    const first = patient.name.split(' ')[0]
    const timeLabel = String(time).slice(0, 5)

    const dateLabel = (() => {
      try {
        const [y, m, d] = String(date).split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long',
        })
      } catch { return String(date) }
    })()

    const defaultMsg = lead === '24h'
      ? `Ola, ${first}!\n\nLembrando que temos nosso encontro em *${dateLabel}* as *${timeLabel}*.\n\nAte la!`
      : `Ola, ${first}!\n\nPassando para lembrar que nossa sessao acontece em *${dateLabel}* as *${timeLabel}*.\n\nAte daqui a pouco!`
    // Template específico do lead (24h/1h) tem prioridade; a chave reminderTemplate2h
    // é mantida apenas para não invalidar preferências já salvas.
    // único legado (contas que customizaram antes da separação) e por fim para
    // o texto padrão embutido no código.
    const leadTemplate = lead === '24h' ? prefs.reminderTemplate24h : prefs.reminderTemplate2h
    const template = typeof leadTemplate === 'string' && leadTemplate.trim()
      ? leadTemplate
      : (typeof prefs.reminderTemplate === 'string' && prefs.reminderTemplate.trim() ? prefs.reminderTemplate : null)
    const renderedTemplate = template
      ? renderReminderTemplate(template, patient.name, dateLabel, timeLabel, lead)
      : ''
    const msg = isMeaningfulAutomatedMessage(renderedTemplate)
      ? renderedTemplate
      : defaultMsg

    const whatsAppResult = await this.sendWhatsApp(patient.phone, msg, appointment.psychologistId, {
      type: lead === '24h' ? 'Lembrete 24h' : 'Lembrete 1h',
      patientId: patient.id,
      patientName: patient.name,
      idempotencyKey: `appointment-reminder:${appointment.id}:${lead}:v1`,
      cloudTemplate: this.cloudTemplate(
        lead === '24h' ? 'WHATSAPP_CLOUD_REMINDER_24H_TEMPLATE' : 'WHATSAPP_CLOUD_REMINDER_1H_TEMPLATE',
        [first, dateLabel, timeLabel],
      ),
    })
    if (whatsAppResult.sent || pushResult.sent > 0) return { sent: true }
    return whatsAppResult
  }

  async sendDailyAgendaDigest(ownerId: string, phone: string, text: string): Promise<WhatsAppDeliveryResult> {
    return this.sendWhatsApp(phone, text, ownerId, {
      type: 'Resumo diario da agenda',
    })
  }

  async sendPaymentRequest(
    patient: any,
    amount: number,
    pixKey?: string,
    template?: string,
    includeReceipt?: boolean,
  ): Promise<WhatsAppDeliveryResult> {
    if (!patient?.phone) {
      const result = { sent: false, error: 'Paciente sem WhatsApp' }
      if (patient?.psychologistId) {
        await this.recordWhatsAppLog(patient.psychologistId, '', {
          type: 'Cobranca',
          patientId: patient.id,
          patientName: patient.name,
        }, result)
      }
      return result
    }
    const firstName = patient.name.split(' ')[0]
    const receiptLine = includeReceipt ? 'Depois do pagamento, por favor me envie o comprovante por aqui.\n\n' : ''
    const defaultMessage =
      `Ola, ${firstName}!\n\n` +
      `Segue o valor da nossa sessao: *R$ ${amount.toFixed(2)}*.\n\n` +
      (pixKey ? `PIX: \`${pixKey}\`\n\n` : '') +
      receiptLine +
      `Obrigado(a).`
    const msg = template
      ? renderPaymentTemplate(template, patient.name, amount, pixKey, includeReceipt)
      : defaultMessage
    return this.sendWhatsApp(patient.phone, msg, patient.psychologistId, {
      type: 'Cobranca',
      patientId: patient.id,
      patientName: patient.name,
    })
  }

  async sendLatePaymentReminder(
    patient: any,
    amount: number,
    pixKey?: string,
    template?: string,
  ): Promise<WhatsAppDeliveryResult> {
    if (!patient?.phone) {
      const result = { sent: false, error: 'Paciente sem WhatsApp' }
      if (patient?.psychologistId) {
        await this.recordWhatsAppLog(patient.psychologistId, '', {
          type: 'Lembrete de pagamento',
          patientId: patient.id,
          patientName: patient.name,
        }, result)
      }
      return result
    }
    const firstName = patient.name.split(' ')[0]
    const defaultMessage =
      `Ola, ${firstName}!\n\n` +
      `Passando para lembrar do pagamento pendente da sessao (*R$ ${amount.toFixed(2)}*).\n\n` +
      (pixKey ? `Chave PIX: \`${pixKey}\`\n\n` : '') +
      `Qualquer duvida, e so me chamar.`
    const msg = template
      ? renderPaymentTemplate(template, patient.name, amount, pixKey, false)
      : defaultMessage
    return this.sendWhatsApp(patient.phone, msg, patient.psychologistId, {
      type: 'Lembrete de pagamento',
      patientId: patient.id,
      patientName: patient.name,
    })
  }

  // ─── Booking público ───────────────────────────────────────────────────────

  async sendBookingRequest(booking: any, page: any): Promise<void> {
    const confirmToken = booking.publicConfirmationToken
      ?? safeDecrypt(booking.confirmationTokenEncrypted)
      ?? booking.confirmationToken
    const confirmUrl = `${this.BASE_URL}/agendar/confirmar/${confirmToken}`
    const cancelUrl  = this.getCancellationUrl(booking)

    // Para o paciente — WhatsApp
    if (booking.patientPhone) {
      const patientMsg =
        `Ola, ${booking.patientName.split(' ')[0]}!\n\n` +
        `Recebemos sua solicitacao para *${booking.date}* as *${String(booking.time).slice(0, 5)}*.\n\n` +
        `Assim que confirmarmos, voce recebera uma mensagem.\n` +
        `Precisando cancelar: ${this.withWhatsAppUtm(cancelUrl)}\n\nAte breve.`
      await this.sendWhatsApp(booking.patientPhone, patientMsg, page.psychologistId, {
        type: 'Solicitacao de agenda',
        patientName: booking.patientName,
      })
    }

    // Para o psicólogo — WhatsApp + e-mail
    if (page.psychologist?.phone) {
      const psychMsg =
        `*Nova solicitacao de sessao*\n\n` +
        `Pessoa: ${booking.patientName}\n` +
        `Data: ${booking.date} as ${String(booking.time).slice(0, 5)}\n` +
        `\nConfirmar: ${this.withWhatsAppUtm(confirmUrl)}`
      await this.sendWhatsApp(page.psychologist.phone, psychMsg, page.psychologistId, {
        type: 'Aviso ao psicologo',
        patientName: booking.patientName,
      })
    }

    // E-mail de backup para o psicólogo — best-effort: falha de e-mail não pode
    // derrubar a criação do agendamento (mesmo padrão do WhatsApp acima).
    if (page.psychologist?.email) {
      await this.email.sendBookingRequest(
        booking.patientName,
        page.psychologist.email,
        booking.date,
        booking.time,
        confirmUrl,
      ).catch(err => this.logger.warn(`[Booking] E-mail de solicitacao nao enviado bookingId=${booking.id}: ${err?.message ?? 'erro desconhecido'}`))
    }

    await this.sendBookingPush(page.psychologistId, booking, 'Nova solicitacao de agendamento')

    this.logger.log(`[Booking] Nova solicitacao bookingId=${booking.id} date=${booking.date} time=${booking.time}`)
  }

  async sendBookingConfirmation(booking: any, page?: any): Promise<WhatsAppDeliveryResult | undefined> {
    const prefs = (page?.psychologist?.preferences ?? {}) as Record<string, any>
    if (prefs.bookingConfirmation === false) {
      this.logger.log(`[Booking] Confirmacao desativada por preferencia bookingId=${booking.id}`)
      return undefined
    }

    const cancelUrl = this.getCancellationUrl(booking)
    const first = booking.patientName.split(' ')[0]
    const customMessage = renderBookingConfirmationMessage(booking, page)

    // WhatsApp para o paciente
    let whatsAppResult: WhatsAppDeliveryResult | undefined
    if (booking.patientPhone) {
      const cancelUrlWhatsApp = this.withWhatsAppUtm(cancelUrl)
      const msg = customMessage
        ? `${customMessage}\n\nPrecisando cancelar: ${cancelUrlWhatsApp}`
        : `Ola, ${first}!\n\n` +
          `Sua sessao foi confirmada para *${booking.date}* as *${String(booking.time).slice(0, 5)}*.\n\n` +
          `Precisando cancelar: ${cancelUrlWhatsApp}\n\nNos vemos la.`
      whatsAppResult = await this.sendWhatsApp(booking.patientPhone, msg, booking.psychologistId, {
        type: 'Confirmacao de agenda',
        patientName: booking.patientName,
        idempotencyKey: `booking-confirmation:${booking.id}:v1`,
        cloudTemplate: this.cloudTemplate('WHATSAPP_CLOUD_BOOKING_CONFIRMATION_TEMPLATE', [first, booking.date, String(booking.time).slice(0, 5), cancelUrl]),
      })
    }

    // E-mail para o paciente — best-effort: falha de e-mail não pode
    // derrubar a confirmação do agendamento (mesmo padrão do WhatsApp acima).
    if (booking.patientEmail) {
      await this.email.sendBookingConfirmation(
        booking.patientName,
        booking.patientEmail,
        booking.date,
        booking.time,
        cancelUrl,
        customMessage,
      ).catch(err => this.logger.warn(`[Booking] E-mail de confirmacao nao enviado bookingId=${booking.id}: ${err?.message ?? 'erro desconhecido'}`))
    }

    if (whatsAppResult?.sent === false) {
      this.logger.warn(`[Booking] Confirmacao por WhatsApp falhou bookingId=${booking.id} reason=${whatsAppResult.reason ?? 'unknown'}`)
    } else {
      this.logger.log(`[Booking] Confirmacao enviada bookingId=${booking.id}`)
    }
    return whatsAppResult
  }

  async sendBookingCreatedToPsychologist(booking: any, page: any): Promise<void> {
    const psychologist = page.psychologist
    const prefs = (psychologist?.preferences ?? {}) as Record<string, any>
    const phone = prefs.whatsapp || psychologist?.phone

    const modality = booking.modality === 'presencial'
      ? 'Presencial'
      : booking.modality === 'online'
        ? 'Online'
        : 'Nao informada'
    const patientPhone = booking.patientPhone ? `\nWhatsApp: ${booking.patientPhone}` : ''
    const notes = booking.patientNotes ? `\nObservacoes: ${String(booking.patientNotes).slice(0, 240)}` : ''
    const msg =
      `*Novo agendamento confirmado*\n\n` +
      `Paciente: ${booking.patientName}\n` +
      `Data: ${booking.date} as ${String(booking.time).slice(0, 5)}\n` +
      `Modalidade: ${modality}` +
      patientPhone +
      notes

    if (phone) {
      await this.sendWhatsApp(phone, msg, page.psychologistId, {
        type: 'Aviso ao psicologo',
        patientName: booking.patientName,
      })
    }
    await this.sendBookingPush(page.psychologistId, booking, 'Novo agendamento confirmado')
  }

  async sendBookingCancellation(booking: any): Promise<void> {
    const psychologist = booking.psychologist
    const prefs = (psychologist?.preferences ?? {}) as Record<string, any>
    const phone = prefs.whatsapp || psychologist?.phone
    const reason = safeDecrypt(booking.cancellationReason)?.trim()
    const reasonLine = reason ? `\nMotivo: ${reason}` : ''
    const msg =
      `Sessao cancelada pelo paciente\n\n` +
      `Pessoa: ${booking.patientName}\n` +
      `Data: ${booking.date} as ${String(booking.time).slice(0, 5)}` +
      reasonLine

    if (phone) {
      await this.sendWhatsApp(phone, msg, booking.psychologistId, {
        type: 'Cancelamento',
        patientName: booking.patientName,
      })
    }
    // best-effort: falha de e-mail não pode derrubar o cancelamento do agendamento.
    if (psychologist?.email) {
      await this.email.sendBookingCancellation(
        booking.patientName,
        psychologist.email,
        booking.date,
        String(booking.time).slice(0, 5),
        reason,
      ).catch(err => this.logger.warn(`[Booking] E-mail de cancelamento nao enviado bookingId=${booking.id}: ${err?.message ?? 'erro desconhecido'}`))
    }
    await this.sendBookingPush(booking.psychologistId, booking, 'Agendamento cancelado')

    this.logger.log(`[Booking] Cancelamento enviado ao psicologo bookingId=${booking.id}`)
  }

  async sendPaymentReminder(booking: any, pixKey?: string): Promise<void> {
    if (!booking.patientPhone) return
    const firstName = booking.patientName.split(' ')[0]
    const msg =
      `Ola, ${firstName}!\n\n` +
      `Passando para lembrar sobre o pagamento da nossa sessao ` +
      `(*R$ ${Number(booking.amount).toFixed(2)}*).\n\n` +
      (pixKey ? `Chave PIX: \`${pixKey}\`\n\n` : '') +
      `Qualquer duvida, e so falar.`
    await this.sendWhatsApp(booking.patientPhone, msg, booking.psychologistId, {
      type: 'Lembrete de pagamento',
      patientName: booking.patientName,
    })
  }

  /** Marca o link com utm_source=whatsapp só na mensagem enviada por WhatsApp — a versão de e-mail continua sem UTM. */
  private cloudTemplate(envKey: string, bodyParameters: string[]): WhatsAppTemplate | undefined {
    const name = this.cfg.get<string>(envKey)?.trim()
    if (!name) return undefined
    return {
      name,
      language: this.cfg.get<string>('WHATSAPP_CLOUD_TEMPLATE_LANGUAGE') ?? 'pt_BR',
      bodyParameters,
    }
  }

  private withWhatsAppUtm(url: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}utm_source=whatsapp&utm_medium=message`
  }

  private getCancellationUrl(booking: any): string {
    const cancellationToken = booking.publicCancellationCode
      ?? safeDecrypt(booking.cancellationCodeEncrypted)
      ?? booking.cancellationCode
    const confirmationToken = booking.publicConfirmationToken
      ?? safeDecrypt(booking.confirmationTokenEncrypted)
      ?? booking.confirmationToken
    return cancellationToken
      ? `${this.BASE_URL}/c/${cancellationToken}`
      : `${this.BASE_URL}/agendar/cancelar/${confirmationToken}`
  }

}
