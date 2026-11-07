import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canWrite, canOpen, canPage, seesMoney } from '../../lib/perms.js'
import { TowerStack, FloorPlan, usePlateTone, useAvailability, plateOf, plateRange, ordinal, unitNo, tagOf, experienceUrl } from '../../components/Tower.jsx'
import { sessionsFor, projectsFor } from '../../lib/designLink.js'
import { Page, Card, Button, Badge, Grid, Stat, Seg, Modal, Field, Input, Select, KV, Confirm } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { inr, lakh, pct, d } from '../../lib/format.js'
import { stageReady, stageTrigger } from '../../lib/schedule.js'

const cls = (c) => !c ? '' : BOOKED.includes(c.status) ? 'sold' : c.status === 'Transferred' ? 'transfer' : ['Under cancellation', 'Cancelled'].includes(c.status) ? 'cancel' : c.status === 'To verify' ? 'verify' : ''

export default function Inventory() {
  const [qs] = useSearchParams()
  const [tab, setTab] = useState(qs.get('tab') || 'building')
  return (
    <Page back={true} title="Building and parking" subtitle="Live availability for every residence, and car parks assigned by entitlement."
      actions={<Seg options={[{ value: 'building', label: 'Building' }, { value: 'list', label: 'Unit list' }, { value: 'parking', label: 'Car parking' }, { value: 'construction', label: 'Construction' }]} value={tab} onChange={setTab} />}>
      {tab === 'building' && <Building />}{tab === 'list' && <UnitList />}{tab === 'parking' && <Parking />}{tab === 'construction' && <Construction />}
    </Page>
  )
}

// 1 Nov: Aryan finds the 3D tower hard to move around, so the grid (the CRM master layout) opens first; the choice is remembered.
function Building() {
  const [view, setV] = useState(() => { try { return localStorage.getItem('accord.buildingView') || 'grid' } catch (e) { return 'grid' } })
  const setView = (v) => { setV(v); try { localStorage.setItem('accord.buildingView', v) } catch (e) { /* */ } }
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="small muted">{view === 'tower' ? 'The tower and plates from the Accord experience, coloured live from the Client Master.' : 'Every residence as a grid, floor by floor.'}</span>
        <Seg options={[{ value: 'grid', label: 'Grid' }, { value: 'elevation', label: 'Elevation' }, { value: 'tower', label: 'Tower and plans' }]} value={view} onChange={setView} />
      </div>
      {view === 'tower' ? <TowerView /> : view === 'elevation' ? <Elevation /> : <GridView />}
    </>
  )
}

