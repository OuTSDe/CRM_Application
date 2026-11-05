import React, { useMemo, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canWrite, canAssignTasks, seesAll } from '../../lib/perms.js'
import { OPS, DEFAULT_TEMPLATES } from '../../lib/seed.js'
import { Page, Card, Button, Badge, Modal, Grid, Stat, KV, Chips, Seg } from '../../components/ui.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm, { missingRequired, missingKeys } from '../../components/RecordForm.jsx'
import LogInteraction, { OutcomeBadge } from '../../components/LogInteraction.jsx'
import { d, today, waLink, TITLES, CITIES, fullName, salute, hm12, nextWhen } from '../../lib/format.js'

// Mirrors the "Leads & Prospects" tab: LEAD · SOURCE · REQUIREMENT · PIPELINE · OUTCOME
export const LEAD_FIELDS = (team, canAssign = true, partners = []) => [
  { section: 'Lead', n: '1' },
  { k: 'id', l: 'Lead ID', auto: true, ph: 'Given on save' }, { k: 'date', l: 'Date captured', t: 'date' }, { k: 'title', l: 'Title', t: 'select', o: TITLES, hint: 'Used in every message: Dear Dr. …' },
  { k: 'name', l: 'Name', req: true, span: 2 }, { k: 'phone', l: 'Mobile (primary)', t: 'tel', req: true, hint: 'Checked for duplicates on save' },
  { k: 'phone2', l: 'Other numbers', t: 'tel', hint: 'Separate with commas' }, { k: 'email', l: 'Email', t: 'email', req: true },
  { k: 'city', l: 'City', suggest: CITIES, ph: 'Start typing' }, { k: 'country', l: 'Country', suggest: ['India', 'UAE', 'Qatar', 'Oman', 'Kuwait', 'Saudi Arabia', 'Bahrain', 'Singapore', 'United Kingdom', 'USA', 'Canada', 'Australia'] }, { k: 'residency', l: 'Residential status', t: 'select', o: 'Residential status' },
  { section: 'Source', n: '2' },
  { k: 'source', l: 'Primary lead source', t: 'select', o: 'Lead source', req: true }, partners.length ? { k: 'partner', l: 'Channel partner', t: 'select', o: partners, hint: 'From Leads › Channel partners' } : { k: 'partner', l: 'Channel partner', hint: 'Add partners under Leads › Channel partners' }, { k: 'referredBy', l: 'Referred by', hint: 'Name of the person who referred them' },
  { k: 'sources', l: 'Also came through', t: 'chips', o: 'Lead source', span: 'all' },
  { section: 'Requirement', n: '3' },
  { k: 'config', l: 'Configuration interest', t: 'select', o: 'Configuration' }, { k: 'budget', l: 'Budget band', t: 'select', o: 'Budget band' }, { k: 'purpose', l: 'Purpose', t: 'select', o: 'Buying purpose' },
  { k: 'timeline', l: 'Buying timeline', t: 'select', o: 'Buying timeline' },
  { k: 'interests', l: 'Interests (to personalise the viewing)', t: 'chips', o: OPS.INTERESTS, span: 'all' },
  { section: 'Pipeline', n: '4', note: 'Last contact and next follow-up are read from the interaction log' },
  canAssign ? { k: 'owner', l: 'Assigned to', t: 'select', o: team } : { k: 'owner', l: 'Assigned to', auto: true },
  { k: 'coOwners', l: 'Also responsible', t: 'chips', o: team, span: 'all', hint: 'Everyone here sees the lead and gets its follow-up reminders' },
  { k: 'stage', l: 'Stage', t: 'select', o: 'Lead stage', req: true }, { k: 'temperature', l: 'Temperature', t: 'select', o: 'Temperature' },
  { k: 'svDone', l: 'Site visit done?', t: 'select', o: 'Yes / No' }, { k: 'svDate', l: 'Site visit date', t: 'date' },
  { section: 'Outcome', n: '5' },
  { k: 'lostReason', l: 'Lost / dormant reason', t: 'select', o: LOST_REASONS, hint: 'Required when the stage is Lost' }, { k: 'lostNote', l: 'Lost: more detail' }, { k: 'clientId', l: 'Converted to Client ID', auto: true },
  { k: 'notes', l: 'Notes and call history', t: 'textarea', span: 'all' },
]
export const LOST_REASONS = ['Not responding', 'Budget', 'Bought elsewhere', 'Location', 'Amenities / product', 'Timeline', 'Payment plan', 'Loan not approved', 'Family decision', 'Investor, not now', 'Duplicate / wrong number', 'Other']
// 2 Nov: what a lead still lacks, so the team can fill the gaps
export const LEAD_GAPS = [['title', 'Title'], ['email', 'Email'], ['city', 'City'], ['config', 'Configuration'], ['budget', 'Budget'], ['purpose', 'Purpose'], ['timeline', 'Timeline'], ['owner', 'Advisor']]
export const gapsOf = (l) => LEAD_GAPS.filter(([k]) => !l[k] || String(l[k]).trim() === '' || /^name not given$/i.test(String(l[k]))).map(([, x]) => x).concat(!l.name || /not given/i.test(l.name) ? ['Name'] : [])
const OPEN = (l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage)
// 5 Nov: channel partners are picked from the partner directory (each has a code)
export const partnerLabel = (p) => `${p.name}${p.firm ? ', ' + p.firm : ''} (${p.code})`
export const partnerOptions = (db) => { const a = (db.partners || []).filter((p) => p.status !== 'Inactive').map(partnerLabel); const old = [...new Set(db.leads.map((l) => l.partner).filter((x) => x && !a.includes(x)))]; return a.length ? [...a, ...old] : [] }

