import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { Page, Button, Badge } from '../../components/ui.jsx'
import { seesAll } from '../../lib/perms.js'
import DataTable from '../../components/DataTable.jsx'
import LogInteraction, { recordType, OutcomeBadge } from '../../components/LogInteraction.jsx'
import BulkLog from '../../components/BulkLog.jsx'
import { d, today, hm12 } from '../../lib/format.js'

export default function Interactions() {
  const { db, user } = useStore()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const [open, setOpen] = useState(qs.get('log') === '1')
  const [bulk, setBulk] = useState(false)
  const names = useMemo(() => { const m = {}; db.clients.forEach((c) => (m[c.clientId] = { name: c.name, unit: c.unit, link: '/crm/clients/' + c.bookingId })); db.leads.forEach((l) => (m[l.id] = { name: l.name, link: '/crm/leads/' + l.id })); return m }, [db.clients, db.leads])
  const t = today()
  const owners = (i) => (i.nextOwners?.length ? i.nextOwners : i.nextOwner ? [i.nextOwner] : [])
  const rows = useMemo(() => db.interactions.map((i) => ({ ...i, who: names[i.recordId]?.name || i.recordName || i.recordId, unit: names[i.recordId]?.unit, kind: i.type || recordType(i.recordId), owners: owners(i).join(', ') })), [db.interactions, names])
  const views = [
    { value: 'all', label: seesAll(user) ? 'Everyone\'s entries' : 'All my entries' },
    { value: 'mine', label: 'Logged by me', test: (i) => i.by === user.name },
    { value: 'due', label: 'Follow-ups due', test: (i) => i.status === 'Open' && i.nextDate && i.nextDate <= t },
    { value: 'open', label: 'Open follow-ups', test: (i) => i.status === 'Open' },
    { value: 'today', label: 'Logged today', test: (i) => i.date === t },
  ]
  return (
    <Page back={true} title="Interaction log" subtitle={seesAll(user) ? 'Every call, message, visit and meeting with a lead or client, across the team.' : 'Your calls, messages, visits and meetings, and follow-ups colleagues set for you. Date, time and your name are stamped automatically.'}
      back="/" backLabel="Dashboard" actions={<><Button onClick={() => setBulk(true)}>Log several at once</Button><Button variant="primary" onClick={() => setOpen(true)}>Log interaction</Button></>}>
      <DataTable rows={rows} initialSort={{ key: 'date', dir: 'desc' }} searchKeys={['who', 'recordId', 'summary', 'nextAction', 'by', (x) => x.unit]}
        views={views} defaultView={qs.get('view') || 'all'}
        filters={[{ key: 'kind', label: 'Type' }, { key: 'mode', label: 'Mode' }, { key: 'purpose', label: 'Purpose' }, { key: 'outcome', label: 'Outcome' }, { key: 'by', label: 'Logged by' }, { key: 'status', label: 'Status' }]}
        onRowClick={(x) => names[x.recordId] && nav(names[x.recordId].link)}
        columns={[
          { key: 'date', label: 'When', render: (x) => <span className="nowrap">{d(x.date)}{x.time ? <span className="muted small"> {x.time}</span> : ''}</span> },
          { key: 'who', label: 'With', render: (x) => <div><b>{x.who}</b><div className="small muted">{x.recordId}{x.unit ? ' · ' + x.unit : ''}</div></div> },
          { key: 'kind', label: 'Type', render: (x) => <span className={'kind k-' + (x.kind === 'Client' ? 'client' : 'lead')}>{x.kind}</span> },
          { key: 'mode', label: 'Mode' }, { key: 'purpose', label: 'Purpose' },
          { key: 'summary', label: 'Summary', render: (x) => <div style={{ maxWidth: 380 }}>{x.summary}</div> },
          { key: 'outcome', label: 'Outcome', render: (x) => <OutcomeBadge v={x.outcome} /> },
          { key: 'nextDate', label: 'Next', render: (x) => x.nextDate ? <div><Badge tone={x.status !== 'Open' ? 'muted' : x.nextDate < t ? 'bad' : x.nextDate === t ? 'warn' : 'info'}>{d(x.nextDate)}</Badge>{x.nextTime && <span className="small"> {hm12(x.nextTime)}</span>}<div className="small muted">{x.nextAction}</div></div> : <span className="muted">–</span> },
          { key: 'by', label: 'By' }, { key: 'owners', label: 'Follow-up with' }, { key: 'status', label: 'Status', render: (x) => <Badge>{x.status}</Badge> },
        ]} />
      <LogInteraction open={open} onClose={() => setOpen(false)} />
      <BulkLog open={bulk} onClose={() => setBulk(false)} />
    </Page>
  )
}
