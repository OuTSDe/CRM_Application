import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { VISITS, SECTIONS } from './BrochureScroll.jsx'
import { OPS } from '../../lib/seed.js'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canWrite } from '../../lib/perms.js'
import { Page, Card, Button, Field, Input, Textarea, Select, Badge, Confirm } from '../../components/ui.jsx'
import { d, daysBetween, today } from '../../lib/format.js'

// Reads an image file and shrinks it so it stores comfortably (long edge 1600 px, JPEG).
export function imageToData(file, max = 1600) {
  return new Promise((ok, bad) => {
    const r = new FileReader()
    r.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.82)) }; img.onerror = bad; img.src = r.result }
    r.onerror = bad; r.readAsDataURL(file)
  })
}
const NAVS = { welcome: 'Welcome', address: 'Address', structure: 'Structure', progress: 'Progress', residences: 'Residences', living: 'House team', privilege: 'Privilege', close: 'Thank you' }
const ORDER = { Engineering: ['structure'], 'Sea and views': ['residences', 'address'], Investment: ['privilege', 'progress'], Luxury: ['living', 'residences'], Family: ['residences', 'living'], Wellness: ['living'], Design: ['residences'], Mangaluru: ['address'] }

export default function Brochure() {
  const { db, user } = useStore()
  const [qs] = useSearchParams()
  const [mode, setMode] = useState('present')
  const b = db.brochure[0]
  const guest = qs.get('for') && (db.clients.find((c) => c.clientId === qs.get('for')) || db.leads.find((l) => l.id === qs.get('for')))
  if (mode === 'edit') return <Editor onDone={() => setMode('present')} />
  return <Presenter b={b} guest={guest} canEdit={canWrite(user, 'brochure')} onEdit={() => setMode('edit')} />
}

