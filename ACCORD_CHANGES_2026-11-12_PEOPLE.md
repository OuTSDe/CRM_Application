# Accord changes, 12 November: Accord People (HRMS) and the knowledge base

Both halves changed. **Redeploy `backend/Code.gs`** (Deploy › Manage deployments › edit › New version, same /exec URL), then commit and push so Pages rebuilds the site. The site now needs backend **3.8.0**; until Code.gs is redeployed, admins see the "backend is older" warning and HR records are refused by the server.

## Go-live, in order (about 20 minutes)
1. Redeploy Code.gs. The ten new tabs (hrConfig, hrProfiles, hrComp, leaves, holidays, kras, hrTickets, assets, kbDocs, kbAcks) are created on first use.
2. Admin › Users and access: add **Sujaya** with the access role **HR and admin** (workspace Accord People opens by default). Add **Kanchana** (Legal) if she is not yet a user. Set "Reports to" correctly for everyone: leave approval and KRA reviews follow it.
3. Sign in as Sujaya or an admin, open **Accord People › Overview (HR desk)** and press **Load starting content**. This adds the HR settings, the national holidays and the 33 knowledge-base documents.
4. Press **Make profiles from suggestions**, then open **People** and confirm each person's position, grade and date of joining. Until a person has a profile, they open only grade G1 documents.
5. HR settings: name the POSH Internal Committee, check the leave policy and the pay line (G5 by default).
6. Review the documents marked "In review" with their owners and press **Approve** on each. Approved documents that ask for it then appear on everyone's My HR as "to read and acknowledge".
7. KRAs and reviews: **Start sheets** for the H2 FY 2026-27 cycle and agree targets with each person.

## What is in it
**For everyone (People and policies in every workspace menu)**
- **My HR**: leave balances, apply for leave, employment details, own personal details, the current goal sheet, policies to acknowledge, assets held, HR requests, coming holidays, and the team's pending leave for managers.
- **Leave**: apply (working days only; weekly offs and holidays not counted; warnings for balance, notice and stretch limits), approve or reject (with a reason) for anyone below you in "Reports to", a monthly calendar of who is away, cancel.
- **KRAs and reviews**: one goal sheet per person per half-year cycle from the position's template (SOP YSC-SALES-01 section 11). Draft › Agreed › Self review › Manager review › Closed. Weights must total 100. Accord shows its own count beside the KPIs it can measure (interactions, visits, bookings, team bookings, follow-up discipline, payments recorded). Weighted 1 to 5 score and band.
- **Knowledge base**: search, categories, "Written for my role", print, acknowledgements, related documents and version history.
- **HR requests**: corrections, letters, reimbursements, access, grievances, and confidential POSH complaints.
- **Holidays**.

**For HR and admins (Accord People workspace)**
- **HR desk** overview: head count, on leave today, approvals waiting, open requests, probation reviews due, onboarding open, acknowledgements missing, goal sheets started.
- **People** and each person's HR profile: position, grade, department, employment type, joining, probation and confirmation, status, onboarding checklist, exit checklist (with the person's open leads, clients, follow-ups and tasks to reassign, and the two-working-day full and final date), personal and bank details, pay history.
- **Attendance and leave register** for payroll: working days, present (from punch-ins), late marks, leave by type, holidays, unexplained absence and loss-of-pay days; CSV download.
- **Assets**, **Acknowledgements** (CSV), **HR settings** (grades, notice by grade, pay line, HR contact, probation, long-leave threshold, cycles, Internal Committee, leave types, checklists).

## Who sees what (enforced on the server, not only hidden on screen)
| | Own | Manager (anyone above in "Reports to") | HR role | Admin |
|---|---|---|---|---|
| Profile | All, edits personal fields only | Without personal and bank fields | All | All |
| Leave and goal sheets | Yes | Yes, approves and rates | All | All |
| Pay | Read own | No | Only grades below the pay line (G5) | All |
| POSH complaints | Own | No | No | No (Internal Committee only) |
| Knowledge base | By grade, position and team | Same | All | All |

Other colleagues see only a directory line (position, department, joining date). Consultants and bank contacts get nothing from Accord People except holidays. Nobody can approve their own leave or close their own goal sheet; a person editing their own sheet cannot change the manager's ratings or, after Draft, the targets.

New access role **HR and admin** (`hr`) and new page and power keys under Users and access › Pages and permissions: *My HR*, *Knowledge base*, *HR desk*, *See and change pay*, *Write and approve knowledge-base documents*.

## The knowledge base (33 documents, all starting "In review")
- **Sales and post-sales SOPs**: YSC-SALES-01 (the revised SOP, v1.1, with its open points), lead capture and round-robin, site visits, handover/documents/agreement/NOCs (with the RERA 10% rule), stage payments and escalation, cancellation/transfer/refund.
- **Role handbooks**: Sales Head, Sales Executive (with Anu's channel-partner duties), Post-Sales Coordinator, Legal, Accounts, HR and Admin.
- **RERA and legal**: RERA in daily sales work, advertising checklist, channel partner onboarding and brokerage.
- **Money, tax and KYC**: KYC, cash limits (269SS, 269ST), TDS under 194-IA, GST, stamp duty.
- **HR policies**: conduct, hours and punch-in, leave, holidays, probation and notice, performance management, POSH, grievances, travel and expenses, Accord and customer data (DPDP Act), exit and full and final, grade structure.
- **Office and admin**: office routines, construction-site safety, records and retention.
- **Restricted**: pricing and approval authority (G4+), pay ranges (G6, draft for management to fill in).

Legal and statutory points reflect Karnataka and central law as of November 2026 (including the Labour Codes in force since 21 November 2025). Items marked "confirm" are for Kanchana or the labour consultant before approval. **Do not put real pay figures or anything confidential in `source/src/seed/kb.js`**: the site source is published; restricted content belongs in Accord itself, where the server enforces who receives it.

## Files
- New: `source/src/lib/hr.js`, `source/src/modules/hr/HR.jsx`, `source/src/modules/kb/KB.jsx`, `source/src/seed/kb.js`, `source/src/seed/hrStart.js`.
- Changed: `lib/perms.js` (role, workspace, access keys, `scopeHr`), `lib/seed.js` (collections and starting content), `lib/store.jsx` (needs backend 3.8.0), `components/Layout.jsx` (menus), `App.jsx` (routes), `pages/Home.jsx` (Accord People home), `help/articles.js` (People, HR and policies: 7 articles), `styles.css`.
- Backend: `backend/Code.gs` 3.8.0 (schemas, `hrScope_`, `hrCheck_`, `hrNotify_`, text columns for versions and codes).

## Not done, worth knowing
- No payroll run or payslips: the register and pay history are inputs for whoever runs payroll.
- Leave balances are worked out from the policy, the joining date and approved leave; last year's carry-forward is entered by HR as an opening balance.
- Optional holidays are listed but not tracked per person.
