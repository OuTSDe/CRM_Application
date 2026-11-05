// 5 Nov (2 Nov meeting): cancelling a booking, refunding the client, and moving a booking to another residence.
// A cancelled booking is never deleted: it stays on record, out of the live figures, so reports still count it.
import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canRecordPayment, canAssignTasks } from '../../lib/perms.js'
import { DEFAULT_TEMPLATES } from '../../lib/seed.js'
import { Modal, Button, Field, Input, Select, Textarea, Badge, Card } from '../../components/ui.jsx'
import { d, inr, today } from '../../lib/format.js'

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

function CancelBooking({ c, open, onClose }) {
  const { db, user, upsert, notify, pushNote, nextId } = useStore()
  const [v, setV] = useState({ reason: '', date: today(), deduction: 0, note: '' })
  const received = c.received || 0
  const refund = Math.max(0, received - Number(v.deduction || 0))
  const go = () => {
    if (!v.reason) return notify('Pick the reason for cancelling', 'bad')
    const raw = db.clients.find((x) => x.id === c.id)
    const rec = { ...raw, status: refund > 0 ? 'Under cancellation' : 'Cancelled', cancelReason: v.reason, cancelDate: v.date, cancelNote: v.note, cancelledBy: user.name,
      refundDue: refund, refundDeduction: Number(v.deduction || 0), refundStatus: refund > 0 ? 'Pending' : 'Not applicable' }
    upsert('clients', rec, { action: 'booking cancelled' })
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), by: user.name, type: 'Client', recordId: c.clientId, recordName: c.name, mode: 'Note (imported)', purpose: 'Cancellation', outcome: 'Negative',
      summary: `Booking of residence ${c.unit} cancelled: ${v.reason}.${v.note ? ' ' + v.note : ''} Received ${inr(received)}; refund due ${inr(refund)}${v.deduction ? ' after deduction of ' + inr(v.deduction) : ''}.`, status: 'Done' }, { silent: true })
    // accounts are told straight away when money has to go back
    if (refund > 0) {
      const fin = db.users.filter((u) => u.active !== 'No' && (u.appRole === 'finance' || u.appRole === 'admin')).map((u) => u.name)
      fin.forEach((n) => pushNote(n, { kind: 'refund', title: `Refund due · residence ${c.unit}`, body: `${c.name} cancelled (${v.reason}). Refund ${inr(refund)}. Record it in Client 360 when paid.`, link: '#/crm/clients/' + c.id }))
      upsert('tasks', { id: nextId('tasks', 'T-', 4), title: `Refund ${inr(refund)} to ${c.name} (residence ${c.unit}, cancelled)`, owner: fin.find((n) => db.users.find((u) => u.name === n)?.appRole === 'finance') || fin[0] || user.name, by: user.name, due: today(), priority: 'High', module: 'Payments', link: c.bookingId, status: 'Open' }, { silent: true })
    }
    notify(refund > 0 ? `Booking under cancellation. Accounts have been asked to refund ${inr(refund)}.` : 'Booking cancelled. The residence is free again.')
    onClose()
  }
  return <Modal open={open} onClose={onClose} title={`Cancel booking · ${c.name} · ${c.unit}`} footer={<><Button onClick={onClose}>Keep the booking</Button><Button variant="danger" onClick={go}>Cancel the booking</Button></>}>
    <p className="small muted" style={{ marginTop: 0 }}>The booking stays on record as cancelled; it is only taken out of the live figures. If money was received, accounts get a refund task and the residence is freed once the refund is recorded.</p>
    <div className="form fc2">
      <Field label="Reason"><Select options={REASONS} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} /></Field>
      <Field label="Cancellation date"><Input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
      <Field label="Received so far"><Input value={inr(received)} disabled /></Field>
      <Field label="Deduction (₹)" hint="As per the agreement, if any"><Input type="number" min={0} value={v.deduction} onChange={(e) => setV({ ...v, deduction: e.target.value })} /></Field>
      <Field label="Refund due"><Input value={inr(refund)} disabled /></Field>
      <Field label="Note" span="all"><Textarea rows={2} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="What was agreed with the client" /></Field>
    </div>
  </Modal>
}

