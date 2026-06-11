import { api } from './api'

type PushStatus = {
  configured: boolean
  subscribed: boolean
  publicKey: string | null
  subscriptions: number
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushStatus(): Promise<PushStatus> {
  const { data } = await api.get('/notifications/push/status')
  return data
}

async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
}

export async function enableWebPush() {
  if (!isPushSupported()) throw new Error('Este navegador nao suporta notificacoes push.')

  const status = await getPushStatus()
  if (!status.configured || !status.publicKey) {
    throw new Error('Notificacoes push ainda nao estao configuradas no servidor.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permissao de notificacao negada no navegador.')
  }

  const registration = await getServiceWorkerRegistration()
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(status.publicKey),
  })

  await api.post('/notifications/push/subscribe', subscription.toJSON())
  return getPushStatus()
}

export async function disableWebPush() {
  if (!isPushSupported()) return getPushStatus()

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint

  if (endpoint) {
    await api.delete('/notifications/push/unsubscribe', { data: { endpoint } })
    await subscription?.unsubscribe()
  } else {
    await api.delete('/notifications/push/unsubscribe')
  }

  return getPushStatus()
}

export async function sendTestWebPush() {
  const { data } = await api.post('/notifications/push/test')
  return data
}
