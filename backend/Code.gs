/**
 * ACCORD · BACKEND  (v3, 1 Nov 2026)
 * OuTSDe · Outlook for Theoreticals & Speculative Design
 * Accord, the Accord method and this software are the intellectual property of OuTSDe.
 *
 * WHERE THE DATA LIVES
 *   Everything is stored in the OuTSDe Google Drive (research@outsd-e.com), in one folder:
 *     My Drive / Accord_CRM_Application / Accord_Data
 *       Accord Database ........ this Google Sheet: one tab per collection, readable like the CRM master
 *       Clients / <flat> <name> / 01 KYC … 09 Accord sessions ... every client document, auto-named
 *       Leads / <lead ID> <name> ... cost sheets and papers before a booking
 *       Project documents / Legal, Approvals, Forms and templates, Marketing, Site progress
 *       Team / <name> ......... team papers
 *       Vendors / <ID> <name> .. vendor papers
 *       Brand .................. the Yamuna Sky City logo used on documents and e-mails
 *       Exports ................ "Accord Database.xlsx", rewritten every night (open it in Excel)
 *       Backups ................ a dated copy of the sheet every night (last 30 kept)
 *       Starting data .......... the one-time CRM master extract used to seed the sheet
 *   Nothing is stored in the Sky City account. Run shareDocuments() to give Sky City read access to the
 *   document folders only (Clients and Project documents); the database itself stays private to OuTSDe.
 *
 * SET-UP (once, signed in as the OuTSDe account)
 *   1. Create a Google Sheet "Accord Database". Extensions > Apps Script. Paste this file. In Project settings tick
 *      "Show appsscript.json" and paste backend/appsscript.json over it. Save.
 *   2. Run setup() from the editor. It creates the folder tree above, moves this sheet into it and switches on
 *      the reminders, escalations, nightly backup and Excel export.
 *   3. Deploy > New deployment > Web app. Execute as: Me · Who has access: Anyone. Copy the /exec URL into
 *      site/accord.config.js (and Admin > Data and sync), push to GitHub.
 *
 * SECURITY MODEL
 *  - Sign-in is username + a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator…).
 *    A temporary password is used once, to link the app; after that the password no longer opens the account.
 *  - Each person can use two devices: one computer and one phone. A third device waits for an admin. Admins: no limit.
 *  - 5 wrong attempts lock the account for 15 minutes.
 *  - Every read is filtered on the server by role: client advisors receive only their own clients, leads,
 *    interactions, tasks and time, and never receive rupee amounts. The browser cannot widen this.
 *  - Every write is checked against the role, stamped with the server time and written to the Audit tab.
 *  - Punches are stamped with the server clock and checked against the Sky City location when one is set.
 *  - Records made in demo mode carry _test = Yes: they send no reminders and are listed for clean-up.
 */

