// 12 Nov: the knowledge base. SOPs, role handbooks, RERA and statutory processes, HR policies. Each document has an owner,
// a version, a status and an audience (lowest grade, positions, teams). The server sends a person only the documents their
// grade and position allow (Code.gs kbVisible_); HR and admins see everything and edit.
import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { hasAccess } from '../../lib/perms.js'
import { d, today } from '../../lib/format.js'
import { Page, Card, Badge, Button, Field, Input, Textarea, Select, Empty, Check, Chips, Seg, Confirm } from '../../components/ui.jsx'
import { hrConfigOf, POSITIONS, POSITION, staffOf, gradeOf, positionOf, kbVisible, audienceText, gradeRank, profileOf, needsAck, isAcked, accessGrade, revOf } from '../../lib/hr.js'
import { KB_CATEGORIES } from '../../seed/kb.js'

const CAT = Object.fromEntries(KB_CATEGORIES.map((c) => [c.id, c]))
const TONE = { Approved: 'good', 'In review': 'warn', Draft: 'muted', Retired: 'muted' }
const csv = (rows) => rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }).join(',')).join('\n')

// **bold** inside a line
const Inline = ({ t }) => String(t).split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <React.Fragment key={i}>{p}</React.Fragment>))
// the small markup used by the documents (see seed/kb.js)
export function KbBody({ text, q }) {
  const lines = String(text || '').split('\n')
  const out = []; let i = 0, k = 0
  const mark = (s) => (q ? <Hl t={s} q={q} /> : <Inline t={s} />)
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    if (l.startsWith('## ')) { out.push(<h2 key={k++} className="kb-h2">{l.slice(3)}</h2>); i++; continue }
    if (l.startsWith('### ')) { out.push(<h3 key={k++} className="kb-h3">{l.slice(4)}</h3>); i++; continue }
    if (l.startsWith('> ')) { const g = []; while (i < lines.length && lines[i].startsWith('> ')) g.push(lines[i++].slice(2)); out.push(<div key={k++} className="kb-note">{g.map((x, j) => <p key={j}>{mark(x)}</p>)}</div>); continue }
    if (l.startsWith('| ')) { const g = []; while (i < lines.length && lines[i].startsWith('|')) g.push(lines[i++]); const rows = g.filter((x) => !/^\|[\s|:-]+\|$/.test(x)).map((x) => x.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
      out.push(<div key={k++} className="dt-wrap"><table className="table kb-table"><thead><tr>{rows[0].map((c, j) => <th key={j}>{c}</th>)}</tr></thead><tbody>{rows.slice(1).map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{mark(c)}</td>)}</tr>)}</tbody></table></div>); continue }
    if (/^\d+\. /.test(l)) { const g = []; while (i < lines.length && /^\d+\. /.test(lines[i])) g.push(lines[i++].replace(/^\d+\. /, '')); out.push(<ol key={k++} className="kb-ol">{g.map((x, j) => <li key={j}>{mark(x)}</li>)}</ol>); continue }
    if (l.startsWith('- ')) { const g = []; while (i < lines.length && lines[i].startsWith('- ')) g.push(lines[i++].slice(2)); out.push(<ul key={k++} className="kb-ul">{g.map((x, j) => <li key={j}>{mark(x)}</li>)}</ul>); continue }
    if (l.startsWith('[ ] ')) { const g = []; while (i < lines.length && lines[i].startsWith('[ ] ')) g.push(lines[i++].slice(4)); out.push(<ul key={k++} className="kb-check">{g.map((x, j) => <li key={j}>{mark(x)}</li>)}</ul>); continue }
    out.push(<p key={k++}>{mark(l)}</p>); i++
  }
  return <div className="kb-body">{out}</div>
}
function Hl({ t, q }) {
  const terms = q.toLowerCase().split(/\s+/).filter((x) => x.length > 2)
  if (!terms.length) return <Inline t={t} />
  const re = new RegExp('(' + terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi')
  return String(t).replace(/\*\*/g, '').split(re).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>))
}

