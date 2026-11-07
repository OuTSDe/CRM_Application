// 7 Nov: each client's own payment schedule, synced to the construction stages, with RERA (Karnataka) rules.
//
// How a stage payment works (as agreed 7 Nov):
//   a construction stage is completed and certified → a demand letter is sent → payment is due 15 days from the letter.
// Booking is due at booking; the agreement instalment at the (registered) agreement. A stage finished before someone
// booked waits for their registered agreement, because RERA section 13(1) caps collection at 10% before it.
//
// Sources (see the instruction file): Karnataka Agreement for Sale proforma clauses 3, 7.5, 7.6, 9.3 and Schedule C;
// K-RERA model allotment letter clauses 7, 8 and 11; RERA Act sections 13, 18, 19(6), 19(7).
import { n, today, addDays, daysBetween } from './format.js'

// Defaults for every rule, so a database that has never saved them still works. Admin → Settings changes them.
export const DEFAULT_RULES = {
  scheduleMode: 'calls',            // 'calls' = the old project-wide demand calls; 'client' = each client's own schedule
  dueDays: 15,                      // payment window from the letter date (K-RERA model allotment letter uses a 15-day notice)
  interestRates: [],                // [{ from: '2026-11-01', rate: 10.9 }] % a year: SBI highest MCLR + 2%, by date
  interestGraceDays: 0,             // a business choice, not a rule; 0 = interest from the day after the due date
  reminderDaysBefore: 5,
  noticeAfterDays: 15,              // a notice of default this many days after the due date
  noticePeriodDays: 15,             // the notice gives this many days to pay
  defaultDemands: 2,                // AFS clause 9.3: consecutive demands unpaid despite notice (fill from your agreement)
  defaultMonths: 0,                 // AFS clause 9.3: months the default continues before termination (blank in the template)
  terminationNoticeDays: 30,        // AFS clause 9.3: at least 30 days' intimation before cancelling
  agreementWithinDays: 60,          // from the allotment letter; take it from your allotment letter
  section13Cap: 0.10,               // RERA section 13(1)
  bookingCap: 0.05,                 // Karnataka AFS Schedule C note A
  cancellation: {
    allotmentSlabs: [{ upTo: 15, pct: 0 }, { upTo: 30, pct: 0.01 }, { upTo: 60, pct: 0.015 }, { upTo: 99999, pct: 0.02 }],   // K-RERA model allotment letter clause 8
    allotmentRefundDays: 45,        // same clause
    afterAgreementRefundDays: 60,   // AFS clause 7.5
    defaultRefundDays: 60,
    promoterRefundDays: 60,         // section 18, AFS clause 7.6
    bookingAmountPct: 0.05,         // forfeited after agreement (no more than 5% of the consideration)
    gstRefundMode: 'Credit note',   // or 'Buyer to claim'; confirm with the CA each time
    brokerageDeducted: 'No',        // the Karnataka formats allow only the booking amount and interest owed
    coolingDays: 3,
    approvalAbove: 2500000,         // refund or waiver above this needs a second admin
  },
  demandLetter: {
    subject: 'Demand for construction-linked instalment in respect of Flat No(s). {units} · {project}, {location}',
    body: 'With reference to the Agreement for Sale executed between you and {company} (the "Promoter") in respect of the above apartment(s), we request payment of the instalment that has become due on completion of the construction milestone {stage}{cert}.',
    payNote: 'You are requested to remit the amount payable on or before {dueDate} (within {dueDays} days of this letter) by bank transfer / RTGS / NEFT or demand draft in favour of "{company}". Please quote {letterNo} and the flat number(s) in the payment narration and share the transaction reference with us after remittance.',
    tdsNote: 'Where applicable, deduct TDS at 1% under section 194-IA of the Income-tax Act and share Form 16B with us.',
    complianceNote: 'This demand is made in accordance with the payment obligations and timelines recorded in the Agreement for Sale and section 19(6) of the Real Estate (Regulation and Development) Act, 2016, read with the Karnataka Real Estate (Regulation and Development) Rules, 2017. Amounts not paid by the due date carry interest under section 19(7) at the rate prescribed under the Rules{rate}, calculated from the due date to the date of payment.',
    disregardNote: 'If you have already remitted the amount demanded, kindly disregard this request to the extent of the payment received.',
    contactName: '', contactPhone: '', signatoryName: '', signatoryDesignation: 'Authorised Signatory',
  },
}
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x)
export function rulesOf(s = {}) {
  const r = { ...DEFAULT_RULES }
  Object.keys(DEFAULT_RULES).forEach((k) => { if (s[k] !== undefined && s[k] !== null && s[k] !== '') r[k] = isObj(DEFAULT_RULES[k]) && isObj(s[k]) ? { ...DEFAULT_RULES[k], ...s[k] } : s[k] })
  if (s.dueDays !== undefined && s.dueDays !== '') r.dueDays = n(s.dueDays)
  return r
}
export function fillTemplate(str, map) { return String(str || '').replace(/\{(\w+)\}/g, (m, k) => (map[k] === undefined || map[k] === null ? '' : String(map[k]))) }

