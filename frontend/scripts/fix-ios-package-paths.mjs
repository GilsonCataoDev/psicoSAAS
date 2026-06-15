import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const packageFile = join(process.cwd(), 'ios', 'App', 'CapApp-SPM', 'Package.swift')

if (!existsSync(packageFile)) {
  process.exit(0)
}

const source = readFileSync(packageFile, 'utf8')
const fixed = source.replaceAll('..\\..\\..\\node_modules\\@capacitor\\preferences', '../../../node_modules/@capacitor/preferences')

if (fixed !== source) {
  writeFileSync(packageFile, fixed)
  console.log('Normalized iOS Package.swift plugin paths.')
}
