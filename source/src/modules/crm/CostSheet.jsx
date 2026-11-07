import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, costSheet, BOOKED } from '../../lib/calc.js'
import { canWrite, isAdmin } from '../../lib/perms.js'
import { Page, Card, Button, Badge, Field, Select, Input, Textarea, Seg, Modal, DraftNote } from '../../components/ui.jsx'
import { useDraft } from '../../lib/drafts.js'
import { useFitPages } from '../../lib/fitPages.js'
import DocHeader from '../../components/DocHeader.jsx'
import RecordPicker from '../../components/RecordPicker.jsx'
import { d, inr, words, today, addDays, n, waLink, fullName } from '../../lib/format.js'
import { proposeForUnit, withDef, levelName, isTandem, LEVEL_ORDER } from '../../lib/parking.js'
import { ParkingPlan } from './Parking.jsx'
import { ElevationDiagram, UnitPlan } from '../../components/ResidenceDiagrams.jsx'
import { ordinal } from '../../components/Tower.jsx'

export default function CostSheet() {
  const { db, settings, user, upsert, nextId, notify, upload, online, sendEmail } = useStore()
  const [sending, setSending] = useState(false)
  const crm = useCrm()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const rc = settings.rateCard || {}
  // 7 Nov: a cost sheet being built is kept as a draft (per residence, lead or saved sheet) until it is saved
  const docRef = useRef(null)
  const dkey = 'cost:' + (qs.get('id') || qs.get('unit') || qs.get('lead') || 'new')
  const [v, setV, cdraft] = useDraft(dkey, { unit: qs.get('unit') || '', leadId: qs.get('lead') || '', funding: 'Self', discountPct: 0, finalRate: '', parking: 1, plc: 0, notes: '' }, { uid: user?.id, label: 'Cost sheet' + (qs.get('unit') ? ' · ' + qs.get('unit') : qs.get('lead') ? ' · ' + qs.get('lead') : ''), route: '/crm/cost-sheet' + (window.location.hash.split('?')[1] ? '?' + window.location.hash.split('?')[1] : '') })
  const [view, setView] = useState('build')
  useFitPages(docRef, [view])
  const [convert, setConvert] = useState(null)
  useEffect(() => { const id = qs.get('id'); const s = id && db.costSheets.find((x) => x.id === id); if (s) { if (cdraft.restoredAt) cdraft.setBase({ ...s }); else { cdraft.setBase({ ...s }); setV({ ...s }); setView('print') } } }, []) // eslint-disable-line
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }))
  const unit = crm.units.find((u) => String(u.unit) === String(v.unit))
  // 2 Nov: no double booking. To verify and under cancellation also block the residence until resolved.
  const taken = (u) => crm.byUnit[u] && (BOOKED.includes(crm.byUnit[u].status) || ['Under cancellation', 'To verify'].includes(crm.byUnit[u].status))
  const lead = db.leads.find((l) => l.id === v.leadId) || db.clients.find((c) => c.clientId === v.leadId)
  const listRate = n(rc.baseRate) * (1 - n(v.discountPct) / 100)
  const rate = v.finalRate !== '' && v.finalRate !== undefined ? n(v.finalRate) : listRate
  const effDisc = n(rc.baseRate) ? (1 - rate / n(rc.baseRate)) * 100 : 0
  const needsApproval = effDisc > n(rc.approvalAbove) + 1e-9
  const parkDefault = rc.parkingSlots?.[unit?.type] ?? 1
  // entitlement plus a capped number of extra car parks (Admin → rate card: parkingExtraMax, 2 by default).
  // 8 Nov: admins can promise more (3 and 4 BHK commitments of 4 or more); the parking check shows what is left.
  const parkMax = parkDefault + (isAdmin(user) ? Math.max(8, n(rc.parkingExtraMax ?? 2)) : n(rc.parkingExtraMax ?? 2))
  useEffect(() => { if (unit) set('parking', parkDefault) }, [v.unit]) // eslint-disable-line
  const canRound = ['admin', 'senior'].includes(user.appRole)
  const cs = useMemo(() => unit && costSheet({ unit, rateCard: rc, rate, plc: v.plc, parking: v.parking, funding: v.funding === 'Bank loan' ? 'Bank loan' : 'Self', plans: settings.plans, roundTo: v.roundTo }), [unit, rc, rate, v.plc, v.parking, v.funding, settings.plans, v.roundTo])
  // 8 Nov: the car parks this residence would be allotted if booked now (indicative)
  const park = useMemo(() => unit ? proposeForUnit({ parking: db.parking, clients: crm.clients, units: crm.units, settings, unit: unit.unit, count: n(v.parking) }) : { slots: [] }, [unit, db.parking, crm.clients, crm.units, settings, v.parking])
  const rep0 = db.users.find((x) => x.name === (lead?.owner || v.preparedBy || user.name)) || user
  const status = v.status || 'Draft'
  const save = (patch = {}) => {
    if (!unit) return notify('Pick a residence first', 'bad')
    // 2 Nov: a cost sheet is confidential, so it is always recorded against a lead or client with name, mobile and e-mail
    if (!lead) return notify('Pick the lead or client this cost sheet is for. Add a new lead first if they are not in Accord yet.', 'bad')
    const gap = [!lead.name && 'name', !lead.phone && 'mobile', !lead.email && !String(v.leadId).startsWith('YSC-C') && 'e-mail'].filter(Boolean)
    if (gap.length) return notify(`${lead.name || 'This lead'} has no ${gap.join(', ')}. Add it to the lead first, then save the cost sheet.`, 'bad')
    const rec = { ...v, proposedParking: park.slots.map((p) => p.id), id: v.id || nextId('costSheets', 'CS-', 4), date: v.date || today(), validTill: v.validTill || addDays(today(), n(rc.validityDays) || 15), rate, effDisc: Number(effDisc.toFixed(2)), total: Math.round(cs.total), av: Math.round(cs.av),
      name: lead?.name || v.name || '', owner: lead?.owner || user.name, preparedBy: v.preparedBy || user.name, status: needsApproval && !['Approved', 'Converted'].includes(status) ? 'Pending approval' : status === 'Draft' ? 'Ready' : status, ...patch }
    const r = upsert('costSheets', rec, { action: patch.status ? patch.status.toLowerCase() : 'saved' })
    if (r) cdraft.clear()
    if (r) { setV(r); notify(r.status === 'Pending approval' ? `Saved. ${effDisc.toFixed(1)}% is above ${rc.approvalAbove}%, so it waits for admin approval.` : 'Cost sheet saved') }
    return r
  }
  const pending = db.costSheets.filter((s) => s.status === 'Pending approval')
  const locked = ['Approved', 'Converted'].includes(status) && !isAdmin(user)
  return (
    <Page back={true} title="Cost sheet" subtitle="Pick the residence and the rate card does the rest. Sales choose a founding-privilege step; anything above the approval limit goes to an admin."
      actions={<><Seg options={[{ value: 'build', label: 'Build' }, { value: 'print', label: 'A4 preview' }, { value: 'list', label: `Saved (${db.costSheets.length})` }]} value={view} onChange={setView} /></>}>
      {isAdmin(user) && pending.length > 0 && <div className="note"><b>{pending.length} waiting for your approval:</b> {pending.map((s) => <Button key={s.id} size="sm" variant="ghost" onClick={() => { setV({ ...s }); setView('build') }}>{s.id} · {s.unit} · {s.effDisc}%</Button>)}</div>}
      {view === 'list' && <Card pad={false}><table className="table"><thead><tr><th>ID</th><th>Date</th><th>Residence</th><th>For</th><th className="right">Rate</th><th className="right">Total</th><th>Status</th><th>By</th></tr></thead>
        <tbody>{db.costSheets.map((s) => <tr key={s.id} className="click" onClick={() => { setV({ ...s }); setView('print') }}><td>{s.id}</td><td>{d(s.date)}</td><td>{s.unit}</td><td>{s.name}</td><td className="right">{inr(s.rate)}</td><td className="right">{inr(s.total)}</td><td><Badge tone={s.status === 'Pending approval' ? 'warn' : s.status === 'Approved' || s.status === 'Converted' ? 'good' : 'info'}>{s.status}</Badge></td><td>{s.preparedBy}</td></tr>)}</tbody></table>
        {!db.costSheets.length && <div className="empty">No cost sheets saved yet.</div>}</Card>}
      {view === 'build' && <DraftNote at={cdraft.restoredAt} onDiscard={() => cdraft.reset()} />}
      {view === 'build' && <div className="split-r split">
        <div>
          <Card title="1 · Residence and buyer">
            <div className="form fc1">
              <Field label="Residence"><Select value={v.unit} disabled={locked} onChange={(e) => set('unit', e.target.value)}
                options={crm.units.map((u) => ({ value: String(u.unit), label: `${u.unit} · ${u.type} · ${u.area} sft · fl ${u.floor}${taken(u.unit) ? ' · BOOKED' : ''}` }))} /></Field>
              {unit && taken(unit.unit) && <div className="note">Residence {unit.unit} is already booked by {crm.byUnit[unit.unit].name}.</div>}
              <Field label="For (lead or client)" hint="Needed: who receives the sheet is recorded"><RecordPicker value={v.leadId} onChange={(id) => set('leadId', id)} /></Field>
              <Field label="Funding"><Seg options={['Self', 'Bank loan']} value={v.funding} onChange={(x) => !locked && set('funding', x)} /></Field>
            </div>
          </Card>
          <Card title="2 · Rate">
            <div className="small muted" style={{ marginBottom: 6 }}>Standard base rate {inr(rc.baseRate)}/sft. Founding privilege:</div>
            <div className="chips" style={{ marginBottom: 12 }}>{(rc.discountSteps || []).map((s) => <button key={s} type="button" className={'chip' + (n(v.discountPct) === s && v.finalRate === '' ? ' on' : '')} disabled={locked}
              onClick={() => setV((x) => ({ ...x, discountPct: s, finalRate: '' }))}>{s ? `${s}% · ${inr(rc.baseRate * (1 - s / 100))}` : 'Standard'}{s > rc.approvalAbove ? ' *' : ''}</button>)}</div>
            <div className="form fc2">
              <Field label="Final rate (₹/sft)" hint="Only change for a negotiated rate; it is checked against the approval limit"><Input type="number" value={v.finalRate} disabled={locked} placeholder={String(listRate)} onChange={(e) => set('finalRate', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
              <Field label="Car parks" hint={unit ? `${parkDefault} with a ${unit.type}, up to ${parkMax - parkDefault} more${isAdmin(user) ? '' : ' (an admin can promise more)'}` : ''}><Input type="number" min={0} max={parkMax} value={v.parking} disabled={locked} onChange={(e) => set('parking', Math.max(0, Math.min(parkMax, Number(e.target.value))))} /></Field>
            </div>
            <p className="small" style={{ margin: '10px 0 0' }}>Effective founding privilege: <b>{effDisc.toFixed(2)}%</b> {needsApproval ? <Badge tone="warn">Needs approval (above {rc.approvalAbove}%)</Badge> : <Badge tone="good">Within limit</Badge>}</p>
          </Card>
          {unit && <Card title="Car parking we will allot" actions={<span className="small muted">{park.note}</span>}>
            {park.slots.length ? <ParkInset slots={park.slots} parking={db.parking} /> : <p className="muted small" style={{ margin: 0 }}>No car park on this sheet.</p>}
            {park.short > 0 && <div className="note" style={{ marginTop: 10 }}>Only {park.slots.length} of {n(v.parking)} can be found. Check Building and parking → Car parking → Rules and drawings → Commitments.</div>}
          </Card>}
          {(canRound || n(v.roundTo)) > 0 && <Card title="Round figure" actions={!canRound && <span className="locked">Set by Cyril or an admin</span>}>
            <div className="chips">{[[0, 'Exact'], [1000, 'Nearest ₹1,000'], [10000, 'Nearest ₹10,000'], [100000, 'Nearest ₹1 lakh']].map(([x, l]) => <button key={x} type="button" className={'chip' + (n(v.roundTo) === x ? ' on' : '')} disabled={!canRound || locked} onClick={() => set('roundTo', x)}>{l}</button>)}</div>
            {canRound && <Field label="Or a round total (₹)" hint="Typed figure for the total; the difference shows as a rounding adjustment"><Input type="number" value={n(v.roundTo) > 1000000 ? v.roundTo : ''} disabled={locked} placeholder="e.g. 25000000" onChange={(e) => set('roundTo', e.target.value === '' ? 0 : Number(e.target.value))} /></Field>}
            {cs && cs.roundAdj !== 0 && <p className="small" style={{ margin: '8px 0 0' }}>Rounding adjustment {cs.roundAdj > 0 ? '+' : '−'}{inr(Math.abs(cs.roundAdj))} on {inr(cs.exact)}</p>}
          </Card>}
          <Card title="3 · Terms">
            <Textarea rows={3} value={v.notes} disabled={locked} placeholder="Special terms for this buyer (added under the standard terms)" onChange={(e) => set('notes', e.target.value)} />
          </Card>
          <div className="row">
            <Badge tone={status === 'Pending approval' ? 'warn' : ['Approved', 'Converted'].includes(status) ? 'good' : 'info'}>{status}</Badge>
            {canWrite(user, 'costSheets') && !locked && <Button variant="dark" onClick={() => save()}>Save</Button>}
            {isAdmin(user) && status === 'Pending approval' && <Button variant="primary" onClick={() => save({ status: 'Approved', approvedBy: user.name, approvedOn: today() })}>Approve</Button>}
            {v.id && <Button onClick={() => setView('print')}>A4 preview</Button>}
            {v.id && <SendSheet v={v} cs={cs} unit={unit} lead={lead} />}
            {v.id && online && <label className="btn" title="The signed or agreement cost sheet, filed with the client in Drive">{v.agreementUrl ? 'Replace agreement cost sheet' : 'Upload agreement cost sheet'}<input type="file" hidden accept="application/pdf,image/*" onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return
              const c = crm.byUnit[unit?.unit]
              const folder = c ? `Clients/${c.unit} ${c.name}/06 Cost sheets` : `Leads/${v.leadId || 'walk-in'} ${lead?.name || ''}/Cost sheets`
              try { const url = await upload(f, folder, `${unit.unit}_${c?.clientId || v.leadId || ''}_agreement-cost-sheet_${today()}`, { kind: c ? 'client' : 'lead', recordId: c?.bookingId || v.leadId || '', label: lead?.name || '', category: 'Booking', doc: 'signed_cost_sheet' }); if (url) { save({ agreementUrl: url }); notify('Agreement cost sheet saved to Drive') } } catch (x) { notify('Upload failed: ' + x.message, 'bad') }
            }} /></label>}
            {v.agreementUrl && <a className="btn btn-ghost" href={v.agreementUrl} target="_blank" rel="noreferrer">Open agreement cost sheet</a>}
            {v.id && status !== 'Pending approval' && status !== 'Converted' && unit && !taken(unit.unit) && canWrite(user, 'costSheets') &&
              <Button variant="primary" onClick={() => setConvert({ name: lead?.name || '', phone: lead?.phone || '', owner: lead?.owner || user.name, bookingDate: today(), coapp: '', email: lead?.email || '' })}>Convert to booking →</Button>}
          </div>
        </div>
        <div>{cs ? <SheetView cs={cs} v={{ ...v, rate, name: lead ? fullName(lead) : v.name }} unit={unit} settings={settings} park={park} stages={db.clpStages} rep={rep0} parking={db.parking} /> : <Card><div className="empty">Pick a residence to see the cost sheet.</div></Card>}</div>
      </div>}
      {view === 'print' && cs && <div><div className="doc-tools no-print"><Button onClick={() => setView('build')}>← Edit</Button><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
        <div className="doc cs-doc" ref={docRef}><SheetView cs={cs} v={{ ...v, rate, name: lead ? fullName(lead) : v.name }} unit={unit} settings={settings} park={park} stages={db.clpStages} rep={rep0} parking={db.parking} doc /></div></div>}
      <Modal open={!!convert} onClose={() => setConvert(null)} title={`Convert to booking · residence ${unit?.unit}`} footer={<><Button onClick={() => setConvert(null)}>Cancel</Button><Button variant="primary" onClick={() => {
        if (!convert.name) return notify('Name is required', 'bad')
        if (taken(unit.unit)) return notify(`Residence ${unit.unit} was just booked by ${crm.byUnit[unit.unit].name}. Pick another residence.`, 'bad')
        const bookingId = nextId('clients', 'YSC-B-', 3)
        const cIds = db.clients.map((c) => Number(String(c.clientId).replace(/\D/g, ''))).filter(Boolean)
        const clientId = 'YSC-C-' + String(Math.max(0, ...cIds) + 1).padStart(3, '0')
        const cl = upsert('clients', { id: bookingId, bookingId, clientId, unit: unit.unit, status: 'Active', category: 'Retail', buyerType: convert.coapp ? 'Joint' : 'Individual', residency: lead?.residency || 'Resident', funding: v.funding, tc: Math.round(cs.av), adjustment: 0, plan: 'Construction-linked plan', agreement: 'Not executed', source: lead?.source, leadId: lead?.id, interests: lead?.interests || [], parkingEntitlement: v.parking, costSheetId: v.id, city: lead?.city, country: lead?.country, ...convert }, { action: 'booked', system: true })
        if (!cl) return
        if (lead?.id?.startsWith('YSC-L')) upsert('leads', { ...db.leads.find((l) => l.id === lead.id), stage: 'Booked', bookedAs: clientId }, { silent: true })
        const prior = db.interactions.filter((i) => i.recordId === lead?.id)
        prior.forEach((i) => i.status === 'Open' && upsert('interactions', { ...i, status: 'Done' }, { silent: true }))
        upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), recordId: clientId, type: 'Client', mode: 'Office visit', purpose: 'Booking', outcome: 'Positive', by: user.name, summary: `Reservation of residence ${unit.unit} at ${inr(rate)}/sft (cost sheet ${v.id}). Converted from ${lead?.id || 'walk-in'}.`, nextAction: 'Collect KYC and booking amount', nextDate: addDays(today(), 2), nextOwner: convert.owner, status: 'Open' }, { silent: true })
        // 8 Nov: the car parks quoted on this sheet are allotted to the new booking if they are still free
        park.slots.forEach((p) => { const r = db.parking.find((x) => x.id === p.id); if (r && !r.unit && r.status !== 'Blocked') upsert('parking', { ...r, unit: unit.unit, clientId, bookingId, name: convert.name, status: 'Allotted', allotStatus: 'Allotted', assignedOn: today(), assignedBy: user.name, allotNote: 'Quoted on cost sheet ' + v.id }, { silent: true }) })
        save({ status: 'Converted', bookingId })
        setConvert(null); nav('/crm/booking/' + bookingId)
      }}>Create booking</Button></>}>
        {convert && <div className="form fc2">
          <p className="span-all small muted" style={{ margin: 0 }}>Name, phone and advisor come from the lead. A client ID and booking ID are created and the lead is marked Booked.</p>
          <Field label="Primary applicant" span="all"><Input value={convert.name} onChange={(e) => setConvert({ ...convert, name: e.target.value })} /></Field>
          <Field label="Co-applicant"><Input value={convert.coapp} onChange={(e) => setConvert({ ...convert, coapp: e.target.value })} /></Field>
          <Field label="Phone"><Input value={convert.phone} onChange={(e) => setConvert({ ...convert, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={convert.email} onChange={(e) => setConvert({ ...convert, email: e.target.value })} /></Field>
          <Field label="Client advisor"><Select options={db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)} value={convert.owner} onChange={(e) => setConvert({ ...convert, owner: e.target.value })} /></Field>
          <Field label="Booking date"><Input type="date" value={convert.bookingDate} onChange={(e) => setConvert({ ...convert, bookingDate: e.target.value })} /></Field>
        </div>}
      </Modal>
    </Page>
  )
}

