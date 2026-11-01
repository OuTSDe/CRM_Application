import React, { useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { canWrite } from '../../lib/perms.js'
import { Page, Button, Badge, Modal, Grid, Stat } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm from '../../components/RecordForm.jsx'
import { d, today } from '../../lib/format.js'

const F = (team) => [{ k: 'date', l: 'Logged', t: 'date' }, { k: 'category', l: 'Category', t: 'select', o: 'Issue category' }, { k: 'severity', l: 'Severity', t: 'select', o: 'Severity' },
  { k: 'unit', l: 'Residence', t: 'number' }, { k: 'owner', l: 'Owner', t: 'select', o: team }, { k: 'status', l: 'Status', t: 'select', o: 'Issue status' },
  { k: 'description', l: 'What is wrong', t: 'textarea', span: 'all' }, { k: 'source', l: 'Where it was found', span: 'all' }, { k: 'action', l: 'Action needed', t: 'textarea', span: 'all' },
  { k: 'resolution', l: 'Resolution', t: 'textarea', span: 'all' }, { k: 'resolvedOn', l: 'Resolved on', t: 'date' }]

export default function Issues() {
  const { db, user, upsert, nextId } = useStore()
  const [edit, setEdit] = useState(null)
  const team = db.users.filter((u) => u.appRole !== 'none').map((u) => u.name)
  const open = db.issues.filter((i) => !['Resolved', "Won't fix"].includes(i.status))
  const can = canWrite(user, 'issues')
  return (
    <Page back={true} title="Issues log" subtitle="Conflicts and gaps found between the source sheets, and anything else that needs fixing in the data. Resolve them here so the numbers stay trustworthy."
      actions={can && <Button variant="primary" onClick={() => setEdit({ date: today(), status: 'Open', severity: 'Medium', owner: 'Anuradha' })}>+ Log issue</Button>}>
      <Grid cols={4}>
        <Stat label="Open" value={open.length} tone="warn" /><Stat label="High severity" value={open.filter((i) => i.severity === 'High').length} tone="bad" />
        <Stat label="Resolved" value={db.issues.length - open.length} tone="good" /><Stat label="Owned by you" value={open.filter((i) => i.owner === user.name).length} tone="info" />
      </Grid>
      <DataTable rows={db.issues} initialSort={{ key: 'severity', dir: 'asc' }} searchKeys={['description', 'action', 'id', (i) => String(i.unit || '')]} onRowClick={(i) => can && setEdit({ ...i })}
        filters={[{ key: 'status', label: 'Status' }, { key: 'severity', label: 'Severity' }, { key: 'category', label: 'Category' }, { key: 'owner', label: 'Owner' }]}
        columns={[{ key: 'id', label: 'ID' }, { key: 'severity', label: 'Severity', sortValue: (i) => ({ High: 0, Medium: 1, Low: 2 }[i.severity]), render: (i) => <Badge>{i.severity}</Badge> }, { key: 'unit', label: 'Flat' }, { key: 'category', label: 'Category' },
          { key: 'description', label: 'Issue', render: (i) => <div style={{ maxWidth: 460 }}>{i.description}<div className="small muted">{i.action}</div></div> }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status', render: (i) => <Badge>{i.status}</Badge> }, { key: 'date', label: 'Logged', render: (i) => d(i.date) }]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Issue ' + edit.id : 'New issue'} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button>
        {edit?.id && edit.status !== 'Resolved' && <Button onClick={() => { upsert('issues', { ...edit, status: 'Resolved', resolvedOn: today() }, { action: 'resolved' }); setEdit(null) }}>Mark resolved</Button>}
        <Button variant="primary" onClick={() => { upsert('issues', { ...edit, id: edit.id || nextId('issues', 'Q-', 3) }); setEdit(null) }}>Save</Button></>}>
        {edit && <RecordForm fields={F(team)} value={edit} onChange={setEdit} />}
      </Modal>
    </Page>
  )
}
