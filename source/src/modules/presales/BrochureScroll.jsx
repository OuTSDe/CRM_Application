import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import RecordPicker from '../../components/RecordPicker.jsx'
import { OPS } from '../../lib/seed.js'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canWrite } from '../../lib/perms.js'
import { PunchGate } from '../../components/Layout.jsx'
import { d, num, salute, fullName, TITLES, today, nowTime } from '../../lib/format.js'
import './brochure.css'

const IMG = 'experience/editions/yamuna-sky-city/'
const TYPES = [
  { key: '2 BHK', name: 'Two bedrooms', plan: IMG + 'plans/typical.jpg', room: IMG + 'preset/living.jpg' },
  { key: '3 BHK', name: 'Three bedrooms', plan: IMG + 'plans/typical.jpg', room: IMG + 'preset/dining.jpg' },
  { key: '4 BHK', name: 'Sky and Grand residences', plan: IMG + 'plans/sky.jpg', room: IMG + 'preset/master-bedroom-view.jpg', alt: IMG + 'plans/grand.jpg' },
  { key: '5 BHK', name: 'The full floor', plan: IMG + 'plans/fullfloor.jpg', room: IMG + 'preset/theatre.jpg' },
]
const GALLERY = [['entrance', 'Arrival'], ['living', 'Living'], ['dining', 'Dining'], ['kitchen', 'Kitchen'], ['master-bedroom', 'Master bedroom'], ['master-bath', 'Master bath'], ['theatre', 'Theatre'], ['cigar', 'Lounge'], ['powder', 'Powder room']]

export const VISITS = { general: 'General', first: 'First visit', return: 'Return visit' }
const SECTION_LABEL = { film: 'Film', address: 'The address', coast: 'The cultural coast', engineering: 'Engineering', design: 'Design', yours: 'Your residence', residences: 'Residences', interiors: 'Interiors', structure: 'Structure', living: 'House team', availability: 'Availability', close: 'Close' }
export const SECTIONS = Object.keys(SECTION_LABEL)
// return visits are curated: the person's interests (Client 360 / lead "Interests") bring the matching sections in
const BY_INTEREST = { Engineering: ['engineering', 'structure'], Design: ['design', 'interiors'], 'Sea and views': ['address'], Mangaluru: ['coast'], Luxury: ['living', 'interiors'], Wellness: ['living'], Family: ['living'], Investment: ['availability'] }

// 1 Nov: before the e-brochure opens, who is visiting and which visit. The link carries it, so it can be bookmarked or sent from a lead.
function Launcher({ onGo, sop, init = {} }) {
  const [rid, setRid] = useState(init.for || '')
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [visit, setVisit] = useState(init.visit || 'first')
  return (
    <div className="eb eb-launch">
      <div className="eb-launch-card">
        <div className="eb-k">Yamuna Sky City · e-Brochure</div>
        <h1>Who is visiting?</h1>
        <label className="field"><span className="field-label">Lead or client</span><RecordPicker value={rid} onChange={setRid} /></label>
        <div className="eb-or">or, for a walk-in</div>
        <div className="row gap-s"><select className="input" style={{ width: 120 }} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title"><option value="">Title</option>{TITLES.map((t) => <option key={t}>{t}</option>)}</select>
          <input className="input" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name as it should appear" aria-label="Name" /></div>
        <div className="field"><span className="field-label">Visit</span>
          <div className="eb-visits">{[['first', 'First visit', 'The whole story: film, coast, engineering, design, residences.'], ['return', 'Return visit', 'Curated: their residence, their interests, what is still open.'], ['general', 'General', 'Everything, not personalised.']].map(([v, l, h]) =>
            <button key={v} type="button" className={visit === v ? 'on' : ''} onClick={() => setVisit(v)}><b>{l}</b><span>{h}</span></button>)}</div></div>
        <div className="row gap-s"><button className="eb-btn eb-go" onClick={() => onGo({ for: rid, title, name: rid ? '' : name, visit })}>Open the e-brochure</button>
          <button className="eb-btn" onClick={() => onGo({ visit: 'general' })}>Skip, open the general one</button></div>
        {sop && <details className="eb-sop"><summary>How to present (SOP)</summary><p>{sop}</p></details>}
      </div>
    </div>
  )
}

