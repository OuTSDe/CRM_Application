import React, { useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, letterStatus, NON_BILLED } from '../../lib/calc.js'
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
      actions={<><Link className="btn" to="/crm/payments/receipts">Print receipts in bulk</Link>{canRecordPayment(user) ? <Button variant="primary" onClick={() => setOpen(true)}>Record payment</Button> : <span className="locked">Recording is with finance</span>}</>}>
      <Grid cols={4}>
        <Stat label="Counted receipts" value={lakh(counted.reduce((s, p) => s + Number(p.amount || 0), 0))} sub={`${counted.length} entries`} tone="good" />
        <Stat label="This month" value={lakh(counted.filter((p) => String(p.date).startsWith(m)).reduce((s, p) => s + Number(p.amount || 0), 0))} sub={m} tone="teal" />
        <Stat label="Outstanding" value={lakh(live.reduce((s, c) => s + Math.max(0, c.outstanding), 0))} sub={`${live.filter((c) => c.outstanding > 0).length} clients`} tone="bad" />
        <Stat label="Not counted" value={db.payments.length - counted.length} sub="duplicates, bounced, on hold" tone="warn" />
      </Grid>
      <div className="tabs" role="tablist">{[['ledger', 'Ledger'], ['due', 'Outstanding by client'], ['demand', 'Demand calls'], ['letters', 'Demand letters']].map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} className={'tab' + (tab === v ? ' on' : '')} onClick={() => setTab(v)}>{l}</button>)}</div>
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
      {tab === 'letters' && <DemandLetters />}
      {tab === 'demand' && <Card title="Demand calls raised" pad={false}>
        <table className="table"><thead><tr><th>Call</th><th>Stage</th><th className="right">%</th><th className="right">Cumulative</th><th>Raised</th><th>Due</th><th>Letters</th></tr></thead>
          <tbody>{crm.cum.map((k) => <tr key={k.id}><td>{k.id} · {k.description}</td><td>{k.stage}</td><td className="right">{(k.pct * 100).toFixed(1)}%</td><td className="right">{(k.cum * 100).toFixed(1)}%</td><td>{d(k.raisedOn) || <Badge tone="warn">Not set</Badge>}</td><td>{d(k.due)}</td>
            <td>{canRecordPayment(user) && <RaiseLetters call={k} />}</td></tr>)}</tbody></table>
        <p className="small muted" style={{ padding: '0 16px 12px' }}>Demand per client = (consideration − adjustment) × cumulative % × (1 + GST {(crm.gst * 100).toFixed(0)}%). Due {db.settings[0]?.dueDays || 15} days after the call is raised.</p>
      </Card>}
      <PaymentForm open={open} onClose={(p) => { setOpen(false); if (p?.id && !p.ledger) nav('/crm/payments/receipt/' + p.id) }} />
    </Page>
  )
}

