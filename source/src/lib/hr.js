// 12 Nov: Accord People (HRMS). Grades, positions, leave policy, KRA templates and the rules that decide who sees what.
// The backend (backend/Code.gs, 3.8.0) applies the same visibility rules in pull_ and the same write checks in push_.
//
// Two things restrict access here, on top of the access role:
//   position  what the person does (Sales Executive, Post-Sales Coordinator…). Drives their KRA template and "My SOPs".
//   grade     their pay grade (G1 to G6). Knowledge-base documents carry a minimum grade, and HR sees salaries only below
//             the grade set in HR settings (G5 by default), so heads and management pay is seen by admins alone.
// Both live on the person's HR profile (hrProfiles), which only HR and admins can change.

export const DEFAULT_GRADES = [
  { id: 'G1', label: 'Trainee', note: 'Interns, trainees and probationers on a training stipend' },
  { id: 'G2', label: 'Executive', note: 'Sales executives, CRM and data, front office' },
  { id: 'G3', label: 'Senior executive / Specialist', note: 'Post-sales coordination, accounts, HR and admin' },
  { id: 'G4', label: 'Lead / Manager', note: 'Sales Head, Legal; approves leave and reviews KRAs for their team' },
  { id: 'G5', label: 'Head of department', note: 'Creative Director and other department heads' },
  { id: 'G6', label: 'Management', note: 'Managing Director and Directors' },
]
export const gradeRank = (g) => { const m = String(g || '').match(/G(\d+)/i); return m ? Number(m[1]) : 0 }

// Positions. kra = the KRA template used when a goal sheet is started for this position (SOP YSC-SALES-01, section 11).
export const POSITIONS = [
  { id: 'md', label: 'Managing Director', grade: 'G6', team: 'Management', dept: 'Management' },
  { id: 'director', label: 'Director', grade: 'G6', team: 'Management', dept: 'Management' },
  { id: 'sales-head', label: 'Sales Head', grade: 'G4', team: 'Sales', dept: 'Sales' },
  { id: 'sales-exec-cp', label: 'Sales Executive (channel partners)', grade: 'G2', team: 'Sales', dept: 'Sales' },
  { id: 'sales-exec', label: 'Sales Executive', grade: 'G2', team: 'Sales', dept: 'Sales' },
  { id: 'post-sales', label: 'Post-Sales Coordinator', grade: 'G3', team: 'Sales', dept: 'Post-sales' },
  { id: 'crm', label: 'Sales and CRM Executive', grade: 'G2', team: 'Sales', dept: 'Sales' },
  { id: 'legal', label: 'Legal', grade: 'G4', team: 'Legal', dept: 'Legal' },
  { id: 'accounts', label: 'Accounts', grade: 'G3', team: 'Finance', dept: 'Accounts' },
  { id: 'hr-admin', label: 'HR and Admin', grade: 'G3', team: 'HR and Admin', dept: 'HR and Admin' },
  { id: 'design', label: 'Design', grade: 'G5', team: 'Design', dept: 'Design' },
  { id: 'other', label: 'Other', grade: 'G2', team: '', dept: '' },
]
export const POSITION = Object.fromEntries(POSITIONS.map((p) => [p.id, p]))
// Starting suggestions for the people already in Accord (from the SOP and the team list). HR confirms each one.
export const SUGGEST = { Aryan: 'md', Shruthadev: 'director', Cyril: 'sales-head', Anuradha: 'sales-exec-cp', Anu: 'sales-exec-cp', Medha: 'sales-exec', Yakshith: 'post-sales', Khushi: 'crm', Kajal: 'design', Kanchana: 'legal', Sujaya: 'hr-admin' }

