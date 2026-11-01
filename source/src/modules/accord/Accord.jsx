import React, { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { canWrite, canOpen } from '../../lib/perms.js'
import { useCrm } from '../../lib/calc.js'
import { bookingFacts, bookingOptions, sessionsFor, projectsFor, briefRows } from '../../lib/designLink.js'
import { FloorPlan, plateOf, ordinal, tagOf, usePlateTone } from '../../components/Tower.jsx'
import { imageToData } from '../presales/Brochure.jsx'
import { Page, Card, Button, Badge, Grid, Stat, Modal, Field, Input, Select, Textarea, Seg, Confirm, Bar, KV } from '../../components/ui.jsx'
import RecordForm from '../../components/RecordForm.jsx'
import { d, inr, lakh, today, n, daysBetween } from '../../lib/format.js'

const PF = (team, bookings = []) => [{ k: 'bookingId', l: 'Booking (from Accord Sales)', t: 'select', o: bookings, span: 2 }, { k: 'status', l: 'Status', t: 'select', o: ['Concept', 'Design', 'Sourcing', 'Execution', 'Handover', 'On hold'] },
  { k: 'name', l: 'Project', span: 2 }, { k: 'client', l: 'Client', auto: true }, { k: 'location', l: 'Location' }, { k: 'unit', l: 'Residence', auto: true },
  { k: 'designer', l: 'Lead designer', t: 'select', o: team }, { k: 'due', l: 'Target date', t: 'date' }, { k: 'wallHeight', l: 'Wall height' }, { k: 'budget', l: 'Budget cap (₹)', t: 'number' }, { k: 'notes', l: 'Brief', t: 'textarea', span: 'all' }]

// Picking a booking fills the project from the CRM. Client and residence stay tied to the booking, not typed.
export function fromBooking(v, crm) {
  const c = crm.clients.find((x) => x.bookingId === v.bookingId)
  if (!c) return { ...v, clientId: '', unitNo: '' }
  const u = crm.units.find((x) => String(x.unit) === String(c.unit)) || {}
  return { ...v, clientId: c.clientId, unitNo: String(c.unit), client: c.name, unit: `${c.unit} · ${u.type || c.config || ''}${u.area ? ' · ' + u.area + ' sft' : ''}`.trim(),
    location: v.location || 'Yamuna Sky City, Mangaluru', name: v.name || `Residence ${c.unit} · ${c.name}` }
}
const withBooking = (prev, next, crm) => (next.bookingId !== prev.bookingId ? fromBooking(next, crm) : next)

export const boqTotals = (db, pid) => {
  const pk = {}; db.packages.filter((p) => p.projectId === pid).forEach((p) => (pk[p.id] = p))
  const lines = db.boq.filter((b) => b.projectId === pid).map((b) => { const q = db.quotes.find((x) => x.id === b.selectedQuote); const rate = q ? n(q.rate) : n(b.rate)
    return { ...b, q, budget: n(b.qty) * n(b.rate), current: n(b.qty) * rate, on: pk[b.packageId]?.on !== false } })
  const on = lines.filter((l) => l.on)
  return { lines, pk, budget: on.reduce((s, l) => s + l.budget, 0), current: on.reduce((s, l) => s + l.current, 0), locked: on.filter((l) => l.q).length, count: on.length }
}

export function Projects() {
  const { db, user, upsert, nextId } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const [add, setAdd] = useState(null)
  const team = db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)
  const can = canWrite(user, 'projects')
  // bookings that have an Accord session but no design project yet
  const waiting = crm.clients.filter((c) => c.bookingId && !['Cancelled', 'Transferred'].includes(c.status) && !projectsFor(db, c).length && sessionsFor(db, c).length)
  const create = () => { const r = upsert('projects', { ...add, id: nextId('projects', 'PR-', 3) }); if (r) nav('/accord/' + r.id) }
  return (
    <Page back={true} title="Accord projects" subtitle="Design visualisation and the bill of quantities: rooms, renders, finishes, packages, and costs that follow the quotes you select. Each project is tied to a booking in Accord Sales."
      actions={can && <Button variant="primary" onClick={() => setAdd({ status: 'Concept', designer: user.name, location: 'Yamuna Sky City, Mangaluru' })}>+ Project</Button>}>
      {waiting.length > 0 && <Card title={`Ready for design · ${waiting.length}`} actions={<span className="small muted">Buyers who have been through the Accord experience, with no project yet</span>}>
        {waiting.map((c) => { const s = sessionsFor(db, c)[0]
          return <div key={c.id} className="check-row"><span><b>{c.unit}</b> · {c.name} <span className="small muted">{[s.persona, s.palette, s.register].filter(Boolean).join(' · ')}</span></span>
            {can && <Button size="sm" onClick={() => setAdd(fromBooking({ status: 'Concept', designer: user.name, bookingId: c.bookingId, notes: briefRows(s).map((r) => r.join(': ')).join('\n') }, crm))}>Start project</Button>}</div> })}
      </Card>}
      <div className="mod-cards">{db.projects.map((p) => { const t = boqTotals(db, p.id), f = bookingFacts(crm, p)
        return <a key={p.id} className="mod-card" style={{ '--c': 'var(--m-accord)', cursor: 'pointer' }} onClick={() => nav('/accord/' + p.id)}>
          <div className="row between"><h3>{p.name}</h3><Badge>{p.status}</Badge></div>
          <p>{f ? `${f.unitNo} · ${f.type} · ${f.name || 'no buyer yet'}` : <span className="muted">Not linked to a booking</span>} · {p.designer} · due {d(p.due)}</p>
          <p>{db.rooms.filter((r) => r.projectId === p.id).length} rooms · {t.count} BOQ lines · {lakh(t.current)} ({t.locked} lines locked)</p></a> })}</div>
      <Modal open={!!add} onClose={() => setAdd(null)} title="New project" wide footer={<><Button onClick={() => setAdd(null)}>Cancel</Button><Button variant="primary" onClick={create}>Create</Button></>}>
        {add && <RecordForm fields={PF(team, bookingOptions(crm))} value={add} onChange={(x) => setAdd(withBooking(add, x, crm))} />}</Modal>
    </Page>
  )
}

