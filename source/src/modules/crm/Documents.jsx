import React, { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canWrite } from '../../lib/perms.js'
import { META } from '../../lib/seed.js'
import { Page, Card, Badge, Bar, Select } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { pct, today, d } from '../../lib/format.js'
import { CLIENT_FOLDER, clientFolder, fileName, OTHER, PROJECT_CATS, slug } from '../../lib/folders.js'
import { Button, Field, Input, Seg, Modal } from '../../components/ui.jsx'
import { checkCard } from '../../lib/kyc.js'

export default function Documents() {
  const { db, user, upsert, upload, backend, notify } = useStore()
  const crm = useCrm()
  const [qs, setQs] = useSearchParams()
  const b = qs.get('b')
  const c = crm.clients.find((x) => x.bookingId === b)
  const doc = db.documents.find((x) => x.bookingId === b) || (b ? { id: b, bookingId: b, items: {}, files: {} } : null)
  const can = canWrite(user, 'documents')
  const [busy, setBusy] = useState('')
  const groups = {}; META.docTypes.forEach((t) => (groups[t.group] = groups[t.group] || []).push(t))
  const setItem = (k, v) => upsert('documents', { ...doc, items: { ...doc.items, [k]: v } }, { silent: true })
  const [tab, setTab] = useState(qs.get('tab') || 'clients')
  const [other, setOther] = useState('')
  const filesFor = (key) => (db.files || []).filter((f) => f.recordId === b && f.doc === key)
  const [kycAsk, setKycAsk] = useState(null)
  // 2 Nov: PAN and Aadhaar photos are read before filing; a wrong card or a name that does not match is flagged first.
  const onFile = async (t, f, checked) => {
    if (!f) return
    setBusy(t.key)
    try {
      const card = /^(entity_)?pan/.test(t.key) ? 'pan' : /^aadhaar/.test(t.key) ? 'aadhaar' : ''
      let res = checked
      if (card && !res) {
        notify('Reading the card…')
        try { res = await checkCard(f, card, /co_applicant/.test(t.key) ? (c.coapp || c.name) : c.name) } catch (e) { res = { ok: null, note: e.message } }
        if (res.ok === false) { setKycAsk({ t, f, res }); return }
      }
      const kycMeta = res ? { kyc: res.ok ? 'Checked: ' + res.kind : res.ok === null ? 'Not checked' : 'Uploaded despite: ' + res.note.slice(0, 60), kycNumber: res.number || '', kycName: res.name || '', kycDob: res.dob || '' } : {}
      const name = fileName(c, t.label, today())
      const url = await upload(f, clientFolder(c, CLIENT_FOLDER[t.group] || OTHER), name, { kind: 'client', recordId: c.bookingId, label: `${c.unit} ${c.name}`, category: t.group, doc: t.key, ...kycMeta })
      if (url && res?.note) notify(res.ok ? 'Card checked: ' + res.note : res.note, res.ok ? 'good' : 'warn')
      if (url) { upsert('documents', { ...doc, items: { ...doc.items, [t.key]: doc.items?.[t.key] === 'Verified' ? 'Verified' : 'Received' }, files: { ...(doc.files || {}), [t.key]: url } }, { action: 'uploaded ' + t.label }); notify(`Saved to Drive: ${clientFolder(c, CLIENT_FOLDER[t.group] || OTHER)} / ${name}`) }
    } catch (e) { notify('Upload failed: ' + e.message, 'bad') } finally { setBusy('') }
  }
  const onOther = async (f) => {
    if (!f || !other.trim()) return notify('Name the document first', 'bad')
    setBusy('other')
    try { await upload(f, clientFolder(c, OTHER), fileName(c, other, today()), { kind: 'client', recordId: c.bookingId, label: `${c.unit} ${c.name}`, category: 'Other', doc: 'other:' + slug(other) }); notify('Saved to Drive / ' + clientFolder(c, OTHER)); setOther('') } catch (e) { notify('Upload failed: ' + e.message, 'bad') } finally { setBusy('') }
  }
  if (!c && tab === 'project') return <ProjectDocs tab={tab} setTab={(t) => { setTab(t); setQs(t === 'clients' ? {} : { tab: t }) }} />
  if (!c) return (
    <Page back={true} title="Documents" subtitle="KYC, agreement, payment and handover papers for every booking, and the project's legal papers and forms. Every upload is renamed and filed in the OuTSDe Drive (Accord_Data).">
      <DocTabs tab={tab} setTab={(t) => { setTab(t); setQs(t === 'clients' ? {} : { tab: t }) }} />
      <DataTable rows={crm.clients} searchKeys={['name', 'clientId', (x) => String(x.unit)]} initialSort={{ key: 'docPct', dir: 'asc' }} onRowClick={(x) => setQs({ b: x.bookingId })} filters={[{ key: 'status', label: 'Status' }, { key: 'residency', label: 'Residency' }]}
        columns={[{ key: 'unit', label: 'Flat' }, { key: 'name', label: 'Client' }, { key: 'residency', label: 'Residency' }, { key: 'buyerType', label: 'Buyer type' },
          { key: 'docPct', label: 'Complete', render: (x) => <div style={{ minWidth: 140 }}><div className="small">{x.docsDone} of {x.docsApplicable} · {pct(x.docPct)}</div><Bar value={x.docPct} tone={x.docPct < 0.5 ? 'bad' : x.docPct < 0.8 ? 'warn' : 'good'} /></div> },
          { key: 'agreement', label: 'Agreement', render: (x) => <Badge>{x.agreement}</Badge> }]} />
    </Page>)
  return (
    <Page title={`Documents · ${c.name}`} back="/crm/documents" backLabel="All clients" subtitle={`${c.unit} · ${c.clientId} · ${c.docsDone} of ${c.docsApplicable} applicable documents received`}
      actions={<Link className="btn" to={'/crm/messages?to=' + c.clientId + '&tp=TP-04'}>Request pending documents</Link>}>
      {!backend ? <div className="note info">Files go to Google Drive once the backend is connected (Admin, Data and sync). Each file is named <b>flat_clientID_document_date</b> inside Accord_Data / Clients / flat name / category. The checklist works without it.</div>
        : <div className="note info small">Uploads are renamed <b className="mono">{fileName(c, 'document', today())}</b> and filed in <b className="mono">Accord_Data / {clientFolder(c, '…')}</b> by category. On a phone, <b>Camera</b> photographs the paper directly.</div>}
      <div className="grid g2">{Object.entries(groups).map(([g, ts]) => <Card key={g} title={g}>
        {ts.map((t) => { const v = doc.items?.[t.key] || 'Pending'; const url = doc.files?.[t.key]; const more = filesFor(t.key)
          return <div key={t.key} className="check-row doc-row" style={{ alignItems: 'center' }}><span className="lbl" style={{ flex: 1 }}>{t.label}{url && !more.length && <> · <a href={url} target="_blank" rel="noreferrer">open</a></>}
              {more.length > 0 && <span className="small"> · {more.map((f, i) => <a key={f.id} href={f.url} target="_blank" rel="noreferrer" title={f.name + ' · ' + f.by}>{i ? ', ' : ''}{more.length > 1 ? 'file ' + (i + 1) : 'open'}</a>)}</span>}{more[0]?.kyc && <span className={"small " + (/^Checked/.test(more[0].kyc) ? "muted" : "missing")}> · {more[0].kyc}{more[0].kycNumber ? " " + more[0].kycNumber : ""}</span>}</span>
            <span className="row gap-s">
              <Select options={META.lists['Document status']} value={v} disabled={!can} onChange={(e) => setItem(t.key, e.target.value)} placeholder="Pending" style={{ minHeight: 30, padding: '3px 8px', width: 140 }} />
              {can && backend && <><label className="btn btn-sm">{busy === t.key ? '…' : 'Upload'}<input type="file" hidden accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => onFile(t, e.target.files[0])} /></label>
                <label className="btn btn-sm only-touch">Camera<input type="file" hidden accept="image/*" capture="environment" onChange={(e) => onFile(t, e.target.files[0])} /></label></>}
            </span></div> })}
      </Card>)}
      {can && backend && <Card title="Any other document">
        <div className="row"><input className="input" style={{ flex: 1, minWidth: 200 }} value={other} onChange={(e) => setOther(e.target.value)} placeholder="What is it? e.g. NOC from society" aria-label="Document name" />
          <label className={'btn' + (!other.trim() ? ' disabled' : '')}>{busy === 'other' ? 'Uploading…' : 'Upload'}<input type="file" hidden disabled={!other.trim()} onChange={(e) => onOther(e.target.files[0])} /></label></div>
        {(db.files || []).filter((f) => f.recordId === b && String(f.doc).startsWith('other:')).map((f) => <div key={f.id} className="check-row"><a href={f.url} target="_blank" rel="noreferrer">{f.name}</a><span className="small muted">{f.by} · {d(String(f.at).slice(0, 10))}</span></div>)}
      </Card>}</div>
      <Modal open={!!kycAsk} onClose={() => setKycAsk(null)} title="Check this card" footer={<><Button onClick={() => setKycAsk(null)}>Choose another file</Button><Button variant="primary" onClick={() => { const k = kycAsk; setKycAsk(null); onFile(k.t, k.f, { ...k.res, ok: false }) }}>Upload anyway</Button></>}>
        {kycAsk && <><div className="kyc-box kyc-warn">{kycAsk.res.note}</div>
          <p className="small muted">For {kycAsk.t.label}. The card is read on this device only; Aadhaar numbers are kept as the last 4 digits. If the photo is right but blurred, upload it anyway and mark it Verified after checking by eye.</p></>}
      </Modal>
    </Page>
  )
}

