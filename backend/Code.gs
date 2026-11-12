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

var VERSION = '3.8.4';   // 12 Nov (e): no duplicate user accounts (dedupeUsers, push and seed checks)
// var VERSION = '3.8.3';   // 12 Nov (d): the logo lives on Drive (Accord_Data / Brand); settings keep only its link.
// 3.8.2: long values over the 50,000-character cell limit; one bad change no longer blocks a push.
// 3.8.1: shared read cache and delta pulls. Was:
// var VERSION = '3.8.0';   // 12 Nov: Accord People (HR, leave, KRAs, knowledge base by grade). See ACCORD_CHANGES_2026-11-12_PEOPLE.md
var DATA_PATH = 'Accord_CRM_Application/Accord_Data';   // inside My Drive of the account that runs this script
var TEMP_PASSWORD = 'Accord2026';                        // first sign-in only, to link the authenticator
// The team, created by setup() when the Users tab is empty, so the first admin can sign in (temporary password, then the authenticator).
var DEFAULT_USERS = [{"id": "T-01", "name": "Anuradha", "username": "anuradha", "team": "Sales", "designation": "Client Relations", "role": "Channel partners; CRM health and updates", "appRole": "sales", "reportsTo": "Cyril", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-02", "name": "Medha", "username": "medha", "team": "Sales", "designation": "Client Relations", "role": "Follow-up calls; client relations", "appRole": "sales", "reportsTo": "Cyril", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-03", "name": "Cyril", "username": "cyril", "team": "Sales", "designation": "Sales Lead", "role": "Closing; client relations", "appRole": "senior", "reportsTo": "Aryan", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-04", "name": "Khushi", "username": "khushi", "team": "Sales", "designation": "Sales and CRM", "role": "Generalist; updates", "appRole": "senior", "reportsTo": "Aryan", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-05", "name": "Aryan", "username": "aryan", "team": "Management", "designation": "Director", "role": "Director; client relations", "appRole": "admin", "reportsTo": "", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "Yes", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-06", "name": "Yakshith", "username": "yakshith", "team": "Sales", "designation": "Client Relations", "role": "To confirm (named in CRM remarks for 2503)", "appRole": "sales", "reportsTo": "Cyril", "active": "To verify", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "X-01", "name": "Smitha (SBI)", "username": "smithasbi", "team": "External", "designation": "Bank contact, State Bank of India", "role": "Bank contact, State Bank of India", "appRole": "bank", "reportsTo": "", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-07", "name": "Shruthadev", "username": "shruthadev", "team": "Management", "designation": "Research Director", "role": "Research Director, OuTSDe", "appRole": "admin", "reportsTo": "", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "Yes", "deviceLock": "No", "mustChange": "Yes"}, {"id": "T-08", "name": "Kajal", "username": "kajal", "team": "Design", "designation": "Creative Director", "role": "Creative Director, [INSD]e*", "appRole": "design", "reportsTo": "Shruthadev", "active": "Yes", "shiftStart": "09:30", "shiftEnd": "18:30", "workDays": "Mon-Sat", "remoteAllowed": "No", "deviceLock": "No", "mustChange": "Yes"}];
var FOLDERS = ['Clients', 'Leads', 'Project documents/Legal', 'Project documents/Approvals', 'Project documents/Forms and templates', 'Project documents/Marketing', 'Project documents/Site progress', 'Team', 'Vendors', 'Brand', 'Exports', 'Backups', 'Starting data'];
var CLIENT_SUB = ['01 KYC', '02 Booking', '03 Agreement and legal', '04 Home loan', '05 Receipts', '06 Cost sheets', '07 Changes', '08 Possession', '09 Accord sessions', '10 Correspondence'];
var TZ = 'Asia/Kolkata';
var ROUNDS = 1000;