function useKb() {
  const s = useStore()
  const { db, user } = s
  const grade = accessGrade(db, user), position = positionOf(db, user), team = profileOf(db, user)?.department || user?.team
  const editor = hasAccess(user, 'kbEdit')
  // the server already filters; the same rule here keeps local mode and training mode honest
  const docs = (db.kbDocs || []).filter((x) => kbVisible(x, user, grade, profileOf(db, user)?.position, team) || editor)
  const need = (x) => needsAck(db.kbAcks, x, user.id)
  return { ...s, grade, position, editor, docs, need }
}

export function Kb() {
  const { docs, position, grade, need: needOf, editor, db } = useKb()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [mine, setMine] = useState('all')
  const ql = q.trim().toLowerCase()
  const list = docs.filter((x) => (!cat || x.category === cat) && (mine === 'all' || (x.audience?.positions || []).includes(position))
    && (editor || x.status !== 'Retired') && (!ql || ql.split(/\s+/).every((t) => [x.code, x.title, x.summary, x.body].join(' ').toLowerCase().includes(t))))
    .sort((a, b) => String(a.code).localeCompare(b.code))
  const toAck = docs.filter(needOf).length
  return <Page title="Knowledge base" subtitle={`SOPs, role handbooks, RERA and statutory processes, and HR policies. You see what your position and grade (${grade}) allow.`}
    actions={<>{editor && <Button onClick={() => nav('/kb/acks')}>Acknowledgements</Button>}{editor && <Button variant="primary" onClick={() => nav('/kb/new')}>New document</Button>}</>}>
    {toAck > 0 && <Card tone="warn"><p style={{ margin: 0 }}><b>{toAck}</b> approved polic{toAck === 1 ? 'y needs' : 'ies need'} your acknowledgement. Open each one marked "Read and acknowledge".</p></Card>}
    <div className="kb-tools">
      <Input type="search" placeholder="Search: e.g. 10% advance, NOC, sick leave, cash" value={q} onChange={(e) => setQ(e.target.value)} />
      <Seg options={[{ value: 'all', label: 'Everything I can open' }, { value: 'mine', label: 'Written for my role' }]} value={mine} onChange={setMine} />
    </div>
    <div className="chips" style={{ marginBottom: 12 }}><button type="button" className={'chip ' + (!cat ? 'on' : '')} onClick={() => setCat('')}>All</button>
      {KB_CATEGORIES.map((c) => <button key={c.id} type="button" className={'chip ' + (cat === c.id ? 'on' : '')} onClick={() => setCat(c.id)}>{c.label}</button>)}</div>
    {!(db.kbDocs || []).length && <Empty>The knowledge base is empty in the shared sheet. HR loads the starting documents from the HR desk.</Empty>}
    <div className="kb-grid">{list.map((x) => { const need = needOf(x)
      return <Link key={x.id} to={'/kb/' + x.id} className="kb-card">
        <div className="kb-card-top"><span className="mono small">{x.code}</span><span>{x.status !== 'Approved' && <Badge tone={TONE[x.status]}>{x.status}</Badge>} {gradeRank(x.audience?.minGrade) > 1 && <Badge tone="purple">{x.audience.minGrade}+</Badge>}</span></div>
        <h3>{x.title}</h3><p className="small muted">{x.summary}</p>
        <div className="kb-card-foot small"><span>{CAT[x.category]?.label}</span>{need ? <b className="warn-t">Read and acknowledge</b> : x.ack && x.status === 'Approved' ? <span className="muted">Acknowledged</span> : <span className="muted">v{x.version}</span>}</div>
      </Link> })}</div>
    {docs.length > 0 && !list.length && <Empty>Nothing matches. Try "Everything I can open" or fewer words.</Empty>}
  </Page>
}

