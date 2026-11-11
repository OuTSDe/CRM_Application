// 12 Nov (d): the logo lives on Drive (Accord_Data / Brand); settings keep only its link (brand.logo).
// - an https link (the file is shared "anyone with the link can view"): shown as it is;
// - 'drive:<file id>' (link sharing not allowed on the account): fetched once from the backend and kept on this device;
// - an older data:image/... value (before 12 Nov): shown as it is until it is moved.
import { useEffect, useState } from 'react'
import { useStore } from './store.jsx'

const KEY = 'accord.logo'
const cached = (id) => { try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); return c && c.id === id ? c.src : '' } catch (e) { return '' } }

export function useLogo(src) {
  const { call, session, online } = useStore()
  const id = String(src || '').startsWith('drive:') ? String(src).slice(6) : ''
  const [data, setData] = useState(() => (id ? cached(id) : ''))
  useEffect(() => {
    if (!id) return undefined
    const c = cached(id)
    if (c) { setData(c); return undefined }
    if (!online || !session?.token) return undefined
    let live = true
    call({ action: 'logo', token: session.token }).then((j) => {
      if (!live || !j || !j.data) return
      const s = `data:${j.mime || 'image/png'};base64,${j.data}`
      try { localStorage.setItem(KEY, JSON.stringify({ id, src: s })) } catch (e) { /* storage full: show it without keeping */ }
      setData(s)
    }).catch(() => {})
    return () => { live = false }
  }, [id, online, session?.token]) // eslint-disable-line
  return id ? data : String(src || '')
}
