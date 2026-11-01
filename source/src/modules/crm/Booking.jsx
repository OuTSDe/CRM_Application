import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canWrite } from '../../lib/perms.js'
import { Page, Card, Button, Seg, Modal, Input } from '../../components/ui.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import RecordForm from '../../components/RecordForm.jsx'
import { d, inr, words, today, waLink, salute, fullName, TITLES, CITIES } from '../../lib/format.js'

export const FIELDS = [
  { section: 'Primary applicant' },
  { k: 'title', l: 'Title', t: 'select', o: TITLES }, { k: 'name', l: 'Full name (as on PAN)', span: 2, req: true }, { k: 'dob', l: 'Date of birth', t: 'date' },
  { k: 'fatherName', l: "Father's / spouse's name" }, { k: 'pan', l: 'PAN' }, { k: 'aadhaar4', l: 'Aadhaar (last 4)' },
  { k: 'phone', l: 'Mobile', t: 'tel', req: true }, { k: 'email', l: 'Email', t: 'email' }, { k: 'residency', l: 'Residential status', t: 'select', o: 'Residential status' },
  { k: 'address', l: 'Correspondence address', span: 2 }, { k: 'city', l: 'City', suggest: CITIES },
  { k: 'passport', l: 'Passport no. (NRI)' }, { k: 'oci', l: 'OCI card no. (if any)' }, { k: 'whatsapp', l: 'WhatsApp number', t: 'tel' },
  { k: 'occupation', l: 'Occupation' }, { k: 'employer', l: 'Employer / business' }, { k: 'marital', l: 'Marital status', t: 'select', o: 'Marital status' },
  { section: 'Co-applicant' },
  { k: 'coapp', l: 'Full name', span: 2 }, { k: 'coRelation', l: 'Relation to applicant' },
  { k: 'coPan', l: 'PAN' }, { k: 'coPhone', l: 'Mobile', t: 'tel' }, { k: 'coEmail', l: 'Email', t: 'email' },
  { section: 'Booking' },
  { k: 'purpose', l: 'Buying purpose', t: 'select', o: 'Buying purpose' }, { k: 'funding', l: 'Funding', t: 'select', o: 'Funding mode' }, { k: 'loanBank', l: 'Loan bank (if any)' },
  { k: 'nominee', l: 'Nominee' }, { k: 'source', l: 'How did you hear of us', t: 'select', o: 'Lead source' }, { k: 'referredBy', l: 'Referred by' },
]
export default function BookingForm() {
  const { id } = useParams()
  const { db, user, settings, upsert, notify } = useStore()
  const [share, setShare] = useState(false)
  const crm = useCrm()
  const c = crm.clients.find((x) => x.bookingId === id)
  const raw = db.clients.find((x) => x.bookingId === id)
  const [v, setV] = useState(raw ? { ...raw } : {})
  const [mode, setMode] = useState('fill')
  if (!c) return <Page back={true} title="Booking not found" />
  const co = settings.company || {}
  const sheet = db.costSheets.find((s) => s.id === c.costSheetId) || db.costSheets.find((s) => String(s.unit) === String(c.unit) && s.status === 'Converted')
  const booking = c.payments.find((p) => p.towards === 'Booking advance')
  const can = canWrite(user, 'clients') || c.owner === user.name
  return (
    <Page title={`Booking form · ${c.bookingId}`} back={'/crm/clients/' + c.id} backLabel={c.name} subtitle="Fill the soft copy with the client, then print the A4 form for signatures. Details save to the client record."
      actions={<><Seg options={[{ value: 'fill', label: 'Fill' }, { value: 'print', label: 'A4 form' }]} value={mode} onChange={setMode} />{can && <Button onClick={() => setShare(true)}>Send to client to fill</Button>}{mode === 'fill' && can && <Button variant="primary" onClick={() => upsert('clients', v, { system: true, action: 'booking form saved' })}>Save to client</Button>}</>}>
      {mode === 'fill' && <Responses c={c} can={can} onApply={(data) => { setV((x) => ({ ...x, ...data })); notify('Client answers copied into the form. Check them, then Save to client.') }} />}
      {share && <SendForm c={c} raw={raw} onClose={() => setShare(false)} />}
      {mode === 'fill' ? <Card><RecordForm fields={FIELDS} value={v} onChange={setV} readOnly={!can} /></Card> : <>
        <div className="doc-tools no-print"><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
        <div className="doc">
          <DocHeader title="BOOKING FORM · APPLICATION FOR RESERVATION" sub={`${c.bookingId} · ${c.clientId} · residence ${c.unit}`} />
          <table><tbody>
            <tr><th style={{ width: '24%' }}>Residence</th><td><b>{c.unit}</b> · {c.config} · floor {c.floor}</td><th style={{ width: '18%' }}>Saleable area</th><td>{c.area} sft</td></tr>
            <tr><th>Rate</th><td>{sheet ? inr(sheet.rate) + '/sft' : '–'}</td><th>Agreement value</th><td>{inr(c.tc)}</td></tr>
            <tr><th>Car parks</th><td>{v.parkingEntitlement || 1}</td><th>Booking date</th><td>{d(c.bookingDate)}</td></tr>
          </tbody></table>
          <div className="sec">Applicant</div>
          <table><tbody>{[['Name', fullName(v)], ["Father's / spouse's name", v.fatherName], ['Date of birth', d(v.dob)], ['PAN', v.pan], ['Mobile / email', [v.phone, v.email].filter(Boolean).join(' · ')], ['Address', [v.address, v.city].filter(Boolean).join(', ')], ['Residential status', v.residency], ['Occupation', [v.occupation, v.employer].filter(Boolean).join(', ')]].map(([k, x]) => <tr key={k}><th style={{ width: '30%' }}>{k}</th><td>{x || <span style={{ display: 'inline-block', width: '90%', borderBottom: '1px dotted #999' }}>&nbsp;</span>}</td></tr>)}</tbody></table>
          <div className="sec">Co-applicant</div>
          <table><tbody>{[['Name', v.coapp], ['Relation', v.coRelation], ['PAN', v.coPan], ['Mobile / email', [v.coPhone, v.coEmail].filter(Boolean).join(' · ')]].map(([k, x]) => <tr key={k}><th style={{ width: '30%' }}>{k}</th><td>{x || <span style={{ display: 'inline-block', width: '90%', borderBottom: '1px dotted #999' }}>&nbsp;</span>}</td></tr>)}</tbody></table>
          <div className="sec">Reservation amount</div>
          <p>{booking ? <>Received {inr(booking.amount)} (Rupees {words(booking.amount)} only) by {booking.mode} {booking.instrument} dated {d(booking.instrumentDate || booking.date)}, receipt {booking.receiptNo}.</> : <>Amount ₹ ______________ by ______________ ref. ______________ dated __________.</>}</p>
          <p className="small">Funding: {v.funding || '______'} {v.loanBank ? '· ' + v.loanBank : ''} · Purpose: {v.purpose || '______'} · Nominee: {v.nominee || '______'}</p>
          <div className="sec">Declaration</div>
          <ol><li>I/We have read the cost sheet and payment schedule and agree to pay as per the schedule.</li><li>The reservation is subject to execution of the agreement for sale within 30 days and payment as per the plan.</li><li>All information given here is true; I/we will inform the company of any change.</li><li>Cancellation and refund are governed by the agreement for sale and RERA rules.</li></ol>
          <div className="sign"><div>Applicant</div><div>Co-applicant</div><div style={{ textAlign: 'right' }}>For {co.name}<br />Client advisor: {c.owner || ''}</div></div>
          <div className="foot">{co.address} · {co.contact}</div>
        </div></>}
    </Page>
  )
}

