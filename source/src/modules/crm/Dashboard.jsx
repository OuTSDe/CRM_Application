import React, { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { Page, Card, Grid, Stat, Badge, Bar } from '../../components/ui.jsx'
import { lakh, inr, pct, d, today, daysBetween } from '../../lib/format.js'

export default function CrmDashboard() {
  const { db } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const t = today()
  const live = crm.clients.filter((c) => !['Cancelled', 'Transferred'].includes(c.status))
  const sold = live.reduce((s, c) => s + Number(c.tc || 0), 0)
  const recv = live.reduce((s, c) => s + c.received, 0)
  const out = live.reduce((s, c) => s + Math.max(0, c.outstanding), 0)
  const health = { Red: 0, Amber: 0, Green: 0 }; live.forEach((c) => health[c.health]++)
  const ageing = ['Not yet due', '0-30 days', '31-60 days', '60+ days', 'Due, date not set'].map((a) => ({ a, n: live.filter((c) => c.age === a).length, v: live.filter((c) => c.age === a).reduce((s, c) => s + Math.max(0, c.outstanding), 0) }))
  const stages = useMemo(() => { const m = {}; db.leads.forEach((l) => (m[l.stage] = (m[l.stage] || 0) + 1)); return m }, [db.leads])
  const srcs = useMemo(() => { const m = {}; db.leads.forEach((l) => { const s = l.source || 'Unknown'; m[s] = (m[s] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8) }, [db.leads])
  const due = db.interactions.filter((i) => i.status === 'Open' && i.nextDate && i.nextDate <= t)
  const week = db.interactions.filter((i) => i.date && daysBetween(i.date) <= 7 && daysBetween(i.date) >= 0)
  const soldUnits = crm.units.filter((u) => crm.byUnit[u.unit] && BOOKED.includes(crm.byUnit[u.unit].status)).length
  const byType = ['2 BHK', '3 BHK', '4 BHK', '5 BHK'].map((ty) => { const all = crm.units.filter((u) => u.type === ty); const s = all.filter((u) => crm.byUnit[u.unit] && BOOKED.includes(crm.byUnit[u.unit].status)).length; return { ty, all: all.length, s } })
  const maxStage = Math.max(1, ...Object.values(stages))
  return (
    <Page back={true} title="CRM dashboard" subtitle={`Live from the CRM data. Demand billed to date: ${pct(crm.billedPct)} of consideration plus GST.`}
      actions={<><Link className="btn" to="/crm/cost-sheet">New cost sheet</Link><Link className="btn btn-primary" to="/crm/interactions">Log interaction</Link></>}>
      <Grid cols={6}>
        <Stat label="Live bookings" value={live.length} sub={`${soldUnits} of ${crm.units.length} residences`} tone="accent" onClick={() => nav('/crm/clients')} />
        <Stat label="Sales value" value={lakh(sold)} sub="total consideration" />
        <Stat label="Received" value={lakh(recv)} sub={pct(sold ? recv / sold : 0) + ' of value'} tone="good" />
        <Stat label="Outstanding" value={lakh(out)} sub="against demands raised" tone="bad" onClick={() => nav('/crm/payments')} />
        <Stat label="Open leads" value={db.leads.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage)).length} sub={`${db.leads.length} total`} tone="info" onClick={() => nav('/crm/leads')} />
        <Stat label="Follow-ups due" value={due.length} sub={`${week.length} interactions this week`} tone={due.length ? 'warn' : 'good'} onClick={() => nav('/crm/interactions')} />
      </Grid>
      <div className="grid g3">
        <Card title="Client health">
          {['Red', 'Amber', 'Green'].map((h) => <div key={h} className="row between" style={{ padding: '6px 0' }}><span className={'health ' + h} style={{ padding: '3px 12px', fontSize: 12.5 }}>{h}</span><b style={{ fontSize: 20 }}>{health[h]}</b></div>)}
          <p className="small muted" style={{ marginBottom: 0 }}>Red: overdue 60+ days, over 10% paid without agreement, under cancellation, or no contact in 30 days.</p>
        </Card>
        <Card title="Payment ageing">
          {ageing.map((x) => <div key={x.a} className="check-row"><span className="lbl">{x.a}</span><span><b>{x.n}</b> <span className="muted small">· {lakh(x.v)}</span></span></div>)}
        </Card>
        <Card title="Inventory sold by type">
          {byType.map((x) => <div key={x.ty} style={{ marginBottom: 10 }}><div className="row between small"><b>{x.ty}</b><span className="muted">{x.s} of {x.all}</span></div><Bar value={x.all ? x.s / x.all : 0} /></div>)}
          <Link to="/crm/inventory" className="small">Open the building view</Link>
        </Card>
      </div>
      <div className="grid g2">
        <Card title="Lead pipeline">
          {Object.keys(stages).sort((a, b) => stages[b] - stages[a]).map((s) => <div key={s} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 40px', gap: 10, alignItems: 'center', padding: '4px 0' }}>
            <span className="small">{s}</span><Bar value={stages[s] / maxStage} tone={s === 'Lost' ? 'bad' : s === 'Booked' ? 'good' : 'info'} /><b className="right">{stages[s]}</b></div>)}
        </Card>
        <Card title="Lead sources (top 8)">
          {srcs.map(([s, k]) => <div key={s} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 40px', gap: 10, alignItems: 'center', padding: '4px 0' }}>
            <span className="small">{s}</span><Bar value={k / srcs[0][1]} tone="teal" /><b className="right">{k}</b></div>)}
        </Card>
      </div>
      <Card title="Needs attention" pad={false} actions={<Link className="btn btn-sm" to="/crm/clients">All clients</Link>}>
        <table className="table"><thead><tr><th>Client</th><th>Flat</th><th>Flags</th><th className="right">Outstanding</th><th>Last contact</th></tr></thead>
          <tbody>{live.filter((c) => c.health === 'Red').sort((a, b) => b.outstanding - a.outstanding).slice(0, 12).map((c) => (
            <tr key={c.id} className="click" onClick={() => nav('/crm/clients/' + c.id)}><td><b>{c.name}</b><div className="small muted">{c.clientId}</div></td><td>{c.unit}</td>
              <td><div className="flags">{c.red.map((f) => <span key={f} className="flag red">{f}</span>)}</div></td><td className="right">{inr(Math.max(0, c.outstanding))}</td>
              <td>{c.contact.lastDate ? d(c.contact.lastDate) : <Badge tone="bad">Never</Badge>}</td></tr>))}</tbody></table>
      </Card>
    </Page>
  )
}