// The e-brochure as one scrolling page (30 Oct). 1 Nov: opened for a person and a visit, with the sections that visit calls for.
export default function BrochureScroll() {
  const { db, raw, user, punchedIn, upsert, nextId, notify } = useStore()
  const crm = useCrm()
  const [qs, setQs] = useSearchParams()
  const root = useRef(null)
  const b = db.brochure[0] || {}
  const DEF = OPS.BROCHURE
  const slide = (id) => (b.slides || []).find((s) => s.id === id) || DEF.slides.find((s) => s.id === id) || {}
  const co = db.settings[0]?.company || {}
  const visit = qs.get('visit')
  const rid = qs.get('for')
  const rec = rid && (crm.clients.find((c) => c.clientId === rid) || db.leads.find((l) => l.id === rid))
  const guest = rec || (qs.get('name') ? { name: qs.get('name'), title: qs.get('title') || '' } : null)
  const isClient = !!(rec && rec.clientId)
  const interests = rec?.interests || []
  const order = useMemo(() => {
    const base = (b.visits || DEF.visits)[visit || 'general'] || DEF.visits.general
    if (visit !== 'return') return base
    const extra = interests.flatMap((i) => BY_INTEREST[i] || []).filter((x) => !base.includes(x))
    const close = base.filter((x) => x === 'close'), rest = base.filter((x) => x !== 'close')
    return [...rest.slice(0, 2), ...new Set(extra), ...rest.slice(2), ...close]
  }, [b.visits, visit, interests.join()]) // eslint-disable-line
  const wantTypes = isClient ? [rec.config].filter(Boolean) : rec?.config ? String(rec.config).split(/[,/]| or /).map((x) => x.trim()).filter((x) => /BHK/.test(x)) : []
  const stats = useMemo(() => TYPES.map((t) => {
    const us = crm.units.filter((u) => u.type === t.key)
    const booked = us.filter((u) => { const c = raw.clients.find((x) => String(x.unit) === String(u.unit)); return c && (BOOKED.includes(c.status) || c.status === 'To verify') }).length
    const areas = us.map((u) => Number(u.area)).filter(Boolean)
    const floors = us.map((u) => Number(u.floor)).filter(Boolean)
    return { ...t, total: us.length, avail: us.length - booked, aMin: Math.min(...areas), aMax: Math.max(...areas), fMin: Math.min(...floors), fMax: Math.max(...floors), blurb: b.types?.[t.key]?.blurb, plan: b.types?.[t.key]?.plan || t.plan }
  }).filter((t) => t.total), [crm.units, raw.clients, b])
  const shownTypes = visit === 'return' && wantTypes.length ? stats.filter((t) => wantTypes.includes(t.key)) : stats
  const total = crm.units.length, availAll = stats.reduce((s, t) => s + t.avail, 0)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.12 })
    root.current?.querySelectorAll('.rv').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [stats, order])
  // clicker / arrow keys: next and previous section
  useEffect(() => {
    if (!visit) return
    const k = (e) => { if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) return
      const secs = [...(root.current?.querySelectorAll('header.eb-hero, section.eb-sec') || [])]; const y = window.scrollY + 80
      const i = secs.findIndex((x) => x.offsetTop > y); const next = ['ArrowDown', 'PageDown'].includes(e.key) ? secs[i < 0 ? secs.length - 1 : i] : secs[Math.max(0, (i < 0 ? secs.length : i) - 2)]
      if (next) { e.preventDefault(); next.scrollIntoView({ behavior: 'smooth' }) } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [visit])
  if (!punchedIn) return <div className="shell gated"><PunchGate /></div>
  const seenBefore = rid && (db.viewings || []).filter((v) => v.recordId === rid && v.status === 'Completed').length > 0
  if (!visit) return <Launcher sop={b.sop || DEF.sop} init={{ for: rid || '', visit: seenBefore || isClient ? 'return' : 'first' }} onGo={(o) => setQs(Object.fromEntries(Object.entries(o).filter(([, v]) => v)))} />
  const facts = (id) => (slide(id).facts || [])
  const logIt = () => {
    if (!rec) return
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: nowTime(), recordId: rid, type: isClient ? 'Client' : 'Lead', mode: 'Office visit', purpose: 'Presentation', by: user.name,
      summary: `e-Brochure presented (${VISITS[visit]}): ${order.map((x) => SECTION_LABEL[x]).join(', ')}`, status: 'Done' })
    notify('Logged on ' + fullName(rec) + "'s file")
  }
  const greet = guest ? (visit === 'return' ? `Welcome back, ${salute(guest)}` : `Welcome, ${fullName(guest)}`) : ''
  const film = slide('film')
  const S = {
    film: () => (film.videoUrl ? <section key="film" id="film" className="eb-film">
      {/\.(mp4|webm)(\?|$)/i.test(film.videoUrl) ? <video src={film.videoUrl} autoPlay muted loop playsInline controls /> : <iframe src={film.videoUrl} title={film.title} allow="autoplay; fullscreen" allowFullScreen />}
      <div className="eb-film-cap rv"><div className="eb-k">The film</div><p>{film.body}</p></div></section> : null),
    address: () => <section key="address" id="address" className="eb-sec eb-two">
      <div className="rv"><div className="eb-k">The address</div><h2>{slide('address').title || 'An address above the coast'}</h2></div>
      <p className="eb-body rv">{slide('address').body}</p></section>,
    coast: () => <section key="coast" id="coast" className="eb-sec eb-img" style={slide('coast').image ? { backgroundImage: `url(${slide('coast').image})` } : null}>
      <div className="eb-head rv"><div className="eb-k">Mangaluru</div><h2>{slide('coast').title}</h2><p className="eb-body">{slide('coast').body}</p></div></section>,
    engineering: () => <section key="engineering" id="engineering" className="eb-sec eb-dark">
      <div className="eb-head rv"><div className="eb-k">Engineering</div><h2>{slide('engineering').title}</h2></div>
      <div className="eb-facts">{facts('engineering').map(([h, p], i) => <div key={h} className="rv"><span className="eb-n">0{i + 1}</span><h4>{h}</h4><p>{p}</p></div>)}</div></section>,
    design: () => <section key="design" id="design" className="eb-sec eb-two">
      <div className="rv"><div className="eb-k">Design</div><h2>{slide('design').title}</h2></div><p className="eb-body rv">{slide('design').body}</p></section>,
    yours: () => (rec ? <section key="yours" id="yours" className="eb-sec">
      <div className="eb-head rv"><div className="eb-k">{isClient ? 'Your residence' : 'Chosen for you'}</div>
        <h2>{isClient ? <>Residence <em>{rec.unit}</em></> : wantTypes.length ? <>{wantTypes.join(' or ')} <em>still open</em></> : 'The residences still open'}</h2>
        {isClient ? <p className="eb-body">{rec.config} · floor {rec.floor} · {num(rec.area)} sq ft{rec.band ? ' · ' + String(rec.band).split('|')[1]?.trim() : ''}. Here is where your residence sits, how it is planned, and what is next for you.</p>
          : <p className="eb-body">Since your last visit: {shownTypes.map((t) => `${t.avail} ${t.key}`).join(', ')} residences remain. {(db.costSheets || []).filter((x) => x.leadId === rid).length ? 'Your cost sheet is ready to walk through.' : ''}</p>}</div>
      {interests.length > 0 && <div className="eb-tags rv">{interests.map((i) => <span key={i}>{i}</span>)}</div>}</section> : null),
    residences: () => <section key="residences" id="residences" className="eb-sec">
      <div className="eb-head rv"><div className="eb-k">The residences</div><h2>{shownTypes.length < stats.length ? <>The residences <em>for you</em></> : <>Four ways to live <em>above the sea</em></>}</h2></div>
      {shownTypes.map((t, i) => <article key={t.key} className={'eb-res rv' + (i % 2 ? ' flip' : '')}>
        <div className="eb-res-img" style={{ backgroundImage: `url(${t.room})` }} />
        <div className="eb-res-txt">
          <div className="eb-k">{t.key}</div>
          <h3>{t.name}</h3>
          {t.blurb && <p className="eb-body">{t.blurb}</p>}
          <dl className="eb-dl">
            <div><dt>Saleable area</dt><dd>{t.aMin === t.aMax ? num(t.aMin) : `${num(t.aMin)} to ${num(t.aMax)}`} sq ft</dd></div>
            <div><dt>Floors</dt><dd>{t.fMin} to {t.fMax}</dd></div>
            <div><dt>Residences</dt><dd>{t.total}</dd></div>
            <div><dt>Available now</dt><dd className="acc">{t.avail}</dd></div>
          </dl>
          <img className="eb-plan" src={t.plan} alt={`${t.key} floor plan`} loading="lazy" />
        </div>
      </article>)}</section>,
    interiors: () => <section key="interiors" id="interiors" className="eb-sec">
      <div className="eb-head rv"><div className="eb-k">Interiors</div><h2>Rooms resolved <em>to the last detail</em></h2>
        <p className="eb-body">Every residence can be configured through Accord: a palette chosen from how you live, then the finishes room by room.</p></div>
      <div className="eb-gal">{GALLERY.map(([f, l]) => <figure key={f} className="rv"><img src={`${IMG}preset/${f}.jpg`} alt={l} loading="lazy" /><figcaption>{l}</figcaption></figure>)}</div></section>,
    structure: () => <section key="structure" id="structure" className="eb-sec eb-dark">
      <div className="eb-head rv"><div className="eb-k">Structure</div><h2>{slide('structure').title || 'Built to stand tall by the sea'}</h2></div>
      <div className="eb-facts">{facts('structure').map(([h, p], i) => <div key={h} className="rv"><span className="eb-n">0{i + 1}</span><h4>{h}</h4><p>{p}</p></div>)}</div>
      {slide('progress').title && <p className="eb-note rv">{slide('progress').title}: {slide('progress').body} {slide('progress').asOf ? `Updated ${d(slide('progress').asOf)}.` : ''}</p>}</section>,
    living: () => <section key="living" id="living" className="eb-sec eb-two">
      <div className="rv"><div className="eb-k">Living here</div><h2>{slide('living').title || 'Living with a house team'}</h2></div>
      <div className="eb-list">{facts('living').map(([h, p]) => <div key={h} className="rv"><h4>{h}</h4><p>{p}</p></div>)}</div></section>,
    availability: () => <section key="availability" id="availability" className="eb-sec">
      <div className="eb-head rv"><div className="eb-k">Availability, live</div><h2><em>{availAll}</em> of {total} residences open</h2></div>
      <div className="eb-av rv">{stats.map((t) => <div key={t.key}><div className="eb-k">{t.key}</div><div className="eb-bar"><span style={{ width: `${(1 - t.avail / t.total) * 100}%` }} /></div><p>{t.avail} available of {t.total}</p></div>)}</div></section>,
    close: () => <section key="close" className="eb-sec eb-close">
      <div className="rv"><div className="eb-k">{slide('privilege').title || 'Founding privilege'}</div>
        <h2>{guest ? `Thank you, ${salute(guest)}.` : slide('close').title || 'Thank you'}</h2>
        <p className="eb-body">{slide('privilege').body}</p>
        <div className="eb-sign"><b>{user.name}</b><span>{user.designation || 'Client Relations'} · {co.name ? co.name.replace(/\bPVT LTD\b/, '').trim() : 'Yamuna Homes and Design'}</span>{co.contact && <span>{co.contact}</span>}</div>
      </div></section>,
  }
  const navIds = order.filter((x) => !['close', 'film'].includes(x) && !(x === 'yours' && !rec)).slice(0, 7)
  return (
    <div className="eb" ref={root}>
      <nav className="eb-nav">
        <Link to="/" className="eb-mark">Accord</Link>
        <div className="eb-links">{navIds.map((h) => <a key={h} href={'#' + h} onClick={(e) => { e.preventDefault(); document.getElementById(h)?.scrollIntoView({ behavior: 'smooth' }) }}>{SECTION_LABEL[h]}</a>)}</div>
        <div className="eb-tools"><button className="eb-btn" onClick={() => setQs({})} title="Choose the visitor and the visit">{VISITS[visit]}{guest ? ' · ' + salute(guest) : ''}</button>
          {rec && <button className="eb-btn" onClick={logIt}>Log on their file</button>}
          {canWrite(user, 'brochure') && <Link to="/brochure/slides" className="eb-btn">Edit content</Link>}<button className="eb-btn" onClick={() => document.documentElement.requestFullscreen?.()}>Full screen</button></div>
      </nav>

      <header className="eb-hero" style={{ backgroundImage: `url(${slide('welcome').image || IMG + 'hero.jpg'})` }}>
        <div className="eb-in">
          <div className="eb-k rv">{guest ? (visit === 'return' ? 'Prepared again for you' : 'A private viewing, prepared for you') : 'A private viewing'} · {co.location || 'Mangaluru'}</div>
          {greet && <div className="eb-greet rv">{greet}</div>}
          <h1 className="rv">Yamuna <em>Sky City</em></h1>
          <p className="eb-lede rv">{co.tagline || "South India's highest address"}. {total} residences from the third floor to the fifty-eighth, planned around the sea.</p>
        </div>
        <div className="eb-scroll">Scroll</div>
      </header>
      {order.map((id) => S[id]?.())}
      <footer className="eb-foot"><span>{co.name} · RERA {co.rera}</span><span>Presented with Accord · OuTSDe</span></footer>
    </div>
  )
}
