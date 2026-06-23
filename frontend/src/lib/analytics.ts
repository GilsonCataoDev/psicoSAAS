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

let client: PostHogClient | null = null
let loadPromise: Promise<PostHogClient | null> | null = null
let identityGeneration = 0

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
  void loadAnalytics()
}

/** Identifica o usuário após login */
export function identifyUser(id: string, props?: Record<string, any>) {
  if (isDev) { console.debug('[Analytics] identify', id, props); return }
  const generation = identityGeneration
  void loadAnalytics().then(posthog => {
    if (generation === identityGeneration) posthog?.identify(id, props)
  })
}

/** Rastreia evento sem dados pessoais */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (isDev) { console.debug('[Analytics]', event, props); return }
  void loadAnalytics().then(posthog => posthog?.capture(event, props))
}

/** Reseta ao fazer logout */
export function resetAnalytics() {
  if (isDev) return
  identityGeneration += 1
  if (client) client.reset()
}

// Eventos padronizados — use estas constantes para consistência
export const EVENTS = {
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
} as const
