// Light and dark. The choice is per browser; until someone picks, it follows the system setting.
const KEY = 'accord.theme'
export const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
export function savedTheme() { try { return localStorage.getItem(KEY) || '' } catch (e) { return '' } }
export function applyTheme(t = savedTheme() || systemTheme()) {
  document.documentElement.dataset.theme = t
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'light' ? '#F5F1EC' : '#0C0A0A'
  return t
}
export function setTheme(t) { try { localStorage.setItem(KEY, t) } catch (e) { /* private window */ } return applyTheme(t) }