// 8 Nov: the car parks on a sheet, drawn with cars in their bays: the whole level and a close-up
export function ParkInset({ slots, parking, doc }) {
  const recs = (parking?.length ? parking.map(withDef) : []).filter((p) => p.x !== undefined)
  const all = recs.length ? recs : slots
  const levels = [...new Set(slots.map((p) => p.levelCode))].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))
  const hl = new Set(slots.map((p) => p.id))
  const pool = all.some((p) => p.id === slots[0]?.id) ? all : [...all, ...slots]
  return <div>
    {levels.map((lv) => <div key={lv} className="cs-park" style={{ marginBottom: 8 }}>
      <div><ParkingPlan level={lv} recs={pool} highlight={hl} compact cars="mine" /><div className="small muted">{levelName(lv)}: the whole deck, your bays marked</div></div>
      <div><ParkingPlan level={lv} recs={pool} highlight={hl} compact cars="mine" crop={[34, 24]} /><div className="small muted">Close-up</div></div>
    </div>)}
    <table className={doc ? '' : 'table dense'}><thead><tr><th>Car park</th><th>Level</th><th>Type</th><th>Walk to lobby</th></tr></thead>
      <tbody>{slots.map((p) => <tr key={p.id}><td><b>{p.id}</b></td><td>{levelName(p.levelCode)}</td><td>{p.kind === 'Single' ? 'Covered, independent' : isTandem(p) ? `Covered, tandem ${p.kind === 'Tandem rear' ? 'rear' : 'front'}` : p.kind}</td><td>about {p.walk} m</td></tr>)}</tbody></table>
  </div>
}

