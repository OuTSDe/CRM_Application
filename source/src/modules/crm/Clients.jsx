import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { sessionsFor, projectsFor } from '../../lib/designLink.js'
import { experienceUrl } from '../../components/Tower.jsx'
import { useCrm } from '../../lib/calc.js'
import { canWrite, canOpen, canPage, seesAll, seesMoney, canAssignTasks, canRecordPayment } from '../../lib/perms.js'
import { META, OPS } from '../../lib/seed.js'
import { Page, Card, Button, Badge, Modal, Grid, Stat, KV, Bar, Chips, Locked } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm from '../../components/RecordForm.jsx'
import LogInteraction, { OutcomeBadge } from '../../components/LogInteraction.jsx'
import PaymentForm from './PaymentForm.jsx'
import { useBookingChanges, CancellationCard } from './BookingChanges.jsx'
import { d, inr, pct, lakh, waLink, TITLES, CITIES, fullName, salute, n, nextWhen } from '../../lib/format.js'

// Mirrors the Client Master tab: BOOKING · 1 BASIC INFORMATION · 2 BACKGROUND · 6 TEAM · UNIT & DEAL (3, 4 and 5 are worked out from the logs).
export const CLIENT_FIELDS = (team, { money = true, assign = true } = {}) => [
  { section: 'Booking', n: '0' },
  { k: 'bookingId', l: 'Booking ID', auto: true }, { k: 'clientId', l: 'Client ID', auto: true }, { k: 'unit', l: 'Unit No.', t: 'number', ro: !assign },
  assign ? { k: 'status', l: 'Booking status', t: 'select', o: 'Booking status' } : { k: 'status', l: 'Booking status', auto: true },
  { k: 'category', l: 'Customer category', t: 'select', o: 'Customer category' }, { k: 'bookingDate', l: 'Booking date', t: 'date', ro: !assign },
  { section: 'Basic information', n: '1' },
  { k: 'title', l: 'Title', t: 'select', o: TITLES, hint: 'Opens every message: Dear Dr. …' }, { k: 'name', l: 'Primary applicant', req: true }, { k: 'coapp', l: 'Co-applicant(s)' },
  { k: 'buyerType', l: 'Buyer type', t: 'select', o: 'Buyer type' },
  { k: 'phone', l: 'Mobile (primary)', t: 'tel' }, { k: 'phone2', l: 'Mobile (alternate)', t: 'tel' }, { k: 'whatsapp', l: 'WhatsApp number', t: 'tel' },
  { k: 'email', l: 'Email', t: 'email' }, { k: 'address', l: 'Correspondence address', span: 2 },
  { k: 'city', l: 'City', suggest: CITIES }, { k: 'country', l: 'State / Country' }, { k: 'residency', l: 'Residential status', t: 'select', o: 'Residential status' },
  { k: 'pan', l: 'PAN (primary)' }, { k: 'aadhaar4', l: 'Aadhaar (last 4 digits only)' }, { k: 'dob', l: 'Date of birth', t: 'date' },
  { k: 'language', l: 'Preferred language' }, { k: 'contactPref', l: 'Preferred contact mode', t: 'select', o: ['Call', 'WhatsApp', 'Email', 'In person'] },
  { section: 'Background', n: '2' },
  { k: 'purpose', l: 'Buying purpose', t: 'select', o: 'Buying purpose' }, { k: 'occupant', l: 'Who will live in the unit' }, { k: 'funding', l: 'Funding mode', t: 'select', o: 'Funding mode', hint: 'Sets the payment plan on the cost sheet' },
  { k: 'loanBank', l: 'Lender / bank' }, { k: 'loanStatus', l: 'Loan status', t: 'select', o: 'Loan status' }, ...(money ? [{ k: 'loanAmount', l: 'Loan amount (₹)', t: 'number' }] : []),
  { k: 'occupation', l: 'Occupation' }, { k: 'employer', l: 'Employer / business' }, { k: 'income', l: 'Annual income band', t: 'select', o: 'Income band' },
  { k: 'marital', l: 'Marital status', t: 'select', o: 'Marital status' }, { k: 'familyProfile', l: 'Family profile' }, { k: 'decisionMaker', l: 'Key decision-maker' },
  { k: 'interests', l: 'Interests', t: 'chips', o: OPS.INTERESTS, span: 'all' },
  { section: 'Team', n: '6' },
  { k: 'source', l: 'Lead source', t: 'select', o: 'Lead source' }, { k: 'leadId', l: 'Original lead ID', auto: true },
  assign ? { k: 'owner', l: 'Relationship owner', t: 'select', o: team } : { k: 'owner', l: 'Relationship owner', auto: true },
  assign ? { k: 'coOwners', l: 'Also responsible', t: 'chips', o: team, span: 'all', hint: 'They see this client in full and get its reminders' } : { k: 'coOwners', l: 'Also responsible', auto: true, fmt: (v) => (v || []).join(', ') },
  ...(money ? [{ section: 'Unit and deal', n: '₹', note: 'Visible to finance, senior sales and admins only' },
    { k: 'tc', l: 'Total consideration (₹)', t: 'number' }, { k: 'adjustment', l: 'Adjustment (₹)', t: 'number' }, { k: 'adjType', l: 'Adjustment type', t: 'select', o: 'Adjustment type' },
    { k: 'plan', l: 'Payment plan', t: 'select', o: 'Payment plan' }, { k: 'agreement', l: 'Agreement for sale', t: 'select', o: 'Agreement status' }, { k: 'parkingEntitlement', l: 'Car parks entitled', t: 'number' }] : []),
  { section: 'Notes', n: '·' },
  { k: 'remarks', l: 'Internal notes', t: 'textarea', span: 'all' },
]

