// 7 Nov: drafts. Every form saves what has been typed, per person and per form, in this browser, so going back,
// closing a pop-up or a sign-out never loses work. The Drafts menu in the top bar lists them for reopening.
import { useEffect, useRef, useState } from 'react'

const PREFIX = 'accord.draft.'
const K = (uid, key) => `${PREFIX}${uid}.${key}`
const TTL = 14 * 864e5
export const DRAFT_EVENT = 'accord-drafts'
const ping = () => { try { window.dispatchEvent(new Event(DRAFT_EVENT)) } catch (e) { /* */ } }

export function listDrafts(uid) {
  const out = []
  if (!uid) return out
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
    keys.forEach((k) => {
      if (!k || !k.startsWith(`${PREFIX}${uid}.`)) return
      try {
        const d = JSON.parse(localStorage.getItem(k))
        if (!d || Date.now() - d.at > TTL) { localStorage.removeItem(k); return }
        out.push({ key: k.slice(`${PREFIX}${uid}.`.length), ...d })
      } catch (e) { localStorage.removeItem(k) }
    })
  } catch (e) { /* storage blocked */ }
  return out.sort((a, b) => b.at - a.at)
}
export function readDraft(uid, key) { try { return JSON.parse(localStorage.getItem(K(uid, key)) || 'null') } catch (e) { return null } }
export function clearDraft(uid, key) { try { localStorage.removeItem(K(uid, key)); ping() } catch (e) { /* */ } }
export function clearAllDrafts(uid) { listDrafts(uid).forEach((d) => { try { localStorage.removeItem(K(uid, d.key)) } catch (e) { /* */ } }); ping() }

const same = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b) } catch (e) { return false } }

/**
 * useState that survives leaving the page.
 * const [v, setV, draft] = useDraft('lead:new', blank, { uid: user.id, label: 'New lead', route: '/crm/leads?draft=lead:new' })
 * draft.clear() after a successful save; draft.reset() to discard and go back to the blank value.
 * draft.restoredAt is the time of a restored draft, or null.
 */
export function useDraft(key, initial, { uid, label, route, enabled = true } = {}) {
  const on = enabled && !!uid && !!key
  const [restoredAt, setRestoredAt] = useState(() => (on ? readDraft(uid, key)?.at || null : null))
  const [v, setV] = useState(() => { const d = on ? readDraft(uid, key) : null; return d && d.v != null ? d.v : initial })
  const base = useRef(initial)
  const timer = useRef(null)
  const lastKey = useRef(key)
  // the form switched to another record: load that record's draft or its own starting value
  useEffect(() => {
    if (lastKey.current === key) return
    lastKey.current = key; base.current = initial
    const d = on ? readDraft(uid, key) : null
    setV(d && d.v != null ? d.v : initial); setRestoredAt(d?.at || null)
  }, [key]) // eslint-disable-line
  useEffect(() => {
    if (!on) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        if (same(v, base.current)) { if (localStorage.getItem(K(uid, key))) { localStorage.removeItem(K(uid, key)); ping() } }
        else { localStorage.setItem(K(uid, key), JSON.stringify({ v, at: Date.now(), label: label || key, route: route || (window.location.hash || '').slice(1) || '/' })); ping() }
      } catch (e) { /* storage full or blocked: the form still works */ }
    }, 400)
    return () => clearTimeout(timer.current)
  }, [v, on]) // eslint-disable-line
  // a new starting value from the parent (for example a record that loaded late) when nothing has been typed
  const setBase = (b) => { if (same(v, base.current)) setV(b); base.current = b }
  const clear = () => { clearTimeout(timer.current); clearDraft(uid, key); setRestoredAt(null) }
  const reset = () => { clear(); setV(base.current) }
  return [v, setV, { clear, reset, restoredAt, setBase, dirty: !same(v, base.current) }]
}

export const draftTime = (at) => { try { const t = new Date(at); const today = new Date().toDateString() === t.toDateString(); return today ? t.toTimeString().slice(0, 5) : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + t.toTimeString().slice(0, 5) } catch (e) { return '' } }

/**
 * For pop-up forms where the value is null while closed.
 * const [v, setV, slot] = useDraftSlot('lead:new', { uid, label: 'New lead', route: '/crm/leads?draft=lead:new' })
 * slot.open(blank) opens it, restoring a saved draft if there is one; slot.close() keeps the draft;
 * slot.done() after saving clears it; slot.discard() throws the draft away and starts again from blank.
 */
export function useDraftSlot(key, { uid, label, route } = {}) {
  const [v, setV] = useState(null)
  const [restoredAt, setRestoredAt] = useState(null)
  const base = useRef(null)
  const timer = useRef(null)
  const k = useRef(key); k.current = key
  useEffect(() => {
    if (v == null || !uid || !key) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        if (same(v, base.current)) { if (localStorage.getItem(K(uid, key))) { localStorage.removeItem(K(uid, key)); ping() } }
        else { localStorage.setItem(K(uid, key), JSON.stringify({ v, at: Date.now(), label: label || key, route: route || (window.location.hash || '').slice(1) || '/' })); ping() }
      } catch (e) { /* */ }
    }, 400)
    return () => clearTimeout(timer.current)
  }, [v]) // eslint-disable-line
  // fresh = start from this value even if a draft exists (for example an enquiry pasted in)
  const open = (initial, fresh) => {
    const kk = k.current
    base.current = initial
    const d = uid && !fresh ? readDraft(uid, kk) : null
    setRestoredAt(d?.at || null)
    setV(d && d.v != null ? d.v : initial)
  }
  const close = () => { clearTimeout(timer.current); if (v != null && uid && key && !same(v, base.current)) { try { localStorage.setItem(K(uid, key), JSON.stringify({ v, at: Date.now(), label: label || key, route: route || (window.location.hash || '').slice(1) || '/' })); ping() } catch (e) { /* */ } } setV(null) }
  const done = () => { clearTimeout(timer.current); if (uid) clearDraft(uid, key); setRestoredAt(null); setV(null) }
  const discard = () => { clearTimeout(timer.current); if (uid) clearDraft(uid, key); setRestoredAt(null); setV(base.current) }
  return [v, setV, { open, close, done, discard, restoredAt, has: () => !!(uid && readDraft(uid, key)) }]
}