// The soft copy, sent to the client: a link to a public form only they can open (a per-booking key), filled on
// their phone, which comes back here for the advisor to check and apply. Nothing on the client file is shown in it.
function SendForm({ c, raw, onClose }) {
  const { settings, upsert, notify, user } = useStore()
  const [key] = useState(() => raw?.formToken || Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, '0')).join(''))
  const api = settings.backendUrl
  const link = `${location.href.split('#')[0]}#/apply/client?b=${encodeURIComponent(c.bookingId)}&k=${key}${api ? '&api=' + encodeURIComponent(api) : ''}`
  const save = () => { if (raw && raw.formToken !== key) upsert('clients', { ...raw, formToken: key, formSentOn: today() }, { system: true, action: 'client form link sent', silent: true }) }
  const text = `Dear ${salute(c)}, to complete your booking file for residence ${c.unit} at Yamuna Sky City, please fill in your details here: ${link}\n\nWarm regards,\n${user.name}${user.designation ? ', ' + user.designation : ''}`
  return (
    <Modal open onClose={onClose} title={'Send the booking form to ' + c.name} footer={<Button onClick={onClose}>Close</Button>}>
      {!api && <div className="note bad">The shared database is not connected yet, so answers cannot come back. Connect it in Admin → Data and sync first; until then, fill the form with the client here.</div>}
      <p className="muted">The client opens the link on their phone, fills their details and submits. You get a notification, and the answers wait at the top of this form for you to check and apply.</p>
      <Input value={link} readOnly onFocus={(e) => e.target.select()} />
      <div className="row gap-s" style={{ marginTop: 12 }}>
        {c.phone && <a className="btn btn-primary" target="_blank" rel="noreferrer" href={waLink(c.phone, text)} onClick={save}>Send on WhatsApp</a>}
        {c.email && <a className="btn" href={`mailto:${c.email}?subject=${encodeURIComponent('Your booking details · Yamuna Sky City ' + c.unit)}&body=${encodeURIComponent(text)}`} onClick={save}>Send by e-mail</a>}
        <Button onClick={() => { save(); navigator.clipboard?.writeText(link); notify('Link copied') }}>Copy link</Button>
      </div>
    </Modal>
  )
}

