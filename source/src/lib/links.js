// 7 Nov: where a lead or client record lives, so a notification opens that exact record, not the section.
export function recordRoute(db, recordId) {
  const id = String(recordId || '')
  if (!id) return '/crm/interactions'
  if (/^YSC-L-/i.test(id)) return '/crm/leads/' + id
  const c = (db.clients || []).find((x) => x.clientId === id || x.bookingId === id || x.id === id)
  if (c) return '/crm/clients/' + (c.bookingId || c.id)
  const l = (db.leads || []).find((x) => x.id === id)
  return l ? '/crm/leads/' + l.id : '/crm/interactions'
}

// The page a notification should open. Prefers the stored target, then works it out from the link.
export function notificationTarget(db, n) {
  if (n.target) return String(n.target).replace(/^#/, '')
  const L = String(n.link || '')
  if (L.startsWith('#')) return L.slice(1)
  if (L.startsWith('i:')) {
    const i = (db.interactions || []).find((x) => x.id === L.slice(2))
    if (i) return recordRoute(db, i.recordId) + '?focus=' + i.id
  }
  if (L.startsWith('b:')) return '/crm/booking/' + L.slice(2)
  if (L.startsWith('c:')) return recordRoute(db, L.slice(2))
  return '/crm/interactions'
}

// Route for a lead or client id, as a hash link to store on a notification.
export const targetFor = (db, recordId, focus) => '#' + recordRoute(db, recordId) + (focus ? '?focus=' + focus : '')
