// 2 Nov: lead analytics for management. How many enquiries come in, from where, who handles them, how far they get,
// and why they are lost. Everything is counted from the leads and interaction log already in Accord.
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { Page, Card, Grid, Stat, Seg } from '../../components/ui.jsx'
import { today, addDays } from '../../lib/format.js'

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

export default function Analytics() {
  const { db } = useStore()
  const nav = useNavigate()
  const [range, setRange] = useState('90')
  const [by, setBy] = useState('week')
  const t = today()
  const from = range === 'all' ? '0000' : addDays(t, -Number(range))
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
    <Page title="Lead analytics" back="/" backLabel="Dashboard" subtitle="Where enquiries come from, who is handling them, how far they get and why they are lost."
      actions={<Seg value={range} onChange={setRange} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '365', label: '1 year' }, { value: 'all', label: 'All time' }]} />}>
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
    </Page>
  )
}
