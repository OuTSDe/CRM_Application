# Accord

**OuTSDe · Outlook for Theoreticals & Speculative Design**

Accord is one platform for Yamuna Sky City, made of three parts.

- **Accord Sales.** The CRM and Client 360, payments and reminders, the cost sheet and booking form, the building and parking, private viewings, the e-brochure and buyer sessions.
- **Accord Design.** The Accord experience (persona, palette, configurator, the Accord), projects and BOQ tied to bookings, the residences, the design showcase and sourcing.
- **Accord Vendors.** The vendor directory, the public onboarding form, quotes and samples.

Each person signs in with a username and a code from an authenticator app. Their account decides which part opens.

Accord, the Accord method, the persona and palette system and this software are the intellectual property of OuTSDe. © 2026 OuTSDe. All rights reserved.

## Where everything lives

| What | Where |
|---|---|
| The app (this repository) | GitHub: `OuTSDe/CRM_Application`, published by GitHub Pages. It holds **no client data**. |
| All data | The OuTSDe Google Drive (research@outsd-e.com): `My Drive / Accord_CRM_Application / Accord_Data`. |
| The database | `Accord_Data / Accord Database`: a Google Sheet, one tab per collection, read like the CRM master. |
| Documents | `Accord_Data / Clients / <flat> <name> / 01 KYC … 10 Correspondence`, `Leads`, `Project documents / Legal, Approvals, Forms and templates, Marketing, Site progress`, `Team`, `Vendors`. Every upload is renamed `flat_clientID_document_date`. |
| Excel copy | `Accord_Data / Exports / Accord Database.xlsx`, rewritten every night and from Admin → Data and sync → **Export to Excel now**. |
| Backups | `Accord_Data / Backups`, a dated copy of the sheet every night (last 30). |
| Starting data | `Accord_Data / Starting data / accord-starting-data.json`: the CRM master extract, loaded once to seed the sheet. Never on GitHub. |

Nothing is stored in the Sky City account. `shareDocuments()` gives Sky City view access to `Clients` and `Project documents` only.

## What is in this repository

| Folder | What it is |
|---|---|
| `site/` | The finished app that GitHub Pages publishes. `index.html` is Accord; `experience/` is the Accord experience with its images; `accord.config.js` holds the backend address. |
| `source/` | The React source (Vite). `npm install`, then `npm run build:site` rebuilds `site/`. |
| `backend/Code.gs`, `backend/appsscript.json` | The Google Apps Script backend that reads and writes the Drive folder. |
| `experience-src/` | The built Accord experience. It is patched into `site/experience/` by `tools/patch-experience.mjs`. |
| `tools/` | The experience bridge and patch, and `finish-site.mjs` (copies the build into `site/` and writes `accord.config.js`). |
| `.github/workflows/pages.yml` (waiting in `setup/github-workflows/`) | Builds and publishes the site on every push to `main`. |
| `.github/workflows/backend.yml` | Optional: sends `backend/Code.gs` to Google on every push that changes it. |
| `BACKEND.md` | How data, sign-in, access, location, time, reminders and files work. |
| `archive/v1/` | The 29 October version (README and backend) for reference. `Accord.html` and `source/Accord_source.zip` at the top of the folder are that old version too, and can be deleted. |

## 1. Set up the Google side (once, about 20 minutes, signed in as research@outsd-e.com)

1. **Sheet and script.**
   1. In the OuTSDe Google Drive, create a Google Sheet named **Accord Database**.
   2. Open **Extensions → Apps Script**. Replace the sample code with `backend/Code.gs`.
   3. In **Project settings**, tick *Show "appsscript.json"*. Open it and replace it with `backend/appsscript.json`. Save.
2. **Run `setup`.** Pick `setup` in the function menu and press **Run**. Approve the permissions (Sheets, Drive, Gmail, external requests). It:
   - creates `Accord_CRM_Application / Accord_Data` and the folder tree above, and moves the sheet into it;
   - creates every tab;
   - switches on hourly reminders, the 08:30 escalations, the 09:05 digest and the 23:00 backup and Excel export.
3. **Deploy.** **Deploy → New deployment → Web app**. *Execute as:* **Me**. *Who has access:* **Anyone**. Copy the URL ending in `/exec`.
4. **Starting data.** `Accord_Data / Starting data / accord-starting-data.json` is already in Drive (it was put there with this version).

## 2. Publish on GitHub (once)

1. Move `setup/github-workflows/pages.yml` and `backend.yml` into `.github/workflows/` (see the note in that folder). Then push this folder to `https://github.com/OuTSDe/CRM_Application` (GitHub Desktop: *Commit to main*, then *Push origin*).
2. In the repository: **Settings → Pages → Source → GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables → New repository variable**: name `ACCORD_BACKEND_URL`, value the `/exec` URL.
4. **Actions → Publish Accord → Run workflow** (or push anything). In about two minutes the site is live at `https://outsde.github.io/CRM_Application/`.
5. Pages on a private repository needs a paid GitHub plan. The repository can be public: it contains no client data, accounts or passwords. The data stays in Drive, behind sign-in.

