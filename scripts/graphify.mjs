import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const venv = join(root, '.tools', 'graphify')
const isWindows = process.platform === 'win32'
const python = join(venv, isWindows ? 'Scripts/python.exe' : 'bin/python')
const graphify = join(venv, isWindows ? 'Scripts/graphify.exe' : 'bin/graphify')
const pinnedVersion = '0.9.17'

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (process.argv.includes('--setup')) {
  if (!existsSync(python)) {
    const systemPython = isWindows ? 'python' : 'python3'
    run(systemPython, ['-m', 'venv', venv])
  }
  run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', `graphifyy[sql]==${pinnedVersion}`])
  console.log(`Graphify ${pinnedVersion} instalado em .tools/graphify.`)
  process.exit(0)
}

if (!existsSync(graphify)) {
  console.error('Graphify ainda não está instalado. Execute: npm run graphify:setup')
  process.exit(1)
}

const cliArgs = process.argv.slice(2)
const graphCommands = new Set([
  'affected', 'benchmark', 'check-update', 'cluster-only', 'diagnose', 'explain', 'export',
  'global', 'path', 'query', 'reflect', 'save-result', 'stats', 'tree', 'watch',
])
const isGraphCommand = graphCommands.has(cliArgs[0]) || ['--help', '--version'].includes(cliArgs[0])

// Builds are deliberately code-only: no docs/media semantic pass, API key or live database DSN.
if (isGraphCommand) {
  run(graphify, cliArgs)
} else {
  run(graphify, ['.', '--code-only', ...cliArgs])
  run(graphify, ['cluster-only', root, '--no-label'])
}
