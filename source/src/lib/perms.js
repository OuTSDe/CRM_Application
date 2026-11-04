// Roles, workspaces and data scope. The backend (backend/Code.gs) applies the same rules on the server;
// here they shape the interface and, in local mode, filter the data exactly as the server would.

export const ROLES = {
  admin: 'Admin',
  senior: 'Senior sales',
  sales: 'Client advisor',
  finance: 'Finance',
  design: 'Design',
  sourcing: 'Sourcing',
  viewer: 'View only',
  none: 'No access',
}
export const ROLE_NOTES = {
  admin: 'Everything, including users, settings, approvals and all money.',
  senior: 'All leads, clients, cold calls and interactions; money read-only; performance; templates; assigns tasks.',
  sales: 'Own clients, own leads and own interaction log. No rupee figures, no performance board, no payment recording.',
  finance: 'Records payments and receipts, demand calls, outstanding by client.',
  design: 'Accord Design: projects, BOQ, showcase, sourcing; vendors.',
  sourcing: 'Accord Vendors: vendor directory, onboarding, quotes and samples.',
  viewer: 'Reads the CRM; changes nothing.',
}

// Three platforms (30 Oct): the login decides which one opens.
export const WORKSPACES = {
  sales: { label: 'Accord Sales', sub: 'CRM · e-Brochure · client sessions', color: 'var(--accent)' },
  design: { label: 'Accord Design', sub: 'Experience · projects · BOQ', color: 'var(--good)' },
  vendors: { label: 'Accord Vendors', sub: 'Vendors · sourcing · quotes', color: 'var(--warn)' },
}
const DEFAULT_WS = { admin: ['sales', 'design', 'vendors'], senior: ['sales'], sales: ['sales'], finance: ['sales'], design: ['design', 'vendors'], sourcing: ['vendors'], viewer: ['sales'] }
export const workspacesOf = (u) => {
  if (!u) return []
  const w = Array.isArray(u.workspaces) ? u.workspaces : String(u.workspaces || '').split(/[,\s]+/).filter(Boolean)
  return w.length ? w.filter((x) => WORKSPACES[x]) : DEFAULT_WS[u.appRole] || []
}

const MODULES = {
  crm: ['admin', 'senior', 'sales', 'finance', 'viewer'],
  people: ['admin', 'senior', 'sales', 'finance', 'design', 'sourcing', 'viewer'],
  performance: ['admin', 'senior'],
  presales: ['admin', 'senior', 'sales', 'design'],
  brochure: ['admin', 'senior', 'sales', 'design'],
  experience: ['admin', 'senior', 'sales', 'design'],
  vendors: ['admin', 'design', 'sourcing', 'finance'],
  sourcing: ['admin', 'design', 'sourcing'],
  accord: ['admin', 'design', 'sourcing'],
  admin: ['admin'],
  analytics: ['admin', 'senior', 'sales', 'finance'],
  help: ['admin', 'senior', 'sales', 'finance', 'design', 'sourcing', 'viewer'],
}
const WRITE = {
  leads: ['admin', 'senior', 'sales'],
  interactions: ['admin', 'senior', 'sales', 'finance'],
  clients: ['admin', 'senior', 'sales'],
  payments: ['admin', 'finance'],
  documents: ['admin', 'senior', 'sales'],
  issues: ['admin', 'senior', 'sales'],
  costSheets: ['admin', 'senior', 'sales'],
  parking: ['admin', 'senior'],
  demandCalls: ['admin', 'finance'],
  clpStages: ['admin', 'finance'],
  settings: ['admin'], users: ['admin'], units: ['admin'],
  templates: ['admin', 'senior'],
  messages: ['admin', 'senior', 'sales', 'finance'],
  viewings: ['admin', 'senior', 'sales', 'design'],
  brochure: ['admin', 'senior', 'design'],
  vendors: ['admin', 'design', 'sourcing'], trips: ['admin', 'design', 'sourcing'], stops: ['admin', 'design', 'sourcing'],
  quotes: ['admin', 'design', 'sourcing'], samples: ['admin', 'design', 'sourcing'],
  projects: ['admin', 'design'], rooms: ['admin', 'design'], packages: ['admin', 'design', 'sourcing'], boq: ['admin', 'design', 'sourcing'],
  attendance: ['admin'],
  files: ['admin', 'senior', 'sales', 'finance', 'design', 'sourcing'],
  leadInbox: ['admin', 'senior', 'sales'],
}
export const canOpen = (u, mod) => !!u && (u.appRole === 'admin' || (MODULES[mod] || []).includes(u.appRole))
export const canWrite = (u, coll) => {
  if (!u) return false
  if (u.appRole === 'admin') return true
  if (['tasks', 'notifications', 'audit', 'accordSessions', 'timeEvents'].includes(coll)) return true
  return (WRITE[coll] || []).includes(u.appRole)
}
export const isAdmin = (u) => u?.appRole === 'admin'
export const seesMoney = (u) => ['admin', 'senior', 'finance'].includes(u?.appRole)
export const seesAll = (u) => ['admin', 'senior', 'finance', 'viewer'].includes(u?.appRole)
export const canAssignTasks = (u) => ['admin', 'senior'].includes(u?.appRole)
export const canEditTemplates = (u) => ['admin', 'senior'].includes(u?.appRole)
export const canRecordPayment = (u) => ['admin', 'finance'].includes(u?.appRole)

