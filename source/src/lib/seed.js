// 1 Nov: the published build carries no client data. crm.public.json holds the inventory, team, lists and
// document types; clients, payments, leads and interactions are loaded once from the private starting-data file
// (Accord_Data / Starting data, never on GitHub) and from then on live only in the Google Sheet.
import crm from '../seed/crm.public.json'
import * as ops from '../seed/ops.js'
import { KB_DOCS } from '../seed/kb.js'
import { HOLIDAYS_START } from '../seed/hrStart.js'
import { DEFAULT_HR_CONFIG } from './hr.js'

// Each collection is an array of records with a string `id`.
export const COLLECTIONS = ['settings', 'users', 'units', 'clients', 'payments', 'leads', 'interactions', 'documents', 'issues', 'clpStages', 'demandCalls',
  'costSheets', 'parking', 'messages', 'templates', 'attendance', 'tasks', 'viewings', 'brochure', 'vendors', 'trips', 'stops', 'quotes', 'samples',
  'projects', 'rooms', 'packages', 'boq', 'audit', 'timeEvents', 'notifications', 'accordSessions', 'clientForms', 'files', 'leadInbox', 'demandLetters', 'partners', 'paymentEdits',
  'hrConfig', 'hrProfiles', 'hrComp', 'leaves', 'holidays', 'kras', 'hrTickets', 'assets', 'kbDocs', 'kbAcks']

export const META = { lists: crm.lists, docTypes: crm.docTypes }
// 7 Nov: the cancellation protocol's statuses and the interest line on receipts
;(() => { const add = (k, xs, after) => { const l = META.lists[k] = META.lists[k] || []; xs.forEach((x) => { if (!l.includes(x)) { const i = after ? l.indexOf(after) : -1; if (i >= 0) l.splice(i, 0, x); else l.push(x) } }) }
  add('Booking status', ['Cancellation requested', 'Retention', 'Cancellation approved'], 'Under cancellation')
  add('Payment towards', ['Interest on delayed payment'], 'Other') })()

export const DEFAULT_TEMPLATES = [
  { id: 'TP-01', name: 'Thank you for visiting', channel: 'WhatsApp', body: 'Dear {name}, thank you for visiting Yamuna Sky City today. It was a pleasure hosting your private viewing. I will share the residence details and payment schedule shortly. \n\nWarm regards,\n{signature}' },
  { id: 'TP-02', name: 'Payment reminder (gentle)', channel: 'WhatsApp', body: 'Dear {name}, a gentle reminder that the instalment for residence {unit} at Yamuna Sky City is now due. Please reach out if you need the account details or a copy of the demand letter.\n\nWarm regards,\n{signature}' },
  { id: 'TP-03', name: 'Site progress update', channel: 'WhatsApp', body: 'Dear {name}, here is the latest progress at Yamuna Sky City. We would be glad to host you for a private viewing of your residence {unit}.\n\nWarm regards,\n{signature}' },
  { id: 'TP-04', name: 'Document request', channel: 'WhatsApp', body: 'Dear {name}, to complete your file for residence {unit}, could you share: {pending}. You can reply here with photos or PDFs.\n\nWarm regards,\n{signature}' },
  { id: 'TP-05', name: 'Private viewing invitation', channel: 'WhatsApp', body: 'Dear {name}, we would be delighted to host you for a private viewing at Yamuna Sky City. Would {date} suit you?\n\nWarm regards,\n{signature}' },
  { id: 'TP-07', name: 'Closing enquiry', channel: 'WhatsApp', body: 'Dear {name}, as we have not been able to reach you about your enquiry for Yamuna Sky City, we are closing it for now. Whenever you would like to take it forward, just reply here and I will be happy to help.\n\nWarm regards,\n{signature}' },
  { id: 'TP-08', name: 'Festival wishes', channel: 'WhatsApp', body: 'Dear {name}, warm wishes to you and your family from all of us at Yamuna Sky City. May the season bring you joy and good health.\n\nWarm regards,\n{signature}' },
  { id: 'TP-09', name: 'Booking cancellation confirmation', channel: 'Email', body: 'Dear {name},\n\nWe confirm that your booking of residence {unit} at Yamuna Sky City has been cancelled as requested, with effect from {date}.\n\n{refund}\n\nWe are sorry to see you go, and thank you for the trust you placed in us. Should your plans change, our doors remain open and we would be glad to help you again.\n\n{signature}' },
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
  db.templates = DEFAULT_TEMPLATES
  db.brochure = [ops.BROCHURE]
  db.vendors = ops.VENDORS
  db.trips = ops.TRIPS
  db.stops = ops.STOPS
  db.projects = ops.PROJECTS
  db.rooms = ops.ROOMS
  db.packages = ops.PACKAGES
  db.boq = ops.BOQ
  // 12 Nov: Accord People starting content (HR loads it into the shared sheet from the HR desk)
  db.hrConfig = [DEFAULT_HR_CONFIG]
  db.holidays = HOLIDAYS_START
  db.kbDocs = KB_DOCS
  return db
}
export const OPS = ops