// 2 Nov: a plain white-model elevation that is easy to read and click. Each floor shows how much of it is booked;
// click a floor to see its residences. A rendered white model can replace the drawing later without changing this.
function Elevation() {
  const crm = useCrm()
  const { db } = useStore()
  const [sel, setSel] = useState(null)
  const floors = useMemo(() => { const m = {}; crm.units.forEach((u) => (m[u.floor] = m[u.floor] || []).push(u)); return Object.keys(m).map(Number).sort((a, b) => b - a).map((f) => ({ f, units: m[f].sort((a, b) => String(a.pos).localeCompare(String(b.pos))) })) }, [crm.units])
  const done = (db.clpStages || []).filter((s) => s.status === 'Completed').map((s) => (String(s.stage).match(/(\d+)(?:st|nd|rd|th)\s+floor/i) || [])[1]).filter(Boolean).map(Number)
  const builtTo = done.length ? Math.max(...done) : 0
  const H = 9, W = 220, top = 40, pod = 2
  const h = top + floors.length * H + pod * 18 + 20
  const st = (u) => { const c = crm.byUnit[u.unit]; return !c ? 'free' : BOOKED.includes(c.status) ? 'sold' : 'hold' }
  const cur = floors.find((x) => x.f === sel)
  return <div className="split">
    <Card title="Elevation" actions={<span className="small muted">{builtTo ? `Structure done to floor ${builtTo}` : 'Construction stages under the Construction tab'}</span>}>
      <svg className="elev" viewBox={`0 0 ${W + 160} ${h}`} role="img" aria-label="Tower elevation, click a floor">
        <rect x={60} y={8} width={W} height={top - 8} fill="#f4f4f2" stroke="#999" />
        <text x={60 + W / 2} y={28} textAnchor="middle" fontSize="11" fill="#666">Crown</text>
        {floors.map(({ f, units }, i) => { const y = top + i * H, sold = units.filter((u) => st(u) === 'sold').length, hold = units.filter((u) => st(u) === 'hold').length, w = W / units.length
          return <g key={f} onClick={() => setSel(f)}>
            <rect className="fl" x={60} y={y} width={W} height={H - 1} fill={f <= builtTo ? '#ffffff' : '#f3f3f3'} stroke={sel === f ? 'var(--accent, #b8860b)' : '#bbb'} strokeWidth={sel === f ? 2 : 0.6} />
            {units.map((u, k) => st(u) !== 'free' && <rect key={u.unit} x={60 + k * w + 1} y={y + 1.5} width={w - 2} height={H - 4} fill={st(u) === 'sold' ? 'var(--accent, #b8860b)' : '#f6b26b'} opacity={0.75} pointerEvents="none" />)}
            {(f % 5 === 0 || sel === f) && <text x={52} y={y + H - 1.5} textAnchor="end" fontSize="8" fill="#555">{f}</text>}
            {sel === f && <text x={66 + W} y={y + H - 1.5} fontSize="8" fill="#333">{sold} booked · {units.length - sold - hold} free</text>}
          </g> })}
        {Array.from({ length: pod }).map((_, k) => <rect key={k} x={40} y={top + floors.length * H + k * 18} width={W + 40} height={17} fill="#e9e9e6" stroke="#aaa" />)}
        <text x={60 + W / 2} y={top + floors.length * H + 22} textAnchor="middle" fontSize="10" fill="#666">Podium and parking</text>
      </svg>
      <div className="legend" style={{ marginTop: 8 }}><span><i style={{ background: 'var(--accent)' }} />Booked</span><span><i style={{ background: '#f6b26b' }} />On hold / to verify</span><span><i style={{ background: '#fff', border: '1px solid #bbb' }} />Available</span></div>
    </Card>
    <Card title={cur ? `Floor ${cur.f}` : 'Pick a floor'}>
      {!cur ? <p className="muted" style={{ margin: 0 }}>Click a floor on the elevation to see its residences.</p> :
        <table className="table dense"><thead><tr><th>Residence</th><th>Type</th><th className="right">Area</th><th>Status</th></tr></thead>
          <tbody>{cur.units.map((u) => { const c = crm.byUnit[u.unit]; return <tr key={u.unit}><td className="mono">{u.unit}</td><td>{u.type}</td><td className="right">{u.area}</td><td>{!c ? <Badge tone="good">Available</Badge> : <Badge tone={BOOKED.includes(c.status) ? 'accent' : 'warn'}>{c.status}</Badge>}</td></tr> })}</tbody></table>}
    </Card>
  </div>
}

