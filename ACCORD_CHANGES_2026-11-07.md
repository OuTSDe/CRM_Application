# Accord CRM · change instructions (7 Nov 2026, revision 2)

Scope: 3 CRM features, 2 interface changes, 2 user-data changes.
This file explains what is already in the code, what is missing, and exactly where and how to change it. No code has been changed.

Revision 2 adds: the demand letter built from `Demand_Letter_Draft_-_Proposed.docx`, the RERA and compliance procedure (Karnataka), the payment timeline you confirmed, payment edits that apply straight away, e-mailed sign-in codes, and the reset for Shruthadev with no other admin present.

Paths are relative to `CRM_Application/`. Front end: `source/src`. Backend: `backend/Code.gs` (Apps Script).

> **Legal note.** The compliance figures below come from the Karnataka RERA formats (model allotment letter and the Karnataka Agreement for Sale proforma) and the RERA Act, 2016. Your **registered Agreement for Sale and allotment letter override any default here**. Have your advocate and CA confirm the settings before go-live. Every figure is a setting, not hard-coded.

---

## 0. Quick audit: what exists today

| Request | Status in current code | Where |
|---|---|---|
| Demand letters | **Exists** (5 Nov). Raised per demand call, coded DL-001…, printable A4 with `DocHeader`, part payments tracked. Wording is generic; one flat per letter. | `modules/crm/Payments.jsx` (`RaiseLetters`, `DemandLetters`, `DemandLetter`), `lib/calc.js` |
| Edit payment logs | **Missing.** Payments can only be created. The server already reads the old record (`before` in `push_`) but does nothing with it for payments. | `PaymentForm.jsx`, `Code.gs` `push_`, `afterSave_` |
| Admin alert on payment edit | **Missing.** | `Code.gs` `notify_`, `notifyAdmins_`, `mail_` |
| Cancellation | **Partly exists.** One step, free-typed deduction, refund task, refund record, confirmation e-mail. No RERA caps, no approval, no document checklist, no bank-loan handling, open demand letters stay open. | `modules/crm/BookingChanges.jsx` |
| Payment slabs synced to construction | **Partly exists.** Plans in Settings, construction stages (`clpStages`), demand calls. Demand is one **project-wide** cumulative % for every client; client plan, booking date and agreement date are ignored. No interest on late payment. | `lib/calc.js` `deriveCrm`, `seed/ops.js`, `Inventory.jsx` `Construction` |
| Go back that keeps drafts | **Partly exists.** `Page` has a back link (`nav(-1)`); all form state is `useState`, lost on unmount. No drafts. | `components/ui.jsx`, every form |
| Notification opens the exact client | **Missing.** `Bell.openN` sends any link not starting with `#` to `/crm/interactions`. Follow-ups are stored as `i:<id>`, client forms as `b:<bookingId>`. | `components/Layout.jsx` ~line 203 |
| Reset Shruthadev's authenticator | The in-app reset needs **another admin**. With no one else present, use the Apps Script route (6A). | `Code.gs` `setPassword_` |
| Alternate sign-in | **Missing.** | `Login.jsx`, `store.jsx` `login`, `Code.gs` `login_` |
| Cyril as Sales Lead | Data change (title only). | `seed/ops.js`, `Code.gs` `DEFAULT_USERS`, live Users sheet |

**Backend version.** Sections 1, 2, 3 and 6B change `Code.gs`. Bump `VERSION` in `Code.gs` to `3.6.0` and `NEEDS_BACKEND` in `lib/store.jsx` to `3.6.0`.

**Build and deploy** (unchanged): `cd source && npm install && npm run build`, then `node ../tools/finish-site.mjs` (or `.github/workflows/pages.yml`). Paste the new `Code.gs` in Apps Script → Deploy → Manage deployments → Edit → New version.

---

## 1. Demand letter, built from the proposed draft

### 1.1 Problems in the draft to fix before it becomes the template
1. **It asks for the whole balance.** "You are requested to remit the Balance Outstanding amount within 15 Days" points at ₹2,31,75,000, which is the full unpaid consideration, not the instalment. A construction-linked demand must ask only for the instalment due (plus any earlier arrears). Change to "remit the **Amount demanded under this notice**".
2. **The instalment is blank** ("[insert the instalment amount actually due…]"). Accord fills it from the client's schedule (section 3B).
3. **"as stated" / "is stated to cover"** weakens the letter. State the milestone from the plan ("Completion of slab of the 21st floor") and cite the architect or engineer's completion certificate number and date for that stage.
4. **Due date "within 15 days from the date of receipt"** cannot be tracked. Print a **fixed due date** (letter date + 15 days) and keep the 15-day wording.
5. **Interest clause has no rate.** Add the rate and the start date (see 3C).
6. **Two flats, one letter** (2504 and 2505). Accord makes one letter per flat. Add a combined letter per client (1.4 step 6).
7. **Bank account.** Confirm the SBI account 42408044068 is the project's designated RERA collection account (RERA Act section 4(2)(l)(D): 70% of collections go to a separate project account). Print that account only.
8. **Placeholders**: CIN, registered office, e-mail, phone, RERA registration no., contact person, direct phone. These go into Settings once, not into each letter.
9. **Missing lines** worth adding: GST shown separately, TDS 194-IA note, receipts so far, earlier unpaid demands.

### 1.2 Letter structure (what the template prints)
Header (company block from Settings, same `DocHeader` as receipts)
- YAMUNA HOMES AND DESIGN PVT. LTD. · Mangalore, Karnataka
- CIN {cin} · Registered office {regOffice} · {email} · {phone}

Reference table (2 × 2, like the draft)
- Demand Letter No. {letterNo} · Date {date}
- Project: Yamuna Sky City, Kulai, Mangalore · Karnataka RERA Reg. No. {reraNo}

