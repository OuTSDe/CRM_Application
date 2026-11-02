# Accord · backend

OuTSDe · Outlook for Theoreticals & Speculative Design. Accord, the Accord method and this software are the intellectual property of OuTSDe.

This note sets out how Accord stores data, signs people in, decides what each person sees, keeps time and sends reminders. It covers what is built now (phase 1, for go-live) and when to move to phase 2.

## The decision

| | Phase 1: now | Phase 2: when it outgrows phase 1 |
|---|---|---|
| Front end | GitHub Pages: one static site (`site/`), built and published by GitHub Actions | Same |
| Database | One Google Sheet, "Accord Database", one tab per collection | Supabase (Postgres) |
| API | Google Apps Script web app (`backend/Code.gs`) | Supabase API, row-level security, edge functions |
| Files | Google Drive (OuTSDe account), `My Drive / Accord_CRM_Application / Accord_Data / ...` | Supabase Storage, or keep Drive |
| Reminders | In-app, device notifications while Accord is open, e-mail through Gmail | True web push to phones (VAPID) |
| Cost | Free on the office Google account | Free tier, then about US$25/month |

**Why the Sheet first.**
- The team already works in Sheets. The database stays readable by people:
  - each tab reads like the CRM master;
  - row 1 holds the headings;
  - row 2 holds the field keys.
- Drive is already where documents live.
- It is free, so 1 November is not blocked on accounts or payments.

**Move to phase 2 if any of these happens.**
- More than about 25 people are signed in at once.
- Pulls take longer than about 3 seconds.
- You need push notifications on phones while Accord is closed.
- Apps Script quotas start to bite: 20,000 URL calls a day; 100 e-mails a day on a free account, 1,500 on Workspace.

The front end talks to the backend through a handful of calls: `login`, `enrolStart`, `enrolConfirm`, `pull`, `push`, `punch`, `upload`, `sendEmail` and `exportNow` (plus the admin calls for devices and sign-in resets). So phase 2 replaces `Code.gs`, not the app.

**The backend address.** `site/accord.config.js` carries the `/exec` URL. GitHub Actions writes it from the repository variable `ACCORD_BACKEND_URL` on every build, so every device that opens the site works on the same Drive database without any setting on the device.

## Data

**Collections.** Every collection is one tab:
- users, units, clients, leads, interactions, payments, documents and issues;
- cost sheets, parking, messages and templates;
- attendance, time events, tasks and notifications;
- viewings and brochure;
- vendors, trips, stops, quotes and samples;
- projects, rooms, packages and BOQ;
- Accord sessions and audit.

**Typed tabs.** These have named columns that match the CRM master:
- users;
- Client Master;
- Leads and Prospects;
- Interaction Log;
- Payment Ledger;
- attendance and time events;
- tasks and notifications;
- Issues Log;
- Accord sessions;
- audit.

Anything else a record carries goes into the last column, `_extra`, as JSON. Nothing is lost when the app adds a field.

**IDs.**

| Record | Format |
|---|---|
| Lead | `YSC-L-0001` |
| Client | `YSC-C-001` |
| Booking | `YSC-B-001` |
| Interaction | `I-0001` |
| Receipt | `YSC-001` |
| Task | `TK-0001` |
| Time entry | `AT-<date>-<member>` |

The interaction log works out from the ID whether a record is a lead or a client.

## Sign-in (1 Nov: authenticator app, two devices)

- **Credentials.** Username and a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator). No name list on the sign-in page.
- **Linking the app.**
  - An admin sets a temporary password (`Accord2026` for everyone at seeding). The person signs in with it once.
  - Accord shows a QR code, drawn in the browser: the secret is never sent to a QR service. They scan it and type the code.
  - The server stores the secret, and the temporary password stops working.
