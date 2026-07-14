const fs = require('fs')
const path = require('path')

const configuredApiBaseUrl = process.env.BOOKING_API_URL || process.env.VITE_API_URL || ''
const API_BASE_URL = /^https?:\/\//i.test(configuredApiBaseUrl)
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : 'https://psicosaas-production-2d6c.up.railway.app/api'

const SITE_URL = 'https://usecognia.com.br'
const DEFAULT_TITLE = 'Agende seu atendimento'
const DEFAULT_DESCRIPTION =
  'Consulte os horários disponíveis e escolha o melhor momento para seu atendimento.'
const DEFAULT_IMAGE = `${SITE_URL}/booking-og-image.png`

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function absoluteUrl(value) {
  if (!value) return DEFAULT_IMAGE
  if (/^data:/i.test(value)) return DEFAULT_IMAGE
  if (/^https?:\/\//i.test(value)) return value
  return `${SITE_URL}${String(value).startsWith('/') ? '' : '/'}${value}`
}

function setMeta(html, selector, content) {
  const safeContent = escapeHtml(content)
  const propertyRegex = new RegExp(
    `<meta\\s+property="${selector}"\\s+content="[^"]*"\\s*/?>`,
    'i',
  )
  const nameRegex = new RegExp(
    `<meta\\s+name="${selector}"\\s+content="[^"]*"\\s*/?>`,
    'i',
  )

  if (propertyRegex.test(html)) {
    return html.replace(propertyRegex, `<meta property="${selector}" content="${safeContent}" />`)
  }
  if (nameRegex.test(html)) {
    return html.replace(nameRegex, `<meta name="${selector}" content="${safeContent}" />`)
  }
  const attr = selector.startsWith('twitter:') ? 'name' : 'property'
  return html.replace('</head>', `    <meta ${attr}="${selector}" content="${safeContent}" />\n  </head>`)
}

function getIndexHtml() {
  const candidates = [
    path.join(process.cwd(), 'frontend', 'dist', 'index.html'),
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'frontend', 'index.html'),
  ]

  for (const file of candidates) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8')
  }

  return '<!doctype html><html><head><title>UseCognia</title></head><body><div id="root"></div></body></html>'
}

async function getBookingPage(slug) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)
  let response
  try {
    response = await fetch(`${API_BASE_URL}/public/booking/${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) return null
  return response.json()
}

module.exports = async function handler(req, res) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug
  const cleanSlug = String(slug ?? '').trim()

  let page = null
  if (cleanSlug) {
    try {
      page = await getBookingPage(cleanSlug)
    } catch {
      page = null
    }
  }

  const pageFound = Boolean(page?.psychologistName?.trim())
  const name = page?.psychologistName?.trim()
  const title = name ? `Agendamento com ${name}` : DEFAULT_TITLE
  const specialty = page?.specialty?.trim()
  const modalities = [
    page?.allowOnline ? 'online' : null,
    page?.allowPresencial ? 'presencial' : null,
  ].filter(Boolean)
  const modalityText = modalities.length > 0 ? `Atendimento ${modalities.join(' e ')}. ` : ''
  const description = name
    ? specialty
      ? `${specialty}. ${modalityText}Consulte os horários disponíveis e escolha o melhor para você.`
      : `${modalityText}Consulte os horários disponíveis de ${name} e escolha o melhor para você.`
    : DEFAULT_DESCRIPTION
  const url = cleanSlug ? `${SITE_URL}/agendar/${encodeURIComponent(cleanSlug)}` : SITE_URL
  const image = absoluteUrl(page?.avatarUrl)

  let html = getIndexHtml()
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)

  const metas = {
    'description': description,
    'og:url': url,
    'og:title': title,
    'og:description': description,
    'og:image': image,
    'og:image:alt': name ? `Agendamento com ${name}` : 'Agendamento de atendimento psicológico',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image,
  }

  for (const [selector, content] of Object.entries(metas)) {
    html = setMeta(html, selector, content)
  }
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  )

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', pageFound
    ? 'public, s-maxage=300, stale-while-revalidate=86400'
    : 'public, s-maxage=30, stale-while-revalidate=300')
  res.setHeader('X-UseCognia-Booking-OG', pageFound ? 'custom' : 'fallback')
  res.status(200).send(html)
}