// 2 Nov: enquiries that come in by themselves (bot, WhatsApp tool, 99acres, website) land in the inbox first.
const SRC = { whatsapp: 'WhatsApp', '99acres': '99acres', website: 'Website', sms: 'SMS', facebook: 'Facebook / Instagram', instagram: 'Facebook / Instagram', google: 'Google ads' }
const srcOf = (s) => SRC[String(s || '').toLowerCase()] || (META_SOURCES.includes(s) ? s : 'Other')
const META_SOURCES = ['WhatsApp', '99acres', 'Website', 'Walk-in', 'Incoming call', 'SMS', 'Facebook / Instagram', 'Google ads', 'Other']
const fromInbox = (x) => ({ inboxId: x.id, name: x.name || '', phone: x.phone || '', email: x.email || '', city: x.city || '', config: x.config || '', source: srcOf(x.source), notes: [x.message, 'From the lead inbox, ' + (x.source || 'inbound') + ', ' + String(x.at || '').slice(0, 10)].filter(Boolean).join('\n') })
export function parseEnquiry(text) {
  const s = String(text || ''), out = {}
  const ph = s.match(/(?:\+?\d[\d\s-]{8,}\d)/); if (ph) { const dd = ph[0].replace(/\D/g, ''); out.phone = dd.length > 10 ? '+' + dd : dd }
  const em = s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (em) out.email = em[0]
  const at = s.search(/(?:name\s*[:\-]|i am|i'm|this is|my name is)\s*/i)
  if (at >= 0) { const rest = s.slice(at).replace(/^(?:name\s*[:\-]|i am|i'm|this is|my name is)\s*/i, ''); const nm = rest.match(/^([A-Z][a-zA-Z.]+(?:\s+[A-Z][a-zA-Z.]+){0,3})/); if (nm) out.name = nm[1].split(/\s+/).filter((w, i, a) => !CITIES.some((c) => c.toLowerCase() === w.toLowerCase()) || i === 0).join(' ').trim() }
  const bhk = s.match(/(\d)\s*-?\s*bhk/i); if (bhk) out.config = bhk[1] + ' BHK'
  const city = CITIES.find((c) => new RegExp('\\b' + c + '\\b', 'i').test(s)); if (city) out.city = city
  if (/whats\s?app/i.test(s)) out.source = 'WhatsApp'; else if (/99\s?acres/i.test(s)) out.source = '99acres'; else if (/website|web form/i.test(s)) out.source = 'Website'
  out.notes = s.slice(0, 1500)
  return out
}
function Inbox({ onAccept }) {
  const { db, user, upsert, notify } = useStore()
  const [show, setShow] = useState('New')
  const list = (db.leadInbox || []).filter((x) => show === 'all' || x.status === show).sort((a, b) => String(b.at).localeCompare(String(a.at)))
  const last10 = (x) => String(x ?? '').replace(/\D/g, '').slice(-10)
  const reject = (x) => { upsert('leadInbox', { ...x, status: 'Rejected', by: user.name, handledAt: new Date().toISOString() }, { system: true }); notify('Moved out of the inbox') }
  return <Card title="Lead inbox" actions={<Seg value={show} onChange={setShow} options={[{ value: 'New', label: 'Waiting' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} />} pad={false}>
    <p className="small muted" style={{ padding: '10px 16px 0', margin: 0 }}>Enquiries sent in by the website, WhatsApp tools, 99acres or a bot. Check each one, then accept it as a lead or reject it.</p>
    {!list.length ? <p className="muted" style={{ padding: 16, margin: 0 }}>{show === 'New' ? 'Nothing waiting. New enquiries appear here as they come in (Admin › Settings › Lead inbox has the address for other tools).' : 'Nothing here.'}</p> :
    <table className="table"><thead><tr><th>Received</th><th>Source</th><th>Who</th><th>Message</th><th></th></tr></thead><tbody>
      {list.map((x) => { const dup = x.phone && db.leads.find((l) => l.phone && last10(l.phone) === last10(x.phone)); return <tr key={x.id}>
        <td className="nowrap">{d(String(x.at).slice(0, 10))}<div className="small muted">{String(x.at).slice(11, 16)}</div></td><td>{x.source}</td>
        <td><b>{x.name || 'Name not given'}</b><div className="small muted">{[x.phone, x.email, x.city, x.config].filter(Boolean).join(' · ')}</div>{dup && <div className="small missing">Same mobile as {dup.name} ({dup.id})</div>}</td>
        <td className="small" style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{x.message}</td>
        <td className="nowrap">{x.status === 'New' ? <><Button size="sm" variant="primary" onClick={() => onAccept(x)}>Accept</Button> <Button size="sm" onClick={() => reject(x)}>Reject</Button></> : <span className="small muted">{x.status}{x.leadId ? ' · ' + x.leadId : ''} · {x.by}</span>}</td></tr> })}
    </tbody></table>}
  </Card>
}

export function Leads() {
  const { db, user, upsert, nextId, notify } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const [add, setAdd] = useState(null)
  const [errs, setErrs] = useState({})
  const [why, setWhy] = useState('')
  const [qs, setQs] = useSearchParams()
  const [view, setViewState] = useState(qs.get('view') || 'open')
  const setView = (v) => { setViewState(v); const n = new URLSearchParams(qs); n.set('view', v); setQs(n, { replace: true }) }
  const [paste, setPaste] = useState(null)
  const t = today()
  const inbox = (db.leadInbox || []).filter((x) => x.status === 'New')
  const team = db.users.filter((u) => ['admin', 'senior', 'sales'].includes(u.appRole) && u.active !== 'No').map((u) => u.name)
  const assign = canAssignTasks(user)
  const partnerOpts = partnerOptions(db)
  const rows = crm.leads
  const views = [{ value: 'open', label: 'Open leads', test: OPEN }, { value: 'due', label: 'Follow-up due', test: (l) => l.contact.next && l.contact.next.nextDate <= t },
    { value: 'hot', label: 'Hot', test: (l) => l.temperature === 'Hot' && OPEN(l) }, { value: 'untouched', label: 'Never contacted', test: (l) => !l.contact.count || l.contact.list.every((i) => i.mode === 'Note (imported)') },
    ...(assign ? [{ value: 'unassigned', label: 'Not assigned yet', test: (l) => !l.owner }] : []),
    { value: 'nofup', label: 'No follow-up set', test: (l) => OPEN(l) && !l.contact.next },
    { value: 'gaps', label: 'Missing details', test: (l) => OPEN(l) && gapsOf(l).length > 0 }, { value: 'all', label: 'All, including lost' }]
  // 2 Nov: a refused save says why inside the form and marks the cells, instead of a 3-second message at the bottom.
  const refuse = (e, msg) => { setErrs(e); setWhy(msg); setTimeout(() => document.querySelector('.modal .field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }
  const save = () => {
    const F = LEAD_FIELDS(team, true, partnerOpts), e = {}
    missingKeys(F, add).forEach((k) => (e[k] = 'Required'))
    if (add.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add.email)) e.email = 'This e-mail address does not look right'
    if (add.phone && String(add.phone).replace(/\D/g, '').length < 10) e.phone = 'At least 10 digits'
    if (add.stage === 'Lost' && !add.lostReason) e.lostReason = 'Say why it was lost'
    if (Object.keys(e).length) return refuse(e, 'Not saved yet. Fill in: ' + F.filter((f) => e[f.k]).map((f) => f.l).join(', ') + '.')
    const last10 = (x) => String(x ?? '').replace(/\D/g, '').slice(-10)
    const dup = db.leads.find((l) => l.phone && add.phone && last10(l.phone) === last10(add.phone))
    if (dup && !add.confirmDup) { setAdd({ ...add, confirmDup: true }); return refuse({ phone: `Same mobile as ${dup.name} (${dup.id})` }, `${dup.name} (${dup.id}) already has this mobile number. Press Save lead again to add it anyway.`) }
    const r = upsert('leads', { ...add, confirmDup: undefined, inboxId: undefined, id: nextId('leads', 'YSC-L-', 4) }, { action: 'created' })
    if (r) {
      if (add.inboxId) { const ib = (db.leadInbox || []).find((x) => x.id === add.inboxId); if (ib) upsert('leadInbox', { ...ib, status: 'Accepted', leadId: r.id, by: user.name, handledAt: new Date().toISOString() }, { system: true, silent: true }) }
      setAdd(null); setErrs({}); setWhy(''); notify(`Lead ${r.id} saved`); nav('/crm/leads/' + r.id)
    }
    else setWhy('Not saved: your access does not allow adding leads.')
  }
  const close = () => { setAdd(null); setErrs({}); setWhy('') }
  return (
    <Page title="Leads and prospects" back="/" backLabel="Dashboard" subtitle={seesAll(user) ? 'Every enquiry, walk-in, cold call and referral, across the team.' : 'Leads assigned to you. Open one to log a call, plan a private viewing or convert it to a booking.'}
      actions={canWrite(user, 'leads') && <>
        <Button onClick={() => setView(view === 'inbox' ? 'open' : 'inbox')}>{view === 'inbox' ? 'Back to leads' : `Inbox${inbox.length ? ' (' + inbox.length + ')' : ''}`}</Button>
        <Button onClick={() => setPaste('')}>Paste an enquiry</Button>
        <Link className="btn" to="/crm/partners">Channel partners</Link>
        <Button variant="primary" onClick={() => setAdd({ date: t, stage: 'New', temperature: 'Warm', owner: user.name, interests: [] })}>New lead</Button></>}>
      <Grid cols={5}>
        <Stat label="Open" value={crm.leads.filter(OPEN).length} tone="info" onClick={() => setView('open')} />
        <Stat label="Hot" value={crm.leads.filter((l) => l.temperature === 'Hot' && OPEN(l)).length} tone="bad" onClick={() => setView('hot')} />
        <Stat label="Follow-up due" value={crm.leads.filter((l) => l.contact.next && l.contact.next.nextDate <= t).length} tone="warn" onClick={() => setView('due')} />
        <Stat label="Viewings done" value={crm.leads.filter((l) => l.svDone === 'Yes').length} tone="teal" />
        <Stat label="Booked / lost" value={`${crm.leads.filter((l) => l.stage === 'Booked').length} / ${crm.leads.filter((l) => l.stage === 'Lost').length}`} />
      </Grid>
      {view === 'inbox' ? <Inbox onAccept={(x) => setAdd({ date: t, stage: 'New', temperature: 'Warm', owner: user.name, interests: [], ...fromInbox(x) })} /> :
      <DataTable rows={rows} initialSort={{ key: 'next', dir: 'asc' }} searchKeys={['name', 'id', 'phone', 'phone2', 'email', 'city', 'notes', 'referredBy']} onRowClick={(l) => nav('/crm/leads/' + l.id)}
        views={views} defaultView={view} key={view}
        filters={[{ key: 'stage', label: 'Stage' }, { key: 'source', label: 'Source' }, { key: 'temperature', label: 'Temperature' }, { key: 'owner', label: 'Advisor' }, { key: 'config', label: 'Config' }]}
        columns={[
          { key: 'name', label: 'Lead', render: (l) => <div><b>{fullName(l)}</b><div className="small muted">{l.id} · {l.phone || 'no phone'}</div></div> },
          { key: 'source', label: 'Source' }, { key: 'stage', label: 'Stage', render: (l) => <Badge tone={l.stage === 'Lost' ? 'muted' : l.stage === 'Booked' ? 'good' : 'info'}>{l.stage}</Badge> },
          { key: 'temperature', label: 'Temp', render: (l) => <Badge>{l.temperature}</Badge> }, { key: 'config', label: 'Wants' },
          { key: 'last', label: 'Last contact', sortValue: (l) => l.contact.lastDate || '', render: (l) => l.contact.lastDate ? <span>{d(l.contact.lastDate)}<div className="small muted">{l.contact.last.mode}</div></span> : <span className="muted">–</span> },
          { key: 'next', label: 'Next follow-up', sortValue: (l) => l.contact.next?.nextDate || (OPEN(l) ? '9999' : 'zzzz'), render: (l) => l.contact.next ? <div><Badge tone={l.contact.next.nextDate < t ? 'bad' : l.contact.next.nextDate === t ? 'warn' : 'info'}>{d(l.contact.next.nextDate)}</Badge>{l.contact.next.nextTime && <span className="small"> {hm12(l.contact.next.nextTime)}</span>}<div className="small muted">{l.contact.next.nextAction}</div></div> : OPEN(l) ? <Badge tone="warn">Not set</Badge> : <span className="muted">–</span> },
          { key: 'owner', label: 'Advisor', render: (l) => <span>{l.owner || <span className="missing">Not assigned</span>}{l.coOwners?.length ? <span className="small muted"> + {l.coOwners.join(', ')}</span> : null}</span> },
          { key: 'gaps', label: 'Missing', sortValue: (l) => gapsOf(l).length, render: (l) => { const g = gapsOf(l); return g.length ? <span className="small missing" title={g.join(', ')}>{g.length} missing</span> : <span className="small muted">Complete</span> } },
        ]} />}
      <Modal open={paste !== null} onClose={() => setPaste(null)} title="Paste an enquiry" footer={<><Button onClick={() => setPaste(null)}>Cancel</Button><Button variant="primary" onClick={() => { const x = parseEnquiry(paste || ''); if (!x.phone && !x.email && !x.name) return notify('Could not find a name, number or e-mail in that text', 'bad'); setPaste(null); setAdd({ date: t, stage: 'New', temperature: 'Warm', owner: user.name, interests: [], ...x }) }}>Read it into a new lead</Button></>}>
        <p className="small muted" style={{ marginTop: 0 }}>Paste a WhatsApp message, a 99acres or website e-mail, or any text with the enquiry. Accord picks out the name, mobile, e-mail, city and BHK; you check them before saving.</p>
        <textarea className="input" rows={8} style={{ width: '100%' }} value={paste || ''} onChange={(e) => setPaste(e.target.value)} placeholder="e.g. Name: Ravi Kumar, Mobile +91 98450 12345, ravi@example.com, looking for 3 BHK, from Bengaluru" />
      </Modal>
      <Modal open={!!add} onClose={close} title="New lead" wide footer={<>{why && <div className="form-why" role="alert">{why}</div>}<Button onClick={close}>Cancel</Button><Button variant="primary" onClick={save}>Save lead</Button></>}>
        {add && <RecordForm sheet fields={LEAD_FIELDS(team, assign, partnerOpts)} value={add} onChange={(v) => { setAdd(v); if (why && !v.confirmDup) setWhy('') }} errors={errs} />}
      </Modal>
    </Page>
  )
}

export function LeadDetail() {
  const { id } = useParams()
  const { db, user, upsert, notify } = useStore()
  const crm = useCrm()
  const partnerOpts = partnerOptions(db)
  const nav = useNavigate()
  const l = crm.leads.find((x) => x.id === id)
  const [edit, setEdit] = useState(null)
  const [log, setLog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [del, setDel] = useState(false)
  const team = db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)
  const views = db.viewings.filter((v) => v.recordId === id)
  if (!l) return <Page title="Lead not found" back="/crm/leads" backLabel="Leads" />
  const can = canWrite(user, 'leads')
  const [lost, setLost] = useState(null)
  const save = () => { if (edit.stage === 'Lost' && !edit.lostReason) return notify('Pick the reason it was lost (Outcome section)', 'bad'); upsert('leads', edit); setEdit(null) }
  const setStage = (stage) => { if (stage === 'Lost') return setLost({ reason: '', note: '', send: true }); upsert('leads', { ...db.leads.find((x) => x.id === id), stage }, { action: 'stage ' + stage }); notify('Stage: ' + stage) }
  const raw = db.leads.find((x) => x.id === id)
  if (sheet) return <LeadSheet l={l} onBack={() => setSheet(false)} />
  return (
    <Page title={fullName(l)} back="/crm/leads" backLabel="Leads"
      subtitle={`${l.id} · ${l.source || 'source not recorded'}${l.referredBy ? ' · via ' + l.referredBy : ''} · enquired ${d(l.date)}`}
      actions={<>
        {l.phone && <a className="btn" href={waLink(l.phone, `Dear ${salute(l)}, `)} target="_blank" rel="noreferrer">WhatsApp</a>}
        {l.phone && <a className="btn" href={'tel:' + l.phone}>Call</a>}
        <Button onClick={() => setLog(true)}>Log interaction</Button>
        <Link className="btn" to={'/presales?new=' + l.id}>Plan private viewing</Link>
        <Link className="btn" to={'/brochure?for=' + l.id}>e-Brochure</Link>
        <Button onClick={() => setSheet(true)}>Lead sheet</Button>
        {can && <Button onClick={() => setEdit({ ...raw })}>Edit</Button>}
        {can && l.stage !== 'Booked' && <Button variant="primary" onClick={() => nav('/crm/cost-sheet?lead=' + l.id)}>Convert to booking →</Button>}
        {user.appRole === 'admin' && <Button variant="danger" onClick={() => setDel(true)}>Delete lead</Button>}
      </>}>
      {lost && <LostModal l={l} v={lost} setV={setLost} />}
      {gapsOf(l).length > 0 && <div className="note warn small" style={{ marginBottom: 12 }}>Missing: <b>{gapsOf(l).join(', ')}</b>. {can && <button type="button" className="linkish" onClick={() => setEdit({ ...raw })}>Fill them in</button>}</div>}
      {del && <DeleteLead l={l} views={views} onClose={() => setDel(false)} onDone={() => { setDel(false); nav('/crm/leads') }} />}
      <div className="row gap-s" style={{ marginBottom: 14 }}>
        <span className="small muted">Stage</span>
        <Seg options={['New', 'Contacted', 'Qualified', 'Site visit scheduled', 'Site visit done', 'Negotiation', 'Token received', 'Lost']} value={l.stage} onChange={(s) => can && setStage(s)} />
      </div>
      <div className="split">
        <div>
          <Card title="History" actions={<Button size="sm" onClick={() => setLog(true)}>+ Log</Button>}>
            {!l.contact.list.length ? <p className="muted">No interactions yet. Log the first call.</p> : <div className="timeline">
              {l.contact.list.map((i) => <div key={i.id} className="tl-item"><div className="tl-meta">{d(i.date)} {i.time} · {i.mode} · {i.purpose} {i.by ? '· ' + i.by : ''} <OutcomeBadge v={i.outcome} /></div>
                <p>{i.summary}</p>{i.nextDate && <div className="small muted">Next: {i.nextAction || 'follow up'} on {nextWhen(i)} {i.status === 'Open' ? '' : '(closed)'}</div>}</div>)}
            </div>}
          </Card>
          {views.length > 0 && <Card title="Private viewings">{views.map((v) => <div key={v.id} className="check-row"><Link to={'/presales/viewings/' + v.id}>{d(v.date)} {v.time}</Link><Badge>{v.status}</Badge></div>)}</Card>}
        </div>
        <div>
          <Card title="Next follow-up">
            {l.contact.next ? <><div style={{ font: '600 20px var(--f-head)' }}>{nextWhen(l.contact.next)}</div><p className="muted" style={{ margin: '4px 0 0' }}>{l.contact.next.nextAction} · {l.contact.next.nextOwner || l.contact.next.by}</p></> : <p className="muted">Not set. Log an interaction with a next date.</p>}
          </Card>
          <Card title="Profile">
            <KV rows={[['Phone', l.phone], ['Email', l.email], ['City / country', [l.city, l.country].filter(Boolean).join(', ')], ['Residency', l.residency], ['Wants', l.config], ['Budget', l.budget], ['Purpose', l.purpose], ['Timeline', l.timeline],
              ['Temperature', <Badge>{l.temperature}</Badge>], ['Advisor', l.owner], ['Viewing', l.svDone === 'Yes' ? 'Done ' + d(l.svDate) : 'Not yet'], l.stage === 'Lost' && ['Lost reason', l.lostReason]]} />
          </Card>
          <Card title="Interests">
            <Chips options={OPS.INTERESTS} value={l.interests || []} onChange={(x) => can && upsert('leads', { ...raw, interests: x }, { silent: true })} />
            <p className="small muted" style={{ marginBottom: 0 }}>Used to choose what the e-brochure and the viewing focus on.</p>
          </Card>
          {l.notes && <Card title="Notes"><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{l.notes}</p></Card>}
        </div>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={'Edit ' + l.name} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && <RecordForm sheet fields={LEAD_FIELDS(team, canAssignTasks(user), partnerOpts)} value={edit} onChange={setEdit} />}
      </Modal>
      <LogInteraction open={log} onClose={() => setLog(false)} recordId={l.id} />
    </Page>
  )
}

// Lead entry as an A4 sheet with the Yamuna Sky City header (1 Nov).
function LeadSheet({ l, onBack }) {
  const rows = [['Lead ID', l.id], ['Date captured', d(l.date)], ['Name', fullName(l)], ['Mobile', l.phone], ['Other numbers', l.phone2], ['E-mail', l.email], ['City', [l.city, l.country].filter(Boolean).join(', ')],
    ['Residential status', l.residency], ['Source', [l.source, ...(l.sources2 || [])].filter(Boolean).join(' · ')], ['Channel partner / referred by', [l.partner, l.referredBy].filter(Boolean).join(' · ')],
    ['Configuration interest', l.config], ['Budget band', l.budget], ['Purpose', l.purpose], ['Buying timeline', l.timeline], ['Stage', l.stage], ['Temperature', l.temperature],
    ['Site visit', l.svDone === 'Yes' ? 'Done ' + d(l.svDate) : l.svDate ? 'Planned ' + d(l.svDate) : 'Not yet'], ['Assigned to', l.owner], ['Notes', l.notes]]
  return (
    <div>
      <div className="doc-tools no-print"><Button onClick={onBack}>← Lead</Button><Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button></div>
      <div className="doc">
        <DocHeader title="LEAD ENTRY" sub={`${l.id} · ${d(l.date)}`} />
        <table><tbody>{rows.map(([k, v]) => <tr key={k}><th style={{ width: '30%' }}>{k}</th><td>{v || '–'}</td></tr>)}</tbody></table>
        <div className="sec">Interactions</div>
        <table><thead><tr><th>Date</th><th>Mode</th><th>By</th><th>Summary</th><th>Next</th></tr></thead>
          <tbody>{l.contact.list.map((i) => <tr key={i.id}><td className="nowrap">{d(i.date)} {i.time}</td><td>{i.mode}</td><td>{i.by}</td><td>{i.summary}</td><td>{i.nextDate ? nextWhen(i) + ' · ' + (i.nextAction || '') : '–'}</td></tr>)}
            {!l.contact.list.length && <tr><td colSpan={5} className="muted">None yet</td></tr>}</tbody></table>
        <div className="foot">Lead record from Accord · confidential, for the Yamuna Sky City sales team</div>
      </div>
    </div>
  )
}

// 2 Nov: an admin can delete a lead entered by mistake or twice, with what belongs only to it.
// A real enquiry that went nowhere should be set to Lost instead, so the history and the source figures stay true.
function DeleteLead({ l, views, onClose, onDone }) {
  const { db, remove, upsert, notify } = useStore()
  const [also, setAlso] = useState(true)
  const ints = db.interactions.filter((i) => i.recordId === l.id)
  const sheets = (db.costSheets || []).filter((x) => x.leadId === l.id)
  const booked = l.stage === 'Booked' || l.clientId
  const go = () => {
    if (also) { ints.forEach((i) => remove('interactions', i.id)); sheets.forEach((x) => remove('costSheets', x.id)); views.forEach((v) => remove('viewings', v.id)) }
    remove('leads', l.id); notify(`Lead ${l.id} deleted`); onDone()
  }
  const lost = () => { upsert('leads', { ...db.leads.find((x) => x.id === l.id), stage: 'Lost' }, { action: 'stage Lost' }); notify('Marked as Lost'); onClose() }
  return (
    <Modal open onClose={onClose} title={`Delete ${fullName(l)} (${l.id})?`} footer={<><Button onClick={onClose}>Cancel</Button>{!booked && <Button onClick={lost}>Mark as Lost instead</Button>}
      <Button variant="danger" onClick={go} disabled={booked}>Delete permanently</Button></>}>
      {booked ? <p className="err" style={{ marginTop: 0 }}>This lead has been converted to a booking ({l.clientId || 'Booked'}). It stays, so the client's history is complete. Change the booking in Client 360 instead.</p> : <>
        <p style={{ marginTop: 0 }}>Use this for a lead entered by mistake or twice. If the person was real but is no longer interested, choose <b>Mark as Lost instead</b>: the history and your source figures stay correct.</p>
        <p>The lead is removed from Accord and from the Google Sheet for everyone. The audit tab records who deleted it and when.</p>
        {(ints.length + sheets.length + views.length) > 0 && <label className="check-row" style={{ cursor: 'pointer' }}><span><input type="checkbox" checked={also} onChange={(e) => setAlso(e.target.checked)} /> Also delete what belongs to it: {[ints.length && `${ints.length} interaction${ints.length > 1 ? 's' : ''}`, sheets.length && `${sheets.length} cost sheet${sheets.length > 1 ? 's' : ''}`, views.length && `${views.length} viewing${views.length > 1 ? 's' : ''}`].filter(Boolean).join(', ')}</span></label>}
      </>}
    </Modal>
  )
}

// 2 Nov: a lead is only closed as Lost with a reason, so the reasons can be counted later (analytics).
// Before closing, the client can be told politely (template "Closing enquiry").
function LostModal({ l, v, setV }) {
  const { db, upsert, user, notify, nextId } = useStore()
  const tp = (db.templates || []).find((t) => t.id === 'TP-07') || DEFAULT_TEMPLATES.find((t) => t.id === 'TP-07')
  const msg = (tp?.body || '').replace(/{name}/g, salute(l)).replace(/{signature}/g, `${user.name}\n${user.designation || 'Client Relations'}\nYamuna Sky City`)
  const go = () => {
    if (!v.reason) return notify('Pick a reason', 'bad')
    upsert('leads', { ...db.leads.find((x) => x.id === l.id), stage: 'Lost', lostReason: v.reason, lostNote: v.note, lostOn: today() }, { action: 'stage Lost: ' + v.reason })
    db.interactions.filter((i) => i.recordId === l.id && i.status === 'Open').forEach((i) => upsert('interactions', { ...i, status: 'Done' }, { silent: true }))
    if (v.send && l.phone) { window.open(waLink(l.whatsapp || l.phone, msg), '_blank')
      upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: new Date().toTimeString().slice(0, 5), recordId: l.id, type: 'Lead', mode: 'WhatsApp', purpose: 'Closing enquiry', by: user.name, summary: 'Closing message sent: ' + v.reason, outcome: 'No answer', status: 'Done' }, { silent: true }) }
    notify('Lead closed as Lost: ' + v.reason); setV(null)
  }
  return (
    <Modal open onClose={() => setV(null)} title={`Close ${fullName(l)} as Lost`} footer={<><Button onClick={() => setV(null)}>Cancel</Button><Button variant="primary" onClick={go}>Close as Lost</Button></>}>
      <div className="form fc1">
        <label className="field"><span className="field-label">Why was it lost? *</span><select className="input" value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })}><option value="">Select…</option>{LOST_REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label className="field"><span className="field-label">More detail</span><input className="input" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="e.g. bought at Rohan, found it too far from the city" /></label>
        {l.phone && <label className="check-row" style={{ cursor: 'pointer' }}><span><input type="checkbox" checked={v.send} onChange={(e) => setV({ ...v, send: e.target.checked })} /> Send the closing message on WhatsApp</span></label>}
        {v.send && l.phone && <div className="small muted" style={{ whiteSpace: 'pre-wrap', border: '1px solid var(--line)', padding: 10 }}>{msg}</div>}
        <p className="small muted" style={{ margin: 0 }}>The lead stays in Accord with its history and can be reopened any time by changing the stage.</p>
      </div>
    </Modal>
  )
}