export const MONEY_FIELDS = ['tc', 'adjustment', 'adjType', 'adjReason', 'receivedPerCollections', 'outstandingPerCollections', 'loanAmount']

// Local mode: filter the full database the way the server's pull() does.
export function scopeDb(db, u, derive) {
  if (!u || seesAll(u) && u.appRole !== 'viewer') return db
  const me = u.name
  const crm = derive ? derive(db) : null
  // 2 Nov: a lead or client can have several people responsible (owner + coOwners)
  const isMine = (r) => r.owner === me || (Array.isArray(r.coOwners) && r.coOwners.includes(me))
  const mineC = new Set(db.clients.filter(isMine).map((c) => c.clientId))
  const mineB = new Set(db.clients.filter(isMine).map((c) => c.bookingId))
  const mineUnits = new Set(db.clients.filter(isMine).map((c) => String(c.unit)))
  const DIR = ['id', 'bookingId', 'clientId', 'unit', 'title', 'name', 'status', 'owner', 'category']
  const pay = (c) => { const x = crm?.byUnit[c.unit]; if (!x) return {}; const lp = x.payments.filter((p) => p.counted === 'Yes').slice(-1)[0]
    return { payState: x.outstanding <= 0 ? 'Paid up' : x.age === '60+ days' ? 'Overdue 60+ days' : ['0-30 days', '31-60 days'].includes(x.age) ? 'Overdue' : x.age === 'Due, date not set' ? 'Due, date not set' : 'Not yet due', lastPaymentDate: lp?.date || '' } }
  const strip = (o, f) => { const r = { ...o }; f.forEach((k) => delete r[k]); return r }
  const leads = db.leads.filter(isMine)
  const mineL = new Set(leads.map((l) => l.id))
  return {
    ...db,
    clients: db.clients.map((c) => (isMine(c) ? { ...strip(c, MONEY_FIELDS), ...pay(c), mine: true } : { ...Object.fromEntries(DIR.filter((k) => c[k] !== undefined).map((k) => [k, c[k]])), directoryOnly: true })),
    payments: db.payments.filter((p) => mineUnits.has(String(p.unit))).map((p) => ({ id: p.id, unit: p.unit, date: p.date, receiptNo: p.receiptNo, towards: p.towards, counted: p.counted })),
    leads,
    interactions: db.interactions.filter((i) => i.by === me || (i.nextOwners || []).includes(me) || i.nextOwner === me),
    documents: db.documents.filter((d) => mineB.has(d.bookingId)),
    issues: db.issues.filter((i) => i.owner === me || mineUnits.has(String(i.unit))),
    costSheets: db.costSheets.filter((x) => x.by === me || mineL.has(x.leadId) || mineUnits.has(String(x.unit))),
    attendance: db.attendance.filter((a) => a.userId === u.id),
    timeEvents: (db.timeEvents || []).filter((a) => a.userId === u.id),
    tasks: db.tasks.filter((t) => t.owner === me || t.by === me),
    notifications: (db.notifications || []).filter((n) => n.to === me),
    messages: db.messages.filter((m) => m.by === me),
    files: (db.files || []).filter((f) => f.by === me || mineC.has(f.recordId) || mineB.has(f.recordId) || mineL.has(f.recordId)),
    accordSessions: u.appRole === 'design' ? (db.accordSessions || []) : (db.accordSessions || []).filter((x) => x.by === me),
    audit: [],
    _mineClients: mineC,
  }
}
