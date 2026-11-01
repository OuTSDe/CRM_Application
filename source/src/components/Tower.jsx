// The "Choose your floor" tower and floor plans from the Accord experience (OuTSDe), ported for Accord Sales and Design.
// Every floor from ground to 60 is a slab; hover reads a floor, click opens its plan; units are the architect's outlines,
// coloured live from the CRM: sold, blocked (to verify or under cancellation) or available.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TOWER } from '../lib/tower.js'
import { BOOKED } from '../lib/calc.js'
import './tower.css'

// Drawings follow the theme (white plate in light mode) unless the person flips them.
export function usePlateTone() {
  const read = () => document.documentElement.dataset.theme === 'light'
  const [light, setLight] = useState(read)
  const [flip, setFlip] = useState(null)
  useEffect(() => { const mo = new MutationObserver(() => setLight(read())); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => mo.disconnect() }, [])
  const on = flip ?? light
  return [on, () => setFlip(!on)]
}
export const TOWER_IMG = 'experience/editions/yamuna-sky-city/'
const src = (p) => TOWER_IMG + p
const RX = 58, RZ = -22, SPREAD = 3
const rad = (x) => (x * Math.PI) / 180

export function floorsOf(t = TOWER) {
  const out = []
  for (let n = t.lowest; n <= t.highest; n++) {
    const plate = t.plates.find((p) => n >= p.from && n <= p.to) || null
    const g = plate ? null : t.ghosts.find((r) => n >= r.from && n <= r.to) || null
    out.push({ n, plate, ghost: g, typical: !!plate && plate.to > plate.from })
  }
  return out
}
export const plateOf = (floor) => TOWER.plates.find((p) => floor >= p.from && floor <= p.to) || null
export const plateRange = (p) => (p.to > p.from ? `${p.from}–${p.to}` : `${p.from}`)
export const ordinal = (n) => { if (n === 0) return 'Ground'; const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
// CRM unit number ↔ drawing: unit 2503 is floor 25, tag F3. Floor 44 is the upper level of the 43rd-floor duplexes.
export const unitNo = (floor, tag) => (floor === 44 ? 43 : floor) * 100 + Number(String(tag).replace(/\D/g, ''))
export const tagOf = (unit) => ({ floor: Math.floor(Number(unit) / 100), tag: 'F' + (Number(unit) % 100) })

// Availability from the full booking list (not money; every role may see what is sold).
export function useAvailability(clients) {
  return useMemo(() => {
    const m = {}
    // a unit can carry an old cancelled or transferred record next to the live one: sold wins over blocked
    clients.forEach((c) => { const s = BOOKED.includes(c.status) ? 'sold' : ['To verify', 'Under cancellation'].includes(c.status) ? 'blocked' : null; const k = String(c.unit); if (s && m[k] !== 'sold') m[k] = s })
    return (floor, tag) => m[String(unitNo(floor, tag))] || 'unsold'
  }, [clients])
}

export function TowerStack({ hovered, selected, marked = new Set(), onHover, onSelect, statusOf, height = 640, light = false, bare = false, maxPlate = 600 }) {
  const tower = TOWER
  const floors = useMemo(() => floorsOf(tower), [tower])
  const wrap = useRef(null), content = useRef(null), lastY = useRef(null), floorEls = useRef([])
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [ys, setYs] = useState([])
  useEffect(() => { const el = wrap.current; if (!el) return; const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height })); ro.observe(el); return () => ro.disconnect() }, [])
  const n = floors.length, aspect = tower.height / tower.width
  const layout = useMemo(() => {
    if (!box.w || !box.h) return null
    let pw = Math.min(box.w * 0.74, maxPlate)
    const proj = (w) => (w * Math.abs(Math.sin(rad(RZ))) + w * aspect * Math.cos(rad(RZ))) * Math.cos(rad(RX))
    let gap = (box.h * 0.9 - proj(pw)) / ((n - 1) * Math.sin(rad(RX)))
    if (gap < 6) { gap = 6; pw = Math.min(pw, (box.h * 0.9 - (n - 1) * gap * Math.sin(rad(RX))) / ((Math.abs(Math.sin(rad(RZ))) + aspect * Math.cos(rad(RZ))) * Math.cos(rad(RX)))) }
    gap = Math.min(gap, 16) * SPREAD
    const step = gap * Math.sin(rad(RX)), pad = box.h * 0.12
    return { pw, ph: pw * aspect, gap, step, height: proj(pw) + (n - 1) * step + pad * 2 }
  }, [box, n, aspect, maxPlate])
  useLayoutEffect(() => {
    if (!layout || !content.current) return
    const top = content.current.getBoundingClientRect().top
    setYs(floorEls.current.map((el) => { if (!el) return 0; const r = el.getBoundingClientRect(); return r.top + r.height / 2 - top }))
  }, [layout])
  const opened = useRef(false)
  useLayoutEffect(() => {
    if (!layout || !wrap.current || opened.current) return
    // open at the selected floor if there is one, else at the ground floor
    wrap.current.scrollTop = wrap.current.scrollHeight; opened.current = true
  }, [layout])
  useEffect(() => {
    if (selected == null || !ys.length || !wrap.current) return
    const i = floors.findIndex((f) => f.n === selected); if (i < 0) return
    const y = ys[i], w = wrap.current
    if (y < w.scrollTop + 40 || y > w.scrollTop + w.clientHeight - 40) w.scrollTo({ top: y - w.clientHeight / 2, behavior: 'smooth' })
  }, [selected, ys]) // eslint-disable-line
  const floorAt = (clientY) => {
    if (!content.current || !ys.length) return null
    const y = clientY - content.current.getBoundingClientRect().top
    let best = -1, dd = Infinity
    ys.forEach((fy, i) => { const k = Math.abs(fy - y); if (k < dd) { dd = k; best = i } })
    return best >= 0 && dd < (layout ? layout.step + 30 : 30) ? floors[best].n : null
  }
  const hoveredPlate = hovered != null ? floors.find((f) => f.n === hovered)?.plate ?? null : null
  const showEvery = layout && layout.step < 9 ? 2 : 1
  return (
    <div className={'tw-stage' + (light ? ' plate-light' : '') + (bare ? ' bare' : '')} style={{ height }}>
      <div className="tower-wrap" ref={wrap}
        onPointerMove={(e) => { lastY.current = e.clientY; onHover?.(floorAt(e.clientY)) }}
        onPointerLeave={() => { lastY.current = null; onHover?.(null) }}
        onScroll={() => { if (lastY.current != null) onHover?.(floorAt(lastY.current)) }}
        onClick={(e) => { const f = floorAt(e.clientY); if (f != null) onSelect?.(f) }}
        role="group" aria-label="Floors of the tower. Scroll to move through it; click a floor to open its plan.">
        <div className="tower-content" ref={content} style={{ height: layout ? layout.height : '100%' }}>
          {layout && <div className="tower-scene" style={{ width: layout.pw, height: layout.ph, transform: `translate(-50%, -50%) translateY(${((n - 1) * layout.step) / 2}px) rotateX(${RX}deg) rotateZ(${RZ}deg)` }}>
            {floors.map((f, i) => {
              const isHover = hovered === f.n, isSel = selected === f.n
              const sibling = !isHover && hoveredPlate && f.plate === hoveredPlate
              const state = isSel ? 'sel' : isHover ? 'hover' : sibling ? 'sibling' : marked.has(f.n) ? 'marked' : 'idle'
              return (
                <div key={f.n} ref={(el) => { floorEls.current[i] = el }} className={`floor floor-${state}${hovered != null ? ' dimmed' : ''}${f.plate ? '' : ' ghost'}`} style={{ transform: `translateZ(${i * layout.gap}px)` }}>
                  {f.plate ? <>
                    {statusOf && <svg className="floor-status" viewBox={`0 0 ${tower.width} ${tower.height}`} aria-hidden="true">
                      {f.plate.units.map((u) => { const st = statusOf(f.n, u.id); return st === 'sold' || st === 'blocked' ? <polygon key={u.id} className={'st-' + st} points={u.points} /> : null })}
                    </svg>}
                    <img className="line" src={src(f.plate.stack)} alt="" draggable={false} />
                    <img className="mark" src={src(f.plate.stackMark)} alt="" draggable={false} />
                    <img className="on" src={src(f.plate.stackOn)} alt="" draggable={false} />
                  </> : f.ghost ? <img className="line" src={src(f.ghost.stack)} alt="" draggable={false} /> : null}
                </div>
              )
            })}
          </div>}
          <div className="tower-tags" aria-hidden="true">
            {ys.length === n && floors.map((f, i) => {
              const on = hovered === f.n || selected === f.n
              if (!on && f.n % showEvery !== 0 && f.n !== tower.highest) return null
              return <span key={f.n} className={`ftag${on ? ' on' : ''}${marked.has(f.n) ? ' marked' : ''}${f.plate ? '' : ' none'}`} style={{ top: ys[i] }}>{f.n === 0 ? 'G' : f.n}</span>
            })}
            {ys.length === n && tower.plates.filter((p) => p.to > p.from).map((p) => {
              const iFrom = floors.findIndex((f) => f.n === p.from), iTo = floors.findIndex((f) => f.n === p.to)
              const y1 = ys[iTo], h = Math.max(2, ys[iFrom] - y1)
              return <div key={p.id} className={`band${hoveredPlate === p ? ' on' : ''}`} style={{ top: y1, height: h }} title={`Typical floors ${plateRange(p)}`}>{h >= 34 && <span>{plateRange(p)}</span>}</div>
            })}
          </div>
        </div>
      </div>
      <div className="tw-cap"><div className="tw-legend"><i className="sold" />Sold<i className="blocked" />Blocked<i className="open" />Available</div>
        <div className="small muted">Scroll to rise through the tower. Hover to read a floor, click to open its plan.</div></div>
    </div>
  )
}

