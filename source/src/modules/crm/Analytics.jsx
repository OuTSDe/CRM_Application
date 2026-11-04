// Analytics (4 Nov: one page, three parts by role).
//   Leads   – sales team (sales, senior) and admins: where enquiries come from, who handles them, how far they get, why they are lost.
//   Finance – finance and admins: collections, outstanding and ageing, payment modes, entries not counted.
//   Overall – admins only: the whole project on one page.
// Everything is counted from the data already in Accord.
import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { Page, Card, Grid, Stat, Seg } from '../../components/ui.jsx'
import { today, addDays, lakh, inr } from '../../lib/format.js'

const STAGES = ['New', 'Contacted', 'Qualified', 'Site visit scheduled', 'Site visit done', 'Negotiation', 'Token received', 'Booked']
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–')
const weekOf = (s) => { const x = new Date(s + 'T00:00:00'); if (isNaN(x)) return ''; const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x.toISOString().slice(0, 10) }
const count = (list, key) => { const m = {}; list.forEach((l) => { const k = (typeof key === 'function' ? key(l) : l[key]) || 'Not set'; m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }

function Bars({ rows, onPick, total }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>Nothing in this period.</p>
  return rows.map(([k, v]) => <div key={k} className="bar-row" style={{ cursor: onPick ? 'pointer' : undefined }} onClick={() => onPick && onPick(k)}>
    <span title={k} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
    <span className="bar-bg"><span className="bar" style={{ display: 'block', width: (v / max) * 100 + '%' }} /></span>
    <span className="right mono">{v}{total ? <span className="small muted"> · {pct(v, total)}</span> : null}</span></div>)
}

export const ANALYTICS_TABS = [
  { value: 'leads', label: 'Leads', roles: ['admin', 'senior', 'sales'] },
  { value: 'finance', label: 'Finance', roles: ['admin', 'finance'] },
  { value: 'overall', label: 'Overall', roles: ['admin'] },
]
const RANGES = [{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '365', label: '1 year' }, { value: 'all', label: 'All time' }]
const SUB = { leads: 'Where enquiries come from, who is handling them, how far they get and why they are lost.', finance: 'Money in, money due and how old it is, by month, mode and client.', overall: 'The whole project on one page: sales, collections and the pipeline behind them.' }

export default function Analytics() {
  const { user } = useStore()
  const [qs, setQs] = useSearchParams()
  const tabs = ANALYTICS_TABS.filter((x) => x.roles.includes(user.appRole))
  const tab = tabs.find((x) => x.value === qs.get('tab'))?.value || tabs[0]?.value
  const [range, setRange] = useState('90')
  if (!tabs.length) return <Page title="Analytics" back="/" backLabel="Dashboard"><div className="empty"><h3>Not part of your access</h3><p>Analytics is for the sales team, finance and admins.</p></div></Page>
  const from = range === 'all' ? '0000' : addDays(today(), -Number(range))
  return (
    <Page title="Analytics" back="/" backLabel="Dashboard" subtitle={SUB[tab]} actions={<Seg value={range} onChange={setRange} options={RANGES} />}>
      {tabs.length > 1 && <div className="tabs" role="tablist">{tabs.map((x) => <button key={x.value} role="tab" aria-selected={tab === x.value} className={'tab' + (tab === x.value ? ' on' : '')} onClick={() => setQs({ tab: x.value }, { replace: true })}>{x.label}</button>)}</div>}
      {tab === 'leads' && <LeadAnalytics from={from} range={range} />}
      {tab === 'finance' && <FinanceAnalytics from={from} range={range} />}
      {tab === 'overall' && <OverallAnalytics from={from} range={range} />}
    </Page>
  )
}

function LeadAnalytics({ from, range }) {
  const { db } = useStore()
  const nav = useNavigate()
  const [by, setBy] = useState('week')
  const leads = useMemo(() => db.leads.filter((l) => String(l.date || '') >= from), [db.leads, from])
  const reached = (l) => (l.stage === 'Lost' || l.stage === 'Dormant' ? Math.max(STAGES.indexOf(l.lastStage || 'New'), l.svDone === 'Yes' ? 4 : 0) : STAGES.indexOf(l.stage))
  const booked = leads.filter((l) => l.stage === 'Booked').length
  const lost = leads.filter((l) => l.stage === 'Lost')
  const open = leads.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage))
  const visits = leads.filter((l) => l.svDone === 'Yes' || reached(l) >= 4).length
  const periods = useMemo(() => {
    const m = {}; leads.forEach((l) => { if (!l.date) return; const k = by === 'week' ? weekOf(String(l.date).slice(0, 10)) : String(l.date).slice(0, 7); if (k) m[k] = (m[k] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).slice(0, by === 'week' ? 16 : 12).map(([k, v]) => [by === 'week' ? 'Week of ' + new Date(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), v])
  }, [leads, by])
  const funnel = STAGES.map((s, i) => [s, leads.filter((l) => reached(l) >= i).length])
  const owners = count(leads, (l) => l.owner || 'Not assigned').map(([k, v]) => [k, v, leads.filter((l) => (l.owner || 'Not assigned') === k && l.stage === 'Booked').length])
  const sources = count(leads, 'source').map(([k, v]) => [k, v, leads.filter((l) => (l.source || 'Not set') === k && l.stage === 'Booked').length])
  const touched = leads.filter((l) => db.interactions.some((i) => i.recordId === l.id && i.mode !== 'Note (imported)')).length
  return (
    <>
      <Grid cols={5}>
        <Stat label="Leads captured" value={leads.length} sub={range === 'all' ? 'all time' : 'last ' + range + ' days'} tone="info" />
        <Stat label="Contacted" value={pct(touched, leads.length)} sub={`${touched} with a real interaction`} tone="teal" />
        <Stat label="Site visits" value={visits} sub={pct(visits, leads.length) + ' of leads'} />
        <Stat label="Booked" value={booked} sub={'conversion ' + pct(booked, leads.length)} tone="good" />
        <Stat label="Lost" value={lost.length} sub={`${open.length} still open`} tone="bad" />
      </Grid>
      <div className="split">
        <Card title="New leads over time" actions={<Seg value={by} onChange={setBy} options={[{ value: 'week', label: 'By week' }, { value: 'month', label: 'By month' }]} />}><Bars rows={periods} /></Card>
        <Card title="How far leads get"><Bars rows={funnel} total={leads.length} /><p className="small muted">Each step counts every lead that reached it or went further.</p></Card>
      </div>
      <div className="split">
        <Card title="By source" pad={false}>
          <table className="table"><thead><tr><th>Source</th><th className="right">Leads</th><th className="right">Booked</th><th className="right">Conversion</th></tr></thead>
            <tbody>{sources.map(([k, v, b]) => <tr key={k} style={{ cursor: 'pointer' }} onClick={() => nav('/crm/leads?view=all')}><td>{k}</td><td className="right">{v}</td><td className="right">{b}</td><td className="right">{pct(b, v)}</td></tr>)}</tbody></table>
        </Card>
        <Card title="By advisor" pad={false}>
          <table className="table"><thead><tr><th>Advisor</th><th className="right">Leads</th><th className="right">Open</th><th className="right">Booked</th><th className="right">Conversion</th></tr></thead>
            <tbody>{owners.map(([k, v, b]) => <tr key={k}><td>{k}</td><td className="right">{v}</td><td className="right">{open.filter((l) => (l.owner || 'Not assigned') === k).length}</td><td className="right">{b}</td><td className="right">{pct(b, v)}</td></tr>)}</tbody></table>
        </Card>
      </div>
      <div className="split">
        <Card title="Current stage"><Bars rows={count(leads, 'stage')} total={leads.length} /></Card>
        <Card title="Why leads were lost"><Bars rows={count(lost, (l) => l.lostReason || 'Reason not recorded')} total={lost.length} /></Card>
      </div>
      <div className="split">
        <Card title="Wants"><Bars rows={count(leads, 'config')} total={leads.length} /></Card>
        <Card title="Temperature of open leads"><Bars rows={count(open, 'temperature')} total={open.length} /></Card>
      </div>
    </>
  )
}

const monthLabel = (k) => new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
const sumBy = (list, key, val) => { const m = {}; list.forEach((x) => { const k = (typeof key === 'function' ? key(x) : x[key]) || 'Not set'; m[k] = (m[k] || 0) + val(x) }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }

function MoneyBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  if (!rows.length) return <p className="muted" style={{ margin: 0 }}>Nothing in this period.</p>
  return rows.map(([k, v]) => <div key={k} className="bar-row"><span title={k} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
    <span className="bar-bg"><span className="bar" style={{ display: 'block', width: (v / max) * 100 + '%' }} /></span><span className="right mono">{lakh(v)}</span></div>)
}

function FinanceAnalytics({ from, range }) {
  const { db } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const pays = db.payments.filter((p) => String(p.date || '') >= from)
  const counted = pays.filter((p) => p.counted === 'Yes')
  const amt = (p) => Number(p.amount || 0)
  const total = counted.reduce((a, p) => a + amt(p), 0)
  const live = crm.clients.filter((c) => !['Cancelled', 'Transferred'].includes(c.status) && !c.directoryOnly)
  const due = live.filter((c) => c.outstanding > 0)
  const outTotal = due.reduce((a, c) => a + c.outstanding, 0)
  const tc = live.reduce((a, c) => a + Number(c.tc || 0), 0), recv = live.reduce((a, c) => a + Number(c.received || 0), 0)
  const months = sumBy(counted.filter((p) => p.date), (p) => String(p.date).slice(0, 7), amt).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).map(([k, v]) => [monthLabel(k), v])
  const ageing = sumBy(due, (c) => c.age || 'Not aged', (c) => c.outstanding)
  const top = [...due].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10)
  return <>
    <Grid cols={5}>
      <Stat label="Collected" value={lakh(total)} sub={`${counted.length} counted receipts · ${range === 'all' ? 'all time' : 'last ' + range + ' days'}`} tone="good" />
      <Stat label="Outstanding now" value={lakh(outTotal)} sub={`${due.length} clients, against demands raised`} tone="bad" onClick={() => nav('/crm/payments?tab=due')} />
      <Stat label="Overdue 60+ days" value={lakh(due.filter((c) => c.age === '60+ days').reduce((a, c) => a + c.outstanding, 0))} sub={`${due.filter((c) => c.age === '60+ days').length} clients`} tone="warn" />
      <Stat label="Collected of booking value" value={tc ? Math.round((recv / tc) * 100) + '%' : '–'} sub={`${lakh(recv)} of ${lakh(tc)}, live bookings`} tone="teal" />
      <Stat label="Not counted" value={pays.length - counted.length} sub="duplicates, bounced, on hold" />
    </Grid>
    <div className="split">
      <Card title="Collections by month"><MoneyBars rows={months} /></Card>
      <Card title="Outstanding by ageing"><MoneyBars rows={ageing} /></Card>
    </div>
    <div className="split">
      <Card title="By payment mode"><MoneyBars rows={sumBy(counted, 'mode', amt)} /></Card>
      <Card title="By what it was paid towards"><MoneyBars rows={sumBy(counted, 'towards', amt).slice(0, 10)} /></Card>
    </div>
    <div className="split">
      <Card title="Largest amounts due" pad={false}>
        <table className="table"><thead><tr><th>Flat</th><th>Client</th><th className="right">Outstanding</th><th>Ageing</th></tr></thead>
          <tbody>{top.map((c) => <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => nav('/crm/clients/' + c.id)}><td className="mono">{c.unit}</td><td>{c.name}</td><td className="right"><b>{inr(c.outstanding)}</b></td><td>{c.age || '–'}</td></tr>)}</tbody></table>
      </Card>
      <Card title="Funding of clients with dues"><Bars rows={count(due, (c) => c.funding || c.fundingMode)} total={due.length} /></Card>
    </div>
  </>
}

