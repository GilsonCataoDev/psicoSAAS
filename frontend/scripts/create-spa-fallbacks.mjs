import { copyFileSync, rmSync } from 'node:fs'
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
  const routePath = join(dist, route)
  rmSync(routePath, { recursive: true, force: true })
  copyFileSync(join(dist, 'index.html'), routePath)
}
