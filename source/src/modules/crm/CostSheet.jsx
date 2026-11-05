import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm, costSheet, BOOKED } from '../../lib/calc.js'
import { canWrite, isAdmin } from '../../lib/perms.js'
import { Page, Card, Button, Badge, Field, Select, Input, Textarea, Seg, Modal } from '../../components/ui.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import RecordPicker from '../../components/RecordPicker.jsx'
import { d, inr, words, today, addDays, n, waLink } from '../../lib/format.js'

export default function CostSheet() {
  const { db, settings, user, upsert, nextId, notify, upload, online, sendEmail } = useStore()
  const [sending, setSending] = useState(false)
  const crm = useCrm()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const rc = settings.rateCard || {}
  const [v, setV] = useState(() => ({ unit: qs.get('unit') || '', leadId: qs.get('lead') || '', funding: 'Self', discountPct: 0, finalRate: '', parking: 1, plc: 0, notes: '' }))
  const [view, setView] = useState('build')
  const [convert, setConvert] = useState(null)
  useEffect(() => { const id = qs.get('id'); const s = id && db.costSheets.find((x) => x.id === id); if (s) { setV({ ...s }); setView('print') } }, []) // eslint-disable-line
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }))
  const unit = crm.units.find((u) => String(u.unit) === String(v.unit))
  // 2 Nov: no double booking. To verify and under cancellation also block the residence until resolved.
  const taken = (u) => crm.byUnit[u] && (BOOKED.includes(crm.byUnit[u].status) || ['Under cancellation', 'To verify'].includes(crm.byUnit[u].status))
  const lead = db.leads.find((l) => l.id === v.leadId) || db.clients.find((c) => c.clientId === v.leadId)
  const listRate = n(rc.baseRate) * (1 - n(v.discountPct) / 100)
  const rate = v.finalRate !== '' && v.finalRate !== undefined ? n(v.finalRate) : listRate
  const effDisc = n(rc.baseRate) ? (1 - rate / n(rc.baseRate)) * 100 : 0
  const needsApproval = effDisc > n(rc.approvalAbove) + 1e-9
  const parkDefault = rc.parkingSlots?.[unit?.type] ?? 1
  // entitlement plus a capped number of extra car parks (Admin → rate card: parkingExtraMax, 2 by default)
  const parkMax = parkDefault + (rc.parkingExtraMax ?? 2)
  useEffect(() => { if (unit) set('parking', parkDefault) }, [v.unit]) // eslint-disable-line
  const canRound = ['admin', 'senior'].includes(user.appRole)
  const cs = useMemo(() => unit && costSheet({ unit, rateCard: rc, rate, plc: v.plc, parking: v.parking, funding: v.funding === 'Bank loan' ? 'Bank loan' : 'Self', plans: settings.plans, roundTo: v.roundTo }), [unit, rc, rate, v.plc, v.parking, v.funding, settings.plans, v.roundTo])
  const status = v.status || 'Draft'
  const save = (patch = {}) => {
    if (!unit) return notify('Pick a residence first', 'bad')
    // 2 Nov: a cost sheet is confidential, so it is always recorded against a lead or client with name, mobile and e-mail
    if (!lead) return notify('Pick the lead or client this cost sheet is for. Add a new lead first if they are not in Accord yet.', 'bad')
    const gap = [!lead.name && 'name', !lead.phone && 'mobile', !lead.email && !String(v.leadId).startsWith('YSC-C') && 'e-mail'].filter(Boolean)
    if (gap.length) return notify(`${lead.name || 'This lead'} has no ${gap.join(', ')}. Add it to the lead first, then save the cost sheet.`, 'bad')
    const rec = { ...v, id: v.id || nextId('costSheets', 'CS-', 4), date: v.date || today(), validTill: v.validTill || addDays(today(), n(rc.validityDays) || 15), rate, effDisc: Number(effDisc.toFixed(2)), total: Math.round(cs.total), av: Math.round(cs.av),
      name: lead?.name || v.name || '', owner: lead?.owner || user.name, preparedBy: v.preparedBy || user.name, status: needsApproval && !['Approved', 'Converted'].includes(status) ? 'Pending approval' : status === 'Draft' ? 'Ready' : status, ...patch }
    const r = upsert('costSheets', rec, { action: patch.status ? patch.status.toLowerCase() : 'saved' })
    if (r) { setV(r); notify(r.status === 'Pending approval' ? `Saved. ${effDisc.toFixed(1)}% is above ${rc.approvalAbove}%, so it waits for admin approval.` : 'Cost sheet saved') }
    return r
  }
  const pending = db.costSheets.filter((s) => s.status === 'Pending approval')
  const locked = ['Approved', 'Converted'].includes(status) && !isAdmin(user)
  return (
    <Page back={true} title="Cost sheet" subtitle="Pick the residence and the rate card does the rest. Sales choose a founding-privilege step; anything above the approval limit goes to an admin."
      actions={<><Seg options={[{ value: 'build', label: 'Build' }, { value: 'print', label: 'A4 preview' }, { value: 'list', label: `Saved (${db.costSheets.length})` }]} value={view} onChange={setView} /></>}>
      {isAdmin(user) && pending.length > 0 && <div className="note"><b>{pending.length} waiting for your approval:</b> {pending.map((s) => <Button key={s.id} size="sm" variant="ghost" onClick={() => { setV({ ...s }); setView('build') }}>{s.id} · {s.unit} · {s.effDisc}%</Button>)}</div>}
      {view === 'list' && <Card pad={false}><table className="table"><thead><tr><th>ID</th><th>Date</th><th>Residence</th><th>For</th><th className="right">Rate</th><th className="right">Total</th><th>Status</th><th>By</th></tr></thead>
        <tbody>{db.costSheets.map((s) => <tr key={s.id} className="click" onClick={() => { setV({ ...s }); setView('print') }}><td>{s.id}</td><td>{d(s.date)}</td><td>{s.unit}</td><td>{s.name}</td><td className="right">{inr(s.rate)}</td><td className="right">{inr(s.total)}</td><td><Badge tone={s.status === 'Pending approval' ? 'warn' : s.status === 'Approved' || s.status === 'Converted' ? 'good' : 'info'}>{s.status}</Badge></td><td>{s.preparedBy}</td></tr>)}</tbody></table>
        {!db.costSheets.length && <div className="empty">No cost sheets saved yet.</div>}</Card>}
      {view === 'build' && <div className="split-r split">
        <div>
          <Card title="1 · Residence and buyer">
            <div className="form fc1">
              <Field label="Residence"><Select value={v.unit} disabled={locked} onChange={(e) => set('unit', e.target.value)}
                options={crm.units.map((u) => ({ value: String(u.unit), label: `${u.unit} · ${u.type} · ${u.area} sft · fl ${u.floor}${taken(u.unit) ? ' · BOOKED' : ''}` }))} /></Field>
              {unit && taken(unit.unit) && <div className="note">Residence {unit.unit} is already booked by {crm.byUnit[unit.unit].name}.</div>}
              <Field label="For (lead or client)" hint="Needed: who receives the sheet is recorded"><RecordPicker value={v.leadId} onChange={(id) => set('leadId', id)} /></Field>
              <Field label="Funding"><Seg options={['Self', 'Bank loan']} value={v.funding} onChange={(x) => !locked && set('funding', x)} /></Field>
            </div>
          </Card>
          <Card title="2 · Rate">
            <div className="small muted" style={{ marginBottom: 6 }}>Standard base rate {inr(rc.baseRate)}/sft. Founding privilege:</div>
            <div className="chips" style={{ marginBottom: 12 }}>{(rc.discountSteps || []).map((s) => <button key={s} type="button" className={'chip' + (n(v.discountPct) === s && v.finalRate === '' ? ' on' : '')} disabled={locked}
              onClick={() => setV((x) => ({ ...x, discountPct: s, finalRate: '' }))}>{s ? `${s}% · ${inr(rc.baseRate * (1 - s / 100))}` : 'Standard'}{s > rc.approvalAbove ? ' *' : ''}</button>)}</div>
            <div className="form fc2">
              <Field label="Final rate (₹/sft)" hint="Only change for a negotiated rate; it is checked against the approval limit"><Input type="number" value={v.finalRate} disabled={locked} placeholder={String(listRate)} onChange={(e) => set('finalRate', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
              <Field label="Car parks" hint={unit ? `${parkDefault} with a ${unit.type}, up to ${parkMax - parkDefault} more can be bought` : ''}><Input type="number" min={0} max={parkMax} value={v.parking} disabled={locked} onChange={(e) => set('parking', Math.max(0, Math.min(parkMax, Number(e.target.value))))} /></Field>
            </div>
            <p className="small" style={{ margin: '10px 0 0' }}>Effective founding privilege: <b>{effDisc.toFixed(2)}%</b> {needsApproval ? <Badge tone="warn">Needs approval (above {rc.approvalAbove}%)</Badge> : <Badge tone="good">Within limit</Badge>}</p>
          </Card>
          {(canRound || n(v.roundTo)) > 0 && <Card title="Round figure" actions={!canRound && <span className="locked">Set by Cyril or an admin</span>}>
            <div className="chips">{[[0, 'Exact'], [1000, 'Nearest ₹1,000'], [10000, 'Nearest ₹10,000'], [100000, 'Nearest ₹1 lakh']].map(([x, l]) => <button key={x} type="button" className={'chip' + (n(v.roundTo) === x ? ' on' : '')} disabled={!canRound || locked} onClick={() => set('roundTo', x)}>{l}</button>)}</div>
            {canRound && <Field label="Or a round total (₹)" hint="Typed figure for the total; the difference shows as a rounding adjustment"><Input type="number" value={n(v.roundTo) > 1000000 ? v.roundTo : ''} disabled={locked} placeholder="e.g. 25000000" onChange={(e) => set('roundTo', e.target.value === '' ? 0 : Number(e.target.value))} /></Field>}
            {cs && cs.roundAdj !== 0 && <p className="small" style={{ margin: '8px 0 0' }}>Rounding adjustment {cs.roundAdj > 0 ? '+' : '−'}{inr(Math.abs(cs.roundAdj))} on {inr(cs.exact)}</p>}
          </Card>}
          <Card title="3 · Terms">
            <Textarea rows={3} value={v.notes} disabled={locked} placeholder="Special terms for this buyer (added under the standard terms)" onChange={(e) => set('notes', e.target.value)} />
          </Card>
          <div className="row">
            <Badge tone={status === 'Pending approval' ? 'warn' : ['Approved', 'Converted'].includes(status) ? 'good' : 'info'}>{status}</Badge>
            {canWrite(user, 'costSheets') && !locked && <Button variant="dark" onClick={() => save()}>Save</Button>}
            {isAdmin(user) && status === 'Pending approval' && <Button variant="primary" onClick={() => save({ status: 'Approved', approvedBy: user.name, approvedOn: today() })}>Approve</Button>}
            {v.id && <Button onClick={() => setView('print')}>A4 preview</Button>}
            {v.id && <SendSheet v={v} cs={cs} unit={unit} lead={lead} />}
            {v.id && online && <label className="btn" title="The signed or agreement cost sheet, filed with the client in Drive">{v.agreementUrl ? 'Replace agreement cost sheet' : 'Upload agreement cost sheet'}<input type="file" hidden accept="application/pdf,image/*" onChange={async (e) => {
              const f = e.target.files[0]; if (!f) return
              const c = crm.byUnit[unit?.unit]
              const folder = c ? `Clients/${c.unit} ${c.name}/06 Cost sheets` : `Leads/${v.leadId || 'walk-in'} ${lead?.name || ''}/Cost sheets`
              try { const url = await upload(f, folder, `${unit.unit}_${c?.clientId || v.leadId || ''}_agreement-cost-sheet_${today()}`, { kind: c ? 'client' : 'lead', recordId: c?.bookingId || v.leadId || '', label: lead?.name || '', category: 'Booking', doc: 'signed_cost_sheet' }); if (url) { save({ agreementUrl: url }); notify('Agreement cost sheet saved to Drive') } } catch (x) { notify('Upload failed: ' + x.message, 'bad') }
            }} /></label>}
            {v.agreementUrl && <a className="btn btn-ghost" href={v.agreementUrl} target="_blank" rel="noreferrer">Open agreement cost sheet</a>}
            {v.id && status !== 'Pending approval' && status !== 'Converted' && unit && !taken(unit.unit) && canWrite(user, 'costSheets') &&
              <Button variant="primary" onClick={() => setConvert({ name: lead?.name || '', phone: lead?.phone || '', owner: lead?.owner || user.name, bookingDate: today(), coapp: '', email: lead?.email || '' })}>Convert to booking →</Button>}
          </div>
        </div>
        <div>{cs ? <SheetView cs={cs} v={{ ...v, rate, name: lead?.name || v.name }} unit={unit} settings={settings} /> : <Card><div className="empty">Pick a residence to see the cost sheet.</div></Card>}</div>
      </div>}
      {view === 'print' && cs && <div><div className="doc-tools no-print"><Button onClick={() => setView('build')}>← Edit</Button><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
        <div className="doc"><SheetView cs={cs} v={{ ...v, rate, name: lead?.name || v.name }} unit={unit} settings={settings} doc /></div></div>}
      <Modal open={!!convert} onClose={() => setConvert(null)} title={`Convert to booking · residence ${unit?.unit}`} footer={<><Button onClick={() => setConvert(null)}>Cancel</Button><Button variant="primary" onClick={() => {
        if (!convert.name) return notify('Name is required', 'bad')
        if (taken(unit.unit)) return notify(`Residence ${unit.unit} was just booked by ${crm.byUnit[unit.unit].name}. Pick another residence.`, 'bad')
        const bookingId = nextId('clients', 'YSC-B-', 3)
        const cIds = db.clients.map((c) => Number(String(c.clientId).replace(/\D/g, ''))).filter(Boolean)
        const clientId = 'YSC-C-' + String(Math.max(0, ...cIds) + 1).padStart(3, '0')
        const cl = upsert('clients', { id: bookingId, bookingId, clientId, unit: unit.unit, status: 'Active', category: 'Retail', buyerType: convert.coapp ? 'Joint' : 'Individual', residency: lead?.residency || 'Resident', funding: v.funding, tc: Math.round(cs.av), adjustment: 0, plan: 'Construction-linked plan', agreement: 'Not executed', source: lead?.source, leadId: lead?.id, interests: lead?.interests || [], parkingEntitlement: v.parking, costSheetId: v.id, city: lead?.city, country: lead?.country, ...convert }, { action: 'booked', system: true })
        if (!cl) return
        if (lead?.id?.startsWith('YSC-L')) upsert('leads', { ...db.leads.find((l) => l.id === lead.id), stage: 'Booked', bookedAs: clientId }, { silent: true })
        const prior = db.interactions.filter((i) => i.recordId === lead?.id)
        prior.forEach((i) => i.status === 'Open' && upsert('interactions', { ...i, status: 'Done' }, { silent: true }))
        upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), recordId: clientId, type: 'Client', mode: 'Office visit', purpose: 'Booking', outcome: 'Positive', by: user.name, summary: `Reservation of residence ${unit.unit} at ${inr(rate)}/sft (cost sheet ${v.id}). Converted from ${lead?.id || 'walk-in'}.`, nextAction: 'Collect KYC and booking amount', nextDate: addDays(today(), 2), nextOwner: convert.owner, status: 'Open' }, { silent: true })
        save({ status: 'Converted', bookingId })
        setConvert(null); nav('/crm/booking/' + bookingId)
      }}>Create booking</Button></>}>
        {convert && <div className="form fc2">
          <p className="span-all small muted" style={{ margin: 0 }}>Name, phone and advisor come from the lead. A client ID and booking ID are created and the lead is marked Booked.</p>
          <Field label="Primary applicant" span="all"><Input value={convert.name} onChange={(e) => setConvert({ ...convert, name: e.target.value })} /></Field>
          <Field label="Co-applicant"><Input value={convert.coapp} onChange={(e) => setConvert({ ...convert, coapp: e.target.value })} /></Field>
          <Field label="Phone"><Input value={convert.phone} onChange={(e) => setConvert({ ...convert, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={convert.email} onChange={(e) => setConvert({ ...convert, email: e.target.value })} /></Field>
          <Field label="Client advisor"><Select options={db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)} value={convert.owner} onChange={(e) => setConvert({ ...convert, owner: e.target.value })} /></Field>
          <Field label="Booking date"><Input type="date" value={convert.bookingDate} onChange={(e) => setConvert({ ...convert, bookingDate: e.target.value })} /></Field>
        </div>}
      </Modal>
    </Page>
  )
}

