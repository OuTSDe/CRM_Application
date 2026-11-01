import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from './lib/store.jsx'
import { applyTheme } from './lib/theme.js'
import App from './App.jsx'
import './styles.css'

applyTheme()
// Service worker: lets follow-up reminders show as system notifications and the app install on a phone or tab.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider><HashRouter><App /></HashRouter></StoreProvider>
  </React.StrictMode>,
)
