/**
 * Product analytics via PostHog.
 *
 * Two tiers:
 * - Anonymous tracking (always on in production): $pageview, aggregate events.
 *   No personal data — person_profiles:'identified_only' means PostHog never
 *   creates a Person record for these events. No consent required under LGPD.
 * - Identity linking (consent required): ties anonymous session to the user's
 *   pseudonymous id. Only activates after explicit "Permitir métricas" click.
 *
 * What is never sent: names, emails, phone numbers, CRP, patient data,
 * clinical notes, financial records, or any free-text field.
 */
const KEY  = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'
const isDev = import.meta.env.DEV

// ID publico do Pixel (nao e segredo — aparece em qualquer inspecao de rede da pagina).
const META_PIXEL_ID = '1606308730880987'
let metaPixelLoaded = false

const CONSENT_KEY   = 'usecognia.analytics-consent'
const CONSENT_EVENT = 'usecognia:analytics-consent'
const ATTRIBUTION_KEY = 'usecognia_marketing_attribution'
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

type PostHogClient  = typeof import('posthog-js')['default']
type AnalyticsValue = string | number | boolean
type AnalyticsProps = Record<string, AnalyticsValue>

const ALLOWED_PROPERTIES = new Set([
  'abordagem', 'ciclo', 'days_inactive', 'landing_path', 'location', 'marketing_landing_path',
  'plan', 'step', 'type', 'use_number',
  ...UTM_FIELDS,
  ...UTM_FIELDS.map(f => `first_${f}`),
])

let client: PostHogClient | null = null
let loadPromise: Promise<PostHogClient | null> | null = null
let identityGeneration = 0
let memoryConsent: boolean | null = null

// ─── consent helpers (identity tier only) ────────────────────────────────────

export function getAnalyticsConsent(): boolean | null {
  if (memoryConsent !== null) return memoryConsent
  try {
    const v = window.localStorage.getItem(CONSENT_KEY)
    if (v === 'granted') return true
    if (v === 'denied')  return false
  } catch { /* storage blocked */ }
  return null
}

export function setAnalyticsConsent(granted: boolean) {
  memoryConsent = granted
  try {
    window.localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied')
    if (!granted) window.localStorage.removeItem(ATTRIBUTION_KEY)
  } catch { /* storage blocked */ }

  identityGeneration += 1
  window.dispatchEvent(new CustomEvent<boolean>(CONSENT_EVENT, { detail: granted }))
}

export function subscribeAnalyticsConsent(listener: (granted: boolean) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<boolean>).detail)
  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}

// ─── sanitization ─────────────────────────────────────────────────────────────

function isSafeString(v: string): boolean {
  return !v.includes('@') && !/(?:\+?\d[\s().-]*){8,}/.test(v)
}

function sanitizeProperties(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined
  const safe = Object.entries(props).reduce<AnalyticsProps>((acc, [k, v]) => {
    if (!ALLOWED_PROPERTIES.has(k)) return acc
    if (typeof v === 'string' && isSafeString(v)) acc[k] = v.slice(0, 80)
    else if (typeof v === 'number' && Number.isFinite(v)) acc[k] = v
    else if (typeof v === 'boolean') acc[k] = v
    return acc
  }, {})
  return Object.keys(safe).length ? safe : undefined
}

function publicPathCategory(): string {
  const seg = window.location.pathname.split('/').filter(Boolean)[0]
  return seg ? `/${seg}` : '/'
}

// UTM attribution — not personal data, stored anonymously
function readStoredAttribution(): AnalyticsProps {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || '{}') as AnalyticsProps
    return sanitizeProperties(parsed) ?? {}
  } catch { return {} }
}

function captureAttribution(): AnalyticsProps {
  const params = new URLSearchParams(window.location.search)
  const current: AnalyticsProps = {}
  for (const field of UTM_FIELDS) {
    const v = params.get(field)?.trim()
    if (v && isSafeString(v)) current[field] = v.slice(0, 80)
  }

  const stored = readStoredAttribution()
  if (!Object.keys(current).length) return stored

  const next: AnalyticsProps = { ...stored, ...current, marketing_landing_path: publicPathCategory() }
  for (const field of UTM_FIELDS) {
    if (current[field] && !next[`first_${field}`]) next[`first_${field}`] = current[field]
  }

  const safe = sanitizeProperties(next) ?? {}
  try { window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(safe)) } catch { /* ok */ }
  return safe
}

// ─── PostHog loader (anonymous tier — no consent gate) ───────────────────────

function loadAnalytics(): Promise<PostHogClient | null> {
  if (!KEY || isDev) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (loadPromise) return loadPromise

  loadPromise = import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host:                HOST,
      capture_pageview:        true,
      capture_pageleave:       true,
      autocapture:             false,
      capture_dead_clicks:     false,
      capture_heatmaps:        false,
      capture_performance:     false,
      disable_session_recording: true,
      disable_surveys:         true,
      disable_product_tours:   true,
      disable_conversations:   true,
      disable_external_dependency_loading: true,
      // Only named analytics events are used. Remote flags/config can request
      // executable extensions that the site's strict CSP intentionally blocks.
      advanced_disable_flags: true,
      mask_all_text:           true,
      mask_all_element_attributes: true,
      persistence:             'localStorage',
      person_profiles:         'identified_only', // no Person created for anon events
      respect_dnt:             true,
    })
    client = posthog
    return client
  }).catch(() => { loadPromise = null; return null })

  return loadPromise
}