function SheetView({ cs, v, unit, settings, doc }) {
  const co = settings.company || {}
  const rc = settings.rateCard || {}
  const body = <>
    <DocHeader title="COST SHEET · FINANCIAL SUMMARY" sub={v.id ? `${v.id} · ${d(v.date || today())}` : 'Draft'} />
    <table><tbody>
      <tr><th style={{ width: '22%' }}>Prepared for</th><td>{v.name || '–'}</td><th style={{ width: '18%' }}>Residence</th><td><b>{unit.unit}</b> · {unit.type}</td></tr>
      <tr><th>Floor</th><td>{unit.floor} · {unit.band}</td><th>Saleable area</th><td>{unit.area} sft{unit.terrace ? ` + ${unit.terrace} sft terrace` : ''}</td></tr>
      <tr><th>Funding</th><td>{v.funding}</td><th>Valid till</th><td>{d(v.validTill || addDays(today(), n(rc.validityDays) || 15))}</td></tr>
    </tbody></table>
    <div className="sec">Part A · Agreement value</div>
    <table><thead><tr><th>Item</th><th className="right">Qty</th><th className="right">Rate</th><th className="right">Amount</th></tr></thead>
      <tbody>{cs.lines.filter((l) => l.amount).map((l) => <tr key={l.label}><td>{l.label}</td><td className="right">{n(l.qty).toLocaleString('en-IN')}</td><td className="right">{inr(l.rate)}</td><td className="right">{inr(l.amount)}</td></tr>)}
        <tr><td colSpan={3}>Agreement value</td><td className="right"><b>{inr(cs.av)}</b></td></tr>
        <tr><td colSpan={3}>GST @ {(n(rc.gst) * 100).toFixed(0)}%</td><td className="right">{inr(cs.gstA)}</td></tr>
        <tr className="total"><td colSpan={3}>Total Part A</td><td className="right">{inr(cs.partA)}</td></tr></tbody></table>
    <div className="sec">Part B · Other charges</div>
    <table><tbody>{cs.other.map((l) => <tr key={l.label}><td>{l.label}</td><td className="right">{l.qty > 1 ? n(l.qty).toLocaleString('en-IN') + ' × ' + inr(l.rate) : ''}</td><td className="right">{inr(l.amount)}</td></tr>)}
      <tr><td colSpan={2}>GST @ {(n(rc.gst) * 100).toFixed(0)}%</td><td className="right">{inr(cs.gstB)}</td></tr>
      <tr className="total"><td colSpan={2}>Total Part B</td><td className="right">{inr(cs.partB)}</td></tr></tbody></table>
    {cs.roundAdj ? <table><tbody><tr><td>Total (A + B), exact</td><td className="right">{inr(cs.exact)}</td></tr><tr><td>Rounding adjustment</td><td className="right">{cs.roundAdj > 0 ? '' : '− '}{inr(Math.abs(cs.roundAdj))}</td></tr></tbody></table> : null}
    <div className="words">Total (A + B): {inr(cs.total)} · Rupees {words(Math.round(cs.total))} only</div>
    <div className="sec">Payment schedule · {v.funding}</div>
    <table><thead><tr><th>Stage</th><th className="right">%</th><th className="right">Amount</th></tr></thead><tbody>{cs.plan.map((p) => <tr key={p.stage}><td>{p.stage}</td><td className="right">{(p.pct * 100).toFixed(0)}%</td><td className="right">{inr(p.amount)}</td></tr>)}</tbody></table>
    <div className="sec">Terms</div>
    <ol>{(settings.terms || []).map((t, i) => <li key={i}>{t}</li>)}{v.notes && <li><b>{v.notes}</b></li>}</ol>
    <p className="small">Account: {co.name} · {co.bank} · A/c {co.account} · IFSC {co.ifsc}</p>
    {doc && <div className="sign"><div>Prepared by {v.preparedBy || ''}</div><div style={{ textAlign: 'right' }}>Accepted by buyer</div></div>}
  </>
  return doc ? body : <Card title={`Total ${inr(cs.total)}`} actions={<span className="small muted">Rate {inr(v.rate)}/sft · floor rise {inr(cs.riseRate)}/sft</span>}><div className="doc" style={{ width: '100%', minHeight: 0, boxShadow: 'none', padding: 0 }}>{body}</div></Card>
}

