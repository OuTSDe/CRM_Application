import React, { useMemo } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useStore, daySums } from '../lib/store.jsx'
import { useCrm, BOOKED } from '../lib/calc.js'
import { canOpen, canWrite, seesMoney, seesAll } from '../lib/perms.js'
import { Card, Grid, Stat, Badge, Bar } from '../components/ui.jsx'
import { STATE_LABEL } from '../components/Layout.jsx'
import { sessionsFor, projectsFor } from '../lib/designLink.js'
import { escalationsFor } from '../lib/escalate.js'
import MiniCalendar from '../components/MiniCalendar.jsx'
import { d, today, cr, lakh, pct, hm12 } from '../lib/format.js'

const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const hm = (m) => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`

export default function Home() {
  const { ws } = useOutletContext() || {}
  if (ws === 'design') return <DesignHome />
  if (ws === 'vendors') return <VendorsHome />
  return <SalesHome />
}

function useFollowUps() {
  const { db, user } = useStore()
  const crm = useCrm()
  const t = today()
  return useMemo(() => {
    const owners = (i) => (i.nextOwners?.length ? i.nextOwners : [i.nextOwner || i.by])
    const list = db.interactions.filter((i) => i.status === 'Open' && i.nextDate && i.nextDate <= t && owners(i).includes(user.name)).sort((a, b) => a.nextDate.localeCompare(b.nextDate) || String(a.nextTime || '10:00').localeCompare(String(b.nextTime || '10:00')))
    const nameOf = (rid) => crm.clients.find((c) => c.clientId === rid)?.name || db.leads.find((l) => l.id === rid)?.name || rid
    const unitOf = (rid) => crm.clients.find((c) => c.clientId === rid)?.unit
    const linkOf = (rid) => (rid?.startsWith('YSC-C') ? '/crm/clients/' + (crm.clients.find((c) => c.clientId === rid)?.bookingId || rid) : '/crm/leads/' + rid)
    return list.map((i) => ({ ...i, who: nameOf(i.recordId), unit: unitOf(i.recordId), link: linkOf(i.recordId), shared: owners(i).filter((o) => o !== user.name) }))
  }, [db.interactions, db.leads, crm.clients, user, t])
}

function SalesHome() {
  const { db, raw, user, myDay } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const t = today()
  const money = seesMoney(user)
  const all = seesAll(user) || user.appRole === 'bank'
  const fups = useFollowUps()
  // Project-level figures come from the full sheet: sales value is shared with everyone (30 Oct), receivables are not.
  const proj = useMemo(() => { const c = crm.clients; const live = c.filter((x) => !['Cancelled', 'Transferred'].includes(x.status))
    return { live, value: live.reduce((s, x) => s + Number(x.tc || 0), 0), recv: live.reduce((s, x) => s + x.received, 0), out: live.reduce((s, x) => s + Math.max(0, x.outstanding), 0) } }, [crm.clients])
  const bookedCount = raw.clients.filter((c) => BOOKED.includes(c.status)).length
  const salesValue = raw.clients.filter((c) => !['Cancelled', 'Transferred'].includes(c.status)).reduce((s, c) => s + Number(c.tc || 0), 0)
  const mine = crm.clients.filter((c) => all ? true : c.mine)
  const myLive = mine.filter((c) => !['Cancelled', 'Transferred'].includes(c.status) && !c.directoryOnly)
  const health = { Red: 0, Amber: 0, Green: 0 }; myLive.forEach((c) => health[c.health]++)
  const openLeads = db.leads.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage))
  const warm = openLeads.filter((l) => ['Hot', 'Warm'].includes(l.temperature)).length
  // 2 Nov: open leads that nobody has a next follow-up date for
  const noFup = openLeads.filter((l) => !db.interactions.some((i) => i.recordId === l.id && i.status === 'Open' && i.nextDate)).length
  const due = myLive.filter((c) => (c.payState || c.age) && !['Paid up', 'Not yet due'].includes(c.payState || c.age)).slice(0, 8)
  const stages = useMemo(() => { const m = {}; openLeads.forEach((l) => (m[l.stage] = (m[l.stage] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]) }, [openLeads])
  const maxStage = Math.max(1, ...stages.map((x) => x[1]))
  const team = raw.users.filter((u) => u.active !== 'No' && u.appRole !== 'none' && u.team !== 'External')
  const sums = myDay ? daySums(myDay.events || []) : null
  const settings = raw.settings?.[0] || {}
  const esc = useMemo(() => escalationsFor({ ...db, users: raw.users }, user.name, settings), [db, raw.users, user.name, settings])
  const nameOf = (rid) => crm.clients.find((c) => c.clientId === rid)?.name || db.leads.find((l) => l.id === rid)?.name || rid
  const linkOf = (rid) => (rid?.startsWith('YSC-C') ? '/crm/clients/' + (crm.clients.find((c) => c.clientId === rid)?.bookingId || rid) : '/crm/leads/' + rid)
  const owners = (i) => (i.nextOwners?.length ? i.nextOwners : [i.nextOwner || i.by])
  const calItems = useMemo(() => [
    ...db.interactions.filter((i) => i.status === 'Open' && i.nextDate && owners(i).includes(user.name)).map((i) => ({ kind: 'followup', id: i.id, date: i.nextDate, title: (i.nextTime ? hm12(i.nextTime) + ' · ' : '') + nameOf(i.recordId) + ' · ' + (i.nextAction || 'follow up'), link: linkOf(i.recordId) })),
    ...db.viewings.filter((v) => v.status !== 'Cancelled' && (all || v.advisor === user.name)).map((v) => ({ kind: 'viewing', id: v.id, date: v.date, time: v.time, title: 'Private viewing · ' + v.name, link: '/presales/viewings/' + v.id })),
    ...db.tasks.filter((x) => x.owner === user.name && x.status !== 'Done' && x.due).map((x) => ({ kind: 'task', id: x.id, date: x.due, title: x.title, link: '/people/tasks' })),
  ], [db.interactions, db.viewings, db.tasks, user.name, all]) // eslint-disable-line
  const available = crm.units.length - raw.clients.filter((c) => BOOKED.includes(c.status) || ['To verify', 'Under cancellation'].includes(c.status)).length
  const viewingsToday = db.viewings.filter((v) => v.date === t && v.status !== 'Cancelled').length
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="label">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · {all ? 'Whole project' : 'Your clients and leads'}</div>
          <h1 className="greet" style={{ marginTop: 10 }}>{greet()}, <em>{fups.length ? `${fups.length} follow-up${fups.length > 1 ? 's' : ''}` : user.name}</em></h1>
          {sums && <p className="sub">{STATE_LABEL[myDay.out ? 'out' : myDay.state]} · {hm(sums.work)} worked today{sums.brk ? ` · ${hm(sums.brk)} on breaks` : ''}</p>}
        </div>
        <div className="actions">{canWrite(user, 'interactions') && <Link className="btn btn-primary" to="/crm/interactions?log=1">Log interaction</Link>}</div>
      </div>

      {money ? <>
        <Grid cols={3}>
          <Stat label="Flats booked" value={<>{bookedCount}<small> / {crm.units.length}</small></>} sub="live bookings" tone="accent" onClick={() => nav('/crm/clients')} />
          <Stat label="Booking value" value={<>₹{(proj.value / 1e7).toFixed(2)}<small> Cr</small></>} sub="total consideration, live" onClick={() => nav('/crm/clients')} />
          <Stat label="Collected" value={<>₹{(proj.recv / 1e7).toFixed(2)}<small> Cr</small></>} sub={pct(proj.value ? proj.recv / proj.value : 0) + ' of booking value'} tone="good" onClick={() => nav('/crm/payments')} />
          <Stat label="To collect, due now" value={<>₹{(proj.out / 1e7).toFixed(2)}<small> Cr</small></>} sub="against demands raised" tone="bad" onClick={() => nav('/crm/payments?tab=due')} />
          <Stat label="Open leads" value={openLeads.length} sub={`${warm} warm or hot · ${raw.leads.length} in all`} tone="info" onClick={() => nav('/crm/leads')} />
          <Stat label="Leads, no follow-up" value={noFup} sub="open, without a next date" tone={noFup ? 'warn' : 'good'} onClick={() => nav('/crm/leads?view=nofup')} />
          <Stat label="Follow-ups due" value={fups.length} sub="today or overdue, yours" tone={fups.length ? 'warn' : 'good'} onClick={() => nav('/crm/interactions?view=due')} />
        </Grid>
        <Card title="Collections against booking value" actions={<span className="small muted">{pct(proj.value ? proj.recv / proj.value : 0)} collected</span>}>
          <div className="hbar"><span style={{ flex: proj.recv, background: 'var(--good)' }} /><span style={{ flex: proj.out, background: 'var(--accent)' }} /><span style={{ flex: Math.max(0, proj.value - proj.recv - proj.out), background: 'var(--bg4)' }} /></div>
          <div className="legend" style={{ marginTop: 12 }}><span><i style={{ background: 'var(--good)' }} />Collected {lakh(proj.recv)}</span><span><i style={{ background: 'var(--accent)' }} />Demanded, not received {lakh(proj.out)}</span><span><i style={{ background: 'var(--bg4)' }} />Not yet demanded</span></div>
        </Card>
      </> : <Grid cols={5}>
        <Stat label="Live bookings" value={bookedCount} sub={`of ${crm.units.length} residences`} tone="accent" onClick={() => nav('/crm/inventory')} />
        <Stat label="Sales value" value={<>₹{(salesValue / 1e7).toFixed(1)}<small> Cr</small></>} sub="project, booked to date" />
        <Stat label="My open leads" value={openLeads.length} sub={`${warm} warm or hot`} tone="info" onClick={() => nav('/crm/leads')} />
        <Stat label="No follow-up set" value={noFup} sub="open leads without a next date" tone={noFup ? 'warn' : 'good'} onClick={() => nav('/crm/leads?view=nofup')} />
        <Stat label="My clients" value={myLive.length} sub={myLive.length ? `${health.Red + health.Amber} need care` : 'none assigned yet'} tone={health.Red ? 'bad' : 'teal'} onClick={() => nav('/crm/clients')} />
      </Grid>}

      <div className="split">
        <Card title="Follow-ups due" pad={false} actions={<Link className="small" to="/crm/interactions?view=due">All follow-ups</Link>}>
          {!fups.length ? <div className="empty">Nothing due. Follow-ups you or a colleague set for you land here on their date.</div>
            : fups.slice(0, 9).map((i) => <Link key={i.id} to={i.link} className="fup" style={{ color: 'inherit' }}>
              <span className={'t ' + (i.nextDate < t ? 'over' : 'today')}>{i.nextDate < t ? d(i.nextDate).slice(0, 6) : i.nextTime ? hm12(i.nextTime) : 'Today'}</span>
              <span style={{ minWidth: 0 }}><span>{i.who}</span> <span className="small muted">· {i.unit || i.recordId}</span><div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nextAction || i.purpose}</div></span>
              <span className="small muted">{i.shared.length ? 'with ' + i.shared.join(', ') : 'you'}</span></Link>)}
        </Card>
        <div>
          <Card title={all ? 'Client health' : 'My client health'}>
            <div className="hbar"><span style={{ flex: health.Green || 0.0001, background: 'var(--good)' }} /><span style={{ flex: health.Amber || 0.0001, background: 'var(--warn)' }} /><span style={{ flex: health.Red || 0.0001, background: 'var(--bad)' }} /></div>
            <div className="row between small" style={{ marginTop: 10 }}><span>{health.Green} good</span><span>{health.Amber} watch</span><span>{health.Red} at risk</span></div>
            {!myLive.length && <p className="small muted" style={{ marginBottom: 0 }}>No clients carry you as relationship owner yet. An admin assigns owners in Client 360.</p>}
          </Card>
          <Card title="Payments coming due" actions={!money && <span className="small muted">Names only</span>}>
            {!due.length ? <p className="muted" style={{ margin: 0 }}>Nothing pending with your clients.</p> : due.map((c) => <div key={c.id} className="check-row">
              <Link to={'/crm/clients/' + c.id}>{c.name} <span className="muted">· {c.unit}</span></Link><Badge>{c.payState || c.age}</Badge></div>)}
            {!money && due.length > 0 && <p className="small muted" style={{ marginBottom: 0 }}>So you know whom to call. Amounts stay with finance.</p>}
          </Card>
        </div>
      </div>

      <div className="grid g2" style={{ gap: 16 }}>
        <Card title="Calendar" actions={<span className="small muted"><Link to="/crm/inventory">{available} residences available</Link> · <Link to="/presales">{viewingsToday} viewing{viewingsToday === 1 ? '' : 's'} today</Link></span>}>
          <MiniCalendar items={calItems} />
        </Card>
        <Card title={esc.length ? `Escalated to you · ${esc.length}` : 'Escalations'} pad={false}>
          {!esc.length ? <div className="empty">Nothing escalated. A follow-up someone in your team leaves open for {settings.escalateDays || 2} working days comes here, then goes one level up.</div>
            : esc.slice(0, 10).map((i) => <Link key={i.id + i.owner} to={linkOf(i.recordId)} className="fup" style={{ color: 'inherit' }}>
              <span className="t over">{i.late}d</span>
              <span style={{ minWidth: 0 }}><span>{nameOf(i.recordId)}</span><div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nextAction || i.purpose || 'Follow up'} · due {d(i.nextDate)}</div></span>
              <span className="small muted">{i.owner}{i.level > 1 ? ' · level ' + i.level : ''}</span></Link>)}
        </Card>
      </div>

      <div className="grid g2" style={{ gap: 16 }}>
        <Card title="Lead pipeline">
          {!stages.length ? <p className="muted" style={{ margin: 0 }}>No open leads assigned.</p> : stages.map(([s, n]) => <div key={s} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 36px', gap: 12, alignItems: 'center', padding: '6px 0' }}>
            <span className="small">{s}</span><Bar value={n / maxStage} tone="accent" /><span className="right mono small">{n}</span></div>)}
        </Card>
        {all ? <Card title="Team today" pad={false} actions={<Link className="small" to="/people">Time log</Link>}>
          {team.map((u) => { const a = raw.attendance.find((x) => x.userId === u.id && x.date === t)
            return <div key={u.id} className="fup" style={{ gridTemplateColumns: 'minmax(0,1fr) auto auto' }}><span>{u.name}</span>
              <span className="small" style={{ color: a?.status === 'Late' ? 'var(--warn)' : 'var(--fg3)' }}>{a ? `In ${a.in}${a.status === 'Late' ? ' · late' : ''}${a.out ? ' · out ' + a.out : ''}` : 'Not punched in'}</span>
              <span className="small muted">{a ? STATE_LABEL[a.out ? 'out' : a.state] : ''}</span></div> })}
        </Card> : <Card title="Modules">
          <div className="mod-cards" style={{ margin: 0 }}>
            {[['/crm/clients', 'Client 360', 'Your clients, their papers and history'], ['/crm/leads', 'Leads', 'Your enquiries and site visits'], ['/brochure', 'e-Brochure', 'Present Sky City to a guest'], ['/experience', 'Accord experience', 'Run a buyer session']]
              .filter(([to]) => to !== '/experience' || canOpen(user, 'experience')).map(([to, h, p], k) => <Link key={to} to={to} className="mod-card" style={{ minHeight: 110 }}><span className="n">0{k + 1}</span><h3>{h}</h3><p>{p}</p></Link>)}
          </div>
        </Card>}
      </div>
    </div>
  )
}

function DesignHome() {
  const { db, user } = useStore()
  const sessions = (db.accordSessions || []).slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  return (
    <div className="page">
      <div className="page-head"><div><div className="label">Accord Design</div><h1 className="greet" style={{ marginTop: 10 }}>{greet()}, <em>{user.name}</em></h1>
        <p className="sub">The Accord experience, the sample-flat projects with their BOQ, and sourcing.</p></div>
        <div className="actions"><Link className="btn btn-primary" to="/experience">Open the experience</Link></div></div>
      <Grid cols={4}>
        <Stat label="Projects" value={db.projects.length} sub={`${db.rooms.length} rooms · ${db.boq.length} BOQ lines`} tone="accent" />
        <Stat label="Buyer sessions" value={sessions.length} sub="Accord experience" tone="info" />
        <Stat label="Vendors" value={db.vendors.length} sub={`${db.vendors.filter((v) => v.status === 'Approved').length} approved`} />
        <Stat label="Quotes" value={db.quotes.length} sub={`${db.samples.length} samples`} tone="teal" />
      </Grid>
      <DesignPipeline />
      <div className="mod-cards">
        {[['/experience', 'Accord experience', 'Persona, palette, configurator and the Accord, for a buyer at the screen.'], ['/accord', 'Projects and BOQ', 'Rooms, renders, finishes, packages and the bill of quantities.'], ['/presales/showcase', 'Design showcase', 'The same rooms and finishes, without quantities or prices.'], ['/sourcing', 'Sourcing', 'Trips, the day tracker, quotes, comparison and samples.']]
          .map(([to, h, p], k) => <Link key={to} to={to} className="mod-card"><span className="n">0{k + 1}</span><h3>{h}</h3><p>{p}</p></Link>)}
      </div>
    </div>
  )
}

function VendorsHome() {
  const { db, user } = useStore()
  const by = (s) => db.vendors.filter((v) => v.status === s).length
  return (
    <div className="page">
      <div className="page-head"><div><div className="label">Accord Vendors</div><h1 className="greet" style={{ marginTop: 10 }}>{greet()}, <em>{user.name}</em></h1>
        <p className="sub">Vendor applications, approvals, quotes and samples.</p></div>
        <div className="actions"><Link className="btn" to="/apply/vendor">Onboarding form</Link><Link className="btn btn-primary" to="/vendors">Vendor directory</Link></div></div>
      <Grid cols={4}>
        <Stat label="Applied" value={by('Applied')} sub="waiting for review" tone="warn" />
        <Stat label="Shortlisted" value={by('Shortlisted')} tone="info" />
        <Stat label="Approved" value={by('Approved')} tone="good" />
        <Stat label="Quotes" value={db.quotes.length} sub={`${db.samples.length} samples logged`} />
      </Grid>
      <Card title="Latest applications" pad={false}>
        {db.vendors.slice().sort((a, b) => String(b.appliedOn || b.updatedAt || '').localeCompare(String(a.appliedOn || a.updatedAt || ''))).slice(0, 10).map((v) =>
          <Link key={v.id} to={'/vendors/' + v.id} className="fup" style={{ color: 'inherit', gridTemplateColumns: 'minmax(0,1fr) auto auto' }}><span>{v.name}<div className="small muted">{v.category} · {v.city}</div></span><Badge>{v.status}</Badge><span className="small muted">{v.id}</span></Link>)}
      </Card>
    </div>
  )
}

// Bookings from Accord Sales that Design is working on or should pick up: a session without a project comes first.
function DesignPipeline() {
  const { db } = useStore()
  const crm = useCrm()
  const rows = crm.clients.filter((c) => c.bookingId && !['Cancelled', 'Transferred'].includes(c.status))
    .map((c) => ({ c, s: sessionsFor(db, c), p: projectsFor(db, c) })).filter((x) => x.s.length || x.p.length)
    .sort((a, b) => (a.p.length - b.p.length) || Number(a.c.unit) - Number(b.c.unit))
  return (
    <Card title={`Bookings in design · ${rows.length}`} actions={<Link className="btn btn-sm" to="/accord/residences">Residences</Link>}>
      {!rows.length ? <p className="muted" style={{ margin: 0 }}>No buyer has been through the Accord experience yet, and no project is linked to a booking. Link a project to its booking from the project's Client and residence tab.</p>
        : rows.slice(0, 12).map(({ c, s, p }) => <div key={c.id} className="check-row">
          <span><b>{c.unit}</b> · {c.name}<div className="small muted">{s[0] ? [s[0].persona, s[0].palette, s[0].register].filter(Boolean).join(' · ') : 'No experience session'}{c.owner ? ' · ' + c.owner : ''}</div></span>
          {p[0] ? <Link className="btn btn-sm" to={'/accord/' + p[0].id}>{p[0].id} · {p[0].status}</Link> : <Link className="btn btn-sm btn-primary" to="/accord">Start project</Link>}</div>)}
    </Card>
  )
}
