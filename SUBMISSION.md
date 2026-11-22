# Submission: Ajaia Docs

| | |
|---|---|
| **Live app** | https://ajaia-docs-one-omega.vercel.app |
| **Walkthrough video** | https://www.loom.com/share/fbd08dd9e9c14186a6b6c92271dcc436 |
| **Code (GitHub)** | https://github.com/vedanthirekar/ajaia-docs |

**Quickest way to review:** on the login page, click a **demo account** (password `ajaia-demo-2026`). The three accounts already share documents with each other as editor, viewer, pending invite and public link. The README has the details.

## What's in this folder

| Item | File |
|---|---|
| Source code | `ajaia-docs-source.zip` (also on GitHub) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_NOTES.md` |
| This list | `SUBMISSION.md` |
| Video link | `VIDEO_URL.txt` |
| Screenshots of the live app | `screenshots/` (login, dashboard, editor, share dialog, shared-with-me, view-only, public link) |
| Extra: every decision and why | `decisions.md` |

## Scope

- **Built:**
  - rich-text editor with autosave that never overwrites newer work;
  - `.txt` / `.md` / `.docx` import;
  - sharing with viewer and editor roles, pending invites and public links;
  - a dashboard of owned and shared documents;
  - A4 printing;
  - 143 automated tests plus an end-to-end browser test.
- **Left out on purpose:**
  - real-time co-editing;
  - comments;
  - version history;
  - invite emails.

  Google sign-in is built but not switched on in the live app.