// Leave policy. statutory = the floor set by law; the rest is company policy that HR can change in HR settings.
export const DEFAULT_LEAVE = [
  { id: 'EL', label: 'Earned leave', perYear: 15, accrual: 'monthly', carry: 45, minNotice: 7, halfDay: true, encash: true, statutory: 'Karnataka Shops and Commercial Establishments Act, 1961, s.15: at least 1 day for every 20 days worked; carry forward up to 45 days.' },
  { id: 'SL', label: 'Sick leave', perYear: 12, accrual: 'yearly', carry: 0, minNotice: 0, halfDay: true, certAfter: 2, statutory: 'Karnataka S&CE Act: 12 days of sick leave a year. Medical certificate for more than 2 days in a row.' },
  { id: 'CL', label: 'Casual leave', perYear: 6, accrual: 'yearly', carry: 0, minNotice: 1, halfDay: true, maxStretch: 3, statutory: 'Company policy. No more than 3 days at a stretch; lapses at the end of the year.' },
  { id: 'ML', label: 'Maternity leave', perYear: 182, accrual: 'event', carry: 0, minNotice: 56, statutory: 'Maternity benefit (now under the Code on Social Security, 2020): 26 weeks for the first two children, 12 weeks after that.' },
  { id: 'PL', label: 'Paternity leave', perYear: 5, accrual: 'event', carry: 0, minNotice: 14, statutory: 'Company policy: 5 working days within 3 months of the birth or adoption.' },
  { id: 'BL', label: 'Bereavement leave', perYear: 3, accrual: 'event', carry: 0, minNotice: 0, statutory: 'Company policy: 3 working days for the loss of an immediate family member.' },
  { id: 'CO', label: 'Compensatory off', perYear: 0, accrual: 'earned', carry: 0, minNotice: 1, halfDay: true, statutory: 'Earned for working a holiday or weekly off with approval. Use within 60 days.' },
  { id: 'LOP', label: 'Leave without pay', perYear: 0, accrual: 'none', carry: 0, minNotice: 3, halfDay: true, statutory: 'Only when the other balances are used up, with the manager\'s approval. Deducted from pay.' },
]

export const DEFAULT_HR_CONFIG = {
  id: 'main', grades: DEFAULT_GRADES, leaveTypes: DEFAULT_LEAVE, compBelow: 'G5', probationMonths: 6, noticeDays: { G1: 15, G2: 30, G3: 30, G4: 60, G5: 90, G6: 90 },
  longLeaveDays: 5, icMembers: [], hrName: 'Sujaya', cycle: 'H2 FY 2026-27', cycles: ['H2 FY 2026-27', 'H1 FY 2027-28'],
  onboarding: ['Offer letter signed', 'Appointment letter issued', 'KYC copies (PAN, Aadhaar, photo)', 'Bank details for salary', 'Previous employer relieving letter', 'PF / ESI nomination (if applicable)', 'NDA and confidentiality undertaking', 'Accord user created, role and grade set', 'Authenticator linked, first sign-in done', 'Assets issued (laptop, SIM, ID card, keys)', 'Policies and role SOP acknowledged in Accord', 'Introduced to the team and buddy assigned', 'KRA sheet agreed for the first cycle', 'Probation review date set'],
  exit: ['Resignation received and accepted in writing', 'Last working day agreed (notice period)', 'Leads and clients handed over in Accord (reassigned)', 'Open follow-ups and tasks reassigned', 'Physical files and documents returned', 'Assets returned and checked', 'Accord access removed on the last day', 'E-mail, WhatsApp groups and shared drives handed over', 'Exit interview done', 'Full and final settlement paid within 2 working days', 'Relieving and experience letters issued'],
}
export const hrConfigOf = (db) => ({ ...DEFAULT_HR_CONFIG, ...((db.hrConfig || [])[0] || {}) })

