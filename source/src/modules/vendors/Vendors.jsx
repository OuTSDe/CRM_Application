import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { canWrite } from '../../lib/perms.js'
import { Page, Card, Button, Badge, Grid, Stat, Modal, KV, Seg, Check, Field, Textarea } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm, { missingRequired } from '../../components/RecordForm.jsx'
import { d, today, inr } from '../../lib/format.js'

export const CATEGORIES = ['Stone', 'Tiles', 'Hardware', 'Sanitary & CP', 'Veneers & doors', 'Fabrics & wallcoverings', 'Lighting', 'Lighting control', 'Furniture', 'Paint & finishes', 'Glass & mirrors', 'Appliances', 'Civil contractor', 'Electrical contractor', 'Plumbing contractor', 'Carpentry / joinery', 'Logistics', 'Other']
const DOCS = ['GST certificate', 'PAN card', 'Cancelled cheque', 'MSME / Udyam (if any)', 'Trade licence', 'Company profile / catalogue', 'Price list', 'Two client references']
const STATUS = ['Applied', 'Under review', 'Shortlisted', 'Approved', 'On hold', 'Rejected']
export const VENDOR_FIELDS = [
  { section: 'Company' },
  { k: 'name', l: 'Company / showroom name', req: true, span: 2 }, { k: 'category', l: 'Category', t: 'select', o: CATEGORIES, req: true },
  { k: 'brands', l: 'Brands carried / represented', span: 2 }, { k: 'entity', l: 'Entity type', t: 'select', o: ['Proprietorship', 'Partnership', 'LLP', 'Private limited', 'Public limited', 'Authorised dealer', 'Manufacturer'] },
  { k: 'address', l: 'Address', span: 2 }, { k: 'city', l: 'City', req: true },
  { k: 'area', l: 'Area / locality' }, { k: 'website', l: 'Website / Instagram' }, { k: 'years', l: 'Years in business', t: 'number' },
  { section: 'Contact' },
  { k: 'contactName', l: 'Contact person', req: true }, { k: 'phone', l: 'Phone', t: 'tel', req: true }, { k: 'email', l: 'Email', t: 'email' },
  { section: 'Commercial' },
  { k: 'gstin', l: 'GSTIN' }, { k: 'pan', l: 'PAN' }, { k: 'msme', l: 'MSME / Udyam no.' },
  { k: 'packages', l: 'What you supply (products / services)', t: 'textarea', span: 'all', req: true },
  { k: 'leadTime', l: 'Typical lead time to Mangaluru' }, { k: 'moq', l: 'Minimum order' }, { k: 'paymentTerms', l: 'Payment terms' },
  { k: 'serviceMangaluru', l: 'Installer / service in Mangaluru?', t: 'select', o: ['Yes', 'No', 'Bengaluru only', 'Can arrange'] }, { k: 'freight', l: 'Freight to Mangaluru', t: 'select', o: ['Included', 'Extra at actuals', 'Ex-works only'] }, { k: 'credit', l: 'Credit period (days)', t: 'number' },
  { section: 'Bank (for payments after approval)' },
  { k: 'bankName', l: 'Bank' }, { k: 'bankAccount', l: 'Account number' }, { k: 'bankIfsc', l: 'IFSC' },
  { k: 'references', l: 'Two past clients or projects (name, phone)', t: 'textarea', span: 'all' },
]

