import React, { useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { ROLES, ROLE_NOTES, WORKSPACES, workspacesOf, ACCESS, ACCESS_ITEMS, byRole, extrasOf, hasAccess } from '../../lib/perms.js'
import RecordForm from '../../components/RecordForm.jsx'
import { Page, Card, Button, Badge, Field, Input, Textarea, Select, Modal, Confirm, Chips, Seg } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { d, inr } from '../../lib/format.js'
import { DEFAULT_RULES, rulesOf } from '../../lib/schedule.js'
import { getLocation } from '../../lib/geo.js'
import { deviceId } from '../../lib/crypto.js'
import { Link } from 'react-router-dom'
import { useLogo } from '../../lib/logo.js'

function BrandCard({ s, setS }) {
  const { upload, online, notify } = useStore()
  const b = s.brand || {}
  const logo = useLogo(b.logo)
  const set = (k, v) => setS({ ...s, brand: { ...b, [k]: v } })
  const onLogo = async (f) => {
    if (!f) return
    if (f.size > 400 * 1024) return notify('Use a logo under 400 KB (PNG or SVG works best)', 'bad')
    // 12 Nov (d): with the shared database the picture goes to Drive / Brand and settings keep only its link
    // (a picture inside the settings record went over the 50,000-character limit of a sheet cell)
    if (online) {
      try { const link = await upload(f, 'Brand', 'Yamuna Sky City logo', { kind: 'brand', doc: 'Logo' }); if (link) setS({ ...s, brand: { ...b, logo: link } }); notify('Logo saved to Drive / Brand') }
      catch (e) { notify('Logo not saved: ' + e.message, 'bad') }
      return
    }
    const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f) })
    setS({ ...s, brand: { ...b, logo: url } })   // no shared database: the logo stays on this device
  }
  return <Card title="Brand on documents and e-mails">
    <p className="small" style={{ marginTop: 0 }}>The Yamuna Sky City header printed on the cost sheet, receipts, payment summary, booking form and lead sheet, and at the top of every e-mail Accord sends.</p>
    <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
      <div className="logo-box">{logo ? <img src={logo} alt="Logo" /> : <span className="small muted">No logo yet</span>}</div>
      <label className="btn">Upload logo<input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" hidden onChange={(e) => onLogo(e.target.files[0])} /></label>
      {b.logo && <Button variant="ghost" onClick={() => set('logo', '')}>Remove</Button>}
    </div>
    <div className="form fc2">
      <Field label="Header line 1" hint="Under the logo, e.g. the tagline"><Input value={b.line1 ?? s.company?.tagline} onChange={(e) => set('line1', e.target.value)} /></Field>
      <Field label="Header line 2" hint="e.g. address or website"><Input value={b.line2 ?? s.company?.address} onChange={(e) => set('line2', e.target.value)} /></Field>
      <Field label="E-mail on documents"><Input value={b.email} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="Website"><Input value={b.website} onChange={(e) => set('website', e.target.value)} /></Field>
      <Field label="Accent colour"><Input type="color" value={b.accent || '#7A1C2E'} onChange={(e) => set('accent', e.target.value)} /></Field>
    </div>
  </Card>
}

