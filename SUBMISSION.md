# Submission: Ajaia Docs

A lightweight collaborative document editor built for the Ajaia AI-Native Full Stack Developer assignment.

## Quick links

| What | Where |
|---|---|
| **Live product** | https://ajaia-docs-one-omega.vercel.app |
| **Walkthrough video** | https://www.loom.com/share/fbd08dd9e9c14186a6b6c92271dcc436 (also in `VIDEO_URL.txt`) |
| **Source code (GitHub)** | https://github.com/vedanthirekar/ajaia-docs |

**Fastest way to review:** open the live URL and click one of the **"Try a demo account"** buttons on the login page. All three accounts use the password `ajaia-demo-2026` and hold mock data only. Each one owns documents and has documents shared with it by the other two in different ways:

| Account | Shows |
|---|---|
| Maya Chen · `maya@demo.example` | An owned doc shared with Leo as **Editor** and Priya as **Viewer**, a **public link** doc (opens without signing in), and a doc **imported** from a `.md` file |
| Leo Martins · `leo@demo.example` | Can **edit** Maya's roadmap; owns a retro shared with two editors |
| Priya Patel · `priya@demo.example` | **View-only** access to Maya's roadmap; a doc with a **pending** invite to someone who hasn't signed up; a **private** draft |

## What's in this folder

| Required item | File / location | Notes |
|---|---|---|
| Source code | `ajaia-docs-source.zip` (and on GitHub) | Next.js 16 + TypeScript, TipTap editor, Postgres (Neon) via Drizzle, Auth.js. Excludes `node_modules` and secrets. |
| README with local setup and run instructions | `README.md` | Local setup needs no database install (embedded Postgres); also covers scripts, tests, deployment and known limitations |
| Architecture note | `ARCHITECTURE.md` | What I prioritised and why, data model, permission matrix, save/concurrency model, import pipeline, tradeoffs |
| AI workflow note | `AI_NOTES.md` | Tools used, where AI sped things up, what I changed or rejected, how I verified the work |
| Submission manifest | `SUBMISSION.md` | This file |
| Live product URL | https://ajaia-docs-one-omega.vercel.app | Vercel + Neon Postgres, free tiers |
| Walkthrough video URL | `VIDEO_URL.txt` | Loom |
| Screenshots | `screenshots/` | See the list below |

**Extras:**

| Extra | File / location |
|---|---|
| Decision log (D-001 to D-021): every scoping and engineering decision with options and tradeoffs | `decisions.md` |
| Design spec and implementation plan the build followed | Inside the source zip: `docs/superpowers/` |
| Visual design handoff ("Cotton" theme) | Inside the source zip: `design-handoff/` |
| Automated tests: 143 unit/integration tests against a real in-memory Postgres, plus an end-to-end browser flow | Inside the source zip: `tests/` |

### Screenshots (taken from the live site)

| File | Shows |
|---|---|
| `01-login-demo-accounts.png` | Login page with one-click demo accounts |
| `02-dashboard.png` | Dashboard: owned and shared docs, role badges, public tag, search and filters |
| `03-editor.png` | Editor with the formatting toolbar and autosave status |
| `04-share-dialog.png` | Share dialog: roles, people with access, general access, copy link |
| `05-shared-with-me.png` | "Shared with me" view for another user |
| `06-view-only.png` | A viewer opening a shared doc (read-only) |
| `07-public-link-signed-out.png` | A public-link doc opened without signing in |

## Scope at a glance

- **Built:**
  - rich-text editing: headings, lists, checklists, links, colours, font sizes, alignment, highlight, quotes;
  - autosave that never silently overwrites newer work (stale saves are rejected with a clear "changed elsewhere" warning);
  - `.txt` / `.md` / `.docx` import as a new document;
  - sharing with owner / editor / viewer roles, pending invites and "anyone with the link can view";
  - an owned vs shared dashboard with search and filters;
  - an A4 page with real A4 printing;
  - email/password authentication.
- **Deliberately cut (reasons in `decisions.md`):**
  - real-time co-editing;
  - comments;
  - version history;
  - invite emails;
  - on-screen pagination.
- **Not enabled on the live site:** Google sign-in is implemented, but no OAuth client has been configured, so the button is hidden. Email/password and the demo accounts cover all flows.

## Running it locally (short version)

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL=pglite:./.data/pglite and AUTH_SECRET=<any long random string>
npm run db:migrate
npm run dev                  # http://localhost:3000
npm run seed:demo            # optional: creates the same demo accounts locally
```

Full instructions are in `README.md`.
