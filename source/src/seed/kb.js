// 12 Nov: the starting knowledge base. HR and admins edit these in Accord (People › Knowledge base); this file only fills an
// empty sheet. Body markup: "## " heading, "### " subheading, "- " bullet, "1. " numbered step, "| a | b |" table rows (first row
// is the header), "> " note, "[ ] " checklist item, **bold**. Every document names its owner, version and next review.
//
// Audience: minGrade (G1 to G6), positions (lib/hr.js POSITIONS), teams. Empty means all staff.
// Status: Draft (owner and HR only) · In review (shown with a banner, not yet signed off) · Approved · Retired (HR only).
// Legal points are written for Yamuna Sky City in Karnataka as understood in November 2026. Each one marked "confirm" is to be
// checked by Legal (Kanchana) or the labour consultant before the document moves to Approved.

const SALES = ['sales-head', 'sales-exec', 'sales-exec-cp', 'post-sales', 'crm', 'md', 'director']
const SALES_LEGAL_FIN = [...SALES, 'legal', 'accounts']
const D = (o) => ({ version: '1.0', status: 'In review', owner: 'Sujaya', approver: 'Aryan', effective: '2026-11-15', review: '2027-05-15', ack: false, audience: { minGrade: 'G1', positions: [], teams: [], roles: [] }, related: [], ...o })

export const KB_CATEGORIES = [
  { id: 'sop', label: 'Sales and post-sales SOPs', blurb: 'The enquiry-to-collection process, step by step, with owners and timelines.' },
  { id: 'role', label: 'Role handbooks', blurb: 'What each position does every day, week and quarter, and what it is measured on.' },
  { id: 'rera', label: 'RERA and legal', blurb: 'What the Real Estate (Regulation and Development) Act and the Karnataka rules require of us.' },
  { id: 'finance', label: 'Money, tax and KYC', blurb: 'Receipts, demand letters, interest, cash limits, TDS, GST and approvals.' },
  { id: 'hr', label: 'HR policies', blurb: 'Conduct, attendance, leave, holidays, performance, POSH, grievances and exits.' },
  { id: 'admin', label: 'Office and admin', blurb: 'Office routines, visitors, site safety, records and their retention.' },
  { id: 'restricted', label: 'Restricted', blurb: 'Commercial authority and pay structure. Shown only to the grades and positions named on each.' },
]

