// Small SHA-256 (works without crypto.subtle, e.g. when the app is opened from a file).
export async function sha256(msg) {
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch (e) { /* fallback */ }
  return sha256js(msg)
}
function sha256js(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a))
  const words = []; const bytes = new TextEncoder().encode(ascii); const len = bytes.length * 8
  const k = []; const hash = []; let primes = 0
  const isComposite = {}
  for (let c = 2; primes < 64; c++) {
    if (!isComposite[c]) {
      for (let i = 0; i < 313; i += c) isComposite[i] = c
      hash[primes] = (Math.pow(c, 0.5) * 0x100000000) | 0
      k[primes++] = (Math.pow(c, 1 / 3) * 0x100000000) | 0
    }
  }
  const H = hash.slice(0, 8)
  const b = [...bytes, 0x80]
  while (b.length % 64 - 56) b.push(0)
  for (let i = 0; i < b.length; i++) words[i >> 2] |= b[i] << ((3 - i) % 4) * 8
  words[words.length] = (len / 0x100000000) | 0
  words[words.length] = len
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16)); const old = H.slice(0)
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]
      const a = H[0], e = H[4]
      const t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ (~e & H[6])) + k[i] +
        (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0)
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]))
      H.unshift((t1 + t2) | 0); H[4] = (H[4] + t1) | 0; H.length = 8
    }
    for (let i = 0; i < 8; i++) H[i] = (H[i] + old[i]) | 0
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('')
}
