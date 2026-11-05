import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { Modal, Button } from '../../components/ui.jsx'
import RecordForm, { missingRequired } from '../../components/RecordForm.jsx'
import { today, inr, words } from '../../lib/format.js'

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
export default function PaymentForm({ open, onClose, unit }) {
  const { db, upsert, nextId, notify, upload, backend } = useStore()
  const crm = useCrm()
  const [v, setV] = useState({})
  const [file, setFile] = useState(null)
  useEffect(() => { if (open) { const c = crm.byUnit[unit]; setV({ unit: unit ? String(unit) : '', payer: c?.name || '', date: today(), counted: 'Yes', realisation: 'Pending', mode: 'NEFT', towards: 'Construction milestone', ledgerOnly: 'No' }); setFile(null) } }, [open]) // eslint-disable-line
  const c = crm.byUnit[v.unit]
  // the residence is picked from live bookings, so a payment never lands on a flat with no client
  const units = useMemo(() => crm.clients.filter((x) => !['Cancelled'].includes(x.status)).sort((a, b) => Number(a.unit) - Number(b.unit)).map((x) => ({ value: String(x.unit), label: `${x.unit} · ${x.name}` })), [crm.clients])
  // 5 Nov: the open demand letters of this residence, oldest first; the oldest is picked for a new payment
  const openL = useMemo(() => crm.letters.filter((x) => String(x.unit) === String(v.unit) && !['Paid', 'Withdrawn'].includes(x.state)).sort((a, b) => String(a.date).localeCompare(String(b.date))), [crm.letters, v.unit])
  const F = FIELDS(units, openL.map((x) => ({ value: x.id, label: `${x.id} · ${x.callId} · balance ${inr(x.balance)}` })))
  useEffect(() => { if (openL.length && !v.demandLetter && v.towards !== 'Furniture adjustment') setV((s) => ({ ...s, demandLetter: openL[0].id })) }, [v.unit, openL.length]) // eslint-disable-line
  const change = (x) => { const nu = x.unit !== v.unit ? crm.byUnit[x.unit] : null; if (x.towards !== v.towards && ['Furniture adjustment'].includes(x.towards)) x = { ...x, ledgerOnly: 'Yes', demandLetter: '' }
    setV(nu ? { ...x, unit: x.unit, payer: nu.name, demandLetter: '' } : x) }
  const save = async () => {
    const miss = missingRequired(F, v); if (miss.length) return notify('Missing: ' + miss.join(', '), 'bad')
    if (!(Number(v.amount) > 0)) return notify('The amount must be more than zero', 'bad')
    if (Number(v.tds) < 0) return notify('TDS cannot be negative', 'bad')
    if (!crm.byUnit[v.unit]) return notify('Pick a residence that has a booking', 'bad')
    const recNos = db.payments.map((p) => Number(String(p.receiptNo || '').replace(/\D/g, ''))).filter(Boolean)
    const ledger = v.ledgerOnly === 'Yes'
    const receiptNo = ledger ? '' : 'YSC-' + String(Math.max(0, ...recNos) + 1).padStart(3, '0')
    let proofUrl = ''
    if (file && backend) proofUrl = await upload(file, `Clients/${v.unit} ${c?.name || ''}/05 Receipts`.replace(/ \//, '/'), `${v.unit}_${c?.clientId || ''}_payment-proof_${receiptNo}_${v.date}`, { kind: 'client', recordId: c?.bookingId || '', label: `${v.unit} ${c?.name || ''}`, category: 'Payments & Tax', doc: 'payment proof ' + receiptNo }).catch(() => '')
    const r = upsert('payments', { ...v, unit: Number(v.unit), amount: Number(v.amount), id: nextId('payments', 'L-', 4), entryNo: undefined, receiptNo, origUnit: String(v.unit), tcOnReceipt: c?.tc || '', proofUrl }, { action: 'payment recorded' })
    if (r) { notify(ledger ? 'Ledger entry saved (no receipt)' : `Receipt ${receiptNo} created`); onClose(ledger ? { ...r, ledger: true } : r) }
  }
  return (
    <Modal open={open} onClose={() => onClose()} title="Record payment" wide footer={<><Button onClick={() => onClose()}>Cancel</Button><Button variant="primary" onClick={save}>Save and open receipt</Button></>}>
      {c && <div className="note info">Residence {c.unit} · {c.name} · outstanding {inr(Math.max(0, c.outstanding))} · received so far {inr(c.received)}</div>}
      <RecordForm fields={F} value={v} onChange={change} />
      {v.amount > 0 && <p className="small muted">In words: <b>{words(v.amount)}</b></p>}
      <label className="field" style={{ marginTop: 10 }}><span className="field-label">Payment proof (optional: screenshot or PDF){backend ? ' · saved to Google Drive with an automatic name' : ' · connect the backend to save files to Drive'}</span>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} disabled={!backend} /></label>
    </Modal>
  )
}
