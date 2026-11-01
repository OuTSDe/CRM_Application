import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../../lib/store.jsx'
import { canWrite } from '../../lib/perms.js'
import { OPS } from '../../lib/seed.js'
import { Page, Card, Button, Badge, Grid, Stat, Modal, Check, Field, Input, Select, Textarea, Seg, Confirm, cx } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import RecordForm from '../../components/RecordForm.jsx'
import { d, today, nowTime, inr, lakh, n } from '../../lib/format.js'

const mins = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
const fmtM = (m) => `${m < 0 ? '-' : ''}${Math.floor(Math.abs(m) / 60) ? Math.floor(Math.abs(m) / 60) + 'h ' : ''}${Math.abs(m) % 60}m`

export function Trips() {
  const { db, user, upsert, nextId } = useStore()
  const nav = useNavigate()
  const [add, setAdd] = useState(null)
  return (
    <Page back={true} title="Sourcing trips" subtitle="Plan each trip as days and stops, then run it live: arrived, left, skipped, with the checklist and the vendor questions at hand."
      actions={canWrite(user, 'trips') && <Button variant="primary" onClick={() => setAdd({ name: '', from: today(), to: today(), team: user.name, purpose: '', projectId: db.projects[0]?.id })}>+ Trip</Button>}>
      <div className="mod-cards">{db.trips.map((t) => { const st = db.stops.filter((s) => s.tripId === t.id && !s.start && s.vendorId); const done = st.filter((s) => ['Left', 'Arrived'].includes(s.status)).length
        return <a key={t.id} className="mod-card" style={{ '--c': 'var(--m-sourcing)', cursor: 'pointer' }} onClick={() => nav('/sourcing/trips/' + t.id)}>
          <h3>{t.name}</h3><p>{d(t.from)} to {d(t.to)} · {(t.days || []).map((x) => x.city).filter((c, i, a) => a.indexOf(c) === i).join(', ')}</p>
          <p>{st.length} vendor stops · {done} visited · {db.quotes.filter((q) => q.tripId === t.id).length} quotes</p></a> })}</div>
      <Modal open={!!add} onClose={() => setAdd(null)} title="New trip" footer={<><Button onClick={() => setAdd(null)}>Cancel</Button><Button variant="primary" onClick={() => {
        const days = []; for (let x = new Date(add.from); x <= new Date(add.to); x.setDate(x.getDate() + 1)) days.push({ date: x.toISOString().slice(0, 10), city: '', area: '', flight: '', night: '' })
        const r = upsert('trips', { ...add, id: nextId('trips', 'TR-', 3), days, checklist: [], risks: [] }); if (r) nav('/sourcing/trips/' + r.id) }}>Create</Button></>}>
        {add && <RecordForm cols={2} value={add} onChange={setAdd} fields={[{ k: 'name', l: 'Trip name', span: 'all' }, { k: 'from', l: 'From', t: 'date' }, { k: 'to', l: 'To', t: 'date' }, { k: 'team', l: 'Team' }, { k: 'projectId', l: 'For project', t: 'select', o: db.projects.map((p) => ({ value: p.id, label: p.name })) }, { k: 'purpose', l: 'Purpose', t: 'textarea', span: 'all' }]} />}
      </Modal>
    </Page>
  )
}

