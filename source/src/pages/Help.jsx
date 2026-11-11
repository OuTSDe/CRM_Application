// 2 Nov: a short user guide inside Accord. 10 Nov: replaced by the Help centre: search in plain words, one answer per
// task with where to find it, "Take me there" (opens the page and points at the button), "Show me" (a tour over the
// real screens) and short videos. Everyone can read every answer; what is outside their access is marked.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { ROLES } from '../lib/perms.js'
import { Page } from '../components/ui.jsx'
import { ARTICLES, BY_ID, CATS, CAT_BY_ID, POPULAR } from '../help/articles.js'
import { search } from '../help/search.js'
import { accessOf } from '../help/access.js'
import { VIDEOS, videoPoster } from '../help/videos.js'
import { HelpSearch, ResultList, ArticleBody, Icon } from '../help/ui.jsx'

const CAT_ICON = {
  start: 'M3 13V5l5-3 5 3v8H3zM6.5 13V9h3v4', leads: 'M2 3h12l-4.5 5v4.5l-3 1.5V8z', follow: 'M8 2v6l3.5 2M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0z',
  clients: 'M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 14c.6-2.9 2.6-4.5 5-4.5s4.4 1.6 5 4.5', docs: 'M4 2h5.5L12 4.5V14H4zM9.5 2v2.5H12M6 8h4M6 10.5h4',
  cost: 'M3 2h10v12H3zM5.5 5h5M5.5 8h5M5.5 11h2.5', pay: 'M2 4.5h12v8H2zM2 7h12M4.5 10.5h2', demand: 'M3 2h10v12l-2-1.2-1.5 1.2L8 12.8 6.5 14 5 12.8 3 14zM5.5 5.5h5M5.5 8h5',
  changes: 'M3 5h9.5L10 2.5M13 11H3.5L6 13.5', building: 'M4 14V2h8v12M2 14h12M6.5 4.5h3M6.5 7h3M6.5 9.5h3M7 14v-2h2v2', parking: 'M3 2h10v12H3zM6.5 11V5h2.2a1.8 1.8 0 0 1 0 3.6H6.5',
  presales: 'M2 4h12v7.5H2zM5.5 14h5M8 11.5V14', messages: 'M2 3h12v8.5H6L3 14v-2.5H2z', team: 'M5.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10.5 7a2 2 0 1 0 0-4M1.5 13c.4-2.4 2-3.7 4-3.7s3.6 1.3 4 3.7M11 9.3c1.8.2 3.2 1.5 3.5 3.7',
  design: 'M2 14l3-1L13.5 4.5 11.5 2.5 3 11zM10 4l2 2', vendors: 'M2 6l1.5-3.5h9L14 6M2 6v8h12V6M2 6h12M6 14v-4h4v4', admin: 'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
}
const CatIcon = ({ id }) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true"><path d={CAT_ICON[id]} /></svg>

export default function Help() {
  const { id, cat } = useParams()
  if (id) return <HelpArticle id={id} />
  if (cat) return <HelpCategory cat={cat} />
  return <HelpHome />
}