export function FloorPlan({ floor, hoveredUnit, selectedUnit, onHoverUnit, onChooseUnit, statusOf, highlight }) {
  const plate = plateOf(floor)
  if (!plate) return <div className="fp-empty">No drawing for the {ordinal(floor)} floor.</div>
  const W = TOWER.width, H = TOWER.height
  return (
    <svg className="floorplan" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${plate.title}, residences`} onPointerLeave={() => onHoverUnit?.(null)}>
      <defs><filter id="unit-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
      <image href={src(plate.plan)} x="0" y="0" width={W} height={H} />
      {plate.units.map((u) => {
        const state = selectedUnit === u.id || highlight === u.id ? 'sel' : hoveredUnit === u.id ? 'hover' : 'idle'
        const st = statusOf?.(floor, u.id) ?? null
        return (
          <g key={u.id} className={`unit unit-${state}${st ? ' st-' + st : ''}`} onPointerEnter={() => onHoverUnit?.(u.id)} onClick={() => onChooseUnit?.(u.id)}
            tabIndex={onChooseUnit ? 0 : -1} role={onChooseUnit ? 'button' : undefined} aria-label={`${unitNo(floor, u.id)}, ${u.typology}${st && st !== 'unsold' ? ', ' + st : ''}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChooseUnit?.(u.id) } }} onFocus={() => onHoverUnit?.(u.id)}>
            <polygon className="unit-glow" points={u.points} filter="url(#unit-glow)" />
            <polygon className="unit-area" points={u.points} />
            <g className="unit-tag" transform={`translate(${u.tag[0]} ${u.tag[1]})`}><circle r="22" /><text textAnchor="middle" dy="7">{u.id}</text></g>
          </g>
        )
      })}
    </svg>
  )
}

// Link into the Accord experience for a person: a booked client opens straight at their own residence with the
// BOQ and costs; a lead opens the pre-sales version (the design, without prices).
export function experienceUrl({ name, unit, rid, by, client }) {
  const q = new URLSearchParams()
  if (name) q.set('name', name)
  if (unit) {
    q.set('ref', 'YSC-' + unit)
    const t = tagOf(unit), p = plateOf(t.floor), u = p?.units.find((x) => x.id === t.tag)
    if (u) { q.set('res', u.residenceId); q.set('floor', String(t.floor)); q.set('tag', t.tag) }
  }
  q.set('mode', client ? 'client' : 'lead')
  if (rid) q.set('rid', rid)
  if (by) q.set('by', by)
  return 'experience/index.html?' + q.toString()
}