export function Clients() {
  const { user } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const all = seesAll(user) || user.appRole === 'bank', money = seesMoney(user)
  const mine = crm.clients.filter((c) => (all ? c.owner === user.name : c.mine))
  const [tab, setTab] = useState(all ? 'all' : 'mine')
  const rows = tab === 'mine' ? mine : crm.clients
  const directory = !all && tab === 'all'
  const live = (c) => !['Cancelled', 'Transferred'].includes(c.status)
  const views = directory ? undefined : [{ value: 'live', label: 'Live bookings', test: live }, { value: 'Red', label: 'At risk (red)', test: (c) => live(c) && c.health === 'Red' }, { value: 'Amber', label: 'Watch (amber)', test: (c) => live(c) && c.health === 'Amber' },
    { value: 'Green', label: 'Good (green)', test: (c) => live(c) && c.health === 'Green' }, ...(all ? [{ value: 'noowner', label: 'No relationship owner', test: (c) => !c.owner }] : []), { value: 'notitle', label: 'No title yet', test: (c) => live(c) && !c.title }, { value: 'all', label: 'Everything' }]
  const cols = directory ? [
    { key: 'unit', label: 'Flat', render: (c) => <span className="mono">{c.unit}</span> },
    { key: 'name', label: 'Client', render: (c) => <b>{fullName(c)}</b> }, { key: 'config', label: 'Type' },
    { key: 'status', label: 'Status', render: (c) => <Badge>{c.status}</Badge> }, { key: 'owner', label: 'Looked after by', render: (c) => c.owner || <span className="muted">Not assigned</span> },
  ] : [
    { key: 'unit', label: 'Flat', render: (c) => <span className="mono">{c.unit}</span> },
    { key: 'name', label: 'Client', render: (c) => <div><b>{fullName(c)}</b><div className="small muted">{c.clientId} · {c.config} · {c.area} sft</div></div> },
    { key: 'status', label: 'Status', render: (c) => <Badge>{c.status}</Badge> },
    ...(money ? [{ key: 'tc', label: 'Consideration', align: 'right', render: (c) => lakh(c.tc) },
      { key: 'pct', label: 'Paid', render: (c) => <div style={{ minWidth: 90 }}><div className="small">{pct(c.pct)}</div><Bar value={c.pct} tone="good" /></div> },
      { key: 'outstanding', label: 'Outstanding', align: 'right', render: (c) => c.outstanding > 0 ? <span style={{ color: 'var(--bad)' }}>{inr(c.outstanding)}</span> : <Badge tone="good">Paid up</Badge> }]
      : [{ key: 'payState', label: 'Payment', render: (c) => <Badge>{c.payState}</Badge> }, { key: 'lastPaymentDate', label: 'Last payment', render: (c) => d(c.lastPaymentDate) }]),
    { key: 'lastc', label: 'Last contact', sortValue: (c) => c.contact.lastDate || '', render: (c) => c.contact.lastDate ? d(c.contact.lastDate) : <span className="missing">Never</span> },
    { key: 'docPct', label: 'Docs', render: (c) => pct(c.docPct) },
    { key: 'owner', label: 'Owner', render: (c) => c.owner || <span className="muted">–</span> },
    { key: 'health', label: 'Health', render: (c) => <Badge>{c.health}</Badge> },
  ]
  return (
    <Page title="Client 360" back="/" backLabel="Dashboard" subtitle={directory ? 'Every booking in the project, for reference: who owns which residence and who looks after them. Details stay with the relationship owner.' : 'Each booking with its contact, paperwork and payment position. Open a client for the full 360.'}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={'tab' + (tab === 'mine' ? ' on' : '')} onClick={() => setTab('mine')}>My clients<span className="pill-count">{mine.length}</span></button>
        <button role="tab" aria-selected={tab === 'all'} className={'tab' + (tab === 'all' ? ' on' : '')} onClick={() => setTab('all')}>All clients<span className="pill-count">{crm.clients.length}</span></button>
      </div>
      {tab === 'mine' && !mine.length && <div className="note info">No clients have you as relationship owner yet. {all ? 'Assign owners from each client\'s Edit form, or use the "No relationship owner" view under Sort and filter.' : 'Ask Cyril or an admin to assign your clients.'}</div>}
      <DataTable key={tab} rows={rows} initialSort={{ key: 'unit', dir: 'asc' }} searchKeys={['name', 'coapp', 'clientId', 'bookingId', 'phone', 'phone2', 'email', (c) => String(c.unit)]}
        onRowClick={(c) => nav('/crm/clients/' + c.id)} views={views} defaultView={views ? 'live' : undefined}
        filters={directory ? [{ key: 'status', label: 'Status' }, { key: 'owner', label: 'Owner' }] : [{ key: 'status', label: 'Status' }, { key: 'config', label: 'Type' }, { key: 'funding', label: 'Funding' }, ...(money ? [{ key: 'age', label: 'Ageing' }] : [{ key: 'payState', label: 'Payment' }]), { key: 'agreement', label: 'Agreement' }, { key: 'owner', label: 'Owner' }]}
        columns={cols} />
    </Page>
  )
}

