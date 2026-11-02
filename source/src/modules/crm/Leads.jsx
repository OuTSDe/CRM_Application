import React, { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canWrite, canAssignTasks, seesAll } from '../../lib/perms.js'
import { OPS } from '../../lib/seed.js'
import { Page, Card, Button, Badge, Modal, Grid, Stat, KV, Chips, Seg } from '../../components/ui.jsx'
import DocHeader from '../../components/DocHeader.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm, { missingRequired, missingKeys } from '../../components/RecordForm.jsx'
import LogInteraction, { OutcomeBadge } from '../../components/LogInteraction.jsx'
import { d, today, waLink, TITLES, CITIES, fullName, salute } from '../../lib/format.js'

// Mirrors the "Leads & Prospects" tab: LEAD · SOURCE · REQUIREMENT · PIPELINE · OUTCOME
export const LEAD_FIELDS = (team, canAssign = true) => [
  { section: 'Lead', n: '1' },
  { k: 'id', l: 'Lead ID', auto: true, ph: 'Given on save' }, { k: 'date', l: 'Date captured', t: 'date' }, { k: 'title', l: 'Title', t: 'select', o: TITLES, hint: 'Used in every message: Dear Dr. …' },
  { k: 'name', l: 'Name', req: true, span: 2 }, { k: 'phone', l: 'Mobile (primary)', t: 'tel', req: true, hint: 'Checked for duplicates on save' },
  { k: 'phone2', l: 'Other numbers', t: 'tel', hint: 'Separate with commas' }, { k: 'email', l: 'Email', t: 'email', req: true },
  { k: 'city', l: 'City', suggest: CITIES, ph: 'Start typing' }, { k: 'country', l: 'Country', suggest: ['India', 'UAE', 'Qatar', 'Oman', 'Kuwait', 'Saudi Arabia', 'Bahrain', 'Singapore', 'United Kingdom', 'USA', 'Canada', 'Australia'] }, { k: 'residency', l: 'Residential status', t: 'select', o: 'Residential status' },
  { section: 'Source', n: '2' },
  { k: 'source', l: 'Primary lead source', t: 'select', o: 'Lead source', req: true }, { k: 'partner', l: 'Channel partner' }, { k: 'referredBy', l: 'Referred by', hint: 'Name of the person who referred them' },
  { k: 'sources', l: 'Also came through', t: 'chips', o: 'Lead source', span: 'all' },
  { section: 'Requirement', n: '3' },
  { k: 'config', l: 'Configuration interest', t: 'select', o: 'Configuration' }, { k: 'budget', l: 'Budget band', t: 'select', o: 'Budget band' }, { k: 'purpose', l: 'Purpose', t: 'select', o: 'Buying purpose' },
  { k: 'timeline', l: 'Buying timeline', t: 'select', o: 'Buying timeline' },
  { k: 'interests', l: 'Interests (to personalise the viewing)', t: 'chips', o: OPS.INTERESTS, span: 'all' },
  { section: 'Pipeline', n: '4', note: 'Last contact and next follow-up are read from the interaction log' },
  canAssign ? { k: 'owner', l: 'Assigned to', t: 'select', o: team } : { k: 'owner', l: 'Assigned to', auto: true },
  { k: 'stage', l: 'Stage', t: 'select', o: 'Lead stage', req: true }, { k: 'temperature', l: 'Temperature', t: 'select', o: 'Temperature' },
  { k: 'svDone', l: 'Site visit done?', t: 'select', o: 'Yes / No' }, { k: 'svDate', l: 'Site visit date', t: 'date' },
  { section: 'Outcome', n: '5' },
  { k: 'lostReason', l: 'Lost / dormant reason' }, { k: 'clientId', l: 'Converted to Client ID', auto: true },
  { k: 'notes', l: 'Notes and call history', t: 'textarea', span: 'all' },
]
const OPEN = (l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage)