// What kind of trigger a construction stage is, from its own setting or its name
export function stageTrigger(st) {
  if (st?.trigger) return st.trigger
  const s = String(st?.stage || '')
  if (/booking/i.test(s)) return 'booking'
  if (/agreement/i.test(s)) return 'agreement'
  if (/possession|handover/i.test(s)) return 'handover'
  return 'stage'
}
export const stageReady = (st) => st?.status === 'Completed' && !!(st.certNo || st.certUrl || st.certWaived === 'Yes')

// The rows of a client's plan: their own (custom) plan, else the project's construction-linked plan
export function planRows(c, clpStages) {
  if (Array.isArray(c?.customPlan) && c.customPlan.length) return c.customPlan.map((r, i) => ({ key: r.key || 'C' + (i + 1), stage: r.stage, pct: n(r.pct), fixed: r.fixed ? n(r.fixed) : 0, trigger: r.trigger || (r.clpStage ? 'stage' : 'booking'), clpStage: r.clpStage || '' }))
  return [...(clpStages || [])].sort((a, b) => n(a.no) - n(b.no)).map((st) => ({ key: st.id, stage: st.stage, pct: n(st.pct), fixed: 0, trigger: stageTrigger(st), clpStage: st.id }))
}

// Which rows an older letter covered: a letter now lists its rows; letters from demand calls are matched by stage
export function letterRows(L, calls, clpStages) {
  if (Array.isArray(L.rows) && L.rows.length) return L.rows
  const call = (calls || []).find((x) => x.id === L.callId)
  const st = [...(clpStages || [])].sort((a, b) => n(a.no) - n(b.no))
  const txt = [call?.stage, call?.description, L.stage].filter(Boolean).join(' ')
  const exact = st.find((x) => x.stage && (x.stage === call?.description || x.stage === L.stage))
  if (exact) return [exact.id]
  const m = txt.match(/stages?\s+(\d+)\s*(?:to|-|–)\s*(\d+)/i)
  if (m) return st.filter((x) => n(x.no) >= n(m[1]) && n(x.no) <= n(m[2])).map((x) => x.id)
  const one = txt.match(/stage\s+(\d+)/i)
  if (one) return st.filter((x) => n(x.no) === n(one[1])).map((x) => x.id)
  return []
}

/**
 * One client's schedule.
 * ctx: { rules, gst, clpStages, letters (raw demandLetters), calls, payments (this unit) }
 * Each row: stage, pct, base, gst, amount, ready (date it became demandable), blocked (why not yet), letter, due,
 * projected (planned date), paid, balance, state.
 */
