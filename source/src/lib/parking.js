// 8 Nov: car parking inventory and allotment, built from the architect's parking drawings (24.07.2026).
//
// Numbering. Every covered slot keeps its drawing number and gets the level in front: G-012, L1-072, L1-072A.
//   G = ground floor (+4.860), L1 / L2 / L3 = first, second and third floor parking decks.
//   "A" is the rear slot of a tandem (dependent) pair; it can only be reached through the front slot with the same number.
//   Accessible bays are G-H1 to G-H3. Open bays on the ground: visitors V-01 to V-36 (V-01 to V-20 have EV charging)
//   and surface S-01 to S-26. Two-wheeler bays TW-01 to TW-95.
//
// Allotment logic (see planAllotment):
//   1. A tandem pair is never split between two residences. A residence with one car park gets a single slot only.
//   2. A residence entitled to two car parks gets one tandem pair; three gets a pair and a single; and so on.
//   3. Slots are ranked by convenience: straight-line walk to the tower lobby on that level, plus a penalty for each
//      ramp level above the ground (settings.parking.levelPenalty, 30 m by default).
//   4. The ranked inventory is zoned by tower band, premium bands first (Crown, Signature, Panorama ... Podium and typical),
//      sized to every residence in the band, sold or not. Unsold residences keep their band's share for later buyers.
//   5. Inside its band, a booking takes the best free slot in booking-date order (earliest first; undated bookings last).
//      A household's second slot goes as near its first as possible.
//   6. Nothing already allotted is moved. Locked slots (allotment letter issued) never change. "To verify" bookings get
//      Provisional slots. Under cancellation, cancelled and transferred bookings get none.
//   7. Accessible, visitor, surface and two-wheeler bays are not auto-allotted. Spare pairs and singles form the sale pool
//      for additional car parks (rate card: parkingExtraRate / parkingRate).
import { PARKING_SOURCE } from './parkingData.js'
import { BOOKED } from './calc.js'
import { today } from './format.js'

export const LEVELS = PARKING_SOURCE.levels
export const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.code, l]))
export const SLOT_DEFS = PARKING_SOURCE.slots
export const SLOT_DEF = Object.fromEntries(SLOT_DEFS.map((s) => [s.id, s]))
export const PARKING_FIXES = PARKING_SOURCE.fixes
export const PARKING_DRAWING = PARKING_SOURCE.drawing
export const LEVEL_ORDER = ['G', 'L1', 'L2', 'L3']
export const COVERED = ['Single', 'Tandem front', 'Tandem rear', 'Accessible']
export const OPEN_KINDS = ['Visitor', 'Surface', 'Two-wheeler']
export const PARKING_DEFAULTS = { levelPenalty: 30, pairsForTwo: 'Yes', provisional: ['To verify'], bandOrder: 'Premium first', withinBand: 'Booking date' }
export const parkingRules = (settings) => ({ ...PARKING_DEFAULTS, ...(settings?.parking || {}) })

export const isCovered = (s) => COVERED.includes(s.kind)
export const isTandem = (s) => s.kind === 'Tandem front' || s.kind === 'Tandem rear'
export const levelName = (code) => LEVEL[code]?.name || code
export const slotLabel = (s) => `${s.id}${isTandem(s) ? (s.kind === 'Tandem rear' ? ' (rear of ' + s.pair + ')' : ' (front of ' + s.pair + ')') : ''}`
export const RELEASE = { unit: '', clientId: '', bookingId: '', name: '', assignedOn: '', status: 'Free', allotStatus: '', locked: '', letterOn: '', allotNote: '' }

