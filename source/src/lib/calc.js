import { useMemo } from 'react'
import { n, today, daysBetween, addDays } from './format.js'
import { useStore } from './store.jsx'
import { META } from './seed.js'

const PROFILE_FIELDS = ['name', 'coapp', 'buyerType', 'phone', 'whatsapp', 'email', 'address', 'city', 'country', 'residency', 'pan', 'aadhaar4', 'dob',
  'language', 'contactPref', 'purpose', 'occupant', 'funding', 'occupation', 'employer', 'income', 'marital', 'familyProfile', 'decisionMaker', 'source', 'owner']
export const NON_BILLED = ['To verify', 'Cancelled', 'Under cancellation']
export const BOOKED = ['Active', 'Shifted unit', 'Registered', 'Possession handed over']

// Everything the CRM screens compute from raw records, in one place.
export function deriveCrm(db) {
  const s = db.settings[0] || {}
  const gst = n(s.gstDemand ?? 0.05), dueDays = n(s.dueDays ?? 15), rera = n(s.rera ?? 0.1), contactRed = n(s.contactRed ?? 30)
  const units = {}; db.units.forEach((u) => (units[u.unit] = u))
  const recvByUnit = {}, payByUnit = {}, tdsByUnit = {}
  db.payments.forEach((p) => {
    const u = p.unit; if (!u) return
    ;(payByUnit[u] = payByUnit[u] || []).push(p)
    if (p.counted === 'Yes') recvByUnit[u] = (recvByUnit[u] || 0) + n(p.amount)
    tdsByUnit[u] = (tdsByUnit[u] || 0) + n(p.tds)
  })
  Object.values(payByUnit).forEach((l) => l.sort((a, b) => String(a.date).localeCompare(String(b.date))))
  const ints = {}
  db.interactions.forEach((i) => { if (i.recordId) (ints[i.recordId] = ints[i.recordId] || []).push(i) })
  Object.values(ints).forEach((l) => l.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.time || '').localeCompare(String(a.time || ''))))
  const contact = (rid) => {
    const l = ints[rid] || []
    const dated = l.filter((i) => i.date)
    const open = l.filter((i) => i.status === 'Open' && i.nextDate).sort((a, b) => a.nextDate.localeCompare(b.nextDate))
    return { list: l, last: dated[0] || null, lastDate: dated[0]?.date || null, days: dated[0] ? daysBetween(dated[0].date) : null, next: open[0] || null, count: l.length,
      lastSite: dated.find((i) => i.mode === 'Site visit')?.date || null }
  }
  const calls = [...db.demandCalls].filter((c) => n(c.pct) > 0)
  const cum = []; let acc = 0
  calls.forEach((c) => { acc += n(c.pct); cum.push({ ...c, cum: acc, due: c.raisedOn ? addDays(c.raisedOn, dueDays) : null }) })
  const billedPct = acc
  const docs = {}; db.documents.forEach((d) => (docs[d.bookingId] = d))
  const docKeys = META.docTypes.map((t) => t.key)
  const openIssues = {}; db.issues.forEach((i) => { if (i.unit && !['Resolved', "Won't fix"].includes(i.status)) openIssues[i.unit] = (openIssues[i.unit] || 0) + 1 })

  const clients = db.clients.map((c) => {
    const u = units[c.unit] || {}
    const received = recvByUnit[c.unit] || 0
    const tc = n(c.tc), basis = tc - n(c.adjustment)
    const billed = NON_BILLED.includes(c.status) ? 0 : billedPct
    const demand = basis * billed * (1 + gst)
    const outstanding = demand - received
    let firstUnpaid = null, due = null, overdue = 0, age = 'Paid up'
    if (outstanding > 0) {
      const covered = cum.filter((k) => basis * k.cum * (1 + gst) <= received).length
      firstUnpaid = cum[covered] || null; due = firstUnpaid?.due || null
      overdue = due ? Math.max(0, daysBetween(due)) : 0
      age = !due ? 'Due, date not set' : overdue === 0 ? 'Not yet due' : overdue <= 30 ? '0-30 days' : overdue <= 60 ? '31-60 days' : '60+ days'
    }
    const pct = tc ? received / tc : 0
    const ct = contact(c.clientId)
    const dd = docs[c.bookingId]?.items || {}
    const applicable = docKeys.filter((k) => !['Not applicable', 'Not yet due'].includes(dd[k]))
    const done = applicable.filter((k) => ['Received', 'Verified'].includes(dd[k])).length
    const docPct = applicable.length ? done / applicable.length : 0
    const filled = PROFILE_FIELDS.filter((f) => c[f] !== undefined && c[f] !== null && c[f] !== '').length
    const profilePct = filled / PROFILE_FIELDS.length
    const reraFlag = pct > rera && c.agreement !== 'Registered' ? (c.agreement === 'Signed' ? 'Check registration' : 'Yes') : ''
    const red = [], amber = []
    if (overdue > 60) red.push('Overdue 60+ days')
    if (reraFlag === 'Yes') red.push('Over 10% paid without agreement')
    if (c.status === 'Under cancellation') red.push('Under cancellation')
    if (ct.days !== null && ct.days > contactRed) red.push(`No contact in ${contactRed}+ days`)
    if (overdue > 0 && overdue <= 60) amber.push('Overdue')
    if (reraFlag === 'Check registration') amber.push('Agreement registration to verify')
    if (docPct < 0.5) amber.push('Documents under 50%')
    if (openIssues[c.unit]) amber.push('Open data issues')
    if (profilePct < 0.5) amber.push('Profile under 50%')
    if (ct.days === null) amber.push('No contact logged yet')
    const health = red.length ? 'Red' : amber.length ? 'Amber' : 'Green'
    return { ...c, u, config: u.type, floor: u.floor, band: u.band, area: u.area, received, basis, demand, outstanding, firstUnpaid, due, overdue, age, pct,
      contact: ct, docPct, docsDone: done, docsApplicable: applicable.length, profilePct, reraFlag, red, amber, health, payments: payByUnit[c.unit] || [],
      tds: tdsByUnit[c.unit] || 0, issues: openIssues[c.unit] || 0, variance: c.receivedPerCollections !== undefined ? received - n(c.receivedPerCollections) : null }
  })
  const byUnit = {}; clients.forEach((c) => (byUnit[c.unit] = c))
  const leads = db.leads.map((l) => ({ ...l, contact: contact(l.id) }))
  return { clients, byUnit, leads, units: db.units, cum, billedPct, gst, contact, recvByUnit }
}
export function useCrm() {
  const { db } = useStore()
  return useMemo(() => deriveCrm(db), [db])
}

