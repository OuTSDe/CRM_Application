// 10 Nov: Help centre search. Works on plain questions ("how do I record a payment"), single words ("receipt"),
// office words ("flat", "EMI", "CP", "site visit") and typos ("recipt", "parkng"). No server, no model: the
// whole index is the article list, built once in the browser.
import { ARTICLES } from './articles.js'

// Two-word terms read as one word, so "car park" matches "parking" and "site visit" matches "private viewing"
const PHRASES = [
  ['car park', 'carpark'], ['car parks', 'carpark'], ['car parking', 'carpark'], ['cost sheet', 'costsheet'], ['cost sheets', 'costsheet'],
  ['site visit', 'sitevisit'], ['site visits', 'sitevisit'], ['private viewing', 'sitevisit'], ['follow up', 'followup'], ['follow-up', 'followup'], ['follow ups', 'followup'], ['follow-ups', 'followup'],
  ['log in', 'signin'], ['login', 'signin'], ['sign in', 'signin'], ['sign-in', 'signin'], ['log on', 'signin'], ['logon', 'signin'],
  ['log out', 'signout'], ['logout', 'signout'], ['sign out', 'signout'], ['punch in', 'punchin'], ['punch out', 'punchout'],
  ['demand letter', 'demandletter'], ['demand letters', 'demandletter'], ['demand call', 'demandletter'], ['demand notice', 'demandletter'],
  ['channel partner', 'broker'], ['channel partners', 'broker'], ['client 360', 'client360'], ['e brochure', 'ebrochure'], ['e-brochure', 'ebrochure'],
  ['payment schedule', 'schedule'], ['payment plan', 'schedule'], ['booking form', 'bookingform'], ['application form', 'bookingform'],
  ['two wheeler', 'twowheeler'], ['lead inbox', 'leadinbox'], ['rate card', 'ratecard'], ['bulk send', 'bulksend'], ['whats app', 'whatsapp'],
  ['e mail', 'email'], ['e-mail', 'email'], ['e-mailed', 'email'], ['pdf', 'print'], ['sq ft', 'sft'], ['sqft', 'sft'],
]
// Words that mean the same thing here. The first word of a group is the one the articles use most.
const GROUPS = [
  'residence flat unit apartment property home house villa duplex',
  'payment pay paid money amount collection collect instalment installment emi dues due',
  'receipt slip acknowledgement acknowledgment',
  'lead enquiry inquiry prospect',
  'client buyer customer owner purchaser allottee',
  'costsheet quote quotation price pricing costing estimate',
  'carpark parking slot bay garage',
  'cancel cancellation terminate withdraw',
  'move transfer shift swap',
  'document doc docs paper papers file files kyc attachment attach',
  'upload scan photograph',
  'signin password otp code authenticator 2fa mfa',
  'signout timeout',
  'punchin attendance clock timesheet checkin',
  'sitevisit viewing visit showround tour walk',
  'ebrochure brochure presentation pitch present',
  'message whatsapp sms email mail text',
  'followup reminder remind callback',
  'notification alert bell',
  'report mis',
  'analytics chart stats statistics graph insight',
  'delete remove erase',
  'edit change update modify correct fix wrong mistake',
  'print download export pdf',
  'broker agent cp partner',
  'task todo',
  'user employee staff member',
  'access permission rights allow',
  'role roles',
  'demandletter demand',
  'refund',
  'interest penalty late',
  'schedule plan clp milestone slab',
  'construction progress stage certificate',
  'booking book reserve token',
  'tower floor building elevation plate',
  'new add create make register enter record',
  'log interaction call conversation note remark',
  'vendor supplier contractor',
  'outstanding overdue pending receivable',
  'leave holiday off',
  'phone mobile number',
  'admin administrator',
  'design interior',
  'drive folder storage',
]
const STOP = new Set(('a an the to of for in on at by with from and or is are was be can could should would will do does did i me my we our you your it this that these those ' +
  'how what where when why which who whom there here please want need get see find show tell help about into out up any some all one way kindly ' +
  'kaise kahan karna karo kare hai ka ki ke mein se ko').split(' '))
