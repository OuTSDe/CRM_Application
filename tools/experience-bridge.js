/* ACCORD · experience bridge (OuTSDe)
   Runs before the Accord experience bundle. It
   1. keeps the experience behind the Accord sign-in,
   2. hands the experience live availability from the CRM (sold / blocked / unsold),
   3. sets the brand accent (burgundy),
   4. prefills the buyer's name and unit reference passed from Accord Sales,
   5. sends every session's selections back to Accord (Client 360 and the sessions list),
      with the session workbook, so nothing depends on a folder on one laptop. */
(function () {
  var Q = new URLSearchParams(location.search);
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // 1. sign-in gate (same origin as the app)
  var s = get('accord.session.v2');
  if (!s || !s.userId) { location.replace('../#/'); return; }

  // 2. availability from the CRM, read by the bundle in place of its built-in snapshot
  var u = get('accord.units.status');
  if (u && u.units) window.__ACCORD_CRM__ = { source: 'Accord CRM (live)', readAt: u.readAt, fileModified: u.readAt, units: u.units };

  // 3. accent
  var st = document.createElement('style');
  st.textContent = ':root{--accent:#9A2A3E !important;--accent-hover:#B23D52 !important;--accent2:#6E1828 !important;--on-accent:#FBEFF1 !important;--line2:rgba(208,115,132,.38) !important}' +
    '.accord-back{position:fixed;right:14px;bottom:14px;z-index:9999;font:400 10px "Space Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:rgba(243,237,227,.62);' +
    'background:rgba(11,10,8,.8);border:1px solid rgba(236,226,210,.16);padding:9px 12px;text-decoration:none}.accord-back:hover{color:#fff}';
  document.head.appendChild(st);
  document.addEventListener('DOMContentLoaded', function () {
    var a = document.createElement('a'); a.href = '../#/experience'; a.className = 'accord-back'; a.textContent = '← Back to Accord'; document.body.appendChild(a);
  });

  // key plans not yet copied in: hide the empty frame rather than show a broken image
  window.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && /keyplans\//.test(t.src)) t.style.visibility = 'hidden'; }, true);

  // 4. prefill from Accord Sales: ?name=&ref=
  var name = Q.get('name'), ref = Q.get('ref'), done = { n: !name, r: !ref };
  function setVal(el, v) { var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }
  if (name || ref) {
    var mo = new MutationObserver(function () {
      if (!done.n) { var n = document.querySelector('input[placeholder="Enter your name"]'); if (n) { setVal(n, name); done.n = true; } }
      if (!done.r) { var r = document.getElementById('f-ref'); if (r) { setVal(r, ref); done.r = true; } }
      if (done.n && done.r) mo.disconnect();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 4b. open at the buyer's residence. Booked clients (mode=client) see the full version with the BOQ and costs;
  //     leads (mode=lead) see the pre-sales version: the design, without prices.
  var mode = Q.get('mode');
  if (name) window.__ACCORD_PRESET__ = { buyerName: name, unitRef: ref || '', residenceId: Q.get('res') || '', floor: Q.get('floor') ? Number(Q.get('floor')) : null, unit: Q.get('tag') || null };
  if (window.__ACCORD_PRESET__ && mo) mo.disconnect();
  if (mode === 'lead') {
    var hide = document.createElement('style');
    hide.textContent = '.c-cost,.cfg-total,.cfg-total-row,.opt-cost,.reg-price,.sum-total{display:none !important}';
    document.head.appendChild(hide);
  }

  // 5. session capture: called by the bundle on every change (patched in by tools/patch-experience.mjs)
  var timer = null, last = null;
  function b64(bytes) { var s2 = '', i, c = 0x8000; for (i = 0; i < bytes.length; i += c) s2 += String.fromCharCode.apply(null, bytes.subarray(i, i + c)); return btoa(s2); }
  function save() {
    if (!last) return;
    var cur = last.cur, f = last.fns, ov;
    try { ov = f.overview(cur.state, cur.edition, cur.ctx); } catch (e) { return; }
    var id = ov['Session ID'];
    var rec = { id: id, startedAt: cur.state.startedAt, buyer: ov['Buyer'], unitRef: ov['Unit reference'], residence: ov['Residence'], unit: ov['Unit'], floor: ov['Floor'],
      persona: ov['Persona'], palette: ov['Chosen palette'] || ov['Recommended palette'], register: ov['Register'], coherence: ov['Coherence'], total: ov['Indicative total'],
      configId: ov['Configuration ID'], screen: ov['Current screen'], recordId: Q.get('rid') || '', by: Q.get('by') || '', edition: ov['Edition'], updatedAt: new Date().toISOString() };
    var list = (get('accord.experience.sessions') || []).filter(function (x) { return x.id !== id; });
    list.unshift(rec); put('accord.experience.sessions', list.slice(0, 60));
    try {
      var bytes = f.xlsx(f.workbook(cur.state, cur.edition, cur.ctx));
      put('accord.experience.xlsx.' + id, { name: f.fileName(cur.state), data: b64(bytes), at: rec.updatedAt });
    } catch (e) { /* storage full: the overview is still saved */ }
  }
  window.__accordTick = function (cur, fns) { last = { cur: cur, fns: fns }; clearTimeout(timer); timer = setTimeout(save, 1200); };
  window.addEventListener('pagehide', save);
})();
