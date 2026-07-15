/**
 * Analytics via PostHog
 * Em desenvolvimento: apenas loga no console.
 * Em produção: envia para PostHog (grátis até 1M eventos/mês).
 *
 * Setup: https://posthog.com → criar projeto → copiar API key para VITE_POSTHOG_KEY
 */
const KEY  = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://app.posthog.com'
const isDev = import.meta.env.DEV
type PostHogClient = typeof import('posthog-js')['default']
type AnalyticsProps = Record<string, string | number | boolean>

const ATTRIBUTION_KEY = 'usecognia_marketing_attribution'
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

let client: PostHogClient | null = null
let loadPromise: Promise<PostHogClient | null> | null = null
let identityGeneration = 0

function readStoredAttribution(): AnalyticsProps {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || '{}') as AnalyticsProps
  } catch {
    return {}
  }
}

function captureAttribution(): AnalyticsProps {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const current: AnalyticsProps = {}
  for (const field of UTM_FIELDS) {
    const value = params.get(field)?.trim()
    if (value) current[field] = value.slice(0, 160)
  }

  const stored = readStoredAttribution()
  if (!Object.keys(current).length) return stored

  const next: AnalyticsProps = {
    ...stored,
    ...current,
    marketing_landing_path: window.location.pathname.slice(0, 300),
  }
  for (const field of UTM_FIELDS) {
    const firstField = `first_${field}`
    if (current[field] && !next[firstField]) next[firstField] = current[field]
  }

  try { window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next)) } catch {}
  return next
}

function loadAnalytics(): Promise<PostHogClient | null> {
  if (!KEY || isDev) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (loadPromise) return loadPromise

  loadPromise = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
    })
    client = posthog
    return client
  }).catch(() => null)

  return loadPromise
}

/** Inicializa PostHog — chamar uma vez no main.tsx */
export function initAnalytics() {
  const attribution = captureAttribution()
  void loadAnalytics().then(posthog => posthog?.capture(EVENTS.LANDING_PAGE_VIEWED, {
    ...attribution,
    landing_path: typeof window === 'undefined' ? '/' : window.location.pathname.slice(0, 300),
  }))
}

/** Identifica o usuário após login */
export function identifyUser(id: string, props?: Record<string, any>) {
  if (isDev) { console.debug('[Analytics] identify', id, props); return }
  const generation = identityGeneration
  void loadAnalytics().then(posthog => {
    if (generation === identityGeneration) posthog?.identify(id, { ...readStoredAttribution(), ...props })
  })
}

/** Rastreia evento sem dados pessoais */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (isDev) { console.debug('[Analytics]', event, props); return }
  void loadAnalytics().then(posthog => posthog?.capture(event, { ...readStoredAttribution(), ...props }))
}

/** Reseta ao fazer logout */
export function resetAnalytics() {
  if (isDev) return
  identityGeneration += 1
  if (client) client.reset()
}

// Eventos padronizados — use estas constantes para consistência
export const EVENTS = {
  // Aquisição
  LANDING_PAGE_VIEWED:'landing_page_viewed',

  // Auth
  REGISTER:           'user_registered',
  LOGIN:              'user_logged_in',
  LOGOUT:             'user_logged_out',
  ONBOARDING_STEP:    'onboarding_step_completed',
  ONBOARDING_DONE:    'onboarding_completed',

  // Pacientes
  PATIENT_CREATED:    'patient_created',
  PATIENT_VIEWED:     'patient_viewed',

  // Agendamento
  BOOKING_PAGE_VIEWED:'booking_page_viewed',
  SLOT_BOOKED:        'slot_booked',
  BOOKING_CONFIRMED:  'booking_confirmed',

  // Documentos
  DOCUMENT_GENERATED: 'document_generated',
  DOCUMENT_VERIFIED:  'document_verified',

  // Planos
  PLAN_PAGE_VIEWED:   'plan_page_viewed',
  CHECKOUT_STARTED:   'checkout_started',
  SUBSCRIPTION_ACTIVE:'subscription_activated',

  // Financeiro
  PAYMENT_SENT:       'payment_whatsapp_sent',

  // Referral
  REFERRAL_COPIED:    'referral_code_copied',
  REFERRAL_SHARED:    'referral_shared',

  // Ferramenta gratuita — Gerador de Evolução Psicológica
  TOOL_OPENED:        'free_tool_opened',
  TOOL_GENERATED:     'free_tool_generated',
  TOOL_EMAIL_CAPTURE: 'free_tool_email_captured',
  TOOL_CTA_CLICKED:   'free_tool_cta_clicked',
} as const