export function KbDoc() {
  const { id } = useParams()
  const { docs, user, need: needOf, editor, upsert, notify, db } = useKb()
  const nav = useNavigate()
  const x = docs.find((y) => y.id === id)
  if (!x) return <Page title="Document" back="/kb" backLabel="Knowledge base"><Empty>Not found, or not open to your position and grade.</Empty></Page>
  const need = needOf(x)
  const ack = () => { upsert('kbAcks', { id: `ACK-${x.id}-${user.id}-${revOf(x)}`, docId: x.id, code: x.code, version: String(x.version), rev: revOf(x), userId: user.id, name: user.name, at: new Date().toISOString() }, { action: 'acknowledged ' + x.code }); notify('Thank you. Recorded.') }
  const approve = () => { upsert('kbDocs', { ...x, status: 'Approved', approvedBy: user.name, approvedAt: today(), history: [...(x.history || []), { version: x.version, at: today(), by: user.name, note: 'Approved' }] }, { action: 'approved ' + x.code }); notify(x.code + ' approved') }
  const related = (x.related || []).map((r) => docs.find((y) => y.id === r)).filter(Boolean)
  return <Page title={x.title} subtitle={`${x.code} · v${x.version} · ${CAT[x.category]?.label || ''}`} back="/kb" backLabel="Knowledge base"
    actions={<>{editor && <Button onClick={() => nav('/kb/' + x.id + '/edit')}>Edit</Button>}{editor && x.status !== 'Approved' && <Confirm variant="primary" label={`Approve v${x.version}?`} onConfirm={approve}>Approve</Confirm>}<Button onClick={() => window.print()}>Print</Button></>}>
    {x.status === 'In review' && <div className="kb-banner">In review: written up and in use as the working draft, not yet signed off by {x.approver || 'management'}.</div>}
    {x.status === 'Draft' && <div className="kb-banner">Draft: only the owner and HR can see this.</div>}
    {x.status === 'Retired' && <div className="kb-banner">Retired. Kept for the record; do not follow it.</div>}
    <div className="kb-layout">
      <Card><p className="lede">{x.summary}</p><KbBody text={x.body} /></Card>
      <aside>
        <Card title="About this document"><dl className="kv">
          <dt>Owner</dt><dd>{x.owner || '–'}</dd><dt>Approver</dt><dd>{x.approver || '–'}</dd><dt>Status</dt><dd><Badge tone={TONE[x.status]}>{x.status}</Badge></dd>
          <dt>Effective</dt><dd>{d(x.effective)}</dd><dt>Next review</dt><dd className={x.review && x.review < today() ? 'warn-t' : ''}>{d(x.review)}</dd><dt>Open to</dt><dd className="small">{audienceText(x.audience)}</dd>
          {x.approvedBy && <><dt>Approved</dt><dd>{x.approvedBy}, {d(x.approvedAt)}</dd></>}</dl>
          {x.ack && (x.status === 'Approved' ? (need ? <Button variant="primary" onClick={ack} style={{ width: '100%', marginTop: 10 }}>I have read and will follow this</Button> : <p className="small good-t">You acknowledged v{x.version}.</p>)
            : <p className="small muted">Everyone it applies to acknowledges it once it is approved.</p>)}
        </Card>
        {related.length > 0 && <Card title="Related">{related.map((r) => <div key={r.id}><Link to={'/kb/' + r.id}><span className="mono small">{r.code}</span> {r.title}</Link></div>)}</Card>}
        {(x.history || []).length > 0 && <Card title="History">{x.history.slice().reverse().map((h, i) => <div key={i} className="small">v{h.version} · {d(h.at)} · {h.by}: {h.note}</div>)}</Card>}
      </aside>
    </div>
  </Page>
}

