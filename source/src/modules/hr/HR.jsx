// 12 Nov: Accord People (HRMS). My HR, leave, KRAs and reviews, the HR desk (people, onboarding and exit, pay, attendance
// and leave register), assets, holidays, HR requests and HR settings. Who sees what is decided in lib/hr.js and on the server.
import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { hasAccess } from '../../lib/perms.js'
import { d, today, addDays, inr } from '../../lib/format.js'
import { Page, Card, Grid, Stat, Badge, Button, Field, Input, Textarea, Select, Modal, Tabs, Empty, KV, Check, Chips, Confirm } from '../../components/ui.jsx'
import {
  hrConfigOf, POSITIONS, POSITION, SUGGEST, gradeRank, staffOf, reportsOf, isHr, profileOf, gradeOf, positionOf, kbVisible,
  leaveDays, balance, kraTemplate, needsAck, RATING, weighted, band, KRA_STATUS, autoKpi, CYCLE_RANGE, TICKET_CATS, ASSET_TYPES, SELF_FIELDS, ymd,
} from '../../lib/hr.js'
import { KB_DOCS } from '../../seed/kb.js'
import { HOLIDAYS_START } from '../../seed/hrStart.js'

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const POSH = 'POSH complaint (confidential)'
const csv = (rows) => rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }).join(',')).join('\n')
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }

function useHr() {
  const s = useStore()
  const { db, user } = s
  const cfg = hrConfigOf(db)
  const staff = staffOf(db.users)
  const team = useMemo(() => reportsOf(db.users, user?.name), [db.users, user?.name])
  const hr = isHr(user)
  const desk = hasAccess(user, 'hrDesk')
  const holidays = db.holidays || []
  const userById = (id) => db.users.find((u) => u.id === id)
  const userByName = (n) => db.users.find((u) => u.name === n)
  const canSeePay = (target) => {
    if (!user || !target) return false
    if (user.appRole === 'admin' || target.id === user.id) return true
    if (!hasAccess(user, 'hrComp')) return false
    return gradeRank(gradeOf(db, target)) < gradeRank(cfg.compBelow || 'G5')
  }
  return { ...s, cfg, staff, team, hr, desk, holidays, userById, userByName, canSeePay }
}
const positionLabel = (id) => POSITION[id]?.label || '–'
const gradeLabel = (cfg, g) => { const x = (cfg.grades || []).find((y) => y.id === g); return x ? `${g} · ${x.label}` : g || '–' }