export function Vendors() {
  const { db, user, upsert, nextId, notify } = useStore()
  const nav = useNavigate()
  const [add, setAdd] = useState(null)
  const [view, setView] = useState('all')
  const rows = db.vendors.filter((v) => view === 'all' || v.status === view)
  const avg = (v) => { const r = Object.values(v.ratings || {}).filter(Boolean); return r.length ? r.reduce((s, x) => s + x, 0) / r.length : null }
  return (
    <Page back={true} title="Vendor directory" subtitle="Every supplier and contractor, from first application to approval, with documents, ratings, quotes and samples in one place."
      actions={<><a className="btn" href="#/apply/vendor" onClick={(e) => { e.preventDefault(); navigator.clipboard?.writeText(location.href.split('#')[0] + '#/apply/vendor'); notify('Onboarding link copied. Share it with the vendor.') }}>Copy onboarding link</a>
        {canWrite(user, 'vendors') && <Button variant="primary" onClick={() => setAdd({ status: 'Under review', source: 'Added by ' + user.name, docs: {} })}>+ Vendor</Button>}</>}>
      <Grid cols={5}>{['Applied', 'Under review', 'Shortlisted', 'Approved', 'Rejected'].map((s) => <Stat key={s} label={s} value={db.vendors.filter((v) => v.status === s).length} tone={s === 'Approved' ? 'good' : s === 'Applied' ? 'warn' : s === 'Rejected' ? 'bad' : 'info'} onClick={() => setView(s)} />)}</Grid>
      <DataTable rows={rows} searchKeys={['name', 'brands', 'city', 'packages', 'contactName']} onRowClick={(v) => nav('/vendors/' + v.id)}
        toolbar={<Seg options={[{ value: 'all', label: 'All' }, ...STATUS.map((s) => ({ value: s, label: s }))]} value={view} onChange={setView} />}
        filters={[{ key: 'category', label: 'Category' }, { key: 'city', label: 'City' }]}
        columns={[{ key: 'name', label: 'Vendor', render: (v) => <div><b>{v.name}</b><div className="small muted">{v.id} · {v.brands}</div></div> }, { key: 'category', label: 'Category' }, { key: 'city', label: 'City', render: (v) => `${v.city}${v.area ? ' · ' + v.area : ''}` },
          { key: 'packages', label: 'Supplies', render: (v) => <div className="small" style={{ maxWidth: 300 }}>{v.packages}</div> }, { key: 'quotes', label: 'Quotes', render: (v) => db.quotes.filter((q) => q.vendorId === v.id).length || '–' },
          { key: 'rating', label: 'Rating', sortValue: (v) => avg(v) || 0, render: (v) => avg(v) ? '★ ' + avg(v).toFixed(1) : '–' }, { key: 'status', label: 'Status', render: (v) => <Badge>{v.status}</Badge> }]} />
      <Modal open={!!add} onClose={() => setAdd(null)} title="Add vendor" wide footer={<><Button onClick={() => setAdd(null)}>Cancel</Button><Button variant="primary" onClick={() => { const m = missingRequired(VENDOR_FIELDS, add); if (m.length) return notify('Missing: ' + m.join(', '), 'bad'); const r = upsert('vendors', { ...add, id: nextId('vendors', 'V-', 3), appliedOn: today() }, { action: 'vendor added' }); if (r) { setAdd(null); nav('/vendors/' + r.id) } }}>Save</Button></>}>
        {add && <RecordForm fields={VENDOR_FIELDS} value={add} onChange={setAdd} />}
      </Modal>
    </Page>
  )
}

export function VendorDetail() {
  const { id } = useParams()
  const { db, user, upsert } = useStore()
  const v = db.vendors.find((x) => x.id === id)
  const [edit, setEdit] = useState(null)
  const [note, setNote] = useState('')
  if (!v) return <Page back={true} title="Vendor not found" />
  const can = canWrite(user, 'vendors')
  const save = (patch, action) => upsert('vendors', { ...v, ...patch }, { action })
  const quotes = db.quotes.filter((q) => q.vendorId === id)
  const samples = db.samples.filter((s) => s.vendorId === id)
  const stops = db.stops.filter((s) => s.vendorId === id)
  const docsDone = DOCS.filter((x) => v.docs?.[x]).length
  return (
    <Page title={v.name} back="/vendors" backLabel="Vendors" subtitle={`${v.id} · ${v.category} · ${v.city}${v.area ? ', ' + v.area : ''} · ${v.source || ''}`}
      actions={<>{can && <Button onClick={() => setEdit({ ...v })}>Edit</Button>}{can && <Link className="btn" to={'/sourcing/quotes?vendor=' + v.id}>+ Quote</Link>}
        {can && v.status !== 'Approved' && <Button variant="primary" onClick={() => save({ status: 'Approved', approvedBy: user.name, approvedOn: today() }, 'approved')}>Approve</Button>}</>}>
      <div className="row" style={{ marginBottom: 14 }}><span className="small muted">Status</span><Seg options={STATUS} value={v.status} onChange={(s) => can && save({ status: s }, 'status ' + s)} />{v.approvedOn && <span className="small muted">Approved by {v.approvedBy} on {d(v.approvedOn)}</span>}</div>
      <div className="split">
        <div>
          <Card title="Profile"><KV rows={[['Brands', v.brands], ['Supplies', v.packages], ['Address', v.address], ['Contact', [v.contactName, v.phone, v.email].filter(Boolean).join(' · ') || v.phone], ['Website', v.website], ['GSTIN', v.gstin], ['Lead time', v.leadTime], ['Minimum order', v.moq], ['Payment terms', v.paymentTerms], ['Service in Mangaluru', v.serviceMangaluru], ['Freight', v.freight], ['Appointment', v.appointment], ['Notes', v.notes]]} /></Card>
          <Card title={`Quotes (${quotes.length})`} pad={false}>{quotes.length ? <table className="table dense"><thead><tr><th>Quote</th><th>BOQ line</th><th className="right">Rate</th><th>Lead time</th><th>Status</th></tr></thead>
            <tbody>{quotes.map((q) => <tr key={q.id}><td>{q.id} · {d(q.date)}</td><td>{db.boq.find((b) => b.id === q.boqId)?.item || q.item}</td><td className="right">{inr(q.rate)}/{q.unit}</td><td>{q.leadTime}</td><td><Badge>{q.status}</Badge></td></tr>)}</tbody></table> : <div className="empty">No quotes yet.</div>}</Card>
          {stops.length > 0 && <Card title="Visits">{stops.map((s) => <div key={s.id} className="check-row"><Link to={'/sourcing/trips/' + s.tripId}>{d(s.day)} {s.time} · {s.name}</Link><Badge>{s.status}</Badge></div>)}</Card>}
          {samples.length > 0 && <Card title="Samples">{samples.map((s) => <div key={s.id} className="check-row"><span>{s.item}</span><Badge>{s.status}</Badge></div>)}</Card>}
        </div>
        <div>
          <Card title={`Documents · ${docsDone} of ${DOCS.length}`}>{DOCS.map((x) => <div key={x} style={{ padding: '5px 0' }}><Check label={x} checked={v.docs?.[x]} onChange={(c) => can && save({ docs: { ...v.docs, [x]: c } })} /></div>)}</Card>
          <Card title="Rating">{['Quality', 'Price', 'Lead time', 'Service', 'Communication'].map((k) => <div key={k} className="check-row" style={{ alignItems: 'center' }}><span className="lbl">{k}</span><span>{[1, 2, 3, 4, 5].map((n) => <button key={n} className="btn btn-ghost btn-sm" style={{ padding: '0 3px', color: (v.ratings?.[k] || 0) >= n ? '#c98a00' : '#ccc', fontSize: 18 }} onClick={() => can && save({ ratings: { ...v.ratings, [k]: n } })}>★</button>)}</span></div>)}</Card>
          <Card title="Notes">{(v.log || []).map((l, k) => <div key={k} className="small" style={{ padding: '5px 0', borderBottom: '1px dashed var(--line-2)' }}><b>{l.by}</b> <span className="muted">{d(l.date)}</span><div>{l.text}</div></div>)}
            {can && <><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Call notes, negotiation, issues" /><Button size="sm" style={{ marginTop: 6 }} onClick={() => { if (!note) return; save({ log: [...(v.log || []), { date: today(), by: user.name, text: note }] }); setNote('') }}>Add note</Button></>}</Card>
        </div>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={'Edit ' + v.name} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => { upsert('vendors', edit); setEdit(null) }}>Save</Button></>}>{edit && <RecordForm fields={VENDOR_FIELDS} value={edit} onChange={setEdit} />}</Modal>
    </Page>
  )
}

