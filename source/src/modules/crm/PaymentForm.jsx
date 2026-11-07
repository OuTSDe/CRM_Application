import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { Modal, Button, DraftNote } from '../../components/ui.jsx'
import RecordForm, { missingRequired } from '../../components/RecordForm.jsx'
import { today, inr, words, d } from '../../lib/format.js'
import { useDraftSlot } from '../../lib/drafts.js'

// 7 Nov: the fields compared when a payment entry is edited, with their labels for the alert and the history
export const PAY_EDIT_FIELDS = { date: 'Date', amount: 'Amount', tds: 'TDS', unit: 'Residence', payer: 'Received from', towards: 'Towards', mode: 'Mode', instrument: 'Reference', instrumentDate: 'Instrument date',
  bank: 'Bank', counted: 'Counted in totals', demandLetter: 'Demand letter', thirdParty: 'Paid by', realisation: 'Realisation', note: 'Note' }
export const PAY_HIGH = ['amount', 'tds', 'unit', 'counted', 'demandLetter']
const show = (k, x) => (x === undefined || x === null || x === '' ? '(blank)' : ['amount', 'tds'].includes(k) ? inr(x) : ['date', 'instrumentDate'].includes(k) ? d(x) : String(x))
export function paymentDiff(before, after) {
  return Object.keys(PAY_EDIT_FIELDS).filter((k) => String(before?.[k] ?? '') !== String(after?.[k] ?? '')).map((k) => ({ field: k, label: PAY_EDIT_FIELDS[k], from: before?.[k] ?? '', to: after?.[k] ?? '' }))
}
export const diffText = (ch) => ch.map((x) => `${x.label}: ${show(x.field, x.from)} → ${show(x.field, x.to)}`).join(' · ')