export function clientSchedule(c, ctx) {
  const { rules, gst = 0.05, clpStages = [], letters = [], calls = [], payments = [] } = ctx
  const rows = planRows(c, clpStages)
  const basis = n(c.tc) - n(c.adjustment)
  const stageById = Object.fromEntries(clpStages.map((x) => [x.id, x]))
  const registered = c.agreement === 'Registered'
  const agreeDate = registered ? (c.agreementDate || null) : null
  const mine = letters.filter((L) => (L.bookingId ? L.bookingId === c.bookingId : String(L.unit) === String(c.unit)) && L.status !== 'Withdrawn')
  const rowLetter = {}
  mine.sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((L) => letterRows(L, calls, clpStages).forEach((k) => { if (!rowLetter[k]) rowLetter[k] = L }))
  let left = basis, cum = 0
  const out = rows.map((r, i) => {
    const base = i === rows.length - 1 && !r.fixed ? Math.max(0, Math.round(left)) : Math.round(r.fixed ? r.fixed : basis * r.pct)
    left -= base; cum += r.fixed ? (basis ? r.fixed / basis : 0) : r.pct
    const st = stageById[r.clpStage]
    let ready = null, blocked = ''
    if (r.trigger === 'booking') ready = c.bookingDate || null
    else if (r.trigger === 'agreement') { ready = agreeDate; if (!registered) blocked = 'Agreement not registered yet' }
    else if (r.trigger === 'handover') { ready = c.possessionOfferDate || (stageReady(st) ? st.actual : null) }
    else { if (st?.status === 'Completed' && !stageReady(st)) blocked = 'Stage complete, certificate not attached'; ready = stageReady(st) ? (st.actual || null) : null }
    // a stage finished before the booking is demanded once the agreement is registered (catch-up, section 13)
    if (ready && r.trigger !== 'booking' && c.bookingDate && ready < c.bookingDate) { ready = agreeDate; if (!registered) blocked = 'Catch-up: waits for the registered agreement' }
    // nothing beyond the 10% cap before a registered agreement
    if (ready && !registered && cum > rules.section13Cap + 1e-9 && r.trigger !== 'booking') { blocked = 'Over 10% before a registered agreement (RERA s.13)'; ready = null }
    const L = rowLetter[r.key] || null
    const due = r.trigger === 'booking' ? (c.bookingDate || null) : L ? L.dueDate : r.trigger === 'agreement' ? agreeDate : null
    return { ...r, base, gst: Math.round(base * gst), amount: Math.round(base * (1 + gst)), cum, ready, blocked, letter: L?.id || null, letterDate: L?.date || null, due,
      projected: st?.planned || null, stageStatus: st?.status || '' }
  })
  // receipts (counted, plus TDS) settle the oldest instalment first
  const counted = payments.filter((p) => p.counted === 'Yes' && p.ledgerOnly !== 'Yes')
  let pool = counted.reduce((a, p) => a + n(p.amount) + n(p.tds), 0)
  const t = today()
  return out.map((r) => {
    const paid = Math.min(r.amount, pool); pool -= paid
    const bal = r.amount - paid
    const state = bal <= 0.5 ? 'Paid'
      : r.blocked ? r.blocked
      : !r.ready ? 'Upcoming'
      : !r.due ? (r.trigger === 'stage' || r.trigger === 'handover' ? 'Letter not sent' : 'Due, date not set')
      : r.due < t ? (paid > 0 ? 'Part paid, overdue' : 'Overdue')
      : paid > 0 ? 'Part paid' : 'Due'
    return { ...r, paid, balance: Math.max(0, bal), state }
  })
}

// Totals the CRM screens use, from a schedule
export function scheduleSummary(rows) {
  const t = today()
  const demanded = rows.filter((r) => r.due).reduce((a, r) => a + r.amount, 0)
  const paid = rows.reduce((a, r) => a + r.paid, 0)
  const firstUnpaid = rows.find((r) => r.due && r.balance > 0.5) || null
  const due = firstUnpaid?.due || null
  const overdue = due ? Math.max(0, daysBetween(due)) : 0
  const pendingLetter = rows.filter((r) => r.state === 'Letter not sent')
  const next = rows.find((r) => !r.ready && !r.blocked && r.balance > 0.5) || null
  return { demanded, paid, outstanding: demanded - Math.min(paid, demanded), firstUnpaid, due, overdue,
    age: !firstUnpaid ? (pendingLetter.length ? 'Letter not sent' : 'Paid up') : due > t ? 'Not yet due' : overdue <= 30 ? '0-30 days' : overdue <= 60 ? '31-60 days' : '60+ days',
    pendingLetter, next, overdueRows: rows.filter((r) => /overdue/i.test(r.state)) }
}

