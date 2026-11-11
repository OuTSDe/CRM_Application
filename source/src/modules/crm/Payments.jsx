import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, letterStatus, NON_BILLED } from '../../lib/calc.js'
import { fillTemplate, currentRate, lateInterest } from '../../lib/schedule.js'
import { canRecordPayment, seesMoney } from '../../lib/perms.js'
import { Page, Card, Button, Badge, Grid, Stat, Input } from '../../components/ui.jsx'
import { ordinal } from '../../components/Tower.jsx'
import DataTable from '../../components/DataTable.jsx'
import PaymentForm, { diffText } from './PaymentForm.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import { d, inr, lakh, words, today, waLink, addDays } from '../../lib/format.js'

export function Payments() {
  const { user } = useStore()
  return seesMoney(user) ? <FinancePayments /> : <SalesPayments />
}

// 30 Oct: client advisors see when each of their clients last paid and whether something is due, and can send a reminder. No amounts, no recording.
function SalesPayments() {
  const { db, user } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const tp = db.templates.find((x) => x.id === 'TP-02')
  const rows = crm.clients.filter((c) => c.mine && !['Cancelled', 'Transferred'].includes(c.status))
  const rank = { 'Overdue 60+ days': 0, Overdue: 1, 'Due this week': 2, 'Due, date not set': 3, 'Not yet due': 4, 'Paid up': 5 }
  const fill = (c) => (tp?.body || '').replace(/{name}/g, (c.name || '').split(' ')[0]).replace(/{unit}/g, c.unit).replace(/{outstanding}/g, '').replace(/{signature}/g, `${user.name}\n${user.designation || 'Client Relations'}\nYamuna Sky City`)
  return (
    <Page title="Payments and reminders" back="/" backLabel="Dashboard" subtitle="When each of your clients last paid and whether an instalment is due. Send a reminder from here; it is logged on your interaction log."
      actions={<span className="locked">Recording payments is with finance</span>}>
      <DataTable rows={rows} initialSort={{ key: 'state', dir: 'asc' }} searchKeys={['name', (c) => String(c.unit)]} onRowClick={(c) => nav('/crm/clients/' + c.id)}
        filters={[{ key: 'payState', label: 'Payment' }]} empty="None of your clients has a payment to follow up."
        columns={[{ key: 'name', label: 'Client', render: (c) => <div><b>{c.name}</b><div className="small muted">{c.clientId}</div></div> }, { key: 'unit', label: 'Flat', render: (c) => <span className="mono">{c.unit}</span> },
          { key: 'lastPaymentDate', label: 'Last payment', render: (c) => d(c.lastPaymentDate) }, { key: 'state', label: 'Status', sortValue: (c) => rank[c.payState] ?? 9, render: (c) => <Badge>{c.payState}</Badge> },
          { key: 'remind', label: 'Remind', sort: false, render: (c) => ['Paid up', 'Not yet due'].includes(c.payState) ? <span className="small muted">Nothing due</span> : <span className="row gap-s" onClick={(e) => e.stopPropagation()}>
            {c.phone ? <a className="btn btn-sm" href={waLink(c.whatsapp || c.phone, fill(c))} target="_blank" rel="noreferrer">WhatsApp</a> : <span className="small muted">No phone</span>}
            {c.email ? <a className="btn btn-sm" href={`mailto:${c.email}?subject=${encodeURIComponent('Yamuna Sky City · residence ' + c.unit)}&body=${encodeURIComponent(fill(c))}`}>Email</a> : <span className="small muted">No email on file</span>}
            <Link className="btn btn-sm btn-ghost" to={'/crm/messages?to=' + c.clientId + '&tp=TP-02'}>Edit message</Link></span> }]} />
    </Page>
  )
}

