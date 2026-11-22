# AI workflow note

## Tools

- **Claude Code** (in VS Code): planning, writing code and tests, documentation.
- **Claude in Chrome / Playwright:** clicking through the real app to check it.

## How I worked

1. **Decided the scope myself first.** The AI asked me questions (stack, login method, upload behaviour, sharing rules) and I made the product calls. They're all logged in `decisions.md`.
2. **Spec → plan → tests first.** A short design doc became a 14-task plan. For each piece of logic, the test was written and seen failing before the code existed.
3. **Checked the installed docs, not memory.** Next.js 16 changed several things the AI might otherwise have got wrong (e.g. `middleware` → `proxy.ts`).

## Where AI saved the most time

- Writing the API routes, validation and error handling consistently.
- Writing broad tests quickly: every role × action permission combination, real `.docx` files generated inside tests, autosave timing.
- Building UI on an unfamiliar component library, and drafting docs from the decision log.

## What I changed or rejected

| AI suggestion or default | What happened |
|---|---|
| SQLite as the simple database | Rejected. Vercel can't keep a local database file, so I used Postgres (Neon). |
| Autosave set up the "normal" React way | **Bug I caught by testing in the browser:** in development, edits were silently dropped while the screen said "Saved". Rewrote it, and the browser test now checks that edits persist after a reload. |
| Redirecting after login with two router calls | **Broke only on the live site:** sign-in got stuck on a blank page (0 of 8 attempts worked), while all local tests passed. Fixed it, confirmed 8 of 8 on the live site, and added a test. Lesson: test the deployed app, not just local. |
| Linking Google and password accounts with the same email | Rejected after an independent AI code review flagged it as an account-takeover risk. |
| Import limited only by file size | Found a gap: a big text file could import but then never save. Added a size check with a test. |

I also had a separate AI reviewer check the whole codebase. It found four real issues; I fixed each one test-first: a login redirect trick, the account-linking risk, Windows "Unicode" text files crashing import, and large docs not saving when the tab closes.

## How I verified the work

- **143 automated tests** run against a real database, plus a browser test of the full flow.
- For the riskiest check, I deliberately broke the code to confirm the test fails, then restored it.
- I tested the **live site** directly: login, saving, conflicts, import, sharing, public links and blocked access.
- I clicked through the app in a real browser with multiple accounts, including on a phone-sized screen.
