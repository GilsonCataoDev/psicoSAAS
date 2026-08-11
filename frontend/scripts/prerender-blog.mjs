import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const siteUrl = 'https://usecognia.com.br'
const posts = JSON.parse(readFileSync(join(root, 'src', 'content', 'blog-posts.json'), 'utf8'))
const template = readFileSync(join(dist, 'index.html'), 'utf8')

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')

function replaceMeta(html, { title, description, canonical, type = 'website', image = `${siteUrl}/og-image.png`, publishedAt, updatedAt, section, jsonLd }) {
  const absoluteUrl = `${siteUrl}${canonical}`
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`)
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${absoluteUrl}" />`)
  html = html.replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="${type}" />`)
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${absoluteUrl}" />`)
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${escapeHtml(image)}" />`)
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
  html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${escapeHtml(image)}" />`)
  const articleMeta = type === 'article' ? [
    '<meta property="og:site_name" content="UseCognia" />',
    `<meta property="og:image:alt" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(title)}" />`,
    `<meta property="article:published_time" content="${escapeHtml(publishedAt)}" />`,
    `<meta property="article:modified_time" content="${escapeHtml(updatedAt)}" />`,
    `<meta property="article:section" content="${escapeHtml(section)}" />`,
  ].join('\n  ') : ''
  return html.replace('</head>', `  ${articleMeta}\n  <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>\n  </head>`)
}

function wrapBody(content) {
  return `<div class="min-h-screen bg-[#F7F8F5] text-[#211F1C]"><header class="border-b border-[#E1E6DE] bg-[#F7F8F5]"><div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><a href="/" class="text-xl font-bold">Use<span class="text-[#2F7657]">Cognia</span></a><nav class="flex items-center gap-4 text-sm font-semibold"><a href="/blog">Conteúdos</a><a href="/cadastro" class="rounded-md bg-[#213F34] px-4 py-2.5 text-white">Testar grátis</a></nav></div></header>${content}<footer class="border-t border-[#E1E6DE] bg-white"><div class="mx-auto max-w-6xl px-5 py-10 text-sm text-[#5F5A51]">© ${new Date().getFullYear()} UseCognia · <a href="/privacidade">Privacidade</a> · <a href="mailto:usecognia@gmail.com">Contato</a></div></footer></div>`
}

function writeRoute(path, html) {
  const directory = join(dist, ...path.split('/').filter(Boolean))
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'index.html'), html)
}

