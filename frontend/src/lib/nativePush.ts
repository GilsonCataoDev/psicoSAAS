import { Capacitor } from '@capacitor/core'
import { isNativeApp } from './nativeAuth'
import { api } from './api'

/**
 * Push nativo (Android/iOS) via Firebase Cloud Messaging — canal paralelo ao
 * Web Push (pushNotifications.ts), usado só dentro do app Capacitor. Registra
 * o token FCM no backend (POST /notifications/push/native-token) assim que o
 * usuário autenticado abre o app nativo.
 */
export async function registerNativePush(): Promise<void> {
  if (!isNativeApp()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permission = await PushNotifications.checkPermissions()
    if (permission.receive !== 'granted') {
      const requested = await PushNotifications.requestPermissions()
      if (requested.receive !== 'granted') return
    }

    // Evita registrar listeners duplicados se essa função rodar mais de uma
    // vez no ciclo de vida do app (ex: login/logout sem recarregar).
    await PushNotifications.removeAllListeners()

    PushNotifications.addListener('registration', async ({ value: token }) => {
      try {
        await api.post('/notifications/push/native-token', {
          token,
          platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
        })
      } catch {
        // Falha silenciosa — push nativo é complementar, nunca deve travar o app.
      }
    })

    PushNotifications.addListener('registrationError', () => {
      // Sem tratamento adicional — usuário continua recebendo Web Push/e-mail.
    })

    await PushNotifications.register()
  } catch {
    // Plugin ausente ou plataforma sem suporte — segue sem push nativo.
  }
}

/** Remove o token deste dispositivo do backend, chamado no logout do app nativo. */
export async function unregisterNativePush(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
    await api.delete('/notifications/push/native-token', { data: {} })
  } catch {
    // Best-effort — não bloqueia o logout.
  }
}
