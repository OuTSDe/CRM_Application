const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
export const n = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v))
export const inr = (v, dash = '–') => (v === null || v === undefined || v === '' ? dash : '₹' + inr0.format(Math.round(n(v))))
export const num = (v, d = 0) => (v === null || v === undefined || v === '' ? '–' : (d ? inr2 : inr0).format(n(v)))
export const pct = (v, d = 0) => (v === null || v === undefined || v === '' || isNaN(v) ? '–' : (n(v) * 100).toFixed(d) + '%')
export const cr = (v) => (n(v) / 1e7).toFixed(2) + ' Cr'
export const lakh = (v) => (Math.abs(n(v)) >= 1e7 ? (n(v) / 1e7).toFixed(2) + ' Cr' : (n(v) / 1e5).toFixed(2) + ' L')
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const d = (iso) => {
  if (!iso) return '–'
  const [y, m, dd] = String(iso).slice(0, 10).split('-')
  if (!m) return String(iso)
  return `${dd}-${MON[Number(m) - 1]}-${y}`
}
export const today = () => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10) }
export const nowTime = () => new Date().toTimeString().slice(0, 5)
export const daysBetween = (a, b = today()) => (a ? Math.round((new Date(b) - new Date(String(a).slice(0, 10))) / 864e5) : null)
export const addDays = (iso, k) => { const t = new Date(iso); t.setDate(t.getDate() + k); return t.toISOString().slice(0, 10) }
export const words = (num0) => {
  // Indian numbering in words (rupees)
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (x) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''))
  const three = (x) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x))
  let x = Math.round(n(num0)); if (!x) return 'Zero'
  const parts = []
  const crore = Math.floor(x / 1e7); x %= 1e7
  const lak = Math.floor(x / 1e5); x %= 1e5
  const th = Math.floor(x / 1e3); x %= 1e3
  if (crore) parts.push(three(crore) + ' Crore')
  if (lak) parts.push(two(lak) + ' Lakh')
  if (th) parts.push(two(th) + ' Thousand')
  if (x) parts.push(three(x))
  return parts.join(' ')
}
export const initials = (s = '') => s.replace(/^(Mr|Mrs|Ms|Dr)\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
export const waLink = (phone, text) => {
  let p = String(phone || '').replace(/[^\d]/g, '')
  if (p.length === 10) p = '91' + p
  return `https://wa.me/${p}?text=${encodeURIComponent(text || '')}`
}

// Titles, as the team asked for on 31 Oct: some clients are particular about Dr, Mrs or Ms.
export const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Mr. and Mrs.', 'Dr. and Mrs.', 'Dr. and Dr.', 'Capt.', 'Col.', 'Adv.', 'CA']
export const fullName = (r) => (r ? [r.title, r.name].filter(Boolean).join(' ') : '')
// How a message opens: "Dear Dr. Rashmi Shenoy" with a title, "Dear Rashmi" without one.
export const salute = (r) => (!r ? 'Sir/Madam' : r.title ? fullName(r) : (r.name || '').split(' ')[0] || 'Sir/Madam')
// Cities the team meets most, plus whatever is already on file
export const CITIES = ['Mangaluru', 'Udupi', 'Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Kochi', 'Kasaragod', 'Puttur', 'Bantwal', 'Manipal', 'Karkala', 'Kundapura', 'Shivamogga', 'Mysuru', 'Hubballi', 'Belagavi', 'Delhi', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Doha', 'Muscat', 'Kuwait City', 'Riyadh', 'Jeddah', 'Dammam', 'Bahrain', 'Singapore', 'London', 'New York', 'Toronto', 'Sydney', 'Melbourne']
export const addWorkingDays = (iso, k, off = [0]) => { const t = new Date(iso); let left = k; while (left > 0) { t.setDate(t.getDate() + 1); if (!off.includes(t.getDay())) left-- } return t.toISOString().slice(0, 10) }
export const workingDaysBetween = (a, b = today(), off = [0]) => { if (!a) return null; const s = new Date(String(a).slice(0, 10)), e = new Date(String(b).slice(0, 10)); let k = 0; while (s < e) { s.setDate(s.getDate() + 1); if (!off.includes(s.getDay())) k++ } return k }
