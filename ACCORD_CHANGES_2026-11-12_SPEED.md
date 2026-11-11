# Accord changes, 12 November (b): shared read cache and delta pulls

On top of 3.8.0 (Accord People). Backend **3.8.1**. The site still asks for 3.8.0, and either half works with the other's older version, so the order of deploy and push does not matter. Deploy this Code.gs instead of 3.8.0 when Accord People goes live.

## Why
After the first round of fixes, every pull still read every tab of the sheet: 49 tabs now, most of them empty or unchanged. Every person did this every 30 seconds, and the whole database (about 650 KB for an admin) came back each time.

## What changed
**Backend (`backend/Code.gs` 3.8.1)**
- **Shared cache between requests** (Apps Script CacheService, kept up to 6 hours). Each tab has a version token. Every write through Accord gives the tab a new token, so a tab is read from the sheet only once after each change, and every later pull by anyone uses the cached copy.
- **Hand edits.** A new `onEdit` simple trigger renews a tab's token when someone types straight into the sheet, so those edits show up on the next pull. It needs no setup. Changes made by other scripts or an import do not fire `onEdit`; they show up when the cache expires (at most 6 hours) or after any Accord write to that tab.
- **Fewer cache calls.** A pull fetches all cached tabs in two cache calls.
- **Delta pulls.** Each collection in a pull answer carries a token. The browser sends back what it has, and the server leaves out every collection whose token matches.
  - For advisors and other scoped roles, the token also covers what decides their view (users, settings, clients, leads, payments, demand calls, HR profiles and HR settings), the person and the date.
  - For admins and full-view roles, it covers only users and HR.
  - Consultants and bank contacts always get everything.

**Site (`source/src/lib/store.jsx`)**
- Sends `have` (the tokens) with each pull and keeps the tokens the server returns.
- Every 20th pull (about every 10 minutes) asks for everything, as a safety net.
- Tokens are cleared after a sign-in, after training mode, and after any refused or renumbered save, so the next pull is complete.

## Measured on a copy (fake sheet and cache)
| Pull | Spreadsheet calls | Collections sent |
|---|---|---|
| First pull of the day, cold cache | about 130 | all 48 |
| Next pull by anyone, nothing changed | 0 | 0 |
| After one interaction is saved | 1 (that tab only) | 1 |
| Advisor, after a lead is saved | 0 to 1 | all (their view depends on leads) |
| Admin, after a lead is saved | 0 to 1 | 1 |

## Checked and left alone
- Push: already one batch at a time, with buffered audit rows and one read per tab per request.
- Site bundle: 1.45 MB, about 424 KB over the network, ready in about 1.5 s. The parking data (275 KB) could be loaded only when the Parking page opens, but the gain is small.
