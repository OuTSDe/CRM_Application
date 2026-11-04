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
- **Cyril** (senior sales) sees all leads, clients, cold calls and interactions. He also edits templates, sees performance and assigns tasks.
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
- **KYC check on upload.**
  - PAN and Aadhaar photos are read in the browser before filing.
  - A wrong card, or a name that does not match the client, is flagged and can still be uploaded on purpose.
  - The number, name and date of birth read are saved with the file. Aadhaar is kept as the last 4 digits only.
- **Payments.** **Print receipts in bulk**: pick a date range, and every receipt prints on its own A4 page.
- **Building.**
  - **Elevation** view: a white-model drawing with clickable floors.
  - **Construction** tab: each stage has a status and planned and actual dates. Finance and admin edit it.
- **Team.** Department, employment (on roll, off roll, consultant) and company for each person, with counts on the Team page.
- **User guide** in the menu (Team › User guide). It is written for each role.

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
15. **Designations.** Cyril's "Senior Sales Manager" and the other designations were assumed. Correct them in Users and access, because they print under the name in every message.
16. **Dashboard figures.** Accord counts 39 live bookings from the CRM statuses; the master sheet's Dashboard tab shows 42. The difference is bookings marked *To verify*, which Accord leaves out until they are confirmed.
17. **From the 2 and 3 November meetings, still waiting.**
   - The AI chatbot and AI analytics (Grok or another model) need a hosted model. The lead inbox is ready for a bot to post into.
   - Automatic capture from WhatsApp and 99acres needs the WhatsApp Business API or a mail reader. Both can post to the lead inbox.
   - A local vision model needs hardware. The KYC check runs in the browser for now.
   - KRA and KPI scoring is waiting for HR.
   - The 4:25 pm recording was not transcribed.
   - The rendered white model will replace the drawn elevation when it is shared.
   - The e-brochure content is still to come.
18. **Settings values to enter in Admin › Settings → Rate card:** base rate ₹10,500 per sft, car park ₹6 lakh, MWSSB / MESCOM ₹200.
