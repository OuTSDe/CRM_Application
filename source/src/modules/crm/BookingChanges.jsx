// 5 Nov (2 Nov meeting): cancelling a booking, refunding the client, and moving a booking to another residence.
// A cancelled booking is never deleted: it stays on record, out of the live figures, so reports still count it.
import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { RELEASE } from '../../lib/parking.js'
import { useCrm, BOOKED, CANCELLING } from '../../lib/calc.js'
import { cancellationCalc, lateInterest } from '../../lib/schedule.js'
import { canRecordPayment, canAssignTasks } from '../../lib/perms.js'
import { DEFAULT_TEMPLATES } from '../../lib/seed.js'
import { Modal, Button, Field, Input, Select, Textarea, Badge, Card, Seg } from '../../components/ui.jsx'
import { d, inr, today, addDays } from '../../lib/format.js'

const REASONS = ['Financial reasons', 'Loan not sanctioned', 'Change of plans', 'Bought elsewhere', 'Unhappy with progress', 'Family reasons', 'Moving away', 'Other']
const MODES = ['NEFT', 'RTGS', 'IMPS', 'Cheque', 'Demand Draft', 'Bank Transfer']

export function useBookingChanges(c) {
  const { user } = useStore()
  const [cancel, setCancel] = useState(false)
  const [transfer, setTransfer] = useState(false)
  const may = canAssignTasks(user)
  const live = BOOKED.includes(c.status) || c.status === 'To verify'
  const buttons = may && live ? <><Button onClick={() => setTransfer(true)}>Move to another residence</Button><Button variant="ghost" onClick={() => setCancel(true)}>Cancel booking</Button></> : null
  const modals = <><CancelBooking c={c} open={cancel} onClose={() => setCancel(false)} /><TransferBooking c={c} open={transfer} onClose={() => setTransfer(false)} /></>
  return { buttons, modals }
}

// 7 Nov: cancellation protocol (Karnataka RERA). Request → retention call → calculation within the caps → approval
// (two admins above the threshold) → documents and refund in parts → release of the residence.
const CHANNELS = ['Letter / e-mail from the client', 'In person', 'Phone call', 'WhatsApp', 'Developer notice']
const CANCEL_DOCS = (c) => [
  ['request', 'Written request from the client', c.cancelInitiatedBy !== 'Developer'],
  ['letter', 'Cancellation letter issued', true],
  ['ack', 'Client acknowledgement', true],
  ['originals', 'Original allotment letter and receipts returned', true],
  ['deed', 'Cancellation deed registered', c.agreement === 'Registered'],
  ['noc', 'Bank NOC / loan closure letter', /loan/i.test(c.funding || '')],
].filter((x) => x[2])
const noteTo = (db, roles) => db.users.filter((u) => u.active !== 'No' && roles.includes(u.appRole)).map((u) => u.name)

