// The thread between Accord Sales and Accord Design (OuTSDe).
// A design project carries the booking it belongs to (bookingId, clientId, unit). Everything else it shows about
// the buyer and the residence is read live from the CRM, so a change in Client 360 is a change in Design.
// Accord experience sessions belong to a client by Client ID (recordId) or, before a booking exists, by unit reference.

export const sessionsFor = (db, c) => (db.accordSessions || [])
  .filter((s) => (c.clientId && s.recordId === c.clientId) || (c.unit && String(s.unitRef || '').replace(/\D/g, '') === String(c.unit)))
  .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))

export const projectsFor = (db, c) => (db.projects || [])
  .filter((p) => (c.bookingId && p.bookingId === c.bookingId) || (c.clientId && p.clientId === c.clientId) || (c.unit && String(p.unitNo || '') === String(c.unit)))

// The CRM facts a designer needs, without money.
export function bookingFacts(crm, p) {
  if (!p) return null
  const c = (p.bookingId && crm.clients.find((x) => x.bookingId === p.bookingId)) || (p.clientId && crm.clients.find((x) => x.clientId === p.clientId)) || null
  const unit = String(c?.unit || p.unitNo || '')
  const u = crm.units.find((x) => String(x.unit) === unit) || null
  if (!c && !u) return null
  return { client: c, unit: u, unitNo: unit, name: c?.name || '', owner: c?.owner || '', status: c?.status || (u ? 'Available' : ''),
    type: u?.type || c?.config || '', area: u?.area || c?.area || '', terrace: u?.terrace || '', floor: u?.floor ?? (unit ? Math.floor(Number(unit) / 100) : ''), pos: u?.pos || '', band: u?.band || '' }
}

// Options for the booking picker: every live booking, newest residence first.
export const bookingOptions = (crm) => crm.clients
  .filter((c) => c.bookingId && !['Cancelled'].includes(c.status))
  .slice().sort((a, b) => Number(a.unit) - Number(b.unit))
  .map((c) => ({ value: c.bookingId, label: `${c.unit} · ${c.name} · ${c.bookingId}` }))

// The latest experience session, as a design brief.
export const briefRows = (s) => s ? [['Persona', s.persona], ['Palette', s.palette], ['Register', s.register], ['Coherence', s.coherence], ['Residence chosen', [s.residence, s.unit, s.floor].filter(Boolean).join(' · ')], ['Configuration ID', s.configId], ['Indicative total', s.total], ['Reached', s.screen], ['Hosted by', s.by]].filter((r) => r[1]) : []