export function KbEdit() {
  const { id } = useParams()
  const { db, user, editor, upsert, notify, nextId } = useKb()
  const nav = useNavigate()
  const cfg = hrConfigOf(db)
  const cur = (db.kbDocs || []).find((y) => y.id === id)
  const [v, setV] = useState(() => cur ? { ...cur, audience: { minGrade: 'G1', positions: [], teams: [], roles: [], ...(cur.audience || {}) } } : { code: '', title: '', category: 'sop', summary: '', body: '## Purpose\n\n## Steps\n1. \n', owner: user.name, approver: 'Aryan', version: '1.0', status: 'Draft', effective: today(), review: '', ack: false, audience: { minGrade: 'G1', positions: [], teams: [], roles: [] }, related: [] })
  const [note, setNote] = useState('')
  const [reack, setReack] = useState(true)
  if (!editor) return <Page title="Edit"><Empty>Only HR and admins edit documents.</Empty></Page>
  const teams = [...new Set(staffOf(db.users).map((u) => u.team).filter(Boolean))]
  const set = (p) => setV({ ...v, ...p }), aud = (p) => setV({ ...v, audience: { ...v.audience, ...p } })
  const save = () => {
    if (!v.title.trim() || !v.code.trim()) return notify('Code and title are needed', 'bad')
    let rec = { ...v }
    if (!cur) rec.id = nextId('kbDocs', 'KB-', 3)
    if (cur && cur.status === 'Approved' && cur.body !== v.body) {
      // a changed approved document becomes a new version; asking everyone to acknowledge it again is optional
      const [a, b] = String(cur.version).split('.').map(Number)
      rec.version = reack ? `${a + 1}.0` : `${a}.${(b || 0) + 1}`
      rec.rev = revOf(cur) + 1
      rec.status = 'In review'
      rec.ackCarry = reack ? '' : (cur.ackCarry || revOf(cur))
      rec.history = [...(cur.history || []), { version: rec.version, at: today(), by: user.name, note: note || 'Revised' }]
    }
    if (upsert('kbDocs', rec, { action: cur ? 'document saved' : 'document created' })) { notify('Saved'); nav('/kb/' + rec.id) }
  }
  return <Page title={cur ? 'Edit ' + cur.code : 'New document'} back={cur ? '/kb/' + cur.id : '/kb'} actions={<Button variant="primary" onClick={save}>Save</Button>}>
    <div className="grid g2">
      <Card title="Document"><div className="form">
        <Field label="Code"><Input value={v.code} onChange={(e) => set({ code: e.target.value })} placeholder="e.g. YSC-PS-03" /></Field>
        <Field label="Category"><Select value={v.category} onChange={(e) => set({ category: e.target.value })} options={KB_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} /></Field>
        <Field label="Title" span="all"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Summary (shown on the card)" span="all"><Textarea rows={2} value={v.summary} onChange={(e) => set({ summary: e.target.value })} /></Field>
        <Field label="Owner"><Input value={v.owner} onChange={(e) => set({ owner: e.target.value })} /></Field>
        <Field label="Approver"><Input value={v.approver} onChange={(e) => set({ approver: e.target.value })} /></Field>
        <Field label="Version"><Input value={v.version} onChange={(e) => set({ version: e.target.value })} /></Field>
        <Field label="Status"><Select value={v.status} onChange={(e) => set({ status: e.target.value })} options={['Draft', 'In review', 'Approved', 'Retired']} /></Field>
        <Field label="Effective from"><Input type="date" value={v.effective} onChange={(e) => set({ effective: e.target.value })} /></Field>
        <Field label="Next review"><Input type="date" value={v.review} onChange={(e) => set({ review: e.target.value })} /></Field>
        <Field label="Acknowledgement" span="all"><Check checked={v.ack} onChange={(x) => set({ ack: x })} label="Everyone it applies to must read and acknowledge it" /></Field>
      </div></Card>
      <Card title="Who can open it">
        <Field label="Lowest grade"><Select value={v.audience.minGrade} onChange={(e) => aud({ minGrade: e.target.value })} options={(cfg.grades || []).map((g) => ({ value: g.id, label: `${g.id} · ${g.label} and above` }))} /></Field>
        <div className="sec-h">Positions (none ticked: every position)</div>
        <Chips options={POSITIONS.map((p) => p.label)} value={(v.audience.positions || []).map((p) => POSITION[p]?.label || p)} onChange={(x) => aud({ positions: x.map((l) => POSITIONS.find((p) => p.label === l)?.id).filter(Boolean) })} />
        <div className="sec-h">Teams (none ticked: every team)</div>
        <Chips options={teams} value={v.audience.teams || []} onChange={(x) => aud({ teams: x })} />
        <p className="small muted">{audienceText(v.audience)}. HR and admins always see every document. The server enforces this; it is not only hidden on screen.</p>
        {cur?.status === 'Approved' && <><div className="sec-h">This changes an approved document</div><Field label="What changed"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Check checked={reack} onChange={setReack} label="Material change: new major version, everyone acknowledges again" /></>}
      </Card>
    </div>
    <div className="grid g2">
      <Card title="Text"><Textarea rows={28} value={v.body} onChange={(e) => set({ body: e.target.value })} style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13 }} />
        <p className="small muted">## heading · ### subheading · - bullet · 1. step · | a | b | table (first row is the header) · &gt; note · [ ] checklist · **bold**</p></Card>
      <Card title="Preview"><KbBody text={v.body} /></Card>
    </div>
  </Page>
}

