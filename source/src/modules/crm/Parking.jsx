import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canWrite, isAdmin } from '../../lib/perms.js'
import { Card, Button, Badge, Grid, Stat, Seg, Modal, Field, Input, Select, Confirm, Page } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import { d, today, fullName, inr } from '../../lib/format.js'
import { PARKING_SOURCE } from '../../lib/parkingData.js'
import {
  LEVELS, LEVEL, LEVEL_ORDER, SLOT_DEFS, PARKING_FIXES, PARKING_DRAWING, RELEASE, inventoryRecords, withDef, planAllotment, applyPlan,
  parkingRules, PARKING_DEFAULTS, entitlementOf, capacity, isTandem, isCovered, bandShort, slotsOfUnit, levelName,
} from '../../lib/parking.js'

// 8 Nov: car parking from the architect's drawings. Plan view per level, allotment by band and booking date,
// allotment letters, and the register. The rules are written out at the top of lib/parking.js.

const STATE = (p) => p.status === 'Common' ? 'Common' : p.status === 'Blocked' ? 'Blocked' : p.unit ? (p.locked === 'Yes' ? 'Letter issued' : p.allotStatus === 'Provisional' ? 'Provisional' : 'Allotted') : p.zone === 'Sale pool' ? 'Sale pool' : 'Free'
const TONE = { Allotted: 'accent', 'Letter issued': 'good', Provisional: 'warn', Free: 'muted', 'Sale pool': 'info', Blocked: 'bad', Common: 'muted' }

function useParking() {
  const { db, settings } = useStore()
  const crm = useCrm()
  const recs = useMemo(() => db.parking.map(withDef).filter((p) => p.x !== undefined), [db.parking])
  const legacy = useMemo(() => db.parking.filter((p) => !SLOT_DEFS.some((s) => s.id === p.id)), [db.parking])
  const rules = parkingRules(settings)
  return { recs, legacy, rules, crm, settings, db }
}

// ---------- the plan of one level
// 8 Nov (2): cars drawn in the bays from the BMW X5 and Mercedes S-Class plan blocks (cars: 'all' or 'mine'),
// and crop: a window in metres around the highlighted slots for the cost sheet inset.
const CAR_KEYS = Object.keys(PARKING_SOURCE.cars || {})
function CarDefs() {
  return <defs>{CAR_KEYS.map((k) => { const c = PARKING_SOURCE.cars[k]
    return <symbol key={k} id={'pk-car-' + k} overflow="visible"><path d={c.outer} fill="var(--car-fill, #fff)" stroke="currentColor" strokeWidth="var(--car-sw, .045)" /><path d={c.inner} fill="none" stroke="currentColor" strokeWidth=".02" opacity=".75" /></symbol> })}</defs>
}
const carOf = (p) => CAR_KEYS[(parseInt(String(p.no).replace(/\D/g, '') || 0, 10) + (String(p.no).endsWith('A') ? 1 : 0)) % CAR_KEYS.length]
export function ParkingPlan({ level, recs, highlight, selected, onPick, zoneFilter, compact, cars, crop }) {
  const L = LEVEL[level]
  if (!L) return null
  const here = recs.filter((p) => p.levelCode === level)
  const byId = Object.fromEntries(here.map((p) => [p.id, p]))
  const hl = highlight || new Set()
  let vb = `0 0 ${L.w} ${L.h}`
  if (crop) {
    const pts = here.filter((p) => hl.has(p.id)); const mx = pts.length ? pts.reduce((a, p) => a + (p.cx ?? p.x), 0) / pts.length : L.w / 2, my = pts.length ? pts.reduce((a, p) => a + (p.cy ?? p.y), 0) / pts.length : L.h / 2
    const [cw, ch] = crop, x0 = Math.max(0, Math.min(L.w - cw, mx - cw / 2)), y0 = Math.max(0, Math.min(L.h - ch, my - ch / 2))
    vb = `${x0.toFixed(1)} ${y0.toFixed(1)} ${cw} ${ch}`
  }
  return (
    <svg className={'pk-plan' + (compact ? ' compact' : '') + (crop ? ' crop' : '')} viewBox={vb} role="img" aria-label={`${L.name} parking plan`}>
      {cars && CAR_KEYS.length > 0 && <CarDefs />}
      <path className="pk-drive" d={L.paths.drive} />
      <path className="pk-bay" d={L.paths.bay} />
      <path className="pk-core" d={L.paths.core} />
      <path className="pk-struct" d={L.paths.struct} />
      <g className="pk-lobby" transform={`translate(${L.lobby[0]} ${L.lobby[1]})`}><rect x={-3.2} y={-1.1} width={6.4} height={2.2} rx={0.3} /><text y={0.42}>LOBBY</text></g>
      {cars && CAR_KEYS.length > 0 && here.filter((p) => p.cx !== undefined && (cars === 'all' || hl.has(p.id) || selected === p.id)).map((p) => <use key={'car' + p.id} href={'#pk-car-' + carOf(p)} className={'pk-car' + (hl.has(p.id) || selected === p.id ? ' hl' : '') + (p.unit ? ' taken' : '')} transform={`translate(${p.cx} ${p.cy}) rotate(${p.a}) scale(0.92)`} />)}
      {!cars && here.filter((p) => p.kind === 'Tandem front' && byId[p.pair]).map((p) => <line key={'t' + p.id} className="pk-pairline" x1={p.x} y1={p.y} x2={byId[p.pair].x} y2={byId[p.pair].y} />)}
      {here.map((p) => {
        const st = STATE(p), on = hl.has(p.id), sel = selected === p.id
        const dim = (zoneFilter && p.zone !== zoneFilter) || (hl.size > 0 && !on)
        const open = !isCovered(p)
        const r = p.kind === 'Two-wheeler' ? 0.45 : open ? 0.7 : 0.95
        return <g key={p.id} className={`pk-slot s-${st.replace(/\s/g, '-').toLowerCase()}${on ? ' hl' : ''}${sel ? ' sel' : ''}${dim ? ' dim' : ''}`} onClick={() => onPick?.(p)} transform={`translate(${p.x} ${p.y})`}>
          <title>{`${p.id} · ${p.kind}${p.unit ? ' · ' + p.unit + ' ' + (p.name || '') : ''}${p.zone ? ' · ' + bandShort(p.zone) : ''}`}</title>
          {open ? <rect x={-r} y={-r} width={2 * r} height={2 * r} rx={0.15} /> : <circle r={r} />}
          {p.kind !== 'Two-wheeler' && !compact && <text y={0.3}>{p.no}</text>}
          {compact && on && <text y={0.3}>{p.no}</text>}
        </g>
      })}
      {compact && !crop && (() => { const m = here.filter((p) => hl.has(p.id)).sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true })); if (!m.length) return null
        // one callout for the household: a ring round the group and the slot numbers once
        const xs = m.map((p) => p.cx ?? p.x), ys = m.map((p) => p.cy ?? p.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2
        const r = Math.max(2.6, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 2.4)
        return <g className="pk-call" transform={`translate(${cx} ${cy})`}><circle r={r} /><text x={r + 0.8} y={0.7}>{m.map((p) => p.id).join(', ')}</text></g> })()}
    </svg>
  )
}

