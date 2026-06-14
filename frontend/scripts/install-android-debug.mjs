import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const sdkDir = process.env.ANDROID_HOME
  || process.env.ANDROID_SDK_ROOT
  || (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '')
const adb = sdkDir ? join(sdkDir, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : ''
const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!adb || !existsSync(adb)) {
  console.error('ADB nao encontrado. Instale o Android SDK ou defina ANDROID_HOME.')
  process.exit(1)
}

if (!existsSync(apk)) {
  console.error('APK debug nao encontrado. Rode npm run cap:build:android primeiro.')
  process.exit(1)
}

run(adb, ['install', '-r', apk])
run(adb, ['shell', 'monkey', '-p', 'br.com.usecognia.app', '-c', 'android.intent.category.LAUNCHER', '1'])