// The records Accord stores in the parking collection. Coordinates stay in the drawing data, not in the sheet.
export function inventoryRecords() {
  return SLOT_DEFS.map((s) => ({
    id: s.id, level: levelName(s.level), levelCode: s.level, no: s.no, kind: s.kind, pair: s.pair || '', walk: s.walk,
    type: s.kind === 'Single' ? 'Covered' : isTandem(s) ? 'Tandem' : s.kind, ev: s.ev || '',
    status: OPEN_KINDS.includes(s.kind) && s.kind !== 'Two-wheeler' ? 'Common' : 'Free', unit: '', clientId: '', bookingId: '', name: '', assignedOn: '', zone: '',
  }))
}
// A stored record joined with its drawing position.
export const withDef = (p) => { const code = p.levelCode || SLOT_DEF[p.id]?.level; return { ...SLOT_DEF[p.id], ...p, levelCode: code, level: LEVEL[code]?.name || p.level } }

// 12 Nov: what of the drawing is actually in the sheet. The first load on 7 Nov stopped after 260 of 703 slots
// (ground and part of the 1st floor podium), so check level by level and say what is missing.
export function inventoryStatus(parking) {
  const have = new Set((parking || []).map((p) => p.id))
  const rows = [...LEVELS.map((l) => ({ code: l.code, name: l.name, kinds: COVERED })), { code: 'OPEN', name: 'Open bays (visitor, surface, two-wheeler)', kinds: OPEN_KINDS }]
    .map((r) => { const defs = SLOT_DEFS.filter((s) => r.kinds.includes(s.kind) && (r.code === 'OPEN' || s.level === r.code))
      return { ...r, expected: defs.length, loaded: defs.filter((s) => have.has(s.id)).length } })
  const missing = rows.reduce((a, r) => a + r.expected - r.loaded, 0)
  return { rows, missing, complete: missing === 0, loaded: SLOT_DEFS.length - missing, total: SLOT_DEFS.length }
}
// Every slot on the drawings, using the sheet's record where there is one, so a quote never runs short because a load stopped.
export function fullInventory(parking) {
  const by = Object.fromEntries((parking || []).map((p) => [p.id, p]))
  return inventoryRecords().map((r) => by[r.id] || r)
}

export function slotScore(s, rules) {
  const lv = LEVEL_ORDER.indexOf(s.levelCode || s.level)
  return Number(s.walk || 0) + Math.max(0, lv) * Number(rules.levelPenalty ?? 30)
}

// Bands from the units list, premium first (highest starting floor first).
export function bandsOf(units) {
  const m = {}
  units.forEach((u) => { const b = u.band || 'Unbanded'; (m[b] = m[b] || { band: b, min: 999, units: [] }).units.push(u); m[b].min = Math.min(m[b].min, Number(u.floor) || 0) })
  return Object.values(m).sort((a, b) => b.min - a.min)
}
export const bandShort = (b) => String(b || '').split('|').pop().trim() || b

export function entitlementOf(c, unit, settings) {
  const own = Number(c?.parkingEntitlement)
  if (own > 0 || c?.parkingEntitlement === 0 || c?.parkingEntitlement === '0') return own
  return Number(settings?.rateCard?.parkingSlots?.[unit?.type || c?.config] ?? 1)
}
export function needOf(ent, rules) {
  const e = Math.max(0, Number(ent) || 0)
  if (rules.pairsForTwo !== 'Yes') return { pairs: 0, singles: e }
  return { pairs: Math.floor(e / 2), singles: e % 2 }
}
const dist = (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)) + (a.levelCode === b.levelCode ? 0 : 1000)

