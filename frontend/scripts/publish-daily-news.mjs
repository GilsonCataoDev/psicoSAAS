import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const root = join(dirname(scriptPath), '..')
const postsPath = join(root, 'src/content/blog-posts.json')

export const NEWS_SOURCES = [
  { name: 'Conselho Federal de Psicologia', url: 'https://site.cfp.org.br/feed/', host: 'site.cfp.org.br' },
  { name: 'Agência Brasil — Saúde', url: 'https://agenciabrasil.ebc.com.br/rss/saude/feed.xml', host: 'agenciabrasil.ebc.com.br' },
  { name: 'Fiocruz', url: 'https://portal.fiocruz.br/rss.xml', host: 'portal.fiocruz.br' },
]

const RELEVANCE_TERMS = [
  'psicolog', 'saúde mental', 'saude mental', 'ansiedade', 'depress', 'suicíd', 'suicid',
  'autismo', 'tdah', 'terapia', 'lgpd', 'dados pessoais', 'privacidade', 'prontuário',
  'prontuario', 'teleatendimento', 'saúde digital', 'saude digital', 'conselho federal de psicologia',
  'resolução', 'resolucao', 'ética profissional', 'etica profissional', 'caps', 'raps', 'burnout',
]

const TOPICS = [
  {
    id: 'privacidade',
    terms: ['lgpd', 'dados pessoais', 'privacidade', 'segurança da informação', 'seguranca da informacao'],
    implication: 'A atualização merece ser lida considerando sigilo, finalidade do tratamento e exposição mínima de dados sensíveis na rotina do consultório.',
    checklist: 'Revisar avisos de privacidade, consentimentos e canais usados para compartilhar informações',
    keywords: ['LGPD para psicólogos', 'privacidade na psicologia'],
  },
  {
    id: 'regulacao',
    terms: ['resolução', 'resolucao', 'conselho federal de psicologia', 'cfp', 'ética profissional', 'etica profissional'],
    implication: 'O profissional deve consultar o texto original e verificar se a atualização altera documentos, registros, comunicação ou prestação do serviço.',
    checklist: 'Conferir a publicação original do CFP antes de alterar procedimentos profissionais',
    keywords: ['notícias CFP', 'atualização para psicólogos'],
  },
  {
    id: 'saude-mental',
    terms: ['saúde mental', 'saude mental', 'ansiedade', 'depress', 'suicíd', 'suicid', 'caps', 'raps', 'burnout'],
    implication: 'O tema ajuda a acompanhar o contexto de saúde mental, mas não substitui avaliação individual nem autoriza conclusões clínicas sobre pacientes.',
    checklist: 'Separar informação pública de evidência aplicável ao caso individual',
    keywords: ['notícias de saúde mental', 'psicologia no Brasil'],
  },
  {
    id: 'neurodesenvolvimento',
    terms: ['autismo', 'tea', 'tdah', 'neurodesenvolvimento'],
    implication: 'Vale observar a população estudada, as fontes citadas e os limites da informação antes de incorporá-la à prática ou à comunicação com famílias.',
    checklist: 'Verificar população, método e limites antes de usar a informação na prática',
    keywords: ['neurodesenvolvimento', 'avaliação psicológica'],
  },
  {
    id: 'saude-digital',
    terms: ['teleatendimento', 'saúde digital', 'saude digital', 'tecnologia', 'inteligência artificial', 'inteligencia artificial'],
    implication: 'A adoção de tecnologia deve preservar responsabilidade profissional, segurança dos dados e revisão humana das decisões.',
    checklist: 'Avaliar segurança, finalidade e supervisão humana antes de adotar uma tecnologia',
    keywords: ['tecnologia para psicólogos', 'saúde digital'],
  },
]

function decodeXml(value = '') {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function stripHtml(value = '') {
  return decodeXml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? stripHtml(match[1]) : ''
}

function canonicalUrl(value) {
  try {
    const url = new URL(decodeXml(value).trim())
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key)
    }
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

export function parseRss(xml, source) {
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
  return items.map(([, item]) => ({
    title: tagValue(item, 'title'),
    description: tagValue(item, 'description'),
    link: canonicalUrl(tagValue(item, 'link') || tagValue(item, 'guid')),
    publishedAt: tagValue(item, 'pubDate') || tagValue(item, 'dc:date'),
    source: source.name,
    expectedHost: source.host,
  })).filter(item => item.title && item.link)
}

export function relevanceScore(item) {
  const text = `${item.title} ${item.description}`.toLocaleLowerCase('pt-BR')
  return RELEVANCE_TERMS.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0)
}

function titleRelevanceScore(item) {
  const title = item.title.toLocaleLowerCase('pt-BR')
  return RELEVANCE_TERMS.reduce((score, term) => score + (title.includes(term) ? 1 : 0), 0)
}

function isRelevant(item) {
  // Toda publicação do CFP pertence ao domínio profissional. Nas fontes gerais,
  // o tema precisa estar explícito no título para evitar falsos positivos do resumo.
  return item.expectedHost === 'site.cfp.org.br' || titleRelevanceScore(item) > 0
}

function classify(item) {
  const text = `${item.title} ${item.description}`.toLocaleLowerCase('pt-BR')
  return TOPICS.find(topic => topic.terms.some(term => text.includes(term))) ?? {
    id: 'atualidades',
    implication: 'A publicação ajuda a acompanhar o setor. Consulte a fonte original e avalie criticamente sua relação com a atuação profissional.',
    checklist: 'Ler a fonte completa antes de compartilhar ou aplicar a informação',
    keywords: ['atualidades para psicólogos'],
  }
}

