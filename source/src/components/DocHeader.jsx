import React from 'react'
import { useStore } from '../lib/store.jsx'
import { useLogo } from '../lib/logo.js'

// The Yamuna Sky City header on every printed document (1 Nov: cost sheet, payment slip, payment and financial summary,
// booking form, lead sheet). Logo and lines come from Admin > Settings > Brand; it falls back to the project name.
export default function DocHeader({ title, right = [], sub }) {
  const { settings } = useStore()
  const co = settings.company || {}, b = settings.brand || {}
  const logo = useLogo(b.logo)
  const accent = b.accent || '#7A1C2E'
  return (
    <div className="doc-head" style={{ '--doc-accent': accent }}>
      <div className="doc-brand">
        {logo ? <img className="doc-logo" src={logo} alt={co.project || 'Yamuna Sky City'} /> : <div className="doc-word">{co.project || 'YAMUNA SKY CITY'}</div>}
        <div className="doc-lines">{[b.line1 ?? co.tagline, b.line2 ?? co.address, [co.contact, b.email, b.website].filter(Boolean).join(' · ')].filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div>
      </div>
      <div className="doc-co"><b>{co.name}</b>{co.gstin && <div>GSTIN {co.gstin}</div>}{co.rera && <div>RERA {co.rera}</div>}{right.filter(Boolean).map((x, i) => <div key={i}>{x}</div>)}</div>
      <div className="doc-title"><h2>{title}</h2>{sub && <span>{sub}</span>}</div>
    </div>
  )
}