// ───────────────────────────── My HR
export function MyHr() {
  const { db, user, cfg, team, holidays, desk } = useHr()
  const nav = useNavigate()
  const [apply, setApply] = useState(false)
  const [req, setReq] = useState(false)
  const [edit, setEdit] = useState(false)
  const prof = profileOf(db, user) || {}
  const pos = positionOf(db, user), grade = gradeOf(db, user)
  const year = new Date().getFullYear()
  const types = (cfg.leaveTypes || []).filter((t) => ['monthly', 'yearly'].includes(t.accrual) || t.id === 'CO')
  const mine = (db.leaves || []).filter((l) => l.userId === user.id && l.kind !== 'credit').sort((a, b) => String(b.from).localeCompare(a.from))
  const pendingTeam = (db.leaves || []).filter((l) => l.status === 'Applied' && team.has(l.name))
  const kra = (db.kras || []).find((k) => k.userId === user.id && k.cycle === cfg.cycle)
  const toAck = (db.kbDocs || []).filter((x) => needsAck(db.kbAcks, x, user.id))
  const myAssets = (db.assets || []).filter((a) => a.issuedToId === user.id && a.status === 'Issued')
  const myReq = (db.hrTickets || []).filter((t) => t.by === user.name && !['Closed'].includes(t.status))
  const next = holidays.filter((h) => h.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
  const onLeaveToday = (db.leaves || []).filter((l) => l.status === 'Approved' && l.kind !== 'credit' && l.from <= today() && (l.to || l.from) >= today() && (team.has(l.name) || l.userId === user.id))
  return (
    <Page title={`My HR · ${user.name}`} subtitle={`${positionLabel(pos)} · ${gradeLabel(cfg, grade)}${prof.position ? '' : ' (suggested, HR to confirm)'}`}
      actions={<><Button onClick={() => setApply(true)} variant="primary">Apply for leave</Button><Button onClick={() => setReq(true)}>New HR request</Button>{desk && <Button onClick={() => nav('/hr/desk')}>HR desk</Button>}</>}>
      {toAck.length > 0 && <Card tone="warn" title={`${toAck.length} polic${toAck.length === 1 ? 'y' : 'ies'} to read and acknowledge`}>
        {toAck.map((x) => <div key={x.id} className="hrm-line"><Link to={'/kb/' + x.id}><b>{x.code}</b> {x.title}</Link><span className="small muted">v{x.version}</span></div>)}</Card>}
      <Grid cols={4}>
        {types.slice(0, 4).map((t) => { const b = balance(t, { profile: prof, leaves: db.leaves || [], year, userId: user.id })
          return <Stat key={t.id} label={t.label} value={b.left ?? '–'} sub={`${b.used} used${b.pending ? ` · ${b.pending} awaiting approval` : ''}`} /> })}
      </Grid>
      <div className="grid g2">
        <Card title="Employment" actions={<Button size="sm" variant="ghost" onClick={() => setEdit(true)}>Update my details</Button>}>
          <KV rows={[['Position', positionLabel(pos)], ['Grade', gradeLabel(cfg, grade)], ['Department', prof.department || POSITION[pos]?.dept], ['Reports to', user.reportsTo], ['Joined', prof.doj ? d(prof.doj) : ''],
            ['Probation', prof.confirmedOn ? 'Confirmed ' + d(prof.confirmedOn) : prof.probationEnd ? 'Until ' + d(prof.probationEnd) : ''], ['Notice period', (cfg.noticeDays?.[grade] || 30) + ' days after confirmation'],
            ['Emergency contact', [prof.emergencyName, prof.emergencyPhone].filter(Boolean).join(' · ')]]} />
        </Card>
        <Card title={`KRAs · ${cfg.cycle}`} actions={kra ? <Button size="sm" onClick={() => nav('/hr/kra/' + kra.id)}>Open</Button> : <Button size="sm" onClick={() => nav('/hr/kra')}>KRAs</Button>}>
          {kra ? <KV rows={[['Status', <Badge>{kra.status}</Badge>], ['KRAs', String((kra.items || []).length)], ['Self score', weighted(kra.items, 'self')?.toFixed(2)], ['Manager score', weighted(kra.items, 'mgr')?.toFixed(2)]]} />
            : <p className="small muted">No goal sheet for this cycle yet. HR or your manager starts it from your position's template, or start a draft yourself from KRAs.</p>}
        </Card>
      </div>
      {pendingTeam.length > 0 && <Card tone="info" title={`${pendingTeam.length} leave request${pendingTeam.length > 1 ? 's' : ''} from your team to approve`} actions={<Button size="sm" onClick={() => nav('/hr/leave?tab=approve')}>Review</Button>}>
        {pendingTeam.slice(0, 5).map((l) => <div key={l.id} className="hrm-line"><span><b>{l.name}</b> · {l.type} · {d(l.from)}{l.to && l.to !== l.from ? ' to ' + d(l.to) : ''}</span><span className="small">{l.days} day{l.days === 1 ? '' : 's'}</span></div>)}</Card>}
      <div className="grid g2">
        <Card title="My leave" actions={<Button size="sm" variant="ghost" onClick={() => nav('/hr/leave')}>All</Button>}>
          {mine.length ? mine.slice(0, 6).map((l) => <div key={l.id} className="hrm-line"><span>{l.type} · {d(l.from)}{l.to && l.to !== l.from ? ' to ' + d(l.to) : ''} · {l.days}d</span><Badge>{l.status}</Badge></div>) : <Empty>No leave taken this year.</Empty>}
        </Card>
        <Card title="Today">
          {onLeaveToday.length ? onLeaveToday.map((l) => <div key={l.id} className="hrm-line"><span>{l.name}</span><span className="small muted">{l.type} until {d(l.to || l.from)}</span></div>) : <p className="small muted">Nobody in your team is on leave today.</p>}
          <div className="sec-h" style={{ marginTop: 12 }}>Coming holidays</div>
          {next.length ? next.map((h) => <div key={h.id} className="hrm-line"><span>{h.name}</span><span className="small muted">{d(h.date)} · {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span></div>) : <p className="small muted">HR has not published the list yet.</p>}
        </Card>
        <Card title="Assets with me">{myAssets.length ? myAssets.map((a) => <div key={a.id} className="hrm-line"><span>{a.type} · {a.description}</span><span className="mono small">{a.tag}</span></div>) : <p className="small muted">Nothing recorded.</p>}</Card>
        <Card title="My HR requests" actions={<Button size="sm" variant="ghost" onClick={() => nav('/hr/requests')}>All</Button>}>{myReq.length ? myReq.map((t) => <div key={t.id} className="hrm-line"><span>{t.subject}</span><Badge>{t.status}</Badge></div>) : <p className="small muted">No open requests.</p>}</Card>
      </div>
      {cfg.icMembers?.length > 0 && <p className="small muted">Internal Committee (POSH): {cfg.icMembers.join(', ')}. A POSH request in Accord is seen only by them.</p>}
      <LeaveForm open={apply} onClose={() => setApply(false)} />
      <TicketForm open={req} onClose={() => setReq(false)} />
      <SelfDetails open={edit} onClose={() => setEdit(false)} />
    </Page>
  )
}

function SelfDetails({ open, onClose }) {
  const { db, user, upsert, notify } = useHr()
  const prof = profileOf(db, user) || {}
  const [v, setV] = useState({})
  const val = (k) => (v[k] ?? prof[k] ?? '')
  const L = { personalPhone: 'Personal phone', personalEmail: 'Personal e-mail', address: 'Home address', emergencyName: 'Emergency contact name', emergencyRelation: 'Relation', emergencyPhone: 'Emergency phone', bloodGroup: 'Blood group', dob: 'Date of birth' }
  const save = () => {
    const base = profileOf(db, user) || { id: 'HP-' + user.id, userId: user.id, name: user.name }
    const patch = Object.fromEntries(SELF_FIELDS.filter((k) => v[k] !== undefined).map((k) => [k, v[k]]))
    upsert('hrProfiles', { ...base, ...patch }, { system: true, action: 'updated own details' }); notify('Your details are saved'); setV({}); onClose()
  }
  return <Modal open={open} onClose={onClose} title="My personal details" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
    <p className="small muted">Only you, HR and admins see these. Your position, grade and pay are changed by HR.</p>
    <div className="form">{SELF_FIELDS.map((k) => <Field key={k} label={L[k]}><Input type={k === 'dob' ? 'date' : 'text'} value={val(k)} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}</div>
  </Modal>
}

// ───────────────────────────── Leave
export function LeaveForm({ open, onClose, forUser }) {
  const { db, user, cfg, holidays, upsert, nextId, notify, pushNote, userByName } = useHr()
  const who = forUser || user
  const [v, setV] = useState({ type: 'CL', from: today(), to: today(), half: false, reason: '', cover: '' })
  const t = (cfg.leaveTypes || []).find((x) => x.id === v.type) || {}
  const days = leaveDays(v.from, v.to, { workDays: who.workDays, holidays, half: v.half })
  const prof = profileOf(db, who)
  const b = t.accrual && !['none', 'event'].includes(t.accrual) ? balance(t, { profile: prof, leaves: db.leaves || [], year: Number(String(v.from).slice(0, 4)), userId: who.id }) : null
  const notice = Math.round((new Date(v.from) - new Date(today())) / 864e5)
  const warn = [b && b.left !== null && days > b.left - b.pending ? `Only ${Math.max(0, b.left - b.pending)} ${t.label.toLowerCase()} left after pending requests. The rest would be leave without pay.` : '',
    t.minNotice && notice < t.minNotice && v.type !== 'SL' ? `Policy asks for ${t.minNotice} days' notice for ${t.label.toLowerCase()}.` : '',
    t.maxStretch && days > t.maxStretch ? `${t.label} is up to ${t.maxStretch} days at a stretch.` : '',
    t.certAfter && days > t.certAfter ? 'Attach a medical certificate through an HR request.' : ''].filter(Boolean)
  const mgr = who.reportsTo || cfg.hrName
  const save = () => {
    if (!v.from || (v.to && v.to < v.from)) return notify('Check the dates', 'bad')
    if (!days) return notify('These dates are all holidays or weekly offs', 'bad')
    if (!v.reason.trim()) return notify('Add a short reason', 'bad')
    const rec = { id: nextId('leaves', 'LV-'), userId: who.id, name: who.name, type: v.type, from: v.from, to: v.to || v.from, half: v.half, days, reason: v.reason, cover: v.cover,
      status: 'Applied', appliedAt: new Date().toISOString(), approver: mgr, by: user.name }
    if (upsert('leaves', rec, { action: 'leave applied' })) {
      pushNote(mgr, { kind: 'leave', title: `Leave request from ${who.name}`, body: `${t.label}, ${days} day${days === 1 ? '' : 's'} from ${d(v.from)}`, link: '#/hr/leave?tab=approve' })
      if (days > (cfg.longLeaveDays || 5) && cfg.hrName && cfg.hrName !== mgr) pushNote(cfg.hrName, { kind: 'leave', title: `Long leave: ${who.name}`, body: `${days} days from ${d(v.from)}`, link: '#/hr/leave?tab=all' })
      notify(`Sent to ${mgr} for approval`); onClose()
    }
  }
  if (!open) return null
  const ok = (cfg.leaveTypes || []).filter((x) => x.accrual !== 'earned' || true)
  return <Modal open={open} onClose={onClose} title={forUser ? `Leave for ${who.name}` : 'Apply for leave'} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Send for approval</Button></>}>
    <div className="form">
      <Field label="Type"><Select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} options={ok.map((x) => ({ value: x.id, label: x.label }))} /></Field>
      <Field label="Half day" hint="One day only"><Check checked={v.half} onChange={(x) => setV({ ...v, half: x })} label="Half day" /></Field>
      <Field label="From"><Input type="date" value={v.from} onChange={(e) => setV({ ...v, from: e.target.value, to: v.to < e.target.value ? e.target.value : v.to })} /></Field>
      <Field label="To"><Input type="date" value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} /></Field>
      <Field label="Reason" span="all"><Input value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
      <Field label="Who covers your follow-ups and customers" span="all" hint="Leaving a customer without a contact is against the SOP"><Input value={v.cover} onChange={(e) => setV({ ...v, cover: e.target.value })} /></Field>
    </div>
    <p className="small"><b>{days}</b> working day{days === 1 ? '' : 's'} (weekly offs and holidays not counted){b && b.left !== null ? ` · balance ${b.left}` : ''} · approver <b>{mgr}</b></p>
    {warn.map((w) => <p key={w} className="small warn-t">{w}</p>)}
    <p className="small muted">{t.statutory}</p>
  </Modal>
}

export function Leave() {
  const { db, user, cfg, team, hr, upsert, notify, pushNote, staff } = useHr()
  const q = new URLSearchParams(location.hash.split('?')[1] || '')
  const approver = hr || team.size > 0
  const [tab, setTab] = useState(q.get('tab') || 'mine')
  const [apply, setApply] = useState(false)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [decide, setDecide] = useState(null)
  const all = (db.leaves || []).filter((l) => l.kind !== 'credit')
  const rows = tab === 'mine' ? all.filter((l) => l.userId === user.id) : tab === 'approve' ? all.filter((l) => l.status === 'Applied' && (hr || team.has(l.name)) && l.userId !== user.id) : all
  const act = (l, status, note = '') => {
    if (status === 'Rejected' && !note.trim()) return notify('Say why it is rejected', 'bad')
    upsert('leaves', { ...l, status, decidedBy: user.name, decidedAt: new Date().toISOString(), decisionNote: note }, { action: 'leave ' + status.toLowerCase() })
    pushNote(l.name, { kind: 'leave', title: `Leave ${status.toLowerCase()}`, body: `${l.type} from ${d(l.from)}${note ? ': ' + note : ''}`, link: '#/hr/leave' })
    notify(`Leave ${status.toLowerCase()}`); setDecide(null)
  }
  const tabs = [{ value: 'mine', label: 'My leave' }, ...(approver ? [{ value: 'approve', label: `To approve (${all.filter((l) => l.status === 'Applied' && (hr || team.has(l.name)) && l.userId !== user.id).length})` }] : []), { value: 'calendar', label: 'Calendar' }, ...(hr ? [{ value: 'all', label: 'All requests' }, { value: 'balances', label: 'Balances' }] : [])]
  return (
    <Page title="Leave" subtitle="Apply, approve and see who is away. Approval goes to the person you report to; HR sees long leave." actions={<Button variant="primary" onClick={() => setApply(true)}>Apply for leave</Button>}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'calendar' ? <LeaveCalendar month={month} setMonth={setMonth} people={hr ? staff : staff.filter((u) => u.id === user.id || team.has(u.name))} />
        : tab === 'balances' ? <Balances />
        : rows.length ? <div className="dt-wrap"><table className="table"><thead><tr><th>ID</th><th>Person</th><th>Type</th><th>Dates</th><th className="right">Days</th><th>Reason</th><th>Cover</th><th>Status</th><th>Decided</th><th /></tr></thead>
          <tbody>{rows.sort((a, b) => String(b.from).localeCompare(a.from)).map((l) => <tr key={l.id}><td className="mono small">{l.id}</td><td><b>{l.name}</b></td><td>{l.type}{l.half ? ' (½)' : ''}</td><td className="small">{d(l.from)}{l.to && l.to !== l.from ? ' to ' + d(l.to) : ''}</td><td className="right">{l.days}</td>
            <td className="small" style={{ maxWidth: 240 }}>{l.reason}</td><td className="small">{l.cover || '–'}</td><td><Badge>{l.status}</Badge></td><td className="small muted">{l.decidedBy ? `${l.decidedBy}${l.decisionNote ? ': ' + l.decisionNote : ''}` : '–'}</td>
            <td className="right">{l.status === 'Applied' && l.userId !== user.id && (hr || team.has(l.name)) && <><Button size="sm" variant="primary" onClick={() => act(l, 'Approved')}>Approve</Button> <Button size="sm" onClick={() => setDecide(l)}>Reject</Button></>}
              {l.userId === user.id && ['Applied', 'Approved'].includes(l.status) && l.from > today() && <Confirm size="sm" label="Cancel this leave?" onConfirm={() => act(l, 'Cancelled', 'Cancelled by ' + user.name)}>Cancel</Confirm>}
              {hr && l.status === 'Approved' && l.userId !== user.id && <Confirm size="sm" label="Cancel approved leave?" onConfirm={() => act(l, 'Cancelled', 'Cancelled by HR')}>Cancel</Confirm>}</td></tr>)}</tbody></table></div>
        : <Empty>{tab === 'approve' ? 'Nothing waiting for you.' : 'No leave yet.'}</Empty>}
      <LeaveForm open={apply} onClose={() => setApply(false)} />
      <RejectModal l={decide} onClose={() => setDecide(null)} onReject={(note) => act(decide, 'Rejected', note)} />
    </Page>
  )
}
function RejectModal({ l, onClose, onReject }) {
  const [note, setNote] = useState('')
  if (!l) return null
  return <Modal open onClose={onClose} title={`Reject ${l.name}'s leave`} footer={<><Button onClick={onClose}>Back</Button><Button variant="danger" onClick={() => onReject(note)}>Reject</Button></>}>
    <Field label="Reason (sent to them)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field></Modal>
}