- **The codes.** RFC 6238: 30-second steps, 6 digits, HMAC-SHA1. One step of clock drift either way is accepted. A code is accepted once only.
- **Lost or new phone.** Users and access → **Reset sign-in** sets a new temporary password and unlinks the old app.
- **Fallback.** Settings → Sign-in → *Password* switches back to passwords (salted SHA-256, 1,000 rounds, the same scheme in the browser and on the server).
- **Lockout.** Five wrong attempts lock the account for 15 minutes.
- **Sessions (2 Nov).** The sign-in lives only in the open tab's memory. Refreshing, closing the tab or the browser, or pressing Sign out ends it: anything not yet saved is sent first, then the server deletes the token (`logout`). The next visit asks for the username and a fresh authenticator code. Being punched in is not affected: after signing in again the day continues. A token that is never closed properly expires after 6 hours in cache and 7 days in total.
- **Devices.**
  - Every browser has a stable device id, and the server records whether it is a computer or a phone.
  - A non-admin can use **one computer and one phone**. A third device is refused and an admin is notified.
  - Approving the new device releases the old one of the same kind. Admins have no limit.
  - *Approve every new device* (per person) makes even the first two wait for an admin.
- **Platforms.** After sign-in the account decides which platform opens: Accord Sales, Accord Design or Accord Vendors. Admins can switch between them.

## Who sees what

**The server enforces this.** The browser never receives what a role may not see.

| | Admin | Senior sales (Cyril, Khushi) | Client advisor (Anuradha, Medha, Yakshith) | Finance | Design (Kajal) |
|---|---|---|---|---|---|
| Rupee figures | All | Read | **None.** Payment status only (Overdue, Due this week, Paid up) and last payment date | All | – |
| Clients and Client 360 | All | All | Own clients in full; "All clients" as a directory (name, flat, status, owner) | All | Directory only, to link projects to bookings |
| Leads and cold calls | All | All | Assigned to them | – | – |
| Interaction log | All | All | Logged by them, or where they are a follow-up owner | Own | – |
| Record payment, receipts | Yes | No | No | Yes | – |
| Reminder templates | Edit | Edit | Use, read-only | Use | – |
| Performance board | Yes | Yes | No | No | No |
| Assign tasks | Anyone | Anyone | Only to themselves | Only to themselves | Only to themselves |
| Time log | Everyone; can correct | Everyone | Own | Own | Own |

**How the server enforces it.**
- `pull` filters every collection per person and strips money fields: consideration, adjustment, loan amount and payment amounts.
- When a client advisor edits their client, the server merges only the fields they are allowed to change.
- The server refuses edits to someone else's client.

## Time

**Punching in.**
- Nothing in Accord opens until the person punches in. The app sits blurred behind the punch-in card, including the e-brochure and the experience.
- They choose where they are working: office, site or remote. Remote is only offered when it is enabled for them.

**During the day.**
- States are In office, On break, Site visit and Remote.
- A break or a site visit keeps the person punched in.
- Punching out needs a confirmation that offers "Take a break instead".

**Location (1 Nov).**
- At punch-in (and when switching to Office or Site), the browser reads the location once.
- The server measures the distance to the Sky City point (Settings: `officeLat`, `officeLng`, `officeRadius`, default 300 m, allowing up to 150 m of GPS accuracy).
- Office or Site counts only inside that radius. Outside it, or with location refused, the punch is logged as **Remote** with the reason, for example *Away from Sky City (2.4 km) → logged as remote*.
- Latitude, longitude, accuracy and distance go into the time events tab.
- Until the Sky City point is set, locations are recorded but not judged.

**Server clock.**
- Every punch is stamped by the server clock, not the phone's.
- Each punch is written to two tabs:
  - **time events**: one row per punch;
  - **attendance**: one row per person per day, with worked, break and on-site minutes.
- A punch-in after the person's shift start is marked late.
- Shift times, working days and whether remote work is allowed are kept per person (Users and access).
- Only admins can correct an entry. A correction carries the reason and the admin's name.

## Follow-ups and reminders

- **Several owners.** An interaction can have several follow-up owners. For example, Anuradha and Aryan both get the reminder for a client who needs both.
- **When it is saved,** the server creates one notification per owner, due at 10:00 on the follow-up date.
- **How a reminder reaches people.**
  - **In Accord:** the bell in the top bar shows it, and the dashboard lists it under Follow-ups due.
  - **On the device:** a system notification through the service worker, if the person allowed it ("Turn on reminders on this device" in the bell). This works on laptops and Android while Accord is open in a tab or installed as an app.
  - **By e-mail:** `sendDueReminders` runs every hour from 09:00 to 19:00 and e-mails each due reminder once. `morningDigest` sends each person their list at 09:05. Run `installTriggers()` once to switch these on.