From then on, every push to `main` rebuilds and republishes the site. Changing the backend URL is one edit of the repository variable and a re-run.

**Optional, backend from GitHub too.** To send `backend/Code.gs` to Google on every push that changes it, set the secret `CLASPRC_JSON` and the variables `APPS_SCRIPT_ID` and `APPS_SCRIPT_DEPLOYMENT_ID` (steps at the top of `.github/workflows/backend.yml`). Until then, paste `Code.gs` by hand and use **Deploy → Manage deployments → Edit → New version**, so the URL stays the same.

## 3. First sign-in and the data (admin, once)

1. Open the site. Choose **First sign-in? Use the temporary password**. Sign in as `shruthadev` with `Accord2026`.
2. **Link your authenticator** (Google Authenticator or Microsoft Authenticator on your phone): scan the QR code, type the 6-digit code, add your e-mail.
3. Punch in. Go to **Admin → Data and sync**. Press **Test**: it shows the sheet and the `Accord_Data` folder.
4. **Load starting data**, choosing `accord-starting-data.json` from `Accord_Data / Starting data` (on this computer: `H:\My Drive\Accord_CRM_Application\Accord_Data\Starting data`). Then press **Seed the sheet**.
5. **Admin → Settings**:
   - **Sign-in, devices and punch-in location**: at the Sky City site office, press **Use this device's location as Sky City**, then **Save settings**.
   - **Brand on documents and e-mails**: upload the Yamuna Sky City logo and the header lines.
   - **Drive and sharing**: the Sky City e-mails to share documents with (then run `shareDocuments` in the script editor).
6. Everyone else: open the site on their laptop and phone, use the temporary password `Accord2026` once, and link the app. Share the temporary password privately.

**Try it without Google first.** Leave `ACCORD_BACKEND_URL` empty, or open `site/index.html` with `python -m http.server 8080` in `site/`. Data then stays in that browser only.

## 4. What changed from the 30 October meeting

- **Sign-in.** Username and password, with no list of names and no PIN. The account opens Accord Sales, Design or Vendors.
- **Punch in.**
  - Nothing opens until you punch in.
  - The states are In office, Break, Site visit and Remote.
  - Punching out asks for confirmation and offers a break instead.
  - Every punch goes to the central time log. Shifts, working days and remote permission are kept per person.
- **Client advisors** (Anuradha, Medha, Yakshith):
  - see only their own clients, leads and interaction log;
  - see no rupee figures, only payment status and the last payment date;
  - have no performance board and cannot record payments.
- **Their dashboard** shows:
  - live bookings and sales value;
  - their open leads and follow-ups;
  - client health;
  - payments coming due (names only).
- **Cyril** (Sales Lead; senior sales access) sees all leads, clients, cold calls and interactions. He also edits templates, sees performance and assigns tasks.
- **Client 360** has two tabs:
  - **My clients:** full detail;
  - **All clients:** a directory of who owns which residence and who looks after them.
- **Back button and side panel.** Every page below the dashboard has a back button. The side panel collapses.
- **Interaction log.**
  - A follow-up can have several owners, and each one gets a reminder (in Accord, on the device, by e-mail).
  - The button row is replaced by one **Sort and filter**.
- **Payments.** Recording is for finance and admins only. Client advisors see the last payment and status, and send reminders by WhatsApp or e-mail.
- **Templates** end with "Warm regards", the sender's name and designation. Only Cyril and admins can edit them.
- **Tasks.** Cyril and admins assign tasks to anyone, including finance and design. The owner is notified.
- **e-Brochure.** Now a single scrolling page with live availability. The slide view and its editor are still at *Edit content*.
- **Design showcase and the Accord experience.**
  - The experience is now part of the platform.
  - Sold and blocked residences come live from the CRM.
  - Sessions are saved to the client's file and to Drive.
  - The experience uses the burgundy accent.
- **Forms** follow the CRM master tabs:
  - numbered bands;
  - solid cells you type in;
  - dashed cells Accord works out.
- **Look.** Light and dark mode (moon or sun button in the top bar, remembered per browser) with a burgundy accent.

## 5. Sales and Design, linked (31 October)

- **Building and parking → Building → Tower and plans.** The "Choose your floor" tower and plates from the Accord experience now sit in Accord Sales.
  - Every floor from ground to 60 is a slab. Hover reads a floor; click opens its plan.
  - Residences are coloured live from the Client Master: red sold, amber blocked (to verify or under cancellation), outline available.
  - The type cards (2, 3, 4, 5 BHK) light the floors that carry that type and show how many are still available.
  - Click a residence on the plan or in the list below it for its type, area and band, then its buyer and Client 360 link, or a cost sheet and the Accord experience if it is available.
  - Client advisors see payment status only, never amounts. The old grid is still there under **Grid**.
  - Unit numbers map to the drawings as floor × 100 + tag: residence 2503 is floor 25, F3. Floor 44 is the upper level of the 43rd-floor duplexes and takes 43's status.
