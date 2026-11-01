import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore, daySums } from '../lib/store.jsx'
import { canOpen, ROLES, WORKSPACES, workspacesOf } from '../lib/perms.js'
import { setTheme } from '../lib/theme.js'
import { initials, d } from '../lib/format.js'
import { cx, Button, Modal } from './ui.jsx'

// Navigation per platform. [path, label, module, exact]
export const NAV = {
  sales: [
    { label: 'Today', items: [['/', 'Dashboard', 'crm', true], ['/crm/interactions', 'Interaction log', 'crm'], ['/people/tasks', 'Tasks', 'people']] },
    { label: 'Clients', items: [['/crm/leads', 'Leads', 'crm'], ['/crm/clients', 'Client 360', 'crm'], ['/crm/payments', 'Payments', 'crm'], ['/crm/documents', 'Documents', 'crm'], ['/crm/messages', 'Messages', 'crm'], ['/crm/issues', 'Issues', 'crm']] },
    { label: 'Selling', items: [['/crm/cost-sheet', 'Cost sheet', 'crm'], ['/crm/inventory', 'Building and parking', 'crm'], ['/presales', 'Private viewings', 'presales'], ['/brochure', 'e-Brochure', 'brochure'], ['/experience', 'Accord experience', 'experience']] },
    { label: 'Team', items: [['/people', 'Time', 'people', true], ['/people/team', 'Team', 'people'], ['/people/performance', 'Performance', 'performance']] },
  ],
  design: [
    { label: 'Design', items: [['/', 'Overview', 'accord', true], ['/experience', 'Accord experience', 'experience'], ['/accord', 'Projects and BOQ', 'accord', true], ['/accord/residences', 'Residences', 'accord'], ['/presales/showcase', 'Design showcase', 'presales']] },
    { label: 'Sourcing', items: [['/sourcing', 'Trips', 'sourcing', true], ['/sourcing/quotes', 'Quotes', 'sourcing'], ['/sourcing/compare', 'Compare', 'sourcing'], ['/sourcing/samples', 'Samples', 'sourcing']] },
    { label: 'Team', items: [['/people', 'Time', 'people', true], ['/people/tasks', 'Tasks', 'people']] },
  ],
  vendors: [
    { label: 'Vendors', items: [['/', 'Overview', 'vendors', true], ['/vendors', 'Vendor directory', 'vendors', true], ['/apply/vendor', 'Onboarding form', 'vendors']] },
    { label: 'Sourcing', items: [['/sourcing/quotes', 'Quotes', 'sourcing'], ['/sourcing/samples', 'Samples', 'sourcing']] },
    { label: 'Team', items: [['/people', 'Time', 'people', true], ['/people/tasks', 'Tasks', 'people']] },
  ],
}
const ADMIN = { label: 'Admin', items: [['/admin', 'Settings', 'admin', true], ['/admin/users', 'Users and access', 'admin'], ['/admin/data', 'Data and sync', 'admin'], ['/admin/cleanup', 'Data clean-up', 'admin']] }
export const STATE_LABEL = { office: 'In office', break: 'On break', site: 'Site visit', remote: 'Remote', out: 'Punched out' }
const hm = (m) => `${Math.floor((m || 0) / 60)}h ${String((m || 0) % 60).padStart(2, '0')}m`

export function useWorkspace() {
  const { user } = useStore()
  const all = workspacesOf(user)
  const [ws, setWs] = useState(() => { try { const s = localStorage.getItem('accord.ws.' + user?.id); return all.includes(s) ? s : all[0] } catch (e) { return all[0] } })
  const choose = (w) => { setWs(w); try { localStorage.setItem('accord.ws.' + user?.id, w) } catch (e) { /* */ } }
  return [all.includes(ws) ? ws : all[0], choose, all]
}