export function Receipt() {
  const { id } = useParams()
  const { db, user } = useStore()
  const crm = useCrm()
  const p = db.payments.find((x) => x.id === id)
  if (!seesMoney(user)) return <Page title="Receipt" back={true}><span className="locked">Receipts are issued and shared by finance</span></Page>
  if (!p) return <Page title="Receipt not found" back={true} />
  const c = crm.byUnit[p.unit]
  if (p.ledgerOnly === 'Yes') return <Page title="Ledger entry" back={true} subtitle={`${p.unit} · ${p.towards} · ${inr(p.amount)}`}><div className="note info">This is a ledger entry only (for example a furniture or barter adjustment). No receipt is issued for it.</div></Page>
  return (
    <div>
      <div className="doc-tools no-print"><Link className="btn" to={c ? '/crm/clients/' + c.id : '/crm/payments'}>← Back</Link><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
      <ReceiptDoc p={p} crm={crm} />
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
  return <DataTable rows={crm.letters} initialSort={{ key: 'id', dir: 'desc' }} searchKeys={['id', 'name', (x) => String(x.unit), 'callId']} filters={[{ key: 'state', label: 'Status' }, { key: 'callId', label: 'Demand call' }]}
    onRowClick={(x) => nav('/crm/payments/demand/' + x.id)} empty="No demand letters yet. Raise them from the Demand calls tab."
    columns={[{ key: 'id', label: 'Letter', render: (x) => <b className="mono">{x.id}</b> }, { key: 'date', label: 'Dated', render: (x) => d(x.date) }, { key: 'unit', label: 'Flat' }, { key: 'name', label: 'Client' },
      { key: 'callId', label: 'Call', render: (x) => <span className="small">{x.callId}</span> }, { key: 'amount', label: 'Demanded', align: 'right', render: (x) => inr(x.amount) },
      { key: 'paid', label: 'Received', align: 'right', render: (x) => <span>{inr(x.paid)}{Number(x.credit) > 0 && <div className="small muted">+ {inr(x.credit)} earlier</div>}</span> }, { key: 'balance', label: 'Balance', align: 'right', render: (x) => <b>{inr(x.balance)}</b> },
      { key: 'dueDate', label: 'Due', render: (x) => d(x.dueDate) }, { key: 'state', label: 'Status', render: (x) => <Badge tone={tone[x.state]}>{x.state}</Badge> }]} />
}

export function DemandLetter() {
  const { id } = useParams()
  const { db, settings, user, upsert, notify } = useStore()
  const crm = useCrm()
  const L = crm.letters.find((x) => x.id === id)
  if (!seesMoney(user)) return <Page title="Demand letter" back={true}><span className="locked">Demand letters are issued by finance</span></Page>
  if (!L) return <Page title="Demand letter not found" back={true} />
  const c = crm.byUnit[L.unit], co = settings.company || {}, u = crm.units.find((x) => String(x.unit) === String(L.unit))
  const pays = db.payments.filter((p) => p.demandLetter === L.id && p.counted === 'Yes').sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const base = Math.round(Number(L.basis) * Number(L.pct))
  return <div>
    <div className="doc-tools no-print"><Link className="btn" to="/crm/payments?tab=letters">← Demand letters</Link>{c && <Link className="btn" to={'/crm/clients/' + c.id}>Client 360</Link>}
      {canRecordPayment(user) && L.state !== 'Withdrawn' && <Button onClick={() => { upsert('demandLetters', { ...db.demandLetters.find((x) => x.id === L.id), status: 'Withdrawn' }); notify(L.id + ' withdrawn') }}>Withdraw</Button>}
      <Button variant="primary" onClick={() => { if (!L.sentAt) upsert('demandLetters', { ...db.demandLetters.find((x) => x.id === L.id), sentAt: new Date().toISOString() }, { silent: true }); window.print() }}>Print or save as PDF</Button></div>
    <div className="doc">
      <DocHeader title="DEMAND LETTER" sub={`${L.id} · ${d(L.date)}`} />
      <p>To<br /><b>{c?.title ? c.title + ' ' : ''}{L.name}</b>{c?.coapp ? <> &amp; {c.coapp}</> : null}<br />{c?.address || ''}</p>
      <p><b>Sub: Demand for payment, residence {L.unit}{u ? ` (${u.type}, floor ${u.floor})` : ''}, Yamuna Sky City · {L.stage || L.callId}</b></p>
      <p>Dear {c?.title ? c.title + ' ' : ''}{String(L.name || '').split(' ')[0]},</p>
      <p>We are pleased to inform you that the construction of Yamuna Sky City has reached the stage <b>{L.stage || L.callId}</b>. In terms of your booking (client ID {L.clientId}, booking ID {L.bookingId}) and the agreed payment plan, the following instalment is now due:</p>
      <table><tbody>
        <tr><th style={{ width: '55%' }}>Basis (total consideration less adjustments)</th><td className="right">{inr(L.basis)}</td></tr>
        <tr><th>This instalment ({(Number(L.pct) * 100).toFixed(1)}%)</th><td className="right">{inr(base)}</td></tr>
        <tr><th>GST ({(Number(L.gst) * 100).toFixed(0)}%)</th><td className="right">{inr(Number(L.amount) - base)}</td></tr>
        <tr className="total"><th>Amount of this instalment</th><td className="right"><b>{inr(L.amount)}</b></td></tr>
        {Number(L.credit) > 0 && <tr><th>Already received earlier, set against this instalment</th><td className="right">{inr(L.credit)}</td></tr>}
        {L.paid > 0 && <tr><th>Received against this letter so far</th><td className="right">{inr(L.paid)}</td></tr>}
        {(L.paid > 0 || Number(L.credit) > 0) && <tr className="total"><th>Balance due</th><td className="right"><b>{inr(L.balance)}</b></td></tr>}
      </tbody></table>
      <div className="words">Rupees {words(L.balance)} only</div>
      <p>Kindly pay on or before <b>{d(L.dueDate)}</b>, quoting <b>{L.id}</b> with your payment. Payments received after the due date may attract interest as per the agreement. You may pay in parts; each receipt will show the amount received against this letter and the balance.</p>
      {pays.length > 0 && <><div className="sec">Received against this letter</div><table><thead><tr><th>Receipt</th><th>Date</th><th>Mode</th><th className="right">Amount</th></tr></thead>
        <tbody>{pays.map((p) => <tr key={p.id}><td>{p.receiptNo}</td><td>{d(p.date)}</td><td>{p.mode}</td><td className="right">{inr(Number(p.amount) + Number(p.tds || 0))}</td></tr>)}</tbody></table></>}
      <div className="sec">Bank details</div>
      <p style={{ margin: 0 }}>{co.name} · {co.bank} · A/c {co.account} · IFSC {co.ifsc} · {co.branch}</p>
      <div className="sign"><div /><div style={{ textAlign: 'right' }}>For {co.name}<br />Authorised signatory</div></div>
      <div className="foot">{co.address} · {co.contact} · Computer-generated demand letter from Accord.</div>
    </div>
  </div>
}