- **Accord Design reads the CRM.**
  - A project is tied to a booking. Picking the booking fills the client, residence, type and area from Accord Sales; they stay in step with Client 360.
  - **Client and residence** tab on each project: the plate with the residence lit, the client (no money), and every Accord experience session the buyer has been through, with **Add to the project brief**.
  - **Projects** lists buyers who have done the experience but have no project yet, with **Start project**.
  - The Design overview lists bookings in design. **Residences** in the Design side panel opens the same tower.
  - Design sees the client directory (name, residence, status, owner) and every experience session, on the device and from the server.
- **Client 360** has an **Accord Design** card: the buyer's sessions and projects, and **On the plan**, which opens the tower at their residence.

## 6. Corrections from the 31 October walkthroughs

- **Titles.** Leads, clients and the booking form have a title (Mr., Mrs., Ms., Miss, Dr., Mr. and Mrs., and so on).
  - Every message opens with it: "Dear Dr. Rashmi Shenoy". Without a title it falls back to the first name.
  - Client 360 → Sort and filter → **No title yet** lists the bookings still to fix.
- **New lead.** Mobile and e-mail are required, and both are checked. City suggests as you type. "Also came through" records secondary sources next to the primary one.
- **Record payment.** The residence is picked from a list of bookings ("1002 · Krishna Shetty Kotekar"), which also fills "Received from". The amount must be above zero and TDS cannot be negative.
- **Month by month.** Client 360 shows every month since booking:
  - green when a receipt came in;
  - amber when a demand fell due;
  - red when that demand was missed.
  Click a month to see its receipts and send a WhatsApp reminder.
- **Interaction log.**
  - **Log several at once** saves a day's calls in one go.
  - Quick follow-up dates (Tomorrow, 3 days, 1 week, 2 weeks, No follow-up) are kept. Follow-up owners still default to you and can be changed.
- **Escalation.**
  - A follow-up left open goes to the owner's manager after 2 working days, then one level higher after another 2. Sundays don't count.
  - The chain is set in Users and access → **Reports to**: client advisors → Cyril → Aryan, Khushi → Aryan, Kajal → Shruthadev.
  - The number of days is in Admin → Settings.
  - It shows on the manager's dashboard. With the shared database, the server also sends it as a notification and an e-mail each morning (`escalateOverdue`; run `installTriggers` again once).
- **Calendar.** The dashboard has a small month calendar of your follow-ups, private viewings and tasks, with today's available residences and viewings.
- **Private viewings.** Two viewings cannot overlap. Each one blocks 90 minutes (Admin → Settings), and the planner shows the slots already booked that day.
- **Cost sheet.** Car parks are capped at the entitlement for the type plus 2 extra (rate card `parkingExtraMax`).
- **Building.**
  - **White drawings** inverts the tower and plans to a white background with dark linework. This is also the default in light mode.
  - **Full screen** gives the tower and plan the whole display.
- **Booking form.**
  - **Send to client to fill** sends the client a private link (WhatsApp, e-mail or copy) to a public form.
  - Their answers come back to the top of the booking form, where the advisor copies them in and saves.
  - This needs the shared database. Each booking has its own key, and the form shows nothing from the client file.
- **Accord experience from Client 360.**
  - **Open their plan in the experience** starts the session already named, at the client's own residence, with the BOQ and costs.
  - From Inventory or for a lead it opens the pre-sales version: the design, without prices.

## 7. Corrections from the 1 November voice notes (this version)

- **All data in the OuTSDe Drive.** The backend creates `Accord_Data` in `My Drive / Accord_CRM_Application` and keeps the database, documents, Excel export and backups there. Nothing is in the Sky City account; `shareDocuments()` shares only the document folders.
- **No client data on GitHub.** The published app holds the inventory, team and lists only. Bookings, leads, payments and interactions come from the Google Sheet after sign-in. The CRM master extract sits in `Accord_Data / Starting data`, loaded once. The Pages workflow refuses to publish if a client ID gets into the site.
- **GitHub hosting with Actions.** `pages.yml` builds and publishes on every push and writes the backend address from the `ACCORD_BACKEND_URL` variable, so every device connects to the same Drive database. `backend.yml` can push `Code.gs` to Google.
- **Authenticator app instead of passwords.**
  - Sign-in is the username and a 6-digit code from Google or Microsoft Authenticator.
  - The temporary password works once, to link the app, and then stops working.
  - A lost or new phone: an admin presses **Reset sign-in** in Users and access.
  - Admins can switch back to passwords in Settings if needed.
- **Two devices per person.** One computer and one phone. A third device waits for an admin; approving it releases the old one of that kind. Admins have no limit. Users and access lists every linked device, with **Release**.
- **Location-based punch-in.**
  - Office and Site count only within the Sky City radius (300 m by default).
  - Away from Sky City, or with location refused, the punch is logged as Remote and the reason is shown.
  - Every punch stores the location, accuracy and distance in the time log.
  - The Sky City point is set once on site (Settings).
