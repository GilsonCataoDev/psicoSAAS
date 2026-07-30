import { createServer } from 'node:http'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'

const root = resolve('dist')
const port = Number(process.env.PORT ?? 4173)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

function safePath(pathname) {
  try {
    const decoded = decodeURIComponent(pathname).replace(/^\/+/, '')
    const normalized = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '')
    const candidate = resolve(root, normalized)
    return candidate === root || candidate.startsWith(`${root}${sep}`)
      ? candidate
      : null
  } catch {
    return null
  }
}

function resolveFile(pathname) {
  const requested = safePath(pathname)
  if (!requested) return null
  const candidates = [
    requested,
    join(requested, 'index.html'),
    join(root, 'index.html'),
  ]
  return candidates.find(candidate =>
    candidate.startsWith(root)
    && existsSync(candidate)
    && statSync(candidate).isFile(),
  )
}

createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${request.headers.host}`).pathname
  const file = resolveFile(pathname)
  if (!file) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(file).pipe(response)
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving dist at http://127.0.0.1:${port}\n`)
})
