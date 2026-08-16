import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const posts = JSON.parse(readFileSync(join(root, 'src/content/blog-posts.json'), 'utf8'))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
const origin = 'https://usecognia.com.br'

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const staticUrls = [
  ['/', 'weekly', '1.0'],
  ['/ferramenta/evolucao', 'monthly', '0.9'],
  ['/plataforma', 'monthly', '0.8'],
  ['/precos', 'weekly', '0.8'],
  ['/privacidade', 'yearly', '0.3'],
  ['/termos', 'yearly', '0.3'],
  ['/seguranca', 'yearly', '0.3'],
  ['/dpa', 'yearly', '0.3'],
]

const sitemapEntries = staticUrls.map(([path, frequency, priority]) => `  <url>
    <loc>${origin}${path}</loc>
    <changefreq>${frequency}</changefreq>
    <priority>${priority}</priority>
  </url>`)

const newestDate = posts[0]?.updatedAt ?? new Date().toISOString().slice(0, 10)
sitemapEntries.push(`  <url>
    <loc>${origin}/blog</loc>
    <lastmod>${newestDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
sitemapEntries.push(...posts.map(post => `  <url>
    <loc>${origin}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`))

writeFileSync(join(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`, 'utf8')

const rssItems = posts.map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${origin}/blog/${post.slug}</link>
      <guid isPermaLink="true">${origin}/blog/${post.slug}</guid>
      <pubDate>${new Date(`${post.publishedAt}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`).join('\n')

writeFileSync(join(publicDir, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog UseCognia</title>
    <link>${origin}/blog</link>
    <description>Conteúdos sobre organização, prontuário, privacidade e gestão para psicólogos.</description>
    <language>pt-BR</language>
    <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>
`, 'utf8')

const llmsPath = join(publicDir, 'llms.txt')
const llms = readFileSync(llmsPath, 'utf8')
const marker = '## Conteúdos do blog'
const base = llms.includes(marker) ? llms.slice(0, llms.indexOf(marker)).trimEnd() : llms.trimEnd()
const blogLinks = posts.map(post => `- ${post.title}: ${origin}/blog/${post.slug}`).join('\n')
writeFileSync(llmsPath, `${base}\n\n${marker}\n\n${blogLinks}\n`, 'utf8')

console.log(`SEO: sitemap, RSS e llms.txt atualizados para ${posts.length} artigos`)