// Public onboarding form. Works without signing in; goes to the shared sheet when the backend is connected.
export function VendorApply({ publicMode }) {
  const { db, upsert, nextId, backend, notify } = useStore()
  const [v, setV] = useState({ docs: {} })
  const [done, setDone] = useState(null)
  const [busy, setBusy] = useState(false)
  const [agree, setAgree] = useState(false)
  const submit = async () => {
    const m = missingRequired(VENDOR_FIELDS, v); if (m.length) return notify('Please fill: ' + m.join(', '), 'bad')
    if (!agree) return notify('Please confirm the declaration', 'bad')
    setBusy(true)
    const rec = { ...v, status: 'Applied', appliedOn: today(), source: 'Onboarding form' }
    try {
      if (backend) { const r = await fetch(backend, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'apply', rec }) }).then((x) => x.json()); if (r.error) throw new Error(r.error); setDone(r.id || 'received') }
      else { const r = upsert('vendors', { ...rec, id: nextId('vendors', 'V-', 3) }, { system: true, action: 'applied' }); setDone(r.id) }
    } catch (e) { notify('Could not submit: ' + e.message, 'bad') } finally { setBusy(false) }
  }
  const body = done ? <Card><div className="empty"><h2 style={{ color: 'var(--ink)' }}>Thank you</h2><p>Your application {done !== 'received' ? `(${done}) ` : ''}has reached the Yamuna Homes and Design sourcing team. We will call you after reviewing it.</p><Button onClick={() => { setDone(null); setV({ docs: {} }); setAgree(false) }}>Submit another</Button></div></Card> : <>
    <Card><RecordForm fields={VENDOR_FIELDS} value={v} onChange={setV} /></Card>
    <Card title="Documents you can share">{DOCS.map((x) => <div key={x} style={{ padding: '4px 0' }}><Check label={x} checked={v.docs?.[x]} onChange={(c) => setV({ ...v, docs: { ...v.docs, [x]: c } })} /></div>)}<p className="small muted" style={{ marginBottom: 0 }}>Tick what you can send; our team will ask for the files on WhatsApp or email.</p></Card>
    <Card><Check label="I confirm the details above are correct and agree to be contacted by Yamuna Homes and Design about supply for its projects." checked={agree} onChange={setAgree} />
      <div style={{ marginTop: 12 }}><Button variant="primary" size="lg" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</Button></div></Card></>
  if (!publicMode) return <Page back={true} title="Vendor onboarding form" subtitle="The same form vendors fill from the shared link. Use it to add a vendor on their behalf.">{body}</Page>
  return <div style={{ background: 'var(--paper)', minHeight: '100vh' }}><div className="content" style={{ margin: '0 auto', maxWidth: 980 }}>
    <div className="row" style={{ marginBottom: 18 }}><div className="mark">A</div><div><div style={{ font: '600 18px var(--f-head)' }}>Work with Yamuna Homes and Design</div><div className="small muted">Supplier and contractor onboarding · Yamuna Sky City, Mangaluru</div></div><span style={{ marginLeft: 'auto' }}><a href="#/" className="small">Team sign-in</a></span></div>
    {body}</div></div>
}
