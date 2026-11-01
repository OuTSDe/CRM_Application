import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Select, cx } from './ui.jsx'

// Searchable table with one "Sort and filter" control instead of a row of buttons (30 Oct: fewer buttons, more intuitive).
// columns: [{ key, label, render?, sortValue?, align?, width?, sort:false }]
// filters: [{ key, label, get?, options? }]   views: [{ value, label, test(row) }]
export default function DataTable({ rows, columns, searchKeys = [], filters = [], views, defaultView, onRowClick, pageSize = 60, initialSort, toolbar, empty = 'No records match.', rowClass, dense }) {
  const [q, setQ] = useState('')
  const [f, setF] = useState({})
  const [view, setView] = useState(defaultView || views?.[0]?.value || '')
  const [sort, setSort] = useState(initialSort || null)
  const [limit, setLimit] = useState(pageSize)
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => { const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  const out = useMemo(() => {
    let r = rows
    const v = views?.find((x) => x.value === view); if (v?.test) r = r.filter(v.test)
    if (q) { const t = q.toLowerCase(); r = r.filter((x) => searchKeys.some((k) => String(typeof k === 'function' ? k(x) : x[k] ?? '').toLowerCase().includes(t))) }
    filters.forEach((fl) => { const val = f[fl.key]; if (val) r = r.filter((x) => String(fl.get ? fl.get(x) : x[fl.key] ?? '') === val) })
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      const val = (x) => (col?.sortValue ? col.sortValue(x) : x[sort.key])
      r = [...r].sort((a, b) => {
        const A = val(a), B = val(b)
        if (A === B) return 0
        if (A === undefined || A === null || A === '') return 1
        if (B === undefined || B === null || B === '') return -1
        return (typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B), undefined, { numeric: true })) * (sort.dir === 'desc' ? -1 : 1)
      })
    }
    return r
  }, [rows, q, f, sort, columns, filters, searchKeys, view, views])
  const active = Object.values(f).filter(Boolean).length + (views && view !== (defaultView || views[0]?.value) ? 1 : 0)
  const sortable = columns.filter((c) => c.sort !== false && c.label)
  return (
    <div className="dt">
      <div className="dt-tools">
        {searchKeys.length > 0 && <input className="input search" type="search" aria-label="Search" placeholder="Search name, ID, flat or phone" value={q} onChange={(e) => { setQ(e.target.value); setLimit(pageSize) }} />}
        <span className="dt-count">{out.length} of {rows.length}{views && view ? ' · ' + (views.find((x) => x.value === view)?.label || '') : ''}</span>
        {toolbar}
        {(filters.length > 0 || views || sortable.length > 0) && <div className="rel" ref={box}>
          <button type="button" className="btn" onClick={() => setOpen(!open)} aria-expanded={open}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M1 3h12M3 7h8M5 11h4" /></svg>
            Sort and filter{active > 0 && <span className="filter-dot" />}
          </button>
          {open && <div className="filter-pop">
            {views && <label className="field"><span className="field-label">Show</span><Select options={views.map((v) => ({ value: v.value, label: v.label }))} value={view} placeholder="Everything" onChange={(e) => setView(e.target.value)} /></label>}
            {sortable.length > 0 && <div className="row2">
              <label className="field"><span className="field-label">Sort by</span><Select options={sortable.map((c) => ({ value: c.key, label: c.label }))} value={sort?.key} placeholder="As listed" onChange={(e) => setSort(e.target.value ? { key: e.target.value, dir: sort?.dir || 'asc' } : null)} /></label>
              <label className="field"><span className="field-label">Order</span><Select options={[{ value: 'asc', label: 'Low to high, A to Z' }, { value: 'desc', label: 'High to low, Z to A' }]} value={sort?.dir || 'asc'} placeholder="Order" onChange={(e) => sort && setSort({ ...sort, dir: e.target.value || 'asc' })} /></label>
            </div>}
            {filters.length > 0 && <div className="row2">{filters.map((fl) => {
              const opts = fl.options || [...new Set(rows.map((x) => (fl.get ? fl.get(x) : x[fl.key])).filter((v) => v !== undefined && v !== null && v !== ''))].sort()
              return <label key={fl.key} className="field"><span className="field-label">{fl.label}</span><Select options={opts} value={f[fl.key]} placeholder="Any" onChange={(e) => setF({ ...f, [fl.key]: e.target.value })} /></label>
            })}</div>}
            <div className="row between"><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setF({}); setSort(initialSort || null); setView(defaultView || views?.[0]?.value || '') }}>Clear</button><button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>Done</button></div>
          </div>}
        </div>}
      </div>
      <div className="dt-wrap">
        <table className={cx('table', dense && 'dense')}>
          <thead><tr>{columns.map((c) => (
            <th key={c.key} style={{ width: c.width, textAlign: c.align }} className={c.sort === false ? '' : 'sortable'} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              onClick={() => c.sort !== false && setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }))}>
              {c.label}{sort?.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
            </th>))}</tr></thead>
          <tbody>
            {out.slice(0, limit).map((x, i) => (
              <tr key={x.id || i} onClick={() => onRowClick?.(x)} className={cx(onRowClick && 'click', rowClass?.(x))}>
                {columns.map((c) => <td key={c.key} style={{ textAlign: c.align }}>{c.render ? c.render(x) : x[c.key] ?? <span className="muted">–</span>}</td>)}
              </tr>))}
          </tbody>
        </table>
        {!out.length && <div className="empty"><p>{empty}</p></div>}
      </div>
      {out.length > limit && <div className="dt-more"><button className="btn btn-ghost" onClick={() => setLimit(limit + pageSize * 2)}>Show more ({out.length - limit} left)</button></div>}
    </div>
  )
}
