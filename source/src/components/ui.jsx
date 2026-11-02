import { fixCommon } from '../lib/spell.js'
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export const cx = (...a) => a.filter(Boolean).join(' ')

export function BackLink({ to, children = 'Back' }) {
  const nav = useNavigate()
  const arrow = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
  if (to) return <Link className="back" to={to}>{arrow}{children}</Link>
  return <button type="button" className="back" style={{ background: 'none' }} onClick={() => nav(-1)}>{arrow}{children}</button>
}
// back: an element, a path string ("/crm/clients"), or true for "go back one step"
export function Page({ title, subtitle, actions, children, back, backLabel, tone }) {
  useEffect(() => { document.title = title ? `${typeof title === 'string' ? title : 'Accord'} · Accord` : 'Accord' }, [title])
  const b = back === true ? <BackLink>{backLabel || 'Back'}</BackLink> : typeof back === 'string' ? <BackLink to={back}>{backLabel || 'Back'}</BackLink> : back
  return (
    <div className={cx('page', tone && 'tone-' + tone)}>
      {b && <div>{b}</div>}
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
// Rupee figures only for roles that may see them (30 Oct: sales sees status, never the number).
export const Locked = ({ children = 'With finance' }) => <span className="locked"><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" /><path d="M4.5 6V4a2.5 2.5 0 0 1 5 0v2" /></svg>{children}</span>
export const Card = ({ title, actions, children, className, pad = true, tone }) => (
  <section className={cx('card', className, tone && 'tone-' + tone)}>
    {(title || actions) && <div className="card-head"><h3>{title}</h3>{actions && <div className="actions">{actions}</div>}</div>}
    <div className={pad ? 'card-body' : ''}>{children}</div>
  </section>
)
export const Grid = ({ cols = 3, children, className, joined = true }) => <div className={cx(joined ? 'stats grid' : 'grid', 'g' + cols, className)} style={joined ? { gap: 1 } : undefined}>{children}</div>
export const Stat = ({ label, value, sub, tone, onClick }) => (
  <div className={cx('stat', tone && 'tone-' + tone, onClick && 'click', typeof value === 'string' && value.length > 11 && 'long')} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
)
const TONES = { Red: 'bad', Amber: 'warn', Green: 'good', High: 'bad', Medium: 'warn', Low: 'muted', Hot: 'bad', Warm: 'warn', Cold: 'muted', Lost: 'muted', Dormant: 'muted',
  Open: 'info', Done: 'good', Resolved: 'good', Pending: 'bad', Received: 'good', Verified: 'good', 'To verify': 'warn', Approved: 'good', Rejected: 'bad', Applied: 'info',
  'Under review': 'warn', Overdue: 'bad', 'Overdue 60+ days': 'bad', 'Due this week': 'warn', 'Not yet due': 'info', 'On break': 'warn', 'Site visit': 'info', Remote: 'purple', 'In office': 'good', Shortlisted: 'info', Active: 'good', 'Under cancellation': 'warn', Transferred: 'purple', 'Shifted unit': 'info', Available: 'muted',
  Booked: 'accent', Arrived: 'good', Left: 'muted', Skipped: 'muted', Planned: 'info', 'In viewing': 'warn', 'On site': 'warn', Completed: 'good', Cancelled: 'muted', 'No-show': 'bad',
  Yes: 'good', No: 'muted', Paid: 'good', 'Paid up': 'good', '60+ days': 'bad', 'Due, date not set': 'warn', Present: 'good', Late: 'warn', Absent: 'bad' }
export const Badge = ({ children, tone }) => children === undefined || children === null || children === '' ? <span className="muted">–</span> :
  <span className={cx('badge', 'b-' + (tone || TONES[children] || 'plain'))}>{children}</span>
export const Button = ({ children, variant = 'default', size, icon, className, ...p }) => (
  <button className={cx('btn', 'btn-' + variant, size && 'btn-' + size, className)} {...p}>{icon && <span className="ico">{icon}</span>}{children}</button>
)
export const Field = ({ label, children, hint, span }) => (
  <label className={cx('field', span && 'span-' + span)}><span className="field-label">{label}</span>{children}{hint && <span className="hint">{hint}</span>}</label>
)
// Spelling (2 Nov): text boxes are checked by the browser in English (India); notes boxes also fix common slips when you leave them.
export const Input = (p) => <input className="input" spellCheck={!p.type || p.type === 'text' || p.type === 'search' ? undefined : false} {...p} value={p.value ?? ''} />
export const Textarea = ({ onBlur, ...p }) => <textarea className="input" rows={p.rows || 3} spellCheck autoCorrect="on" autoCapitalize="sentences" {...p} value={p.value ?? ''}
  onBlur={(e) => { const v = e.target.value, f = fixCommon(v); if (f !== v && p.onChange && !p.disabled && !p.readOnly) p.onChange({ target: { value: f } }); onBlur?.(e) }} />
export function Select({ options = [], value, onChange, placeholder = 'Select…', ...p }) {
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }))
  return (
    <select className="input" value={value ?? ''} onChange={onChange} {...p}>
      <option value="">{placeholder}</option>
      {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('modal', wide && 'modal-wide')} role="dialog" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs">{tabs.map((t) => { const v = typeof t === 'object' ? t.value : t; const l = typeof t === 'object' ? t.label : t
    return <button key={v} className={cx('tab', v === value && 'on')} onClick={() => onChange(v)}>{l}</button> })}</div>
}
export const Empty = ({ children = 'Nothing here yet.', action }) => <div className="empty"><p>{children}</p>{action}</div>
export const Bar = ({ value = 0, tone = 'accent', label }) => (
  <div className="bar" title={label}><div className={cx('bar-fill', 'bg-' + tone)} style={{ width: Math.max(0, Math.min(100, value * 100)) + '%' }} /></div>
)
export const KV = ({ rows }) => (
  <dl className="kv">{rows.filter(Boolean).map(([k, v], i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v === undefined || v === null || v === '' ? <span className="missing">Missing</span> : v}</dd></React.Fragment>)}</dl>
)
export function Confirm({ children, onConfirm, label = 'Are you sure?', variant = 'ghost', size }) {
  const [ask, setAsk] = useState(false)
  if (!ask) return <Button variant={variant} size={size} onClick={() => setAsk(true)}>{children}</Button>
  return <span className="confirm"><span>{label}</span><Button size="sm" variant="danger" onClick={() => { setAsk(false); onConfirm() }}>Yes</Button><Button size="sm" onClick={() => setAsk(false)}>No</Button></span>
}
export const Check = ({ checked, onChange, label }) => (
  <label className={cx('check', checked && 'on')}><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span className="box" />{label}</label>
)
export const Chips = ({ options, value = [], onChange }) => (
  <div className="chips">{options.map((o) => { const on = value.includes(o)
    return <button type="button" key={o} className={cx('chip', on && 'on')} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>{o}</button> })}</div>
)
export const Seg = ({ options, value, onChange }) => (
  <div className="seg">{options.map((o) => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o
    return <button type="button" key={v} className={cx(v === value && 'on')} onClick={() => onChange(v)}>{l}</button> })}</div>
)
