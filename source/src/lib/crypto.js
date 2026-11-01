// Password hashing shared with the backend (backend/Code.gs hash_):
// h0 = sha256(salt + ':' + password), then h = sha256(h + salt), 1000 rounds in all. Hex output.
import { sha256 } from './sha256.js'

export const ROUNDS = 1000
export async function hashPassword(salt, pw) {
  let h = await sha256(salt + ':' + pw)
  for (let i = 1; i < ROUNDS; i++) h = await sha256(h + salt)
  return h
}
export const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
export const strongEnough = (pw) => typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw)
export const TEMP_PASSWORD = 'Accord2026' // local mode only: everyone's first sign-in, changed straight away

// A stable id for this browser, used for device approval and the time log.
export function deviceId() {
  try {
    let id = localStorage.getItem('accord.device')
    if (!id) { id = 'D-' + newSalt().slice(0, 12); localStorage.setItem('accord.device', id) }
    return id
  } catch (e) { return 'D-unknown' }
}
export const deviceLabel = () => {
  const ua = navigator.userAgent
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Other'
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Browser'
  return `${br} on ${os}`
}
// 1 Nov: one computer and one phone per person. Tablets count as the phone.
export const deviceKind = () => (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ? 'phone' : 'computer')