function monthDays(month) { const [y, m] = month.split('-').map(Number); const n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`) }
function leaveOn(leaves, userId, day) { return leaves.find((l) => l.userId === userId && l.kind !== 'credit' && ['Approved', 'Applied'].includes(l.status) && l.from <= day && (l.to || l.from) >= day) }
function LeaveCalendar({ month, setMonth, people }) {
  const { db, holidays } = useHr()
  const days = monthDays(month)
  const hol = Object.fromEntries(holidays.map((h) => [h.date, h.name]))
  return <Card title="Who is away" actions={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />} pad={false}>
    <div className="dt-wrap"><table className="table hrm-cal"><thead><tr><th>Person</th>{days.map((x) => { const wd = new Date(x).getDay(); return <th key={x} className={wd === 0 ? 'off' : hol[x] ? 'hol' : ''} title={hol[x] || ''}>{Number(x.slice(8))}</th> })}</tr></thead>
      <tbody>{people.map((u) => <tr key={u.id}><td><b>{u.name}</b></td>{days.map((x) => { const l = leaveOn(db.leaves || [], u.id, x); const wd = new Date(x).getDay()
        return <td key={x} className={wd === 0 ? 'off' : hol[x] ? 'hol' : l ? (l.status === 'Applied' ? 'pend' : 'on') : ''} title={l ? `${l.type} · ${l.status}` : hol[x] || ''}>{l ? l.type : hol[x] ? 'H' : ''}</td> })}</tr>)}</tbody></table></div>
    <p className="small muted" style={{ padding: '8px 14px' }}>Shaded: Sunday. H: holiday. Leave codes in solid colour are approved; outlined are awaiting approval.</p>
  </Card>
}

function Balances() {
  const { db, cfg, staff, upsert, hr, notify } = useHr()
  const year = new Date().getFullYear()
  const types = (cfg.leaveTypes || []).filter((t) => ['monthly', 'yearly'].includes(t.accrual))
  const [open, setOpen] = useState(null)
  return <>
    <div className="dt-wrap"><table className="table"><thead><tr><th>Person</th><th>Joined</th>{types.map((t) => <th key={t.id} className="right">{t.id} left</th>)}<th className="right">LOP taken</th>{hr && <th />}</tr></thead>
      <tbody>{staff.map((u) => { const p = profileOf(db, u)
        const lop = (db.leaves || []).filter((l) => l.userId === u.id && l.type === 'LOP' && l.status === 'Approved' && String(l.from).startsWith(year)).reduce((s, l) => s + Number(l.days || 0), 0)
        return <tr key={u.id}><td><b>{u.name}</b></td><td className="small">{p?.doj ? d(p.doj) : <span className="missing">Missing</span>}</td>{types.map((t) => { const b = balance(t, { profile: p, leaves: db.leaves || [], year, userId: u.id }); return <td key={t.id} className="right" title={`credit ${b.credit} + opening ${b.opening} − used ${b.used}`}>{b.left}</td> })}
          <td className="right">{lop}</td>{hr && <td className="right"><Button size="sm" variant="ghost" onClick={() => setOpen(u)}>Opening balances</Button></td>}</tr> })}</tbody></table></div>
    <p className="small muted">Earned leave is credited monthly from the joining date; sick and casual leave are credited for the year, pro-rata in the year of joining. Opening balances carry forward last year's earned leave (up to {(cfg.leaveTypes || []).find((t) => t.id === 'EL')?.carry || 45} days).</p>
    {open && <OpeningModal u={open} year={year} types={types} onClose={() => setOpen(null)} onSave={(vals) => { const p = profileOf(db, open) || { id: 'HP-' + open.id, userId: open.id, name: open.name }; upsert('hrProfiles', { ...p, opening: { ...(p.opening || {}), [year]: vals } }); notify('Opening balances saved'); setOpen(null) }} prof={profileOf(db, open)} />}
  </>
}
function OpeningModal({ u, year, types, onClose, onSave, prof }) {
  const [v, setV] = useState(prof?.opening?.[year] || {})
  return <Modal open onClose={onClose} title={`Opening balances ${year} · ${u.name}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onSave(v)}>Save</Button></>}>
    <div className="form">{types.map((t) => <Field key={t.id} label={t.label}><Input type="number" step="0.5" value={v[t.id] ?? ''} onChange={(e) => setV({ ...v, [t.id]: e.target.value })} /></Field>)}</div></Modal>
}

// ───────────────────────────── KRAs and reviews
export function Kras() {
  const { db, user, cfg, team, hr, upsert, nextId, notify, staff } = useHr()
  const nav = useNavigate()
  const [cycle, setCycle] = useState(cfg.cycle)
  const visible = (db.kras || []).filter((k) => k.cycle === cycle && (hr || k.userId === user.id || team.has(k.name)))
  const start = (u) => {
    const pos = positionOf(db, u)
    const rec = { id: nextId('kras', 'KRA-'), userId: u.id, name: u.name, position: pos, manager: u.reportsTo || '', cycle, status: 'Draft', items: kraTemplate(pos), createdBy: user.name, createdAt: new Date().toISOString() }
    return upsert('kras', rec, { action: 'goal sheet started' })
  }
  const mineMissing = !(db.kras || []).some((k) => k.userId === user.id && k.cycle === cycle)
  const missing = staff.filter((u) => (hr || team.has(u.name)) && !(db.kras || []).some((k) => k.userId === u.id && k.cycle === cycle))
  return <Page title="KRAs and reviews" subtitle="Goal sheets from each position's template (SOP YSC-SALES-01, section 11). Agree targets at the start of the cycle; self review, manager review, then HR closes."
    actions={<><Select value={cycle} onChange={(e) => setCycle(e.target.value)} options={cfg.cycles || [cfg.cycle]} placeholder="Cycle" />
      {mineMissing && <Button onClick={() => { const r = start(user); if (r) nav('/hr/kra/' + r.id) }}>Start my sheet</Button>}
      {missing.length > 0 && <Button variant="primary" onClick={() => { missing.forEach(start); notify(`${missing.length} goal sheets started`) }}>Start sheets for {missing.length} {hr ? 'people' : 'in my team'}</Button>}</>}>
    {visible.length ? <div className="dt-wrap"><table className="table"><thead><tr><th>Person</th><th>Position</th><th>Manager</th><th>Status</th><th className="right">Weights</th><th className="right">Self</th><th className="right">Manager</th><th>Band</th></tr></thead>
      <tbody>{visible.map((k) => { const w = (k.items || []).reduce((s, x) => s + Number(x.weight || 0), 0), m = weighted(k.items, 'mgr')
        return <tr key={k.id} className="click" onClick={() => nav('/hr/kra/' + k.id)}><td><b>{k.name}</b></td><td>{positionLabel(k.position)}</td><td>{k.manager || '–'}</td><td><Badge>{k.status}</Badge></td><td className={'right ' + (w !== 100 ? 'warn-t' : '')}>{w}</td>
          <td className="right">{weighted(k.items, 'self')?.toFixed(2) || '–'}</td><td className="right">{m?.toFixed(2) || '–'}</td><td>{m ? <Badge tone={m >= 3.5 ? 'good' : m >= 2.75 ? 'info' : 'bad'}>{band(m)}</Badge> : '–'}</td></tr> })}</tbody></table></div>
      : <Empty>No goal sheets for {cycle} that you can see.</Empty>}
  </Page>
}