function CancelBooking({ c, open, onClose }) {
  const { db, user, upsert, notify, pushNote, nextId, upload, backend } = useStore()
  const crm = useCrm()
  const R = crm.rules
  const [v, setV] = useState({ initiatedBy: 'Client', promoterFault: false, reason: '', date: today(), channel: CHANNELS[0], note: '', file: null, defaultNoticeAt: '', terminationNoticeAt: '' })
  const set = (k, x) => setV({ ...v, [k]: x })
  const go = async () => {
    if (!v.reason) return notify('Pick the reason', 'bad')
    if (v.initiatedBy === 'Client' && !v.file && !v.requestOnFile) return notify('Attach the client\'s written request, or tick that it is on file', 'bad')
    if (v.initiatedBy === 'Developer' && !v.promoterFault) {
      if (!v.defaultNoticeAt || !v.terminationNoticeAt) return notify('Enter the dates of the notice of default and of the termination notice', 'bad')
      const gap = Math.round((new Date(v.date) - new Date(v.terminationNoticeAt)) / 864e5)
      if (gap < Number(R.terminationNoticeDays)) return notify(`The termination notice must be at least ${R.terminationNoticeDays} days before cancelling (AFS clause 9.3). It is ${gap}.`, 'bad')
    }
    const raw = db.clients.find((x) => x.id === c.id)
    let url = ''
    if (v.file && backend) url = await upload(v.file, `Clients/${c.unit} ${c.name}/07 Changes`, `${c.unit}_${c.clientId}_cancellation-request_${v.date}`, { kind: 'client', recordId: c.bookingId, label: `${c.unit} ${c.name}`, category: 'Changes', doc: 'cancellation request' }).catch(() => '')
    const dev = v.initiatedBy === 'Developer'
    const rec = { ...raw, preCancelStatus: raw.status, status: 'Cancellation requested', cancelStage: dev ? 'Calculation' : 'Retention',
      cancelInitiatedBy: v.initiatedBy, cancelPromoterFault: v.promoterFault ? 'Yes' : 'No', cancelReason: v.reason, cancelRequestDate: v.date, cancelChannel: v.channel, cancelNote: v.note, cancelRequestUrl: url, cancelRequestOnFile: v.requestOnFile ? 'Yes' : '',
      defaultNoticeAt: v.defaultNoticeAt, terminationNoticeAt: v.terminationNoticeAt, cancelledBy: user.name, cancelDocs: { request: url || v.requestOnFile ? 'Yes' : '' } }
    upsert('clients', rec, { action: 'cancellation requested' })
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), by: user.name, type: 'Client', recordId: c.clientId, recordName: c.name, mode: 'Note (imported)', purpose: 'Cancellation', outcome: 'Negative',
      summary: `${dev ? 'Developer' : 'Client'} asked to cancel residence ${c.unit} (${v.reason}, ${v.channel}).${v.note ? ' ' + v.note : ''}`, status: 'Done' }, { silent: true })
    if (!dev) upsert('tasks', { id: nextId('tasks', 'T-', 4), title: `Retention call: ${c.name} wants to cancel residence ${c.unit}`, owner: c.owner || user.name, by: user.name, due: addDays(today(), Number(R.cancellation.coolingDays || 3)), priority: 'High', module: 'Clients', link: c.bookingId, status: 'Open' }, { silent: true })
    noteTo(db, ['admin']).forEach((n0) => pushNote(n0, { kind: 'cancellation', title: `Cancellation requested · residence ${c.unit}`, body: `${c.name} · ${v.reason} · by ${user.name}`, link: '#/crm/clients/' + c.id }))
    notify(dev ? 'Cancellation started. Work out the refund and approve it on Client 360.' : `Cancellation requested. ${c.owner || 'The relationship owner'} has a retention call to make within ${R.cancellation.coolingDays} days.`)
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={`Cancel booking · ${c.name} · ${c.unit}`} wide footer={<><Button onClick={onClose}>Keep the booking</Button><Button variant="danger" onClick={go}>Start the cancellation</Button></>}>
    <div className="steps"><span className="on">1 Request</span><span>2 Retention</span><span>3 Calculation</span><span>4 Approval</span><span>5 Documents and refund</span><span>6 Release</span></div>
    <p className="small muted" style={{ marginTop: 0 }}>Nothing is cancelled yet: this records the request. The deduction is worked out within the RERA caps, approved by an admin, and the residence is freed only after the refund and documents are done.</p>
    <div className="form fc2">
      <Field label="Asked by"><Seg options={['Client', 'Developer']} value={v.initiatedBy} onChange={(x) => set('initiatedBy', x)} /></Field>
      <Field label="Request date"><Input type="date" value={v.date} onChange={(e) => set('date', e.target.value)} /></Field>
      <Field label="Reason"><Select options={v.initiatedBy === 'Developer' ? ['Default in payment', 'Developer unable to give possession', 'Other'] : REASONS} value={v.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
      <Field label="How it came"><Select options={CHANNELS} value={v.channel} onChange={(e) => set('channel', e.target.value)} /></Field>
      {v.initiatedBy === 'Client' && <Field label="Client's written request" span="all" hint={backend ? 'Saved to the client\'s 07 Changes folder' : 'Connect the backend to save files'}>
        <div className="row gap-s"><input type="file" accept="image/*,application/pdf" disabled={!backend} onChange={(e) => set('file', e.target.files[0])} /><label className="small"><input type="checkbox" checked={!!v.requestOnFile} onChange={(e) => set('requestOnFile', e.target.checked)} /> On file already</label></div></Field>}
      {v.initiatedBy === 'Developer' && <>
        <Field label="Developer at fault (delay, cannot give possession)" span="all" hint="RERA section 18: full refund with interest, no deduction"><label className="small"><input type="checkbox" checked={v.promoterFault} onChange={(e) => set('promoterFault', e.target.checked)} /> Yes, refund in full with interest</label></Field>
        {!v.promoterFault && <><Field label="Notice of default sent on"><Input type="date" value={v.defaultNoticeAt} onChange={(e) => set('defaultNoticeAt', e.target.value)} /></Field>
          <Field label="Termination notice sent on" hint={`At least ${R.terminationNoticeDays} days before cancelling`}><Input type="date" value={v.terminationNoticeAt} onChange={(e) => set('terminationNoticeAt', e.target.value)} /></Field></>}
      </>}
      <Field label="Note" span="all"><Textarea rows={2} value={v.note} onChange={(e) => set('note', e.target.value)} placeholder="What the client said, what was offered" /></Field>
    </div>
  </Modal>
}