export function KbAcks() {
  const { db, editor, docs } = useKb()
  const [open, setOpen] = useState('')
  if (!editor) return <Page title="Acknowledgements"><Empty>HR and admins only.</Empty></Page>
  const staff = staffOf(db.users)
  const rows = docs.filter((x) => x.ack && x.status === 'Approved').map((x) => {
    const who = staff.filter((u) => { const p = profileOf(db, u); return kbVisible({ ...x }, { ...u, appRole: u.appRole === 'admin' || u.appRole === 'hr' ? 'sales' : u.appRole }, u.appRole === 'admin' ? 'G6' : p?.grade || 'G1', p?.position, p?.department || u.team) })
    const done = who.filter((u) => isAcked(db.kbAcks, x, u.id))
    return { x, who, done, pending: who.filter((u) => !done.includes(u)) }
  })
  const exp = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv([['Code', 'Title', 'Version', 'Person', 'Acknowledged on'], ...rows.flatMap((r) => r.who.map((u) => { const k = isAcked(db.kbAcks, r.x, u.id) && (db.kbAcks || []).filter((y) => y.userId === u.id && y.docId === r.x.id).slice(-1)[0]; return [r.x.code, r.x.title, r.x.version, u.name, k ? String(k.at).slice(0, 10) : 'Pending'] }))])], { type: 'text/csv' })); a.download = 'Policy_acknowledgements.csv'; a.click() }
  return <Page title="Policy acknowledgements" subtitle="Approved documents that must be acknowledged, and who has not yet. Only the people each document applies to are counted." back="/kb" backLabel="Knowledge base" actions={<Button onClick={exp}>Download CSV</Button>}>
    {rows.length ? <table className="table"><thead><tr><th>Document</th><th>Version</th><th className="right">Done</th><th className="right">Pending</th><th>Pending with</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.x.id} className="click" onClick={() => setOpen(open === r.x.id ? '' : r.x.id)}><td><b>{r.x.code}</b> {r.x.title}</td><td>v{r.x.version}</td><td className="right">{r.done.length}/{r.who.length}</td><td className={'right ' + (r.pending.length ? 'warn-t' : '')}>{r.pending.length}</td>
        <td className="small">{open === r.x.id || r.pending.length <= 4 ? r.pending.map((u) => u.name).join(', ') : r.pending.slice(0, 4).map((u) => u.name).join(', ') + ` and ${r.pending.length - 4} more`}</td></tr>)}</tbody></table>
      : <Empty>No approved document asks for acknowledgement yet. Approve one from its page.</Empty>}
  </Page>
}
