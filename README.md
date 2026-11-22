# Ajaia Docs

A lightweight document editor: write formatted documents, import files, and share them with other people.

**Live app:** https://ajaia-docs-one-omega.vercel.app
**More detail:** [ARCHITECTURE.md](ARCHITECTURE.md) (how it works) · [AI_NOTES.md](AI_NOTES.md) (how I used AI) · [decisions.md](decisions.md) (every decision and why) · [screenshots](docs/screenshots/)

## Try it in 30 seconds

On the login page, click a **demo account**. All three use the password `ajaia-demo-2026` and contain sample data that's already shared between them:

| Account | What you'll see |
|---|---|
| Maya Chen (`maya@demo.example`) | Owns docs shared as **editor** and **viewer**, a **public link** doc (opens without signing in) and a doc **imported** from a `.md` file |
| Leo Martins (`leo@demo.example`) | Can **edit** Maya's roadmap |
| Priya Patel (`priya@demo.example`) | Can only **view** Maya's roadmap; has a **pending** invite and a **private** draft |

To reset the demo data: `npm run seed:demo -- https://ajaia-docs-one-omega.vercel.app`

## Features

- **Editing:** headings, bold/italic/underline/strikethrough, font size, text colour, highlight, links, alignment, bulleted, numbered and check lists, quotes. There's a toolbar, and keyboard and Markdown shortcuts work too.
- **Autosave:** saves about a second after you stop typing. If someone else saved a newer version, you're warned instead of overwriting their work.
- **Import:** upload **`.txt`, `.md` or `.docx` (max 4 MB)** to create a new document. Headings, lists and bold/italic are kept; images and tables are dropped.
- **Sharing:** the owner adds people by email as **Viewer** (read-only) or **Editor**. People without an account yet get a *pending* invite and see the doc once they sign up. A doc can also be made **"anyone with the link can view"**.
- **Dashboard:** owned and shared documents with search and filters. Owners can share or delete from each card's ⋮ menu.
- **Page layout:** the editor shows an A4 page, and **Ctrl/⌘+P** prints real A4 pages.

## Run it locally

You need **Node.js 22+**. No database to install: it uses an embedded Postgres stored in `./.data`.

```bash
npm install
cp .env.example .env.local
```

In `.env.local`, set:

```bash
DATABASE_URL=pglite:./.data/pglite
AUTH_SECRET=any-long-random-string     # e.g. from: npx auth secret
```

Then:

```bash
npm run db:migrate   # create the tables
npm run dev          # open http://localhost:3000
npm run seed:demo    # optional: add the demo accounts
```

To use a real Postgres (e.g. Neon) instead, set `DATABASE_URL=postgresql://…` and run `npm run db:migrate`.

## Tests

| Command | What it runs |
|---|---|
| `npm test` | 143 unit/integration tests against a real in-memory database: permissions, saving and conflicts, sharing, import, validation, autosave logic |
| `npm run test:e2e` | A browser test of the full flow: sign up, write, reload, share, view-only access, public link, sign out and back in. It uses your installed Chrome; set `PW_CHANNEL=chromium` to use Playwright's bundled browser. |
| `npm run lint` | Lint checks |

## Deploying (Vercel + Neon, free)

1. Import the GitHub repo into Vercel.
2. Add a Neon database from Vercel's **Storage** tab. This sets `DATABASE_URL`.
3. Add `AUTH_SECRET` in Vercel's environment variables.
4. Run the migration once against the **production** database URL:
   `npx cross-env DATABASE_URL="<url>" npm run db:migrate`
5. Optional, for Google sign-in: add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. The button only appears when these are set.

## Not included (on purpose)

- Real-time co-editing, comments and version history. Concurrent edits are detected and warned about, not merged.
- Invite emails, password reset and email verification (they need an email service).
- On-screen page breaks. The page is A4-sized; printing does paginate.

Because there's no email verification, a pending invite goes to whoever first signs up with that email address.

**Troubleshooting:** if styles look stale while developing, stop the server, delete `.next/` and restart.

## Credits

Logo by [Icons8](https://icons8.com). The visual theme comes from `design-handoff/`.