// Shown on Client 360 while a booking goes through the cancellation protocol, and after it is cancelled
export function CancellationCard({ c }) {
  const { db, user, upsert, notify, sendEmail, settings, nextId, pushNote } = useStore()
  const crm = useCrm()
  const R = crm.rules
  const [rf, setRf] = useState(null)
  const [busy, setBusy] = useState(false)
  const [waivers, setWaivers] = useState(() => c.waivers || {})
  const [wnote, setWnote] = useState('')
  const raw = db.clients.find((x) => x.id === c.id)
  const active = CANCELLING.includes(c.status) || (c.status === 'Cancelled' && (c.cancelDate || c.cancelRequestDate))
  const calc = useMemo(() => (active ? cancellationCalc(c, { rules: R, payments: c.payments || [], initiatedBy: c.cancelInitiatedBy || 'Client', promoterFault: c.cancelPromoterFault === 'Yes', onDate: c.cancelRequestDate || c.cancelDate || today(),
    interestOwed: R.interestRates?.length ? lateInterest(c.schedule || [], c.payments || [], R).total : 0, waivers }) : null), [active, c, waivers]) // eslint-disable-line
  if (!active) return null
  const legacy = !c.cancelStage   // cancelled with the old one-step form
  const tp = db.templates.find((x) => x.id === 'TP-09') || DEFAULT_TEMPLATES.find((x) => x.id === 'TP-09')
  const refundDue = Number(c.refundDue || 0)
  const refunds = Array.isArray(c.refunds) ? c.refunds : (c.refundStatus === 'Refunded' && c.refundAmount ? [{ date: c.refundDate, mode: c.refundMode, ref: c.refundRef, amount: c.refundAmount, payee: 'Client' }] : [])
  const refunded = refunds.reduce((a, r) => a + Number(r.amount || 0), 0)
  const body = (tp?.body || '').replace(/{name}/g, c.title ? c.title + ' ' + c.name : c.name).replace(/{unit}/g, c.unit).replace(/{date}/g, d(c.cancelDate || c.cancelRequestDate))
    .replace(/{refund}/g, refundDue > 0 ? `The amount of ${inr(refundDue)} will be refunded to you${refunded >= refundDue - 0.5 ? `; it has been paid (${refunds.map((r) => d(r.date) + ', ' + r.mode + (r.ref ? ' ' + r.ref : '')).join('; ')})` : ` on or before ${d(c.refundDueDate)}; we will write to you with the transfer details`}.` : 'No refund is due on this booking.')
    .replace(/{signature}/g, `${user.name}\n${user.designation || 'Client Relations'}\n${settings.company?.name || 'Yamuna Sky City'}`)
  const mail = async () => {
    if (!c.email) return notify('No e-mail address on file for this client', 'bad')
    setBusy(true)
    try { await sendEmail({ to: c.email, subject: `Yamuna Sky City · cancellation of residence ${c.unit}`, title: `Cancellation · residence ${c.unit}`, body, recordId: c.clientId })
      upsert('clients', { ...raw, cancelEmailAt: new Date().toISOString() }, { silent: true }); notify('Cancellation confirmation sent') } catch (e) { notify('Not sent: ' + e.message, 'bad') } finally { setBusy(false) }
  }
  const log = (summary) => upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), by: user.name, type: 'Client', recordId: c.clientId, recordName: c.name, mode: 'Note (imported)', purpose: 'Cancellation', summary, status: 'Done' }, { silent: true })
  const isAdmin = user.appRole === 'admin'
  const retention = (outcome) => {
    if (outcome === 'Withdrawn') { upsert('clients', { ...raw, status: raw.preCancelStatus || 'Active', cancelStage: 'Withdrawn', retentionOutcome: 'Request withdrawn', retentionBy: user.name, retentionAt: today() }, { action: 'cancellation withdrawn' }); log('Client withdrew the cancellation request after the retention call.'); return notify('Request withdrawn. The booking carries on.') }
    upsert('clients', { ...raw, status: 'Retention', cancelStage: 'Calculation', retentionOutcome: 'Proceeding', retentionBy: user.name, retentionAt: today() }, { action: 'retention: proceeding' }); log('Retention call made; the client still wants to cancel.')
    db.tasks.filter((t) => t.link === c.bookingId && t.status === 'Open' && /^Retention/.test(t.title)).forEach((t) => upsert('tasks', { ...t, status: 'Done', doneOn: today() }, { silent: true }))
    notify('Retention recorded. Work out the refund and send it for approval.')
  }
  const big = calc.refundCash > Number(R.cancellation.approvalAbove) || calc.waived > Number(R.cancellation.approvalAbove)
  const approve = () => {
    if (!isAdmin) return notify('An admin approves cancellations', 'bad')
    if (calc.waived > 0 && !wnote && !c.waiverNote) return notify('Say why the deduction is waived', 'bad')
    if (big && !c.approvedBy) { upsert('clients', { ...raw, approvedBy: user.name, approvedAt: today(), waivers, waiverNote: wnote || c.waiverNote || '', cancelCalc: calc }, { action: 'cancellation approved (1 of 2)' }); noteTo(db, ['admin']).filter((x) => x !== user.name).forEach((n0) => pushNote(n0, { kind: 'cancellation', title: `Second approval needed · residence ${c.unit}`, body: `${user.name} approved a refund of ${inr(calc.refundCash)}. A second admin must approve.`, link: '#/crm/clients/' + c.id })); return notify('First approval saved. A second admin must approve as well.') }
    if (big && c.approvedBy === user.name) return notify('A different admin must give the second approval', 'bad')
    const refund = calc.refundCash
    const rec = { ...raw, status: refund > 0 ? 'Under cancellation' : 'Cancelled', cancelStage: refund > 0 ? 'Refund' : 'Closed', cancelDate: today(), cancelPath: calc.path, cancelCalc: calc, waivers, waiverNote: wnote || c.waiverNote || '',
      ...(big ? { approvedBy2: user.name, approvedAt2: today() } : { approvedBy: user.name, approvedAt: today() }), refundDue: refund, refundDeduction: calc.deductions, refundStatus: refund > 0 ? 'Pending' : 'Not applicable', refundDueDate: calc.refundDue, refunds: [] }
    upsert('clients', rec, { action: 'cancellation approved' })
    // demand letters stop, open follow-ups close
    ;(db.demandLetters || []).filter((L) => (L.bookingId === c.bookingId || String(L.unit) === String(c.unit)) && L.status !== 'Withdrawn').forEach((L) => { const st = crm.letters.find((x) => x.id === L.id); if (st && st.state !== 'Paid') upsert('demandLetters', { ...L, status: 'Withdrawn', note: 'Booking cancelled' }, { silent: true }) })
    db.interactions.filter((i) => i.recordId === c.clientId && i.status === 'Open').forEach((i) => upsert('interactions', { ...i, status: 'Done' }, { silent: true }))
    log(`Cancellation approved (path ${calc.path}). Received ${inr(calc.received)}; deductions ${inr(calc.deductions)}; refund ${inr(refund)} due by ${d(calc.refundDue)}.`)
    if (refund > 0) { const fin = noteTo(db, ['finance', 'admin'])
      fin.forEach((n0) => pushNote(n0, { kind: 'refund', title: `Refund due · residence ${c.unit}`, body: `${c.name}: ${inr(refund)} by ${d(calc.refundDue)}.`, link: '#/crm/clients/' + c.id }))
      upsert('tasks', { id: nextId('tasks', 'T-', 4), title: `Refund ${inr(refund)} to ${c.name} (residence ${c.unit}) by ${d(calc.refundDue)}`, owner: fin.find((n0) => db.users.find((u) => u.name === n0)?.appRole === 'finance') || fin[0] || user.name, by: user.name, due: calc.refundDue, priority: 'High', module: 'Payments', link: c.bookingId, status: 'Open' }, { silent: true }) }
    notify(refund > 0 ? `Approved. Refund ${inr(refund)} due by ${d(calc.refundDue)}.` : 'Approved. Nothing to refund; the booking is cancelled.')
  }
  const docs = CANCEL_DOCS(c), cd = c.cancelDocs || {}
  const docsDone = docs.every(([k]) => cd[k] === 'Yes')
  const tick = (k) => upsert('clients', { ...raw, cancelDocs: { ...cd, [k]: cd[k] === 'Yes' ? '' : 'Yes' } }, { silent: true })
  const release = (force) => {
    if (!force && (refunded < refundDue - 0.5 || !docsDone)) return notify('Finish the refund and the documents first, or ask an admin to release it now', 'bad')
    upsert('clients', { ...raw, status: 'Cancelled', cancelStage: 'Closed', refundStatus: refundDue > 0 ? (refunded >= refundDue - 0.5 ? 'Refunded' : 'Part refunded') : 'Not applicable', releasedAt: today(), releasedBy: user.name, partnerClawback: c.partner ? 'To recover' : '' }, { action: 'cancelled and released' })
    db.parking.filter((p) => String(p.unit) === String(c.unit)).forEach((p) => upsert('parking', { ...p, ...RELEASE }, { silent: true }))
    db.tasks.filter((t) => t.link === c.bookingId && t.status === 'Open' && /^Refund/.test(t.title)).forEach((t) => upsert('tasks', { ...t, status: 'Done', doneOn: today() }, { silent: true }))
    log(`Booking closed as cancelled. Residence ${c.unit} released${force && (refunded < refundDue - 0.5 || !docsDone) ? ' by ' + user.name + ' before the refund and documents were complete' : ''}.`)
    notify('Residence ' + c.unit + ' is free again')
  }
  const saveRefund = () => {
    if (!rf.date || !rf.mode || !(Number(rf.amount) > 0)) return notify('Date, mode and amount are needed', 'bad')
    const list = [...refunds, { date: rf.date, mode: rf.mode, ref: rf.ref, amount: Number(rf.amount), payee: rf.payee, by: user.name }]
    const total = list.reduce((a, r) => a + Number(r.amount || 0), 0)
    upsert('clients', { ...raw, refunds: list, refundStatus: total >= refundDue - 0.5 ? 'Refunded' : 'Part refunded', refundDate: rf.date, refundMode: rf.mode, refundRef: rf.ref, refundAmount: total, refundBy: user.name, ...(legacy && total >= refundDue - 0.5 ? { status: 'Cancelled' } : {}) }, { action: 'refund recorded' })
    log(`Refund of ${inr(rf.amount)} paid to ${rf.payee === 'Lender' ? 'the lender' : 'the client'} on ${d(rf.date)} by ${rf.mode}${rf.ref ? ' (' + rf.ref + ')' : ''}. ${total >= refundDue - 0.5 ? 'Refund complete.' : 'Balance ' + inr(refundDue - total) + '.'}`)
    setRf(null); notify(total >= refundDue - 0.5 ? 'Refund complete.' + (legacy ? ' The residence is free again.' : ' Finish the documents, then release the residence.') : 'Part refund recorded')
  }
  const stageNo = { Retention: 2, Calculation: 3, Refund: 5, Closed: 6 }[c.cancelStage] || (c.status === 'Cancelled' ? 6 : 1)
  return <Card title={c.status === 'Cancelled' ? 'Cancellation' : 'Cancellation in progress'} tone="bad">
    {!legacy && <div className="steps">{['Request', 'Retention', 'Calculation', 'Approval', 'Documents and refund', 'Release'].map((x, i) => <span key={x} className={i + 1 < stageNo ? 'done' : i + 1 === stageNo || (stageNo === 3 && i === 3) ? 'on' : ''}>{i + 1} {x}</span>)}</div>}
    <div className="kv-list small">
      <div><b>Requested</b> {d(c.cancelRequestDate || c.cancelDate)} by {c.cancelInitiatedBy || 'client'} · {c.cancelReason}{c.cancelChannel ? ' · ' + c.cancelChannel : ''}{c.cancelRequestUrl && <> · <a href={c.cancelRequestUrl} target="_blank" rel="noreferrer">request</a></>}</div>
      {c.cancelNote && <div>{c.cancelNote}</div>}
      {c.retentionOutcome && <div><b>Retention</b> {c.retentionOutcome} ({c.retentionBy}, {d(c.retentionAt)})</div>}
      {c.approvedBy && <div><b>Approved</b> by {c.approvedBy}{c.approvedBy2 ? ' and ' + c.approvedBy2 : ''}</div>}
    </div>
    {c.cancelStage === 'Retention' && <div className="row gap-s" style={{ marginTop: 10, flexWrap: 'wrap' }}>
      <span className="small muted">Retention call ({c.owner || 'relationship owner'}): offer a move to another residence or a revised schedule.</span>
      {canAssignTasks(user) ? <><Button onClick={() => retention('Withdrawn')}>Client stays: withdraw the request</Button><Button variant="primary" onClick={() => retention('Proceed')}>Client still wants to cancel</Button></> : <span className="small">Log the call, then ask Cyril or an admin to record the outcome.</span>}</div>}
    {(c.cancelStage === 'Calculation' || (c.status === 'Cancellation approved' && !c.cancelDate)) && <>
      <div className="sec" style={{ marginTop: 12 }}>Refund calculation · path {calc.path}</div>
      <p className="small muted" style={{ margin: '4px 0 8px' }}>{calc.basisText}</p>
      <table className="table dense"><tbody>
        <tr><th>Received (cash)</th><td className="right">{inr(calc.cash)}</td></tr>
        {calc.tds > 0 && <tr><th>TDS deposited on the client's PAN (not refunded by the developer)</th><td className="right">{inr(calc.tds)}</td></tr>}
        {calc.lines.map((l) => <tr key={l.key}><th>{l.label}{l.cap !== undefined && <span className="small muted"> · cap {inr(l.cap)}</span>}</th><td className="right">− {inr(l.net)}{isAdmin && <div className="row gap-s small" style={{ justifyContent: 'flex-end' }}>waive <input className="input" type="number" style={{ width: 110 }} value={waivers[l.key] || ''} onChange={(e) => setWaivers({ ...waivers, [l.key]: e.target.value === '' ? '' : Number(e.target.value) })} /></div>}</td></tr>)}
        <tr className="total"><th>Refund to pay</th><td className="right"><b>{inr(calc.refundCash)}</b></td></tr>
        <tr><th>Refund due by</th><td className="right">{d(calc.refundDue)} ({calc.refundDays} days)</td></tr>
      </tbody></table>
      {calc.notes.map((x, i) => <p key={i} className="small" style={{ margin: '6px 0' }}>{x}</p>)}
      {calc.waived > 0 && <Field label="Why the deduction is waived"><Input value={wnote || c.waiverNote || ''} onChange={(e) => setWnote(e.target.value)} /></Field>}
      <div className="row gap-s" style={{ marginTop: 10 }}>{isAdmin ? <Button variant="danger" onClick={approve}>{big && !c.approvedBy ? 'Approve (first of two)' : big ? 'Give the second approval' : 'Approve the cancellation'}</Button> : <span className="small muted">Waiting for an admin to approve{big ? ' (two admins: above ' + inr(R.cancellation.approvalAbove) + ')' : ''}.</span>}</div>
    </>}
    {(c.status === 'Under cancellation' || c.status === 'Cancelled') && !legacy && <>
      <div className="sec" style={{ marginTop: 12 }}>Documents</div>
      {docs.map(([k, l]) => <label key={k} className="check-row small"><span><input type="checkbox" checked={cd[k] === 'Yes'} disabled={c.status === 'Cancelled'} onChange={() => tick(k)} /> {l}</span>{cd[k] === 'Yes' ? <span className="done-tag">Done</span> : <span className="miss-tag">Pending</span>}</label>)}
    </>}
    {refundDue > 0 && <div className="small" style={{ marginTop: 10 }}><b>Refund</b> {inr(refundDue)}{Number(c.refundDeduction) > 0 ? ` (after deducting ${inr(c.refundDeduction)})` : ''} · paid {inr(refunded)}{c.refundDueDate ? ' · due by ' + d(c.refundDueDate) : ''} · <Badge tone={refunded >= refundDue - 0.5 ? 'good' : c.refundDueDate && c.refundDueDate < today() ? 'bad' : 'warn'}>{refunded >= refundDue - 0.5 ? 'Refunded' : refunded > 0 ? 'Part refunded' : 'Pending'}</Badge>
      {refunds.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{refunds.map((r, i) => <li key={i}>{d(r.date)} · {inr(r.amount)} to {r.payee === 'Lender' ? 'the lender' : 'the client'} · {r.mode}{r.ref ? ' · ' + r.ref : ''}</li>)}</ul>}</div>}
    <div className="small" style={{ marginTop: 6 }}><b>Confirmation e-mail</b> {c.cancelEmailAt ? 'sent ' + d(String(c.cancelEmailAt).slice(0, 10)) : <Badge tone="warn">Not sent yet</Badge>}</div>
    <div className="row gap-s" style={{ marginTop: 10, flexWrap: 'wrap' }}>
      {canRecordPayment(user) && refundDue > 0 && refunded < refundDue - 0.5 && ['Under cancellation', 'Cancelled'].includes(c.status) && <Button variant="primary" onClick={() => setRf({ date: today(), mode: 'NEFT', amount: Math.round(refundDue - refunded), ref: '', payee: /loan/i.test(c.funding || '') ? 'Lender' : 'Client' })}>Record refund</Button>}
      {c.status === 'Under cancellation' && !legacy && <Button onClick={() => release(false)}>Release the residence</Button>}
      {c.status === 'Under cancellation' && !legacy && isAdmin && (refunded < refundDue - 0.5 || !docsDone) && <Button variant="ghost" onClick={() => release(true)}>Release now (admin)</Button>}
      {['Under cancellation', 'Cancelled'].includes(c.status) && <Button onClick={mail} disabled={busy}>{busy ? 'Sending…' : c.cancelEmailAt ? 'Send the confirmation again' : 'Send cancellation confirmation'}</Button>}
    </div>
    {['Under cancellation', 'Cancelled'].includes(c.status) && <details style={{ marginTop: 8 }}><summary className="small">The e-mail</summary><pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{body}</pre></details>}
    <Modal open={!!rf} onClose={() => setRf(null)} title="Record refund" footer={<><Button onClick={() => setRf(null)}>Cancel</Button><Button variant="primary" onClick={saveRefund}>Save refund</Button></>}>
      {rf && <div className="form fc2">
        <Field label="Paid on"><Input type="date" value={rf.date} onChange={(e) => setRf({ ...rf, date: e.target.value })} /></Field>
        <Field label="Mode"><Select options={MODES} value={rf.mode} onChange={(e) => setRf({ ...rf, mode: e.target.value })} /></Field>
        <Field label="Amount (₹)" hint="Refunds can be paid in parts"><Input type="number" value={rf.amount} onChange={(e) => setRf({ ...rf, amount: e.target.value })} /></Field>
        <Field label="UTR / cheque number"><Input value={rf.ref} onChange={(e) => setRf({ ...rf, ref: e.target.value })} /></Field>
        <Field label="Paid to" hint={/loan/i.test(c.funding || '') ? 'Bank loan: the lender is repaid first, up to the loan outstanding' : undefined}><Select options={['Client', 'Lender']} value={rf.payee} onChange={(e) => setRf({ ...rf, payee: e.target.value })} /></Field>
      </div>}
    </Modal>
  </Card>
}

