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
// 4 Nov: the backend version this site needs (backend/Code.gs VERSION). An older one means Code.gs was not redeployed.
export const NEEDS_BACKEND = '3.8.4'   // 12 Nov: no duplicate users (dedupeUsers). Before: '3.8.0' for Accord People (HR collections, leave and KRA checks, knowledge base by grade)
const verLess = (a, b) => { const x = String(a).match(/\d+/g)?.map(Number), y = String(b).split('.').map(Number); if (!x) return true; for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) } return false }
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
// 5 Nov: a day that was never punched out used to keep counting until today, so a forgotten punch-out on Monday showed
// 100+ hours by Thursday. A past day that was left open now stops at the shift end (or the last event, if later), and
// is flagged as not punched out. Today's open day still counts up to now.
const localDate = (iso) => { const x = new Date(iso); return isNaN(x) ? '' : `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
export function daySums(events = [], until = new Date().toISOString(), shiftEnd = '18:30') {
  // events in time order, and nothing counted outside the calendar day they belong to (a day can never exceed 24 hours)
  const seen = new Set()
  events = [...events].filter((e) => { if (!e || !e.t || isNaN(new Date(e.t))) return false; const k = e.type + e.t; if (seen.has(k)) return false; seen.add(k); return true }).sort((a, b) => new Date(a.t) - new Date(b.t))
  const first = events[0]?.t, last = events[events.length - 1]
  let open = false
  if (first && last?.type !== 'out' && localDate(until) !== localDate(first)) {
    open = true
    const cap = new Date(`${localDate(first)}T${/^\d{1,2}:\d{2}$/.test(String(shiftEnd || '')) ? String(shiftEnd).padStart(5, '0') : '18:30'}:00`).toISOString()
    until = cap > last.t ? cap : last.t
  }
  if (first) { const endOfDay = new Date(`${localDate(first)}T23:59:59`).toISOString(); if (until > endOfDay) until = endOfDay }
  let work = 0, brk = 0, site = 0, state = null, since = null, breaks = 0
  const close = (to) => { if (!state || !since) return; const m = Math.max(0, Math.round((new Date(to) - new Date(since)) / 60000)); if (state === 'break') brk += m; else { work += m; if (state === 'site') site += m } }
  events.forEach((e) => { close(e.t); since = e.t; if (e.type === 'break') breaks++; state = e.type === 'in' || e.type === 'resume' ? 'office' : e.type === 'out' ? null : e.type })
  close(until)
  return { work, brk, site, breaks, open }
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
  // 12 Nov: only one push at a time (the 8-second timer and the save timer used to send the same changes twice),
  // at most 40 changes per push, and every change sent is remembered for a minute so a pull that started before the
  // server saved it cannot put the old version back on screen.
  // 12 Nov (b): what this browser already has, per collection (tokens from the server). The server leaves those out of
  // its answer unless they changed. Every 20th pull (about 10 minutes) asks for everything again, as a safety net.
  const pullTok = useRef({}), pullCount = useRef(0)
  useEffect(() => { pullTok.current = {}; pullCount.current = 0 }, [session?.token])
  const flushing = useRef(false)
  // 12 Nov: the server gave a new record the next free number because its number was taken. Change it here too,
  // everywhere it is mentioned, including changes still waiting to be sent.
  const applyRenames = (list, sentOps = []) => {
    const map = {}; list.forEach((x) => { map[x.from] = x.to })
    const fix = (o) => { if (!o || typeof o !== 'object') return o; let ch = false; const n = { ...o }
      Object.keys(n).forEach((k) => { const v = n[k]; if (typeof v !== 'string') return
        if (map[v]) { n[k] = map[v]; ch = true } else if (v.startsWith('i:') && map[v.slice(2)]) { n[k] = 'i:' + map[v.slice(2)]; ch = true } })
      return ch ? n : o }
    const fixOp = (op) => ({ ...op, id: map[op.id] || op.id, rec: op.rec ? fix(op.rec) : op.rec })
    // only this person's own new or waiting records are touched, never a colleague's record that shares the old number
    const mine = new Set([...sentOps, ...queue.current, ...recent.current.map((x) => x.op)].map((op) => op.rec?._cid).filter(Boolean))
    queue.current = queue.current.map(fixOp)
    recent.current = recent.current.map((x) => ({ ...x, op: fixOp(x.op) }))
    setRaw((cur) => { const next = { ...cur }; Object.keys(next).forEach((c) => { if (Array.isArray(next[c])) next[c] = next[c].map((o) => (o && mine.has(o._cid) ? fix(o) : o)) }); return next })
    notify(list.length === 1 ? `Saved as ${list[0].to} (${list[0].from} was already used by a colleague)` : `${list.length} new records were renumbered because their numbers were already used`)
  }
  const recent = useRef([])   // { op, at } pushed in the last minute
  const flush = useCallback(async () => {
    if (!online || !queue.current.length || flushing.current) return
    flushing.current = true
    const ops = queue.current.slice(0, 40)
    try {
      setSync((s) => ({ ...s, state: 'syncing' }))
      const r = await call({ action: 'push', token: session.token, ops })
      const sent = new Set(ops)
      queue.current = queue.current.filter((o) => !sent.has(o))
      if (r.renamed?.length) applyRenames(r.renamed, ops)
      if (r.refused?.length || r.renamed?.length) pullTok.current = {}   // 12 Nov (b): fetch everything next time, so a refused change does not linger
      safeSet(QKEY, JSON.stringify(queue.current))
      const now = Date.now(); recent.current = [...recent.current.filter((x) => now - x.at < 60000), ...ops.map((op) => ({ op, at: now }))]
      setSync({ state: 'synced', at: new Date().toISOString(), error: r.refused?.length ? 'Not allowed: ' + [...new Set(r.refused)].join(', ') : null })
      if (queue.current.length) setTimeout(flush, 300)
    } catch (e) { setSync({ state: 'error', at: null, error: e.message }); if (/expired|signed in/i.test(e.message)) logout() }
    finally { flushing.current = false }
  }, [online, session, call]) // eslint-disable-line
  const [serverVersion, setServerVersion] = useState('')
  const pulling = useRef(false)
  const pull = useCallback(async () => {
    if (!online || holdPull.current || trainingSnap.current || pulling.current) return
    pulling.current = true
    const startedAt = Date.now()
    try {
      setSync((s) => ({ ...s, state: 'syncing' }))
      const full = pullCount.current++ % 20 === 0
      const j = await call({ action: 'pull', token: session.token, have: full ? null : pullTok.current })
      setServerVersion(j.version || 'older than 3.4.0')
      pullTok.current = j.tok ? (full ? { ...j.tok } : { ...pullTok.current, ...j.tok }) : {}
      setRaw((cur) => {
        const next = { ...cur }
        let changed = false
        Object.keys(j.db || {}).forEach((c) => {
          if (c === 'settings' && !j.db[c].length) return
          // 12 Nov: a collection that has not changed keeps the same list, so pages do not redraw every pull
          if (JSON.stringify(cur[c]) === JSON.stringify(j.db[c])) return
          next[c] = j.db[c]; changed = true
        })
        // keep local changes the server may not have had when it answered: still queued, or pushed after this pull started
        const keep = [...recent.current.filter((x) => x.at >= startedAt - 2000).map((x) => x.op), ...queue.current]
        keep.forEach((op) => {
          if (!next[op.coll]) return
          if (op.op === 'delete') { if (next[op.coll].some((x) => x.id === op.id)) { next[op.coll] = next[op.coll].filter((x) => x.id !== op.id); changed = true } return }
          if (op.op !== 'upsert') return
          const i = next[op.coll].findIndex((x) => x.id === op.rec.id)
          next[op.coll] = i >= 0 ? next[op.coll].map((x, k) => (k === i ? { ...x, ...op.rec } : x)) : [op.rec, ...next[op.coll]]
          changed = true
        })
        return changed ? next : cur
      })
      setSync({ state: 'synced', at: new Date().toISOString(), error: null })
    } catch (e) { setSync({ state: 'error', at: null, error: e.message }); if (/expired|signed in/i.test(e.message)) logout() }
    finally { pulling.current = false }
  }, [online, session, call]) // eslint-disable-line
  useEffect(() => {
    if (!online) return
    pull()
    // 12 Nov: a tab in the background stops asking the server; it catches up as soon as it is looked at again
    const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
    const a = setInterval(flush, 8000), b = setInterval(() => { if (visible()) pull() }, 30000)
    const back = () => { if (visible()) { flush(); pull() } }
    document.addEventListener('visibilitychange', back)
    return () => { clearInterval(a); clearInterval(b); document.removeEventListener('visibilitychange', back) }
  }, [online]) // eslint-disable-line

  // 12 Nov: saving the same record again before it was sent replaces the waiting copy instead of queueing another
  const enqueue = (op) => {
    if (!backend || trainingSnap.current) return
    if (op.op === 'upsert') {
      const i = queue.current.findIndex((o) => o.op === 'upsert' && o.coll === op.coll && o.rec?.id === op.rec?.id)
      if (i >= 0) { const was = queue.current[i]; queue.current = queue.current.filter((_, k) => k !== i); op = { ...op, isNew: was.isNew || op.isNew, action: op.action || was.action, rec: { ...was.rec, ...op.rec } } }
    }
    queue.current = [...queue.current, op]; safeSet(QKEY, JSON.stringify(queue.current)); setTimeout(flush, 400)
  }

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
    // 12 Nov: a new record carries a one-off creation key, so the server can tell a clash of numbers (two people picked
    // I-0266) from the same record being sent twice
    if (!exists && !r._cid) r._cid = uid('c')
    let isNew = false
    setRaw((cur) => {
      const list = cur[coll] || []
      const i = list.findIndex((x) => x.id === r.id)
      isNew = i < 0
      const next = i >= 0 ? list.map((x, k) => (k === i ? { ...x, ...r } : x)) : [r, ...list]
      return { ...cur, [coll]: next }
    })
    enqueue({ coll, op: 'upsert', rec: r, action: opts.action, isNew: opts.isNew ?? !exists })
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
  // 5 Nov: "trust this device" skips the code for a few days on the person's own computer or phone
  const login = useCallback(async (username, { code, password, trust, trustToken, emailCode } = {}) => {
    const uname = String(username || '').trim().toLowerCase()
    const keepTrust = (name, t) => safeSet('accord.trust', JSON.stringify({ username: uname, name, token: t.token, until: t.until }))
    if (backend) {
      let j
      try { j = await call({ action: 'login', username: uname, code, password, trust, trustToken, emailCode, deviceId: deviceId(), deviceLabel: deviceLabel(), deviceKind: deviceKind() }) }
      catch (e) { if (trustToken) { try { localStorage.removeItem('accord.trust') } catch (x) { /* */ } } throw e }
      if (j.trust) keepTrust(j.user.name, j.trust)
      const pu = { ...j.user, mustChange: j.user.mustChange ? 'Yes' : 'No', mfa: j.user.mfa ? 'Set' : 'Not set' }
      setRaw((cur) => cur.users.some((x) => x.id === pu.id) ? { ...cur, users: cur.users.map((x) => (x.id === pu.id ? { ...x, ...pu } : x)) } : { ...cur, users: [...cur.users, pu] })
      startSession(j.user, j.token, j.user.mustEnrol)
      return { mustEnrol: j.user.mustEnrol }
    }
    if (emailCode) throw new Error('E-mailed codes need the shared database. Connect it under Admin, Data and sync.')
    const u = raw.users.find((x) => String(x.username || '').toLowerCase() === uname && x.active !== 'No' && x.appRole !== 'none')
    if (!u) throw new Error('Unknown username or code')
    const mode = settings.authMode === 'password' ? 'password' : 'authenticator'
    const lt = readJson('accord.trust', null)
    if (trustToken && lt && lt.token === trustToken && lt.username === uname && new Date(lt.until) > new Date()) { startSession(u, 'local'); return {} }
    if (mode === 'authenticator' && u.totpSecret) {
      const st = await totpCheck(u.totpSecret, code, u.totpLast)
      if (st < 0) throw new Error('That code is not right. Open your authenticator app and type the 6 digits shown for Accord.')
      setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === u.id ? { ...x, totpLast: st } : x)) }))
      const days = Number(settings.trustDays ?? 3)
      if (trust && days > 0) keepTrust(u.name, { token: Math.random().toString(36).slice(2) + Date.now().toString(36), until: new Date(Date.now() + days * 864e5).toISOString() })
      startSession(u, 'local'); return {}
    }
    if (!u.pwHash) { if (password !== TEMP_PASSWORD) throw new Error('Unknown username or temporary password') }
    else if ((await hashPassword(u.pwSalt, password)) !== u.pwHash) throw new Error('Unknown username or password')
    const mustEnrol = mode === 'authenticator'
    startSession(u, 'local', mustEnrol)
    return { mustEnrol }
  }, [raw.users, backend, call, settings.authMode, settings.trustDays])
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
  // 12 Nov: fold user rows saved twice under one member ID (server), then keep one copy here too
  const dedupeUsers = useCallback(async () => {
    let removed = 0
    if (online) { const j = await call({ action: 'dedupeUsers', token: session.token }); removed = j.removed || 0 }
    setRaw((cur) => { const seen = new Set(); return { ...cur, users: cur.users.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))) } })
    return removed
  }, [online, session, call])
  const releaseDevice = useCallback(async (userId, devId) => {
    let list = null
    if (online) { const j = await call({ action: 'releaseDevice', token: session.token, userId, deviceId: devId }); list = j.devices || null }   // a refusal throws, so the row stays
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === userId ? { ...x, devices: list || (x.devices || []).filter((d) => d.id !== devId) } : x)) }))
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
  // 7 Nov: no phone to hand: ask for a sign-in code by e-mail
  const requestEmailCode = useCallback(async (username) => {
    if (!backend) throw new Error('E-mailed codes need the shared database. Connect it under Admin, Data and sync.')
    return call({ action: 'emailCode', username: String(username || '').trim().toLowerCase() })
  }, [backend, call])
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
  // 12 Nov: this used to compare the session's updatedAt with the saved record's, but saving stamps a new updatedAt,
  // so they never matched: every save (and every pull) saved all sessions again, in a loop that never stopped while a
  // session sat in this browser (13,600 audit rows for 5 sessions). The experience's own time is now kept as expAt,
  // and the check runs on sign-in and when the experience tab writes, not on every change to the data.
  const importExperience = useCallback(() => {
    const list = readJson(EXP_SESSIONS, [])
    if (!user || !list.length) return
    list.forEach((s) => {
      const cur = (rawRef.current.accordSessions || []).find((x) => x.id === s.id)
      const stamp = s.updatedAt || ''
      if (cur && (cur.expAt === stamp || (!cur.expAt && stamp && cur.updatedAt >= stamp))) return
      upsert('accordSessions', { ...cur, ...s, expAt: stamp, by: s.by || cur?.by || user.name }, { system: true, silent: true })
    })
  }, [upsert, user])
  useEffect(() => { importExperience(); const h = (e) => { if (e.key === EXP_SESSIONS) importExperience() }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h) }, [user?.id]) // eslint-disable-line

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
  // 5 Nov: a person's own profile picture (admins can set anyone's)
  const setPhoto = useCallback(async (photo, userId) => {
    const id = userId || user?.id
    if (online) await call({ action: 'setPhoto', token: session.token, photo, userId: id })
    setRaw((cur) => ({ ...cur, users: cur.users.map((x) => (x.id === id ? { ...x, photo } : x)) }))
  }, [online, call, session, user])
  // 4 Nov: open an uploaded file inside Accord, and delete a wrong upload (uploader or admin; the server checks too).
  const fileGet = useCallback(async (id) => {
    if (!online) throw new Error('Files are opened from the shared database. Connect it first.')
    return call({ action: 'fileGet', token: session.token, id })
  }, [online, session, call])
  const fileDelete = useCallback(async (id) => {
    if (demo) throw new Error('Files cannot be deleted in training mode')
    if (!online) throw new Error('Connect the shared database to delete files')
    const j = await call({ action: 'fileDelete', token: session.token, id })
    setRaw((cur) => ({ ...cur, files: (cur.files || []).filter((x) => x.id !== id), ...(j.document ? { documents: [j.document, ...(cur.documents || []).filter((x) => x.id !== j.document.id)] } : {}) }))
    return j
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
    else if (!on && trainingSnap.current) { const snap = trainingSnap.current; trainingSnap.current = null; pullTok.current = {}; pullCount.current = 0; setRaw(snap); setDemoState(false); notify('Training mode off. Practice entries discarded.'); setTimeout(() => pull(), 300) }
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

  const value = { db, raw, settings, user, session, sync, toast, notify, upsert, remove, setSettings, nextId, login, requestEmailCode, logout, changePassword, setUserPassword, approveDevice, releaseDevice,
    enrolStart, enrolConfirm, punch, myDay, punchedIn, pushNote, markRead, replaceAll, resetToSeed, upload, fileGet, fileDelete, setPhoto, dedupeUsers, sendEmail, exportNow, loadStartingData, pull, flush, seedBackend,
    backend, serverVersion, backendOld: !!serverVersion && verLess(serverVersion, NEEDS_BACKEND), siteBackend: SITE_BACKEND, online, call, today, nowTime, demo, toggleDemo }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore = () => useContext(Ctx)
