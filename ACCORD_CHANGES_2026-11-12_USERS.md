# Accord changes, 12 Nov 2026 (e): no duplicate users

Backend version 3.8.4. The site asks for it, and admins see a banner until it is deployed.

## The duplicate warning

Users and access shows a warning at the top whenever the same person appears more than once:
- **Saved twice.** The same member ID appears in two rows of the users tab. The duplicate Sujaya was this case.
- **Two accounts.** One person has two member IDs, with the same name or username (ignoring case, spaces and dots).

## Removing duplicates

**Review and remove duplicates** handles both cases:
- **Saved twice.** The server's new `dedupeUsers` action folds the rows into one. It keeps the row with the authenticator linked, then the one with the most devices, then the most recently updated. Empty fields are filled in from the other rows.
- **Two accounts.** The admin picks which account to keep. Its missing details (e-mail, phone, reports to, department, shift, photo, extra access) are copied from the others, which are then removed.
  - Records point to people by name, so nothing else needs to change.
  - The account the admin is signed in with is never removed.

The list shows a row that was saved twice only once.

## Preventing new duplicates

- **Adding a member** is refused if someone already has the same name, username, e-mail or mobile. The message names the account to open instead.
- **The server** (`push`) refuses a new user whose username or name matches an existing one.
- **Seeding** (loading starting data) now matches people already in the sheet by ID, username or name. Someone already there keeps their ID, and repeated entries are dropped.

## Files changed

`backend/Code.gs`, `source/src/lib/store.jsx`, `source/src/modules/admin/Admin.jsx`, `site/index.html`.

## Restored

At 10:48 the same day, five files were overwritten with an older copy: `site/index.html`, `backend/Code.gs`, `store.jsx`, `Admin.jsx` and `README.md`. That older copy was pushed at 10:50 (commit "changes").

They were restored from commit 0695daf ("Parking updated") before these changes were made.

## Sign-in with a duplicated username (3.8.5)

If a username was on two rows, sign-in used the first row. The temporary password could be on the other row, so the person saw "No temporary password yet". Sign-in now uses the row that has the password or the authenticator. Removing the duplicate (Users and access › Review and remove duplicates) fixes it for good.