function FinancePayments() {
  const { db, user, upsert, notify } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(qs.get('tab') || 'ledger')
  useEffect(() => { const t = qs.get('tab'); if (t) setTab(t) }, [qs.get('tab')]) // eslint-disable-line   // 10 Nov: a help link to another tab switches it
  const counted = db.payments.filter((p) => p.counted === 'Yes')
  const m = today().slice(0, 7)
  const live = crm.clients.filter((c) => !['Cancelled', 'Transferred'].includes(c.status))
  return (
    <Page title="Payments and receipts" back="/" backLabel="Dashboard" subtitle="The payment ledger, outstanding by client, and A4 receipts ready to print or save as PDF."
      actions={<><Link className="btn" to="/crm/payments/receipts">Print receipts in bulk</Link>{canRecordPayment(user) ? <Button variant="primary" onClick={() => setOpen(true)}>Record payment</Button> : <span className="locked">Recording is with finance</span>}</>}>
      <Grid cols={4}>
        <Stat label="Counted receipts" value={lakh(counted.reduce((s, p) => s + Number(p.amount || 0), 0))} sub={`${counted.length} entries`} tone="good" />
        <Stat label="This month" value={lakh(counted.filter((p) => String(p.date).startsWith(m)).reduce((s, p) => s + Number(p.amount || 0), 0))} sub={m} tone="teal" />
        <Stat label="Outstanding" value={lakh(live.reduce((s, c) => s + Math.max(0, c.outstanding), 0))} sub={`${live.filter((c) => c.outstanding > 0).length} clients · ${live.filter((c) => c.outstanding > 0.5 && c.overdue > 0).length} overdue`} tone="bad" />
        <Stat label="Not counted" value={db.payments.length - counted.length} sub="duplicates, bounced, on hold" tone="warn" />
      </Grid>
      {crm.perClient ? null : <div className="note info small">Demand is still worked out from the project-wide demand calls. Check each client's own schedule under <b>Schedule check</b>, then switch to per-client schedules in Admin → Settings → Payment schedule.</div>}
      <div className="tabs" role="tablist">{[['ledger', 'Ledger'], ['due', 'Outstanding by client'], ['demand', crm.perClient ? 'Raise demand letters' : 'Demand calls'], ['letters', 'Demand letters'], ['forecast', 'Collections forecast'], ['check', 'Schedule check'], ['edits', 'Change log']].map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} className={'tab' + (tab === v ? ' on' : '')} onClick={() => setTab(v)}>{l}</button>)}</div>
      {tab === 'ledger' && <DataTable rows={db.payments.map((p) => ({ ...p, client: crm.byUnit[p.unit]?.name }))} initialSort={{ key: 'date', dir: 'desc' }} searchKeys={['payer', 'client', 'receiptNo', 'instrument', (p) => String(p.unit)]}
        filters={[{ key: 'counted', label: 'Counted' }, { key: 'mode', label: 'Mode' }, { key: 'towards', label: 'Towards' }]} onRowClick={(p) => nav('/crm/payments/receipt/' + p.id)} rowClass={(p) => p.counted !== 'Yes' && 'row-off'}
        columns={[{ key: 'date', label: 'Date', render: (p) => <span className="nowrap">{d(p.date)}</span> }, { key: 'receiptNo', label: 'Receipt' }, { key: 'unit', label: 'Flat' },
          { key: 'payer', label: 'Received from', render: (p) => <div>{p.payer}{p.client && p.client !== p.payer && <div className="small muted">{p.client}</div>}</div> },
          { key: 'towards', label: 'Towards' }, { key: 'mode', label: 'Mode' }, { key: 'amount', label: 'Amount', align: 'right', render: (p) => <b>{inr(p.amount)}</b> },
          { key: 'counted', label: 'Counted', render: (p) => <Badge tone={p.counted === 'Yes' ? 'good' : 'warn'}>{p.counted}</Badge> },
          { key: 'rev', label: 'Edited', sortValue: (p) => Number(p.rev || 0), render: (p) => Number(p.rev) > 0 ? <Badge tone="warn">{'Rev ' + p.rev}</Badge> : <span className="muted small">–</span> }]} />}
      {tab === 'forecast' && <Forecast />}
      {tab === 'check' && <ScheduleCheck />}
      {tab === 'edits' && <PaymentEdits />}
      {tab === 'demand' && crm.perClient && <RaiseDueLetters />}
      {tab === 'due' && <DataTable rows={live.filter((c) => c.outstanding > 0)} initialSort={{ key: 'outstanding', dir: 'desc' }} searchKeys={['name', (c) => String(c.unit)]} onRowClick={(c) => nav('/crm/clients/' + c.id)}
        filters={[{ key: 'age', label: 'Ageing' }, { key: 'funding', label: 'Funding' }]}
        columns={[{ key: 'unit', label: 'Flat' }, { key: 'name', label: 'Client' }, { key: 'demand', label: 'Demanded', align: 'right', render: (c) => inr(c.demand) }, { key: 'received', label: 'Received', align: 'right', render: (c) => inr(c.received) },
          { key: 'outstanding', label: 'Outstanding', align: 'right', render: (c) => <b style={{ color: 'var(--bad)' }}>{inr(c.outstanding)}</b> }, { key: 'due', label: 'Due', render: (c) => <span>{d(c.due)}{c.dueInferred && <div className="small muted">at the latest</div>}</span> },
          { key: 'age', label: 'Ageing', render: (c) => <Badge tone={c.age === '60+ days' ? 'bad' : 'warn'}>{c.age}</Badge> }, { key: 'lc', label: 'Last contact', sortValue: (c) => c.contact.lastDate || '', render: (c) => d(c.contact.lastDate) },
          { key: 'act', label: '', sort: false, render: (c) => <Link className="btn btn-sm" onClick={(e) => e.stopPropagation()} to={'/crm/messages?to=' + c.clientId + '&tp=TP-02'}>Remind</Link> }]} />}
      {tab === 'letters' && <DemandLetters />}
      {tab === 'demand' && <Card title={crm.perClient ? 'Demands raised before Accord' : 'Demand calls raised'} pad={false} actions={crm.builtTo != null && <Badge tone="info">{'Built to ' + (crm.builtTo === 0 ? 'ground' : ordinal(crm.builtTo)) + ' floor slab'}</Badge>}>
        <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Call</th><th>Stage</th><th className="right">%</th><th className="right">Cumulative</th><th>Raised</th><th>Due</th>{!crm.perClient && <th>Letters</th>}</tr></thead>
          <tbody>{crm.cum.map((k) => <tr key={k.id}><td>{k.id} · {k.description}</td><td>{k.stage}</td><td className="right">{(k.pct * 100).toFixed(1)}%</td><td className="right">{(k.cum * 100).toFixed(1)}%</td>
            <td>{canRecordPayment(user) ? <Input type="date" style={{ width: 150 }} value={k.raisedOn || ''} onChange={(e) => { upsert('demandCalls', { ...db.demandCalls.find((x) => x.id === k.id), raisedOn: e.target.value || null }, { action: 'demand call date' }); notify(k.id + ' raised date saved') }} /> : d(k.raisedOn)}
              {k.inferred && <div className="small" style={{ color: 'var(--warn)' }}>Not recorded. Taken as no later than {d(k.raisedAt)}</div>}</td>
            <td>{d(k.due)}{k.inferred && <div className="small muted">at the latest</div>}</td>
            {!crm.perClient && <td>{canRecordPayment(user) && <RaiseLetters call={k} />}</td>}</tr>)}</tbody></table></div>
        <p className="small muted" style={{ padding: '0 16px 12px' }}>{crm.perClient ? 'Stages these calls cover count as demanded on the call date in each client\'s schedule (15 days from the booking for a later booking), unless an Accord demand letter covers them. ' : `Demand per client = (consideration − adjustment) × cumulative % × (1 + GST ${(crm.gst * 100).toFixed(0)}%). `}Due {crm.rules.dueDays} days after the call is raised. A call without a raised date is taken as raised no later than the next call that has one, so its clients show as overdue for at least that long; enter the actual date for the exact ageing.</p>
      </Card>}
      <PaymentForm open={open} onClose={(p) => { setOpen(false); if (p?.id && !p.ledger) nav('/crm/payments/receipt/' + p.id) }} />
    </Page>
  )
}

export function Receipt() {
  const { id } = useParams()
  const { db, user } = useStore()
  const crm = useCrm()
  const [qs] = useSearchParams()
  const p = db.payments.find((x) => x.id === id)
  const [edit, setEdit] = useState(() => String(qs.get('draft') || '') === 'pay:edit:' + id)
  if (!seesMoney(user)) return <Page title="Receipt" back={true}><span className="locked">Receipts are issued and shared by finance</span></Page>
  if (!p) return <Page title="Receipt not found" back={true} />
  const c = crm.byUnit[p.unit]
  if (p.ledgerOnly === 'Yes') return <Page title="Ledger entry" back={true} subtitle={`${p.unit} · ${p.towards} · ${inr(p.amount)}`} actions={canRecordPayment(user) && <Button onClick={() => setEdit(true)}>Edit entry</Button>}><div className="note info">This is a ledger entry only (for example a furniture or barter adjustment). No receipt is issued for it.</div><EditHistory p={p} />{edit && <PaymentForm open edit={p} unit={p.unit} onClose={() => setEdit(false)} />}</Page>
  return (
    <div>
      <div className="doc-tools no-print"><Link className="btn" to={c ? '/crm/clients/' + c.id : '/crm/payments'}>← Back</Link>{canRecordPayment(user) && <Button onClick={() => setEdit(true)}>Edit entry</Button>}<Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
      <ReceiptDoc p={p} crm={crm} />
      <EditHistory p={p} />
      {edit && <PaymentForm open edit={p} unit={p.unit} onClose={() => setEdit(false)} />}
    </div>
  )
}

