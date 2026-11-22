import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import RecordPicker from '../../components/RecordPicker.jsx'
import { OPS } from '../../lib/seed.js'
import { useStore } from '../../lib/store.jsx'
import { useCrm, BOOKED } from '../../lib/calc.js'
import { canWrite } from '../../lib/perms.js'
import { PunchGate } from '../../components/Layout.jsx'
import { d, num, salute, fullName, TITLES, today, nowTime } from '../../lib/format.js'
import logoH from './brand/logo-h.svg?raw'
import logoV from './brand/logo-v.svg?raw'
import logoMark from './brand/logo-mark.svg?raw'
import './brochure.css'

// 22 Nov: the e-brochure in the Yamuna Sky City identity (INSDe brand guidelines, 2026 V1.1).
// Ember #B42810 / Pearl Ivory #F7F0E6 / Black / Mist Grey, Atkinson Hyperlegible Next, full-bleed renders with vignettes.
// The images are the design team's renders and the sales team's site photographs, curated and cropped into site/brochure/.
const IMG = 'brochure/'
const RERA = 'PRM/KA/RERA/1257/334/PR/171023/006331'
const TYPES = [
  { key: '2 BHK', name: 'Two-bedroom residences', room: IMG + 'res-2.jpg', plan: IMG + 'plan-2.jpg', planNote: 'Residence F2 · typical floors 4 to 32 · 1,599 sq ft' },
  { key: '3 BHK', name: 'Three-bedroom residences', room: IMG + 'res-3.jpg', plan: IMG + 'plan-3.jpg', planNote: 'Residence F1 · typical floors 4 to 32 · 2,473 sq ft' },
  { key: '4 BHK', name: 'Sky and Grand residences', room: IMG + 'res-4.jpg', plan: IMG + 'plan-4.jpg', planNote: 'Residence F1 · floors 35 to 42 · 5,608 sq ft' },
  { key: '5 BHK', name: 'Sky duplexes and the Crown', room: IMG + 'res-5.jpg', plan: IMG + 'plan-5.jpg', planNote: 'Duplex F1 · floors 43 and 44 · 10,713 sq ft' },
]
const GALLERY = [['int-bed', 'Master bedroom', 'w'], ['int-bath', 'Master bath', 'n'], ['int-wic', 'Walk-in wardrobe', 'n'], ['int-lounge', 'Lounge', 'w'], ['int-lobby', 'Residents’ lounge', 'w'], ['int-atrium', 'Triple-height lobby', 'n']]
const CLUB = [['club-banquet', 'Banquet hall', 'Seats 300'], ['club-theatre', 'Mini theatre', '70 seats'], ['club-gym', 'Gym', 'Sea-facing'], ['club-spa', 'Spa', 'Gents and ladies'], ['club-games', 'Indoor games', 'Table tennis, billiards'], ['club-yoga', 'Yoga and meditation', 'Reflecting pool']]
const GROUNDS = [['gr-golf', 'Mini golf', 'Putting green to the beach path'], ['gr-pergola', 'Park entry plaza', 'Pergola and tree katte'], ['gr-skate', 'Skating rink', 'Evening light from the west']]
const ENGINEERING_IMG = [['en-piling', 'Piling', 'Bored piles taken down to rock'], ['en-night', 'Round the clock', 'Piles cast through the night'], ['en-wind', 'Wind tunnel', 'CPP, Australia: the tower model under test']]
const PROGRESS_IMG = [['pr-piles', 'The pile field'], ['pr-rising', 'The podium rising'], ['pr-rebar', 'Raft and core reinforcement'], ['pr-survey', 'Setting out, evening']]
const DISTANCES = [['Chithrapura Beach', '0.3 km'], ['Panambur Beach', '2 km'], ['NITK Surathkal', '4 km'], ['Surathkal railway station', '4 km'], ['MRPL', '6 km'], ['Mangaluru International Airport', '12 km']]
const CONSULTANTS = [['Architect', 'Archi Technics, Mangaluru'], ['Structure', 'Shanghvi & Associates, Mumbai'], ['Wind engineering', 'CPP Wind Engineering, Australia'], ['Geotechnical', 'Geocon International, Mumbai'], ['MEP', 'Prashanti MEP Consultants, Mumbai'], ['Landscape', 'Studio Naadi, Bengaluru'], ['Main civil works', 'MFAR Constructions'], ['Aluminium formwork', 'MFE Formwork (Mivan), Malaysia'], ['Project management', 'SS Engineers & Consultants, Mangaluru']]