- **Mobile.** Bigger touch targets, no zoom on fields, full-width dialogs, tables that scroll, the building grid that fits a phone, and a **Camera** button on documents.
- **Documents uploaded from the app.**
  - Each checklist item takes several files.
  - Files are renamed `flat_clientID_document_date` and filed by category: `01 KYC`, `02 Booking`, `03 Agreement and legal`, `04 Home loan`, `05 Receipts`, `08 Possession`, and the rest.
  - **Any other document** has its own upload.
  - The new **Project, legal and forms** tab takes the project's own papers.
  - Every upload is listed in the **files** tab of the sheet: who, when, where.
- **Yamuna Sky City header** on the cost sheet (financial summary), payment receipt (payment slip), the new **Payment summary** (Client 360), the booking form and the new **Lead sheet**. The logo and lines are set in Settings.
- **Branded e-mails.** E-mails from Messages go out with the logo header and the advisor's signature; replies go to the advisor's own e-mail. Reminders and the digest use the same look.
- **Entries made by mistake.**
  - Before showing Accord around, turn on **Demo mode** in the user menu. What is entered then is marked as a test and sends no reminders.
  - **Admin → Data clean-up** lists those entries, plus anything that looks like a test (names like "test", phone 1234567890, ₹1 payments). You delete them or mark them as real.
- **e-Brochure by visitor and visit.**
  - It opens with **Who is visiting?** (a lead, a client or a walk-in with a title) and **First visit, Return visit or General**.
  - A first visit tells the whole story: the film, the cultural coast, engineering, design, the residences and the rest.
  - A return visit is curated: their residence or the types they asked about, plus the sections that match their interests.
  - Which sections each visit shows, the film link and the SOP text are set in the e-brochure editor.
  - The clicker or arrow keys move between sections. **Log on their file** records the presentation.
- **Building grid first.** Building and parking opens on the grid (the CRM master layout), with **Names** to show the owner in each cell. The 3D tower is one click away.
- **Team hierarchy.** Team shows the reporting chain as a diagram, drawn from *Reports to*.

## 7a. Changes from the 2 and 3 November meetings

- **Cost sheet.**
  - Seniors and admins can round the total to a clean figure. The sheet shows the exact amount and the rounding adjustment.
  - Car parks are split. The covered car parks that come with the type are included; additional ones are priced separately (rate card: *Additional car park*).
  - **Send** the sheet by WhatsApp or e-mail from the sheet itself.
  - Upload the agreed cost sheet against the client (`06 Cost sheets`).
  - Residences that are booked, under cancellation or to verify cannot be offered. The server also refuses a second booking on the same residence.
- **Training mode** replaces demo mode. Nothing entered while it is on is saved. Turning it off wipes the practice entries.
- **Time.**
  - Breaks have a reason (lunch, tea, personal) and the Time page counts them.
  - While someone is punched in at the office, their location is checked every 15 minutes; leaving marks them Remote.
  - On a site visit, a reminder comes every hour.
  - Accord signs a person out after a spell with no activity. The time is set in Settings (30 minutes by default).
- **Leads.**
  - **Also responsible** (co-owners) on leads and clients. Co-owners see the record and its follow-ups. People get a notification when a lead or client is assigned to them.
  - A lost lead needs a reason. Accord offers the closing WhatsApp message and closes the open follow-ups.
  - New views: **Missing details** and **No follow-up set**. The dashboard shows how many open leads have no follow-up.
  - **Paste an enquiry**: paste a WhatsApp or 99acres message and Accord fills in the new lead.
  - **Lead inbox**: other tools (website form, WhatsApp tool, 99acres reader, a chatbot) can post enquiries to Accord. They wait in Leads › Inbox to be accepted or rejected. The address and key are in Settings › Lead inbox.
- **Team hierarchy fits the screen** (5 Nov). The chart shrinks to fit the card, so nobody is cut off on the left or right. On a phone it becomes an indented list.
- **Backend version check** (4 Nov). If the Google backend is older than the site, admins see a banner at the top until the new `Code.gs` is deployed as a new version. A client someone cannot open now says why, and what to ask an admin for.
- **Check and delete uploads** (4 Nov).
  - On a client's Documents page, a line that has uploads shows **Files (n)**. Open it to see each file, who uploaded it and when.
  - **View** shows the file inside Accord: photos and PDFs in place, other types as a download. Nobody needs access to the OuTSDe Drive.
  - **All uploaded files** at the bottom lists everything for that booking, newest first.
  - **Delete** is for the person who uploaded the file, and for admins. The file goes to the Drive bin, where it can be recovered for 30 days. If it was the line's only file, the line goes back to *Pending*. Then upload the right one.
  - Project documents have View and Delete too.
