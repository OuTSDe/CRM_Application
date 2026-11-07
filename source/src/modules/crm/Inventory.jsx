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
import Parking from './Parking.jsx'
import { WMElevation, WM_FLOORS, WM_BANDS, bandName, floorLabel, sideX } from '../../components/WhiteModel.jsx'
import { WM } from '../../lib/whiteModel.js'

const cls = (c) => !c ? '' : BOOKED.includes(c.status) ? 'sold' : c.status === 'Transferred' ? 'transfer' : ['Under cancellation', 'Cancelled'].includes(c.status) ? 'cancel' : c.status === 'To verify' ? 'verify' : ''

export default function Inventory() {
  const [qs] = useSearchParams()
  const [tab, setTab] = useState(qs.get('tab') || 'building')
  return (
    <Page back={true} title="Building and parking" subtitle="Live availability for every residence, and car parks allotted from the architect's parking drawings."
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
        <span className="small muted">{view === 'tower' ? 'The tower and plates from the Accord experience, coloured live from the Client Master.' : view === 'elevation' ? 'The exterior white model, coloured live from the Client Master.' : 'Every residence, floor by floor, laid out like the elevation.'}</span>
        <Seg options={[{ value: 'grid', label: 'Grid' }, { value: 'elevation', label: 'Elevation' }, { value: 'tower', label: 'Tower and plans' }]} value={view} onChange={setView} />
      </div>
      {view === 'tower' ? <TowerView /> : view === 'elevation' ? <Elevation /> : <GridView />}
    </>
  )
}

