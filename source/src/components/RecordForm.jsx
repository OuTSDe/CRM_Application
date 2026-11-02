import React from 'react'
import { Input, Select, Textarea, Chips, cx } from './ui.jsx'
import { META } from '../lib/seed.js'

// Schema-driven form.
// field: { k, l, t = text|number|date|time|select|textarea|chips|email|tel, o: options or META list name, span, ro, auto, hint, req }
// section: { section: 'Basic information', n: '1', note }   ← a band, like the group headings on the CRM master tabs
// sheet: render as the master sheet reads: numbered bands, typed cells solid, auto cells dashed and labelled AUTO.
// errors: { key: 'message' } marks those cells red with the reason under them (2 Nov: a refused save must say why, where).
export default function RecordForm({ fields, value, onChange, cols = 3, readOnly, sheet, legend = true, errors = {} }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const cell = (f) => {
    const opts = typeof f.o === 'string' ? META.lists[f.o] || [] : f.o
    const v = typeof f.calc === 'function' ? f.calc(value || {}) : value?.[f.k]
    const ro = readOnly || f.ro || f.auto
    let el
    if (f.render) el = f.render(value || {}, set)
    else if (f.t === 'select' && !ro) el = <Select options={opts} value={v} onChange={(e) => set(f.k, e.target.value)} />
    else if (f.t === 'textarea') el = <Textarea value={v} disabled={ro} rows={f.rows || 3} onChange={(e) => set(f.k, e.target.value)} />
    else if (f.t === 'chips') el = <Chips options={opts} value={v || []} onChange={(x) => !ro && set(f.k, x)} />
    else el = <><Input type={ro && f.t === 'select' ? 'text' : f.t || 'text'} value={f.fmt ? f.fmt(v) : v} disabled={ro} step={f.step || 'any'} min={f.min} list={f.suggest ? 'dl-' + f.k : f.list} placeholder={f.ph}
      onChange={(e) => { let x = f.t === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value; if (f.t === 'number' && f.min !== undefined && x !== '' && x < f.min) x = f.min; set(f.k, x) }} />
      {f.suggest && <datalist id={'dl-' + f.k}>{f.suggest.map((o) => <option key={o} value={o} />)}</datalist>}</>
    const label = <>{f.l}{f.req ? ' *' : ''}{f.auto && <span className="tag">AUTO</span>}</>
    const err = errors[f.k] && !(v !== undefined && v !== '' && v !== null && errors[f.k] === 'Required')
    return <label key={f.k} className={cx('field', f.span && 'span-' + f.span, f.auto && 'auto', err && 'invalid')} data-field={f.k}><span className="field-label">{label}</span>{el}{err ? <span className="field-err">{errors[f.k]}</span> : f.hint && <span className="hint">{f.hint}</span>}</label>
  }
  if (!sheet) {
    return (
      <div className={cx('form', 'fc' + cols)}>
        {fields.map((f) => f.section ? <h4 key={f.section} className="form-section span-all">{f.n ? f.n + ' · ' : ''}{f.section}</h4> : cell(f))}
      </div>
    )
  }
  const groups = []
  fields.forEach((f) => { if (f.section) groups.push({ ...f, items: [] }); else { if (!groups.length) groups.push({ section: '', items: [] }); groups[groups.length - 1].items.push(f) } })
  return (
    <div className="sheet">
      {legend && <div className="sheet-key"><span><i />You type it</span><span><i className="a" />Worked out by Accord, cannot be overwritten</span><span>* required</span></div>}
      {groups.map((g, gi) => (
        <React.Fragment key={g.section || gi}>
          {g.section && <div className="sheet-band">{g.n && <span className="n">{g.n}</span>}<h4>{g.section}</h4>{g.note && <span className="note2">{g.note}</span>}</div>}
          <div className="sheet-grid" style={{ '--cols': g.cols || cols }}>
            {g.items.map(cell)}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
export const missingKeys = (fields, v) => fields.filter((f) => f.req && (v?.[f.k] === undefined || v?.[f.k] === '' || v?.[f.k] === null || (Array.isArray(v?.[f.k]) && !v[f.k].length))).map((f) => f.k)
export const missingRequired = (fields, v) => fields.filter((f) => f.req && (v?.[f.k] === undefined || v?.[f.k] === '' || v?.[f.k] === null)).map((f) => f.l)
