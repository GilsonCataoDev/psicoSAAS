import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED_ADVISORIES = new Set([
  'https://github.com/advisories/GHSA-qwww-vcr4-c8h2',
])

function sourceUsesRsc(directory) {
  return readdirSync(directory).some(name => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return sourceUsesRsc(path)
    if (!/\.[cm]?[jt]sx?$/.test(name)) return false
    return /unstable_RSC|RSCStaticRouter|createCallServer|decodeReply/.test(readFileSync(path, 'utf8'))
  })
}

let report
try {
  report = JSON.parse(execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  }))
} catch (error) {
  const output = error?.stdout?.toString()
  if (!output) throw error
  report = JSON.parse(output)
}

const vulnerabilities = Object.values(report.vulnerabilities ?? {})
const advisoryUrls = vulnerabilities.flatMap(vulnerability =>
  vulnerability.via
    .filter(item => typeof item === 'object' && item?.url)
    .map(item => item.url),
)
const unexpected = advisoryUrls.filter(url => !ALLOWED_ADVISORIES.has(url))
const onlyKnownRscAdvisory =
  vulnerabilities.every(vulnerability => ['react-router', 'react-router-dom'].includes(vulnerability.name)) &&
  advisoryUrls.length > 0 &&
  unexpected.length === 0

if (vulnerabilities.length === 0) {
  console.log('Auditoria de produção: 0 vulnerabilidades.')
  process.exit(0)
}

if (onlyKnownRscAdvisory && !sourceUsesRsc(join(process.cwd(), 'src'))) {
  console.log(
    'Auditoria de produção: somente GHSA-qwww-vcr4-c8h2, não aplicável porque o frontend não usa as APIs instáveis de RSC.',
  )
  process.exit(0)
}

console.error(JSON.stringify(report.vulnerabilities, null, 2))
process.exit(1)