// 8 Nov: the elevation is now the exterior white model (YSC_WhiteModel_Exterior.3dm): each floor at its real width and
// level, its residences coloured from the Client Master. Click a floor to see its residences.
const wmStatus = (crm) => (no) => { const c = crm.byUnit[no]; return cls(c) }
const useBuiltTo = (db) => useMemo(() => { const done = (db.clpStages || []).filter((s) => s.status === 'Completed').map((s) => (String(s.stage).match(/(\d+)(?:st|nd|rd|th)\s+floor/i) || [])[1]).filter(Boolean).map(Number); return done.length ? Math.max(...done) : null }, [db.clpStages])
function Elevation() {
  const crm = useCrm()
  const { db } = useStore()
  const [sel, setSel] = useState(null)
  const [hov, setHov] = useState(null)
  const [side, setSide] = useState('S')
  const builtTo = useBuiltTo(db)
  const byFloor = useMemo(() => { const m = {}; crm.units.forEach((u) => (m[u.floor] = m[u.floor] || []).push(u)); Object.values(m).forEach((l) => l.sort((a, b) => String(a.pos).localeCompare(String(b.pos), undefined, { numeric: true }))); return m }, [crm.units])
  const unitsOf = (f) => (byFloor[f === 44 ? 43 : f] || []).map((u) => u.unit)
  const f = sel != null ? WM_FLOORS.find((x) => x.floor === sel) : null
  const list = sel != null ? byFloor[sel === 44 ? 43 : sel] || [] : []
  return <div className="split">
    <Card title="Elevation · white model" actions={<Seg options={[{ value: 'S', label: 'South · podium side' }, { value: 'N', label: 'North' }]} value={side} onChange={setSide} />}>
      <WMElevation className="elev-wm" side={side} statusOf={wmStatus(crm)} unitsOf={unitsOf} selected={sel} hovered={hov} onSelect={setSel} onHover={setHov} builtTo={builtTo} />
      <div className="legend" style={{ marginTop: 8 }}><span><i style={{ background: 'var(--accent)' }} />Booked</span><span><i style={{ background: '#7e57c2' }} />Transferred</span><span><i style={{ background: '#f6b26b' }} />Cancellation</span><span><i style={{ background: '#9fc5e8' }} />To verify</span><span><i style={{ background: 'var(--bg)', border: '1px solid var(--line-3)' }} />Available</span>{builtTo ? <span className="muted">Structure done to floor {builtTo}; floors above are lighter</span> : null}</div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>From the exterior white model: floor widths and levels are to scale (1 px = 250 mm), the residences on a floor are shown as equal parts of it. Floors 5 to 60 assume a 3.075 m floor-to-floor until Architechnics confirms.</p>
    </Card>
    <Card title={f ? `${f.floor === 0 ? 'Ground' : ordinal(f.floor)} floor · ${bandName(f.band)}` : 'Pick a floor'}>
      {!f ? <p className="muted" style={{ margin: 0 }}>Click a floor on the elevation to see its residences.</p> : <>
        <p className="small muted" style={{ marginTop: 0 }}>FFL +{f.ffl.toFixed(3)} m{f.floor === 44 ? ' · upper level of the 43rd-floor duplexes' : ''}</p>
        {!list.length ? <p className="muted" style={{ margin: 0 }}>No residences on this floor.</p> :
        <table className="table dense"><thead><tr><th>Residence</th><th>Type</th><th className="right">Area</th><th>Status</th></tr></thead>
          <tbody>{list.map((u) => { const c = crm.byUnit[u.unit]; return <tr key={u.unit}><td className="mono">{c ? <Link to={'/crm/clients/' + c.id}>{u.unit}</Link> : u.unit}</td><td>{u.type}</td><td className="right">{u.area}</td><td>{!c ? <Link to={'/crm/cost-sheet?unit=' + u.unit}><Badge tone="good">Available</Badge></Link> : <Badge tone={BOOKED.includes(c.status) ? 'accent' : 'warn'}>{c.status}</Badge>}</td></tr> })}</tbody></table>}
      </>}
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

// 8 Nov: the grid follows the white-model elevation. Each floor is a row at the floor's real width and position
// (south, podium side, or north), its residences side by side in it; the bands run down the right as on the elevation.
const SPAN = (() => { const xs = [WM.podium[0], WM.clubhouse[0], ...WM_FLOORS.map((f) => f.x)], xe = [WM.podium[0] + WM.podium[2], WM.clubhouse[0] + WM.clubhouse[2], ...WM_FLOORS.map((f) => f.x + f.w)]; return { a: Math.min(...xs), b: Math.max(...xe) } })()
const spanX = (x, w, side) => { const xx = sideX(x, w, side), mirrorA = side === 'N' ? WM.viewW - SPAN.b : SPAN.a, len = SPAN.b - SPAN.a; return { left: ((xx - mirrorA) / len) * 100 + '%', width: (w / len) * 100 + '%' } }
function GridView() {
  const crm = useCrm()
  const { user } = useStore()
  const [sel, setSel] = useState(null)
  const [type, setType] = useState('')
  const [side, setSide] = useState(() => { try { return localStorage.getItem('accord.gridSide') || 'S' } catch (e) { return 'S' } })
  const pickSide = (v) => { setSide(v); try { localStorage.setItem('accord.gridSide', v) } catch (e) { /* */ } }
  const [names, setNames] = useState(() => { try { return localStorage.getItem('accord.gridNames') === '1' } catch (e) { return false } })
  const toggleNames = (v) => { setNames(v); try { localStorage.setItem('accord.gridNames', v ? '1' : '0') } catch (e) { /* */ } }
  const byFloor = useMemo(() => { const m = {}; crm.units.forEach((u) => (m[u.floor] = m[u.floor] || []).push(u)); Object.values(m).forEach((l) => l.sort((a, b) => String(a.pos).localeCompare(String(b.pos), undefined, { numeric: true }))); return m }, [crm.units])
  const rows = useMemo(() => [...WM_FLOORS].sort((a, b) => b.floor - a.floor), [])
  const sold = crm.units.filter((u) => crm.byUnit[u.unit] && BOOKED.includes(crm.byUnit[u.unit].status)).length
  const held = crm.clients.filter((x) => ['Under cancellation', 'To verify'].includes(x.status)).length
  const u = crm.units.find((x) => x.unit === sel)
  const c = sel && crm.byUnit[sel]
  const rowOf = (fl) => rows.findIndex((r) => r.floor === fl) + 1
  const pod = spanX(WM.podium[0], WM.podium[2], side), club = spanX(WM.clubhouse[0], WM.clubhouse[2], side)
  return (
    <>
      <Grid cols={4}>
        <Stat label="Residences" value={crm.units.length} sub="3rd to 58th floor" />
        <Stat label="Booked" value={sold} sub={pct(sold / crm.units.length)} tone="accent" />
        <Stat label="Available" value={crm.units.length - sold - held} tone="good" />
        <Stat label="On hold / to verify" value={held} tone="warn" />
      </Grid>
      <div className="split">
        <Card title="Tower" actions={<div className="row gap-s" style={{ flexWrap: 'wrap' }}><Seg options={[{ value: 'S', label: 'South' }, { value: 'N', label: 'North' }]} value={side} onChange={pickSide} /><Seg options={[{ value: 'n', label: 'Numbers' }, { value: 'y', label: 'Names' }]} value={names ? 'y' : 'n'} onChange={(v) => toggleNames(v === 'y')} /><Seg options={[{ value: '', label: 'All' }, '2 BHK', '3 BHK', '4 BHK', '5 BHK']} value={type} onChange={setType} /></div>}>
          <div className="legend" style={{ marginBottom: 10 }}><span><i style={{ background: 'var(--accent)' }} />Booked</span><span><i style={{ background: '#7e57c2' }} />Transferred</span><span><i style={{ background: '#f6b26b' }} />Cancellation</span><span><i style={{ background: '#9fc5e8' }} />To verify</span><span><i style={{ background: '#efece6' }} />Available</span></div>
          <div className="wmg-scroll">
            <div className={'wmg' + (names ? ' with-names' : '')}>
              {rows.map((f, i) => {
                const list = f.saleable ? byFloor[f.floor === 44 ? 43 : f.floor] || [] : []
                const order = side === 'N' ? [...list].reverse() : list
                return <React.Fragment key={f.id}>
                  <div className="wmg-no" style={{ gridRow: i + 1 }}>{floorLabel(f.floor)}</div>
                  <div className="wmg-track" style={{ gridRow: i + 1, gridColumn: 2 }}>
                    <div className={'wmg-slab' + (f.saleable ? '' : ' ns') + (f.floor === 44 ? ' upper' : '')} style={spanX(f.x, f.w, side)} title={`${f.floor === 0 ? 'Ground' : ordinal(f.floor)} floor · ${bandName(f.band)} · FFL +${f.ffl.toFixed(3)} m`}>
                      {!f.saleable ? <span className="wmg-ns">{f.floor === 0 ? 'Tower lobby' : bandName(f.band)}</span> : order.map((x) => {
                        const cc = crm.byUnit[x.unit]; const dim = type && x.type !== type
                        return <button key={x.unit} className={'b-unit ' + cls(cc) + (sel === x.unit ? ' hl' : '')} style={dim ? { opacity: 0.2 } : null} title={`${x.unit} · ${x.type} · ${x.area} sft${cc ? ' · ' + cc.name : ''}${f.floor === 44 ? ' · duplex upper level' : ''}`} onClick={() => setSel(x.unit)}>{x.unit}{names && cc?.name && <small>{cc.name.split(' ').slice(0, 2).join(' ')}</small>}</button>
                      })}
                    </div>
                  </div>
                </React.Fragment>
              })}
              <div className="wmg-no wmg-base" style={{ gridRow: rows.length + 1 }} />
              <div className="wmg-podcell" style={{ gridRow: `${rowOf(2)} / ${rows.length + 2}` }} aria-hidden="true">
                <div className="wmg-pod" style={pod}>Podium · car parking G to P3</div>
                <div className="wmg-club" style={club}>Clubhouse</div>
              </div>
              {WM_BANDS.map((b) => <div key={b.name} className={'wmg-band' + (b.saleable ? '' : ' ns') + (u && WM_FLOORS.find((x) => x.floor === u.floor)?.band === b.name ? ' on' : '')} style={{ gridRow: `${rowOf(b.to)} / ${rowOf(b.from) + 1}` }}>
                <span>{bandName(b.name)}</span>{b.to > b.from && <small>{floorLabel(b.from)}–{b.to}</small>}</div>)}
            </div>
          </div>
          <p className="small muted" style={{ margin: '8px 0 0' }}>Laid out like the white-model elevation: each floor at its real width and position. Floor 44 repeats the 43rd-floor duplexes (their upper level).</p>
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

