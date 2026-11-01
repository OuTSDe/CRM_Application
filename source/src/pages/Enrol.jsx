import React, { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { qrSvg } from '../lib/totp.js'
import { Button } from '../components/ui.jsx'

// Linking the authenticator app (1 Nov: "hook it up to an authenticator app rather than passwords").
// Shown once, after the temporary password. The QR code is drawn on this device; the secret is not sent to any QR service.
export default function Enrol() {
  const { user, enrolStart, enrolConfirm, logout, notify } = useStore()
  const [info, setInfo] = useState(null)
  const [code, setCode] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { enrolStart().then(setInfo).catch((e) => setErr(e.message)) }, []) // eslint-disable-line
  const go = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await enrolConfirm(code, email.trim()); notify('Authenticator linked. From now on, sign in with the 6-digit code.') } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  const phone = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  return (
    <div className="login enrol">
      <form className="login-card enrol-card" onSubmit={go}>
        <div>
          <div className="wordmark" style={{ fontSize: 34 }}>Link your authenticator</div>
          <p className="lede" style={{ margin: '8px 0 0' }}>{user?.name}, Accord uses a 6-digit code from an app on your phone instead of a password. Nobody can sign in as you without your phone.</p>
        </div>
        <ol className="enrol-steps">
          <li><b>Install an authenticator app</b> on your phone: Google Authenticator (<a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noreferrer">Android</a> · <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noreferrer">iPhone</a>) or Microsoft Authenticator. Sign in to it with your Gmail so the codes are backed up.</li>
          <li><b>{phone ? 'Tap "Open in the app", or add a key by hand' : 'Scan this code'}</b> with the app (+, then Scan a QR code).
            <div className="enrol-qr">{info ? <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg(info.uri, 5) }} /> : <div className="qr skel" />}
              <div className="small">
                {info && phone && <a className="btn btn-sm" href={info.uri}>Open in the app</a>}
                <div className="muted" style={{ marginTop: 8 }}>Or type this key, time based:</div>
                <div className="mono enrol-key">{info ? info.secret.match(/.{1,4}/g).join(' ') : '…'}</div>
                <div className="muted">Account: Accord (Yamuna Sky City) · {user?.username}</div>
              </div></div></li>
          <li><b>Type the 6-digit code</b> the app shows for Accord.
            <input className="input otp" style={{ minHeight: 52, marginTop: 8 }} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} placeholder="000 000" autoFocus /></li>
          <li><b>Your e-mail</b> (Gmail is fine), for follow-up reminders and the morning digest.
            <input className="input" type="email" style={{ marginTop: 8 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoComplete="email" /></li>
        </ol>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row gap-s"><Button variant="primary" size="lg" disabled={busy || code.replace(/\D/g, '').length !== 6}>{busy ? 'Checking…' : 'Link and continue'}</Button>
          <Button type="button" onClick={logout}>Cancel</Button></div>
        <p className="small muted" style={{ margin: 0 }}>Accord works on one computer and one phone per person. Changing phones? Ask an admin to reset your sign-in; you link the new phone the same way.</p>
      </form>
    </div>
  )
}