// 2 Nov: print many receipts at once. Pick a date range (and optionally a residence), one receipt per A4 page.
export function BulkReceipts() {
  const { db, user } = useStore()
  const crm = useCrm()
  const [qs, setQs] = useSearchParams()
  const from = qs.get('from') || today().slice(0, 8) + '01', to = qs.get('to') || today(), unit = qs.get('unit') || '', all = qs.get('all') === '1'
  if (!seesMoney(user)) return <Page title="Receipts" back={true}><span className="locked">Receipts are issued and shared by finance</span></Page>
  const list = db.payments.filter((p) => p.ledgerOnly !== 'Yes' && (all || p.counted === 'Yes') && String(p.date) >= from && String(p.date) <= to && (!unit || String(p.unit) === unit)).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.receiptNo).localeCompare(String(b.receiptNo)))
  const set = (k, v) => { const n = new URLSearchParams(qs); if (v) n.set(k, v); else n.delete(k); setQs(n, { replace: true }) }
  return (
    <div>
      <div className="doc-tools no-print" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Link className="btn" to="/crm/payments">← Payments</Link>
        <label className="small">From <input type="date" className="input" value={from} onChange={(e) => set('from', e.target.value)} /></label>
        <label className="small">To <input type="date" className="input" value={to} onChange={(e) => set('to', e.target.value)} /></label>
        <label className="small">Residence <input className="input" style={{ width: 90 }} value={unit} placeholder="All" onChange={(e) => set('unit', e.target.value.trim())} /></label>
        <label className="small"><input type="checkbox" checked={all} onChange={(e) => set('all', e.target.checked ? '1' : '')} /> Include entries not counted</label>
        <span className="small muted">{list.length} receipt{list.length === 1 ? '' : 's'}</span>
        <Button variant="primary" disabled={!list.length} onClick={() => window.print()}>Print all or save as one PDF</Button>
      </div>
      {list.length ? list.map((p) => <div className="page-break" key={p.id}><ReceiptDoc p={p} crm={crm} /></div>) : <div className="empty no-print"><h3>No receipts in this range</h3><p>Change the dates or the residence.</p></div>}
    </div>
  )
}

function ReceiptDoc({ p, crm }) {
  const { settings, db } = useStore()
  const c = crm.byUnit[p.unit]
  const co = settings.company || {}
  const u = crm.units.find((x) => String(x.unit) === String(p.unit))
  return (
      <div className="doc">
        <DocHeader title="PAYMENT RECEIPT" sub={`${p.receiptNo || p.id} · ${d(p.date)}`} />
        {Number(p.rev) > 0 && <p className="revised">Revised · rev {p.rev} · {d(String(p.lastEditedAt || '').slice(0, 10))}</p>}
        <table><tbody>
          <tr><th style={{ width: '25%' }}>Receipt no.</th><td><b>{p.receiptNo}</b></td><th style={{ width: '20%' }}>Date</th><td>{d(p.date)}</td></tr>
          <tr><th>Received from</th><td colSpan={3}><b>{p.payer}</b>{c?.coapp ? ' & ' + c.coapp : ''}</td></tr>
          <tr><th>Client ID</th><td>{c?.clientId || '–'}</td><th>Booking ID</th><td>{c?.bookingId || '–'}</td></tr>
          <tr><th>Residence</th><td>{p.unit}{u ? ` · ${u.type} · floor ${u.floor}` : ''}</td><th>Saleable area</th><td>{u ? u.area + ' sft' : '–'}</td></tr>
          <tr><th>Total consideration</th><td colSpan={3}>{inr(p.tcOnReceipt || c?.tc)}</td></tr>
        </tbody></table>
        <div className="sec">Payment details</div>
        <table><thead><tr><th>Towards</th><th>Mode</th><th>Instrument / ref.</th><th>Dated</th><th>Bank</th><th className="right">Amount</th></tr></thead>
          <tbody><tr><td>{p.towards}</td><td>{p.mode}</td><td>{p.instrument || '–'}</td><td>{d(p.instrumentDate)}</td><td>{p.bank || '–'}</td><td className="right"><b>{inr(p.amount)}</b></td></tr>
            {Number(p.tds) > 0 && <tr><td colSpan={5}>TDS deducted under section 194-IA (Form 16B to be shared)</td><td className="right">{inr(p.tds)}</td></tr>}
            <tr className="total"><td colSpan={5}>Total received</td><td className="right">{inr(Number(p.amount) + Number(p.tds || 0))}</td></tr></tbody></table>
        <div className="words">Rupees {words(Number(p.amount) + Number(p.tds || 0))} only</div>
        {(() => { const L = crm.letters.find((x) => x.id === p.demandLetter); const st = letterStatus(p, L, db.payments); if (!L || !st) return null
          return <div className="part-pay"><b>{st.full ? 'Against' : 'Part payment against'} demand letter {L.id}</b> dated {d(L.date)} ({L.stage || L.callId}) for {inr(L.amount)}.
            {st.full ? ` With this receipt the letter is paid in full${st.of > 1 ? ` (${st.part} of ${st.of} receipts)` : ''}.` : ` This is part payment ${st.part}${st.of > 1 ? ' of ' + st.of + ' so far' : ''}; received against the letter so far ${inr(st.now)}, balance due ${inr(st.balance)}.`}</div> })()}
        {p.thirdParty && <p className="small">Paid on behalf of the allottee by {p.thirdParty}; third-party payment declaration on file.</p>}
        <div className="sec">Notes</div>
        <ol>{(settings.receiptNotes || []).map((x, i) => <li key={i}>{x}</li>)}</ol>
        <div className="sec">Bank details for future payments</div>
        <p style={{ margin: 0 }}>{co.name} · {co.bank} · A/c {co.account} · IFSC {co.ifsc} · {co.branch}</p>
        <div className="sign"><div>Allottee</div><div style={{ textAlign: 'right' }}>For {co.name}<br />Authorised signatory</div></div>
        <div className="foot">{co.address} · {co.contact} · This is a computer-generated receipt from Accord.</div>
      </div>
  )
}

