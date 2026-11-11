// Records one help video: crisp JPEG frames of the live page (CDP screencast), with a drawn cursor, click rings,
// step captions and title/end cards injected into the page, then encoded to MP4 with ffmpeg.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process')
const { open, prepare, BASE } = require('./lib.js')
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true })

const OVERLAY_CSS = `
#vo-cur{position:fixed;left:640px;top:420px;width:22px;height:22px;z-index:2147483646;pointer-events:none;transition:left .75s cubic-bezier(.45,.05,.25,1),top .75s cubic-bezier(.45,.05,.25,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
#vo-rip{position:fixed;z-index:2147483645;pointer-events:none;border:2px solid #C0475D;border-radius:4px;opacity:0;transition:opacity .2s}
#vo-rip.on{opacity:1;animation:vo-p 1s ease-out}
@keyframes vo-p{0%{box-shadow:0 0 0 0 rgba(192,71,93,.55)}100%{box-shadow:0 0 0 18px rgba(192,71,93,0)}}
#vo-cap{position:fixed;left:50%;top:12px;max-width:min(820px,calc(100vw - 56px));z-index:2147483644;pointer-events:none;display:flex;gap:0;background:#1C1314;color:#F4ECEA;
 box-shadow:0 18px 40px rgba(0,0,0,.35);transform:translate(-50%,-140%);opacity:0;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .3s}
#vo-cap.on{transform:translate(-50%,0);opacity:1}
#vo-cap .n{font:400 13px 'Space Mono',monospace;letter-spacing:.12em;background:#7A1C2E;color:#FFF7F8;padding:14px 14px;display:flex;align-items:center}
#vo-cap .t{font:400 17px/1.4 Poppins,sans-serif;padding:12px 18px}
#vo-cap .t b{font-weight:600;color:#F2B8C3}
#vo-card{position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:#F5F1EC;color:#1C1314;display:flex;flex-direction:column;justify-content:center;padding:0 9vw;opacity:0;transition:opacity .5s}
#vo-card.on{opacity:1}
#vo-card .k{font:400 13px 'Space Mono',monospace;letter-spacing:.32em;text-transform:uppercase;color:#7A1C2E}
#vo-card h1{font:600 54px/1.08 Poppins,sans-serif;letter-spacing:-.03em;margin:18px 0 16px;max-width:900px;transform:translateY(16px);opacity:0;transition:all .7s .15s cubic-bezier(.2,.8,.2,1)}
#vo-card.on h1{transform:none;opacity:1}
#vo-card .s{font:300 19px/1.5 Poppins,sans-serif;color:rgba(28,19,20,.7);max-width:720px}
#vo-card .l{height:2px;background:#7A1C2E;width:0;margin-top:30px;transition:width 1.2s .3s cubic-bezier(.2,.8,.2,1)}
#vo-card.on .l{width:180px}
#vo-card .f{position:absolute;left:9vw;bottom:7vh;font:400 12px 'Space Mono',monospace;letter-spacing:.2em;color:rgba(28,19,20,.45);text-transform:uppercase}
#vo-card .q{display:inline-block;margin-top:14px;border:1px solid rgba(28,19,20,.25);padding:12px 18px;font:300 20px Poppins,sans-serif;background:#fff}
#vo-card .q b{font-weight:500}
`
const CURSOR = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2l15 8.2-6.4 1.6L8.3 18z" fill="#fff" stroke="#1C1314" stroke-width="1.4" stroke-linejoin="round"/></svg>'

async function inject(page) {
  await page.evaluate(({ css, cur }) => {
    if (document.getElementById('vo-cur')) return
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)
    const add = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html || ''; document.body.appendChild(d); return d }
    add('vo-cur', cur); add('vo-rip'); add('vo-cap', '<span class="n"></span><span class="t"></span>'); add('vo-card')
  }, { css: OVERLAY_CSS, cur: CURSOR })
}

