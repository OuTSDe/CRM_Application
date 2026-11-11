const { chromium } = require('playwright')
const fs = require('fs')
const R = __dirname
const BASE = 'http://localhost:8080/index.html'
async function open({ video, size = { width: 1440, height: 900 }, scale = 1, theme } = {}) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: scale, geolocation: { latitude: 12.9417, longitude: 74.8560 }, permissions: ['geolocation', 'notifications'],
    recordVideo: video ? { dir: video, size } : undefined, colorScheme: theme || 'light', locale: 'en-IN', timezoneId: 'Asia/Kolkata' })
  const page = await ctx.newPage()
  page.setDefaultTimeout(15000)
  return { browser, ctx, page }
}
// load the seed, add the practice data, sign in as Demo Admin and punch in
async function prepare(page, { user = 'demoadmin', theme = 'light', noLogin = false } = {}) {
  await page.goto(BASE)
  await page.waitForSelector('.login, .login-card')
  await page.waitForFunction(() => !!localStorage.getItem('accord.db.v2'), null, { timeout: 15000 })
  await page.evaluate(fs.readFileSync(R + '/demo-data.js', 'utf8'))
  await page.evaluate(({ theme }) => {
    let db = JSON.parse(localStorage.getItem('accord.db.v2') || 'null')
    if (!db || !db.users.some((u) => u.username === 'demoadmin')) {
      if (!db) throw new Error('no seed in storage')
      db = window.__accordDemo(db)
      localStorage.setItem('accord.db.v2', JSON.stringify(db))
    }
    localStorage.setItem('accord.theme', theme)
  }, { theme })
  await page.reload()
  if (noLogin) return page.waitForSelector('.login-card')
  await login(page, user)
}
async function login(page, user) {
  await page.waitForSelector('.login-card')
  await page.getByText('First sign-in, or a new phone? Use the temporary password').click()
  await page.locator('input[autocomplete=username]').fill(user)
  await page.locator('input[type=password]').fill('Accord2026')
  await page.getByRole('button', { name: 'Continue to link the app' }).click()
  // punch in
  const gate = page.locator('.gate')
  await gate.waitFor({ timeout: 8000 }).catch(() => {})
  if (await gate.count()) { await gate.getByRole('button', { name: 'Punch in' }).click(); await gate.waitFor({ state: 'detached' }) }
}
module.exports = { open, prepare, login, BASE }