export default function Layout() {
  const { user, logout, sync, backend, punchedIn, myDay, punch, notify, db, markRead, demo, toggleDemo, settings } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [ws, setWs, wsAll] = useWorkspace()
  const [menu, setMenu] = useState(false)
  const [theme, setT] = useState(document.documentElement.dataset.theme)
  const groups = useMemo(() => [...(NAV[ws] || []), ...(user?.appRole === 'admin' ? [ADMIN] : [])].map((g) => ({ ...g, items: g.items.filter((i) => canOpen(user, i[2])) })).filter((g) => g.items.length), [ws, user])
  const toggleTheme = () => setT(setTheme(theme === 'light' ? 'dark' : 'light'))
  useEffect(() => { setMenu(false) }, [loc.pathname])
  // the menu is a drawer now (31 Oct): hidden until the menu button is pressed; Escape or a click outside closes it
  useEffect(() => { if (!menu) return; const k = (e) => e.key === 'Escape' && setMenu(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [menu])
  const gated = !punchedIn
  let k = 0
  return (
    <div className={cx('shell', 'drawer', menu && 'menu-open', gated && 'gated', demo && 'demo')}>
      {menu && <div className="drawer-scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
      <aside className="side" aria-label="Main">
        <div className="brand" onClick={() => nav('/')}>
          <div className="mark">A</div>
          <div><div className="brand-name">Accord</div><div className="brand-sub">{WORKSPACES[ws]?.label.replace('Accord ', '')} · Sky City</div></div>
        </div>
        {wsAll.length > 1 && <div className="ws-switch" role="tablist" aria-label="Platform">
          {wsAll.map((w) => <button key={w} type="button" role="tab" aria-selected={w === ws} className={cx(w === ws && 'on')} style={{ color: w === ws ? undefined : undefined }} onClick={() => { setWs(w); nav('/') }} title={WORKSPACES[w].label}>
            <span className="ws-dot" style={{ color: WORKSPACES[w].color }} /><span className="wst">{WORKSPACES[w].label}</span></button>)}
        </div>}
        <nav>
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-label"><span>{g.label}</span></div>
              {g.items.map(([to, label, , end]) => { k++; return <NavLink key={to + label} to={to} end={!!end} title={label} className={({ isActive }) => cx('nav-item', isActive && 'on')}>
                <span className="ni">{String(k).padStart(2, '0')}</span><span className="nt">{label}</span></NavLink> })}
            </div>))}
        </nav>
        <div className="side-foot">
          <span className={cx('sync', 's-' + sync.state)} title={sync.error || ''}><span className="sync-t">{backend ? (sync.state === 'error' ? 'Sync error' : sync.state === 'syncing' ? 'Syncing' : 'Synced') : 'This device only'}</span></span>
          <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Close menu" title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="top">
          <button className="icon-btn hamb" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}><svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg></button>
          <button type="button" className="top-brand" onClick={() => nav('/')} aria-label="Accord, home"><span className="mark">A</span><span>Accord</span></button>
          <div className="crumb">{WORKSPACES[ws]?.label}</div>
          <div className="top-right">
            {myDay && <PunchStatus day={myDay} punch={punch} notify={notify} />}
            <Bell db={db} user={user} markRead={markRead} nav={nav} />
            <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} title="Light or dark">
              {theme === 'light'
                ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" /></svg>
                : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" /></svg>}
            </button>
            <UserMenu user={user} logout={() => { logout(); nav('/') }} demo={demo} toggleDemo={toggleDemo} passwords={settings.authMode === 'password'} />
          </div>
        </header>
        {demo && <div className="demo-band" role="status">Demo mode · what you enter now is marked as a test, sends no reminders and is listed for clean-up. <button type="button" onClick={() => toggleDemo(false)}>Turn off</button></div>}
        <main className="content"><Outlet context={{ ws }} /></main>
      </div>
      {gated && <PunchGate />}
    </div>
  )
}