export function TripDetail() {
  const { id } = useParams()
  const { db, user, upsert, remove, nextId, notify } = useStore()
  const trip = db.trips.find((t) => t.id === id)
  const t0 = today()
  const [day, setDay] = useState(() => trip?.days?.find((x) => x.date === t0)?.date || trip?.days?.[0]?.date)
  const [tab, setTab] = useState('day')
  const [stop, setStop] = useState(null)
  const [newItem, setNewItem] = useState('')
  if (!trip) return <Page back={true} title="Trip not found" />
  const can = canWrite(user, 'stops')
  const stops = db.stops.filter((s) => s.tripId === id && s.day === day).sort((a, b) => a.time.localeCompare(b.time))
  const D = trip.days.find((x) => x.date === day) || {}
  const mark = (s, status) => {
    const patch = { status }
    if (status === 'Arrived') patch.arrivedAt = nowTime(); if (status === 'Left') { patch.leftAt = nowTime(); if (!s.arrivedAt) patch.arrivedAt = s.time }
    if (status === 'Planned') Object.assign(patch, { arrivedAt: '', leftAt: '' })
    upsert('stops', { ...s, ...patch }, { action: status.toLowerCase() })
  }
  // running late: compare the latest actual time against plan
  const last = [...stops].reverse().find((s) => s.leftAt || s.arrivedAt)
  const drift = last ? (last.leftAt ? mins(last.leftAt) - mins(last.end || last.time) : mins(last.arrivedAt) - mins(last.time)) : 0
  const nextStop = stops.find((s) => s.status === 'Planned' && !s.maybe)
  const saveTrip = (patch) => upsert('trips', { ...trip, ...patch }, { silent: true })
  const all = db.stops.filter((s) => s.tripId === id && s.vendorId)
  return (
    <Page title={trip.name} back="/sourcing" backLabel="Trips" subtitle={`${d(trip.from)} to ${d(trip.to)} · ${trip.team} · ${trip.purpose || ''}`}
      actions={<><Seg options={[{ value: 'day', label: 'Day tracker' }, { value: 'check', label: `Checklist ${trip.checklist.filter((c) => c.done).length}/${trip.checklist.length}` }, { value: 'risks', label: 'Risks and roles' }]} value={tab} onChange={setTab} />
        {can && <Button variant="primary" onClick={() => setStop({ tripId: id, day, time: '10:00', end: '11:00', status: 'Planned', name: '' })}>+ Stop</Button>}</>}>
      <Grid cols={4}>
        <Stat label="Vendor stops" value={all.filter((s) => !s.maybe).length} sub={`${all.filter((s) => s.maybe).length} maybe`} />
        <Stat label="Visited" value={all.filter((s) => ['Arrived', 'Left'].includes(s.status)).length} tone="good" />
        <Stat label="Quotes logged" value={db.quotes.filter((q) => q.tripId === id).length} sub="against the BOQ" tone="info" />
        <Stat label="Samples" value={db.samples.filter((s) => s.tripId === id).length} tone="teal" />
      </Grid>
      {tab === 'day' && <>
        <div className="day-tabs">{trip.days.map((x, k) => <button key={x.date} className={cx('day-tab', x.date === day && 'on')} onClick={() => setDay(x.date)}><b>Day {k + 1} · {x.city || 'City'}</b><span>{d(x.date)}{x.date === t0 ? ' · today' : ''}</span></button>)}</div>
        <div className="split">
          <Card title={`${D.city || ''} · ${D.area || ''}`} actions={last && <Badge tone={drift > 15 ? 'bad' : drift > 0 ? 'warn' : 'good'}>{drift > 0 ? 'Running ' + fmtM(drift) + ' late' : drift < 0 ? fmtM(-drift) + ' ahead' : 'On time'}</Badge>}>
            {!stops.length && <div className="empty">No stops on this day yet.</div>}
            {stops.map((s) => { const v = db.vendors.find((x) => x.id === s.vendorId); const q = db.quotes.filter((x) => x.stopId === s.id).length
              return <div key={s.id} className={cx('stop', 'st-' + s.status)}>
                <div className="stop-time">{s.time}<small>to {s.end}</small>{s.arrivedAt && <small style={{ color: 'var(--good)' }}>in {s.arrivedAt}</small>}{s.leftAt && <small>out {s.leftAt}</small>}</div>
                <div><h4>{s.name} {s.maybe && <Badge tone="warn">Maybe</Badge>} {s.fixed && <Badge tone="info">Fixed time</Badge>} {s.status !== 'Planned' && <Badge>{s.status}</Badge>}</h4>
                  <div className="addr">{s.address}{s.contact ? ' · ' + s.contact : ''}</div>
                  {s.shortlist && <div className="small" style={{ marginTop: 4 }}>{s.shortlist}</div>}
                  {s.packages?.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{s.packages.map((p) => <span key={p} className="badge b-info">{db.packages.find((k) => k.id === p)?.name || p}</span>)}</div>}
                  {s.note && <div className="small muted" style={{ marginTop: 4 }}>Note: {s.note}</div>}
                  <div className="row gap-s" style={{ marginTop: 8 }}>
                    {s.address && <a className="btn btn-sm btn-ghost" target="_blank" rel="noreferrer" href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + s.address)}>Map</a>}
                    {s.contact && <a className="btn btn-sm btn-ghost" href={'tel:' + s.contact.replace(/[^\d+]/g, '')}>Call</a>}
                    {v && <Link className="btn btn-sm btn-ghost" to={'/vendors/' + v.id}>Vendor</Link>}
                    {v && <Link className="btn btn-sm" to={`/sourcing/quotes?vendor=${v.id}&stop=${s.id}&trip=${id}`}>+ Quote {q ? `(${q})` : ''}</Link>}
                    {can && <Button size="sm" variant="ghost" onClick={() => setStop({ ...s })}>Edit</Button>}
                  </div>
                </div>
                {can && <div className="row gap-s" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  {s.status === 'Planned' && <><Button size="sm" variant="primary" onClick={() => mark(s, 'Arrived')}>Arrived</Button><Button size="sm" variant="ghost" onClick={() => mark(s, 'Skipped')}>Skip</Button></>}
                  {s.status === 'Arrived' && <Button size="sm" variant="dark" onClick={() => mark(s, 'Left')}>Left</Button>}
                  {['Left', 'Skipped', 'Arrived'].includes(s.status) && <Button size="sm" variant="ghost" onClick={() => mark(s, 'Planned')}>Undo</Button>}
                </div>}
              </div> })}
          </Card>
          <div>
            <Card title="Today at a glance"><div className="kv"><dt>Flights</dt><dd>{D.flight || '–'}</dd><dt>Night</dt><dd>{D.night || '–'}</dd><dt>Next stop</dt><dd>{nextStop ? `${nextStop.time} · ${nextStop.name}` : 'Done for the day'}</dd></div>
              {can && <div className="form fc1" style={{ marginTop: 10 }}>{['city', 'area', 'flight', 'night'].map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><Input value={D[k]} onChange={(e) => saveTrip({ days: trip.days.map((x) => (x.date === day ? { ...x, [k]: e.target.value } : x)) })} /></Field>)}</div>}</Card>
            <Card title="Ask every vendor">{OPS.SIX_QUESTIONS.map((q, k) => <div key={k} className="check-row"><span>{k + 1}. {q}</span></div>)}</Card>
          </div>
        </div>
      </>}
      {tab === 'check' && <Card title="Booking checklist">
        {trip.checklist.map((c) => <div key={c.id} className="row between" style={{ padding: '7px 0', borderBottom: '1px dashed var(--line-2)' }}><Check label={c.text} checked={c.done} onChange={(x) => can && saveTrip({ checklist: trip.checklist.map((y) => (y.id === c.id ? { ...y, done: x } : y)) })} />
          {can && <Button size="sm" variant="ghost" onClick={() => saveTrip({ checklist: trip.checklist.filter((y) => y.id !== c.id) })}>×</Button>}</div>)}
        {can && <div className="row" style={{ marginTop: 10 }}><input className="input" style={{ flex: 1 }} value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a booking or prep item" onKeyDown={(e) => e.key === 'Enter' && newItem && (saveTrip({ checklist: [...trip.checklist, { id: 'C' + Date.now().toString(36), text: newItem, done: false }] }), setNewItem(''))} /><Button onClick={() => { if (newItem) { saveTrip({ checklist: [...trip.checklist, { id: 'C' + Date.now().toString(36), text: newItem, done: false }] }); setNewItem('') } }}>Add</Button></div>}
      </Card>}
      {tab === 'risks' && <div className="grid g2"><Card title="Risks and open questions">{(trip.risks || []).map((r, k) => <div key={k} className="check-row"><span>{r}</span></div>)}
        {can && <Textarea rows={2} placeholder="Add a risk and press Enter" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && e.target.value) { e.preventDefault(); saveTrip({ risks: [...(trip.risks || []), e.target.value] }); e.target.value = '' } }} />}</Card>
        <Card title="Who does what"><p style={{ marginTop: 0 }}>{trip.roles || 'Not set.'}</p>{can && <Textarea rows={3} value={trip.roles} onChange={(e) => saveTrip({ roles: e.target.value })} />}</Card></div>}
      <Modal open={!!stop} onClose={() => setStop(null)} title={stop?.id ? 'Edit stop' : 'New stop'} wide footer={<>{stop?.id && <Confirm label="Delete stop?" onConfirm={() => { remove('stops', stop.id); setStop(null) }}>Delete</Confirm>}<Button onClick={() => setStop(null)}>Cancel</Button>
        <Button variant="primary" onClick={() => { if (!stop.name) return notify('Name the stop', 'bad'); const v = db.vendors.find((x) => x.id === stop.vendorId); upsert('stops', { ...stop, id: stop.id || nextId('stops', 'ST-', 2), address: stop.address || v?.address || '', contact: stop.contact || v?.phone || '' }); setStop(null) }}>Save</Button></>}>
        {stop && <RecordForm value={stop} onChange={setStop} fields={[{ k: 'name', l: 'Stop', span: 2 }, { k: 'vendorId', l: 'Vendor', t: 'select', o: db.vendors.map((v) => ({ value: v.id, label: v.name })) },
          { k: 'day', l: 'Day', t: 'select', o: trip.days.map((x) => ({ value: x.date, label: d(x.date) + ' · ' + x.city })) }, { k: 'time', l: 'Planned arrival', t: 'time' }, { k: 'end', l: 'Planned departure', t: 'time' },
          { k: 'address', l: 'Address', span: 2 }, { k: 'contact', l: 'Phone' }, { k: 'shortlist', l: 'What to see / shortlist', t: 'textarea', span: 'all' },
          { k: 'fixed', l: 'Fixed appointment?', t: 'select', o: [{ value: true, label: 'Yes' }, { value: '', label: 'No' }] }, { k: 'maybe', l: 'Maybe stop?', t: 'select', o: [{ value: true, label: 'Yes' }, { value: '', label: 'No' }] }, { k: 'status', l: 'Status', t: 'select', o: ['Planned', 'Arrived', 'Left', 'Skipped', 'Dropped'] },
          { k: 'note', l: 'Note', t: 'textarea', span: 'all' }]} />}
      </Modal>
    </Page>
  )
}

