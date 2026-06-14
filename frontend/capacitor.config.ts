import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.usecognia.app',
  appName: 'UseCognia',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
