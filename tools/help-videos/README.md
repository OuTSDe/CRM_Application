# Help videos

Re-records the short videos in `site/help/videos/` when screens change. Runs on any computer with Node, Playwright (Chromium) and ffmpeg.

1. Build the site: `cd source && npm run build:site`.
2. Serve it without the backend, so nothing reaches the Google Sheet: in `site/`, check `accord.config.js` has `backendUrl: ''`, then run `python -m http.server 8080`.
3. Here: `npm i playwright` once, then `node scenes.js` for all videos, or `node scenes.js cost-sheet record-payment` for some.
4. Copy `out/<name>.mp4` and `out/<name>.jpg` into `site/help/videos/`.

`demo-data.js` loads practice people, leads, payments and calls into that browser only (invented names, `@example.com` e-mails, masked bank account). Sign-in uses the practice account `demoadmin` with the temporary password, on this local copy only.
Each video is one function in `scenes.js`: steps are `v.say()` captions, `v.click()`, `v.type()` and `v.select()` on the real buttons, so a renamed button shows up as a failed step with a screenshot in `out/`.