function PunchStatus({ day, punch, notify }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const box = useRef(null)
  useEffect(() => { const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  const st = day.out ? 'out' : day.state || 'office'
  const sums = daySums(day.events || [])
  const go = async (type, opt) => { try { const a = await punch(type, opt); setOpen(false); setConfirm(false); if (type === 'out') notify('Punched out. See you tomorrow.'); else if (a?.geo?.mode === 'remote' && type !== 'remote') notify(a.geo.where, 'warn') } catch (e) { notify(e.message, 'bad') } }
  const since = (day.events || []).slice(-1)[0]?.t
  return (
    <div className="rel" ref={box}>
      <button className={cx('punch', 'st-' + st)} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <i /><span className="pt">{STATE_LABEL[st]}{since && !day.out ? ' · since ' + new Date(since).toTimeString().slice(0, 5) : ''}</span>
      </button>
      {open && <div className="menu" role="menu">
        <div className="menu-head">Today · {hm(sums.work)} worked · {hm(sums.brk)} breaks{day.where ? <div className="small muted" style={{ fontWeight: 400 }}>{day.where}</div> : null}</div>
        {[['office', 'In office'], ['site', 'Going on a site visit'], ['remote', 'Working remotely'], ['break', 'Taking a break']].map(([t, l]) =>
          <button key={t} role="menuitem" className={cx(st === t && 'on')} onClick={() => go(t === 'office' && st === 'break' ? 'resume' : t)} disabled={st === t}><span className="ws-dot" style={{ color: `var(--${t === 'office' ? 'good' : t === 'break' ? 'warn' : t === 'site' ? 'info' : 'purple'})` }} />{l}</button>)}
        <hr /><button role="menuitem" className="danger" onClick={() => { setOpen(false); setConfirm(true) }}>Punch out…</button>
      </div>}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="End your day?" footer={<>
        <Button onClick={() => go('break')}>Take a break instead</Button><Button onClick={() => setConfirm(false)}>Keep working</Button>
        <Button variant="danger" onClick={() => go('out', { confirm: true })}>Yes, punch out</Button></>}>
        <p style={{ marginTop: 0 }}>You have worked <b>{hm(sums.work)}</b> today{sums.site ? `, ${hm(sums.site)} of it on site` : ''}. Breaks and site visits keep you punched in; punching out closes the day and cannot be undone from here.</p>
        <p className="small muted" style={{ marginBottom: 0 }}>Made a mistake earlier? An admin can correct the time log under Team · Time.</p>
      </Modal>
    </div>
  )
}

export function PunchGate() {
  const { user, punch, notify, myDay } = useStore()
  const [where, setWhere] = useState('office')
  const [busy, setBusy] = useState(false)
  const now = new Date()
  const { settings } = useStore()
  const go = async () => { setBusy(true); try { const a = await punch('in', { mode: where }); if (a?.geo?.mode === 'remote' && where !== 'remote') notify(a.geo.where, 'warn') } catch (e) { notify(e.message, 'bad') } finally { setBusy(false) } }
  const remote = user?.remoteAllowed === 'Yes'
  const fence = settings.officeLat && settings.officeLng && settings.geofence !== 'Off'
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-label="Punch in">
      <div className="gate-card">
        <div className="label">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} · {now.toTimeString().slice(0, 5)}</div>
        <h2>{myDay?.out ? 'Day closed,' : now.getHours() < 12 ? 'Good morning,' : now.getHours() < 17 ? 'Good afternoon,' : 'Good evening,'} <em>{user?.name}</em></h2>
        <p>{myDay?.out ? `You punched out at ${myDay.out}. Punch in again to keep working; the time log records both.` : 'Accord opens once you punch in. Where are you working from?'}</p>
        <div className="where">
          {[['office', 'Office'], ['site', 'Site'], ['remote', 'Remote']].map(([v, l]) => <button key={v} type="button" className={cx(where === v && 'on')} onClick={() => setWhere(v)} disabled={v === 'remote' && !remote} title={v === 'remote' && !remote ? 'Remote work is not enabled for your account' : ''}>{l}</button>)}
        </div>
        {where !== 'remote' && <p className="small" style={{ margin: 0 }}>{fence ? 'Accord checks your location: Office and Site count at Sky City; anywhere else is logged as remote.' : 'Accord records your location with the punch. Allow it when the browser asks.'}</p>}
        <Button variant="primary" size="lg" onClick={go} disabled={busy}>{busy ? (where === 'remote' ? 'Punching in…' : 'Checking location…') : 'Punch in'}</Button>
        <div className="small muted">Shift {user?.shiftStart || '09:30'} to {user?.shiftEnd || '18:30'} · {user?.workDays || 'Mon-Sat'} · stamped by the server clock when connected.</div>
      </div>
    </div>
  )
}

