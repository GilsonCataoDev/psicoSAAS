/**
 * Analytics via PostHog
 * Em desenvolvimento: apenas loga no console.
 * Em produção: envia para PostHog (grátis até 1M eventos/mês).
 *
 * Setup: https://posthog.com → criar projeto → copiar API key para VITE_POSTHOG_KEY
 */
import posthog from 'posthog-js'

const KEY  = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://app.posthog.com'
const isDev = import.meta.env.DEV

/** Inicializa PostHog — chamar uma vez no main.tsx */
export function initAnalytics() {
  if (!KEY || isDev) return

  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,           // evitar captura acidental de dados clínicos
    session_recording: {
      maskAllInputs: true,        // LGPD: mascara todos os inputs
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing()
    },
  })
}

/** Identifica o usuário após login */
export function identifyUser(id: string, props?: Record<string, any>) {
  if (isDev) { console.debug('[Analytics] identify', id, props); return }
  posthog.identify(id, props)
}

/** Rastreia evento sem dados pessoais */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (isDev) { console.debug('[Analytics]', event, props); return }
  posthog.capture(event, props)
}

/** Reseta ao fazer logout */
export function resetAnalytics() {
  if (isDev) return
  posthog.reset()
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