export const VISITS = { general: 'General', first: 'First visit', return: 'Return visit' }
const SECTION_LABEL = { film: 'Film', address: 'The address', coast: 'The cultural coast', engineering: 'Engineering', design: 'Design', yours: 'Your residence', residences: 'Residences', interiors: 'Interiors', clubhouse: 'Clubhouse', grounds: 'The grounds', terrace: 'Sky terrace', structure: 'Structure', living: 'House team', availability: 'Availability', close: 'Close' }
export const SECTIONS = Object.keys(SECTION_LABEL)
const NEW_22NOV = ['clubhouse', 'grounds', 'terrace']
// return visits are curated: the person's interests (Client 360 / lead "Interests") bring the matching sections in
const BY_INTEREST = { Engineering: ['engineering', 'structure'], Design: ['design', 'interiors'], 'Sea and views': ['address', 'terrace'], Mangaluru: ['coast'], Luxury: ['living', 'interiors', 'terrace'], Wellness: ['clubhouse', 'grounds', 'living'], Family: ['grounds', 'clubhouse', 'living'], Investment: ['availability'] }

// visit lists saved before 22 Nov do not know the amenity sections: put them in after the interiors
function withAmenities(list, visit, saved) {
  if (!saved || visit === 'return' || list.some((x) => NEW_22NOV.includes(x))) return list
  const at = list.indexOf('interiors') >= 0 ? list.indexOf('interiors') + 1 : list.indexOf('structure') >= 0 ? list.indexOf('structure') : list.length - (list.includes('close') ? 1 : 0)
  return [...list.slice(0, at), ...NEW_22NOV, ...list.slice(at)]
}

// the list of sections a visit shows, as saved in the editor (or the default)
export function visitList(b, visit) {
  const saved = (b?.visits || {})[visit]
  return withAmenities(saved || OPS.BROCHURE.visits[visit] || OPS.BROCHURE.visits.general, visit, !!saved && !b?.visitsV)
}

const Svg = ({ src, className, label }) => <span className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: src }} />

// Section rule, as in the brand guidelines: number and section on the left, the project on the right
const Rule = ({ n, label, tone }) => <div className={'eb-rule' + (tone ? ' ' + tone : '')}><span><b>{String(n).padStart(2, '0')}</b> / {label}</span><span>Yamuna Sky City</span></div>

// Full-bleed photograph with a vignette on the side the text sits
function Bleed({ id, img, pos = '50% 50%', v = 'left', children, className = '', tall }) {
  return (
    <section id={id} className={`eb-sec eb-bleed v-${v}${tall ? ' tall' : ''} ${className}`}>
      <img className="eb-bleed-img" src={img} alt="" loading="lazy" style={{ objectPosition: pos }} />
      <div className="eb-bleed-in eb-grid">{children}</div>
    </section>
  )
}