// 7 Nov: every change made to this entry, on screen only (not printed on the receipt)
function EditHistory({ p }) {
  const { db } = useStore()
  const list = (db.paymentEdits || []).filter((x) => x.paymentId === p.id).sort((a, b) => String(b.at).localeCompare(String(a.at)))
  if (!list.length) return null
  const parse = (x) => { try { return typeof x.changes === 'string' ? JSON.parse(x.changes) : x.changes || [] } catch (e) { return [] } }
  return <Card title="Change history" className="no-print">{list.map((x) => <div key={x.id} className="check-row" style={{ alignItems: 'flex-start' }}>
    <span><b>{x.by}</b> · {d(String(x.at).slice(0, 10))} {String(x.at).slice(11, 16)}{x.high === 'Yes' && <> <Badge tone="bad">High</Badge></>}<div className="small">{diffText(parse(x).map((c) => ({ label: c.label || c.field, ...c })))}</div><div className="small muted">Reason: {x.reason}</div></span></div>)}</Card>
}

function PaymentEdits() {
  const { db } = useStore()
  const nav = useNavigate()
  const parse = (x) => { try { return typeof x.changes === 'string' ? JSON.parse(x.changes) : x.changes || [] } catch (e) { return [] } }
  const rows = (db.paymentEdits || []).map((x) => ({ ...x, what: parse(x).map((c) => c.label || c.field).join(', '), day: String(x.at).slice(0, 10) }))
  return <DataTable rows={rows} initialSort={{ key: 'at', dir: 'desc' }} searchKeys={['receiptNo', 'client', 'by', 'reason', (x) => String(x.unit)]} onRowClick={(x) => nav('/crm/payments/receipt/' + x.paymentId)}
    filters={[{ key: 'by', label: 'Changed by' }, { key: 'high', label: 'High' }]} empty="No payment entry has been edited."
    columns={[{ key: 'at', label: 'When', render: (x) => <span className="nowrap">{d(x.day)} {String(x.at).slice(11, 16)}</span> }, { key: 'receiptNo', label: 'Receipt', render: (x) => x.receiptNo || x.paymentId }, { key: 'unit', label: 'Flat' }, { key: 'client', label: 'Client' },
      { key: 'by', label: 'Changed by' }, { key: 'what', label: 'Fields', render: (x) => <span className="small">{x.what}</span> }, { key: 'reason', label: 'Reason', render: (x) => <span className="small">{x.reason}</span> },
      { key: 'high', label: '', render: (x) => x.high === 'Yes' ? <Badge tone="bad">High</Badge> : null }]} />
}

// 7 Nov: raise letters from each client's own schedule. A completed, certified stage makes the instalment demandable;
// one letter per client covers every demandable instalment not yet on a letter (catch-up included).
function RaiseDueLetters() {
  const { db, user, upsert, notify, settings } = useStore()
  const crm = useCrm()
  const R = crm.rules
  const live = crm.clients.filter((c) => !NON_BILLED.includes(c.status) && c.status !== 'Transferred' && !c.directoryOnly && Number(c.tc) > 0)
  const todo = live.map((c) => ({ c, rows: (c.schedule || []).filter((r) => r.state === 'Letter not sent' || (r.ready && !r.letter && !r.blocked && r.balance > 0.5 && r.trigger !== 'booking' && r.trigger !== 'agreement')) })).filter((x) => x.rows.length)
  const blocked = live.map((c) => ({ c, rows: (c.schedule || []).filter((r) => r.blocked && r.balance > 0.5) })).filter((x) => x.rows.length)
  const uncert = (db.clpStages || []).filter((x) => x.status === 'Completed' && !x.certNo && !x.certUrl && x.certWaived !== 'Yes')
  const [pick, setPick] = useState(() => new Set(todo.map((x) => x.c.bookingId)))
  const [date, setDate] = useState(today())
  const raise = () => {
    let no = nextLetterNo(db.demandLetters || []), k = 0
    const due = addDays(date, Number(R.dueDays || 15))
    todo.filter((x) => pick.has(x.c.bookingId)).forEach(({ c, rows }) => {
      const amount = rows.reduce((a, r) => a + r.amount, 0), credit = rows.reduce((a, r) => a + r.paid, 0), pct = rows.reduce((a, r) => a + r.pct, 0)
      const last = rows[rows.length - 1], st = (db.clpStages || []).find((x) => x.id === last.clpStage) || {}
      upsert('demandLetters', { id: 'DL-' + String(no++).padStart(3, '0'), date, rows: rows.map((r) => r.key), stage: last.stage + (rows.length > 1 ? ` (with ${rows.length - 1} earlier instalment${rows.length > 2 ? 's' : ''})` : ''),
        unit: c.unit, bookingId: c.bookingId, clientId: c.clientId, name: c.name, pct, basis: c.basis, gst: crm.gst, amount, credit, dueDate: due, status: 'Raised', by: user.name,
        certNo: st.certNo || '', certDate: st.certDate || '', certifiedBy: st.certifiedBy || '' }, { silent: true }); k++ })
    notify(`${k} demand letter${k === 1 ? '' : 's'} raised, due ${d(due)}`)
  }
  return <>
    {uncert.length > 0 && <div className="note warn small">{uncert.length} completed stage{uncert.length === 1 ? ' has' : 's have'} no completion certificate yet ({uncert.map((x) => x.stage).slice(0, 4).join(', ')}{uncert.length > 4 ? '…' : ''}). Attach the architect's certificate in Building and parking → Construction before letters go out for {uncert.length === 1 ? 'it' : 'them'}.</div>}
    <Card title={`Instalments ready for a demand letter · ${todo.length} client${todo.length === 1 ? '' : 's'}`} actions={todo.length > 0 && <span className="row gap-s"><label className="small">Letter date <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></label><Button variant="primary" disabled={!pick.size} onClick={raise}>Raise {[...pick].filter((b) => todo.some((x) => x.c.bookingId === b)).length} letters</Button></span>} pad={false}>
      {!todo.length ? <p className="muted" style={{ padding: 16, margin: 0 }}>Nothing to raise. When a construction stage is marked completed with its certificate, the instalment of every client on that stage appears here.</p> :
      <table className="table dense"><thead><tr><th></th><th>Flat</th><th>Client</th><th>Instalments</th><th className="right">Amount</th><th className="right">Already received</th><th className="right">To demand</th></tr></thead>
        <tbody>{todo.map(({ c, rows }) => <tr key={c.bookingId}><td><input type="checkbox" checked={pick.has(c.bookingId)} onChange={(e) => { const nx = new Set(pick); if (e.target.checked) nx.add(c.bookingId); else nx.delete(c.bookingId); setPick(nx) }} aria-label={'Raise for ' + c.name} /></td>
          <td className="mono">{c.unit}</td><td>{c.name}</td><td className="small">{rows.map((r) => r.stage).join(', ')}</td><td className="right">{inr(rows.reduce((a, r) => a + r.amount, 0))}</td><td className="right">{inr(rows.reduce((a, r) => a + r.paid, 0))}</td><td className="right"><b>{inr(rows.reduce((a, r) => a + r.balance, 0))}</b></td></tr>)}</tbody></table>}
      <p className="small muted" style={{ padding: '0 16px 12px' }}>Due {R.dueDays} days from the letter date. Interest after the due date{currentRate(R) ? ` at ${currentRate(R)}% a year` : ' (enter the rate in Admin → Settings → Payment schedule)'}.</p>
    </Card>
    {blocked.length > 0 && <Card title="Waiting, cannot be demanded yet" pad={false}><table className="table dense"><thead><tr><th>Flat</th><th>Client</th><th>Why</th></tr></thead>
      <tbody>{blocked.map(({ c, rows }) => <tr key={c.bookingId}><td className="mono">{c.unit}</td><td>{c.name}</td><td className="small">{[...new Set(rows.map((r) => r.blocked))].join(' · ')}</td></tr>)}</tbody></table></Card>}
  </>
}

// 7 Nov: money expected by month: firm dues and the projected dues from the planned construction dates
function Forecast() {
  const crm = useCrm()
  const live = crm.clients.filter((c) => !NON_BILLED.includes(c.status) && c.status !== 'Transferred' && !c.directoryOnly)
  const m = {}
  live.forEach((c) => (c.schedule || []).forEach((r) => { if (r.balance <= 0.5) return
    const when = r.due || r.projected; if (!when) return
    const k = String(when).slice(0, 7), loan = /loan/i.test(c.funding || '')
    m[k] = m[k] || { k, firm: 0, projected: 0, self: 0, loan: 0, n: new Set() }
    if (r.due) m[k].firm += r.balance; else m[k].projected += r.balance
    m[k][loan ? 'loan' : 'self'] += r.balance; m[k].n.add(c.unit) }))
  const rows = Object.values(m).sort((a, b) => a.k.localeCompare(b.k))
  const unplanned = (crm.clients[0]?.schedule || []).filter((r) => !r.ready && !r.projected && r.trigger === 'stage').length
  return <Card title="Collections forecast" pad={false}>
    {!rows.length ? <p className="muted" style={{ padding: 16, margin: 0 }}>Nothing to forecast yet. Enter planned dates for the construction stages in Building and parking → Construction.</p> :
    <table className="table"><thead><tr><th>Month</th><th className="right">Due (letters sent)</th><th className="right">Projected (planned stages)</th><th className="right">Self-funded</th><th className="right">Bank loan</th><th className="right">Clients</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.k}><td>{new Date(r.k + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}{r.k < today().slice(0, 7) ? ' (overdue)' : ''}</td><td className="right">{inr(r.firm)}</td><td className="right">{inr(r.projected)}</td><td className="right">{inr(r.self)}</td><td className="right">{inr(r.loan)}</td><td className="right">{r.n.size}</td></tr>)}</tbody></table>}
    {unplanned > 0 && <p className="small muted" style={{ padding: '0 16px 12px' }}>{unplanned} construction stages have no planned date, so they are not in the forecast.</p>}
  </Card>
}