function DocTabs({ tab, setTab }) {
  return <div className="tabs" role="tablist">{[['clients', 'Client documents'], ['project', 'Project, legal and forms']].map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} className={'tab' + (tab === v ? ' on' : '')} onClick={() => setTab(v)}>{l}</button>)}</div>
}

// Project-level papers (1 Nov: "upload all the documents, all the legal forms"): Accord_Data / Project documents / <category>.
function ProjectDocs({ tab, setTab }) {
  const { db, user, upload, backend, notify } = useStore()
  const can = canWrite(user, 'documents')
  const [cat, setCat] = useState(PROJECT_CATS[0])
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const list = (db.files || []).filter((f) => f.kind === 'project')
  const go = async (f) => {
    if (!f) return
    if (!label.trim()) return notify('Name the document first', 'bad')
    setBusy(true)
    try { await upload(f, 'Project documents/' + cat, `YSC_${slug(cat)}_${slug(label)}_${today()}`, { kind: 'project', recordId: 'YSC', label: 'Yamuna Sky City', category: cat, doc: label }); notify(`Saved to Drive / Project documents / ${cat}`); setLabel('') } catch (e) { notify('Upload failed: ' + e.message, 'bad') } finally { setBusy(false) }
  }
  return (
    <Page back={true} title="Documents" subtitle="The project's own papers: approvals, legal documents, blank forms and templates, marketing material and site progress. Filed in Accord_Data / Project documents.">
      <DocTabs tab={tab} setTab={setTab} />
      {!backend && <div className="note info">Connect the shared database (Admin, Data and sync) to upload to Drive.</div>}
      {can && backend && <Card title="Upload">
        <div className="form fc2">
          <Field label="Category"><Seg options={PROJECT_CATS} value={cat} onChange={setCat} /></Field>
          <Field label="Document"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. RERA certificate, blank agreement for sale" /></Field>
        </div>
        <div className="row" style={{ marginTop: 10 }}><label className={'btn btn-primary' + (!label.trim() ? ' disabled' : '')}>{busy ? 'Uploading…' : 'Choose file and upload'}<input type="file" hidden disabled={!label.trim()} onChange={(e) => go(e.target.files[0])} /></label>
          <label className="btn only-touch">Camera<input type="file" hidden accept="image/*" capture="environment" disabled={!label.trim()} onChange={(e) => go(e.target.files[0])} /></label></div>
      </Card>}
      <DataTable rows={list} initialSort={{ key: 'at', dir: 'desc' }} searchKeys={['doc', 'name', 'by', 'category']} filters={[{ key: 'category', label: 'Category' }]} empty="No project documents yet."
        columns={[{ key: 'doc', label: 'Document', render: (f) => <a href={f.url} target="_blank" rel="noreferrer"><b>{f.doc}</b></a> }, { key: 'category', label: 'Category' }, { key: 'name', label: 'File', render: (f) => <span className="small mono">{f.name}</span> },
          { key: 'by', label: 'By' }, { key: 'at', label: 'Uploaded', render: (f) => d(String(f.at).slice(0, 10)) }]} />
    </Page>
  )
}