const FIELDS = (units = [], letters = []) => [
  { k: 'unit', l: 'Residence', t: 'select', o: units, req: true }, { k: 'payer', l: 'Received from', req: true, span: 2 },
  { k: 'date', l: 'Date received', t: 'date', req: true }, { k: 'amount', l: 'Amount (₹)', t: 'number', req: true, min: 0 }, { k: 'towards', l: 'Towards', t: 'select', o: 'Payment towards', req: true },
  { k: 'mode', l: 'Mode', t: 'select', o: 'Payment mode', req: true }, { k: 'instrument', l: 'Cheque / UTR / reference' }, { k: 'instrumentDate', l: 'Instrument date', t: 'date' },
  { k: 'bank', l: 'Drawn on (bank)' }, { k: 'tds', l: 'TDS deducted (₹)', t: 'number', min: 0, hint: '1% where consideration is ₹50 L or more' }, { k: 'counted', l: 'Counted in totals', t: 'select', o: 'Counted in totals' },
  { k: 'thirdParty', l: 'Paid by someone else? (name)', span: 2 }, { k: 'realisation', l: 'Realisation', t: 'select', o: 'Realisation' },
  { k: 'demandLetter', l: 'Against demand letter', t: 'select', o: letters, hint: letters.length ? 'The receipt says whether this is a part payment of the letter' : 'No open demand letter for this residence' },
  { k: 'ledgerOnly', l: 'Receipt', t: 'select', o: [{ value: 'No', label: 'Issue a receipt' }, { value: 'Yes', label: 'Ledger entry only, no receipt' }], hint: 'Ledger only: furniture, barter or other adjustments that are not money received' },
  { k: 'note', l: 'Note', t: 'textarea', span: 'all' },
]
export default function PaymentForm({ open, onClose, unit, edit }) {
  const { db, user, upsert, nextId, notify, upload, backend, pushNote } = useStore()
  const crm = useCrm()
  const here = (window.location.hash || '').slice(1).split('?')[0] || '/'
  const dkey = edit ? 'pay:edit:' + edit.id : 'pay:new:' + (unit || 'any')
  const [sv, setSv, slot] = useDraftSlot(dkey, { uid: user?.id, label: edit ? 'Edit payment · ' + (edit.receiptNo || edit.id) : 'Payment' + (unit ? ' · residence ' + unit : ''), route: here + '?draft=' + dkey })
  const v = sv || {}
  const setV = (f) => setSv((s0) => (typeof f === 'function' ? f(s0 || {}) : f))
  const [file, setFile] = useState(null)
  const [confirm, setConfirm] = useState(null)
  useEffect(() => {
    if (open) {
      if (edit) slot.open({ ...edit, unit: String(edit.unit ?? ''), editReason: '' })
      else { const c0 = crm.byUnit[unit]; slot.open({ unit: unit ? String(unit) : '', payer: c0?.name || '', date: today(), counted: 'Yes', realisation: 'Pending', mode: 'NEFT', towards: 'Construction milestone', ledgerOnly: 'No' }) }
      setFile(null); setConfirm(null)
    } else if (sv) slot.close()
  }, [open]) // eslint-disable-line
  const c = crm.byUnit[v.unit]
  // the residence is picked from live bookings, so a payment never lands on a flat with no client
  const units = useMemo(() => crm.clients.filter((x) => !['Cancelled'].includes(x.status)).sort((a, b) => Number(a.unit) - Number(b.unit)).map((x) => ({ value: String(x.unit), label: `${x.unit} · ${x.name}` })), [crm.clients])
  // 5 Nov: the open demand letters of this residence, oldest first; the oldest is picked for a new payment
  const openL = useMemo(() => crm.letters.filter((x) => String(x.unit) === String(v.unit) && (!['Paid', 'Withdrawn'].includes(x.state) || x.id === edit?.demandLetter)).sort((a, b) => String(a.date).localeCompare(String(b.date))), [crm.letters, v.unit, edit])
  const base = FIELDS(units, openL.map((x) => ({ value: x.id, label: `${x.id} · ${x.callId} · balance ${inr(x.balance)}` })))
  // 7 Nov: editing keeps the receipt number; a reason is required and goes to the admins with the change
  const F = edit ? [{ k: 'receiptNo', l: 'Receipt no. (cannot change)', ro: true }, ...base.filter((f) => f.k !== 'ledgerOnly'), { k: 'editReason', l: 'Reason for this change', t: 'textarea', req: true, span: 'all', hint: 'Admins are told about every change, with this reason' }] : base
  useEffect(() => { if (!edit && sv && openL.length && !v.demandLetter && v.towards !== 'Furniture adjustment') setV((s0) => ({ ...s0, demandLetter: openL[0].id })) }, [v.unit, openL.length]) // eslint-disable-line
  const change = (x) => { const nu = x.unit !== v.unit ? crm.byUnit[x.unit] : null; if (!edit && x.towards !== v.towards && ['Furniture adjustment'].includes(x.towards)) x = { ...x, ledgerOnly: 'Yes', demandLetter: '' }
    setV(nu ? { ...x, unit: x.unit, payer: edit ? x.payer : nu.name, demandLetter: '' } : x) }
  const checks = () => {
    const miss = missingRequired(F, v); if (miss.length) { notify('Missing: ' + miss.join(', '), 'bad'); return false }
    if (!(Number(v.amount) > 0)) { notify('The amount must be more than zero', 'bad'); return false }
    if (Number(v.tds) < 0) { notify('TDS cannot be negative', 'bad'); return false }
    if (!crm.byUnit[v.unit]) { notify('Pick a residence that has a booking', 'bad'); return false }
    return true
  }
  const saveEdit = () => {
    const rec = { ...edit, ...v, id: edit.id, receiptNo: edit.receiptNo, ledgerOnly: edit.ledgerOnly, unit: Number(v.unit), amount: Number(v.amount), tds: v.tds === '' || v.tds == null ? '' : Number(v.tds),
      rev: Number(edit.rev || 0) + 1, lastEditedBy: user.name, lastEditedAt: new Date().toISOString(), editReason: String(v.editReason || '').trim() }
    const ch = paymentDiff(edit, rec)
    if (!ch.length) { notify('Nothing has changed', 'warn'); return }
    if (!confirm) { setConfirm(ch); return }
    const r = upsert('payments', rec, { action: 'payment edited' })
    if (!r) return
    // without the shared database the history and the alerts are written here; with it, the server writes them
    if (!backend) {
      const high = ch.some((x) => PAY_HIGH.includes(x.field))
      upsert('paymentEdits', { id: nextId('paymentEdits', 'PE-', 4), at: new Date().toISOString(), by: user.name, paymentId: rec.id, receiptNo: rec.receiptNo, unit: rec.unit, client: c?.name || '', reason: rec.editReason, changes: JSON.stringify(ch), high: high ? 'Yes' : 'No' }, { system: true, silent: true })
      const to = new Set(db.users.filter((u) => u.appRole === 'admin' && u.active !== 'No').map((u) => u.name)); if (user.reportsTo) to.add(user.reportsTo); to.delete(user.name)
      to.forEach((nme) => pushNote(nme, { kind: 'paymentEdit', title: (high ? 'HIGH · ' : '') + 'Payment edited · ' + (rec.receiptNo || rec.id) + ' · residence ' + rec.unit, body: user.name + ' changed ' + diffText(ch) + '. Reason: ' + rec.editReason, link: '#/crm/payments/receipt/' + rec.id }))
    }
    slot.done(); setConfirm(null)
    notify('Payment updated. Admins have been told.')
    onClose({ ...r, edited: true })
  }
  const save = async () => {
    if (!checks()) return
    if (edit) return saveEdit()
    const recNos = db.payments.map((p) => Number(String(p.receiptNo || '').replace(/\D/g, ''))).filter(Boolean)
    const ledger = v.ledgerOnly === 'Yes'
    const receiptNo = ledger ? '' : 'YSC-' + String(Math.max(0, ...recNos) + 1).padStart(3, '0')
    let proofUrl = ''
    if (file && backend) proofUrl = await upload(file, `Clients/${v.unit} ${c?.name || ''}/05 Receipts`.replace(/ \//, '/'), `${v.unit}_${c?.clientId || ''}_payment-proof_${receiptNo}_${v.date}`, { kind: 'client', recordId: c?.bookingId || '', label: `${v.unit} ${c?.name || ''}`, category: 'Payments & Tax', doc: 'payment proof ' + receiptNo }).catch(() => '')
    const r = upsert('payments', { ...v, unit: Number(v.unit), amount: Number(v.amount), id: nextId('payments', 'L-', 4), entryNo: undefined, receiptNo, origUnit: String(v.unit), tcOnReceipt: c?.tc || '', proofUrl }, { action: 'payment recorded' })
    if (r) { slot.done(); notify(ledger ? 'Ledger entry saved (no receipt)' : `Receipt ${receiptNo} created`); onClose(ledger ? { ...r, ledger: true } : r) }
  }
  const close = () => { slot.close(); setConfirm(null); onClose() }
  return (
    <Modal open={open && !!sv} onClose={close} title={edit ? 'Edit payment entry · ' + (edit.receiptNo || edit.id) : 'Record payment'} wide footer={<>
      <Button onClick={close}>Close (draft kept)</Button>
      {confirm && <Button onClick={() => setConfirm(null)}>Back to the form</Button>}
      <Button variant="primary" onClick={save}>{edit ? (confirm ? 'Yes, save the change' : 'Review the change') : 'Save and open receipt'}</Button></>}>
      <DraftNote at={slot.restoredAt} onDiscard={() => { slot.discard(); setConfirm(null) }} />
      {edit && <div className="note warn small">Edits apply straight away and every admin is told, with the reason. The receipt number stays the same and the receipt shows it was revised. To cancel a receipt, set <b>Counted in totals</b> to No.</div>}
      {confirm ? <div>
        <p style={{ marginTop: 0 }}>You are changing receipt <b>{edit.receiptNo || edit.id}</b>:</p>
        <table className="table dense"><thead><tr><th>Field</th><th>Now</th><th>Will be</th></tr></thead>
          <tbody>{confirm.map((x) => <tr key={x.field} className={PAY_HIGH.includes(x.field) ? 'row-warn' : ''}><td>{x.label}{PAY_HIGH.includes(x.field) && <b className="small" style={{ color: 'var(--bad)' }}> · high</b>}</td><td>{show(x.field, x.from)}</td><td><b>{show(x.field, x.to)}</b></td></tr>)}</tbody></table>
        <p className="small muted">Reason: {v.editReason}</p>
      </div> : <>
        {c && <div className="note info">Residence {c.unit} · {c.name} · outstanding {inr(Math.max(0, c.outstanding))} · received so far {inr(c.received)}</div>}
        <RecordForm fields={F} value={v} onChange={change} />
        {v.amount > 0 && <p className="small muted">In words: <b>{words(v.amount)}</b></p>}
        {!edit && <label className="field" style={{ marginTop: 10 }}><span className="field-label">Payment proof (optional: screenshot or PDF){backend ? ' · saved to Google Drive with an automatic name' : ' · connect the backend to save files to Drive'}</span>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} disabled={!backend} /></label>}
      </>}
    </Modal>
  )
}
