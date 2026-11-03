// Log the day's calls in one go: one row per person, saved together. Each row is saved exactly as the single
// form saves it (follow-up owners notified, earlier follow-ups closed, lead stages moved on).
import React, { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { META } from '../lib/seed.js'
import { Modal, Button, Select, Input } from './ui.jsx'
import RecordPicker from './RecordPicker.jsx'
import { useLogSaver } from './LogInteraction.jsx'
import { today, addDays } from '../lib/format.js'

const NEXT = [{ value: '', label: 'No follow-up' }, { value: '1', label: 'Tomorrow' }, { value: '3', label: 'In 3 days' }, { value: '7', label: 'In a week' }, { value: '14', label: 'In 2 weeks' }]
const row = () => ({ key: Math.random().toString(36).slice(2), recordId: '', mode: 'Call - outgoing', purpose: 'Follow-up', outcome: '', summary: '', next: '3', nextAction: '' })

export default function BulkLog({ open, onClose }) {
  const { user, notify } = useStore()
  const save = useLogSaver()
  const [rows, setRows] = useState(() => [row(), row(), row()])
  const set = (i, k, x) => setRows((r) => r.map((y, j) => (j === i ? { ...y, [k]: x } : y)))
  const filled = rows.filter((r) => r.recordId)
  // 2 Nov: when the same message went to many people (festival wishes, a site update), fill it once for every row.
  const [all, setAll] = useState({ mode: '', purpose: '', outcome: '', summary: '', next: '' })
  const applyAll = () => { const p = Object.fromEntries(Object.entries(all).filter(([, v]) => v !== '')); if (!Object.keys(p).length) return notify('Fill at least one of the boxes above first', 'bad'); setRows((r) => r.map((y) => ({ ...y, ...p }))); notify('Copied to all ' + rows.length + ' rows') }
  const submit = () => {
    if (!filled.length) return notify('Pick at least one person', 'bad')
    const bad = filled.find((r) => !r.summary.trim()); if (bad) return notify('Every row needs a short summary', 'bad')
    let k = 0
    filled.forEach((r) => { if (save({ recordId: r.recordId, mode: r.mode, purpose: r.purpose, outcome: r.outcome, summary: r.summary, nextAction: r.nextAction, nextDate: r.next ? addDays(today(), Number(r.next)) : '', nextOwners: [user.name] }, { quiet: true })) k++ })
    notify(`${k} interaction${k === 1 ? '' : 's'} logged`)
    setRows([row(), row(), row()]); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Log several at once" wide footer={<><span className="small muted" style={{ marginRight: 'auto' }}>{filled.length} to save · follow-ups come to you; add colleagues from the single form</span><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Save all</Button></>}>
      <div className="bulk-all">
        <b className="small">Same for every row</b>
        <Select options={META.lists['Contact mode']} value={all.mode} onChange={(e) => setAll({ ...all, mode: e.target.value })} placeholder="Mode" />
        <Select options={META.lists['Contact purpose']} value={all.purpose} onChange={(e) => setAll({ ...all, purpose: e.target.value })} placeholder="Purpose" />
        <Select options={META.lists.Outcome} value={all.outcome} onChange={(e) => setAll({ ...all, outcome: e.target.value })} placeholder="Outcome" />
        <div className="bulk-sum"><Input value={all.summary} onChange={(e) => setAll({ ...all, summary: e.target.value })} placeholder="Summary for everyone, e.g. Sent Diwali wishes" /></div>
        <Select options={NEXT} value={all.next} onChange={(e) => setAll({ ...all, next: e.target.value })} placeholder="Follow-up" />
        <Button size="sm" onClick={applyAll}>Copy to all rows</Button>
      </div>
      <div className="bulk">
        {rows.map((r, i) => <div key={r.key} className="bulk-row">
          <span className="bulk-n mono">{String(i + 1).padStart(2, '0')}</span>
          <div className="bulk-who"><RecordPicker value={r.recordId} onChange={(id) => set(i, 'recordId', id)} /></div>
          <Select options={META.lists['Contact mode']} value={r.mode} onChange={(e) => set(i, 'mode', e.target.value)} />
          <Select options={META.lists.Outcome} value={r.outcome} onChange={(e) => set(i, 'outcome', e.target.value)} placeholder="Outcome" />
          <div className="bulk-sum"><Input value={r.summary} onChange={(e) => set(i, 'summary', e.target.value)} placeholder="What was discussed" /></div>
          <Input value={r.nextAction} onChange={(e) => set(i, 'nextAction', e.target.value)} placeholder="Next action" />
          <Select options={NEXT} value={r.next} onChange={(e) => set(i, 'next', e.target.value)} placeholder="Follow-up" />
          <button type="button" className="icon-btn" aria-label="Remove row" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [row()])}>×</button>
        </div>)}
      </div>
      <Button size="sm" style={{ marginTop: 10 }} onClick={() => setRows([...rows, row()])}>+ Add a row</Button>
    </Modal>
  )
}
