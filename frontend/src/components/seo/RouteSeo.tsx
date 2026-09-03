import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import seoRoutes from '../../../seo-routes.json'

const SITE_URL = 'https://usecognia.com.br'
const PRIVATE_TITLE = 'Área segura | UseCognia'
const PRIVATE_DESCRIPTION = 'Área segura da plataforma UseCognia.'

type SeoRoute = (typeof seoRoutes)[number]

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
}

function setCanonical(path: string | null) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!path) {
    existing?.remove()
    return
  }

  const canonical = existing ?? document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = `${SITE_URL}${path === '/' ? '/' : path}`
  if (!existing) document.head.appendChild(canonical)
}

function applyIndexableMetadata(config: SeoRoute) {
  const canonicalUrl = `${SITE_URL}${config.canonicalPath}`
  document.title = config.title
  setCanonical(config.canonicalPath)
  setMeta('meta[name="description"]', { name: 'description', content: config.description })
  setMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' })
  setMeta('meta[property="og:title"]', { property: 'og:title', content: config.title })
  setMeta('meta[property="og:description"]', { property: 'og:description', content: config.description })
  setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: config.title })
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: config.description })
}

function applyPrivateMetadata() {
  document.title = PRIVATE_TITLE
  setCanonical(null)
  setMeta('meta[name="description"]', { name: 'description', content: PRIVATE_DESCRIPTION })
  setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' })
  document.head.querySelector('meta[property="og:url"]')?.remove()
}

export default function RouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const config = seoRoutes.find(route => route.paths.includes(pathname))
    if (config) applyIndexableMetadata(config)
    else applyPrivateMetadata()
  }, [pathname])

  return null
}
