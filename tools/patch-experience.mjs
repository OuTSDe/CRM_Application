// Builds site/experience/index.html from the Accord experience bundle (Accord/Code_Base/dist/index.html).
// Three small, checked edits; the build stops if the bundle has changed shape so nothing breaks silently.
//   node tools/patch-experience.mjs <path to Code_Base/dist/index.html> <out file>
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [src, out] = process.argv.slice(2)
if (!src || !out) { console.error('usage: node tools/patch-experience.mjs <dist/index.html> <out>'); process.exit(1) }
let html = readFileSync(src, 'utf8')
const bridge = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'experience-bridge.js'), 'utf8')

const edits = [
  // live availability from the CRM instead of the 6 Oct snapshot
  [/Dp=\{source:"Sold Unsold Units/, 'Dp=window.__ACCORD_CRM__||{source:"Sold Unsold Units'],
  // every change in a session is handed to the bridge with the bundle's own workbook functions
  ['t.startedAt&&(E.current={state:t,edition:n,ctx:{unitStatus:S}},', 't.startedAt&&(E.current={state:t,edition:n,ctx:{unitStatus:S}},window.__accordTick&&window.__accordTick(E.current,{overview:k2,workbook:mc,xlsx:Bs,fileName:Rs}),'],
  // sessions are captured by Accord now, so the folder becomes optional rather than a warning
  ['title:"Selections are not being saved"', 'title:"Selections are saved to Accord. A copy in a local folder is optional."'],
  ['"Not saving · ",t.mode==="reconnect"?"Reconnect":"Connect data folder"', '"Saved to Accord · ",t.mode==="reconnect"?"reconnect folder":"also save to a folder"'],
  ['d.mode==="none"&&r("Data folder not connected. Selections will not be saved.")', '!1'],
  // a session can open already started, at the buyer's own residence (set by the bridge from Accord Sales)
  ['function Hp(e,t){return{editionId:e.id,phase:"entry",history:[],buyerName:"",unitRef:t,residenceId:e.defaultResidence,floor:null,unit:null,startedAt:null,m:Qr(),log:[]}}',
   'function Hp(e,t){var b={editionId:e.id,phase:"entry",history:[],buyerName:"",unitRef:t,residenceId:e.defaultResidence,floor:null,unit:null,startedAt:null,m:Qr(),log:[]},P=window.__ACCORD_PRESET__;if(P&&P.buyerName){b.buyerName=P.buyerName;b.unitRef=P.unitRef||t;b.startedAt=new Date().toISOString();b.phase="residence";b.history=["entry"];if(P.residenceId){b.residenceId=P.residenceId;b.floor=P.floor;b.unit=P.unit}}return b}'],
  // the bridge runs first
  ['<script type="module" crossorigin>', '<script>\n' + bridge + '\n</script>\n<script type="module" crossorigin>'],
]
for (const [find, repl] of edits) {
  const hit = typeof find === 'string' ? html.includes(find) : find.test(html)
  if (!hit) { console.error('Bundle changed: could not find ' + String(find).slice(0, 60) + '. Re-check the hooks against the new build.'); process.exit(2) }
  html = html.replace(find, repl)
}
html = html.replace('<title>Accord</title>', '<title>Accord · Experience</title>')
writeFileSync(out, html)
console.log('experience written: ' + out + ' (' + Math.round(html.length / 1024) + ' KB)')