// 1 Nov: before the e-brochure opens, who is visiting and which visit. The link carries it, so it can be bookmarked or sent from a lead.
function Launcher({ onGo, sop, init = {} }) {
  const [rid, setRid] = useState(init.for || '')
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [visit, setVisit] = useState(init.visit || 'first')
  return (
    <div className="eb eb-launch">
      <img className="eb-launch-bg" src={IMG + 'hero.jpg'} alt="" />
      <div className="eb-launch-card">
        <Svg src={logoH} className="eb-logo-h" label="Yamuna Sky City" />
        <div className="eb-k">e-Brochure · a private viewing</div>
        <h1>Who is visiting?</h1>
        <label className="field"><span className="field-label">Lead or client</span><RecordPicker value={rid} onChange={setRid} /></label>
        <div className="eb-or">or, for a walk-in</div>
        <div className="row gap-s"><select className="input" style={{ width: 120 }} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title"><option value="">Title</option>{TITLES.map((t) => <option key={t}>{t}</option>)}</select>
          <input className="input" style={{ flex: 1 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name as it should appear" aria-label="Name" /></div>
        <div className="field"><span className="field-label">Visit</span>
          <div className="eb-visits">{[['first', 'First visit', 'The whole story: film, coast, engineering, design, residences, amenities.'], ['return', 'Return visit', 'Curated: their residence, their interests, what is still open.'], ['general', 'General', 'Everything, not personalised.']].map(([v, l, h]) =>
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
  const vid = useRef(null)
  const [muted, setMuted] = useState(true)
  const b = db.brochure[0] || {}
  const DEF = OPS.BROCHURE
  const slide = (id) => (b.slides || []).find((s) => s.id === id) || DEF.slides.find((s) => s.id === id) || {}
  const def = (id) => DEF.slides.find((s) => s.id === id) || {}
  const txt = (id, k) => slide(id)[k] || def(id)[k] || ''
  const pic = (id, fallback) => slide(id).image || fallback
  const co = db.settings[0]?.company || {}
  const visit = qs.get('visit')
  const rid = qs.get('for')
  const rec = rid && (crm.clients.find((c) => c.clientId === rid) || db.leads.find((l) => l.id === rid))
  const guest = rec || (qs.get('name') ? { name: qs.get('name'), title: qs.get('title') || '' } : null)
  const isClient = !!(rec && rec.clientId)
  const interests = rec?.interests || []
  const order = useMemo(() => {
    const base = visitList(b, visit || 'general')
    if (visit !== 'return') return base
    const extra = interests.flatMap((i) => BY_INTEREST[i] || []).filter((x) => !base.includes(x))
    const close = base.filter((x) => x === 'close'), rest = base.filter((x) => x !== 'close')
    return [...rest.slice(0, 2), ...new Set(extra), ...rest.slice(2), ...close]
  }, [b.visits, b.visitsV, visit, interests.join()]) // eslint-disable-line
  const wantTypes = isClient ? [rec.config].filter(Boolean) : rec?.config ? String(rec.config).split(/[,/]| or /).map((x) => x.trim()).filter((x) => /BHK/.test(x)) : []
  const stats = useMemo(() => TYPES.map((t) => {
    const us = crm.units.filter((u) => u.type === t.key)
    const booked = us.filter((u) => { const c = raw.clients.find((x) => String(x.unit) === String(u.unit)); return c && (BOOKED.includes(c.status) || c.status === 'To verify') }).length
    const areas = us.map((u) => Number(u.area)).filter(Boolean)
    const floors = us.map((u) => Number(u.floor)).filter(Boolean)
    return { ...t, total: us.length, avail: us.length - booked, aMin: Math.min(...areas), aMax: Math.max(...areas), fMin: Math.min(...floors), fMax: Math.max(...floors), blurb: b.types?.[t.key]?.blurb || DEF.types[t.key]?.blurb, plan: b.types?.[t.key]?.plan || t.plan }
  }).filter((t) => t.total), [crm.units, raw.clients, b]) // eslint-disable-line
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
  const facts = (id) => (slide(id).facts?.length ? slide(id).facts : def(id).facts || [])
  const logIt = () => {
    if (!rec) return
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: nowTime(), recordId: rid, type: isClient ? 'Client' : 'Lead', mode: 'Office visit', purpose: 'Presentation', by: user.name,
      summary: `e-Brochure presented (${VISITS[visit]}): ${order.map((x) => SECTION_LABEL[x]).join(', ')}`, status: 'Done' })
    notify('Logged on ' + fullName(rec) + "'s file")
  }
  const greet = guest ? (visit === 'return' ? `Welcome back, ${salute(guest)}` : `Welcome, ${fullName(guest)}`) : ''
  const film = slide('film')
  const filmUrl = film.videoUrl || IMG + 'film.mp4'
  const shown = order.filter((x) => !(x === 'yours' && !rec) && !(x === 'availability' && !stats.length))
  const numOf = (id) => shown.filter((x) => x !== 'film' && x !== 'close').indexOf(id) + 1
  const R = (id) => numOf(id) || ''
  const range = (t) => t.aMin === t.aMax ? num(t.aMin) : `${num(t.aMin)} to ${num(t.aMax)}`
  const S = {
    film: () => <section key="film" id="film" className="eb-sec eb-film">
      {/\.(mp4|webm)(\?|$)/i.test(filmUrl) ? <video ref={vid} src={filmUrl} poster={IMG + 'film-poster.jpg'} autoPlay muted={muted} loop playsInline preload="metadata" />
        : <iframe src={filmUrl} title={film.title || 'Yamuna Sky City'} allow="autoplay; fullscreen" allowFullScreen />}
      <div className="eb-film-cap eb-grid"><div className="eb-film-txt rv"><div className="eb-k">The film</div><p>{txt('film', 'body')}</p></div>
        {/\.(mp4|webm)(\?|$)/i.test(filmUrl) && <button className="eb-btn eb-sound" onClick={() => { setMuted((m) => !m); vid.current?.play?.() }}>{muted ? 'Sound on' : 'Sound off'}</button>}</div>
    </section>,
    address: () => <Bleed key="address" id="address" img={pic('address', IMG + 'address.jpg')} pos="50% 55%" v="left" tall>
      <Rule n={R('address')} label="The address" tone="light" />
      <div className="eb-c-1-6 eb-stack rv"><h2>{txt('address', 'title') || 'An address above the coast'}</h2><p className="eb-body">{txt('address', 'body')}</p></div>
      <dl className="eb-c-9-12 eb-dist rv">{DISTANCES.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="eb-c-1-12 eb-stats rv">{[['3.6', 'acres, within the 35-acre Yamuna Asha City'], [total || 296, 'residences'], ['60', 'levels'], ['250 m', 'from the beach, off NH 66'], ['8', 'high-speed lifts'], ['2028', 'completion']].map(([n, l]) =>
        <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>
    </Bleed>,
    coast: () => <Bleed key="coast" id="coast" img={pic('coast', IMG + 'coast.jpg')} pos="50% 60%" v="left">
      <Rule n={R('coast')} label="The cultural coast" tone="light" />
      <div className="eb-c-1-6 eb-stack rv"><div className="eb-k">Mangaluru</div><h2>{txt('coast', 'title')}</h2><p className="eb-body">{txt('coast', 'body')}</p></div>
    </Bleed>,
    engineering: () => <section key="engineering" id="engineering" className="eb-sec eb-dark eb-pad">
      <div className="eb-grid">
        <Rule n={R('engineering')} label="Engineering" />
        <div className="eb-c-1-7 eb-stack rv"><h2>{txt('engineering', 'title')}</h2><p className="eb-body">Sixty levels on the edge of the Arabian Sea are designed for wind, salt and monsoon from the first pile up.</p></div>
        <div className="eb-c-1-12 eb-facts rv">{facts('engineering').map(([h, p], i) => <div key={h}><span className="eb-n">{String(i + 1).padStart(2, '0')}</span><h4>{h}</h4><p>{p}</p></div>)}</div>
        {ENGINEERING_IMG.map(([f, h, c]) => <figure key={f} className="eb-c-4 eb-tile r45 rv"><img src={IMG + f + '.jpg'} alt={h} loading="lazy" /><figcaption><b>{h}</b><span>{c}</span></figcaption></figure>)}
        <div className="eb-c-1-12 eb-sub rv"><div className="eb-k">The team</div></div>
        <dl className="eb-c-1-12 eb-team rv">{CONSULTANTS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div></section>,
    design: () => <Bleed key="design" id="design" img={pic('design', IMG + 'design.jpg')} pos="50% 60%" v="left">
      <Rule n={R('design')} label="Design" tone="light" />
      <div className="eb-c-1-5 eb-stack rv"><h2>{txt('design', 'title')}</h2><p className="eb-body">{txt('design', 'body')}</p></div>
    </Bleed>,
    yours: () => (rec ? <section key="yours" id="yours" className="eb-sec eb-ivory eb-pad"><div className="eb-grid">
      <Rule n={R('yours')} label={isClient ? 'Your residence' : 'Chosen for you'} />
      <div className="eb-c-1-8 eb-stack rv">
        <h2>{isClient ? <>Residence <em>{rec.unit}</em></> : wantTypes.length ? <>{wantTypes.join(' or ')} <em>still open</em></> : 'The residences still open'}</h2>
        {isClient ? <p className="eb-body">{rec.config} · floor {rec.floor} · {num(rec.area)} sq ft{rec.band ? ' · ' + String(rec.band).split('|')[1]?.trim() : ''}. Here is where your residence sits, how it is planned, and what is next for you.</p>
          : <p className="eb-body">Since your last visit: {shownTypes.map((t) => `${t.avail} ${t.key}`).join(', ')} residences remain. {(db.costSheets || []).filter((x) => x.leadId === rid).length ? 'Your cost sheet is ready to walk through.' : ''}</p>}
        {interests.length > 0 && <div className="eb-tags">{interests.map((i) => <span key={i}>{i}</span>)}</div>}</div>
    </div></section> : null),
    residences: () => <section key="residences" id="residences" className="eb-sec eb-res-wrap">
      <div className="eb-grid eb-pad-t"><Rule n={R('residences')} label="Residences" />
        <div className="eb-c-1-8 rv"><h2>{shownTypes.length < stats.length ? <>The residences <em>for you</em></> : <>Four ways to live <em>above the sea</em></>}</h2></div></div>
      {shownTypes.map((t, i) => <article key={t.key} className="eb-res">
        <div className={`eb-bleed v-${i % 2 ? 'right' : 'left'}`}>
          <img className="eb-bleed-img" src={t.room} alt={`${t.key} interior`} loading="lazy" />
          <div className="eb-bleed-in eb-grid">
            <div className={(i % 2 ? 'eb-c-8-12' : 'eb-c-1-5') + ' eb-stack rv'}>
              <div className="eb-k">{t.key}</div><h3>{t.name}</h3>{t.blurb && <p className="eb-body">{t.blurb}</p>}
              <dl className="eb-dl">
                <div><dt>Saleable area</dt><dd>{range(t)} sq ft</dd></div>
                <div><dt>Floors</dt><dd>{t.fMin} to {t.fMax}</dd></div>
                <div><dt>Residences</dt><dd>{t.total}</dd></div>
                <div><dt>Available now</dt><dd className="acc">{t.avail}</dd></div>
              </dl></div></div></div>
        <figure className="eb-plan rv"><img src={t.plan} alt={`${t.key} floor plan`} loading="lazy" /><figcaption>{t.plan === TYPES.find((x) => x.key === t.key)?.plan ? t.planNote : `${t.key} plan`} · indicative, not to scale</figcaption></figure>
      </article>)}</section>,
    interiors: () => <section key="interiors" id="interiors" className="eb-sec eb-ivory eb-pad"><div className="eb-grid">
      <Rule n={R('interiors')} label="Interiors" />
      <div className="eb-c-1-6 eb-stack rv"><h2>Rooms resolved <em>to the last detail</em></h2></div>
      <p className="eb-c-8-12 eb-body eb-al-end rv">Marble, timber and glass, framed on the sea. Every residence can then be configured through Accord: a palette chosen from how you live, and the finishes room by room.</p>
      <div className="eb-c-1-12 eb-mosaic">{GALLERY.map(([f, l, s]) => <figure key={f} className={'eb-tile rv ' + (s === 'w' ? 'wide' : 'narrow')}><img src={IMG + f + '.jpg'} alt={l} loading="lazy" /><figcaption><b>{l}</b></figcaption></figure>)}</div>
    </div></section>,
    clubhouse: () => <React.Fragment key="clubhouse">
      <Bleed id="clubhouse" img={pic('clubhouse', IMG + 'clubhouse.jpg')} pos="50% 62%" v="left">
        <Rule n={R('clubhouse')} label="Podium and clubhouse" tone="light" />
        <div className="eb-c-1-6 eb-stack rv"><h2>{txt('clubhouse', 'title')}</h2><p className="eb-body">{txt('clubhouse', 'body')}</p></div>
        <div className="eb-c-1-12 eb-stats rv">{[['46,000', 'sq ft clubhouse'], ["100' × 26'", 'infinity lap pool'], ["66' × 23'", 'wade pool'], ['50+', 'lifestyle amenities']].map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>
      </Bleed>
      <section className="eb-sec eb-ivory eb-pad-s"><div className="eb-grid">
        {CLUB.map(([f, h, c]) => <figure key={f} className="eb-c-4 eb-tile r32 rv"><img src={IMG + f + '.jpg'} alt={h} loading="lazy" /><figcaption><b>{h}</b><span>{c}</span></figcaption></figure>)}
        <figure className="eb-c-1-12 eb-plan flat rv"><img src={IMG + 'plan-podium.jpg'} alt="Third-floor podium plan" loading="lazy" /><figcaption>Third-floor podium: pools, multipurpose court, amphitheatre, floating pergola and the clubhouse</figcaption></figure>
      </div></section></React.Fragment>,
    grounds: () => <React.Fragment key="grounds">
      <Bleed id="grounds" img={pic('grounds', IMG + 'grounds.jpg')} pos="50% 50%" v="left">
        <Rule n={R('grounds')} label="The grounds" tone="light" />
        <div className="eb-c-1-5 eb-stack rv"><h2>{txt('grounds', 'title')}</h2><p className="eb-body">{txt('grounds', 'body')}</p></div>
      </Bleed>
      <section className="eb-sec eb-ivory eb-pad-s"><div className="eb-grid">
        {GROUNDS.map(([f, h, c]) => <figure key={f} className="eb-c-4 eb-tile r45 rv"><img src={IMG + f + '.jpg'} alt={h} loading="lazy" /><figcaption><b>{h}</b><span>{c}</span></figcaption></figure>)}
        <div className="eb-c-1-12 eb-cols rv">{facts('grounds').map(([h, p]) => <div key={h}><h4>{h}</h4><p>{p}</p></div>)}</div>
      </div></section></React.Fragment>,
    terrace: () => <React.Fragment key="terrace">
      <Bleed id="terrace" img={pic('terrace', IMG + 'terrace.jpg')} pos="50% 50%" v="right">
        <Rule n={R('terrace')} label="Sky terrace" tone="light" />
        <div className="eb-c-8-12 eb-stack rv"><h2>{txt('terrace', 'title')}</h2><p className="eb-body">{txt('terrace', 'body')}</p></div>
      </Bleed>
      <section className="eb-sec eb-ivory eb-pad-s"><div className="eb-grid">
        <figure className="eb-c-6 eb-tile r32 rv"><img src={IMG + 'tr-cafe.jpg'} alt="Rooftop café" loading="lazy" /><figcaption><b>Rooftop café</b><span>Under a sky of lights</span></figcaption></figure>
        <figure className="eb-c-6 eb-tile r32 rv"><img src={IMG + 'tr-sunset.jpg'} alt="Sunset deck" loading="lazy" /><figcaption><b>Sunset deck</b><span>Facing due west, over the sea</span></figcaption></figure>
        <figure className="eb-c-1-12 eb-plan flat rv"><img src={IMG + 'plan-terrace.jpg'} alt="Terrace floor plan" loading="lazy" /><figcaption>Terrace floor: lap pool and pool deck, outdoor café, stage and event space, public binoculars</figcaption></figure>
      </div></section></React.Fragment>,
    structure: () => <section key="structure" id="structure" className="eb-sec eb-dark eb-pad"><div className="eb-grid">
      <Rule n={R('structure')} label="Structure and progress" />
      <div className="eb-c-1-7 eb-stack rv"><h2>{txt('structure', 'title') || 'Built to stand tall by the sea'}</h2></div>
      <div className="eb-c-1-12 eb-facts four rv">{facts('structure').map(([h, p], i) => <div key={h}><span className="eb-n">{String(i + 1).padStart(2, '0')}</span><h4>{h}</h4><p>{p}</p></div>)}</div>
      {PROGRESS_IMG.map(([f, h]) => <figure key={f} className="eb-c-3 eb-tile r43 rv"><img src={IMG + f + '.jpg'} alt={h} loading="lazy" /><figcaption><b>{h}</b></figcaption></figure>)}
      {slide('progress').title && <p className="eb-c-1-12 eb-note rv">{slide('progress').title}: {slide('progress').body} {slide('progress').asOf ? `Updated ${d(slide('progress').asOf)}.` : ''}</p>}
    </div></section>,
    living: () => <Bleed key="living" id="living" img={pic('living', IMG + 'house.jpg')} pos="50% 50%" v="left">
      <Rule n={R('living')} label="Living here" tone="light" />
      <div className="eb-c-1-5 eb-stack rv"><h2>{txt('living', 'title') || 'Living with a house team'}</h2>
        <div className="eb-list">{facts('living').map(([h, p]) => <div key={h}><h4>{h}</h4><p>{p}</p></div>)}</div></div>
    </Bleed>,
    availability: () => <section key="availability" id="availability" className="eb-sec eb-ivory eb-pad"><div className="eb-grid">
      <Rule n={R('availability')} label="Availability, live" />
      <div className="eb-c-1-8 rv"><h2><em className="eb-big">{availAll}</em> of {total} residences open</h2></div>
      <div className="eb-c-1-12 eb-av rv">{stats.map((t) => <div key={t.key}><div className="eb-k">{t.key}</div><b className="eb-av-n">{t.avail}</b><div className="eb-bar"><span style={{ width: `${(1 - t.avail / t.total) * 100}%` }} /></div><p>{t.avail} available of {t.total} · floors {t.fMin} to {t.fMax}</p></div>)}</div>
    </div></section>,
    close: () => <section key="close" id="close" className="eb-sec eb-bleed v-close tall">
      <img className="eb-bleed-img" src={pic('close', IMG + 'close.jpg')} alt="" loading="lazy" />
      <div className="eb-bleed-in eb-grid">
        <div className="eb-c-1-7 eb-stack rv"><div className="eb-k">{txt('privilege', 'title') || 'Founding privilege'}</div>
          <h2 className="eb-thanks">{guest ? `Thank you, ${salute(guest)}.` : txt('close', 'title') || 'Thank you'}</h2>
          <p className="eb-body">{txt('privilege', 'body')}</p>
          <div className="eb-sign"><b>{user.name}</b><span>{user.designation || 'Client Relations'} · {co.name ? co.name.replace(/\bPVT LTD\b/i, '').trim() : 'Yamuna Homes and Design'}</span>{co.contact && <span>{co.contact}</span>}</div></div>
        <div className="eb-c-9-12 eb-close-mark rv"><Svg src={logoV} className="eb-logo-v" label="Yamuna Sky City" /></div>
      </div></section>,
  }
  const navIds = shown.filter((x) => !['close', 'film'].includes(x)).slice(0, 8)
  return (
    <div className="eb" ref={root}>
      <nav className="eb-nav">
        <Link to="/" className="eb-mark" title="Back to Accord"><Svg src={logoH} className="eb-logo-nav" label="Yamuna Sky City" /></Link>
        <div className="eb-links">{navIds.map((h) => <a key={h} href={'#' + h} onClick={(e) => { e.preventDefault(); document.getElementById(h)?.scrollIntoView({ behavior: 'smooth' }) }}>{SECTION_LABEL[h]}</a>)}</div>
        <div className="eb-tools"><button className="eb-btn" onClick={() => setQs({})} title="Choose the visitor and the visit">{VISITS[visit]}{guest ? ' · ' + salute(guest) : ''}</button>
          {rec && <button className="eb-btn" onClick={logIt}>Log on their file</button>}
          {canWrite(user, 'brochure') && <Link to="/brochure/slides" className="eb-btn">Edit content</Link>}<button className="eb-btn" onClick={() => document.documentElement.requestFullscreen?.()}>Full screen</button></div>
      </nav>

      <header className="eb-hero eb-bleed v-hero">
        <img className="eb-bleed-img" src={slide('welcome').image || IMG + 'hero.jpg'} alt="Yamuna Sky City at sunset" style={{ objectPosition: '30% 50%' }} />
        <div className="eb-bleed-in eb-grid">
          <div className="eb-c-7-12 eb-stack eb-hero-txt">
            <Svg src={logoV} className="eb-logo-hero rv" label="Yamuna Sky City" />
            <div className="eb-k rv">{guest ? (visit === 'return' ? 'Prepared again for you' : 'A private viewing, prepared for you') : 'A private viewing'} · {co.location || 'Mangaluru'}</div>
            {greet && <div className="eb-greet rv">{greet}</div>}
            <h1 className="rv">Coastal by nature. <em>Exceptional by design.</em></h1>
            <p className="eb-lede rv">{co.tagline || "South India's tallest coastal residential tower"}. {total} sea-view residences from the third floor to the fifty-eighth, on NH 66 at Kulai.</p>
          </div>
        </div>
        <div className="eb-scroll">Scroll</div>
      </header>
      {order.map((id) => S[id]?.())}
      <footer className="eb-foot"><Svg src={logoMark} className="eb-logo-mark" label="" /><span>{co.name || 'Yamuna Homes and Design Pvt. Ltd.'} · RERA {co.rera || RERA}</span><span>Renders are artistic impressions · Presented with Accord · OuTSDe</span></footer>
    </div>
  )
}