function Responses({ c, can, onApply }) {
  const { db, upsert, user } = useStore()
  const list = (db.clientForms || []).filter((x) => x.bookingId === c.bookingId && x.status !== 'Dismissed').sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
  if (!list.length) return null
  return <Card title="Answers from the client">{list.map((r) => <div key={r.id} className="check-row">
    <span><b>{d(String(r.submittedAt).slice(0, 10))}</b> · {Object.keys(r.data || {}).length} fields filled{r.status === 'Applied' ? ` · applied by ${r.appliedBy}` : ''}</span>
    {can && r.status !== 'Applied' && <span className="row gap-s"><Button size="sm" variant="primary" onClick={() => { onApply(r.data || {}); upsert('clientForms', { ...r, status: 'Applied', appliedBy: user.name, appliedAt: new Date().toISOString() }, { silent: true }) }}>Copy into form</Button>
      <Button size="sm" variant="ghost" onClick={() => upsert('clientForms', { ...r, status: 'Dismissed' }, { silent: true })}>Dismiss</Button></span>}</div>)}</Card>
}

// Public page the client lands on. Sends to the shared database only; no client data is read or shown.
export function ClientApply() {
  const qs = new URLSearchParams(location.hash.split('?')[1] || '')
  const { settings } = useStore()
  const api = qs.get('api') || settings.backendUrl
  const [v, setV] = useState({})
  const [state, setState] = useState('')
  const [err, setErr] = useState('')
  const fields = FIELDS.filter((f) => f.section || !['source', 'referredBy'].includes(f.k))
  const submit = async () => {
    setErr('')
    if (!v.name || !v.phone) return setErr('Please fill your name and mobile number.')
    if (!api) return setErr('This link is not connected yet. Please ask your client advisor to send it again.')
    setState('busy')
    try {
      const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'clientForm', b: qs.get('b'), k: qs.get('k'), rec: v }) }).then((x) => x.json())
      if (r.error) throw new Error(r.error)
      setState('done')
    } catch (e) { setErr(e.message); setState('') }
  }
  return (
    <div className="page" style={{ maxWidth: 920, margin: '0 auto' }}>
      <div className="page-head"><div><div className="label">Yamuna Sky City · Mangaluru</div><h1 style={{ marginTop: 10 }}>Your booking details</h1>
        <p className="sub">For booking {qs.get('b')}. Your client advisor checks these before they go on your file. Only share what you are comfortable sharing; Aadhaar needs only its last four digits.</p></div></div>
      {state === 'done' ? <Card><div className="empty"><h2>Thank you</h2><p>Your details have reached your client advisor.</p></div></Card> : <>
        <Card><RecordForm fields={fields} value={v} onChange={setV} /></Card>
        {err && <div className="note bad">{err}</div>}
        <Button variant="primary" size="lg" onClick={submit} disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send my details'}</Button>
      </>}
      <p className="small muted" style={{ marginTop: 24 }}>Accord · OuTSDe</p>
    </div>
  )
}