function Presenter({ b, guest, canEdit, onEdit }) {
  const nav = useNavigate()
  const crm = useCrm()
  const slides = useMemo(() => {
    let s = [...b.slides]
    if (guest?.interests?.length) {
      const pri = [...new Set(guest.interests.flatMap((i) => ORDER[i] || []))]
      const first = s[0]; const rest = s.slice(1, -1); const last = s[s.length - 1]
      rest.sort((a, z) => (pri.indexOf(a.id) < 0 ? 99 : pri.indexOf(a.id)) - (pri.indexOf(z.id) < 0 ? 99 : pri.indexOf(z.id)))
      s = [first, ...rest, last]
    }
    return s
  }, [b, guest])
  const [i, setI] = useState(0)
  const [type, setType] = useState(guest?.config && b.types[guest.config] ? guest.config : '3 BHK')
  const [room, setRoom] = useState('plan')
  const go = useCallback((k) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + k))), [slides.length])
  useEffect(() => {
    const h = (e) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1) }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1) }
      else if (e.key === 'Home') setI(0); else if (e.key === 'End') setI(slides.length - 1)
      else if (/^[1-9]$/.test(e.key)) setI(Math.min(slides.length - 1, Number(e.key) - 1))
      else if (e.key.toLowerCase() === 'f') toggleFs()
      else if (e.key === 'Escape' && !document.fullscreenElement) nav(-1)
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [go, slides.length, nav])
  const toggleFs = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {}) }
  const s = slides[i]
  const T = b.types[type] || {}
  const tUnits = crm.units.filter((u) => u.type === type)
  const avail = tUnits.filter((u) => !(crm.byUnit[u.unit] && (BOOKED.includes(crm.byUnit[u.unit].status) || crm.byUnit[u.unit].status === 'Under cancellation'))).length
  const areas = tUnits.map((u) => u.area)
  const floors = tUnits.map((u) => u.floor)
  const img = room === 'plan' ? T.plan : T.rooms?.[room]
  const allFloors = useMemo(() => { const m = {}; crm.units.forEach((u) => (m[u.floor] = m[u.floor] || []).push(u)); return Object.keys(m).map(Number).sort((a, z) => z - a).map((f) => m[f].sort((a, z) => a.pos.localeCompare(z.pos))) }, [crm.units])
  const stale = daysBetween(b.slides.find((x) => x.kind === 'progress')?.asOf) > (b.progressEveryDays || 14)
  return (
    <div className="presenter">
      <div className="pres-stage">
        {s.image && <div className="pres-bg" style={{ backgroundImage: `url(${s.image})` }} />}
        <div className="pres-inner">
          {s.kind === 'welcome' && <>
            <div className="pres-kicker">Yamuna Sky City · {s.id === 'close' ? 'Thank you' : 'Private viewing'}</div>
            <h1>{s.id === 'welcome' && guest ? `Welcome, ${guest.name.split(/[ &]/)[0]}` : s.title}</h1>
            <div className="pres-body">{s.body}</div>
          </>}
          {s.kind === 'text' && <><div className="pres-kicker">Yamuna Sky City</div><h1>{s.title}</h1><div className="pres-body">{s.body}</div></>}
          {s.kind === 'film' && <><div className="pres-kicker">The film</div><h1>{s.title}</h1>{s.videoUrl ? (/\.(mp4|webm)(\?|$)/i.test(s.videoUrl) ? <video src={s.videoUrl} controls autoPlay muted style={{ maxWidth: '100%', maxHeight: '60vh' }} /> : <iframe src={s.videoUrl} title={s.title} style={{ width: '100%', height: '60vh', border: 0 }} allow="autoplay; fullscreen" allowFullScreen />) : <div className="pres-body">{s.body} (add the film link in the editor)</div>}</>}
          {s.kind === 'facts' && <><div className="pres-kicker">Yamuna Sky City</div><h1>{s.title}</h1><div className="facts">{(s.facts || []).map(([k, v]) => <div className="fact" key={k}><b>{k}</b><span>{v}</span></div>)}</div></>}
          {s.kind === 'progress' && <><div className="pres-kicker">Site progress · as of {d(s.asOf)}</div><h1>{s.title}</h1><div className="pres-body">{s.body}</div>
            {s.floors && <div style={{ marginTop: 26, maxWidth: 640 }}><div style={{ height: 10, background: '#2b2b30', borderRadius: 99 }}><div style={{ height: 10, width: (s.floors / 58) * 100 + '%', background: '#d9a597', borderRadius: 99 }} /></div><div className="pres-count" style={{ marginTop: 8 }}>{s.floors} of 58 floors</div></div>}
            {stale && canEdit && <div className="pres-count" style={{ marginTop: 16, color: '#f0b37e' }}>Progress is older than {b.progressEveryDays} days. Update it in the editor.</div>}</>}
          {s.kind === 'residences' && <>
            <div className="pres-kicker">The residences</div>
            <div className="res-btns">{Object.keys(b.types).map((t) => <button key={t} className={t === type ? 'on' : ''} onClick={() => { setType(t); setRoom('plan') }}>{t}</button>)}</div>
            <div className="res-grid">
              <div>
                <div className="res-img" style={img ? { backgroundImage: `url(${img})`, backgroundSize: room === 'plan' ? 'contain' : 'cover', backgroundRepeat: 'no-repeat', backgroundColor: room === 'plan' ? '#f4f1ea' : undefined } : null}>{!img && `${type} · ${room === 'plan' ? 'floor plan' : room}: add the image in the brochure editor`}</div>
                <div className="room-btns"><button className={room === 'plan' ? 'on' : ''} onClick={() => setRoom('plan')}>Plan</button>{Object.keys(T.rooms || {}).map((r) => <button key={r} className={room === r ? 'on' : ''} onClick={() => setRoom(r)}>{r}</button>)}</div>
              </div>
              <div>
                <div className="pres-body" style={{ fontSize: 18 }}>{T.blurb}</div>
                <div className="res-stats" style={{ marginTop: 20 }}>
                  <div><b>{areas.length ? `${Math.min(...areas).toLocaleString('en-IN')}${Math.max(...areas) !== Math.min(...areas) ? '–' + Math.max(...areas).toLocaleString('en-IN') : ''}` : '–'}</b><span>sq ft saleable</span></div>
                  <div><b>{floors.length ? `${Math.min(...floors)}–${Math.max(...floors)}` : '–'}</b><span>floors</span></div>
                  <div><b>{tUnits.length}</b><span>residences of this type</span></div>
                  <div><b>{avail}</b><span>available today</span></div>
                </div>
                <div className="pres-count" style={{ marginTop: 18 }}>Key plan</div>
                <div className="mini-building">{allFloors.map((row) => Array.from({ length: 8 }).map((_, k) => { const u = row.find((x) => x.pos === 'F' + (k + 1)); if (!u) return <i key={row[0].floor + '-' + k} style={{ background: 'transparent' }} />
                  const sold = crm.byUnit[u.unit] && BOOKED.includes(crm.byUnit[u.unit].status); return <i key={u.unit} className={u.type === type ? (sold ? 'sold' : 'hl') : ''} title={String(u.unit)} /> }))}</div>
                <div className="pres-count" style={{ marginTop: 6 }}>Highlighted: {type}; darker ones are reserved.</div>
              </div>
            </div>
          </>}
        </div>
      </div>
      <div className="pres-bar">
        <button onClick={() => go(-1)} disabled={i === 0}>‹ Back</button>
        {slides.map((x, k) => <button key={x.id} className={k === i ? 'on' : ''} onClick={() => setI(k)}>{x.nav || NAVS[x.id] || x.title.split(' ').slice(0, 2).join(' ')}</button>)}
        <button onClick={() => go(1)} disabled={i === slides.length - 1}>Next ›</button>
        <span className="grow" /><span className="pres-count">{i + 1} / {slides.length}{guest ? ' · for ' + guest.name : ''}</span>
        <button onClick={toggleFs}>Full screen</button>{canEdit && <button onClick={onEdit}>Edit</button>}<button onClick={() => nav(-1)}>Close</button>
      </div>
    </div>
  )
}