function OverallAnalytics({ from, range }) {
  const { db } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const live = crm.clients.filter((c) => BOOKED.includes(c.status))
  const newB = live.filter((c) => String(c.bookingDate || '') >= from)
  const value = live.reduce((a, c) => a + Number(c.tc || 0), 0), recv = live.reduce((a, c) => a + Number(c.received || 0), 0), out = live.reduce((a, c) => a + Math.max(0, c.outstanding || 0), 0)
  const leads = db.leads.filter((l) => String(l.date || '') >= from)
  const openL = db.leads.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage))
  const collected = db.payments.filter((p) => p.counted === 'Yes' && String(p.date || '') >= from).reduce((a, p) => a + Number(p.amount || 0), 0)
  const inter = db.interactions.filter((i) => String(i.date || '') >= from && i.mode !== 'Note (imported)')
  const sold = crm.units.filter((u) => crm.byUnit[u.unit] && BOOKED.includes(crm.byUnit[u.unit].status)).length
  const bookMonths = sumBy(live.filter((c) => c.bookingDate), (c) => String(c.bookingDate).slice(0, 7), () => 1).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).map(([k, v]) => [monthLabel(k), v])
  const people = sumBy(inter, 'by', () => 1).slice(0, 10)
  return <>
    <Grid cols={4}>
      <Stat label="Residences booked" value={<>{sold}<small> / {crm.units.length}</small></>} sub={`${newB.length} new in this period`} tone="accent" onClick={() => nav('/crm/inventory')} />
      <Stat label="Booking value" value={lakh(value)} sub="live bookings" />
      <Stat label="Collected" value={lakh(recv)} sub={`${lakh(collected)} in this period`} tone="good" />
      <Stat label="Outstanding" value={lakh(out)} sub="against demands raised" tone="bad" />
      <Stat label="Leads captured" value={leads.length} sub={range === 'all' ? 'all time' : 'last ' + range + ' days'} tone="info" />
      <Stat label="Open leads" value={openL.length} sub={`${openL.filter((l) => l.temperature === 'Hot').length} hot`} />
      <Stat label="Interactions logged" value={inter.length} sub="calls, visits and messages" tone="teal" />
      <Stat label="Open issues" value={db.issues.filter((i) => ['Open', 'In progress'].includes(i.status)).length} sub={`${db.issues.filter((i) => i.category === 'Client complaint' && i.status !== 'Resolved').length} client complaints`} tone="warn" onClick={() => nav('/crm/issues')} />
    </Grid>
    <div className="split">
      <Card title="Bookings by month"><Bars rows={bookMonths} /></Card>
      <Card title="Bookings by type"><Bars rows={count(live, (c) => c.config)} total={live.length} /></Card>
    </div>
    <div className="split">
      <Card title="Most active on the interaction log"><Bars rows={people} /></Card>
      <Card title="Bookings by customer category"><Bars rows={count(live, 'category')} total={live.length} /></Card>
    </div>
    <p className="small muted">The Leads and Finance tabs have the detail behind these figures.</p>
  </>
}
