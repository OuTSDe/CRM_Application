import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { useCrm } from '../../lib/calc.js'
import { canEditTemplates, seesMoney } from '../../lib/perms.js'
import { META } from '../../lib/seed.js'
import { Page, Card, Button, Field, Select, Textarea, Input, Badge, Seg, Modal } from '../../components/ui.jsx'
import RecordPicker from '../../components/RecordPicker.jsx'
import { inr, waLink, d, today, nowTime, addDays, salute, fullName } from '../../lib/format.js'

export default function Messages() {
  const { db, user, upsert, nextId, notify, online, sendEmail } = useStore()
  const [sending, setSending] = useState(false)
  const crm = useCrm()
  const [qs] = useSearchParams()
  const [to, setTo] = useState(qs.get('to') || '')
  const [tp, setTp] = useState(qs.get('tp') || 'TP-01')
  const [channel, setChannel] = useState('WhatsApp')
  const [body, setBody] = useState(null)
  const [subject, setSubject] = useState('Yamuna Sky City')
  const [bulk, setBulk] = useState('')
  const [tpl, setTpl] = useState(null)
  const fill = (text, r) => {
    const c = crm.clients.find((x) => x.clientId === r?.id) || null
    const pending = c ? META.docTypes.filter((t) => { const v = db.documents.find((x) => x.bookingId === c.bookingId)?.items?.[t.key]; return !v || v === 'Pending' }).slice(0, 5).map((t) => t.label).join(', ') : ''
    return text.replace(/{name}/g, salute(r)).replace(/{fullname}/g, fullName(r) || 'Sir/Madam').replace(/{unit}/g, c?.unit || '').replace(/{outstanding}/g, c && seesMoney(user) ? inr(Math.max(0, c.outstanding)) : '')
      .replace(/{signature}/g, `${user.name}\n${user.designation || 'Client Relations'}\nYamuna Sky City`).replace(/{advisor}/g, user.name).replace(/{pending}/g, pending || 'the pending documents').replace(/{date}/g, d(addDays(today(), 2)))
  }
  const rec = db.clients.find((c) => c.clientId === to) || db.leads.find((l) => l.id === to)
  const t = db.templates.find((x) => x.id === tp)
  const text = body ?? (t ? fill(t.body, rec ? { id: to, name: rec.name } : null) : '')
  const logSend = (r, txt, ch, viaServer) => {
    if (!viaServer) upsert('messages', { id: nextId('messages', 'M-', 5), date: today(), time: nowTime(), to: r.id, name: r.name, channel: ch, template: tp, body: txt, by: user.name }, { silent: true })
    upsert('interactions', { id: nextId('interactions', 'I-', 4), date: today(), time: nowTime(), recordId: r.id, type: r.id.startsWith('YSC-C') ? 'Client' : 'Lead', mode: ch === 'Email' ? 'Email' : 'WhatsApp', purpose: tp === 'TP-02' ? 'Payment reminder' : tp === 'TP-04' ? 'Document collection' : 'Follow-up', by: user.name, summary: `${t?.name || 'Message'} sent: ${txt.slice(0, 140)}`, status: 'Done' }, { silent: true })
  }
  const send = async () => {
    if (!rec) return notify('Pick a recipient', 'bad')
    const r = { id: to, name: rec.name }
    if (channel === 'Email' && online) {
      // 1 Nov: a branded e-mail with the Yamuna Sky City header, sent by Accord; replies come to your own address
      if (!rec.email) return notify('No email on file', 'bad')
      setSending(true)
      try { const j = await sendEmail({ to: rec.email, subject, body: text, recordId: to }); logSend(r, text, channel, true); notify(j.skipped ? 'Demo mode: e-mail not sent' : 'E-mail sent with the Yamuna Sky City header and logged') } catch (e) { notify(e.message, 'bad') } finally { setSending(false) }
      return
    }
    if (channel === 'Email') { if (!rec.email) return notify('No email on file', 'bad'); window.open(`mailto:${rec.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`) }
    else { if (!rec.phone) return notify('No phone on file', 'bad'); window.open(waLink(rec.phone, text), '_blank') }
    logSend(r, text, channel); notify('Opened ' + channel + ' and logged on the interaction log')
  }
  const groups = useMemo(() => ({
    overdue: crm.clients.filter((c) => !c.directoryOnly && (seesMoney(user) ? c.outstanding > 0 && c.overdue > 0 : /Overdue/.test(c.payState || '')) && c.phone).map((c) => ({ id: c.clientId, name: c.name, phone: c.phone })),
    docs: crm.clients.filter((c) => !c.directoryOnly && c.docPct < 0.5 && c.phone && !['Cancelled', 'Transferred'].includes(c.status)).map((c) => ({ id: c.clientId, name: c.name, phone: c.phone })),
    stale: crm.leads.filter((l) => !['Lost', 'Booked', 'Dormant'].includes(l.stage) && l.phone && (!l.contact.days || l.contact.days > 14)).map((l) => ({ id: l.id, name: l.name, phone: l.phone })),
  }), [crm, user])
  const list = groups[bulk] || []
  return (
    <Page title="Messages" back="/" backLabel="Dashboard" subtitle="Write once from a template with the client's details filled in, send on WhatsApp or email, and it is logged on the interaction log automatically."
      actions={canEditTemplates(user) ? <Button onClick={() => setTpl({ id: '', name: '', channel: 'WhatsApp', body: 'Dear {name},\n\n\n\nWarm regards,\n{signature}' })}>New template</Button> : <span className="locked">Templates are edited by Cyril and admins</span>}>
      <div className="split">
        <div>
          <Card title="Compose">
            <div className="form fc2">
              <Field label="To" span="all"><RecordPicker value={to} onChange={(id) => { setTo(id); setBody(null) }} /></Field>
              <Field label="Template"><Select options={db.templates.map((x) => ({ value: x.id, label: x.name }))} value={tp} onChange={(e) => { setTp(e.target.value); setBody(null) }} /></Field>
              <Field label="Channel"><Seg options={['WhatsApp', 'Email']} value={channel} onChange={setChannel} /></Field>
              {channel === 'Email' && <Field label="Subject" span="all"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>}
              <Field label="Message" span="all" hint="Variables: {name} (title and full name, or first name if no title is set) {fullname} {unit} {pending} {date} {signature} (your name and designation)"><Textarea rows={7} value={text} onChange={(e) => setBody(e.target.value)} /></Field>
            </div>
            <div className="row" style={{ marginTop: 12 }}><Button variant="primary" onClick={send} disabled={sending}>{channel === 'Email' && online ? (sending ? 'Sending…' : 'Send branded e-mail and log') : `Open in ${channel} and log`}</Button>{rec && <span className="small muted">{rec.phone || 'no phone'} · {rec.email || 'no email'}</span>}</div>
          </Card>
          <Card title="Bulk send" actions={<Seg options={[{ value: '', label: 'Off' }, { value: 'overdue', label: `Overdue (${groups.overdue.length})` }, { value: 'docs', label: `Docs < 50% (${groups.docs.length})` }, { value: 'stale', label: `Leads quiet 14d (${groups.stale.length})` }]} value={bulk} onChange={(x) => { setBulk(x); setTp(x === 'overdue' ? 'TP-02' : x === 'docs' ? 'TP-04' : x === 'stale' ? 'TP-05' : tp) }} />}>
            {!bulk ? <p className="muted" style={{ margin: 0 }}>Pick a group. Each row opens WhatsApp with that person's details filled in from the selected template, one by one.</p> :
              <ul className="list">{list.map((r) => { const msg = fill(t?.body || '', r); const sent = db.messages.some((m) => m.to === r.id && m.date === today() && m.template === tp)
                return <li key={r.id}><div className="grow"><b>{r.name}</b> <span className="small muted">{r.id}</span><div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</div></div>
                  {sent ? <Badge tone="good">Sent today</Badge> : <a className="btn btn-sm" href={waLink(r.phone, msg)} target="_blank" rel="noreferrer" onClick={() => logSend(r, msg, 'WhatsApp')}>Send</a>}</li> })}</ul>}
          </Card>
        </div>
        <div>
          <Card title="Templates">{db.templates.map((x) => <div key={x.id} className="check-row"><span><b>{x.name}</b> <span className="small muted">{x.channel}</span></span>{canEditTemplates(user) && <Button size="sm" variant="ghost" onClick={() => setTpl({ ...x })}>Edit</Button>}</div>)}</Card>
          <Card title="Sent recently">{db.messages.slice(0, 12).map((m) => <div key={m.id} className="check-row"><span>{m.name}<div className="small muted">{d(m.date)} {m.time} · {m.channel} · {m.by}</div></span></div>)}{!db.messages.length && <p className="muted" style={{ margin: 0 }}>Nothing sent yet.</p>}</Card>
        </div>
      </div>
      <Modal open={!!tpl} onClose={() => setTpl(null)} title="Template" footer={<><Button onClick={() => setTpl(null)}>Cancel</Button><Button variant="primary" onClick={() => { upsert('templates', { ...tpl, id: tpl.id || nextId('templates', 'TP-', 2) }); setTpl(null) }}>Save</Button></>}>
        {tpl && <div className="form fc2"><Field label="Name"><Input value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} /></Field><Field label="Channel"><Select options={['WhatsApp', 'Email']} value={tpl.channel} onChange={(e) => setTpl({ ...tpl, channel: e.target.value })} /></Field>
          <Field label="Body" span="all"><Textarea rows={7} value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} /></Field></div>}
      </Modal>
    </Page>
  )
}