// 7 Nov: before switching to per-client schedules, compare what each client owes both ways
function ScheduleCheck() {
  const { settings, setSettings, user, notify } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const live = crm.clients.filter((c) => !NON_BILLED.includes(c.status) && c.status !== 'Transferred' && !c.directoryOnly)
  const rows = live.map((c) => { const per = c.sched?.demanded || 0, old = c.legacyDemand || 0, pending = (c.sched?.pendingLetter || []).reduce((a, r) => a + r.balance, 0)
    const gaps = [!c.bookingDate && 'booking date', c.agreement === 'Registered' && !c.agreementDate && 'agreement date', !['Registered'].includes(c.agreement) && 'agreement not registered', !Number(c.tc) && 'consideration'].filter(Boolean)
    return { ...c, per, old, pending, diff: per - old, gaps: gaps.join(', ') } })
  const diffs = rows.filter((r) => Math.abs(r.diff) > 1)
  return <>
    <div className="note info small">Under per-client schedules an instalment is demanded only once its demand letter is sent, so the gap below is mostly stages finished but not yet lettered (that column). Per-client schedules use the construction stages (Building and parking → Construction) as the plan, each client's booking and agreement dates, and the demand letters. A stage counts once it is marked completed <b>and</b> its certificate is attached. Mode now: <b>{crm.perClient ? 'per-client schedules' : 'project-wide demand calls'}</b>.
      {user.appRole === 'admin' && <> <Button size="sm" onClick={() => { setSettings({ scheduleMode: crm.perClient ? 'calls' : 'client' }); notify(crm.perClient ? 'Back to project-wide demand calls' : 'Per-client schedules switched on') }}>{crm.perClient ? 'Switch back to demand calls' : 'Switch to per-client schedules'}</Button></>}</div>
    <Grid cols={3}>
      <Stat label="Clients checked" value={rows.length} />
      <Stat label="Different demand" value={diffs.length} tone={diffs.length ? 'warn' : 'good'} />
      <Stat label="Missing dates or details" value={rows.filter((r) => r.gaps).length} tone={rows.some((r) => r.gaps) ? 'bad' : 'good'} />
    </Grid>
    <DataTable rows={rows} initialSort={{ key: 'diff', dir: 'desc' }} searchKeys={['name', (c) => String(c.unit)]} onRowClick={(c) => nav('/crm/clients/' + c.id)}
      views={[{ value: 'diff', label: 'Different', test: (r) => Math.abs(r.diff) > 1 }, { value: 'gaps', label: 'Missing details', test: (r) => !!r.gaps }, { value: 'all', label: 'All' }]} defaultView="diff"
      columns={[{ key: 'unit', label: 'Flat' }, { key: 'name', label: 'Client' }, { key: 'funding', label: 'Funding' }, { key: 'agreement', label: 'Agreement' },
        { key: 'old', label: 'Demand (calls)', align: 'right', render: (r) => inr(r.old) }, { key: 'per', label: 'Demand (own schedule)', align: 'right', render: (r) => inr(r.per) },
        { key: 'pending', label: 'Stage done, letter not sent', align: 'right', render: (r) => r.pending > 0 ? <span style={{ color: 'var(--warn)' }}>{inr(r.pending)}</span> : '–' },
        { key: 'diff', label: 'Difference', align: 'right', sortValue: (r) => Math.abs(r.diff), render: (r) => <b style={{ color: Math.abs(r.diff) > 1 ? 'var(--warn)' : undefined }}>{inr(r.diff)}</b> },
        { key: 'gaps', label: 'Missing', render: (r) => r.gaps ? <span className="small missing">{r.gaps}</span> : <span className="small muted">–</span> }]} />
  </>
}