// Plans the allotment. Returns the proposed changes; nothing is saved here.
//   parking: stored records; clients: derived CRM clients (with config, band); units: all residences.
export function planAllotment({ parking, clients, units, settings }) {
  const rules = parkingRules(settings)
  const recs = parking.map(withDef).filter((p) => p.x !== undefined)
  const byId = Object.fromEntries(recs.map((p) => [p.id, p]))
  const unitOf = Object.fromEntries(units.map((u) => [String(u.unit), u]))
  const bands = bandsOf(units)
  const bandIx = Object.fromEntries(bands.map((b, i) => [b.band, i]))
  const clientOfUnit = {}
  clients.forEach((c) => { if (BOOKED.includes(c.status) || rules.provisional.includes(c.status)) clientOfUnit[String(c.unit)] = c })
  const takenBy = {}   // unit -> [slot]
  recs.forEach((p) => { if (p.unit) (takenBy[String(p.unit)] = takenBy[String(p.unit)] || []).push(p) })
  const usable = (p) => !p.unit && p.status !== 'Blocked' && p.status !== 'Common' && p.locked !== 'Yes'
  const score = (p) => slotScore(p, rules)
  // ties go to the lower level, then the lower drawing number, so the plan is the same whatever order the sheet returns
  const cmp = (a, b) => score(a) - score(b) || LEVEL_ORDER.indexOf(a.levelCode) - LEVEL_ORDER.indexOf(b.levelCode) || String(a.no).localeCompare(String(b.no), undefined, { numeric: true })

  // ---- zones: every residence's need, premium bands first
  const singles = recs.filter((p) => p.kind === 'Single').sort(cmp)
  const fronts = recs.filter((p) => p.kind === 'Tandem front').sort(cmp)
  const need = {}   // band -> { singles, pairs }
  units.forEach((u) => {
    const c = clientOfUnit[String(u.unit)]
    const nd = needOf(entitlementOf(c, u, settings), rules)
    const have = takenBy[String(u.unit)] || []
    const hp = have.filter((p) => p.kind === 'Tandem front').length, hs = have.filter((p) => p.kind === 'Single').length
    const b = (need[u.band || 'Unbanded'] = need[u.band || 'Unbanded'] || { singles: 0, pairs: 0 })
    b.pairs += Math.max(0, nd.pairs - hp); b.singles += Math.max(0, nd.singles - hs)
  })
  const zone = {}
  recs.forEach((p) => { if (p.unit) { const u = unitOf[String(p.unit)]; zone[p.id] = u?.band || 'Sale pool' } })
  const fill = (list, key) => {
    const free = list.filter((p) => !zone[p.id] && p.status !== 'Blocked')
    let i = 0
    bands.forEach((b) => { const k = need[b.band]?.[key] || 0; for (let j = 0; j < k && i < free.length; j++, i++) zone[free[i].id] = b.band })
    for (; i < free.length; i++) zone[free[i].id] = 'Sale pool'
  }
  fill(singles, 'singles'); fill(fronts, 'pairs')
  recs.forEach((p) => { if (p.kind === 'Tandem rear' && p.pair && zone[p.pair]) zone[p.id] = zone[p.pair] })

  // ---- allot, band by band, earliest booking first
  const order = Object.values(clientOfUnit).filter((c) => unitOf[String(c.unit)]).sort((a, b) => {
    const ba = bandIx[unitOf[String(a.unit)].band] ?? 99, bb = bandIx[unitOf[String(b.unit)].band] ?? 99
    if (ba !== bb) return ba - bb
    const da = a.bookingDate || '9999', dbb = b.bookingDate || '9999'
    return rules.withinBand === 'Floor' ? (Number(unitOf[String(b.unit)].floor) - Number(unitOf[String(a.unit)].floor)) || da.localeCompare(dbb)
      : da.localeCompare(dbb) || String(a.bookingId).localeCompare(String(b.bookingId), undefined, { numeric: true })
  })
  const used = new Set()
  const moves = [], short = [], rows = []
  const ofClient = {}   // a client with more than one residence keeps their slots together
  recs.forEach((p) => { if (p.clientId) (ofClient[p.clientId] = ofClient[p.clientId] || []).push(p) })
  const pick = (list, band, near) => {
    const ok = list.filter((p) => usable(p) && !used.has(p.id) && (p.kind !== 'Tandem front' || (byId[p.pair] && usable(byId[p.pair]) && !used.has(p.pair))))
    const tier = [ok.filter((p) => zone[p.id] === band), ok.filter((p) => zone[p.id] === 'Sale pool'), ok]
    for (let t = 0; t < tier.length; t++) {
      if (!tier[t].length) continue
      const best = near ? [...tier[t]].sort((a, b) => dist(a, near) - dist(b, near) || cmp(a, b))[0] : tier[t][0]
      return { slot: best, outside: t > 0 ? (t === 1 ? 'from the sale pool' : 'outside its band zone') : '' }
    }
    return null
  }
  order.forEach((c) => {
    const u = unitOf[String(c.unit)], band = u.band
    const ent = entitlementOf(c, u, settings), nd = needOf(ent, rules)
    const have = takenBy[String(c.unit)] || []
    let pairs = Math.max(0, nd.pairs - have.filter((p) => p.kind === 'Tandem front').length)
    let sing = Math.max(0, nd.singles - have.filter((p) => p.kind === 'Single').length)
    const status = rules.provisional.includes(c.status) ? 'Provisional' : 'Allotted'
    const got = []
    let anchor = have[0] || (ofClient[c.clientId] || [])[0] || null
    const add = (p, why) => { const q = { ...p, unit: c.unit }; used.add(p.id); got.push(p.id); (ofClient[c.clientId] = ofClient[c.clientId] || []).push(q); moves.push({ id: p.id, unit: c.unit, clientId: c.clientId, bookingId: c.bookingId, name: c.name, allotStatus: status, zone: zone[p.id], why }); anchor = anchor || q }
    for (; pairs > 0; pairs--) {
      const r = pick(fronts, band, anchor)
      if (!r) { sing += 2; continue }   // no pair left: fall back to two singles
      add(r.slot, 'Tandem pair' + (r.outside ? ', ' + r.outside : '')); add(byId[r.slot.pair], 'Rear of ' + r.slot.id)
    }
    for (; sing > 0; sing--) {
      const r = pick(singles, band, anchor)
      if (!r) { short.push({ unit: c.unit, name: c.name, missing: sing }); break }
      add(r.slot, (anchor ? 'Nearest free to ' + anchor.id + (String(anchor.unit || c.unit) !== String(c.unit) ? ' (same client, ' + anchor.unit + ')' : '') : 'Best free in ' + bandShort(band)) + (r.outside ? ', ' + r.outside : ''))
    }
    rows.push({ unit: c.unit, name: c.name, clientId: c.clientId, bookingId: c.bookingId, status: c.status, bookingDate: c.bookingDate || '', type: u.type, floor: u.floor,
      band: bandShort(band), ent, had: have.map((p) => p.id), got, allotStatus: status })
  })
  const zoneOf = (id) => zone[id] || ''
  const summary = bands.map((b) => {
    const z = recs.filter((p) => zone[p.id] === b.band)
    return { band: bandShort(b.band), units: b.units.length, singles: z.filter((p) => p.kind === 'Single').length, pairs: z.filter((p) => p.kind === 'Tandem front').length,
      best: z.length ? Math.min(...z.map((p) => Math.round(score(p)))) : null, worst: z.length ? Math.max(...z.map((p) => Math.round(score(p)))) : null }
  })
  const pool = recs.filter((p) => zone[p.id] === 'Sale pool')
  return { rules, moves, short, rows, zoneOf, zones: zone, summary, pool: { singles: pool.filter((p) => p.kind === 'Single').length, pairs: pool.filter((p) => p.kind === 'Tandem front').length } }
}

