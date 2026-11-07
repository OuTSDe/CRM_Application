// 8 Nov: how far the tower has been built, read from the construction stages, and setting it in one step.
import { n } from './format.js'

// The top floor a stage finishes: "RCC slab - 22nd to 24th floor" → 24, "RCC slab - ground floor" → 0,
// "Terrace floor" → 61 (above the 60th). Stages before the slabs (booking, agreement, foundation) → -1;
// finishing stages after the terrace (masonry, painting, possession) → null.
export function slabTop(st) {
  const s = String(st?.stage || '')
  if (/terrace/i.test(s)) return 61
  const m = s.match(/(\d+)(?:st|nd|rd|th)?\s*floor/i)
  if (/slab/i.test(s) && m) return n(m[1])
  if (/slab/i.test(s) && /ground/i.test(s)) return 0
  if (/booking|agreement|foundation|excavation|plinth|basement/i.test(s)) return -1
  return null
}
const sorted = (stages) => [...(stages || [])].sort((a, b) => n(a.no) - n(b.no))

// Highest floor whose slab is done, counting completed stages in order (a gap stops the count).
export function builtTo(stages) {
  let top = null
  for (const st of sorted(stages)) {
    const t = slabTop(st)
    if (t === null) break
    if (st.status !== 'Completed') break
    if (t >= 0) top = t
  }
  return top
}

// The stage changes that make the stages say "built up to floor F": every stage up to the slab that reaches F is
// Completed (stages billed before Accord marked "certificate on file"), the next one In progress, later ones not started.
export function progressChanges(stages, floor, { coveredIds = new Set(), date } = {}) {
  const list = sorted(stages)
  const lastIdx = list.reduce((k, st, i) => { const t = slabTop(st); return t !== null && t <= floor ? i : k }, -1)
  const out = []
  list.forEach((st, i) => {
    let next = { ...st }
    if (i <= lastIdx) {
      next.status = 'Completed'
      if (!st.actual && date && st.status !== 'Completed') next.actual = date
      if (!st.certNo && !st.certUrl && st.certWaived !== 'Yes' && coveredIds.has(st.id)) next.certWaived = 'Yes'
    } else if (i === lastIdx + 1) next.status = 'In progress'
    else if (st.status === 'Completed' || st.status === 'In progress') next.status = 'Not started'
    if (next.status !== st.status || next.actual !== st.actual || next.certWaived !== st.certWaived) out.push({ before: st, after: next })
  })
  return out
}