export function KraSheet() {
  const { id } = useParams()
  const { db, user, cfg, team, hr, upsert, notify, pushNote } = useHr()
  const k = (db.kras || []).find((x) => x.id === id)
  const [draft, setDraft] = useState(null)
  if (!k) return <Page title="Goal sheet" back="/hr/kra"><Empty>Not found, or not yours to see.</Empty></Page>
  const v = draft || k
  const self = k.userId === user.id
  const mgr = !self && (hr || team.has(k.name))
  const st = v.status
  const canSetUp = (mgr || (self && st === 'Draft')) && ['Draft'].includes(st)
  const canSelf = self && ['Agreed', 'Self review'].includes(st)
  const canMgr = mgr && ['Self review', 'Manager review'].includes(st)
  const [from, to] = CYCLE_RANGE(k.cycle)
  const setItem = (i, patch) => setDraft({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const w = (v.items || []).reduce((s, x) => s + Number(x.weight || 0), 0)
  const save = (patch = {}, msg = 'Saved', to2) => {
    const rec = { ...v, ...patch }
    if (upsert('kras', rec, { action: patch.status ? 'goal sheet ' + patch.status.toLowerCase() : 'goal sheet saved' })) { setDraft(null); notify(msg); if (to2) pushNote(to2, { kind: 'kra', title: `Goal sheet: ${k.name}`, body: `${k.cycle} is now ${rec.status}`, link: '#/hr/kra/' + k.id }) }
  }
  const move = (status) => {
    if (status === 'Agreed' && w !== 100) return notify('Weights must add up to 100', 'bad')
    if (status === 'Manager review' && v.items.some((x) => !x.self)) return notify('Rate every KRA before sending', 'bad')
    if (status === 'Closed' && v.items.some((x) => !x.mgr)) return notify('Manager ratings are missing', 'bad')
    const score = weighted(v.items, 'mgr')
    save({ status, ...(status === 'Closed' ? { score: score?.toFixed(2), band: band(score), closedBy: user.name, closedAt: today() } : {}) }, 'Moved to ' + status, self ? k.manager || cfg.hrName : k.name)
  }
  const R = ({ val, on, dis }) => <select className="input" value={val || ''} disabled={dis} onChange={(e) => on(e.target.value)}><option value="">–</option>{RATING.map((r) => <option key={r.v} value={r.v}>{r.v} {r.label}</option>)}</select>
  return <Page title={`${k.name} · ${k.cycle}`} subtitle={`${positionLabel(k.position)} · manager ${k.manager || '–'} · ${d(from)} to ${d(to)}`} back="/hr/kra" backLabel="KRAs"
    actions={<><Badge>{st}</Badge><Button onClick={() => window.print()}>Print</Button></>}>
    <Card pad={false}><div className="dt-wrap"><table className="table hrm-kra"><thead><tr><th>KRA</th><th>KPI</th><th className="right">Weight</th><th>Target</th><th>Accord figure</th><th>Actual / evidence</th><th>Self</th><th>Manager</th><th>Comment</th>{canSetUp && <th />}</tr></thead>
      <tbody>{(v.items || []).map((x, i) => { const a = x.auto ? autoKpi(x.auto, db, k.name, from, to) : null
        return <tr key={x.id || i}>
          <td>{canSetUp ? <Input value={x.kra} onChange={(e) => setItem(i, { kra: e.target.value })} /> : <b>{x.kra}</b>}</td>
          <td className="small">{canSetUp ? <Textarea rows={2} value={x.kpi} onChange={(e) => setItem(i, { kpi: e.target.value })} /> : x.kpi}</td>
          <td className="right">{canSetUp ? <Input type="number" style={{ width: 64 }} value={x.weight} onChange={(e) => setItem(i, { weight: e.target.value })} /> : x.weight}</td>
          <td className="small">{canSetUp ? <Input value={x.target} onChange={(e) => setItem(i, { target: e.target.value })} /> : x.target}</td>
          <td className="small">{a ? <><b>{a.v}</b> <span className="muted">{a.label}</span></> : <span className="muted">–</span>}</td>
          <td>{canSelf ? <Input value={x.actual} onChange={(e) => setItem(i, { actual: e.target.value })} /> : <span className="small">{x.actual || '–'}</span>}</td>
          <td><R val={x.self} dis={!canSelf} on={(r) => setItem(i, { self: r })} /></td>
          <td><R val={x.mgr} dis={!canMgr} on={(r) => setItem(i, { mgr: r })} /></td>
          <td>{canMgr || canSelf ? <Input value={x.note} onChange={(e) => setItem(i, { note: e.target.value })} /> : <span className="small">{x.note || ''}</span>}</td>
          {canSetUp && <td><Button size="sm" variant="ghost" onClick={() => setDraft({ ...v, items: v.items.filter((_, j) => j !== i) })}>Remove</Button></td>}</tr> })}</tbody>
      <tfoot><tr><td colSpan={2}>{canSetUp && <Button size="sm" onClick={() => setDraft({ ...v, items: [...v.items, { id: 'k' + Date.now(), kra: '', kpi: '', weight: 0, target: '', auto: '', actual: '', self: '', mgr: '', note: '' }] })}>Add a KRA</Button>}</td>
        <td className={'right ' + (w !== 100 ? 'warn-t' : '')}><b>{w}</b></td><td colSpan={3} /><td><b>{weighted(v.items, 'self')?.toFixed(2) || '–'}</b></td><td><b>{weighted(v.items, 'mgr')?.toFixed(2) || '–'}</b> {weighted(v.items, 'mgr') ? band(weighted(v.items, 'mgr')) : ''}</td><td colSpan={canSetUp ? 2 : 1} /></tr></tfoot></table></div></Card>
    <div className="grid g2">
      <Card title="Self comment">{canSelf ? <Textarea value={v.selfComment} onChange={(e) => setDraft({ ...v, selfComment: e.target.value })} /> : <p className="small">{v.selfComment || '–'}</p>}</Card>
      <Card title="Manager comment and development plan">{canMgr ? <Textarea value={v.mgrComment} onChange={(e) => setDraft({ ...v, mgrComment: e.target.value })} /> : <p className="small">{v.mgrComment || '–'}</p>}</Card>
    </div>
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {draft && <Button variant="primary" onClick={() => save()}>Save changes</Button>}
      {st === 'Draft' && mgr && <Button onClick={() => move('Agreed')}>Mark targets agreed</Button>}
      {st === 'Draft' && self && !mgr && <span className="small muted">Your manager or HR marks the targets agreed.</span>}
      {st === 'Agreed' && (self || mgr) && <Button onClick={() => move('Self review')}>Open self review</Button>}
      {st === 'Self review' && self && <Button variant="primary" onClick={() => move('Manager review')}>Send to my manager</Button>}
      {st === 'Manager review' && hr && <Button variant="primary" onClick={() => move('Closed')}>Moderate and close</Button>}
      {st === 'Manager review' && mgr && !hr && <span className="small muted">Rate each KRA and save. HR moderates and closes the sheet.</span>}
      {hr && st !== 'Draft' && st !== 'Closed' && <Confirm label="Send back to Draft?" onConfirm={() => save({ status: 'Draft' }, 'Back to Draft', k.name)}>Back to Draft</Confirm>}
    </div>
    {st === 'Closed' && <p className="small">Closed by {k.closedBy} on {d(k.closedAt)} · score <b>{k.score}</b> · {k.band}</p>}
  </Page>
}

// ───────────────────────────── HR desk
export function HrDesk() {
  const { db, user, cfg, staff, upsert, notify, holidays } = useHr()
  const nav = useNavigate()
  const t = today()
  const onLeave = (db.leaves || []).filter((l) => l.status === 'Approved' && l.kind !== 'credit' && l.from <= t && (l.to || l.from) >= t)
  const pending = (db.leaves || []).filter((l) => l.status === 'Applied')
  const profs = staff.map((u) => ({ u, p: profileOf(db, u) }))
  const probation = profs.filter(({ p }) => p?.probationEnd && !p.confirmedOn && p.probationEnd <= addDays(t, 30))
  const onboarding = profs.filter(({ p }) => p && p.status !== 'Exited' && (cfg.onboarding || []).some((x) => !p.onboarding?.[x]) && p.doj && p.doj >= addDays(t, -90))
  const exits = profs.filter(({ p }) => p?.status === 'On notice')
  const noProfile = profs.filter(({ p }) => !p)
  const ackDocs = (db.kbDocs || []).filter((x) => x.ack && x.status === 'Approved')
  const ackGap = ackDocs.reduce((s, x) => s + staff.filter((u) => needsAck(db.kbAcks, x, u.id)).length, 0)
  const tickets = (db.hrTickets || []).filter((x) => !['Resolved', 'Closed'].includes(x.status))
  const empty = !(db.kbDocs || []).length || !(db.holidays || []).length || !(db.hrConfig || []).length
  const loadStart = () => {
    let n = 0
    if (!(db.hrConfig || []).length) { upsert('hrConfig', { ...cfg, id: 'main' }); n++ }
    if (!(db.holidays || []).length) HOLIDAYS_START.forEach((h) => { upsert('holidays', h, { silent: true }); n++ })
    if (!(db.kbDocs || []).length) KB_DOCS.forEach((x) => { upsert('kbDocs', x, { silent: true }); n++ })
    notify(`${n} starting records added`)
  }
  const makeProfiles = () => { noProfile.forEach(({ u }) => { const pos = SUGGEST[u.name] || 'other'
    upsert('hrProfiles', { id: 'HP-' + u.id, userId: u.id, name: u.name, position: pos, grade: POSITION[pos].grade, department: u.department || POSITION[pos].dept, status: 'Active', toConfirm: 'Yes' }, { silent: true }) })
    notify(`${noProfile.length} profiles made from the suggestions. Confirm each one.`) }
  return <Page title="HR desk" subtitle={`Accord People · ${cfg.cycle} · Yamuna Sky City staff only (Company in Users and access)`} actions={<><Button onClick={() => nav('/hr/people')}>People</Button><Button onClick={() => nav('/hr/attendance')}>Attendance and leave register</Button></>}>
    {empty && <Card tone="warn" title="Starting HR content is not in the shared sheet yet" actions={<Button variant="primary" onClick={loadStart}>Load starting content</Button>}>
      <p className="small">Adds the HR settings (grades, leave policy, checklists), the national holidays and the {KB_DOCS.length} knowledge-base documents drafted from the Sales and Post-Sales SOP. Everything stays editable; documents start "In review" until approved.</p></Card>}
    {noProfile.length > 0 && <Card tone="info" title={`${noProfile.length} people have no HR profile`} actions={<Button onClick={makeProfiles}>Make profiles from suggestions</Button>}>
      <p className="small">{noProfile.map(({ u }) => `${u.name} → ${positionLabel(SUGGEST[u.name] || 'other')}`).join(' · ')}</p></Card>}
    <Grid cols={4}>
      <Stat label="Head count" value={staff.length} sub={`${exits.length} on notice`} onClick={() => nav('/hr/people')} />
      <Stat label="On leave today" value={onLeave.length} sub={onLeave.map((l) => l.name).join(', ') || 'Everyone in'} onClick={() => nav('/hr/leave?tab=calendar')} />
      <Stat label="Leave awaiting approval" value={pending.length} tone={pending.length ? 'warn' : ''} onClick={() => nav('/hr/leave?tab=all')} />
      <Stat label="Open HR requests" value={tickets.length} tone={tickets.length ? 'warn' : ''} onClick={() => nav('/hr/requests')} />
      <Stat label="Probation reviews due (30 days)" value={probation.length} tone={probation.length ? 'warn' : ''} onClick={() => nav('/hr/people')} />
      <Stat label="Onboarding open" value={onboarding.length} onClick={() => nav('/hr/people')} />
      <Stat label="Acknowledgements missing" value={ackGap} sub={`${ackDocs.length} documents need one`} onClick={() => nav('/kb/acks')} />
      <Stat label="Goal sheets this cycle" value={(db.kras || []).filter((k) => k.cycle === cfg.cycle).length + ' / ' + staff.length} onClick={() => nav('/hr/kra')} />
    </Grid>
    <div className="grid g2">
      <Card title="Probation and confirmations">{probation.length ? probation.map(({ u, p }) => <div key={u.id} className="hrm-line"><Link to={'/hr/people/' + u.id}>{u.name}</Link><span className="small">ends {d(p.probationEnd)}</span></div>) : <p className="small muted">None in the next 30 days.</p>}</Card>
      <Card title="Exits in progress">{exits.length ? exits.map(({ u, p }) => <div key={u.id} className="hrm-line"><Link to={'/hr/people/' + u.id}>{u.name}</Link><span className="small">last day {d(p.lastDay)} · {(cfg.exit || []).filter((x) => p.exit?.[x]).length}/{(cfg.exit || []).length}</span></div>) : <p className="small muted">None.</p>}</Card>
      <Card title="Upcoming holidays">{holidays.filter((h) => h.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((h) => <div key={h.id} className="hrm-line"><span>{h.name}</span><span className="small muted">{d(h.date)}</span></div>)}</Card>
      <Card title="Work anniversaries this month">{profs.filter(({ p }) => p?.doj && p.doj.slice(5, 7) === t.slice(5, 7) && p.doj.slice(0, 4) < t.slice(0, 4)).map(({ u, p }) => <div key={u.id} className="hrm-line"><span>{u.name}</span><span className="small muted">{Number(t.slice(0, 4)) - Number(p.doj.slice(0, 4))} years on {d(t.slice(0, 4) + p.doj.slice(4))}</span></div>)}</Card>
    </div>
  </Page>
}

export function People() {
  const { db, cfg, staff, canSeePay } = useHr()
  const nav = useNavigate()
  return <Page title="People" subtitle="HR profiles: position, grade, joining, probation, onboarding and exit. Access roles are set by admins under Users and access." back="/hr/desk" backLabel="HR desk">
    <div className="dt-wrap"><table className="table"><thead><tr><th>Name</th><th>Position</th><th>Grade</th><th>Department</th><th>Reports to</th><th>Joined</th><th>Probation</th><th>Onboarding</th><th>Status</th><th>Pay</th></tr></thead>
      <tbody>{staff.map((u) => { const p = profileOf(db, u) || {}; const ob = (cfg.onboarding || []).filter((x) => p.onboarding?.[x]).length
        return <tr key={u.id} className="click" onClick={() => nav('/hr/people/' + u.id)}><td><b>{u.name}</b>{p.toConfirm === 'Yes' && <div className="small warn-t">to confirm</div>}</td><td>{positionLabel(p.position)}</td><td>{p.grade || '–'}</td><td>{p.department || '–'}</td><td>{u.reportsTo || '–'}</td>
          <td className="small">{p.doj ? d(p.doj) : <span className="missing">Missing</span>}</td><td className="small">{p.confirmedOn ? 'Confirmed' : p.probationEnd ? 'to ' + d(p.probationEnd) : '–'}</td>
          <td className="small">{ob}/{(cfg.onboarding || []).length}</td><td><Badge tone={p.status === 'On notice' ? 'warn' : p.status === 'Exited' ? 'muted' : 'good'}>{p.status || 'Active'}</Badge></td><td className="small">{canSeePay(u) ? 'Visible' : <span className="muted">Restricted</span>}</td></tr> })}</tbody></table></div>
  </Page>
}

export function PersonHr() {
  const { userId } = useParams()
  const { db, user, cfg, upsert, notify, canSeePay, userById, hr } = useHr()
  const u = userById(userId)
  const p0 = profileOf(db, u) || { id: 'HP-' + userId, userId, name: u?.name, status: 'Active' }
  const [v, setV] = useState(null)
  const [tab, setTab] = useState('job')
  if (!u) return <Page title="Person" back="/hr/people"><Empty>Not found.</Empty></Page>
  const p = v || p0
  const set = (patch) => setV({ ...p, ...patch })
  const save = () => { const rec = { ...p, name: u.name }; if (rec.position && !rec.grade) rec.grade = POSITION[rec.position]?.grade; if (rec.doj && !rec.probationEnd) rec.probationEnd = ymd(new Date(new Date(rec.doj).setMonth(new Date(rec.doj).getMonth() + Number(cfg.probationMonths || 6))))
    delete rec.toConfirm; if (upsert('hrProfiles', rec, { action: 'profile saved' })) { setV(null); notify('Profile saved') } }
  const tick = (key, item) => set({ [key]: { ...(p[key] || {}), [item]: p[key]?.[item] ? '' : today() } })
  const T = (k, label, type = 'text') => <Field label={label}><Input type={type} value={p[k]} onChange={(e) => set({ [k]: e.target.value })} disabled={!hr} /></Field>
  const tabs = [{ value: 'job', label: 'Employment' }, { value: 'personal', label: 'Personal and bank' }, { value: 'onboarding', label: 'Onboarding' }, { value: 'exit', label: 'Exit' }, ...(canSeePay(u) ? [{ value: 'pay', label: 'Pay' }] : [])]
  return <Page title={u.name} subtitle={`${u.designation || ''} · Accord role: ${u.appRole}`} back="/hr/people" backLabel="People" actions={v && <Button variant="primary" onClick={save}>Save profile</Button>}>
    <Tabs tabs={tabs} value={tab} onChange={setTab} />
    {tab === 'job' && <Card><div className="form">
      <Field label="Position"><Select value={p.position} onChange={(e) => set({ position: e.target.value, grade: POSITION[e.target.value]?.grade || p.grade, department: p.department || POSITION[e.target.value]?.dept })} options={POSITIONS.map((x) => ({ value: x.id, label: x.label }))} /></Field>
      <Field label="Grade" hint="Decides which documents they open and whose pay HR sees"><Select value={p.grade} onChange={(e) => set({ grade: e.target.value })} options={(cfg.grades || []).map((g) => ({ value: g.id, label: `${g.id} · ${g.label}` }))} /></Field>
      {T('department', 'Department')}
      <Field label="Employment"><Select value={p.employment} onChange={(e) => set({ employment: e.target.value })} options={['Permanent', 'Probation', 'Fixed term', 'Consultant', 'Intern']} /></Field>
      {T('doj', 'Date of joining', 'date')}{T('probationEnd', 'Probation ends', 'date')}{T('confirmedOn', 'Confirmed on', 'date')}
      <Field label="Status"><Select value={p.status} onChange={(e) => set({ status: e.target.value })} options={['Active', 'On notice', 'Exited']} /></Field>
      {T('resignedOn', 'Resigned on', 'date')}{T('lastDay', 'Last working day', 'date')}{T('empCode', 'Employee code')}{T('workLocation', 'Work location')}
    </div><p className="small muted">Notice period for {p.grade || 'this grade'}: {cfg.noticeDays?.[p.grade] || 30} days after confirmation. Probation: {cfg.probationMonths} months.</p></Card>}
    {tab === 'personal' && <Card><div className="form">{['personalPhone', 'personalEmail', 'address', 'dob', 'bloodGroup', 'emergencyName', 'emergencyRelation', 'emergencyPhone', 'pan', 'aadhaar4', 'uan', 'esic', 'bankName', 'bankAccount', 'ifsc'].map((k) =>
      <Field key={k} label={{ personalPhone: 'Personal phone', personalEmail: 'Personal e-mail', address: 'Address', dob: 'Date of birth', bloodGroup: 'Blood group', emergencyName: 'Emergency contact', emergencyRelation: 'Relation', emergencyPhone: 'Emergency phone', pan: 'PAN', aadhaar4: 'Aadhaar (last 4 only)', uan: 'PF UAN', esic: 'ESIC no.', bankName: 'Bank', bankAccount: 'Salary account no.', ifsc: 'IFSC' }[k]}>
        <Input type={k === 'dob' ? 'date' : 'text'} value={p[k]} maxLength={k === 'aadhaar4' ? 4 : undefined} onChange={(e) => set({ [k]: e.target.value })} /></Field>)}</div></Card>}
    {tab === 'onboarding' && <Card title="Onboarding checklist">{(cfg.onboarding || []).map((x) => <div key={x} className="hrm-line"><Check checked={!!p.onboarding?.[x]} onChange={() => tick('onboarding', x)} label={x} /><span className="small muted">{p.onboarding?.[x] ? d(p.onboarding[x]) : ''}</span></div>)}</Card>}
    {tab === 'exit' && <Card title="Exit checklist" actions={p.status !== 'On notice' && p.status !== 'Exited' && <Button size="sm" onClick={() => set({ status: 'On notice', resignedOn: p.resignedOn || today() })}>Start exit</Button>}>
      {p.status === 'Active' ? <p className="small muted">Start the exit when a resignation is accepted. Reassign their leads and clients in Accord before the last day (Leads › owner).</p>
        : (cfg.exit || []).map((x) => <div key={x} className="hrm-line"><Check checked={!!p.exit?.[x]} onChange={() => tick('exit', x)} label={x} /><span className="small muted">{p.exit?.[x] ? d(p.exit[x]) : ''}</span></div>)}
      {p.lastDay && <p className="small">Full and final due by <b>{d(addDays(p.lastDay, 2))}</b> (two working days; check for a Sunday or holiday).</p>}
      {p.status === 'On notice' && <OpenWork name={u.name} />}</Card>}
    {tab === 'pay' && <PayTab u={u} />}
  </Page>
}
function OpenWork({ name }) {
  const { db } = useHr()
  const leads = db.leads.filter((l) => l.owner === name && !['Lost', 'Booked', 'Dormant'].includes(l.stage)).length
  const clients = db.clients.filter((c) => c.owner === name && !c.directoryOnly).length
  const fups = db.interactions.filter((i) => i.status === 'Open' && (i.nextOwners || [i.nextOwner || i.by]).includes(name)).length
  const tasks = db.tasks.filter((t) => t.owner === name && t.status !== 'Done').length
  return <p className="small"><b>Still with {name}:</b> {leads} active leads · {clients} clients · {fups} open follow-ups · {tasks} tasks. Reassign before the last day.</p>
}
function PayTab({ u }) {
  const { db, upsert, notify, hr } = useHr()
  const list = (db.hrComp || []).filter((c) => c.userId === u.id).sort((a, b) => String(b.effective).localeCompare(a.effective))
  const [v, setV] = useState({ effective: today(), gross: '', basic: '', hra: '', special: '', employerPf: '', variable: '', note: '' })
  const add = () => { if (!v.gross) return notify('Enter the monthly gross', 'bad'); if (Number(v.basic || 0) < Number(v.gross) * 0.5) notify('Basic is under 50% of gross: check against the Code on Wages definition of wages', 'warn')
    upsert('hrComp', { id: 'PAY-' + u.id + '-' + v.effective, userId: u.id, name: u.name, ...v }, { action: 'pay revised' }); setV({ ...v, note: '' }) }
  return <Card title="Pay history (monthly, Rs)">
    {list.length ? <table className="table"><thead><tr><th>From</th><th className="right">Gross</th><th className="right">Basic + DA</th><th className="right">HRA</th><th className="right">Special</th><th className="right">Employer PF</th><th className="right">Variable (yearly)</th><th>Note</th></tr></thead>
      <tbody>{list.map((c) => <tr key={c.id}><td>{d(c.effective)}</td><td className="right">{inr(c.gross)}</td><td className="right">{inr(c.basic)}</td><td className="right">{inr(c.hra)}</td><td className="right">{inr(c.special)}</td><td className="right">{inr(c.employerPf)}</td><td className="right">{inr(c.variable)}</td><td className="small">{c.note}</td></tr>)}</tbody></table> : <Empty>No pay recorded.</Empty>}
    {hr && <><div className="sec-h" style={{ marginTop: 12 }}>Add a revision</div><div className="form">{['effective', 'gross', 'basic', 'hra', 'special', 'employerPf', 'variable', 'note'].map((k) => <Field key={k} label={{ effective: 'Effective from', gross: 'Monthly gross', basic: 'Basic + DA', hra: 'HRA', special: 'Special allowance', employerPf: 'Employer PF', variable: 'Variable pay (yearly)', note: 'Note' }[k]}>
      <Input type={k === 'effective' ? 'date' : k === 'note' ? 'text' : 'number'} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}</div><Button variant="primary" onClick={add}>Add revision</Button></>}
  </Card>
}

// Attendance and leave register for payroll: worked days from punch-ins, leave by type, holidays, late marks, LOP
export function Register() {
  const { db, cfg, staff, holidays } = useHr()
  const [month, setMonth] = useState(addDays(today().slice(0, 7) + '-01', -1).slice(0, 7))
  const days = monthDays(month)
  const t = today()
  const hol = new Set(holidays.filter((h) => h.type !== 'Optional').map((h) => h.date))
  const rows = staff.map((u) => {
    const fri = /fri/i.test(u.workDays || '')
    const work = days.filter((x) => { const wd = new Date(x).getDay(); return wd !== 0 && !(fri && wd === 6) && !hol.has(x) })
    const att = (db.attendance || []).filter((a) => a.userId === u.id && a.date?.startsWith(month))
    const present = new Set(att.filter((a) => a.in).map((a) => a.date))
    const late = att.filter((a) => a.status === 'Late').length
    const lv = {}; let leaveDaysN = 0
    work.forEach((x) => { const l = leaveOn((db.leaves || []).filter((y) => y.status === 'Approved'), u.id, x); if (l) { const n = l.half ? 0.5 : 1; lv[l.type] = (lv[l.type] || 0) + n; leaveDaysN += n } })
    const absent = work.filter((x) => x < t && !present.has(x) && !leaveOn((db.leaves || []).filter((y) => y.status === 'Approved'), u.id, x)).length
    const lop = (lv.LOP || 0) + absent + Math.floor(late / 3) * 0.5
    return { u, work: work.length, present: present.size, late, lv, leaveDaysN, hol: days.filter((x) => hol.has(x)).length, absent, lop }
  })
  const types = (cfg.leaveTypes || []).map((x) => x.id)
  const exp = () => download(`Attendance_${month}.csv`, csv([['Name', 'Working days', 'Present', 'Late marks', ...types, 'Holidays', 'Unexplained absence', 'LOP days'], ...rows.map((r) => [r.u.name, r.work, r.present, r.late, ...types.map((x) => r.lv[x] || 0), r.hol, r.absent, r.lop])]))
  return <Page title="Attendance and leave register" subtitle="For payroll: punch-ins from the time tracker, approved leave by type, holidays and late marks. Unexplained absence and every third late mark (half a day) count as loss of pay." back="/hr/desk" backLabel="HR desk"
    actions={<><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><Button onClick={exp}>Download CSV</Button></>}>
    <div className="dt-wrap"><table className="table"><thead><tr><th>Name</th><th className="right">Working days</th><th className="right">Present</th><th className="right">Late</th>{types.map((x) => <th key={x} className="right">{x}</th>)}<th className="right">Holidays</th><th className="right">Unexplained</th><th className="right">LOP</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.u.id}><td><b>{r.u.name}</b></td><td className="right">{r.work}</td><td className="right">{r.present}</td><td className="right">{r.late || ''}</td>{types.map((x) => <td key={x} className="right">{r.lv[x] || ''}</td>)}<td className="right">{r.hol}</td><td className={'right ' + (r.absent ? 'warn-t' : '')}>{r.absent || ''}</td><td className="right"><b>{r.lop || ''}</b></td></tr>)}</tbody></table></div>
    <p className="small muted">Check unexplained absences with the person before payroll: a missed punch-in is corrected through an HR request, not here.</p>
  </Page>
}

// ───────────────────────────── Assets
export function Assets() {
  const { db, staff, upsert, nextId, notify, hr, user } = useHr()
  const [edit, setEdit] = useState(null)
  const list = (db.assets || []).filter((a) => hr || a.issuedToId === user.id)
  const save = () => { const u = staff.find((x) => x.id === edit.issuedToId); upsert('assets', { ...edit, id: edit.id || nextId('assets', 'AS-', 3), issuedTo: u?.name || '', status: edit.status || (u ? 'Issued' : 'In store') }); notify('Asset saved'); setEdit(null) }
  return <Page title="Assets" subtitle="Laptops, phones, SIMs, ID cards and keys, and who has them. Checked on the exit checklist." actions={hr && <Button variant="primary" onClick={() => setEdit({ type: 'Laptop', issuedOn: today() })}>Add asset</Button>}>
    {list.length ? <div className="dt-wrap"><table className="table"><thead><tr><th>Tag</th><th>Type</th><th>Description</th><th>Serial</th><th>With</th><th>Issued</th><th>Returned</th><th>Condition</th><th>Status</th></tr></thead>
      <tbody>{list.map((a) => <tr key={a.id} className={hr ? 'click' : ''} onClick={() => hr && setEdit(a)}><td className="mono">{a.tag}</td><td>{a.type}</td><td>{a.description}</td><td className="mono small">{a.serial}</td><td>{a.issuedTo || '–'}</td><td className="small">{d(a.issuedOn)}</td><td className="small">{d(a.returnedOn)}</td><td className="small">{a.condition}</td><td><Badge>{a.status}</Badge></td></tr>)}</tbody></table></div> : <Empty>No assets recorded.</Empty>}
    {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? 'Asset ' + edit.id : 'New asset'} footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="form">
        <Field label="Asset tag"><Input value={edit.tag} onChange={(e) => setEdit({ ...edit, tag: e.target.value })} /></Field>
        <Field label="Type"><Select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} options={ASSET_TYPES} /></Field>
        <Field label="Description" span="all"><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
        <Field label="Serial / IMEI / number"><Input value={edit.serial} onChange={(e) => setEdit({ ...edit, serial: e.target.value })} /></Field>
        <Field label="Issued to"><Select value={edit.issuedToId} onChange={(e) => setEdit({ ...edit, issuedToId: e.target.value })} options={staff.map((u) => ({ value: u.id, label: u.name }))} placeholder="In store" /></Field>
        <Field label="Issued on"><Input type="date" value={edit.issuedOn} onChange={(e) => setEdit({ ...edit, issuedOn: e.target.value })} /></Field>
        <Field label="Returned on"><Input type="date" value={edit.returnedOn} onChange={(e) => setEdit({ ...edit, returnedOn: e.target.value, status: e.target.value ? 'Returned' : edit.status })} /></Field>
        <Field label="Condition"><Select value={edit.condition} onChange={(e) => setEdit({ ...edit, condition: e.target.value })} options={['New', 'Good', 'Fair', 'Damaged']} /></Field>
        <Field label="Status"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} options={['Issued', 'In store', 'Returned', 'Lost', 'Retired']} /></Field>
      </div></Modal>}
  </Page>
}

