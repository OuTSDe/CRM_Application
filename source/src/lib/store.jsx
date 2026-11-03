import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { buildSeed, COLLECTIONS } from './seed.js'
import { canWrite, scopeDb } from './perms.js'
import { hashPassword, newSalt, strongEnough, TEMP_PASSWORD, deviceId, deviceLabel, deviceKind } from './crypto.js'
import { totpCheck, newSecret, otpUri } from './totp.js'
import { getLocation, geoCheck } from './geo.js'
import { crmPart } from './seed.js'
import { today, nowTime } from './format.js'
import { deriveCrm, BOOKED } from './calc.js'

const KEY = 'accord.db.v2'
const QKEY = 'accord.queue.v2'
const SKEY = 'accord.session.v2'
export const EXP_SESSIONS = 'accord.experience.sessions'   // written by the Accord experience bridge
export const EXP_UNITS = 'accord.units.status'             // read by the Accord experience bridge
const Ctx = createContext(null)
// The backend address is published with the site (accord.config.js), so every device connects to the same Drive database.
const SITE_BACKEND = (typeof window !== 'undefined' && window.ACCORD_CONFIG?.backendUrl) || ''
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db = JSON.parse(raw)
      const seed = buildSeed()
      COLLECTIONS.forEach((c) => { if (!db[c]) db[c] = seed[c] })
      // 31 Oct: chain of command for escalations
      db.users.forEach((u) => { if (u.reportsTo === undefined) u.reportsTo = seed.users.find((x) => x.id === u.id)?.reportsTo || '' })
      return db
    }
  } catch (e) { /* fall through */ }
  return buildSeed()
}
const safeSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) { console.warn('storage full or blocked', e) } }
const readJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d } catch (e) { return d } }

// Minutes worked / on break / on site from a day's events (same rules as the server's sums_).
export function daySums(events = [], until = new Date().toISOString()) {
  let work = 0, brk = 0, site = 0, state = null, since = null, breaks = 0
  const close = (to) => { if (!state || !since) return; const m = Math.max(0, Math.round((new Date(to) - new Date(since)) / 60000)); if (state === 'break') brk += m; else { work += m; if (state === 'site') site += m } }
  events.forEach((e) => { close(e.t); since = e.t; if (e.type === 'break') breaks++; state = e.type === 'in' || e.type === 'resume' ? 'office' : e.type === 'out' ? null : e.type })
  close(until)
  return { work, brk, site, breaks }
}