// Shown on Client 360 for a booking that is under cancellation or cancelled
export function CancellationCard({ c }) {
  const { db, user, upsert, notify, sendEmail, settings, nextId } = useStore()
  const [rf, setRf] = useState(null)
  const [busy, setBusy] = useState(false)
  if (!['Under cancellation', 'Cancelled'].includes(c.status) || !c.cancelDate) return null
  const raw = db.clients.find((x) => x.id === c.id)
  const tp = db.templates.find((x) => x.id === 'TP-09') || DEFAULT_TEMPLATES.find((x) => x.id === 'TP-09')
  const body = (tp?.body || '').replace(/{name}/g, c.title ? c.title + ' ' + c.name : c.name).replace(/{unit}/g, c.unit).replace(/{date}/g, d(c.cancelDate))
    .replace(/{refund}/g, Number(c.refundDue) > 0 ? `The amount of ${inr(c.refundDue)} will be refunded to you${c.refundStatus === 'Refunded' ? ` and was paid on ${d(c.refundDate)} (${c.refundMode}${c.refundRef ? ', reference ' + c.refundRef : ''})` : ' shortly; we will write to you with the transfer details'}.` : 'No refund is due on this booking.')
    .replace(/{signature}/g, `${user.name}\n${user.designation || 'Client Relations'}\n${settings.company?.name || 'Yamuna Sky City'}`)
  const mail = async () => {
    if (!c.email) return notify('No e-mail address on file for this client', 'bad')
    setBusy(true)
    try { await sendEmail({ to: c.email, subject: `Yamuna Sky City · cancellation of residence ${c.unit}`, title: `Cancellation · residence ${c.unit}`, body, recordId: c.clientId })
      upsert('clients', { ...raw, cancelEmailAt: new Date().toISOString() }, { silent: true }); notify('Cancellation confirmation sent') } catch (e) { notify('Not sent: ' + e.message, 'bad') } finally { setBusy(false) }
  }
  const saveRefund = () => {
    if (!rf.date || !rf.mode || !(Number(rf.amount) > 0)) return notify('Date, mode and amount are needed', 'bad')
    upsert('clients', { ...raw, refundStatus: 'Refunded', refundDate: rf.date, refundMode: rf.mode, refundRef: rf.ref, refundAmount: Number(rf.amount), refundBy: user.name, status: 'Cancelled' }, { action: 'refund recorded' })
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), by: user.name, type: 'Client', recordId: c.clientId, recordName: c.name, mode: 'Note (imported)', purpose: 'Cancellation', summary: `Refund of ${inr(rf.amount)} paid on ${d(rf.date)} by ${rf.mode}${rf.ref ? ' (' + rf.ref + ')' : ''}. Booking closed as cancelled.`, status: 'Done' }, { silent: true })
    db.tasks.filter((t) => t.link === c.bookingId && t.status === 'Open' && /^Refund/.test(t.title)).forEach((t) => upsert('tasks', { ...t, status: 'Done', doneOn: today() }, { silent: true }))
    setRf(null); notify('Refund recorded. The residence is free again.')
  }
  return <Card title="Cancellation" tone="bad">
    <div className="kv-list small">
      <div><b>Cancelled on</b> {d(c.cancelDate)} by {c.cancelledBy} · {c.cancelReason}</div>
      {c.cancelNote && <div>{c.cancelNote}</div>}
      <div><b>Refund</b> {Number(c.refundDue) > 0 ? <>{inr(c.refundDue)}{Number(c.refundDeduction) > 0 ? ` (after deducting ${inr(c.refundDeduction)})` : ''} · <Badge tone={c.refundStatus === 'Refunded' ? 'good' : 'warn'}>{c.refundStatus}</Badge>{c.refundStatus === 'Refunded' && <> on {d(c.refundDate)} · {c.refundMode}{c.refundRef ? ' · ' + c.refundRef : ''}</>}</> : 'None due'}</div>
      <div><b>Confirmation e-mail</b> {c.cancelEmailAt ? 'sent ' + d(String(c.cancelEmailAt).slice(0, 10)) : <Badge tone="warn">Not sent yet</Badge>}</div>
    </div>
    <div className="row gap-s" style={{ marginTop: 10, flexWrap: 'wrap' }}>
      {canRecordPayment(user) && c.refundStatus === 'Pending' && <Button variant="primary" onClick={() => setRf({ date: today(), mode: 'NEFT', amount: c.refundDue, ref: '' })}>Record refund</Button>}
      <Button onClick={mail} disabled={busy}>{busy ? 'Sending…' : c.cancelEmailAt ? 'Send the confirmation again' : 'Send cancellation confirmation'}</Button>
    </div>
    <details style={{ marginTop: 8 }}><summary className="small">The e-mail</summary><pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{body}</pre></details>
    <Modal open={!!rf} onClose={() => setRf(null)} title="Record refund" footer={<><Button onClick={() => setRf(null)}>Cancel</Button><Button variant="primary" onClick={saveRefund}>Save refund</Button></>}>
      {rf && <div className="form fc2">
        <Field label="Paid on"><Input type="date" value={rf.date} onChange={(e) => setRf({ ...rf, date: e.target.value })} /></Field>
        <Field label="Mode"><Select options={MODES} value={rf.mode} onChange={(e) => setRf({ ...rf, mode: e.target.value })} /></Field>
        <Field label="Amount (₹)"><Input type="number" value={rf.amount} onChange={(e) => setRf({ ...rf, amount: e.target.value })} /></Field>
        <Field label="UTR / cheque number"><Input value={rf.ref} onChange={(e) => setRf({ ...rf, ref: e.target.value })} /></Field>
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
    db.payments.filter((p) => String(p.unit) === String(raw.unit)).forEach((p) => upsert('payments', { ...p, unit: u.unit, origUnit: p.origUnit || String(raw.unit) }, { silent: true }))
    const doc = db.documents.find((x) => x.bookingId === raw.bookingId); if (doc) upsert('documents', { ...doc, id: bookingId, bookingId }, { silent: true })
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