// 2 Nov: construction stages. Finance and admin keep the status and dates; demand calls follow the completed stages.
function Construction() {
  const { db, user, upsert, notify, upload, backend } = useStore()
  const crm = useCrm()
  const edit = canWrite(user, 'clpStages')
  const rows = [...(db.clpStages || [])].sort((a, b) => Number(a.no) - Number(b.no))
  const [cert, setCert] = useState(null)
  const set = (s, k, v) => { upsert('clpStages', { ...s, [k]: v, ...(k === 'status' && v === 'Completed' && !s.actual ? { actual: new Date().toISOString().slice(0, 10) } : {}) }); notify('Stage ' + s.no + ' updated') }
  const doneN = rows.filter((s) => s.status === 'Completed').length, pctDone = rows.filter((s) => s.status === 'Completed').reduce((a, s) => a + Number(s.pct || 0), 0)
  // 7 Nov: who owes what when a stage is certified, so finance can raise the letters
  const owing = (s) => crm.clients.filter((c) => (c.schedule || []).some((r) => r.clpStage === s.id && r.state === 'Letter not sent')).length
  const missingCert = rows.filter((s) => s.status === 'Completed' && !stageReady(s))
  return <>
    <Grid cols={3}>
      <Stat label="Stages completed" value={`${doneN} / ${rows.length}`} tone="good" />
      <Stat label="In progress" value={rows.filter((s) => s.status === 'In progress').length} tone="info" />
      <Stat label="Payment share reached" value={pct(pctDone)} sub="of the construction-linked plan" tone="accent" />
    </Grid>
    {missingCert.length > 0 && <div className="note warn small">{missingCert.length} completed stage{missingCert.length === 1 ? ' has' : 's have'} no completion certificate. A demand letter can go out for a stage only once the architect's or engineer's certificate is attached (or marked "on file" for stages billed before Accord).</div>}
    <Card title="Construction stages" pad={false} actions={!edit && <span className="locked">Updated by finance and admin</span>}>
      <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>#</th><th>Stage</th><th className="right">Plan %</th><th>Status</th><th>Planned</th><th>Actual</th><th>Certificate</th><th>Due on</th></tr></thead>
        <tbody>{rows.map((s) => { const k = owing(s); return <tr key={s.id}><td className="mono">{s.no}</td><td>{s.stage}{s.status === 'Completed' && stageReady(s) && k > 0 && <div className="small" style={{ color: 'var(--warn)' }}>{k} client{k === 1 ? '' : 's'} to be sent a demand letter · <Link to="/crm/payments?tab=demand">raise</Link></div>}</td><td className="right">{(Number(s.pct || 0) * 100).toFixed(1)}%</td>
          <td>{edit ? <Select options={['Not started', 'In progress', 'Completed']} value={s.status || 'Not started'} onChange={(e) => set(s, 'status', e.target.value)} /> : <Badge tone={s.status === 'Completed' ? 'good' : s.status === 'In progress' ? 'info' : 'muted'}>{s.status || 'Not started'}</Badge>}</td>
          <td>{edit ? <Input type="date" value={s.planned || ''} onChange={(e) => set(s, 'planned', e.target.value)} /> : d(s.planned) || '–'}</td>
          <td>{edit ? <Input type="date" value={s.actual || ''} onChange={(e) => set(s, 'actual', e.target.value)} /> : d(s.actual) || '–'}</td>
          <td>{s.certNo ? <span className="small">{s.certUrl ? <a href={s.certUrl} target="_blank" rel="noreferrer">{s.certNo}</a> : s.certNo}<div className="muted">{d(s.certDate)}{s.certifiedBy ? ' · ' + s.certifiedBy : ''}</div></span> : s.certWaived === 'Yes' ? <span className="small muted">On file (before Accord)</span> : s.status === 'Completed' ? <Badge tone="warn">Missing</Badge> : <span className="muted">–</span>}
            {edit && s.status === 'Completed' && <div><Button size="sm" variant="ghost" onClick={() => setCert({ ...s })}>{s.certNo ? 'Change' : 'Attach'}</Button></div>}</td>
          <td>{edit ? <Select options={[{ value: '', label: 'From the name' }, { value: 'booking', label: 'Booking' }, { value: 'agreement', label: 'Registered agreement' }, { value: 'stage', label: 'Demand letter' }, { value: 'handover', label: 'Possession' }]} value={s.trigger || ''} onChange={(e) => set(s, 'trigger', e.target.value)} /> : <span className="small">{{ booking: 'Booking', agreement: 'Agreement', stage: 'Demand letter', handover: 'Possession' }[stageTrigger(s)]}</span>}</td></tr> })}</tbody></table></div>
    </Card>
    {cert && <Modal open onClose={() => setCert(null)} title={'Completion certificate · stage ' + cert.no} footer={<><Button onClick={() => setCert(null)}>Cancel</Button>
      <Button onClick={() => { upsert('clpStages', { ...rows.find((x) => x.id === cert.id), certWaived: 'Yes' }); notify('Marked as on file'); setCert(null) }}>Billed before Accord, certificate on file</Button>
      <Button variant="primary" onClick={async () => { if (!cert.certNo || !cert.certDate) return notify('Enter the certificate number and date', 'bad'); let url = cert.certUrl || ''
        if (cert.file && backend) url = await upload(cert.file, 'Project documents/Site progress', `stage-${cert.no}_completion-certificate_${cert.certDate}`, { kind: 'project', label: 'Stage ' + cert.no, category: 'Site progress', doc: 'completion certificate' }).catch(() => url)
        const { file, ...rest } = cert; upsert('clpStages', { ...rest, certUrl: url }); notify('Certificate saved for stage ' + cert.no); setCert(null) }}>Save certificate</Button></>}>
      <p className="small muted" style={{ marginTop: 0 }}>{cert.stage}. The demand letter quotes this certificate.</p>
      <div className="form fc2">
        <label className="field"><span className="field-label">Certificate number *</span><Input value={cert.certNo || ''} onChange={(e) => setCert({ ...cert, certNo: e.target.value })} /></label>
        <label className="field"><span className="field-label">Certificate date *</span><Input type="date" value={cert.certDate || ''} onChange={(e) => setCert({ ...cert, certDate: e.target.value })} /></label>
        <label className="field span-all"><span className="field-label">Certified by (architect or engineer)</span><Input value={cert.certifiedBy || ''} onChange={(e) => setCert({ ...cert, certifiedBy: e.target.value })} /></label>
        <label className="field span-all"><span className="field-label">Certificate (PDF or photo){backend ? ' · saved to Google Drive' : ' · connect the backend to save files'}</span><input type="file" accept="image/*,application/pdf" disabled={!backend} onChange={(e) => setCert({ ...cert, file: e.target.files[0] })} /></label>
      </div>
    </Modal>}
  </>
}

// Accord Design reads the same tower: which residences are sold, to whom, and which have a project or a session.
export function Residences() {
  return <Page back={true} title="Residences" subtitle="The tower and its plates, with every booking from Accord Sales. Open a residence to see its buyer, Accord sessions and design projects."><TowerView /></Page>
}