export function StoreProvider({ children }) {
  const [raw, setRaw] = useState(load)
  // 2 Nov: the sign-in lives only in this tab's memory. Refreshing, closing the tab or the browser signs you out,
  // and the next visit asks for the username and a fresh authenticator code. localStorage keeps only a marker
  // (no token) while the tab is open, so the Accord experience page in the next tab knows someone is signed in.
  const [session, setSession] = useState(() => { try { localStorage.removeItem(SKEY) } catch (e) { /* */ } return null })
  const [sync, setSync] = useState({ state: 'local', at: null, error: null })
  const [toast, setToast] = useState(null)
  const queue = useRef(readJson(QKEY, []))
  const holdPull = useRef(false)   // after loading the starting data, until the sheet is seeded
  const saveTimer = useRef(null)

  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      safeSet(KEY, JSON.stringify(raw))
      // availability for the Accord experience: "floor-position" → sold / blocked / unsold
      const st = {}
      const byUnit = {}; raw.clients.forEach((c) => (byUnit[c.unit] = c))
      raw.units.forEach((u) => { const c = byUnit[u.unit]; const k = Math.floor(u.unit / 100) + '-' + (u.unit % 100)
        st[k] = c && BOOKED.includes(c.status) ? 'sold' : c && ['Under cancellation', 'To verify'].includes(c.status) ? 'blocked' : 'unsold' })
      safeSet(EXP_UNITS, JSON.stringify({ source: 'Accord CRM', readAt: new Date().toISOString(), units: st }))
    }, 300)
  }, [raw])

  const settings = raw.settings[0] || {}
  const user = useMemo(() => (session ? raw.users.find((u) => u.id === session.userId) || null : null), [session, raw.users])
  const backend = settings.backendUrl || SITE_BACKEND
  // 2 Nov: training mode. Everything entered is kept in this tab only and thrown away when training ends:
  // nothing reaches the Google Sheet, no reminders, no e-mails, no uploads. (Replaces demo mode.)
  const [demo, setDemoState] = useState(false)
  const trainingSnap = useRef(null)
  const rawRef = useRef(raw); rawRef.current = raw
  const db = useMemo(() => (user ? scopeDb(raw, user, deriveCrm) : raw), [raw, user])

  const notify = useCallback((msg, tone = 'ok') => { setToast({ msg, tone, at: Date.now() }); setTimeout(() => setToast((t) => (t && Date.now() - t.at >= (tone === 'ok' ? 3300 : 6900) ? null : t)), tone === 'ok' ? 3400 : 7000) }, [])

  // ---------- backend calls
  const call = useCallback(async (payload, url = backend) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
    const j = await res.json()
    if (j.error) throw new Error(j.error)
    return j
  }, [backend])
  const online = !!(backend && session?.token && session.token !== 'local')
  const flush = useCallback(async () => {
    if (!online || !queue.current.length) return
    const ops = queue.current.slice()
    try {
      setSync((s) => ({ ...s, state: 'syncing' }))
      const r = await call({ action: 'push', token: session.token, ops })
      queue.current = queue.current.slice(ops.length); safeSet(QKEY, JSON.stringify(queue.current))
      setSync({ state: 'synced', at: new Date().toISOString(), error: r.refused?.length ? 'Not allowed: ' + [...new Set(r.refused)].join(', ') : null })
    } catch (e) { setSync({ state: 'error', at: null, error: e.message }); if (/expired|signed in/i.test(e.message)) logout() }
  }, [online, session, call]) // eslint-disable-line
  const pull = useCallback(async () => {
    if (!online || holdPull.current || trainingSnap.current) return
    try {
      setSync((s) => ({ ...s, state: 'syncing' }))
      const j = await call({ action: 'pull', token: session.token })
      setRaw((cur) => {
        const next = { ...cur }
        Object.keys(j.db || {}).forEach((c) => { if (c !== 'settings' || j.db[c].length) next[c] = j.db[c] })
        // keep local edits that are still queued
        queue.current.forEach((op) => { if (op.op === 'upsert' && next[op.coll]) { const i = next[op.coll].findIndex((x) => x.id === op.rec.id); next[op.coll] = i >= 0 ? next[op.coll].map((x, k) => (k === i ? op.rec : x)) : [op.rec, ...next[op.coll]] } })
        return next
      })
      setSync({ state: 'synced', at: new Date().toISOString(), error: null })
    } catch (e) { setSync({ state: 'error', at: null, error: e.message }); if (/expired|signed in/i.test(e.message)) logout() }
  }, [online, session, call]) // eslint-disable-line
  useEffect(() => {
    if (!online) return
    pull()
    const a = setInterval(flush, 8000), b = setInterval(pull, 45000)
    return () => { clearInterval(a); clearInterval(b) }
  }, [online]) // eslint-disable-line

  const enqueue = (op) => { if (!backend || trainingSnap.current) return; queue.current.push(op); safeSet(QKEY, JSON.stringify(queue.current)); setTimeout(flush, 400) }

  // ---------- data API
  const logAudit = (coll, id, action) => {
    if (backend) return // the server writes its own audit
    const a = { id: uid('A-'), at: new Date().toISOString(), by: user?.name || 'system', coll, recId: id, action }
    setRaw((cur) => ({ ...cur, audit: [a, ...(cur.audit || [])].slice(0, 3000) }))
  }
  const upsert = useCallback((coll, rec, opts = {}) => {
    if (!opts.system && !canWrite(user, coll)) { notify('Your access does not allow changing ' + coll, 'bad'); return null }
    const r = { ...rec, updatedAt: new Date().toISOString(), updatedBy: user?.name || 'system' }
    ;['mine', 'directoryOnly', 'payState', 'lastPaymentDate', '_mineClients'].forEach((k) => delete r[k])
    const exists = (rawRef.current[coll] || []).some((x) => x.id === r.id)
    let isNew = false
    setRaw((cur) => {
      const list = cur[coll] || []
      const i = list.findIndex((x) => x.id === r.id)
      isNew = i < 0
      const next = i >= 0 ? list.map((x, k) => (k === i ? { ...x, ...r } : x)) : [r, ...list]
      return { ...cur, [coll]: next }
    })
    enqueue({ coll, op: 'upsert', rec: r, action: opts.action, isNew: opts.isNew })
    if (!opts.silent && coll !== 'audit' && !demo) logAudit(coll, r.id, opts.action || 'saved')
    return r
  }, [user, backend, demo]) // eslint-disable-line
  const remove = useCallback((coll, id) => {
    if (!canWrite(user, coll)) { notify('Your access does not allow deleting', 'bad'); return }
    setRaw((cur) => ({ ...cur, [coll]: (cur[coll] || []).filter((x) => x.id !== id) }))
    enqueue({ coll, op: 'delete', id }); logAudit(coll, id, 'deleted')
  }, [user, backend]) // eslint-disable-line
  const setSettings = useCallback((patch) => upsert('settings', { ...settings, ...patch, id: 'main' }), [settings, upsert])
  // ids issued in this tick are remembered, so several records saved at once (the bulk log) never share an id
  const issued = useRef({})
  const nextId = useCallback((coll, prefix, width = 4) => {
    let max = issued.current[coll + prefix] || 0
    ;(raw[coll] || []).forEach((x) => { const m = String(x.id || '').match(new RegExp('^' + prefix.replace(/[-]/g, '\\-') + '(\\d+)$')); if (m) max = Math.max(max, Number(m[1])) })
    issued.current[coll + prefix] = max + 1
    return prefix + String(max + 1).padStart(width, '0')
  }, [raw])

  // In-app notification to a colleague (follow-ups, tasks). With the backend on, the server creates these itself.
  const pushNote = useCallback((to, n) => {
    if (backend || demo) return
    upsert('notifications', { id: uid('N-'), to, createdBy: user?.name, createdAt: new Date().toISOString(), readAt: '', ...n }, { system: true, silent: true })
  }, [backend, user, upsert, demo])
  const markRead = useCallback((ids) => { const now = new Date().toISOString(); ids.forEach((id) => { const n = raw.notifications.find((x) => x.id === id); if (n && !n.readAt) upsert('notifications', { ...n, readAt: now }, { system: true, silent: true }) }) }, [raw.notifications, upsert])

  // ---------- auth
  const marker = (s) => safeSet(SKEY, JSON.stringify({ userId: s.userId, at: s.at }))
  const startSession = (u, token, mustEnrol = false) => { const s = { userId: u.id, token, at: Date.now(), mustEnrol: !!mustEnrol }; setSession(s); marker(s) }
  // 1 Nov: username + authenticator code. The temporary password opens the account once, to link the app.
  const login = useCallback(async (username, { code, password } = {}) => {
    const uname = String(username || '').trim().toLowerCase()
    if (backend) {
      const j = await call({ action: 'login', username: uname, code, password, deviceId: deviceId(), deviceLabel: deviceLabel(), deviceKind: deviceKind() })
      const pu = { ...j.user, mustChange: j.user.mustChange ? 'Yes' : 'No', mfa: j.user.mfa ? 'Set' : 'Not set' }
      setRaw((cur) => cur.users.some((x) => x.id === pu.id) ? { ...cur, users: cur.users.map((x) => (x.id === pu.id ? { ...x, ...pu } : x)) } : { ...cur, users: [...cur.users, pu] })
      startSession(j.user, j.token, j.user.mustEnrol)
      return { mustEnrol: j.user.mustEnrol }
    }
    const u = raw.users.find((x) => String(x.username || '').toLowerCase() === uname && x.active !== 'No' && x.appRole !== 'none')
    if (!u) throw new Error('Unknown username or code')
    const mode = settings.authMode === 'password' ? 'password' : 'authenticator'
    if (mode === 'authenticator' && u.totpSecret) {
      const st = await totpCheck(u.totpSecret, code, u.totpLast)
      if (st < 0) throw new Error('That code is not right. Open your authenticator app and type the 6 digits shown for Accord.')
      setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === u.id ? { ...x, totpLast: st } : x)) }))
      startSession(u, 'local'); return {}
    }
    if (!u.pwHash) { if (password !== TEMP_PASSWORD) throw new Error('Unknown username or temporary password') }
    else if ((await hashPassword(u.pwSalt, password)) !== u.pwHash) throw new Error('Unknown username or password')
    const mustEnrol = mode === 'authenticator'
    startSession(u, 'local', mustEnrol)
    return { mustEnrol }
  }, [raw.users, backend, call, settings.authMode])
  // Linking the authenticator app: a new secret shown as a QR code, then one code from the app to confirm.
  const enrolStart = useCallback(async () => {
    if (online) return call({ action: 'enrolStart', token: session.token })
    const secret = newSecret(); setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === user.id ? { ...x, totpPending: secret } : x)) }))
    return { secret, uri: otpUri(user.username, secret) }
  }, [online, session, call, user])
  const enrolConfirm = useCallback(async (code, email) => {
    if (online) { await call({ action: 'enrolConfirm', token: session.token, code, email }) }
    else {
      const u = raw.users.find((x) => x.id === user.id)
      const st = await totpCheck(u.totpPending, code, 0)
      if (st < 0) throw new Error('That code does not match. Check the phone clock is set automatically, then try the newest code.')
      setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === u.id ? { ...x, totpSecret: u.totpPending, totpPending: '', totpLast: st, mfa: 'Set', mustChange: 'No', email: x.email || email || '' } : x)) }))
    }
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === user.id ? { ...x, mfa: 'Set', mustChange: 'No', email: x.email || email || '' } : x)) }))
    const s = { ...session, mustEnrol: false }; setSession(s); marker(s)
  }, [online, session, call, raw.users, user])
  const changePassword = useCallback(async (oldPw, newPw) => {
    if (!strongEnough(newPw)) throw new Error('Use at least 8 characters with a letter and a number')
    if (online) { await call({ action: 'changePassword', token: session.token, old: oldPw, password: newPw }); setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === user.id ? { ...x, mustChange: 'No' } : x)) })); return }
    const u = raw.users.find((x) => x.id === user.id)
    if (u.pwHash ? (await hashPassword(u.pwSalt, oldPw)) !== u.pwHash : oldPw !== TEMP_PASSWORD) throw new Error('Current password is wrong')
    const salt = newSalt(), h = await hashPassword(salt, newPw)
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === u.id ? { ...x, pwSalt: salt, pwHash: h, mustChange: 'No' } : x)) }))
  }, [online, session, call, raw.users, user])
  const setUserPassword = useCallback(async (userId, pw) => {
    if (!strongEnough(pw)) throw new Error('Use at least 8 characters with a letter and a number')
    if (online) { await call({ action: 'setPassword', token: session.token, userId, password: pw }); setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === userId ? { ...x, mfa: 'Not set', mustChange: 'Yes' } : x)) })); return }
    const salt = newSalt(), h = await hashPassword(salt, pw)
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === userId ? { ...x, pwSalt: salt, pwHash: h, mustChange: 'Yes', totpSecret: '', totpPending: '', totpLast: '', mfa: 'Not set' } : x)) }))
  }, [online, session, call])
  const approveDevice = useCallback(async (userId, devId, approve = true) => {
    if (online) { const j = await call({ action: 'approveDevice', token: session.token, userId, deviceId: devId, approve }); setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === userId ? { ...x, devices: j.devices } : x)) })); return }
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => { if (x.id !== userId) return x
      const dv = (x.devices || []).find((d) => d.id === devId)
      let list = (x.devices || []).map((d) => (d.id === devId ? { ...d, approved: approve } : d)).filter((d) => approve || d.id !== devId)
      if (approve && dv && x.appRole !== 'admin') list = list.filter((d) => d.id === devId || !d.approved || (d.kind || 'computer') !== (dv.kind || 'computer'))
      return { ...x, devices: list } }) }))
  }, [online, session, call])
  const releaseDevice = useCallback(async (userId, devId) => {
    if (online) await call({ action: 'releaseDevice', token: session.token, userId, deviceId: devId })
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === userId ? { ...x, devices: (x.devices || []).filter((d) => d.id !== devId) } : x)) }))
  }, [online, session, call])
  // Signing out ends the session on the server too, after sending anything not yet saved.
  const sessionRef = useRef(null); sessionRef.current = session
  const endServerSession = useCallback((beacon) => {
    const s = sessionRef.current
    if (!backend || !s?.token || s.token === 'local') return
    const body = JSON.stringify({ action: 'logout', token: s.token, ops: queue.current })
    let sent = false
    if (beacon && navigator.sendBeacon) { try { sent = navigator.sendBeacon(backend, new Blob([body], { type: 'text/plain;charset=utf-8' })) } catch (e) { /* */ } }
    else { fetch(backend, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, keepalive: true }).catch(() => {}); sent = true }
    if (sent && queue.current.length) { queue.current = []; safeSet(QKEY, '[]') }
  }, [backend])
  const logout = useCallback(() => { endServerSession(false); setSession(null); try { localStorage.removeItem(SKEY) } catch (e) { /* */ } }, [endServerSession])
  // closing the tab or the browser, or refreshing: sign out
  useEffect(() => {
    const bye = () => { endServerSession(true); try { localStorage.removeItem(SKEY) } catch (e) { /* */ } }
    window.addEventListener('pagehide', bye)
    return () => window.removeEventListener('pagehide', bye)
  }, [endServerSession])

  // ---------- time (punch in, break, site visit, remote, punch out)
  const myDay = useMemo(() => user ? raw.attendance.find((a) => a.userId === user.id && a.date === today()) || null : null, [raw.attendance, user])
  const punchedIn = !!(myDay && !myDay.out)
  const punch = useCallback(async (type, opt = {}) => {
    const wanted = type === 'in' ? opt.mode || 'office' : type
    const loc = ['office', 'site'].includes(wanted) ? await getLocation() : null
    if (online) {
      const j = await call({ action: 'punch', token: session.token, type, mode: opt.mode, note: opt.note, confirm: opt.confirm, deviceId: deviceId(), loc })
      setRaw((cur) => { const l = cur.attendance.filter((x) => x.id !== j.attendance.id); return { ...cur, attendance: [j.attendance, ...l] } })
      return { ...j.attendance, geo: j.geo }
    }
    const geo = geoCheck(settings, loc, wanted)
    const d = today(), t = nowTime(), at = new Date().toISOString()
    let a = raw.attendance.find((x) => x.userId === user.id && x.date === d)
    if (type === 'in') {
      if (a && !a.out) return a
      const late = user.shiftStart && t > user.shiftStart
      a = { ...(a || { id: 'AT-' + d.replace(/-/g, '') + '-' + user.id, userId: user.id, name: user.name, date: d, in: t, events: [] }), out: '', mode: geo.mode, state: geo.mode, status: late ? 'Late' : 'Present', where: geo.where }
    } else if (['office', 'site'].includes(type) && geo.mode === 'remote') {
      if (!a || a.out) throw new Error('You are not punched in')
      type = 'remote'; a = { ...a, state: 'remote', where: geo.where }
    } else {
      if (!a || a.out) throw new Error('You are not punched in')
      if (type === 'out' && opt.confirm !== true) throw new Error('Punch out must be confirmed')
      a = { ...a, state: type === 'out' ? 'out' : type === 'resume' ? a.mode || 'office' : type, out: type === 'out' ? t : a.out }
    }
    a.events = [...(a.events || []), { t: at, type, note: opt.note || '', where: geo.where }]
    const s = daySums(a.events, at); a.workMin = s.work; a.breakMin = s.brk; a.siteMin = s.site
    upsert('attendance', a, { system: true, silent: true })
    upsert('timeEvents', { id: uid('TE-'), at, date: d, time: t, userId: user.id, name: user.name, type, note: opt.note || '', device: deviceId(), where: geo.where, lat: loc?.lat || '', lng: loc?.lng || '', acc: loc?.acc || '', dist: geo.dist ?? '' }, { system: true, silent: true })
    return { ...a, geo }
  }, [online, session, call, raw.attendance, user, upsert, settings])

  // ---------- Accord experience sessions (written by the bridge in experience/index.html)
  const importExperience = useCallback(() => {
    const list = readJson(EXP_SESSIONS, [])
    if (!user || !list.length) return
    list.forEach((s) => {
      const cur = raw.accordSessions.find((x) => x.id === s.id)
      if (!cur || cur.updatedAt !== s.updatedAt) upsert('accordSessions', { ...cur, ...s, by: s.by || cur?.by || user.name }, { system: true, silent: true })
    })
  }, [raw.accordSessions, upsert, user])
  useEffect(() => { importExperience(); const h = (e) => { if (e.key === EXP_SESSIONS) importExperience() }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h) }, [importExperience])

  // ---------- reminders on this device (service worker notification when allowed, else in-app only)
  useEffect(() => {
    if (!user) return
    const tick = () => {
      const now = new Date().toISOString()
      const shown = readJson('accord.shown', [])
      const due = (raw.notifications || []).filter((n) => n.to === user.name && !n.readAt && (!n.dueAt || n.dueAt <= now) && !shown.includes(n.id))
      if (!due.length) return
      safeSet('accord.shown', JSON.stringify([...shown, ...due.map((n) => n.id)].slice(-500)))
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        due.slice(0, 3).forEach((n) => navigator.serviceWorker?.getRegistration?.().then((r) => (r ? r.showNotification('Accord · ' + n.title, { body: n.body, tag: n.id }) : new Notification('Accord · ' + n.title, { body: n.body }))).catch(() => {}))
      }
    }
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t)
  }, [raw.notifications, user])

  // Uploads go to the OuTSDe Drive (Accord_Data / …), named by Accord, and are listed in the Files tab.
  const upload = useCallback(async (file, folder, name, meta = {}) => {
    if (demo) throw new Error('Uploads are switched off in training mode')
    if (!online) return null
    if (file.size > 35 * 1024 * 1024) throw new Error('Files up to 35 MB. Compress the PDF or upload it in parts.')
    const data = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = bad; r.readAsDataURL(file) })
    const j = await call({ action: 'upload', token: session.token, folder, name, mime: file.type || 'application/octet-stream', origName: file.name, data, meta: { ...meta, test: demo } })
    if (j.file) setRaw((cur) => ({ ...cur, files: [j.file, ...(cur.files || []).filter((x) => x.id !== j.file.id)] }))
    return j.url
  }, [online, session, call, demo])
  const sendEmail = useCallback(async (msg) => {
    if (demo) throw new Error('E-mails are not sent in training mode')
    if (!online) throw new Error('E-mail is sent by the shared database. Connect it under Admin, Data and sync.')
    const j = await call({ action: 'sendEmail', token: session.token, test: demo, ...msg })
    if (j.message) setRaw((cur) => ({ ...cur, messages: [j.message, ...(cur.messages || [])] }))
    return j
  }, [online, session, call, demo])
  const toggleDemo = useCallback((on) => {
    if (on && !trainingSnap.current) { trainingSnap.current = rawRef.current; setDemoState(true); notify('Training mode on. Nothing you enter now is saved.', 'warn') }
    else if (!on && trainingSnap.current) { const snap = trainingSnap.current; trainingSnap.current = null; setRaw(snap); setDemoState(false); notify('Training mode off. Practice entries discarded.'); setTimeout(() => pull(), 300) }
  }, [notify, pull])
  const exportNow = useCallback(async () => call({ action: 'exportNow', token: session.token }), [session, call])
  // The CRM master extract (Accord_Data / Starting data / accord-starting-data.json) loaded into this device, ready to seed the sheet.
  const loadStartingData = useCallback((src) => {
    if (!src || !Array.isArray(src.clients)) throw new Error('Not an Accord starting-data file')
    const part = crmPart(src)
    holdPull.current = true
    // the empty sheet may have emptied the reference collections on this device (templates, vendors, brochure…): put the defaults back
    const base = buildSeed()
    setRaw((cur) => { const next = { ...cur }; Object.keys(base).forEach((c) => { if (!(next[c] || []).length && (base[c] || []).length) next[c] = base[c] })
      return { ...next, ...part, units: src.units?.length ? src.units.map((u) => ({ ...u, id: String(u.unit) })) : next.units } })
    return Object.fromEntries(Object.entries(part).map(([k, v]) => [k, v.length]))
  }, [])
  const replaceAll = useCallback((next) => { setRaw(next); notify('Data replaced') }, [notify])
  const resetToSeed = useCallback(() => { const s = buildSeed(); s.users = raw.users; s.settings = raw.settings; setRaw(s); notify('Cleared this device back to the empty start') }, [raw.users, raw.settings, notify])
  const seedBackend = useCallback(async (url = backend) => { const r = await call({ action: 'seed', token: online ? session.token : '', db: raw }, url); queue.current = []; safeSet(QKEY, '[]'); holdPull.current = false; setTimeout(() => pull(), 500); return r }, [call, session, raw, online, backend])

  const value = { db, raw, settings, user, session, sync, toast, notify, upsert, remove, setSettings, nextId, login, logout, changePassword, setUserPassword, approveDevice, releaseDevice,
    enrolStart, enrolConfirm, punch, myDay, punchedIn, pushNote, markRead, replaceAll, resetToSeed, upload, sendEmail, exportNow, loadStartingData, pull, flush, seedBackend,
    backend, siteBackend: SITE_BACKEND, online, call, today, nowTime, demo, toggleDemo }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore = () => useContext(Ctx)
