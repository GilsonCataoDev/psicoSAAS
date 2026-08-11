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

if (!existsSync(join(androidDir, 'keystore.properties'))) {
  console.error(
    'android/keystore.properties nao encontrado. Copie android/keystore.properties.example, ' +
    'gere o keystore com keytool e preencha os valores antes de gerar um build de release. ' +
    'Ver docs/ANDROID_RELEASE_CHECKLIST.md.',
  )
  process.exit(1)
}

writeFileSync(
  join(androidDir, 'local.properties'),
  `sdk.dir=${sdkDir.replaceAll('\\', '/')}\n`,
  'utf8',
)

const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
// bundleRelease gera o .aab (Android App Bundle) assinado — formato exigido
// pela Play Store, diferente do .apk usado em assembleDebug.
const result = spawnSync(gradle, ['bundleRelease'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ANDROID_HOME: sdkDir,
    ANDROID_SDK_ROOT: sdkDir,
  },
})

if (result.status === 0) {
  console.log('\nAAB assinado gerado em: android/app/build/outputs/bundle/release/app-release.aab')
}

process.exit(result.status ?? 1)