function SignInCard({ s, setS }) {
  const { notify } = useStore()
  const [busy, setBusy] = useState(false)
  const here = async () => { setBusy(true); const l = await getLocation(15000); setBusy(false); if (!l) return notify('Location not available. Allow location for this site in the browser.', 'bad'); setS({ ...s, officeLat: l.lat, officeLng: l.lng, officeRadius: s.officeRadius || 300 }); notify(`Sky City point set to this device (±${l.acc} m). Save settings to keep it.`) }
  return <Card title="Sign-in, devices and punch-in location">
    <div className="form fc2">
      <Field label="Sign-in" hint="Authenticator: a 6-digit code from an app on the phone. Password: the old way."><Select options={[{ value: 'authenticator', label: 'Authenticator app (recommended)' }, { value: 'password', label: 'Password' }]} value={s.authMode || 'authenticator'} onChange={(e) => setS({ ...s, authMode: e.target.value })} /></Field>
      <Field label="Devices per person" hint="Admins have no limit"><Input value="One computer and one phone" disabled /></Field>
      <Field label="No phone to hand: sign in with an e-mailed code" hint="A 6-digit code to the e-mail on the person's record, valid 10 minutes. Admins are told each time."><Select options={[{ value: 'Yes', label: 'Allowed' }, { value: 'No', label: 'Off' }]} value={s.allowEmailCode === 'No' ? 'No' : 'Yes'} onChange={(e) => setS({ ...s, allowEmailCode: e.target.value })} /></Field>
      <Field label="Location check at punch-in" hint="Office and Site count only at Sky City; elsewhere it is logged as remote"><Select options={['On', 'Off']} value={s.geofence || 'On'} onChange={(e) => setS({ ...s, geofence: e.target.value })} /></Field>
      <Field label="Trusted device: skip the code for (days)" hint="0 turns it off. Each person ticks it on their own device at sign-in."><Input type="number" min={0} max={30} value={s.trustDays ?? 3} onChange={(e) => setS({ ...s, trustDays: Number(e.target.value) })} /></Field>
      <Field label="Sign out after no activity (minutes)" hint="0 turns it off. The e-brochure never signs out by itself."><Input type="number" min={0} value={s.idleMinutes ?? 30} onChange={(e) => setS({ ...s, idleMinutes: Number(e.target.value) })} /></Field>
      <Field label="Radius (metres)"><Input type="number" min={50} value={s.officeRadius ?? 300} onChange={(e) => setS({ ...s, officeRadius: Number(e.target.value) })} /></Field>
      <Field label="Sky City latitude"><Input value={s.officeLat} onChange={(e) => setS({ ...s, officeLat: e.target.value })} placeholder="Set it on site" /></Field>
      <Field label="Sky City longitude"><Input value={s.officeLng} onChange={(e) => setS({ ...s, officeLng: e.target.value })} /></Field>
    </div>
    <div className="row" style={{ marginTop: 10 }}><Button onClick={here} disabled={busy}>{busy ? 'Reading location…' : 'Use this device\'s location as Sky City'}</Button>
      {s.officeLat && s.officeLng && <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${s.officeLat},${s.officeLng}`}>Check on the map</a>}</div>
    {!(s.officeLat && s.officeLng) && <p className="note warn small">The Sky City point is not set yet. Until it is, punches record the location but are not judged. Stand at the site office, press the button above, then Save settings.</p>}
  </Card>
}

// 2 Nov: the address other tools (a website form, a WhatsApp tool, 99acres e-mail parser, a chatbot) post enquiries to.
function InboxCard({ s, setS }) {
  const { backend, notify } = useStore()
  const key = s.inboundKey || ''
  const make = () => setS({ ...s, inboundKey: Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b) => b.toString(16).padStart(2, '0')).join('') })
  const example = JSON.stringify({ action: 'inboundLead', key: key || '<key>', source: 'Website', lead: { name: 'Ravi Kumar', phone: '+91 98450 12345', email: 'ravi@example.com', city: 'Bengaluru', config: '3 BHK', message: 'Please call after 6 pm' } }, null, 2)
  const copy = (x) => { try { navigator.clipboard.writeText(x); notify('Copied') } catch (e) { notify('Copy did not work; select and copy by hand', 'bad') } }
  return <Card title="Lead inbox (enquiries from other tools)">
    <p className="small muted" style={{ marginTop: 0 }}>A website form, a WhatsApp tool, a 99acres e-mail reader or a chatbot can send enquiries to Accord. They wait in Leads › Inbox until someone accepts them. Anyone with the key can post to the inbox, so share it only with the tool that needs it; make a new key to cut off an old one.</p>
    <div className="form fc2">
      <Field label="Address (POST, JSON)"><Input value={backend || 'Connect the Google Sheet backend first'} readOnly onFocus={(e) => e.target.select()} /></Field>
      <Field label="Inbound key" hint={key ? 'Save settings after changing it' : 'Off until a key is made'}><div className="row gap-s"><Input value={key} readOnly onFocus={(e) => e.target.select()} placeholder="No key yet" /><Button size="sm" onClick={make}>{key ? 'New key' : 'Make a key'}</Button>{key && <Button size="sm" variant="ghost" onClick={() => setS({ ...s, inboundKey: '' })}>Turn off</Button>}</div></Field>
    </div>
    <details style={{ marginTop: 8 }}><summary className="small">Example the tool sends</summary><pre className="small mono" style={{ whiteSpace: 'pre-wrap' }}>{example}</pre><Button size="sm" onClick={() => copy(example)}>Copy example</Button></details>
  </Card>
}

function DriveCard({ s, setS }) {
  return <Card title="Drive and sharing">
    <p className="small" style={{ marginTop: 0 }}>All Accord data is stored in the OuTSDe Google Drive: <b className="mono">My Drive / Accord_CRM_Application / Accord_Data</b>. The database sheet, every client document, receipts, cost sheets, the nightly Excel export and backups live there. Nothing is kept in the Sky City account.</p>
    <Field label="Share the document folders with (Sky City e-mails, comma separated)" hint="An admin runs shareDocuments() in the script editor: Clients and Project documents become view-only for these people. The database stays private."><Input value={s.shareWith} onChange={(e) => setS({ ...s, shareWith: e.target.value })} placeholder="accounts@yamuna…, aryan@…" /></Field>
  </Card>
}

export function AdminSettings() {
  const { settings, setSettings, notify } = useStore()
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(settings)))
  const co = (k, v) => setS({ ...s, company: { ...s.company, [k]: v } })
  const rc = (k, v) => setS({ ...s, rateCard: { ...s.rateCard, [k]: v } })
  const planSum = (p) => (s.plans[p] || []).reduce((a, x) => a + Number(x.pct || 0), 0)
  const clpSum = (s.clpMaster || []).reduce((a, x) => a + Number(x.pct || 0), 0)
  const save = () => { if ((s.clpMaster || []).length && Math.abs(clpSum - 1) > 0.001) return notify(`The master CLP schedule adds up to ${(clpSum * 100).toFixed(1)}%, not 100%`, 'bad'); for (const p of Object.keys(s.plans)) if (Math.abs(planSum(p) - 1) > 0.001) return notify(`${p} plan adds up to ${(planSum(p) * 100).toFixed(1)}%, not 100%`, 'bad'); setSettings(s); notify('Settings saved') }
  return (
    <Page title="Settings" back="/" backLabel="Dashboard" subtitle="Company details, the rate card and payment plans that drive cost sheets and receipts, and the workday for the time tracker." actions={<Button variant="primary" onClick={save}>Save settings</Button>}>
      <div className="grid g2">
        <Card title="Company (receipts and cost sheets)"><div className="form fc2">{[['name', 'Company'], ['project', 'Project'], ['location', 'Location'], ['address', 'Address'], ['gstin', 'GSTIN'], ['rera', 'RERA number'], ['bank', 'Bank'], ['account', 'Account no.'], ['ifsc', 'IFSC'], ['branch', 'Branch'], ['contact', 'Contact number'], ['cin', 'CIN'], ['regOffice', 'Registered office'], ['crmEmail', 'CRM e-mail (on demand letters)'], ['beneficiary', 'Account name (beneficiary)']].map(([k, l]) =>
          <Field key={k} label={l} span={k === 'address' || k === 'rera' || k === 'regOffice' ? 'all' : undefined}><Input value={s.company[k]} onChange={(e) => co(k, e.target.value)} /></Field>)}</div></Card>
        <Card title="Rate card"><div className="form fc2">
          {[['baseRate', 'Base rate (₹/sft)'], ['floorRiseStart', 'Floor rise starts above floor'], ['floorRisePerFloor', 'Floor rise per floor (₹/sft)'], ['approvalAbove', 'Approval needed above (% off)'], ['terraceRate', 'Terrace rate (₹/sft)'], ['parkingRate', 'Car park included with the type (₹ each)'], ['parkingExtraRate', 'Additional car park (₹ each)'], ['parkingExtraMax', 'Additional car parks allowed'], ['gst', 'GST (0.05 = 5%)'], ['mwssb', 'MWSSB / MESCOM (₹/sft)'], ['clubhouse', 'Clubhouse (₹)'], ['maintenance', 'Advance maintenance (₹/sft)'], ['sinking', 'Sinking fund (₹/sft)'], ['minBooking', 'Minimum booking (₹)'], ['validityDays', 'Cost sheet validity (days)']].map(([k, l]) =>
            <Field key={k} label={l}><Input type="number" value={s.rateCard[k]} onChange={(e) => rc(k, Number(e.target.value))} /></Field>)}
          <Field label="Founding privilege steps (% off, comma separated)" span="all"><Input value={(s.rateCard.discountSteps || []).join(', ')} onChange={(e) => rc('discountSteps', e.target.value.split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x)))} /></Field>
          {Object.keys(s.rateCard.parkingSlots || {}).map((t) => <Field key={t} label={`Car parks for ${t}`}><Input type="number" value={s.rateCard.parkingSlots[t]} onChange={(e) => rc('parkingSlots', { ...s.rateCard.parkingSlots, [t]: Number(e.target.value) })} /></Field>)}
        </div><p className="small muted">Example: base {inr(s.rateCard.baseRate)}; a 12th-floor residence pays {inr((12 - s.rateCard.floorRiseStart) * s.rateCard.floorRisePerFloor)}/sft floor rise.</p></Card>
      </div>
      <div className="grid g2"><SignInCard s={s} setS={setS} /><BrandCard s={s} setS={setS} /></div>
      <DriveCard s={s} setS={setS} />
      <ScheduleRulesCard s={s} setS={setS} />
      <InboxCard s={s} setS={setS} />
      <div className="grid g2">{Object.keys(s.plans).map((p) => <Card key={p} title={`Payment plan · ${p}`} actions={<Badge tone={Math.abs(planSum(p) - 1) < 0.001 ? 'good' : 'bad'}>{(planSum(p) * 100).toFixed(1)}%</Badge>}>
        {s.plans[p].map((x, k) => <div key={k} className="row gap-s" style={{ marginBottom: 6 }}><input className="input" style={{ flex: 1 }} value={x.stage} onChange={(e) => setS({ ...s, plans: { ...s.plans, [p]: s.plans[p].map((y, j) => (j === k ? { ...y, stage: e.target.value } : y)) } })} />
          <input className="input" type="number" style={{ width: 90 }} value={Math.round(x.pct * 1000) / 10} onChange={(e) => setS({ ...s, plans: { ...s.plans, [p]: s.plans[p].map((y, j) => (j === k ? { ...y, pct: Number(e.target.value) / 100 } : y)) } })} /><span className="small">%</span>
          <Button size="sm" variant="ghost" onClick={() => setS({ ...s, plans: { ...s.plans, [p]: s.plans[p].filter((_, j) => j !== k) } })}>×</Button></div>)}
        <Button size="sm" onClick={() => setS({ ...s, plans: { ...s.plans, [p]: [...s.plans[p], { stage: 'New stage', pct: 0 }] } })}>+ Stage</Button></Card>)}</div>
      <ClpMasterCard s={s} setS={setS} sum={clpSum} />
      <div className="grid g2">
        <Card title="Cost sheet terms (one per line)"><Textarea rows={9} value={(s.terms || []).join('\n')} onChange={(e) => setS({ ...s, terms: e.target.value.split('\n').filter(Boolean) })} /></Card>
        <Card title="Receipt notes (one per line)"><Textarea rows={9} value={(s.receiptNotes || []).join('\n')} onChange={(e) => setS({ ...s, receiptNotes: e.target.value.split('\n').filter(Boolean) })} /></Card>
      </div>
      <div className="grid g3">
        <Card title="Workday"><div className="form fc2"><Field label="Start"><Input type="time" value={s.workday?.start} onChange={(e) => setS({ ...s, workday: { ...s.workday, start: e.target.value } })} /></Field><Field label="End"><Input type="time" value={s.workday?.end} onChange={(e) => setS({ ...s, workday: { ...s.workday, end: e.target.value } })} /></Field></div></Card>
        <Card title="CRM rules"><div className="form fc2"><Field label="Demand GST"><Input type="number" value={s.gstDemand} onChange={(e) => setS({ ...s, gstDemand: Number(e.target.value) })} /></Field><Field label="Due days after call"><Input type="number" value={s.dueDays} onChange={(e) => setS({ ...s, dueDays: Number(e.target.value) })} /></Field>
          <Field label="RERA agreement threshold"><Input type="number" value={s.rera} onChange={(e) => setS({ ...s, rera: Number(e.target.value) })} /></Field><Field label="Red after days without contact"><Input type="number" value={s.contactRed} onChange={(e) => setS({ ...s, contactRed: Number(e.target.value) })} /></Field>
          <Field label="Escalate a missed follow-up after (working days)" hint="Then to the owner's manager; the same again goes one level up"><Input type="number" min={1} value={s.escalateDays ?? 2} onChange={(e) => setS({ ...s, escalateDays: Math.max(1, Number(e.target.value)) })} /></Field>
          <Field label="Private viewing slot (minutes)" hint="No two viewings can overlap within this window"><Input type="number" min={30} step={15} value={s.viewingSlot ?? 90} onChange={(e) => setS({ ...s, viewingSlot: Math.max(30, Number(e.target.value)) })} /></Field></div></Card>
        <Card title="Brand vocabulary">{(s.vocabulary || []).map(([a, b], k) => <div key={k} className="row gap-s" style={{ marginBottom: 6 }}><input className="input" value={a} onChange={(e) => setS({ ...s, vocabulary: s.vocabulary.map((v, j) => (j === k ? [e.target.value, v[1]] : v)) })} /><span>→</span><input className="input" value={b} onChange={(e) => setS({ ...s, vocabulary: s.vocabulary.map((v, j) => (j === k ? [v[0], e.target.value] : v)) })} /></div>)}</Card>
      </div>
    </Page>
  )
}

// 4 Nov: what a person can open. Ticks greyed out come with their role; the others are extra access an admin
// gives this one person. Saved on the user (extraAccess) and applied on the server too.
// 4 Nov: "give Medha Client 360 the way Cyril has it". Pick a colleague; Accord lists what they can do that this
// person cannot, ticked, and adds the ones you keep. Client 360 only narrows it to the client pages and powers.
const CLIENT_KEYS = ['clients', 'seeAll', 'money', 'assign', 'documents', 'payments', 'interactions', 'messages', 'issues']
function CopyAccess({ u, onAdd }) {
  const { raw } = useStore()
  const [from, setFrom] = useState('')
  const [scope, setScope] = useState('clients')
  const [skip, setSkip] = useState([])
  const other = raw.users.find((x) => x.name === from)
  const diff = other ? ACCESS_ITEMS.filter((x) => hasAccess(other, x.key) && !hasAccess(u, x.key) && (scope === 'all' || CLIENT_KEYS.includes(x.key))) : []
  const keep = diff.filter((x) => !skip.includes(x.key))
  const people = raw.users.filter((x) => x.id !== u.id && x.appRole !== 'none' && x.active !== 'No').map((x) => ({ value: x.name, label: `${x.name} · ${ROLES[x.appRole] || x.appRole}` }))
  return <div className="copy-access">
    <div className="row gap-s" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <b className="small">Same access as</b>
      <Select options={people} value={from} onChange={(e) => { setFrom(e.target.value); setSkip([]) }} placeholder="Pick a colleague" style={{ maxWidth: 260 }} />
      <Seg value={scope} onChange={(v) => { setScope(v); setSkip([]) }} options={[{ value: 'clients', label: 'Client 360 only' }, { value: 'all', label: 'Everything' }]} />
    </div>
    {other && (!diff.length ? <p className="small muted" style={{ margin: '8px 0 0' }}>{u.name || 'This person'} already has everything {other.name} has{scope === 'clients' ? ' in Client 360' : ''}.</p> : <>
      <p className="small" style={{ margin: '8px 0 4px' }}>{other.name} has these that {u.name || 'this person'} does not. Untick any you do not want to give.</p>
      {diff.map((x) => <label key={x.key} className="access-item"><input type="checkbox" checked={!skip.includes(x.key)} onChange={() => setSkip(skip.includes(x.key) ? skip.filter((k) => k !== x.key) : [...skip, x.key])} /><span>{x.label}</span></label>)}
      <Button size="sm" variant="primary" disabled={!keep.length} style={{ marginTop: 6 }} onClick={() => { onAdd(keep.map((x) => x.key)); setFrom(''); setSkip([]) }}>Give {keep.length} to {u.name || 'this person'}</Button>
      <span className="small muted"> · then press Save</span></>)}
  </div>
}

function AccessPicker({ u, onChange }) {
  const extra = extrasOf(u)
  const isAdminRole = u.appRole === 'admin'
  const toggle = (k) => onChange(extra.includes(k) ? extra.filter((x) => x !== k) : [...extra, k])
  const added = extra.filter((k) => !byRole(u, k))
  return <div className="sheet" style={{ marginTop: 16 }}>
    <div className="sheet-band"><span className="n">5</span><h4>Pages and permissions</h4><span className="note2">{isAdminRole ? 'Admins have everything' : added.length ? `${added.length} extra on top of the ${ROLES[u.appRole] || 'role'} defaults` : `${ROLES[u.appRole] || 'Role'} defaults only`}</span></div>
    <div style={{ padding: '12px 18px' }}>
      {!isAdminRole && <CopyAccess u={u} onAdd={(keys) => onChange([...new Set([...extra, ...keys])])} />}
      {!isAdminRole && <p className="small muted" style={{ marginTop: 0 }}>Greyed ticks come with the role and change when the role changes. Tick anything else to give this person extra access; untick to take it away. Only admins can change this.</p>}
      <div className="access-grid">{ACCESS.map((g) => <fieldset key={g.group} className="access-group"><legend>{g.group}</legend>
        {g.items.map((x) => { const def = byRole(u, x.key), on = def || extra.includes(x.key)
          return <label key={x.key} className={'access-item' + (def ? ' def' : on ? ' extra' : '')}>
            <input type="checkbox" checked={on} disabled={def || isAdminRole} onChange={() => toggle(x.key)} />
            <span>{x.label}</span>{def ? <span className="small muted"> · role</span> : on ? <span className="small"> · extra</span> : null}</label> })}
      </fieldset>)}</div>
      {added.some((k) => ['clients', 'documents', 'payments', 'leads'].includes(k)) && !byRole(u, 'seeAll') && !extra.includes('seeAll') && <p className="note info small">These pages show only the clients and leads this person is responsible for. Tick <b>See and edit every client and lead</b> to show all of them.</p>}
    </div>
  </div>
}

// 5 Nov: one linked device. Its own component (so the Yes / No question is not lost when the page refreshes its data),
// with a clear question, a busy state while the server answers, and the row gone as soon as it is released.
function DevRow({ u, dv }) {
  const { approveDevice, releaseDevice, notify } = useStore()
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const kind = dv.kind === 'phone' ? 'phone' : 'computer'
  const mine = dv.id === deviceId()
  const run = async (fn, done) => { setBusy(true); try { await fn(); notify(done) } catch (e) { notify('Not done: ' + e.message, 'bad') } finally { setBusy(false); setAsk(false) } }
  return <div className="check-row dev-row">
    <span><b>{kind === 'phone' ? 'Phone' : 'Computer'}</b> · {dv.label || dv.id}{mine && <Badge tone="info">This device</Badge>} <span className="small muted">· first {d(String(dv.at || '').slice(0, 10))}{dv.lastAt ? ' · last ' + d(String(dv.lastAt).slice(0, 10)) : ''}{dv.trustUntil && new Date(dv.trustUntil) > new Date() ? ' · trusted until ' + d(String(dv.trustUntil).slice(0, 10)) : ''}</span></span>
    <span className="row gap-s">{!dv.approved ? <>
        <Button size="sm" disabled={busy} onClick={() => run(() => approveDevice(u.id, dv.id, true), `${u.name}'s ${kind} approved`)}>Approve{(u.devices || []).some((x) => x.approved && (x.kind || 'computer') === kind) && u.appRole !== 'admin' ? ' (replaces the old one)' : ''}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => approveDevice(u.id, dv.id, false), 'Device refused')}>Refuse</Button></>
      : ask ? <span className="confirm"><span>Release this {kind}{mine ? ' (the one you are using)' : ''}? {u.name} will have to link it again.</span>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => run(() => releaseDevice(u.id, dv.id), `${kind === 'phone' ? 'Phone' : 'Computer'} released. ${u.name} can now link another.`)}>{busy ? 'Releasing…' : 'Yes, release'}</Button>
        <Button size="sm" disabled={busy} onClick={() => setAsk(false)}>No</Button></span>
      : <><Badge tone="good">Linked</Badge><Button size="sm" variant="ghost" onClick={() => setAsk(true)}>Release</Button></>}</span>
  </div>
}

