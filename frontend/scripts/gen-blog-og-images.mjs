import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const posts = JSON.parse(readFileSync(join(root, 'src/content/blog-posts.json'), 'utf8'))
const outputDir = join(root, 'public/blog/og')
mkdirSync(outputDir, { recursive: true })

const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

function wrapTitle(title, maxLength = 34) {
  const words = title.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    if (`${line} ${word}`.trim().length > maxLength && line) {
      lines.push(line)
      line = word
    } else line = `${line} ${word}`.trim()
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

for (const post of posts) {
  const lines = wrapTitle(post.title)
  const title = lines.map((line, index) => `<text x="84" y="${245 + index * 72}" font-family="Arial, sans-serif" font-size="58" font-weight="700" fill="#ffffff">${escapeXml(line)}</text>`).join('')
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630"><stop stop-color="#10251D"/><stop offset="1" stop-color="#244D3D"/></linearGradient><radialGradient id="glow"><stop stop-color="#72C69A" stop-opacity=".34"/><stop offset="1" stop-color="#72C69A" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="url(#bg)"/><circle cx="1030" cy="110" r="370" fill="url(#glow)"/><path d="M850 90C1010 150 1090 280 1080 510" fill="none" stroke="#B7DFCD" stroke-opacity=".18" stroke-width="70" stroke-linecap="round"/>
    <rect x="84" y="70" width="54" height="54" rx="15" fill="#2F7657" stroke="#B7DFCD" stroke-opacity=".45"/><path d="M111 83v28m-14-14h28" stroke="#B7DFCD" stroke-width="4" stroke-linecap="round"/>
    <text x="154" y="110" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">Use<tspan fill="#B7DFCD">Cognia</tspan></text>
    <text x="84" y="174" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="#B7DFCD">${escapeXml(post.category.toUpperCase())}</text>
    ${title}
    <rect x="84" y="535" width="1032" height="1" fill="#ffffff" opacity=".16"/><text x="84" y="580" font-family="Arial, sans-serif" font-size="22" fill="#DDEBE4">Conteúdo prático para psicólogos · usecognia.com.br/blog</text>
  </svg>`
  await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(join(outputDir, `${post.slug}.png`))
}

console.log(`Imagens sociais do blog: ${posts.length}`)
