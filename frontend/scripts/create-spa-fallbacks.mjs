import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const routes = [
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

copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))

for (const route of routes) {
  const routeDir = join(dist, route)
  mkdirSync(routeDir, { recursive: true })
  copyFileSync(join(dist, 'index.html'), join(routeDir, 'index.html'))
}
