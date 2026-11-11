// Pieces shared by the Help centre page and the ? panel.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { search, highlight } from './search.js'
import { BY_ID, CAT_BY_ID } from './articles.js'
import { accessOf } from './access.js'
import { VIDEO_BY_NAME, videoSrc, videoPoster } from './videos.js'
import { helpGo, startTour } from '../components/HelpGuide.jsx'
import { cx } from '../components/ui.jsx'

export const Marked = ({ text, terms }) => highlight(text, terms).map((p, i) => (p.m ? <mark key={i}>{p.t}</mark> : <React.Fragment key={i}>{p.t}</React.Fragment>))
// **bold** and *italic* in article text
export function Rich({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((p, i) => p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('*') && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>)
}
const plain = (s) => String(s || '').replace(/\*\*?/g, '')

export const Icon = ({ k, size = 18 }) => {
  const P = {
    search: <><circle cx="7" cy="7" r="4.6" /><path d="M10.5 10.5 14 14" /></>,
    play: <path d="M5 3.5v9l7-4.5z" />,
    show: <><path d="M2 8s2.3-4.5 6-4.5S14 8 14 8s-2.3 4.5-6 4.5S2 8 2 8z" /><circle cx="8" cy="8" r="1.8" /></>,
    go: <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />,
    lock: <><rect x="3.5" y="7" width="9" height="6.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></>,
    close: <path d="M4 4l8 8M12 4l-8 8" />,
    back: <path d="M10 3 5 8l5 5" />,
  }
  return <svg width={size} height={size} viewBox="0 0 16 16" fill={k === 'play' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{P[k]}</svg>
}

// The search box. Suggestions appear as you type; Enter opens the full results (or the highlighted suggestion).
export function HelpSearch({ value, onChange, onSubmit, onPick, autoFocus, big, placeholder = 'Search help, e.g. "print a receipt"' }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const box = useRef(null)
  const sug = useMemo(() => (value.trim().length >= 2 ? search(value, { limit: 6, typing: true }) : { results: [], terms: [] }), [value])
  useEffect(() => { setHi(-1) }, [value])
  useEffect(() => { const f = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f) }, [])
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(sug.results.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(-1, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); setOpen(false); if (hi >= 0 && sug.results[hi]) onPick(sug.results[hi].a); else onSubmit(value) }
    else if (e.key === 'Escape') setOpen(false)
  }
  return (
    <div className={cx('hs', big && 'hs-big')} ref={box}>
      <div className="hs-field">
        <Icon k="search" />
        <input type="search" className="hs-input" value={value} autoFocus={autoFocus} placeholder={placeholder} aria-label="Search help"
          role="combobox" aria-expanded={open && sug.results.length > 0} aria-autocomplete="list" aria-controls="hs-list"
          onChange={(e) => { onChange(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={key} />
        {value && <button type="button" className="hs-clear" onClick={() => { onChange(''); setOpen(false) }} aria-label="Clear"><Icon k="close" size={14} /></button>}
      </div>
      {open && sug.results.length > 0 && <ul className="hs-list" id="hs-list" role="listbox">
        {sug.results.map((r, i) => <li key={r.a.id} role="option" aria-selected={i === hi} className={cx(i === hi && 'on')}
          onMouseDown={(e) => { e.preventDefault(); setOpen(false); onPick(r.a) }} onMouseEnter={() => setHi(i)}>
          <Icon k="search" size={14} /><span className="hs-t"><Marked text={r.a.title} terms={sug.terms} /></span><span className="hs-c">{CAT_BY_ID[r.a.cat]?.title}</span></li>)}
        <li className="hs-all" onMouseDown={(e) => { e.preventDefault(); setOpen(false); onSubmit(value) }}>See all answers for “{value.trim()}”</li>
      </ul>}
    </div>
  )
}

// Small markers next to a result: video, Show me, not in your access
export function Marks({ a, user }) {
  const acc = accessOf(user, a)
  return <span className="hm">
    {a.video && <span className="hm-i" title="Has a video"><Icon k="play" size={11} />Video</span>}
    {a.tour && <span className="hm-i" title="Can walk you through it on the real screen"><Icon k="show" size={12} />Show me</span>}
    {!acc.ok && <span className="hm-i hm-lock" title={acc.who}><Icon k="lock" size={11} />{acc.who}</span>}
  </span>
}

export function ResultList({ results, terms, onOpen, user, compact }) {
  return <ol className={cx('hr', compact && 'hr-compact')}>
    {results.map(({ a }) => <li key={a.id}>
      <a href={'#/help/' + a.id} onClick={(e) => { if (onOpen) { e.preventDefault(); onOpen(a) } }}>
        <span className="hr-crumb">{CAT_BY_ID[a.cat]?.title}{a.where && !compact ? ' › ' + plain(a.where).split('   ')[0] : ''}</span>
        <span className="hr-title"><Marked text={a.title} terms={terms} /></span>
      </a>
      {!compact && <p className="hr-sum"><Marked text={a.summary} terms={terms} /></p>}
      <Marks a={a} user={user} />
    </li>)}
  </ol>
}

export function HelpVideo({ name }) {
  const v = VIDEO_BY_NAME[name]
  const [err, setErr] = useState(false)
  // a copy of Accord without the video files says so, instead of showing an empty player
  useEffect(() => { let on = true; setErr(false); if (location.protocol.startsWith('http')) fetch(videoSrc(name), { method: 'HEAD' }).then((r) => on && !r.ok && setErr(true)).catch(() => {}); return () => { on = false } }, [name])
  if (!v) return null
  if (err) return <div className="hv hv-missing"><Icon k="play" /> The video “{v.title}” is not on this copy of Accord yet.</div>
  return <figure className="hv">
    <video controls preload="none" playsInline poster={videoPoster(name)} onError={() => setErr(true)}><source src={videoSrc(name)} type="video/mp4" onError={() => setErr(true)} /></video>
    <figcaption>{v.title} · made with practice data; no real clients are shown.</figcaption>
  </figure>
}

// One article. inPanel: shown inside the ? panel (buttons close the panel first)
export function ArticleBody({ a, onOpen, inPanel, onLeave }) {
  const { user } = useStore()
  const nav = useNavigate()
  const acc = accessOf(user, a)
  const [vote, setVote] = useState(() => { try { return localStorage.getItem('accord.help.vote.' + a.id) || '' } catch (e) { return '' } })
  useEffect(() => { try { setVote(localStorage.getItem('accord.help.vote.' + a.id) || '') } catch (e) { setVote('') } }, [a.id])
  const cast = (v) => { setVote(v); try { localStorage.setItem('accord.help.vote.' + a.id, v) } catch (e) { /* */ } }
  const there = (g) => { onLeave?.(); helpGo(nav, g.to, g.hl, g.label) }
  const show = () => { onLeave?.(); startTour(nav, a) }
  const cat = CAT_BY_ID[a.cat]
  return (
    <article className="ha">
      <div className="ha-crumb">{inPanel ? cat?.title : <><Link to="/help">Help</Link> › <Link to={'/help/c/' + a.cat}>{cat?.title}</Link></>}</div>
      <h2 className="ha-title">{a.title}</h2>
      {!acc.ok
        ? <div className="note warn ha-acc"><Icon k="lock" size={14} /> <span><b>Not part of your access.</b> Done by {acc.who.replace(' and admins', ' and admins')}. {acc.ask}</span></div>
        : a.access_note ? <div className="note info ha-acc small">{plain(a.access_note)}</div> : null}
      <p className="ha-sum"><Rich text={a.summary} /></p>
      {a.where && <div className="ha-where"><span className="ha-k">Where to find it</span><span className="ha-path">{a.where.split('   ').map((w, i) => <span key={i} className="ha-alt">{w.split(' › ').map((s, j) => <React.Fragment key={j}>{j > 0 && <span className="ha-sep">›</span>}<span className="ha-seg">{s}</span></React.Fragment>)}</span>)}</span></div>}
      {(a.go?.length || a.tour?.length) ? <div className="ha-actions">
        {(a.go || []).map((g, i) => <button type="button" key={i} className={cx('btn', i === 0 && 'btn-primary')} onClick={() => there(g)} disabled={!acc.ok && !!a.access?.length} title={acc.ok ? 'Opens the page and points at it' : 'Not part of your access'}><Icon k="go" size={14} />{i === 0 ? 'Take me there' : g.label}</button>)}
        {a.tour?.length > 0 && <button type="button" className="btn" onClick={show} disabled={!acc.ok && !!a.access?.length}><Icon k="show" size={14} />Show me ({a.tour.length} steps)</button>}
      </div> : null}
      <h3 className="ha-h">Steps</h3>
      <ol className="ha-steps">{a.steps.map((s, i) => <li key={i}><Rich text={s} /></li>)}</ol>
      {a.video && <HelpVideo name={a.video} />}
      {a.tips?.length > 0 && <><h3 className="ha-h">Good to know</h3><ul className="ha-tips">{a.tips.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul></>}
      {a.q?.length > 0 && <div className="ha-also"><span className="ha-k">Also answers</span>{a.q.map((q) => <span key={q} className="ha-q">{q}</span>)}</div>}
      {a.related?.length > 0 && <><h3 className="ha-h">Related</h3><ul className="ha-rel">{a.related.map((id) => BY_ID[id]).filter(Boolean).map((r) => <li key={r.id}>
        <a href={'#/help/' + r.id} onClick={(e) => { if (onOpen) { e.preventDefault(); onOpen(r) } }}>{r.title}</a><Marks a={r} user={user} /></li>)}</ul></>}
      <div className="ha-vote">{vote ? <span className="small muted">{vote === 'yes' ? 'Thanks. Glad it helped.' : <>Thanks. Tell us what was missing under <Link to="/crm/issues" onClick={() => onLeave?.()}>Issues</Link>, so it can be added.</>}</span>
        : <><span className="small">Did this answer your question?</span><button type="button" className="btn btn-sm" onClick={() => cast('yes')}>Yes</button><button type="button" className="btn btn-sm" onClick={() => cast('no')}>No</button></>}</div>
    </article>
  )
}
