// Escalation, the same rule the server runs each morning (Code.gs escalateOverdue):
// a follow-up still open N working days after its date goes to each owner's manager, another N to theirs.
import { today, workingDaysBetween } from './format.js'

export function escalationsFor(db, me, settings = {}) {
  const N = Math.max(1, Number(settings.escalateDays || 2)), t = today()
  const boss = {}; (db.users || []).forEach((u) => { if (u.reportsTo) boss[u.name] = u.reportsTo })
  const latest = {}; db.interactions.forEach((i) => { const k = (i.date || '') + (i.time || ''); if (!latest[i.recordId] || k > latest[i.recordId]) latest[i.recordId] = k })
  const out = []
  db.interactions.filter((i) => i.status === 'Open' && i.nextDate && i.nextDate < t).forEach((i) => {
    if (latest[i.recordId] > (i.date || '') + (i.time || '')) return   // 12 Nov (g): anyone has logged contact since it was set
    const late = workingDaysBetween(i.nextDate, t), level = Math.floor(late / N)
    if (level < 1) return
    const owners = i.nextOwners?.length ? i.nextOwners : [i.nextOwner || i.by]
    owners.forEach((o) => { let to = o; for (let k = 1; k <= level && boss[to]; k++) { to = boss[to]; if (to === me && to !== o) { out.push({ ...i, owner: o, late, level: k }); break } } })
  })
  return out.sort((a, b) => b.late - a.late)
}