// Saves a plan: zones on every slot, and the new allotments.
export function applyPlan(plan, parking, upsert, user) {
  const on = today()
  const mv = Object.fromEntries(plan.moves.map((m) => [m.id, m]))
  let k = 0
  parking.forEach((p) => {
    const m = mv[p.id], z = plan.zones[p.id] || ''
    if (m) { upsert('parking', { ...p, unit: m.unit, clientId: m.clientId, bookingId: m.bookingId, name: m.name, allotStatus: m.allotStatus, status: m.allotStatus, assignedOn: on, assignedBy: user?.name || '', zone: z, allotNote: m.why }, { silent: true }); k++ }
    else if ((p.zone || '') !== z && isCovered(p)) upsert('parking', { ...p, zone: z }, { silent: true })
  })
  return k
}

// Who holds what, for the Client 360 card and the letter.
export const slotsOfUnit = (parking, unit) => parking.filter((p) => String(p.unit) === String(unit)).map(withDef)
  .sort((a, b) => LEVEL_ORDER.indexOf(a.levelCode) - LEVEL_ORDER.indexOf(b.levelCode) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))

// 8 Nov (2): the slots a cost sheet can promise. The residence is planned as if it were booked today, after every
// existing booking, so the answer is what the allotment would give it now. Indicative until the booking is allotted.
export function proposeForUnit({ parking, clients, units, settings, unit, count, clientId = 'QUOTE' }) {
  const inv = fullInventory(parking)
  const u = units.find((x) => String(x.unit) === String(unit))
  if (!u || !(Number(count) > 0)) return { slots: [], note: '' }
  const own = clients.find((c) => String(c.unit) === String(unit) && (BOOKED.includes(c.status) || c.status === 'To verify'))
  const have = inv.filter((p) => String(p.unit) === String(unit))
  const others = clients.filter((c) => String(c.unit) !== String(unit))
  const me = { ...(own || {}), unit: u.unit, clientId: own?.clientId || clientId, bookingId: own?.bookingId || 'QUOTE', name: own?.name || 'Quote', status: 'Active', bookingDate: own?.bookingDate || '9999-12-30', parkingEntitlement: Number(count), config: u.type }
  const plan = planAllotment({ parking: inv, clients: [...others, me], units, settings })
  const mine = plan.moves.filter((m) => String(m.unit) === String(unit)).map((m) => ({ ...withDef(inv.find((p) => p.id === m.id)), why: m.why }))
  const row = plan.rows.find((r) => String(r.unit) === String(unit))
  const slots = [...have.map(withDef), ...mine]
  return { slots, short: plan.short.find((s) => String(s.unit) === String(unit))?.missing || 0, band: row?.band || '', note: have.length ? 'Already allotted' : 'Indicative: confirmed when the booking is allotted' }
}

