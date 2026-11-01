# Move these two files into `.github/workflows/` before the first push

Accord could not write inside the hidden `.github` folder from here, so the two GitHub Actions files wait in this folder.

1. In `H:\My Drive\Accord_CRM_Application\CRM_Application`, create the folder `.github`, and inside it `workflows`.
   (File Explorer: New folder, type `.github.` with a trailing dot, Windows keeps it as `.github`.)
2. Move `pages.yml` and `backend.yml` from this folder into `.github\workflows\`.
3. Commit and push. GitHub then builds and publishes Accord on every push.

Or on github.com: **Add file → Create new file**, name it `.github/workflows/pages.yml`, paste the contents and commit. Do the same for `backend.yml`.