// 5 Nov: demand letters. Raising a demand call makes one letter per live booking, each with its own code (DL-001…).
// Receipts are coded against a letter; the receipt says when it is a part payment and what is still due.
const nextLetterNo = (letters) => Math.max(0, ...letters.map((x) => Number(String(x.id).replace(/\D/g, '')) || 0)) + 1
function RaiseLetters({ call }) {
  const { db, user, upsert, notify, settings } = useStore()
  const crm = useCrm()
  const have = new Set((db.demandLetters || []).filter((x) => x.callId === call.id).map((x) => String(x.unit)))
  const todo = crm.clients.filter((c) => !NON_BILLED.includes(c.status) && !['Transferred'].includes(c.status) && !c.directoryOnly && !have.has(String(c.unit)) && Number(c.tc) > 0)
  if (!todo.length) return <span className="small muted">{have.size ? have.size + ' raised' : 'No live bookings'}</span>
  const raise = () => {
    const date = call.raisedOn || today(), due = new Date(date); due.setDate(due.getDate() + Number(settings.dueDays || 15))
    let no = nextLetterNo(db.demandLetters || [])
    if (!call.raisedOn) upsert('demandCalls', { ...db.demandCalls.find((x) => x.id === call.id), raisedOn: date }, { silent: true })
    // money already received before demand letters existed (receipts not coded to any letter) first covers the earlier
    // stages; whatever is left over counts towards this letter, so old clients are not asked twice
    const k = crm.cum.findIndex((x) => x.id === call.id), cumBefore = k > 0 ? crm.cum[k - 1].cum : 0
    todo.forEach((c) => { const basis = Number(c.tc || 0) - Number(c.adjustment || 0)
      const amount = Math.round(basis * Number(call.pct) * (1 + crm.gst))
      const unlinked = db.payments.filter((p) => String(p.unit) === String(c.unit) && p.counted === 'Yes' && !p.demandLetter && p.ledgerOnly !== 'Yes').reduce((a, p) => a + Number(p.amount || 0) + Number(p.tds || 0), 0)
      const credit = Math.round(Math.min(amount, Math.max(0, unlinked - basis * cumBefore * (1 + crm.gst))))
      upsert('demandLetters', { credit, id: 'DL-' + String(no++).padStart(3, '0'), date, callId: call.id, stage: call.description || call.stage, unit: c.unit, bookingId: c.bookingId, clientId: c.clientId, name: c.name,
        pct: call.pct, basis, gst: crm.gst, amount, dueDate: due.toISOString().slice(0, 10), status: 'Raised', by: user.name }, { silent: true }) })
    notify(`${todo.length} demand letter${todo.length === 1 ? '' : 's'} raised for ${call.id}`)
  }
  return <Button size="sm" onClick={raise}>Raise {todo.length} letter{todo.length === 1 ? '' : 's'}{have.size ? ` (${have.size} done)` : ''}</Button>
}

function DemandLetters() {
  const crm = useCrm()
  const nav = useNavigate()
  const tone = { Paid: 'good', 'Part paid': 'warn', Overdue: 'bad', Raised: 'info', Withdrawn: 'muted' }
  const dates = [...new Set(crm.letters.filter((x) => x.state !== 'Withdrawn').map((x) => x.date))].sort().reverse().slice(0, 4)
  return <>{dates.length > 0 && <div className="row gap-s" style={{ marginBottom: 10 }}><span className="small muted">Print every letter dated</span>{dates.map((dt) => <Link key={dt} className="btn btn-sm" to={'/crm/payments/demand-letters/print?date=' + dt}>{d(dt)}</Link>)}</div>}
  <DataTable rows={crm.letters} initialSort={{ key: 'id', dir: 'desc' }} searchKeys={['id', 'name', (x) => String(x.unit), 'callId']} filters={[{ key: 'state', label: 'Status' }, { key: 'callId', label: 'Demand call' }]}
    onRowClick={(x) => nav('/crm/payments/demand/' + x.id)} empty="No demand letters yet. Raise them from the Demand calls tab."
    columns={[{ key: 'id', label: 'Letter', render: (x) => <b className="mono">{x.id}</b> }, { key: 'date', label: 'Dated', render: (x) => d(x.date) }, { key: 'unit', label: 'Flat' }, { key: 'name', label: 'Client' },
      { key: 'callId', label: 'Call', render: (x) => <span className="small">{x.callId}</span> }, { key: 'amount', label: 'Demanded', align: 'right', render: (x) => inr(x.amount) },
      { key: 'paid', label: 'Received', align: 'right', render: (x) => <span>{inr(x.paid)}{Number(x.credit) > 0 && <div className="small muted">+ {inr(x.credit)} earlier</div>}</span> }, { key: 'balance', label: 'Balance', align: 'right', render: (x) => <b>{inr(x.balance)}</b> },
      { key: 'dueDate', label: 'Due', render: (x) => d(x.dueDate) }, { key: 'state', label: 'Status', render: (x) => <Badge tone={tone[x.state]}>{x.state}</Badge> },
      { key: 'sentAt', label: 'Sent', render: (x) => x.sentAt ? <span className="small">{d(String(x.sentAt).slice(0, 10))}{x.sentVia ? ' · ' + x.sentVia : ''}</span> : <Badge tone="warn">Not sent</Badge> }]} /></>
}

