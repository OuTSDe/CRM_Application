// Can this person use what an article describes? Everyone may read every article (10 Nov); the ones outside their
// access are marked, with who has it by default and what to ask an admin for.
import { ACCESS_ITEMS, ROLES, canPage } from '../lib/perms.js'

const ITEM = Object.fromEntries(ACCESS_ITEMS.map((x) => [x.key, x]))
const ROLE_LIST = (rs) => rs.filter((r) => r !== 'admin').map((r) => ROLES[r]?.split(' (')[0]).filter(Boolean)

export function accessOf(user, a) {
  const need = a.access || []
  const missing = need.filter((k) => !canPage(user, k))
  const roleOk = !a.roles || user?.appRole === 'admin' || a.roles.includes(user?.appRole)
  const ok = !missing.length && roleOk
  if (ok) return { ok: true }
  const labels = missing.map((k) => (k === 'admin' ? 'the Admin pages' : ITEM[k]?.label || k))
  const holders = new Set()
  missing.forEach((k) => (k === 'admin' ? [] : ROLE_LIST(ITEM[k]?.roles || [])).forEach((r) => holders.add(r)))
  if (!roleOk) ROLE_LIST(a.roles).forEach((r) => holders.add(r))
  const who = holders.size ? [...holders].join(', ') + ' and admins' : 'Admins only'
  const ask = missing.includes('admin') || !roleOk && !missing.length
    ? 'This is done by ' + (a.roles ? who.replace(' and admins', ', or an admin') : 'an admin') + '.'
    : `Ask an admin to tick ${labels.map((l) => '"' + l + '"').join(' and ')} for you in Users and access › Pages and permissions.`
  return { ok: false, who, ask, labels }
}