/* ───────────────────────── schema: tab columns (key, heading) ───────────────────────── */
var SCHEMA = {
  users: [['id','Member ID'],['name','Name'],['username','Username'],['team','Team'],['department','Department'],['employment','On roll / off roll'],['company','Company'],['designation','Designation'],['photo','Profile picture'],['extraAccess','Extra access (ticked by admin)'],['role','Responsibilities'],['appRole','Access role'],['reportsTo','Reports to'],['workspaces','Workspaces'],['phone','Phone'],['email','Email'],['shiftStart','Shift start'],['shiftEnd','Shift end'],['workDays','Work days'],['remoteAllowed','Remote allowed'],['active','Active'],['deviceLock','Device lock'],['devices','Approved devices'],['mustChange','Must change password'],['mfa','Authenticator'],['pwSalt','_salt'],['pwHash','_hash'],['totpSecret','_totp'],['totpPending','_totp pending'],['totpLast','_totp last'],['failed','_failed'],['lockedUntil','_locked until']],
  clients: [['bookingId','Booking ID'],['clientId','Client ID'],['unit','Unit No.'],['status','Booking status'],['category','Customer category'],['title','Title'],['name','Primary applicant'],['coapp','Co-applicant(s)'],['buyerType','Buyer type'],['phone','Mobile (primary)'],['phone2','Mobile (alternate)'],['whatsapp','WhatsApp'],['email','Email'],['address','Correspondence address'],['city','City'],['country','Country'],['residency','Residential status'],['pan','PAN'],['aadhaar4','Aadhaar (last 4)'],['dob','Date of birth'],['language','Preferred language'],['contactPref','Preferred contact'],['purpose','Buying purpose'],['occupant','Who will live there'],['funding','Funding mode'],['loanBank','Lender'],['loanAmount','Loan amount (₹)'],['loanStatus','Loan status'],['occupation','Occupation'],['employer','Employer / business'],['income','Income band'],['marital','Marital status'],['familyProfile','Family profile'],['decisionMaker','Key decision-maker'],['source','Lead source'],['leadId','Lead ID'],['owner','Relationship owner'],['sourcedBy','Sourced by'],['closedBy','Closed by'],['bookingDate','Booking date'],['tc','Total consideration (₹)'],['adjustment','Adjustment (₹)'],['adjType','Adjustment type'],['plan','Payment plan'],['agreement','Agreement for sale'],['parkingEntitlement','Car parks entitled'],['remarks','Remarks'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  leads: [['id','Lead ID'],['date','Date captured'],['title','Title'],['name','Name'],['phone','Mobile'],['phone2','Other numbers'],['email','Email'],['city','City'],['country','Country'],['residency','Residential status'],['source','Lead source'],['partner','Channel partner'],['referredBy','Referred by'],['config','Configuration interest'],['budget','Budget band'],['purpose','Purpose'],['timeline','Buying timeline'],['owner','Assigned to'],['coOwners','Also responsible'],['stage','Stage'],['temperature','Temperature'],['svDone','Site visit done?'],['svDate','Site visit date'],['lostReason','Lost / dormant reason'],['clientId','Converted to Client ID'],['notes','Notes'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  interactions: [['id','Log ID'],['date','Date'],['time','Time'],['type','Record type'],['recordId','Client or Lead ID'],['mode','Mode'],['purpose','Purpose'],['by','Team member'],['summary','Summary of discussion'],['outcome','Outcome'],['nextAction','Next action'],['nextDate','Next action date'],['nextTime','Next action time'],['nextOwners','Follow-up owners'],['status','Status'],['updatedAt','Updated at']],
  payments: [['id','Entry No.'],['receiptNo','Receipt No.'],['date','Receipt date'],['unit','Unit No.'],['payer','Received from'],['thirdParty','Third-party payer'],['amount','Amount received (₹)'],['counted','Counted in totals?'],['towards','Towards'],['mode','Mode'],['instrument','Instrument / UTR no.'],['instrumentDate','Instrument date'],['bank','Bank'],['tds','TDS (₹)'],['realisation','Realisation'],['demandLetter','Against demand letter'],['ledgerOnly','Ledger entry only (no receipt)'],['proofUrl','Proof (Drive)'],['note','Note'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  attendance: [['id','Entry'],['userId','Member ID'],['name','Name'],['date','Date'],['in','Punch in'],['out','Punch out'],['mode','Started as'],['state','Current state'],['workMin','Worked (min)'],['breakMin','Breaks (min)'],['siteMin','Site visits (min)'],['status','Status'],['where','Location check'],['events','Events'],['note','Note'],['updatedAt','Updated at']],
  timeEvents: [['id','Event'],['at','Server time'],['date','Date'],['time','Time'],['userId','Member ID'],['name','Name'],['type','Type'],['note','Note'],['device','Device'],['where','Location check'],['lat','Latitude'],['lng','Longitude'],['acc','Accuracy (m)'],['dist','Distance to Sky City (m)']],
  tasks: [['id','Task ID'],['title','Task'],['owner','Owner'],['by','Assigned by'],['due','Due'],['priority','Priority'],['module','Area'],['link','Related ID'],['status','Status'],['doneOn','Done on'],['notes','Notes'],['updatedAt','Updated at']],
  notifications: [['id','ID'],['to','To'],['kind','Kind'],['title','Title'],['body','Body'],['link','Link'],['dueAt','Due at'],['createdBy','Created by'],['createdAt','Created at'],['readAt','Read at'],['emailedAt','E-mailed at'],['target','Opens']],
  issues: [['id','Issue ID'],['date','Date raised'],['category','Category'],['severity','Severity'],['unit','Unit'],['description','Description'],['source','Source'],['action','Suggested action'],['owner','Owner'],['status','Status'],['resolution','Resolution notes'],['resolvedOn','Resolved on'],['updatedAt','Updated at']],
  accordSessions: [['id','Session ID'],['startedAt','Started'],['buyer','Buyer'],['unitRef','Unit reference'],['recordId','Client or Lead ID'],['residence','Residence'],['persona','Persona'],['palette','Chosen palette'],['register','Register'],['configId','Configuration ID'],['total','Indicative total'],['by','Hosted by'],['fileUrl','Workbook (Drive)'],['updatedAt','Updated at']],
  clientForms: [['id','Response ID'],['bookingId','Booking ID'],['clientId','Client ID'],['unit','Unit No.'],['name','Client'],['submittedAt','Submitted at'],['status','Status'],['data','Answers'],['appliedBy','Applied by'],['appliedAt','Applied at']],
  files: [['id','File ID'],['at','Uploaded'],['by','By'],['kind','For'],['recordId','Record'],['label','Record name'],['category','Category'],['doc','Document'],['name','File name'],['url','Open (Drive)'],['folder','Folder'],['driveId','Drive ID'],['kyc','Card check'],['kycNumber','PAN / Aadhaar (last 4)'],['kycName','Name on card'],['kycDob','Date of birth on card'],['_test','Test entry']],
  paymentEdits: [['id','Edit ID'],['at','When'],['by','Changed by'],['paymentId','Entry No.'],['receiptNo','Receipt No.'],['unit','Unit No.'],['client','Client'],['reason','Reason'],['changes','Changes'],['high','High?']],
  demandLetters: [['id','Demand letter No.'],['date','Letter date'],['callId','Demand call'],['stage','Stage'],['unit','Unit No.'],['bookingId','Booking ID'],['clientId','Client ID'],['name','Client'],['pct','Share of consideration'],['basis','Basis (₹)'],['gst','GST'],['amount','Amount demanded (₹)'],['credit','Received earlier, set against it (₹)'],['dueDate','Due date'],['status','Status'],['by','Raised by'],['sentAt','Sent'],['note','Note'],['updatedAt','Updated at']],
  partners: [['id','ID'],['code','Partner code'],['name','Name'],['firm','Firm'],['phone','Mobile'],['email','Email'],['city','City'],['rera','RERA agent no.'],['commission','Brokerage %'],['since','Since'],['status','Status'],['owner','Our contact'],['notes','Notes'],['updatedAt','Updated at']],
  leadInbox: [['id','Inbox ID'],['at','Received'],['source','Source'],['name','Name'],['phone','Mobile'],['email','Email'],['city','City'],['config','Interest'],['message','Message'],['status','Status'],['leadId','Lead ID'],['by','Handled by'],['handledAt','Handled at']],
  // 8 Nov: car parking from the architect's drawings (slot = level + drawing number, e.g. L1-072A)
  parking: [['id','Slot'],['level','Level'],['levelCode','Level code'],['no','Drawing no.'],['kind','Kind'],['pair','Tandem partner'],['walk','Walk to lobby (m)'],['type','Type'],['ev','EV'],['zone','Held for band'],['status','Status'],['allotStatus','Allotment'],['unit','Unit No.'],['bookingId','Booking ID'],['clientId','Client ID'],['name','Client'],['assignedOn','Allotted on'],['assignedBy','Allotted by'],['allotNote','Why'],['locked','Letter issued'],['letterOn','Letter date'],['letterNo','Letter No.'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  audit: [['id','ID'],['at','When'],['by','By'],['coll','Collection'],['recId','Record'],['action','Action']],
  bigCells: [['id','ID'],['key','Value of'],['part','Part'],['text','Text']],   // 12 Nov (c): values too long for one cell
  // 12 Nov: Accord People
  hrProfiles: [['id','Profile ID'],['userId','Member ID'],['name','Name'],['empCode','Employee code'],['position','Position'],['grade','Grade'],['department','Department'],['employment','Employment'],['doj','Date of joining'],['probationEnd','Probation ends'],['confirmedOn','Confirmed on'],['status','Status'],['resignedOn','Resigned on'],['lastDay','Last working day'],['workLocation','Work location'],['onboarding','Onboarding checklist'],['exit','Exit checklist'],['opening','Opening leave balances'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  leaves: [['id','Leave ID'],['userId','Member ID'],['name','Name'],['type','Type'],['from','From'],['to','To'],['half','Half day'],['days','Days'],['reason','Reason'],['cover','Cover'],['status','Status'],['approver','Approver'],['appliedAt','Applied at'],['decidedBy','Decided by'],['decidedAt','Decided at'],['decisionNote','Decision note'],['updatedAt','Updated at']],
  kras: [['id','Sheet ID'],['userId','Member ID'],['name','Name'],['position','Position'],['manager','Manager'],['cycle','Cycle'],['status','Status'],['items','KRAs'],['selfComment','Self comment'],['mgrComment','Manager comment'],['score','Score'],['band','Band'],['closedBy','Closed by'],['closedAt','Closed on'],['updatedAt','Updated at']],
  hrComp: [['id','ID'],['userId','Member ID'],['name','Name'],['effective','Effective from'],['gross','Monthly gross'],['basic','Basic + DA'],['hra','HRA'],['special','Special'],['employerPf','Employer PF'],['variable','Variable (yearly)'],['note','Note'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  holidays: [['id','ID'],['date','Date'],['name','Holiday'],['type','Type'],['note','Note']],
  hrTickets: [['id','Request ID'],['at','Raised'],['by','By'],['userId','Member ID'],['category','About'],['subject','Subject'],['details','Details'],['status','Status'],['owner','With'],['thread','Replies'],['updatedAt','Updated at']],
  assets: [['id','Asset ID'],['tag','Tag'],['type','Type'],['description','Description'],['serial','Serial'],['issuedToId','Member ID'],['issuedTo','With'],['issuedOn','Issued'],['returnedOn','Returned'],['condition','Condition'],['status','Status'],['updatedAt','Updated at']],
  kbDocs: [['id','Doc ID'],['code','Code'],['title','Title'],['category','Category'],['version','Version'],['status','Status'],['owner','Owner'],['approver','Approver'],['effective','Effective'],['review','Next review'],['ack','Acknowledge?'],['rev','Revision'],['ackCarry','Earlier acks valid from rev'],['audience','Audience'],['summary','Summary'],['body','Text'],['related','Related'],['history','History'],['approvedBy','Approved by'],['approvedAt','Approved on'],['updatedAt','Updated at'],['updatedBy','Updated by']],
  kbAcks: [['id','ID'],['docId','Doc ID'],['code','Code'],['version','Version'],['rev','Revision'],['userId','Member ID'],['name','Name'],['at','Acknowledged at']]
};
var COLLECTIONS = ['settings','users','units','clients','payments','leads','interactions','documents','issues','clpStages','demandCalls','costSheets','parking',
  'messages','templates','attendance','timeEvents','tasks','notifications','viewings','brochure','vendors','trips','stops','quotes','samples','projects','rooms',
  'packages','boq','accordSessions','clientForms','files','leadInbox','demandLetters','partners','paymentEdits',
  'hrConfig','hrProfiles','hrComp','leaves','holidays','kras','hrTickets','assets','kbDocs','kbAcks','audit'];
var HR_COLLS = ['hrConfig','hrProfiles','hrComp','leaves','holidays','kras','hrTickets','assets','kbDocs','kbAcks'];

/* ───────────────────────── roles ───────────────────────── */
var ALL = ['admin','senior','sales','finance','design','sourcing','viewer','consultant','bank','hr'];
var WRITE = {
  leads:['admin','senior','sales'], interactions:['admin','senior','sales','finance'], clients:['admin','senior','sales','finance'], payments:['admin','finance'],
  documents:['admin','senior','sales'], issues:['admin','senior','sales'], costSheets:['admin','senior','sales'], parking:['admin','senior'],
  demandCalls:['admin','finance'], clpStages:['admin','finance'], paymentEdits:['admin'], settings:['admin'], users:['admin'], units:['admin'], templates:['admin','senior'],
  messages:['admin','senior','sales','finance'], viewings:['admin','senior','sales','design'], brochure:['admin','senior','design'],
  vendors:['admin','design','sourcing'], trips:['admin','design','sourcing'], stops:['admin','design','sourcing'], quotes:['admin','design','sourcing'],
  samples:['admin','design','sourcing'], projects:['admin','design'], rooms:['admin','design'], packages:['admin','design','sourcing'], boq:['admin','design','sourcing'],
  clientForms:['admin','senior','sales'], files:['admin','senior','sales','finance','design','sourcing'], leadInbox:['admin','senior','sales'], demandLetters:['admin','finance'], partners:['admin','senior'],
  // 12 Nov: Accord People. '*' here means "checked record by record in hrCheck_".
  hrConfig:['admin','hr'], holidays:['admin','hr'], assets:['admin','hr'], hrComp:['admin','hr'], kbDocs:['admin','hr'],
  hrProfiles:['*'], leaves:['*'], kras:['*'], hrTickets:['*'], kbAcks:['*'], tasks:['*'], notifications:['*'], accordSessions:['*'], attendance:['admin'], timeEvents:[], audit:[]
};
var MONEY_FIELDS = ['tc','adjustment','adjType','adjReason','receivedPerCollections','outstandingPerCollections','loanAmount','rate','total','customPlan','cancelCalc','waivers','refunds'];
// 4 Nov: extra access an admin ticks for one person (Users and access › Pages and permissions). Same list as perms.js.
var GRANTS = { leads: ['leads','leadInbox','interactions'], clients: [], interactions: ['interactions'], payments: [], documents: ['documents','files'], messages: ['messages'],
  issues: ['issues'], costSheet: ['costSheets'], inventory: [], viewings: ['viewings'], brochure: [], experience: [], time: [], tasks: [], team: [], performance: [],
  analyticsLeads: [], analyticsFinance: [], analyticsOverall: [], projects: ['projects','rooms','packages','boq'], residences: [], showcase: [], sourcing: ['trips','stops','quotes','samples'],
  vendors: ['vendors'], partners: ['partners'], seeAll: [],
  hrSelf: [], kb: [], hrDesk: ['hrProfiles','hrConfig','holidays','assets','leaves','kras','hrTickets'], hrComp: ['hrComp'], kbEdit: ['kbDocs'], money: [], recordPayments: ['payments','demandCalls','demandLetters'], construction: ['clpStages'], templates: ['templates'], assign: [] };
function extras_(u) { var x = u.extraAccess; if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { x = x.split(/[,\s]+/); } } return (x || []).filter(function (k) { return GRANTS.hasOwnProperty(k); }); }
var seesMoney_ = function (u) { var x = extras_(u); return ['admin','senior','finance','consultant','bank'].indexOf(u.appRole) >= 0 || x.indexOf('money') >= 0 || x.indexOf('recordPayments') >= 0; };
var seesAll_ = function (u) { return ['admin','senior','finance','viewer'].indexOf(u.appRole) >= 0 || extras_(u).indexOf('seeAll') >= 0; };

/* ───────────────────────── entry ───────────────────────── */
// 7 Nov (3.6.0): one-time data changes that came with this version. Runs once, on the first request after deploying.
function migrate36_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('migrated36') === 'yes') return;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return;
  try {
    if (props.getProperty('migrated36') === 'yes') return;
    var cy = read_('users').filter(function (x) { return String(x.username || '').toLowerCase() === 'cyril'; })[0];
    if (cy && cy.designation !== 'Sales Lead') { cy.designation = 'Sales Lead'; upsert_('users', cy); audit_({ name: 'Accord 3.6.0' }, 'users', cy.id, 'designation set to Sales Lead'); }
    props.setProperty('migrated36', 'yes');
  } finally { lock.releaseLock(); }
}
function doGet() { return out_({ ok: true, app: 'Accord', version: VERSION, hint: 'POST JSON to use the API' }); }
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    migrate36_();
    switch (req.action) {
      case 'ping': return out_({ ok: true, version: VERSION, sheet: SpreadsheetApp.getActive().getName(), users: read_('users').length, folder: DATA_PATH, folderUrl: root_().getUrl(), serverTime: now_() });
      case 'login': return out_(login_(req));
      case 'emailCode': return out_(emailCode_(req));
      case 'logout': return out_(logout_(req));
      case 'enrolStart': return out_(enrolStart_(auth_(req.token, true)));
      case 'enrolConfirm': return out_(enrolConfirm_(auth_(req.token, true), req));
      case 'changePassword': return out_(changePassword_(auth_(req.token), req));
      case 'pull': return out_(delta_(pull_(auth_(req.token)), req.have));
      case 'logo': auth_(req.token); return out_(logoData_());
      case 'push': return out_(push_(auth_(req.token), req.ops || []));
      case 'punch': return out_(punch_(auth_(req.token), req));
      case 'setPassword': return out_(setPassword_(auth_(req.token), req));
      case 'approveDevice': return out_(approveDevice_(auth_(req.token), req));
      case 'upload': return out_(upload_(auth_(req.token), req));
      case 'fileGet': return out_(fileGet_(auth_(req.token), req));
      case 'setPhoto': return out_(setPhoto_(auth_(req.token), req));
      case 'fileDelete': return out_(fileDelete_(auth_(req.token), req));
      case 'sendEmail': return out_(sendEmail_(auth_(req.token), req));
      case 'exportNow': return out_(exportNow_(auth_(req.token)));
      case 'releaseDevice': return out_(releaseDevice_(auth_(req.token), req));
      case 'dedupeUsers': return out_(dedupeUsers_(auth_(req.token)));
      case 'seed': return out_(seed_(req));
      case 'apply': return out_(apply_(req.rec || {}));
      case 'clientForm': return out_(clientForm_(req));
      case 'inboundLead': return out_(inboundLead_(req));
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
// 12 Nov: sheets and sheet contents are remembered for the length of one request. A push of 40 changes used to read the
// same tabs (users, leads, notifications) dozens of times. Every write below clears the remembered copy of its tab.
var SHEETS_ = {}, READ_CACHE_ = {};
/* 12 Nov (b): a second, shared cache that lasts between requests (CacheService, up to 6 hours). Every tab has a version
   token; every write through Accord gives that tab a new token, and onEdit does the same when someone types in the sheet
   by hand. A pull then reads a tab from the sheet only if it changed since anyone last read it: with 49 tabs and every
   person pulling every 30 seconds, most pulls no longer touch the spreadsheet at all. */
var CACHE_TTL_ = 21600, CHUNK_ = 30000, VERS_ = null;
function scache_() { return CacheService.getScriptCache(); }
function vers_(names) {   // tokens for several tabs in one call; missing ones are created
  VERS_ = VERS_ || {};
  var need = names.filter(function (n) { return !VERS_[n]; });
  if (need.length) {
    var got = {}; try { got = scache_().getAll(need.map(function (n) { return 'v:' + n; })); } catch (e) {}
    var fresh = {};
    need.forEach(function (n) { var v = got['v:' + n]; if (!v) { v = Utilities.getUuid().slice(0, 8); fresh['v:' + n] = v; } VERS_[n] = v; });
    if (Object.keys(fresh).length) { try { scache_().putAll(fresh, CACHE_TTL_); } catch (e) {} }
  }
  var o = {}; names.forEach(function (n) { o[n] = VERS_[n]; }); return o;
}
function bump_(name) {   // after a write: a new token, so no request reads the old copy again
  delete READ_CACHE_[name];
  var v = Utilities.getUuid().slice(0, 8); VERS_ = VERS_ || {}; VERS_[name] = v;
  try { scache_().put('v:' + name, v, CACHE_TTL_); } catch (e) {}
}
function shared_(key) {   // the cached JSON for key, or null
  try {
    var c = scache_(), n = c.get(key + '#n'); if (!n) return null;
    var parts = [], keys = []; for (var i = 0; i < Number(n); i++) keys.push(key + '#' + i);
    var got = c.getAll(keys); for (var j = 0; j < keys.length; j++) { if (got[keys[j]] == null) return null; parts.push(got[keys[j]]); }
    return parts.join('');
  } catch (e) { return null; }
}
function share_(key, json) {
  try {
    var o = {}, n = Math.max(1, Math.ceil(json.length / CHUNK_));
    for (var i = 0; i < n; i++) o[key + '#' + i] = json.slice(i * CHUNK_, (i + 1) * CHUNK_);
    if (n > 60) return;   // over about 1.8 MB: leave it to the sheet
    scache_().putAll(o, CACHE_TTL_); scache_().put(key + '#n', String(n), CACHE_TTL_);
  } catch (e) {}
}
function preload_(rks) {   // fills READ_CACHE_ for many tabs with two cache calls (instead of two per tab)
  try {
    var names = rks.map(function (k) { return k.split('@')[0]; }), V = vers_(names), c = scache_();
    var base = {}; rks.forEach(function (k, i) { if (!READ_CACHE_[k]) base[k] = 'd:' + k + ':' + V[names[i]]; });
    var heads = c.getAll(Object.keys(base).map(function (k) { return base[k] + '#n'; })), want = [];
    Object.keys(base).forEach(function (k) { var n = Number(heads[base[k] + '#n'] || 0); for (var i = 0; i < n; i++) want.push(base[k] + '#' + i); });
    var got = want.length ? c.getAll(want) : {};
    Object.keys(base).forEach(function (k) {
      var n = Number(heads[base[k] + '#n'] || 0), parts = []; if (!n) return;
      for (var i = 0; i < n; i++) { var x = got[base[k] + '#' + i]; if (x == null) return; parts.push(x); }
      READ_CACHE_[k] = parts.join('');
    });
  } catch (e) {}
}
/** Simple trigger: a change typed straight into the sheet makes Accord read that tab again. */
function onEdit(e) { try { var n = e.range.getSheet().getName(); if (COLLECTIONS.indexOf(n) >= 0) scache_().remove('v:' + n); } catch (x) {} }
function sheet_(name) {
  if (SHEETS_[name]) return SHEETS_[name];
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var c = cols_(name);
    sh.getRange(1, 1, 1, c.length).setValues([c.map(function (x) { return x[1]; })]).setFontWeight('bold').setBackground('#1A1714').setFontColor('#F3EDE3');
    sh.getRange(2, 1, 1, c.length).setValues([c.map(function (x) { return x[0]; })]).setFontColor('#9A9087').setFontSize(8);
    sh.setFrozenRows(2);
  }
  SHEETS_[name] = sh;
  return sh;
}
function keys_(sh) { var w = sh.getLastColumn(); return w ? sh.getRange(2, 1, 1, w).getValues()[0].map(String) : []; }
function cell_(v) { if (v === null || v === undefined) return ''; if (typeof v === 'object') return JSON.stringify(v); return v; }
// Columns that hold text even when they look like numbers (Sheets turns 9845012345 into a number; Accord needs it back as text).
var TEXT_KEYS = { no: 1, nextTime: 1, kycNumber: 1, kycDob: 1, phone: 1, phone2: 1, whatsapp: 1, coPhone: 1, pan: 1, coPan: 1, aadhaar4: 1, receiptNo: 1, instrument: 1, account: 1, ifsc: 1, pincode: 1, username: 1, name: 1, title: 1, email: 1, designation: 1, shiftStart: 1, shiftEnd: 1, time: 1, in: 1, out: 1, gstin: 1,
  version: 1, code: 1, empCode: 1, bankAccount: 1, uan: 1, esic: 1, tag: 1, serial: 1, personalPhone: 1, emergencyPhone: 1 };   // 12 Nov: Accord People ('1.0' must stay '1.0')
function parse_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  if (typeof v === 'string' && (v.charAt(0) === '[' || v.charAt(0) === '{')) { try { return JSON.parse(v); } catch (e) {} }
  return v;
}
function rowOf_(keys, rec, name) {
  var extra = {}, known = {};
  keys.forEach(function (k) { known[k] = 1; });
  Object.keys(rec).forEach(function (k) { if (!known[k]) extra[k] = rec[k]; });
  return keys.map(function (k) {
    var v = k === '_extra' ? (Object.keys(extra).length ? JSON.stringify(extra) : '') : cell_(rec[k]);
    if (typeof v === 'string' && v.length > BIG_) {   // 12 Nov (c): a Google Sheets cell holds at most 50,000 characters
      if (!name || name === 'bigCells') return v.slice(0, BIG_);
      var key = name + ':' + String(rec[idKey_(name)] || rec.id) + ':' + k;
      bigPut_(key, v); return BIG_MARK_ + key;
    }
    return v;
  });
}
/* 12 Nov (c): a value longer than one cell allows (a photo with the other extra fields, a long thread, a long document)
   is kept in the bigCells tab in parts, and its cell holds only a pointer (@@big:<tab>:<id>:<field>). read_ puts it back
   together, so the rest of Accord never sees the difference. Each part starts with ~ (removed on reading) so Sheets never
   reads a part as a number, a date or a formula. */
var BIG_ = 45000, BIG_MARK_ = '@@big:', BIG_MAP_ = null;
function bigPut_(key, text) {
  var sh = sheet_('bigCells'), keys = keys_(sh), last = sh.getLastRow(), ki = keys.indexOf('key');
  if (last > 2 && ki >= 0) { var col = sh.getRange(3, ki + 1, last - 2, 1).getValues(); for (var i = col.length - 1; i >= 0; i--) if (String(col[i][0]) === key) sh.deleteRow(i + 3); }
  var rows = [], n = Math.ceil(text.length / BIG_);
  for (var p = 0; p < n; p++) rows.push(keys.map(function (k) { return k === 'id' ? key + '#' + p : k === 'key' ? key : k === 'part' ? p : k === 'text' ? '~' + text.slice(p * BIG_, (p + 1) * BIG_) : ''; }));
  sh.getRange(Math.max(sh.getLastRow(), 2) + 1, 1, rows.length, keys.length).setValues(rows);
  BIG_MAP_ = null; bump_('bigCells');
}
function bigGet_(v) {
  if (!BIG_MAP_) {
    BIG_MAP_ = {}; var parts = {};
    read_('bigCells').forEach(function (r) { (parts[r.key] = parts[r.key] || []).push(r); });
    Object.keys(parts).forEach(function (k) { BIG_MAP_[k] = parts[k].sort(function (a, b) { return Number(a.part) - Number(b.part); }).map(function (r) { return String(r.text == null ? '' : r.text).slice(1); }).join(''); });
  }
  var key = String(v).slice(BIG_MARK_.length);
  return BIG_MAP_[key] !== undefined ? BIG_MAP_[key] : '';
}
function idKey_(name) { return name === 'clients' ? 'bookingId' : 'id'; }
// 12 Nov: lastN reads only the newest rows (the audit sheet grew past 20,000 rows and was read in full on every pull).
function read_(name, lastN) {
  var rk = lastN ? name + '@' + lastN : name;
  if (READ_CACHE_[rk]) return JSON.parse(READ_CACHE_[rk]);   // a fresh copy: callers change what they get
  var skey = 'd:' + rk + ':' + vers_([name])[name], hit = shared_(skey);
  if (hit) { READ_CACHE_[rk] = hit; return JSON.parse(hit); }
  var sh = sheet_(name), keys, vals;
  if (lastN) {
    var last = sh.getLastRow(); if (last < 3) { READ_CACHE_[rk] = '[]'; return []; }
    var start = last - 2 > lastN ? last - lastN + 1 : 3;
    keys = keys_(sh); vals = sh.getRange(start, 1, last - start + 1, keys.length).getValues();
  } else {
    var all = sh.getDataRange().getValues();   // one call instead of four
    if (all.length < 3) { READ_CACHE_[rk] = '[]'; share_(skey, '[]'); return []; }
    keys = all[1].map(String); vals = all.slice(2);
  }
  var out = [];
  vals.forEach(function (r) {
    if (r.join('') === '') return;
    if (name !== 'bigCells' && r.some(function (x) { return typeof x === 'string' && x.indexOf(BIG_MARK_) === 0; })) r = r.map(function (x) { return typeof x === 'string' && x.indexOf(BIG_MARK_) === 0 ? bigGet_(x) : x; });
    var o = {};
    keys.forEach(function (k, i) { if (k === '_extra') { if (r[i]) { try { var x = JSON.parse(r[i]); Object.keys(x).forEach(function (kk) { o[kk] = x[kk]; }); } catch (e) {} } } else if (r[i] !== '') o[k] = TEXT_KEYS[k] ? (r[i] instanceof Date ? Utilities.formatDate(r[i], TZ, /^(time|nextTime|in|out|shiftStart|shiftEnd)$/.test(k) ? 'HH:mm' : 'yyyy-MM-dd') : String(r[i])) : parse_(r[i]); });
    if (name === 'clients' && !o.id) o.id = o.bookingId;
    if (o.id !== undefined) o.id = String(o.id);
    out.push(o);
  });
  READ_CACHE_[rk] = JSON.stringify(out); share_(skey, READ_CACHE_[rk]);
  return out;
}
function writeAll_(name, list) {
  delete READ_CACHE_[name];
  var sh = sheet_(name), keys = keys_(sh);
  if (sh.getLastRow() > 2) sh.getRange(3, 1, sh.getLastRow() - 2, sh.getLastColumn()).clearContent();
  if (list.length) sh.getRange(3, 1, list.length, keys.length).setValues(list.map(function (r) { return rowOf_(keys, r, name); }));
  bump_(name);
}
function upsert_(name, rec) {
  delete READ_CACHE_[name];
  var sh = sheet_(name), keys = keys_(sh), last = sh.getLastRow(), ik = keys.indexOf(idKey_(name));
  if (ik < 0) ik = keys.indexOf('id');
  var id = String(rec[idKey_(name)] || rec.id);
  var ids = last > 2 ? sh.getRange(3, ik + 1, last - 2, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var i = ids.indexOf(id), row = rowOf_(keys, rec, name);
  if (i >= 0) sh.getRange(i + 3, 1, 1, keys.length).setValues([row]); else sh.appendRow(row);
  bump_(name);
}
function find_(name, id) { return read_(name).filter(function (x) { return String(x.id) === String(id) || String(x.bookingId) === String(id); })[0] || null; }
function delete_(name, id) {
  delete READ_CACHE_[name];
  var sh = sheet_(name), keys = keys_(sh), last = sh.getLastRow(); if (last < 3) return;
  var ik = Math.max(0, keys.indexOf(idKey_(name)));
  var ids = sh.getRange(3, ik + 1, last - 2, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 3);
  bump_(name);
}
// 12 Nov: audit rows are always new, so they are appended without reading the whole ID column first (that read took
// longer as the sheet grew). Inside push_ they are collected and written in one go at the end.
var AUDIT_BUF_ = null;
function audit_(u, coll, id, action) {
  var rec = { id: 'A-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: now_(), by: u ? u.name : 'system', coll: coll, recId: id, action: action };
  if (AUDIT_BUF_) { AUDIT_BUF_.push(rec); return; }
  var sh = sheet_('audit'); sh.appendRow(rowOf_(keys_(sh), rec)); bump_('audit');
}
function flushAudit_() {
  var list = AUDIT_BUF_ || []; AUDIT_BUF_ = null; if (!list.length) return;
  delete READ_CACHE_.audit;
  var sh = sheet_('audit'), keys = keys_(sh);
  sh.getRange(Math.max(sh.getLastRow(), 2) + 1, 1, list.length, keys.length).setValues(list.map(function (r) { return rowOf_(keys, r); }));
  bump_('audit');
}
/** 12 Nov: moves to notificationsArchive (1) notifications read more than `days` ago (default 30) and (2) repeated
    follow-up reminders: the same person, same interaction, still unread, where only the newest one is kept. */
function tidyNotifications(days) {
  days = Number(days) || 30;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) return 'busy';
  try {
    var sh = sheet_('notifications'), last = sh.getLastRow(); if (last < 3) return 'nothing to move';
    var w = sh.getLastColumn(), vals = sh.getRange(3, 1, last - 2, w).getValues(), keys = keys_(sh);
    var K = function (k) { return keys.indexOf(k); }, cut = new Date(Date.now() - days * 864e5).toISOString();
    var newest = {};
    vals.forEach(function (r, i) { if (r[K('kind')] === 'followup' && !r[K('readAt')]) { var g = r[K('to')] + '|' + r[K('link')]; if (newest[g] === undefined || String(r[K('createdAt')]) >= String(vals[newest[g]][K('createdAt')])) newest[g] = i; } });
    var keep = [], move = [];
    vals.forEach(function (r, i) {
      var g = r[K('to')] + '|' + r[K('link')];
      var old = r[K('readAt')] && String(r[K('readAt')]) < cut, repeat = r[K('kind')] === 'followup' && !r[K('readAt')] && newest[g] !== i;
      (old || repeat ? move : keep).push(r);
    });
    if (!move.length) return 'nothing to move';
    var ss = SpreadsheetApp.getActive(), ar = ss.getSheetByName('notificationsArchive');
    if (!ar) { ar = ss.insertSheet('notificationsArchive'); ar.getRange(1, 1, 2, w).setValues(sh.getRange(1, 1, 2, w).getValues()); ar.setFrozenRows(2); }
    ar.getRange(Math.max(ar.getLastRow(), 2) + 1, 1, move.length, w).setValues(move);
    sh.getRange(3, 1, vals.length, w).clearContent();
    if (keep.length) sh.getRange(3, 1, keep.length, w).setValues(keep);
    bump_('notifications');
    return 'moved ' + move.length + ' rows, kept ' + keep.length;
  } finally { lock.releaseLock(); }
}
/** 12 Nov: one-time tidy after updating to 3.7.0. Run this once from the editor. */
function consolidateOnce() { Logger.log('audit: ' + archiveAudit(14)); Logger.log('notifications: ' + tidyNotifications(30)); }
/** 12 Nov: moves audit rows older than `days` (default 14) to the auditArchive tab, which Accord never reads.
    Runs every night with nightlyBackup; run it once by hand after updating to clear the backlog. */
function archiveAudit(days) {
  days = Number(days) || 14;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) return 'busy';
  try {
    var sh = sheet_('audit'), last = sh.getLastRow(); if (last < 3) return 'nothing to move';
    var w = sh.getLastColumn(), vals = sh.getRange(3, 1, last - 2, w).getValues(), keys = keys_(sh), ai = keys.indexOf('at');
    // Moved: rows older than `days`; the experience-session re-saves from the 5 to 11 Nov loop; and the same change
    // logged again by the same person within the same minute (the double and triple pushes). Nothing is deleted.
    var cut = new Date(Date.now() - days * 864e5).toISOString();
    var bi = keys.indexOf('by'), ci = keys.indexOf('coll'), ri = keys.indexOf('recId'), xi = keys.indexOf('action');
    var seen = {}, keep = [], move = [];
    vals.forEach(function (r) {
      var sig = [r[bi], r[ci], r[ri], r[xi], String(r[ai]).slice(0, 16)].join('|');
      var noise = r[ci] === 'accordSessions' && r[xi] === 'saved';
      if (String(r[ai]) < cut || noise || seen[sig]) move.push(r); else keep.push(r);
      seen[sig] = 1;
    });
    if (!move.length) return 'nothing to move';
    var ss = SpreadsheetApp.getActive(), ar = ss.getSheetByName('auditArchive');
    if (!ar) { ar = ss.insertSheet('auditArchive'); ar.getRange(1, 1, 2, w).setValues(sh.getRange(1, 1, 2, w).getValues()); ar.setFrozenRows(2); }
    ar.getRange(Math.max(ar.getLastRow(), 2) + 1, 1, move.length, w).setValues(move);
    sh.getRange(3, 1, vals.length, w).clearContent();
    if (keep.length) sh.getRange(3, 1, keep.length, w).setValues(keep);
    if (sh.getMaxRows() > keep.length + 50) sh.deleteRows(keep.length + 3, sh.getMaxRows() - keep.length - 3);
    bump_('audit');
    return 'moved ' + move.length + ' rows, kept ' + keep.length;
  } finally { lock.releaseLock(); }
}

/* ───────────────────────── sign-in: authenticator app, two devices, sessions ───────────────────────── */
function hex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)); }
/** Same scheme as the browser (src/lib/crypto.js): h0 = sha(salt:pw), then h = sha(h + salt) 999 more times. */
function hash_(salt, pw) { var h = sha_(salt + ':' + pw); for (var i = 1; i < ROUNDS; i++) h = sha_(h + salt); return h; }
function salt_() { return Utilities.getUuid().replace(/-/g, ''); }
function strong_(pw) { return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw); }
function publicUser_(u) { return { id: u.id, photo: u.photo, name: u.name, username: u.username, appRole: u.appRole, workspaces: u.workspaces, designation: u.designation, email: u.email, extraAccess: extras_(u), mustChange: u.mustChange === 'Yes', mfa: !!u.totpSecret }; }
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
  // 5 Nov: a trusted device signs in without the code until its trust runs out (Settings: trustDays, 3 by default)
  var trusted = false;
  if (req.trustToken && enrolled) {
    var td = (u.devices || []).filter(function (d) { return d.id === String(req.deviceId || '') && d.approved; })[0];
    if (td && td.trustHash && td.trustHash === sha_(String(req.trustToken)) && new Date(td.trustUntil) > new Date()) trusted = true;
    else if (!req.code) throw new Error('This device is no longer trusted. Enter the 6-digit code from your authenticator app.');
  }
  // 7 Nov: no phone to hand: a 6-digit code e-mailed to the address on the user's record (Settings: allowEmailCode)
  var byEmail = false;
  if (!trusted && req.emailCode) {
    var cc = CacheService.getScriptCache(), h = cc.get('ec:' + u.id);
    if (!h || h !== sha_(String(req.emailCode).replace(/\D/g, ''))) fail('That e-mail code is not right or has expired. Ask for a new one.');
    cc.remove('ec:' + u.id); byEmail = true;
  }
  if (trusted || byEmail) { /* code not needed */ }
  else if (mode === 'authenticator' && enrolled) {
    var st = totpCheck_(u.totpSecret, req.code, u.totpLast);
    if (st < 0) fail('That code is not right. Open your authenticator app and type the 6 digits shown for Accord.');
    u.totpLast = st;
  } else {
    // Not linked yet (or password mode): the temporary or own password opens the account once, to link the app.
    if (!u.pwHash) throw new Error('No temporary password yet. Ask an admin to set one in Users and access.');
    if (hash_(u.pwSalt, String(req.password || '')) !== u.pwHash) fail(enrolled || mode === 'password' ? 'Unknown username or password' : 'Unknown username or temporary password');
  }
  checkDevice_(u, req);
  var trust = null, days = Number((read_('settings')[0] || {}).trustDays); if (isNaN(days)) days = 3;
  if (req.trust && days > 0 && enrolled && !trusted && !byEmail) {
    var me = (u.devices || []).filter(function (d) { return d.id === String(req.deviceId || ''); })[0];
    if (me) { var tok = Utilities.getUuid() + Utilities.getUuid(); me.trustHash = sha_(tok); me.trustUntil = new Date(Date.now() + days * 864e5).toISOString(); trust = { token: tok, until: me.trustUntil }; }
  }
  u.failed = 0; u.lockedUntil = ''; upsert_('users', u);
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('t:' + token, u.id, 21600);
  PropertiesService.getScriptProperties().setProperty('t:' + token, u.id + '|' + Date.now());
  audit_(u, 'users', u.id, 'signed in' + (byEmail ? ' with an e-mailed code' : '') + ' on ' + devKind_(req) + ' · ' + (req.deviceLabel || ''));
  if (byEmail) notifyAdmins_('signin', u.name + ' signed in with an e-mailed code', 'On ' + devKind_(req) + ' (' + (req.deviceLabel || 'unnamed device') + '). If this was not them, reset their sign-in in Users and access.');
  var pu = publicUser_(u); pu.mustEnrol = mode === 'authenticator' && !enrolled && !byEmail;
  return { token: token, user: pu, serverTime: now_(), trust: trust, trusted: trusted };
}
// 7 Nov: send a sign-in code by e-mail. The same answer whether or not the username exists, so it reveals nothing.
function emailCode_(req) {
  var s = read_('settings')[0] || {};
  if (s.allowEmailCode === 'No') throw new Error('Sign-in by e-mail code is switched off. Ask an admin.');
  var uname = String(req.username || '').trim().toLowerCase();
  var u = read_('users').filter(function (x) { return String(x.username || '').toLowerCase() === uname; })[0];
  if (!u || u.active === 'No' || u.appRole === 'none' || !u.email) return { ok: true };
  if (s.emailCodeOnly === 'Yes' && (u.extraAccess || []).indexOf('emailSignIn') < 0 && u.appRole !== 'admin') return { ok: true };
  var c = CacheService.getScriptCache(), k = 'ecn:' + u.id, sent = Number(c.get(k) || 0);
  if (sent >= 3) throw new Error('Too many codes asked for. Try again in 15 minutes.');
  var code = String(Math.floor(100000 + Math.random() * 900000));
  c.put('ec:' + u.id, sha_(code), 600); c.put(k, String(sent + 1), 900);
  mail_({ to: u.email, subject: 'Accord sign-in code: ' + code, title: 'Your Accord sign-in code', text: 'Your code is ' + code + '.\n\nIt works once, for 10 minutes. If you did not ask for it, tell an admin straight away.', fromName: 'Accord', footer: 'Accord by OuTSDe' });
  audit_(u, 'users', u.id, 'e-mail sign-in code sent');
  return { ok: true };
}
// 7 Nov: when no admin can sign in (for example a lost phone and no other admin present), the owner of the Accord
// Database sheet resets a sign-in from the sheet: Extensions are not needed, use the menu Accord → Reset someone's sign-in.
// Only people who can edit this spreadsheet see the menu. It works like Users and access → Reset sign-in.
function onOpen() {
  try { SpreadsheetApp.getUi().createMenu('Accord').addItem("Reset someone's sign-in", 'ownerResetSignIn').addToUi(); } catch (e) { }
}
function ownerResetSignIn() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('Reset sign-in', 'Username of the person (for example shruthadev):', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var uname = String(a.getResponseText() || '').trim().toLowerCase();
  var u = read_('users').filter(function (x) { return String(x.username || '').toLowerCase() === uname; })[0];
  if (!u) { ui.alert('No user with the username "' + uname + '".'); return; }
  var b = ui.prompt('Temporary password for ' + u.name, 'At least 8 characters, with a letter and a number. They use it once to link the authenticator app again.', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  var pw = String(b.getResponseText() || '');
  if (pw.length < 8 || !/[a-z]/i.test(pw) || !/\d/.test(pw)) { ui.alert('Not reset: the password needs at least 8 characters, with a letter and a number.'); return; }
  u.pwSalt = salt_(); u.pwHash = hash_(u.pwSalt, pw); u.mustChange = 'Yes'; u.failed = 0; u.lockedUntil = '';
  u.totpSecret = ''; u.totpPending = ''; u.totpLast = ''; u.mfa = 'Not set';
  (u.devices || []).forEach(function (d) { delete d.trustHash; delete d.trustUntil; });
  upsert_('users', u);
  var who = ''; try { who = Session.getActiveUser().getEmail(); } catch (e) { }
  audit_({ name: 'Sheet owner' + (who ? ' (' + who + ')' : '') }, 'users', u.id, 'sign-in reset from the spreadsheet menu');
  ui.alert('Done. ' + u.name + ' can now sign in with username "' + u.username + '" and the temporary password ("First sign-in, or a new phone?"), then link the authenticator app again.');
}
/** Sign-out (button, closed tab, refresh): saves anything still waiting, then ends the session. Never fails loudly. */
function logout_(req) {
  var token = String(req.token || ''); if (!token) return { ok: true };
  try { var u = auth_(token, true); if (req.ops && req.ops.length) push_(u, req.ops); audit_(u, 'users', u.id, 'signed out'); } catch (e) { }
  CacheService.getScriptCache().remove('t:' + token);
  PropertiesService.getScriptProperties().deleteProperty('t:' + token);
  return { ok: true };
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
  if (req.resetAuthenticator !== false) { u.totpSecret = ''; u.totpPending = ''; u.totpLast = ''; u.mfa = 'Not set'; (u.devices || []).forEach(function (d) { delete d.trustHash; delete d.trustUntil; }); }
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
/* 12 Nov: duplicate accounts. Rows that share one member ID (saved twice) are folded into one: the row with the
   authenticator linked / most devices / latest update is kept, gaps filled from the others. Different IDs for the same
   person are merged from Users and access (keep one, remove the rest). */
function normName_(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function dedupeUsers_(admin) {
  if (admin.appRole !== 'admin') throw new Error('Only an admin can do this');
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    delete READ_CACHE_['users'];
    var all = read_('users'), by = {}, order = [];
    all.forEach(function (x) { var k = String(x.id); if (!by[k]) { by[k] = []; order.push(k); } by[k].push(x); });
    var score = function (x) { return (x.totpSecret ? 1000 : 0) + (x.devices || []).filter(function (d) { return d.approved; }).length * 100 + (x.pwHash ? 10 : 0); };
    var removed = 0, out = order.map(function (k) {
      var g = by[k]; if (g.length === 1) return g[0];
      g.sort(function (a, b) { return score(b) - score(a) || String(b.updatedAt || b.lastSeen || '').localeCompare(String(a.updatedAt || a.lastSeen || '')); });
      var keep = g[0]; g.slice(1).forEach(function (x) { Object.keys(x).forEach(function (f) { if ((keep[f] === undefined || keep[f] === '' || keep[f] === null) && x[f] !== '' && x[f] !== undefined) keep[f] = x[f]; }); removed++; });
      return keep;
    });
    if (removed) { writeAll_('users', out); audit_(admin, 'users', '-', 'folded ' + removed + ' repeated row(s)'); }
    return { ok: true, removed: removed };
  } finally { lock.releaseLock(); }
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
/* 12 Nov (b): the browser sends the tokens of what it already has (`have`); collections whose token matches are left out
   of the answer. A collection's token is its tab's version plus the versions of the tabs that decide what this person
   may see of it (users, settings, clients, leads, payments, demand calls, HR profiles and HR settings), the person and
   the date (payment states change with the date). Consultants and bank contacts always get everything. */
var DEPS_ = ['users','settings','clients','leads','payments','demandCalls','hrConfig','hrProfiles'];
var PULL_TOK_ = null;
function delta_(res, have) {
  if (!res || !res.db || !PULL_TOK_) return res;
  var tok = PULL_TOK_; res.tok = tok;
  if (have && typeof have === 'object') Object.keys(res.db).forEach(function (c) { if (tok[c] && have[c] === tok[c]) delete res.db[c]; });
  return res;
}
function pull_(u) {
  var db = {};
  var V = vers_(COLLECTIONS);
  preload_(COLLECTIONS.map(function (c) { return c === 'audit' ? 'audit@1000' : c; }).filter(function (k) { return k !== 'audit@1000' || u.appRole === 'admin'; }));
  if (u.appRole !== 'consultant' && u.appRole !== 'bank') {
    var deps = seesAll_(u) && u.appRole !== 'viewer' ? ['users','hrConfig','hrProfiles'] : DEPS_;   // full views depend only on people and HR settings
    var dep = sha_(deps.map(function (c) { return V[c]; }).join('.') + '|' + u.id + '|' + u.appRole + '|' + JSON.stringify(extras_(u)) + '|' + today_() + '|' + VERSION).slice(0, 10);
    PULL_TOK_ = {}; COLLECTIONS.forEach(function (c) { PULL_TOK_[c] = V[c] + '.' + dep; });
  }
  // 12 Nov: the audit log is only shown to admins, and only its newest 1,000 rows
  COLLECTIONS.forEach(function (c) { db[c] = c === 'audit' ? (u.appRole === 'admin' ? read_('audit', 1000) : []) : read_(c); });
  db.users = db.users.map(function (x) { var y = strip_(x, ['pwSalt','pwHash','failed','lockedUntil','totpSecret','totpPending','totpLast']); y.hasPassword = !!x.pwHash; y.mfa = x.totpSecret ? 'Set' : 'Not set'; if (u.appRole !== 'admin') { delete y.devices; } return y; });
  hrScope_(db, u);   // 12 Nov: Accord People, for every role
  if (u.appRole === 'consultant') return { db: consultantView_(db, u), serverTime: now_(), user: publicUser_(u), version: VERSION };
  if (u.appRole === 'bank') return { db: bankView_(db, u), serverTime: now_(), user: publicUser_(u), version: VERSION };
  if (seesAll_(u) && u.appRole !== 'viewer') return { db: db, serverTime: now_(), user: publicUser_(u), version: VERSION };

  var me = u.name, s = db.settings[0] || {};
  var mine_ = function (r) { return r.owner === me || (r.coOwners || []).indexOf(me) >= 0; };
  var mineC = {}; db.clients.forEach(function (c) { if (mine_(c)) mineC[c.clientId] = c; });
  var mineUnits = {}, mineB = {}; Object.keys(mineC).forEach(function (k) { mineUnits[String(mineC[k].unit)] = 1; mineB[mineC[k].bookingId] = 1; });
  var recv = {}, last = {};
  db.payments.forEach(function (p) { if (p.counted === 'Yes') recv[p.unit] = (recv[p.unit] || 0) + Number(p.amount || 0); if (!last[p.unit] || p.date > last[p.unit]) last[p.unit] = p.date; });
  var DIR = ['id','bookingId','clientId','unit','title','name','status','owner','category'];
  db.clients = db.clients.map(function (c) {
    var st = payState_(c, recv[c.unit] || 0, s, db.demandCalls), lp = last[c.unit] || '';
    if (mine_(c)) { var o = seesMoney_(u) ? JSON.parse(JSON.stringify(c)) : strip_(c, MONEY_FIELDS); o.payState = st; o.lastPaymentDate = lp; o.mine = true; return o; }
    var d = {}; DIR.forEach(function (k) { if (c[k] !== undefined) d[k] = c[k]; }); d.directoryOnly = true; return d;
  });
  db.payments = db.payments.filter(function (p) { return mineUnits[String(p.unit)]; }).map(function (p) { return seesMoney_(u) ? p : { id: p.id, unit: p.unit, date: p.date, receiptNo: p.receiptNo, towards: p.towards, counted: p.counted }; });
  db.demandLetters = (db.demandLetters || []).filter(function (x) { return mineUnits[String(x.unit)]; }).map(function (x) { return seesMoney_(u) ? x : { id: x.id, unit: x.unit, callId: x.callId, date: x.date, dueDate: x.dueDate, status: x.status }; });
  db.paymentEdits = seesMoney_(u) ? (db.paymentEdits || []).filter(function (x) { return mineUnits[String(x.unit)]; }) : [];
  var mineL = {}; db.leads = db.leads.filter(function (l) { if (mine_(l)) { mineL[l.id] = 1; return true; } return false; });
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
  return { db: db, serverTime: now_(), user: publicUser_(u), version: VERSION };
}


/* ───────────────────────── 12 Nov: Accord People ─────────────────────────
   Who sees what (the same rules as scopeHr in perms.js):
   - everyone: holidays, HR settings, their own profile, leave, goal sheets, assets, acknowledgements, requests and pay;
   - a manager: the leave and goal sheets of everyone below them in "Reports to", and their profiles without personal fields;
   - HR (role hr) and admins: everything, except pay at or above the grade line in HR settings (admins only) and POSH complaints;
   - POSH complaints: only the person who raised one and the Internal Committee named in HR settings, whatever their role;
   - knowledge-base documents: by lowest grade, positions and teams; drafts only to their owner; HR and admins see all.  */
var PERSONAL_ = ['personalPhone','personalEmail','address','emergencyName','emergencyPhone','emergencyRelation','bloodGroup','dob','bankName','bankAccount','ifsc','pan','aadhaar4','uan','esic','opening'];
var SELF_ = ['personalPhone','personalEmail','address','emergencyName','emergencyPhone','emergencyRelation','bloodGroup','dob'];
var POSH_ = 'POSH complaint (confidential)';
function gRank_(g) { var m = String(g || '').match(/(\d+)/); return m ? Number(m[1]) : 0; }
function isHr_(u) { return u.appRole === 'admin' || u.appRole === 'hr'; }
function hrCfg_() { return read_('hrConfig')[0] || {}; }
function teamOf_(users, name) { var out = {}, fr = [name]; for (var i = 0; i < 8 && fr.length; i++) { var nx = []; users.forEach(function (x) { if (fr.indexOf(x.reportsTo) >= 0 && !out[x.name] && x.name !== name) { out[x.name] = 1; nx.push(x.name); } }); fr = nx; } return out; }
function profOf_(userId) { return read_('hrProfiles').filter(function (p) { return p.userId === userId; })[0] || {}; }
function kbVisible_(d, u, prof) {
  if (isHr_(u) || extras_(u).indexOf('kbEdit') >= 0) return true;
  if (d.status === 'Retired') return false;
  if (d.status === 'Draft') return d.owner === u.name;
  var a = d.audience || {}, grade = prof.grade || 'G1';
  if (gRank_(grade) < gRank_(a.minGrade || 'G1')) return false;
  if ((a.roles || []).length && a.roles.indexOf(u.appRole) < 0) return false;
  if ((a.positions || []).length && prof.position && a.positions.indexOf(prof.position) < 0) return false;   // no profile yet: grade G1, any position
  if ((a.teams || []).length && a.teams.indexOf(prof.department || u.team) < 0) return false;
  return true;
}
function hrScope_(db, u) {
  HR_COLLS.forEach(function (c) { db[c] = db[c] || []; });
  if (u.appRole === 'consultant' || u.appRole === 'bank') { HR_COLLS.forEach(function (c) { if (c !== 'holidays') db[c] = []; }); return; }
  var me = u.name, cfg = db.hrConfig[0] || {}, ic = cfg.icMembers || [], hr = isHr_(u);
  var profOf = {}; db.hrProfiles.forEach(function (p) { profOf[p.userId] = p; });
  var nameOf = {}; db.users.forEach(function (x) { nameOf[x.id] = x.name; });
  var mine = profOf[u.id] || {}; if (u.appRole === 'admin') mine = Object.assign({}, mine, { grade: 'G6' });
  db.hrTickets = db.hrTickets.filter(function (t) { return t.category === POSH_ ? (t.by === me || ic.indexOf(me) >= 0) : (hr || t.by === me); });
  db.kbDocs = db.kbDocs.filter(function (d) { return kbVisible_(d, u, mine); });
  if (hr) {
    var line = gRank_(cfg.compBelow || 'G5'), canPay = u.appRole === 'admin' || extras_(u).indexOf('hrComp') >= 0 || u.appRole === 'hr';
    db.hrComp = db.hrComp.filter(function (c) { return u.appRole === 'admin' || c.userId === u.id || (canPay && gRank_((profOf[c.userId] || {}).grade) < line); });
    return;
  }
  var team = teamOf_(db.users, me);
  var DIR = ['id','userId','name','position','department','doj','status'];
  db.hrProfiles = db.hrProfiles.map(function (p) {
    if (p.userId === u.id) return p;
    if (team[nameOf[p.userId]]) return strip_(p, PERSONAL_);
    var o = {}; DIR.forEach(function (k) { if (p[k] !== undefined) o[k] = p[k]; }); return o;
  });
  db.leaves = db.leaves.filter(function (l) { return l.userId === u.id || team[l.name]; });
  db.kras = db.kras.filter(function (k) { return k.userId === u.id || team[k.name]; });
  db.assets = db.assets.filter(function (a) { return a.issuedToId === u.id; });
  db.kbAcks = db.kbAcks.filter(function (a) { return a.userId === u.id; });
  db.hrComp = db.hrComp.filter(function (c) { return c.userId === u.id; });
}
// Returns a refusal message, or '' to allow. May rewrite op.rec to keep fields the person may not change.
function hrCheck_(u, c, op) {
  if (u.appRole === 'consultant' || u.appRole === 'bank') return c + ' (no HR access)';
  var rec = op.rec || {}, hr = isHr_(u), me = u.name, cfg = hrCfg_();
  if (op.op === 'delete') return '';
  if (c === 'hrComp' && hr && u.appRole !== 'admin') {
    if (gRank_(profOf_(rec.userId).grade) >= gRank_(cfg.compBelow || 'G5')) return 'pay (at or above ' + (cfg.compBelow || 'G5') + ': admins only)';
    return '';
  }
  if (c === 'hrTickets') {
    var t0 = find_('hrTickets', rec.id), ic = (cfg.icMembers || []).indexOf(me) >= 0, owner = t0 ? t0.by : me;
    if (!t0) { rec.by = me; rec.userId = u.id; return ''; }
    if (t0.category === POSH_) return (owner === me || ic) ? '' : 'request (confidential)';
    return (owner === me || hr) ? '' : 'request (not yours)';
  }
  if (hr) return '';
  var users = read_('users'), team = teamOf_(users, me);
  if (c === 'kbAcks') return rec.userId === u.id ? '' : 'acknowledgement (only your own)';
  if (c === 'hrProfiles') {
    if (rec.userId !== u.id) return 'profile (only your own)';
    var cur = find_('hrProfiles', rec.id) || { id: rec.id, userId: u.id, name: me };
    var keep = JSON.parse(JSON.stringify(cur)); SELF_.forEach(function (k) { if (rec[k] !== undefined) keep[k] = rec[k]; });
    op.rec = keep; return '';
  }
  if (c === 'leaves') {
    var before = find_('leaves', rec.id), target = (before || rec).name;
    if ((before || rec).userId === u.id) {
      if (!before) { if (rec.status !== 'Applied') return 'leave (new leave starts as Applied)'; rec.name = me; return ''; }
      if (rec.status !== before.status && rec.status !== 'Cancelled') return 'leave (you cannot approve your own)';
      return '';
    }
    if (!team[target]) return 'leave (not in your team)';
    if (!before) return '';   // a manager applying on behalf of a reportee
    var keepL = JSON.parse(JSON.stringify(before)); ['status','decidedBy','decidedAt','decisionNote'].forEach(function (k) { if (rec[k] !== undefined) keepL[k] = rec[k]; });
    op.rec = keepL; return '';
  }
  if (c === 'kras') {
    var b = find_('kras', rec.id), who = (b || rec).name;
    if ((b || rec).userId === u.id) {
      if (rec.status === 'Closed' || (b && b.status !== 'Draft' && rec.status === 'Agreed' && b.status !== 'Agreed')) return 'goal sheet (your manager or HR moves it on)';
      if (b) {   // keep the manager's ratings and comment; targets only change in Draft
        var items0 = {}; (b.items || []).forEach(function (x) { items0[x.id] = x; });
        rec.items = (rec.items || []).map(function (x) { var o = items0[x.id]; if (!o) return b.status === 'Draft' ? x : null; var y = JSON.parse(JSON.stringify(x)); y.mgr = o.mgr; if (b.status !== 'Draft') { y.kra = o.kra; y.kpi = o.kpi; y.weight = o.weight; y.target = o.target; } return y; }).filter(function (x) { return x; });
        rec.mgrComment = b.mgrComment;
        if (b.status === 'Draft' && rec.status === 'Agreed') return 'goal sheet (your manager agrees the targets)';
      }
      return '';
    }
    if (!team[who]) return 'goal sheet (not in your team)';
    if (rec.status === 'Closed') return 'goal sheet (HR closes it)';
    return '';
  }
  return c + ' (HR only)';
}
// Notifications for HR events (the site sends these itself only when there is no backend)
function hrNotify_(u, c, rec, op) {
  var cfg = hrCfg_(), hrName = cfg.hrName || '';
  if (c === 'leaves') {
    if (op.isNew && rec.status === 'Applied') {
      var appr = rec.approver || hrName; if (appr && appr !== u.name) notify_(appr, 'leave', 'Leave request from ' + rec.name, rec.type + ', ' + rec.days + ' day(s) from ' + rec.from, '#/hr/leave?tab=approve', '', u.name);
      if (Number(rec.days) > Number(cfg.longLeaveDays || 5) && hrName && hrName !== appr) notify_(hrName, 'leave', 'Long leave: ' + rec.name, rec.days + ' days from ' + rec.from, '#/hr/leave?tab=all', '', u.name);
    } else if (['Approved','Rejected','Cancelled'].indexOf(rec.status) >= 0 && rec.name !== u.name) notify_(rec.name, 'leave', 'Leave ' + String(rec.status).toLowerCase(), rec.type + ' from ' + rec.from + (rec.decisionNote ? ': ' + rec.decisionNote : ''), '#/hr/leave', '', u.name);
  }
  if (c === 'kras' && op.action && /goal sheet (agreed|self review|manager review|closed|draft)/i.test(op.action)) {
    var to = rec.name === u.name ? (rec.manager || hrName) : rec.name; if (to && to !== u.name) notify_(to, 'kra', 'Goal sheet: ' + rec.name, rec.cycle + ' is now ' + rec.status, '#/hr/kra/' + rec.id, '', u.name);
  }
  if (c === 'hrTickets' && op.isNew) {
    var list = rec.category === POSH_ ? (cfg.icMembers || []) : [hrName];
    list.forEach(function (n) { if (n && n !== u.name) notify_(n, 'hr', rec.category === POSH_ ? 'Confidential complaint received' : 'HR request from ' + u.name, rec.category === POSH_ ? 'Open Accord People > HR requests' : rec.subject, '#/hr/requests', '', u.name); });
  }
}

/* 5 Nov: consultants see the business, never the people (they also consult for other developers): no phone, e-mail,
   address, PAN, notes, files, messages or conversation text. Same rules as redactForConsultant() in perms.js. */
var CONTACT_FIELDS = ['phone','phone2','whatsapp','email','address','pan','coPan','aadhaar4','dob','coPhone','coEmail','employer','income','familyProfile','remarks','notes','referredBy','partnerPhone'];
function consultantView_(db, u) {
  var cut = function (o) { return strip_(o, CONTACT_FIELDS); };
  db.clients = db.clients.map(cut); db.leads = db.leads.map(cut); db.viewings = (db.viewings || []).map(cut); db.partners = (db.partners || []).map(cut);
  db.users = db.users.map(function (x) { return strip_(x, ['phone','email','devices']); });
  db.interactions = db.interactions.map(function (i) { return strip_(i, ['summary','nextAction']); });
  db.payments = db.payments.map(function (p) { return strip_(p, ['instrument','bank','proofUrl','thirdParty']); });
  db.paymentEdits = [];
  db.documents = db.documents.map(function (d) { return { id: d.id, bookingId: d.bookingId, items: d.items }; });
  db.timeEvents = db.timeEvents.map(function (t) { return strip_(t, ['lat','lng','device']); });
  ['costSheets','files','messages','leadInbox','clientForms','audit'].forEach(function (k) { db[k] = []; });
  db.notifications = db.notifications.filter(function (n) { return n.to === u.name; });
  db.tasks = db.tasks.filter(function (t) { return t.owner === u.name || t.by === u.name; });
  return db;
}
/* 5 Nov: a bank or DSA contact (Smitha, SBI) sees only the clients funding with a bank loan, their payments and demand letters. */
function isLoan_(c) { return /loan/i.test(String(c && c.funding || '')); }
function bankView_(db, u) {
  var loan = db.clients.filter(isLoan_), units = {}; loan.forEach(function (c) { units[String(c.unit)] = 1; });
  var KEEP = ['id','bookingId','clientId','unit','title','name','coapp','status','funding','loanBank','loanAmount','loanStatus','tc','adjustment','plan','agreement','bookingDate','phone','email','owner','residency'];
  db.clients = loan.map(function (c) { var o = {}; KEEP.forEach(function (k) { if (c[k] !== undefined) o[k] = c[k]; }); return o; });
  db.payments = db.payments.filter(function (p) { return units[String(p.unit)]; }).map(function (p) { return { id: p.id, unit: p.unit, date: p.date, receiptNo: p.receiptNo, amount: p.amount, tds: p.tds, towards: p.towards, mode: p.mode, counted: p.counted, demandLetter: p.demandLetter, ledgerOnly: p.ledgerOnly }; });
  db.demandLetters = (db.demandLetters || []).filter(function (x) { return units[String(x.unit)]; });
  db.paymentEdits = [];
  ['leads','interactions','documents','issues','costSheets','messages','files','leadInbox','clientForms','viewings','accordSessions','audit','attendance','timeEvents','partners'].forEach(function (k) { db[k] = []; });
  db.users = db.users.map(function (x) { return { id: x.id, name: x.name, designation: x.designation, appRole: x.appRole, team: x.team, active: x.active }; });
  db.notifications = db.notifications.filter(function (n) { return n.to === u.name; });
  db.tasks = db.tasks.filter(function (t) { return t.owner === u.name; });
  return db;
}

/* ───────────────────────── writes ───────────────────────── */
function can_(u, coll) { var w = WRITE[coll] || []; return u.appRole === 'admin' || w.indexOf('*') >= 0 || w.indexOf(u.appRole) >= 0 || extras_(u).some(function (k) { return GRANTS[k].indexOf(coll) >= 0; }); }
function push_(u, ops) {
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  AUDIT_BUF_ = [];
  try {
    var done = 0, refused = [], renamed = [], remap = {};
    ops.forEach(function (op) { try { pushOne_(op); } catch (err) {
      // 12 Nov (c): one change that cannot be saved no longer fails the whole push (the app used to resend it forever)
      var what = op.coll + ' ' + ((op.rec && (op.rec.id || op.rec.bookingId)) || op.id || '');
      Logger.log('push failed: ' + what + ' · ' + err + ' · by ' + u.name);
      refused.push(what + ' (not saved: ' + String(err && err.message || err).slice(0, 120) + ')');
    } });
    function pushOne_(op) {
      var c = op.coll;
      if (COLLECTIONS.indexOf(c) < 0 || !can_(u, c)) { refused.push(c); return; }
      if (HR_COLLS.indexOf(c) >= 0) { var hrNo = hrCheck_(u, c, op); if (hrNo) { refused.push(hrNo); return; } }
      if (op.op === 'delete' && remap[op.id]) op.id = remap[op.id];
      if (op.rec) { remapRefs_(op.rec, remap); newId_(u, c, op, remap, renamed); }
      if (op.op === 'delete') { if (u.appRole !== 'admin' && ['tasks','notifications'].indexOf(c) < 0 && !(u.appRole === 'hr' && ['holidays','assets','kbDocs','kras'].indexOf(c) >= 0)) { refused.push(c + ' delete'); return; } delete_(c, op.id); audit_(u, c, op.id, 'deleted'); done++; return; }
      var rec = op.rec || {};
      rec.updatedAt = now_(); rec.updatedBy = u.name;
      var editAll = extras_(u).indexOf('seeAll') >= 0;   // 4 Nov: ticked "See and edit every client and lead"
      if (u.appRole === 'sales') {
        if (c === 'clients') { var cur = find_('clients', rec.bookingId || rec.id); if (!cur || (!editAll && cur.owner !== u.name && (cur.coOwners || []).indexOf(u.name) < 0)) { refused.push('clients (not yours)'); return; } var xa = extras_(u), safe = strip_(rec, (xa.indexOf('money') >= 0 ? [] : MONEY_FIELDS).concat(xa.indexOf('assign') >= 0 ? [] : ['owner','coOwners']).concat(editAll ? [] : ['status']).concat(['payState','lastPaymentDate','mine','directoryOnly'])); /* 4 Nov: ticked powers lift these limits */ Object.keys(safe).forEach(function (k) { cur[k] = safe[k]; }); rec = cur; }
        if (c === 'leads') { var cl = find_('leads', rec.id); if (cl && cl.owner && !editAll && cl.owner !== u.name && (cl.coOwners || []).indexOf(u.name) < 0) { refused.push('leads (not yours)'); return; } if (!cl) rec.owner = rec.owner || u.name; }
        if (c === 'interactions') rec.by = rec.by || u.name;
        if (c === 'tasks' && rec.owner !== u.name) { refused.push('tasks (sales can only add their own)'); return; }
      }
      if (c === 'users' && !find_('users', rec.id)) {   // 12 Nov: no second account for the same person
        var twin = read_('users').filter(function (x) { return String(x.username || '').toLowerCase() === String(rec.username || '').toLowerCase() || normName_(x.name) === normName_(rec.name); })[0];
        if (twin) { refused.push('users (' + rec.name + ' already has an account: @' + twin.username + ')'); return; }
      }
      if (c === 'users') { var cu = find_('users', rec.id); ['pwSalt','pwHash','failed','lockedUntil','totpSecret','totpPending','totpLast','devices'].forEach(function (k) { rec[k] = cu ? cu[k] : (k === 'devices' ? [] : ''); }); rec.mfa = cu && cu.totpSecret ? 'Set' : 'Not set'; delete rec.hasPassword; }
      if (c === 'notifications' && rec.to !== u.name && !op.create) { var cn = find_('notifications', rec.id); if (cn && cn.to !== u.name && u.appRole !== 'admin') { refused.push('notifications'); return; } }
      var before = (c === 'leads' || c === 'clients' || c === 'settings' || c === 'payments' || c === 'demandLetters') ? find_(c, rec.bookingId || rec.id) : null;
      if (c === 'settings') settingsLogo_(rec, before);   // 12 Nov (d)
      if (c === 'clients' && !before && rec.unit) {   // 2 Nov: no double booking, checked on the server too
        var clash = read_('clients').filter(function (x) { return String(x.unit) === String(rec.unit) && ['Cancelled', 'Transferred'].indexOf(x.status) < 0; })[0];
        if (clash) { refused.push('booking (residence ' + rec.unit + ' is already booked by ' + clash.name + ')'); return; }
      }
      // 7 Nov: editing a payment entry needs a reason; the receipt number and entry number never change
      if (c === 'payments' && before && paymentChanges_(before, rec).length) {
        if (!String(rec.editReason || '').trim()) { refused.push('payments (a reason is needed to edit a payment entry)'); return; }
        rec.id = before.id; rec.receiptNo = before.receiptNo; rec.ledgerOnly = before.ledgerOnly;
        rec.rev = Number(before.rev || 0) + 1; rec.lastEditedBy = u.name; rec.lastEditedAt = now_();
      }
      upsert_(c, rec);
      if (rec._test !== 'Yes') afterSave_(u, c, rec, before);
      var isTest = rec._test === 'Yes';
      if (c === 'interactions' && !isTest) notifyFollowUp_(u, rec);
      if (!isTest && HR_COLLS.indexOf(c) >= 0) hrNotify_(u, c, rec, op);
      if (c === 'tasks' && !isTest && rec.owner && rec.owner !== u.name && op.isNew) notify_(rec.owner, 'task', 'New task from ' + u.name, rec.title, '#/people/tasks', rec.due ? rec.due + 'T10:00' : '', u.name);
      if (c !== 'notifications') audit_(u, c, rec.id || rec.bookingId, (op.action || 'saved') + (isTest ? ' (demo mode)' : ''));
      done++;
    }
    return { ok: true, done: done, refused: refused, renamed: renamed, serverTime: now_() };
  } finally { try { flushAudit_(); } catch (e) { Logger.log('audit write failed: ' + e); } lock.releaseLock(); }
}
/* 2 Nov: who needs to know about a change. New people responsible for a lead or client, everyone when the rate card or
   settings change (with what changed), and the advisor's manager plus admins for a client complaint. */
// 7 Nov: payment edits. Fields compared, their labels, and the ones that make an edit HIGH.
var PAY_EDIT_FIELDS = { date: 'Date', amount: 'Amount', tds: 'TDS', unit: 'Residence', payer: 'Received from', towards: 'Towards', mode: 'Mode', instrument: 'Reference', instrumentDate: 'Instrument date', bank: 'Bank', counted: 'Counted in totals', demandLetter: 'Demand letter', thirdParty: 'Paid by', realisation: 'Realisation', note: 'Note' };
var PAY_HIGH = ['amount', 'tds', 'unit', 'counted', 'demandLetter'];
/* 12 Nov: numbered IDs (I-0266, YSC-L-0212, Q-0080, L-0160, CS-0002) are made in the browser from the records that
   person can see. Advisors see only their own interactions and leads, so two of them could pick the same next number,
   and the later save replaced the earlier one (42 interactions were lost this way, 3 to 11 Nov). A new record whose
   number is already taken by a different record now gets the next free number here, and the browser is told. */
var RENUMBER_ = { interactions: 1, leads: 1, issues: 1, payments: 1, costSheets: 1, tasks: 1, viewings: 1, quotes: 1, demandLetters: 1, messages: 1 };
function pad_(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function remapRefs_(rec, remap) {
  if (!Object.keys(remap).length) return;
  Object.keys(rec).forEach(function (k) {
    var v = rec[k];
    if (typeof v === 'string') { if (remap[v]) rec[k] = remap[v]; else if (v.indexOf('i:') === 0 && remap[v.slice(2)]) rec[k] = 'i:' + remap[v.slice(2)]; }
  });
}
function newId_(u, c, op, remap, renamed) {
  var rec = op.rec; if (!RENUMBER_[c] || !op.isNew || !rec.id) return;
  var list = read_(c), cur = list.filter(function (x) { return String(x.id) === String(rec.id); })[0];
  if (!cur) return;
  var same = cur._cid ? cur._cid === rec._cid : (rec._cid ? false : (cur.updatedBy === u.name));   // the same record sent twice is not a clash
  if (same) return;
  var m = String(rec.id).match(/^(.*?)(\d+)$/); if (!m) return;
  var max = 0; list.forEach(function (x) { var k = String(x.id); if (k.indexOf(m[1]) === 0) { var n = Number(k.slice(m[1].length)); if (n > max) max = n; } });
  var nid = m[1] + pad_(max + 1, m[2].length);
  remap[rec.id] = nid; renamed.push({ coll: c, from: rec.id, to: nid }); rec.id = nid;
}
function paymentChanges_(before, rec) {
  return Object.keys(PAY_EDIT_FIELDS).filter(function (k) { return String(before[k] == null ? '' : before[k]) !== String(rec[k] == null ? '' : rec[k]); })
    .map(function (k) { return { field: k, label: PAY_EDIT_FIELDS[k], from: before[k] == null ? '' : before[k], to: rec[k] == null ? '' : rec[k] }; });
}
function payEditLogged_(u, rec, before, reason, high) {
  var ch = paymentChanges_(before, rec); if (!ch.length) return;
  var isHigh = high === undefined ? ch.some(function (x) { return PAY_HIGH.indexOf(x.field) >= 0; }) : high;
  var cli = read_('clients').filter(function (x) { return String(x.unit) === String(rec.unit); })[0] || {};
  upsert_('paymentEdits', { id: 'PE-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: now_(), by: u.name, paymentId: rec.id, receiptNo: rec.receiptNo || '', unit: rec.unit, client: cli.name || '', reason: reason || '', changes: JSON.stringify(ch), high: isHigh ? 'Yes' : 'No' });
  if (high === false) return;   // moves between residences are recorded, not alerted
  var money = function (k, v) { return (k === 'amount' || k === 'tds') && v !== '' ? '₹' + Math.round(Number(v || 0)).toLocaleString('en-IN') : (v === '' ? '(blank)' : String(v)); };
  var txt = ch.map(function (x) { return x.label + ': ' + money(x.field, x.from) + ' → ' + money(x.field, x.to); }).join(' · ');
  var title = (isHigh ? 'HIGH · ' : '') + 'Payment edited · ' + (rec.receiptNo || rec.id) + ' · residence ' + rec.unit;
  var body = u.name + ' changed ' + txt + '. Reason: ' + (reason || '');
  var users = read_('users'), to = {};
  users.filter(function (x) { return x.appRole === 'admin' && x.active !== 'No'; }).forEach(function (x) { to[x.name] = x; });
  if (u.reportsTo) users.filter(function (x) { return x.name === u.reportsTo && x.active !== 'No'; }).forEach(function (x) { to[x.name] = x; });
  delete to[u.name];
  Object.keys(to).forEach(function (nm) {
    notify_(nm, 'paymentEdit', title, body, '#/crm/payments/receipt/' + rec.id, now_(), u.name, '#/crm/payments/receipt/' + rec.id);
    if (to[nm].email) { try { mail_({ to: to[nm].email, subject: 'Accord · ' + title, title: title, text: body + '\n\nClient: ' + (cli.name || '') + '\nOpen Accord → Payments → Change log for the full history.', fromName: 'Accord', footer: 'Accord by OuTSDe · payment change alert' }); } catch (e) { } }
  });
}
function afterSave_(u, c, rec, before) {
  if (c === 'payments' && before && rec.editReason !== undefined && Number(rec.rev || 0) > Number(before.rev || 0)) payEditLogged_(u, rec, before, rec.editReason, rec.editKind === 'transfer' ? false : undefined);
  if (c === 'leads' || c === 'clients') {
    var was = before ? [before.owner].concat(before.coOwners || []) : [], now = [rec.owner].concat(rec.coOwners || []);
    now.filter(function (x) { return x && x !== u.name && was.indexOf(x) < 0; }).forEach(function (x) {
      notify_(x, 'assigned', (c === 'leads' ? 'Lead' : 'Client') + ' assigned to you: ' + (rec.name || rec.id), 'By ' + u.name + (c === 'clients' ? ' · residence ' + rec.unit : ''), c === 'leads' ? '#/crm/leads/' + rec.id : '#/crm/clients/' + (rec.bookingId || rec.id), now_(), u.name);
    });
  }
  if (c === 'settings' && before) {
    var diff = changes_(before, rec);
    if (diff.length) read_('users').filter(function (x) { return x.active !== 'No' && x.appRole !== 'none' && x.name !== u.name; }).forEach(function (x) {
      notify_(x.name, 'settings', 'Settings changed by ' + u.name, diff.slice(0, 6).join(' · ') + (diff.length > 6 ? ' · and ' + (diff.length - 6) + ' more' : ''), '#/', now_(), u.name);
    });
  }
  if ((c === 'payments' || c === 'demandLetters') && !before && rec.unit) {   // 5 Nov: the bank contact hears about loan clients
    var cli = read_('clients').filter(function (x) { return String(x.unit) === String(rec.unit); })[0];
    if (isLoan_(cli)) read_('users').filter(function (x) { return x.appRole === 'bank' && x.active !== 'No'; }).forEach(function (x) {
      notify_(x.name, 'bank', (c === 'payments' ? 'Payment received' : 'Demand letter ' + rec.id) + ' · residence ' + rec.unit, (cli.name || '') + ' · ₹' + Math.round(Number(rec.amount || 0)).toLocaleString('en-IN') + (c === 'payments' ? ' · ' + (rec.towards || '') : ' due ' + (rec.dueDate || '')), c === 'payments' ? '#/crm/payments' : '#/crm/payments/demand/' + rec.id, now_(), u.name);
    });
  }
  if (c === 'issues' && rec.category === 'Client complaint' && !rec.notifiedAt) {
    var users = read_('users'), boss = {}; users.forEach(function (x) { boss[x.name] = x.reportsTo; });
    var cl = rec.unit ? read_('clients').filter(function (x) { return String(x.unit) === String(rec.unit); })[0] : null, adv = cl ? cl.owner : '';
    var to = {}; if (adv && boss[adv]) to[boss[adv]] = 1; users.filter(function (x) { return x.appRole === 'admin'; }).forEach(function (x) { to[x.name] = 1; });
    Object.keys(to).forEach(function (n) { notify_(n, 'complaint', 'Client complaint' + (rec.unit ? ' · residence ' + rec.unit : ''), (rec.description || '').slice(0, 160) + (adv ? ' · advisor ' + adv : ''), '#/crm/issues' + (rec.id ? '?id=' + encodeURIComponent(rec.id) : ''), now_(), u.name); });
    rec.notifiedAt = now_(); upsert_('issues', rec);
  }
}
var LABEL_ = { baseRate: 'base rate', floorRisePerFloor: 'floor rise', floorRiseStart: 'floor rise start', parkingRate: 'car park', parkingExtraRate: 'additional car park', mwssb: 'MWSSB/MESCOM', clubhouse: 'clubhouse', maintenance: 'maintenance', sinking: 'sinking fund', gst: 'GST', approvalAbove: 'approval limit', discountSteps: 'founding privilege steps', minBooking: 'minimum booking', validityDays: 'cost sheet validity', terraceRate: 'terrace rate' };
function changes_(a, b) {
  var out = [], ra = a.rateCard || {}, rb = b.rateCard || {};
  Object.keys(rb).forEach(function (k) { if (JSON.stringify(ra[k]) !== JSON.stringify(rb[k])) out.push((LABEL_[k] || k) + ': ' + (typeof ra[k] === 'object' ? JSON.stringify(ra[k]) : ra[k]) + ' → ' + (typeof rb[k] === 'object' ? JSON.stringify(rb[k]) : rb[k])); });
  ['plans', 'terms', 'receiptNotes', 'company'].forEach(function (k) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push({ plans: 'payment plans', terms: 'cost sheet terms', receiptNotes: 'receipt notes', company: 'company details' }[k] + ' updated'); });
  return out;
}

/* 2 Nov: the lead inbox. A bot, a WhatsApp tool, 99acres or a website form posts enquiries here with the inbound key
   (Admin > Settings > Lead inbox). They wait in Leads > Inbox until a person checks and accepts them. */
function kycSafe_(x) {
  var s = String(x || '').toUpperCase().replace(/\s/g, '');
  if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s)) return s;            // PAN
  var dg = s.replace(/\D/g, ''); if (dg.length >= 4) return 'XXXX XXXX ' + dg.slice(-4);   // Aadhaar or anything numeric: last 4 only
  return '';
}
function inboundLead_(req) {
  var s = read_('settings')[0] || {};
  if (!s.inboundKey || String(req.key || '') !== String(s.inboundKey)) throw new Error('Not allowed');
  var list = req.leads || [req.lead || req], done = [];
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    list.slice(0, 50).forEach(function (x) {
      var clean = function (v, n) { return String(v || '').slice(0, n || 200); };
      var rec = { id: 'IN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(), at: now_(), source: clean(x.source || req.source || 'Inbound', 60),
        name: clean(x.name), phone: clean(x.phone || x.mobile, 30), email: clean(x.email, 120), city: clean(x.city, 60), config: clean(x.config || x.interest, 60), message: clean(x.message || x.text, 1500), status: 'New' };
      if (!rec.phone && !rec.email && !rec.message) return;
      upsert_('leadInbox', rec); done.push(rec.id);
    });
  } finally { lock.releaseLock(); }
  if (done.length) read_('users').filter(function (x) { return ['admin', 'senior'].indexOf(x.appRole) >= 0 && x.active !== 'No'; }).forEach(function (x) { notify_(x.name, 'inbox', done.length + ' new enquir' + (done.length > 1 ? 'ies' : 'y') + ' in the lead inbox', 'Check and accept them in Leads › Inbox', '#/crm/leads?view=inbox', now_(), 'Lead inbox'); });
  return { ok: true, received: done.length, ids: done };
}
function notify_(to, kind, title, body, link, dueAt, by, target) {
  upsert_('notifications', { id: 'N-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), to: to, kind: kind, title: title, body: body, link: link, dueAt: dueAt || now_(), createdBy: by, createdAt: now_(), readAt: '', emailedAt: '', target: target || '' });
}
// 7 Nov: the exact page a lead or client notification should open (bell → that record, not the section)
function recordTarget_(recordId, focus) {
  var id = String(recordId || ''), q = focus ? '?focus=' + focus : '';
  if (!id) return '';
  if (/^YSC-L-/i.test(id)) return '#/crm/leads/' + id + q;
  var c = read_('clients').filter(function (x) { return x.clientId === id || x.bookingId === id || x.id === id; })[0];
  return c ? '#/crm/clients/' + (c.bookingId || c.id) + q : '';
}
// 4 Nov: follow-ups carry a time. Due moments are stored as real instants (UTC ISO), read as India time.
function dueIso_(date, time) { var t = /^\d{1,2}:\d{2}$/.test(String(time || '')) ? String(time) : '10:00'; if (t.length === 4) t = '0' + t; return new Date(date + 'T' + t + ':00+05:30').toISOString(); }
function notifyFollowUp_(u, i) {
  if (!i.nextDate || i.status !== 'Open') return;
  var owners = i.nextOwners && i.nextOwners.length ? i.nextOwners : [i.nextOwner || u.name];
  var existing = read_('notifications').filter(function (n) { return n.kind === 'followup' && n.link === 'i:' + i.id; }).map(function (n) { return n.to; });
  owners.forEach(function (o) { if (existing.indexOf(o) < 0) notify_(o, 'followup', 'Follow up: ' + (i.recordName || i.recordId), (i.nextAction || 'Follow up') + ' · logged by ' + u.name, 'i:' + i.id, dueIso_(i.nextDate, i.nextTime), u.name, recordTarget_(i.recordId, i.id)); });
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
  var cur = {}, byUn = {}, byNm = {}; read_('users').forEach(function (x) { cur[x.id] = x; if (x.username) byUn[String(x.username).toLowerCase()] = x; if (x.name) byNm[normName_(x.name)] = x; });
  // 12 Nov: someone already in the sheet under another ID keeps that ID (no duplicate account), and repeats are dropped
  var seenIds = {};
  db.users = (db.users || []).map(function (x) { var c = cur[x.id] || byUn[String(x.username || '').toLowerCase()] || byNm[normName_(x.name)]; if (c && c.id !== x.id) x.id = c.id; return x; })
    .filter(function (x) { if (seenIds[x.id]) return false; seenIds[x.id] = 1; return true; });
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
/* 4 Nov: look at an uploaded file inside Accord (staff do not need access to the OuTSDe Drive), and delete a wrong one.
   Who may look: anyone who sees all clients, the person who uploaded it, and the people responsible for that client or lead.
   Who may delete: the person who uploaded it, and admins. The Drive file goes to the Drive bin (recoverable for 30 days). */
/* 5 Nov: a person sets their own profile picture (admins: anyone's). A small JPEG, already shrunk in the browser. */
function setPhoto_(u, req) {
  var id = req.userId || u.id; if (id !== u.id && u.appRole !== 'admin') throw new Error('Only admins can change someone else\'s picture');
  var p = String(req.photo || ''); if (p && (!/^data:image\/(jpeg|png|webp);base64,/.test(p) || p.length > 45000)) throw new Error('Use a smaller photo');
  var x = find_('users', id); if (!x) throw new Error('Unknown user');
  x.photo = p; upsert_('users', x); return { ok: true };
}
function fileAllowed_(u, f) {
  if (seesAll_(u) && u.appRole !== 'viewer' || f.by === u.name || f.kind === 'project') return true;
  var mine = function (r) { return r && (r.owner === u.name || (r.coOwners || []).indexOf(u.name) >= 0); };
  var c = read_('clients').filter(function (x) { return x.bookingId === f.recordId || x.clientId === f.recordId; })[0];
  if (mine(c)) return true;
  return mine(read_('leads').filter(function (x) { return x.id === f.recordId; })[0]);
}
function fileGet_(u, req) {
  var f = find_('files', req.id); if (!f) throw new Error('File not found');
  if (!fileAllowed_(u, f)) throw new Error('Not allowed');
  var file = DriveApp.getFileById(f.driveId), blob = file.getBlob();
  if (blob.getBytes().length > 30 * 1024 * 1024) return { ok: true, tooBig: true, name: f.name, url: f.url };
  return { ok: true, name: f.name, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
function fileDelete_(u, req) {
  var f = find_('files', req.id); if (!f) throw new Error('File not found');
  if (u.appRole !== 'admin' && f.by !== u.name) throw new Error('Only the person who uploaded it, or an admin, can delete this file');
  try { DriveApp.getFileById(f.driveId).setTrashed(true); } catch (e) { /* already gone from Drive */ }
  delete_('files', f.id); audit_(u, 'files', f.id, 'deleted ' + f.name);
  var doc = null;
  if (f.kind === 'client' && f.doc) {   // the checklist line goes back to Pending when its last file is deleted
    doc = find_('documents', f.recordId);
    if (doc) {
      var left = read_('files').filter(function (x) { return x.recordId === f.recordId && x.doc === f.doc; }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
      doc.files = doc.files || {}; doc.items = doc.items || {};
      if (left.length) doc.files[f.doc] = left[0].url; else { delete doc.files[f.doc]; if (doc.items[f.doc] === 'Received') doc.items[f.doc] = 'Pending'; }
      doc.updatedAt = now_(); doc.updatedBy = u.name; upsert_('documents', doc);
    }
  }
  return { ok: true, deleted: f.id, document: doc };
}
function upload_(u, req) {
  if (!req.data) throw new Error('No file');
  var m = req.meta || {}, ext = EXT[req.mime] || (String(req.origName || '').match(/\.[a-z0-9]{2,5}$/i) || [''])[0];
  var base = clean_(req.name || 'file'), f = folder_(req.folder || 'Unsorted');
  // same name on the same day: add a counter rather than overwrite
  var name = base + ext, n = 1; while (f.getFilesByName(name).hasNext()) name = base + '_' + (++n) + ext;
  var file = f.createFile(Utilities.newBlob(Utilities.base64Decode(req.data), req.mime || 'application/octet-stream', name));
  file.setDescription('Uploaded by ' + u.name + ' from Accord on ' + now_() + (m.doc ? ' · ' + m.doc : ''));
  var rec = { id: 'F-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4), at: now_(), by: u.name, kind: m.kind || '', recordId: m.recordId || '', label: m.label || '',
    category: m.category || '', doc: m.doc || '', name: name, url: file.getUrl(), folder: req.folder || '', driveId: file.getId(), _test: m.test ? 'Yes' : '',
    // 2 Nov: what the card check read. Aadhaar is never kept in full, only the last 4 digits.
    kyc: String(m.kyc || '').slice(0, 80), kycNumber: kycSafe_(m.kycNumber), kycName: String(m.kycName || '').slice(0, 80), kycDob: String(m.kycDob || '').slice(0, 12) };
  upsert_('files', rec); audit_(u, 'files', rec.id, 'uploaded ' + name);
  var logoUrl = '';
  if (m.kind === 'brand') { var s = read_('settings')[0] || { id: 'main' }; logoUrl = publishLogo_(file, s); upsert_('settings', s); }
  return { ok: true, url: logoUrl || rec.url, logoUrl: logoUrl, id: rec.driveId, name: name, file: rec, folderUrl: f.getUrl() };
}

/* 12 Nov (d): the logo is a file in Accord_Data / Brand. Settings keep only a link to it (brand.logo), so the settings
   record stays small and every device loads the picture straight from Google. The file is shared as "anyone with the
   link can view" (it is the public brand mark). If the account does not allow link sharing, brand.logo is 'drive:<id>'
   and the site asks the backend for the picture once (action 'logo') and keeps it on the device. */
function publishLogo_(file, s) {
  var url = '';
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); url = 'https://lh3.googleusercontent.com/d/' + file.getId(); } catch (e) { Logger.log('logo link sharing not allowed: ' + e); }
  s.logoFileId = file.getId(); s.brand = s.brand || {}; s.brand.logo = url || 'drive:' + file.getId();
  return s.brand.logo;
}
function logoFromData_(s, dataUrl) {   // a logo sent as data:image/...;base64 becomes a Drive file
  var mm = String(dataUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i); if (!mm) return;
  var ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' }[mm[1].toLowerCase()] || '.png';
  var f = folder_('Brand'), name = 'Yamuna Sky City logo · ' + today_() + ext, n = 1;
  while (f.getFilesByName(name).hasNext()) name = 'Yamuna Sky City logo · ' + today_() + '_' + (++n) + ext;
  var file = f.createFile(Utilities.newBlob(Utilities.base64Decode(mm[2]), mm[1], name));
  file.setDescription('Logo from Accord settings, moved out of the sheet on ' + now_());
  publishLogo_(file, s);
}
function settingsLogo_(rec, before) {   // on every settings save: never keep the picture itself in the sheet
  rec.brand = rec.brand || {};
  if (/^data:image\//i.test(String(rec.brand.logo || ''))) logoFromData_(rec, rec.brand.logo);
  else if (!rec.logoFileId && before && before.logoFileId && rec.brand.logo) rec.logoFileId = before.logoFileId;
  if (!rec.brand.logo) delete rec.logoFileId;   // logo removed in settings: e-mails go back to the name
}
function logoData_() {
  var s = read_('settings')[0] || {}; if (!s.logoFileId) return { ok: true, data: '' };
  var blob = DriveApp.getFileById(s.logoFileId).getBlob();
  return { ok: true, id: s.logoFileId, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
/** 12 Nov (d): one-time. Moves a logo stored inside the settings record to Drive / Brand and keeps only its link. */
function moveLogoToDrive() {
  var s = read_('settings')[0]; if (!s) return 'no settings';
  var was = String((s.brand || {}).logo || '');
  if (!/^data:image\//i.test(was)) { Logger.log('logo is already a link: ' + was.slice(0, 80)); return 'nothing to move'; }
  logoFromData_(s, was); upsert_('settings', s);
  Logger.log('logo moved: ' + s.brand.logo + ' (' + was.length + ' characters out of the sheet)');
  return s.brand.logo;
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
    notify_(to, 'clientform', 'Client form received: ' + c.name, 'Residence ' + c.unit + ' · review and apply it from the booking form', 'b:' + c.bookingId, now_(), 'Client (public form)', '#/crm/booking/' + c.bookingId);
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
        notify_(to, 'escalation', 'Escalated: ' + (i.recordName || i.recordId), o + ' has not followed up for ' + late + ' working days (' + (i.nextAction || 'follow up') + ', due ' + i.nextDate + ')', 'i:' + i.id, now_(), 'Accord', recordTarget_(i.recordId, i.id));
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
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyMinutes(15).create();   // 4 Nov: follow-ups have a time now
  ScriptApp.newTrigger('morningDigest').timeBased().atHour(9).nearMinute(5).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('escalateOverdue').timeBased().atHour(8).nearMinute(30).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('nightlyBackup').timeBased().atHour(23).everyDays(1).inTimezone(TZ).create();
}
/** E-mails each follow-up and task notification once, when it falls due (checked every 15 minutes, 08:00 to 21:00). */
function sendDueReminders() {
  var h = Number(Utilities.formatDate(new Date(), TZ, 'H')); if (h < 8 || h > 21) return;
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
    var body = 'Good morning ' + u.name + ',\n\nFollow-ups due today or overdue: ' + mine.length + '\n\n' + mine.map(function (i) { return '· ' + i.recordId + ' · ' + (i.nextAction || i.purpose || 'follow up') + (i.nextTime && i.nextDate === d ? ' at ' + i.nextTime : '') + (i.nextDate < d ? ' (overdue since ' + i.nextDate + ')' : ''); }).join('\n') + '\n\nAccord by OuTSDe';
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
  try { archiveAudit(14); } catch (e) { Logger.log('Audit archive failed: ' + e); }
  try { tidyNotifications(30); } catch (e) { Logger.log('Notification tidy failed: ' + e); }
}
