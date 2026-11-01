// A small month calendar: your follow-ups, private viewings and tasks, one dot each. Click a day to see them.
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { today, d } from '../lib/format.js'

export default function MiniCalendar({ items }) {
  const t = today()
  const [month, setMonth] = useState(t.slice(0, 7))
  const [day, setDay] = useState(t)
  const byDay = useMemo(() => { const m = {}; items.forEach((x) => { if (x.date) (m[x.date] = m[x.date] || []).push(x) }); return m }, [items])
  const first = new Date(month + '-01T00:00:00'), start = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  const shift = (k) => { const x = new Date(first); x.setMonth(x.getMonth() + k); setMonth(x.toISOString().slice(0, 7)) }
  const list = byDay[day] || []
  return (
    <div className="mcal">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <b style={{ fontWeight: 500 }}>{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="mcal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => <span key={i} className="mcal-h">{x}</span>)}
        {cells.map((c, i) => !c ? <span key={i} /> : <button key={c} type="button" aria-pressed={day === c} className={'mcal-d' + (c === t ? ' today' : '') + (c < t && (byDay[c] || []).some((x) => x.kind === 'followup') ? ' late' : '')} onClick={() => setDay(c)}>
          {Number(c.slice(8))}<span className="dots">{['followup', 'viewing', 'task'].filter((k) => (byDay[c] || []).some((x) => x.kind === k)).map((k) => <i key={k} className={k} />)}</span></button>)}
      </div>
      <div className="mcal-list">
        <div className="small muted" style={{ margin: '10px 0 4px' }}>{d(day)} · {list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') : 'nothing planned'}</div>
        {list.slice(0, 6).map((x) => <Link key={x.kind + x.id} to={x.link} className="check-row" style={{ color: 'inherit' }}><span><i className={'kdot ' + x.kind} />{x.title}</span><span className="small muted">{x.time || ''}</span></Link>)}
      </div>
      <div className="legend" style={{ marginTop: 8 }}><span><i style={{ background: 'var(--accent)' }} />Follow-up</span><span><i style={{ background: 'var(--info)' }} />Viewing</span><span><i style={{ background: 'var(--warn)' }} />Task</span></div>
    </div>
  )
}