// KRA templates. auto = a figure Accord can count for the period (shown next to the target as a suggestion).
const K = (kra, kpi, weight, target, auto) => ({ kra, kpi, weight, target, auto: auto || '' })
export const KRA_TEMPLATES = {
  'sales-head': [
    K('Bookings', 'Bookings closed by the team', 25, 'As set by management for the cycle', 'teamBookings'),
    K('Collections', 'Collections against target (collected vs due)', 20, '95% of dues collected within 30 days'),
    K('Team performance', 'Team KPI scores; daily reports reviewed', 15, 'Every working day'),
    K('Lead governance', 'Every enquiry logged and allocated by round-robin the same day', 15, '100% same day'),
    K('Site visits', 'Presentations at site visits', 10, 'Every scheduled visit attended', 'visits'),
    K('Escalations', 'Escalations resolved within the agreed time', 10, '100% within SOP timelines'),
    K('Process', 'SOP compliance and audit findings closed', 5, 'No repeat findings'),
  ],
  'sales-exec': [
    K('Lead response', 'First contact within the response time set by the Sales Head', 15, '100% within response time'),
    K('Site visits', 'Lead-to-site-visit conversion; visits scheduled vs completed', 20, 'As set for the cycle', 'visits'),
    K('Follow-up discipline', 'No active lead without a next action in Accord', 15, '100% of active leads', 'followUp'),
    K('Bookings', 'Bookings contributed', 20, 'As set for the cycle', 'bookings'),
    K('Handover', 'Complete handover file to Post-Sales within 24 hours of booking', 10, '100% complete and on time'),
    K('CRM accuracy', 'Interactions logged the same day; data issues closed', 10, 'All calls logged', 'interactions'),
    K('Customer care', 'Payment nudges and issue follow-up for own customers', 10, 'No complaint left open past a day'),
  ],
  'post-sales': [
    K('Document files', 'Files complete within 1 working day of handover; gaps returned', 15, '100% checked in a day'),
    K('Agreements', 'Agreement drafts to Legal within 2 working days; executed on schedule', 20, '100% on schedule'),
    K('NOCs', 'Builder\'s NOC issued; Bank NOC received within 2 weeks', 10, '100% within 2 weeks'),
    K('Collections', 'Collection efficiency (collected vs due); overdue cases', 25, '95% collected; nothing past 7 days without escalation'),
    K('Receipts', 'Receipt within 1 working day of credit; history updated', 10, '100%', 'receipts'),
    K('Reporting', 'Daily report and weekly payment update to the Sales Head', 10, 'Every working day / every week'),
    K('Records', 'Physical files complete and retrievable; RERA data to Legal monthly', 10, 'Spot checks pass'),
  ],
  legal: [
    K('Agreements', 'Sale agreements finalised within 2 working days of draft and executed on the date', 35, '100% within timeline'),
    K('NOCs', 'Builder\'s NOCs prepared within 2 working days of execution', 15, '100% within timeline'),
    K('RERA', 'Quarterly updates and annual audit filed on time; area statements current', 35, 'Every filing on time'),
    K('Risk', 'Compliance issues raised to management immediately; no open legal gaps', 15, 'Zero unreported issues'),
  ],
  accounts: [
    K('Confirmation', 'Payments confirmed with transaction details the same working day', 30, '100% same day'),
    K('Reconciliation', 'Collections reconciled with Accord and the RERA account weekly', 30, 'Weekly, no breaks'),
    K('RERA account', '70% of collections deposited in the separate RERA account; withdrawals certified', 25, '100% compliant'),
    K('Reporting', 'Monthly MIS to management', 15, 'By the 5th of each month'),
  ],
  'hr-admin': [
    K('Hiring and onboarding', 'Onboarding checklist complete within the first week', 20, '100% of joiners'),
    K('Attendance and leave', 'Monthly attendance and leave closed for payroll by the 2nd', 20, 'Every month'),
    K('Performance cycle', 'KRA sheets agreed at cycle start; reviews closed on time', 20, '100% of staff'),
    K('Compliance', 'Statutory registers, holiday list, POSH committee and filings current', 20, 'No lapses'),
    K('Policies and SOPs', 'Knowledge base current; acknowledgements chased', 10, '100% acknowledged within 7 days'),
    K('Exits', 'Full and final within 2 working days; exit checklist complete', 10, '100%'),
  ],
  crm: [
    K('Data quality', 'Open data issues closed; no duplicate leads', 30, 'Issues log trending down'),
    K('Updates', 'CRM updated the same day; documents filed', 30, 'Same day', 'interactions'),
    K('Support', 'Support to sales and post-sales on requests', 20, 'As agreed'),
    K('Reporting', 'Reports prepared on time', 20, 'As scheduled'),
  ],
  design: [
    K('Delivery', 'Design deliverables on schedule', 40, 'As per project plan'),
    K('Client experience', 'Accord sessions and briefs turned into BOQs', 30, 'Every session followed up'),
    K('Vendors', 'Vendor onboarding and quotes current', 30, 'As agreed'),
  ],
  other: [K('Role objectives', 'Agreed with the manager at the start of the cycle', 100, 'As agreed')],
}
KRA_TEMPLATES['sales-exec-cp'] = [
  K('Channel partners', 'Active CPs; CP leads generated; CP site visits; CP-sourced bookings', 20, 'As set for the cycle'),
  ...KRA_TEMPLATES['sales-exec'].map((x) => ({ ...x, weight: x.kra === 'Site visits' ? 15 : x.kra === 'Bookings' ? 15 : x.kra === 'Customer care' ? 5 : x.weight })),
]
KRA_TEMPLATES.md = KRA_TEMPLATES.director = [K('Business plan', 'Bookings and collections against the plan', 50, 'As per board plan'), K('Closures', 'Negotiation and closure of every booking', 30, 'As per plan', 'bookings'), K('Governance', 'Compliance, approvals and escalations', 20, 'No lapses')]
export const kraTemplate = (pos) => (KRA_TEMPLATES[pos] || KRA_TEMPLATES.other).map((x, i) => ({ ...x, id: 'k' + (i + 1), actual: '', self: '', mgr: '', note: '' }))

