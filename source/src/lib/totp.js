// Authenticator codes (RFC 6238, the format Google and Microsoft Authenticator read): 30-second steps, 6 digits, HMAC-SHA1.
// The server (backend/Code.gs totpCheck_) does the same check; this copy runs only when Accord is used on one device.
import qrcode from 'qrcode-generator'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function b32enc(bytes) { let bits = 0, val = 0, out = ''; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5 } } if (bits > 0) out += B32[(val << (5 - bits)) & 31]; return out }
export function b32dec(s) { let bits = 0, val = 0; const out = []; for (const c of String(s).toUpperCase().replace(/[^A-Z2-7]/g, '')) { val = (val << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8 } } return new Uint8Array(out) }
export const newSecret = () => b32enc(crypto.getRandomValues(new Uint8Array(20)))

export async function totpAt(secret, step) {
  const msg = new Uint8Array(8); let x = step; for (let i = 7; i >= 0; i--) { msg[i] = x % 256; x = Math.floor(x / 256) }
  const key = await crypto.subtle.importKey('raw', b32dec(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)), o = h[19] & 15
  const bin = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(bin % 1e6).padStart(6, '0')
}
export async function totpCheck(secret, code, last = 0) {
  code = String(code || '').replace(/\D/g, ''); if (code.length !== 6 || !secret) return -1
  const now = Math.floor(Date.now() / 30000)
  for (let k = -1; k <= 1; k++) { const st = now + k; if (st > Number(last || 0) && (await totpAt(secret, st)) === code) return st }
  return -1
}
export const otpUri = (username, secret) => `otpauth://totp/${encodeURIComponent('Accord (Yamuna Sky City)')}:${encodeURIComponent(username)}?secret=${secret}&issuer=Accord&digits=6&period=30`

// An SVG QR code for the otpauth link, drawn locally (the secret never leaves the browser for a QR service).
export function qrSvg(text, px = 4) {
  const q = qrcode(0, 'M'); q.addData(text); q.make()
  return q.createSvgTag({ cellSize: px, margin: 2, scalable: true })
}