const NOT_STOP = new Set(['not', 'no', 'out'])   // "not opening", "no receipt": kept

const stem = (w) => {
  if (w.length <= 3 || /\d/.test(w)) return w
  let b = w
  if (b.endsWith('ies') && b.length > 4) b = b.slice(0, -3) + 'y'
  else if (/(ss|x|z|ch|sh)es$/.test(b)) b = b.slice(0, -2)
  else if (b.endsWith('s') && !/(ss|us|is)$/.test(b)) b = b.slice(0, -1)
  if (b.endsWith('ing') && b.length - 3 >= 3) b = b.slice(0, -3)
  else if (b.endsWith('ied') && b.length > 4) b = b.slice(0, -3) + 'y'
  else if (b.endsWith('ed') && b.length - 2 >= 3) b = b.slice(0, -2)
  if (/([bcdfgkmnprtvz])\1$/.test(b)) b = b.slice(0, -1)        // planned → plan
  if (b.endsWith('e') && b.length > 3) b = b.slice(0, -1)        // store, stored → stor
  return b
}
export function normalise(s) {
  let t = ' ' + String(s || '').toLowerCase().replace(/[’']/g, '').replace(/₹/g, ' rupee ').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ') + ' '
  PHRASES.forEach(([a, b]) => { t = t.split(' ' + a + ' ').join(' ' + b + ' ') })
  return t.replace(/-/g, ' ').trim()
}
export const tokens = (s, keepStop) => normalise(s).split(' ').filter((w) => w && !/^\d$/.test(w) && (keepStop || !STOP.has(w) || NOT_STOP.has(w))).map(stem)

const GROUP_OF = new Map()
GROUPS.forEach((g, i) => g.split(' ').forEach((w) => GROUP_OF.set(stem(w), i)))
const GROUP_WORDS = GROUPS.map((g) => [...new Set(g.split(' ').map(stem))])

// ── the index: per article, a map of token → best field weight
const FIELDS = [['title', 6], ['q', 4], ['k', 3], ['summary', 2], ['where', 1.5], ['steps', 1], ['tips', 0.6]]
const text = (a, f) => (Array.isArray(a[f]) ? a[f].join(' ') : a[f] || '').replace(/\*\*/g, '')
const INDEX = ARTICLES.map((a) => {
  const w = new Map()
  FIELDS.forEach(([f, wt]) => tokens(text(a, f)).forEach((t) => { if ((w.get(t) || 0) < wt) w.set(t, wt) }))
  return { a, w, title: ' ' + normalise(a.title) + ' ', qs: (a.q || []).map((x) => ' ' + normalise(x) + ' ') }
})
const VOCAB = [...new Set(INDEX.flatMap((x) => [...x.w.keys()]))]
const VSET = new Set(VOCAB)
// the words as written (unstemmed), so a typo is compared with "parking", not with its stem "park"
const RAW = new Map()
ARTICLES.forEach((a) => FIELDS.forEach(([f]) => normalise(text(a, f)).split(' ').forEach((w) => { if (w.length >= 3 && !STOP.has(w) && !RAW.has(w)) RAW.set(w, stem(w)) })))

// edit distance with a cut-off (enough for typos)
function dist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  // two swapped neighbours ("reciept") count as one slip
  if (a.length === b.length) { const d = [...a].map((c, i) => c !== b[i] ? i : -1).filter((i) => i >= 0); if (d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]]) return 1 }
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]) }
    if (best > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}
const fuzzyCache = new Map()
function fuzzy(t, raw) {
  const key = t + '|' + (raw || '')
  if (fuzzyCache.has(key)) return fuzzyCache.get(key)
  const src = raw || t
  const max = src.length >= 8 ? 2 : src.length >= 4 ? 1 : 0
  const out = []
  if (max) {
    RAW.forEach((st, w) => { if (w[0] === src[0] && w !== src && dist(src, w, max) <= max && !out.includes(st)) out.push(st) })
    VOCAB.forEach((v) => { if (v[0] === t[0] && v !== t && !out.includes(v) && dist(t, v, max) <= max) out.push(v) })
  }
  fuzzyCache.set(key, out); return out
}
const rawTokens = (s) => normalise(s).split(' ').filter((w) => w && !/^\d$/.test(w) && (!STOP.has(w) || NOT_STOP.has(w)))