class Video {
  constructor(name, page, cdp) { this.name = name; this.page = page; this.cdp = cdp; this.frames = []; this.n = 0; this.dir = path.join(OUT, name + '-frames') }
  async start() {
    fs.rmSync(this.dir, { recursive: true, force: true }); fs.mkdirSync(this.dir, { recursive: true })
    await inject(this.page)
    this.cdp.on('Page.screencastFrame', async (f) => {
      const file = path.join(this.dir, String(this.frames.length).padStart(5, '0') + '.jpg')
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'))
      this.frames.push({ file, t: f.metadata.timestamp })
      this.cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    })
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1600, maxHeight: 900, everyNthFrame: 1 })
    // keep frames coming while the screen is still, so pauses are timed exactly
    this.tick = setInterval(() => this.page.evaluate(() => { const c = document.getElementById('vo-cur'); if (c) c.style.opacity = c.style.opacity === '0.999' ? '1' : '0.999' }).catch(() => {}), 250)
  }
  wait(ms) { return this.page.waitForTimeout(ms) }
  async card(kicker, title, sub, ms = 2800, foot = 'Accord · Help centre · practice data, no real clients') {
    await this.page.evaluate(({ kicker, title, sub, foot }) => { const c = document.getElementById('vo-card'); c.innerHTML = `<div class="k">${kicker}</div><h1>${title}</h1><div class="s">${sub || ''}</div><div class="l"></div><div class="f">${foot}</div>`; c.offsetWidth; c.classList.add('on') }, { kicker, title, sub, foot })
    await this.wait(ms)
    await this.page.evaluate(() => document.getElementById('vo-card').classList.remove('on'))
    await this.wait(600)
  }
  async say(text, ms = 0) {
    this.n++
    await this.page.evaluate(({ n, text }) => { const c = document.getElementById('vo-cap'); c.classList.remove('on'); setTimeout(() => { c.querySelector('.n').textContent = String(n).padStart(2, '0'); c.querySelector('.t').innerHTML = text; c.classList.add('on') }, 180) }, { n: this.n, text })
    await this.wait(500 + ms)
  }
  async hideSay() { await this.page.evaluate(() => document.getElementById('vo-cap').classList.remove('on')); await this.wait(400) }
  async point(loc, { ring = true, ms = 900 } = {}) {
    const el = typeof loc === 'string' ? this.page.locator(loc).first() : loc.first()
    await el.scrollIntoViewIfNeeded().catch(() => {})
    await this.wait(250)
    const b = await el.boundingBox()
    if (!b) throw new Error('not visible: ' + loc)
    await this.page.evaluate(({ b, ring }) => {
      const c = document.getElementById('vo-cur'); c.style.left = (b.x + Math.min(b.width * 0.5, b.width - 6)) + 'px'; c.style.top = (b.y + b.height * 0.55) + 'px'
      const r = document.getElementById('vo-rip'); r.classList.remove('on')
      if (ring) setTimeout(() => { Object.assign(r.style, { left: b.x - 5 + 'px', top: b.y - 5 + 'px', width: b.width + 10 + 'px', height: b.height + 10 + 'px' }); r.offsetWidth; r.classList.add('on') }, 700)
    }, { b, ring })
    await this.wait(ms)
    return el
  }
  async click(loc, opts = {}) {
    const el = await this.point(loc, opts)
    await el.click()
    await this.page.evaluate(() => setTimeout(() => document.getElementById('vo-rip').classList.remove('on'), 700))
    await this.wait(opts.after ?? 700)
  }
  async type(loc, text, { delay = 45 } = {}) {
    const el = await this.point(loc, { ms: 750 })
    await el.click()
    await el.pressSequentially(text, { delay })
    await this.page.evaluate(() => document.getElementById('vo-rip').classList.remove('on'))
    await this.wait(300)
  }
  async select(loc, value) { const el = await this.point(loc, { ms: 750 }); await el.selectOption(value); await this.wait(500); await this.page.evaluate(() => document.getElementById('vo-rip').classList.remove('on')) }
  async scroll(y, ms = 900) { await this.page.evaluate((y) => { (document.scrollingElement).scrollBy({ top: y, behavior: 'smooth' }) }, y); await this.wait(ms) }
  async scrollIn(sel, y, ms = 900) { await this.page.evaluate(({ sel, y }) => document.querySelector(sel)?.scrollBy({ top: y, behavior: 'smooth' }), { sel, y }); await this.wait(ms) }
  async go(route, ms = 900) { await this.page.evaluate((r) => { location.hash = r }, route); await this.wait(ms); await inject(this.page) }
  async stop() {
    clearInterval(this.tick)
    await this.cdp.send('Page.stopScreencast').catch(() => {})
    await this.wait(200)
    return this.encode()
  }
  encode() {
    const fr = this.frames
    if (fr.length < 2) throw new Error('no frames')
    const lines = ['ffconcat version 1.0']
    for (let i = 0; i < fr.length; i++) {
      const d = i + 1 < fr.length ? Math.max(0.001, fr[i + 1].t - fr[i].t) : 1
      lines.push(`file '${fr[i].file}'`, `duration ${d.toFixed(4)}`)
    }
    lines.push(`file '${fr[fr.length - 1].file}'`)
    const list = path.join(this.dir, 'list.txt'); fs.writeFileSync(list, lines.join('\n'))
    const tmp = path.join(OUT, this.name + '.tmp.mp4'), mp4 = path.join(OUT, this.name + '.mp4')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,scale=1600:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2:color=0xF5F1EC,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-tune', 'stillimage', '-movflags', '+faststart', '-pix_fmt', 'yuv420p', tmp])
    fs.renameSync(tmp, mp4)
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString())
    return { mp4, dur, frames: fr.length }
  }
}

// run one scenario: fn(v, page) does the steps after signing in
async function record(name, fn, { user = 'demoadmin', before } = {}) {
  const { browser, ctx, page } = await open({ size: { width: 1280, height: 720 }, scale: 1.25 })
  page.on('pageerror', (e) => console.log('PAGEERROR', name, e.message))
  if (before) await before(page); else await prepare(page, { user })
  const cdp = await ctx.newCDPSession(page)
  const v = new Video(name, page, cdp)
  await v.start()
  try { await fn(v, page) } catch (e) { await page.screenshot({ path: path.join(OUT, name + '-fail.png') }); clearInterval(v.tick); await browser.close(); throw e }
  const r = await v.stop()
  // the still shown before playing: a frame from the middle of the action
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.min(r.dur * 0.45, r.dur - 1)), '-i', r.mp4, '-frames:v', '1', '-vf', 'scale=800:-2', '-q:v', '4', path.join(OUT, name + '.jpg')])
  await browser.close()
  console.log(name, r.dur.toFixed(1) + 's', r.frames + ' frames', (fs.statSync(r.mp4).size / 1e6).toFixed(1) + ' MB')
  return r
}
const field = (page, label) => page.locator('label.field').filter({ has: page.locator('.field-label', { hasText: label }) }).locator('input, select, textarea').first()
module.exports = { record, field, BASE, prepare }