// Moving a booking to another residence: the old booking is closed as Transferred, a new one opens on the new residence,
// and the payments move with the client (each keeps the residence it was first paid for).
function TransferBooking({ c, open, onClose }) {
  const { db, user, upsert, notify, nextId } = useStore()
  const crm = useCrm()
  const [to, setTo] = useState('')
  const [why, setWhy] = useState('')
  const free = useMemo(() => crm.units.filter((u) => { const x = db.clients.find((k) => String(k.unit) === String(u.unit) && !['Cancelled', 'Transferred'].includes(k.status)); return !x }).sort((a, b) => Number(a.unit) - Number(b.unit)), [crm.units, db.clients])
  const go = () => {
    const u = free.find((x) => String(x.unit) === String(to)); if (!u) return notify('Pick a residence that is free', 'bad')
    const raw = db.clients.find((x) => x.id === c.id)
    const nums = db.clients.map((x) => Number(String(x.bookingId || '').replace(/\D/g, '')) || 0)
    const bookingId = 'YSC-B-' + String(Math.max(0, ...nums) + 1).padStart(3, '0')
    upsert('clients', { ...raw, status: 'Transferred', transferredTo: bookingId, transferDate: today(), transferNote: why }, { action: 'transferred out' })
    upsert('clients', { ...raw, id: bookingId, bookingId, unit: u.unit, status: 'Shifted unit', transferredFrom: raw.bookingId, fromUnit: raw.unit, transferDate: today(), transferNote: why, remarks: [raw.remarks, `Moved from residence ${raw.unit} on ${d(today())}${why ? ': ' + why : ''}.`].filter(Boolean).join('\n') }, { action: 'transferred in', isNew: true })
    db.payments.filter((p) => String(p.unit) === String(raw.unit)).forEach((p) => upsert('payments', { ...p, unit: u.unit, origUnit: p.origUnit || String(raw.unit), editReason: 'Booking moved to residence ' + u.unit, editKind: 'transfer', rev: Number(p.rev || 0) + 1, lastEditedBy: user.name, lastEditedAt: new Date().toISOString() }, { silent: true }))
    const doc = db.documents.find((x) => x.bookingId === raw.bookingId); if (doc) upsert('documents', { ...doc, id: bookingId, bookingId }, { silent: true })
    // 8 Nov: car parks belong to the residence's band, so the old residence's slots are freed; plan the new residence from Car parking
    db.parking.filter((p) => String(p.unit) === String(raw.unit)).forEach((p) => upsert('parking', { ...p, ...RELEASE }, { silent: true }))
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), by: user.name, type: 'Client', recordId: c.clientId, recordName: c.name, mode: 'Note (imported)', purpose: 'Unit change / transfer', summary: `Booking moved from residence ${raw.unit} to ${u.unit}${why ? ' (' + why + ')' : ''}. New booking ID ${bookingId}. Cost sheet and agreement to be revised.`, status: 'Done' }, { silent: true })
    notify(`Moved to residence ${u.unit} (${bookingId}). Revise the cost sheet and agreement for the new residence.`)
    onClose(); window.location.hash = '#/crm/clients/' + bookingId
  }
  return <Modal open={open} onClose={onClose} title={`Move ${c.name} to another residence`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={go}>Move the booking</Button></>}>
    <p className="small muted" style={{ marginTop: 0 }}>Residence {c.unit} is closed as Transferred and a new booking opens on the new residence with the same client. Payments move with the client; each keeps the residence it was first paid for. Make a new cost sheet for the new residence afterwards.</p>
    <div className="form fc2">
      <Field label="New residence"><Select options={free.map((u) => ({ value: String(u.unit), label: `${u.unit} · ${u.type} · ${u.area} sft` }))} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Free residences" /></Field>
      <Field label="Reason"><Input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. upgrade to 4 BHK" /></Field>
    </div>
  </Modal>
}
