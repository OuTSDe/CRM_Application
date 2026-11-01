import React, { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { testReasons, CLEANUP_COLLS } from '../../lib/testflag.js'
import { Page, Card, Button, Badge, Seg } from '../../components/ui.jsx'
import { d } from '../../lib/format.js'

const LABEL = { leads: 'Lead', clients: 'Booking', interactions: 'Interaction', payments: 'Payment', tasks: 'Task', viewings: 'Viewing', costSheets: 'Cost sheet', issues: 'Issue', messages: 'Message', files: 'File' }
const nameOf = (c, r) => r.name || r.recordName || r.payer || r.title || r.buyer || r.doc || r.subject || r.recordId || r.id

// 1 Nov: entries made by mistake while showing Accord around. Nothing is deleted without an admin pressing Delete.
export function DataCleanup() {
  const { raw, remove, upsert, notify } = useStore()
  const [only, setOnly] = useState('all')
  const rows = useMemo(() => CLEANUP_COLLS.flatMap((c) => (raw[c] || []).map((r) => ({ c, r, why: testReasons(c, r) })).filter((x) => x.why.length)), [raw])
  const shown = rows.filter((x) => only === 'all' || (only === 'demo' ? x.r._test === 'Yes' : x.r._test !== 'Yes'))
  const del = (x) => { remove(x.c, x.r.id); notify(`${LABEL[x.c]} ${x.r.id} deleted`) }
  const keep = (x) => upsert(x.c, { ...x.r, _test: '', notTest: 'Yes' }, { action: 'marked as real' })
  const delAllDemo = () => { rows.filter((x) => x.r._test === 'Yes').forEach(del) }
  return (
    <Page title="Data clean-up" back="/admin/data" backLabel="Data and sync" subtitle="Entries made in demo mode, and entries that look like tests. Delete the ones made by mistake; mark the rest as real so they stop showing here."
      actions={rows.some((x) => x.r._test === 'Yes') && <Button variant="danger" onClick={delAllDemo}>Delete everything made in demo mode</Button>}>
      <div className="row between"><Seg options={[{ value: 'all', label: `All (${rows.length})` }, { value: 'demo', label: `Demo mode (${rows.filter((x) => x.r._test === 'Yes').length})` }, { value: 'looks', label: 'Looks like a test' }]} value={only} onChange={setOnly} /></div>
      <Card pad={false}>
        {!shown.length ? <div className="empty"><p>Nothing to clean up.</p></div> :
          <div className="dt-wrap"><table className="table"><thead><tr><th>What</th><th>Record</th><th>Why it is here</th><th>Made</th><th /></tr></thead>
            <tbody>{shown.map((x) => <tr key={x.c + x.r.id}><td><Badge tone={x.r._test === 'Yes' ? 'warn' : 'muted'}>{LABEL[x.c]}</Badge></td><td><b>{nameOf(x.c, x.r)}</b><div className="small muted mono">{x.r.id}</div></td>
              <td className="small">{x.why.join(' · ')}</td><td className="small">{x.r.updatedBy || x.r.by || '–'}<div className="muted">{d(String(x.r.updatedAt || x.r.date || x.r.at || '').slice(0, 10))}</div></td>
              <td className="right nowrap"><Button size="sm" variant="ghost" onClick={() => keep(x)}>It is real</Button> <Button size="sm" variant="danger" onClick={() => del(x)}>Delete</Button></td></tr>)}</tbody></table></div>}
      </Card>
      <p className="small muted">Deleting removes the row from the Google Sheet too; the audit log keeps who deleted what. Uploaded files stay in Drive (Accord_Data); remove those by hand if needed.</p>
    </Page>
  )
}