- **Extra access per person** (4 Nov). Users and access › open a person › **Pages and permissions**.
  - Every page and power is listed with a tick box, in four groups: Sales, Team, Design and vendors, and Extra powers.
  - Ticks that come with the person's role are greyed out. Tick anything else to give that one person extra access; untick to take it back. Only admins can do this.
  - **Extra powers**: see and edit every client and lead; see amounts; record payments and issue receipts; update construction stages; edit message templates; assign to others.
  - The server applies the same ticks, so a page that is not ticked stays closed even if someone types its address.
  - Pages such as Client 360 show only the person's own clients and leads unless *See and edit every client and lead* is ticked too.
  - The users table shows **+N** for anyone with extra access.
  - **Same access as**: at the top of Pages and permissions, pick a colleague (for example Cyril). Choose **Client 360 only** or **Everything**. Accord lists what that colleague can do and this person cannot, all ticked. Untick any you don't want, press **Give**, then **Save**.
- **Follow-up time** (4 Nov). Log interaction has a follow-up time next to the follow-up date, with quick times (10 am, 12 pm, 3 pm, 5 pm, 7 pm). Log several at once has a time on each row too.
  - The reminder comes at that time: in Accord, as a phone or desktop notification, and by e-mail.
  - The time shows wherever the next follow-up is listed, and follow-ups due on the same day are sorted by time.
  - Server e-mail reminders now run every 15 minutes, between 8 am and 9 pm. Run `installTriggers` once in Apps Script after updating `Code.gs`.
  - Reminders used to fall due at 10:00 UTC (3:30 pm India time) instead of 10:00 India time. That is fixed.
- **Analytics** (Team › Analytics). One page with three tabs, each shown only to the roles it is for:
  - **Leads** (sales team and admins): leads by week or month, source, advisor and stage, how far leads get, why they were lost, and conversion. Advisors see their own leads.
  - **Finance** (finance and admins): collections by month, payment mode and purpose; outstanding by ageing; the largest amounts due; entries not counted.
  - **Overall** (admins only): bookings, booking value, collections and outstanding, the lead pipeline, interactions logged and open issues.
- **Messages.** New templates *Closing enquiry* and *Festival wishes*, and new contact purposes. In **Log several at once**, *Same for every row* fills one message into every row.
- **Client complaints.** The issue category *Client complaint* notifies the advisor's manager and the admins.
- **Settings changes are announced.** When the rate card, plans or terms change, everyone gets a notification saying what changed.
- **KYC check on upload** was added on 2 Nov and **removed on 4 Nov** at your request. Uploads go straight to Drive.
- **Payments.** **Print receipts in bulk**: pick a date range, and every receipt prints on its own A4 page.
- **Building.**
  - **Elevation** view: a white-model drawing with clickable floors.
  - **Construction** tab: each stage has a status and planned and actual dates. Finance and admin edit it.
- **Team.** Department, employment (on roll, off roll, consultant) and company for each person, with counts on the Team page.
- **User guide** in the menu (Team › User guide). It is written for each role.

## 7b. Changes from the 2 Nov 4:25 pm meeting and the 5 Nov voice notes

- **Demand letters.** Payments › Demand calls › **Raise letters** makes one letter per live booking, each with its own code (DL-001…).
  - Each letter prints as an A4 demand letter: the instalment, GST, the amount due, the due date and the bank details.
  - Money received before demand letters existed first covers the earlier stages. Anything left over is shown on the letter as already received.
  - Payments › **Demand letters** lists each letter with its amount received, balance and status (Raised, Part paid, Paid, Overdue).
- **Receipts coded to a letter.** Record payment picks the residence's open demand letter. The receipt then says either:
  - *Part payment n against demand letter DL-041 … balance due ₹…*, or
  - that this receipt completes the letter.
- **Ledger entry without a receipt.** Use it for furniture, barter and other adjustments; it is chosen automatically for *Furniture adjustment*. Payment proof stays optional.
- **Reports** (Team › Reports). One A4 report, portrait or landscape, to print or save as PDF.
  - Covers the whole sales team or one person, for today, 7 days, 30 days or chosen dates.
  - Shows hours worked, interactions with charts, new leads by name, bookings, collections, and pending follow-ups and tasks.
  - Names and residences only, never contact details. Everyone can make their own report; admins, seniors and consultants can make anyone's.
- **Consultant** user type.
  - Can open: analytics (all three tabs), reports, Client 360, payments and building availability.
  - Sees booking status, money paid and document progress.
  - Never receives phone numbers, e-mails, addresses, PAN, notes, files, messages or what was said in interactions. The server strips these before sending.
  - Changes nothing and does not punch in.
- **Bank / DSA** user type. Smitha (SBI) is set to it.
  - Sees only the clients funding with a bank loan, with their payments, demand letters and loan status.
  - Is notified of every payment and demand letter on those clients.
  - View only; does not punch in.
- **Cancelling a booking** (Client 360, seniors and admins).
  - Record the reason, date and any deduction. The booking stays on record as cancelled, outside the live figures.
  - If money was received, accounts get a notification and a refund task. Finance records the refund (date, mode, UTR), and the residence is free again.
  - Send the cancellation confirmation e-mail (new template TP-09) from the same card. Accord shows whether it was sent.
