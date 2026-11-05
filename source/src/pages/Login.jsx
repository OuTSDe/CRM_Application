import React, { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { TEMP_PASSWORD } from '../lib/crypto.js'
import { Button } from '../components/ui.jsx'

export const CREDITS = [['Ar. Shruthadev Bantwal', 'Research Director'], ['Ar. Kajal Diwakar', 'Design Director'], ['Ar. Aryan Shetty', 'Managing Director']]
export const RIGHTS = 'Accord, the Accord method and this software are the intellectual property of OuTSDe, Outlook for Theoreticals & Speculative Design. © 2026 OuTSDe. All rights reserved.'

const readTrust = () => { try { const t = JSON.parse(localStorage.getItem('accord.trust') || 'null'); return t && new Date(t.until) > new Date() ? t : null } catch (e) { return null } }
export default function Login() {
  const { login, backend, settings } = useStore()
  const [trusted, setTrusted] = useState(readTrust)
  const [trust, setTrust] = useState(true)
  const days = Number(settings.trustDays ?? 3)
  const [u, setU] = useState('')
  const [code, setCode] = useState('')
  const [p, setP] = useState('')
  const [first, setFirst] = useState(false)          // first sign-in or new phone: temporary password, then link the app
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await login(u, first ? { password: p } : { code, trust: trust && days > 0 }) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const quick = async () => {
    setErr(''); setBusy(true)
    try { await login(trusted.username, { trustToken: trusted.token }) } catch (x) { setErr(x.message); setTrusted(null); setU(trusted.username) } finally { setBusy(false) }
  }
  const forget = () => { try { localStorage.removeItem('accord.trust') } catch (e) { /* */ } setTrusted(null) }
  const ready = u && (first ? p : code.replace(/\D/g, '').length === 6)
  return (
    <div className="login">
      <div className="login-art" style={{ backgroundImage: 'url(experience/editions/yamuna-sky-city/hero.jpg)' }}>
        <div className="cap">Yamuna Sky City · floors 3 to 58</div>
      </div>
      <div className="login-box">
        <form className="login-card" onSubmit={go}>
          <div>
            <div className="studio">OuTSDe<sup>[office]</sup></div>
            <div className="studio-x">Outlook for Theoreticals<br />&amp; Speculative Design</div>
          </div>
          <div>
            <div className="wordmark">Accord</div>
            <div className="edition">Yamuna Sky City edition</div>
          </div>
          <p className="lede" style={{ margin: 0 }}>Sign in with your username and the code from your authenticator app. Your account opens <em>Sales</em>, <em>Design</em> or <em>Vendors</em>.</p>
          {trusted && !first ? <>
            <div className="trusted-box"><span className="small muted">Trusted device · until {new Date(trusted.until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <Button type="button" variant="primary" size="lg" disabled={busy} onClick={quick}>{busy ? 'Checking…' : `Continue as ${trusted.name || trusted.username}`}</Button>
              <button type="button" className="linkish" onClick={forget}>Not you? Sign in with another account</button></div>
            {err && <div className="err" role="alert">{err}</div>}
          </> : <>
          <label className="field"><span className="field-label">Username</span>
            <input className="input" style={{ minHeight: 52 }} autoComplete="username" autoCapitalize="none" spellCheck={false} value={u} onChange={(e) => setU(e.target.value)} placeholder="anuradha" autoFocus /></label>
          {first
            ? <label className="field"><span className="field-label">Temporary password</span>
              <input className="input" style={{ minHeight: 52 }} type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></label>
            : <label className="field"><span className="field-label">6-digit code from the authenticator app</span>
              <input className="input otp" style={{ minHeight: 52 }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} placeholder="000 000" /></label>}
          {!first && days > 0 && <label className="check-inline small"><input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} /> Trust this device for {days} day{days === 1 ? '' : 's'} (only on your own computer or phone)</label>}
          {err && <div className="err" role="alert">{err}</div>}
          <Button variant="primary" size="lg" disabled={busy || !ready}>{busy ? 'Checking…' : first ? 'Continue to link the app' : 'Sign in'}</Button>
          <button type="button" className="linkish" onClick={() => { setFirst(!first); setErr('') }}>{first ? 'I have the app linked: sign in with a code' : 'First sign-in, or a new phone? Use the temporary password'}</button>
          </>}
          <p className="small muted" style={{ margin: 0 }}>
            {backend ? 'For security you sign in each time you open Accord; refreshing or closing the tab signs you out. One computer and one phone per person. A new device waits for an admin. Lost your phone? An admin resets your sign-in under Users and access.'
              : <>Working on this device only. The first sign-in uses the temporary password <b className="mono">{TEMP_PASSWORD}</b>, then you link your authenticator app.</>}
          </p>
          <div className="credits">{CREDITS.map(([n, r]) => <div key={n}>{n}<span>{r}</span></div>)}</div>
          <div className="rights">{RIGHTS} Vendors applying to work with us: <a href="#/apply/vendor">onboarding form</a>.</div>
        </form>
      </div>
    </div>
  )
}