export function Quotes() {
  const { db, user, upsert, nextId, notify } = useStore()
  const [qs] = useSearchParams()
  const [edit, setEdit] = useState(null)
  useEffect(() => { if (qs.get('vendor')) openNew({ vendorId: qs.get('vendor'), stopId: qs.get('stop') || '', tripId: qs.get('trip') || '' }) }, []) // eslint-disable-line
  function openNew(p = {}) { setEdit({ date: today(), status: 'Received', answers: {}, unit: 'sqft', by: user.name, ...p }) }
  const boqOpts = db.boq.map((b) => ({ value: b.id, label: `${b.id} · ${b.item} (${b.qty} ${b.unit} @ ${inr(b.rate)})` }))
  const can = canWrite(user, 'quotes')
  return (
    <Page back={true} title="Quotes" subtitle="Every quote against its BOQ line, with the six standard answers so vendors compare like for like." actions={can && <Button variant="primary" onClick={() => openNew()}>+ Quote</Button>}>
      <DataTable rows={db.quotes.map((q) => ({ ...q, vendor: db.vendors.find((v) => v.id === q.vendorId)?.name, line: db.boq.find((b) => b.id === q.boqId) }))} initialSort={{ key: 'date', dir: 'desc' }} searchKeys={['vendor', 'item', 'boqId']}
        filters={[{ key: 'vendor', label: 'Vendor' }, { key: 'status', label: 'Status' }]} onRowClick={(q) => can && setEdit({ ...q, vendor: undefined, line: undefined })} empty="No quotes yet. Add them from a stop on the day tracker or here."
        columns={[{ key: 'id', label: 'Quote' }, { key: 'date', label: 'Date', render: (q) => d(q.date) }, { key: 'vendor', label: 'Vendor' }, { key: 'item', label: 'Item', render: (q) => <div>{q.item}<div className="small muted">{q.boqId} · {q.line?.item}</div></div> },
          { key: 'rate', label: 'Rate', align: 'right', render: (q) => `${inr(q.rate)}/${q.unit}` }, { key: 'vs', label: 'vs budget', align: 'right', sortValue: (q) => (q.line ? q.rate / q.line.rate : 0), render: (q) => q.line?.rate ? <Badge tone={q.rate > q.line.rate ? 'bad' : 'good'}>{((q.rate / q.line.rate - 1) * 100).toFixed(0)}%</Badge> : '–' },
          { key: 'leadTime', label: 'Lead time' }, { key: 'answered', label: '6 Qs', render: (q) => `${Object.values(q.answers || {}).filter(Boolean).length}/6` }, { key: 'status', label: 'Status', render: (q) => <Badge>{q.status}</Badge> }]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Quote ' + edit.id : 'New quote'} wide footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => {
        if (!edit.vendorId || !edit.rate) return notify('Vendor and rate are needed', 'bad')
        upsert('quotes', { ...edit, id: edit.id || nextId('quotes', 'QT-', 4), item: edit.item || db.boq.find((b) => b.id === edit.boqId)?.item || '' }, { action: 'quote saved' }); setEdit(null) }}>Save</Button></>}>
        {edit && <>
          <RecordForm value={edit} onChange={(x) => { const b = db.boq.find((y) => y.id === x.boqId); setEdit(x.boqId !== edit.boqId && b ? { ...x, unit: b.unit } : x) }} fields={[
            { k: 'vendorId', l: 'Vendor', t: 'select', o: db.vendors.map((v) => ({ value: v.id, label: v.name })), req: true }, { k: 'boqId', l: 'BOQ line', t: 'select', o: boqOpts, span: 2 },
            { k: 'item', l: 'Product / model', span: 2 }, { k: 'date', l: 'Date', t: 'date' }, { k: 'rate', l: 'Rate (₹, before GST)', t: 'number', req: true }, { k: 'unit', l: 'Per', t: 'select', o: ['sqft', 'rft', 'nos', 'sets', 'lot', 'sqm'] }, { k: 'gst', l: 'GST %', t: 'number' },
            { k: 'leadTime', l: 'Lead time' }, { k: 'validity', l: 'Valid till', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: ['Requested', 'Received', 'Negotiating', 'Selected', 'Rejected'] }]} />
          <div className="form-section" style={{ marginTop: 14 }}>The six questions</div>
          <div className="form fc2">{OPS.SIX_QUESTIONS.map((q, k) => <Field key={k} label={`${k + 1}. ${q}`}><Input value={edit.answers?.[k]} onChange={(e) => setEdit({ ...edit, answers: { ...edit.answers, [k]: e.target.value } })} /></Field>)}</div>
          <Field label="Notes"><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
        </>}
      </Modal>
    </Page>
  )
}

