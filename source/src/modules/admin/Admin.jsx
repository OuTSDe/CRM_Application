import React, { useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { ROLES, ROLE_NOTES, WORKSPACES, workspacesOf, ACCESS, byRole, extrasOf } from '../../lib/perms.js'
import RecordForm from '../../components/RecordForm.jsx'
import { Page, Card, Button, Badge, Field, Input, Textarea, Select, Modal, Confirm, Chips } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { d, inr } from '../../lib/format.js'
import { getLocation } from '../../lib/geo.js'
import { Link } from 'react-router-dom'

function BrandCard({ s, setS }) {
  const { upload, online, notify } = useStore()
  const b = s.brand || {}
  const set = (k, v) => setS({ ...s, brand: { ...b, [k]: v } })
  const onLogo = async (f) => {
    if (!f) return
    if (f.size > 400 * 1024) return notify('Use a logo under 400 KB (PNG or SVG works best)', 'bad')
    const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f) })
    setS({ ...s, brand: { ...b, logo: url } })
    if (online) { try { await upload(f, 'Brand', 'Yamuna Sky City logo', { kind: 'brand', doc: 'Logo' }); notify('Logo saved to Drive / Brand for e-mails') } catch (e) { notify('Logo kept for documents; Drive copy failed: ' + e.message, 'warn') } }
  }
  return <Card title="Brand on documents and e-mails">
    <p className="small" style={{ marginTop: 0 }}>The Yamuna Sky City header printed on the cost sheet, receipts, payment summary, booking form and lead sheet, and at the top of every e-mail Accord sends.</p>
    <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
      <div className="logo-box">{b.logo ? <img src={b.logo} alt="Logo" /> : <span className="small muted">No logo yet</span>}</div>
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
      <Field label="Location check at punch-in" hint="Office and Site count only at Sky City; elsewhere it is logged as remote"><Select options={['On', 'Off']} value={s.geofence || 'On'} onChange={(e) => setS({ ...s, geofence: e.target.value })} /></Field>
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
  const save = () => { for (const p of Object.keys(s.plans)) if (Math.abs(planSum(p) - 1) > 0.001) return notify(`${p} plan adds up to ${(planSum(p) * 100).toFixed(1)}%, not 100%`, 'bad'); setSettings(s); notify('Settings saved') }
  return (
    <Page title="Settings" back="/" backLabel="Dashboard" subtitle="Company details, the rate card and payment plans that drive cost sheets and receipts, and the workday for the time tracker." actions={<Button variant="primary" onClick={save}>Save settings</Button>}>
      <div className="grid g2">
        <Card title="Company (receipts and cost sheets)"><div className="form fc2">{[['name', 'Company'], ['project', 'Project'], ['location', 'Location'], ['address', 'Address'], ['gstin', 'GSTIN'], ['rera', 'RERA number'], ['bank', 'Bank'], ['account', 'Account no.'], ['ifsc', 'IFSC'], ['branch', 'Branch'], ['contact', 'Contact number']].map(([k, l]) =>
          <Field key={k} label={l} span={k === 'address' || k === 'rera' ? 'all' : undefined}><Input value={s.company[k]} onChange={(e) => co(k, e.target.value)} /></Field>)}</div></Card>
        <Card title="Rate card"><div className="form fc2">
          {[['baseRate', 'Base rate (₹/sft)'], ['floorRiseStart', 'Floor rise starts above floor'], ['floorRisePerFloor', 'Floor rise per floor (₹/sft)'], ['approvalAbove', 'Approval needed above (% off)'], ['terraceRate', 'Terrace rate (₹/sft)'], ['parkingRate', 'Car park included with the type (₹ each)'], ['parkingExtraRate', 'Additional car park (₹ each)'], ['parkingExtraMax', 'Additional car parks allowed'], ['gst', 'GST (0.05 = 5%)'], ['mwssb', 'MWSSB / MESCOM (₹/sft)'], ['clubhouse', 'Clubhouse (₹)'], ['maintenance', 'Advance maintenance (₹/sft)'], ['sinking', 'Sinking fund (₹/sft)'], ['minBooking', 'Minimum booking (₹)'], ['validityDays', 'Cost sheet validity (days)']].map(([k, l]) =>
            <Field key={k} label={l}><Input type="number" value={s.rateCard[k]} onChange={(e) => rc(k, Number(e.target.value))} /></Field>)}
          <Field label="Founding privilege steps (% off, comma separated)" span="all"><Input value={(s.rateCard.discountSteps || []).join(', ')} onChange={(e) => rc('discountSteps', e.target.value.split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x)))} /></Field>
          {Object.keys(s.rateCard.parkingSlots || {}).map((t) => <Field key={t} label={`Car parks for ${t}`}><Input type="number" value={s.rateCard.parkingSlots[t]} onChange={(e) => rc('parkingSlots', { ...s.rateCard.parkingSlots, [t]: Number(e.target.value) })} /></Field>)}
        </div><p className="small muted">Example: base {inr(s.rateCard.baseRate)}; a 12th-floor residence pays {inr((12 - s.rateCard.floorRiseStart) * s.rateCard.floorRisePerFloor)}/sft floor rise.</p></Card>
      </div>
      <div className="grid g2"><SignInCard s={s} setS={setS} /><BrandCard s={s} setS={setS} /></div>
      <DriveCard s={s} setS={setS} />
      <InboxCard s={s} setS={setS} />
      <div className="grid g2">{Object.keys(s.plans).map((p) => <Card key={p} title={`Payment plan · ${p}`} actions={<Badge tone={Math.abs(planSum(p) - 1) < 0.001 ? 'good' : 'bad'}>{(planSum(p) * 100).toFixed(1)}%</Badge>}>
        {s.plans[p].map((x, k) => <div key={k} className="row gap-s" style={{ marginBottom: 6 }}><input className="input" style={{ flex: 1 }} value={x.stage} onChange={(e) => setS({ ...s, plans: { ...s.plans, [p]: s.plans[p].map((y, j) => (j === k ? { ...y, stage: e.target.value } : y)) } })} />
          <input className="input" type="number" style={{ width: 90 }} value={Math.round(x.pct * 1000) / 10} onChange={(e) => setS({ ...s, plans: { ...s.plans, [p]: s.plans[p].map((y, j) => (j === k ? { ...y, pct: Number(e.target.value) / 100 } : y)) } })} /><span className="small">%</span>
          <Button size="sm" variant="ghost" onClick={() => setS({ ...s, plans: { ...s.plans, [p]: s.plans[p].filter((_, j) => j !== k) } })}>×</Button></div>)}
        <Button size="sm" onClick={() => setS({ ...s, plans: { ...s.plans, [p]: [...s.plans[p], { stage: 'New stage', pct: 0 }] } })}>+ Stage</Button></Card>)}</div>
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
function AccessPicker({ u, onChange }) {
  const extra = extrasOf(u)
  const isAdminRole = u.appRole === 'admin'
  const toggle = (k) => onChange(extra.includes(k) ? extra.filter((x) => x !== k) : [...extra, k])
  const added = extra.filter((k) => !byRole(u, k))
  return <div className="sheet" style={{ marginTop: 16 }}>
    <div className="sheet-band"><span className="n">5</span><h4>Pages and permissions</h4><span className="note2">{isAdminRole ? 'Admins have everything' : added.length ? `${added.length} extra on top of the ${ROLES[u.appRole] || 'role'} defaults` : `${ROLES[u.appRole] || 'Role'} defaults only`}</span></div>
    <div style={{ padding: '12px 18px' }}>
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

export function AdminUsers() {
  const { raw, upsert, nextId, notify, setUserPassword, approveDevice, releaseDevice, online } = useStore()
  const [edit, setEdit] = useState(null)
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
    upsert('users', { ...edit, username: un, id: edit.id || nextId('users', 'T-', 2) }); setEdit(null)
  }
  const temp = async () => { try { await setUserPassword(edit.id, pw); setEdit((e) => ({ ...e, mfa: 'Not set' })); notify(`Sign-in reset for ${edit.name}. Share the temporary password privately; they use it once to link their authenticator app.`); setPw('') } catch (e) { notify(e.message, 'bad') } }
  const DevRow = ({ u, dv }) => <div className="check-row"><span><b>{dv.kind === 'phone' ? 'Phone' : 'Computer'}</b> · {dv.label || dv.id} <span className="small muted">· first {d(String(dv.at || '').slice(0, 10))}{dv.lastAt ? ' · last ' + d(String(dv.lastAt).slice(0, 10)) : ''}</span></span>
    <span className="row gap-s">{dv.approved ? <><Badge tone="good">Linked</Badge><Confirm size="sm" label={`Release this ${dv.kind || 'device'}? ${u.name} can then link another.`} onConfirm={() => releaseDevice(u.id, dv.id)}>Release</Confirm></>
      : <><Button size="sm" onClick={() => approveDevice(u.id, dv.id, true)}>Approve{(u.devices || []).some((x) => x.approved && (x.kind || 'computer') === (dv.kind || 'computer')) && u.appRole !== 'admin' ? ' (replaces the old one)' : ''}</Button><Button size="sm" variant="ghost" onClick={() => approveDevice(u.id, dv.id, false)}>Refuse</Button></>}</span></div>
  return (
    <Page title="Users and access" back="/" backLabel="Dashboard" subtitle="Usernames, passwords, roles, shifts and the platforms each person opens. Passwords are stored as salted hashes; nobody, including admins, can read them." actions={<Button variant="primary" onClick={() => setEdit({ appRole: 'sales', team: 'Sales', active: 'Yes', shiftStart: '09:30', shiftEnd: '18:30', workDays: 'Mon-Sat', remoteAllowed: 'No', deviceLock: 'No', mustChange: 'Yes' })}>Add a member</Button>}>
      {pending.length > 0 && <Card title="Devices waiting for approval">{pending.map(({ u, dv }) => <div key={u.id + dv.id}><div className="small" style={{ marginTop: 6 }}><b>{u.name}</b></div><DevRow u={u} dv={dv} /></div>)}
        <p className="small muted">Each person can use one computer and one phone. Approving a second phone or computer releases the old one.</p></Card>}
      <DataTable rows={raw.users} searchKeys={['name', 'username', 'role', 'designation']} onRowClick={(u) => { setPw(''); setEdit({ ...u }) }}
        columns={[{ key: 'name', label: 'Name', render: (u) => <div><b>{u.name}</b><div className="small muted">@{u.username || '–'}</div></div> }, { key: 'designation', label: 'Designation' }, { key: 'team', label: 'Team' },
          { key: 'appRole', label: 'Access', render: (u) => <Badge tone={u.appRole === 'admin' ? 'accent' : u.appRole === 'none' ? 'muted' : 'info'}>{ROLES[u.appRole]}</Badge> },
          { key: 'ws', label: 'Platforms', render: (u) => <span className="small">{workspacesOf(u).map((w) => WORKSPACES[w].label.replace('Accord ', '')).join(', ') || '–'}</span> },
          { key: 'shift', label: 'Shift', render: (u) => <span className="mono small">{u.shiftStart || '–'}–{u.shiftEnd || '–'}</span> },
          { key: 'mfa', label: 'Sign-in', render: (u) => u.mfa === 'Set' || u.totpSecret ? <Badge tone="good">App linked</Badge> : u.pwHash || u.hasPassword ? <Badge tone="warn">Temporary password</Badge> : <Badge tone="warn">Not set</Badge> },
          { key: 'dev', label: 'Devices', render: (u) => { const l = (u.devices || []).filter((x) => x.approved); return <span className="small">{l.length ? l.map((x) => (x.kind === 'phone' ? 'Phone' : 'Computer')).join(' + ') : '–'}{(u.devices || []).some((x) => !x.approved) ? ' · waiting' : ''}</span> } },
          { key: 'extra', label: 'Extra access', sortValue: (u) => extrasOf(u).length, render: (u) => { const x = extrasOf(u).filter((k) => !byRole(u, k)); return x.length ? <Badge tone="purple">+{x.length}</Badge> : <span className="small muted">Role only</span> } },
          { key: 'active', label: 'Active', render: (u) => <Badge>{u.active}</Badge> }]} />
      <Card title="What each role can do"><table className="table dense"><tbody>{Object.entries(ROLE_NOTES).map(([k, v]) => <tr key={k}><td style={{ width: 160 }}><b>{ROLES[k]}</b></td><td>{v}</td></tr>)}</tbody></table></Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? edit.name : 'New member'} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && <><RecordForm sheet cols={3} fields={F} value={edit} onChange={setEdit} />
          <AccessPicker u={edit} onChange={(extraAccess) => setEdit({ ...edit, extraAccess })} />
          {edit.id && <div className="sheet" style={{ marginTop: 16 }}><div className="sheet-band"><span className="n">6</span><h4>Sign-in and devices</h4><span className="note2">{edit.mfa === 'Set' || edit.totpSecret ? 'Authenticator app linked' : 'Authenticator not linked yet'} · {online ? 'on the server' : 'on this device only'}</span></div>
            <div className="row" style={{ padding: 18 }}><input className="input" style={{ maxWidth: 280 }} type="text" autoComplete="off" placeholder="Temporary password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Temporary password" />
              <Button onClick={temp} disabled={pw.length < 8}>Reset sign-in</Button><span className="small muted">New phone or lost phone: set a temporary password (8+ characters, a letter and a number). It unlinks the old app; they use the password once and link the app again.</span></div>
            {(edit.devices || []).length > 0 && <div style={{ padding: '0 18px 18px' }}>{edit.devices.map((dv) => <DevRow key={dv.id} u={edit} dv={dv} />)}</div>}
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
