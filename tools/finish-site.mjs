// Copies the built app (source/dist) into site/ for GitHub Pages.
// accord.config.js: written from ACCORD_BACKEND_URL when it is set (GitHub Actions: repository variable),
// otherwise the copy already in site/ is kept, so a local rebuild never wipes the backend address.
import { copyFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
const dist = process.argv[2] || 'dist', site = process.argv[3] || '../site'
mkdirSync(site, { recursive: true })
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg']) copyFileSync(join(dist, f), join(site, f))
const url = (process.env.ACCORD_BACKEND_URL || '').trim()
const cfg = join(site, 'accord.config.js')
if (url) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) { console.error('ACCORD_BACKEND_URL does not look like an Apps Script /exec URL: ' + url); process.exit(3) }
  writeFileSync(cfg, `// Accord · site configuration, written by GitHub Actions from the ACCORD_BACKEND_URL repository variable.\nwindow.ACCORD_CONFIG = {\n  backendUrl: '${url}',\n}\n`)
  console.log('accord.config.js → ' + url)
} else if (!existsSync(cfg)) { copyFileSync(join(dist, 'accord.config.js'), cfg); console.log('accord.config.js created (no backend yet)') }
writeFileSync(join(site, '.nojekyll'), '')
console.log('site/ ready')
