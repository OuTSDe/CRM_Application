import { targetFor } from '../lib/links.js'
import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { META } from '../lib/seed.js'
import { Modal, Button, Field, Select, Textarea, Input, Badge, DraftNote } from './ui.jsx'
import { useDraftSlot } from '../lib/drafts.js'
import RecordPicker from './RecordPicker.jsx'
import { today, nowTime, addDays, d, dueAtOf, hm12 } from '../lib/format.js'

export const recordType = (id = '') => (id.startsWith('YSC-C') ? 'Client' : id.startsWith('YSC-L') ? 'Lead' : id.startsWith('YSC-B') ? 'Booking' : '')

// Log a call, WhatsApp, visit or meeting. Date and time are stamped automatically; the record type comes from the ID.
export default function LogInteraction({ open, onClose, recordId: rid0, preset = {} }) {
  const { db, raw, user } = useStore()
  const blank = () => ({ recordId: rid0 || '', mode: 'Call - outgoing', purpose: 'Follow-up', outcome: '', summary: '', nextAction: '', nextDate: addDays(today(), 2), nextTime: '10:00', nextOwners: [user?.name], ...preset })
  // 7 Nov: what is typed is kept as a draft per record, so closing or going back does not lose it
  const here = (window.location.hash || '').slice(1).split('?')[0] || '/'
  const dkey = 'log:' + (rid0 || 'new')
  const [sv, setSv, slot] = useDraftSlot(dkey, { uid: user?.id, label: 'Interaction' + (rid0 ? ' · ' + rid0 : ''), route: here + '?draft=' + dkey })
  useEffect(() => { if (open) slot.open(blank()); else if (sv) slot.close() }, [open, rid0]) // eslint-disable-line
  const v = sv || blank()
  const setV = (f) => setSv((s) => (typeof f === 'function' ? f(s || blank()) : f))
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }))
  const close = () => { slot.close(); onClose() }
  const rec = db.clients.find((c) => c.clientId === v.recordId) || db.leads.find((l) => l.id === v.recordId)
  const team = raw.users.filter((u) => u.appRole !== 'none' && u.active !== 'No' && u.team !== 'External' && ['admin', 'senior', 'sales', 'finance'].includes(u.appRole)).map((u) => u.name)
  const saveOne = useLogSaver()
  const save = () => { if (saveOne(v)) { slot.done(); onClose() } }
  return (
    <Modal open={open} onClose={close} title="Log interaction" wide footer={<><Button onClick={close}>Close (draft kept)</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <DraftNote at={slot.restoredAt} onDiscard={() => { slot.discard() }} />
      <div className="form fc3">
        <Field label="With (name, ID, flat no. or phone)" span={2}><RecordPicker value={v.recordId} onChange={(id) => set('recordId', id)} /></Field>
        <Field label="Logged"><Input value={`${d(today())}, ${nowTime()} · ${user?.name}`} disabled /></Field>
        {rec && <div className="span-all note info" style={{ margin: 0 }}>
          <b>{recordType(v.recordId)}</b> · {rec.name} · {rec.phone || 'no phone'} · {rec.city || rec.country || rec.residency || ''} {rec.unit ? '· Flat ' + rec.unit : ''} {rec.stage ? '· ' + rec.stage : ''} {rec.status ? '· ' + rec.status : ''}
        </div>}
        <Field label="Mode"><Select options={META.lists['Contact mode']} value={v.mode} onChange={(e) => set('mode', e.target.value)} /></Field>
        <Field label="Purpose"><Select options={META.lists['Contact purpose']} value={v.purpose} onChange={(e) => set('purpose', e.target.value)} /></Field>
        <Field label="Outcome"><Select options={META.lists.Outcome} value={v.outcome} onChange={(e) => set('outcome', e.target.value)} /></Field>
        <Field label="Summary" span="all"><Textarea rows={3} value={v.summary} onChange={(e) => set('summary', e.target.value)} placeholder="What was discussed, what they asked for" /></Field>
        <Field label="Next action"><Input value={v.nextAction} onChange={(e) => set('nextAction', e.target.value)} placeholder="e.g. Share cost sheet for 3204" /></Field>
        <Field label="Next follow-up date" hint={v.nextDate ? 'Reminder at ' + hm12(v.nextTime || '10:00') + ' on ' + d(v.nextDate) : 'No follow-up: the entry closes'}><Input type="date" value={v.nextDate} onChange={(e) => set('nextDate', e.target.value)} /></Field>
        <Field label="Follow-up time" hint="The reminder comes at this time on the day"><Input type="time" step={300} value={v.nextTime || ''} disabled={!v.nextDate} onChange={(e) => set('nextTime', e.target.value)} /></Field>
        <Field label="Follow-up owners" span="all" hint="Everyone picked gets a reminder on the date: in Accord, on this device if allowed, and by e-mail when the shared database is connected"><div className="chips">{team.map((n) => { const on = (v.nextOwners || []).includes(n)
          return <button type="button" key={n} aria-pressed={on} className={'chip' + (on ? ' on' : '')} onClick={() => set('nextOwners', on ? v.nextOwners.filter((x) => x !== n) : [...(v.nextOwners || []), n])}>{n}</button> })}</div></Field>
      </div>
      <div className="row gap-s" style={{ marginTop: 10 }}>
        <span className="small muted">Quick dates:</span>
        {[['Tomorrow', 1], ['2 days', 2], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]].map(([l, k]) => <button key={l} type="button" className="chip" onClick={() => set('nextDate', addDays(today(), k))}>{l}</button>)}
        <button type="button" className="chip" onClick={() => set('nextDate', '')}>No follow-up</button>
      </div>
      {v.nextDate && <div className="row gap-s" style={{ marginTop: 6 }}>
        <span className="small muted">Quick times:</span>
        {['10:00', '12:00', '15:00', '17:00', '19:00'].map((x) => <button key={x} type="button" className={'chip' + (v.nextTime === x ? ' on' : '')} aria-pressed={v.nextTime === x} onClick={() => set('nextTime', x)}>{hm12(x)}</button>)}
      </div>}
    </Modal>
  )
}