function ImgField({ label, value, onChange }) {
  const { notify } = useStore()
  return <Field label={label}><div className="row gap-s">
    {value ? <img src={value} alt="" style={{ width: 70, height: 46, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} /> : <span className="small muted">No image</span>}
    <label className="btn btn-sm">Upload<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files[0]; if (!f) return; try { onChange(await imageToData(f)) } catch (x) { notify('Could not read the image', 'bad') } }} /></label>
    <input className="input" style={{ flex: 1, minWidth: 120 }} placeholder="or paste an image URL" value={value?.startsWith('data:') ? '' : value || ''} onChange={(e) => onChange(e.target.value)} />
    {value && <Button size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Button>}
  </div></Field>
}

function Editor({ onDone }) {
  const { db, upsert } = useStore()
  const [b, setB] = useState(() => {
    const x = JSON.parse(JSON.stringify(db.brochure[0] || OPS.BROCHURE))
    // sections added on 1 Nov (film, coast, engineering, design) appear in older brochures too
    const missing = OPS.BROCHURE.slides.filter((s) => !x.slides.some((y) => y.id === s.id))
    if (missing.length) { const at = Math.max(0, x.slides.findIndex((y) => y.id === 'privilege')); x.slides.splice(at < 0 ? x.slides.length : at, 0, ...JSON.parse(JSON.stringify(missing))) }
    return x
  })
  const setSlide = (k, patch) => setB((x) => ({ ...x, slides: x.slides.map((s, j) => (j === k ? { ...s, ...patch } : s)) }))
  const move = (k, dir) => setB((x) => { const s = [...x.slides]; const j = k + dir; if (j < 0 || j >= s.length) return x; [s[k], s[j]] = [s[j], s[k]]; return { ...x, slides: s } })
  const setType = (t, patch) => setB((x) => ({ ...x, types: { ...x.types, [t]: { ...x.types[t], ...patch } } }))
  const save = () => { upsert('brochure', { ...b, updatedOn: today() }, { action: 'brochure updated' }) }
  return (
    <div className="content" style={{ margin: '0 auto' }}>
      <Page back={true} title="e-Brochure editor" subtitle="Change words, photos, order and the residence plans. Photos are shrunk automatically so the brochure stays fast on the tab."
        actions={<><Button onClick={() => setB((x) => ({ ...x, slides: [...x.slides.slice(0, -1), { id: 'S' + Date.now().toString(36), kind: 'text', title: 'New slide', body: '', image: '' }, x.slides[x.slides.length - 1]] }))}>+ Text slide</Button>
          <Button onClick={() => { save(); onDone() }} variant="primary">Save and present</Button><Button onClick={onDone}>Cancel</Button></>}>
        {b.slides.map((s, k) => <Card key={s.id} title={`${k + 1}. ${s.title}`} actions={<><Badge>{s.kind}</Badge><Button size="sm" variant="ghost" onClick={() => move(k, -1)}>↑</Button><Button size="sm" variant="ghost" onClick={() => move(k, 1)}>↓</Button>
          {!['welcome', 'residences', 'progress', 'close'].includes(s.id) && <Confirm size="sm" label="Remove?" onConfirm={() => setB((x) => ({ ...x, slides: x.slides.filter((_, j) => j !== k) }))}>Remove</Confirm>}</>}>
          {s.kind === 'residences' ? <p className="muted small" style={{ margin: 0 }}>Edited below under Residences.</p> : <div className="form fc2">
            <Field label="Title" span="all"><Input value={s.title} onChange={(e) => setSlide(k, { title: e.target.value })} /></Field>
            {s.kind !== 'facts' && <Field label="Text" span="all"><Textarea value={s.body} onChange={(e) => setSlide(k, { body: e.target.value })} /></Field>}
            {s.kind === 'facts' && (s.facts || []).map(([a, z], j) => <React.Fragment key={j}><Field label={`Fact ${j + 1}`}><Input value={a} onChange={(e) => setSlide(k, { facts: s.facts.map((f, m) => (m === j ? [e.target.value, f[1]] : f)) })} /></Field>
              <Field label="Detail"><Input value={z} onChange={(e) => setSlide(k, { facts: s.facts.map((f, m) => (m === j ? [f[0], e.target.value] : f)) })} /></Field></React.Fragment>)}
            {s.kind === 'facts' && <div className="span-all"><Button size="sm" onClick={() => setSlide(k, { facts: [...(s.facts || []), ['', '']] })}>+ Fact</Button></div>}
            {s.kind === 'film' && <Field label="Film (link to an .mp4 in Drive or on the site, or a YouTube embed link)" span="all"><Input value={s.videoUrl} onChange={(e) => setSlide(k, { videoUrl: e.target.value })} placeholder="https://…" /></Field>}
            {s.kind === 'progress' && <><Field label="As of"><Input type="date" value={s.asOf} onChange={(e) => setSlide(k, { asOf: e.target.value })} /></Field><Field label="Floors cast"><Input type="number" value={s.floors} onChange={(e) => setSlide(k, { floors: Number(e.target.value) })} /></Field></>}
            <div className="span-all"><ImgField label="Background photo" value={s.image} onChange={(v) => setSlide(k, { image: v })} /></div>
          </div>}
        </Card>)}
        <h3 style={{ margin: '20px 0 10px' }}>Visits</h3>
        <Card title="Which sections each visit shows (scrolling e-brochure)">
          <table className="table dense"><thead><tr><th>Section</th>{Object.entries(VISITS).map(([v, l]) => <th key={v} className="center">{l}</th>)}</tr></thead>
            <tbody>{SECTIONS.map((sec) => <tr key={sec}><td>{sec}</td>{Object.keys(VISITS).map((v) => { const list = (b.visits || OPS.BROCHURE.visits)[v] || []; const on = list.includes(sec)
              return <td key={v} className="center"><input type="checkbox" checked={on} aria-label={`${sec} on ${VISITS[v]}`} onChange={() => setB((x) => { const cur = (x.visits || OPS.BROCHURE.visits)[v] || []; const next = on ? cur.filter((y) => y !== sec) : SECTIONS.filter((y) => cur.includes(y) || y === sec); return { ...x, visits: { ...(x.visits || OPS.BROCHURE.visits), [v]: next } } })} /></td> })}</tr>)}</tbody></table>
          <p className="small muted">A return visit also brings in the sections that match the person's interests (Engineering, Design, Sea and views…).</p>
          <Field label="How to present (SOP, shown before the e-brochure opens)"><Textarea rows={4} value={b.sop ?? OPS.BROCHURE.sop} onChange={(e) => setB((x) => ({ ...x, sop: e.target.value }))} /></Field>
        </Card>
        <h3 style={{ margin: '20px 0 10px' }}>Residences</h3>
        {Object.entries(b.types).map(([t, T]) => <Card key={t} title={t}>
          <div className="form fc1">
            <Field label="Short description"><Input value={T.blurb} onChange={(e) => setType(t, { blurb: e.target.value })} /></Field>
            <ImgField label="Floor plan" value={T.plan} onChange={(v) => setType(t, { plan: v })} />
            {Object.entries(T.rooms || {}).map(([r, v]) => <ImgField key={r} label={`View: ${r}`} value={v} onChange={(x) => setType(t, { rooms: { ...T.rooms, [r]: x } })} />)}
            <div className="row gap-s"><input className="input" style={{ width: 220 }} placeholder="Add a room or view (e.g. Sea view)" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value) { setType(t, { rooms: { ...T.rooms, [e.target.value]: '' } }); e.target.value = '' } }} /><span className="small muted">press Enter</span></div>
          </div>
        </Card>)}
      </Page>
    </div>
  )
}