// one query word → the words it may match, each with a weight
function expand(t, last, raw) {
  const m = new Map([[t, 1]])
  const g = GROUP_OF.get(t)
  if (g !== undefined) GROUP_WORDS[g].forEach((w) => { if (!m.has(w)) m.set(w, 0.75) })
  if (!VSET.has(t) && g === undefined) fuzzy(t, raw).forEach((w) => { if (!m.has(w)) m.set(w, 0.6); const g2 = GROUP_OF.get(w); if (g2 !== undefined) GROUP_WORDS[g2].forEach((x) => { if (!m.has(x)) m.set(x, 0.5) }) })
  if (last && t.length >= 2) VOCAB.forEach((v) => { if (v.length > t.length && v.startsWith(t) && !m.has(v)) m.set(v, 0.55) })   // still typing
  return m
}

// Returns [{ a, score, hits: Set(tokens matched) }], best first, and a "did you mean" when words were corrected.
export function search(query, { limit = 30, typing = false } = {}) {
  const q = tokens(query)
  if (!q.length) return { results: [], terms: [], corrected: '' }
  const raw = rawTokens(query)
  const ex = q.map((t, i) => expand(t, typing && i === q.length - 1, raw[i]))
  const nq = ' ' + normalise(query) + ' '
  const results = []
  for (const x of INDEX) {
    let score = 0, matched = 0
    const hits = new Set()
    ex.forEach((m) => {
      let best = 0, bw = ''
      m.forEach((wt, w) => { const f = x.w.get(w); if (f && f * wt > best) { best = f * wt; bw = w } })
      if (best) { score += best; matched++; hits.add(bw) }
    })
    if (!matched) continue
    const cover = matched / q.length
    score *= 0.35 + 0.65 * cover * cover
    if (nq.trim().length > 3 && (x.title.includes(nq) || x.qs.some((s) => s.includes(nq)))) score += 8   // the question as written
    else if (x.qs.some((s) => q.every((t) => s.includes(t)))) score += 4
    const tl = x.title.trim().split(' ').length
    score += [...hits].filter((h) => x.w.get(h) === 6).length * (2 / tl)
    results.push({ a: x.a, score, hits })
  }
  results.sort((p, r) => r.score - p.score)
  const top = results[0]?.score || 0
  const out = results.filter((r) => r.score >= Math.max(top * 0.34, 3)).slice(0, limit)
  // "Did you mean": words not known that were matched through a typo
  let corrected = ''
  if (!typing && out.length) {
    const fix = q.map((t, i) => (VSET.has(t) || GROUP_OF.has(t) ? null : fuzzy(t, raw[i]).find((w) => out[0].hits.has(w))))
    if (fix.some(Boolean)) corrected = raw.map((w, i) => (fix[i] ? [...RAW].find(([, st]) => st === fix[i])?.[0] || fix[i] : w)).join(' ')
  }
  // words to mark in titles and summaries: what was typed and its close synonyms, not loose prefix or typo guesses
  const terms = [...new Set(ex.flatMap((m) => [...m].filter(([, wt]) => wt >= 0.6).map(([w]) => w)))]
  return { results: out, terms, corrected }
}

// Wrap matched words in <mark>, for titles and summaries. Returns React-free segments: [{ t, m }]
export function highlight(str, terms) {
  const s = String(str || '').replace(/\*/g, '')
  if (!terms?.length) return [{ t: s, m: false }]
  const out = []
  s.split(/(\s+)/).forEach((w) => {
    const core = w.toLowerCase().replace(/[^a-z0-9]/g, '')
    const st = core && stem(core)
    const hit = st && st.length > 1 && terms.some((t) => t.length > 1 && (st === t || (t.length >= 4 && st.startsWith(t))))
    const last = out[out.length - 1]
    if (last && last.m === !!hit) last.t += w; else out.push({ t: w, m: !!hit })
  })
  return out
}
