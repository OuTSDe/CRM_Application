// 8 Nov: keep each page of a multi-page document on its own A4 sheet. Every `.cs-page` inside the container is
// measured at its print width; if its content runs past one A4 page it is scaled down just enough to fit (never below
// MIN), so a signature block never spills onto the next sheet. Runs after render, when images load and before printing.
import { useEffect, useLayoutEffect } from 'react'

const MM = 96 / 25.4
export const PAGE_H = 265 * MM   // 297 mm less the 11 mm top and 13 mm bottom print margins, less 8 mm for print font differences
const MIN = 0.7

export function fitPages(root) {
  if (!root) return
  const wide = window.innerWidth >= 820 || window.matchMedia?.('print').matches
  root.querySelectorAll('.cs-page').forEach((p) => {
    p.style.zoom = ''; p.style.width = ''
    if (!wide) return
    const h = p.scrollHeight
    if (h <= PAGE_H) return
    let z = Math.max(MIN, PAGE_H / h)
    // widen the content box by 1/z so the scaled page keeps the full text width, then check once more
    p.style.width = `calc(184mm / ${z})`; p.style.zoom = z
    const h2 = p.scrollHeight
    if (h2 * z > PAGE_H) { z = Math.max(MIN, (PAGE_H / h2) * z * 0.995); p.style.width = `calc(184mm / ${z})`; p.style.zoom = z }
  })
}

export function useFitPages(ref, deps = []) {
  useLayoutEffect(() => { fitPages(ref.current) })   // every render: content may have changed
  useEffect(() => {
    const el = ref.current; if (!el) return
    const run = () => fitPages(ref.current)
    const t = setTimeout(run, 400)
    const imgs = [...el.querySelectorAll('img, image')]
    imgs.forEach((i) => i.addEventListener('load', run))
    window.addEventListener('beforeprint', run); window.addEventListener('resize', run)
    return () => { clearTimeout(t); imgs.forEach((i) => i.removeEventListener('load', run)); window.removeEventListener('beforeprint', run); window.removeEventListener('resize', run) }
  }, deps) // eslint-disable-line
}