const TYPES = ['2 BHK', '3 BHK', '4 BHK', '5 BHK']
const NO_PLAN = (f) => f <= 2 ? 'Ground to 2nd floor: arrival, podium and parking. No residences.' : 'Terrace and services. No residences.'

function TowerView() {
  const { db, user } = useStore()
  const crm = useCrm()
  const [qs] = useSearchParams()
  const pre = qs.get('unit') ? tagOf(qs.get('unit')) : null
  const [floor, setFloor] = useState(pre?.floor ?? 3)
  const [tag, setTag] = useState(pre?.tag ?? null)
  const [hover, setHover] = useState(null)
  const [hoverUnit, setHoverUnit] = useState(null)
  useEffect(() => { if (pre) { setFloor(pre.floor); setTag(pre.tag) } }, [qs.get('unit')]) // eslint-disable-line
  const [type, setType] = useState('')
  const statusOf = useAvailability(crm.clients)
  const [light, flipTone] = usePlateTone()
  const box = useRef(null), planRef = useRef(null)
  const [full, setFull] = useState(false)
  useEffect(() => { const h = () => setFull(document.fullscreenElement === box.current); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h) }, [])
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else box.current?.requestFullscreen?.().catch(() => {}) }
  const blocked = crm.units.filter((u) => statusOf(u.floor, u.pos) === 'blocked').length
  const sold = crm.units.filter((u) => statusOf(u.floor, u.pos) === 'sold').length
  const typeCount = useMemo(() => Object.fromEntries(TYPES.map((t) => { const l = crm.units.filter((u) => u.type === t); return [t, { all: l.length, open: l.filter((u) => statusOf(u.floor, u.pos) === 'unsold').length }] })), [crm.units, statusOf])
  const marked = useMemo(() => { const s = new Set(); if (type) crm.units.forEach((u) => { if (u.type === type) { s.add(u.floor); if (u.floor === 43) s.add(44) } }); return s }, [type, crm.units])
  const plate = plateOf(floor)
  const dataFloor = floor === 44 ? 43 : floor
  const onFloor = crm.units.filter((u) => u.floor === dataFloor).sort((a, b) => a.pos.localeCompare(b.pos))
  const unitN = tag ? unitNo(floor, tag) : null
  const choose = (f) => { setFloor(f); setTag(null) }
  const shown = hover ?? floor
  return (
    <>
      <Grid cols={4}>
        <Stat label="Residences" value={crm.units.length} sub="3rd to 58th floor" />
        <Stat label="Sold" value={sold} sub={pct(sold / crm.units.length)} tone="accent" />
        <Stat label="Available" value={crm.units.length - sold - blocked} tone="good" />
        <Stat label="Blocked" value={blocked} sub="To verify or under cancellation" tone="warn" />
      </Grid>
      <div ref={box} className={full ? 'inv-full' : ''}>
      <div className="row between" style={{ marginBottom: 14, gap: 12, alignItems: 'flex-start' }}>
      <div className="type-cards" role="group" aria-label="Mark floors by residence type">
        <button className="type-card" aria-pressed={!type} onClick={() => setType('')}><b>All residences</b><span>{crm.units.length - sold - blocked} available</span></button>
        {TYPES.map((t) => <button key={t} className="type-card" aria-pressed={type === t} onClick={() => setType(type === t ? '' : t)}><b>{t}</b><span>{typeCount[t].open} of {typeCount[t].all} available</span></button>)}
      </div>
      <div className="row gap-s"><Button size="sm" onClick={flipTone}>{light ? 'Dark drawings' : 'White drawings'}</Button><Button size="sm" onClick={toggleFull}>{full ? 'Exit full screen' : 'Full screen'}</Button></div>
      </div>
      {/* Vertical, unboxed: the tower across the page, then the plate it opens, then the residences on it. */}
      <div className="inv-v">
        <TowerStack hovered={hover} selected={floor} marked={marked} onHover={setHover} onSelect={(f) => { choose(f); setTimeout(() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60) }}
          statusOf={statusOf} height={full ? Math.max(600, window.innerHeight - 120) : Math.max(640, Math.min(880, window.innerHeight - 170))} light={light} bare maxPlate={full ? 980 : 780} />
        <section className="inv-plan" ref={planRef}>
          <div className="inv-plan-head">
            <div>
              <div className="label">{plateOf(shown) ? plateOf(shown).title : 'Not a residential floor'}{shown === 44 ? ' · upper level of the 43rd-floor duplexes' : ''}{plateOf(shown) && plateOf(shown).to > plateOf(shown).from ? ' · typical floors ' + plateRange(plateOf(shown)) : ''}</div>
              <h2>{shown === 0 ? 'Ground floor' : <>{ordinal(shown)} <em>floor</em></>}</h2>
            </div>
            <div className="row gap-s">
              <Button size="sm" disabled={floor <= 0} onClick={() => choose(floor - 1)}>↓ Below</Button>
              <Button size="sm" disabled={floor >= 60} onClick={() => choose(floor + 1)}>↑ Above</Button>
              <Select style={{ width: 130 }} value={String(floor)} onChange={(e) => e.target.value !== '' && choose(Number(e.target.value))} options={Array.from({ length: 61 }, (_, i) => ({ value: String(i), label: i === 0 ? 'Ground' : 'Floor ' + i }))} placeholder="Go to floor" />
            </div>
          </div>
          <div className={'fp-bare' + (light ? ' plate-light' : '')}>
            {plate ? <FloorPlan floor={floor} hoveredUnit={hoverUnit} selectedUnit={tag} onHoverUnit={setHoverUnit} onChooseUnit={setTag} statusOf={statusOf} /> : <div className="fp-empty">{NO_PLAN(floor)}</div>}
          </div>
          <div className="inv-below">
            <div>
              <div className="form-section">{plate ? `${plate.units.length} residences on the ${ordinal(floor)} floor` : 'No residences'}</div>
              {plate && <table className="table dense"><thead><tr><th>Residence</th><th>Type</th><th className="right">Area</th><th>Status</th></tr></thead>
                <tbody>{onFloor.map((u) => { const st = statusOf(u.floor, u.pos), c = crm.byUnit[u.unit]
                  return <tr key={u.unit} className={'clickable' + (tag === u.pos ? ' row-on' : '')} onClick={() => setTag(u.pos)} onMouseEnter={() => setHoverUnit(u.pos)} onMouseLeave={() => setHoverUnit(null)}>
                    <td><b>{u.unit}</b> <span className="small muted">{u.pos}</span></td><td>{u.type}</td><td className="right">{u.area} sft</td>
                    <td>{st === 'unsold' ? <Badge tone="good">Available</Badge> : <><Badge tone={st === 'sold' ? 'accent' : 'warn'}>{c?.status || st}</Badge> <span className="small">{c?.name}</span></>}</td></tr> })}</tbody></table>}
            </div>
            <UnitCard unit={unitN} statusOf={statusOf} user={user} db={db} crm={crm} />
          </div>
        </section>
      </div>
      </div>
    </>
  )
}