// 2 Nov: send the cost sheet in one go. E-mail goes out with the Yamuna Sky City header; WhatsApp opens with the summary.
function SendSheet({ v, cs, unit, lead }) {
  const { user, online, sendEmail, notify, settings } = useStore()
  const [busy, setBusy] = useState(false)
  if (!cs || !unit) return null
  const who = lead ? (lead.title ? lead.title + ' ' + lead.name : (lead.name || '').split(' ')[0]) : 'Sir/Madam'
  const lines = [`Dear ${who},`, '', `As discussed, here is the cost sheet for residence ${unit.unit} (${unit.type}, ${unit.area} sq ft, floor ${unit.floor}) at Yamuna Sky City.`, '',
    `Rate: ${inr(v.rate)} per sq ft`, `Agreement value: ${inr(cs.av)}`, `Total including GST and other charges: ${inr(cs.total)}`, '', 'Payment schedule:',
    ...cs.plan.map((p) => `· ${p.stage}: ${(p.pct * 100).toFixed(0)}% · ${inr(p.amount)}`), '', `Valid till ${d(v.validTill)}. Reference ${v.id}.`, '', 'Warm regards,', user.name, user.designation || 'Client Relations', 'Yamuna Sky City']
  const text = lines.join('\n')
  const phone = lead?.whatsapp || lead?.phone
  const mail = async () => {
    if (!lead?.email) return notify('No e-mail on file for this buyer', 'bad')
    setBusy(true)
    try { await sendEmail({ to: lead.email, subject: `Yamuna Sky City · cost sheet for residence ${unit.unit}`, title: `Cost sheet · residence ${unit.unit}`, body: text, recordId: lead.clientId || lead.id }); notify('Cost sheet e-mailed to ' + lead.email) } catch (e) { notify(e.message, 'bad') } finally { setBusy(false) }
  }
  return <>
    {phone && <a className="btn" href={waLink(phone, text)} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
    {online && <Button onClick={mail} disabled={busy}>{busy ? 'Sending…' : 'E-mail it'}</Button>}
  </>
}