export function ProjectDetail() {
  const { id } = useParams()
  const { db, user } = useStore()
  const crm = useCrm()
  const p = db.projects.find((x) => x.id === id)
  const [tab, setTab] = useState('rooms')
  const f = bookingFacts(crm, p)
  if (!p) return <Page back={true} title="Project not found" />
  const t = boqTotals(db, id)
  const left = daysBetween(today(), p.due)
  return (
    <Page title={p.name} back="/accord" backLabel="Projects" subtitle={f ? `${f.name || 'No buyer yet'} · Residence ${f.unitNo} · ${f.type} · ${f.area} sft · ${ordinal(Number(f.floor))} floor · designer ${p.designer || '–'}` : `${p.client || ''} · ${p.location || ''} · ${p.unit || ''} · designer ${p.designer || '–'} · not linked to a booking`}
      actions={<Seg options={[{ value: 'rooms', label: 'Design' }, { value: 'boq', label: 'BOQ' }, { value: 'summary', label: 'Summary' }, { value: 'client', label: 'Client and residence' }, { value: 'brief', label: 'Brief' }]} value={tab} onChange={setTab} />}>
      <Grid cols={5}>
        <Stat label="Budget (BOQ rates)" value={lakh(t.budget)} sub={`${t.count} active lines`} />
        <Stat label="Current (selected quotes)" value={lakh(t.current)} sub={`${t.locked} of ${t.count} lines locked`} tone={t.current > t.budget ? 'bad' : 'good'} />
        <Stat label="Variance" value={(t.current >= t.budget ? '+' : '') + lakh(t.current - t.budget)} sub={t.budget ? ((t.current / t.budget - 1) * 100).toFixed(1) + '%' : ''} tone={t.current > t.budget ? 'bad' : 'good'} />
        <Stat label="Rooms" value={db.rooms.filter((r) => r.projectId === id).length} sub={`${db.rooms.filter((r) => r.projectId === id && r.renders?.length).length} with renders`} tone="info" />
        <Stat label="Target" value={d(p.due)} sub={p.due && left !== null ? `${left} days left` : 'No target date'} tone={left < 30 ? 'warn' : 'teal'} />
      </Grid>
      {tab === 'rooms' && <Rooms p={p} />}{tab === 'boq' && <Boq p={p} t={t} />}{tab === 'summary' && <Summary p={p} t={t} />}{tab === 'client' && <ClientTab p={p} f={f} />}{tab === 'brief' && <Brief p={p} />}
    </Page>
  )
}

