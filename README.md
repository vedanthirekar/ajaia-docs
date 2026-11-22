# Ajaia Docs

A lightweight collaborative document editor: create and format documents, import files, and share them with other people as viewers or editors.

**Live demo:** https://ajaia-docs-one-omega.vercel.app

> Built for the Ajaia AI-Native Full Stack Developer assignment. See [ARCHITECTURE.md](ARCHITECTURE.md) for what I prioritized and why, [AI_NOTES.md](AI_NOTES.md) for how I used AI, and [decisions.md](decisions.md) for the full decision log.

---

## What you can do

| Area | Supported |
|---|---|
| **Documents** | Create, rename (click the title), edit, delete (owner only), and reopen. Autosaves about 1 s after you stop typing. |
| **Formatting** | Bold, italic, underline, strikethrough, Heading 1–3, **any font size** (type a value 6–96 or use −/+), **any text colour** (48-swatch palette, colour picker or hex code), highlight, links, text alignment (left/center/right/justify), bulleted and numbered lists, quotes, divider lines, undo/redo. Toolbar plus keyboard shortcuts (`Ctrl/⌘+B/I/U`), and Markdown shortcuts as you type (`# `, `- `, `1. `, `> `). Links accept http(s) and mailto only, and viewers can click them. |
| **File import** | **Supported: `.txt`, `.md`, `.docx` (max 4 MB).** Each upload becomes a **new document**. Headings, bold, italic, lists and links are kept. Images, tables and complex Word styling are dropped. |
| **Sharing** | The owner shares by email as **Viewer** (read-only) or **Editor** (edit and rename). Sharing with an email that has no account yet creates a **pending invite**: the doc shows up as soon as that person signs up. Roles can be changed or revoked at any time. |
| **Page layout** | The editor shows an **A4 sheet** (210 mm wide, Word's default 2.54 cm margins). **Ctrl/⌘+P prints real A4 pages**: the browser paginates, and the app's toolbar and header are hidden. |
| **Public link** | The owner can switch a document to **"Anyone with the link can view"** in the Share dialog. Anyone with the link can then read it, **even without an account**, but never edit it. Switching back to *Restricted* removes that access immediately. Public docs show a *Public* tag on the owner's dashboard. |
| **Dashboard** | "My documents" and "Shared with me" are listed separately, with role badges and owner names. Owners can **Share** or **Delete** straight from a document's ⋮ menu. |
| **Accounts** | Email and password signup, plus **Continue with Google**. |
| **Safety** | If the same doc was saved from another tab or by another editor since you loaded it, your save is rejected and you're asked to reload (with a "copy my text" escape hatch) instead of silently overwriting. If your access is revoked while the doc is open, the editor locks. |

### Trying the sharing flow (reviewers)

1. Sign up as user A, create a doc and write something.
2. Click **Share**, enter a second email (e.g. `b@example.com`) and pick **Viewer**. It shows as *Pending*.
3. In a private/incognito window, sign up with that second email. The doc appears under **Shared with me** with a *Viewer* badge and opens read-only.
4. Back as A, switch B to **Editor**. After a refresh, B can edit. Remove B, and B gets "not found".
5. In the Share dialog, set **General access → Anyone with the link** and open the link in a private window without signing in. It opens read-only.

**No email is sent when sharing** (there's no email service), so send the link yourself. The Share dialog has a **Copy link** button. The invite is still real: it appears in the person's "Shared with me" as soon as they sign up with that email.

---

## Running locally

**Requirements:** Node.js 22+ and npm. No database install is needed.

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Zero-setup local database (embedded Postgres via PGlite, stored in ./.data)
DATABASE_URL=pglite:./.data/pglite
# Any long random string, e.g. from: npx auth secret
AUTH_SECRET=replace-me
# Optional: Google sign-in (the button is hidden when these are unset)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
```

Then:

```bash
npm run db:migrate   # create tables
npm run dev          # http://localhost:3000
```

To run against real Postgres (e.g. Neon) instead, set `DATABASE_URL=postgresql://…` and run `npm run db:migrate`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit and integration tests (Vitest; each test gets a fresh in-memory Postgres) |
| `npm run test:e2e` | End-to-end browser test (Playwright; starts its own server with a throwaway DB) |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:migrate` | Create / apply Drizzle migrations |

### Tests

- **Unit and integration (137 tests):** the permission matrix for every role and action, document CRUD with optimistic-concurrency conflicts, sharing (pending invites, email case-insensitivity, revoke and downgrade), signup and credentials, file import (txt/md/docx, UTF-16 files, binary/fake files), input validation, and the autosave state machine (debounce, edits during an in-flight save, unload flush, conflict/forbidden/signed-out/too-large states, retry backoff), and the open-redirect guard.
- **E2E:** signs up user A, formats a doc, reloads to check persistence (including a reload ~250 ms after typing), shares it with B's email as a pending viewer, signs up B, and checks the doc is listed and read-only, plus that a write from B through the API returns 403. It also shares from the dashboard menu, makes the doc public and checks a signed-out visitor can read but not write it, turns that off again, and signs out via the account menu.
- The E2E test uses the locally installed **Google Chrome** by default. To use Playwright's bundled browser instead (e.g. in CI): `npx playwright install chromium` and set `PW_CHANNEL=chromium`. Run it against a deployment with `E2E_BASE_URL=https://… npm run test:e2e`.

### Troubleshooting

- **Styles look stale in dev after editing CSS:** stop the server, delete `.next/`, and restart. Turbopack's persistent dev cache occasionally holds an old stylesheet.
- **"DATABASE_URL is not set":** create `.env.local` as above.

---

## Deploying (Vercel + Neon, all free tier)

1. Create a Neon project and copy its pooled connection string.
2. Apply the schema once: `npx cross-env DATABASE_URL="<neon url>" npm run db:migrate` (works in any shell).
3. Import the GitHub repo in Vercel and set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
4. In Google Cloud Console, create an OAuth client (Web) with the redirect URI `https://<your-domain>/api/auth/callback/google`, and publish the consent screen (only basic profile/email scopes are used, so no verification is needed).

---

## Known limitations and deliberate cuts

- **No real-time co-editing.** Concurrent edits are detected (version check) rather than merged. The schema and editor (TipTap/ProseMirror) leave a direct path to Yjs later; see ARCHITECTURE.md.
- **No on-screen pagination or headers/footers.** The A4 sheet grows taller instead of breaking into pages (printing does paginate). Free pagination add-ons are immature, and TipTap's official Pages add-on is paid (D-017, D-018).
- No comments, suggestions, version history, images, tables, export or folders.
- No password reset, email verification or share notification emails (each needs an email service).
- **No email verification**, so a pending invite goes to whoever first registers that email address. That's fine for a demo; in production, verify emails before granting invite access.
- If you signed up with a password, "Continue with Google" with the same email is refused (sign in with your password). Accounts are deliberately not auto-linked; see ARCHITECTURE.md › Auth.
- Sessions are JWT-based, so signing out elsewhere doesn't revoke an existing session before it expires. Every request is still re-authorized against the database.

---

## Credits

- Logo and favicon: "Document" icon by [Icons8](https://icons8.com) (free licence with attribution).
- Visual theme ("Cotton"): `design-handoff/` (spec, tokens and mockups).
