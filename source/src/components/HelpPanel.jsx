// 10 Nov: help beside the page. The ? button in the top bar (or the ? key) opens a panel with a search box, the answers
// for the page you are on, and the full answer inside the panel, so nobody has to leave what they are doing.
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { BY_ID, BY_ROUTE } from '../help/articles.js'
import { search } from '../help/search.js'
import { HelpSearch, ResultList, ArticleBody, Icon } from '../help/ui.jsx'

const forPath = (p) => (BY_ROUTE.find(([r]) => (r === '/' ? p === '/' : p.startsWith(r))) || [null, []])[1].map((id) => BY_ID[id]).filter(Boolean)
const typing = (e) => { const t = e.target; return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) }

export default function HelpPanel() {
  const { user } = useStore()
  const loc = useLocation()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState('')
  const [q, setQ] = useState('')
  const [art, setArt] = useState(null)
  useEffect(() => {
    const k = (e) => {
      if (e.key === '?' && !typing(e) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setOpen((o) => !o) }
      else if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open])
  useEffect(() => { if (!open) { setArt(null) } }, [open])
  const here = useMemo(() => forPath(loc.pathname), [loc.pathname])
  const res = useMemo(() => (q ? search(q, { limit: 12 }) : null), [q])
  const onHelp = loc.pathname.startsWith('/help')
  return <>
    <button type="button" className="icon-btn help-btn" onClick={() => setOpen(!open)} aria-label="Help" aria-expanded={open} title="Help (press ?)">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="8" cy="8" r="6.3" /><path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.75c-.5.2-.8.6-.8 1.1v.55" /><circle cx="8" cy="11.6" r=".35" fill="currentColor" /></svg>
    </button>
    {open && createPortal(<>
      <div className="help-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className="help-panel" role="dialog" aria-label="Help">
        <div className="hp-head">
          {art ? <button type="button" className="icon-btn" onClick={() => setArt(null)} aria-label="Back to answers"><Icon k="back" size={16} /></button> : <span className="hp-t">Help</span>}
          <span className="grow" />
          {!onHelp && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setOpen(false); nav(art ? '/help/' + art.id : q ? '/help?q=' + encodeURIComponent(q) : '/help') }}>Open Help centre</button>}
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close help"><Icon k="close" size={16} /></button>
        </div>
        <div className="hp-body">
          {art ? <ArticleBody a={art} inPanel onOpen={setArt} onLeave={() => setOpen(false)} /> : <>
            <HelpSearch value={v} onChange={(x) => { setV(x); if (!x) setQ('') }} onSubmit={(x) => setQ(x.trim())} onPick={setArt} autoFocus placeholder="What do you want to do?" />
            {res ? (res.results.length ? <ResultList results={res.results} terms={res.terms} user={user} onOpen={setArt} compact />
              : <p className="small muted">No answer for “{q}”. Try fewer words, or the name of the page.</p>)
              : here.length > 0 && <><div className="hp-k">On this page</div><ResultList results={here.map((a) => ({ a }))} terms={[]} user={user} onOpen={setArt} compact /></>}
          </>}
        </div>
      </aside>
    </>, document.body)}
  </>
}