Addressee: To, {title} {name}{ & coapp} · {address}

**Subject:** Demand for construction-linked instalment in respect of Flat No(s). {units} · Yamuna Sky City, Kulai, Mangalore

**Reference:** Agreement for Sale dated {agreementDate} (or Booking Application Form dated {bookingDate} when no agreement yet) · Client ID {clientId} · Booking ID {bookingId}

Body (from the draft, corrected):
> With reference to the Agreement for Sale executed between you and Yamuna Homes and Design Pvt. Ltd. (the "Promoter") in respect of the above apartment(s), we request payment of the instalment that has become due on completion of the construction milestone **{stage}**, as certified by {certifiedBy} on {certDate} (certificate {certNo}).

**Payment summary** table:
| Description | Amount (INR) |
|---|---|
| Total consideration (agreement value less adjustments) | {basis} |
| Instalment for this milestone ({pct}%) | {base} |
| GST ({gstPct}%) | {gst} |
| **Amount demanded under this notice** | **{amount}** |
| Earlier demands still unpaid (if any) | {arrears} |
| Interest on late payment of earlier demands (if any) | {interest} |
| **Total payable by {dueDate}** | **{payable}** |
| Received to date (all receipts) | {received} |
| Balance of consideration after this demand | {balanceAfter} |

Then, from the draft:
> You are requested to remit the amount payable **on or before {dueDate}** (within 15 days of this letter) by bank transfer / RTGS / NEFT or demand draft in favour of "Yamuna Homes and Design Pvt. Ltd." Please quote **{letterNo}** and the flat number(s) in the payment narration and share the transaction reference with us after remittance.

