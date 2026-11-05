// 5 Nov (2 Nov meeting): channel partners. Each partner has a code; leads name the partner who brought them, so
// analytics can show which partners bring leads that book.
import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { canWrite } from '../../lib/perms.js'
import { Page, Button, Modal, Badge, Grid, Stat } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm, { missingRequired } from '../../components/RecordForm.jsx'
import { CITIES, today } from '../../lib/format.js'
import { partnerLabel } from './Leads.jsx'

const FIELDS = [
  { k: 'code', l: 'Partner code', auto: true, ph: 'Given on save' }, { k: 'name', l: 'Name', req: true }, { k: 'firm', l: 'Firm / company' },
  { k: 'phone', l: 'Mobile', t: 'tel', req: true }, { k: 'email', l: 'Email', t: 'email' }, { k: 'city', l: 'City', suggest: CITIES },
  { k: 'rera', l: 'RERA agent number' }, { k: 'commission', l: 'Brokerage (%)', t: 'number', min: 0 }, { k: 'since', l: 'Working with us since', t: 'date' },
  { k: 'status', l: 'Status', t: 'select', o: ['Active', 'Inactive'] }, { k: 'owner', l: 'Our contact person' }, { k: 'notes', l: 'Notes', t: 'textarea', span: 'all' },
]
export default function Partners() {
  const { db, user, upsert, notify, nextId } = useStore()
  const [edit, setEdit] = useState(null)
  const can = canWrite(user, 'partners')
  const stats = useMemo(() => (db.partners || []).map((p) => {
    const mine = db.leads.filter((l) => String(l.partner || '').includes('(' + p.code + ')') || l.partnerCode === p.code)
    const booked = mine.filter((l) => l.stage === 'Booked').length
    return { ...p, leads: mine.length, open: mine.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage)).length, booked, conv: mine.length ? booked / mine.length : 0 }
  }), [db.partners, db.leads])
  const save = () => {
    const miss = missingRequired(FIELDS, edit); if (miss.length) return notify('Missing: ' + miss.join(', '), 'bad')
    const nums = (db.partners || []).map((p) => Number(String(p.code || '').replace(/\D/g, '')) || 0)
    const code = edit.code || 'CP-' + String(Math.max(0, ...nums) + 1).padStart(3, '0')
    const r = upsert('partners', { status: 'Active', since: today(), ...edit, code, id: edit.id || code }, { action: edit.id ? 'saved' : 'partner added' })
    if (r) { notify(`${partnerLabel(r)} saved`); setEdit(null) }
  }
  return (
    <Page title="Channel partners" back="/crm/leads" backLabel="Leads" subtitle="Brokers and partners who bring us buyers. Each has a code; pick the partner on a lead so analytics can show who brings leads that book."
      actions={can && <Button variant="primary" onClick={() => setEdit({ status: 'Active', since: today(), owner: user.name })}>Add partner</Button>}>
      <Grid cols={4}>
        <Stat label="Partners" value={stats.filter((p) => p.status !== 'Inactive').length} sub="active" tone="info" />
        <Stat label="Leads from partners" value={stats.reduce((a, p) => a + p.leads, 0)} />
        <Stat label="Booked" value={stats.reduce((a, p) => a + p.booked, 0)} tone="good" />
        <Stat label="Best conversion" value={stats.filter((p) => p.leads >= 3).sort((a, b) => b.conv - a.conv)[0]?.name || '–'} sub="among partners with 3+ leads" />
      </Grid>
      <DataTable rows={stats} initialSort={{ key: 'leads', dir: 'desc' }} searchKeys={['name', 'firm', 'code', 'city']} onRowClick={(p) => can && setEdit({ ...p })} filters={[{ key: 'status', label: 'Status' }, { key: 'city', label: 'City' }]}
        empty="No channel partners yet. Add one, then pick them on a lead."
        columns={[{ key: 'code', label: 'Code', render: (p) => <b className="mono">{p.code}</b> }, { key: 'name', label: 'Partner', render: (p) => <div><b>{p.name}</b><div className="small muted">{p.firm}</div></div> },
          { key: 'city', label: 'City' }, { key: 'leads', label: 'Leads', align: 'right' }, { key: 'open', label: 'Open', align: 'right' }, { key: 'booked', label: 'Booked', align: 'right' },
          { key: 'conv', label: 'Conversion', align: 'right', render: (p) => (p.leads ? Math.round(p.conv * 100) + '%' : '–') }, { key: 'status', label: 'Status', render: (p) => <Badge tone={p.status === 'Inactive' ? 'muted' : 'good'}>{p.status}</Badge> }]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? partnerLabel(edit) : 'New channel partner'} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {edit && <RecordForm fields={FIELDS} value={edit} onChange={setEdit} />}
      </Modal>
    </Page>
  )
}
