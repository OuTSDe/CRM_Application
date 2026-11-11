# Accord changes, 10 November: the Help centre

No backend change. Rebuild with `npm run build:site` (already done in `site/`), commit and push.

## What people see
- **Help centre** (side panel › Team › *Help centre*, replacing *User guide*). Type a word or a whole question: "record a payment", "recipt", "client not opening", "car park letter", "EMI due reminder". Search understands office words (flat, unit, quotation, CP, site visit, token), plurals and typos, and offers "Showing answers for…" when it corrects a word.
- **128 answers** in 17 topics, covering Sales, Design, Vendors, Team and Admin. Each answer has: the steps, *Where to find it*, the access it needs, *Also answers* (the questions people ask), *Related* and *Did this answer your question?*.
- **Take me there** opens the page (and the right tab or form) and rings the exact button or heading with a short note.
- **Show me** walks through a task on the real screens, step by step, with Back and Next (leads, follow-ups, Client 360, documents, cost sheet, payments, demand letters, car parking, punch-in).
- **? in the top bar** (or the ? key) opens help beside any page: answers for that page first, search, and the full answer in the panel.
- **13 short videos** (site/help/videos): screen recordings of Accord with practice data only, with step captions, a pointer and title cards. Sign-in and punch-in, new lead and pasted enquiry, logging calls, Client 360, cost sheet, recording payments, demand letters, cancel or move, the building, car parking, private viewings, the e-brochure, analytics and reports.
- **Everyone can read every answer.** Answers outside a person's access show a lock, who does it, and what to ask an admin to tick.

## Small fixes found while testing
- Building and parking, Payments and Documents now switch tab when a link names another tab while the page is already open (before, the old tab stayed).

## Files
- New: `source/src/help/` (articles.js, search.js, access.js, ui.jsx, videos.js), `components/HelpGuide.jsx`, `components/HelpPanel.jsx`, `site/help/videos/`, `tools/help-videos/`.
- Changed: `pages/Help.jsx` (rewritten), `App.jsx` (routes help/:id and help/c/:cat), `components/Layout.jsx` (? button, menu label), `styles.css` (help styles at the end), `modules/crm/Inventory.jsx`, `Payments.jsx`, `Documents.jsx` (tab follows the link).

## Keeping it right
- When a button or tab is renamed, search `help/articles.js` for the old name (the `hl` of *Take me there* and *Show me* is the text on the button).
- A missing answer: people are pointed to Issues. Add an article to `help/articles.js` (id, cat, title, q, k, summary, steps, where, go).
- Not covered as a video: uploading documents, because uploads need the live Drive connection. Its answer has *Show me* instead.
