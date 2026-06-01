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
const fallbackHtml = indexHtml.replace(
  '<head>',
  `<head>
    <script>
      (() => {
        const base = ${JSON.stringify(basePath)};
        if (window.location.hash) return;
        const normalizedBase = base.endsWith('/') ? base : base + '/';
        const path = window.location.pathname;
        if (path === normalizedBase || path === normalizedBase.slice(0, -1)) return;
        if (!path.startsWith(normalizedBase)) return;
        const route = path.slice(normalizedBase.length).replace(/^\\/+/, '');
        if (!route) return;
        window.location.replace(normalizedBase + '#/' + route + window.location.search);
      })();
    </script>`,
)

writeFileSync(join(dist, '404.html'), fallbackHtml)

for (const route of legacyRouteFiles) {
  rmSync(join(dist, route), { recursive: true, force: true })
}
