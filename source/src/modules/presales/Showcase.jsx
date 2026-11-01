import React, { useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { Page, Card, Button, Select, Badge, Field } from '../../components/ui.jsx'
import RecordPicker from '../../components/RecordPicker.jsx'

// Pre-sales view of Accord: rooms, renders and finishes to show buyers. No quantities or prices.
export default function Showcase() {
  const { db, upsert, notify } = useStore()
  const [pid, setPid] = useState(db.projects[0]?.id || '')
  const [rid, setRid] = useState('')
  const [guest, setGuest] = useState('')
  const [full, setFull] = useState(null)
  const p = db.projects.find((x) => x.id === pid)
  const rooms = db.rooms.filter((r) => r.projectId === pid)
  const room = rooms.find((r) => r.id === rid) || rooms[0]
  const pkgs = db.packages.filter((k) => k.projectId === pid)
  const likes = (p?.likes || {})[guest] || []
  const key = (r, f) => `${r.id}:${f.surface}`
  const toggle = (k) => { if (!guest) return notify('Pick the guest first to record what they like', 'bad'); const next = likes.includes(k) ? likes.filter((x) => x !== k) : [...likes, k]; upsert('projects', { ...p, likes: { ...(p.likes || {}), [guest]: next } }, { system: true, silent: true }) }
  return (
    <Page back={true} title="Design showcase" subtitle="Walk a buyer through the sample residence: each room, its renders and the finishes chosen. Tap a finish they like to note it on their file."
      actions={<><Select options={db.projects.map((x) => ({ value: x.id, label: x.name }))} value={pid} onChange={(e) => { setPid(e.target.value); setRid('') }} /></>}>
      {!p ? <Card><div className="empty">No design projects yet. Create one in Accord.</div></Card> : <>
        <Card><div className="form fc3"><Field label="Guest (optional)" span={2}><RecordPicker value={guest} onChange={setGuest} /></Field><Field label="Liked so far"><div style={{ paddingTop: 8 }}>{likes.length ? <Badge tone="good">{likes.length} finishes</Badge> : <span className="muted small">none</span>}</div></Field></div></Card>
        <div className="chips" style={{ marginBottom: 12 }}>{rooms.map((r) => <button key={r.id} className={'chip' + (room?.id === r.id ? ' on' : '')} onClick={() => setRid(r.id)}>{r.name}</button>)}</div>
        {room && <div className="split">
          <Card title={room.name}>
            {room.renders?.length ? <div className="grid g2" style={{ marginBottom: 0 }}>{room.renders.map((u, k) => <img key={k} src={u} alt="" onClick={() => setFull(u)} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }} />)}</div>
              : <div className="res-img" style={{ background: '#f1eee8', color: 'var(--muted)', border: '1px dashed var(--line)' }}>Renders for {room.name} appear here once the design team uploads them in Accord.</div>}
            {room.notes && <p style={{ marginBottom: 0 }}>{room.notes}</p>}
          </Card>
          <Card title="Finishes">
            {room.finishes.map((f) => { const k = key(room, f); const on = likes.includes(k)
              return <div key={k} className="check-row" style={{ alignItems: 'center' }}><span><span className="lbl">{f.surface}</span><div><b>{f.material}</b></div></span><Button size="sm" variant={on ? 'primary' : 'default'} onClick={() => toggle(k)}>{on ? '♥ Liked' : '♡ Like'}</Button></div> })}
            {pkgs.some((k) => k.optional) && <><div className="form-section" style={{ marginTop: 12 }}>Optional upgrades</div>{pkgs.filter((k) => k.optional).map((k) => <div key={k.id} className="check-row"><span>{k.name}</span><Badge tone="info">On request</Badge></div>)}</>}
          </Card>
        </div>}
      </>}
      {full && <div className="modal-bg" onClick={() => setFull(null)}><img src={full} alt="" style={{ maxWidth: '94vw', maxHeight: '90vh', borderRadius: 10 }} /></div>}
    </Page>
  )
}
