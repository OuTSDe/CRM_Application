// 8 Nov: the tower drawn from the exterior white model (lib/whiteModel.js), in place of the hand-drawn elevations.
// One outline per floor at its real width and level; the residences on a floor are shown as equal parts of it,
// coloured from the Client Master. South is the podium side; north is the same drawing mirrored.
import React, { useMemo } from 'react'
import { WM } from '../lib/whiteModel.js'
import { ordinal } from './Tower.jsx'

export const WM_FLOORS = WM.floors
// bands from the model, top to bottom, each with its floor range
export const WM_BANDS = (() => {
  const out = []
  ;[...WM.floors].sort((a, b) => b.floor - a.floor).forEach((f) => {
    const last = out[out.length - 1]
    if (last && last.name === f.band) last.from = f.floor
    else out.push({ name: f.band, from: f.floor, to: f.floor, saleable: f.saleable })
  })
  return out
})()
export const bandName = (b) => ({ 'Lower Floors (not in inventory)': 'Lower floors', 'Upper Levels': 'Upper levels', 'Podium and Typical': 'Podium and typical' }[b] || b)
export const floorLabel = (n) => (n === 0 ? 'G' : String(n))
const range = (b) => (b.to > b.from ? `${floorLabel(b.from)}–${b.to}` : floorLabel(b.from))

// x of a rectangle on the chosen side (north mirrors the south drawing)
export const sideX = (x, w, side) => (side === 'N' ? WM.viewW - x - w : x)

/**
 * statusOf(unitNo) → 'sold' | 'transfer' | 'cancel' | 'verify' | '' (available). Leave it out for a plain drawing.
 * unitsOf(floor) → CRM unit numbers on that floor, in the order to draw (defaults to the model's list).
 * mark: floors to highlight (a residence's floor, both levels of a duplex). builtTo: last floor with its slab done.
 */