const Legend = () => <div className="pk-legend small">{['Allotted', 'Provisional', 'Letter issued', 'Free', 'Sale pool', 'Blocked'].map((k) => <span key={k} className={'pk-key s-' + k.replace(/\s/g, '-').toLowerCase()}><i />{k}</span>)}<span className="pk-key pair"><i />Tandem pair (rear has the A)</span></div>

// ---------- the Car parking tab in Building and parking
export default function Parking() {
  const { user, upsert, remove, notify, setSettings } = useStore()
  const { recs, legacy, rules, crm, settings, db } = useParking()
  const can = canWrite(user, 'parking')
  const [view, setView] = useState('plan')
  const [level, setLevel] = useState('G')
  const [q, setQ] = useState('')
  const [zoneF, setZoneF] = useState('')
  const [sel, setSel] = useState(null)
  const [plan, setPlan] = useState(null)
  const [rulesOpen, setRulesOpen] = useState(null)
  const [assign, setAssign] = useState(null)
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth > 1000 ? 1.6 : 1))

  const covered = recs.filter(isCovered)
  const stats = {
    singles: covered.filter((p) => p.kind === 'Single').length, pairs: covered.filter((p) => p.kind === 'Tandem front').length,
    allotted: covered.filter((p) => p.unit).length, prov: covered.filter((p) => p.allotStatus === 'Provisional').length, locked: covered.filter((p) => p.locked === 'Yes').length,
    pool: covered.filter((p) => !p.unit && p.zone === 'Sale pool').length, held: covered.filter((p) => !p.unit && p.zone && p.zone !== 'Sale pool').length,
  }
  const eligible = crm.clients.filter((c) => BOOKED.includes(c.status) || rules.provisional.includes(c.status))
  const ent = (c) => entitlementOf(c, c.u, settings)
  const have = (c) => recs.filter((p) => String(p.unit) === String(c.unit)).length
  const short = eligible.filter((c) => have(c) < ent(c))
  const hl = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return new Set()
    return new Set(recs.filter((p) => [p.id, p.no, p.unit, p.name, p.clientId].some((v) => String(v || '').toLowerCase() === t || (t.length > 2 && String(v || '').toLowerCase().includes(t)))).map((p) => p.id))
  }, [q, recs])
  const hlLevels = [...new Set(recs.filter((p) => hl.has(p.id)).map((p) => p.levelCode))]
  useEffect(() => { if (hlLevels.length && !hlLevels.includes(level)) setLevel(hlLevels[0]) }, [q]) // eslint-disable-line
  const cur = sel ? recs.find((p) => p.id === sel) : null
  // keep the part that matters in view: the first slot found by the search, otherwise the middle of the deck
  const box = useRef(null)
  const focus = recs.find((p) => p.levelCode === level && hl.has(p.id))
  useEffect(() => {
    const el = box.current; if (!el) return
    const L = LEVEL[level], fx = focus ? focus.x / L.w : 0.5, fy = focus ? focus.y / L.h : 0.55
    el.scrollLeft = Math.max(0, fx * el.scrollWidth - el.clientWidth / 2); el.scrollTop = Math.max(0, fy * el.scrollHeight - el.clientHeight / 2)
  }, [level, zoom, focus?.id, view, recs.length > 0]) // eslint-disable-line
  const zones = [...new Set(covered.map((p) => p.zone).filter(Boolean))]

  const load = () => {
    const have0 = new Set(db.parking.map((p) => p.id)); let k = 0
    inventoryRecords().forEach((r) => { if (!have0.has(r.id)) { upsert('parking', r, { silent: true }); k++ } })
    notify(k ? `${k} slots loaded from the drawings` : 'The inventory is already complete')
  }
  const runPlan = () => setPlan(planAllotment({ parking: db.parking, clients: crm.clients, units: crm.units, settings }))
  const apply = () => { const k = applyPlan(plan, db.parking, upsert, user); notify(`${k} slots allotted. Zones saved for every slot.`); setPlan(null) }
  const release = (p) => {
    const both = [p, ...(isTandem(p) && p.pair ? [recs.find((x) => x.id === p.pair)] : [])].filter(Boolean)
    both.forEach((x) => upsert('parking', { ...db.parking.find((r) => r.id === x.id), ...RELEASE }, { action: 'released' }))
    notify(`${both.map((x) => x.id).join(' and ')} released`)
  }
  const doAssign = () => {
    const c = crm.byUnit[assign.unit]; if (!c) return notify('Pick a residence', 'bad')
    const p = assign.slot
    const both = [p, ...(isTandem(p) && p.pair ? [recs.find((x) => x.id === p.pair)] : [])].filter(Boolean)
    if (both.some((x) => x.unit && String(x.unit) !== String(c.unit))) return notify('The other slot of this tandem pair belongs to another residence', 'bad')
    const st = rules.provisional.includes(c.status) ? 'Provisional' : 'Allotted'
    both.forEach((x) => upsert('parking', { ...db.parking.find((r) => r.id === x.id), unit: c.unit, clientId: c.clientId, bookingId: c.bookingId, name: c.name, status: st, allotStatus: st, assignedOn: today(), assignedBy: user.name, allotNote: assign.note || 'Assigned by hand' }, { action: 'assigned' }))
    notify(`${both.map((x) => x.id).join(' and ')} assigned to ${c.unit}`); setAssign(null)
  }
  const setStatus = (p, status) => upsert('parking', { ...db.parking.find((r) => r.id === p.id), status }, { action: status === 'Blocked' ? 'blocked' : 'unblocked' })

  if (!recs.length) return (
    <Card title="Parking inventory">
      <p style={{ marginTop: 0 }}>The architect's parking drawings ({PARKING_DRAWING}) give <b>543 covered car parks</b> on four levels, 3 accessible bays, 36 visitor and 26 surface bays and 95 two-wheeler bays.
        Load them once; every slot keeps its drawing number with the level in front (G-012, L1-072A).</p>
      {legacy.length > 0 && <p className="note warn small">{legacy.length} older slots made with "Generate slots" are in the sheet. They stay until you delete them from the Slots list.</p>}
      {can ? <Button variant="primary" onClick={load}>Load the inventory from the drawings</Button> : <span className="small muted">An admin or Anuradha loads the inventory.</span>}
    </Card>
  )

  return (
    <>
      <Grid cols={5}>
        <Stat label="Covered car parks" value={stats.singles + stats.pairs * 2} sub={`${stats.singles} single · ${stats.pairs} tandem pairs`} />
        <Stat label="Allotted" value={stats.allotted} sub={`${stats.prov} provisional · ${stats.locked} with letters`} tone="accent" />
        <Stat label="Held for unsold residences" value={stats.held} sub="By band, until they are booked" tone="info" />
        <Stat label="Sale pool" value={stats.pool} sub={`Additional car parks at ${inr(settings.rateCard?.parkingExtraRate || settings.rateCard?.parkingRate)}`} tone="good" />
        <Stat label="Bookings still short" value={short.reduce((s, c) => s + ent(c) - have(c), 0)} sub={`${short.length} residences`} tone={short.length ? 'warn' : 'good'} onClick={() => setView('residences')} />
      </Grid>
      <div className="row between wrap" style={{ margin: '12px 0' }}>
        <Seg options={[{ value: 'plan', label: 'Plan' }, { value: 'slots', label: 'Slots' }, { value: 'residences', label: 'Residences' }, { value: 'logic', label: 'Rules and drawings' }]} value={view} onChange={setView} />
        <div className="row gap-s wrap">
          {can && <Button variant="primary" onClick={runPlan}>Plan allotment</Button>}
          <Link className="btn" to="/crm/parking/register">Print register</Link>
          {can && SLOT_DEFS.length > db.parking.filter((p) => SLOT_DEFS.some((s) => s.id === p.id)).length && <Button onClick={load}>Load missing slots</Button>}
        </div>
      </div>

      {view === 'plan' && <div className="pk-wrap">
        <Card pad={false}>
          <div className="pk-tools">
            <Seg options={LEVELS.map((l) => ({ value: l.code, label: `${l.code}${hlLevels.includes(l.code) ? ' •' : ''}` }))} value={level} onChange={(v) => { setLevel(v); setSel(null) }} />
            <span className="small muted nowrap">{LEVEL[level].name} · FFL {LEVEL[level].ffl}</span>
            <input className="input search" type="search" placeholder="Residence, client or slot" aria-label="Find on the plan" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select options={zones.map((z) => ({ value: z, label: bandShort(z) }))} value={zoneF} placeholder="All zones" onChange={(e) => setZoneF(e.target.value)} />
            <Seg options={[{ value: 1, label: '1×' }, { value: 1.6, label: '1.6×' }, { value: 2.4, label: '2.4×' }]} value={zoom} onChange={setZoom} />
          </div>
          <div className="pk-scroll" ref={box}><div style={{ width: zoom * 100 + '%' }}>
            <ParkingPlan level={level} recs={recs} highlight={hl} selected={sel} zoneFilter={zoneF} onPick={(p) => setSel(p.id)} cars="mine" />
          </div></div>
          <Legend />
        </Card>
        <Card title={cur ? cur.id : 'Slot'}>
          {!cur ? <p className="muted small" style={{ margin: 0 }}>Click a slot on the plan. Search for a residence, a client or a slot number to find it on every level.</p> : <SlotPanel p={cur} recs={recs} can={can}
            onAssign={() => setAssign({ slot: cur, unit: '' })} onRelease={() => release(cur)} onBlock={() => setStatus(cur, cur.status === 'Blocked' ? 'Free' : 'Blocked')} />}
        </Card>
      </div>}

      {view === 'slots' && <DataTable rows={recs.concat(legacy)} searchKeys={['id', 'name', (p) => String(p.unit || ''), 'clientId']}
        filters={[{ key: 'level', label: 'Level' }, { key: 'kind', label: 'Kind' }, { key: 'st', label: 'State', get: STATE }, { key: 'zone', label: 'Zone', get: (p) => bandShort(p.zone) }]}
        columns={[{ key: 'id', label: 'Slot', render: (p) => <b>{p.id}</b>, sortValue: (p) => LEVEL_ORDER.indexOf(p.levelCode) * 1000 + parseInt(String(p.no).replace(/\D/g, '') || 0, 10) },
          { key: 'level', label: 'Level' }, { key: 'kind', label: 'Kind', render: (p) => <>{p.kind}{p.pair ? <span className="muted small"> · with {p.pair}</span> : ''}</> },
          { key: 'walk', label: 'Walk to lobby', align: 'right', render: (p) => p.walk !== undefined ? p.walk + ' m' : '–' },
          { key: 'zone', label: 'Zone', render: (p) => bandShort(p.zone) || '–' }, { key: 'st', label: 'State', render: (p) => <Badge tone={TONE[STATE(p)]}>{STATE(p)}</Badge>, sortValue: STATE },
          { key: 'unit', label: 'Residence' }, { key: 'name', label: 'Client' }, { key: 'assignedOn', label: 'Allotted', render: (p) => d(p.assignedOn) },
          { key: 'act', label: '', sort: false, render: (p) => can && (p.x === undefined ? <Confirm size="sm" label="Delete this old slot?" onConfirm={() => remove('parking', p.id)}>Delete</Confirm>
            : <div className="row gap-s">{p.unit ? p.locked !== 'Yes' && <Button size="sm" variant="ghost" onClick={() => release(p)}>Release</Button> : isCovered(p) && p.status !== 'Blocked' && !(p.kind === 'Tandem rear') && <Button size="sm" onClick={() => setAssign({ slot: p, unit: '' })}>Assign</Button>}</div>) }]} />}

      {view === 'residences' && <DataTable rows={eligible.map((c) => ({ ...c, id: c.id, ent: ent(c), slots: recs.filter((p) => String(p.unit) === String(c.unit)) }))}
        searchKeys={['name', 'clientId', (c) => String(c.unit)]} filters={[{ key: 'st', label: 'Parking', get: (c) => c.slots.length >= c.ent ? 'Complete' : c.slots.length ? 'Part' : 'None' }, { key: 'status', label: 'Booking status' }]}
        columns={[{ key: 'unit', label: 'Residence', render: (c) => <b>{c.unit}</b> }, { key: 'name', label: 'Client', render: (c) => <Link to={'/crm/clients/' + c.id}>{fullName(c)}</Link> },
          { key: 'config', label: 'Type' }, { key: 'band', label: 'Band', render: (c) => bandShort(c.band) }, { key: 'bookingDate', label: 'Booked', render: (c) => d(c.bookingDate) },
          { key: 'ent', label: 'Entitled', align: 'right' }, { key: 'slots', label: 'Slots', sortValue: (c) => c.slots.length, render: (c) => c.slots.length ? c.slots.map((p) => <Badge key={p.id} tone={TONE[STATE(p)]}>{p.id}</Badge>) : <span className="muted">None yet</span> },
          { key: 'letter', label: '', sort: false, render: (c) => c.slots.length > 0 && <Link className="btn btn-sm" to={'/crm/parking/letter/' + c.id}>Letter</Link> }]} />}

      {view === 'logic' && <><Commitments /><Logic rules={rules} admin={isAdmin(user)} onEdit={() => setRulesOpen({ ...rules })} /></>}

      <Modal open={!!plan} wide onClose={() => setPlan(null)} title="Proposed allotment" footer={<><Button onClick={() => setPlan(null)}>Cancel</Button><Button variant="primary" onClick={apply} disabled={!plan}>{plan?.moves.length ? `Apply ${plan.moves.length} allotments` : 'Save zones only'}</Button></>}>
        {plan && <PlanPreview plan={plan} />}
      </Modal>
      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Assign ${assign?.slot.id}${assign && isTandem(assign.slot) ? ' and ' + assign.slot.pair : ''}`} footer={<><Button onClick={() => setAssign(null)}>Cancel</Button><Button variant="primary" onClick={doAssign}>Assign</Button></>}>
        {assign && <div className="form">
          {isTandem(assign.slot) && <p className="note info small" style={{ marginTop: 0 }}>A tandem pair goes to one residence. Both {assign.slot.id} and {assign.slot.pair} will be assigned.</p>}
          {assign.slot.kind === 'Accessible' && <p className="note info small" style={{ marginTop: 0 }}>Accessible bay: assign only to a household that has asked for it.</p>}
          <Field label="Residence"><Select options={eligible.map((c) => ({ value: String(c.unit), label: `${c.unit} · ${c.name} (${have(c)} of ${ent(c)})` }))} value={assign.unit} onChange={(e) => setAssign({ ...assign, unit: e.target.value })} /></Field>
          <Field label="Note"><Input value={assign.note} placeholder="e.g. second car bought on cost sheet CS-0012" onChange={(e) => setAssign({ ...assign, note: e.target.value })} /></Field>
        </div>}
      </Modal>
      <Modal open={!!rulesOpen} onClose={() => setRulesOpen(null)} title="Allotment rules" footer={<><Button onClick={() => setRulesOpen(null)}>Cancel</Button><Button onClick={() => setRulesOpen({ ...PARKING_DEFAULTS })}>Defaults</Button><Button variant="primary" onClick={() => { setSettings({ parking: rulesOpen }); setRulesOpen(null) }}>Save</Button></>}>
        {rulesOpen && <div className="form fc2">
          <Field label="Penalty for each ramp level (m)" hint="Added to the walk; 30 m means a slot one level up must be 30 m closer to win."><Input type="number" value={rulesOpen.levelPenalty} onChange={(e) => setRulesOpen({ ...rulesOpen, levelPenalty: Number(e.target.value) })} /></Field>
          <Field label="Two car parks as a tandem pair"><Select options={['Yes', 'No']} value={rulesOpen.pairsForTwo} onChange={(e) => setRulesOpen({ ...rulesOpen, pairsForTwo: e.target.value })} /></Field>
          <Field label="Inside a band, first come" hint="Booking date: earliest booking first. Floor: higher floor first."><Select options={['Booking date', 'Floor']} value={rulesOpen.withinBand} onChange={(e) => setRulesOpen({ ...rulesOpen, withinBand: e.target.value })} /></Field>
        </div>}
      </Modal>
    </>
  )
}

function SlotPanel({ p, recs, can, onAssign, onRelease, onBlock }) {
  const mate = p.pair ? recs.find((x) => x.id === p.pair) : null
  const st = STATE(p)
  return <div>
    <div className="row gap-s" style={{ marginBottom: 10 }}><Badge tone={TONE[st]}>{st}</Badge><Badge>{p.kind}</Badge>{p.ev && <Badge tone="good">EV</Badge>}</div>
    <dl className="kv">
      <dt>Level</dt><dd>{p.level} · FFL {LEVEL[p.levelCode]?.ffl}</dd>
      <dt>Drawing no.</dt><dd>{p.no}</dd>
      {mate && <><dt>{p.kind === 'Tandem rear' ? 'In front' : 'Behind'}</dt><dd>{mate.id}{mate.unit && String(mate.unit) !== String(p.unit) ? ' · ' + mate.unit : ''}</dd></>}
      <dt>Walk to lobby</dt><dd>{p.walk} m</dd>
      <dt>Zone</dt><dd>{bandShort(p.zone) || '–'}</dd>
      {p.unit && <><dt>Residence</dt><dd><b>{p.unit}</b> · {p.name}</dd><dt>Allotted</dt><dd>{d(p.assignedOn)}{p.assignedBy ? ' by ' + p.assignedBy : ''}</dd>{p.allotNote && <><dt>Why</dt><dd>{p.allotNote}</dd></>}
        {p.locked === 'Yes' && <><dt>Letter</dt><dd>Issued {d(p.letterOn)}</dd></>}</>}
    </dl>
    {can && <div className="row gap-s wrap" style={{ marginTop: 12 }}>
      {p.unit ? (p.locked === 'Yes' ? <span className="small muted">Letter issued. An admin unlocks it from the letter.</span> : <Confirm size="sm" label={'Release' + (mate ? ' both?' : '?')} onConfirm={onRelease}>Release</Confirm>)
        : isCovered(p) && p.status !== 'Blocked' && <Button size="sm" variant="primary" onClick={onAssign}>Assign{mate ? ' pair' : ''}</Button>}
      {!p.unit && isCovered(p) && <Button size="sm" variant="ghost" onClick={onBlock}>{p.status === 'Blocked' ? 'Unblock' : 'Block'}</Button>}
      {p.unit && p.bookingId && <Link className="btn btn-sm" to={'/crm/parking/letter/' + p.bookingId}>Allotment letter</Link>}
    </div>}
  </div>
}

function PlanPreview({ plan }) {
  const lv = (ids) => [...new Set(ids.map((i) => i.split('-')[0]))].join(', ')
  return <div>
    <p className="small" style={{ marginTop: 0 }}>Nothing already allotted moves. Each slot is also tagged with the band it is held for, so later bookings in that band find their slots waiting.</p>
    <table className="table dense"><thead><tr><th>Band (premium first)</th><th className="right">Residences</th><th className="right">Singles held</th><th className="right">Pairs held</th><th className="right">Score range</th></tr></thead>
      <tbody>{plan.summary.map((b) => <tr key={b.band}><td>{b.band}</td><td className="right">{b.units}</td><td className="right">{b.singles}</td><td className="right">{b.pairs}</td><td className="right">{b.best ?? '–'} to {b.worst ?? '–'}</td></tr>)}
        <tr><td>Sale pool</td><td /><td className="right">{plan.pool.singles}</td><td className="right">{plan.pool.pairs}</td><td /></tr></tbody></table>
    <div className="sec-h">Bookings, in the order they choose</div>
    <table className="table dense"><thead><tr><th>#</th><th>Residence</th><th>Client</th><th>Band</th><th>Booked</th><th className="right">Entitled</th><th>Already</th><th>Proposed</th><th>Why</th></tr></thead>
      <tbody>{plan.rows.map((r, i) => <tr key={r.unit}><td>{i + 1}</td><td><b>{r.unit}</b> <span className="muted small">{r.type}</span></td><td>{r.name}{r.allotStatus === 'Provisional' && <> <Badge tone="warn">Provisional</Badge></>}</td><td>{r.band}</td><td className="nowrap">{d(r.bookingDate)}</td><td className="right">{r.ent}</td>
        <td>{r.had.join(', ') || '–'}</td><td><b>{r.got.join(', ') || '–'}</b>{r.got.length > 0 && <span className="muted small"> · {lv(r.got)}</span>}</td><td className="small muted">{plan.moves.filter((m) => m.unit === r.unit).map((m) => m.why).join('; ')}</td></tr>)}</tbody></table>
    {plan.short.length > 0 && <p className="note warn small">Not enough slots for: {plan.short.map((s) => `${s.unit} (${s.missing})`).join(', ')}.</p>}
  </div>
}

function Logic({ rules, admin, onEdit }) {
  const { settings } = useStore()
  const counts = LEVELS.map((l) => { const s = SLOT_DEFS.filter((x) => x.level === l.code)
    return { l, single: s.filter((x) => x.kind === 'Single').length, front: s.filter((x) => x.kind === 'Tandem front').length, rear: s.filter((x) => x.kind === 'Tandem rear').length, acc: s.filter((x) => x.kind === 'Accessible').length } })
  const statement = { G: [141, 29, 170], L1: [112, 30, 142], L2: [110, 30, 140], L3: [65, 26, 91] }
  return <div className="grid g2" style={{ gap: 16 }}>
    <Card title="How car parks are allotted" actions={admin && <Button size="sm" onClick={onEdit}>Edit rules</Button>}>
      <ol className="pk-rules">
        <li><b>Entitlement.</b> What the booking bought: the client's "Car parks entitled", or the rate card's number for the type ({Object.entries(settings.rateCard?.parkingSlots || {}).map(([k, v]) => `${k} ${v}`).join(', ')}).</li>
        <li><b>Pairs stay together.</b> A tandem pair (72 and 72A) goes to one residence only. One car park is always a single slot. {rules.pairsForTwo === 'Yes' ? 'Two car parks are one tandem pair; three are a pair and a single.' : 'Two or more car parks are singles.'}</li>
        <li><b>Convenience score.</b> Walk from the slot to the tower lobby on that level, plus {rules.levelPenalty} m for each ramp level above the ground. Lower is better.</li>
        <li><b>Zones by band.</b> The best slots are held for the premium bands first (Crown, Signature, Panorama Terrace, Panorama, Sky Duplexes, Sky Residences, Sky Deck, Sub-Sky Deck, then Podium and typical), sized to every residence in the band, sold or not.</li>
        <li><b>Inside a band</b>, {rules.withinBand === 'Floor' ? 'the higher floor chooses first' : 'the earliest booking chooses first'}; bookings without a date come last. A household's other slots, and a client's other residences, go as near as possible.</li>
        <li><b>Nothing moves.</b> Planning only fills gaps. Once the allotment letter is issued, the slots are locked.</li>
        <li><b>Who gets slots.</b> Active, shifted, registered and handed-over bookings. "To verify" bookings get provisional slots. Cancellations free their slots when the booking is closed.</li>
        <li><b>Not allotted automatically:</b> accessible bays G-H1 to G-H3 (on request), visitors V-01 to V-36 (V-01 to V-20 with EV charging), surface S-01 to S-26 and two-wheeler bays TW-01 to TW-95.</li>
      </ol>
    </Card>
    <Card title="From the drawings">
      <p className="small muted" style={{ marginTop: 0 }}>{PARKING_DRAWING}</p>
      <table className="table dense"><thead><tr><th>Level</th><th className="right">Single</th><th className="right">Tandem pairs</th><th className="right">Total</th><th className="right">Statement</th></tr></thead>
        <tbody>{counts.map((c) => <tr key={c.l.code}><td>{c.l.code} · {c.l.name}</td><td className="right">{c.single}</td><td className="right">{c.front}</td><td className="right">{c.single + c.front + c.rear}</td><td className="right">{statement[c.l.code][2]}{c.single + c.front + c.rear === statement[c.l.code][2] ? ' ✓' : ''}</td></tr>)}
          <tr className="total"><td>Covered</td><td className="right">{counts.reduce((s, c) => s + c.single, 0)}</td><td className="right">{counts.reduce((s, c) => s + c.front, 0)}</td><td className="right">{counts.reduce((s, c) => s + c.single + c.front + c.rear, 0)}</td><td className="right">543</td></tr></tbody></table>
      <p className="small">Plus 3 accessible bays on the ground (G-H1 to G-H3), outside the 543.</p>
      <div className="sec-h">Labels corrected from the drawings</div>
      <table className="table dense"><thead><tr><th>Level</th><th>On the drawing</th><th>In Accord</th><th>Why</th></tr></thead>
        <tbody>{PARKING_FIXES.map((f, i) => <tr key={i}><td>{f.level}</td><td>{f.drawing}</td><td><b>{f.now}</b></td><td className="small">{f.why}</td></tr>)}</tbody></table>
      <p className="small muted">Ask the architect to correct these on the next revision so signage matches.</p>
    </Card>
  </div>
}

// ---------- Client 360 card
export function ClientParking({ c }) {
  const { db, settings } = useStore()
  const slots = slotsOfUnit(db.parking, c.unit)
  const ent = entitlementOf(c, c.u || { type: c.config }, settings)
  const lv = slots[0]?.levelCode
  return <Card title="Car parking" actions={<span className="row gap-s">{slots.length > 0 && <Link className="btn btn-sm" to={'/crm/parking/letter/' + c.id}>Letter</Link>}<Link className="btn btn-sm" to="/crm/inventory?tab=parking">Plan</Link></span>}>
    {slots.length ? <>
      {slots.map((p) => <div key={p.id} className="check-row"><span><b>{p.id}</b> · {p.level}{isTandem(p) ? ' · tandem ' + (p.kind === 'Tandem rear' ? 'rear' : 'front') : ''}</span><span><span className="small muted">{p.walk} m to lobby </span><Badge tone={TONE[STATE(p)]}>{STATE(p)}</Badge></span></div>)}
      {lv && <div className="pk-mini"><ParkingPlan level={lv} recs={db.parking.map(withDef).filter((p) => p.x !== undefined)} highlight={new Set(slots.map((p) => p.id))} compact cars="mine" /></div>}
    </> : <p className="muted" style={{ margin: 0 }}>No slot allotted yet.</p>}
    <p className="small muted" style={{ marginBottom: 0 }}>Entitled to {ent}. {slots.length < ent ? `${ent - slots.length} still to allot.` : ''}</p>
  </Card>
}

// ---------- allotment letter (A4)
export function ParkingLetter() {
  const { id } = useParams()
  const { db, user, upsert, notify, settings } = useStore()
  const crm = useCrm()
  const c = crm.clients.find((x) => x.id === id || x.bookingId === id)
  if (!c) return <Page title="Booking not found" back={true} />
  const slots = slotsOfUnit(db.parking, c.unit)
  const co = settings.company || {}
  const recs = db.parking.map(withDef).filter((p) => p.x !== undefined)
  const levels = [...new Set(slots.map((p) => p.levelCode))]
  const locked = slots.length && slots.every((p) => p.locked === 'Yes')
  const no = 'PA-' + String(c.bookingId || '').replace(/\D/g, '').padStart(3, '0')
  const can = canWrite(user, 'parking')
  const issue = () => { slots.forEach((p) => upsert('parking', { ...db.parking.find((r) => r.id === p.id), locked: 'Yes', letterOn: today(), letterNo: no }, { action: 'letter issued' })); notify('Letter issued. These slots are now locked.') }
  const unlock = () => { slots.forEach((p) => upsert('parking', { ...db.parking.find((r) => r.id === p.id), locked: '', letterOn: '' }, { action: 'unlocked' })); notify('Unlocked') }
  return <div>
    <div className="doc-tools no-print"><Link className="btn" to={'/crm/clients/' + c.id}>← Client 360</Link>
      <Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button>
      {can && slots.length > 0 && !locked && slots.every((p) => p.allotStatus !== 'Provisional') && <Button onClick={issue}>Mark as issued (locks the slots)</Button>}
      {locked && isAdmin(user) && <Confirm label="Unlock these slots?" onConfirm={unlock}>Unlock</Confirm>}</div>
    <div className="doc">
      <DocHeader title="CAR PARKING ALLOTMENT" sub={`${no} · ${d(slots[0]?.letterOn || today())}`} />
      <table><tbody>
        <tr><th style={{ width: '22%' }}>Allottee</th><td colSpan={3}><b>{fullName(c)}</b>{c.coapp ? ' & ' + c.coapp : ''}</td></tr>
        <tr><th>Residence</th><td>{c.unit} · {c.config} · floor {c.floor}</td><th style={{ width: '18%' }}>Booking ID</th><td>{c.bookingId}</td></tr>
        <tr><th>Car parks</th><td>{slots.filter(isCovered).length} covered</td><th>Client ID</th><td>{c.clientId}</td></tr>
      </tbody></table>
      {!slots.length ? <p>No car park has been allotted to this residence yet.</p> : <>
        <div className="sec">Allotted car parks</div>
        <table><thead><tr><th>Slot</th><th>Level</th><th>Type</th><th>Position</th></tr></thead>
          <tbody>{slots.map((p) => <tr key={p.id}><td><b>{p.id}</b></td><td>{p.level} (FFL {LEVEL[p.levelCode]?.ffl})</td><td>{p.kind === 'Single' ? 'Covered, independent' : p.kind === 'Tandem front' ? 'Covered, tandem (front)' : p.kind === 'Tandem rear' ? 'Covered, tandem (rear)' : p.kind}</td><td>About {p.walk} m from the tower lobby</td></tr>)}</tbody></table>
        {levels.map((lv) => <div key={lv} className="pk-letter-plan"><div className="small"><b>{levelName(lv)}</b>: your slots are marked.</div><ParkingPlan level={lv} recs={recs} highlight={new Set(slots.map((p) => p.id))} compact cars="mine" /></div>)}
        <div className="sec">Terms</div>
        <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>
          <li>The car park(s) above are for the exclusive use of the residence named here, for parking cars of its occupants. They are not a separate unit and cannot be sold, let or transferred apart from the residence.</li>
          {slots.some(isTandem) && <li>The tandem slots (the rear one carries the letter A) are allotted together to this residence only and are used one behind the other.</li>}
          <li>Slot numbers follow the architect's parking drawings (24.07.2026). If a statutory approval or a revision needs a change, an equivalent slot of the same type will be offered.</li>
          <li>Visitor bays, surface bays, driveways and ramps are common areas and are not to be used for long-term parking.</li>
          <li>Car parking is governed by the Agreement for Sale; where the two differ, the Agreement for Sale prevails.</li>
        </ol>
      </>}
      <div className="sign"><div>Received and accepted<br /><br />Allottee</div><div style={{ textAlign: 'right' }}>For {co.name || 'Yamuna Homes and Design Pvt. Ltd.'}<br /><br />Authorised signatory</div></div>
      <div className="foot">{co.address} · {co.contact} · Allotment letter generated by Accord.</div>
    </div>
  </div>
}

// ---------- register of every allotted slot (A4, for the site office and the security desk)
export function ParkingRegister() {
  const { db, settings } = useStore()
  const rows = db.parking.map(withDef).filter((p) => p.unit && p.x !== undefined)
    .sort((a, b) => LEVEL_ORDER.indexOf(a.levelCode) - LEVEL_ORDER.indexOf(b.levelCode) || String(a.no).localeCompare(String(b.no), undefined, { numeric: true }))
  return <div>
    <div className="doc-tools no-print"><Link className="btn" to="/crm/inventory?tab=parking">← Car parking</Link><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
    <div className="doc">
      <DocHeader title="CAR PARKING REGISTER" sub={`As on ${d(today())}`} />
      <table><thead><tr><th>Slot</th><th>Level</th><th>Type</th><th>Residence</th><th>Allottee</th><th>Status</th></tr></thead>
        <tbody>{rows.map((p) => <tr key={p.id}><td><b>{p.id}</b></td><td>{p.levelCode}</td><td>{p.kind}</td><td>{p.unit}</td><td>{p.name}</td><td>{STATE(p)}</td></tr>)}
          {!rows.length && <tr><td colSpan={6} className="muted">Nothing allotted yet</td></tr>}</tbody></table>
      <div className="foot">{settings.company?.name} · {rows.length} slots allotted · Register generated by Accord.</div>
    </div>
  </div>
}

// 8 Nov (2): can the building carry the car parks promised (3 and 4 BHK buyers with 4 or more)?
function Commitments() {
  const { settings } = useStore()
  const crm = useCrm()
  const [w, setW] = useState({ type: '3 BHK', count: 4, n: 1 })
  const now = capacity({ units: crm.units, clients: crm.clients, settings })
  const what = capacity({ units: crm.units, clients: crm.clients, settings, extra: [w] })
  const base = Number(settings.rateCard?.parkingSlots?.[w.type] ?? 1)
  const per = Math.max(0, Number(w.count) - base)
  const maxN = (() => { for (let k = 0; k < 400; k++) { if (!capacity({ units: crm.units, clients: crm.clients, settings, extra: [{ ...w, n: k + 1 }] }).ok) return k } return 400 })()
  return <Card title="Commitments: can we fit them?" className="span-all">
    <div className="grid g2" style={{ gap: 16 }}>
      <div>
        <p className="small" style={{ marginTop: 0 }}>Every residence keeps at least its own car park (sold: what it bought; unsold: the rate card). Today that is <b>{now.total}</b> of the <b>{now.supply}</b> covered car parks, so <b>{now.spare}</b> can still be promised as extra car parks.</p>
        <p className="small">A promise of 4 is two tandem pairs; 5 is two pairs and a single; 6 is three pairs. Each promise above the entitlement uses up the spare, and the slots come from the sale pool, nearest to each other.</p>
        {now.big.length > 0 ? <table className="table dense"><thead><tr><th>Residence</th><th>Client</th><th>Type</th><th className="right">Promised</th></tr></thead>
          <tbody>{now.big.map((b) => <tr key={b.unit}><td>{b.unit}</td><td>{b.name}</td><td>{b.type}</td><td className="right">{b.ent} <span className="muted small">(+{b.ent - b.base})</span></td></tr>)}</tbody></table>
          : <p className="small muted">No booking is recorded with more than its rate-card car parks yet. Enter each promise in Client 360 → Edit → Car parks entitled, then Plan allotment.</p>}
      </div>
      <div>
        <div className="form fc2">
          <Field label="Type"><Select options={['2 BHK', '3 BHK', '4 BHK', '5 BHK']} value={w.type} onChange={(e) => setW({ ...w, type: e.target.value })} /></Field>
          <Field label="Car parks each"><Input type="number" min={1} value={w.count} onChange={(e) => setW({ ...w, count: Number(e.target.value) })} /></Field>
          <Field label="How many more such buyers"><Input type="number" min={0} value={w.n} onChange={(e) => setW({ ...w, n: Number(e.target.value) })} /></Field>
        </div>
        <p className={'note ' + (what.ok ? 'info' : '')} style={{ marginTop: 10 }}>{what.ok
          ? <>Fits. {w.n} more {w.type} buyer{w.n === 1 ? '' : 's'} with {w.count} car parks each use{w.n === 1 ? 's' : ''} {per * w.n} of the spare; <b>{what.spare}</b> would be left for everyone else.</>
          : <>Does not fit: the building is short by {Math.max(-what.spare, 0) || 'a few'} car park{-what.spare === 1 ? '' : 's'}.</>} At most <b>{maxN}</b> such promise{maxN === 1 ? '' : 's'} can be made on top of today's bookings, and that would leave no extra car parks to sell.</p>
      </div>
    </div>
  </Card>
}