// 7 Nov: the demand letter, from the proposed draft (Demand_Letter_Draft_-_Proposed.docx), corrected:
// it asks for the instalment due (not the whole balance), prints a fixed due date, the interest rate, the stage
// certificate, earlier arrears and receipts, and can list several flats of one client in one letter.
export function DemandLetter() {
  const { id } = useParams()
  const { db, user, upsert, notify, sendEmail, backend } = useStore()
  const crm = useCrm()
  const L = crm.letters.find((x) => x.id === id)
  if (!seesMoney(user)) return <Page title="Demand letter" back={true}><span className="locked">Demand letters are issued by finance</span></Page>
  if (!L) return <Page title="Demand letter not found" back={true} />
  const c = crm.byUnit[L.unit]
  const same = c ? crm.letters.filter((x) => x.id !== L.id && x.state !== 'Withdrawn' && x.date === L.date && crm.byUnit[x.unit] && crm.byUnit[x.unit].name === c.name && String(crm.byUnit[x.unit].unit) !== String(c.unit)) : []
  const rawL = () => db.demandLetters.find((x) => x.id === L.id)
  const markSent = (via) => upsert('demandLetters', { ...rawL(), sentAt: rawL().sentAt || new Date().toISOString(), sentVia: [rawL().sentVia, via].filter(Boolean).join(', ') }, { silent: true })
  const email = async () => {
    if (!c?.email) return notify('No e-mail on file for this client', 'bad')
    try { await sendEmail({ to: c.email, subject: `Demand letter ${L.id} · Yamuna Sky City · flat ${L.unit}`, body: letterText(L, c, crm, db), recordId: c.clientId }); markSent('e-mail'); logIt('Email') ; notify('Sent to ' + c.email) } catch (e) { notify(e.message, 'bad') }
  }
  const logIt = (mode) => c && upsert('interactions', { id: 'I-' + Date.now().toString(36), date: today(), time: new Date().toTimeString().slice(0, 5), type: 'Client', recordId: c.clientId, recordName: c.name, mode, purpose: 'Demand letter', by: user.name, summary: `Demand letter ${L.id} sent (${inr(L.balance)} due ${d(L.dueDate)})`, status: 'Done' }, { silent: true })
  return <div>
    <div className="doc-tools no-print"><Link className="btn" to="/crm/payments?tab=letters">← Demand letters</Link>{c && <Link className="btn" to={'/crm/clients/' + c.id}>Client 360</Link>}
      {canRecordPayment(user) && L.state !== 'Withdrawn' && <Button onClick={() => { upsert('demandLetters', { ...rawL(), status: 'Withdrawn' }); notify(L.id + ' withdrawn') }}>Withdraw</Button>}
      {same.length > 0 && <Link className="btn" to={'/crm/payments/demand-combined?ids=' + [L.id, ...same.map((x) => x.id)].join(',')}>Combined letter ({same.length + 1} flats)</Link>}
      {c?.phone && <a className="btn" href={waLink(c.whatsapp || c.phone, letterText(L, c, crm, db))} target="_blank" rel="noreferrer" onClick={() => { markSent('WhatsApp'); logIt('WhatsApp') }}>WhatsApp</a>}
      {backend && <Button onClick={email}>E-mail</Button>}
      <Button variant="primary" onClick={() => { markSent('print'); window.print() }}>Print or save as PDF</Button></div>
    <DemandLetterDoc letters={[L]} />
  </div>
}
export function CombinedLetters() {
  const { user } = useStore()
  const crm = useCrm()
  const [qs] = useSearchParams()
  const ids = String(qs.get('ids') || '').split(',').filter(Boolean)
  const list = crm.letters.filter((x) => ids.includes(x.id))
  if (!seesMoney(user)) return <Page title="Demand letter" back={true}><span className="locked">Demand letters are issued by finance</span></Page>
  if (!list.length) return <Page title="Demand letters not found" back={true} />
  return <div><div className="doc-tools no-print"><Link className="btn" to={'/crm/payments/demand/' + list[0].id}>← {list[0].id}</Link><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div><DemandLetterDoc letters={list} /></div>
}
// 7 Nov: print every letter of one demand (one per A4 page)
export function BulkLetters() {
  const { user } = useStore()
  const crm = useCrm()
  const [qs] = useSearchParams()
  const date = qs.get('date') || '', call = qs.get('call') || ''
  if (!seesMoney(user)) return <Page title="Demand letters" back={true}><span className="locked">Demand letters are issued by finance</span></Page>
  const list = crm.letters.filter((x) => x.state !== 'Withdrawn' && (!date || x.date === date) && (!call || x.callId === call)).sort((a, b) => Number(a.unit) - Number(b.unit))
  return <div><div className="doc-tools no-print"><Link className="btn" to="/crm/payments?tab=letters">← Demand letters</Link><span className="small muted">{list.length} letters{date ? ' dated ' + d(date) : ''}{call ? ' · ' + call : ''}</span><Button variant="primary" disabled={!list.length} onClick={() => window.print()}>Print all or save as one PDF</Button></div>
    {list.map((L) => <div className="page-break" key={L.id}><DemandLetterDoc letters={[L]} /></div>)}</div>
}

function letterText(L, c, crm, db) {
  const co = (db.settings[0] || {}).company || {}
  return `Dear ${c.title ? c.title + ' ' : ''}${String(c.name || '').split(' ')[0]},\n\nDemand letter ${L.id} dated ${d(L.date)} for flat ${L.unit}, Yamuna Sky City: ${L.stage || L.callId}.\nAmount demanded under this notice: ${inr(L.balance)}, payable on or before ${d(L.dueDate)}.\nPlease quote ${L.id} and the flat number in the payment narration.\n\n${co.name || ''}\n${co.bank || ''} · A/c ${co.account || ''} · IFSC ${co.ifsc || ''}`
}