function dateInSaoPaulo(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

function longDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`))
}

function isRecent(item, now, maxAgeDays) {
  const published = Date.parse(item.publishedAt)
  if (!Number.isFinite(published)) return false
  const age = now.getTime() - published
  return age >= -86400000 && age <= maxAgeDays * 86400000
}

function trustedLink(item) {
  try {
    const host = new URL(item.link).hostname.replace(/^www\./, '')
    return host === item.expectedHost || host.endsWith(`.${item.expectedHost}`)
  } catch {
    return false
  }
}

export function selectNews(items, posts, now = new Date(), maxItems = 3) {
  const usedLinks = new Set(posts.flatMap(post => post.references ?? []).map(reference => canonicalUrl(reference.url)))
  const seenTitles = new Set()
  const sourceUsed = new Set()

  return items
    .filter(item => trustedLink(item) && isRecent(item, now, 4) && isRelevant(item))
    .filter(item => !usedLinks.has(item.link))
    .sort((a, b) => relevanceScore(b) - relevanceScore(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter(item => {
      const key = item.title.toLocaleLowerCase('pt-BR').replace(/[^a-zà-ú0-9]+/g, ' ').trim()
      if (seenTitles.has(key) || sourceUsed.has(item.source)) return false
      seenTitles.add(key)
      sourceUsed.add(item.source)
      return true
    })
    .slice(0, maxItems)
}

export function buildNewsPost(items, date) {
  const topics = items.map(classify)
  const keywords = [...new Set(['notícias para psicólogos', 'psicologia hoje', ...topics.flatMap(topic => topic.keywords)])]
  const formattedDate = longDate(date)

  return {
    slug: `psicologia-em-pauta-${date}`,
    title: `Psicologia em pauta: notícias de ${formattedDate}`,
    description: `Curadoria de atualizações recentes do CFP, da saúde pública e da ciência para psicólogos, com fontes originais e leitura prática.`,
    image: `/blog/og/psicologia-em-pauta-${date}.png`,
    category: 'Atualidades para psicólogos',
    publishedAt: date,
    updatedAt: date,
    readingMinutes: Math.max(4, items.length * 2),
    author: 'Equipe UseCognia',
    keywords,
    relatedSlugs: ['software-para-psicologo-guia-completo-2026', 'lgpd-para-psicologos-guia-pratico'],
    intro: [
      `Esta curadoria reúne publicações recentes de fontes institucionais consultadas em ${formattedDate}. Os títulos levam ao conteúdo original para conferência.`,
      'O objetivo é ajudar profissionais a acompanhar temas que podem afetar a rotina do consultório. O conteúdo é informativo, não oferece orientação clínica, ética ou jurídica individual.',
    ],
    sections: items.map((item, index) => {
      const topic = topics[index]
      return {
        heading: `${index + 1}. ${item.title}`,
        paragraphs: [
          `${item.source} publicou uma atualização sobre este tema. Leia a notícia completa na fonte consultada antes de compartilhar a informação ou alterar qualquer procedimento.`,
          topic.implication,
        ],
      }
    }),
    checklist: [...new Set([
      'Abrir e ler as fontes originais desta curadoria',
      ...topics.map(topic => topic.checklist),
      'Registrar mudanças de processo somente após validação profissional',
    ])],
    references: items.map(item => ({
      label: `${item.title} — ${item.source}`,
      url: item.link,
    })),
  }
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: { 'User-Agent': 'UseCogniaBlogBot/1.0 (+https://usecognia.com.br/blog)' },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`)
  return parseRss(await response.text(), source)
}

export async function main({ now = new Date(), dryRun = false } = {}) {
  const posts = JSON.parse(readFileSync(postsPath, 'utf8'))
  const date = dateInSaoPaulo(now)
  const slug = `psicologia-em-pauta-${date}`
  if (posts.some(post => post.slug === slug)) {
    console.log(`Blog diário: ${slug} já existe`)
    return { changed: false, reason: 'already-published' }
  }

  const results = await Promise.allSettled(NEWS_SOURCES.map(fetchSource))
  const failures = results.filter(result => result.status === 'rejected')
  failures.forEach(result => console.warn(`Fonte ignorada: ${result.reason instanceof Error ? result.reason.message : 'falha desconhecida'}`))
  const allItems = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  if (!allItems.length) throw new Error('Nenhuma fonte oficial respondeu; publicação cancelada')

  const maxItems = Math.min(4, Math.max(1, Number(process.env.BLOG_NEWS_MAX_ITEMS ?? 3)))
  const selected = selectNews(allItems, posts, now, maxItems)
  if (!selected.length) {
    console.log('Blog diário: nenhuma notícia nova e relevante; publicação ignorada')
    return { changed: false, reason: 'no-relevant-news' }
  }

  const post = buildNewsPost(selected, date)
  console.log(`Blog diário: ${post.slug} com ${selected.length} fonte(s) — ${selected.map(item => item.source).join(', ')}`)
  if (!dryRun) writeFileSync(postsPath, `${JSON.stringify([post, ...posts], null, 2)}\n`, 'utf8')
  return { changed: !dryRun, reason: dryRun ? 'dry-run' : 'published', post }
}

if (process.argv[1] === scriptPath) {
  main({ dryRun: process.argv.includes('--dry-run') }).catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