export const RATING = [
  { v: 5, label: 'Outstanding' }, { v: 4, label: 'Exceeds' }, { v: 3, label: 'Meets' }, { v: 2, label: 'Needs improvement' }, { v: 1, label: 'Unsatisfactory' },
]
export const weighted = (items, key) => { let w = 0, s = 0; (items || []).forEach((x) => { const r = Number(x[key]); if (r) { w += Number(x.weight || 0); s += r * Number(x.weight || 0) } }); return w ? s / w : null }
export const band = (score) => score == null ? '' : score >= 4.5 ? 'Outstanding' : score >= 3.5 ? 'Exceeds' : score >= 2.75 ? 'Meets' : score >= 1.75 ? 'Needs improvement' : 'Unsatisfactory'
export const KRA_STATUS = ['Draft', 'Agreed', 'Self review', 'Manager review', 'Closed']

// ---------- people and the chain of command
// 12 Nov: the HR desk is for people on the Yamuna Sky City rolls only. The Company field in Users and access decides;
// when it is empty, an @outsd-e.com e-mail means OuTSDe and an External team means outside, otherwise Yamuna Sky City.
export const companyOf = (u) => { const c = String(u?.company || '').trim(); if (c) return c
  if (/@outsd-?e\.com$/i.test(String(u?.email || '').trim())) return 'OuTSDe'
  return u?.team === 'External' ? 'External' : 'Yamuna Sky City' }
export const isYscStaff = (u) => /yamuna/i.test(companyOf(u))
export const staffOf = (users) => (users || []).filter((u) => u.appRole !== 'none' && u.active !== 'No' && u.team !== 'External' && !['consultant', 'bank'].includes(u.appRole) && isYscStaff(u))
// everyone who reports to `name`, directly or further down
export function reportsOf(users, name) {
  const out = new Set(); let frontier = [name]
  for (let i = 0; i < 8 && frontier.length; i++) {
    const next = (users || []).filter((u) => frontier.includes(u.reportsTo) && !out.has(u.name) && u.name !== name).map((u) => u.name)
    next.forEach((n) => out.add(n)); frontier = next
  }
  return out
}
export const isHr = (u) => u?.appRole === 'hr' || u?.appRole === 'admin'
export const profileOf = (db, u) => (db.hrProfiles || []).find((p) => p.userId === u?.id) || null
export const gradeOf = (db, u) => (u?.appRole === 'admin' ? 'G6' : profileOf(db, u)?.grade || POSITION[SUGGEST[u?.name]]?.grade || 'G1')
export const positionOf = (db, u) => profileOf(db, u)?.position || SUGGEST[u?.name] || 'other'
// what the server uses to decide document access: the confirmed profile only (no suggestions)
export const accessGrade = (db, u) => (u?.appRole === 'admin' ? 'G6' : profileOf(db, u)?.grade || 'G1')