export function Compare() {
  const { db, user, upsert } = useStore()
  const [pkg, setPkg] = useState('')
  const can = canWrite(user, 'boq')
  const lines = db.boq.filter((b) => !pkg || b.packageId === pkg)
  return (
    <Page back={true} title="Compare quotes" subtitle="Each BOQ line with its budget and every quote received. Select the winning quote and the BOQ total updates in Accord."
      actions={<Select options={db.packages.map((p) => ({ value: p.id, label: p.name }))} placeholder="All packages" value={pkg} onChange={(e) => setPkg(e.target.value)} />}>
      {lines.map((b) => { const qs = db.quotes.filter((q) => q.boqId === b.id).sort((a, z) => a.rate - z.rate); const best = qs[0]
        return <Card key={b.id} title={`${b.id} · ${b.item}`} actions={<span className="small muted">{b.qty} {b.unit} · budget {inr(b.rate)} = {lakh(b.qty * b.rate)}</span>}>
          {!qs.length ? <span className="muted small">No quotes yet.</span> : <table className="table dense"><thead><tr><th>Vendor</th><th>Product</th><th className="right">Rate</th><th className="right">Line total</th><th className="right">vs budget</th><th>Lead time</th><th>Freight</th><th></th></tr></thead>
            <tbody>{qs.map((q) => { const v = db.vendors.find((x) => x.id === q.vendorId); const sel = b.selectedQuote === q.id
              return <tr key={q.id} style={sel ? { background: 'var(--good-soft)' } : null}><td><b>{v?.name}</b>{q === best && <Badge tone="good"> lowest</Badge>}</td><td>{q.item}</td><td className="right">{inr(q.rate)}</td><td className="right">{lakh(q.rate * b.qty)}</td>
                <td className="right"><Badge tone={q.rate > b.rate ? 'bad' : 'good'}>{b.rate ? ((q.rate / b.rate - 1) * 100).toFixed(0) + '%' : '–'}</Badge></td><td>{q.leadTime || q.answers?.[1]}</td><td>{q.answers?.[2]}</td>
                <td>{can && (sel ? <Button size="sm" onClick={() => upsert('boq', { ...b, selectedQuote: null }, { action: 'quote unselected' })}>Selected ✓</Button> : <Button size="sm" variant="primary" onClick={() => { upsert('boq', { ...b, selectedQuote: q.id }, { action: 'quote selected' }); upsert('quotes', { ...q, status: 'Selected' }, { silent: true }) }}>Select</Button>)}</td></tr> })}</tbody></table>}
        </Card> })}
    </Page>
  )
}