function writeSitemap() {
  const sitemapPath = join(dist, 'sitemap.xml')
  const sitemap = readFileSync(sitemapPath, 'utf8').replace(/\s*<url>\s*<loc>https:\/\/usecognia\.com\.br\/blog(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/g, '')
  const blogEntries = [
    { path: '/blog', lastmod: posts.reduce((latest, post) => post.updatedAt > latest ? post.updatedAt : latest, posts[0]?.updatedAt ?? '') , priority: '0.9', changefreq: 'weekly' },
    ...posts.map(post => ({ path: `/blog/${post.slug}`, lastmod: post.updatedAt, priority: '0.8', changefreq: 'monthly' })),
  ].map(entry => `  <url>\n    <loc>${siteUrl}${entry.path}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join('\n')
  writeFileSync(sitemapPath, sitemap.replace('</urlset>', `${blogEntries}\n</urlset>`))
}

const cards = posts.map(post => `<article class="rounded-2xl border border-[#DDE5DC] bg-white p-7 shadow-card"><p class="text-sm font-bold text-[#2F7657]">${escapeHtml(post.category)}</p><h2 class="mt-4 text-2xl font-bold"><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a></h2><p class="mt-3 leading-relaxed text-[#5F5A51]">${escapeHtml(post.description)}</p><a href="/blog/${post.slug}" class="mt-6 inline-block font-bold text-[#2F7657]">Ler artigo →</a></article>`).join('')
const blogBody = wrapBody(`<main><section class="bg-[#1D352D] text-white"><div class="mx-auto max-w-6xl px-5 py-20"><p class="text-sm font-bold text-[#B7DFCD]">BLOG USECOGNIA</p><h1 class="mt-5 max-w-3xl text-4xl font-bold sm:text-5xl">Conteúdo prático para cuidar melhor da rotina profissional.</h1><p class="mt-5 max-w-2xl text-lg text-white/75">Guias sobre prontuário, agenda, privacidade e gestão para psicólogos.</p></div></section><section class="mx-auto max-w-6xl px-5 py-16"><h2 class="mb-8 text-3xl font-bold">Artigos recentes</h2><div class="grid gap-6 md:grid-cols-2">${cards}</div></section></main>`)
writeRoute('/blog', replaceMeta(template.replace('<div id="root"></div>', `<div id="root">${blogBody}</div>`), {
  title: 'Conteúdos para psicólogos | Blog UseCognia', description: 'Guias práticos sobre agenda, prontuário, segurança, LGPD e gestão do consultório psicológico.', canonical: '/blog',
  jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog UseCognia', url: `${siteUrl}/blog`, publisher: { '@type': 'Organization', name: 'UseCognia' } },
}))

for (const post of posts) {
  const intro = post.intro.map(paragraph => `<p class="mb-5">${escapeHtml(paragraph)}</p>`).join('')
  const sections = post.sections.map(section => `<section class="mt-10"><h2 class="mb-4 text-2xl font-bold text-[#211F1C]">${escapeHtml(section.heading)}</h2>${section.paragraphs.map(paragraph => `<p class="mb-5">${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('')
  const checklist = post.checklist.map(item => `<li class="mb-3">✓ ${escapeHtml(item)}</li>`).join('')
  const references = post.references.map(reference => `<li class="mb-3"><a href="${escapeHtml(reference.url)}" rel="noreferrer">${escapeHtml(reference.label)}</a></li>`).join('')
  const related = post.relatedSlugs.map(slug => posts.find(item => item.slug === slug)).filter(Boolean).map(item => `<li class="mb-3"><a href="/blog/${item.slug}">${escapeHtml(item.title)}</a></li>`).join('')
  const absoluteImage = `${siteUrl}${post.image}`
  const body = wrapBody(`<main><article><header class="border-b border-[#DDE5DC] bg-white"><div class="mx-auto max-w-3xl px-5 py-16"><nav aria-label="Navegação estrutural"><a href="/">Início</a> / <a href="/blog">Blog</a> / ${escapeHtml(post.category)}</nav><p class="mt-8 text-sm font-bold text-[#2F7657]">${escapeHtml(post.category)}</p><h1 class="mt-4 text-4xl font-bold leading-tight sm:text-5xl">${escapeHtml(post.title)}</h1><p class="mt-5 text-lg leading-relaxed text-[#5F5A51]">${escapeHtml(post.description)}</p><p class="mt-6 text-sm text-[#7C776B]">Por ${escapeHtml(post.author)} · Atualizado em ${escapeHtml(post.updatedAt)} · ${post.readingMinutes} min</p><img src="${escapeHtml(post.image)}" alt="Capa do artigo ${escapeHtml(post.title)}" width="1200" height="630" class="mt-8 w-full rounded-2xl" /></div></header><div class="mx-auto max-w-3xl px-5 py-14 text-[1.04rem] leading-8 text-[#49443D]">${intro}${sections}<section class="mt-12 rounded-2xl border border-[#B7DFCD] bg-[#EEF8F3] p-7"><h2 class="text-2xl font-bold">Checklist rápido</h2><ul class="mt-5">${checklist}</ul></section><section class="mt-12 border-t border-[#DDE5DC] pt-8"><h2 class="text-xl font-bold">Fontes consultadas</h2><ul class="mt-4 text-sm">${references}</ul><p class="mt-6 rounded-lg bg-[#F0F1ED] p-4 text-sm">Conteúdo informativo. Não substitui orientação profissional individual.</p></section>${related ? `<section class="mt-12 border-t border-[#DDE5DC] pt-8"><h2 class="text-xl font-bold">Continue lendo</h2><ul class="mt-4">${related}</ul></section>` : ''}</div></article></main>`)
  const canonical = `/blog/${post.slug}`
  writeRoute(canonical, replaceMeta(template.replace('<div id="root"></div>', `<div id="root">${body}</div>`), {
    title: `${post.title} | UseCognia`, description: post.description, canonical, type: 'article', image: absoluteImage, publishedAt: post.publishedAt, updatedAt: post.updatedAt, section: post.category,
    jsonLd: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'BlogPosting', headline: post.title, description: post.description, image: absoluteImage, datePublished: post.publishedAt, dateModified: post.updatedAt, inLanguage: 'pt-BR', mainEntityOfPage: `${siteUrl}${canonical}`, author: { '@type': 'Organization', name: post.author, url: siteUrl }, publisher: { '@type': 'Organization', name: 'UseCognia', url: siteUrl, logo: { '@type': 'ImageObject', url: `${siteUrl}/pwa-512.png` } }, keywords: post.keywords.join(', ') },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${siteUrl}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: `${siteUrl}${canonical}` },
      ] },
    ] },
  }))
}

writeSitemap()

console.log(`Blog prerenderizado: índice + ${posts.length} artigo(s)`)
