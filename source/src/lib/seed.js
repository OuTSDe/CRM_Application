// 1 Nov: the published build carries no client data. crm.public.json holds the inventory, team, lists and
// document types; clients, payments, leads and interactions are loaded once from the private starting-data file
// (Accord_Data / Starting data, never on GitHub) and from then on live only in the Google Sheet.
import crm from '../seed/crm.public.json'
import * as ops from '../seed/ops.js'

// Each collection is an array of records with a string `id`.
export const COLLECTIONS = ['settings', 'users', 'units', 'clients', 'payments', 'leads', 'interactions', 'documents', 'issues', 'clpStages', 'demandCalls',
  'costSheets', 'parking', 'messages', 'templates', 'attendance', 'tasks', 'viewings', 'brochure', 'vendors', 'trips', 'stops', 'quotes', 'samples',
  'projects', 'rooms', 'packages', 'boq', 'audit', 'timeEvents', 'notifications', 'accordSessions', 'clientForms', 'files']

export const META = { lists: crm.lists, docTypes: crm.docTypes }

const TEMPLATES = [
  { id: 'TP-01', name: 'Thank you for visiting', channel: 'WhatsApp', body: 'Dear {name}, thank you for visiting Yamuna Sky City today. It was a pleasure hosting your private viewing. I will share the residence details and payment schedule shortly. \n\nWarm regards,\n{signature}' },
  { id: 'TP-02', name: 'Payment reminder (gentle)', channel: 'WhatsApp', body: 'Dear {name}, a gentle reminder that the instalment for residence {unit} at Yamuna Sky City is now due. Please reach out if you need the account details or a copy of the demand letter.\n\nWarm regards,\n{signature}' },
  { id: 'TP-03', name: 'Site progress update', channel: 'WhatsApp', body: 'Dear {name}, here is the latest progress at Yamuna Sky City. We would be glad to host you for a private viewing of your residence {unit}.\n\nWarm regards,\n{signature}' },
  { id: 'TP-04', name: 'Document request', channel: 'WhatsApp', body: 'Dear {name}, to complete your file for residence {unit}, could you share: {pending}. You can reply here with photos or PDFs.\n\nWarm regards,\n{signature}' },
  { id: 'TP-05', name: 'Private viewing invitation', channel: 'WhatsApp', body: 'Dear {name}, we would be delighted to host you for a private viewing at Yamuna Sky City. Would {date} suit you?\n\nWarm regards,\n{signature}' },
  { id: 'TP-06', name: 'Receipt shared', channel: 'Email', body: 'Dear {name},\n\nPlease find attached the receipt for your payment towards residence {unit}.\n\nWarm regards,\n{signature}' },
]

// The CRM part of a seed from a CRM-master extract (crm.json from tools/extract_seed.py, or the private starting-data file).
export function crmPart(src) {
  return {
    clients: (src.clients || []).map((c) => ({ ...c, id: c.bookingId, interests: c.interests || [] })),
    payments: (src.payments || []).map((p) => ({ ...p, id: p.id || p.entryNo })),
    leads: (src.leads || []).map((l) => ({ ...l, interests: l.interests || [] })),
    interactions: src.interactions || [],
    documents: (src.documents || []).map((d) => ({ ...d, id: d.id || d.bookingId, files: d.files || {} })),
    issues: src.issues || [],
  }
}

export function buildSeed() {
  const db = {}
  COLLECTIONS.forEach((c) => (db[c] = []))
  db.settings = [{ ...ops.SETTINGS, gstDemand: crm.sheetSettings.gst ?? 0.05, dueDays: crm.sheetSettings.dueDays ?? 15, rera: crm.sheetSettings.rera ?? 0.1, contactRed: crm.sheetSettings.contactRed ?? 30 }]
  db.users = [...crm.team, ...ops.EXTRA_USERS].map((t) => ({ ...t, appRole: ops.ROLE_OF[t.name] || t.appRole || 'sales', designation: t.designation || ops.DESIGNATION_OF[t.name] || t.role || '',
    username: t.name.toLowerCase().replace(/[^a-z]/g, ''), shiftStart: '09:30', shiftEnd: '18:30', workDays: 'Mon-Sat', remoteAllowed: t.team === 'Management' ? 'Yes' : 'No',
    reportsTo: ops.REPORTS_TO[t.name] || '', phone: '', email: '', deviceLock: 'No', devices: [], mustChange: 'Yes', pwSalt: '', pwHash: '' }))
  db.units = crm.units.map((u) => ({ ...u, id: String(u.unit) }))
  Object.assign(db, crmPart(crm))
  db.clpStages = crm.clpStages.map((s) => ({ ...s, id: 'S' + String(s.no).padStart(2, '0') }))
  db.demandCalls = crm.demandCalls
  db.templates = TEMPLATES
  db.brochure = [ops.BROCHURE]
  db.vendors = ops.VENDORS
  db.trips = ops.TRIPS
  db.stops = ops.STOPS
  db.projects = ops.PROJECTS
  db.rooms = ops.ROOMS
  db.packages = ops.PACKAGES
  db.boq = ops.BOQ
  return db
}
export const OPS = ops