function HelpHome() {
  const { user } = useStore()
  const nav = useNavigate()
  const [qs, setQs] = useSearchParams()
  const q = qs.get('q') || ''
  const [v, setV] = useState(q)
  useEffect(() => { setV(q) }, [q])
  const res = useMemo(() => (q ? search(q) : null), [q])
  const submit = (x) => { const t = x.trim(); setQs(t ? { q: t } : {}) }
  const open = (a) => nav('/help/' + a.id)
  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c.id, ARTICLES.filter((a) => a.cat === c.id).length])), [])
  // the most asked first, then what this person can do
  const popular = POPULAR.map((x) => BY_ID[x]).filter((a) => a && accessOf(user, a).ok).slice(0, 8)
  return (
    <Page title="Help centre" back="/" backLabel="Dashboard">
      <div className="hh">
        <div className={'hh-hero' + (q ? ' slim' : '')}>
          {!q && <><div className="hh-k">Accord · Yamuna Sky City</div><h2 className="hh-h">What do you want to do?</h2>
            <p className="hh-sub">Type a word or a whole question. Each answer shows where to find it, the steps, and a button that takes you there.</p></>}
          <HelpSearch value={v} onChange={setV} onSubmit={submit} onPick={open} autoFocus={!q} big />
          {!q && popular.length > 0 && <div className="hh-pop"><span className="small muted">Asked most:</span>{popular.map((a) => <Link key={a.id} to={'/help/' + a.id} className="chip">{a.title.replace(/ \(.+\)$/, '')}</Link>)}</div>}
        </div>

        {res && <section className="hh-res">
          {res.corrected && <p className="hh-dym">Showing answers for <button type="button" className="linkish" onClick={() => submit(res.corrected)}><b>{res.corrected}</b></button></p>}
          {res.results.length
            ? <><p className="small muted">{res.results.length} answer{res.results.length === 1 ? '' : 's'} for “{q}”</p><ResultList results={res.results} terms={res.terms} user={user} /></>
            : <div className="hh-none"><h3>No answer for “{q}” yet</h3><p>Try fewer words, or the name of the page (Leads, Payments, Cost sheet…). Or browse the topics below.</p>
              <p className="small">Still stuck? Log it under <Link to="/crm/issues">Issues</Link> with the words you searched, and it will be added here.</p></div>}
        </section>}

        {!q && <>
          <section>
            <h3 className="hh-sec">Browse by topic</h3>
            <div className="hh-cats">{CATS.map((c) => <Link key={c.id} to={'/help/c/' + c.id} className="hh-cat">
              <span className="hh-ci"><CatIcon id={c.id} /></span><span className="hh-ct">{c.title}</span><span className="hh-cb">{c.blurb}</span><span className="hh-cn">{counts[c.id]} answers</span></Link>)}</div>
          </section>
          <section>
            <h3 className="hh-sec">Short videos</h3>
            <p className="small muted" style={{ marginTop: -6 }}>Made with practice data. No real clients are shown.</p>
            <div className="hh-vids">{VIDEOS.map((x) => <Link key={x.name} to={'/help/' + x.article} className="hh-vid">
              <span className="hh-vt" style={{ backgroundImage: `url(${videoPoster(x.name)})` }}><span className="hh-play"><Icon k="play" size={14} /></span></span>
              <span className="hh-vn">{x.title}</span></Link>)}</div>
          </section>
          <p className="small muted hh-foot">You are signed in as {ROLES[user.appRole] || user.appRole}. Answers outside your access are marked with a lock and say who to ask. Press <kbd>?</kbd> on any page to open help beside it.</p>
        </>}
      </div>
    </Page>
  )
}

function HelpCategory({ cat }) {
  const { user } = useStore()
  const nav = useNavigate()
  const c = CAT_BY_ID[cat]
  const [v, setV] = useState('')
  if (!c) return <Page title="Help centre" back="/help" backLabel="Help centre"><p>That topic is not here.</p></Page>
  const list = ARTICLES.filter((a) => a.cat === cat)
  const mine = list.filter((a) => accessOf(user, a).ok), other = list.filter((a) => !accessOf(user, a).ok)
  return (
    <Page title={c.title} back="/help" backLabel="Help centre" subtitle={c.blurb}>
      <div className="hh">
        <HelpSearch value={v} onChange={setV} onSubmit={(x) => nav('/help?q=' + encodeURIComponent(x))} onPick={(a) => nav('/help/' + a.id)} />
        <ResultList results={mine.map((a) => ({ a }))} terms={[]} user={user} />
        {other.length > 0 && <><h3 className="hh-sec">Done by other roles</h3><ResultList results={other.map((a) => ({ a }))} terms={[]} user={user} /></>}
        <div className="hh-catnav">{CATS.filter((x) => x.id !== cat).map((x) => <Link key={x.id} to={'/help/c/' + x.id} className="chip">{x.title}</Link>)}</div>
      </div>
    </Page>
  )
}

function HelpArticle({ id }) {
  const nav = useNavigate()
  const a = BY_ID[id]
  const [v, setV] = useState('')
  useEffect(() => { window.scrollTo?.(0, 0) }, [id])
  if (!a) return <Page title="Help centre" back="/help" backLabel="Help centre"><p>That answer is not here any more. <Link to="/help">Search the Help centre</Link>.</p></Page>
  return (
    <Page title="Help centre" back={true} backLabel="Back">
      <div className="hh hh-art">
        <HelpSearch value={v} onChange={setV} onSubmit={(x) => nav('/help?q=' + encodeURIComponent(x))} onPick={(x) => nav('/help/' + x.id)} />
        <ArticleBody a={a} onOpen={(x) => nav('/help/' + x.id)} />
      </div>
    </Page>
  )
}
