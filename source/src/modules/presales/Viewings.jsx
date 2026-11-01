import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { canWrite } from '../../lib/perms.js'
import { OPS } from '../../lib/seed.js'
import { Page, Card, Button, Badge, Grid, Stat, Modal, Field, Input, Select, Textarea, Tabs, Check, Chips, Seg, KV } from '../../components/ui.jsx'
import RecordPicker from '../../components/RecordPicker.jsx'
import LogInteraction from '../../components/LogInteraction.jsx'
import { d, today, nowTime, addDays } from '../../lib/format.js'

const FLOW = ['Planned', 'Arrived', 'On site', 'Completed']
// One guest at a time on site: a viewing blocks its slot (Admin → Settings, 90 minutes by default) for everyone else.
const mins = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0) }
export const slotClash = (db, v, slot = 90) => db.viewings.find((x) => x.id !== v.id && x.date === v.date && x.status !== 'Cancelled' && Math.abs(mins(x.time) - mins(v.time)) < (slot || 90))
const who = (db, rid) => db.clients.find((c) => c.clientId === rid) || db.leads.find((l) => l.id === rid)

export function Viewings() {
  const { db, user, upsert, nextId, notify, settings } = useStore()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const [add, setAdd] = useState(null)
  const [view, setView] = useState('upcoming')
  const t = today()
  useEffect(() => { const id = qs.get('new'); if (id) setAdd({ recordId: id, date: addDays(t, 1), time: '11:00', guests: 2, advisor: user.name, purpose: 'First private viewing', status: 'Planned' }) }, []) // eslint-disable-line
  const rows = db.viewings.filter((v) => view === 'all' || (view === 'today' ? v.date === t : view === 'upcoming' ? v.date >= t && v.status !== 'Cancelled' : v.date < t)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) * (view === 'past' ? -1 : 1))
  const team = db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)
  const save = () => {
    const p = who(db, add.recordId); if (!p) return notify('Pick the guest', 'bad')
    const clash = slotClash(db, add, settings?.viewingSlot); if (clash) return notify(`${clash.name} is booked at ${clash.time} that day. Viewings need ${settings?.viewingSlot || 90} minutes apart.`, 'bad')
    const r = upsert('viewings', { ...add, id: nextId('viewings', 'PV-', 4), name: p.name, phone: p.phone, interests: p.interests || [], checklist: { arrival: {}, site: {}, departure: {} }, feedback: {} }, { action: 'viewing planned' })
    if (r && add.recordId.startsWith('YSC-L')) { const l = db.leads.find((x) => x.id === add.recordId); if (l && ['New', 'Contacted', 'Qualified'].includes(l.stage)) upsert('leads', { ...l, stage: 'Site visit scheduled' }, { silent: true }) }
    if (r) { setAdd(null); nav('/presales/viewings/' + r.id) }
  }
  const todayList = db.viewings.filter((v) => v.date === t)
  return (
    <Page back={true} title="Private viewings" subtitle="Plan the visit, run the arrival desk and the site walk from one checklist, take feedback at departure and hand over the right care package."
      actions={<><Link className="btn" to="/brochure">Open e-brochure</Link>{canWrite(user, 'viewings') && <Button variant="primary" onClick={() => setAdd({ date: t, time: '11:00', guests: 2, advisor: user.name, purpose: 'First private viewing', status: 'Planned' })}>+ Plan viewing</Button>}</>}>
      <Grid cols={4}>
        <Stat label="Today" value={todayList.length} sub={todayList.filter((v) => v.status === 'Completed').length + ' completed'} tone="info" onClick={() => setView('today')} />
        <Stat label="Next 7 days" value={db.viewings.filter((v) => v.date > t && v.date <= addDays(t, 7) && v.status !== 'Cancelled').length} tone="teal" />
        <Stat label="Completed (all time)" value={db.viewings.filter((v) => v.status === 'Completed').length} tone="good" />
        <Stat label="Feedback captured" value={db.viewings.filter((v) => Object.values(v.feedback || {}).some(Boolean)).length} />
      </Grid>
      <div style={{ marginBottom: 10 }}><Seg options={[{ value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'all', label: 'All' }]} value={view} onChange={setView} /></div>
      <Card pad={false}>
        <table className="table"><thead><tr><th>When</th><th>Guest</th><th>Guests</th><th>Advisor</th><th>Purpose</th><th>Interests</th><th>Status</th></tr></thead>
          <tbody>{rows.map((v) => <tr key={v.id} className="click" onClick={() => nav('/presales/viewings/' + v.id)}><td className="nowrap"><b>{d(v.date)}</b> {v.time}</td><td><b>{v.name}</b><div className="small muted">{v.recordId}</div></td><td>{v.guests}</td><td>{v.advisor}</td><td>{v.purpose}</td>
            <td className="small">{(v.interests || []).join(', ')}</td><td><Badge>{v.status}</Badge></td></tr>)}</tbody></table>
        {!rows.length && <div className="empty">No private viewings here. Plan one from a lead or with the button above.</div>}
      </Card>
      <Modal open={!!add} onClose={() => setAdd(null)} title="Plan a private viewing" footer={<><Button onClick={() => setAdd(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {add && <div className="form fc2">
          <Field label="Guest (lead or client)" span="all"><RecordPicker value={add.recordId} onChange={(id) => setAdd({ ...add, recordId: id })} /></Field>
          <Field label="Date"><Input type="date" value={add.date} onChange={(e) => setAdd({ ...add, date: e.target.value })} /></Field>
          <Field label="Time" hint={(() => { const c = slotClash(db, add, settings?.viewingSlot); const busy = db.viewings.filter((x) => x.date === add.date && x.status !== 'Cancelled').map((x) => x.time).sort(); return c ? `Clashes with ${c.name} at ${c.time}` : busy.length ? 'Booked that day: ' + busy.join(', ') : 'The site is free all day' })()}><Input type="time" value={add.time} onChange={(e) => setAdd({ ...add, time: e.target.value })} /></Field>
          <Field label="Expected guests"><Input type="number" value={add.guests} onChange={(e) => setAdd({ ...add, guests: Number(e.target.value) })} /></Field>
          <Field label="Client advisor"><Select options={team} value={add.advisor} onChange={(e) => setAdd({ ...add, advisor: e.target.value })} /></Field>
          <Field label="Hospitality host"><Select options={team} value={add.host} onChange={(e) => setAdd({ ...add, host: e.target.value })} /></Field>
          <Field label="Purpose"><Select options={['First private viewing', 'Second visit with family', 'Residence selection', 'Reservation', 'Site progress visit (owner)']} value={add.purpose} onChange={(e) => setAdd({ ...add, purpose: e.target.value })} /></Field>
          <Field label="Prepare (notes for the desk)" span="all"><Textarea value={add.notes} onChange={(e) => setAdd({ ...add, notes: e.target.value })} placeholder="e.g. Elderly parent: arrange the buggy; prefers sea-facing 3 BHK" /></Field>
        </div>}
      </Modal>
    </Page>
  )
}

export function ViewingDetail() {
  const { id } = useParams()
  const { db, user, upsert, notify, settings } = useStore()
  const v = db.viewings.find((x) => x.id === id)
  const [tab, setTab] = useState('arrival')
  const [log, setLog] = useState(false)
  const [card, setCard] = useState(false)
  const p = v && who(db, v.recordId)
  const can = canWrite(user, 'viewings')
  if (!v) return <Page back={true} title="Viewing not found" />
  const save = (patch, action) => upsert('viewings', { ...v, ...patch }, { silent: !action, action })
  const lists = OPS.VIEWING_CHECKLISTS
  const progress = (k) => { const n = lists[k].length; const done = lists[k].filter((_, i) => v.checklist?.[k]?.[i]).length; return `${done}/${n}` }
  const advance = (s) => {
    const patch = { status: s }
    if (s === 'Arrived') patch.arrivedAt = nowTime(); if (s === 'Completed') patch.leftAt = nowTime()
    save(patch, 'viewing ' + s.toLowerCase())
    if (s === 'Completed' && p) {
      if (v.recordId.startsWith('YSC-L')) upsert('leads', { ...db.leads.find((l) => l.id === v.recordId), stage: 'Site visit done', svDone: 'Yes', svDate: v.date }, { silent: true })
      setLog(true)
    }
  }
  return (
    <Page title={`Private viewing · ${v.name}`} back="/presales" backLabel="Private viewings" subtitle={`${d(v.date)} at ${v.time} · ${v.guests} guests expected · advisor ${v.advisor}${v.host ? ' · host ' + v.host : ''} · ${v.purpose}`}
      actions={<><Button onClick={() => setCard(true)}>Welcome card</Button><Link className="btn" to={'/brochure?for=' + v.recordId}>Present e-brochure</Link>
        {can && FLOW.indexOf(v.status) < 3 && v.status !== 'Cancelled' && <Button variant="primary" onClick={() => advance(FLOW[FLOW.indexOf(v.status) + 1])}>Mark {FLOW[FLOW.indexOf(v.status) + 1].toLowerCase()} →</Button>}</>}>
      <div className="row" style={{ marginBottom: 14 }}>{FLOW.map((s, i) => <Badge key={s} tone={FLOW.indexOf(v.status) >= i ? 'good' : 'muted'}>{i + 1}. {s}{s === 'Arrived' && v.arrivedAt ? ' ' + v.arrivedAt : ''}{s === 'Completed' && v.leftAt ? ' ' + v.leftAt : ''}</Badge>)}
        {can && v.status === 'Planned' && <><Button size="sm" variant="ghost" onClick={() => save({ status: 'No-show' }, 'no-show')}>No-show</Button><Button size="sm" variant="ghost" onClick={() => save({ status: 'Cancelled' }, 'cancelled')}>Cancel</Button></>}</div>
      <div className="split">
        <div>
          <Tabs tabs={[{ value: 'arrival', label: `Arrival ${progress('arrival')}` }, { value: 'site', label: `Site walk ${progress('site')}` }, { value: 'departure', label: `Departure ${progress('departure')}` }, { value: 'feedback', label: 'Feedback' }]} value={tab} onChange={setTab} />
          {tab !== 'feedback' ? <Card>
            {tab === 'arrival' && <div className="note">At the gate ask for the name and purpose only. Count the guests by eye and radio the number to the desk; do not ask how many are coming.</div>}
            {tab === 'site' && <div className="note">Floor order: show the 5th floor first, then the 10th, then higher. Fresh helmets and vests for every guest.</div>}
            {lists[tab].map((txt, i) => <div key={i} style={{ padding: '7px 0', borderBottom: '1px dashed var(--line-2)' }}><Check label={txt} checked={v.checklist?.[tab]?.[i]} onChange={(x) => can && save({ checklist: { ...v.checklist, [tab]: { ...(v.checklist?.[tab] || {}), [i]: x } } })} /></div>)}
            {tab === 'arrival' && <div className="form fc2" style={{ marginTop: 12 }}>
              <Field label="Guests counted"><Input type="number" value={v.headcount} onChange={(e) => save({ headcount: Number(e.target.value) })} /></Field>
              <Field label="Cars / valet"><Input value={v.cars} onChange={(e) => save({ cars: e.target.value })} placeholder="e.g. 1 car, KA19 …" /></Field></div>}
          </Card> : <Card title="Feedback (asked by hospitality, five questions at most)">
            {OPS.FEEDBACK_QUESTIONS.map((q, i) => <Field key={i} label={`${i + 1}. ${q}`}><Textarea rows={2} value={v.feedback?.[i]} onChange={(e) => save({ feedback: { ...v.feedback, [i]: e.target.value } })} /></Field>)}
            <Field label="Overall"><Seg options={['Delighted', 'Happy', 'Neutral', 'Unhappy']} value={v.rating} onChange={(x) => save({ rating: x })} /></Field>
          </Card>}
        </div>
        <div>
          <Card title="Guest">
            {p ? <KV rows={[['Name', p.name], ['ID', v.recordId], ['Phone', p.phone], ['City', p.city || p.country], ['Wants', p.config || (p.unit ? 'Owner of ' + p.unit : '')], ['Stage', p.stage || p.status], ['Source', p.source]]} /> : <p className="muted">Record not found.</p>}
            {p && <Link className="small" to={v.recordId.startsWith('YSC-C') ? '/crm/clients/' + p.bookingId : '/crm/leads/' + v.recordId}>Open in CRM</Link>}
          </Card>
          <Card title="Interests (shape the presentation)"><Chips options={OPS.INTERESTS} value={v.interests || []} onChange={(x) => can && save({ interests: x })} />
            <p className="small muted" style={{ marginBottom: 0 }}>Engineering → open with the structure facts. Sea and views → start on the residences and views. Investment → founding privilege.</p></Card>
          <Card title="Care package">
            {OPS.CARE_TIERS.map((c) => <label key={c.tier} className="check-row" style={{ cursor: 'pointer' }}><span><input type="radio" checked={v.careTier === c.tier} onChange={() => can && save({ careTier: c.tier }, 'care ' + c.tier)} /> <b>{c.tier}</b> · {c.for}<div className="small muted">{c.contents}</div></span></label>)}
          </Card>
          {v.notes && <Card title="Desk notes"><p style={{ margin: 0 }}>{v.notes}</p></Card>}
          <Card title="Vocabulary on the floor"><table className="table dense"><tbody>{(settings.vocabulary || []).map(([a, b]) => <tr key={a}><td className="muted">Not “{a}”</td><td><b>{b}</b></td></tr>)}</tbody></table></Card>
        </div>
      </div>
      <Modal open={card} onClose={() => setCard(false)} title="Welcome card (A6)" wide footer={<Button variant="primary" onClick={() => window.print()}>Print</Button>}>
        <div className="wcard print-only-card"><div className="k">Yamuna Sky City</div><h2>Welcome, {(v.name || '').replace(/&.*/, '').trim()}</h2><p>It is a pleasure to host you for a private viewing today. Your client advisor, {v.advisor}, will take you through the residences and the view from above the coast.</p><p style={{ marginTop: 18, fontSize: 11, letterSpacing: '.2em' }}>{d(v.date).toUpperCase()}</p></div>
      </Modal>
      <LogInteraction open={log} onClose={() => setLog(false)} recordId={v.recordId} preset={{ mode: 'Site visit', purpose: 'Site visit', summary: `Private viewing ${v.id} completed. ${v.feedback?.[2] ? 'Liked: ' + v.feedback[2] + '. ' : ''}${v.rating ? 'Overall: ' + v.rating + '.' : ''}`, nextAction: 'Thank-you message and residence details', nextDate: addDays(today(), 1) }} />
    </Page>
  )
}
