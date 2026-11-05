import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ROLES } from '../../lib/perms.js'
import { useStore } from '../../lib/store.jsx'
import { attendanceSummary } from '../../lib/calc.js'
import { seesAll, canAssignTasks } from '../../lib/perms.js'
import { daySums } from '../../lib/store.jsx'
import { Page, Card, Button, Badge, Grid, Stat, Seg, Modal, Bar, Confirm } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm from '../../components/RecordForm.jsx'
import { d, today, addDays, nowTime } from '../../lib/format.js'
import { Avatar } from '../../components/Layout.jsx'

const hm = (m) => (m > 0 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : '–')
const monthStart = () => today().slice(0, 8) + '01'
const team = (db) => db.users.filter((u) => u.appRole !== 'none' && u.active !== 'No')

const STATE = { office: 'In office', break: 'On break', site: 'Site visit', remote: 'Remote', out: 'Punched out' }
const EV = { in: 'Punched in', out: 'Punched out', break: 'Break', resume: 'Back from break', site: 'Site visit', office: 'In office', remote: 'Remote' }
const COL = { office: 'var(--good)', break: 'var(--warn)', site: 'var(--info)', remote: 'var(--purple)' }
// A day's timeline from 08:00 to 21:00, one bar per state.
function DayBar({ a }) {
  if (!a?.events?.length) return <div className="hbar"><span style={{ flex: 1, background: 'var(--bg4)' }} /></div>
  const day = a.date, t0 = new Date(day + 'T08:00:00').getTime(), t1 = new Date(day + 'T21:00:00').getTime(), span = t1 - t0
  const segs = []; let st = null, since = null
  const push = (to) => { if (st && since) segs.push({ st, from: Math.max(since, t0), to: Math.min(to, t1) }) }
  a.events.forEach((e) => { const t = new Date(e.t).getTime(); push(t); since = t; st = e.type === 'in' || e.type === 'resume' ? (a.mode === 'remote' ? 'remote' : a.mode === 'site' ? 'site' : 'office') : e.type === 'out' ? null : e.type })
  if (!a.out) push(Math.min(Date.now(), t1))
  return <div style={{ position: 'relative', height: 10, background: 'var(--bg4)' }} title="08:00 to 21:00">
    {segs.filter((x) => x.to > x.from).map((x, i) => <span key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: ((x.from - t0) / span * 100) + '%', width: ((x.to - x.from) / span * 100) + '%', background: COL[x.st] || 'var(--good)' }} />)}
  </div>
}