// Can the building carry the car parks promised? Every residence needs its own count (sold: what it bought; unsold:
// the rate card). A lone car park needs a single slot; pairs of car parks can use tandem pairs or two singles.
export function capacity({ units, clients, settings, extra = [] }) {
  const rules = parkingRules(settings)
  const sold = {}
  clients.forEach((c) => { if (BOOKED.includes(c.status) || rules.provisional.includes(c.status)) sold[String(c.unit)] = c })
  let total = 0, needSingles = 0, wantPairs = 0
  const big = []
  const add = (ent) => { const nd = needOf(ent, rules); total += ent; needSingles += nd.singles; wantPairs += nd.pairs }
  units.forEach((u) => { const c = sold[String(u.unit)]; const ent = entitlementOf(c, u, settings); add(ent); const base = Number(settings?.rateCard?.parkingSlots?.[u.type] ?? 1); if (c && ent > base) big.push({ unit: u.unit, name: c.name, type: u.type, ent, base }) })
  // what-if: x.n more residences of type x.type promised x.count car parks each (instead of the rate card's number)
  extra.forEach((x) => { const base = Number(settings?.rateCard?.parkingSlots?.[x.type] ?? 1), a = needOf(Number(x.count), rules), b = needOf(base, rules)
    for (let i = 0; i < (Number(x.n) || 0); i++) { total += Number(x.count) - base; needSingles += a.singles - b.singles; wantPairs += a.pairs - b.pairs } })
  const singles = SLOT_DEFS.filter((s) => s.kind === 'Single').length, pairs = SLOT_DEFS.filter((s) => s.kind === 'Tandem front').length
  const supply = singles + pairs * 2
  const singlesLeft = singles - needSingles
  const pairsFit = Math.min(wantPairs, pairs + Math.max(0, Math.floor(singlesLeft / 2)))
  const ok = singlesLeft >= 0 && total <= supply && pairsFit === wantPairs
  return { ok, total, supply, spare: supply - total, needSingles, wantPairs, singles, pairs, big }
}
