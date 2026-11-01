import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useStore } from '../lib/store.jsx'

// Type a name, client ID, lead ID, flat number or phone: suggestions show who it is, then the ID is filled in.
export default function RecordPicker({ value, onChange, kinds = ['client', 'lead'], placeholder = 'Name, ID, flat no. or phone' }) {
  const { db } = useStore()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const all = useMemo(() => {
    const out = []
    if (kinds.includes('client')) {
      const seen = new Set()
      db.clients.forEach((c) => out.push({ id: c.clientId, kind: 'Client', name: c.name, sub: `Flat ${c.unit} · ${c.bookingId}${c.phone ? ' · ' + c.phone : ''}`, key: `${c.clientId} ${c.bookingId} ${c.name} ${c.unit} ${c.phone || ''} ${c.coapp || ''}`, dup: seen.has(c.clientId) || !seen.add(c.clientId) }))
    }
    if (kinds.includes('lead')) db.leads.forEach((l) => out.push({ id: l.id, kind: 'Lead', name: l.name, sub: `${l.id}${l.city ? ' · ' + l.city : ''}${l.phone ? ' · ' + l.phone : ''}${l.stage ? ' · ' + l.stage : ''}`, key: `${l.id} ${l.name} ${l.phone || ''} ${l.city || ''}` }))
    return out
  }, [db.clients, db.leads, kinds])
  const cur = all.find((x) => x.id === value)
  const hits = useMemo(() => {
    if (!q) return []
    const t = q.toLowerCase()
    return all.filter((x) => x.key.toLowerCase().includes(t)).slice(0, 8)
  }, [q, all])
  useEffect(() => { const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  return (
    <div className="picker" ref={box}>
      {cur && !open ? (
        <button type="button" className="picker-cur" onClick={() => { setOpen(true); setQ('') }}>
          <span className={'kind k-' + cur.kind.toLowerCase()}>{cur.kind}</span><b>{cur.name}</b><span className="muted"> · {cur.id} · {cur.sub.split(' · ')[0]}</span>
        </button>
      ) : (
        <input className="input" autoFocus={open} placeholder={placeholder} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} />
      )}
      {open && hits.length > 0 && (
        <div className="picker-list">
          {hits.map((h) => (
            <button type="button" key={h.kind + h.id + h.sub} onClick={() => { onChange(h.id, h); setOpen(false); setQ('') }}>
              <span className={'kind k-' + h.kind.toLowerCase()}>{h.kind}</span><b>{h.name}</b><span className="muted">{h.sub}</span>
            </button>))}
        </div>
      )}
    </div>
  )
}