// ---------- knowledge base visibility (same rule as kbVisible_ in Code.gs)
// audience: { minGrade: 'G1', roles: [], positions: [], teams: [] }. Empty lists mean everyone.
export function kbVisible(doc, u, grade, position, team) {
  if (!doc || !u) return false
  if (u.appRole === 'admin' || u.appRole === 'hr') return true
  if (doc.status === 'Retired') return false
  if (doc.status === 'Draft') return doc.owner === u.name
  const a = doc.audience || {}
  if (gradeRank(grade) < gradeRank(a.minGrade || 'G1')) return false
  if ((a.roles || []).length && !a.roles.includes(u.appRole)) return false
  if ((a.positions || []).length && position && !a.positions.includes(position)) return false
  if ((a.teams || []).length && !a.teams.includes(team || u.team)) return false
  return true
}
export const audienceText = (a = {}) => [a.minGrade && a.minGrade !== 'G1' ? a.minGrade + ' and above' : 'All staff', (a.positions || []).length ? a.positions.map((p) => POSITION[p]?.label || p).join(', ') : '', (a.teams || []).join(', '), (a.roles || []).length ? 'roles: ' + a.roles.join(', ') : ''].filter(Boolean).join(' · ')

// ---------- leave arithmetic
const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
// working days between two dates (inclusive): not Sunday, not Saturday for Mon-Fri people, not a holiday
export function leaveDays(from, to, { workDays = 'Mon-Sat', holidays = [], half = false } = {}) {
  if (!from) return 0
  const end = parse(to || from); let n = 0
  const hol = new Set(holidays.filter((h) => h.type !== 'Optional').map((h) => h.date))
  for (let d = parse(from); d <= end; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay()
    if (wd === 0 || (wd === 6 && /fri/i.test(workDays))) continue
    if (hol.has(ymd(d))) continue
    n++
  }
  return half && n === 1 ? 0.5 : n
}
// balance for one person and one leave type in a calendar year
export function balance(type, { profile, leaves = [], year = new Date().getFullYear(), userId, asOf = new Date() }) {
  const doj = profile?.doj ? parse(profile.doj) : new Date(year, 0, 1)
  const start = doj > new Date(year, 0, 1) ? doj : new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const months = Math.max(0, Math.min(12, (Math.min(asOf, yearEnd) - start) / (1000 * 60 * 60 * 24 * 30.44)))
  let credit = 0
  if (type.accrual === 'monthly') credit = Math.floor(type.perYear / 12 * months * 2) / 2
  else if (type.accrual === 'yearly') credit = start > yearEnd ? 0 : Math.round(type.perYear * (12 - start.getMonth()) / 12 * 2) / 2
  else if (type.accrual === 'event') credit = type.perYear
  const opening = Number(profile?.opening?.[year]?.[type.id] || 0)
  const earned = type.accrual === 'earned' ? leaves.filter((l) => l.userId === userId && l.kind === 'credit' && l.type === type.id && l.status === 'Approved' && String(l.from).startsWith(year)).reduce((s, l) => s + Number(l.days || 0), 0) : 0
  const mine = leaves.filter((l) => l.userId === userId && l.type === type.id && l.kind !== 'credit' && String(l.from).startsWith(String(year)))
  const used = mine.filter((l) => l.status === 'Approved').reduce((s, l) => s + Number(l.days || 0), 0)
  const pending = mine.filter((l) => l.status === 'Applied').reduce((s, l) => s + Number(l.days || 0), 0)
  const total = credit + opening + earned
  return { credit, opening, earned, used, pending, total, left: type.accrual === 'none' ? null : Math.round((total - used) * 2) / 2 }
}
export const LEAVE_STATUS = ['Applied', 'Approved', 'Rejected', 'Cancelled']