// The client pack (8 Nov, from Yamuna_Sky_City_Cost_Sheet_Master_Template_YHD.xlsx). Four pages go to the client:
// 1 financial summary, 2 payment plan at booking, 3 master payment schedule, 4 floor, unit and parking selection.
// Founding privilege, approval and internal notes stay on the Build screen.
function SheetView({ cs, v, unit, settings, doc, park, stages, rep, parking }) {
  const co = settings.company || {}
  const rc = settings.rateCard || {}
  const gst = (n(rc.gst) * 100).toFixed(0)
  const sub = v.id ? `${v.id} · ${d(v.date || today())}` : 'Draft'
  const slots = park?.slots || []
  // 8 Nov: the master CLP schedule from Admin → Settings (a general reference); the construction stages until it is set
  const master = (settings.clpMaster || []).filter((s) => n(s.pct) > 0)
  const clp = master.length ? master : [...(stages || [])].filter((s) => n(s.pct) > 0).sort((a, b) => n(a.no) - n(b.no))
  const hasTiming = master.some((s) => s.timing)
  const clpSum = clp.reduce((a, s) => a + n(s.pct), 0)
  let clpRun = 0
  const clpRows = clp.map((s, i) => { const amt = i === clp.length - 1 ? Math.round(cs.total) - clpRun : Math.round(cs.total * n(s.pct)); clpRun += amt; return { ...s, amt } })
  let planRun = 0
  const planRows = cs.plan.map((p, i) => { const amt = i === cs.plan.length - 1 ? Math.round(cs.total) - planRun : p.amount; planRun += amt; return { ...p, amt } })
  const particulars = <table><tbody>
    <tr><th style={{ width: '22%' }}>Client name</th><td>{v.name || '–'}</td><th style={{ width: '20%' }}>Date</th><td>{d(v.date || today())}</td></tr>
    <tr><th>Residence</th><td><b>{unit.unit}</b> · {unit.type} · position {unit.pos}</td><th>Floor</th><td>{ordinal(unit.floor)}{n(unit.floor) === 43 ? ' and 44th (duplex)' : ''}</td></tr>
    <tr><th>Floor band</th><td>{unit.band}</td><th>Saleable area</th><td>{n(unit.area).toLocaleString('en-IN')} sft{unit.terrace ? ` + ${unit.terrace} sft terrace` : ''}</td></tr>
    <tr><th>Car parks</th><td>{slots.length ? slots.map((p) => p.id).join(', ') : n(v.parking) || 'None'}{slots.length && park?.note !== 'Already allotted' ? ' (indicative)' : ''}</td><th>Valid till</th><td>{d(v.validTill || addDays(today(), n(rc.validityDays) || 15))}</td></tr>
    <tr><th>Client representative</th><td colSpan={3}>{rep?.name || v.preparedBy || ''}{rep?.designation ? ', ' + rep.designation : ''}{rep?.phone ? ' · ' + rep.phone : ''}</td></tr>
  </tbody></table>
  const page1 = <div className="cs-page">
    <DocHeader title="FINANCIAL SUMMARY" sub={sub} />
    <div className="sec">Unit particulars</div>
    {particulars}
    <div className="sec">Part A · Dimensions and rate</div>
    <table><thead><tr><th>Particulars</th><th className="right">Qty / area</th><th className="right">Rate</th><th className="right">Amount (₹)</th></tr></thead>
      <tbody>{cs.lines.filter((l) => l.amount).map((l) => <tr key={l.label}><td>{l.label}</td><td className="right">{n(l.qty).toLocaleString('en-IN')}</td><td className="right">{inr(l.rate)}</td><td className="right">{inr(l.amount)}</td></tr>)}
        <tr><td colSpan={3}><b>Total agreement value</b></td><td className="right"><b>{inr(cs.av)}</b></td></tr>
        <tr><td colSpan={3}>GST @ {gst}% on agreement value</td><td className="right">{inr(cs.gstA)}</td></tr>
        <tr className="total"><td colSpan={3}>Total cost of agreement (Part A)</td><td className="right">{inr(cs.partA)}</td></tr></tbody></table>
    <div className="sec">Part B · Other charges</div>
    <table><tbody>{cs.other.map((l) => <tr key={l.label}><td>{l.label}</td><td className="right">{l.qty > 1 ? n(l.qty).toLocaleString('en-IN') + ' × ' + inr(l.rate) : ''}</td><td className="right">{inr(l.amount)}</td></tr>)}
      <tr><td colSpan={2}>GST @ {gst}%</td><td className="right">{inr(cs.gstB)}</td></tr>
      <tr className="total"><td colSpan={2}>Total other charges (Part B)</td><td className="right">{inr(cs.partB)}</td></tr></tbody></table>
    {cs.roundAdj ? <table><tbody><tr><td>Grand total, exact</td><td className="right">{inr(cs.exact)}</td></tr><tr><td>Rounding adjustment</td><td className="right">{cs.roundAdj > 0 ? '' : '− '}{inr(Math.abs(cs.roundAdj))}</td></tr></tbody></table> : null}
    <div className="words">Grand total · Part A + Part B: {inr(cs.total)} · Rupees {words(Math.round(cs.total))} only</div>
    <div className="sec">Terms and notes</div>
    <ol>{(settings.terms || []).map((t, i) => <li key={i}>{t}</li>)}{v.notes && <li><b>{v.notes}</b></li>}</ol>
    <div className="sec">Payment details</div>
    <table><tbody><tr><th style={{ width: '22%' }}>Developer entity</th><td>{co.name}</td><th style={{ width: '14%' }}>Bank</th><td>{co.bank}</td></tr>
      <tr><th>Account number</th><td>{co.account}</td><th>IFSC</th><td>{co.ifsc}{co.branch ? ' · ' + co.branch : ''}</td></tr></tbody></table>
    {doc && <div className="sign"><div>For {co.name || 'Yamuna Homes and Design Pvt. Ltd.'}<br /><span className="sign-sub">Authorised signatory · date</span></div><div style={{ textAlign: 'right' }}>Client signature<br /><span className="sign-sub">Name · date</span></div></div>}
  </div>
  // 8 Nov: four pages: 1 financial summary, 2 this client's payment plan, 3 the master payment schedule (reference),
  // 4 floor, unit and parking selection
  const page2 = <div className="cs-page">
    <DocHeader title="PAYMENT PLAN" sub={sub} />
    <p className="small" style={{ margin: '0 0 6px' }}>Residence {unit.unit} · {unit.type} · {ordinal(unit.floor)} floor · grand total {inr(cs.total)} · {v.funding}</p>
    <div className="sec">Your payment plan at booking · {v.funding}</div>
    <table><thead><tr><th>Stage</th><th className="right">% of total</th><th className="right">Amount payable (₹)</th></tr></thead>
      <tbody>{planRows.map((p) => <tr key={p.stage}><td>{p.stage}</td><td className="right">{(n(p.pct) * 100).toFixed(0)}%</td><td className="right">{inr(p.amt)}</td></tr>)}
        <tr className="total"><td>Grand total</td><td className="right">{(cs.plan.reduce((a, p) => a + n(p.pct), 0) * 100).toFixed(0)}%</td><td className="right">{inr(planRun)}</td></tr></tbody></table>
    <p className="small" style={{ color: '#666' }}>This is the plan for this residence and funding mode as at the date of this cost sheet. Stage payments fall due on completion of the stage, payable within 15 days of the demand letter. Rounding is carried in the last line.</p>
    {doc && <div className="sign"><div>For {co.name || 'Yamuna Homes and Design Pvt. Ltd.'}<br /><span className="sign-sub">Authorised signatory · date</span></div><div style={{ textAlign: 'right' }}>Client signature<br /><span className="sign-sub">Name · date</span></div></div>}
  </div>
  const page2b = clpRows.length > 0 && <div className="cs-page">
    <DocHeader title="MASTER PAYMENT SCHEDULE" sub={sub} />
    <p className="small" style={{ margin: '0 0 6px' }}>Construction-linked payment schedule (CLP) for Yamuna Sky City, worked out on the grand total of residence {unit.unit} ({inr(cs.total)}). For reference.</p>
    <table className="cs-clp"><thead><tr><th>#</th><th>Completion stage</th>{hasTiming && <th>Indicative timing</th>}<th className="right">%</th><th className="right">Amount payable (₹)</th></tr></thead>
      <tbody>{clpRows.map((s, i) => <tr key={s.id || i}><td>{i + 1}</td><td>{s.stage}</td>{hasTiming && <td>{s.timing || ''}</td>}<td className="right">{(n(s.pct) * 100).toFixed(1).replace(/\.0$/, '')}%</td><td className="right">{inr(s.amt)}</td></tr>)}
        <tr className="total"><td /><td>Total</td>{hasTiming && <td />}<td className="right">{(clpSum * 100).toFixed(0)}%</td><td className="right">{inr(clpRun)}</td></tr></tbody></table>
    <p className="small" style={{ color: '#666' }}>A general reference: stages and timings are indicative and subject to change. Each instalment is payable within 15 days of the demand letter for that stage. Rounding is carried in the last line.</p>
  </div>
  const page3 = <div className="cs-page">
    <DocHeader title="FLOOR, UNIT AND PARKING" sub={`${unit.unit} · ${unit.type} · ${ordinal(unit.floor)} floor`} />
    <div className="cs-res">
      <div><div className="sec" style={{ marginTop: 0 }}>Elevation</div><ElevationDiagram unit={unit} /></div>
      <div><div className="sec" style={{ marginTop: 0 }}>Floor plan</div><UnitPlan unit={unit} /></div>
    </div>
    {slots.length > 0 && <><div className="sec">Car parking{park?.note !== 'Already allotted' ? ' · indicative, confirmed on allotment' : ''}</div><ParkInset slots={slots} parking={parking} doc={doc} /></>}
  </div>
  const body = <>{page1}{page2}{page2b}{page3}</>
  return doc ? body : <Card title={`Total ${inr(cs.total)}`} actions={<span className="small muted">Client pack: financial summary, payment plan, master payment schedule, floor, unit and parking</span>}><div className="doc" style={{ width: '100%', minHeight: 0, boxShadow: 'none', padding: 0 }}>{body}</div></Card>
}

