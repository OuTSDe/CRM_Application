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
  const base = w.length ? w.filter((x) => WORKSPACES[x]) : DEFAULT_WS[u.appRole] || []
  const more = extrasOf(u).map((k) => ITEM[k].ws).filter((x) => x && !base.includes(x))
  return [...base, ...new Set(more)]
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
// 4 Nov: access by page. Each role has its default pages (from the lists above); an admin can tick extra pages or
// powers for one person (user.extraAccess). Admin pages are never given out this way. The server applies the same list.
const R = (mod) => MODULES[mod]
export const ACCESS = [
  { group: 'Accord Sales', ws: 'sales', items: [
    { key: 'leads', label: 'Leads and lead inbox', mod: 'crm', roles: ['admin', 'senior', 'sales'], writes: ['leads', 'leadInbox', 'interactions'] },
    { key: 'clients', label: 'Client 360', mod: 'crm', roles: R('crm'), writes: [] },
    { key: 'interactions', label: 'Interaction log', mod: 'crm', roles: R('crm'), writes: ['interactions'] },
    { key: 'payments', label: 'Payments', mod: 'crm', roles: R('crm'), writes: [] },
    { key: 'documents', label: 'Documents', mod: 'crm', roles: R('crm'), writes: ['documents', 'files'] },
    { key: 'messages', label: 'Messages', mod: 'crm', roles: R('crm'), writes: ['messages'] },
    { key: 'issues', label: 'Issues', mod: 'crm', roles: R('crm'), writes: ['issues'] },
    { key: 'costSheet', label: 'Cost sheet', mod: 'crm', roles: R('crm'), writes: ['costSheets'] },
    { key: 'inventory', label: 'Building and parking', mod: 'crm', roles: R('crm'), writes: [] },
    { key: 'viewings', label: 'Private viewings', mod: 'presales', roles: R('presales'), writes: ['viewings'] },
    { key: 'brochure', label: 'e-Brochure', mod: 'brochure', roles: R('brochure'), writes: [] },
    { key: 'experience', label: 'Accord experience', mod: 'experience', roles: R('experience'), writes: [] },
  ] },
  { group: 'Team', ws: '', items: [
    { key: 'time', label: 'Time', mod: 'people', roles: R('people'), writes: [] },
    { key: 'tasks', label: 'Tasks', mod: 'people', roles: R('people'), writes: [] },
    { key: 'team', label: 'Team', mod: 'people', roles: R('people'), writes: [] },
    { key: 'performance', label: 'Performance', mod: 'performance', roles: R('performance'), writes: [] },
    { key: 'analyticsLeads', label: 'Analytics: leads', mod: 'analytics', roles: ['admin', 'senior', 'sales'], writes: [] },
    { key: 'analyticsFinance', label: 'Analytics: finance', mod: 'analytics', roles: ['admin', 'finance'], writes: [] },
    { key: 'analyticsOverall', label: 'Analytics: overall', mod: 'analytics', roles: ['admin'], writes: [] },
  ] },
  { group: 'Accord Design and Vendors', ws: 'design', items: [
    { key: 'projects', label: 'Projects and BOQ', mod: 'accord', roles: R('accord'), writes: ['projects', 'rooms', 'packages', 'boq'] },
    { key: 'residences', label: 'Residences (design view)', mod: 'accord', roles: R('accord'), writes: [] },
    { key: 'showcase', label: 'Design showcase', mod: 'presales', roles: R('presales'), writes: [] },
    { key: 'sourcing', label: 'Sourcing: trips, quotes, samples', mod: 'sourcing', roles: R('sourcing'), writes: ['trips', 'stops', 'quotes', 'samples'], ws: 'vendors' },
    { key: 'vendors', label: 'Vendor directory', mod: 'vendors', roles: R('vendors'), writes: ['vendors'], ws: 'vendors' },
  ] },
  { group: 'Extra powers', ws: '', items: [
    { key: 'seeAll', label: 'See every client and lead, not only their own', roles: ['admin', 'senior', 'finance', 'viewer'], writes: [] },
    { key: 'money', label: 'See amounts: consideration, payments, outstanding', roles: ['admin', 'senior', 'finance'], writes: [] },
    { key: 'recordPayments', label: 'Record payments and issue receipts (includes seeing amounts)', roles: ['admin', 'finance'], writes: ['payments', 'demandCalls'] },
    { key: 'construction', label: 'Update construction stages', roles: ['admin', 'finance'], writes: ['clpStages'] },
    { key: 'templates', label: 'Edit message templates', roles: ['admin', 'senior'], writes: ['templates'] },
    { key: 'assign', label: 'Assign leads, clients and tasks to others', roles: ['admin', 'senior'], writes: [] },
  ] },
]
export const ACCESS_ITEMS = ACCESS.flatMap((g) => g.items.map((x) => ({ ...x, ws: x.ws ?? g.ws, group: g.group })))
const ITEM = Object.fromEntries(ACCESS_ITEMS.map((x) => [x.key, x]))
export const extrasOf = (u) => (Array.isArray(u?.extraAccess) ? u.extraAccess : String(u?.extraAccess || '').split(/[,\s]+/).filter(Boolean)).filter((k) => ITEM[k])
export const byRole = (u, key) => !!u && (u.appRole === 'admin' || (ITEM[key]?.roles || []).includes(u.appRole))
const has = (u, key) => byRole(u, key) || extrasOf(u).includes(key)
export const canPage = (u, key) => !!u && (ITEM[key] ? has(u, key) : canOpen(u, key))
export const canOpen = (u, mod) => !!u && (u.appRole === 'admin' || (MODULES[mod] || []).includes(u.appRole) || extrasOf(u).some((k) => ITEM[k].mod === mod))
export const canWrite = (u, coll) => {
  if (!u) return false
  if (u.appRole === 'admin') return true
  if (['tasks', 'notifications', 'audit', 'accordSessions', 'timeEvents'].includes(coll)) return true
  return (WRITE[coll] || []).includes(u.appRole) || extrasOf(u).some((k) => ITEM[k].writes.includes(coll))
}
export const isAdmin = (u) => u?.appRole === 'admin'
export const seesMoney = (u) => has(u, 'money') || has(u, 'recordPayments')   // recording payments needs the amounts
export const seesAll = (u) => has(u, 'seeAll')
export const canAssignTasks = (u) => has(u, 'assign')
export const canEditTemplates = (u) => has(u, 'templates')
export const canRecordPayment = (u) => has(u, 'recordPayments')

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
    clients: db.clients.map((c) => (isMine(c) ? { ...(seesMoney(u) ? c : strip(c, MONEY_FIELDS)), ...pay(c), mine: true } : { ...Object.fromEntries(DIR.filter((k) => c[k] !== undefined).map((k) => [k, c[k]])), directoryOnly: true })),
    payments: db.payments.filter((p) => mineUnits.has(String(p.unit))).map((p) => (seesMoney(u) ? p : { id: p.id, unit: p.unit, date: p.date, receiptNo: p.receiptNo, towards: p.towards, counted: p.counted })),
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