export function Leads() {
  const { db, user, upsert, nextId, notify } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const [add, setAdd] = useState(null)
  const [errs, setErrs] = useState({})
  const [why, setWhy] = useState('')
  const [view, setView] = useState('open')
  const t = today()
  const team = db.users.filter((u) => ['admin', 'senior', 'sales'].includes(u.appRole) && u.active !== 'No').map((u) => u.name)
  const assign = canAssignTasks(user)
  const rows = crm.leads
  const views = [{ value: 'open', label: 'Open leads', test: OPEN }, { value: 'due', label: 'Follow-up due', test: (l) => l.contact.next && l.contact.next.nextDate <= t },
    { value: 'hot', label: 'Hot', test: (l) => l.temperature === 'Hot' && OPEN(l) }, { value: 'untouched', label: 'Never contacted', test: (l) => !l.contact.count || l.contact.list.every((i) => i.mode === 'Note (imported)') },
    ...(assign ? [{ value: 'unassigned', label: 'Not assigned yet', test: (l) => !l.owner }] : []), { value: 'all', label: 'All, including lost' }]
  // 2 Nov: a refused save says why inside the form and marks the cells, instead of a 3-second message at the bottom.
  const refuse = (e, msg) => { setErrs(e); setWhy(msg); setTimeout(() => document.querySelector('.modal .field.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }
  const save = () => {
    const F = LEAD_FIELDS(team), e = {}
    missingKeys(F, add).forEach((k) => (e[k] = 'Required'))
    if (add.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(add.email)) e.email = 'This e-mail address does not look right'
    if (add.phone && String(add.phone).replace(/\D/g, '').length < 10) e.phone = 'At least 10 digits'
    if (Object.keys(e).length) return refuse(e, 'Not saved yet. Fill in: ' + F.filter((f) => e[f.k]).map((f) => f.l).join(', ') + '.')
    const last10 = (x) => String(x ?? '').replace(/\D/g, '').slice(-10)
    const dup = db.leads.find((l) => l.phone && add.phone && last10(l.phone) === last10(add.phone))
    if (dup && !add.confirmDup) { setAdd({ ...add, confirmDup: true }); return refuse({ phone: `Same mobile as ${dup.name} (${dup.id})` }, `${dup.name} (${dup.id}) already has this mobile number. Press Save lead again to add it anyway.`) }
    const r = upsert('leads', { ...add, confirmDup: undefined, id: nextId('leads', 'YSC-L-', 4) }, { action: 'created' })
    if (r) { setAdd(null); setErrs({}); setWhy(''); notify(`Lead ${r.id} saved`); nav('/crm/leads/' + r.id) }
    else setWhy('Not saved: your access does not allow adding leads.')
  }
  const close = () => { setAdd(null); setErrs({}); setWhy('') }
  return (
    <Page title="Leads and prospects" back="/" backLabel="Dashboard" subtitle={seesAll(user) ? 'Every enquiry, walk-in, cold call and referral, across the team.' : 'Leads assigned to you. Open one to log a call, plan a private viewing or convert it to a booking.'}
      actions={canWrite(user, 'leads') && <Button variant="primary" onClick={() => setAdd({ date: t, stage: 'New', temperature: 'Warm', owner: user.name, interests: [] })}>New lead</Button>}>
      <Grid cols={5}>
        <Stat label="Open" value={crm.leads.filter(OPEN).length} tone="info" onClick={() => setView('open')} />
        <Stat label="Hot" value={crm.leads.filter((l) => l.temperature === 'Hot' && OPEN(l)).length} tone="bad" onClick={() => setView('hot')} />
        <Stat label="Follow-up due" value={crm.leads.filter((l) => l.contact.next && l.contact.next.nextDate <= t).length} tone="warn" onClick={() => setView('due')} />
        <Stat label="Viewings done" value={crm.leads.filter((l) => l.svDone === 'Yes').length} tone="teal" />
        <Stat label="Booked / lost" value={`${crm.leads.filter((l) => l.stage === 'Booked').length} / ${crm.leads.filter((l) => l.stage === 'Lost').length}`} />
      </Grid>
      <DataTable rows={rows} initialSort={{ key: 'next', dir: 'asc' }} searchKeys={['name', 'id', 'phone', 'phone2', 'email', 'city', 'notes', 'referredBy']} onRowClick={(l) => nav('/crm/leads/' + l.id)}
        views={views} defaultView={view} key={view}
        filters={[{ key: 'stage', label: 'Stage' }, { key: 'source', label: 'Source' }, { key: 'temperature', label: 'Temperature' }, { key: 'owner', label: 'Advisor' }, { key: 'config', label: 'Config' }]}
        columns={[
          { key: 'name', label: 'Lead', render: (l) => <div><b>{fullName(l)}</b><div className="small muted">{l.id} · {l.phone || 'no phone'}</div></div> },
          { key: 'source', label: 'Source' }, { key: 'stage', label: 'Stage', render: (l) => <Badge tone={l.stage === 'Lost' ? 'muted' : l.stage === 'Booked' ? 'good' : 'info'}>{l.stage}</Badge> },
          { key: 'temperature', label: 'Temp', render: (l) => <Badge>{l.temperature}</Badge> }, { key: 'config', label: 'Wants' },
          { key: 'last', label: 'Last contact', sortValue: (l) => l.contact.lastDate || '', render: (l) => l.contact.lastDate ? <span>{d(l.contact.lastDate)}<div className="small muted">{l.contact.last.mode}</div></span> : <span className="muted">–</span> },
          { key: 'next', label: 'Next follow-up', sortValue: (l) => l.contact.next?.nextDate || (OPEN(l) ? '9999' : 'zzzz'), render: (l) => l.contact.next ? <div><Badge tone={l.contact.next.nextDate < t ? 'bad' : l.contact.next.nextDate === t ? 'warn' : 'info'}>{d(l.contact.next.nextDate)}</Badge><div className="small muted">{l.contact.next.nextAction}</div></div> : OPEN(l) ? <Badge tone="warn">Not set</Badge> : <span className="muted">–</span> },
          { key: 'owner', label: 'Advisor' },
        ]} />
      <Modal open={!!add} onClose={close} title="New lead" wide footer={<>{why && <div className="form-why" role="alert">{why}</div>}<Button onClick={close}>Cancel</Button><Button variant="primary" onClick={save}>Save lead</Button></>}>
        {add && <RecordForm sheet fields={LEAD_FIELDS(team, assign)} value={add} onChange={(v) => { setAdd(v); if (why && !v.confirmDup) setWhy('') }} errors={errs} />}
      </Modal>
    </Page>
  )
}

export function LeadDetail() {
  const { id } = useParams()
  const { db, user, upsert, notify } = useStore()
  const crm = useCrm()
  const nav = useNavigate()
  const l = crm.leads.find((x) => x.id === id)
  const [edit, setEdit] = useState(null)
  const [log, setLog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const team = db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)
  const views = db.viewings.filter((v) => v.recordId === id)
  if (!l) return <Page title="Lead not found" back="/crm/leads" backLabel="Leads" />
  const can = canWrite(user, 'leads')
  const save = () => { upsert('leads', edit); setEdit(null) }
  const setStage = (stage) => { upsert('leads', { ...db.leads.find((x) => x.id === id), stage }, { action: 'stage ' + stage }); notify('Stage: ' + stage) }
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
      </>}>
      <div className="row gap-s" style={{ marginBottom: 14 }}>
        <span className="small muted">Stage</span>
        <Seg options={['New', 'Contacted', 'Qualified', 'Site visit scheduled', 'Site visit done', 'Negotiation', 'Token received', 'Lost']} value={l.stage} onChange={(s) => can && setStage(s)} />
      </div>
      <div className="split">
        <div>
          <Card title="History" actions={<Button size="sm" onClick={() => setLog(true)}>+ Log</Button>}>
            {!l.contact.list.length ? <p className="muted">No interactions yet. Log the first call.</p> : <div className="timeline">
              {l.contact.list.map((i) => <div key={i.id} className="tl-item"><div className="tl-meta">{d(i.date)} {i.time} · {i.mode} · {i.purpose} {i.by ? '· ' + i.by : ''} <OutcomeBadge v={i.outcome} /></div>
                <p>{i.summary}</p>{i.nextDate && <div className="small muted">Next: {i.nextAction || 'follow up'} on {d(i.nextDate)} {i.status === 'Open' ? '' : '(closed)'}</div>}</div>)}
            </div>}
          </Card>
          {views.length > 0 && <Card title="Private viewings">{views.map((v) => <div key={v.id} className="check-row"><Link to={'/presales/viewings/' + v.id}>{d(v.date)} {v.time}</Link><Badge>{v.status}</Badge></div>)}</Card>}
        </div>
        <div>
          <Card title="Next follow-up">
            {l.contact.next ? <><div style={{ font: '600 20px var(--f-head)' }}>{d(l.contact.next.nextDate)}</div><p className="muted" style={{ margin: '4px 0 0' }}>{l.contact.next.nextAction} · {l.contact.next.nextOwner || l.contact.next.by}</p></> : <p className="muted">Not set. Log an interaction with a next date.</p>}
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
        {edit && <RecordForm sheet fields={LEAD_FIELDS(team, canAssignTasks(user))} value={edit} onChange={setEdit} />}
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
          <tbody>{l.contact.list.map((i) => <tr key={i.id}><td className="nowrap">{d(i.date)} {i.time}</td><td>{i.mode}</td><td>{i.by}</td><td>{i.summary}</td><td>{i.nextDate ? d(i.nextDate) + ' · ' + (i.nextAction || '') : '–'}</td></tr>)}
            {!l.contact.list.length && <tr><td colSpan={5} className="muted">None yet</td></tr>}</tbody></table>
        <div className="foot">Lead record from Accord · confidential, for the Yamuna Sky City sales team</div>
      </div>
    </div>
  )
}
