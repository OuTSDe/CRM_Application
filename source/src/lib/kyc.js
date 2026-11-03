// 2 Nov: a quick check of a PAN or Aadhaar card photo before it is filed. The text is read in this browser
// (Tesseract.js, loaded from a CDN the first time it is needed); the photo is not sent anywhere else.
// Aadhaar numbers are reduced to the last 4 digits straight away and only those are kept.
let loading = null
const loadTesseract = () => {
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  if (!loading) loading = new Promise((ok, bad) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    s.onload = () => (window.Tesseract ? ok(window.Tesseract) : bad(new Error('Card reader did not load')))
    s.onerror = () => { loading = null; bad(new Error('Card reader could not be loaded. Check the internet connection.')) }
    document.head.appendChild(s)
  })
  return loading
}

export const PAN_RE = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/
export const AADHAAR_RE = /(?<![\d/])(\d{4})[ ]?(\d{4})[ ]?(\d{4})(?!\d)/
const DOB_RE = /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/

// Pure text check, used after OCR (and in tests).
export function readCard(text, expect) {
  const t = String(text || '').toUpperCase().replace(/[|]/g, 'I')
  const pan = t.replace(/\s+/g, ' ').match(PAN_RE)
  const aad = t.match(AADHAAR_RE)
  const dob = t.match(DOB_RE) || t.match(/(?:YEAR OF BIRTH|YOB)\D*(\d{4})/)
  const isPan = !!pan || /INCOME\s*TAX|PERMANENT\s*ACCOUNT/.test(t)
  const isAad = !!aad && (/AADHAAR|UIDAI|GOVERNMENT OF INDIA|आधार/.test(t) || !pan)
  const kind = expect === 'pan' ? (isPan ? 'PAN' : '') : expect === 'aadhaar' ? (isAad ? 'Aadhaar' : '') : isPan ? 'PAN' : isAad ? 'Aadhaar' : ''
  const out = { kind, number: '', dob: dob ? (dob[3] ? `${dob[1]}/${dob[2]}/${dob[3]}` : dob[1]) : '', name: '' }
  if (kind === 'PAN' && pan) out.number = pan[1]
  if (kind === 'Aadhaar' && aad) out.number = 'XXXX XXXX ' + aad[3]
  // name: the line after "NAME" on a PAN, or the first all-letters line of 2 to 4 words
  const lines = t.split(/\n/).map((x) => x.trim()).filter(Boolean)
  const ni = lines.findIndex((x) => /^NAME\b|^नाम/.test(x))
  const cand = ni >= 0 && lines[ni + 1] ? lines[ni + 1] : lines.find((x) => /^[A-Z][A-Z .]{3,40}$/.test(x) && x.split(' ').length >= 2 && x.split(' ').length <= 4 && !/INCOME|GOVERNMENT|INDIA|DEPARTMENT|PERMANENT|ACCOUNT|AADHAAR/.test(x))
  if (cand) out.name = cand.replace(/[^A-Z .]/g, '').replace(/\s+/g, ' ').trim()
  return out
}

const nameMatch = (a, b) => {
  const w = (x) => String(x || '').toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((y) => y.length > 1)
  const A = w(a), B = new Set(w(b)); if (!A.length || !B.size) return null
  return A.filter((x) => B.has(x)).length / A.length >= 0.5
}

// Returns { ok, kind, number, name, dob, nameOk, note }. Never throws for a card that cannot be read.
export async function checkCard(file, expect, expectedName) {
  if (!file || !/^image\//.test(file.type)) return { ok: null, kind: '', note: 'Only photos are checked. PDFs are filed as they are; check them by eye.' }
  const T = await loadTesseract()
  const r = await T.recognize(file, 'eng')
  const got = readCard(r?.data?.text || '', expect)
  const nameOk = got.name ? nameMatch(got.name, expectedName) : null
  const want = expect === 'pan' ? 'PAN' : 'Aadhaar'
  const ok = got.kind === want && !!got.number
  const note = !got.kind ? `This does not look like a ${want} card.` : !got.number ? `${got.kind} card, but the number could not be read clearly.` :
    nameOk === false ? `${got.kind} ${got.number}, but the name on the card (${got.name}) does not match ${expectedName}.` : `${got.kind} ${got.number}${got.name ? ' · ' + got.name : ''}${got.dob ? ' · born ' + got.dob : ''}`
  return { ok: ok && nameOk !== false, ...got, nameOk, note }
}
