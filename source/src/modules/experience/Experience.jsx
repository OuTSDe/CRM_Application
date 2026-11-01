import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { seesAll } from '../../lib/perms.js'
import { Page, Card, Button, Badge, Seg } from '../../components/ui.jsx'
import RecordPicker from '../../components/RecordPicker.jsx'
import { experienceUrl } from '../../components/Tower.jsx'
import DataTable from '../../components/DataTable.jsx'
import { d } from '../../lib/format.js'

// The Accord experience (OuTSDe): persona, palette, configurator and the Accord, run with a buyer at the screen.
// It lives in /experience as its own build; this page launches it for a client or lead and collects what was chosen.
export default function Experience() {
  const { db, user, online, upload, notify, upsert } = useStore()
  const crm = useCrm()
  const [rid, setRid] = useState('')
  const [edition, setEdition] = useState('yamuna-sky-city')
  const [view, setView] = useState('console')
  const rec = crm.clients.find((c) => c.clientId === rid) || db.leads.find((l) => l.id === rid)
  const ref = rec?.unit ? 'YSC-' + rec.unit : ''
  const isClient = !!crm.clients.find((c) => c.clientId === rid)
  const url = useMemo(() => {
    const base = experienceUrl({ name: rec?.name, unit: rec?.unit, rid, by: user.name, client: isClient })
    const q = new URLSearchParams(base.split('?')[1])
    if (edition !== 'yamuna-sky-city') q.set('edition', edition)
    if (view === 'buyer') q.set('view', 'buyer')
    return 'experience/index.html?' + q.toString()
  }, [edition, view, rec, rid, user, isClient])
  const sessions = (db.accordSessions || []).filter((s) => seesAll(user) || user.appRole === 'design' || s.by === user.name)
  const nameOf = (id) => crm.clients.find((c) => c.clientId === id)?.name || db.leads.find((l) => l.id === id)?.name || ''
  const toDrive = async (s) => {
    let x = null; try { x = JSON.parse(localStorage.getItem('accord.experience.xlsx.' + s.id) || 'null') } catch (e) { /* */ }
    if (!x) return notify('The workbook for this session is on the device that ran it', 'bad')
    const bin = Uint8Array.from(atob(x.data), (c) => c.charCodeAt(0))
    const file = new File([bin], x.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    if (!online) { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = x.name; a.click(); return }
    try {
      const c = crm.clients.find((k) => k.clientId === s.recordId)
      const link = await upload(file, c ? `Clients/${c.unit} ${c.name}/09 Accord sessions` : 'Leads/Accord sessions', x.name.replace(/\.xlsx$/, ''), { kind: c ? 'client' : 'lead', recordId: c?.bookingId || x.recordId || '', label: x.buyer || '', category: 'Accord session', doc: 'session ' + x.id })
      upsert('accordSessions', { ...s, fileUrl: link }, { system: true }); notify('Saved to Google Drive')
    } catch (e) { notify(e.message, 'bad') }
  }
  return (
    <Page title={<>Accord <em>experience</em></>} back="/" backLabel="Dashboard" subtitle="Nine interiors, one of them theirs, resolved in about six minutes. Start a session for a client or lead; what they choose comes back to their file here.">
      <div className="exp-hero" style={{ backgroundImage: 'url(experience/editions/yamuna-sky-city/hero.jpg)' }}>
        <div style={{ width: '100%' }}>
          <div className="label" style={{ color: 'var(--fg2)' }}>OuTSDe · Outlook for Theoreticals &amp; Speculative Design</div>
          <h2 style={{ color: '#F4ECEA', marginTop: 8 }}>Start a session</h2>
          <p>Pick who you are hosting. Their name and residence are filled in for them; availability is read live from the CRM.</p>
        </div>
      </div>
      <div className="split">
        <Card title="Who is at the screen">
          <div className="form fc1">
            <label className="field"><span className="field-label">Client or lead (optional)</span><RecordPicker value={rid} onChange={setRid} /></label>
            {rec && <div className="note info" style={{ margin: 0 }}>{rec.name}{rec.unit ? ` · residence ${rec.unit}` : ''}{rec.stage ? ` · ${rec.stage}` : ''}</div>}
            <div className="row">
              <label className="field" style={{ flex: 1 }}><span className="field-label">Edition</span><Seg options={[{ value: 'yamuna-sky-city', label: 'Yamuna Sky City' }, { value: 'showcase', label: 'Showcase' }]} value={edition} onChange={setEdition} /></label>
              <label className="field" style={{ flex: 1 }}><span className="field-label">Screen</span><Seg options={[{ value: 'console', label: 'Laptop' }, { value: 'buyer', label: 'TV, large type' }]} value={view} onChange={setView} /></label>
            </div>
            <div className="row"><a className="btn btn-primary btn-lg" href={url} target="_blank" rel="noopener">Open the experience</a><a className="btn btn-lg" href={url}>Open here</a></div>
          </div>
        </Card>
        <Card title="How it connects">
          <ul className="list small">
            <li>Sold and blocked residences come from the CRM, so the tower and plans are always current.</li>
            <li>Each session's persona, palette, register, selections and configuration ID are saved to Accord as the buyer moves through it.</li>
            <li>The session workbook (the same Excel as before) is kept with the session and saved to the client's Drive folder.</li>
            <li>The design showcase is this experience without the BOQ. For quantities and costing, use Projects and BOQ in Accord Design.</li>
          </ul>
        </Card>
      </div>
      <h3 style={{ margin: '12px 0 14px', fontWeight: 500 }}>Sessions</h3>
      <DataTable rows={sessions} initialSort={{ key: 'updatedAt', dir: 'desc' }} searchKeys={['buyer', 'unitRef', 'configId', 'by', 'recordId']} empty="No sessions yet. They appear here as soon as one starts."
        filters={[{ key: 'palette', label: 'Palette' }, { key: 'persona', label: 'Persona' }, { key: 'by', label: 'Hosted by' }]}
        columns={[{ key: 'updatedAt', label: 'When', render: (s) => <span className="nowrap">{d(String(s.startedAt || s.updatedAt).slice(0, 10))}</span> },
          { key: 'buyer', label: 'Buyer', render: (s) => <div><b>{s.buyer || nameOf(s.recordId) || '–'}</b><div className="small muted">{s.recordId ? <Link to={s.recordId.startsWith('YSC-C') ? '/crm/clients/' + (crm.clients.find((c) => c.clientId === s.recordId)?.id || '') : '/crm/leads/' + s.recordId}>{s.recordId}</Link> : s.unitRef}</div></div> },
          { key: 'residence', label: 'Residence', render: (s) => <div>{s.residence || '–'}<div className="small muted">{s.unit ? 'Unit ' + s.unit : ''}</div></div> },
          { key: 'persona', label: 'Persona' }, { key: 'palette', label: 'Palette' }, { key: 'register', label: 'Register' },
          { key: 'screen', label: 'Reached', render: (s) => <Badge tone={/summary|accord/i.test(s.screen || '') ? 'good' : 'info'}>{s.screen || '–'}</Badge> },
          { key: 'by', label: 'Hosted by' },
          { key: 'file', label: 'Workbook', sort: false, render: (s) => s.fileUrl ? <a href={s.fileUrl} target="_blank" rel="noreferrer">Drive</a> : <Button size="sm" onClick={() => toDrive(s)}>{online ? 'Save to Drive' : 'Download'}</Button> }]} />
    </Page>
  )
}
