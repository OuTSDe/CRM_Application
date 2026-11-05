// 5 Nov: reports. One A4 page (portrait or landscape) that pulls together what a person, or the whole sales team, did
// over a day, a week or chosen dates: hours, interactions, leads, bookings, collections and what is still pending.
// Meant to be printed or saved as PDF and handed to a manager or an outside consultant. It carries names and
// residences only: no phone numbers or e-mails, for anyone.
import React, { useMemo, useState } from 'react'
import { useStore, daySums } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canPage, seesMoney, ROLES } from '../../lib/perms.js'
import { Page, Card, Button, Seg, Field, Input, Select } from '../../components/ui.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import { d, today, addDays, lakh, nextWhen } from '../../lib/format.js'

const hm = (m) => `${Math.floor((m || 0) / 60)}h ${String(Math.round(m || 0) % 60).padStart(2, '0')}m`
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–')
const count = (list, key) => { const m = {}; list.forEach((x) => { const k = (typeof key === 'function' ? key(x) : x[key]) || 'Not set'; m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }
const inRange = (s, from, to) => { const x = String(s || '').slice(0, 10); return x >= from && x <= to }

// a small bar chart that prints well (plain SVG, no colour needed to read it)
function BarChart({ rows, w = 320, unit = '' }) {
  if (!rows.length) return <p className="small muted">Nothing in this period.</p>
  const max = Math.max(1, ...rows.map((r) => r[1])), rowH = 18, lw = 120
  return <svg width="100%" viewBox={`0 0 ${w} ${rows.length * rowH + 4}`} className="rep-chart" role="img">
    {rows.map(([k, v], i) => <g key={k} transform={`translate(0 ${i * rowH})`}>
      <text x={lw - 6} y={12} textAnchor="end" fontSize="10">{String(k).length > 20 ? String(k).slice(0, 19) + '…' : k}</text>
      <rect x={lw} y={3} width={Math.max(2, ((w - lw - 44) * v) / max)} height={11} rx={2} className="rep-bar" />
      <text x={lw + Math.max(2, ((w - lw - 44) * v) / max) + 4} y={12} fontSize="10">{v}{unit}</text></g>)}
  </svg>
}
function DayChart({ days, w = 520 }) {
  const max = Math.max(1, ...days.map((x) => x[1])), h = 90, bw = (w - 20) / Math.max(1, days.length)
  return <svg width="100%" viewBox={`0 0 ${w} ${h + 22}`} className="rep-chart" role="img">
    {days.map(([k, v], i) => <g key={k}><rect x={10 + i * bw + 1} y={h - (h * v) / max} width={Math.max(1, bw - 2)} height={(h * v) / max} rx={1} className="rep-bar" />
      {(days.length <= 14 || i % Math.ceil(days.length / 10) === 0) && <text x={10 + i * bw + bw / 2} y={h + 12} fontSize="8" textAnchor="middle">{k.slice(8, 10)}/{k.slice(5, 7)}</text>}
      {v > 0 && days.length <= 14 && <text x={10 + i * bw + bw / 2} y={h - (h * v) / max - 2} fontSize="8" textAnchor="middle">{v}</text>}</g>)}
  </svg>
}

export default function Reports() {
  const { db, raw, user } = useStore()
  const crm = useCrm()
  const all = canPage(user, 'reportsAll')
  const money = seesMoney(user)
  const people = (raw.users || db.users).filter((u) => u.active !== 'No' && ['admin', 'senior', 'sales', 'finance'].includes(u.appRole) && u.team !== 'External')
  const [who, setWho] = useState(all ? 'team' : user.name)
  const [range, setRange] = useState('7')
  const [from0, setFrom] = useState(addDays(today(), -6))
  const [to0, setTo] = useState(today())
  const [orient, setOrient] = useState('portrait')
  const [show, setShow] = useState({ time: true, work: true, leads: true, sales: true, pending: true })
  const t = today()
  const from = range === 'custom' ? from0 : range === '1' ? t : addDays(t, -(Number(range) - 1)), to = range === 'custom' ? to0 : t
  const names = who === 'team' ? people.filter((u) => u.team === 'Sales' || ['senior', 'sales'].includes(u.appRole)).map((u) => u.name) : [who]
  const R = useMemo(() => {
    const mine = (n) => names.includes(n)
    const ints = db.interactions.filter((i) => mine(i.by) && inRange(i.date, from, to) && i.mode !== 'Note (imported)')
    const att = db.attendance.filter((a) => mine(a.name) && inRange(a.date, from, to))
    const shift = (n) => (raw.users || db.users).find((u) => u.name === n)?.shiftEnd || '18:30'
    const timeBy = names.map((n) => {
      // one entry per calendar day: duplicate rows for the same day are merged, so a day is never counted twice
      const byDay = {}; att.filter((x) => x.name === n).forEach((x) => { const k = String(x.date).slice(0, 10); byDay[k] = byDay[k] ? { ...byDay[k], events: [...(byDay[k].events || []), ...(x.events || [])], workMin: Math.max(Number(byDay[k].workMin || 0), Number(x.workMin || 0)) } : x })
      const a = Object.values(byDay); let work = 0, brk = 0, site = 0, open = 0
      a.forEach((x) => { const s = x.events?.length ? daySums(x.events, undefined, shift(n)) : null; work += Math.min(24 * 60, s ? s.work : Number(x.workMin || 0)); brk += s ? s.brk : Number(x.breakMin || 0); site += s ? s.site : Number(x.siteMin || 0); if (s?.open) open++ })
      return { n, days: a.length, work, brk, site, open, ints: ints.filter((i) => i.by === n).length } })
    const leadsNew = db.leads.filter((l) => inRange(l.date, from, to) && (who === 'team' || mine(l.owner) || (l.coOwners || []).some(mine)))
    const leadsOpen = db.leads.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage) && (who === 'team' || mine(l.owner) || (l.coOwners || []).some(mine)))
    const booked = crm.clients.filter((c) => inRange(c.bookingDate, from, to) && BOOKED.includes(c.status) && (who === 'team' || mine(c.owner) || mine(c.closedBy)))
    const myUnits = new Set(crm.clients.filter((c) => who === 'team' || mine(c.owner) || (c.coOwners || []).some(mine)).map((c) => String(c.unit)))
    const paid = db.payments.filter((p) => p.counted === 'Yes' && inRange(p.date, from, to) && myUnits.has(String(p.unit)) && p.ledgerOnly !== 'Yes')
    const owners = (i) => (i.nextOwners?.length ? i.nextOwners : [i.nextOwner || i.by])
    const pending = db.interactions.filter((i) => i.status === 'Open' && i.nextDate && i.nextDate <= to && owners(i).some(mine)).sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)))
    const tasks = db.tasks.filter((x) => mine(x.owner) && x.status === 'Open')
    const days = []; for (let x = from; x <= to; x = addDays(x, 1)) { days.push([x, ints.filter((i) => i.date === x).length]); if (days.length > 62) break }
    const nameOf = (rid) => crm.clients.find((c) => c.clientId === rid)?.name || db.leads.find((l) => l.id === rid)?.name || rid
    return { ints, timeBy, leadsNew, leadsOpen, booked, paid, pending, tasks, days, nameOf }
  }, [db, crm, names.join(','), from, to, who]) // eslint-disable-line
  const visits = R.ints.filter((i) => ['Site visit', 'Office visit'].includes(i.mode)).length
  const work = R.timeBy.reduce((a, x) => a + x.work, 0)
  const title = who === 'team' ? 'Sales team report' : `Report · ${who}`
  const period = from === to ? d(from) : `${d(from)} to ${d(to)}`
  const pageCss = `@media print { @page { size: A4 ${orient}; margin: 10mm } .report { width: auto !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important } }`
  const tog = (k) => setShow({ ...show, [k]: !show[k] })
  return (
    <div>
      <style>{pageCss}</style>
      <div className="no-print">
        <Page title="Reports" back="/" backLabel="Dashboard" subtitle="A one-page report for a person or the whole sales team, ready to print or save as PDF. Names and residences only; no phone numbers or e-mails.">
          <Card title="What to include">
            <div className="form fc3">
              <Field label="Report on">{all ? <Select options={[{ value: 'team', label: 'Whole sales team' }, ...people.map((u) => ({ value: u.name, label: `${u.name} · ${ROLES[u.appRole] || u.appRole}` }))]} value={who} onChange={(e) => setWho(e.target.value)} />
                : <Input value={user.name} disabled />}</Field>
              <Field label="Period"><Seg value={range} onChange={setRange} options={[{ value: '1', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: 'custom', label: 'Choose dates' }]} /></Field>
              <Field label="Page"><Seg value={orient} onChange={setOrient} options={[{ value: 'portrait', label: 'A4 portrait' }, { value: 'landscape', label: 'A4 landscape' }]} /></Field>
              {range === 'custom' && <><Field label="From"><Input type="date" value={from0} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To"><Input type="date" value={to0} onChange={(e) => setTo(e.target.value)} /></Field></>}
            </div>
            <div className="row gap-s" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {[['time', 'Time worked'], ['work', 'Interactions'], ['leads', 'Leads'], ['sales', 'Bookings and collections'], ['pending', 'Pending follow-ups']].map(([k, l]) => <button key={k} type="button" className={'chip' + (show[k] ? ' on' : '')} aria-pressed={show[k]} onClick={() => tog(k)}>{l}</button>)}
              <Button variant="primary" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>Print or save as PDF</Button>
            </div>
          </Card>
        </Page>
      </div>
      <div className={'report doc ' + orient}>
        <DocHeader title={title.toUpperCase()} sub={`${period} · prepared ${d(t)} by ${user.name}`} />
        <div className="rep-kpis">
          {[['Hours worked', hm(work)], ['Interactions', R.ints.length], ['Site / office visits', visits], ['New leads', R.leadsNew.length], ['Bookings', R.booked.length], ...(money ? [['Collected', lakh(R.paid.reduce((a, p) => a + Number(p.amount || 0), 0))]] : []), ['Follow-ups pending', R.pending.length]]
            .map(([l, v]) => <div key={l} className="rep-kpi"><span>{l}</span><b>{v}</b></div>)}
        </div>
        {show.time && <><div className="sec">Time</div>
          <table><thead><tr><th>Person</th><th className="right">Days in</th><th className="right">Worked</th><th className="right">Breaks</th><th className="right">Site visits</th><th className="right">Interactions</th></tr></thead>
            <tbody>{R.timeBy.map((x) => <tr key={x.n}><td>{x.n}{x.open > 0 && <span className="small missing"> · {x.open} day{x.open === 1 ? '' : 's'} not punched out</span>}</td><td className="right">{x.days}</td><td className="right">{hm(x.work)}</td><td className="right">{hm(x.brk)}</td><td className="right">{hm(x.site)}</td><td className="right">{x.ints}</td></tr>)}</tbody></table></>}
        {show.work && <><div className="sec">Interactions</div>
          <div className={'rep-grid ' + orient}>
            <div><div className="small muted">Per day</div><DayChart days={R.days} /></div>
            <div><div className="small muted">By mode</div><BarChart rows={count(R.ints, 'mode').slice(0, 8)} /></div>
            <div><div className="small muted">By outcome</div><BarChart rows={count(R.ints, 'outcome').slice(0, 8)} /></div>
          </div></>}
        {show.leads && <><div className="sec">Leads</div>
          <div className={'rep-grid ' + orient}>
            <div><div className="small muted">New leads by source ({R.leadsNew.length})</div><BarChart rows={count(R.leadsNew, 'source').slice(0, 8)} /></div>
            <div><div className="small muted">Open leads by stage ({R.leadsOpen.length})</div><BarChart rows={count(R.leadsOpen, 'stage').slice(0, 8)} /></div>
          </div>
          {R.leadsNew.length > 0 && <table><thead><tr><th>New lead</th><th>Date</th><th>Source</th><th>Wants</th><th>Stage</th>{who === 'team' && <th>Advisor</th>}</tr></thead>
            <tbody>{R.leadsNew.slice(0, 25).map((l) => <tr key={l.id}><td>{l.name || '–'}</td><td>{d(l.date)}</td><td>{l.source || '–'}</td><td>{l.config || '–'}</td><td>{l.stage}</td>{who === 'team' && <td>{l.owner || 'Not assigned'}</td>}</tr>)}
              {R.leadsNew.length > 25 && <tr><td colSpan={6} className="small muted">and {R.leadsNew.length - 25} more</td></tr>}</tbody></table>}</>}
        {show.sales && <><div className="sec">Bookings and collections</div>
          {R.booked.length ? <table><thead><tr><th>Client</th><th>Residence</th><th>Booked on</th><th>Type</th>{money && <th className="right">Paid so far</th>}<th className="right">Documents</th></tr></thead>
            <tbody>{R.booked.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.unit}</td><td>{d(c.bookingDate)}</td><td>{c.config}</td>{money && <td className="right">{pct(c.received, c.tc)}</td>}<td className="right">{pct(c.docsDone, c.docsApplicable)}</td></tr>)}</tbody></table>
            : <p className="small muted">No bookings in this period.</p>}
          {money && <p className="small">{R.paid.length} receipt{R.paid.length === 1 ? '' : 's'} in this period, {lakh(R.paid.reduce((a, p) => a + Number(p.amount || 0), 0))} in all.</p>}</>}
        {show.pending && <><div className="sec">Pending</div>
          {R.pending.length ? <table><thead><tr><th>Follow-up with</th><th>Due</th><th>What</th><th>Who</th></tr></thead>
            <tbody>{R.pending.slice(0, 20).map((i) => <tr key={i.id}><td>{R.nameOf(i.recordId)}</td><td className={i.nextDate < t ? 'over' : ''}>{nextWhen(i)}{i.nextDate < t ? ' · overdue' : ''}</td><td>{i.nextAction || i.purpose || 'Follow up'}</td><td>{(i.nextOwners || [i.nextOwner || i.by]).join(', ')}</td></tr>)}
              {R.pending.length > 20 && <tr><td colSpan={4} className="small muted">and {R.pending.length - 20} more</td></tr>}</tbody></table>
            : <p className="small muted">No follow-ups pending.</p>}
          {R.tasks.length > 0 && <p className="small">{R.tasks.length} open task{R.tasks.length === 1 ? '' : 's'}: {R.tasks.slice(0, 6).map((x) => x.title).join(' · ')}{R.tasks.length > 6 ? ' …' : ''}</p>}</>}
        <div className="foot">Accord report · names and residences only, no contact details · {period}</div>
      </div>
    </div>
  )
}