// Cost sheet maths (rate card from Settings; floor rise from the configured start floor)
export function costSheet({ unit, rateCard, rate, discountPct = 0, plc = 0, terrace = 0, parking = 1, funding = 'Self', plans, roundTo = 0 }) {
  const area = n(unit?.area)
  const base = n(rate ?? rateCard.baseRate) * (1 - n(discountPct) / 100)
  const riseFloors = Math.max(0, n(unit?.floor) - n(rateCard.floorRiseStart))
  const riseRate = riseFloors * n(rateCard.floorRisePerFloor)
  const lines = [
    { label: 'Indicative saleable area and base rate', qty: area, rate: base, amount: area * base },
    { label: `Floor rise (${riseFloors} floors above ${rateCard.floorRiseStart} × ₹${rateCard.floorRisePerFloor})`, qty: area, rate: riseRate, amount: area * riseRate },
    { label: 'Preferential location charges (PLC)', qty: plc ? area : 0, rate: n(plc), amount: plc ? area * n(plc) : 0 },
    { label: 'Private terrace area charge', qty: n(terrace || unit?.terrace), rate: n(rateCard.terraceRate), amount: n(terrace || unit?.terrace) * n(rateCard.terraceRate) },
    // 2 Nov: the car parks that come with the type, and additional ones at their own rate (Admin → rate card)
    ...(() => { const ent = Math.min(n(parking), n(rateCard.parkingSlots?.[unit?.type] ?? 1)), extra = Math.max(0, n(parking) - ent), xr = n(rateCard.parkingExtraRate || rateCard.parkingRate)
      return [{ label: 'Covered car parking', qty: ent, rate: n(rateCard.parkingRate), amount: ent * n(rateCard.parkingRate) }, { label: 'Additional car parking', qty: extra, rate: xr, amount: extra * xr }] })(),
  ]
  const av = lines.reduce((s, l) => s + l.amount, 0)
  const gstA = av * n(rateCard.gst)
  const partA = av + gstA
  const other = [
    { label: 'MWSSB and MESCOM charges', qty: area, rate: n(rateCard.mwssb), amount: area * n(rateCard.mwssb) },
    { label: 'Clubhouse membership charges', qty: 1, rate: n(rateCard.clubhouse), amount: n(rateCard.clubhouse) },
    { label: 'Advance maintenance', qty: area, rate: n(rateCard.maintenance), amount: area * n(rateCard.maintenance) },
    { label: 'Sinking fund', qty: area, rate: n(rateCard.sinking), amount: area * n(rateCard.sinking) },
  ]
  const ob = other.reduce((s, l) => s + l.amount, 0)
  const gstB = ob * n(rateCard.gst)
  const partB = ob + gstB
  const exact = partA + partB
  // optional round figure (admins and senior sales only, 2 Nov): to the nearest 1,000 / 10,000 / 1,00,000, or a typed figure
  const total = n(roundTo) > 1000000 ? n(roundTo) : n(roundTo) > 0 ? Math.round(exact / n(roundTo)) * n(roundTo) : exact
  const roundAdj = total - exact
  const plan = (plans?.[funding] || plans?.Self || []).map((p) => ({ ...p, amount: Math.round(total * n(p.pct)) }))
  return { area, base, riseFloors, riseRate, lines, av, gstA, partA, other, ob, gstB, partB, total, exact, roundAdj, plan }
}

export function attendanceSummary(rows) {
  const mins = (a, b) => { if (!a || !b) return 0; const [h1, m1] = a.split(':').map(Number); const [h2, m2] = b.split(':').map(Number); return h2 * 60 + m2 - (h1 * 60 + m1) }
  return rows.map((r) => ({ ...r, minutes: mins(r.in, r.out) }))
}
export { today }