export function Client360() {
  const { id } = useParams()
  const { db, user, upsert } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const c = crm.clients.find((x) => x.id === id || x.clientId === id)
  const [edit, setEdit] = useState(null)
  const [log, setLog] = useState(false)
  const [pay, setPay] = useState(false)
  if (!c) return <Page title="Client not found" back="/crm/clients" backLabel="Client 360" />
  // 4 Nov: say why the details are hidden and what to do about it
  if (c.directoryOnly) return <Page title={c.name} back="/crm/clients" backLabel="Client 360" subtitle={`Residence ${c.unit} · ${c.status}`}>
    <div className="note info">{c.owner ? `${c.owner} looks after this client.` : 'No relationship owner yet.'} Details, history and payments are shown to the people responsible for this client.</div>
    {seesAll(user) ? <div className="note warn">An admin has given you access to every client, but the Google backend has not been updated yet, so it still sends only the name and residence. Ask an admin to paste the new backend/Code.gs into Apps Script and deploy a new version. Then reload Accord.</div>
      : <div className="note">To open this client, ask an admin to make you the <b>Relationship owner</b> or add you under <b>Also responsible</b>. Or ask them to tick <b>See and edit every client and lead</b> for you in Users and access.</div>}
  </Page>
  return <Client360Body c={c} edit={edit} setEdit={setEdit} log={log} setLog={setLog} pay={pay} setPay={setPay} />
}
function Client360Body({ c, edit, setEdit, log, setLog, pay, setPay }) {
  const { db, user, upsert } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const changes = useBookingChanges(c)
  const raw = db.clients.find((x) => x.id === c.id)
  const money = seesMoney(user)
  const team = db.users.filter((u) => ['admin', 'senior', 'sales'].includes(u.appRole) && u.active !== 'No').map((u) => u.name)
  const doc = db.documents.find((x) => x.bookingId === c.bookingId)
  const parks = db.parking.filter((p) => String(p.unit) === String(c.unit))
  const sheets = db.costSheets.filter((s) => String(s.unit) === String(c.unit))
  const issues = db.issues.filter((i) => String(i.unit) === String(c.unit))
  const groups = {}; META.docTypes.forEach((t) => (groups[t.group] = groups[t.group] || []).push(t))
  return (
    <Page title={fullName(c)} back="/crm/clients" backLabel="Client 360"
      subtitle={`${c.clientId} · ${c.bookingId} · Residence ${c.unit} · ${c.config} · ${c.area} sft · ${c.band || ''}`}
      actions={<>
        {c.phone && <a className="btn" href={waLink(c.phone, `Dear ${salute(c)}, `)} target="_blank" rel="noreferrer">WhatsApp</a>}
        {canWrite(user, 'interactions') && <Button onClick={() => setLog(true)}>Log interaction</Button>}
        {canRecordPayment(user) && <Button onClick={() => setPay(true)}>Record payment</Button>}
        {canPage(user, 'messages') && <Link className="btn" to={'/crm/messages?to=' + c.clientId}>Message</Link>}
        {canPage(user, 'interactions') && <Link className="btn" to={'/crm/booking/' + c.bookingId}>Booking form</Link>}
        {money && <Link className="btn" to={'/crm/clients/' + c.id + '/statement'}>Payment summary</Link>}
        {canPage(user, 'brochure') && <Link className="btn" to={'/brochure?for=' + c.clientId + '&visit=return'}>e-Brochure</Link>}
        {changes.buttons}
        {canWrite(user, 'clients') && <Button variant="primary" onClick={() => setEdit({ ...raw })}>Edit details</Button>}
      </>}>
      <CancellationCard c={c} />
      <div className="hero">
        <div className="flags">{c.red.map((f) => <span key={f} className="flag red">{f}</span>)}{c.amber.map((f) => <span key={f} className="flag amber">{f}</span>)}</div>
        <span className={'health ' + c.health}>{c.health}</span>
      </div>
      {money ? <Grid cols={5}>
        <Stat label="Consideration" value={lakh(c.tc)} sub={c.adjustment ? `Adjustment ${lakh(c.adjustment)} (${c.adjType})` : 'No adjustment'} />
        <Stat label="Received" value={lakh(c.received)} sub={pct(c.pct) + ' of consideration'} tone="good" />
        <Stat label="Demanded to date" value={lakh(c.demand)} sub={pct(crm.billedPct) + ' + GST'} />
        <Stat label="Outstanding" value={c.outstanding > 0 ? lakh(c.outstanding) : 'Paid up'} sub={c.age + (c.due ? ' · due ' + d(c.due) : '')} tone={c.outstanding > 0 ? 'bad' : 'good'} />
        <Stat label="Last contact" value={c.contact.days === null ? 'Never' : c.contact.days <= 0 ? 'Today' : c.contact.days + ' d ago'} sub={c.contact.next ? 'Next ' + d(c.contact.next.nextDate) : 'No follow-up set'} tone={c.contact.days === null || c.contact.days > 30 ? 'bad' : 'teal'} />
      </Grid> : <Grid cols={4}>
        <Stat label="Payment" value={c.payState || '–'} sub="Status only; amounts stay with finance" tone={/Overdue/.test(c.payState) ? 'bad' : c.payState === 'Paid up' ? 'good' : 'warn'} />
        <Stat label="Last payment" value={d(c.lastPaymentDate)} sub={`${c.payments.length} receipts on file`} />
        <Stat label="Last contact" value={c.contact.days === null ? 'Never' : c.contact.days <= 0 ? 'Today' : c.contact.days + ' d ago'} sub={c.contact.next ? 'Next ' + d(c.contact.next.nextDate) : 'No follow-up set'} tone={c.contact.days === null || c.contact.days > 30 ? 'bad' : 'teal'} />
        <Stat label="Paperwork" value={pct(c.docPct)} sub={`${c.docsDone} of ${c.docsApplicable} documents`} tone={c.docPct < 0.5 ? 'warn' : 'good'} />
      </Grid>}
      <div className="split">
        <div>
          <Card title="Payments" pad={false} actions={<span className="small muted">{c.payments.length} entries{money && c.variance ? ` · differs from collections sheet by ${inr(c.variance)}` : ''}</span>}>
            <table className="table dense"><thead><tr><th>Date</th><th>Receipt</th><th>Towards</th>{money && <><th>Mode</th><th className="right">Amount</th><th>Counted</th><th></th></>}</tr></thead>
              <tbody>{c.payments.map((p) => <tr key={p.id} className={p.counted !== 'Yes' ? 'row-off' : ''}><td className="nowrap">{d(p.date)}</td><td>{p.receiptNo}</td><td>{p.towards}</td>
                {money && <><td>{p.mode}</td><td className="right">{inr(p.amount)}</td><td><Badge tone={p.counted === 'Yes' ? 'good' : 'warn'}>{p.counted === 'Yes' ? 'Yes' : p.counted}</Badge></td>
                <td><Link className="btn btn-sm btn-ghost" to={'/crm/payments/receipt/' + p.id}>Receipt</Link></td></>}</tr>)}</tbody>
              {money && <tfoot><tr><td colSpan={4}>Counted total</td><td className="right">{inr(c.received)}</td><td colSpan={2}></td></tr></tfoot>}</table>
            {!money && <div className="card-body"><Locked>Amounts and receipts are with finance</Locked></div>}
          </Card>
          <PaymentMonths c={c} money={money} crm={crm} />
          <Card title="Contact history" actions={<Button size="sm" onClick={() => setLog(true)}>+ Log</Button>}>
            <div className="row gap-s small muted" style={{ marginBottom: 10 }}>Last private viewing or site visit: <b>{c.contact.lastSite ? d(c.contact.lastSite) : 'none recorded'}</b> · {c.contact.count} interactions</div>
            {!c.contact.list.length ? <p className="muted">No interactions logged.</p> : <div className="timeline">{c.contact.list.slice(0, 25).map((i) => <div key={i.id} className="tl-item">
              <div className="tl-meta">{d(i.date)} {i.time} · {i.mode} · {i.purpose} {i.by ? '· ' + i.by : ''} <OutcomeBadge v={i.outcome} /></div><p>{i.summary}</p>
              {i.nextDate && <div className="small muted">Next: {i.nextAction || 'follow up'} on {nextWhen(i)}{i.status === 'Open' ? '' : ' (closed)'}</div>}</div>)}</div>}
          </Card>
          <Card title={`Documents · ${c.docsDone} of ${c.docsApplicable} applicable`} actions={<Link className="btn btn-sm" to={'/crm/documents?b=' + c.bookingId}>Manage</Link>}>
            <div className="grid g2" style={{ marginBottom: 0 }}>{Object.entries(groups).map(([g, ts]) => <div key={g}><div className="form-section">{g}</div>
              {ts.map((t) => { const v = doc?.items?.[t.key] || 'Pending'; return <div key={t.key} className="check-row"><span className="lbl">{t.label}</span>
                {['Received', 'Verified'].includes(v) ? <span className="done-tag">{v}</span> : ['Not applicable', 'Not yet due'].includes(v) ? <span className="na-tag">{v}</span> : <span className="miss-tag">{v}</span>}</div> })}</div>)}</div>
          </Card>
        </div>
        <div>
          <Card title="Basic information" actions={<span className="section-pct">{pct(c.profilePct)} complete</span>}>
            <KV rows={[['Co-applicant', c.coapp || '–'], ['Buyer type', c.buyerType], ['Phone', c.phone], ['WhatsApp', c.whatsapp], ['Email', c.email], ['Address', c.address], ['City / country', [c.city, c.country].filter(Boolean).join(', ')], ['Residency', c.residency], ['PAN', c.pan], ['Preferred contact', c.contactPref]]} />
          </Card>
          <Card title="Purpose and funding">
            <KV rows={[['Purpose', c.purpose], ['Occupant', c.occupant], ['Funding', c.funding], ['Loan', [c.loanBank, c.loanStatus].filter(Boolean).join(' · ')], money && ['Plan', c.plan], money && ['Agreement', <Badge tone={c.agreement === 'Registered' ? 'good' : c.reraFlag === 'Yes' ? 'bad' : 'warn'}>{c.agreement}</Badge>], ['Booking date', d(c.bookingDate)]]} />
          </Card>
          <Card title="Background">
            <KV rows={[['Occupation', c.occupation], ['Employer', c.employer], ['Income band', c.income], ['Family', c.familyProfile], ['Decision maker', c.decisionMaker], ['Source', c.source], ['Advisor', c.owner]]} />
            <div style={{ marginTop: 10 }}><Chips options={OPS.INTERESTS} value={c.interests || []} onChange={(x) => canWrite(user, 'clients') && upsert('clients', { ...raw, interests: x }, { silent: true })} /></div>
          </Card>
          <Card title="Car parking" actions={<Link className="btn btn-sm" to="/crm/inventory?tab=parking">Inventory</Link>}>
            {parks.length ? parks.map((p) => <div key={p.id} className="check-row"><span>{p.id} · {p.level}</span><Badge>{p.type}</Badge></div>) : <p className="muted" style={{ margin: 0 }}>No slot assigned yet.</p>}
          </Card>
          <DesignCard c={c} />
          {sheets.length > 0 && <Card title="Cost sheets">{sheets.map((s) => <div key={s.id} className="check-row"><Link to={'/crm/cost-sheet?id=' + s.id}>{s.id} · {d(s.date)}</Link><span>{inr(s.total)} <Badge>{s.status}</Badge></span></div>)}</Card>}
          {issues.length > 0 && <Card title="Data issues">{issues.map((i) => <div key={i.id} style={{ padding: '6px 0', borderBottom: '1px dashed var(--line-2)' }}><Badge>{i.severity}</Badge> <Badge>{i.status}</Badge><div className="small" style={{ marginTop: 4 }}>{i.description}</div></div>)}</Card>}
          {c.remarks && <Card title="Remarks"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.remarks}</p>{c.history && <p className="small muted">{c.history}</p>}</Card>}
        </div>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={'Edit ' + c.name} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => { upsert('clients', edit); setEdit(null) }}>Save</Button></>}>
        {edit && <RecordForm sheet fields={CLIENT_FIELDS(team, { money, assign: canAssignTasks(user) })} value={edit} onChange={setEdit} />}
      </Modal>
      <LogInteraction open={log} onClose={() => setLog(false)} recordId={c.clientId} />
      {changes.modals}
      <PaymentForm open={pay} onClose={(p) => { setPay(false); if (p?.id && !p.ledger) nav('/crm/payments/receipt/' + p.id) }} unit={c.unit} />
    </Page>
  )
}