function Rooms({ p }) {
  const { db, user, upsert, nextId, remove, notify } = useStore()
  const rooms = db.rooms.filter((r) => r.projectId === p.id)
  const [sel, setSel] = useState(rooms[0]?.id)
  const [full, setFull] = useState(null)
  const can = canWrite(user, 'rooms')
  const r = rooms.find((x) => x.id === sel)
  const save = (patch) => upsert('rooms', { ...r, ...patch }, { silent: true })
  const boqOpts = db.boq.filter((b) => b.projectId === p.id).map((b) => ({ value: b.id, label: `${b.id} · ${b.item}` }))
  return (
    <div className="split-r split">
      <Card title="Rooms" actions={can && <Button size="sm" onClick={() => { const name = prompt('Room name'); if (name) { const x = upsert('rooms', { id: nextId('rooms', 'RM-', 2), projectId: p.id, name, renders: [], finishes: [], notes: '' }); x && setSel(x.id) } }}>+ Room</Button>}>
        {rooms.map((x) => <button key={x.id} className="user-btn" style={{ width: '100%', marginBottom: 6, borderColor: x.id === sel ? 'var(--ink)' : undefined }} onClick={() => setSel(x.id)}>
          {x.renders?.[0] ? <img src={x.renders[0]} alt="" style={{ width: 54, height: 36, objectFit: 'cover', borderRadius: 5 }} /> : <span className="avatar" style={{ borderRadius: 6, background: '#d9d2c5' }}>{x.name[0]}</span>}
          <span><b>{x.name}</b><small>{x.finishes.length} finishes · {x.renders?.length || 0} renders</small></span></button>)}
      </Card>
      {r && <div>
        <Card title={r.name} actions={can && <><label className="btn btn-sm">Upload renders<input type="file" accept="image/*" multiple hidden onChange={async (e) => { const fs = [...e.target.files]; try { const imgs = await Promise.all(fs.map((f) => imageToData(f, 1800))); save({ renders: [...(r.renders || []), ...imgs] }); notify(imgs.length + ' render(s) added') } catch (x) { notify('Could not read an image', 'bad') } }} /></label>
          <Confirm size="sm" label="Delete room?" onConfirm={() => { remove('rooms', r.id); setSel(rooms[0]?.id) }}>Delete</Confirm></>}>
          {r.renders?.length ? <div className="grid g2" style={{ marginBottom: 0 }}>{r.renders.map((u, k) => <div key={k} style={{ position: 'relative' }}><img src={u} alt="" onClick={() => setFull(u)} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }} />
            {can && <button className="btn btn-sm" style={{ position: 'absolute', top: 6, right: 6 }} onClick={() => save({ renders: r.renders.filter((_, j) => j !== k) })}>×</button>}</div>)}</div>
            : <div className="res-img" style={{ background: '#f1eee8', color: 'var(--muted)', border: '1px dashed var(--line)' }}>Upload the renders for this room. They also appear in the pre-sales design showcase.</div>}
        </Card>
        <Card title="Finishes" actions={can && <Button size="sm" onClick={() => save({ finishes: [...r.finishes, { surface: '', material: '', boq: '' }] })}>+ Finish</Button>}>
          <table className="table dense"><thead><tr><th>Surface</th><th>Material</th><th>BOQ line</th><th className="right">Line cost</th><th></th></tr></thead>
            <tbody>{r.finishes.map((f, k) => { const b = db.boq.find((x) => x.id === f.boq); const q = b && db.quotes.find((x) => x.id === b.selectedQuote); const setF = (patch) => save({ finishes: r.finishes.map((y, j) => (j === k ? { ...y, ...patch } : y)) })
              return <tr key={k}><td>{can ? <input className="input" value={f.surface} onChange={(e) => setF({ surface: e.target.value })} /> : f.surface}</td><td>{can ? <input className="input" value={f.material} onChange={(e) => setF({ material: e.target.value })} /> : f.material}</td>
                <td>{can ? <Select options={boqOpts} value={f.boq} onChange={(e) => setF({ boq: e.target.value })} placeholder="Link…" /> : f.boq}{q && <div className="small muted">{db.vendors.find((v) => v.id === q.vendorId)?.name}</div>}</td>
                <td className="right">{b ? lakh(b.qty * (q ? q.rate : b.rate)) : '–'}</td><td>{can && <Button size="sm" variant="ghost" onClick={() => save({ finishes: r.finishes.filter((_, j) => j !== k) })}>×</Button>}</td></tr> })}</tbody></table>
        </Card>
        <Card title="Design notes"><Textarea rows={3} value={r.notes} disabled={!can} onChange={(e) => save({ notes: e.target.value })} placeholder="Mood, references, lighting intent, things to avoid" /></Card>
      </div>}
      {full && <div className="modal-bg" onClick={() => setFull(null)}><img src={full} alt="" style={{ maxWidth: '94vw', maxHeight: '90vh', borderRadius: 10 }} /></div>}
    </div>
  )
}