export function Samples() {
  const { db, user, upsert, nextId } = useStore()
  const [edit, setEdit] = useState(null)
  const can = canWrite(user, 'samples')
  const S = ['Requested', 'Collected', 'Couriered', 'Received at studio', 'Approved', 'Rejected']
  return (
    <Page back={true} title="Samples" subtitle="Every sample from request to approval, so nothing gets lost between the showroom and the studio." actions={can && <Button variant="primary" onClick={() => setEdit({ status: 'Requested', date: today(), by: user.name, tripId: db.trips[0]?.id })}>+ Sample</Button>}>
      <Grid cols={6}>{S.map((s) => <Stat key={s} label={s} value={db.samples.filter((x) => x.status === s).length} />)}</Grid>
      <DataTable rows={db.samples.map((s) => ({ ...s, vendor: db.vendors.find((v) => v.id === s.vendorId)?.name }))} searchKeys={['item', 'vendor']} filters={[{ key: 'status', label: 'Status' }, { key: 'vendor', label: 'Vendor' }]} onRowClick={(s) => can && setEdit({ ...s, vendor: undefined })} empty="No samples logged yet."
        columns={[{ key: 'id', label: 'ID' }, { key: 'item', label: 'Sample' }, { key: 'vendor', label: 'Vendor' }, { key: 'boqId', label: 'BOQ line' }, { key: 'date', label: 'Logged', render: (s) => d(s.date) }, { key: 'courier', label: 'Courier / AWB' }, { key: 'status', label: 'Status', render: (s) => <Badge>{s.status}</Badge> }]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Sample" footer={<><Button onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={() => { upsert('samples', { ...edit, id: edit.id || nextId('samples', 'SM-', 3) }); setEdit(null) }}>Save</Button></>}>
        {edit && <RecordForm cols={2} value={edit} onChange={setEdit} fields={[{ k: 'item', l: 'Sample', span: 'all' }, { k: 'vendorId', l: 'Vendor', t: 'select', o: db.vendors.map((v) => ({ value: v.id, label: v.name })) }, { k: 'boqId', l: 'BOQ line', t: 'select', o: db.boq.map((b) => ({ value: b.id, label: b.id + ' · ' + b.item })) },
          { k: 'status', l: 'Status', t: 'select', o: S }, { k: 'courier', l: 'Courier / AWB' }, { k: 'date', l: 'Date', t: 'date' }, { k: 'tripId', l: 'Trip', t: 'select', o: db.trips.map((t) => ({ value: t.id, label: t.name })) }, { k: 'notes', l: 'Notes', t: 'textarea', span: 'all' }]} />}
      </Modal>
    </Page>
  )
}