function UnitCard({ unit, statusOf, user, db, crm }) {
  if (!unit) return <Sec title="Select a residence"><p className="muted" style={{ margin: 0 }}>Click a residence on the plan or in the list to see who owns it, or start a cost sheet if it is available.</p></Sec>
  const u = crm.units.find((x) => Number(x.unit) === unit)
  if (!u) return <Sec title={`Residence ${unit}`}><p className="muted" style={{ margin: 0 }}>This residence is not in the unit master.</p></Sec>
  const c = crm.byUnit[u.unit]
  const st = statusOf(u.floor, u.pos)
  const money = seesMoney(user)
  const sessions = c ? sessionsFor(db, c) : (db.accordSessions || []).filter((s) => String(s.unitRef || '').replace(/\D/g, '') === String(u.unit))
  const projects = c ? projectsFor(db, c) : []
  const design = canOpen(user, 'accord')
  return (
    <Sec title={`Residence ${u.unit}`} actions={st === 'unsold' ? <Badge tone="good">Available</Badge> : <Badge tone={st === 'sold' ? 'accent' : 'warn'}>{c?.status}</Badge>}>
      <KV rows={[['Type', u.type], ['Floor', `${ordinal(u.floor)} · ${u.pos}${u.floor === 43 ? ' · duplex with 44' : ''}`], ['Band', u.band], ['Saleable area', u.area + ' sft'], u.terrace ? ['Terrace', u.terrace + ' sft'] : null, ['Remarks', u.remarks || '–']]} />
      {c && st !== 'unsold' ? <div style={{ marginTop: 12 }}>
        <div className="row between"><b>{c.name}</b>{c.owner ? <span className="small muted">Looked after by {c.owner}</span> : <span className="small muted">No relationship owner</span>}</div>
        {money ? <div className="small muted">{c.clientId} · paid {pct(c.pct)} · outstanding {inr(Math.max(0, c.outstanding))}</div>
          : c.mine ? <div className="small muted">{c.clientId} · {c.payState || '–'}{c.lastPaymentDate ? ' · last payment ' + d(c.lastPaymentDate) : ''}</div>
          : <div className="small muted">{c.clientId}</div>}
        <div className="row" style={{ marginTop: 10 }}>
          {canOpen(user, 'crm') && <Link className="btn btn-primary btn-sm" to={'/crm/clients/' + c.id}>{c.directoryOnly ? 'Directory entry' : 'Open client 360'}</Link>}
          {!c.directoryOnly && c.health && <span className={'health ' + c.health} style={{ padding: '3px 10px', fontSize: 12 }}>{c.health}</span>}
        </div>
      </div> : <div className="row" style={{ marginTop: 12 }}>
        {canPage(user, 'costSheet') && <Link className="btn btn-primary btn-sm" to={'/crm/cost-sheet?unit=' + u.unit}>Start cost sheet</Link>}
        {canOpen(user, 'experience') && <a className="btn btn-sm" href={experienceUrl({ unit: u.unit, by: user.name, client: false })} target="_blank" rel="noreferrer">Open in the Accord experience</a>}
      </div>}
      {(sessions.length > 0 || projects.length > 0) && <div style={{ marginTop: 14 }}>
        <div className="form-section">Accord Design</div>
        {projects.map((p) => <div key={p.id} className="check-row">{design ? <Link to={'/accord/' + p.id}>{p.id} · {p.name}</Link> : <span>{p.id} · {p.name}</span>}<Badge>{p.status}</Badge></div>)}
        {sessions.slice(0, 3).map((s) => <div key={s.id} className="check-row"><span>{s.persona || 'Session'}{s.palette ? ' · ' + s.palette : ''}</span><span className="small muted">{d(String(s.updatedAt || '').slice(0, 10))}</span></div>)}
      </div>}
    </Sec>
  )
}