// 2 Nov: send the cost sheet in one go. E-mail goes out with the Yamuna Sky City header; WhatsApp opens with the summary.
function SendSheet({ v, cs, unit, lead }) {
  const { user, online, sendEmail, notify, settings } = useStore()
  const [busy, setBusy] = useState(false)
  if (!cs || !unit) return null
  const who = lead ? (lead.title ? lead.title + ' ' + lead.name : (lead.name || '').split(' ')[0]) : 'Sir/Madam'
  const lines = [`Dear ${who},`, '', `As discussed, here is the cost sheet for residence ${unit.unit} (${unit.type}, ${unit.area} sq ft, floor ${unit.floor}) at Yamuna Sky City.`, '',
    `Rate: ${inr(v.rate)} per sq ft`, `Agreement value: ${inr(cs.av)}`, `Total including GST and other charges: ${inr(cs.total)}`, '', 'Payment schedule:',
    ...cs.plan.map((p) => `· ${p.stage}: ${(p.pct * 100).toFixed(0)}% · ${inr(p.amount)}`), '', `Valid till ${d(v.validTill)}. Reference ${v.id}.`, '', 'Warm regards,', user.name, user.designation || 'Client Relations', 'Yamuna Sky City']
  const text = lines.join('\n')
  const phone = lead?.whatsapp || lead?.phone
  const mail = async () => {
    if (!lead?.email) return notify('No e-mail on file for this buyer', 'bad')
    setBusy(true)
    try { await sendEmail({ to: lead.email, subject: `Yamuna Sky City · cost sheet for residence ${unit.unit}`, title: `Cost sheet · residence ${unit.unit}`, body: text, recordId: lead.clientId || lead.id }); notify('Cost sheet e-mailed to ' + lead.email) } catch (e) { notify(e.message, 'bad') } finally { setBusy(false) }
  }
  return <>
    {phone && <a className="btn" href={waLink(phone, text)} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
    {online && <Button onClick={mail} disabled={busy}>{busy ? 'Sending…' : 'E-mail it'}</Button>}
  </>
}
