# Accord changes, 12 November: speed and sync

Both halves changed. Redeploy `backend/Code.gs` (Deploy → Manage deployments → edit → New version, same /exec URL), then commit and push so Pages rebuilds the site. Until Code.gs is redeployed, admins see the "backend is older" warning (site now needs 3.7.0).

## What was wrong
- **A save loop.** The site checked whether an Accord experience session had changed by comparing `updatedAt`. Saving always stamps a new `updatedAt`, so the two never matched and every browser that had opened the experience re-saved its sessions again and again. The audit sheet holds 13,616 "accordSessions saved" rows for 5 sessions. That kept the browser busy redrawing and filled the push queue.
- **The audit sheet grew to about 20,000 rows in 11 days.** Every saved change read the whole audit ID column before adding one row, and every pull read all 20,000 rows (for non-admins, only to throw them away). Pushes hold the script lock while they run, so slow pushes made everyone else's pushes wait and fail.
- **Changes were sent twice.** The 8-second timer and the after-save timer could push the same queue at the same time (interactions show about two audit rows each).
- **Edits jumped back.** A pull that started before a push reached the sheet replaced the record with the old version until the next pull. Deleted records also came back for a while.
- **Background tabs kept polling,** and every pull redrew every page even when nothing had changed.

## What changed
**Site (`source/src/lib/store.jsx`)**
- Experience sessions are compared on their own time (`expAt`), and only at sign-in or when the experience tab writes.
- One push at a time, at most 40 changes per push. Saving the same record twice before it is sent sends it once.
- Changes pushed after a pull started, and deletes still waiting, are kept on screen when that pull arrives.
- Collections that did not change are left alone, so pages do not redraw on every pull.
- Pull every 30 seconds while the tab is visible. A hidden tab stops and catches up the moment it is looked at.

**Backend (`backend/Code.gs`, version 3.7.0)**
- Audit rows are appended directly. Inside a push they are written in one go at the end.
- Pull reads the audit log only for admins, and only the newest 1,000 rows.
- New `archiveAudit(days)` moves audit rows older than 14 days to an `auditArchive` tab that Accord never reads. It runs with `nightlyBackup`. **Run it once by hand after redeploying** (select `archiveAudit` in the Apps Script editor and press Run) to clear the backlog.

## Second pass: data consolidation and ID clashes

**What the data looks like (export of 11 Nov night).** About 2.5 million characters in all. The audit tab is 1.9 million of that (75%), with 19,911 rows. Everything the team actually works with comes to about 650,000 characters and is not a load: 649 interactions, 598 notifications, 294 residences, 260 parking slots, 234 leads, 161 payments and 47 clients. 21 of the 38 tabs are empty.

**Of the 19,911 audit rows:**
- 13,616 are the experience-session loop.
- Most of the rest are the same change logged two or three times (379 of 395 new interactions were pushed three times).

**Of the 598 notifications,** 551 are unread, and 182 are repeat follow-up reminders for the same person and the same interaction.

**Data loss found: 42 interactions overwritten (3 to 11 Nov).**
- **Why it happened.** Interaction numbers (I-0266…) are made in the browser from the records that person can see. Advisors see only their own, so two people could pick the same next number. The later save replaced the earlier one.
- **What is affected.** 26 of Cyril's entries, 15 of Medha's and 1 of Anuradha's. The same thing hit one lead (YSC-L-0212).
- **What can be recovered.** `Overwritten_interactions_2026-11-12.csv` lists each one. Only 5 can be restored from a nightly backup; the other 37 were replaced the same day, before the 23:00 backup ran. Those calls need to be logged again from the advisors' WhatsApp and call logs.

**Changes**
- **Backend:**
  - A new record whose number is already used gets the next free number. References to it in the same push (an interaction pointing at a new lead, a follow-up link) follow the new number, and the browser is told.
  - Each tab is now read in one call and remembered for the rest of that request, so a 40-change push no longer re-reads users, leads and notifications for every change.
  - `archiveAudit` also moves the loop rows and same-minute repeats.
  - New `tidyNotifications` moves read notifications older than 30 days and repeat follow-up reminders (keeping the newest one) to a `notificationsArchive` tab.
  - Both run nightly. **Run `consolidateOnce` once from the Apps Script editor after redeploying.**
  - Nothing is deleted. Archived rows go to tabs Accord never reads.
- **Site:**
  - New records carry a creation key (`_cid`), so the server can tell a number clash from the same record being sent twice.
  - When the server renumbers a record, the site updates it, and anything waiting to be sent that points at it, and says so in a short message ("Saved as I-0652, I-0651 was already used by a colleague").

**Expected after `consolidateOnce`:** the audit tab drops to a few thousand rows, and notifications lose about 200 rows.

## Not changed, worth knowing
- A push still sends the whole record, so if two people edit different fields of the same lead within a few seconds, the later save wins. Field-level merging is a bigger change.
- Parking has about 2,300 "saved" audit rows for 262 slots, which looks like auto-assign saving every slot. It is no longer slow, but it is worth checking that only changed slots are saved.

## Done on 12 Nov, 03:00 to 03:05
- `Code.gs` 3.7.0 pasted into the live project ("Accord backend" bound to Accord Database, script 1EdlxovoW1xq…) and deployed as **version 9** of the existing web app. The /exec URL is unchanged and answers 3.7.0.
- `restoreOverwritten` ran. I-0276 → I-0651, I-0277 → I-0652, I-0501 → I-0653, I-0533 → I-0654, I-0534 → I-0655 (Cyril 4, Medha 1). Each is marked `restoredFrom` and logged in the audit.
- `consolidateOnce` has **not** been run by hand. `archiveAudit` and `tidyNotifications` run with `nightlyBackup` at 23:00 anyway, or run `consolidateOnce` from the editor to do it now.
- Still to do: commit and push `CRM_Application` so Pages rebuilds the site.