// 12 Nov: duplicate accounts. Either the same row saved twice under one member ID, or the same person (same name or
// username, ignoring case, spaces and dots) under two IDs. One account is kept: the one with the authenticator linked,
// most devices, or seen most recently; its gaps are filled from the others, which are removed. Records point to people
// by name, so nothing else needs changing.
const normName = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const last10 = (x) => String(x ?? '').replace(/\D/g, '').slice(-10)
const dupScore = (u) => (u.totpSecret || u.mfa === 'Set' ? 1000 : 0) + (u.devices || []).filter((d) => d.approved).length * 100 + (u.active !== 'No' ? 5 : 0)
function dupGroups(users) {
  const groups = [], used = new Set()
  const add = (g) => { const key = g.map((u, i) => u.id + ':' + i).join(); if (used.has(key)) return; used.add(key); groups.push([...g].sort((a, b) => dupScore(b) - dupScore(a) || String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')))) }
  const by = (f) => { const m = {}; users.forEach((u) => { const k = f(u); if (k) (m[k] = m[k] || []).push(u) }); return Object.values(m).filter((g) => g.length > 1) }
  by((u) => normName(u.name)).forEach(add)
  by((u) => normName(u.username)).filter((g) => !groups.some((x) => g.every((u) => x.includes(u)))).forEach(add)
  return groups
}
function MergeUsers({ open, onClose, groups, me, upsert, remove, notify, dedupeUsers }) {
  const [keep, setKeep] = useState({})
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      let removed = 0
      if (groups.some((g) => new Set(g.map((u) => u.id)).size < g.length)) removed += await dedupeUsers()   // rows saved twice under one ID
      groups.forEach((g, gi) => {
        const ids = [...new Set(g.map((u) => u.id))]; if (ids.length < 2) return
        const kid = keep[gi] || g[0].id, k = g.find((u) => u.id === kid), rest = ids.filter((id) => id !== kid).map((id) => g.find((u) => u.id === id))
        if (rest.some((u) => u.id === me.id)) return notify(`Keep the account you are signed in with (${me.name}); it cannot be removed`, 'bad')
        const filled = { ...k }
        rest.forEach((u) => { ['email', 'phone', 'designation', 'role', 'reportsTo', 'department', 'employment', 'company', 'shiftStart', 'shiftEnd', 'workDays', 'photo'].forEach((f) => { if (!filled[f] && u[f]) filled[f] = u[f] })
          filled.extraAccess = [...new Set([...(Array.isArray(filled.extraAccess) ? filled.extraAccess : []), ...(Array.isArray(u.extraAccess) ? u.extraAccess : [])])] })
        upsert('users', filled, { action: 'duplicates merged' })
        rest.forEach((u) => { remove('users', u.id); removed++ })
      })
      notify(removed ? `${removed} duplicate account${removed === 1 ? '' : 's'} removed` : 'Nothing to remove')
      onClose()
    } catch (e) { notify('Not done: ' + e.message, 'bad') } finally { setBusy(false) }
  }
  return <Modal open={open} onClose={onClose} title="Duplicate accounts" wide footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy} onClick={go}>{busy ? 'Removing…' : 'Keep the ticked ones, remove the rest'}</Button></>}>
    <p className="small muted" style={{ marginTop: 0 }}>The same person appears more than once. Pick the account to keep: the suggested one has the authenticator linked or was used most recently. Missing details (e-mail, phone, reports to, extra access…) are copied from the others, then the others are removed. Rows saved twice under the same member ID are folded into one.</p>
    {groups.map((g, gi) => { const same = new Set(g.map((u) => u.id)).size === 1
      return <fieldset key={gi} className="access-group" style={{ marginBottom: 10 }}><legend>{g[0].name}{same ? ' · saved twice under ' + g[0].id : ''}</legend>
        {same ? <p className="small" style={{ margin: '4px 0' }}>Same member ID {g[0].id} appears {g.length} times. They are folded into one account (the one with the authenticator linked is kept).</p>
          : g.map((u, i) => <label key={u.id + i} className="access-item"><input type="radio" name={'k' + gi} checked={(keep[gi] || g[0].id) === u.id} onChange={() => setKeep({ ...keep, [gi]: u.id })} />
            <span><b>{u.name}</b> · @{u.username} · {u.id} · {ROLES[u.appRole] || u.appRole}<span className="small muted"> · {u.totpSecret || u.mfa === 'Set' ? 'authenticator linked' : 'not linked'} · {(u.devices || []).filter((x) => x.approved).length} device(s){u.lastSeen ? ' · last seen ' + d(String(u.lastSeen).slice(0, 10)) : ''}{u.id === me.id ? ' · you' : ''}{i === 0 ? ' · suggested' : ''}</span></span></label>)}
      </fieldset> })}
  </Modal>
}

