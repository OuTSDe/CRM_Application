// 10 Nov: "Take me there" and "Show me" from the Help centre.
// Take me there: opens the page and points at the button, tab or heading the article names (by its text on screen).
// Show me: a short tour over the real screens, one step at a time, with Back and Next.
// Targets are found by their visible text, so the guide keeps working when layouts change; if a label is renamed,
// update help/articles.js. Nothing here changes data: it only scrolls and draws a ring.
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

let current = null
const subs = new Set()
const emit = () => subs.forEach((f) => f(current))
const pathOf = (to) => String(to || '').split('?')[0] || '/'

export function helpGo(nav, to, hl, label) {
  current = { mode: 'spot', steps: [{ to, hl, say: '' }], i: 0, id: Date.now() }
  emit(); if (to) nav(to)
}
export function startTour(nav, a) {
  if (!a?.tour?.length) return
  current = { mode: 'tour', title: a.title, steps: a.tour, i: 0, id: Date.now() }
  emit(); if (a.tour[0].to) nav(a.tour[0].to)
}
const stop = () => { current = null; emit() }

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
const SEL = 'button, a, [role=tab], [role=button], .tab, .seg button, h1, h2, h3, h4, summary, .field-label, .stat-label, label, th, .punch, .nav-label'
// hl may name alternatives, "Raise demand letters|Demand calls": the first one on screen wins
export function findTarget(hl) {
  for (const h of String(hl || '').split('|')) { const t = findOne(h); if (t) return t }
  return null
}
const label = (hl) => String(hl || '').split('|')[0]
function findOne(hl) {
  const want = norm(hl)
  if (!want) return null
  let best = null, bestScore = 0
  document.querySelectorAll(SEL).forEach((el) => {
    if (el.closest('.hg, .help-panel')) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden' || st.display === 'none') return
    const t = norm(el.innerText || el.textContent)
    const alt = norm(el.getAttribute('aria-label') || el.getAttribute('title'))
    let s = 0
    if (t === want || alt === want) s = 100
    else if (t.startsWith(want)) s = 60 - Math.min(30, t.length - want.length)
    else if (alt.startsWith(want)) s = 50
    else if (t.includes(want) && t.length < want.length + 40) s = 30 - (t.length - want.length) / 4
    if (!s) return
    if (el.closest('.content')) s += 5                    // the page itself before the top bar
    if (/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute('role') === 'tab') s += 3
    if (s > bestScore) { bestScore = s; best = el }
  })
  return best
}

export default function HelpGuide() {
  const [g, setG] = useState(current)
  const [rect, setRect] = useState(null)
  const [missing, setMissing] = useState(false)
  const el = useRef(null)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => { const f = (x) => setG(x ? { ...x } : null); subs.add(f); return () => subs.delete(f) }, [])
  const step = g?.steps[g.i]

  // find the target once the page for this step is open (pages load their data a moment later, so keep looking)
  useEffect(() => {
    setRect(null); setMissing(false); el.current = null
    if (!step) return
    if (step.to && pathOf(step.to) !== loc.pathname) return
    if (!step.hl) return
    let n = 0, done = false
    const look = () => {
      if (done) return
      const t = findTarget(step.hl)
      if (t) { el.current = t; t.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); setTimeout(() => !done && setRect(t.getBoundingClientRect()), 380); return }
      if (++n > 25) { setMissing(true); return }
      setTimeout(look, 200)
    }
    const t0 = setTimeout(look, 250)
    return () => { done = true; clearTimeout(t0) }
  }, [g?.id, g?.i, loc.pathname, loc.search]) // eslint-disable-line

  // follow the target while the page scrolls or resizes
  useEffect(() => {
    if (!rect) return
    let raf = 0
    const upd = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => el.current && document.contains(el.current) && setRect(el.current.getBoundingClientRect())) }
    window.addEventListener('scroll', upd, true); window.addEventListener('resize', upd)
    return () => { window.removeEventListener('scroll', upd, true); window.removeEventListener('resize', upd); cancelAnimationFrame(raf) }
  }, [!!rect]) // eslint-disable-line

  // a single "Take me there" fades out by itself
  useEffect(() => { if (g?.mode !== 'spot' || !rect) return; const t = setTimeout(stop, 7000); return () => clearTimeout(t) }, [g?.id, !!rect]) // eslint-disable-line
  useEffect(() => { if (!g) return; const k = (e) => { if (e.key === 'Escape') stop(); if (g.mode === 'tour' && e.key === 'ArrowRight') go(1); if (g.mode === 'tour' && e.key === 'ArrowLeft') go(-1) }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) })

  const go = useCallback((d) => {
    if (!current) return
    const i = current.i + d
    if (i < 0) return
    if (i >= current.steps.length) return stop()
    current = { ...current, i }; emit()
    const to = current.steps[i].to
    if (to && pathOf(to) !== window.location.hash.slice(1).split('?')[0]) nav(to)
  }, [nav])

  if (!g || !step) return null
  const tour = g.mode === 'tour'
  const pad = 6
  const ring = rect && { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
  // the bubble sits below the target, or above it near the bottom of the screen
  const vw = window.innerWidth, vh = window.innerHeight
  const below = !ring || ring.top + ring.height + 190 < vh
  const bw = Math.min(340, vw - 24)
  const bubble = ring
    ? { top: below ? ring.top + ring.height + 12 : undefined, bottom: below ? undefined : vh - ring.top + 12, left: Math.max(12, Math.min(vw - bw - 12, ring.left + ring.width / 2 - bw / 2)), width: bw }
    : { bottom: 24, left: Math.max(12, vw / 2 - bw / 2), width: bw }
  if (!tour && !ring && !missing) return null
  return (
    <div className="hg" aria-live="polite">
      {/* the ring lets clicks through, so the person can press the real button */}
      {ring && <div className={'hg-ring' + (tour ? ' dim' : ' pulse')} style={ring} />}
      <div className="hg-bubble" style={bubble} role="dialog" aria-label={tour ? 'Show me: ' + g.title : 'Here'}>
        {tour && <div className="hg-k">Show me · {g.i + 1} of {g.steps.length}</div>}
        {missing
          ? <p><b>{label(step.hl)}</b> is not on this screen. It may not be part of your access, or it appears after another step (for example, once a client is picked).</p>
          : <p>{step.say || <><b>{label(step.hl)}</b> is here.</>}</p>}
        <div className="hg-act">
          {tour && <button type="button" className="btn btn-sm" onClick={() => go(-1)} disabled={g.i === 0}>Back</button>}
          {tour ? <button type="button" className="btn btn-sm btn-primary" onClick={() => go(1)}>{g.i + 1 === g.steps.length ? 'Done' : 'Next'}</button>
            : <button type="button" className="btn btn-sm" onClick={stop}>Got it</button>}
          {tour && <button type="button" className="linkish small" onClick={stop}>Close</button>}
        </div>
      </div>
    </div>
  )
}