// Accord Design for this client: experience sessions and design projects, read from the same database.
function DesignCard({ c }) {
  const { db, user } = useStore()
  const sessions = sessionsFor(db, c), projects = projectsFor(db, c)
  const design = canOpen(user, 'accord')
  return (
    <Card title="Accord Design" actions={<>{canOpen(user, 'experience') && <a className="btn btn-sm" target="_blank" rel="noreferrer" href={experienceUrl({ name: fullName(c), unit: c.unit, rid: c.clientId, by: user.name, client: true })}>Open their plan in the experience</a>}<Link className="btn btn-sm" to={'/crm/inventory?unit=' + c.unit}>On the plan</Link></>}>
      {projects.map((p) => <div key={p.id} className="check-row">{design ? <Link to={'/accord/' + p.id}>{p.id} · {p.name}</Link> : <span>{p.id} · {p.name}</span>}<span><Badge>{p.status}</Badge> <span className="small muted">{p.designer}</span></span></div>)}
      {sessions.slice(0, 4).map((s) => <div key={s.id} className="check-row"><span>{[s.persona, s.palette, s.register].filter(Boolean).join(' · ') || 'Session started'}<div className="small muted">{s.configId || s.id}{s.by ? ' · with ' + s.by : ''}</div></span><span className="small muted">{d(String(s.updatedAt || '').slice(0, 10))}</span></div>)}
      {!projects.length && !sessions.length && <p className="muted" style={{ margin: 0 }}>No Accord experience session or design project yet.</p>}
    </Card>
  )
}