- **Moving a booking to another residence.** The old booking closes as Transferred and a new one opens on the free residence. Payments move with the client, and each keeps the residence it was first paid for.
- **Cost sheets need a lead.** A cost sheet cannot be saved until it is for a lead or client with name, mobile and e-mail, so everyone who received a cost sheet is on record.
- **Channel partners** (Leads › Channel partners).
  - Each partner has a code (CP-001…), and leads pick their partner from the list.
  - The partner page and Analytics › Leads show leads, site visits, bookings and conversion per partner.
  - Analytics also shows leads by city and by country.
- **Trusted device.** At sign-in, *Trust this device for 3 days* skips the authenticator code on that computer or phone, with **Continue as …**.
  - The number of days is set in Settings (0 turns it off).
  - *Stop trusting this device* is in the user menu. Resetting someone's sign-in removes all their trusted devices.
- **Profile picture.** User menu › Profile picture. The photo is shrunk on the device and shows in the top bar and on the team chart.

Not built yet, as agreed:
- WhatsApp, Meta and 99acres automation waits until the data is complete. The lead inbox is ready for it.
- A per-client payment slab waits for the existing cost sheets from Amit.

## 7c. Changes of 7 November (backend 3.6.0)

Paste the new `backend/Code.gs` into Apps Script and deploy a new version (Deploy → Manage deployments → Edit → New version). Until then admins see the "backend needs updating" band.

- **Demand letters in the house style** (from *Demand_Letter_Draft_-_Proposed.docx*, corrected). The letter asks for the instalment due, not the whole balance. It prints a fixed due date (letter date + 15 days), the stage certificate, earlier unpaid demands with interest, receipts to date, TDS and RERA clauses, and the bank details. One client's flats can share one **Combined letter**. Letters can be printed in bulk by date, e-mailed or sent on WhatsApp, and each send is logged. The wording is in **Admin → Settings → Demand letter wording**; CIN, registered office, CRM e-mail and the account name are in **Company**.
- **Per-client payment schedules.** Each client's own instalments come from the construction stages (Building and parking → Construction), their booking and registered agreement dates, and their demand letters. A stage counts once it is **Completed** and its **completion certificate** is attached (or marked "on file" for stages billed before Accord). Payment is due 15 days from the demand letter. Stages finished before a booking are demanded at the registered agreement, because RERA section 13 caps collection at 10% before it. A negotiated plan is set per client under Client 360 → Payment schedule → Custom plan.
  - **Payments → Schedule check** compares old and new demand for every client. Switch to per-client schedules there (or in Admin → Settings → Payment schedule) once finance agrees. Until then the old project-wide demand calls stay in force.
  - **Payments → Raise demand letters** (per-client mode) raises one letter per client for every demandable instalment.
  - **Payments → Collections forecast** shows money expected by month, from letters and planned stage dates.
  - **Interest on late payment** (SBI highest MCLR + 2%) uses the rates entered by date in Admin → Settings → Payment schedule. With no rate entered, no interest is shown.