export const KB_DOCS = [
  // ─────────────────────────────── SOPs
  D({ id: 'KB-001', code: 'YSC-SALES-01', category: 'sop', title: 'Sales and post-sales: enquiry to stage-payment collection', version: '1.1', owner: 'Cyril', approver: 'Management', ack: true,
    audience: { minGrade: 'G1', positions: SALES_LEGAL_FIN, teams: [], roles: [] },
    summary: 'One accountable process from the first enquiry to the collection of every stage payment: 27 steps in four phases, each with an owner, a timeline and the record it leaves.',
    body: `> Draft v1.1 (11 Nov 2026) prepared with HR, awaiting management approval. Timelines marked (proposed) are not yet confirmed. Replaces sections 2, 3 and 6 of the earlier Sales SOP once approved.

## Purpose and scope
One clear, accountable process for Yamuna Sky City from the first enquiry to the collection of every stage payment, so each customer is handled the same way, every handover has a named owner and timeline, and every interaction, document and payment is recorded in Accord.

Covers channel partner coordination, enquiry handling, qualification, allocation, site visits, negotiation and closure, booking handover, documents, bank loans, the Sale Agreement, Builder's and Bank NOCs, physical records, RERA data, stage payments, receipts and reporting.

Not covered: other marketing, Legal's licence and approval work, and possession and handover of residences.

## Who does what
| Person | Role in this process |
|---|---|
| Cyril, Sales Head | Owns every enquiry, qualification and round-robin allocation (steps 1 to 3); presents at site visits (6); briefs the MD for closure (8); handles escalations (24) |
| Aryan Shetty, MD | Leads final negotiation and closure of every booking (8) |
| Anu, Medha, Sales Executives | Follow up allocated leads (4 to 8); hand over the booking file (9); stay the customer's main contact after booking. Anu alone coordinates channel partners |
| Yakshith, Post-Sales Coordinator | Documents, loan coordination, agreement scheduling and drafts, NOCs, physical files, stage payments, receipts (10 to 27) |
| Kanchana, Legal | Finalises and executes Sale Agreements, prepares Builder's NOCs, updates RERA records (14 to 16, 19) |
| Accounts | Confirms every payment with transaction details (22) |
| Smitha (external, bank) | Loan processing with the customer's bank (11). Yakshith is the single point of contact |

## Phase A: enquiry to booking (steps 1 to 8)
1. **Enquiry received (Cyril, on receipt).** Every enquiry (walk-in, phone, digital, referral, CP lead) is logged in Accord Leads before anyone works it.
2. **Explain and qualify (Cyril, first interaction).** Budget, requirement, intent and potential. Not qualified: close the lead with the reason.
3. **Allocate by round-robin (Cyril, same day, proposed).** Alternately to Anu and Medha. Any exception is approved and recorded by Cyril.
4. **First contact (executive, within the response time set by Cyril).** Record requirement, budget, preferences and timeline; set the next follow-up.
5. **Book the site visit (executive, before the visit).** Confirm, remind, and brief Cyril on date, time and expectations. CP clients: Anu coordinates with the partner.
6. **Site visit and presentation (Cyril, visit date).** The executive coordinates. Record completed, cancelled or no-show with the reason.
7. **Post-visit follow-up (executive, within 1 working day, proposed).** Feedback, objections, next step. Repeat until ready to negotiate.
8. **Negotiation and closure (Aryan Shetty).** Cyril briefs; the executive supports. Not booked: back to step 7 or mark lost with the reason.

## Phase B: booking handover (step 9)
9. **Handover (executive, within 24 hours of booking, proposed).** Collect KYC and booking papers, confirm the funding mode, hand the complete file to Yakshith. Checklist:
[ ] Signed booking or application form
[ ] Booking amount payment details
[ ] KYC: PAN, Aadhaar, photographs (and co-applicant)
[ ] Funding mode: self-funded or bank loan (bank name if known)
[ ] Residence: number, floor, area
[ ] Contact details: phone, e-mail, address
[ ] Agreed price, discounts and payment plan
[ ] Any special commitment made during negotiation, in writing

## Phase C: documents, loan and agreement (steps 10 to 19)
10. **Check documents (Yakshith, 1 working day).** Gaps go back to the executive, who collects them.
11. **Bank loan (Smitha, until sanction).** Yakshith passes the details and tracks status. Self-funded goes straight to 12.
12. **Fix the agreement date (Yakshith).** Inform the executive.
13. **Draft the agreement (Yakshith, 2 working days of a complete file).** Correct name and residence details; send to Kanchana.
14. **Finalise (Kanchana, 2 working days of the draft).**
15. **Execute the Sale Agreement (Kanchana, on the scheduled date).** Share the executed copy with Yakshith.
16. **Builder's NOC (Kanchana, loan cases, 2 working days of execution).**
17. **Issue the NOC and obtain the Bank NOC (Yakshith, weekly follow-up).**
18. **Physical file (Yakshith, 2 working days of execution).** Everything in one file, safe and easy to find. Booking and agreement data to Kanchana.
19. **RERA records (Kanchana, monthly data, quarterly update).**

## Phase D: stage payment collection (steps 20 to 27)
20. **Stage schedule (Yakshith, from execution).** Shared with the executive.
21. **Reminders (Yakshith, 7 days and 2 days before due).**
22. **Confirmation (Accounts, same working day).** Transaction details to Yakshith.
23. **Follow-up (Yakshith, from the day after the due date).** Customer and, for loans, the bank.
24. **Escalation (Cyril, at 7 days overdue).** Cyril agrees an action plan with the customer.
25. **Receipt (Yakshith, 1 working day of credit).** For every payment.
26. **Payment history (Yakshith, same day).** Received, outstanding, overdue. Next milestone.
27. **Payment update to Cyril (Yakshith, weekly; large or overdue cases the same day).**

## Escalation matrix
| Issue | Raised by | To | When |
|---|---|---|---|
| Allocated lead not contacted in time | Executive | Cyril | When the response time is missed |
| Visit cancelled or no-show | Executive | Cyril | Same day |
| Serious objection or closure opportunity | Executive | Cyril (and Aryan for closure) | Immediately |
| CP issue | Anu | Cyril | Same day |
| Documents incomplete | Yakshith to executive | Cyril | After 5 working days |
| Loan delay | Yakshith | Cyril | When it affects the agreement date |
| Agreement or execution delayed | Yakshith or Kanchana | Cyril | When the timeline is missed |
| Bank NOC not received | Yakshith | Cyril | After 2 weeks |
| Payment overdue | Yakshith | Cyril | At 7 days |
| Customer complaint | Anyone | Cyril | Same day |
| RERA compliance issue | Kanchana | Management | Immediately |

## Operating rules
1. Once allocated, the executive owns the lead until closure, disqualification or approved reassignment, and stays the main contact after booking.
2. Executives work only leads allocated to them. CP leads are logged with Cyril first.
3. Round-robin is the rule; exceptions are approved and recorded by Cyril.
4. No active lead without a status, last interaction and next follow-up date in Accord.
5. Closure is led by the MD.
6. No handover without the complete file and the funding mode.
7. Name and residence details are verified before the draft goes to Legal.
8. Every Sale Agreement goes through Legal.
9. Every booked customer has a schedule, reminders, collections and outstanding on record.
10. Every confirmed payment gets a receipt and a history update.
11. One complete physical file per customer, stored safely.
12. No verbal-only status reporting: daily report to Cyril by end of day.

## Points still to confirm
- Smitha's organisation and the agreed loan turnaround.
- Whether Kanchana prepares the Builder's NOC and Yakshith issues it (as shown).
- Whether CP leads go through round-robin (shown: logged with Cyril, then allocated as usual).
- All (proposed) timelines, the handover checklist and the KPI targets.
- Retention period and storage place for physical files (see ADM-02 for the proposal).`, related: ['KB-002', 'KB-003', 'KB-004', 'KB-010', 'KB-012'] }),

  D({ id: 'KB-002', code: 'YSC-SALES-02', category: 'sop', title: 'Lead capture, qualification and round-robin in Accord', owner: 'Cyril', ack: true,
    audience: { minGrade: 'G1', positions: SALES, teams: [], roles: [] },
    summary: 'How steps 1 to 4 of YSC-SALES-01 are done in Accord: where an enquiry is logged, what "qualified" means, how allocation alternates and what the executive records on first contact.',
    body: `## Logging an enquiry
- Every enquiry becomes a lead in **Leads** before anyone calls back. Pasted WhatsApp or portal enquiries go through the **Lead inbox**.
- Search by phone first. A repeat enquiry is logged as an interaction on the existing lead, never a second lead.
- Source is mandatory. CP leads carry the partner's name from **Channel partners**; a partner without a RERA agent number is flagged (RERA-03).

## Qualifying (Cyril)
| Test | Qualified when |
|---|---|
| Budget | Fits a residence type at the current rate card, with or without a loan |
| Requirement | A configuration Sky City has in stock |
| Intent | Buying for self-use or investment within 12 months |
| Potential | Decision-maker reachable; site visit possible |

Not qualified: close the lead with one of the standard lost reasons. Send TP-07 (Closing enquiry) so the door stays open.

## Round-robin
- Alternate qualified leads Anu, Medha, Anu, Medha in the order they were qualified. The next name is the one who did not get the last qualified lead.
- An exception (language, existing relationship, CP lead) is recorded by Cyril in the lead's note with the reason.
- Reassignment after allocation needs Cyril's approval and is done from the lead, so the history moves with it.

## First contact (executive)
- Within the response time Cyril sets. Log the call with **Log interaction** the same day.
- Record: configuration, budget band, purpose, timeline, funding mode if known, family decision-makers, preferred contact time and language.
- Always set the next action and its date. A lead with no next action shows on the Dashboard and counts against follow-up discipline.`, related: ['KB-001', 'KB-013'] }),

  D({ id: 'KB-003', code: 'YSC-SALES-03', category: 'sop', title: 'Site visits and private viewings', owner: 'Cyril',
    audience: { minGrade: 'G1', positions: SALES, teams: [], roles: [] },
    summary: 'Before, during and after a site visit: confirmation, the arrival desk, the walk, safety on an active site and the post-visit follow-up within one working day.',
    body: `## Before the visit
1. Confirm date and time with the customer and log it as a private viewing in **Pre-sales**.
2. Remind the day before and two hours before. Brief Cyril: who is coming, budget, objections so far.
3. CP visit: Anu confirms with the partner and that the partner is accompanying.

## On the day
- Arrival desk: greet, register visitors, note children and elderly visitors for the safety brief.
- Presentation by Cyril with the e-brochure; the executive supports and takes notes.
- Site walk only with an escort, helmets for everyone, and only on routes the site engineer has cleared (ADM-03).
- Departure checklist and the five feedback questions in Accord.

## After the visit
- Status: completed, cancelled or no-show, with the reason. Cancelled or no-show is escalated to Cyril the same day.
- Thank-you message (TP-01) the same day.
- Post-visit follow-up within 1 working day: objections, next step, date. Ready to negotiate goes to Cyril for the MD's closure.`, related: ['KB-001', 'KB-022'] }),

  D({ id: 'KB-004', code: 'YSC-PS-01', category: 'sop', title: 'Booking handover, documents, agreement and NOCs', owner: 'Yakshith', ack: true,
    audience: { minGrade: 'G1', positions: [...SALES, 'legal', 'accounts'], teams: [], roles: [] },
    summary: 'Steps 9 to 19 in practice: the handover file, document checks in Accord, the 10% rule before the agreement, drafting, execution, NOCs and the physical file.',
    body: `## The handover file (within 24 hours of booking)
The executive uploads every paper in **Client 360 › Documents**. Accord names files flat_clientID_document_date and files them under the client's Drive folder. The physical originals go to Yakshith with the checklist in YSC-SALES-01.

## Document check (Yakshith, 1 working day)
- PAN and Aadhaar match the booking form name exactly, including initials. A mismatch is fixed before drafting, never in the agreement.
- Co-applicant KYC present if named. NRI buyers: passport, visa or OCI, overseas address and NRE/NRO account details.
- Funding mode recorded on the client. Loan cases: bank name and sanction status.

## The 10% rule
> Under RERA section 13, no more than 10% of the cost of the residence may be taken as an advance or application fee before a written Agreement for Sale is executed and registered. Accord flags any client over 10% paid without an agreement (health: Red). Do not accept or demand further money in that state; escalate to Cyril and Kanchana.

## Agreement
1. Yakshith fixes the date with the customer (loan cases after sanction).
2. Draft from the approved model Agreement for Sale with the correct name, residence, carpet area, price, payment plan and parking as allotted in Accord.
3. Kanchana reviews and finalises within 2 working days; gaps come back to Yakshith.
4. Execution and registration at the Sub-Registrar on the date. Stamp duty and registration fees as per the Karnataka Stamp Act at the time (Legal confirms the figure for each case).
5. The executed copy is uploaded to Documents › 03 Agreement and legal the same day.

## NOCs (loan cases)
- Kanchana prepares the Builder's NOC within 2 working days of execution; Yakshith issues it to the bank and follows up weekly for the Bank NOC. Escalate to Cyril after 2 weeks.

## Physical file
One file per customer, labelled with the residence number and client ID, in the locked cabinet. Contents in order: booking form, KYC, receipts, agreement, NOCs, correspondence. Booking and agreement data go to Kanchana for the RERA update.`, related: ['KB-001', 'KB-010', 'KB-011'] }),

  D({ id: 'KB-005', code: 'YSC-PS-02', category: 'sop', title: 'Stage payments, reminders, receipts and escalation', owner: 'Yakshith', ack: true,
    audience: { minGrade: 'G1', positions: [...SALES, 'accounts'], teams: [], roles: [] },
    summary: 'Steps 20 to 27: demand letters raised from construction stages, reminders at 7 and 2 days, same-day confirmation, receipts within one working day, and escalation at 7 days overdue.',
    body: `## Demand letters
- A stage demand is raised only when the stage is certified by the architect or engineer. The certificate is attached to the demand letter in Accord.
- Demand = (consideration minus adjustments) times the stage percentage, plus GST. Due 15 days after it is raised.

## Reminders
| When | What | Who |
|---|---|---|
| 7 days before due | Gentle reminder (TP-02) with the demand letter | Yakshith |
| 2 days before due | Reminder call; loan cases also to the bank | Yakshith |
| Day after due | Follow-up call and message; log the commitment date | Yakshith |
| 7 days overdue | Escalate to Cyril with the history | Yakshith |
| 30 days overdue | Cyril and the MD decide on interest and next steps | Cyril |

## Confirmation and receipt
1. Accounts confirms the credit and the UTR the same working day.
2. Yakshith records the payment in Accord and issues the receipt within 1 working day. The receipt goes to the customer by e-mail and WhatsApp.
3. A cheque receipt is issued subject to realisation; a dishonoured instrument cancels it.
4. TDS deducted by the buyer under section 194-IA is recorded against the payment with the Form 16B when received.

## Interest on late payment
Interest is charged only as the Agreement for Sale provides, at the rate the Karnataka RERA rules prescribe (SBI highest MCLR plus 2%), and the same rate applies to us if we delay. Waivers need the MD's approval and a note.`, related: ['KB-001', 'KB-012', 'KB-013'] }),

  D({ id: 'KB-006', code: 'YSC-SALES-04', category: 'sop', title: 'Cancellation, transfer and refund', owner: 'Cyril',
    audience: { minGrade: 'G2', positions: [...SALES, 'legal', 'accounts'], teams: [], roles: [] },
    summary: 'The cancellation protocol in Accord, what RERA section 18 changes when we are at fault, and how refunds and residence moves are handled.',
    body: `## When the customer asks to cancel
1. Get the request in writing (e-mail or signed letter). Record it in **Client 360 › Cancel booking**.
2. Retention call by Cyril within 2 working days. If the customer stays, withdraw the request.
3. Accord works out the deduction within the caps in Admin › Settings › Cancellation rules. The caps must match the executed Agreement for Sale; Legal confirms them.
4. Approval by an admin; two admins above the threshold.
5. Refund in parts as recorded by Accounts. Loan cases: the lender is repaid first and its closure letter obtained.
6. Release the residence and its parking only after the refund and documents are complete. Send TP-09.

## When we are at fault
> If we cannot give possession by the agreed date or our registration is revoked, RERA section 18 lets the customer withdraw with a full refund plus interest at the prescribed rate, with no deduction. Tick "Developer at fault" so Accord does not apply a deduction.

## Moving to another residence
Use **Move to another residence**: the old booking closes as Transferred, payments move with the client, a fresh cost sheet is made for the new residence, and the old car parks are freed.

## Transfer to a third party (resale before possession)
Needs the MD's approval, a no-dues statement, Legal's tripartite paperwork (and the lender's consent for loan cases), and fresh KYC for the new buyer. Charges, if any, as per the agreement.`, related: ['KB-005', 'KB-010'] }),

  // ─────────────────────────────── Role handbooks
  D({ id: 'KB-020', code: 'RH-SH', category: 'role', title: 'Role handbook: Sales Head', owner: 'Aryan', ack: true,
    audience: { minGrade: 'G4', positions: ['sales-head', 'md', 'director', 'hr-admin'], teams: [], roles: [] },
    summary: 'Daily, weekly and monthly routine of the Sales Head, authority limits and the KRAs the role is reviewed on.',
    body: `## Every day
- Log and qualify every new enquiry; allocate qualified leads by round-robin the same day.
- Review the daily reports from Anu, Medha and Yakshith by 7 pm. Missing report: follow up the next morning.
- Clear escalations raised that day; visits and complaints the same day.
- Check the Dashboard: overdue follow-ups, leads with no next action, Red clients.

## Every week
- Payment update from Yakshith: due, received, overdue, actions.
- Pipeline review with the MD: hot prospects ready for closure.
- One coaching conversation with each executive using their Accord figures.

## Every month and quarter
- Close the month's bookings and collections figures with Accounts.
- Monthly RERA sales data to Kanchana (with Yakshith) before each quarterly update.
- KRA mid-cycle check-ins and the half-yearly review of each reportee.

## Authority
| Decision | Sales Head can | Needs |
|---|---|---|
| Lead reassignment | Approve and record | |
| Founding privilege up to 5% | Recommend | Admin approval above 5% (FIN-02) |
| Leave of reportees | Approve | HR informed for more than 5 days |
| Interest waiver | Recommend | MD |

## Measured on
Bookings, team KPI performance, escalations resolved, collections against target.`, related: ['KB-001', 'KB-041'] }),

  D({ id: 'KB-021', code: 'RH-SE', category: 'role', title: 'Role handbook: Sales Executive (including channel partners)', owner: 'Cyril', ack: true,
    audience: { minGrade: 'G1', positions: ['sales-exec', 'sales-exec-cp', 'crm', 'sales-head', 'md', 'director', 'hr-admin'], teams: [], roles: [] },
    summary: 'What a Sales Executive does each day, how leads are owned after allocation, the CP responsibilities that belong to Anu alone, and the KPIs.',
    body: `## Every day
1. Punch in in Accord on arrival; the Dashboard opens on your follow-ups for the day.
2. Call every follow-up due today. Log each call the same day with the next action and date.
3. New allocated leads: first contact within the response time.
4. Confirm tomorrow's site visits and brief Cyril.
5. Before leaving, send the daily report to Cyril: active leads, new contacts, hot prospects, visits (scheduled, confirmed, completed, cancelled, no-show), expected bookings, CRM updates pending, customer issues.

## After a booking
- Handover file to Yakshith within 24 hours. You remain the customer's main contact: collect missing documents and help nudge payments.

## Channel partners (Anu only)
- Keep the partner list current in **Channel partners** with each partner's RERA agent registration number (RERA-03).
- Bring partners and their clients to site; pass every CP lead to Cyril for logging before follow-up.
- Daily report also covers CP activity, CP leads and CP visits.

## Never
- Work a lead that is not allocated to you. Quote a price or discount outside the cost sheet. Accept cash. Promise anything not in writing. Share customer details outside Accord.

## Measured on
Lead response time, lead-to-visit conversion, visit attendance, follow-up discipline, bookings, handover on time and complete, CRM accuracy. Anu also: active CPs, CP leads, CP visits and CP bookings.`, related: ['KB-001', 'KB-002', 'KB-030'] }),

  D({ id: 'KB-022', code: 'RH-PS', category: 'role', title: 'Role handbook: Post-Sales Coordinator', owner: 'Cyril', ack: true,
    audience: { minGrade: 'G1', positions: ['post-sales', 'sales-head', 'legal', 'accounts', 'md', 'director', 'hr-admin'], teams: [], roles: [] },
    summary: 'The coordinator\'s week from handover to receipt, the bank and legal interfaces, and the measures.',
    body: `## Every day
- Check new handovers within 1 working day; return gaps to the executive.
- Payments confirmed by Accounts: record, receipt within 1 working day, update history.
- Reminders due today (7 and 2 days before due) and overdue follow-ups from the day after due.
- Daily report to Cyril: handovers, pending documents, loan status, agreements drafted and executed, NOCs, dues, reminders, collections, overdue cases and escalations.

## Every week
- Bank NOC follow-ups. Loan status from Smitha. Payment update to Cyril with Accounts data.

## Every month
- Booking and agreement data to Kanchana for RERA. Physical file spot check: pick five files and confirm they are complete.

## Measured on
Files complete on time, agreements on schedule, NOCs on time, collection efficiency, overdue amount and cases, receipts on time, updates to Cyril on schedule, records complete and retrievable.`, related: ['KB-004', 'KB-005'] }),

  D({ id: 'KB-023', code: 'RH-LG', category: 'role', title: 'Role handbook: Legal', owner: 'Aryan',
    audience: { minGrade: 'G3', positions: ['legal', 'md', 'director', 'sales-head', 'hr-admin'], teams: [], roles: [] },
    summary: 'Legal\'s part in sales (agreements, NOCs, RERA records) and the compliance calendar it owns.',
    body: `## In the sales process
- Finalise agreements within 2 working days of the draft; execute on the scheduled date; share the executed copy.
- Builder's NOCs within 2 working days of execution for loan cases.
- RERA: quarterly updates, area statements, compliance documents, consultant coordination.

## Compliance calendar
| When | What |
|---|---|
| Every quarter | Project update on the Karnataka RERA portal (bookings, construction status, approvals) |
| Every year | Annual audit report of the RERA account by a chartered accountant |
| On any change | Plans, approvals, bank account or project details updated with the Authority before use |
| Continuous | Advertisements carry the registration number and website (RERA-02); CPs are registered agents (RERA-03) |

## Escalate to management immediately
Any notice from the Authority, a customer complaint filed with RERA, or a sales practice that breaches RERA-01.`, related: ['KB-010', 'KB-004'] }),

  D({ id: 'KB-024', code: 'RH-AC', category: 'role', title: 'Role handbook: Accounts', owner: 'Aryan',
    audience: { minGrade: 'G2', positions: ['accounts', 'md', 'director', 'post-sales', 'hr-admin'], teams: [], roles: [] },
    summary: 'Payment confirmation, the separate RERA account, reconciliation and refunds.',
    body: `## Confirming payments
- Confirm each credit with the UTR or instrument number to Yakshith the same working day.
- No cash for any amount connected with the residence (FIN-01).

## The RERA account
> RERA section 4(2)(l)(D): 70% of the amounts realised from allottees is deposited in a separate account with a scheduled bank and used only for the land and construction cost of this project. Withdrawals are in proportion to completion and certified by the engineer, architect and a chartered accountant.

- Move the 70% share within the time set in the account mandate; keep the certificates with each withdrawal.
- Reconcile Accord collections with the bank statement every week.

## Refunds
Record each refund against the cancellation in Accord; lender first for loan clients. Refund timelines as per the agreement and the approval.`, related: ['KB-012', 'KB-006'] }),

  D({ id: 'KB-025', code: 'RH-HR', category: 'role', title: 'Role handbook: HR and Admin', owner: 'Aryan',
    audience: { minGrade: 'G3', positions: ['hr-admin', 'md', 'director'], teams: [], roles: [] },
    summary: 'HR\'s monthly calendar in Accord: joiners, attendance and leave closure, KRA cycle, policies, compliance registers and exits.',
    body: `## Every month
| By | What | Where in Accord |
|---|---|---|
| 1st | Close attendance and leave for the month; list loss-of-pay days | People › HR desk › Attendance and leave |
| 2nd | Payroll inputs to Accounts (joiners, exits, LOP, reimbursements) | HR desk |
| 7th | Salaries paid (Code on Wages: by the 7th of the following month) | |
| 10th | Policy acknowledgements chased | Knowledge base › Acknowledgements |
| Month end | Onboarding and exit checklists closed | HR desk › People |

## Every cycle (half-yearly)
- KRA sheets created from each position's template and agreed in the first two weeks.
- Mid-cycle check-in, then self and manager reviews; HR moderates and closes.

## Compliance registers to keep current
Shops and establishment registration and renewal, attendance and wage registers, leave register, holiday list displayed, POSH Internal Committee and its annual report, statutory notices on the board, and EPF, ESI and professional tax registrations when the head count or salary makes them applicable (confirm thresholds with the consultant).`, related: ['KB-040', 'KB-041', 'KB-046'] }),

  // ─────────────────────────────── RERA and legal
  D({ id: 'KB-010', code: 'RERA-01', category: 'rera', title: 'RERA in daily sales work: what we must and must not do', owner: 'Kanchana', ack: true,
    audience: { minGrade: 'G1', positions: SALES_LEGAL_FIN, teams: [], roles: [] },
    summary: 'The Real Estate (Regulation and Development) Act, 2016 and the Karnataka rules, translated into the things a salesperson, coordinator or accountant does or avoids every day.',
    body: `> Plain-language guide. Where this and the executed Agreement for Sale or the Act differ, the Act and the agreement prevail. Legal confirms anything unclear.

## Always
- Sell only from the RERA-registered project details: the registered carpet area, plans, specifications, amenities and completion date. Quote carpet area as RERA defines it.
- Put the RERA registration number and the Authority's website on every brochure, hoarding, post, WhatsApp creative and e-mail signature that promotes the project (section 11(2)).
- Work only with channel partners registered as real estate agents with Karnataka RERA (sections 9 and 10).
- Give the customer the approved plans, the stage-wise schedule and the model agreement before booking.
- Take no more than 10% of the cost before a registered Agreement for Sale (section 13).
- Keep every promise in writing in the agreement or a signed annexure.
- Route 70% of collections to the separate RERA account (section 4(2)(l)(D)).

## Never
- Promise a possession date, amenity, view, parking or specification that is not in the registration or the agreement.
- Advertise a price, offer or "assured return" that is not approved in writing.
- Change plans or specifications after booking without the written consent required by section 14 (two-thirds of allottees for changes to the building).
- Take cash, or take payment into any account other than the project's collection account.

## Interest, defects and delays
| Situation | Rule |
|---|---|
| Customer pays late | Interest at SBI highest MCLR plus 2% as the agreement provides |
| We deliver late | Same rate to the customer for every month of delay, or a full refund with interest if they withdraw (section 18) |
| Structural defect or workmanship issue reported within 5 years of possession | We rectify within 30 days at no cost (section 14(3)) |

## Records RERA expects us to keep
Allotment letters, agreements, receipts, demand letters, cancellation and refund records, quarterly updates and the annual audit of the RERA account. Accord holds the digital copy; the physical file holds the original.

## If a customer threatens or files a RERA complaint
Same day to Cyril and Kanchana. Do not argue the merits in writing; acknowledge, gather the record and let Legal respond.`, related: ['KB-011', 'KB-012', 'KB-004'] }),

  D({ id: 'KB-011', code: 'RERA-02', category: 'rera', title: 'Advertising and marketing communication checklist', owner: 'Kanchana',
    audience: { minGrade: 'G1', positions: [...SALES, 'design', 'legal'], teams: [], roles: [] },
    summary: 'Every piece that promotes Yamuna Sky City is checked against this list before it goes out, including WhatsApp forwards and CP creatives.',
    body: `## Before anything is published
[ ] RERA registration number and the Karnataka RERA website shown legibly
[ ] Images marked "artist's impression" where they are not photographs
[ ] Areas stated as carpet area as registered; any other area labelled clearly
[ ] Specifications and amenities match the registration
[ ] No assured returns, guaranteed appreciation or "last few units" unless true and approved
[ ] Offers and prices approved in writing by the MD with a validity date
[ ] Legal has seen it (hoardings, print, video, paid digital)

## Channel partner creatives
Partners use only creatives we supply or approve. A partner circulating unapproved material is told in writing and reported to Cyril the same day.`, related: ['KB-010'] }),

  D({ id: 'KB-013', code: 'RERA-03', category: 'rera', title: 'Channel partner onboarding and brokerage', owner: 'Cyril',
    audience: { minGrade: 'G2', positions: ['sales-head', 'sales-exec-cp', 'md', 'director', 'accounts', 'legal'], teams: [], roles: [] },
    summary: 'Who may bring buyers to Sky City, what we collect from them, how CP leads are protected and when brokerage is paid.',
    body: `## Onboarding a partner
1. Collect the RERA agent registration certificate, PAN, GSTIN (if registered), bank details and a signed CP agreement with the brokerage terms.
2. Verify the registration on the Karnataka RERA portal and record the number and expiry in **Channel partners**.
3. Give the partner the approved creatives and the price list in force.

## Protecting a CP lead
A CP lead is tagged to the partner when Cyril logs it, before the first visit. A lead already in Accord from another source is not re-tagged without Cyril's decision, recorded on the lead.

## Brokerage
Paid only on an executed agreement and the receipt of the payment stage named in the CP agreement, against the partner's invoice, after TDS. No brokerage to an unregistered agent.`, related: ['KB-010', 'KB-002'] }),

  // ─────────────────────────────── Money, tax and KYC
  D({ id: 'KB-012', code: 'FIN-01', category: 'finance', title: 'Customer KYC, cash limits, TDS and GST', owner: 'Aryan', ack: true,
    audience: { minGrade: 'G1', positions: SALES_LEGAL_FIN, teams: [], roles: [] },
    summary: 'What we collect to identify a buyer, why we never take cash, how the buyer\'s 1% TDS works and what GST applies to an under-construction residence.',
    body: `## KYC
- PAN of every applicant (mandatory for a property transaction), Aadhaar (store only the last four digits in Accord), photographs, address proof.
- NRI buyers: passport, visa or OCI, overseas address; payments only through NRE or NRO accounts or inward remittance.
- Payment from someone other than the applicant: a letter from the applicant and the payer's KYC; Accord marks it as a third-party payment.

## Cash
> No cash for anything connected with the residence. The Income-tax Act bars accepting Rs 20,000 or more in cash as an advance or otherwise in relation to the transfer of immovable property (section 269SS), and Rs 2 lakh or more in cash from a person in a day for any transaction (section 269ST). Take cheque, demand draft, RTGS, NEFT or UPI only.

## TDS by the buyer
- Where the consideration is Rs 50 lakh or more, the buyer deducts 1% TDS under section 194-IA on each payment and deposits it with Form 26QB.
- Record the TDS against the payment in Accord. Ask the buyer for Form 16B; chase it before the next demand.

## GST
- Under-construction residences: 5% GST without input tax credit (1% for those that meet the affordable-housing definition). No GST on a residence sold after the completion certificate.
- Demand letters in Accord add GST to the stage amount.

## Stamp duty and registration
Paid by the buyer at the Sub-Registrar at the rate in force on the day. Legal confirms the figure for each agreement.`, related: ['KB-005', 'KB-010'] }),

  D({ id: 'KB-014', code: 'FIN-02', category: 'restricted', title: 'Pricing, discounts and approval authority', owner: 'Aryan',
    audience: { minGrade: 'G4', positions: [], teams: [], roles: [] },
    summary: 'Who may offer what on price and terms. Restricted to grade G4 and above.',
    body: `## Rate card
Base rate, floor rise and charges are set by an admin in Admin › Settings and are the only figures used on cost sheets.

## Founding privilege
| Privilege | Who decides |
|---|---|
| 2.5% to 5% | Sales Head may offer within the cost sheet |
| Above 5% to 10% | Waits in Accord for an admin's approval |
| Above 10% or any non-standard term | MD only, in writing |

## Special terms
Any term outside the standard plan (custom schedule, parking, fit-out, waiver) is written into the cost sheet's special terms and the agreement annexure. Nothing is promised verbally.

## Interest and waivers
Interest on late payment and any waiver: MD's approval with the reason recorded in Accord.`, related: ['KB-020'] }),

  // ─────────────────────────────── HR policies
  D({ id: 'KB-030', code: 'HR-01', category: 'hr', title: 'Code of conduct', ack: true,
    summary: 'How we behave with customers, partners and each other, and what happens when someone does not.',
    body: `## With customers
- Honest information only: what is registered and in writing. No pressure selling. Respect the customer's time and language.
- Customer data stays in Accord (HR-10, DATA-01). No personal copies, no forwarding to personal groups.
- Gifts: nothing above a token value from customers, partners or vendors. Declare anything offered to HR.

## With each other
- Respect, punctuality and clear handovers. Disagreements go to the manager, then HR.
- Zero tolerance for harassment of any kind (HR-07) and for discrimination on any ground.

## Conflicts of interest
Declare to HR any relative who is a customer, partner or vendor, and any outside work. No dealing on your own account in Sky City residences without the MD's written approval.

## Breaches
Depending on seriousness: verbal counselling, written warning, final warning, termination. Fraud, harassment, data theft or taking cash from a customer can lead to termination at the first instance after an inquiry.`, related: ['KB-037', 'KB-039'] }),

  D({ id: 'KB-031', code: 'HR-02', category: 'hr', title: 'Working hours, attendance and punch-in', ack: true,
    summary: 'Shift timings, how punch-in works in Accord, late marks, site visits, remote work and attendance corrections.',
    body: `## Hours
- Monday to Saturday, 9:30 am to 6:30 pm, with breaks recorded in Accord. Sunday is the weekly off. Individual shifts are shown in People › Team.
- Weekly hours stay within the limit set by the Karnataka Shops and Commercial Establishments Act; overtime only with the manager's approval and paid as the law requires.

## Punch-in in Accord
- Punch in on arrival from your own device; Accord checks the location against the office or site. Punch out when you leave. Breaks and site visits are marked as they start and end.
- Accord does not open the CRM until you have punched in.
- A day left open closes at the shift end and is flagged.

## Late marks
Arrival more than 15 minutes after the shift start is a late mark. Three late marks in a month are counted as half a day of casual leave (or loss of pay if none is left). The manager can excuse a late mark with a reason.

## Corrections
Raise an **HR request › Leave or attendance correction** within 3 working days with the reason; the manager confirms and HR corrects.

## Remote work
Only for those marked remote-allowed, and only with the manager's prior approval for the day.`, related: ['KB-032'] }),

  D({ id: 'KB-032', code: 'HR-03', category: 'hr', title: 'Leave policy', ack: true,
    summary: 'Leave types and entitlements, how leave is applied for and approved in Accord, notice periods, carry-forward and encashment.',
    body: `## Entitlements (calendar year, pro-rata in the year of joining)
| Type | Days | Notes |
|---|---|---|
| Earned leave (EL) | 15 a year, credited monthly | Statutory floor: 1 day for every 20 days worked (Karnataka S&CE Act, s.15). Carry forward up to 45 days. Encashed on exit |
| Sick leave (SL) | 12 a year | Medical certificate for more than 2 days in a row |
| Casual leave (CL) | 6 a year | Up to 3 days at a stretch; lapses at year end |
| Maternity | 26 weeks | For the first two children; 12 weeks after that |
| Paternity | 5 working days | Within 3 months of the birth or adoption |
| Bereavement | 3 working days | Immediate family |
| Compensatory off | As earned | For working a holiday or weekly off with approval; use within 60 days |
| Leave without pay | | Only when balances are used, with approval |

Holidays and weekly offs inside a leave period are not counted.

## Applying
1. Apply in **People › Leave** before the leave starts: EL at least 7 days ahead, CL 1 day ahead, SL on the day by 10 am.
2. Your manager approves in Accord. Leave of more than 5 days is also seen by HR.
3. Hand over your follow-ups: reassign the open ones or note who covers, so no customer is left without a contact.

## Unauthorised absence
Absence without approved leave is loss of pay. Three working days without contact is treated as abandonment and handled under HR-05.

> Entitlements above the statutory floor are company policy and may be revised. Statutory points to be confirmed by the labour consultant before approval.`, related: ['KB-031', 'KB-033'] }),

  D({ id: 'KB-033', code: 'HR-04', category: 'hr', title: 'Holidays',
    summary: 'How the holiday list is fixed and what happens when you work on a holiday.',
    body: `## The list
- HR publishes the year's list in **People › Holidays** by 15 December, and it is displayed in the office.
- At least the national and festival holidays the Karnataka Industrial Establishments (National and Festival Holidays) Act requires, chosen from the state's notified list. National days: Republic Day, May Day, Independence Day, Gandhi Jayanti and Kannada Rajyotsava (confirm with the labour consultant).
- Optional holidays may be added; each person may take a set number of them.

## Working on a holiday
Only with the manager's approval (site visits on festival days are common). Earn a compensatory off, or double wages where the law requires it.`, related: ['KB-032'] }),

  D({ id: 'KB-034', code: 'HR-05', category: 'hr', title: 'Probation, confirmation and notice period', ack: true,
    summary: 'Probation length, how confirmation is decided, notice periods by grade and how a resignation is handled.',
    body: `## Probation
6 months from joining. A review at 3 months and a confirmation review in the last two weeks, against the first-cycle KRA sheet. Probation may be extended once by up to 3 months with written reasons.

## Notice period
| Grade | During probation | After confirmation |
|---|---|---|
| G1 | 7 days | 15 days |
| G2 and G3 | 15 days | 30 days |
| G4 | 30 days | 60 days |
| G5 and G6 | 30 days | 90 days |

Notice may be bought out or waived by the company. Leave cannot be set off against notice without the manager's approval.

## Resignation
In writing (e-mail to the manager and HR). HR confirms the last working day and starts the exit checklist (HR-11).`, related: ['KB-039'] }),

  D({ id: 'KB-035', code: 'HR-06', category: 'hr', title: 'Performance management: KRAs, KPIs and reviews', ack: true,
    summary: 'The half-yearly cycle in Accord: goal sheets from the position template, check-ins, self and manager ratings, moderation and what the rating is used for.',
    body: `## The cycle
| When | What |
|---|---|
| First two weeks of the cycle (April, October) | HR creates the KRA sheet from your position's template; you and your manager agree targets and weights (total 100) |
| Mid-cycle | Check-in with the manager using the Accord figures shown on the sheet |
| Last two weeks | Self review, then manager review |
| After the cycle | HR moderates across the team; the sheet is closed and shared |

## Rating scale
| Rating | Meaning |
|---|---|
| 5 Outstanding | Well above target on most KRAs |
| 4 Exceeds | Above target on the important KRAs |
| 3 Meets | On target |
| 2 Needs improvement | Below target; a plan is agreed |
| 1 Unsatisfactory | Well below; a formal improvement plan |

The overall score is the weighted average of the manager's ratings.

## Where the KPIs come from
Each position's KPIs follow the SOP (YSC-SALES-01, section 11). Accord shows a suggestion beside each KPI it can count (interactions, visits, bookings, follow-up discipline, receipts), so reviews start from facts, not memory.

## What the rating feeds
Confirmation, increments, variable pay, promotion between grades and development plans. A rating of 2 or below in two cycles leads to a performance improvement plan of up to 90 days.`, related: ['KB-020', 'KB-021', 'KB-022'] }),

  D({ id: 'KB-036', code: 'HR-07', category: 'hr', title: 'Prevention of sexual harassment (POSH)', ack: true,
    summary: 'Our zero-tolerance policy under the Sexual Harassment of Women at Workplace Act, 2013: what harassment is, the Internal Committee, how to complain and what happens next.',
    body: `## What it covers
Any unwelcome sexual conduct, physical, verbal or non-verbal, at the office, at site, at a customer's home, at events or on messages and calls connected with work. It covers employees, trainees, customers, partners and vendors.

## The Internal Committee
- Presided over by a senior woman employee, with at least two employee members and one external member from an NGO or with legal knowledge; at least half the members are women.
- Members are named on every person's My HR page in Accord and on the office notice board.

## How to complain
1. Within 3 months of the incident (extendable for good reason), in writing, to any committee member, or through **HR request › POSH complaint (confidential)** in Accord. Only committee members see that request; not HR, not management.
2. The committee may first try conciliation if the complainant asks for it.
3. Otherwise the committee inquires and completes within 90 days, with both sides heard.
4. The report goes to management, which acts on it within 60 days.

## Protection
Confidentiality is a legal duty. Retaliation against a complainant or witness is misconduct. A complaint found malicious can be acted upon; a complaint that cannot be proved is not malicious.`, related: ['KB-037'] }),

  D({ id: 'KB-037', code: 'HR-08', category: 'hr', title: 'Grievance redressal',
    summary: 'How to raise a work concern, who answers it and how fast.',
    body: `## Raise it
1. With your manager first, if you can.
2. If not resolved in 5 working days, or if it is about your manager, raise an **HR request › Grievance** in Accord.
3. HR acknowledges within 2 working days and answers within 15 working days, with a meeting if needed.
4. Still unresolved: HR takes it to the MD, whose decision is final within the company.

Harassment complaints go to the Internal Committee (HR-07), not this route.`, related: ['KB-036'] }),

  D({ id: 'KB-038', code: 'HR-09', category: 'hr', title: 'Travel, site visits and expense reimbursement',
    summary: 'What is reimbursed, the limits by grade and how to claim.',
    body: `## Reimbursed
- Local travel for work beyond the daily commute (customer meetings, bank, Sub-Registrar, vendor visits).
- Outstation travel approved in advance by the manager.
- Customer hospitality approved in advance.

## Limits
| Grade | Local travel | Outstation stay a night | Daily allowance |
|---|---|---|---|
| G1 to G3 | Actuals, two-wheeler or auto; taxi with approval | Up to the limit HR sets | As set by HR |
| G4 and above | Actuals, taxi | Up to the limit HR sets | As set by HR |

## Claiming
Within 7 days of the expense through **HR request › Payroll or reimbursement**, with bills. Paid with the next salary after the manager approves.`, related: [] }),

  D({ id: 'KB-039', code: 'HR-10', category: 'hr', title: 'Accord, devices and customer data', ack: true,
    summary: 'Your Accord sign-in, the authenticator, company devices and the rules for customer personal data under the Digital Personal Data Protection Act, 2023.',
    body: `## Accord
- Your username and authenticator are yours alone. Never share a code or sign in for a colleague.
- Accord shows you what your role, position and grade allow. If you need more, ask your manager, who asks an admin.
- Training mode is for practice; nothing entered there is saved.

## Devices
Company laptops, phones and SIMs are recorded in **People › Assets** and returned on exit. Lock screens on; no shared devices for customer calls without your own sign-in.

## Customer data
- Collect only what the process needs, and say why (booking, agreement, loan, receipts).
- Keep it in Accord and the client's Drive folder. Not on personal phones, personal e-mail or personal WhatsApp groups.
- Share outside the company only with those the process needs (the customer's bank, the Sub-Registrar, our Legal) and only what they need.
- A lost phone, a wrong-person e-mail or any leak goes to Cyril and HR the same day; we may have to inform the customer and the Data Protection Board.
- On exit, all customer data stays with the company.`, related: ['KB-030'] }),

  D({ id: 'KB-040', code: 'HR-11', category: 'hr', title: 'Exit and full and final settlement',
    summary: 'The exit checklist in Accord, handover of leads and clients, and the two-working-day settlement.',
    body: `## Exit checklist (HR starts it on acceptance of the resignation)
1. Last working day agreed against the notice period.
2. Leads, clients, open follow-ups and tasks reassigned in Accord. No customer is left without an owner.
3. Physical files and documents returned.
4. Assets returned and checked against People › Assets.
5. Accord access removed on the last day; e-mail, groups and shared drives handed over.
6. Exit interview.

## Settlement
> Under the Code on Wages, 2019 (in force since 21 November 2025), wages due are paid within two working days of the last working day, whatever the reason for leaving. Gratuity, where due, follows its own timeline.

Includes salary to the last day, earned leave encashment, reimbursements, less notice shortfall and dues. Relieving and experience letters are issued with the settlement.`, related: ['KB-034'] }),

  D({ id: 'KB-041', code: 'HR-12', category: 'hr', title: 'Grade structure and career levels',
    summary: 'The six grades used across Accord and the company, what each means and how promotion between grades works. Pay ranges are in a separate restricted document.',
    body: `## Grades
| Grade | Level | Typical positions |
|---|---|---|
| G1 | Trainee | Interns, trainees |
| G2 | Executive | Sales Executive, Sales and CRM Executive |
| G3 | Senior executive / Specialist | Post-Sales Coordinator, Accounts, HR and Admin |
| G4 | Lead / Manager | Sales Head, Legal |
| G5 | Head of department | Creative Director |
| G6 | Management | Managing Director, Directors |

## What a grade changes in Accord
- Which knowledge-base documents you can open (each document names its lowest grade).
- Notice period (HR-05) and travel limits (HR-09).
- Whose pay HR can see: HR sees pay only for grades below the level set by management (G5 by default).

## Promotion
Considered at the end of a cycle for a rating of 4 or more in two consecutive cycles, a vacancy or a widened role at the next grade, and the manager's and HR's recommendation. Approved by the MD.`, related: ['KB-042', 'KB-035'] }),

  D({ id: 'KB-042', code: 'HR-13', category: 'restricted', title: 'Pay ranges by grade and compensation rules', owner: 'Aryan', approver: 'Aryan', status: 'Draft',
    audience: { minGrade: 'G6', positions: [], teams: [], roles: [] },
    summary: 'Monthly pay ranges for each grade and the rules for increments and variable pay. Management and HR only.',
    body: `> Draft for management to fill in. Visible only to management and HR.

## Ranges (monthly gross, Rs)
| Grade | Minimum | Midpoint | Maximum |
|---|---|---|---|
| G1 | | | |
| G2 | | | |
| G3 | | | |
| G4 | | | |
| G5 | | | |
| G6 | | | |

## Structure
- Basic plus DA at least 50% of total remuneration, as the Code on Wages definition of wages requires; this drives PF and gratuity.
- Professional tax and statutory contributions as applicable.

## Increments
Once a year after the H2 review, from the rating: Outstanding, Exceeds, Meets, Needs improvement (none), Unsatisfactory (none). Percentages set by management each year.

## Variable pay for sales
Booking incentive per executed agreement and collection incentive per cycle, set by management in writing for each cycle.`, related: ['KB-041'] }),

  // ─────────────────────────────── Office and admin
  D({ id: 'KB-050', code: 'ADM-01', category: 'admin', title: 'Office routines: opening, visitors, petty cash and supplies',
    summary: 'The daily office routine at the Sky City sales office, visitor handling, petty cash and stationery.',
    body: `## Opening and closing
- First in: lights, AC, display screens, the e-brochure screen on and signed in, the reception register ready.
- Last out: screens off, cabinets locked (the customer files cabinet always), windows, AC and lights off, main door locked. Keys as recorded in People › Assets.

## Visitors
Every visitor is entered at reception (name, phone, whom meeting, time in and out). Customers are offered water or coffee and seated in the lounge; their advisor is told at once.

## Petty cash
A fixed float kept by HR and Admin. Each spend with a bill and a voucher signed by the spender; topped up weekly against the vouchers. No petty cash for anything above Rs 2,000 without the manager's approval.

## Supplies
Stationery, printed forms and brochures are requested through HR. Printing of demand letters and receipts uses Accord's A4 layouts only.`, related: ['KB-052'] }),

  D({ id: 'KB-051', code: 'ADM-03', category: 'admin', title: 'Construction site safety for staff and visitors', ack: true,
    audience: { minGrade: 'G1', positions: [], teams: [], roles: [] },
    summary: 'Rules for anyone taking customers onto the Sky City site.',
    body: `## Before entering
- Check with the site engineer which routes and floors are open today.
- Helmets for everyone; closed shoes; high-visibility vests where issued.
- Children are kept to the sales office and the sample residence unless the engineer allows otherwise, and always held by an adult.

## On site
- Stay on the cleared route with the escort. No lifts, hoists or scaffolding.
- Keep away from open edges, shafts, cranes, concrete pours and material movement.
- Stop the visit at once in rain, lightning or if the engineer asks.

## Incidents
First aid kit at the site office. Any injury or near miss to the site engineer and Cyril at once, then an HR request the same day.`, related: ['KB-003'] }),

  D({ id: 'KB-052', code: 'ADM-02', category: 'admin', title: 'Records and how long we keep them', owner: 'Kanchana',
    summary: 'Where each kind of record lives and how long it is kept.',
    body: `> Proposed retention, to be confirmed by Legal (YSC-SALES-01 section 13 asks for this).

| Record | Where | Keep for |
|---|---|---|
| Customer physical file (booking, KYC, agreement, NOCs) | Locked cabinet, then archive | Until the conveyance deed, plus 8 years |
| Receipts, demand letters, payment history | Accord and Drive | 8 years after the financial year |
| Cancellation and refund records | Accord and the physical file | 8 years after the refund |
| Lead and interaction history | Accord | 3 years after the last contact, unless booked |
| Lost leads' personal data | Accord | Deleted or anonymised after 3 years |
| RERA quarterly updates and audits | Legal records | Life of the project plus 8 years |
| Employee files | HR | 8 years after exit |
| Attendance and wage registers | Accord and HR | As the labour law in force requires (at least 3 years) |

Nothing is destroyed without HR's and Legal's written approval and a destruction log.`, related: ['KB-039'] }),
]