const rateOn = (rates, day) => { const r = [...(rates || [])].filter((x) => x.from && x.rate !== '' && x.rate !== undefined).sort((a, b) => String(a.from).localeCompare(String(b.from))); let v = 0; r.forEach((x) => { if (x.from <= day) v = n(x.rate) }); return v }
export const currentRate = (rules) => rateOn(rules.interestRates, today())

/**
 * Interest on late payment (section 19(7)): simple interest per day on each instalment's unpaid part, from the day
 * after its due date (plus any grace) to the day it is paid, at the rate in force each day.
 * Receipts are applied oldest instalment first, on the date received.
 */
export function lateInterest(rows, payments, rules, asOf = today()) {
  const grace = n(rules.interestGraceDays)
  const recs = payments.filter((p) => p.counted === 'Yes' && p.ledgerOnly !== 'Yes' && p.date).map((p) => ({ date: String(p.date).slice(0, 10), amt: n(p.amount) + n(p.tds) })).sort((a, b) => a.date.localeCompare(b.date))
  const bal = rows.map((r) => r.amount)
  const per = rows.map(() => 0)
  const starts = rows.map((r) => (r.due ? addDays(r.due, grace) : null))
  const first = starts.filter(Boolean).sort()[0]
  if (!first) return { total: 0, per }
  // receipts before the first due date simply reduce the balances
  const take = (amt) => { for (let i = 0; i < bal.length && amt > 0; i++) { const x = Math.min(bal[i], amt); bal[i] -= x; amt -= x } }
  let ri = 0
  while (ri < recs.length && recs[ri].date <= first) take(recs[ri++].amt)
  let day = first
  let guard = 0
  while (day < asOf && guard++ < 4000) {
    while (ri < recs.length && recs[ri].date <= day) take(recs[ri++].amt)
    const rate = rateOn(rules.interestRates, day) / 100 / 365
    if (rate) rows.forEach((r, i) => { if (starts[i] && starts[i] <= day && bal[i] > 0.5) per[i] += bal[i] * rate })
    day = addDays(day, 1)
  }
  return { total: Math.round(per.reduce((a, x) => a + x, 0)), per: per.map(Math.round) }
}

// Reminders and notices for one client from its schedule (3C of the instructions)
export function collectionSteps(rows, rules, t = today()) {
  const out = []
  rows.forEach((r) => {
    if (!r.due || r.balance <= 0.5) return
    const late = daysBetween(r.due, t)
    if (late < 0 && -late <= n(rules.reminderDaysBefore)) out.push({ row: r.key, kind: 'reminder', label: `Reminder: ${r.stage} due ${r.due}` })
    if (late === 0) out.push({ row: r.key, kind: 'due', label: `Due today: ${r.stage}` })
    if (late >= n(rules.noticeAfterDays)) out.push({ row: r.key, kind: 'notice', label: `Notice of default due: ${r.stage} unpaid ${late} days after the due date` })
  })
  const unpaidLetters = new Set(rows.filter((r) => r.letter && r.due && r.due < t && r.balance > 0.5).map((r) => r.letter))
  if (unpaidLetters.size >= n(rules.defaultDemands || 2)) out.push({ kind: 'default', label: `${unpaidLetters.size} demands unpaid: event of default (AFS clause 9.3); termination needs ${rules.terminationNoticeDays} days' notice` })
  return out
}

/**
 * Cancellation: which path applies and the most that may be deducted (3D of the instructions).
 * A: client cancels before the agreement (allotment-letter stage) · B: client withdraws after the agreement
 * C: developer cancels for default · D: developer at fault (section 18)
 */