// ───────────────────────────── Holidays
export function Holidays() {
  const { holidays, upsert, remove, notify, desk } = useHr()
  const [year, setYear] = useState(String(new Date().getFullYear() + (new Date().getMonth() === 11 ? 1 : 0)))
  const [v, setV] = useState({ date: '', name: '', type: 'Festival' })
  const list = holidays.filter((h) => String(h.date).startsWith(year)).sort((a, b) => a.date.localeCompare(b.date))
  const years = [...new Set([...holidays.map((h) => String(h.date).slice(0, 4)), String(new Date().getFullYear()), String(new Date().getFullYear() + 1)])].sort()
  const add = () => { if (!v.date || !v.name) return notify('Date and name', 'bad'); upsert('holidays', { ...v, id: 'HOL-' + v.date }); setV({ date: '', name: '', type: 'Festival' }) }
  return <Page title={`Holidays ${year}`} subtitle="National and festival holidays (Karnataka Industrial Establishments (National and Festival Holidays) Act) plus optional holidays. Leave does not count these days."
    actions={<Select value={year} onChange={(e) => setYear(e.target.value)} options={years} placeholder="Year" />}>
    {list.length ? <table className="table"><thead><tr><th>Date</th><th>Day</th><th>Holiday</th><th>Type</th>{desk && <th />}</tr></thead>
      <tbody>{list.map((h) => <tr key={h.id}><td>{d(h.date)}</td><td>{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td><td><b>{h.name}</b></td><td><Badge tone={h.type === 'National' ? 'accent' : h.type === 'Optional' ? 'muted' : 'info'}>{h.type}</Badge></td>
        {desk && <td className="right"><Confirm size="sm" label="Remove?" onConfirm={() => remove('holidays', h.id)}>Remove</Confirm></td>}</tr>)}</tbody></table> : <Empty>No holidays published for {year}.</Empty>}
    {desk && <Card title="Add a holiday"><div className="form"><Field label="Date"><Input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
      <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Type"><Select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })} options={['National', 'Festival', 'Optional', 'Company']} /></Field></div><Button variant="primary" onClick={add}>Add</Button>
      <p className="small muted">Festival dates for the coming year come from the state's notified list (usually published in December). Optional holidays are not deducted from leave automatically.</p></Card>}
  </Page>
}

// ───────────────────────────── HR requests
export function TicketForm({ open, onClose }) {
  const { user, cfg, upsert, nextId, notify, pushNote } = useHr()
  const [v, setV] = useState({ category: TICKET_CATS[0], subject: '', details: '' })
  if (!open) return null
  const posh = v.category === POSH
  const save = () => { if (!v.subject.trim()) return notify('Add a subject', 'bad')
    const rec = { id: nextId('hrTickets', 'HRQ-'), ...v, by: user.name, userId: user.id, at: new Date().toISOString(), status: 'Open', thread: [] }
    if (upsert('hrTickets', rec, { action: 'request raised' })) { (posh ? cfg.icMembers || [] : [cfg.hrName]).filter(Boolean).forEach((n) => pushNote(n, { kind: 'hr', title: posh ? 'Confidential complaint received' : `HR request from ${user.name}`, body: posh ? 'Open Accord People › Requests' : v.subject, link: '#/hr/requests' })); notify('Request sent'); setV({ category: TICKET_CATS[0], subject: '', details: '' }); onClose() } }
  return <Modal open onClose={onClose} title="New HR request" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Send</Button></>}>
    <div className="form"><Field label="About" span="all"><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={TICKET_CATS} /></Field>
      <Field label="Subject" span="all"><Input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>
      <Field label="Details" span="all"><Textarea rows={5} value={v.details} onChange={(e) => setV({ ...v, details: e.target.value })} /></Field></div>
    {posh ? <p className="small warn-t">Seen only by the Internal Committee{cfg.icMembers?.length ? ` (${cfg.icMembers.join(', ')})` : ''}, not by HR or management. {cfg.icMembers?.length ? '' : 'The committee is not yet named in HR settings: speak to any senior woman colleague or the MD directly meanwhile.'}</p>
      : <p className="small muted">Goes to HR ({cfg.hrName}). Grievances are acknowledged in 2 working days and answered in 15 (HR-08).</p>}
  </Modal>
}
export function Requests() {
  const { db, user, hr, cfg, upsert, notify, pushNote } = useHr()
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(null)
  const [msg, setMsg] = useState('')
  const ic = (cfg.icMembers || []).includes(user.name)
  const list = (db.hrTickets || []).filter((t) => t.category === POSH ? (t.by === user.name || ic) : (hr || t.by === user.name)).sort((a, b) => String(b.at).localeCompare(a.at))
  const t = sel && list.find((x) => x.id === sel)
  const handler = t && (t.category === POSH ? ic : hr)
  const reply = (status) => { const rec = { ...t, status: status || t.status, owner: t.owner || (handler ? user.name : ''), thread: [...(t.thread || []), ...(msg.trim() ? [{ at: new Date().toISOString(), by: user.name, text: msg.trim() }] : [])] }
    upsert('hrTickets', rec, { action: status ? 'request ' + status.toLowerCase() : 'request reply' }); if (handler && t.by !== user.name) pushNote(t.by, { kind: 'hr', title: 'Reply on your HR request', body: t.subject, link: '#/hr/requests' }); setMsg(''); notify('Saved') }
  return <Page title="HR requests" subtitle="Corrections, letters, reimbursements, access, grievances and confidential POSH complaints." actions={<Button variant="primary" onClick={() => setOpen(true)}>New request</Button>}>
    <div className="grid g2">
      <Card pad={false}>{list.length ? <table className="table"><thead><tr><th>ID</th><th>About</th><th>Subject</th><th>From</th><th>Status</th></tr></thead>
        <tbody>{list.map((x) => <tr key={x.id} className={'click ' + (x.id === sel ? 'on' : '')} onClick={() => setSel(x.id)}><td className="mono small">{x.id}</td><td className="small">{x.category}</td><td>{x.subject}</td><td>{x.by}</td><td><Badge>{x.status}</Badge></td></tr>)}</tbody></table> : <Empty>No requests.</Empty>}</Card>
      {t ? <Card title={t.subject} actions={<Badge>{t.status}</Badge>}>
        <p className="small muted">{t.category} · {t.by} · {d(String(t.at).slice(0, 10))}{t.owner ? ' · with ' + t.owner : ''}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{t.details}</p>
        {(t.thread || []).map((m, i) => <div key={i} className="hrm-msg"><b>{m.by}</b> <span className="small muted">{new Date(m.at).toLocaleString('en-IN')}</span><div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div></div>)}
        {t.status !== 'Closed' && <><Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a reply" /><div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Button onClick={() => reply()}>Send reply</Button>{handler && t.status === 'Open' && <Button onClick={() => reply('In progress')}>Mark in progress</Button>}
          {handler && <Button variant="primary" onClick={() => reply('Resolved')}>Resolve</Button>}{t.by === user.name && <Button onClick={() => reply('Closed')}>Close</Button>}</div></>}
      </Card> : <Card><p className="small muted">Pick a request to read and reply.</p></Card>}
    </div>
    <TicketForm open={open} onClose={() => setOpen(false)} />
  </Page>
}

// ───────────────────────────── HR settings
export function HrSettings() {
  const { cfg, upsert, notify, staff } = useHr()
  const [v, setV] = useState(cfg)
  const setLt = (i, patch) => setV({ ...v, leaveTypes: v.leaveTypes.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const save = () => { upsert('hrConfig', { ...v, id: 'main' }, { action: 'HR settings saved' }); notify('HR settings saved') }
  return <Page title="HR settings" subtitle="Grades, the pay-visibility line, leave policy, probation and notice, the Internal Committee, review cycles and checklists." back="/hr/desk" backLabel="HR desk" actions={<Button variant="primary" onClick={save}>Save settings</Button>}>
    <div className="grid g2">
      <Card title="Grades">{v.grades.map((g, i) => <div key={g.id} className="form"><Field label={g.id}><Input value={g.label} onChange={(e) => setV({ ...v, grades: v.grades.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></Field>
        <Field label="Notice (days, confirmed)"><Input type="number" value={v.noticeDays?.[g.id]} onChange={(e) => setV({ ...v, noticeDays: { ...v.noticeDays, [g.id]: e.target.value } })} /></Field></div>)}
        <Field label="HR sees pay only for grades below" hint="Pay at this grade and above is seen by admins alone"><Select value={v.compBelow} onChange={(e) => setV({ ...v, compBelow: e.target.value })} options={v.grades.map((g) => g.id)} /></Field></Card>
      <Card title="People and cycles"><div className="form">
        <Field label="HR contact (gets requests and long-leave notices)"><Select value={v.hrName} onChange={(e) => setV({ ...v, hrName: e.target.value })} options={staff.map((u) => u.name)} /></Field>
        <Field label="Probation (months)"><Input type="number" value={v.probationMonths} onChange={(e) => setV({ ...v, probationMonths: e.target.value })} /></Field>
        <Field label="Leave longer than this also goes to HR (days)"><Input type="number" value={v.longLeaveDays} onChange={(e) => setV({ ...v, longLeaveDays: e.target.value })} /></Field>
        <Field label="Current review cycle"><Input value={v.cycle} onChange={(e) => setV({ ...v, cycle: e.target.value })} /></Field>
        <Field label="Cycles (one per line)" span="all"><Textarea value={(v.cycles || []).join('\n')} onChange={(e) => setV({ ...v, cycles: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} /></Field></div>
        <div className="sec-h">Internal Committee (POSH)</div><Chips options={staff.map((u) => u.name)} value={v.icMembers || []} onChange={(x) => setV({ ...v, icMembers: x })} />
        <p className="small muted">Presiding officer: a senior woman employee; at least half women; one external member (add them as a user with no access if they need to read complaints in Accord).</p></Card>
    </div>
    <Card title="Leave types" pad={false}><table className="table"><thead><tr><th>Code</th><th>Name</th><th className="right">Days a year</th><th>Credited</th><th className="right">Carry forward</th><th className="right">Notice (days)</th><th>Basis</th></tr></thead>
      <tbody>{v.leaveTypes.map((t, i) => <tr key={t.id}><td className="mono">{t.id}</td><td><Input value={t.label} onChange={(e) => setLt(i, { label: e.target.value })} /></td><td><Input type="number" value={t.perYear} onChange={(e) => setLt(i, { perYear: Number(e.target.value) })} /></td>
        <td className="small">{t.accrual}</td><td><Input type="number" value={t.carry} onChange={(e) => setLt(i, { carry: Number(e.target.value) })} /></td><td><Input type="number" value={t.minNotice} onChange={(e) => setLt(i, { minNotice: Number(e.target.value) })} /></td><td className="small muted" style={{ maxWidth: 340 }}>{t.statutory}</td></tr>)}</tbody></table></Card>
    <div className="grid g2">
      <Card title="Onboarding checklist (one per line)"><Textarea rows={12} value={(v.onboarding || []).join('\n')} onChange={(e) => setV({ ...v, onboarding: e.target.value.split('\n').filter((x) => x.trim()) })} /></Card>
      <Card title="Exit checklist (one per line)"><Textarea rows={12} value={(v.exit || []).join('\n')} onChange={(e) => setV({ ...v, exit: e.target.value.split('\n').filter((x) => x.trim()) })} /></Card>
    </div>
  </Page>
}