// ---------- KPI figures Accord can count for a period (suggestions next to the target)
export function autoKpi(key, db, name, from, to) {
  const inP = (d) => d && d >= from && d <= to
  const users = db.users || []
  switch (key) {
    case 'interactions': return { v: db.interactions.filter((i) => i.by === name && inP(i.date)).length, label: 'interactions logged' }
    case 'visits': return { v: db.interactions.filter((i) => i.by === name && inP(i.date) && ['Site visit', 'Office visit'].includes(i.mode)).length, label: 'site and office visits' }
    case 'bookings': return { v: db.clients.filter((c) => (c.owner === name || (c.coOwners || []).includes(name)) && inP(c.bookingDate)).length, label: 'bookings' }
    case 'teamBookings': { const team = reportsOf(users, name); team.add(name); return { v: db.clients.filter((c) => team.has(c.owner) && inP(c.bookingDate)).length, label: 'team bookings' } }
    case 'followUp': { const act = db.leads.filter((l) => l.owner === name && !['Lost', 'Booked', 'Dormant', 'Closed'].includes(l.stage))
      if (!act.length) return { v: '–', label: 'no active leads' }
      const open = new Set(db.interactions.filter((i) => i.status === 'Open' && i.nextDate).map((i) => i.recordId))
      return { v: Math.round(act.filter((l) => open.has(l.id)).length / act.length * 100) + '%', label: 'of active leads have a next action' } }
    case 'receipts': return { v: db.payments.filter((p) => p.updatedBy === name && inP(p.date)).length, label: 'payments recorded' }
    default: return null
  }
}
export const CYCLE_RANGE = (cycle) => {
  const m = String(cycle).match(/(H1|H2)\s*FY\s*(\d{4})/i); if (!m) return [ymd(new Date(new Date().getFullYear(), 0, 1)), ymd(new Date())]
  const y = Number(m[2]); return m[1].toUpperCase() === 'H1' ? [`${y}-04-01`, `${y}-09-30`] : [`${y}-10-01`, `${y + 1}-03-31`]
}

export const TICKET_CATS = ['Leave or attendance correction', 'Payroll or reimbursement', 'Letter or certificate', 'Accord or IT access', 'Assets', 'Policy question', 'Grievance', 'POSH complaint (confidential)', 'Suggestion']
export const ASSET_TYPES = ['Laptop', 'Mobile phone', 'SIM card', 'ID card', 'Access card or keys', 'Tablet / presentation screen', 'Clicker', 'Vehicle', 'Other']
// personal fields a person may update on their own profile; everything else is HR's
export const SELF_FIELDS = ['personalPhone', 'personalEmail', 'address', 'emergencyName', 'emergencyPhone', 'emergencyRelation', 'bloodGroup', 'dob']
export const PERSONAL_FIELDS = [...SELF_FIELDS, 'bankName', 'bankAccount', 'ifsc', 'pan', 'aadhaar4', 'uan', 'esic', 'opening']

// acknowledged this revision (or one at or after the last material change, for minor revisions)
// rev: a whole number that goes up with every new version (the sheet turns "1.0" into 1, so versions are not compared)
export const revOf = (doc) => Number(doc?.rev || 1)
export const isAcked = (acks, doc, userId) => (acks || []).some((a) => a.userId === userId && a.docId === doc.id && (Number(a.rev || 1) === revOf(doc) || (doc.ackCarry && Number(a.rev || 1) >= Number(doc.ackCarry))))
export const needsAck = (acks, doc, userId) => !!doc.ack && doc.status === 'Approved' && !isAcked(acks, doc, userId)