export function AdminUsers() {
  const { raw, user, upsert, remove, nextId, notify, setUserPassword, approveDevice, releaseDevice, online, dedupeUsers } = useStore()
  const [edit, setEdit] = useState(null)
  const [merge, setMerge] = useState(false)
  const dups = dupGroups(raw.users)
  const rows = raw.users.filter((u, i) => raw.users.findIndex((x) => x.id === u.id) === i)   // a row saved twice is listed once
  const [pw, setPw] = useState('')
  const pending = raw.users.flatMap((u) => (u.devices || []).filter((dv) => !dv.approved).map((dv) => ({ u, dv })))
  const F = [
    { section: 'Member', n: '1' },
    { k: 'id', l: 'Member ID', auto: true, ph: 'Given on save' }, { k: 'name', l: 'Name (used in dropdowns)', req: true }, { k: 'username', l: 'Username', req: true, hint: 'Lower case, no spaces. Used to sign in.' },
    { k: 'designation', l: 'Designation', hint: 'Printed under the name in message templates' }, { k: 'team', l: 'Team', t: 'select', o: ['Sales', 'Management', 'Finance', 'Design', 'Sourcing', 'External'] },
    { k: 'department', l: 'Department', suggest: ['Sales', 'CRM', 'Accounts', 'Legal', 'Design', 'Sourcing', 'Marketing', 'HR', 'Admin', 'Management'] }, { k: 'employment', l: 'Employment', t: 'select', o: ['On roll', 'Off roll', 'Consultant', 'Intern'] },
    { k: 'company', l: 'Company', suggest: ['Yamuna Sky City', 'OuTSDe', 'Consultant'], hint: 'Which company this person is on the rolls of' }, { k: 'active', l: 'Active?', t: 'select', o: ['Yes', 'No'] },
    { k: 'role', l: 'Responsibilities', span: 'all' },
    { section: 'Contact', n: '2', note: 'E-mail is where follow-up reminders and the morning digest go' },
    { k: 'phone', l: 'Phone', t: 'tel' }, { k: 'email', l: 'Email', t: 'email' }, { k: 'reportsTo', l: 'Reports to', t: 'select', o: raw.users.map((u) => u.name), hint: 'Follow-ups this person leaves open are escalated here' },
    { section: 'Shift', n: '3', note: 'A punch-in after the shift start is marked late' },
    { k: 'shiftStart', l: 'Shift start', t: 'time' }, { k: 'shiftEnd', l: 'Shift end', t: 'time' }, { k: 'workDays', l: 'Working days', t: 'select', o: ['Mon-Sat', 'Mon-Fri', 'Tue-Sun', 'Flexible'] },
    { k: 'remoteAllowed', l: 'Remote work allowed', t: 'select', o: ['Yes', 'No'] },
    { section: 'Access', n: '4' },
    { k: 'appRole', l: 'Access role', t: 'select', o: Object.entries(ROLES).map(([value, label]) => ({ value, label })), req: true },
    { k: 'workspaces', l: 'Platforms', render: (v, set) => <Chips options={Object.keys(WORKSPACES)} value={Array.isArray(v.workspaces) ? v.workspaces : workspacesOf(v)} onChange={(x) => set('workspaces', x)} />, hint: 'Sales, Design, Vendors. Leave as is to follow the role.' },
    { k: 'deviceLock', l: 'Approve every new device', t: 'select', o: ['No', 'Yes'], hint: 'Even within the one computer and one phone. Admins are never limited.' },
  ]
  const save = () => {
    if (!edit.name || !edit.username) return notify('Name and username are needed', 'bad')
    const un = edit.username.trim().toLowerCase().replace(/\s+/g, '')
    if (raw.users.some((u) => u.id !== edit.id && String(u.username).toLowerCase() === un)) return notify('That username is taken', 'bad')
    // 12 Nov: no second account for the same person (same name, e-mail or mobile)
    const twin = raw.users.find((u) => u.id !== edit.id && (normName(u.name) === normName(edit.name) || (edit.email && String(u.email || '').toLowerCase() === String(edit.email).toLowerCase()) || (edit.phone && last10(u.phone) && last10(u.phone) === last10(edit.phone))))
    if (twin) return notify(`${twin.name} (@${twin.username}) already has an account with the same ${normName(twin.name) === normName(edit.name) ? 'name' : twin.email && String(twin.email).toLowerCase() === String(edit.email || '').toLowerCase() ? 'e-mail' : 'mobile'}. Open that one instead of adding a second.`, 'bad')
    const live = raw.users.find((x) => x.id === edit.id)   // devices change on their own (approve / release); never save an old copy over them
    upsert('users', { ...edit, devices: live ? live.devices || [] : edit.devices || [], username: un, id: edit.id || nextId('users', 'T-', 2) }); setEdit(null)
  }
  const temp = async () => { try { await setUserPassword(edit.id, pw); setEdit((e) => ({ ...e, mfa: 'Not set' })); notify(`Sign-in reset for ${edit.name}. Share the temporary password privately; they use it once to link their authenticator app.`); setPw('') } catch (e) { notify(e.message, 'bad') } }
  return (
    <Page title="Users and access" back="/" backLabel="Dashboard" subtitle="Usernames, passwords, roles, shifts and the platforms each person opens. Passwords are stored as salted hashes; nobody, including admins, can read them." actions={<Button variant="primary" onClick={() => setEdit({ appRole: 'sales', team: 'Sales', active: 'Yes', shiftStart: '09:30', shiftEnd: '18:30', workDays: 'Mon-Sat', remoteAllowed: 'No', deviceLock: 'No', mustChange: 'Yes' })}>Add a member</Button>}>
      {pending.length > 0 && <Card title="Devices waiting for approval">{pending.map(({ u, dv }) => <div key={u.id + dv.id}><div className="small" style={{ marginTop: 6 }}><b>{u.name}</b></div><DevRow u={u} dv={dv} /></div>)}
        <p className="small muted">Each person can use one computer and one phone. Approving a second phone or computer releases the old one.</p></Card>}
      {dups.length > 0 && <div className="note warn row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span><b>{dups.reduce((a, g) => a + g.length - 1, 0)} duplicate account{dups.reduce((a, g) => a + g.length - 1, 0) === 1 ? '' : 's'}</b> for {[...new Set(dups.map((g) => g[0].name))].join(', ')}. Keep one account per person.</span>
        <Button size="sm" variant="primary" onClick={() => setMerge(true)}>Review and remove duplicates</Button></div>}
      <MergeUsers open={merge} onClose={() => setMerge(false)} groups={dups} me={user} upsert={upsert} remove={remove} notify={notify} dedupeUsers={dedupeUsers} />
      <DataTable rows={rows} searchKeys={['name', 'username', 'role', 'designation']} onRowClick={(u) => { setPw(''); setEdit({ ...u }) }}
        columns={[{ key: 'name', label: 'Name', render: (u) => <div><b>{u.name}</b><div className="small muted">@{u.username || '–'}</div></div> }, { key: 'designation', label: 'Designation' }, { key: 'team', label: 'Team' },
          { key: 'appRole', label: 'Access', render: (u) => <Badge tone={u.appRole === 'admin' ? 'accent' : u.appRole === 'none' ? 'muted' : 'info'}>{ROLES[u.appRole]}</Badge> },
          { key: 'ws', label: 'Platforms', render: (u) => <span className="small">{workspacesOf(u).map((w) => WORKSPACES[w].label.replace('Accord ', '')).join(', ') || '–'}</span> },
          { key: 'shift', label: 'Shift', render: (u) => <span className="mono small">{u.shiftStart || '–'}–{u.shiftEnd || '–'}</span> },
          { key: 'mfa', label: 'Sign-in', render: (u) => u.mfa === 'Set' || u.totpSecret ? <Badge tone="good">App linked</Badge> : u.pwHash || u.hasPassword ? <Badge tone="warn">Temporary password</Badge> : <Badge tone="warn">Not set</Badge> },
          { key: 'dev', label: 'Devices', render: (u) => { const l = (u.devices || []).filter((x) => x.approved); return <span className="small">{l.length ? l.map((x) => (x.kind === 'phone' ? 'Phone' : 'Computer')).join(' + ') : '–'}{(u.devices || []).some((x) => !x.approved) ? ' · waiting' : ''}</span> } },
          { key: 'extra', label: 'Extra access', sortValue: (u) => extrasOf(u).length, render: (u) => { const x = extrasOf(u).filter((k) => !byRole(u, k)); return x.length ? <Badge tone="purple">+{x.length}</Badge> : <span className="small muted">Role only</span> } },
          { key: 'active', label: 'Active', render: (u) => <Badge>{u.active}</Badge> }]} />
      <Card title="What each role can do"><table className="table dense"><tbody>{Object.entries(ROLE_NOTES).map(([k, v]) => <tr key={k}><td style={{ width: 160 }}><b>{ROLES[k]}</b></td><td>{v}</td></tr>)}</tbody></table></Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? edit.name : 'New member'} wide footer={<>
        {/* 12 Nov: admins can delete an account. Their leads, clients and history stay (records keep the name); setting Active to No keeps the account but stops sign-in. */}
        {edit?.id && user.appRole === 'admin' && edit.id !== user.id && raw.users.some((x) => x.id === edit.id) && <span style={{ marginRight: 'auto' }}><Confirm variant="ghost" label={`Delete ${edit.name}'s account? They can no longer sign in. Their leads, clients and history stay. This cannot be undone.`} onConfirm={() => { remove('users', edit.id); notify(`${edit.name}'s account deleted`); setEdit(null) }}>Delete user</Confirm></span>}
        <Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && <><RecordForm sheet cols={3} fields={F} value={edit} onChange={setEdit} />
          <AccessPicker u={edit} onChange={(extraAccess) => setEdit({ ...edit, extraAccess })} />
          {edit.id && <div className="sheet" style={{ marginTop: 16 }}><div className="sheet-band"><span className="n">6</span><h4>Sign-in and devices</h4><span className="note2">{edit.mfa === 'Set' || edit.totpSecret ? 'Authenticator app linked' : 'Authenticator not linked yet'} · {online ? 'on the server' : 'on this device only'}</span></div>
            <div className="row" style={{ padding: 18 }}><input className="input" style={{ maxWidth: 280 }} type="text" autoComplete="off" placeholder="Temporary password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Temporary password" />
              <Button onClick={temp} disabled={pw.length < 8}>Reset sign-in</Button><span className="small muted">New phone or lost phone: set a temporary password (8+ characters, a letter and a number). It unlinks the old app; they use the password once and link the app again.</span></div>
            <p className="small" style={{ padding: '0 18px', margin: '0 0 12px' }}>{edit.email ? <>No phone to hand? They can sign in with a code e-mailed to <b>{edit.email}</b>.</> : <span className="missing">No e-mail on file, so e-mailed sign-in codes will not work for this person. Add one in the details above.</span>}</p>
            {(() => { const live = raw.users.find((x) => x.id === edit.id) || edit; const list = live.devices || []
              return list.length > 0 ? <div style={{ padding: '0 18px 18px' }}>{list.map((dv) => <DevRow key={dv.id} u={live} dv={dv} />)}</div> : <p className="small muted" style={{ padding: '0 18px 18px', margin: 0 }}>No devices linked.</p> })()}
          </div>}</>}
      </Modal>
    </Page>
  )
}

