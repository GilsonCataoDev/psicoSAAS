/**
 * Product analytics via PostHog.
 *
 * Privacy rules:
 * - no SDK or network request before explicit consent;
 * - no autocapture or session recording;
 * - no patient, clinical, contact or financial data in events;
 * - account identification is pseudonymized before it leaves the browser.
 */
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'
const isDev = import.meta.env.DEV
const CONSENT_KEY = 'usecognia.analytics-consent'
const CONSENT_EVENT = 'usecognia:analytics-consent'
const ATTRIBUTION_KEY = 'usecognia_marketing_attribution'
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

type PostHogClient = typeof import('posthog-js')['default']
type AnalyticsValue = string | number | boolean
type AnalyticsProps = Record<string, AnalyticsValue>

const ALLOWED_PROPERTIES = new Set([
  'abordagem', 'ciclo', 'landing_path', 'location', 'marketing_landing_path',
  'plan', 'step', 'type', 'use_number',
  ...UTM_FIELDS,
  ...UTM_FIELDS.map(field => `first_${field}`),
])

let client: PostHogClient | null = null
let loadPromise: Promise<PostHogClient | null> | null = null
let identityGeneration = 0
let memoryConsent: boolean | null = null

export function getAnalyticsConsent(): boolean | null {
  if (memoryConsent !== null) return memoryConsent
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    if (value === 'granted') return true
    if (value === 'denied') return false
  } catch {
    // Browsers can block storage; analytics remains disabled in that case.
  }
  return null
}

function isSafeString(value: string): boolean {
  const resemblesEmail = value.includes('@')
  const resemblesPhone = /(?:\+?\d[\s().-]*){8,}/.test(value)
  return !resemblesEmail && !resemblesPhone
}

function sanitizeProperties(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined

  const safe = Object.entries(props).reduce<AnalyticsProps>((result, [key, value]) => {
    if (!ALLOWED_PROPERTIES.has(key)) return result
    if (typeof value === 'string' && isSafeString(value)) result[key] = value.slice(0, 80)
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value
    else if (typeof value === 'boolean') result[key] = value
    return result
  }, {})

  return Object.keys(safe).length ? safe : undefined
}

function publicPathCategory(): string {
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0]
  return firstSegment ? `/${firstSegment}` : '/'
}

function readStoredAttribution(): AnalyticsProps {
  if (getAnalyticsConsent() !== true) return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || '{}') as AnalyticsProps
    return sanitizeProperties(parsed) ?? {}
  } catch {
    return {}
  }
}

function captureAttribution(): AnalyticsProps {
  if (getAnalyticsConsent() !== true) return {}

  const params = new URLSearchParams(window.location.search)
  const current: AnalyticsProps = {}
  for (const field of UTM_FIELDS) {
    const value = params.get(field)?.trim()
    if (value && isSafeString(value)) current[field] = value.slice(0, 80)
  }

  const stored = readStoredAttribution()
  if (!Object.keys(current).length) return stored

  const next: AnalyticsProps = {
    ...stored,
    ...current,
    marketing_landing_path: publicPathCategory(),
  }
  for (const field of UTM_FIELDS) {
    const firstField = `first_${field}`
    if (current[field] && !next[firstField]) next[firstField] = current[field]
  }

  const safe = sanitizeProperties(next) ?? {}
  try { window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(safe)) } catch { /* storage unavailable */ }
  return safe
}

function loadAnalytics(): Promise<PostHogClient | null> {
  if (!KEY || isDev || getAnalyticsConsent() !== true) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (loadPromise) return loadPromise

  loadPromise = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      respect_dnt: true,
    })
    client = posthog
    return client
  }).catch(() => {
    loadPromise = null
    return null
  })

  return loadPromise
}

/** Initializes PostHog only when this browser has granted consent. */
export function initAnalytics() {
  if (getAnalyticsConsent() !== true) return
  const props = sanitizeProperties({
    ...captureAttribution(),
    landing_path: publicPathCategory(),
  })
  void loadAnalytics().then(posthog => posthog?.capture(EVENTS.LANDING_PAGE_VIEWED, props))
}

export function setAnalyticsConsent(granted: boolean) {
  memoryConsent = granted
  try {
    window.localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied')
    if (!granted) window.localStorage.removeItem(ATTRIBUTION_KEY)
  } catch {
    // Consent still applies to the current page even when storage is unavailable.
  }

  identityGeneration += 1
  if (granted) {
    client?.opt_in_capturing()
    initAnalytics()
  } else if (client) {
    client.opt_out_capturing()
    client.reset()
  }

  window.dispatchEvent(new CustomEvent<boolean>(CONSENT_EVENT, { detail: granted }))
}

export function subscribeAnalyticsConsent(listener: (granted: boolean) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<boolean>).detail)
  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}

/** Identifies an authenticated account using only a browser-side pseudonymous hash. */
export function identifyUser(id: string) {
  if (!id || getAnalyticsConsent() !== true) return
  const generation = identityGeneration
  const digest = window.crypto?.subtle?.digest('SHA-256', new TextEncoder().encode(`usecognia:${id}`))
  if (!digest) return

  void Promise.all([digest, loadAnalytics()]).then(([hash, posthog]) => {
    if (generation !== identityGeneration) return
    const pseudonymousId = `uc_${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`
    const attribution = readStoredAttribution()
    if (isDev) console.debug('[Analytics] identify', pseudonymousId, attribution)
    else posthog?.identify(pseudonymousId, attribution)
  })
}

/** Tracks a deliberately named product event with sanitized, non-sensitive properties. */
export function track(event: string, props?: AnalyticsProps) {
  if (getAnalyticsConsent() !== true) return
  const safeProps = sanitizeProperties({ ...readStoredAttribution(), ...props })
  if (isDev) { console.debug('[Analytics]', event, safeProps); return }
  void loadAnalytics().then(posthog => posthog?.capture(event, safeProps))
}

/** Clears the analytics identity on logout. */
export function resetAnalytics() {
  identityGeneration += 1
  if (isDev) return
  client?.reset()
}

export const EVENTS = {
  LANDING_PAGE_VIEWED: 'landing_page_viewed',
  REGISTER: 'user_registered',
  LOGIN: 'user_logged_in',
  LOGOUT: 'user_logged_out',
  ONBOARDING_STEP: 'onboarding_step_completed',
  ONBOARDING_DONE: 'onboarding_completed',
  PATIENT_CREATED: 'patient_created',
  PATIENT_VIEWED: 'patient_viewed',
  BOOKING_PAGE_VIEWED: 'booking_page_viewed',
  SLOT_BOOKED: 'slot_booked',
  BOOKING_CONFIRMED: 'booking_confirmed',
  DOCUMENT_GENERATED: 'document_generated',
  DOCUMENT_VERIFIED: 'document_verified',
  PLAN_PAGE_VIEWED: 'plan_page_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_ACTIVE: 'subscription_activated',
  PAYMENT_SENT: 'payment_whatsapp_sent',
  REFERRAL_COPIED: 'referral_code_copied',
  REFERRAL_SHARED: 'referral_shared',
  TOOL_OPENED: 'free_tool_opened',
  TOOL_GENERATED: 'free_tool_generated',
  TOOL_EMAIL_CAPTURE: 'free_tool_email_captured',
  TOOL_CTA_CLICKED: 'free_tool_cta_clicked',
} as const