var VERSION = '3.0.0';
var DATA_PATH = 'Accord_CRM_Application/Accord_Data';   // inside My Drive of the account that runs this script
var TEMP_PASSWORD = 'Accord2026';                        // first sign-in only, to link the authenticator
// The team, created by setup() when the Users tab is empty, so the first admin can sign in (temporary password, then the authenticator).
var DEFAULT_USERS = [{"id": "T-01", "name": "Anuradha", "username": "anuradha", "team": "Sales", "designation": "Client Relations", "role": "Channel partners; CRM health and updates", "appRole": "sales", "reportsTo": "Cyril", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-02", "name": "Medha", "username": "medha", "team": "Sales", "designation": "Client Relations", "role": "Follow-up calls; client relations", "appRole": "sales", "reportsTo": "Cyril", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-03", "name": "Cyril", "username": "cyril", "team": "Sales", "designation": "Senior Sales Manager", "role": "Closing; client relations", "appRole": "senior", "reportsTo": "Aryan", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-04", "name": "Khushi", "username": "khushi", "team": "Sales", "designation": "Sales and CRM", "role": "Generalist; updates", "appRole": "senior", "reportsTo": "Aryan", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-05", "name": "Aryan", "username": "aryan", "team": "Management", "designation": "Director", "role": "Director; client relations", "appRole": "admin", "reportsTo": "", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "Yes", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-06", "name": "Yakshith", "username": "yakshith", "team": "Sales", "designation": "Client Relations", "role": "To confirm (named in CRM remarks for 2503)", "appRole": "sales", "reportsTo": "Cyril", "active": "To verify", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "X-01", "name": "Smitha (SBI)", "username": "smithasbi", "team": "External", "designation": "Bank contact, State Bank of India", "role": "Bank contact, State Bank of India", "appRole": "none", "reportsTo": "", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-07", "name": "Shruthadev", "username": "shruthadev", "team": "Management", "designation": "Research Director", "role": "Research Director, OuTSDe", "appRole": "admin", "reportsTo": "", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "Yes", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-08", "name": "Kajal", "username": "kajal", "team": "Design", "designation": "Creative Director", "role": "Creative Director, [INSD]e*", "appRole": "design", "reportsTo": "Shruthadev", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}];
var FOLDERS = ['Clients', 'Leads', 'Project documents/Legal', 'Project documents/Approvals', 'Project documents/Forms and templates', 'Project documents/Marketing', 'Project documents/Site progress', 'Team', 'Vendors', 'Brand', 'Exports', 'Backups', 'Starting data'];
var CLIENT_SUB = ['01 KYC', '02 Booking', '03 Agreement and legal', '04 Home loan', '05 Receipts', '06 Cost sheets', '07 Changes', '08 Possession', '09 Accord sessions', '10 Correspondence'];
var TZ = 'Asia/Kolkata';
var ROUNDS = 1000;

/* ───────────────────────── schema: tab columns (key, heading) ───────────────────────── */
var SCHEMA = {
  users: [['id','Member ID'],['name','Name'],['username','Username'],['team','Team'],['designation','Designation'],['role','Responsibilities'],['appRole','Access role'],['reportsTo','Reports to'],['workspaces','Workspaces'],['phone','Phone'],['email','Email'],['shiftStart','Shift start'],['shiftEnd','Shift end'],['workDays','Work days'],['remoteAllowed','Remote allowed'],['active','Active'],['deviceLock','Device lock'],['devices','Approved devices'],['mustChange','Must change password'],['mfa','Authenticator'],['pwSalt','_salt'],['pwHash','_hash'],['totpSecret','_totp'],['totpPending','_totp pending'],['totpLast','_totp last'],['failed','_failed'],['lockedUntil','_locked until']],
  clients: [['bookingId','Booking ID'],['clientId','Client ID'],['unit','Unit No.'],['status','Booking status'],['category','Customer category'],['title','Title'],['name','Primary applicant'],['coapp','Co-applicant(s)'],['buyerType','Buyer type'],['phone','Mobile (primary)'],['phone2','Mobile (alternate)'],['whatsapp','WhatsApp'],['email','Email'],['address','Correspondence address'],['city','City'],['country','Country'],['residency','Residential status'],['pan','PAN'],['aadhaar4','Aadhaar (last 4)'],['dob','Date of birth'],['language','Preferred language'],['contactPref','Preferred contact'],['purpose','Buying purpose'],['occupant','Who will live there'],['funding','Funding mode'],['loanBank','Lender'],['loanAmount','Loan amount (₹)'],['loanStatus','Loan status'],['occupation','Occupation'],['employer','Employer / business'],['income','Income band'],['marital','Marital status'],['familyProfile','Family profile'],['decisionMaker','Key decision-maker'],['source','Lead source'],['leadId','Lead ID'],['owner','Relationship owner'],['sourcedBy','Sourced by'],['closedBy','Closed by'],['bookingDate','Booking date'],['tc','Total consideration (₹)'],['adjustment','Adjustment (₹)'],['adjType','Adjustment type'],['plan','Payment plan'],['agreement','Agreement for sale'],['parkingEntitlement','Car parks entitled'],['remarks','Remarks'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  leads: [['id','Lead ID'],['date','Date captured'],['title','Title'],['name','Name'],['phone','Mobile'],['phone2','Other numbers'],['email','Email'],['city','City'],['country','Country'],['residency','Residential status'],['source','Lead source'],['partner','Channel partner'],['referredBy','Referred by'],['config','Configuration interest'],['budget','Budget band'],['purpose','Purpose'],['timeline','Buying timeline'],['owner','Assigned to'],['stage','Stage'],['temperature','Temperature'],['svDone','Site visit done?'],['svDate','Site visit date'],['lostReason','Lost / dormant reason'],['clientId','Converted to Client ID'],['notes','Notes'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  interactions: [['id','Log ID'],['date','Date'],['time','Time'],['type','Record type'],['recordId','Client or Lead ID'],['mode','Mode'],['purpose','Purpose'],['by','Team member'],['summary','Summary of discussion'],['outcome','Outcome'],['nextAction','Next action'],['nextDate','Next action date'],['nextOwners','Follow-up owners'],['status','Status'],['updatedAt','Updated at']],
  payments: [['id','Entry No.'],['receiptNo','Receipt No.'],['date','Receipt date'],['unit','Unit No.'],['payer','Received from'],['thirdParty','Third-party payer'],['amount','Amount received (₹)'],['counted','Counted in totals?'],['towards','Towards'],['mode','Mode'],['instrument','Instrument / UTR no.'],['instrumentDate','Instrument date'],['bank','Bank'],['tds','TDS (₹)'],['realisation','Realisation'],['proofUrl','Proof (Drive)'],['note','Note'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  attendance: [['id','Entry'],['userId','Member ID'],['name','Name'],['date','Date'],['in','Punch in'],['out','Punch out'],['mode','Started as'],['state','Current state'],['workMin','Worked (min)'],['breakMin','Breaks (min)'],['siteMin','Site visits (min)'],['status','Status'],['where','Location check'],['events','Events'],['note','Note'],['updatedAt','Updated at']],
  timeEvents: [['id','Event'],['at','Server time'],['date','Date'],['time','Time'],['userId','Member ID'],['name','Name'],['type','Type'],['note','Note'],['device','Device'],['where','Location check'],['lat','Latitude'],['lng','Longitude'],['acc','Accuracy (m)'],['dist','Distance to Sky City (m)']],
  tasks: [['id','Task ID'],['title','Task'],['owner','Owner'],['by','Assigned by'],['due','Due'],['priority','Priority'],['module','Area'],['link','Related ID'],['status','Status'],['doneOn','Done on'],['notes','Notes'],['updatedAt','Updated at']],
  notifications: [['id','ID'],['to','To'],['kind','Kind'],['title','Title'],['body','Body'],['link','Link'],['dueAt','Due at'],['createdBy','Created by'],['createdAt','Created at'],['readAt','Read at'],['emailedAt','E-mailed at']],
  issues: [['id','Issue ID'],['date','Date raised'],['category','Category'],['severity','Severity'],['unit','Unit'],['description','Description'],['source','Source'],['action','Suggested action'],['owner','Owner'],['status','Status'],['resolution','Resolution notes'],['resolvedOn','Resolved on'],['updatedAt','Updated at']],
  accordSessions: [['id','Session ID'],['startedAt','Started'],['buyer','Buyer'],['unitRef','Unit reference'],['recordId','Client or Lead ID'],['residence','Residence'],['persona','Persona'],['palette','Chosen palette'],['register','Register'],['configId','Configuration ID'],['total','Indicative total'],['by','Hosted by'],['fileUrl','Workbook (Drive)'],['updatedAt','Updated at']],
  clientForms: [['id','Response ID'],['bookingId','Booking ID'],['clientId','Client ID'],['unit','Unit No.'],['name','Client'],['submittedAt','Submitted at'],['status','Status'],['data','Answers'],['appliedBy','Applied by'],['appliedAt','Applied at']],
  files: [['id','File ID'],['at','Uploaded'],['by','By'],['kind','For'],['recordId','Record'],['label','Record name'],['category','Category'],['doc','Document'],['name','File name'],['url','Open (Drive)'],['folder','Folder'],['driveId','Drive ID'],['_test','Test entry']],
  audit: [['id','ID'],['at','When'],['by','By'],['coll','Collection'],['recId','Record'],['action','Action']]
};
var COLLECTIONS = ['settings','users','units','clients','payments','leads','interactions','documents','issues','clpStages','demandCalls','costSheets','parking',
  'messages','templates','attendance','timeEvents','tasks','notifications','viewings','brochure','vendors','trips','stops','quotes','samples','projects','rooms',
  'packages','boq','accordSessions','clientForms','files','audit'];

/* ───────────────────────── roles ───────────────────────── */
var ALL = ['admin','senior','sales','finance','design','sourcing','viewer'];
var WRITE = {
  leads:['admin','senior','sales'], interactions:['admin','senior','sales','finance'], clients:['admin','senior','sales'], payments:['admin','finance'],
  documents:['admin','senior','sales'], issues:['admin','senior','sales'], costSheets:['admin','senior','sales'], parking:['admin','senior'],
  demandCalls:['admin','finance'], clpStages:['admin','finance'], settings:['admin'], users:['admin'], units:['admin'], templates:['admin','senior'],
  messages:['admin','senior','sales','finance'], viewings:['admin','senior','sales','design'], brochure:['admin','senior','design'],
  vendors:['admin','design','sourcing'], trips:['admin','design','sourcing'], stops:['admin','design','sourcing'], quotes:['admin','design','sourcing'],
  samples:['admin','design','sourcing'], projects:['admin','design'], rooms:['admin','design'], packages:['admin','design','sourcing'], boq:['admin','design','sourcing'],
  clientForms:['admin','senior','sales'], files:['admin','senior','sales','finance','design','sourcing'], tasks:['*'], notifications:['*'], accordSessions:['*'], attendance:['admin'], timeEvents:[], audit:[]
};
var MONEY_FIELDS = ['tc','adjustment','adjType','adjReason','receivedPerCollections','outstandingPerCollections','loanAmount','rate','total'];
var seesMoney_ = function (u) { return ['admin','senior','finance'].indexOf(u.appRole) >= 0; };
var seesAll_ = function (u) { return ['admin','senior','finance','viewer'].indexOf(u.appRole) >= 0; };

/* ───────────────────────── entry ───────────────────────── */
function doGet() { return out_({ ok: true, app: 'Accord', version: VERSION, hint: 'POST JSON to use the API' }); }
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    switch (req.action) {
      case 'ping': return out_({ ok: true, version: VERSION, sheet: SpreadsheetApp.getActive().getName(), users: read_('users').length, folder: DATA_PATH, folderUrl: root_().getUrl(), serverTime: now_() });
      case 'login': return out_(login_(req));
      case 'enrolStart': return out_(enrolStart_(auth_(req.token, true)));
      case 'enrolConfirm': return out_(enrolConfirm_(auth_(req.token, true), req));
      case 'changePassword': return out_(changePassword_(auth_(req.token), req));
      case 'pull': return out_(pull_(auth_(req.token)));
      case 'push': return out_(push_(auth_(req.token), req.ops || []));
      case 'punch': return out_(punch_(auth_(req.token), req));
      case 'setPassword': return out_(setPassword_(auth_(req.token), req));
      case 'approveDevice': return out_(approveDevice_(auth_(req.token), req));
      case 'upload': return out_(upload_(auth_(req.token), req));
      case 'sendEmail': return out_(sendEmail_(auth_(req.token), req));
      case 'exportNow': return out_(exportNow_(auth_(req.token)));
      case 'releaseDevice': return out_(releaseDevice_(auth_(req.token), req));
      case 'seed': return out_(seed_(req));
      case 'apply': return out_(apply_(req.rec || {}));
      case 'clientForm': return out_(clientForm_(req));
      default: return out_({ error: 'Unknown action' });
    }
  } catch (err) { return out_({ error: String(err.message || err) }); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function now_() { return new Date().toISOString(); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function clock_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }

/* ───────────────────────── storage ───────────────────────── */
function cols_(name) { return (SCHEMA[name] || [['id','ID'],['updatedAt','Updated at'],['updatedBy','Updated by']]).concat([['_extra','_extra']]); }
function sheet_(name) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var c = cols_(name);
    sh.getRange(1, 1, 1, c.length).setValues([c.map(function (x) { return x[1]; })]).setFontWeight('bold').setBackground('#1A1714').setFontColor('#F3EDE3');
    sh.getRange(2, 1, 1, c.length).setValues([c.map(function (x) { return x[0]; })]).setFontColor('#9A9087').setFontSize(8);
    sh.setFrozenRows(2);
  }
  return sh;
}
function keys_(sh) { var w = sh.getLastColumn(); return w ? sh.getRange(2, 1, 1, w).getValues()[0].map(String) : []; }
function cell_(v) { if (v === null || v === undefined) return ''; if (typeof v === 'object') return JSON.stringify(v); return v; }
function parse_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  if (typeof v === 'string' && (v.charAt(0) === '[' || v.charAt(0) === '{')) { try { return JSON.parse(v); } catch (e) {} }
  return v;
}
function rowOf_(keys, rec) {
  var extra = {}, known = {};
  keys.forEach(function (k) { known[k] = 1; });
  Object.keys(rec).forEach(function (k) { if (!known[k]) extra[k] = rec[k]; });
  return keys.map(function (k) { return k === '_extra' ? (Object.keys(extra).length ? JSON.stringify(extra) : '') : cell_(rec[k]); });
}
function idKey_(name) { return name === 'clients' ? 'bookingId' : 'id'; }
function read_(name) {
  var sh = sheet_(name), last = sh.getLastRow(); if (last < 3) return [];
  var keys = keys_(sh), vals = sh.getRange(3, 1, last - 2, keys.length).getValues(), out = [];
  vals.forEach(function (r) {
    if (r.join('') === '') return;
    var o = {};
    keys.forEach(function (k, i) { if (k === '_extra') { if (r[i]) { try { var x = JSON.parse(r[i]); Object.keys(x).forEach(function (kk) { o[kk] = x[kk]; }); } catch (e) {} } } else if (r[i] !== '') o[k] = parse_(r[i]); });
    if (name === 'clients' && !o.id) o.id = o.bookingId;
    if (o.id !== undefined) o.id = String(o.id);
    out.push(o);
  });
  return out;
}
function writeAll_(name, list) {
  var sh = sheet_(name), keys = keys_(sh);
  if (sh.getLastRow() > 2) sh.getRange(3, 1, sh.getLastRow() - 2, sh.getLastColumn()).clearContent();
  if (!list.length) return;
  sh.getRange(3, 1, list.length, keys.length).setValues(list.map(function (r) { return rowOf_(keys, r); }));
}
function upsert_(name, rec) {
  var sh = sheet_(name), keys = keys_(sh), last = sh.getLastRow(), ik = keys.indexOf(idKey_(name));
  if (ik < 0) ik = keys.indexOf('id');
  var id = String(rec[idKey_(name)] || rec.id);
  var ids = last > 2 ? sh.getRange(3, ik + 1, last - 2, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var i = ids.indexOf(id), row = rowOf_(keys, rec);
  if (i >= 0) sh.getRange(i + 3, 1, 1, keys.length).setValues([row]); else sh.appendRow(row);
}
function find_(name, id) { return read_(name).filter(function (x) { return String(x.id) === String(id) || String(x.bookingId) === String(id); })[0] || null; }
function delete_(name, id) {
  var sh = sheet_(name), keys = keys_(sh), last = sh.getLastRow(); if (last < 3) return;
  var ik = Math.max(0, keys.indexOf(idKey_(name)));
  var ids = sh.getRange(3, ik + 1, last - 2, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 3);
}
function audit_(u, coll, id, action) { upsert_('audit', { id: 'A-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: now_(), by: u ? u.name : 'system', coll: coll, recId: id, action: action }); }

/* ───────────────────────── sign-in: authenticator app, two devices, sessions ───────────────────────── */
function hex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
/** Same scheme as the browser (src/lib/crypto.js): h0 = sha(salt:pw), then h = sha(h + salt) 999 more times. */
function hash_(salt, pw) { var h = sha_(salt + ':' + pw); for (var i = 1; i < ROUNDS; i++) h = sha_(h + salt); return h; }
function salt_() { return Utilities.getUuid().replace(/-/g, ''); }
function strong_(pw) { return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw); }
function publicUser_(u) { return { id: u.id, name: u.name, username: u.username, appRole: u.appRole, workspaces: u.workspaces, designation: u.designation, email: u.email, mustChange: u.mustChange === 'Yes', mfa: !!u.totpSecret }; }
function authMode_() { var s = read_('settings')[0] || {}; return s.authMode === 'password' ? 'password' : 'authenticator'; }

/* TOTP (RFC 6238): 30-second steps, 6 digits, HMAC-SHA1, the format every authenticator app reads. */
var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function sb_(v) { v = v & 255; return v > 127 ? v - 256 : v; }   // Apps Script byte arrays are signed
function b32enc_(bytes) { var bits = 0, val = 0, out = ''; bytes.forEach(function (b) { val = (val << 8) | (b & 255); bits += 8; while (bits >= 5) { out += B32.charAt((val >>> (bits - 5)) & 31); bits -= 5; } }); if (bits > 0) out += B32.charAt((val << (5 - bits)) & 31); return out; }
function b32dec_(str) { var bits = 0, val = 0, out = []; String(str).toUpperCase().replace(/[^A-Z2-7]/g, '').split('').forEach(function (c) { val = (val << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push(sb_(val >>> (bits - 8))); bits -= 8; } }); return out; }
function totpAt_(secret, step) {
  var msg = [], x = step; for (var i = 7; i >= 0; i--) { msg[i] = sb_(x % 256); x = Math.floor(x / 256); }
  var h = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, msg, b32dec_(secret)), o = h[19] & 15;
  var bin = ((h[o] & 127) << 24) | ((h[o + 1] & 255) << 16) | ((h[o + 2] & 255) << 8) | (h[o + 3] & 255);
  return ('000000' + (bin % 1000000)).slice(-6);
}
/** Returns the matching step (one step of clock drift either way), or -1. A code is accepted once only. */
function totpCheck_(secret, code, last) {
  code = String(code || '').replace(/\D/g, ''); if (code.length !== 6 || !secret) return -1;
  var now = Math.floor(Date.now() / 30000);
  for (var k = -1; k <= 1; k++) { var st = now + k; if (st > Number(last || 0) && totpAt_(secret, st) === code) return st; }
  return -1;
}
function newSecret_() { var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now()); return b32enc_(bytes.slice(0, 20)); }

/* Devices: one computer and one phone per person; admins have no limit. */
function devKind_(req) { return req.deviceKind === 'phone' || /Android|iOS|iPhone|iPad|Mobile/i.test(String(req.deviceLabel || '')) ? 'phone' : 'computer'; }
function checkDevice_(u, req) {
  var devs = u.devices || [], kind = devKind_(req), id = String(req.deviceId || '');
  var known = devs.filter(function (d) { return d.id === id; })[0];
  if (known) {
    if (!known.approved) throw new Error('This ' + kind + ' is waiting for an admin to approve it.');
    known.lastAt = now_(); u.devices = devs; return;
  }
  var entry = { id: id, label: req.deviceLabel || '', kind: kind, at: now_(), lastAt: now_(), approved: true };
  if (u.appRole !== 'admin') {
    var same = devs.filter(function (d) { return d.approved && (d.kind || 'computer') === kind; });
    if (u.deviceLock === 'Yes' || same.length >= 1) {
      entry.approved = false; devs.push(entry); u.devices = devs; upsert_('users', u);
      notifyAdmins_('device', 'Device waiting: ' + u.name, u.name + ' tried to sign in on a new ' + kind + ' (' + entry.label + '). Approve it in Users and access; it replaces ' + (same[0] ? same[0].label || 'the old one' : 'nothing') + '.');
      throw new Error(same.length ? 'Your account is already linked to a ' + kind + ' (' + (same[0].label || 'another device') + '). Accord allows one computer and one phone. An admin has been asked to swap it.' : 'This browser is not approved for your account yet. An admin has been asked to approve it.');
    }
  }
  devs.push(entry); u.devices = devs;
}
function notifyAdmins_(kind, title, body) { read_('users').filter(function (x) { return x.appRole === 'admin' && x.active !== 'No'; }).forEach(function (a) { notify_(a.name, kind, title, body, '#/admin/users', now_(), 'Accord'); }); }

function login_(req) {
  var uname = String(req.username || '').trim().toLowerCase();
  var users = read_('users'), u = users.filter(function (x) { return String(x.username || '').toLowerCase() === uname; })[0];
  if (!u || u.active === 'No' || u.appRole === 'none') throw new Error('Unknown username or code');
  if (u.lockedUntil && new Date(u.lockedUntil) > new Date()) throw new Error('Too many attempts. Try again after ' + Utilities.formatDate(new Date(u.lockedUntil), TZ, 'HH:mm'));
  var fail = function (msg) { u.failed = Number(u.failed || 0) + 1; if (u.failed >= 5) { u.lockedUntil = new Date(Date.now() + 15 * 60000).toISOString(); u.failed = 0; } upsert_('users', u); throw new Error(msg); };
  var mode = authMode_(), enrolled = !!u.totpSecret;
  if (mode === 'authenticator' && enrolled) {
    var st = totpCheck_(u.totpSecret, req.code, u.totpLast);
    if (st < 0) fail('That code is not right. Open your authenticator app and type the 6 digits shown for Accord.');
    u.totpLast = st;
  } else {
    // Not linked yet (or password mode): the temporary or own password opens the account once, to link the app.
    if (!u.pwHash) throw new Error('No temporary password yet. Ask an admin to set one in Users and access.');
    if (hash_(u.pwSalt, String(req.password || '')) !== u.pwHash) fail(enrolled || mode === 'password' ? 'Unknown username or password' : 'Unknown username or temporary password');
  }
  checkDevice_(u, req);
  u.failed = 0; u.lockedUntil = ''; upsert_('users', u);
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('t:' + token, u.id, 21600);
  PropertiesService.getScriptProperties().setProperty('t:' + token, u.id + '|' + Date.now());
  audit_(u, 'users', u.id, 'signed in on ' + devKind_(req) + ' · ' + (req.deviceLabel || ''));
  var pu = publicUser_(u); pu.mustEnrol = mode === 'authenticator' && !enrolled;
  return { token: token, user: pu, serverTime: now_() };
}
function auth_(token, allowUnenrolled) {
  if (!token) throw new Error('Not signed in');
  var id = CacheService.getScriptCache().get('t:' + token);
  if (!id) { var p = PropertiesService.getScriptProperties().getProperty('t:' + token); if (p) { var b = p.split('|'); if (Date.now() - Number(b[1]) < 7 * 864e5) id = b[0]; } }
  if (!id) throw new Error('Session expired, please sign in again');
  var u = read_('users').filter(function (x) { return x.id === id; })[0];
  if (!u || u.active === 'No') throw new Error('User disabled');
  if (!allowUnenrolled && !u.totpSecret && authMode_() === 'authenticator') throw new Error('Link your authenticator app first (sign in again)');
  return u;
}
function enrolStart_(u) {
  var secret = newSecret_(); u.totpPending = secret; upsert_('users', u);
  var label = encodeURIComponent('Accord (Yamuna Sky City)') + ':' + encodeURIComponent(u.username);
  return { ok: true, secret: secret, uri: 'otpauth://totp/' + label + '?secret=' + secret + '&issuer=' + encodeURIComponent('Accord') + '&digits=6&period=30' };
}
function enrolConfirm_(u, req) {
  var st = totpCheck_(u.totpPending, req.code, 0);
  if (st < 0) throw new Error('That code does not match. Check the phone clock is set automatically, then try the newest code.');
  u.totpSecret = u.totpPending; u.totpPending = ''; u.totpLast = st; u.mfa = 'Set'; u.mustChange = 'No';
  if (req.email && !u.email) u.email = String(req.email).slice(0, 120);
  u.pwSalt = salt_(); u.pwHash = hash_(u.pwSalt, salt_());   // the temporary password stops working
  upsert_('users', u); audit_(u, 'users', u.id, 'linked authenticator app');
  return { ok: true, user: publicUser_(u) };
}
function changePassword_(u, req) {
  if (hash_(u.pwSalt, String(req.old || '')) !== u.pwHash) throw new Error('Current password is wrong');
  if (!strong_(req.password)) throw new Error('Use at least 8 characters with a letter and a number');
  u.pwSalt = salt_(); u.pwHash = hash_(u.pwSalt, req.password); u.mustChange = 'No'; upsert_('users', u);
  audit_(u, 'users', u.id, 'changed password');
  return { ok: true, user: publicUser_(u) };
}
/** Admin: a new temporary password. It also unlinks the authenticator, so the person links it again (new phone, lost phone). */
function setPassword_(admin, req) {
  if (admin.appRole !== 'admin') throw new Error('Only an admin can reset sign-in');
  var u = find_('users', req.userId); if (!u) throw new Error('Unknown user');
  if (!strong_(req.password)) throw new Error('Use at least 8 characters with a letter and a number');
  u.pwSalt = salt_(); u.pwHash = hash_(u.pwSalt, req.password); u.mustChange = 'Yes'; u.failed = 0; u.lockedUntil = '';
  if (req.resetAuthenticator !== false) { u.totpSecret = ''; u.totpPending = ''; u.totpLast = ''; u.mfa = 'Not set'; }
  upsert_('users', u);
  audit_(admin, 'users', u.id, 'sign-in reset (temporary password)');
  return { ok: true };
}
/** Approving a waiting device swaps out the person's other device of the same kind (non-admins keep one of each). */
function approveDevice_(admin, req) {
  if (admin.appRole !== 'admin') throw new Error('Only an admin can approve devices');
  var u = find_('users', req.userId); if (!u) throw new Error('Unknown user');
  var devs = u.devices || [], d = devs.filter(function (x) { return x.id === req.deviceId; })[0];
  if (!d) throw new Error('Unknown device');
  if (req.approve === false) devs = devs.filter(function (x) { return x.id !== req.deviceId; });
  else {
    d.approved = true; d.approvedBy = admin.name; d.approvedAt = now_();
    if (u.appRole !== 'admin') devs = devs.filter(function (x) { return x.id === d.id || !x.approved || (x.kind || 'computer') !== (d.kind || 'computer'); });
  }
  u.devices = devs; upsert_('users', u); audit_(admin, 'users', u.id, (req.approve === false ? 'refused' : 'approved') + ' device ' + (d.label || d.id));
  return { ok: true, devices: devs };
}
function releaseDevice_(admin, req) {
  if (admin.appRole !== 'admin') throw new Error('Only an admin can release devices');
  var u = find_('users', req.userId); if (!u) throw new Error('Unknown user');
  u.devices = (u.devices || []).filter(function (x) { return x.id !== req.deviceId; }); upsert_('users', u);
  audit_(admin, 'users', u.id, 'released device ' + req.deviceId);
  return { ok: true, devices: u.devices };
}

/* ───────────────────────── reads, filtered by role ───────────────────────── */
function strip_(rec, fields) { var o = {}; Object.keys(rec).forEach(function (k) { if (fields.indexOf(k) < 0) o[k] = rec[k]; }); return o; }
function payState_(c, recv, s, calls) {
  var gst = Number(s.gstDemand || 0.05), due = Number(s.dueDays || 15), billed = 0, cum = [], acc = 0;
  calls.forEach(function (k) { if (Number(k.pct) > 0) { acc += Number(k.pct); cum.push({ cum: acc, raisedOn: k.raisedOn }); } });
  billed = ['To verify','Cancelled','Under cancellation'].indexOf(c.status) >= 0 ? 0 : acc;
  var basis = Number(c.tc || 0) - Number(c.adjustment || 0), demand = basis * billed * (1 + gst), out = demand - recv;
  if (out <= 0) return 'Paid up';
  var covered = cum.filter(function (k) { return basis * k.cum * (1 + gst) <= recv; }).length, first = cum[covered];
  if (!first || !first.raisedOn) return 'Due, date not set';
  var dueOn = new Date(first.raisedOn); dueOn.setDate(dueOn.getDate() + due);
  var days = Math.round((new Date() - dueOn) / 864e5);
  return days > 60 ? 'Overdue 60+ days' : days > 0 ? 'Overdue' : days > -7 ? 'Due this week' : 'Not yet due';
}
function pull_(u) {
  var db = {};
  COLLECTIONS.forEach(function (c) { db[c] = read_(c); });
  db.users = db.users.map(function (x) { var y = strip_(x, ['pwSalt','pwHash','failed','lockedUntil','totpSecret','totpPending','totpLast']); y.hasPassword = !!x.pwHash; y.mfa = x.totpSecret ? 'Set' : 'Not set'; if (u.appRole !== 'admin') { delete y.devices; } return y; });
  if (seesAll_(u) && u.appRole !== 'viewer') return { db: db, serverTime: now_(), user: publicUser_(u) };

  var me = u.name, s = db.settings[0] || {};
  var mineC = {}; db.clients.forEach(function (c) { if (c.owner === me) mineC[c.clientId] = c; });
  var mineUnits = {}, mineB = {}; Object.keys(mineC).forEach(function (k) { mineUnits[String(mineC[k].unit)] = 1; mineB[mineC[k].bookingId] = 1; });
  var recv = {}, last = {};
  db.payments.forEach(function (p) { if (p.counted === 'Yes') recv[p.unit] = (recv[p.unit] || 0) + Number(p.amount || 0); if (!last[p.unit] || p.date > last[p.unit]) last[p.unit] = p.date; });
  var DIR = ['id','bookingId','clientId','unit','title','name','status','owner','category'];
  db.clients = db.clients.map(function (c) {
    var st = payState_(c, recv[c.unit] || 0, s, db.demandCalls), lp = last[c.unit] || '';
    if (c.owner === me) { var o = strip_(c, MONEY_FIELDS); o.payState = st; o.lastPaymentDate = lp; o.mine = true; return o; }
    var d = {}; DIR.forEach(function (k) { if (c[k] !== undefined) d[k] = c[k]; }); d.directoryOnly = true; return d;
  });
  db.payments = db.payments.filter(function (p) { return mineUnits[String(p.unit)]; }).map(function (p) { return { id: p.id, unit: p.unit, date: p.date, receiptNo: p.receiptNo, towards: p.towards, counted: p.counted }; });
  var mineL = {}; db.leads = db.leads.filter(function (l) { if (l.owner === me) { mineL[l.id] = 1; return true; } return false; });
  db.interactions = db.interactions.filter(function (i) { return i.by === me || (i.nextOwners || []).indexOf(me) >= 0 || i.nextOwner === me; });
  db.documents = db.documents.filter(function (d) { return mineB[d.bookingId] || mineB[d.id]; });
  db.issues = db.issues.filter(function (i) { return i.owner === me || mineUnits[String(i.unit)]; });
  db.costSheets = db.costSheets.filter(function (x) { return x.by === me || mineL[x.leadId] || mineUnits[String(x.unit)]; });
  db.attendance = db.attendance.filter(function (a) { return a.userId === u.id; });
  db.timeEvents = db.timeEvents.filter(function (a) { return a.userId === u.id; });
  db.tasks = db.tasks.filter(function (t) { return t.owner === me || t.by === me; });
  db.notifications = db.notifications.filter(function (n) { return n.to === me; });
  db.messages = db.messages.filter(function (m) { return m.by === me; });
  // design reads every session: they are the brief for the residence it designs
  if (u.appRole !== 'design') db.accordSessions = db.accordSessions.filter(function (x) { return x.by === me; });
  db.clientForms = (db.clientForms || []).filter(function (x) { return mineB[x.bookingId]; });
  var mineCid = {}; Object.keys(mineC).forEach(function (k) { mineCid[k] = 1; mineCid[mineC[k].bookingId] = 1; });
  db.files = (db.files || []).filter(function (f) { return f.by === me || mineCid[f.recordId] || mineL[f.recordId]; });
  db.audit = [];
  db.demandCalls = db.demandCalls.map(function (k) { return { id: k.id, stage: k.stage, description: k.description, raisedOn: k.raisedOn }; });
  return { db: db, serverTime: now_(), user: publicUser_(u) };
}

/* ───────────────────────── writes ───────────────────────── */
function can_(u, coll) { var w = WRITE[coll] || []; return u.appRole === 'admin' || w.indexOf('*') >= 0 || w.indexOf(u.appRole) >= 0; }
function push_(u, ops) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var done = 0, refused = [];
    ops.forEach(function (op) {
      var c = op.coll;
      if (COLLECTIONS.indexOf(c) < 0 || !can_(u, c)) { refused.push(c); return; }
      if (op.op === 'delete') { if (u.appRole !== 'admin' && ['tasks','notifications'].indexOf(c) < 0) { refused.push(c + ' delete'); return; } delete_(c, op.id); audit_(u, c, op.id, 'deleted'); done++; return; }
      var rec = op.rec || {};
      rec.updatedAt = now_(); rec.updatedBy = u.name;
      if (u.appRole === 'sales') {
        if (c === 'clients') { var cur = find_('clients', rec.bookingId || rec.id); if (!cur || cur.owner !== u.name) { refused.push('clients (not yours)'); return; } var safe = strip_(rec, MONEY_FIELDS.concat(['owner','status','payState','lastPaymentDate','mine','directoryOnly'])); Object.keys(safe).forEach(function (k) { cur[k] = safe[k]; }); rec = cur; }
        if (c === 'leads') { var cl = find_('leads', rec.id); if (cl && cl.owner && cl.owner !== u.name) { refused.push('leads (not yours)'); return; } if (!cl) rec.owner = rec.owner || u.name; }
        if (c === 'interactions') rec.by = rec.by || u.name;
        if (c === 'tasks' && rec.owner !== u.name) { refused.push('tasks (sales can only add their own)'); return; }
      }
      if (c === 'users') { var cu = find_('users', rec.id); ['pwSalt','pwHash','failed','lockedUntil','totpSecret','totpPending','totpLast','devices'].forEach(function (k) { rec[k] = cu ? cu[k] : (k === 'devices' ? [] : ''); }); rec.mfa = cu && cu.totpSecret ? 'Set' : 'Not set'; delete rec.hasPassword; }
      if (c === 'notifications' && rec.to !== u.name && !op.create) { var cn = find_('notifications', rec.id); if (cn && cn.to !== u.name && u.appRole !== 'admin') { refused.push('notifications'); return; } }
      upsert_(c, rec);
      var isTest = rec._test === 'Yes';
      if (c === 'interactions' && !isTest) notifyFollowUp_(u, rec);
      if (c === 'tasks' && !isTest && rec.owner && rec.owner !== u.name && op.isNew) notify_(rec.owner, 'task', 'New task from ' + u.name, rec.title, '#/people/tasks', rec.due ? rec.due + 'T10:00' : '', u.name);
      if (c !== 'notifications') audit_(u, c, rec.id || rec.bookingId, (op.action || 'saved') + (isTest ? ' (demo mode)' : ''));
      done++;
    });
    return { ok: true, done: done, refused: refused, serverTime: now_() };
  } finally { lock.releaseLock(); }
}
function notify_(to, kind, title, body, link, dueAt, by) {
  upsert_('notifications', { id: 'N-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), to: to, kind: kind, title: title, body: body, link: link, dueAt: dueAt || now_(), createdBy: by, createdAt: now_(), readAt: '', emailedAt: '' });
}
function notifyFollowUp_(u, i) {
  if (!i.nextDate || i.status !== 'Open') return;
  var owners = i.nextOwners && i.nextOwners.length ? i.nextOwners : [i.nextOwner || u.name];
  var existing = read_('notifications').filter(function (n) { return n.kind === 'followup' && n.link === 'i:' + i.id; }).map(function (n) { return n.to; });
  owners.forEach(function (o) { if (existing.indexOf(o) < 0) notify_(o, 'followup', 'Follow up: ' + (i.recordName || i.recordId), (i.nextAction || 'Follow up') + ' · logged by ' + u.name, 'i:' + i.id, i.nextDate + 'T10:00', u.name); });
}

/* ───────────────────────── time: server-stamped punch ───────────────────────── */
function punch_(u, req) {
  var type = req.type, allowed = ['in','out','break','resume','site','office','remote'];
  if (allowed.indexOf(type) < 0) throw new Error('Unknown punch type');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var d = today_(), t = clock_(), at = now_();
    var rows = read_('attendance'), a = rows.filter(function (x) { return x.userId === u.id && x.date === d; })[0];
    var geo = geoCheck_(req.loc, type === 'in' ? (req.mode || 'office') : type);
    if (type === 'in') {
      if (a && !a.out) return { ok: true, attendance: a, serverTime: at };
      var late = u.shiftStart && t > u.shiftStart;
      a = a || { id: 'AT-' + d.replace(/-/g, '') + '-' + u.id, userId: u.id, name: u.name, date: d, in: t, events: [] };
      var mode = geo.mode;
      a.out = ''; a.mode = mode; a.state = mode; a.status = late ? 'Late' : 'Present'; a.where = geo.where;
    } else if ((type === 'office' || type === 'site') && geo.mode === 'remote') {
      if (!a || a.out) throw new Error('You are not punched in');
      type = 'remote'; a.state = 'remote'; a.where = geo.where;
    } else {
      if (!a || a.out) throw new Error('You are not punched in');
      if (type === 'out' && req.confirm !== true) throw new Error('Punch out must be confirmed');
      if (type === 'out') { a.out = t; a.state = 'out'; }
      else if (type === 'resume') a.state = a.mode || 'office';
      else a.state = type;
    }
    a.events = (a.events || []).concat([{ t: at, type: type, note: req.note || '', where: geo.where }]);
    var sums = sums_(a.events, at); a.workMin = sums.work; a.breakMin = sums.brk; a.siteMin = sums.site; a.updatedAt = at;
    upsert_('attendance', a);
    var L = req.loc || {};
    upsert_('timeEvents', { id: 'TE-' + Date.now().toString(36), at: at, date: d, time: t, userId: u.id, name: u.name, type: type, note: req.note || '', device: req.deviceId || '',
      where: geo.where, lat: L.lat || '', lng: L.lng || '', acc: L.acc ? Math.round(L.acc) : '', dist: geo.dist === null ? '' : geo.dist });
    return { ok: true, attendance: a, serverTime: at, geo: geo };
  } finally { lock.releaseLock(); }
}
/** Location check (1 Nov): "Office" or "Site" counts only within the Sky City radius; otherwise the punch is logged as Remote.
 *  Settings: officeLat, officeLng, officeRadius (metres, default 300). Until the point is set, punches are recorded with the location but not judged. */
function geoCheck_(loc, wanted) {
  var s = read_('settings')[0] || {}, lat = Number(s.officeLat), lng = Number(s.officeLng), r = Number(s.officeRadius || 300);
  if (['office', 'site'].indexOf(wanted) < 0) return { mode: wanted === 'in' ? 'office' : wanted, where: wanted === 'remote' ? 'Remote (chosen)' : '', dist: null };
  if (!lat || !lng || s.geofence === 'Off') return { mode: wanted, where: loc && loc.lat ? 'Recorded (Sky City point not set)' : 'Not checked', dist: null };
  if (!loc || !loc.lat) return { mode: 'remote', where: 'Location not shared → logged as remote', dist: null };
  var dist = Math.round(haversine_(lat, lng, Number(loc.lat), Number(loc.lng))), slack = Math.min(Number(loc.acc || 0), 150);
  if (dist <= r + slack) return { mode: wanted, where: 'At Sky City (' + dist + ' m)', dist: dist };
  return { mode: 'remote', where: 'Away from Sky City (' + (dist >= 1000 ? (dist / 1000).toFixed(1) + ' km' : dist + ' m') + ') → logged as remote', dist: dist };
}
function haversine_(a1, o1, a2, o2) { var R = 6371000, t = Math.PI / 180, da = (a2 - a1) * t, dO = (o2 - o1) * t; var h = Math.sin(da / 2) * Math.sin(da / 2) + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dO / 2) * Math.sin(dO / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
function sums_(ev, nowIso) {
  var work = 0, brk = 0, site = 0, state = null, since = null;
  var close = function (until) { if (!state || !since) return; var m = Math.max(0, Math.round((new Date(until) - new Date(since)) / 60000)); if (state === 'break') brk += m; else { work += m; if (state === 'site') site += m; } };
  ev.forEach(function (e) { close(e.t); since = e.t; state = e.type === 'in' || e.type === 'resume' ? 'office' : e.type === 'out' ? null : e.type === 'office' || e.type === 'remote' ? e.type : e.type; });
  close(nowIso);
  return { work: work, brk: brk, site: site };
}

/* ───────────────────────── seed, Drive folders, files, e-mail, Excel ───────────────────────── */
function seed_(req) {
  var hasUsers = read_('users').some(function (x) { return !!x.pwHash; });
  if (hasUsers) { var u = auth_(req.token); if (u.appRole !== 'admin') throw new Error('Only an admin can seed'); }
  var db = req.db || {};
  // nobody can sign in without a password: people without one get the temporary password, to link their authenticator
  var cur = {}; read_('users').forEach(function (x) { cur[x.id] = x; });
  (db.users || []).forEach(function (x) { var c = cur[x.id]; if (c) ['pwSalt', 'pwHash', 'totpSecret', 'totpPending', 'totpLast', 'devices', 'mustChange', 'email'].forEach(function (k) { if (c[k] !== undefined && c[k] !== '' && !(k === 'email' && x.email)) x[k] = c[k]; }); delete x.hasPassword; if (!x.pwHash) { x.pwSalt = salt_(); x.pwHash = hash_(x.pwSalt, TEMP_PASSWORD); x.mustChange = 'Yes'; } x.mfa = x.totpSecret ? 'Set' : 'Not set'; });
  COLLECTIONS.forEach(function (c) { if (db[c] && c !== 'audit') writeAll_(c, db[c]); });
  audit_(null, 'all', '-', 'sheet seeded');
  return { ok: true, serverTime: now_() };
}
/** The data folder: My Drive / Accord_CRM_Application / Accord_Data (made by setup()). */
function root_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('ROOT_ID');
  if (id) { try { var f0 = DriveApp.getFolderById(id); if (!f0.isTrashed()) return f0; } catch (e) {} }
  var f = DriveApp.getRootFolder();
  DATA_PATH.split('/').filter(String).forEach(function (n) { var it = f.getFoldersByName(n); f = it.hasNext() ? it.next() : f.createFolder(n); });
  p.setProperty('ROOT_ID', f.getId());
  return f;
}
function clean_(n) { return String(n || '').replace(/[\\\/:*?"<>|#%]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'untitled'; }
function folder_(path) {
  var f = root_();
  String(path || '').split('/').map(clean_).filter(function (x) { return x && x !== '..' && x !== '.'; }).forEach(function (n) { var it = f.getFoldersByName(n); f = it.hasNext() ? it.next() : f.createFolder(n); });
  return f;
}
/** Run once from the editor, signed in as the OuTSDe account. */
function setup() {
  var r = root_();
  FOLDERS.forEach(function (x) { folder_(x); });
  var file = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  if (!file.getParents().hasNext() || file.getParents().next().getId() !== r.getId()) file.moveTo(r);
  COLLECTIONS.forEach(function (c) { sheet_(c); });
  if (!read_('users').length) {
    writeAll_('users', DEFAULT_USERS.map(function (u) { var x = JSON.parse(JSON.stringify(u)); x.pwSalt = salt_(); x.pwHash = hash_(x.pwSalt, TEMP_PASSWORD); x.mfa = 'Not set'; x.devices = []; return x; }));
    Logger.log('Created ' + DEFAULT_USERS.length + ' accounts. First sign-in: username + temporary password ' + TEMP_PASSWORD);
  }
  var def = SpreadsheetApp.getActive().getSheetByName('Sheet1'); if (def && SpreadsheetApp.getActive().getSheets().length > 1 && def.getLastRow() === 0) SpreadsheetApp.getActive().deleteSheet(def);
  installTriggers();
  Logger.log('Accord data folder: ' + r.getUrl());
  return r.getUrl();
}
/** Sky City gets read access to the documents only, never to the database. Settings > shareWith: comma-separated e-mails. */
function shareDocuments() {
  var s = read_('settings')[0] || {}, to = String(s.shareWith || '').split(/[,;\s]+/).filter(function (x) { return /@/.test(x); });
  if (!to.length) throw new Error('Add the Sky City e-mail addresses under Admin > Settings > Drive and sharing first');
  [folder_('Clients'), folder_('Project documents')].forEach(function (f) { to.forEach(function (e) { f.addViewer(e); }); });
  return 'Shared Clients and Project documents with ' + to.join(', ');
}
var EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'image/heif': '.heif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx', 'application/vnd.ms-excel': '.xls', 'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx', 'application/msword': '.doc', 'application/zip': '.zip',
  'video/mp4': '.mp4', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/aac': '.aac', 'image/svg+xml': '.svg' };
/** Every upload lands in the folder tree under Accord_Data and is listed in the Files tab.
 *  req: folder (relative to Accord_Data), name (without extension), mime, data (base64), meta { kind, recordId, label, category, doc, test } */
function upload_(u, req) {
  if (!req.data) throw new Error('No file');
  var m = req.meta || {}, ext = EXT[req.mime] || (String(req.origName || '').match(/\.[a-z0-9]{2,5}$/i) || [''])[0];
  var base = clean_(req.name || 'file'), f = folder_(req.folder || 'Unsorted');
  // same name on the same day: add a counter rather than overwrite
  var name = base + ext, n = 1; while (f.getFilesByName(name).hasNext()) name = base + '_' + (++n) + ext;
  var file = f.createFile(Utilities.newBlob(Utilities.base64Decode(req.data), req.mime || 'application/octet-stream', name));
  file.setDescription('Uploaded by ' + u.name + ' from Accord on ' + now_() + (m.doc ? ' · ' + m.doc : ''));
  var rec = { id: 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4), at: now_(), by: u.name, kind: m.kind || '', recordId: m.recordId || '', label: m.label || '',
    category: m.category || '', doc: m.doc || '', name: name, url: file.getUrl(), folder: req.folder || '', driveId: file.getId(), _test: m.test ? 'Yes' : '' };
  upsert_('files', rec); audit_(u, 'files', rec.id, 'uploaded ' + name);
  if (m.kind === 'brand') { var s = read_('settings')[0] || { id: 'main' }; s.logoFileId = file.getId(); upsert_('settings', s); }
  return { ok: true, url: rec.url, id: rec.driveId, name: name, file: rec, folderUrl: f.getUrl() };
}

/* Branded e-mail: the Yamuna Sky City header (logo from Drive / Brand), the message, the sender's signature. */
function brandHtml_(title, bodyText, footer) {
  var s = read_('settings')[0] || {}, co = s.company || {}, b = s.brand || {}, accent = b.accent || '#7A1C2E';
  var esc = function (x) { return String(x || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var logo = s.logoFileId ? '<img src="cid:logo" alt="' + esc(co.project || 'Yamuna Sky City') + '" style="max-height:56px;max-width:220px">' : '<div style="font:600 20px/1.1 Georgia,serif;letter-spacing:.18em;color:#1A1714">' + esc(co.project || 'YAMUNA SKY CITY') + '</div>';
  var paras = esc(bodyText).split(/\n{2,}/).map(function (p) { return '<p style="margin:0 0 14px">' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  return '<div style="background:#F3EDE3;padding:24px 0;font-family:Helvetica,Arial,sans-serif;color:#1A1714">' +
    '<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-top:4px solid ' + accent + '">' +
    '<tr><td style="padding:24px 32px 16px;border-bottom:1px solid #E7DFD3"><table width="100%"><tr><td>' + logo + '</td><td align="right" style="font-size:11px;color:#7A6F64;line-height:1.5">' + esc(co.tagline || '') + '<br>' + esc(co.location || '') + '</td></tr></table></td></tr>' +
    (title ? '<tr><td style="padding:22px 32px 0;font:600 18px/1.3 Georgia,serif">' + esc(title) + '</td></tr>' : '') +
    '<tr><td style="padding:18px 32px 8px;font-size:14px;line-height:1.6">' + paras + '</td></tr>' +
    '<tr><td style="padding:16px 32px 24px;font-size:11px;color:#7A6F64;border-top:1px solid #E7DFD3;line-height:1.6">' + esc(footer || ((co.name || '') + ' · ' + (co.address || '') + (co.rera ? ' · RERA ' + co.rera : ''))) + '</td></tr></table></div>';
}
function mail_(o) {
  var s = read_('settings')[0] || {}, co = s.company || {}, opts = { to: o.to, subject: o.subject, body: o.text, htmlBody: brandHtml_(o.title, o.text, o.footer), name: o.fromName || (co.project ? toTitle_(co.project) : 'Yamuna Sky City') };
  if (o.replyTo) opts.replyTo = o.replyTo;
  if (o.cc) opts.cc = o.cc;
  if (s.logoFileId) { try { opts.inlineImages = { logo: DriveApp.getFileById(s.logoFileId).getBlob() }; } catch (e) { opts.htmlBody = opts.htmlBody.replace(/<img src="cid:logo"[^>]*>/, ''); } }
  if (o.attachIds) opts.attachments = o.attachIds.map(function (id) { return DriveApp.getFileById(id).getBlob(); });
  MailApp.sendEmail(opts);
}
function toTitle_(x) { return String(x).toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
/** From Accord: a message to a client or lead, sent as a branded e-mail and logged on the Messages tab. */
function sendEmail_(u, req) {
  if (!req.to || !/@/.test(req.to)) throw new Error('No e-mail address');
  if (req.test) return { ok: true, skipped: 'demo mode: not sent' };
  mail_({ to: req.to, subject: req.subject || 'Yamuna Sky City', title: req.title || '', text: req.body || '', replyTo: u.email || '', fromName: req.fromName, attachIds: req.attachIds });
  var m = { id: 'M-' + Date.now().toString(36).toUpperCase(), at: now_(), by: u.name, channel: 'Email', to: req.to, recordId: req.recordId || '', subject: req.subject || '', body: req.body || '', status: 'Sent' };
  upsert_('messages', m); audit_(u, 'messages', m.id, 'e-mail sent to ' + req.to);
  return { ok: true, message: m, remaining: MailApp.getRemainingDailyQuota() };
}
/** The database as a real Excel file in Accord_Data / Exports (rewritten each night and on demand). */
function exportXlsx_() {
  var ss = SpreadsheetApp.getActive(), url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob().setName('Accord Database.xlsx');
  var f = folder_('Exports'), old = f.getFilesByName('Accord Database.xlsx'); while (old.hasNext()) old.next().setTrashed(true);
  var file = f.createFile(blob); return file;
}
function exportNow_(u) { if (u.appRole !== 'admin') throw new Error('Only an admin can export'); var f = exportXlsx_(); audit_(u, 'all', '-', 'exported to Excel'); return { ok: true, url: f.getUrl(), folderUrl: root_().getUrl() }; }

function apply_(rec) {
  if (!rec.name || !rec.phone) throw new Error('Name and phone are required');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var max = 0; read_('vendors').forEach(function (v) { var m = String(v.id).match(/^V-(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
    var clean = {}; Object.keys(rec).forEach(function (k) { if (typeof rec[k] !== 'function') clean[k] = rec[k]; });
    clean.id = 'V-' + ('00' + (max + 1)).slice(-3); clean.status = 'Applied'; clean.source = 'Onboarding form'; clean.appliedOn = today_(); clean.updatedAt = now_(); clean.updatedBy = 'Vendor (public form)';
    upsert_('vendors', clean);
    return { ok: true, id: clean.id };
  } finally { lock.releaseLock(); }
}

/* ───────────────────────── client self-service form (public, per-booking token) ───────────────────────── */
var CLIENT_FORM_KEYS = ['title','name','dob','fatherName','pan','aadhaar4','phone','phone2','whatsapp','email','residency','address','city','country','occupation','employer','marital',
  'coapp','coRelation','coPan','coPhone','coEmail','purpose','funding','loanBank','nominee','language','contactPref','familyProfile','passport','oci'];
function clientForm_(req) {
  var b = String(req.b || ''), k = String(req.k || ''), rec = req.rec || {};
  if (!b || k.length < 12) throw new Error('This link is not complete. Please ask your client advisor for a new one.');
  var c = find_('clients', b);
  if (!c || String(c.formToken || '') !== k) throw new Error('This link has expired. Please ask your client advisor for a new one.');
  var clean = {}; CLIENT_FORM_KEYS.forEach(function (x) { if (rec[x] !== undefined && rec[x] !== '') clean[x] = String(rec[x]).slice(0, 400); });
  if (!clean.name || !clean.phone) throw new Error('Name and mobile number are required');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var id = 'CF-' + Date.now().toString(36).toUpperCase();
    upsert_('clientForms', { id: id, bookingId: c.bookingId, clientId: c.clientId, unit: c.unit, name: c.name, submittedAt: now_(), status: 'New', data: clean });
    var to = c.owner || 'Aryan';
    notify_(to, 'clientform', 'Client form received: ' + c.name, 'Residence ' + c.unit + ' · review and apply it from the booking form', 'b:' + c.bookingId, now_(), 'Client (public form)');
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}

/* ───────────────────────── escalation: follow-ups nobody acted on ─────────────────────────
   A follow-up still open N working days (Settings: escalateDays, default 2; Sundays off) after its date goes to each
   owner's manager (Users: reportsTo). Another N days and it goes one level higher. Runs every morning. */
function escalateOverdue() {
  var s = read_('settings')[0] || {}, N = Number(s.escalateDays || 2), d = today_();
  var users = read_('users'), boss = {}; users.forEach(function (u) { if (u.reportsTo) boss[u.name] = u.reportsTo; });
  var ints = read_('interactions');
  var latest = {}; ints.forEach(function (i) { var t = (i.date || '') + (i.time || ''); if (!latest[i.recordId] || t > latest[i.recordId]) latest[i.recordId] = t; });
  ints.filter(function (i) { return i.status === 'Open' && i.nextDate && i.nextDate < d && i._test !== 'Yes'; }).forEach(function (i) {
    if (latest[i.recordId] > (i.nextDate + '99')) return; // someone has logged contact since the date
    var late = workingDays_(i.nextDate, d), level = Math.floor(late / N); if (level < 1) return;
    var done = i.escalated || {}, owners = i.nextOwners && i.nextOwners.length ? i.nextOwners : [i.nextOwner || i.by], changed = false;
    owners.forEach(function (o) {
      var to = o;
      for (var k = 1; k <= level && boss[to]; k++) {
        to = boss[to]; if (to === o || done[to]) continue;
        notify_(to, 'escalation', 'Escalated: ' + (i.recordName || i.recordId), o + ' has not followed up for ' + late + ' working days (' + (i.nextAction || 'follow up') + ', due ' + i.nextDate + ')', 'i:' + i.id, now_(), 'Accord');
        done[to] = d; changed = true;
      }
    });
    if (changed) { i.escalated = done; upsert_('interactions', i); }
  });
}
function workingDays_(a, b) { var s = new Date(a + 'T00:00:00'), e = new Date(b + 'T00:00:00'), k = 0; while (s < e) { s.setDate(s.getDate() + 1); if (s.getDay() !== 0) k++; } return k; }

/* ───────────────────────── scheduled jobs (run installTriggers once) ───────────────────────── */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('morningDigest').timeBased().atHour(9).nearMinute(5).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('escalateOverdue').timeBased().atHour(8).nearMinute(30).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('nightlyBackup').timeBased().atHour(23).everyDays(1).inTimezone(TZ).create();
}
/** E-mails each follow-up and task notification once, when it falls due (09:00 to 19:00). */
function sendDueReminders() {
  var h = Number(Utilities.formatDate(new Date(), TZ, 'H')); if (h < 9 || h > 19) return;
  var users = read_('users'), email = {}; users.forEach(function (u) { if (u.email) email[u.name] = u.email; });
  var nowIso = now_();
  read_('notifications').forEach(function (n) {
    if (n.emailedAt || n.readAt || !email[n.to] || (n.dueAt && n.dueAt > nowIso)) return;
    try { mail_({ to: email[n.to], subject: 'Accord · ' + n.title, title: n.title, text: n.body + '\n\nOpen Accord to see it and mark it done.', fromName: 'Accord', footer: 'Accord by OuTSDe · internal reminder' }); n.emailedAt = nowIso; upsert_('notifications', n); } catch (e) { }
  });
}
/** 09:05 digest: each person's follow-ups due today and overdue, from the interaction log. */
function morningDigest() {
  var users = read_('users').filter(function (u) { return u.email && u.active !== 'No'; }), d = today_();
  var ints = read_('interactions').filter(function (i) { return i.status === 'Open' && i.nextDate && i.nextDate <= d && i._test !== 'Yes'; });
  users.forEach(function (u) {
    var mine = ints.filter(function (i) { return (i.nextOwners || [i.nextOwner || i.by]).indexOf(u.name) >= 0; });
    if (!mine.length) return;
    var body = 'Good morning ' + u.name + ',\n\nFollow-ups due today or overdue: ' + mine.length + '\n\n' + mine.map(function (i) { return '· ' + i.recordId + ' · ' + (i.nextAction || i.purpose || 'follow up') + (i.nextDate < d ? ' (overdue since ' + i.nextDate + ')' : ''); }).join('\n') + '\n\nAccord by OuTSDe';
    try { mail_({ to: u.email, subject: 'Accord · your follow-ups for ' + d, title: 'Your follow-ups for ' + d, text: body.replace(/\n\nAccord by OuTSDe$/, ''), fromName: 'Accord', footer: 'Accord by OuTSDe · internal digest' }); } catch (e) { }
  });
}
/** Nightly copy of the whole database to Drive / Accord / Backups (keeps the last 30). */
function nightlyBackup() {
  var f = folder_('Backups'), ss = SpreadsheetApp.getActive();
  DriveApp.getFileById(ss.getId()).makeCopy('Accord Database · ' + today_(), f);
  var files = [], it = f.getFiles(); while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }).slice(30).forEach(function (x) { x.setTrashed(true); });
  try { exportXlsx_(); } catch (e) { Logger.log('Excel export failed: ' + e); }
}
