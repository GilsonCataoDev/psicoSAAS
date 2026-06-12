import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import axios from 'axios'
import { createHmac } from 'crypto'
import { Repository } from 'typeorm'
import { encryptSecret, safeDecryptSecret } from '../../common/crypto/encrypt.util'
import { User } from '../auth/entities/user.entity'
import { Appointment } from '../appointments/entities/appointment.entity'

type GoogleTokenResponse = {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

type GoogleCalendarPrefs = {
  googleCalendarConnected?: boolean
  googleCalendarEmail?: string
  googleCalendarAccessToken?: string
  googleCalendarRefreshToken?: string
  googleCalendarExpiresAt?: string
  googleCalendarLastSyncedAt?: string
  googleCalendarLastSyncError?: string
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name)

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private config: ConfigService,
  ) {}

  getStatus(userId: string) {
    return this.users.findOneBy({ id: userId }).then(user => {
      const prefs = (user?.preferences ?? {}) as GoogleCalendarPrefs
      return {
        available: this.isConfigured(),
        connected: !!prefs.googleCalendarConnected && !!prefs.googleCalendarRefreshToken,
        email: prefs.googleCalendarEmail ?? null,
        lastSyncedAt: prefs.googleCalendarLastSyncedAt ?? null,
        lastSyncError: prefs.googleCalendarLastSyncError ?? null,
      }
    })
  }

  getAuthUrl(userId: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Google Agenda ainda não foi configurado na plataforma.')
    }
    const clientId = this.getRequiredConfig('GOOGLE_CLIENT_ID')
    const redirectUri = this.getRedirectUri()
    const state = this.signState(userId)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<{ redirectUrl: string }> {
    if (!code || !state) throw new BadRequestException('Retorno do Google invalido')
    const userId = this.verifyState(state)
    const tokens = await this.exchangeCode(code)
    const user = await this.users.findOneBy({ id: userId })
    if (!user) throw new BadRequestException('Usuário não encontrado')

    const previousPrefs = (user.preferences ?? {}) as GoogleCalendarPrefs
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : previousPrefs.googleCalendarRefreshToken

    if (!encryptedRefreshToken) {
      throw new BadRequestException('O Google não retornou permissão offline. Tente conectar novamente.')
    }

    const email = await this.fetchGoogleEmail(tokens.access_token).catch(() => previousPrefs.googleCalendarEmail)
    user.preferences = {
      ...previousPrefs,
      googleCalendarConnected: true,
      googleCalendarEmail: email,
      googleCalendarAccessToken: encryptSecret(tokens.access_token),
      googleCalendarRefreshToken: encryptedRefreshToken,
      googleCalendarExpiresAt: this.expiresAt(tokens.expires_in),
    }
    await this.users.save(user)

    return { redirectUrl: `${this.getFrontendUrl()}/#/configuracoes?tab=integrations&googleCalendar=connected` }
  }

  getFailureRedirectUrl(reason = 'error'): string {
    const params = new URLSearchParams({
      tab: 'integrations',
      googleCalendar: 'error',
      reason,
    })
    return `${this.getFrontendUrl()}/#/configuracoes?${params.toString()}`
  }

  async disconnect(userId: string): Promise<{ connected: boolean }> {
    const user = await this.users.findOneBy({ id: userId })
    if (!user) return { connected: false }
    const prefs = { ...(user.preferences ?? {}) }
    delete prefs.googleCalendarConnected
    delete prefs.googleCalendarEmail
    delete prefs.googleCalendarAccessToken
    delete prefs.googleCalendarRefreshToken
    delete prefs.googleCalendarExpiresAt
    delete prefs.googleCalendarLastSyncedAt
    delete prefs.googleCalendarLastSyncError
    user.preferences = prefs
    await this.users.save(user)
    return { connected: false }
  }

  async syncAppointment(appointment: Appointment): Promise<void> {
    const user = await this.users.findOneBy({ id: appointment.psychologistId })
    const prefs = (user?.preferences ?? {}) as GoogleCalendarPrefs
    if (!user || !prefs.googleCalendarConnected || !prefs.googleCalendarRefreshToken) return

    try {
      const accessToken = await this.getValidAccessToken(user, prefs)
      await this.deleteExistingEvent(accessToken, appointment.id)
      await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        this.toGoogleEvent(appointment),
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      user.preferences = {
        ...(user.preferences ?? {}),
        googleCalendarLastSyncedAt: new Date().toISOString(),
        googleCalendarLastSyncError: undefined,
      }
      await this.users.save(user)
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message ?? err?.message ?? String(err)
      this.logger.warn(`Falha ao sincronizar Google Agenda: ${errMsg}`)
      user.preferences = {
        ...(user.preferences ?? {}),
        googleCalendarLastSyncError: errMsg,
      }
      await this.users.save(user).catch(() => {})
    }
  }

  async deleteAppointment(appointment: Appointment): Promise<void> {
    const user = await this.users.findOneBy({ id: appointment.psychologistId })
    const prefs = (user?.preferences ?? {}) as GoogleCalendarPrefs
    if (!user || !prefs.googleCalendarConnected || !prefs.googleCalendarRefreshToken) return

    try {
      const accessToken = await this.getValidAccessToken(user, prefs)
      await this.deleteExistingEvent(accessToken, appointment.id)
    } catch (err: any) {
      this.logger.warn(`Falha ao remover evento do Google Agenda: ${err?.response?.data?.error?.message ?? err?.message ?? err}`)
    }
  }

  private toGoogleEvent(appointment: Appointment) {
    const timeZone = this.config.get<string>('GOOGLE_CALENDAR_TIMEZONE') ?? 'America/Sao_Paulo'
    const { start, end } = this.appointmentDateTimes(appointment.date, appointment.time, appointment.duration || 50)
    const patientName = appointment.patient?.name ?? 'Paciente'
    const modality = appointment.modality === 'online' ? 'Online' : 'Presencial'

    return {
      summary: `Sessao - ${patientName}`,
      description: `Sessao agendada pela UseCognia.\nModalidade: ${modality}`,
      location: modality,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      extendedProperties: {
        private: {
          usecogniaAppointmentId: appointment.id,
        },
      },
    }
  }

  private async deleteExistingEvent(accessToken: string, appointmentId: string): Promise<void> {
    const { data } = await axios.get<{ items?: Array<{ id: string }> }>(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          privateExtendedProperty: `usecogniaAppointmentId=${appointmentId}`,
          singleEvents: true,
          maxResults: 10,
        },
      },
    )

    for (const event of data.items ?? []) {
      await axios.delete(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event.id)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
    }
  }

  private async getValidAccessToken(user: User, prefs: GoogleCalendarPrefs): Promise<string> {
    const currentToken = safeDecryptSecret(prefs.googleCalendarAccessToken) as string | undefined
    const expiresAt = prefs.googleCalendarExpiresAt ? new Date(prefs.googleCalendarExpiresAt).getTime() : 0
    if (currentToken && expiresAt > Date.now() + 60_000) return currentToken

    const refreshToken = safeDecryptSecret(prefs.googleCalendarRefreshToken) as string | undefined
    if (!refreshToken) throw new Error('Refresh token ausente')
    const tokens = await this.refreshAccessToken(refreshToken)
    user.preferences = {
      ...(user.preferences ?? {}),
      googleCalendarAccessToken: encryptSecret(tokens.access_token),
      googleCalendarExpiresAt: this.expiresAt(tokens.expires_in),
    }
    await this.users.save(user)
    return tokens.access_token
  }

  private async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const { data } = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: this.getRequiredConfig('GOOGLE_CLIENT_ID'),
        client_secret: this.getRequiredConfig('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.getRedirectUri(),
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    return data
  }

  private async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const { data } = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.getRequiredConfig('GOOGLE_CLIENT_ID'),
        client_secret: this.getRequiredConfig('GOOGLE_CLIENT_SECRET'),
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    return data
  }

  private async fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
    const { data } = await axios.get<{ email?: string }>('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return data.email
  }

  private signState(userId: string): string {
    const expiresAt = Date.now() + 10 * 60 * 1000
    const payload = `${userId}.${expiresAt}`
    const signature = createHmac('sha256', this.getRequiredConfig('JWT_SECRET')).update(payload).digest('hex')
    return Buffer.from(`${payload}.${signature}`).toString('base64url')
  }

  private verifyState(state: string): string {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    const [userId, expiresAt, signature] = decoded.split('.')
    if (!userId || !expiresAt || !signature) throw new BadRequestException('Estado OAuth invalido')
    if (Number(expiresAt) < Date.now()) throw new BadRequestException('Conexao expirada. Tente novamente.')
    const payload = `${userId}.${expiresAt}`
    const expected = createHmac('sha256', this.getRequiredConfig('JWT_SECRET')).update(payload).digest('hex')
    if (signature !== expected) throw new BadRequestException('Estado OAuth invalido')
    return userId
  }

  private getRedirectUri(): string {
    return this.config.get<string>('GOOGLE_CALENDAR_REDIRECT_URI')
      ?? `${this.config.get<string>('API_URL') ?? 'https://usecognia.com.br/api'}/google-calendar/callback`
  }

  private getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL')
      ?? this.config.get<string>('PUBLIC_APP_URL')
      ?? 'https://usecognia.com.br'
  }

  private isConfigured(): boolean {
    return !!(
      this.config.get<string>('GOOGLE_CLIENT_ID') &&
      this.config.get<string>('GOOGLE_CLIENT_SECRET')
    )
  }

  private getRequiredConfig(key: string): string {
    const value = this.config.get<string>(key)
    if (!value) throw new BadRequestException(`Configuracao ausente: ${key}`)
    return value
  }

  private expiresAt(expiresIn = 3600): string {
    return new Date(Date.now() + Math.max(60, expiresIn - 60) * 1000).toISOString()
  }

  private appointmentDateTimes(date: string, time: string, duration: number): { start: string; end: string } {
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.slice(0, 5).split(':').map(Number)
    const start = new Date(year, month - 1, day, hour, minute)
    const end = new Date(start.getTime() + duration * 60_000)
    return {
      start: this.formatLocalDateTime(start),
      end: this.formatLocalDateTime(end),
    }
  }

  private formatLocalDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0')
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
  }
}