export function AdminData() {
  const { raw: db, settings, setSettings, sync, backend, siteBackend, pull, flush, seedBackend, replaceAll, resetToSeed, notify, loadStartingData, exportNow, online } = useStore()
  const [url, setUrl] = useState(settings.backendUrl || siteBackend || '')
  const [test, setTest] = useState('')
  const [folderUrl, setFolderUrl] = useState('')
  const [busy, setBusy] = useState('')
  const onStart = (f) => { if (!f) return; f.text().then((t) => { try { const n = loadStartingData(JSON.parse(t)); notify(`Loaded ${n.clients} bookings, ${n.leads} leads, ${n.payments} payments, ${n.interactions} interactions. Now press Seed the sheet.`) } catch (x) { notify(x.message, 'bad') } }) }
  const xlsx = async () => { setBusy('x'); try { const r = await exportNow(); setFolderUrl(r.folderUrl); window.open(r.url, '_blank'); notify('Accord Database.xlsx written to Accord_Data / Exports') } catch (e) { notify(e.message, 'bad') } finally { setBusy('') } }
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: 'application/json' })); a.download = `accord_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click() }
  const ping = async () => { setTest('Testing…'); try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ping' }) }).then((x) => x.json()); if (r.folderUrl) setFolderUrl(r.folderUrl); setTest(r.ok ? `Connected · ${r.sheet || 'sheet'} v${r.version || '?'} · ${r.users ?? '?'} users · data in ${r.folder || 'Drive'}` : 'Unexpected reply: ' + JSON.stringify(r).slice(0, 120)) } catch (e) { setTest('Could not reach it: ' + e.message) } }
  const size = new Blob([JSON.stringify(db)]).size
  return (
    <Page title="Data and sync" back="/" backLabel="Dashboard" subtitle="Connect the shared Google Sheet so the whole team works on one copy, back up, and see every change in the audit log.">
      <div className="grid g2">
        <Card title="Google Sheet backend">
          <p className="small" style={{ marginTop: 0 }}>The Accord Apps Script, deployed from the OuTSDe Google account (README, section 3). Everyone signs in against it; all data is saved in <b className="mono">Accord_Data</b> in the OuTSDe Drive. {siteBackend ? 'This site already carries the address in accord.config.js.' : 'Put the same address in site/accord.config.js so every phone and laptop connects without this step.'}</p>
          <Field label="Web app URL"><Input value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="https://script.google.com/macros/s/…/exec" /></Field>
          <div className="row" style={{ marginTop: 10 }}><Button onClick={ping} disabled={!url}>Test</Button><Button variant="primary" onClick={() => { setSettings({ backendUrl: url }); notify(url ? 'Backend saved. Sign out and in again to get a server session.' : 'Backend removed; working on this device') }}>Save</Button>{test && <span className="small">{test}</span>}</div>
          {backend && <div className="row" style={{ marginTop: 14 }}><Badge tone={sync.state === 'error' ? 'bad' : 'good'}>{sync.state}</Badge>{sync.at && <span className="small muted">last {new Date(sync.at).toLocaleTimeString()}</span>}{sync.error && <span className="small" style={{ color: 'var(--bad)' }}>{sync.error}</span>}
            <Button size="sm" onClick={pull}>Pull now</Button><Button size="sm" onClick={flush}>Push now</Button>
            <Confirm size="sm" label="Overwrite the sheet with this device's data?" onConfirm={async () => { try { await seedBackend(); notify('Sheet seeded from this device') } catch (e) { notify(e.message, 'bad') } }}>Seed the sheet</Confirm></div>}
          {backend && <div className="row" style={{ marginTop: 10 }}>{online && <Button size="sm" onClick={xlsx} disabled={!!busy}>{busy === 'x' ? 'Exporting…' : 'Export to Excel now'}</Button>}
            {folderUrl && <a className="btn btn-sm btn-ghost" href={folderUrl} target="_blank" rel="noreferrer">Open Accord_Data in Drive</a>}</div>}
        </Card>
        <Card title="Starting data (one time)">
          <p className="small" style={{ marginTop: 0 }}>The published app carries no client names. The bookings, payments, leads and interactions from the CRM master are in <b className="mono">Accord_Data / Starting data / accord-starting-data.json</b> in the OuTSDe Drive. Load it here once, on the admin's computer, then press <b>Seed the sheet</b>. After that the data lives only in the Google Sheet.</p>
          <div className="row"><label className="btn">Load starting data<input type="file" accept="application/json" hidden onChange={(e) => onStart(e.target.files[0])} /></label>
            <span className="small muted">On this device now: {db.clients?.length || 0} bookings · {db.leads?.length || 0} leads · {db.payments?.length || 0} payments</span></div>
        </Card>
      </div>
      <div className="grid g2">
        <Card title="Backup and restore">
          <p className="small" style={{ marginTop: 0 }}>Stored on this device: {(size / 1024).toFixed(0)} KB across {Object.keys(db).length} collections.</p>
          <div className="row"><Button onClick={exportJson}>Download backup (JSON)</Button>
            <label className="btn">Restore from backup<input type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { const j = JSON.parse(t); if (!j.clients || !j.users) throw new Error('Not an Accord backup'); replaceAll(j) } catch (x) { notify(x.message, 'bad') } }) }} /></label>
            <Confirm label="Clear the CRM data on this device? (The Google Sheet is not touched.)" onConfirm={resetToSeed}>Clear this device</Confirm></div>
          <table className="table dense" style={{ marginTop: 12 }}><tbody>{['clients', 'leads', 'interactions', 'payments', 'units', 'files', 'vendors', 'quotes', 'boq', 'attendance', 'viewings'].map((c) => <tr key={c}><td>{c}</td><td className="right">{db[c]?.length || 0}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Entries made by mistake">
          <p className="small" style={{ marginTop: 0 }}>Entries made while showing Accord around, or that look like tests (names like "test", phone 1234567890, ₹1 payments), are listed in <Link to="/admin/cleanup">Data clean-up</Link>. For practice and demonstrations use <b>Training mode</b> in your user menu: nothing entered there reaches the database.</p>
        </Card>
      </div>
      <Card title="Audit log" pad={false}><div style={{ padding: 12 }}>
        <DataTable rows={db.audit} dense initialSort={{ key: 'at', dir: 'desc' }} searchKeys={['by', 'coll', 'recId', 'action']} filters={[{ key: 'by', label: 'Who' }, { key: 'coll', label: 'Collection' }]}
          columns={[{ key: 'at', label: 'When', render: (a) => `${d(a.at)} ${new Date(a.at).toTimeString().slice(0, 5)}` }, { key: 'by', label: 'Who' }, { key: 'coll', label: 'Collection' }, { key: 'recId', label: 'Record' }, { key: 'action', label: 'Action' }]} /></div></Card>
    </Page>
  )
}

// 7 Nov: per-client payment schedules, interest, reminders and notices (Karnataka RERA), demand letter wording and
// cancellation rules. Every figure is a setting; your registered Agreement for Sale and allotment letter decide them.
function ScheduleRulesCard({ s, setS }) {
  const R = rulesOf(s)
  const put = (k, v) => setS({ ...s, [k]: v })
  const can = (k, v) => setS({ ...s, cancellation: { ...R.cancellation, ...(s.cancellation || {}), [k]: v } })
  const dl = (k, v) => setS({ ...s, demandLetter: { ...R.demandLetter, ...(s.demandLetter || {}), [k]: v } })
  const rates = R.interestRates || []
  const num = (k, l, hint) => <Field key={k} label={l} hint={hint}><Input type="number" value={R[k]} onChange={(e) => put(k, e.target.value === '' ? '' : Number(e.target.value))} /></Field>
  return <>
    <div className="grid g2">
      <Card title="Payment schedule and interest">
        <div className="form fc2">
          <Field label="Demand worked out from" span="all" hint="Check the Payments → Schedule check tab before switching"><Select options={[{ value: 'calls', label: 'Project-wide demand calls (as before)' }, { value: 'client', label: "Each client's own schedule (construction-linked)" }]} value={R.scheduleMode} onChange={(e) => put('scheduleMode', e.target.value)} /></Field>
          {num('dueDays', 'Days to pay after a demand letter', 'K-RERA model allotment letter: 15-day notice')}
          {num('interestGraceDays', 'Interest-free days after the due date', 'A business choice; 0 = from the next day')}
          {num('reminderDaysBefore', 'Reminder this many days before the due date')}
          {num('noticeAfterDays', 'Notice of default this many days after the due date')}
          {num('noticePeriodDays', 'The notice gives this many days to pay')}
          {num('defaultDemands', 'Consecutive unpaid demands that make a default', 'AFS clause 9.3: from your agreement')}
          {num('defaultMonths', 'Months the default continues before termination', 'AFS clause 9.3: blank in the template, from your agreement')}
          {num('terminationNoticeDays', "Days' notice before cancelling for default", 'AFS clause 9.3: at least 30')}
          {num('agreementWithinDays', 'Agreement to be executed within (days of the allotment letter)')}
        </div>
        <div className="form-section">Interest rate (SBI highest MCLR + 2%, a year)</div>
        {rates.map((r, i) => <div key={i} className="row gap-s" style={{ marginBottom: 6 }}><span className="small">From</span><Input type="date" value={r.from} onChange={(e) => put('interestRates', rates.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
          <Input type="number" step="0.05" style={{ width: 90 }} value={r.rate} onChange={(e) => put('interestRates', rates.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) } : x)))} /><span className="small">%</span>
          <Button size="sm" variant="ghost" onClick={() => put('interestRates', rates.filter((_, j) => j !== i))}>×</Button></div>)}
        <Button size="sm" onClick={() => put('interestRates', [...rates, { from: new Date().toISOString().slice(0, 10), rate: '' }])}>+ Rate from a date</Button>
        <p className="small muted">Add a new line whenever SBI changes its MCLR; interest uses the rate in force on each day. No rate entered means no interest is shown.</p>
      </Card>
      <Card title="Cancellation rules">
        <div className="form fc2">
          <Field label="Before the agreement: charge by days after the allotment letter" span="all" hint="K-RERA model allotment letter clause 8: Nil to 15 days, 1% to 30, 1.5% to 60, 2% after">
            <div>{(R.cancellation.allotmentSlabs || []).map((x, i) => <div key={i} className="row gap-s" style={{ marginBottom: 4 }}><span className="small">up to day</span><Input type="number" style={{ width: 90 }} value={x.upTo} onChange={(e) => can('allotmentSlabs', R.cancellation.allotmentSlabs.map((y, j) => (j === i ? { ...y, upTo: Number(e.target.value) } : y)))} />
              <Input type="number" step="0.1" style={{ width: 80 }} value={Math.round(x.pct * 1000) / 10} onChange={(e) => can('allotmentSlabs', R.cancellation.allotmentSlabs.map((y, j) => (j === i ? { ...y, pct: Number(e.target.value) / 100 } : y)))} /><span className="small">% of unit cost</span></div>)}</div></Field>
          <Field label="Refund within (days), before agreement"><Input type="number" value={R.cancellation.allotmentRefundDays} onChange={(e) => can('allotmentRefundDays', Number(e.target.value))} /></Field>
          <Field label="Refund within (days), after agreement" hint="AFS clause 7.5: 60"><Input type="number" value={R.cancellation.afterAgreementRefundDays} onChange={(e) => can('afterAgreementRefundDays', Number(e.target.value))} /></Field>
          <Field label="Booking amount forfeited after agreement (%)" hint="No more than 5% (AFS Schedule C)"><Input type="number" step="0.1" value={Math.round(R.cancellation.bookingAmountPct * 1000) / 10} onChange={(e) => can('bookingAmountPct', Math.min(5, Number(e.target.value)) / 100)} /></Field>
          <Field label="Refund within (days), developer cancels for default"><Input type="number" value={R.cancellation.defaultRefundDays} onChange={(e) => can('defaultRefundDays', Number(e.target.value))} /></Field>
          <Field label="GST on cancellation"><Select options={['Credit note', 'Buyer to claim']} value={R.cancellation.gstRefundMode} onChange={(e) => can('gstRefundMode', e.target.value)} /></Field>
          <Field label="Deduct channel-partner brokerage" hint="Default No: the Karnataka formats allow only the booking amount and interest"><Select options={['No', 'Yes']} value={R.cancellation.brokerageDeducted} onChange={(e) => can('brokerageDeducted', e.target.value)} /></Field>
          <Field label="Days for the retention call"><Input type="number" value={R.cancellation.coolingDays} onChange={(e) => can('coolingDays', Number(e.target.value))} /></Field>
          <Field label="Second admin needed above (₹ refund or waiver)"><Input type="number" value={R.cancellation.approvalAbove} onChange={(e) => can('approvalAbove', Number(e.target.value))} /></Field>
        </div>
      </Card>
    </div>
    <Card title="Demand letter wording">
      <p className="small muted" style={{ marginTop: 0 }}>Placeholders: {'{units} {project} {location} {company} {stage} {cert} {dueDate} {dueDays} {letterNo} {rate}'}. The amounts, bank details and the client block come from the records.</p>
      <div className="form fc2">
        <Field label="Subject" span="all"><Input value={R.demandLetter.subject} onChange={(e) => dl('subject', e.target.value)} /></Field>
        {[['body', 'Opening paragraph'], ['payNote', 'How to pay'], ['tdsNote', 'TDS note (consideration ₹50 lakh or more)'], ['complianceNote', 'RERA and interest clause'], ['disregardNote', 'Already paid note']].map(([k, l]) =>
          <Field key={k} label={l} span="all"><Textarea rows={3} value={R.demandLetter[k]} onChange={(e) => dl(k, e.target.value)} /></Field>)}
        <Field label="Contact person"><Input value={R.demandLetter.contactName} onChange={(e) => dl('contactName', e.target.value)} /></Field>
        <Field label="Contact phone"><Input value={R.demandLetter.contactPhone} onChange={(e) => dl('contactPhone', e.target.value)} /></Field>
        <Field label="Signatory name"><Input value={R.demandLetter.signatoryName} onChange={(e) => dl('signatoryName', e.target.value)} /></Field>
        <Field label="Signatory designation"><Input value={R.demandLetter.signatoryDesignation} onChange={(e) => dl('signatoryDesignation', e.target.value)} /></Field>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setS({ ...s, demandLetter: { ...DEFAULT_RULES.demandLetter, contactName: R.demandLetter.contactName, contactPhone: R.demandLetter.contactPhone, signatoryName: R.demandLetter.signatoryName, signatoryDesignation: R.demandLetter.signatoryDesignation } })}>Restore the standard wording</Button>
    </Card>
  </>
}

// 8 Nov: the master construction-linked (CLP) schedule printed on every cost sheet as a general reference for the
// client. It is separate from Building and parking → Construction, which tracks the real stages and their dates.
function ClpMasterCard({ s, setS, sum }) {
  const { db } = useStore()
  const rows = s.clpMaster || []
  const set = (rs) => setS({ ...s, clpMaster: rs })
  const fromStages = () => set([...(db.clpStages || [])].filter((x) => Number(x.pct) > 0).sort((a, b) => Number(a.no) - Number(b.no)).map((x) => ({ stage: x.stage, pct: Number(x.pct), timing: '' })))
  return <Card title="Master CLP schedule · on every cost sheet" actions={<span className="row gap-s">{rows.length > 0 && <Badge tone={Math.abs(sum - 1) < 0.001 ? 'good' : 'bad'}>{(sum * 100).toFixed(1)}%</Badge>}<Button size="sm" onClick={fromStages}>{rows.length ? 'Reset from construction stages' : 'Start from construction stages'}</Button></span>}>
    <p className="small muted" style={{ marginTop: 0 }}>The generalised construction-linked payment schedule sent to clients as a reference on page 2 of the cost sheet, with each stage's amount worked out on that residence's grand total. The indicative timing is optional (for example "Month 6" or "Mar 2027"). Until this is filled, the cost sheet uses the construction stages.</p>
    {!rows.length ? <p className="muted" style={{ margin: 0 }}>Not set yet.</p> : <table className="table dense"><thead><tr><th>#</th><th>Stage</th><th className="right">%</th><th>Indicative timing</th><th /></tr></thead>
      <tbody>{rows.map((x, k) => <tr key={k}><td className="mono">{k + 1}</td>
        <td><input className="input" value={x.stage} onChange={(e) => set(rows.map((y, j) => (j === k ? { ...y, stage: e.target.value } : y)))} aria-label={'Stage ' + (k + 1)} /></td>
        <td className="right"><input className="input" type="number" step="0.5" style={{ width: 80 }} value={Math.round(Number(x.pct) * 1000) / 10} onChange={(e) => set(rows.map((y, j) => (j === k ? { ...y, pct: Number(e.target.value) / 100 } : y)))} aria-label={'Percent for stage ' + (k + 1)} /></td>
        <td><input className="input" style={{ width: 130 }} value={x.timing || ''} placeholder="optional" onChange={(e) => set(rows.map((y, j) => (j === k ? { ...y, timing: e.target.value } : y)))} aria-label={'Timing for stage ' + (k + 1)} /></td>
        <td className="nowrap"><Button size="sm" variant="ghost" disabled={k === 0} onClick={() => { const r = [...rows]; [r[k - 1], r[k]] = [r[k], r[k - 1]]; set(r) }} aria-label="Move up">↑</Button><Button size="sm" variant="ghost" onClick={() => set(rows.filter((_, j) => j !== k))} aria-label="Remove">×</Button></td></tr>)}</tbody></table>}
    <Button size="sm" onClick={() => set([...rows, { stage: 'New stage', pct: 0, timing: '' }])}>+ Stage</Button>
  </Card>
}