export function WMElevation({ side = 'S', statusOf, unitsOf, selected, hovered, onSelect, onHover, mark = [], markLabel, builtTo, bands = true, numbers = true, foot, className = '', title = 'Tower elevation from the white model' }) {
  const L = 40, R = bands ? 175 : 8, T = 10
  const W = WM.viewW + L + R, H = WM.viewH + T
  const markSet = useMemo(() => new Set(mark.map(Number)), [mark])
  const markBand = mark.length ? WM.floors.find((f) => f.floor === Number(mark[0]))?.band : null
  const pod = WM.podium, club = WM.clubhouse
  const marked = WM.floors.filter((f) => markSet.has(f.floor))
  return (
    <svg className={'wm ' + className} viewBox={`${-L} ${-T} ${W} ${H}`} role={onSelect ? 'group' : 'img'} aria-label={title} onPointerLeave={() => onHover?.(null)}>
      <rect className="wm-pod" x={sideX(pod[0], pod[2], side)} y={pod[1]} width={pod[2]} height={pod[3]} />
      <rect className="wm-pod" x={sideX(club[0], club[2], side)} y={club[1]} width={club[2]} height={club[3]} />
      <text className="wm-cap" x={sideX(pod[0], pod[2], side) + pod[2] / 2} y={pod[1] + pod[3] - 5}>Podium · car parking G to P3</text>
      <text className="wm-cap" x={sideX(club[0], club[2], side) + club[2] / 2} y={club[1] + 11}>Clubhouse</text>
      {WM.floors.map((f) => {
        const x = sideX(f.x, f.w, side)
        const units = f.saleable ? (unitsOf ? unitsOf(f.floor) : f.units) : []
        const order = side === 'N' ? [...units].reverse() : units
        const uw = order.length ? f.w / order.length : 0
        const on = selected === f.floor, hov = hovered === f.floor, mk = markSet.has(f.floor)
        const inBand = markBand && f.band === markBand
        const up = builtTo != null && f.floor > builtTo
        return (
          <g key={f.id} className={'wm-f' + (f.saleable ? '' : ' ns') + (on ? ' on' : '') + (hov ? ' hov' : '') + (mk ? ' mk' : '') + (inBand && !mk ? ' inb' : '') + (up ? ' up' : '')}
            onClick={onSelect ? () => onSelect(f.floor) : undefined} onPointerEnter={onHover ? () => onHover(f.floor) : undefined}>
            <title>{`${f.floor === 0 ? 'Ground' : ordinal(f.floor)} floor · ${bandName(f.band)} · FFL +${f.ffl.toFixed(3)} m${units.length ? ' · ' + units.length + ' residence' + (units.length > 1 ? 's' : '') : ''}${f.floor === 44 ? ' (upper level of the 43rd-floor duplexes)' : ''}`}</title>
            <rect className="wm-slab" x={x} y={f.y - 1.2} width={f.w} height={1.2} />
            <rect className="wm-fl" x={x} y={f.y} width={f.w} height={f.h} />
            {statusOf && order.map((u, i) => { const st = statusOf(u); return st ? <rect key={u} className={'wm-u ' + st} x={x + i * uw + 0.8} y={f.y + 1.6} width={Math.max(0.5, uw - 1.6)} height={f.h - 3.2} /> : null })}
            {statusOf && order.length > 1 && order.slice(1).map((u, i) => <line key={'d' + u} className="wm-div" x1={x + (i + 1) * uw} x2={x + (i + 1) * uw} y1={f.y + 1} y2={f.y + f.h - 1} />)}
            {numbers && (f.floor % 5 === 0 || on || mk || f.floor === 58) && <text className={'wm-no' + (on || mk ? ' on' : '')} x={Math.min(x, sideX(pod[0], pod[2], side)) - 5} y={f.y + f.h - 2.5}>{floorLabel(f.floor)}</text>}
          </g>
        )
      })}
      <line className="wm-ground" x1={-L} x2={WM.viewW + 4} y1={WM.ground} y2={WM.ground} />
      {bands && (() => {
        // labels at the middle of each band, pushed apart where single-floor bands sit next to each other
        const GAP = 25, items = WM_BANDS.map((b) => { const top = WM.floors.find((f) => f.floor === b.to), bot = WM.floors.find((f) => f.floor === b.from); return { b, ya: top.y, yb: bot.y + bot.h, y: (top.y + bot.y + bot.h) / 2 } })
        for (let i = 1; i < items.length; i++) if (items[i].y < items[i - 1].y + GAP) items[i].y = items[i - 1].y + GAP
        for (let i = items.length - 2; i >= 0; i--) if (items[i].y > items[i + 1].y - GAP) items[i].y = items[i + 1].y - GAP
        const x0 = WM.viewW + 8
        return items.map(({ b, ya, yb, y }) => {
          const on = markBand === b.name || (selected != null && WM.floors.find((f) => f.floor === selected)?.band === b.name)
          const mid = (ya + yb) / 2, tx = x0 + 22
          return <g key={b.name} className={'wm-band' + (on ? ' on' : '') + (b.saleable ? '' : ' ns')}>
            <path d={`M${x0} ${ya + 0.5} h5 V${yb - 0.5} h-5`} />
            <path className="wm-lead" d={`M${x0 + 5} ${mid} L${tx - 4} ${y - 4}`} />
            <text x={tx} y={y - 1}>{bandName(b.name)}</text>
            <text className="wm-rng" x={tx} y={y + 10}>{range(b)}</text>
          </g>
        })
      })()}
      {marked.length > 0 && (() => {
        const f0 = marked[marked.length - 1], f1 = marked[0], ya = Math.min(f0.y, f1.y), yb = Math.max(f0.y + f0.h, f1.y + f1.h)
        const xl = Math.min(...marked.map((f) => sideX(f.x, f.w, side))) - 3
        return <g className="wm-mark"><path d={`M${xl} ${(ya + yb) / 2} h-10`} /><text x={xl - 13} y={(ya + yb) / 2 + 4.5}>{markLabel || ordinal(f1.floor)}</text></g>
      })()}
      {foot && <text className="wm-foot" x={WM.viewW / 2} y={WM.viewH - 1}>{foot}</text>}
    </svg>
  )
}
