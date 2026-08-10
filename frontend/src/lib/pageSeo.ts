import { useEffect } from 'react'

type PageSeo = {
  title: string
  description: string
  canonicalPath: string
  type?: 'website' | 'article'
  image?: string
  jsonLd?: Record<string, unknown>
}

const SITE_URL = 'https://usecognia.com.br'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  const created = !element
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  const previousContent = element.getAttribute('content')
  element.setAttribute('content', content)
  return () => {
    if (created) element.remove()
    else if (previousContent === null) element.removeAttribute('content')
    else element.setAttribute('content', previousContent)
  }
}

export function usePageSeo({ title, description, canonicalPath, type = 'website', image = DEFAULT_IMAGE, jsonLd }: PageSeo) {
  useEffect(() => {
    const previousTitle = document.title
    const canonicalUrl = new URL(canonicalPath, SITE_URL).toString()
    document.title = title
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const canonicalCreated = !canonical
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    const previousCanonical = canonical.href
    canonical.href = canonicalUrl
    const restoreMeta = [
      setMeta('meta[name="description"]', 'name', 'description', description),
      setMeta('meta[property="og:title"]', 'property', 'og:title', title),
      setMeta('meta[property="og:description"]', 'property', 'og:description', description),
      setMeta('meta[property="og:type"]', 'property', 'og:type', type),
      setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl),
      setMeta('meta[property="og:image"]', 'property', 'og:image', image),
      setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title),
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description),
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image),
    ]
    let script: HTMLScriptElement | undefined
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
      document.head.appendChild(script)
    }
    return () => {
      document.title = previousTitle
      if (canonicalCreated) canonical.remove()
      else canonical.href = previousCanonical
      script?.remove()
      restoreMeta.forEach(restore => restore())
    }
  }, [canonicalPath, description, image, jsonLd, title, type])
}