- **Tasks.** Assigning a task notifies the owner the same way.
- **What is not possible yet.** True push to a phone while Accord is closed needs a signed web-push sender. Apps Script cannot sign web-push keys. This is the first reason to move to phase 2 (a Supabase edge function or a small Cloudflare Worker).
- **WhatsApp.** Automatic WhatsApp reminders need the WhatsApp Business Cloud API, a verified business number and approved templates. Today, reminders to clients open WhatsApp with the text ready and are logged.

## Sales and Design

- A design project stores `bookingId`, `clientId` and `unitNo`. Client name, residence, type, area and floor are read from the CRM each time, not copied, so Design never holds a stale record.
- Accord experience sessions belong to a client by Client ID (`recordId`) or, before a booking, by unit reference (`YSC-2503`).
- `pull` gives the design role every session and the client directory, with no money fields.
- Availability on the tower comes from booking status only, which every role may see.

## Escalation and client forms (31 Oct)

- **Escalation.** `escalateOverdue` runs at 08:30. A follow-up still open 2 working days after its date (Settings: `escalateDays`) goes to each owner's manager (Users: `reportsTo`). Every further 2 days it goes one level higher. Each person is notified once per follow-up; the interaction keeps `escalated` with who and when.
- **Client form.** `clientForm` is public, like `apply` for vendors.
  - It takes the booking ID and that booking's `formToken`, which is set when an advisor sends the link.
  - It keeps only the listed fields and writes one row to **clientForms**.
  - It notifies the relationship owner.
  - Nothing goes onto the client record until an advisor copies it in. Sales users pull only the responses for their own bookings.

## Files (1 Nov: everything in the OuTSDe Drive)

`setup()` creates this tree in the account that runs the script (research@outsd-e.com):

```
My Drive / Accord_CRM_Application / Accord_Data /
  Accord Database                (the Google Sheet)
  Clients / <flat> <name> / 01 KYC, 02 Booking, 03 Agreement and legal, 04 Home loan, 05 Receipts,
                            06 Cost sheets, 07 Changes, 08 Possession, 09 Accord sessions, 10 Correspondence, 11 Other
  Leads / …                      Project documents / Legal, Approvals, Forms and templates, Marketing, Site progress
  Team / …   Vendors / …   Brand (logo)   Exports (Accord Database.xlsx)   Backups   Starting data
```

- **Uploads.** Every file is uploaded through `upload`, renamed `flat_clientID_document_date`, and never overwrites an existing file: a second one the same day gets `_2`. Each upload is listed in the **files** tab (who, when, which record, category, link).
- **Accord experience sessions** go to `09 Accord sessions` with their workbook.
- **Sharing with Sky City.** Settings → *shareWith* lists the e-mails. `shareDocuments()` adds them as viewers of `Clients` and `Project documents` only. The sheet, exports and backups stay private.
- **E-mail.** `sendEmail` sends from the OuTSDe account as "Yamuna Sky City", with the logo (`Brand`) inline and the advisor's address as reply-to. It is logged on the Messages tab. The quota is 100 a day on a free account and 1,500 on Workspace.

## Test entries (1 Nov)

- Records made in **demo mode** carry `_test = Yes`. They create no notifications, e-mails or escalations, and the audit marks them *(demo mode)*.
- **Admin → Data clean-up** lists them, with records that look like tests (junk names, phone 1234567890, payments under ₹100). An admin deletes them or marks them *real* (`notTest = Yes`).

## Audit and backup

- **Audit.** Every write is recorded in the audit tab: who, when, what and which record.
- **Backups.** `nightlyBackup` copies the whole sheet to `Accord_Data / Backups` at 23:00 and keeps the last 30 copies. It then writes `Accord_Data / Exports / Accord Database.xlsx`, so the data can always be opened in Excel.

## Limits to know

- **Apps Script response time.** Each call takes about 0.5 to 2 seconds. Accord stays usable because it saves on the device first and syncs:
  - pushes every 8 seconds;
  - pulls every 45 seconds.
- **Clashing edits.** Two people editing the same record in the same minute: the later save wins. The audit log shows both.
- **Keep the sheet clean.** Do not edit row 2 (the field keys) or rename tabs. Typing into normal cells is fine. Accord reads it on the next pull.
