self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'UseCognia', body: event.data?.text() }
  }

  const title = payload.title || 'UseCognia'
  const iconUrl = new URL('pwa-192.png', self.registration.scope).toString()
  const options = {
    body: payload.body || 'Voce tem uma nova notificacao.',
    icon: iconUrl,
    badge: iconUrl,
    tag: payload.tag || 'usecognia',
    lang: 'pt-BR',
    timestamp: Date.now(),
    data: {
      url: safeAppUrl(payload.url),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safeAppUrl(event.notification.data?.url)

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client) {
        client.navigate(url)
        return client.focus()
      }
    }
    return clients.openWindow(url)
  })())
})

function safeAppUrl(value) {
  try {
    const url = new URL(value || '/', self.registration.scope)
    if (url.origin !== self.location.origin) return self.registration.scope
    return url.href
  } catch {
    return self.registration.scope
  }
}
