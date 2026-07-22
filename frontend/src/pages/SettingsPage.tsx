import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { useCreateTemplate, useTemplates } from '@/hooks/useApi'
import {
  Bell, CalendarDays, Lock, User, MessageSquare, Shield, Zap, Wallet, ExternalLink,
} from 'lucide-react'
import { isValidCrpFormat, getCrpRegion, formatCrpInput } from '@/lib/crp'
import { useSubscriptionStore, PLANS } from '@/store/subscription'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { disableWebPush, enableWebPush, getPushStatus, sendTestWebPush } from '@/lib/pushNotifications'
import { isNativeApp } from '@/lib/nativeAuth'
import { userSafeError } from '@/lib/userSafeError'
import { DEFAULT_PREFS, type Prefs, type AuditLog, type WhatsAppLog, type WhatsAppStatus } from '@/components/settings/types'
import { ProfileTab } from '@/components/settings/ProfileTab'
import { NotifyTab } from '@/components/settings/NotifyTab'
import { MessagesTab } from '@/components/settings/MessagesTab'
import { IntegrationsTab } from '@/components/settings/IntegrationsTab'
import { PaymentTab } from '@/components/settings/PaymentTab'
import { PlanTab } from '@/components/settings/PlanTab'
import { PrivacyTab } from '@/components/settings/PrivacyTab'
import { SecurityTab } from '@/components/settings/SecurityTab'
import {
  getAnalyticsConsent,
  identifyUser,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from '@/lib/analytics'

const GOOGLE_CALENDAR_ENABLED = true

const tabs = [
  { id: 'profile',  icon: User,          label: 'Perfil',       group: 'Conta' },
  { id: 'plan',     icon: Zap,           label: 'Plano',        group: 'Conta' },
  { id: 'notify',   icon: Bell,          label: 'Lembretes',    group: 'Rotina clínica' },
  { id: 'messages', icon: MessageSquare, label: 'Mensagens',    group: 'Rotina clínica' },
  ...(GOOGLE_CALENDAR_ENABLED ? [{ id: 'integrations', icon: CalendarDays, label: 'Integrações', group: 'Rotina clínica' }] : []),
  { id: 'payment',  icon: Wallet,        label: 'Pagamentos',   group: 'Rotina clínica' },
  { id: 'privacy',  icon: Lock,          label: 'Privacidade',  group: 'Dados e segurança' },
  { id: 'security', icon: Shield,        label: 'Segurança',    group: 'Dados e segurança' },
]
const TAB_IDS = new Set(tabs.map(tab => tab.id))
const tabGroups = Array.from(new Set(tabs.map(tab => tab.group)))
const EDITABLE_PREF_KEYS = [
  'reminder24h',
  'reminder2h',
  'dailyAgendaDigest',
  'chargeAfterSession',
  'bookingConfirmation',
  'googleCalendarInvitePatients',
  'pixKeyType',
  'pixKey',
  'pixName',
  'autoCharge',
  'lateReminder',
  'includeReceipt',
  'chargeTemplate',
  'whatsapp',
  'confirmationTemplate',
  'reminderTemplate',
  'reminderTemplate24h',
  'reminderTemplate2h',
] as const

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const updateUser = useAuthStore(s => s.updateUser)
  const logout = useAuthStore(s => s.logout)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() => getAnalyticsConsent() === true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(
    searchParams.get('tab') === 'integrations' && !GOOGLE_CALENDAR_ENABLED
      ? 'profile'
      : searchParams.get('tab') ?? 'profile',
  )

  useEffect(() => subscribeAnalyticsConsent(setAnalyticsEnabled), [])

  function updateAnalyticsConsent(enabled: boolean) {
    setAnalyticsConsent(enabled)
    if (enabled && user?.id) identifyUser(user.id)
    toast.success(enabled ? 'Métricas de uso ativadas neste navegador.' : 'Métricas de uso desativadas neste navegador.')
  }

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (!requestedTab) return
    const nextTab = requestedTab === 'integrations' && !GOOGLE_CALENDAR_ENABLED
      ? 'profile'
      : requestedTab
    if (TAB_IDS.has(nextTab) && nextTab !== tab) setTab(nextTab)
  }, [searchParams, tab])

  // ── Perfil ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp]   = useState(user?.crp ?? '')
  const [specialty, setSpecialty] = useState(user?.specialty ?? '')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const crpValid  = isValidCrpFormat(crp)
  const crpRegion = getCrpRegion(crp)

  function handleCrpChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCrp(formatCrpInput(e.target.value))
  }

  async function saveProfile() {
    if (!crpValid) {
      toast.error('CRP inválido. Use uma região entre 01 e 24.')
      return
    }
    setSavingProfile(true)
    try {
      const updated = await api.patch('/auth/profile', { name, crp, specialty, phone }).then(r => r.data)
      updateUser({ name: updated.name, crp: updated.crp, specialty: updated.specialty, phone: updated.phone, avatarUrl: updated.avatarUrl })
      toast.success('Perfil atualizado')
    } catch {
      toast.error('Erro ao salvar perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Envie uma foto em JPG.')
      return
    }
    if (file.size > 1024 * 1024) {
      toast.error('A foto deve ter no maximo 1 MB.')
      return
    }
    const form = new FormData()
    form.append('avatar', file)
    setUploadingAvatar(true)
    try {
      const updated = await api.post('/auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
      updateUser({ avatarUrl: updated.avatarUrl, avatar: updated.avatarUrl })
      toast.success('Foto atualizada')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Não foi possível enviar a foto.'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Preferências ───────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS })
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [whatsappBusy, setWhatsappBusy] = useState(false)
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [whatsappConfigured, setWhatsappConfigured] = useState(true)
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [whatsappQr, setWhatsappQr] = useState('')
  const [pushConfigured, setPushConfigured] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const nativeApp = isNativeApp()
  const [googleCalendarAvailable, setGoogleCalendarAvailable] = useState(true)
  const [confirmDisconnectGoogle, setConfirmDisconnectGoogle] = useState(false)
  const [googleLastSyncedAt, setGoogleLastSyncedAt] = useState<string | null>(null)
  const [googleLastSyncError, setGoogleLastSyncError] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([])
  const { data: messageTemplates = [] } = useTemplates('whatsapp_message')
  const { data: receiptTemplates = [] } = useTemplates('receipt')
  const createTemplate = useCreateTemplate()
  const { subscription, setSubscription, resetSubscription } = useSubscriptionStore()
  const currentPlan    = PLANS.find(p => p.id === subscription.planId)
  const currentPlanId  = String(subscription.planId ?? subscription.plan ?? '')
  const hasProAutomation   = currentPlanId === 'pro'

  useEffect(() => {
    const userPrefs = (user as any)?.preferences ?? {}
    // Migração suave: quem já tinha um único template de lembrete customizado
    // (antes da separação 24h/2h) continua vendo o próprio texto nas duas
    // caixas novas, em vez de ser trocado silenciosamente pelo padrão genérico.
    const legacyReminder = typeof userPrefs.reminderTemplate === 'string' && userPrefs.reminderTemplate.trim()
      ? userPrefs.reminderTemplate
      : undefined
    const migratedPrefs = legacyReminder
      ? {
          reminderTemplate24h: userPrefs.reminderTemplate24h ?? legacyReminder,
          reminderTemplate2h: userPrefs.reminderTemplate2h ?? legacyReminder,
          ...userPrefs,
        }
      : userPrefs
    setPrefs(prev => ({ ...prev, ...migratedPrefs }))
    setPhone(user?.phone ?? '')

    if (!isAuthenticated) { setLoadingPrefs(false); return }
    if (!GOOGLE_CALENDAR_ENABLED) { setLoadingPrefs(false); return }

    api.get('/google-calendar/status')
      .then((res) => {
        const data = res.data
        setGoogleCalendarAvailable(data.available !== false)
        setGoogleLastSyncedAt(data.lastSyncedAt ?? null)
        setGoogleLastSyncError(data.lastSyncError ?? null)
        setPrefs(prev => ({
          ...prev,
          googleCalendarConnected: !!data.connected,
          googleCalendarEmail: data.email ?? '',
          googleCalendarInvitePatients: data.invitePatients === true,
        }))
      })
      .catch((err) => {
        if (err?.response?.status !== 401) setGoogleCalendarAvailable(false)
      })
      .finally(() => setLoadingPrefs(false))
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isAuthenticated) setGoogleCalendarAvailable(false)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || tab !== 'messages' || !hasProAutomation) return
    const loadStatus = () => api.get('/notifications/whatsapp/status')
      .then(({ data }) => {
        setWhatsappStatus(data)
        setWhatsappConfigured(data.configured !== false)
        setWhatsappConnected(!!data.connected)
        if (data.connected) setWhatsappQr('')
      })
      .catch(() => {
        setWhatsappStatus(null)
        setWhatsappConfigured(false)
      })
    loadStatus()
    const timer = window.setInterval(loadStatus, whatsappConnected ? 60_000 : 15_000)
    return () => window.clearInterval(timer)
  }, [hasProAutomation, isAuthenticated, tab, whatsappConnected])

  useEffect(() => {
    if (!isAuthenticated || tab !== 'messages' || !hasProAutomation) {
      setWhatsappLogs([])
      return
    }
    api.get('/notifications/whatsapp/logs')
      .then(({ data }) => setWhatsappLogs(Array.isArray(data) ? data : []))
      .catch(() => setWhatsappLogs([]))
  }, [hasProAutomation, isAuthenticated, tab, whatsappConnected])

  useEffect(() => {
    if (!isAuthenticated || tab !== 'notify') return
    if (nativeApp) { setPushConfigured(false); setPushSubscribed(false); return }
    getPushStatus()
      .then((data) => { setPushConfigured(data.configured); setPushSubscribed(data.subscribed) })
      .catch(() => { setPushConfigured(false); setPushSubscribed(false) })
  }, [isAuthenticated, nativeApp, tab])

  useEffect(() => {
    if (!isAuthenticated || tab !== 'privacy') return
    setLoadingAudit(true)
    api.get('/audit-logs')
      .then(({ data }) => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => setAuditLogs([]))
      .finally(() => setLoadingAudit(false))
  }, [isAuthenticated, tab])

  useEffect(() => {
    if (searchParams.get('googleCalendar') === 'connected') {
      toast.success('Google Agenda conectado com sucesso!')
      setSearchParams({ tab: 'integrations' }, { replace: true })
    } else if (searchParams.get('googleCalendar') === 'error') {
      const reason = searchParams.get('reason')
      toast.error(reason === 'access_denied'
        ? 'Permissão negada. Autorize o acesso ao Google Agenda para continuar.'
        : 'Não foi possível concluir a conexão com o Google Agenda. Tente novamente.')
      setSearchParams({ tab: 'integrations' }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  function selectTab(id: string) {
    setTab(id)
    setSearchParams({ tab: id }, { replace: true })
  }

  function buildPrefsPayload() {
    return EDITABLE_PREF_KEYS.reduce((payload, key) => {
      payload[key] = prefs[key]
      return payload
    }, {} as Record<string, string | boolean>)
  }

  async function savePrefs(section?: string) {
    setSavingPrefs(true)
    try {
      const saved = await api.patch('/auth/preferences', buildPrefsPayload()).then(r => r.data)
      setPrefs(prev => ({ ...prev, ...saved }))
      toast.success(section ? `${section} salvo` : 'Preferencias salvas')
    } catch (err: any) {
      toast.error(userSafeError(err, 'Erro ao salvar. Tente novamente.'))
    } finally {
      setSavingPrefs(false)
    }
  }

  async function togglePref(key: keyof Prefs) {
    const newVal = !prefs[key]
    setPrefs(prev => ({ ...prev, [key]: newVal }))
    try {
      await api.patch('/auth/preferences', { [key]: newVal })
    } catch {
      setPrefs(prev => ({ ...prev, [key]: !newVal }))
      toast.error('Erro ao salvar.')
    }
  }

  async function connectGoogleCalendar() {
    setCalendarBusy(true)
    try {
      const { data } = await api.get('/google-calendar/connect')
      window.location.href = data.url
    } catch (e: any) {
      toast.error(userSafeError(e, 'Não foi possível iniciar a conexão com o Google.'))
      setCalendarBusy(false)
    }
  }

  async function disconnectGoogleCalendar() {
    setConfirmDisconnectGoogle(false)
    setCalendarBusy(true)
    try {
      await api.delete('/google-calendar/disconnect')
      setPrefs(prev => ({ ...prev, googleCalendarConnected: false, googleCalendarEmail: '' }))
      toast.success('Google Agenda desconectado')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Não foi possível desconectar.'))
    } finally {
      setCalendarBusy(false)
    }
  }

  async function connectWhatsApp() {
    setWhatsappBusy(true)
    try {
      const { data } = await api.post('/notifications/whatsapp/connect')
      setWhatsappQr(data.base64)
    } catch (e: any) {
      toast.error(userSafeError(e, 'Nao foi possivel gerar o QR Code.'), { duration: 8000 })
    } finally {
      setWhatsappBusy(false)
    }
  }

  async function testWhatsApp() {
    setWhatsappBusy(true)
    try {
      await api.post('/notifications/whatsapp/test', { phone: prefs.whatsapp })
      const { data } = await api.get('/notifications/whatsapp/logs')
      setWhatsappLogs(Array.isArray(data) ? data : [])
      setWhatsappConnected(true)
      setWhatsappQr('')
      toast.success('Mensagem teste enviada')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Mensagem teste nao enviada.'))
    } finally {
      setWhatsappBusy(false)
    }
  }

  async function resetWhatsApp() {
    setWhatsappBusy(true)
    try {
      const { data } = await api.post('/notifications/whatsapp/reset')
      setWhatsappConnected(false)
      setWhatsappQr(data.base64)
      toast.success('Novo QR Code gerado')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Nao foi possivel reiniciar a conexao.'))
    } finally {
      setWhatsappBusy(false)
    }
  }

  async function activateWebPush() {
    setPushBusy(true)
    try {
      const status = await enableWebPush()
      setPushConfigured(status.configured)
      setPushSubscribed(status.subscribed)
      toast.success('Notificacoes push ativadas')
    } catch (e: any) {
      toast.error(e?.message ?? 'Nao foi possivel ativar notificacoes push.')
    } finally {
      setPushBusy(false)
    }
  }

  async function deactivateWebPush() {
    setPushBusy(true)
    try {
      const status = await disableWebPush()
      setPushConfigured(status.configured)
      setPushSubscribed(status.subscribed)
      toast.success('Notificacoes push desativadas neste navegador')
    } catch (e: any) {
      toast.error(e?.message ?? 'Nao foi possivel desativar notificacoes push.')
    } finally {
      setPushBusy(false)
    }
  }

  async function testWebPush() {
    setPushBusy(true)
    try {
      await sendTestWebPush()
      toast.success('Notificacao teste enviada')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Nao foi possivel enviar o teste.'))
    } finally {
      setPushBusy(false)
    }
  }

  async function saveTemplate(type: 'whatsapp_message' | 'receipt', templateName: string, content: string) {
    try {
      await createTemplate.mutateAsync({ type, name: templateName, content, tags: ['custom'] })
      toast.success('Template salvo')
    } catch (err: any) {
      toast.error(userSafeError(err, 'Nao foi possivel salvar o template.'))
    }
  }

  // ── Segurança ──────────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [savingPw, setSavingPw]   = useState(false)

  async function changePassword() {
    if (newPw !== confirmPw) { toast.error('As senhas não coincidem.'); return }
    if (newPw.length < 8)    { toast.error('A nova senha deve ter ao menos 8 caracteres.'); return }
    setSavingPw(true)
    try {
      await api.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw })
      toast.success('Senha alterada com sucesso')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Erro ao alterar senha.'))
    } finally {
      setSavingPw(false)
    }
  }

  // ── Plano ──────────────────────────────────────────────────────────────────
  const navigate = useNavigate()
  const [cancelingPlan, setCancelingPlan] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [confirmCancelPlan, setConfirmCancelPlan] = useState(false)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const hasCancelablePlan  = subscription.status === 'active' || subscription.status === 'trialing'
  const isTrialing     = subscription.status === 'trialing'
  const daysLeft       = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  async function cancelPlan() {
    setConfirmCancelPlan(false)
    setCancelingPlan(true)
    try {
      const { data } = await api.post('/billing/cancel')
      setSubscription(data)
      toast.success(data.cancelAtPeriodEnd ? 'Plano cancelado. Acesso mantido ate o fim do periodo.' : 'Plano cancelado.')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Erro ao cancelar assinatura.'))
    } finally {
      setCancelingPlan(false)
    }
  }

  async function exportData() {
    setExportingData(true)
    try {
      const response = await api.get('/data-export', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `usecognia-dados-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      toast.success('Exportacao baixada.')
    } catch (e: any) {
      toast.error(userSafeError(e, 'Não foi possível exportar os dados.'))
    } finally {
      setExportingData(false)
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'EXCLUIR') { toast.error('Digite EXCLUIR para confirmar.'); return }
    if (deletePassword.length < 8)  { toast.error('Informe sua senha atual.'); return }
    setConfirmDeleteAccount(true)
  }

  async function confirmDeleteAccountNow() {
    setConfirmDeleteAccount(false)
    setDeletingAccount(true)
    try {
      await api.delete('/auth/account', {
        data: { password: deletePassword, confirmation: deleteConfirm },
      })
      logout()
      resetSubscription()
      toast.success('Conta excluida definitivamente.')
      navigate('/login', { replace: true })
    } catch (e: any) {
      toast.error(userSafeError(e, 'Não foi possível excluir a conta.'))
    } finally {
      setDeletingAccount(false)
    }
  }

  function handleLogout() {
    logout()
    resetSubscription()
    navigate('/login', { replace: true })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-subtitle">Conta, rotina clínica, privacidade e integrações em um só lugar</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-48 lg:shrink-0">
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
            {tabGroups.map(group => (
              <div key={group} className="flex flex-none gap-1 lg:flex-col">
                <p className="hidden px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 lg:block">
                  {group}
                </p>
                {tabs.filter(item => item.group === group).map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => selectTab(id)}
                    className={`flex-none lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl text-sm transition-all whitespace-nowrap ${
                      tab === id ? 'bg-sage-50 text-sage-700 font-medium dark:bg-sage-500/20 dark:text-sage-100' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10'
                    }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="lg:hidden h-px bg-neutral-100 mt-2" />
        </nav>

        <div className="flex-1 space-y-5">
          {['notify', 'messages', 'integrations', 'payment'].includes(tab) && (
            <div className="rounded-2xl border border-sage-100 bg-sage-50 p-4 dark:border-sage-400/30 dark:bg-sage-500/15">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-sage-800 dark:text-sage-100">Agenda pública e horários</p>
                  <p className="mt-1 text-sm text-sage-700 dark:text-sage-200">
                    Configure disponibilidade, bloqueios, duração, pausas e o link que o paciente usa para agendar.
                  </p>
                </div>
                <Link to="/agendamentos?tab=settings" className="btn-secondary inline-flex w-fit items-center gap-2 bg-white text-sm dark:bg-white/10">
                  Abrir agenda pública
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <ProfileTab
              user={user}
              name={name} setName={setName}
              crp={crp} handleCrpChange={handleCrpChange}
              crpValid={crpValid} crpRegion={crpRegion}
              specialty={specialty} setSpecialty={setSpecialty}
              phone={phone} setPhone={setPhone}
              savingProfile={savingProfile} uploadingAvatar={uploadingAvatar}
              saveProfile={saveProfile} uploadAvatar={uploadAvatar}
              handleLogout={handleLogout}
            />
          )}

          {tab === 'notify' && (
            <NotifyTab
              prefs={prefs} togglePref={togglePref}
              hasProAutomation={hasProAutomation} loadingPrefs={loadingPrefs}
              pushConfigured={pushConfigured} pushSubscribed={pushSubscribed} pushBusy={pushBusy}
              nativeApp={nativeApp}
              activateWebPush={activateWebPush} deactivateWebPush={deactivateWebPush} testWebPush={testWebPush}
            />
          )}

          {tab === 'messages' && (
            <MessagesTab
              prefs={prefs} setPref={setPref}
              savingPrefs={savingPrefs} hasProAutomation={hasProAutomation}
              whatsappConnected={whatsappConnected} whatsappConfigured={whatsappConfigured}
              whatsappStatus={whatsappStatus} whatsappQr={whatsappQr}
              whatsappBusy={whatsappBusy} whatsappLogs={whatsappLogs}
              messageTemplates={messageTemplates} createTemplate={createTemplate}
              connectWhatsApp={connectWhatsApp} testWhatsApp={testWhatsApp} resetWhatsApp={resetWhatsApp}
              savePrefs={savePrefs} saveTemplate={saveTemplate}
            />
          )}

          {GOOGLE_CALENDAR_ENABLED && tab === 'integrations' && (
            <IntegrationsTab
              prefs={prefs} calendarBusy={calendarBusy}
              googleCalendarAvailable={googleCalendarAvailable}
              googleLastSyncedAt={googleLastSyncedAt} googleLastSyncError={googleLastSyncError}
              setConfirmDisconnectGoogle={setConfirmDisconnectGoogle}
              connectGoogleCalendar={connectGoogleCalendar}
              togglePref={togglePref}
            />
          )}

          {tab === 'payment' && (
            <PaymentTab
              prefs={prefs} setPref={setPref} togglePref={togglePref}
              savingPrefs={savingPrefs} hasProAutomation={hasProAutomation}
              receiptTemplates={receiptTemplates} createTemplate={createTemplate}
              savePrefs={savePrefs} saveTemplate={saveTemplate}
            />
          )}

          {tab === 'plan' && (
            <PlanTab
              subscription={subscription} currentPlan={currentPlan}
              currentPlanId={currentPlanId} isTrialing={isTrialing} daysLeft={daysLeft}
              hasCancelablePlan={hasCancelablePlan} cancelingPlan={cancelingPlan}
              setConfirmCancelPlan={setConfirmCancelPlan}
              navigate={navigate}
            />
          )}

          {tab === 'privacy' && (
            <PrivacyTab
              analyticsEnabled={analyticsEnabled}
              updateAnalyticsConsent={updateAnalyticsConsent}
              exportingData={exportingData} loadingAudit={loadingAudit} auditLogs={auditLogs}
              deletePassword={deletePassword} setDeletePassword={setDeletePassword}
              deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm}
              deletingAccount={deletingAccount}
              exportData={exportData} deleteAccount={deleteAccount}
            />
          )}

          {tab === 'security' && (
            <SecurityTab
              currentPw={currentPw} setCurrentPw={setCurrentPw}
              newPw={newPw} setNewPw={setNewPw}
              confirmPw={confirmPw} setConfirmPw={setConfirmPw}
              showPw={showPw} setShowPw={setShowPw}
              savingPw={savingPw} changePassword={changePassword}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDisconnectGoogle}
        title="Desconectar Google Agenda"
        description="Novas sessões não serão sincronizadas com o Google Agenda após a desconexão."
        confirmLabel="Desconectar"
        loading={calendarBusy}
        tone="warning"
        onClose={() => setConfirmDisconnectGoogle(false)}
        onConfirm={disconnectGoogleCalendar}
      />
      <ConfirmDialog
        open={confirmCancelPlan}
        title={currentPlanId === 'free' ? 'Sair do plano grátis' : 'Cancelar assinatura'}
        description={currentPlanId === 'free'
          ? 'Seu acesso será bloqueado até escolher outro plano. Seus dados continuam protegidos.'
          : 'Você não será cobrado novamente. Se houver período pago ativo, o acesso continua até o fim dele.'}
        confirmLabel={currentPlanId === 'free' ? 'Sair do plano' : 'Cancelar assinatura'}
        loading={cancelingPlan}
        tone="warning"
        onClose={() => setConfirmCancelPlan(false)}
        onConfirm={cancelPlan}
      />
      <ConfirmDialog
        open={confirmDeleteAccount}
        title="Excluir conta definitivamente"
        description="Todos os pacientes, prontuários, sessões, agenda, financeiro, documentos, preferências e tokens de acesso serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        loading={deletingAccount}
        onClose={() => setConfirmDeleteAccount(false)}
        onConfirm={confirmDeleteAccountNow}
      />
    </div>
  )
}