// An unboxed section: a heading on a hairline, used beside the plan instead of a card.
function Sec({ title, actions, children }) {
  return <section className="inv-sec"><div className="inv-sec-head"><h3>{title}</h3>{actions}</div>{children}</section>
}

function GridView() {
  const crm = useCrm()
  const { user } = useStore()
  const [sel, setSel] = useState(null)
  const [type, setType] = useState('')
  const [names, setNames] = useState(() => { try { return localStorage.getItem('accord.gridNames') === '1' } catch (e) { return false } })
  const toggleNames = (v) => { setNames(v); try { localStorage.setItem('accord.gridNames', v ? '1' : '0') } catch (e) { /* */ } }
  const floors = useMemo(() => { const m = {}; crm.units.forEach((u) => (m[u.floor] = m[u.floor] || []).push(u)); return Object.keys(m).map(Number).sort((a, b) => b - a).map((f) => ({ f, units: m[f].sort((a, b) => a.pos.localeCompare(b.pos)) })) }, [crm.units])
  const sold = crm.units.filter((u) => crm.byUnit[u.unit] && BOOKED.includes(crm.byUnit[u.unit].status)).length
  const u = crm.units.find((x) => x.unit === sel)
  const c = sel && crm.byUnit[sel]
  let lastBand = ''
  return (
    <>
      <Grid cols={4}>
        <Stat label="Residences" value={crm.units.length} sub="3rd to 58th floor" />
        <Stat label="Booked" value={sold} sub={pct(sold / crm.units.length)} tone="accent" />
        <Stat label="Available" value={crm.units.length - sold - crm.clients.filter((x) => ['Under cancellation', 'To verify'].includes(x.status)).length} tone="good" />
        <Stat label="On hold / to verify" value={crm.clients.filter((x) => ['Under cancellation', 'To verify'].includes(x.status)).length} tone="warn" />
      </Grid>
      <div className="split">
        <Card title="Tower" actions={<div className="row gap-s"><Seg options={[{ value: 'n', label: 'Numbers' }, { value: 'y', label: 'Names' }]} value={names ? 'y' : 'n'} onChange={(v) => toggleNames(v === 'y')} /><Seg options={[{ value: '', label: 'All' }, '2 BHK', '3 BHK', '4 BHK', '5 BHK']} value={type} onChange={setType} /></div>}>
          <div className="legend" style={{ marginBottom: 10 }}><span><i style={{ background: 'var(--accent)' }} />Booked</span><span><i style={{ background: '#7e57c2' }} />Transferred</span><span><i style={{ background: '#f6b26b' }} />Cancellation</span><span><i style={{ background: '#9fc5e8' }} />To verify</span><span><i style={{ background: '#efece6' }} />Available</span></div>
          <div className={'building' + (names ? ' with-names' : '')}>
            {floors.map(({ f, units }) => { const band = units[0].band; const show = band !== lastBand; lastBand = band
              return <React.Fragment key={f}>
                <div className="b-floor">{f}</div>
                {Array.from({ length: 8 }).map((_, i) => { const x = units.find((uu) => uu.pos === 'F' + (i + 1)); if (!x) return <span key={i} />
                  const cc = crm.byUnit[x.unit]; const dim = type && x.type !== type
                  return <button key={i} className={'b-unit ' + cls(cc) + (sel === x.unit ? ' hl' : '')} style={dim ? { opacity: 0.2 } : null} title={`${x.unit} · ${x.type} · ${x.area} sft${cc ? ' · ' + cc.name : ''}`} onClick={() => setSel(x.unit)}>{x.unit}{names && cc?.name && <small>{cc.name.split(' ').slice(0, 2).join(' ')}</small>}</button> })}
                <div className="b-band">{show ? band.split('|')[1]?.trim() || band : ''}</div>
              </React.Fragment> })}
            <div className="b-floor">G</div><div className="b-cap">Ground · Arrival · Podium parking</div><div />
          </div>
        </Card>
        <div style={{ position: 'sticky', top: 70 }}>
          <Card title={u ? `Residence ${u.unit}` : 'Select a residence'}>
            {!u ? <p className="muted">Click any flat to see who owns it, or start a cost sheet if it is available.</p> : <>
              <KV rows={[['Type', u.type], ['Floor', `${u.floor} · ${u.pos}`], ['Band', u.band], ['Saleable area', u.area + ' sft'], u.terrace ? ['Terrace', u.terrace + ' sft'] : null, ['Remarks', u.remarks || '–']]} />
              {c ? <div style={{ marginTop: 12 }}>
                <div className="row between"><b>{c.name}</b><Badge>{c.status}</Badge></div>
                <div className="small muted">{c.clientId}{seesMoney(user) ? ` · paid ${pct(c.pct)} · outstanding ${inr(Math.max(0, c.outstanding))}` : c.mine ? ` · ${c.payState || ''}` : ''}</div>
                <div className="row" style={{ marginTop: 10 }}><Link className="btn btn-primary btn-sm" to={'/crm/clients/' + c.id}>Open client 360</Link>{c.health && <span className={'health ' + c.health} style={{ padding: '3px 10px', fontSize: 12 }}>{c.health}</span>}</div>
              </div> : <div style={{ marginTop: 12 }}><Badge tone="good">Available</Badge><div className="row" style={{ marginTop: 10 }}><Link className="btn btn-primary btn-sm" to={'/crm/cost-sheet?unit=' + u.unit}>Start cost sheet</Link></div></div>}
            </>}
          </Card>
        </div>
      </div>
    </>
  )
}

