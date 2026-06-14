import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const androidDir = join(root, 'android')
const sdkDir = process.env.ANDROID_HOME
  || process.env.ANDROID_SDK_ROOT
  || (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '')

if (!sdkDir || !existsSync(sdkDir)) {
  console.error('Android SDK nao encontrado. Instale o SDK ou defina ANDROID_HOME.')
  process.exit(1)
}

writeFileSync(
  join(androidDir, 'local.properties'),
  `sdk.dir=${sdkDir.replaceAll('\\', '/')}\n`,
  'utf8',
)

const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const result = spawnSync(gradle, ['assembleDebug'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ANDROID_HOME: sdkDir,
    ANDROID_SDK_ROOT: sdkDir,
  },
})

process.exit(result.status ?? 1)
