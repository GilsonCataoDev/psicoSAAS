import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const basePath = process.env.VITE_BASE_PATH || '/'
const legacyRouteFiles = [
  'login',
  'cadastro',
  'esqueci-senha',
  'redefinir-senha',
  'pricing',
  'pacientes',
  'prontuario',
  'documentos',
  'agenda',
  'agendamentos',
  'sessoes',
  'financeiro',
  'configuracoes',
  'planos',
  'agendar',
  'verificar',
]

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf-8')
const fallbackHtml = indexHtml
const seoRoutes = JSON.parse(readFileSync(join(process.cwd(), 'seo-routes.json'), 'utf-8'))

writeFileSync(join(dist, '404.html'), fallbackHtml)

for (const route of legacyRouteFiles) {
  rmSync(join(dist, route), { recursive: true, force: true })
}

function replaceMeta(html, selector, value) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html.replace(
    new RegExp(`(<meta ${escapedSelector} content=")[^"]*(" />)`),
    `$1${value}$2`,
  )
}

for (const config of seoRoutes) {
  for (const routePath of config.paths) {
    if (routePath === '/') continue

    const canonicalUrl = `https://usecognia.com.br${config.canonicalPath}`
    let html = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${config.title}</title>`)
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${canonicalUrl}" />`,
      )

    html = replaceMeta(html, 'name="description"', config.description)
    html = replaceMeta(html, 'property="og:url"', canonicalUrl)
    html = replaceMeta(html, 'property="og:title"', config.title)
    html = replaceMeta(html, 'property="og:description"', config.description)
    html = replaceMeta(html, 'name="twitter:title"', config.title)
    html = replaceMeta(html, 'name="twitter:description"', config.description)

    const output = join(dist, routePath.slice(1), 'index.html')
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, html)
  }
}