function UnitList() {
  const crm = useCrm()
  const rows = crm.units.map((u) => { const c = crm.byUnit[u.unit]; return { ...u, id: String(u.unit), status: c ? c.status : 'Available', client: c?.name || '', paid: c?.pct } })
  return <DataTable rows={rows} searchKeys={['client', (u) => String(u.unit)]} filters={[{ key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'band', label: 'Band' }]}
    columns={[{ key: 'unit', label: 'Residence', render: (u) => <b>{u.unit}</b> }, { key: 'floor', label: 'Floor' }, { key: 'pos', label: 'Position' }, { key: 'type', label: 'Type' }, { key: 'area', label: 'Area (sft)', align: 'right' },
      { key: 'terrace', label: 'Terrace', align: 'right' }, { key: 'band', label: 'Band' }, { key: 'status', label: 'Status', render: (u) => <Badge tone={u.status === 'Available' ? 'muted' : undefined}>{u.status}</Badge> }, { key: 'client', label: 'Client' }]} />
}

function Parking() {
  const { db, user, upsert, remove, notify, settings } = useStore()
  const crm = useCrm()
  const [gen, setGen] = useState(null)
  const [assign, setAssign] = useState(null)
  const can = canWrite(user, 'parking')
  const ent = (c) => Number(c.parkingEntitlement || settings.rateCard?.parkingSlots?.[c.config] || 1)
  const booked = crm.clients.filter((c) => BOOKED.includes(c.status))
  const has = (c) => db.parking.filter((p) => String(p.unit) === String(c.unit)).length
  const short = booked.filter((c) => has(c) < ent(c))
  const free = db.parking.filter((p) => !p.unit && p.status !== 'Blocked')
  const auto = () => {
    let pool = [...free].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    let k = 0
    // higher floors first, then booking date: premium residences get the nearest slots
    ;[...short].sort((a, b) => b.floor - a.floor || String(a.bookingDate || '').localeCompare(String(b.bookingDate || ''))).forEach((c) => {
      for (let i = has(c); i < ent(c) && pool.length; i++) { const p = pool.shift(); upsert('parking', { ...p, unit: c.unit, clientId: c.clientId, name: c.name, assignedOn: new Date().toISOString().slice(0, 10) }, { silent: true }); k++ }
    })
    notify(k ? `${k} slots assigned` : 'No free slots to assign. Generate more slots first.', k ? 'ok' : 'bad')
  }
  return (
    <>
      <Grid cols={4}>
        <Stat label="Slots" value={db.parking.length} sub={`${free.length} free`} />
        <Stat label="Assigned" value={db.parking.filter((p) => p.unit).length} tone="accent" />
        <Stat label="Entitled (booked)" value={booked.reduce((s, c) => s + ent(c), 0)} sub={`${booked.length} bookings`} tone="info" />
        <Stat label="Still to assign" value={short.reduce((s, c) => s + ent(c) - has(c), 0)} sub={`${short.length} residences`} tone={short.length ? 'warn' : 'good'} />
      </Grid>
      {can && <div className="row" style={{ marginBottom: 12 }}><Button onClick={() => setGen({ level: 'Basement 1', prefix: 'B1', count: 50, type: 'Covered', start: db.parking.filter((p) => p.id.startsWith('B1-')).length + 1 })}>Generate slots</Button>
        <Button variant="primary" onClick={auto} disabled={!short.length}>Auto-assign by entitlement</Button><span className="small muted">Assigns free slots in order to every booked residence that has fewer than it is entitled to (default from the rate card: {Object.entries(settings.rateCard?.parkingSlots || {}).map(([k, v]) => `${k} ${v}`).join(', ')}).</span></div>}
      {!db.parking.length ? <Card><div className="empty"><p>No parking slots yet. Generate the inventory level by level, then auto-assign.</p></div></Card> :
        <DataTable rows={db.parking} searchKeys={['id', 'name', (p) => String(p.unit || '')]} filters={[{ key: 'level', label: 'Level' }, { key: 'type', label: 'Type' }, { key: 'st', label: 'State', get: (p) => p.unit ? 'Assigned' : p.status === 'Blocked' ? 'Blocked' : 'Free' }]}
          columns={[{ key: 'id', label: 'Slot', render: (p) => <b>{p.id}</b> }, { key: 'level', label: 'Level' }, { key: 'type', label: 'Type' }, { key: 'unit', label: 'Residence' }, { key: 'name', label: 'Client' }, { key: 'assignedOn', label: 'Assigned', render: (p) => d(p.assignedOn) },
            { key: 'act', label: '', sort: false, render: (p) => can && <div className="row gap-s">{p.unit ? <Button size="sm" variant="ghost" onClick={() => upsert('parking', { ...p, unit: '', clientId: '', name: '', assignedOn: '' }, { action: 'released' })}>Release</Button> : <Button size="sm" onClick={() => setAssign({ slot: p, unit: '' })}>Assign</Button>}
              <Confirm size="sm" label="Delete slot?" onConfirm={() => remove('parking', p.id)}>Delete</Confirm></div> }]} />}
      {short.length > 0 && <Card title="Residences still short of car parks">{short.map((c) => <div key={c.id} className="check-row"><span>{c.unit} · {c.name}</span><span>{has(c)} of {ent(c)}</span></div>)}</Card>}
      <Modal open={!!gen} onClose={() => setGen(null)} title="Generate parking slots" footer={<><Button onClick={() => setGen(null)}>Cancel</Button><Button variant="primary" onClick={() => {
        for (let i = 0; i < gen.count; i++) { const id = `${gen.prefix}-${String(Number(gen.start) + i).padStart(3, '0')}`; if (!db.parking.find((p) => p.id === id)) upsert('parking', { id, level: gen.level, type: gen.type, unit: '', status: 'Free' }, { silent: true }) }
        notify(`${gen.count} slots added on ${gen.level}`); setGen(null) }}>Generate</Button></>}>
        {gen && <div className="form fc2"><Field label="Level"><Input value={gen.level} onChange={(e) => setGen({ ...gen, level: e.target.value })} /></Field><Field label="Slot prefix"><Input value={gen.prefix} onChange={(e) => setGen({ ...gen, prefix: e.target.value })} /></Field>
          <Field label="How many"><Input type="number" value={gen.count} onChange={(e) => setGen({ ...gen, count: Number(e.target.value) })} /></Field><Field label="Start number"><Input type="number" value={gen.start} onChange={(e) => setGen({ ...gen, start: Number(e.target.value) })} /></Field>
          <Field label="Type"><Select options={['Covered', 'Stack', 'Open', 'EV', 'Visitor']} value={gen.type} onChange={(e) => setGen({ ...gen, type: e.target.value })} /></Field></div>}
      </Modal>
      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Assign ${assign?.slot.id}`} footer={<><Button onClick={() => setAssign(null)}>Cancel</Button><Button variant="primary" onClick={() => { const c = crm.byUnit[assign.unit]; if (!c) return notify('Pick a booked residence', 'bad'); upsert('parking', { ...assign.slot, unit: c.unit, clientId: c.clientId, name: c.name, assignedOn: new Date().toISOString().slice(0, 10) }, { action: 'assigned' }); setAssign(null) }}>Assign</Button></>}>
        {assign && <Field label="Residence"><Select options={booked.map((c) => ({ value: String(c.unit), label: `${c.unit} · ${c.name} (${has(c)}/${ent(c)})` }))} value={assign.unit} onChange={(e) => setAssign({ ...assign, unit: e.target.value })} /></Field>}
      </Modal>
    </>
  )
}