// Month by month: which months had a receipt, which months a demand fell due, and which were missed.
// Click a month to see its receipts and send a reminder from there.
function PaymentMonths({ c, money, crm }) {
  const [sel, setSel] = useState(null)
  const counted = c.payments.filter((p) => p.counted === 'Yes' && p.date)
  const first = [c.bookingDate, ...counted.map((p) => p.date)].filter(Boolean).sort()[0]
  if (!first) return null
  const ym = (iso) => String(iso).slice(0, 7)
  const months = []; const t0 = new Date(first.slice(0, 7) + '-01'), now = new Date()
  for (let t = new Date(t0); t <= now; t.setMonth(t.getMonth() + 1)) months.push(t.toISOString().slice(0, 7))
  const gst = crm.gst ?? 0.05
  const basis = n(c.tc) - n(c.adjustment)
  const rows = months.map((m) => {
    const paid = counted.filter((p) => ym(p.date) === m)
    const dueCalls = crm.cum.filter((k) => k.due && ym(k.due) === m)
    const end = m + '-31'
    const recvToEnd = counted.filter((p) => p.date <= end).reduce((s, p) => s + n(p.amount), 0)
    const demandToEnd = crm.cum.filter((k) => k.due && k.due <= end).reduce((s, k) => Math.max(s, k.cum), 0)
    const missed = dueCalls.length > 0 && (money || c.tc ? recvToEnd + 1 < basis * demandToEnd * (1 + gst) : /Overdue/.test(c.payState || '') && m <= ym(new Date().toISOString()))
    return { m, paid, amount: paid.reduce((s, p) => s + n(p.amount), 0), dueCalls, missed }
  })
  const label = (m) => new Date(m + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  const r = rows.find((x) => x.m === sel)
  return (
    <Card title="Month by month" actions={<div className="legend"><span><i style={{ background: 'var(--good)' }} />Paid</span><span><i style={{ background: 'var(--bad)' }} />Demand missed</span><span><i style={{ background: 'var(--warn)' }} />Demand due</span></div>}>
      <div className="months">{rows.map((x) => <button key={x.m} type="button" aria-pressed={sel === x.m} onClick={() => setSel(sel === x.m ? null : x.m)}
        className={'mo' + (x.paid.length ? ' paid' : '') + (x.missed ? ' missed' : x.dueCalls.length ? ' due' : '')} title={label(x.m)}>
        <span>{label(x.m)}</span><b>{x.paid.length ? (money ? lakhShort(x.amount) : '✓') : x.missed ? '!' : x.dueCalls.length ? '•' : ''}</b></button>)}</div>
      {r && <div style={{ marginTop: 12 }}>
        <div className="row between"><b>{new Date(r.m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b>
          {c.phone && <a className="btn btn-sm" target="_blank" rel="noreferrer" href={waLink(c.phone, `Dear ${salute(c)}, a gentle reminder about the instalment for residence ${c.unit} at Yamuna Sky City.`)}>WhatsApp reminder</a>}</div>
        {r.paid.length ? r.paid.map((p) => <div key={p.id} className="check-row"><span>{d(p.date)} · {p.towards}{p.receiptNo ? ' · ' + p.receiptNo : ''}</span>{money && <b>{inr(p.amount)}</b>}</div>) : <p className="muted" style={{ margin: '6px 0' }}>No receipt this month.</p>}
        {r.dueCalls.map((k) => <div key={k.id} className="check-row"><span>{k.id} fell due on {d(k.due)} · {k.description}</span><Badge tone={r.missed ? 'bad' : 'good'}>{r.missed ? 'Missed' : 'Met'}</Badge></div>)}
      </div>}
    </Card>
  )
}
const lakhShort = (v) => (v >= 1e7 ? (v / 1e7).toFixed(1) + 'Cr' : v >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : Math.round(v / 1e3) + 'k')