function DemandLetterDoc({ letters }) {
  const { db, settings } = useStore()
  const crm = useCrm()
  const R = crm.rules, T = R.demandLetter
  const co = settings.company || {}
  const L0 = letters[0]
  const c = crm.byUnit[L0.unit]
  const rate = currentRate(R)
  const cert = (L) => { const rows = Array.isArray(L.rows) ? L.rows : []; const st = (db.clpStages || []).filter((x) => rows.includes(x.id) || x.stage === L.stage).filter((x) => x.certNo).slice(-1)[0]
    return st ? `, as certified by ${st.certifiedBy || 'the project architect'} on ${d(st.certDate)} (certificate ${st.certNo})` : (L.certNo ? `, as certified by ${L.certifiedBy || 'the project architect'} on ${d(L.certDate)} (certificate ${L.certNo})` : '') }
  // per flat: this demand, earlier unpaid demands and interest on them, receipts to date
  const flats = letters.map((L) => {
    const cl = crm.byUnit[L.unit] || {}
    const sched = cl.schedule || []
    const mine = new Set(Array.isArray(L.rows) ? L.rows : [])
    const arrearRows = sched.filter((r) => r.due && r.due < L.date && r.balance > 0.5 && !mine.has(r.key) && r.letter !== L.id)
    const arrears = crm.perClient ? arrearRows.reduce((a, r) => a + r.balance, 0) : 0
    const intr = crm.perClient && rate ? lateInterest(sched.filter((r) => r.due && r.due < L.date), (cl.payments || []), R, L.date).total : 0
    const base = Number(L.amount) ? Math.round(Number(L.amount) / (1 + Number(L.gst || 0))) : 0
    const received = (cl.payments || []).filter((p) => p.counted === 'Yes' && p.ledgerOnly !== 'Yes').reduce((a, p) => a + Number(p.amount || 0) + Number(p.tds || 0), 0)
    const u = crm.units.find((x) => String(x.unit) === String(L.unit))
    return { L, c: cl, u, base, gstAmt: Number(L.amount) - base, arrears, intr, received, payable: L.balance + arrears + intr }
  })
  const total = flats.reduce((a, f) => a + f.payable, 0)
  const units = letters.map((L) => L.unit).join(' & ')
  const dueDate = letters.map((L) => L.dueDate).sort()[0]
  const map = { units, project: 'Yamuna Sky City', location: co.location || 'Kulai, Mangalore', company: co.name, stage: [...new Set(letters.map((L) => L.stage || L.callId))].join('; '), cert: cert(L0),
    dueDate: d(dueDate), dueDays: R.dueDays, letterNo: letters.map((L) => L.id).join(', '), rate: rate ? ` (currently ${rate}% per annum, being State Bank of India's highest MCLR plus 2%)` : '' }
  const big = (c?.tc || 0) >= 5000000
  return (
    <div className="doc demand-doc">
      <DocHeader title="DEMAND LETTER" sub={`${letters.map((L) => L.id).join(' · ')} · ${d(L0.date)}`} />
      {(co.cin || co.regOffice || co.crmEmail) && <p className="small" style={{ margin: '0 0 8px' }}>{[co.cin && 'CIN ' + co.cin, co.regOffice && 'Registered office: ' + co.regOffice, co.crmEmail, co.contact].filter(Boolean).join(' · ')}</p>}
      <table><tbody>
        <tr><th style={{ width: '22%' }}>Demand letter no.</th><td><b>{letters.map((L) => L.id).join(', ')}</b></td><th style={{ width: '14%' }}>Date</th><td>{d(L0.date)}</td></tr>
        <tr><th>Project</th><td>Yamuna Sky City, {co.location || 'Kulai, Mangalore'}</td><th>K-RERA no.</th><td className="small">{co.rera || '–'}</td></tr>
        <tr><th>Client ID</th><td>{letters.map((L) => L.clientId).filter(Boolean).join(', ') || '–'}</td><th>Booking ID</th><td>{letters.map((L) => L.bookingId).filter(Boolean).join(', ') || '–'}</td></tr>
      </tbody></table>
      <p>To,<br /><b>{c?.title ? c.title + ' ' : ''}{L0.name}</b>{c?.coapp ? <> &amp; {c.coapp}</> : null}<br />{c?.address || ''}</p>
      <p><b>Subject: {fillTemplate(T.subject, map)}</b></p>
      <p><b>Reference:</b> {c?.agreementDate ? `Agreement for Sale dated ${d(c.agreementDate)}` : c?.bookingDate ? `Booking Application Form dated ${d(c.bookingDate)}` : 'Your booking'}{flats.map((f) => f.u ? ` · Flat ${f.L.unit} (${f.u.type}, floor ${f.u.floor})` : ` · Flat ${f.L.unit}`).join('')}</p>
      <p>Dear {c?.title ? c.title + ' ' : 'Sir / Madam'}{c?.title ? String(L0.name || '').split(' ')[0] : ''},</p>
      <p>{fillTemplate(T.body, map)}</p>
      <div className="sec">Payment summary</div>
      {flats.map((f) => <table key={f.L.id} style={{ marginBottom: 8 }}><tbody>
        {flats.length > 1 && <tr><th colSpan={2}>Flat {f.L.unit} · {f.L.id}</th></tr>}
        <tr><th style={{ width: '62%' }}>Total consideration (agreement value less adjustments)</th><td className="right">{inr(f.L.basis)}</td></tr>
        <tr><th>Instalment for this milestone ({(Number(f.L.pct) * 100).toFixed(1)}%)</th><td className="right">{inr(f.base)}</td></tr>
        <tr><th>GST ({(Number(f.L.gst) * 100).toFixed(0)}%)</th><td className="right">{inr(f.gstAmt)}</td></tr>
        <tr className="total"><th>Amount demanded under this notice</th><td className="right"><b>{inr(f.L.amount)}</b></td></tr>
        {Number(f.L.credit) > 0 && <tr><th>Already received, set against this instalment</th><td className="right">− {inr(f.L.credit)}</td></tr>}
        {f.L.paid > 0 && <tr><th>Received against this letter so far</th><td className="right">− {inr(f.L.paid)}</td></tr>}
        {f.arrears > 0 && <tr><th>Earlier demands still unpaid</th><td className="right">{inr(f.arrears)}</td></tr>}
        {f.intr > 0 && <tr><th>Interest on late payment of earlier demands (to {d(f.L.date)})</th><td className="right">{inr(f.intr)}</td></tr>}
        <tr className="total"><th>Total payable by {d(f.L.dueDate)}</th><td className="right"><b>{inr(f.payable)}</b></td></tr>
        <tr><th>Received to date (all receipts, including TDS)</th><td className="right">{inr(f.received)}</td></tr>
        <tr><th>Balance of consideration after this demand</th><td className="right">{inr(Math.max(0, Number(f.L.basis) * (1 + Number(f.L.gst || 0)) - f.received - f.payable))}</td></tr>
      </tbody></table>)}
      {flats.length > 1 && <table><tbody><tr className="total"><th style={{ width: '62%' }}>Total payable for all flats</th><td className="right"><b>{inr(total)}</b></td></tr></tbody></table>}
      <div className="words">Rupees {words(total)} only</div>
      <p>{fillTemplate(T.payNote, map)}</p>
      <div className="sec">Bank details</div>
      <table><tbody>
        <tr><th style={{ width: '30%' }}>Beneficiary</th><td>{co.beneficiary || co.name}</td></tr>
        <tr><th>Account number</th><td>{co.account}</td></tr><tr><th>Bank and branch</th><td>{co.bank}{co.branch ? ', ' + co.branch : ''}</td></tr><tr><th>IFSC</th><td>{co.ifsc}</td></tr>
      </tbody></table>
      {big && <p className="small">{T.tdsNote}</p>}
      <p className="small">{fillTemplate(T.complianceNote, map)}</p>
      <p className="small">{T.disregardNote}</p>
      {(T.contactName || T.contactPhone) && <p className="small">For any clarification, please contact {[T.contactName, T.contactPhone, co.crmEmail].filter(Boolean).join(', ')}.</p>}
      <p style={{ marginBottom: 0 }}>Thanking you,<br />Yours faithfully,</p>
      <div className="sign"><div /><div style={{ textAlign: 'right' }}>For {co.name}<br /><br />{T.signatoryName ? T.signatoryName + ', ' : ''}{T.signatoryDesignation || 'Authorised Signatory'}</div></div>
      {letters.some((L) => /loan/i.test(crm.byUnit[L.unit]?.funding || '')) && <p className="small">Copy to: {[...new Set(letters.map((L) => crm.byUnit[L.unit]?.loanBank).filter(Boolean))].join(', ') || 'the lending bank'}</p>}
      <div className="foot">{co.address} · {co.contact} · Computer-generated demand letter from Accord.</div>
    </div>
  )
}
