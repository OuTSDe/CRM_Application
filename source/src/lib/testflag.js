// Demo mode and test entries (1 Nov: "entries happening by mistake while showing around… it should recognise those").
// 1. Demo mode (user menu): everything created while it is on carries _test = Yes, sends no reminders and is listed for clean-up.
// 2. Everything else is checked against simple signs of a test entry. Admin > Data clean-up lists both; nothing is deleted on its own.
export const DEMO_KEY = 'accord.demo'
export const demoOn = () => { try { return localStorage.getItem(DEMO_KEY) === '1' } catch (e) { return false } }
export const setDemo = (on) => { try { on ? localStorage.setItem(DEMO_KEY, '1') : localStorage.removeItem(DEMO_KEY) } catch (e) { /* */ } }

const JUNK = /\b(test|testing|tester|demo|dummy|sample|asdf+|qwer\w*|xyz|abc|abcd|foo|bar|lorem|ipsum|na|n\/a|xxx+|aaa+|blah|check)\b/i
const ONE_CHAR = /^(.)\1*$/
function phoneJunk(p) { const d = String(p || '').replace(/\D/g, '').slice(-10); if (!d) return false; return d.length < 10 || ONE_CHAR.test(d) || ['1234567890', '0123456789', '9876543210', '1234512345'].includes(d) }
function emailJunk(e) { return !!e && (/@(test|example|mailinator|abc|xyz)\./i.test(e) || /^(test|demo|abc|asdf)/i.test(e)) }

// Returns the reasons a record looks like a test, or [] if it looks real.
export function testReasons(coll, r) {
  if (!r) return []
  const why = []
  if (r._test === 'Yes') why.push('made in demo mode')
  const name = r.name || r.recordName || r.payer || r.title || ''
  if (name && (JUNK.test(name) || ONE_CHAR.test(name.replace(/\s/g, '')) || name.replace(/[^a-z]/gi, '').length < 2)) why.push(`name "${name}"`)
  if ((coll === 'leads' || coll === 'clients') && phoneJunk(r.phone)) why.push(`phone ${r.phone}`)
  if (emailJunk(r.email)) why.push(`e-mail ${r.email}`)
  if (coll === 'interactions' && r.summary && (JUNK.test(r.summary) || r.summary.trim().length < 3)) why.push(`summary "${String(r.summary).slice(0, 30)}"`)
  if (coll === 'payments' && Number(r.amount) > 0 && Number(r.amount) < 100) why.push(`amount ₹${r.amount}`)
  if (coll === 'tasks' && r.title && JUNK.test(r.title)) why.push(`task "${r.title}"`)
  if (r.notTest === 'Yes') return []
  return why
}
export const CLEANUP_COLLS = ['leads', 'clients', 'interactions', 'payments', 'tasks', 'viewings', 'costSheets', 'issues', 'messages', 'files']