function Bell({ db, user, markRead, nav }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => { const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  const now = new Date().toISOString()
  const mine = (db.notifications || []).filter((n) => n.to === user?.name && (!n.dueAt || n.dueAt <= now)).sort((a, b) => String(b.dueAt || b.createdAt).localeCompare(String(a.dueAt || a.createdAt))).slice(0, 30)
  const unread = mine.filter((n) => !n.readAt)
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  const openN = (n) => { markRead([n.id]); setOpen(false); if (n.link?.startsWith('#')) nav(n.link.slice(1)); else nav('/crm/interactions') }
  return (
    <div className="rel" ref={box}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notifications, ${unread.length} unread`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 11V7a4 4 0 0 1 8 0v4l1.5 1.5h-11zM6.5 14a1.5 1.5 0 0 0 3 0" /></svg>
        {unread.length > 0 && <span className="count">{unread.length}</span>}
      </button>
      {open && <div className="menu" style={{ width: 340 }}>
        <div className="menu-head row between"><span>Notifications</span>{unread.length > 0 && <button className="btn btn-ghost btn-sm" style={{ minHeight: 28, width: 'auto' }} onClick={() => markRead(unread.map((n) => n.id))}>Mark all read</button>}</div>
        {perm === 'default' && <button onClick={() => Notification.requestPermission()}>Turn on reminders on this device</button>}
        <div style={{ maxHeight: 380, overflow: 'auto' }}>
          {!mine.length && <div className="empty small">Nothing yet. Follow-ups and tasks assigned to you appear here on their due date.</div>}
          {mine.map((n) => <a key={n.id} href="#" className={cx('notif-item', !n.readAt && 'unread')} onClick={(e) => { e.preventDefault(); openN(n) }}>{n.title}<small>{n.body} · {d(String(n.dueAt || n.createdAt).slice(0, 10))}</small></a>)}
        </div>
      </div>}
    </div>
  )
}

function UserMenu({ user, logout, demo, toggleDemo, passwords }) {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState(false)
  const box = useRef(null)
  useEffect(() => { const h = (e) => box.current && !box.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  return (
    <div className="rel who" ref={box}>
      <button className="icon-btn" style={{ width: 'auto', border: 0, gap: 10, display: 'inline-flex', alignItems: 'center' }} onClick={() => setOpen(!open)} aria-haspopup="menu">
        <span className="avatar">{initials(user?.name)}</span>
        <span className="who-txt" style={{ textAlign: 'left' }}><b>{user?.name}</b><span>{user?.designation || ROLES[user?.appRole]}</span></span>
      </button>
      {open && <div className="menu">
        <div className="menu-head">{ROLES[user?.appRole]} · @{user?.username}</div>
        <button onClick={() => { toggleDemo(!demo); setOpen(false) }}>{demo ? 'Turn off demo mode' : 'Demo mode (for showing Accord)'}</button>
        {passwords && <button onClick={() => { setOpen(false); setPw(true) }}>Change password</button>}
        <hr /><button className="danger" onClick={logout}>Sign out</button>
      </div>}
      {pw && <ChangePassword onDone={() => setPw(false)} />}
    </div>
  )
}

export function ChangePassword({ onDone, forced }) {
  const { changePassword, notify } = useStore()
  const [v, setV] = useState({ old: '', a: '', b: '' })
  const [err, setErr] = useState('')
  const go = async () => {
    setErr('')
    if (v.a !== v.b) return setErr('The two new passwords do not match')
    try { await changePassword(v.old, v.a); notify('Password changed'); onDone?.() } catch (e) { setErr(e.message) }
  }
  return (
    <Modal open onClose={forced ? undefined : onDone} title={forced ? 'Set your own password' : 'Change password'} footer={<>{!forced && <Button onClick={onDone}>Cancel</Button>}<Button variant="primary" onClick={go}>Save password</Button></>}>
      {forced && <p style={{ marginTop: 0 }}>You signed in with a temporary password. Choose your own before you continue: at least 8 characters, with a letter and a number.</p>}
      <div className="form fc1">
        <label className="field"><span className="field-label">{forced ? 'Temporary password' : 'Current password'}</span><input className="input" type="password" autoComplete="current-password" value={v.old} onChange={(e) => setV({ ...v, old: e.target.value })} /></label>
        <label className="field"><span className="field-label">New password</span><input className="input" type="password" autoComplete="new-password" value={v.a} onChange={(e) => setV({ ...v, a: e.target.value })} /></label>
        <label className="field"><span className="field-label">Repeat new password</span><input className="input" type="password" autoComplete="new-password" value={v.b} onChange={(e) => setV({ ...v, b: e.target.value })} /></label>
      </div>
      {err && <p className="err">{err}</p>}
    </Modal>
  )
}