function Boq({ p, t }) {
  const { db, user, upsert, remove, nextId } = useStore()
  const can = canWrite(user, 'boq')
  const [line, setLine] = useState(null)
  const pkgs = db.packages.filter((k) => k.projectId === p.id)
  const csv = () => {
    const rows = [['Package', 'Line', 'Item', 'Room', 'Qty', 'Unit', 'Budget rate', 'Budget amount', 'Selected vendor', 'Selected rate', 'Current amount', 'Included']]
    t.lines.forEach((l) => rows.push([t.pk[l.packageId]?.name, l.id, l.item, l.room, l.qty, l.unit, l.rate, l.budget, l.q ? db.vendors.find((v) => v.id === l.q.vendorId)?.name : '', l.q?.rate || '', l.current, l.on ? 'Yes' : 'No']))
    const blob = new Blob([rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${p.name.replace(/\W+/g, '_')}_BOQ_${today()}.csv`; a.click()
  }
  return (
    <>
      <div className="row no-print" style={{ marginBottom: 12 }}>{can && <Button variant="primary" onClick={() => setLine({ projectId: p.id, packageId: pkgs[0]?.id, unit: 'sqft', qty: 0, rate: 0 })}>+ BOQ line</Button>}
        {can && <Button onClick={() => { const name = prompt('Package name'); if (name) upsert('packages', { id: nextId('packages', 'PK-', 2), projectId: p.id, name, optional: false, on: true }) }}>+ Package</Button>}
        <Button onClick={csv}>Export CSV</Button><Button onClick={() => window.print()}>Print</Button><span className="small muted">Optional packages can be switched on or off; totals follow.</span></div>
      {pkgs.map((k) => { const ls = t.lines.filter((l) => l.packageId === k.id); const bud = ls.reduce((s, l) => s + l.budget, 0); const cur = ls.reduce((s, l) => s + l.current, 0)
        return <Card key={k.id} title={<span>{k.name} {k.optional && <Badge tone="info">Optional</Badge>}</span>} actions={<><span className="small">{lakh(bud)} → <b style={{ color: cur > bud ? 'var(--bad)' : 'var(--good)' }}>{lakh(cur)}</b></span>
          {can && k.optional && <Seg options={[{ value: true, label: 'Included' }, { value: false, label: 'Excluded' }]} value={k.on !== false} onChange={(x) => upsert('packages', { ...k, on: x }, { action: x ? 'package included' : 'package excluded' })} />}</>} pad={false}>
          <table className="table dense" style={k.on === false ? { opacity: 0.45 } : null}><thead><tr><th>Line</th><th>Item</th><th>Room</th><th className="right">Qty</th><th className="right">Budget rate</th><th className="right">Budget</th><th>Selected quote</th><th className="right">Current</th><th></th></tr></thead>
            <tbody>{ls.map((l) => <tr key={l.id} className={can ? 'click' : ''} onClick={() => can && setLine({ ...l, q: undefined, budget: undefined, current: undefined, on: undefined })}><td>{l.id}</td><td>{l.item}</td><td>{l.room}</td><td className="right">{n(l.qty).toLocaleString('en-IN')} {l.unit}</td><td className="right">{inr(l.rate)}</td><td className="right">{inr(l.budget)}</td>
              <td>{l.q ? <span>{db.vendors.find((v) => v.id === l.q.vendorId)?.name} · {inr(l.q.rate)}</span> : <Link to="/sourcing/compare" onClick={(e) => e.stopPropagation()} className="small">{db.quotes.filter((q) => q.boqId === l.id).length} quotes · compare</Link>}</td>
              <td className="right"><b>{inr(l.current)}</b></td><td>{l.q && <Badge tone={l.current > l.budget ? 'bad' : 'good'}>{l.budget ? ((l.current / l.budget - 1) * 100).toFixed(0) + '%' : ''}</Badge>}</td></tr>)}</tbody></table>
          {!ls.length && <div className="empty">No lines in this package.</div>}
        </Card> })}
      <Card><div className="row between"><b>Total (included packages)</b><span>Budget {inr(t.budget)} · Current <b>{inr(t.current)}</b> · GST extra as per quotes</span></div></Card>
      <Modal open={!!line} onClose={() => setLine(null)} title={line?.id ? 'BOQ line ' + line.id : 'New BOQ line'} footer={<>{line?.id && <Confirm label="Delete line?" onConfirm={() => { remove('boq', line.id); setLine(null) }}>Delete</Confirm>}<Button onClick={() => setLine(null)}>Cancel</Button>
        <Button variant="primary" onClick={() => { upsert('boq', { ...line, id: line.id || nextId('boq', 'BQ-', 2) }); setLine(null) }}>Save</Button></>}>
        {line && <RecordForm cols={2} value={line} onChange={setLine} fields={[{ k: 'item', l: 'Item', span: 'all' }, { k: 'packageId', l: 'Package', t: 'select', o: pkgs.map((k) => ({ value: k.id, label: k.name })) }, { k: 'room', l: 'Room' },
          { k: 'qty', l: 'Quantity', t: 'number' }, { k: 'unit', l: 'Unit', t: 'select', o: ['sqft', 'rft', 'nos', 'sets', 'lot', 'sqm'] }, { k: 'rate', l: 'Budget rate (₹)', t: 'number' },
          { k: 'selectedQuote', l: 'Selected quote', t: 'select', o: db.quotes.filter((q) => q.boqId === line.id).map((q) => ({ value: q.id, label: `${db.vendors.find((v) => v.id === q.vendorId)?.name} · ${inr(q.rate)}` })) }, { k: 'spec', l: 'Specification', t: 'textarea', span: 'all' }]} />}
      </Modal>
    </>
  )
}

function Summary({ p, t }) {
  const { db } = useStore()
  const rows = Object.values(t.pk).map((k) => { const ls = t.lines.filter((l) => l.packageId === k.id); return { k, bud: ls.reduce((s, l) => s + l.budget, 0), cur: ls.reduce((s, l) => s + l.current, 0), locked: ls.filter((l) => l.q).length, n: ls.length } })
  const max = Math.max(1, ...rows.map((r) => Math.max(r.bud, r.cur)))
  const byRoom = useMemo(() => { const m = {}; t.lines.filter((l) => l.on).forEach((l) => { const r = l.room || 'General'; m[r] = (m[r] || 0) + l.current }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }, [t])
  return (
    <div className="grid g2">
      <Card title="By package: budget vs current">{rows.map(({ k, bud, cur, locked, n: c }) => <div key={k.id} style={{ marginBottom: 10, opacity: k.on === false ? 0.45 : 1 }}>
        <div className="row between small"><b>{k.name}</b><span>{lakh(bud)} → {lakh(cur)} · {locked}/{c} locked</span></div>
        <div style={{ display: 'grid', gap: 2 }}><Bar value={bud / max} tone="info" /><Bar value={cur / max} tone={cur > bud ? 'bad' : 'good'} /></div></div>)}</Card>
      <div>
        <Card title="By room (current)">{byRoom.map(([r, v]) => <div key={r} className="check-row"><span>{r}</span><b>{lakh(v)}</b></div>)}</Card>
        <Card title="Still to lock">{t.lines.filter((l) => l.on && !l.q).slice(0, 20).map((l) => <div key={l.id} className="check-row"><span>{l.id} · {l.item}</span><span className="small muted">{db.quotes.filter((q) => q.boqId === l.id).length} quotes</span></div>)}</Card>
      </div>
    </div>
  )
}

function Brief({ p }) {
  const { db, user, upsert } = useStore()
  const crm = useCrm()
  const [v, setV] = useState({ ...p })
  const team = db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)
  return <Card title="Project brief" actions={canWrite(user, 'projects') && <Button variant="primary" onClick={() => upsert('projects', v)}>Save</Button>}><RecordForm fields={PF(team, bookingOptions(crm))} value={v} onChange={(x) => setV(withBooking(v, x, crm))} readOnly={!canWrite(user, 'projects')} /></Card>
}

// Client and residence: the booking as Accord Sales holds it (no money), the plate with the residence lit,
// and every Accord experience session the buyer has been through, newest first, as the design brief.
function ClientTab({ p, f }) {
  const { db, user, upsert } = useStore()
  const crm = useCrm()
  const [pick, setPick] = useState(p.bookingId || '')
  const [light] = usePlateTone()
  const can = canWrite(user, 'projects')
  if (!f) return <Card title="Link this project to a booking">
    <p className="muted">Choose the booking this project is for. The client, residence, type and area then come from Accord Sales and stay in step with it.</p>
    <div className="row gap-s"><Select style={{ maxWidth: 420 }} options={bookingOptions(crm)} value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Choose a booking" />
      {can && <Button variant="primary" disabled={!pick} onClick={() => upsert('projects', fromBooking({ ...p, bookingId: pick, name: p.name }, crm))}>Link</Button>}</div>
  </Card>
  const c = f.client
  const sessions = c ? sessionsFor(db, c) : (db.accordSessions || []).filter((s) => String(s.unitRef || '').replace(/\D/g, '') === f.unitNo)
  const t = tagOf(f.unitNo)
  const others = c ? projectsFor(db, c).filter((x) => x.id !== p.id) : []
  return (
    <div className="split">
      <div>
        <Card title={`Residence ${f.unitNo}`} actions={<Badge>{f.status}</Badge>}>
          <div className={'fp-box' + (light ? ' plate-light' : '')}>{plateOf(t.floor) ? <FloorPlan floor={t.floor} highlight={t.tag} statusOf={() => null} /> : <div className="fp-empty">No drawing for this floor.</div>}
            <div className="fp-cap"><span>{plateOf(t.floor)?.title}</span><span>{t.tag}</span></div></div>
          <div style={{ marginTop: 12 }}><KV rows={[['Type', f.type], ['Floor', `${ordinal(Number(f.floor))} · ${f.pos || t.tag}${Number(f.floor) === 43 ? ' · duplex with 44' : ''}`], ['Band', f.band], ['Saleable area', f.area ? f.area + ' sft' : ''], f.terrace ? ['Terrace', f.terrace + ' sft'] : null]} /></div>
        </Card>
      </div>
      <div>
        <Card title="Client" actions={c && canOpen(user, 'crm') && <Link className="btn btn-sm" to={'/crm/clients/' + c.id}>Client 360</Link>}>
          {c ? <KV rows={[['Name', c.name], ['Client ID', c.clientId], ['Booking', c.bookingId], ['Status', c.status], ['Looked after by', c.owner || 'No relationship owner'], c.familyProfile ? ['Family', c.familyProfile] : null, c.occupant ? ['Occupant', c.occupant] : null, c.interests?.length ? ['Interests', c.interests.join(', ')] : null]} />
            : <p className="muted" style={{ margin: 0 }}>No booking on this residence yet.</p>}
          {others.length > 0 && <div className="small muted" style={{ marginTop: 8 }}>Also: {others.map((x) => <Link key={x.id} to={'/accord/' + x.id}>{x.id} </Link>)}</div>}
        </Card>
        <Card title={`Accord experience · ${sessions.length} session${sessions.length === 1 ? '' : 's'}`} actions={canOpen(user, 'experience') && <Link className="btn btn-sm" to="/experience">Sessions</Link>}>
          {!sessions.length ? <p className="muted" style={{ margin: 0 }}>The buyer has not been through the Accord experience yet. Run it with them from Accord Design → Experience; it is saved here.</p>
            : sessions.map((s, i) => <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px dashed var(--line-2)' }}>
              <div className="row between"><b>{i === 0 ? 'Latest' : 'Earlier'} · {d(String(s.updatedAt || '').slice(0, 10))}</b><span className="small muted">{s.id}</span></div>
              <KV rows={briefRows(s)} />
              {i === 0 && can && <Button size="sm" style={{ marginTop: 6 }} onClick={() => upsert('projects', { ...p, notes: [p.notes, '', 'From the Accord experience ' + s.id + ':', ...briefRows(s).map((r) => r.join(': '))].filter((x) => x !== undefined).join('\n').trim() })}>Add to the project brief</Button>}
            </div>)}
        </Card>
      </div>
    </div>
  )
}
