import React, { useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canRecordPayment, seesMoney } from '../../lib/perms.js'
import { Page, Card, Button, Badge, Grid, Stat } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import PaymentForm from './PaymentForm.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import { d, inr, lakh, words, today, waLink } from '../../lib/format.js'

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
  const { db, user } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(qs.get('tab') || 'ledger')
  const counted = db.payments.filter((p) => p.counted === 'Yes')
  const m = today().slice(0, 7)
  const live = crm.clients.filter((c) => !['Cancelled', 'Transferred'].includes(c.status))
  return (
    <Page title="Payments and receipts" back="/" backLabel="Dashboard" subtitle="The payment ledger, outstanding by client, and A4 receipts ready to print or save as PDF."
      actions={canRecordPayment(user) ? <Button variant="primary" onClick={() => setOpen(true)}>Record payment</Button> : <span className="locked">Recording is with finance</span>}>
      <Grid cols={4}>
        <Stat label="Counted receipts" value={lakh(counted.reduce((s, p) => s + Number(p.amount || 0), 0))} sub={`${counted.length} entries`} tone="good" />
        <Stat label="This month" value={lakh(counted.filter((p) => String(p.date).startsWith(m)).reduce((s, p) => s + Number(p.amount || 0), 0))} sub={m} tone="teal" />
        <Stat label="Outstanding" value={lakh(live.reduce((s, c) => s + Math.max(0, c.outstanding), 0))} sub={`${live.filter((c) => c.outstanding > 0).length} clients`} tone="bad" />
        <Stat label="Not counted" value={db.payments.length - counted.length} sub="duplicates, bounced, on hold" tone="warn" />
      </Grid>
      <div className="tabs" role="tablist">{[['ledger', 'Ledger'], ['due', 'Outstanding by client'], ['demand', 'Demand calls']].map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} className={'tab' + (tab === v ? ' on' : '')} onClick={() => setTab(v)}>{l}</button>)}</div>
      {tab === 'ledger' && <DataTable rows={db.payments.map((p) => ({ ...p, client: crm.byUnit[p.unit]?.name }))} initialSort={{ key: 'date', dir: 'desc' }} searchKeys={['payer', 'client', 'receiptNo', 'instrument', (p) => String(p.unit)]}
        filters={[{ key: 'counted', label: 'Counted' }, { key: 'mode', label: 'Mode' }, { key: 'towards', label: 'Towards' }]} onRowClick={(p) => nav('/crm/payments/receipt/' + p.id)} rowClass={(p) => p.counted !== 'Yes' && 'row-off'}
        columns={[{ key: 'date', label: 'Date', render: (p) => <span className="nowrap">{d(p.date)}</span> }, { key: 'receiptNo', label: 'Receipt' }, { key: 'unit', label: 'Flat' },
          { key: 'payer', label: 'Received from', render: (p) => <div>{p.payer}{p.client && p.client !== p.payer && <div className="small muted">{p.client}</div>}</div> },
          { key: 'towards', label: 'Towards' }, { key: 'mode', label: 'Mode' }, { key: 'amount', label: 'Amount', align: 'right', render: (p) => <b>{inr(p.amount)}</b> },
          { key: 'counted', label: 'Counted', render: (p) => <Badge tone={p.counted === 'Yes' ? 'good' : 'warn'}>{p.counted}</Badge> }]} />}
      {tab === 'due' && <DataTable rows={live.filter((c) => c.outstanding > 0)} initialSort={{ key: 'outstanding', dir: 'desc' }} searchKeys={['name', (c) => String(c.unit)]} onRowClick={(c) => nav('/crm/clients/' + c.id)}
        filters={[{ key: 'age', label: 'Ageing' }, { key: 'funding', label: 'Funding' }]}
        columns={[{ key: 'unit', label: 'Flat' }, { key: 'name', label: 'Client' }, { key: 'demand', label: 'Demanded', align: 'right', render: (c) => inr(c.demand) }, { key: 'received', label: 'Received', align: 'right', render: (c) => inr(c.received) },
          { key: 'outstanding', label: 'Outstanding', align: 'right', render: (c) => <b style={{ color: 'var(--bad)' }}>{inr(c.outstanding)}</b> }, { key: 'due', label: 'Due', render: (c) => d(c.due) },
          { key: 'age', label: 'Ageing', render: (c) => <Badge tone={c.age === '60+ days' ? 'bad' : 'warn'}>{c.age}</Badge> }, { key: 'lc', label: 'Last contact', sortValue: (c) => c.contact.lastDate || '', render: (c) => d(c.contact.lastDate) },
          { key: 'act', label: '', sort: false, render: (c) => <Link className="btn btn-sm" onClick={(e) => e.stopPropagation()} to={'/crm/messages?to=' + c.clientId + '&tp=TP-02'}>Remind</Link> }]} />}
      {tab === 'demand' && <Card title="Demand calls raised" pad={false}>
        <table className="table"><thead><tr><th>Call</th><th>Stage</th><th className="right">%</th><th className="right">Cumulative</th><th>Raised</th><th>Due</th></tr></thead>
          <tbody>{crm.cum.map((k) => <tr key={k.id}><td>{k.id} · {k.description}</td><td>{k.stage}</td><td className="right">{(k.pct * 100).toFixed(1)}%</td><td className="right">{(k.cum * 100).toFixed(1)}%</td><td>{d(k.raisedOn) || <Badge tone="warn">Not set</Badge>}</td><td>{d(k.due)}</td></tr>)}</tbody></table>
        <p className="small muted" style={{ padding: '0 16px 12px' }}>Demand per client = (consideration − adjustment) × cumulative % × (1 + GST {(crm.gst * 100).toFixed(0)}%). Due {db.settings[0]?.dueDays || 15} days after the call is raised.</p>
      </Card>}
      <PaymentForm open={open} onClose={(p) => { setOpen(false); if (p?.id) nav('/crm/payments/receipt/' + p.id) }} />
    </Page>
  )
}

export function Receipt() {
  const { id } = useParams()
  const { db, settings, user } = useStore()
  const crm = useCrm()
  const p = db.payments.find((x) => x.id === id)
  if (!seesMoney(user)) return <Page title="Receipt" back={true}><span className="locked">Receipts are issued and shared by finance</span></Page>
  if (!p) return <Page title="Receipt not found" back={true} />
  const c = crm.byUnit[p.unit]
  const co = settings.company || {}
  const u = crm.units.find((x) => String(x.unit) === String(p.unit))
  return (
    <div>
      <div className="doc-tools no-print"><Link className="btn" to={c ? '/crm/clients/' + c.id : '/crm/payments'}>← Back</Link><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
      <div className="doc">
        <DocHeader title="PAYMENT RECEIPT" sub={`${p.receiptNo || p.id} · ${d(p.date)}`} />
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
        {p.thirdParty && <p className="small">Paid on behalf of the allottee by {p.thirdParty}; third-party payment declaration on file.</p>}
        <div className="sec">Notes</div>
        <ol>{(settings.receiptNotes || []).map((x, i) => <li key={i}>{x}</li>)}</ol>
        <div className="sec">Bank details for future payments</div>
        <p style={{ margin: 0 }}>{co.name} · {co.bank} · A/c {co.account} · IFSC {co.ifsc} · {co.branch}</p>
        <div className="sign"><div>Allottee</div><div style={{ textAlign: 'right' }}>For {co.name}<br />Authorised signatory</div></div>
        <div className="foot">{co.address} · {co.contact} · This is a computer-generated receipt from Accord.</div>
      </div>
    </div>
  )
}
