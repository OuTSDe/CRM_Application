// Accord service worker: shows follow-up reminders as system notifications and opens Accord when one is tapped.
// It does not cache data; Accord always reads the live database.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((ws) => {
    const w = ws.find((x) => x.url.includes(self.registration.scope))
    return w ? w.focus() : self.clients.openWindow('./#/crm/interactions?view=due')
  }))
})
