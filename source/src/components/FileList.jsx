// 4 Nov: uploaded files, so a wrong upload can be spotted and removed. View opens the file inside Accord (photos and
// PDFs are shown in place; other types download), so nobody needs access to the OuTSDe Drive to check a paper.
// Delete is for the person who uploaded it and for admins; the file goes to the Drive bin and the checklist line
// goes back to Pending when its last file is removed.
import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { Modal, Button, Confirm } from './ui.jsx'
import { d } from '../lib/format.js'

const when = (at) => { const x = new Date(at); return isNaN(x) ? '' : d(x.toISOString().slice(0, 10)) + ' ' + x.toTimeString().slice(0, 5) }

export function useFileViewer() {
  const { fileGet, notify } = useStore()
  const [view, setView] = useState(null)   // { f, url, mime, busy, err }
  useEffect(() => () => { if (view?.url) URL.revokeObjectURL(view.url) }, [view?.url])
  const open = async (f) => {
    setView({ f, busy: true })
    try {
      const j = await fileGet(f.id)
      if (j.tooBig) return setView({ f, err: 'This file is too large to show here. Open it in Drive instead.' })
      const bin = atob(j.data), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([arr], { type: j.mime || 'application/octet-stream' }))
      setView({ f, url, mime: j.mime || '' })
    } catch (e) { setView({ f, err: e.message }); notify('Could not open the file: ' + e.message, 'bad') }
  }
  const modal = <Modal open={!!view} onClose={() => setView(null)} title={view?.f?.name || 'File'} wide
    footer={<>{view?.url && <a className="btn" href={view.url} download={view.f.name}>Download</a>}{view?.f?.url && <a className="btn" href={view.f.url} target="_blank" rel="noreferrer">Open in Drive</a>}<Button variant="primary" onClick={() => setView(null)}>Close</Button></>}>
    {view && <div className="file-view">
      <p className="small muted" style={{ marginTop: 0 }}>Uploaded by {view.f.by} · {when(view.f.at)}{view.f.kyc ? ' · ' + view.f.kyc + (view.f.kycNumber ? ' ' + view.f.kycNumber : '') : ''}</p>
      {view.busy && <p className="muted">Opening…</p>}
      {view.err && <div className="note warn">{view.err}</div>}
      {view.url && (/^image\//.test(view.mime) ? <img src={view.url} alt={view.f.name} /> : /pdf/.test(view.mime) ? <iframe title={view.f.name} src={view.url} /> :
        <p>This type of file cannot be shown here. Use <b>Download</b> to check it.</p>)}
    </div>}
  </Modal>
  return { open, modal }
}

export default function FileList({ files, onView, empty = 'No files uploaded yet.', showDoc }) {
  const { user, fileDelete, notify } = useStore()
  const [busy, setBusy] = useState('')
  const del = async (f) => {
    setBusy(f.id)
    try { await fileDelete(f.id); notify(`${f.name} deleted. You can upload the right file now.`) } catch (e) { notify('Not deleted: ' + e.message, 'bad') } finally { setBusy('') }
  }
  if (!files.length) return <p className="small muted" style={{ margin: '6px 0' }}>{empty}</p>
  return <div className="file-list">{[...files].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((f) => {
    const mayDelete = user.appRole === 'admin' || f.by === user.name
    return <div key={f.id} className="file-row">
      <span className="file-ico" aria-hidden="true">{/\.pdf$/i.test(f.name) ? 'PDF' : /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name) ? 'IMG' : 'DOC'}</span>
      <span className="file-meta"><button type="button" className="linklike" onClick={() => onView(f)} title="View this file">{f.name}</button>
        <span className="small muted">{showDoc && f.docLabel ? f.docLabel + ' · ' : ''}{f.by} · {when(f.at)}{f.kyc ? ' · ' + f.kyc : ''}</span></span>
      <span className="row gap-s">
        <Button size="sm" onClick={() => onView(f)}>View</Button>
        {mayDelete && <Confirm size="sm" label="Delete this file?" onConfirm={() => del(f)}>{busy === f.id ? '…' : 'Delete'}</Confirm>}
      </span>
    </div> })}</div>
}