// ─── Meta Pixel (consent-gated — envia dados a um terceiro, a Meta) ──────────

/** Injeta o script do Meta Pixel e dispara PageView. Só chamar com consentimento já concedido. */
function loadMetaPixel() {
  if (isDev || metaPixelLoaded || typeof window === 'undefined') return
  metaPixelLoaded = true
  const w = window as any
  ;(function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return
    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
    })
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = v
    const s = b.getElementsByTagName(e)[0]
    s.parentNode?.insertBefore(t, s)
  })(w, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  w.fbq('init', META_PIXEL_ID)
  w.fbq('track', 'PageView')
}

/** Dispara um evento padrão do Meta Pixel (ex.: 'CompleteRegistration'). Exige consentimento. */
export function trackMetaConversion(event: string) {
  if (isDev || getAnalyticsConsent() !== true) return
  loadMetaPixel()
  ;(window as any).fbq?.('track', event)
}

subscribeAnalyticsConsent(granted => { if (granted) loadMetaPixel() })

// ─── public API ───────────────────────────────────────────────────────────────

/** Call once on app boot. Fires $pageview + landing_page_viewed anonymously. */
export function initAnalytics() {
  const props = sanitizeProperties({ ...captureAttribution(), landing_path: publicPathCategory() })
  void loadAnalytics().then(ph => ph?.capture(EVENTS.LANDING_PAGE_VIEWED, props))
  if (getAnalyticsConsent() === true) loadMetaPixel()
}

/**
 * Links the anonymous session to this user's pseudonymous id.
 * Requires consent — call only after getAnalyticsConsent() === true.
 */
export function identifyUser(id: string) {
  if (!id || getAnalyticsConsent() !== true) return
  const generation = identityGeneration
  const digest = window.crypto?.subtle?.digest('SHA-256', new TextEncoder().encode(`usecognia:${id}`))
  if (!digest) return

  void Promise.all([digest, loadAnalytics()]).then(([hash, ph]) => {
    if (generation !== identityGeneration) return
    const pid = `uc_${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')}`
    if (isDev) console.debug('[Analytics] identify', pid)
    else ph?.identify(pid, readStoredAttribution())
  })
}

/** Tracks an anonymous product event with sanitized properties. */
export function track(event: string, props?: AnalyticsProps) {
  const safeProps = sanitizeProperties({ ...readStoredAttribution(), ...props })
  if (isDev) { console.debug('[Analytics]', event, safeProps); return }
  void loadAnalytics().then(ph => ph?.capture(event, safeProps))
}

const LAST_SEEN_KEY = 'usecognia.last_seen_at'
const REACTIVATION_THRESHOLD_DAYS = 3

/** Fires USER_REACTIVATED when the gap since the last recorded visit on this browser crosses the threshold. Call on explicit login. */
export function trackReactivationIfNeeded() {
  try {
    const now = Date.now()
    const stored = window.localStorage.getItem(LAST_SEEN_KEY)
    window.localStorage.setItem(LAST_SEEN_KEY, String(now))
    if (!stored) return
    const daysInactive = Math.floor((now - Number(stored)) / 86400000)
    if (daysInactive >= REACTIVATION_THRESHOLD_DAYS) {
      track(EVENTS.USER_REACTIVATED, { days_inactive: daysInactive })
    }
  } catch { /* storage blocked */ }
}

/** Unlinks identity on logout. Anonymous tracking continues. */
export function resetAnalytics() {
  identityGeneration += 1
  if (isDev) return
  client?.reset()
}

export const EVENTS = {
  LANDING_PAGE_VIEWED:  'landing_page_viewed',
  // Aliases usados pelo funil de aquisição da LandingPage (mesmo evento de pageview + um novo evento de clique em CTA)
  LANDING_VIEWED:       'landing_page_viewed',
  LANDING_CTA_CLICKED:  'landing_cta_clicked',
  REGISTER:             'user_registered',
  LOGIN:                'user_logged_in',
  LOGOUT:               'user_logged_out',
  ONBOARDING_STEP:      'onboarding_step_completed',
  ONBOARDING_DONE:      'onboarding_completed',
  PATIENT_CREATED:      'patient_created',
  PATIENT_VIEWED:       'patient_viewed',
  BOOKING_PAGE_VIEWED:  'booking_page_viewed',
  SLOT_BOOKED:          'slot_booked',
  BOOKING_CONFIRMED:    'booking_confirmed',
  DOCUMENT_GENERATED:   'document_generated',
  DOCUMENT_VERIFIED:    'document_verified',
  PLAN_PAGE_VIEWED:     'plan_page_viewed',
  CHECKOUT_STARTED:     'checkout_started',
  SUBSCRIPTION_ACTIVE:  'subscription_activated',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  USER_REACTIVATED:     'user_reactivated',
  PAYMENT_SENT:         'payment_whatsapp_sent',
  REFERRAL_COPIED:      'referral_code_copied',
  REFERRAL_SHARED:      'referral_shared',
  TOOL_OPENED:          'free_tool_opened',
  TOOL_GENERATED:       'free_tool_generated',
  TOOL_EMAIL_CAPTURE:   'free_tool_email_captured',
  TOOL_CTA_CLICKED:     'free_tool_cta_clicked',
} as const
