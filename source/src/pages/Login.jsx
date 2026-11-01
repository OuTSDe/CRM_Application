import React, { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { TEMP_PASSWORD } from '../lib/crypto.js'
import { Button } from '../components/ui.jsx'

export const CREDITS = [['Ar. Shruthadev Bantwal', 'Research Director'], ['Ar. Kajal Diwakar', 'Design Director'], ['Ar. Aryan Shetty', 'Managing Director']]
export const RIGHTS = 'Accord, the Accord method and this software are the intellectual property of OuTSDe, Outlook for Theoreticals & Speculative Design. © 2026 OuTSDe. All rights reserved.'

export default function Login() {
  const { login, backend } = useStore()
  const [u, setU] = useState('')
  const [code, setCode] = useState('')
  const [p, setP] = useState('')
  const [first, setFirst] = useState(false)          // first sign-in or new phone: temporary password, then link the app
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await login(u, first ? { password: p } : { code }) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
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
          <label className="field"><span className="field-label">Username</span>
            <input className="input" style={{ minHeight: 52 }} autoComplete="username" autoCapitalize="none" spellCheck={false} value={u} onChange={(e) => setU(e.target.value)} placeholder="anuradha" autoFocus /></label>
          {first
            ? <label className="field"><span className="field-label">Temporary password</span>
              <input className="input" style={{ minHeight: 52 }} type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></label>
            : <label className="field"><span className="field-label">6-digit code from the authenticator app</span>
              <input className="input otp" style={{ minHeight: 52 }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} placeholder="000 000" /></label>}
          {err && <div className="err" role="alert">{err}</div>}
          <Button variant="primary" size="lg" disabled={busy || !ready}>{busy ? 'Checking…' : first ? 'Continue to link the app' : 'Sign in'}</Button>
          <button type="button" className="linkish" onClick={() => { setFirst(!first); setErr('') }}>{first ? 'I have the app linked: sign in with a code' : 'First sign-in, or a new phone? Use the temporary password'}</button>
          <p className="small muted" style={{ margin: 0 }}>
            {backend ? 'One computer and one phone per person. A new device waits for an admin. Lost your phone? An admin resets your sign-in under Users and access.'
              : <>Working on this device only. The first sign-in uses the temporary password <b className="mono">{TEMP_PASSWORD}</b>, then you link your authenticator app.</>}
          </p>
          <div className="credits">{CREDITS.map(([n, r]) => <div key={n}>{n}<span>{r}</span></div>)}</div>
          <div className="rights">{RIGHTS} Vendors applying to work with us: <a href="#/apply/vendor">onboarding form</a>.</div>
        </form>
      </div>
    </div>
  )
}