export function TimeTracker() {
  const { db, user, upsert, nextId } = useStore()
  const admin = seesAll(user)
  const [who, setWho] = useState(admin ? '' : user.name)
  const [from, setFrom] = useState(monthStart())
  const [edit, setEdit] = useState(null)
  const [day, setDay] = useState(null)
  const t = today()
  const rows = useMemo(() => db.attendance.filter((a) => (!who || a.name === who) && a.date >= from).map((a) => ({ ...a, minutes: a.out ? a.workMin ?? attendanceSummary([a])[0].minutes : daySums(a.events || []).work })), [db.attendance, who, from])
  const todayRows = (admin ? team(db) : team(db).filter((u) => u.id === user.id)).map((u) => ({ u, a: db.attendance.find((a) => a.userId === u.id && a.date === t) }))
  const total = rows.reduce((s, r) => s + (r.minutes || 0), 0)
  const days = new Set(rows.map((r) => r.date + r.name)).size
  return (
    <Page title="Time" back="/" backLabel="Dashboard" subtitle={admin ? 'Who is in, on a break, on site or remote, and the full time log. Every punch is stamped and kept in the central log.' : 'Your days: punch in, breaks, site visits and punch out, as recorded in the central log.'}
      actions={admin && user.appRole === 'admin' && <Button onClick={() => setEdit({ date: t, status: 'Present', in: '09:30', out: '18:30' })}>Correct an entry</Button>}>
      <Card title={`Today · ${d(t)}`} pad={false} actions={<div className="legend">{Object.entries(COL).map(([k, c]) => <span key={k}><i style={{ background: c }} />{STATE[k]}</span>)}</div>}>
        <table className="table"><thead><tr><th>Person</th><th>Shift</th><th>In</th><th>Now</th><th style={{ width: '34%' }}>Day, 08:00 to 21:00</th><th className="right">Worked</th><th className="right">Breaks</th><th>Status</th></tr></thead>
          <tbody>{todayRows.map(({ u, a }) => { const s = a ? daySums(a.events || [], a.out ? a.updatedAt : undefined) : null
            return <tr key={u.id} className={a ? 'click' : ''} onClick={() => a && setDay(a)}><td><b>{u.name}</b><div className="small muted">{u.designation || u.role}</div></td><td className="small mono">{u.shiftStart || '09:30'}–{u.shiftEnd || '18:30'}</td>
              <td className="mono">{a?.in || '–'}</td><td>{a ? <Badge>{STATE[a.out ? 'out' : a.state] || 'In office'}</Badge> : <Badge tone="muted">Not in</Badge>}</td><td style={{ verticalAlign: 'middle' }}><DayBar a={a} /></td>
              <td className="right mono">{s ? hm(s.work) : '–'}</td><td className="right mono">{s ? hm(s.brk) : '–'}</td><td>{a ? <Badge>{a.status}</Badge> : ''}</td></tr> })}</tbody></table>
      </Card>
      <div className="row" style={{ marginBottom: 12 }}>
        {admin && <select className="input" style={{ width: 200 }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Person"><option value="">Everyone</option>{team(db).map((u) => <option key={u.id}>{u.name}</option>)}</select>}
        <span className="small muted">From</span><input type="date" className="input" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
        <span className="small"><b>{days}</b> days · <b>{hm(total)}</b> worked · avg <b>{hm(days ? Math.round(total / days) : 0)}</b>/day · late <b>{rows.filter((r) => r.status === 'Late').length}</b></span>
      </div>
      <DataTable rows={rows} initialSort={{ key: 'date', dir: 'desc' }} searchKeys={['name']} onRowClick={(r) => setDay(r)}
        columns={[{ key: 'date', label: 'Date', render: (r) => d(r.date) }, { key: 'name', label: 'Person' }, { key: 'in', label: 'In' }, { key: 'out', label: 'Out' }, { key: 'mode', label: 'Started as', render: (r) => STATE[r.mode] || r.mode },
          { key: 'minutes', label: 'Worked', render: (r) => hm(r.minutes) }, { key: 'breakMin', label: 'Breaks', render: (r) => { const b = (r.events || []).filter((e) => e.type === 'break'); return <span>{hm(r.breakMin)}{b.length ? <span className="small muted"> · {b.length}× {[...new Set(b.map((e) => e.note).filter(Boolean))].join(', ')}</span> : null}</span> } }, { key: 'siteMin', label: 'On site', render: (r) => hm(r.siteMin) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'where', label: 'Location check', render: (r) => r.where ? <span className={'small' + (/remote/i.test(r.where) && r.mode === 'remote' && !/chosen/.test(r.where) ? ' warn-t' : '')}>{r.where}</span> : <span className="small muted">–</span> }, { key: 'note', label: 'Note' }]} />
      <Modal open={!!day} onClose={() => setDay(null)} title={day ? `${day.name} · ${d(day.date)}` : ''} footer={<>{user.appRole === 'admin' && <Button onClick={() => { setEdit({ ...day }); setDay(null) }}>Correct</Button>}<Button onClick={() => setDay(null)}>Close</Button></>}>
        {day && <><DayBar a={day} /><div className="timeline" style={{ marginTop: 18 }}>{(day.events || []).map((e, i) => <div key={i} className="tl-item"><div className="tl-meta">{new Date(e.t).toTimeString().slice(0, 5)}</div><p>{EV[e.type] || e.type}{e.note ? ' · ' + e.note : ''}</p></div>)}
          {!(day.events || []).length && <p className="muted">Entered by hand: in {day.in}, out {day.out || '–'}.</p>}</div></>}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Correct a time entry" footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => { const u = db.users.find((x) => x.name === edit.name); upsert('attendance', { ...edit, userId: u?.id, id: edit.id || nextId('attendance', 'AT-', 5), note: (edit.note || '') + (edit.note?.includes('corrected') ? '' : ' (corrected by ' + user.name + ')') }, { action: 'attendance corrected' }); setEdit(null) }}>Save</Button></>}>
        {edit && <RecordForm cols={2} value={edit} onChange={setEdit} fields={[{ k: 'name', l: 'Person', t: 'select', o: team(db).map((u) => u.name) }, { k: 'date', l: 'Date', t: 'date' }, { k: 'in', l: 'In', t: 'time' }, { k: 'out', l: 'Out', t: 'time' },
          { k: 'status', l: 'Status', t: 'select', o: ['Present', 'Late', 'Half day', 'Leave', 'Absent', 'Work from site'] }, { k: 'note', l: 'Reason for the correction' }]} />}
      </Modal>
    </Page>
  )
}

// 30 Oct: the employee list carries timings, working days and whether remote work is allowed.
// 1 Nov: the team hierarchy as a flow diagram, drawn from "Reports to" in Users and access (the same chain escalations follow).
function OrgChart({ people }) {
  const names = new Set(people.map((u) => u.name))
  const kids = (n) => people.filter((u) => u.reportsTo === n && u.name !== n)
  const roots = people.filter((u) => !u.reportsTo || !names.has(u.reportsTo))
  const Node = ({ u, seen }) => { const k = kids(u.name).filter((x) => !seen.has(x.name)); const next = new Set([...seen, u.name])
    return <li><div className={'org-node r-' + u.appRole}>{u.photo && <Avatar u={u} size={34} />}<b>{u.name}</b><span>{u.designation || ROLES[u.appRole]}</span><em>{ROLES[u.appRole]}</em></div>
      {k.length > 0 && <ul>{k.map((x) => <Node key={x.id} u={x} seen={next} />)}</ul>}</li> }
  // 5 Nov: the chart is shrunk to fit the card, so nobody is cut off on the left or right. Where it would have to
  // shrink below 60% (a phone), it is shown as an indented list that always fits.
  const box = useRef(null), inner = useRef(null)
  const [fit, setFit] = useState({ s: 1, w: 0, h: 0, v: false })
  const fitRef = useRef(fit); fitRef.current = fit
  const measure = () => {
    const b = box.current, i = inner.current, f0 = fitRef.current; if (!b) return
    if (f0.v) { if (b.clientWidth / (f0.w || 1) >= 0.6) setFit({ s: 1, w: 0, h: 0, v: false }); return }
    if (!i) return
    const w = i.scrollWidth, h = i.scrollHeight, avail = b.clientWidth
    const s = w > avail ? avail / w : 1
    if (s < 0.6) return setFit({ s: 1, w, h: 0, v: true })   // too narrow (a phone): show it as an indented list instead
    setFit((f) => (Math.abs(f.s - s) < 0.005 && f.w === w && f.h === h ? f : { s, w, h, v: false }))
  }
  useLayoutEffect(measure)
  useEffect(() => { const ro = new ResizeObserver(measure); if (box.current) ro.observe(box.current); return () => ro.disconnect() }, []) // eslint-disable-line
  const tree = <ul>{roots.map((u) => <Node key={u.id} u={u} seen={new Set()} />)}</ul>
  if (fit.v) return <div className="org org-vertical" ref={box}>{tree}</div>
  return <div className="org" ref={box}>
    <div style={fit.w ? { width: fit.w * fit.s, height: fit.h * fit.s, margin: '0 auto' } : undefined}>
      <div className="org-inner" ref={inner} style={{ transform: `scale(${fit.s})` }}>{tree}</div>
    </div>
  </div>
}

export function Team() {
  const { db, raw, user } = useStore()
  const t = today()
  const people = (raw.users || db.users).filter((u) => u.appRole !== 'none' && u.active !== 'No' && u.team !== 'External')
  return (
    <Page title="Team" back="/" backLabel="Dashboard" subtitle="Who reports to whom, who does what, their shift and working days, and whether they can work remotely. Admins change these under Users and access.">
      <Card title="Team hierarchy" actions={<span className="small muted">From "Reports to" · missed follow-ups escalate up this chain</span>}><OrgChart people={people} /></Card>
      <DeptSummary people={people} />
      <div className="dt-wrap"><table className="table"><thead><tr><th>Name</th><th>Designation</th><th>Team</th><th>Department</th><th>Employment</th><th>Responsibilities</th><th>Shift</th><th>Days</th><th>Remote</th><th>Today</th>{user.appRole === 'admin' && <th>Contact</th>}</tr></thead>
        <tbody>{people.map((u) => { const a = raw.attendance.find((x) => x.userId === u.id && x.date === t)
          return <tr key={u.id}><td><b>{u.name}</b></td><td>{u.designation || '–'}</td><td>{u.team}</td><td>{u.department || '–'}</td><td className="small">{u.employment ? <Badge tone={u.employment === 'On roll' ? 'good' : 'muted'}>{u.employment}</Badge> : '–'}{u.company ? <div className="small muted">{u.company}</div> : null}</td><td className="small" style={{ maxWidth: 320 }}>{u.role}</td><td className="mono small">{u.shiftStart || '09:30'}–{u.shiftEnd || '18:30'}</td>
            <td className="small">{u.workDays || 'Mon-Sat'}</td><td><Badge tone={u.remoteAllowed === 'Yes' ? 'purple' : 'muted'}>{u.remoteAllowed === 'Yes' ? 'Allowed' : 'No'}</Badge></td>
            <td>{a ? <Badge>{STATE[a.out ? 'out' : a.state] || 'In office'}</Badge> : <span className="small muted">Not in</span>}</td>{user.appRole === 'admin' && <td className="small">{[u.phone, u.email].filter(Boolean).join(' · ') || <span className="missing">Missing</span>}</td>}</tr> })}</tbody></table></div>
    </Page>
  )
}

// 2 Nov: head count by department and by on roll / off roll / consultant
function DeptSummary({ people }) {
  const by = (k) => { const m = {}; people.forEach((u) => { const x = u[k] || 'Not set'; m[x] = (m[x] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }
  return <div className="grid g2">
    <Card title="By department">{by('department').map(([k, v]) => <div key={k} className="row" style={{ justifyContent: 'space-between', padding: '3px 0' }}><span>{k}</span><b>{v}</b></div>)}</Card>
    <Card title="On roll, off roll and consultants">{by('employment').map(([k, v]) => <div key={k} className="row" style={{ justifyContent: 'space-between', padding: '3px 0' }}><span>{k}</span><b>{v}</b></div>)}</Card>
  </div>
}

export function Performance() {
  const { db } = useStore()
  const [range, setRange] = useState(30)
  const from = addDays(today(), -range)
  const t = today()
  const rows = useMemo(() => team(db).map((u) => {
    const mine = db.interactions.filter((i) => i.by === u.name && i.date >= from)
    const due = db.interactions.filter((i) => (i.nextOwners?.length ? i.nextOwners : [i.nextOwner || i.by]).includes(u.name) && i.nextDate && i.nextDate >= from && i.nextDate <= t)
    const missed = due.filter((i) => i.status === 'Open')
    const att = db.attendance.filter((a) => a.name === u.name && a.date >= from).map((a) => ({ ...a, minutes: a.workMin ?? attendanceSummary([a])[0].minutes }))
    const visits = mine.filter((i) => ['Site visit', 'Office visit'].includes(i.mode)).length
    const bookings = db.clients.filter((c) => c.owner === u.name && c.bookingDate >= from).length
    const pay = mine.filter((i) => ['Payment committed', 'Payment received'].includes(i.outcome)).length
    const leads = db.leads.filter((l) => l.owner === u.name && !['Lost', 'Booked', 'Dormant'].includes(l.stage)).length
    const views = db.viewings.filter((v) => v.advisor === u.name && v.date >= from && v.status === 'Completed').length
    const tasksDone = db.tasks.filter((x) => x.owner === u.name && x.status === 'Done' && (x.doneOn || '') >= from).length
    const disc = due.length ? 1 - missed.length / due.length : 1
    const hours = att.reduce((s, a) => s + a.minutes, 0) / 60
    const score = Math.round(Math.min(100, mine.length * 1.2 + visits * 4 + views * 5 + bookings * 15 + pay * 3 + tasksDone * 2) * 0.6 + disc * 40)
    return { id: u.id, name: u.name, role: u.role || u.team, n: mine.length, visits, views, bookings, pay, leads, due: due.length, missed: missed.length, disc, hours, late: att.filter((a) => a.status === 'Late').length, days: att.length, tasksDone, score }
  }).sort((a, b) => b.score - a.score), [db, from, t])
  return (
    <Page title="Performance" back="/" backLabel="Dashboard" subtitle="Built from what each person logs: interactions, viewings, bookings, payment follow-ups, follow-up discipline, tasks and hours."
      actions={<Seg options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} value={range} onChange={setRange} />}>
      <Grid cols={4}>
        <Stat label="Interactions" value={rows.reduce((s, r) => s + r.n, 0)} sub={`last ${range} days`} tone="teal" />
        <Stat label="Visits and viewings" value={rows.reduce((s, r) => s + r.visits + r.views, 0)} tone="info" />
        <Stat label="Bookings" value={rows.reduce((s, r) => s + r.bookings, 0)} tone="accent" />
        <Stat label="Missed follow-ups" value={rows.reduce((s, r) => s + r.missed, 0)} tone="bad" />
      </Grid>
      <Card title="Leaderboard" pad={false}>
        <table className="table"><thead><tr><th>#</th><th>Person</th><th>Score</th><th className="right">Interactions</th><th className="right">Visits</th><th className="right">Viewings</th><th className="right">Bookings</th><th className="right">Payment follow-ups</th><th>Follow-up discipline</th><th className="right">Open leads</th><th className="right">Hours</th><th className="right">Late</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={r.id}><td>{i + 1}</td><td><b>{r.name}</b><div className="small muted">{r.role}</div></td><td style={{ minWidth: 110 }}><b>{r.score}</b><Bar value={r.score / 100} tone="teal" /></td>
            <td className="right">{r.n}</td><td className="right">{r.visits}</td><td className="right">{r.views}</td><td className="right">{r.bookings}</td><td className="right">{r.pay}</td>
            <td style={{ minWidth: 130 }}><span className="small">{r.due ? `${r.due - r.missed} of ${r.due} on time` : 'none due'}</span><Bar value={r.disc} tone={r.disc < 0.6 ? 'bad' : r.disc < 0.85 ? 'warn' : 'good'} /></td>
            <td className="right">{r.leads}</td><td className="right">{r.hours.toFixed(1)}</td><td className="right">{r.late}</td></tr>)}</tbody></table>
      </Card>
      <p className="small muted">Score: activity (interactions, visits, viewings, bookings, payment commitments, tasks), capped at 60, plus follow-up discipline worth 40. It rewards logging everything and closing follow-ups on time.</p>
    </Page>
  )
}

export function Tasks() {
  const { db, user, upsert, remove, nextId, pushNote } = useStore()
  const assign = canAssignTasks(user)
  const [edit, setEdit] = useState(null)
  const [view, setView] = useState('mine')
  const t = today()
  const rows = db.tasks
  const F = [{ k: 'title', l: 'Task', span: 'all' }, assign ? { k: 'owner', l: 'Owner', t: 'select', o: team(db).map((u) => u.name) } : { k: 'owner', l: 'Owner', auto: true }, { k: 'due', l: 'Due', t: 'date' }, { k: 'priority', l: 'Priority', t: 'select', o: ['High', 'Medium', 'Low'] },
    { k: 'module', l: 'Area', t: 'select', o: ['CRM', 'Pre-sales', 'Sourcing', 'Design', 'Vendors', 'Admin'] }, { k: 'link', l: 'Related ID (lead, client, vendor…)' }, { k: 'status', l: 'Status', t: 'select', o: ['Open', 'In progress', 'Done'] }, { k: 'notes', l: 'Notes', t: 'textarea', span: 'all' }]
  return (
    <Page title="Tasks" back="/" backLabel="Dashboard" subtitle={assign ? 'Assign work to anyone on the team: sales, finance, design. They are notified on the due date.' : 'Your tasks, and tasks Cyril or an admin assigned to you. You can add tasks for yourself.'} actions={<Button variant="primary" onClick={() => setEdit({ owner: user.name, by: user.name, priority: 'Medium', status: 'Open', due: addDays(t, 2), module: 'CRM' })}>{assign ? 'Assign a task' : 'Add a task'}</Button>}>
      <DataTable rows={rows} initialSort={{ key: 'due', dir: 'asc' }} searchKeys={['title', 'owner', 'link']} defaultView="mine"
        views={[{ value: 'mine', label: 'Mine, open', test: (x) => x.owner === user.name && x.status !== 'Done' }, { value: 'assigned', label: 'Assigned by me', test: (x) => x.by === user.name && x.owner !== user.name }, { value: 'done', label: 'Done', test: (x) => x.status === 'Done' }, { value: 'all', label: assign ? 'Everyone\'s tasks' : 'All mine' }]} filters={[{ key: 'owner', label: 'Owner' }, { key: 'module', label: 'Area' }, { key: 'priority', label: 'Priority' }]} onRowClick={(x) => setEdit({ ...x })}
        empty="No tasks here."
        columns={[{ key: 'done', label: '', sort: false, render: (x) => <input type="checkbox" checked={x.status === 'Done'} onClick={(e) => e.stopPropagation()} onChange={(e) => upsert('tasks', { ...x, status: e.target.checked ? 'Done' : 'Open', doneOn: e.target.checked ? t : '' }, { action: 'task ' + (e.target.checked ? 'done' : 'reopened') })} /> },
          { key: 'title', label: 'Task', render: (x) => <div><b>{x.title}</b>{x.link && <div className="small muted">{x.link}</div>}</div> }, { key: 'owner', label: 'Owner' }, { key: 'due', label: 'Due', render: (x) => <Badge tone={x.status === 'Done' ? 'muted' : x.due < t ? 'bad' : x.due === t ? 'warn' : 'info'}>{d(x.due)}</Badge> },
          { key: 'priority', label: 'Priority', render: (x) => <Badge>{x.priority}</Badge> }, { key: 'module', label: 'Area' }, { key: 'by', label: 'Assigned by' }, { key: 'status', label: 'Status', render: (x) => <Badge>{x.status}</Badge> }]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Task ' + edit.id : 'New task'} footer={<>{edit?.id && <Confirm label="Delete task?" onConfirm={() => { remove('tasks', edit.id); setEdit(null) }}>Delete</Confirm>}<Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => { if (!edit.title) return; const isNew = !edit.id; const r = upsert('tasks', { ...edit, id: edit.id || nextId('tasks', 'TK-', 4), doneOn: edit.status === 'Done' ? edit.doneOn || t : '' }, { isNew }); if (r && isNew && r.owner !== user.name) pushNote(r.owner, { kind: 'task', title: 'New task from ' + user.name, body: r.title, link: '#/people/tasks', dueAt: new Date().toISOString() }); setEdit(null) }}>Save</Button></>}>
        {edit && <RecordForm cols={2} fields={F} value={edit} onChange={setEdit} />}
      </Modal>
    </Page>
  )
}
