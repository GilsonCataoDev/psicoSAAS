import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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

writeFileSync(join(dist, '404.html'), fallbackHtml)

for (const route of legacyRouteFiles) {
  rmSync(join(dist, route), { recursive: true, force: true })
}