- Bank details table (from Settings: beneficiary, account, bank, branch, IFSC).
- TDS line when consideration is ₹50 lakh or more: "Where applicable, deduct TDS at 1% under section 194-IA and share Form 16B."
- Compliance paragraph (from the draft, with the rate added):
> This demand is made in accordance with the payment obligations and timelines recorded in the Agreement for Sale and section 19(6) of the Real Estate (Regulation and Development) Act, 2016, read with the Karnataka Real Estate (Regulation and Development) Rules, 2017. Amounts not paid by the due date carry interest under section 19(7) at the rate prescribed under the Rules (currently {interestRate}% per annum, being State Bank of India's highest MCLR plus 2%), calculated from the due date to the date of payment.
- "If you have already remitted the amount demanded, kindly disregard this request to the extent of the payment received."
- Contact: "{contactName}, {contactPhone}, crm@yamunaskycity.com"
- Thanking you, Yours faithfully, For Yamuna Homes and Design Pvt. Ltd., Authorised Signatory ({signatoryName}, {signatoryDesignation})
- Footer: "Computer-generated demand letter from Accord."

### 1.3 Settings to add (`settings.company` and `settings.demandLetter`)
- `company`: `cin`, `regOffice`, `reraNo`, `crmEmail`, and the RERA collection account: `beneficiary`, `bank`, `account`, `ifsc`, `branch` (the last four exist already).
- `demandLetter`: `subject`, `body`, `payNote`, `complianceNote`, `disregardNote`, `contactName`, `contactPhone`, `signatoryName`, `signatoryDesignation`, all with `{placeholders}`.
- `interestRate` (number, % p.a.) with `interestRateFrom` (date) and a history list, because SBI's MCLR changes; interest uses the rate in force on each day.
- Editor card in `Admin.jsx` → `AdminSettings`, next to the receipt notes.
- Helper in `lib/format.js`: `fillTemplate(str, map)`.

### 1.4 Code steps
1. `Payments.jsx` → `DemandLetter()`: replace the `<div className="doc">` body with the structure in 1.2. Use `DocHeader`, the key-value `<table>`, `.sec`, `.words` (amount in words of `{payable}`), `.sign`, `.foot`, so it matches receipts and cost sheets.
2. Values come from the letter record plus `clientSchedule` (3B): `arrears` = unpaid balance of earlier firm rows, `interest` = `lateInterest()` (3C).
3. `demandLetters` record: add `certNo`, `certDate`, `certifiedBy` (copied from the construction stage), `units` (array, for combined letters), `rowKey`, `sentAt`, `sentVia`, `ackAt`.
4. `clpStages`: add `certNo`, `certDate`, `certifiedBy`, `certUrl` (upload the architect's certificate in `Inventory.jsx` → `Construction`). **Raising letters for a stage is blocked until the certificate is attached.**
5. Bulk print: route `crm/payments/demand-letters/print?call=DC-02` modelled on `BulkReceipts` (`.page-break`).
6. Combined letter: on Client 360, when one client holds more than one flat with letters for the same stage, a **Combined letter** button prints one letter listing each flat's instalment and a total.
7. Sending: e-mail (`sendEmail`) and WhatsApp buttons; log an interaction (`purpose: 'Demand letter'`); stamp `sentAt` and `sentVia`. The due date counts from the **letter date**, so send on the same day.
8. Bank-loan clients: print "Copy to: {loanBank}" and send the copy to the bank contact (the server already notifies them in `afterSave_`).

---

## 2. Editable payment logs: apply straight away, notify admins

### Rules
- Who can edit: admin and finance (`canRecordPayment`).
- Edits **apply immediately**. No approval step.
- **Never change** `id` or `receiptNo`. Never delete. To reverse, set `counted` to `No` with a reason.
- **Reason is mandatory.**
- Every edit is kept as a history row, shown on the receipt and in a change log.
- Every edit notifies **all admins** and the editor's manager (`reportsTo`), in the bell and by **e-mail at once**. Changes to amount, TDS, flat, counted or demand letter are marked **HIGH**.
- An edited receipt prints "Revised · rev N · date" under the title.

### Front end
1. **`PaymentForm.jsx`**: add an `edit` prop.
   - On open with `edit`: `setV({ ...edit, unit: String(edit.unit) })`.
   - Extra field when editing: `{ k: 'editReason', l: 'Reason for this change', t: 'textarea', req: true, span: 'all' }`.
   - `receiptNo` and `ledgerOnly` read-only.
   - Before saving, show the diff: "Amount ₹5,00,000 → ₹5,50,000". Fields compared: `date, amount, tds, unit, payer, towards, mode, instrument, instrumentDate, bank, counted, demandLetter, thirdParty, realisation, note`.
   - Save: keep `id` and `receiptNo`, `rev: (edit.rev || 0) + 1`, `lastEditedBy`, `lastEditedAt`, `editReason`, `upsert('payments', rec, { action: 'payment edited' })`, then `notify('Saved. Admins have been told.')`.
   - Local mode only (no backend): also write `paymentEdits` and `pushNote` to each admin. With the backend on, the server does both.
2. **Edit buttons**: `Receipt()` toolbar (`Edit entry`), Client 360 payments table (beside `Receipt`), and an "Edited" badge in the Ledger tab when `p.rev > 0`.
3. **`ReceiptDoc`**: "Revised · rev {p.rev} · {d(p.lastEditedAt)}" under the title; "Change history" on screen only (`no-print`).
4. **Change log**: route `admin/payment-edits` (gated `admin`), `DataTable` of `paymentEdits` with filters by person, flat, field, HIGH. Home card for admins: "Payment edits in the last 7 days".
5. `lib/seed.js`: add `'paymentEdits'` to `COLLECTIONS`. `lib/perms.js`: readable by admin and finance; written only by the system.

### Backend (`Code.gs`)
1. Add `'paymentEdits'` to `COLLECTIONS`, schema (`id, at, by, paymentId, receiptNo, unit, client, reason, changes, high`), write rights `paymentEdits:['admin']`.
2. In `push_`, for `c === 'payments'` with a `before` record: refuse without `rec.editReason` (`refused.push('payments (a reason is needed to edit)')`); force `rec.id = before.id` and `rec.receiptNo = before.receiptNo`.
3. In `afterSave_`:
   ```js
   if (c === 'payments' && before) {
     var F = ['date','amount','tds','unit','payer','towards','mode','instrument','instrumentDate','bank','counted','demandLetter','thirdParty','realisation','note'];
     var ch = F.filter(function (k) { return String(before[k] == null ? '' : before[k]) !== String(rec[k] == null ? '' : rec[k]); })
               .map(function (k) { return { field: k, from: before[k], to: rec[k] }; });
     if (ch.length) {
       var high = ch.some(function (x) { return ['amount','tds','unit','counted','demandLetter'].indexOf(x.field) >= 0; });
       var cli = read_('clients').filter(function (x) { return String(x.unit) === String(rec.unit); })[0] || {};
       upsert_('paymentEdits', { id: 'PE-' + Date.now().toString(36), at: now_(), by: u.name, paymentId: rec.id, receiptNo: rec.receiptNo,
         unit: rec.unit, client: cli.name || '', reason: rec.editReason || '', changes: JSON.stringify(ch), high: high ? 'Yes' : 'No' });
       var txt = ch.map(function (x) { return x.field + ': ' + x.from + ' → ' + x.to; }).join(' · ');
       var title = (high ? 'HIGH · ' : '') + 'Payment edited · ' + (rec.receiptNo || rec.id) + ' · flat ' + rec.unit;
       var body = u.name + ' changed ' + txt + '. Reason: ' + (rec.editReason || '');
       var users = read_('users'), to = {};
       users.filter(function (x) { return x.appRole === 'admin' && x.active !== 'No'; }).forEach(function (x) { to[x.name] = x; });
       if (u.reportsTo) users.filter(function (x) { return x.name === u.reportsTo; }).forEach(function (x) { to[x.name] = x; });
       delete to[u.name];
       Object.keys(to).forEach(function (n) {
         notify_(n, 'paymentEdit', title, body, '#/crm/payments/receipt/' + rec.id, now_(), u.name);
         if (to[n].email) try { mail_({ to: to[n].email, subject: 'Accord · ' + title, title: title, text: body, fromName: 'Accord', footer: 'Accord by OuTSDe · payment change alert' }); } catch (e) { }
       });
     }
   }
   ```
4. When `TransferBooking` moves payments to a new flat, write `paymentEdits` with reason "Booking moved to flat X" and `high: 'No'`, so transfers are not read as tampering.

---

## 3. Construction-linked payments, interest, and cancellation (RERA procedure)

### 3A. The rules Accord must follow (Karnataka)

| Rule | Source | What Accord does |
|---|---|---|
| Booking amount up to 5% of sale consideration | Karnataka Agreement for Sale proforma, Schedule C note A | Cost sheet and booking form block a booking row above 5% (your plans use 5%) |
| No more than 10% of cost before a **registered** Agreement for Sale | RERA Act section 13(1) | Demand letters for any row that takes total demanded above 10% are **blocked** until `agreement = 'Registered'` (today it is only a health flag, `reraFlag`) |
| Allottee pays on written demand, within the time in the agreement | Act section 19(6); AFS clause 3 | Every stage payment is due only after a demand letter; due date printed on it |
| Interest on late payment at the prescribed rate | Act section 19(7); K-RERA model allotment letter clause 7: SBI highest MCLR + 2% | Interest calculated from due date to payment date (3C) |
| Payments linked to construction milestones | AFS Schedule C | Plan rows map to construction stages; stage needs a completion certificate before letters go out |
| Missed stage instalment: 15-day notice before cancelling | K-RERA model allotment letter | Default notice step (3C) |
| Default on consecutive demands despite notice → promoter may cancel; at least **30 days'** prior intimation; refund less booking amount and interest | AFS clause 9.3 | Developer-side cancellation path (3D) |
| Allottee withdraws (no fault of promoter) after agreement → forfeit booking amount, return balance within **60 days** | AFS clause 7.5 | Cancellation calculator, stage B |
| Allottee cancels at allotment-letter stage → deduction Nil (0 to 15 days), 1% (16 to 30), 1.5% (31 to 60), 2% (61+) of unit cost; refund within **45 days** without interest | K-RERA model allotment letter clause 8 | Cancellation calculator, stage A |
| Promoter fails (delay, inability to give possession) → refund with interest within 60 days | Act section 18; AFS clause 7.6 | Stage D, rare |

Number of consecutive demands and months of default in AFS clause 9.3 are **blanks in the template**. Take them from your registered agreement and enter them in Settings.

### 3B. Per-client schedule synced to construction

**Your rule:** a stage payment falls due when the construction stage is complete; a demand letter is then sent; the payment is due **as per the demand letter** (15 days from its date). For self-funded clients the agreement instalment is standard (40%) and stage instalments follow the stages.

#### Model
1. **Plan rows get a trigger** (`settings.plans`, `seed/ops.js`, Admin plan editor lines ~107 to 111: add a Trigger select and a stage select):
   ```js
   { key: 'P1', stage: 'On booking', pct: 0.05, trigger: 'booking' }
   { key: 'P2', stage: 'On agreement', pct: 0.40, trigger: 'agreement' }
   { key: 'P3', stage: 'On completion of 30th floor', pct: 0.12, trigger: 'stage', clpStage: '<clpStages id>' }
   { key: 'P4', stage: 'On completion of 60th floor', pct: 0.25, trigger: 'stage', clpStage: '<id>' }
   { key: 'P5', stage: 'On handover', pct: 0.18, trigger: 'handover' }
   ```
2. **Each client's plan**: `c.plan` (fallback `c.funding`). Optional `c.customPlan` (same shape, `pct` or `fixed` ₹) for negotiated deals; admin or finance edits it on Client 360; must total 100%.
3. **Settings**: `dueDays` (exists, 15), `agreementWithinDays` (from your allotment letter), `catchUpOn: 'agreement'` (fixed; see why below), `interestRate`, `interestGraceDays` (0 by default), `reminderDaysBefore` (5), `noticeAfterDays` (15), `noticePeriodDays` (15), `defaultDemands` and `defaultMonths` (from AFS clause 9.3), `terminationNoticeDays` (30).
4. **How each row becomes due**

| Row | Becomes demandable | Due date |
|---|---|---|
| Booking | Booking date | As per booking form / allotment letter |
| Agreement | Agreement executed and registered | Agreement date (or as the agreement says) |
| Construction stage | Stage marked Completed **with certificate** | Demand letter date + `dueDays` (15) |
| Handover | Occupancy certificate and possession offer | Letter date + `dueDays` |

   **Late bookers (catch-up).** A stage already completed before the client booked is demanded **at agreement**, not at booking, because section 13(1) caps collection at 10% before a registered agreement. Example: books after the 30th floor; at agreement owes 40% + 12% = 52% in one demand.
5. **New function in `lib/calc.js`** (replaces the single project-wide %):
   ```js
   export function clientSchedule(c, s, clpStages, letters, payments) {
     const rows = c.customPlan?.length ? c.customPlan : (s.plans[c.plan] || s.plans[c.funding] || s.plans.Self)
     const gst = n(s.gstDemand ?? 0.05), basis = n(c.tc) - n(c.adjustment)
     const stage = Object.fromEntries((clpStages || []).map((x) => [x.id, x]))
     const myLetters = letters.filter((L) => L.bookingId === c.bookingId && L.status !== 'Withdrawn')
     let left = basis
     const out = rows.map((r, i) => {
       const base = i === rows.length - 1 ? left : Math.round(r.fixed ? n(r.fixed) : basis * n(r.pct)); left -= base
       let ready = null
       if (r.trigger === 'booking') ready = c.bookingDate
       else if (r.trigger === 'agreement') ready = c.agreement === 'Registered' ? c.agreementDate : null
       else if (r.trigger === 'stage') { const st = stage[r.clpStage]; ready = st?.status === 'Completed' && st.certNo ? st.actual : null }
       else if (r.trigger === 'handover') ready = c.possessionOfferDate || null
       // catch-up: a stage finished before booking waits for the registered agreement (section 13)
       if (r.trigger === 'stage' && ready && c.bookingDate && ready < c.bookingDate) ready = c.agreement === 'Registered' ? c.agreementDate : null
       const L = myLetters.find((x) => x.rowKey === r.key)
       const due = r.trigger === 'booking' ? c.bookingDate : r.trigger === 'agreement' ? ready : L?.dueDate || null
       const projected = r.trigger === 'stage' ? stage[r.clpStage]?.planned : null
       return { ...r, base, gst: Math.round(base * gst), amount: Math.round(base * (1 + gst)), ready, letter: L?.id || null, due, projected }
     })
     // receipts (counted + TDS) settle the oldest instalment first
     let pool = payments.filter((p) => p.counted === 'Yes' && p.ledgerOnly !== 'Yes').reduce((a, p) => a + n(p.amount) + n(p.tds), 0)
     return out.map((r) => {
       const paid = Math.min(r.amount, pool); pool -= paid
       const state = paid >= r.amount - 0.5 ? 'Paid'
         : !r.ready ? 'Upcoming'
         : r.trigger === 'stage' && !r.letter ? 'Stage complete, letter not sent'
         : r.due && r.due < today() ? (paid ? 'Part paid, overdue' : 'Overdue')
         : paid ? 'Part paid' : 'Due'
       return { ...r, paid, balance: r.amount - paid, state }
     })
   }
   ```
6. **`deriveCrm`**: `schedule = clientSchedule(...)`; `demand` = sum of rows with a due date; `outstanding = demand − received`; `firstUnpaid`, `due`, `overdue`, `age` from the first row with a balance and a due date; `nextDemand` = first `Upcoming` row with its `projected` date. Health: add Red "Stage complete, letter not sent for 7+ days" (finance's queue).
7. **Raising letters follows the schedule** (`RaiseLetters`): for a completed and certified stage, one letter per client whose schedule row has that `clpStage`, no letter yet, and passes the section 13 check. Letter `amount` = row amount; `credit` = row `paid` at raising; `rowKey` = row key so no row gets two letters. Add **Raise catch-up letters** for rows that became demandable at agreement.
8. **Screens**
   - Client 360 → **Payment schedule** card: stage, %, amount, GST, letter, due, paid, balance, state, and a timeline beside the construction stages. Sales see state and dates only.
   - Payments → **Collections forecast** tab: by month, firm dues plus projected stage dues (from `clpStages.planned`), split Self and Bank loan.
   - Inventory → Construction: when a stage is completed, "N clients now owe ₹X. Attach the certificate and raise letters."

#### Worked example (Self plan, GST 5%, consideration ₹1,20,00,000)
| Stage | % | Base | GST | Instalment |
|---|---|---|---|---|
| On booking | 5% | 6,00,000 | 30,000 | 6,30,000 |
| On agreement | 40% | 48,00,000 | 2,40,000 | 50,40,000 |
| 30th floor | 12% | 14,40,000 | 72,000 | 15,12,000 |
| 60th floor | 25% | 30,00,000 | 1,50,000 | 31,50,000 |
| Handover | 18% | 21,60,000 | 1,08,000 | 22,68,000 |
| **Total** | 100% | 1,20,00,000 | 6,00,000 | **1,26,00,000** |

30th floor certified on 1 Dec, letter dated 2 Dec → due 17 Dec. A bank-loan client with the same consideration gets 5% and 25% instead.

### 3C. Payment window, reminders, interest and notices (all clients)

**Standards found.** The RERA Act and the Karnataka agreement proforma leave the payment period to the agreement ("on written demand… within the stipulated time"). The K-RERA model allotment letter uses a **15-day notice** for a missed stage instalment. Your draft and Accord already use **15 days** from the demand. Keep 15 days as the window; if your registered agreement says otherwise, the agreement wins.

| Day (from letter date) | Event | Accord action |
|---|---|---|
| 0 | Letter issued and sent | `sentAt` stamped; e-mail + WhatsApp; interaction logged |
| 10 | Reminder (`reminderDaysBefore` = 5) | Template TP-02 to client; task to relationship owner |
| 15 | **Due date** | Reminder on the day |
| 16 onward | Overdue | Interest runs from the due date at `interestRate` (SBI highest MCLR + 2%), simple, per day. Optional `interestGraceDays` waiver is a business choice, not a rule (default 0) |
| 30 (due + 15) | **Default notice**: pay within 15 days with interest | New template "Notice of default"; finance approves before sending; logged |
| Next demand also unpaid after notice | Event of default under AFS clause 9.3 | Client flagged Red "Default: termination may be considered"; admin decides |
| Default continues beyond the months in your agreement | **Termination intimation**, at least 30 days before cancelling | Starts developer-side cancellation (3D, path C) |

**Interest function** (`lib/calc.js`):
```js
// simple interest per day on each overdue instalment, rate history from Settings (rate changes with SBI MCLR)
export function lateInterest(row, payments, rates, asOf = today(), grace = 0) {
  if (!row.due) return 0
  const start = addDays(row.due, grace)
  // walk day by day over the unpaid part; payments reduce the principal on the day received
  let owed = row.amount, total = 0, d = start
  const paid = payments.filter((p) => p.demandLetter === row.letter && p.counted === 'Yes').sort((a, b) => String(a.date).localeCompare(String(b.date)))
  while (d < asOf && owed > 0.5) {
    paid.filter((p) => p.date === d).forEach((p) => { owed -= n(p.amount) + n(p.tds) })
    const r = [...rates].reverse().find((x) => x.from <= d)?.rate || 0
    total += Math.max(0, owed) * (r / 100) / 365
    d = addDays(d, 1)
  }
  return Math.round(total)
}
```
- Interest is shown on the next letter and on the payment summary as a separate line. Collect it as its own receipt line `towards: 'Interest on delayed payment'` (add the option to the "Payment towards" list). Admin can waive with a reason (logged like a payment edit).
- **Bank-loan clients**: same window. Add status "Disbursement requested from bank" with the bank's reference; reminders to the client pause, the letter copy goes to the bank, interest still follows the agreement.

### 3D. Cancellation protocol

#### Statuses
`Cancellation requested` → `Retention` → `Cancellation approved` → `Under cancellation` (refund pending, in `NON_BILLED`) → `Cancelled`. Plus `Request withdrawn` (back to Active).

#### Which deduction applies (calculator caps the deduction; admin may waive, never exceed)
| Path | When | Maximum deduction | Refund within |
|---|---|---|---|
| A. Allottee cancels before agreement | Allotment letter stage | Nil within 15 days of allotment letter; 1% of unit cost 16 to 30 days; 1.5% 31 to 60; 2% after 61 days | 45 days of request, no interest |
| B. Allottee withdraws after agreement | No fault of promoter | Booking amount (max 5% of consideration) | 60 days |
| C. Promoter cancels for default | Path in 3C completed, 30 days' intimation given | Booking amount + interest owed | As per agreement (use 60 days) |
| D. Promoter at fault (section 18) | Delay or failure to give possession | **Nil**; refund with interest at the prescribed rate | 60 days |

Late refund (beyond the period) carries interest at SBI highest MCLR + 2%; Accord shows a Red flag when the refund due date passes.

#### Items that are not the developer's to keep or give back
- **TDS (194-IA)**: already paid to the government; not refunded by the developer. The client claims it in their return. Deduct it from the cash refund and print it as "TDS deposited on your PAN".
- **GST**: the developer can issue a credit note and refund GST only within the section 34 CGST time limit for that invoice; after that, the buyer applies for a GST refund through the government process. Setting `gstRefundMode`: `Credit note` / `Buyer to claim`. **Confirm per case with your CA.**
- **Brokerage paid to a channel partner**: the Karnataka formats allow forfeiting only the booking amount (or the allotment-stage %) plus interest owed. Do **not** deduct brokerage from the client by default (`brokerageDeducted: No`). Recover it from the partner instead (flag in `partners`).
- **Stamp duty and registration** on a registered agreement: paid to the government by the client; a registered **cancellation deed** is needed. Advocate to confirm any refund route.

#### Steps the app enforces (rewrite `CancelBooking` in `BookingChanges.jsx` as a stepper)
1. **Request**: initiated by (client / developer), date, channel, reason; upload the written request to `Clients/<flat> <name>/06 Cancellation`. Required for client requests.
2. **Retention** (client requests only): task to the relationship owner within `coolingDays` (default 3): one call, offer a move to another flat (`TransferBooking`) or a revised schedule. Outcome logged. May end as `Request withdrawn`.
3. **Calculation** (`cancellationCalc(c, settings, payments)` in `calc.js`): picks the path (A to D) from the dates and initiator, shows received, deduction (capped), interest owed (path C), TDS, GST treatment, refund, refund due date. Each line can be waived by an admin with a reason.
4. **Approval**: an admin approves. Two admins when the refund or the waiver is above `approvalAbove`. Notification links to `#/crm/clients/<bookingId>`.
5. **Bank-loan clients**: refund goes first to the lender up to the loan outstanding (tripartite agreement); "Bank NOC / loan closure letter" must be ticked before release.
6. **Documents** (new `META.docTypes` group "Cancellation"): written request, cancellation letter issued, client acknowledgement, original allotment letter and receipts returned, cancellation deed registered (only if the agreement was registered), bank NOC (loan only).
7. **Refund**: `CancellationCard` records **tranches** (`refunds: [{ date, mode, ref, amount }]`) against `refundDueDate`; overdue shows on Home for finance.
8. **Release**: when the refund is complete (or admin "Release now"): status `Cancelled`; open demand letters `Withdrawn`; open follow-ups closed; parking freed; partner commission flagged.

New `clients` fields (schema in `Code.gs`; amounts also in `MONEY_FIELDS`): `allotmentDate, cancelPath, cancelInitiatedBy, cancelRequestUrl, retentionOutcome, cancelCalc (JSON), waivers (JSON), approvedBy, approvedBy2, refunds (JSON), refundDueDate, releasedAt, defaultNoticeAt, terminationNoticeAt`.

### Safe rollout for section 3
1. Add `clientSchedule` and `lateInterest` and a hidden **Admin → Data → Schedule check** report: old demand vs new demand per client. Do not switch `deriveCrm` until finance has reviewed it.
2. Fill `bookingDate`, `allotmentDate`, `agreementDate` and `agreement` status for all 47 bookings (the report lists gaps).
3. Map plan rows to construction stages; attach completion certificates to completed stages.
4. Enter the interest rate and its start date.
5. Switch `deriveCrm`. Then the new letter template.

---

## 4. Go-back button and saved drafts

Drafts save **automatically while typing**, per person and per form, so going back (top-bar button, browser back, closing a modal) never loses work. A **Drafts** menu lists them.

1. **New file `lib/drafts.js`:**
   ```js
   import { useEffect, useRef, useState } from 'react'
   const K = (uid, key) => `accord.draft.${uid}.${key}`
   const TTL = 14 * 864e5
   export function listDrafts(uid) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)
     if (k.startsWith(`accord.draft.${uid}.`)) { const d = JSON.parse(localStorage.getItem(k)); if (Date.now() - d.at > TTL) localStorage.removeItem(k); else out.push({ key: k.split('.').slice(3).join('.'), ...d }) } } } catch (e) { /* */ } return out.sort((a, b) => b.at - a.at) }
   export function clearDraft(uid, key) { try { localStorage.removeItem(K(uid, key)) } catch (e) { /* */ } }
   // useDraft('lead:new', blank, { uid, label: 'New lead', route: '/crm/leads?draft=lead:new' })
   export function useDraft(key, initial, { uid, label, route, enabled = true }) {
     const read = () => { try { return JSON.parse(localStorage.getItem(K(uid, key)) || 'null')?.v } catch (e) { return null } }
     const [v, setV] = useState(() => (enabled && read()) || initial)
     const t = useRef(); const first = useRef(JSON.stringify(initial))
     useEffect(() => { if (!enabled || !uid) return; clearTimeout(t.current)
       t.current = setTimeout(() => { try { if (JSON.stringify(v) === first.current) localStorage.removeItem(K(uid, key))
         else localStorage.setItem(K(uid, key), JSON.stringify({ v, at: Date.now(), label, route })) } catch (e) { /* */ } }, 400) }, [v]) // eslint-disable-line
     return [v, setV, { clear: () => clearDraft(uid, key), restored: !!read() }]
   }
   ```
2. **Use `useDraft` instead of `useState`** in: `Leads.jsx` new lead (`lead:new`) and edit (`lead:edit:<id>`); `LogInteraction.jsx` (`log:<recordId>`); `CostSheet.jsx` (`cost:<unit or lead>`); `Booking.jsx` (`booking:<bookingId>`); `Clients.jsx` edit (`client:edit:<id>`); `PaymentForm.jsx` (`pay:new:<unit>`, `pay:edit:<id>`); `BookingChanges.jsx` (`cancel:<bookingId>`); `People.jsx` task (`task:<id or new>`). Call `clear()` after a successful save.
3. **Modals**: **Cancel** becomes **Close (draft kept)**, plus a **Discard draft** link. When restored: "Draft from 3:42 pm restored."
4. **Reopen by link**: pages with modal forms read `?draft=<key>` and open the modal on mount.
5. **Top-bar Go back** in `components/Layout.jsx`, before the brand (~line 87):
   ```jsx
   const canBack = (window.history.state?.idx ?? 0) > 0
   <button type="button" className="icon-btn" aria-label="Go back" onClick={() => (canBack ? nav(-1) : nav('/'))}>←</button>
   ```
   Hidden on `/`. Existing `Page back` links stay and now keep drafts too.
6. **Drafts menu** next to the bell: count from `listDrafts(user.id)`; each item shows label, time, **Open** (`nav(route)`), **Discard**; refresh on route change.
7. **Shared computers**: drafts stay in that browser. Add "Clear my drafts on this device" to the user menu. Optional later: a server `drafts` collection so drafts follow the person.

---

## 5. Notification opens the exact client or lead

In `components/Layout.jsx` → `Bell`, replace `openN`:
```js
const target = (n) => {
  if (n.target) return n.target.replace(/^#/, '')
  const L = n.link || ''
  if (L.startsWith('#')) return L.slice(1)
  if (L.startsWith('i:')) { const i = db.interactions.find((x) => x.id === L.slice(2)); if (i) return recordRoute(db, i.recordId) + '?focus=' + i.id }
  if (L.startsWith('b:')) return '/crm/booking/' + L.slice(2)
  return '/crm/interactions'
}
const openN = (n) => { markRead([n.id]); setOpen(false); nav(target(n)) }
```
New helper (`lib/links.js`):
```js
export function recordRoute(db, recordId) {
  if (/^YSC-L-/.test(recordId)) return '/crm/leads/' + recordId
  const c = db.clients.find((x) => x.clientId === recordId || x.bookingId === recordId || x.id === recordId)
  return c ? '/crm/clients/' + (c.bookingId || c.id) : '/crm/interactions'
}
```
- `Client360` already accepts `bookingId` or `clientId` in the URL (`Clients.jsx` line 97).
- Store the destination on the notification so it works even when the interaction is outside a person's data scope: add `target` to the `notifications` schema; set it in `Code.gs` `notifyFollowUp_` and the escalation `notify_` (~line 815), and in `LogInteraction.jsx` `pushNote` (~line 65). Keep `link: 'i:<id>'` for duplicate checks.
- `?focus=<interactionId>`: `LeadDetail` and `Client360` scroll to and highlight that interaction and open Log interaction pre-filled.
- Point other alerts at the record: "Payment received" → `#/crm/clients/<bookingId>`; complaints → `#/crm/issues?id=<issueId>`; payment edits → the receipt (section 2).
- Home follow-up list (`pages/Home.jsx` ~line 110): use `recordRoute`.

---

## 6. User data changes

### 6A. Reset Shruthadev's authenticator (no other admin present)
The in-app reset (Users and access → Reset sign-in) needs another admin to be signed in. With no one else available, reset it from **Apps Script**. This is a one-off action on the data, not a change to Accord's code.

1. Sign in to Google with the account that owns the **Accord Database** sheet (the one that deployed the web app).
2. Open the sheet → **Extensions → Apps Script**.
3. At the very bottom of `Code.gs`, paste this temporary function. Put a temporary password of your choice in place of `SetATempPass1` (8+ characters, a letter and a number):
   ```js
   function emergencyResetShruthadev() {
     var u = read_('users').filter(function (x) { return String(x.username).toLowerCase() === 'shruthadev'; })[0];
     if (!u) throw new Error('No user with username shruthadev');
     u.pwSalt = salt_(); u.pwHash = hash_(u.pwSalt, 'SetATempPass1');
     u.mustChange = 'Yes'; u.failed = 0; u.lockedUntil = '';
     u.totpSecret = ''; u.totpPending = ''; u.totpLast = ''; u.mfa = 'Not set';
     (u.devices || []).forEach(function (d) { delete d.trustHash; delete d.trustUntil; });
     upsert_('users', u);
     audit_({ name: 'Apps Script owner' }, 'users', u.id, 'emergency sign-in reset (no other admin available)');
     Logger.log('Reset done for ' + u.name);
   }
   ```
4. Pick `emergencyResetShruthadev` in the function menu → **Run** → approve if asked. The log should say "Reset done for Shruthadev". No redeploy is needed; it writes straight to the sheet.
5. **Delete the function** and save, so the password is not left in the script.
6. In Accord: username `shruthadev` → "First sign-in, or a new phone? Use the temporary password" → enter it → scan the QR with the new phone → confirm with a 6-digit code. Admins do not need device approval, so this works alone.
7. Once e-mail codes (6B) are live, this route is only needed if her e-mail is also unavailable.

If the username differs, check the **users** tab of the sheet and change `'shruthadev'` in step 3.

### 6B. Alternate sign-in: e-mailed codes
**Flow**: Login → "Don't have your phone? E-mail me a code" → 6-digit code to the e-mail on the user's record → valid 10 minutes, one use.

Backend (`Code.gs`):
1. New action in the router: `case 'emailCode': return out_(emailCode_(req));`
   ```js
   function emailCode_(req) {
     var s = read_('settings')[0] || {}; if (s.allowEmailCode !== 'Yes') throw new Error('E-mail codes are switched off');
     var u = read_('users').filter(function (x) { return String(x.username || '').toLowerCase() === String(req.username || '').trim().toLowerCase(); })[0];
     // same answer whether or not the user exists, so the form does not reveal usernames
     if (!u || u.active === 'No' || !u.email) return { ok: true };
     var c = CacheService.getScriptCache(), k = 'ecn:' + u.id, sent = Number(c.get(k) || 0);
     if (sent >= 3) throw new Error('Too many codes asked for. Try again in 15 minutes.');
     var code = String(Math.floor(100000 + Math.random() * 900000));
     c.put('ec:' + u.id, sha_(code), 600); c.put(k, String(sent + 1), 900);
     mail_({ to: u.email, subject: 'Accord sign-in code: ' + code, title: 'Your Accord sign-in code', text: code + '\n\nValid for 10 minutes. If you did not ask for it, tell an admin.', fromName: 'Accord', footer: 'Accord by OuTSDe' });
     audit_(u, 'users', u.id, 'e-mail sign-in code sent');
     return { ok: true };
   }
   ```
2. In `login_`, before the authenticator check:
   ```js
   if (req.emailCode) {
     var cc = CacheService.getScriptCache(), h = cc.get('ec:' + u.id);
     if (!h || h !== sha_(String(req.emailCode).replace(/\D/g, ''))) fail('That e-mail code is not right or has expired.');
     cc.remove('ec:' + u.id); trusted = true;   // skips the authenticator branch below
     audit_(u, 'users', u.id, 'signed in with an e-mail code');
     notifyAdmins_('signin', u.name + ' signed in with an e-mail code', 'Device: ' + (req.deviceLabel || '') + '. If this was not them, reset their sign-in.');
   }
   ```
   E-mail codes do not create a trusted device (keep `req.trust` ignored for this path).
3. Settings: `allowEmailCode` (Admin → Settings → Sign-in), default `Yes` once deployed. Optional per-person tick `emailSignIn` in `extraAccess` if you want it only for some people.

Front end:
- `pages/Login.jsx`: under the code field, link **"Don't have your phone? E-mail me a code"** → button calls `requestEmailCode(username)` → shows a 6-digit field → `login(u, { emailCode })`. Message: "If that account has an e-mail on file, a code is on its way."
- `lib/store.jsx`: `requestEmailCode = (username) => call({ action: 'emailCode', username })`; pass `emailCode` through `login`.
- Admin → Users and access: show a warning on anyone with **no e-mail on file** ("E-mail sign-in will not work"). Check that Shruthadev's and Aryan's e-mails are on file.
- Not available in local mode (needs the server to send mail).

**Caution**: this makes the account as safe as the e-mail inbox. Use work e-mails that have their own 2-step sign-in.

### 6C. Cyril → Sales Lead (title only)
Access stays `senior`.
1. **Live data**: Admin → Users and access → Cyril → **Designation** = `Sales Lead` → Save. It prints under his name on every template and document.
2. **Defaults in code** so a fresh seed matches:
   - `source/src/seed/ops.js` line 72: `Cyril: 'Sales Lead'` in `DESIGNATION_OF`.
   - `backend/Code.gs` line 46 `DEFAULT_USERS`: Cyril's `"designation": "Sales Lead"`.
   - Wording: `README.md` lines 99 and 332 and `BACKEND.md` line 98 ("Senior sales (Cyril, Khushi)") can say "Sales Lead (Cyril)".

---

## 7. Order of work
1. 6A today (Apps Script). 6C in the app.
2. 5 (notification links).
3. 4 (drafts and go back).
4. 2 (payment edits), with 6B in the same backend release (3.6.0).
5. 3B and 3C behind the Schedule check report, then switch.
6. 1 (new demand letter) on top of 3B.
7. 3D (cancellation).

## 8. Still to confirm (from your agreement and team)
1. AFS clause 9.3 blanks: how many consecutive unpaid demands, and how many months of default, before termination.
2. Booking amount figure as written in your agreement (forfeited in path B), and the period for executing the agreement after the allotment letter.
3. Is SBI A/c 42408044068 the designated RERA project collection account?
4. CIN, registered office, RERA registration number, contact person and direct phone, signatory name for the letter.
5. Current interest rate to enter (SBI highest MCLR on the date + 2%), and whether to allow any interest-free grace days.

---

## Sources
- [Karnataka Agreement for Sale proforma (K-RERA project filing)](https://img.staticmb.com/mbimages/reradoc/2025/07/22/543406586AgreementofSaleProforma_2_5.pdf): clauses 3, 7.5, 7.6, 9.3, Schedule C
- [K-RERA model form of allotment letter (project filing)](https://img.staticmb.com/mbimages/reradoc/2025/07/26/5434425AllotmentLetter_2_1.pdf): clauses 7, 8, 11
- [TaxGuru: RERA Agreement for Sale, Karnataka Rule 8A](https://taxguru.in/corporate-law/rera-agreement-sale-standardized-uniform-contract-document.html)
- [MyPropertyPoint: the 10% rule in Karnataka](https://mypropertypoint.com/blog/booking-amount-for-flat-bangalore-rera-10-percent-rule)
- [Kanakkupillai: recouping GST on a cancelled under-construction flat](https://www.kanakkupillai.com/learn/how-to-recoup-gst-paid-on-under-construction-property/)
