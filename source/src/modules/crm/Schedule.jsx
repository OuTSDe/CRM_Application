// 7 Nov: Client 360 → Payment schedule. Each client's own instalments, synced to the construction stages:
// what is paid, what is demanded and due, what is waiting for a stage or the registered agreement, and interest.
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canRecordPayment } from '../../lib/perms.js'
import { lateInterest, currentRate, collectionSteps, planRows } from '../../lib/schedule.js'
import { Card, Badge, Button, Modal, Select, Input } from '../../components/ui.jsx'
import { d, inr, n } from '../../lib/format.js'

const TONE = { Paid: 'good', Due: 'info', 'Part paid': 'warn', Overdue: 'bad', 'Part paid, overdue': 'bad', 'Letter not sent': 'warn', Upcoming: 'muted' }

export function ScheduleCard({ c, money }) {
  const crm = useCrm()
  const { user } = useStore()
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const rows = c.schedule || []
  const R = crm.rules
  const rate = currentRate(R)
  const intr = useMemo(() => (money && rate ? lateInterest(rows, c.payments || [], R) : { total: 0, per: [] }), [rows, c.payments, money, rate]) // eslint-disable-line
  const steps = collectionSteps(rows, R)
  if (!rows.length) return null
  const total = rows.reduce((a, r) => a + r.amount, 0) || 1
  const w = (x) => (x / total) * 100 + '%'
  const paid = rows.reduce((a, r) => a + r.paid, 0)
  const over = rows.filter((r) => /overdue/i.test(r.state)).reduce((a, r) => a + r.balance, 0)
  const due = rows.filter((r) => ['Due', 'Part paid', 'Letter not sent'].includes(r.state)).reduce((a, r) => a + r.balance, 0)
  return (
    <Card title={`Payment schedule${c.customPlan?.length ? ' · custom plan' : ' · construction-linked'}`} pad={false}
      actions={<span className="row gap-s">{!crm.perClient && <Badge tone="muted">Preview: not yet used for demand</Badge>}{money && canRecordPayment(user) && <Button size="sm" onClick={() => setOpen(true)}>{c.customPlan?.length ? 'Edit custom plan' : 'Custom plan'}</Button>}</span>}>
      <div className="card-body" style={{ paddingBottom: 0 }}>
        <div className="sched-bar" aria-hidden="true"><i className="p" style={{ width: w(paid) }} /><i className="o" style={{ width: w(over) }} /><i className="d" style={{ width: w(due) }} /></div>
        <div className="small muted">{money ? <>Paid {inr(paid)} · overdue {inr(over)} · due now {inr(due)} · of {inr(total)} (incl. GST)</> : <>Paid, overdue and due shares of the plan</>}{money && intr.total > 0 && <> · interest on late payment {inr(intr.total)} at {rate}% a year</>}</div>
        {steps.length > 0 && <div className="note warn small" style={{ marginTop: 8 }}>{steps.map((x, i) => <div key={i}>{x.label}</div>)}</div>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table dense sched-table"><thead><tr><th>#</th><th>Instalment</th><th className="right">%</th>{money && <th className="right">Amount</th>}<th>Letter</th><th>Due</th>{money && <th className="right">Paid</th>}{money && <th className="right">Balance</th>}<th>Status</th></tr></thead>
          <tbody>{rows.map((r, i) => ({ r, i })).filter(({ r, i }) => all || r.state !== 'Upcoming' || rows.slice(0, i).filter((x) => x.state === 'Upcoming').length < 3).map(({ r, i }) => <tr key={r.key} className={/overdue/i.test(r.state) ? 'row-warn' : ''}>
            <td className="mono">{i + 1}</td>
            <td>{r.stage}{r.projected && !r.ready && <div className="small muted">planned {d(r.projected)}</div>}</td>
            <td className="right">{(r.pct * 100).toFixed(1)}</td>
            {money && <td className="right">{inr(r.amount)}</td>}
            <td>{r.letter ? <Link to={'/crm/payments/demand/' + r.letter}>{r.letter}</Link> : <span className="muted">–</span>}</td>
            <td>{d(r.due) || <span className="muted">–</span>}</td>
            {money && <td className="right">{inr(r.paid)}</td>}
            {money && <td className="right">{r.balance > 0.5 ? inr(r.balance) : '–'}{intr.per[i] > 0 && <div className="small" style={{ color: 'var(--bad)' }}>+ {inr(intr.per[i])} interest</div>}</td>}
            <td><Badge tone={TONE[r.state] || 'warn'}>{r.state}</Badge></td></tr>)}</tbody></table>
      </div>
      {rows.filter((r) => r.state === 'Upcoming').length > 3 && <div style={{ padding: '6px 16px 0' }}><Button size="sm" variant="ghost" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${rows.length} instalments`}</Button></div>}
      <p className="small muted" style={{ padding: '6px 16px 12px', margin: 0 }}>Booking is due at booking and the agreement instalment at the registered agreement. A stage is demanded once it is completed and certified; payment is due {R.dueDays} days from the demand letter. Stages finished before this booking are demanded at the registered agreement (RERA section 13: no more than {(R.section13Cap * 100).toFixed(0)}% before it).</p>
      {open && <CustomPlan c={c} onClose={() => setOpen(false)} />}
    </Card>
  )
}

// A negotiated plan for one client. Each row is a % (or a fixed ₹ amount) with its trigger; must add up to 100%.
function CustomPlan({ c, onClose }) {
  const { db, upsert, notify } = useStore()
  const stages = [...(db.clpStages || [])].sort((a, b) => n(a.no) - n(b.no))
  const raw = db.clients.find((x) => x.id === c.id)
  const [rows, setRows] = useState(() => (c.customPlan?.length ? c.customPlan : planRows({}, stages)).map((r, i) => ({ key: r.key || 'C' + (i + 1), stage: r.stage, pct: n(r.pct), fixed: r.fixed ? n(r.fixed) : '', trigger: r.trigger, clpStage: r.clpStage || '' })))
  const basis = n(c.tc) - n(c.adjustment)
  const sum = rows.reduce((a, r) => a + (r.fixed ? (basis ? n(r.fixed) / basis : 0) : n(r.pct)), 0)
  const set = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const ok = Math.abs(sum - 1) < 0.0005
  const save = (plan) => { upsert('clients', { ...raw, customPlan: plan }, { action: plan ? 'custom payment plan' : 'back to the standard plan' }); notify(plan ? 'Custom plan saved' : 'Back to the construction-linked plan'); onClose() }
  return (
    <Modal open onClose={onClose} title={'Payment plan · ' + c.name + ' · ' + c.unit} wide footer={<>
      {c.customPlan?.length > 0 && <Button onClick={() => save(null)}>Use the standard plan</Button>}
      <Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!ok} onClick={() => save(rows.map((r, i) => ({ ...r, key: r.key || 'C' + (i + 1), pct: n(r.pct), fixed: r.fixed ? n(r.fixed) : '' })))}>Save plan</Button></>}>
      <p className="small muted" style={{ marginTop: 0 }}>Start from the construction-linked plan and change what was agreed. A row can be a % of the consideration or a fixed amount (₹, before GST). Total now <b style={{ color: ok ? 'var(--good)' : 'var(--bad)' }}>{(sum * 100).toFixed(2)}%</b>; it must be 100%.</p>
      <table className="table dense"><thead><tr><th>Instalment</th><th>Becomes due on</th><th>Stage</th><th className="right">%</th><th className="right">or fixed ₹</th><th></th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>
          <td><Input value={r.stage} onChange={(e) => set(i, 'stage', e.target.value)} /></td>
          <td><Select options={[{ value: 'booking', label: 'Booking' }, { value: 'agreement', label: 'Registered agreement' }, { value: 'stage', label: 'Construction stage' }, { value: 'handover', label: 'Possession offer' }]} value={r.trigger} onChange={(e) => set(i, 'trigger', e.target.value)} /></td>
          <td>{r.trigger === 'stage' ? <Select options={stages.map((s) => ({ value: s.id, label: s.no + ' · ' + s.stage }))} value={r.clpStage} onChange={(e) => set(i, 'clpStage', e.target.value)} /> : <span className="muted small">–</span>}</td>
          <td className="right"><Input type="number" style={{ width: 80 }} value={r.fixed ? '' : Math.round(n(r.pct) * 10000) / 100} disabled={!!r.fixed} onChange={(e) => set(i, 'pct', Number(e.target.value) / 100)} /></td>
          <td className="right"><Input type="number" style={{ width: 120 }} value={r.fixed} onChange={(e) => set(i, 'fixed', e.target.value === '' ? '' : Number(e.target.value))} /></td>
          <td><Button size="sm" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove row">×</Button></td></tr>)}</tbody></table>
      <Button size="sm" onClick={() => setRows([...rows, { key: 'C' + (rows.length + 1) + '-' + Date.now().toString(36), stage: 'New instalment', pct: 0, fixed: '', trigger: 'stage', clpStage: stages[0]?.id || '' }])}>+ Instalment</Button>
    </Modal>
  )
}