- **Editing payment entries.** Admin and finance can edit an entry from the receipt or Client 360. A reason is required; the receipt number never changes; the receipt shows "Revised · rev N". Every change is stored in **Payments → Change log** and goes to all admins and the editor's manager in Accord and by e-mail; changes to amount, TDS, flat, counted or demand letter are marked HIGH.
- **Cancellation protocol.** Request (with the client's written request) → retention call → calculation within the Karnataka RERA caps → admin approval (two admins above the threshold) → documents and refund in parts (lender first for bank-loan clients) → release of the residence and parking. Deduction caps: before agreement, by days after the allotment letter (nil, 1%, 1.5%, 2%); after agreement, the booking amount (max 5%); developer at fault, nil. Developer-side cancellation needs the notice of default and a termination notice at least 30 days earlier. All figures are in Admin → Settings → Cancellation rules; confirm them against your Agreement for Sale.
- **Drafts and Go back.** Every form keeps what was typed as a draft on that device: new and edited leads, clients, interactions, payments, cost sheets, booking forms, cancellations and new tasks. A **Go back** arrow is in the top bar, and the **Drafts** button next to the bell reopens or discards them.
- **Notifications open the exact record.** Follow-ups and escalations open the lead or client (and highlight the interaction), client forms open the booking form, payment edits open the receipt.
- **Sign-in by e-mailed code.** "Don't have your phone? E-mail me a code" on the sign-in page sends a 6-digit code (10 minutes, one use) to the e-mail on the person's record. Admins are told each time. Switch it off in Admin → Settings → Sign-in. Make sure everyone has an e-mail in Users and access.
- **Reset a sign-in with no admin available.** Open the Accord Database sheet as its owner: menu **Accord → Reset someone's sign-in**, type the username and a temporary password.
- **Cyril** is now *Sales Lead* (title only; access unchanged). The backend sets it once on the first request after deploying.

## 7d. Car parking from the drawings (8 November)

No backend change is needed (the sheet keeps unknown fields). For readable columns in the **parking** tab, delete the empty *parking* tab in the Accord Database sheet before loading; the next save recreates it with the new headings from `backend/Code.gs`.

**Source.** `YAMUNA - PARKING FLOORS - 24.07.2026.dwg` (A2-01 ground to A2-04 third floor). 4th and 5th floor sheets have no car parks. The parking statement on the drawings agrees with what Accord reads: 543 covered car parks.

| Level | FFL | Single | Tandem pairs | Total |
|---|---|---|---|---|
| G, ground floor | +4.860 | 112 | 29 | 170 |
| L1, first floor | +8.310 | 82 | 30 | 142 |
| L2, second floor | +11.335 | 80 | 30 | 140 |
| L3, third floor | +14.360 | 39 | 26 | 91 |
| **Covered** | | **313** | **115** | **543** |

On the ground there are also 3 accessible bays (G-H1 to G-H3), 36 visitor bays (V-01 to V-36; V-01 to V-20 along the EV charging wall), 26 surface bays (S-01 to S-26) and 95 two-wheeler bays (TW-01 to TW-95).

**Numbering.** Level code + drawing number: `G-012`, `L1-072`, `L1-072A`. The A slot is the rear of a tandem pair and is reached only through the front slot with the same number. Use these numbers on the site signage.

**Labels corrected from the drawings** (send to the architect for the next revision):
- G: the second 76A and 77A are behind 74 and 73, so they are **74A** and **73A**.
- L1: the rear row 96, 97, 98, 99 (bottom left) repeats the front numbers; they are **96A to 99A**.
- L2: "721" is **72A**.
- L3: "46A" sits behind 44, so it is **44A**; 46 is a single next to the ramp.

**How car parks are allotted** (Building and parking → Car parking → Rules and drawings shows the same):
1. *Entitlement* is what the booking bought: "Car parks entitled" on the client, otherwise the rate card's number for the type (now 1 for every type).
2. *Tandem pairs are never split.* One car park is always a single slot. Two car parks are one tandem pair; three are a pair and a single.
3. *Convenience score* = straight-line walk from the slot to the tower lobby on that level + 30 m for each ramp level above the ground (Edit rules).
4. *Zones by band.* The best slots are held for the premium bands first (Crown, Signature, Panorama Terrace, Panorama, Sky Duplexes, Sky Residences, Sky Deck, Sub-Sky Deck, then Podium and typical), sized to every residence in the band, sold or not. Unsold residences keep their band's slots for later buyers.
5. *Inside a band* the earliest booking chooses first; undated bookings come last. A household's further slots, and a client's other residences, go as near as possible.
6. *Nothing moves.* Planning only fills gaps. **Mark as issued** on the allotment letter locks the slots.
7. Active, shifted, registered and handed-over bookings are allotted; *To verify* bookings get **Provisional** slots. Cancelling or moving a booking frees its slots.
8. Accessible, visitor, surface and two-wheeler bays are not auto-allotted. What is left (19 singles and 115 tandem pairs with the current entitlement of 1) is the **sale pool** for additional car parks.

**Steps, once.** Car parking → **Load the inventory from the drawings** → **Plan allotment** (check the list) → **Apply**. Then print each client's **Allotment letter** from Client 360 or the Residences list, and **Print register** for the site office.

**Decisions for you.** The rate card gives every type 1 car park while the building has 543. If 4 and 5 BHK residences are meant to have 2, change *Car parks for 4 BHK / 5 BHK* in Admin → Settings → Rate card (it also changes the cost sheet) before planning; they will then get tandem pairs.

## 7e. Cost sheet client pack and parking commitments (8 November, later)

**Cost sheet.** Follows *Yamuna_Sky_City_Cost_Sheet_Master_Template_YHD.xlsx*. The A4 preview (and print / PDF) is the client pack, three pages:
1. **Financial summary**: unit particulars (client, date, residence, floor, band, area, car parks, client representative), Part A, Part B, grand total in words, terms, payment details, signatures.
2. **Payment plan and schedule**: the milestone slab for the funding mode (Admin → Settings → plans) and the 31-stage construction-linked schedule (Building and parking → Construction), both on the grand total, rounding carried in the last line.
3. **Your residence**: a diagrammatic elevation with the band and floor marked, the floor plan of that floor type with the residence marked (duplexes show both levels), and the car parks with a car drawn in each chosen bay (whole deck and a close-up).
Founding privilege, approval status and internal notes stay on the Build screen only.

**Car parks on the cost sheet.** The sheet shows the bays the residence would be allotted if booked now (same rules as Plan allotment, after every existing booking). They are saved on the sheet and allotted automatically on **Convert to booking** if still free. Sales can add up to the rate card's extra limit; admins can promise up to 8.

**Cars.** The car plan blocks come from the BMW X5 and Mercedes S-Class drawings; they are drawn only in the chosen or allotted bays (cost sheet, Client 360, allotment letter, and the selected slot on the plan), facing into the bay as on the parking drawings.

**Commitments of 4 or more car parks.** Building and parking → Car parking → Rules and drawings → *Commitments*. Each residence keeps its own car park, so 249 covered car parks are spare today. A promise of 4 uses 3 of them (two tandem pairs), 5 uses 4, 6 uses 5. The most the building can carry on top of today's bookings: **83** promises of 4, **62** of 5 or **49** of 6, and that leaves nothing to sell. Record each promise on the client (Client 360 → Edit → Car parks entitled), then Plan allotment.

## 7f. Accord People: HRMS and the knowledge base (12 November, backend 3.8.0)

A fourth workspace, **Accord People**, for HR (new access role *HR and admin*) and admins, and a **People and policies** menu for everyone else: My HR, leave with approvals by "Reports to", half-yearly KRA sheets from each position's template, HR requests (with confidential POSH complaints seen only by the Internal Committee), assets, holidays, the monthly attendance and leave register for payroll, and a knowledge base of 33 SOPs, role handbooks, RERA, tax and HR policies. Access follows the person's **position** and **pay grade** (G1 to G6) set on their HR profile, and the server enforces it. Go-live steps and the full rules: `ACCORD_CHANGES_2026-11-12_PEOPLE.md`.

## 8. What is missing (to fill in before go-live)

1. **Your Excel formats and the logo.** The cost sheet, payment slip, payment and financial summary, booking form and lead entries use the Yamuna Sky City header now. When you share the Excel formats and the header or logo, upload the logo in Settings → Brand, and the layouts can be matched line by line.
2. **The Sky City point** for punch-in: set it on site on Monday (Settings). Until then punches record the location but are not judged.
3. **Colours.** Still the burgundy accent; you said you would research the colours.
4. **AI assistant** (second priority). A chat that reads the sheet and answers "payments for booking 3002". It needs a model behind it (a hosted API or a small server, not GitHub Pages). Not built yet.
5. **Relationship owners.**
   - Most bookings in the CRM master have no relationship owner, so "My clients" is empty for client advisors until owners are set.
   - In Client 360, choose **Sort and filter → No relationship owner** and assign them. Do the same for leads (**Not assigned yet**).
6. **Finance person.** No one in the team list does finance yet. Add them with the *Finance* role.
7. **Khushi's role.** She is set as *Senior sales* because the meeting grouped her with the admins for assigning tasks. The team list calls her a generalist. Change it in Users and access if needed.
8. **E-mail addresses and phone numbers for the team.** Without them, reminders stay inside Accord.
9. **Demand call DC-01** has no raised date, so most payments show "Due, date not set". Enter it under Payments → Demand calls.
10. **Key plan drawings.** 13 of the 14 key plan SVGs are missing for the experience's configurator.
   - The plan picker still works; the small key plan is blank for those residences.
   - Copy `Accord/Code_Base/public/editions/yamuna-sky-city/keyplans/` into `site/experience/editions/yamuna-sky-city/keyplans/`.
11. **Experience source.** The experience runs from its built bundle, patched by `tools/patch-experience.mjs`. If the experience is rebuilt, copy its new `dist/index.html` to `experience-src/accord-experience.dist.html` and run `npm run build:site`. The patch stops with a message if the bundle has changed shape.
12. **Brochure content.** The e-brochure uses the Accord render library for interiors and the CAD plans. The film, cultural-coast, engineering and design sections are in place with placeholder text. Still to add:
   - the film link, and the diagrams from the DWG drawings;
   - site progress photos;
   - the 4 BHK Grand plan as its own section;
   - final copy from the marketing pillar.
13. **Push to phones while Accord is closed** needs phase 2 (see BACKEND.md). WhatsApp automation needs the WhatsApp Business API.
14. **Leave and weekly off.** The time log has shifts and working days. Leave and weekly-off requests wait for the HR structure.
15. **Designations.** Cyril is the Sales Lead (7 Nov). The other designations were assumed. Correct them in Users and access, because they print under the name in every message.
16. **Dashboard figures.** Accord counts 39 live bookings from the CRM statuses; the master sheet's Dashboard tab shows 42. The difference is bookings marked *To verify*, which Accord leaves out until they are confirmed.
17. **From the 2 and 3 November meetings, still waiting.**
   - The AI chatbot and AI analytics (Grok or another model) need a hosted model. The lead inbox is ready for a bot to post into.
   - Automatic capture from WhatsApp and 99acres needs the WhatsApp Business API or a mail reader. Both can post to the lead inbox.
   - KRA and KPI scoring is waiting for HR.
   - The 4:25 pm recording was not transcribed.
   - The rendered white model will replace the drawn elevation when it is shared.
   - The e-brochure content is still to come.
18. **Settings values to enter in Admin › Settings → Rate card:** base rate ₹10,500 per sft, car park ₹6 lakh, MWSSB / MESCOM ₹200.