export function cancellationCalc(c, { rules, payments = [], initiatedBy = 'Client', promoterFault = false, onDate = today(), interestOwed = 0, brokeragePaid = 0, waivers = {} }) {
  const R = rules.cancellation
  const basis = n(c.tc) - n(c.adjustment)
  const counted = payments.filter((p) => p.counted === 'Yes' && p.ledgerOnly !== 'Yes')
  const cash = counted.reduce((a, p) => a + n(p.amount), 0)
  const tds = counted.reduce((a, p) => a + n(p.tds), 0)
  const received = cash + tds
  const agreed = ['Signed', 'Registered'].includes(c.agreement)
  const path = promoterFault ? 'D' : initiatedBy === 'Developer' ? 'C' : agreed ? 'B' : 'A'
  let deductionCap = 0, refundDays = 0, basisText = ''
  if (path === 'A') {
    const from = c.allotmentDate || c.bookingDate
    const days = from ? Math.max(0, daysBetween(from, onDate)) : 9999
    const slab = (R.allotmentSlabs || []).find((s) => days <= n(s.upTo)) || (R.allotmentSlabs || []).slice(-1)[0] || { pct: 0 }
    deductionCap = Math.round(basis * n(slab.pct)); refundDays = n(R.allotmentRefundDays)
    basisText = `${days} days after the ${c.allotmentDate ? 'allotment letter' : 'booking (allotment date not recorded)'}: ${(n(slab.pct) * 100).toFixed(1)}% of the unit cost (K-RERA model allotment letter, clause 8)`
  } else if (path === 'B') {
    deductionCap = Math.round(basis * n(R.bookingAmountPct)); refundDays = n(R.afterAgreementRefundDays)
    basisText = `Booking amount ${(n(R.bookingAmountPct) * 100).toFixed(1)}% of the consideration (Karnataka AFS clause 7.5)`
  } else if (path === 'C') {
    deductionCap = Math.round(basis * n(R.bookingAmountPct)); refundDays = n(R.defaultRefundDays)
    basisText = `Booking amount and interest owed (Karnataka AFS clause 9.3); ${rules.terminationNoticeDays} days' notice must have been given`
  } else {
    deductionCap = 0; refundDays = n(R.promoterRefundDays)
    basisText = 'Developer at fault (RERA section 18; AFS clause 7.6): full refund with interest, no deduction'
  }
  const lines = [
    { key: 'forfeit', label: path === 'A' ? 'Cancellation charge' : 'Booking amount forfeited', amount: Math.min(deductionCap, received), cap: deductionCap },
    ...(path === 'C' ? [{ key: 'interest', label: 'Interest owed on late payments', amount: Math.round(n(interestOwed)) }] : []),
    ...(R.brokerageDeducted === 'Yes' && path !== 'D' ? [{ key: 'brokerage', label: 'Channel-partner brokerage (only if your agreement allows it)', amount: Math.round(n(brokeragePaid)) }] : []),
  ].map((l) => { const w = n(waivers[l.key]); return { ...l, waived: Math.min(w, l.amount), net: Math.max(0, l.amount - w) } })
  const deductions = lines.reduce((a, l) => a + l.net, 0)
  const refundCash = Math.max(0, cash - deductions)
  return { path, basisText, basis, cash, tds, received, lines, deductions, refundCash, refundDays, refundDue: addDays(onDate, refundDays),
    waived: lines.reduce((a, l) => a + l.waived, 0), gstMode: R.gstRefundMode,
    notes: [
      tds > 0 ? `TDS of ₹${Math.round(tds).toLocaleString('en-IN')} was deposited on the client's PAN; it is not refunded by the developer (the client claims it in their return).` : null,
      `GST: ${R.gstRefundMode === 'Credit note' ? 'issue a credit note within the section 34 CGST time limit for each invoice, then refund the GST' : 'outside the credit-note time limit the buyer applies to the government for the GST refund'}. Confirm with the CA.`,
      c.agreement === 'Registered' ? 'The agreement is registered: a registered cancellation deed is needed.' : null,
      /loan/i.test(c.funding || '') ? 'Bank loan: refund goes first to the lender up to the loan outstanding; get the bank NOC / loan closure letter.' : null,
    ].filter(Boolean) }
}