// One interaction saved the same way from the single form and the bulk log: closes earlier open follow-ups on that
// record, notifies every follow-up owner, and moves a lead's stage on after a call or site visit.
export function useLogSaver() {
  const { db, user, upsert, nextId, notify, pushNote } = useStore()
  return (v, { quiet } = {}) => {
    const rec = db.clients.find((c) => c.clientId === v.recordId) || db.leads.find((l) => l.id === v.recordId)
    if (!v.recordId) { notify('Pick who this interaction is with', 'bad'); return false }
    if (!String(v.summary || '').trim()) { notify('Write a short summary' + (rec ? ' for ' + rec.name : ''), 'bad'); return false }
    const closeOld = db.interactions.filter((i) => i.recordId === v.recordId && i.status === 'Open')
    closeOld.forEach((i) => upsert('interactions', { ...i, status: 'Done' }, { silent: true }))
    const owners = v.nextOwners?.length ? v.nextOwners : [user.name]
    const id = nextId('interactions', 'I-', 4)
    upsert('interactions', { id, date: today(), time: nowTime(), by: user.name, type: recordType(v.recordId), ...v, nextOwners: owners, nextOwner: owners[0], recordName: rec?.name || '', nextTime: v.nextDate ? (v.nextTime || '10:00') : '', status: v.nextDate ? 'Open' : 'Done' }, { action: 'logged', silent: quiet })
    if (v.nextDate) owners.forEach((o) => pushNote(o, { kind: 'followup', title: 'Follow up: ' + (rec?.name || v.recordId), body: (v.nextAction || 'Follow up') + (o === user.name ? '' : ' · set by ' + user.name), link: 'i:' + id, target: targetFor(db, v.recordId, id), dueAt: dueAtOf(v.nextDate, v.nextTime) }))
    if (recordType(v.recordId) === 'Lead' && rec) {
      const patch = {}
      if (v.mode === 'Site visit') { patch.svDone = 'Yes'; patch.svDate = today(); if (['New', 'Contacted', 'Qualified', 'Site visit scheduled'].includes(rec.stage)) patch.stage = 'Site visit done' }
      else if (rec.stage === 'New') patch.stage = 'Contacted'
      if (Object.keys(patch).length) upsert('leads', { ...rec, ...patch }, { silent: true })
    }
    if (!quiet) notify('Interaction logged' + (v.nextDate ? ` · reminder for ${owners.join(' and ')} on ${d(v.nextDate)} at ${hm12(v.nextTime || '10:00')}` : '') + (closeOld.length ? `; ${closeOld.length} earlier follow-up closed` : ''))
    return true
  }
}
export const OutcomeBadge = ({ v }) => <Badge tone={{ Positive: 'good', 'Payment received': 'good', 'Payment committed': 'good', Negative: 'bad', 'No answer': 'muted', 'Call back requested': 'warn' }[v]}>{v}</Badge>
