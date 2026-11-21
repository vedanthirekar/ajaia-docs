# Design: Lightweight Collaborative Document Editor ("Ajaia Docs")

Date: 2026-11-21 · Status: Draft for approval · Timebox: 2–3 days

## 1. Intent and why

Take-home assessment for Ajaia (AI-Native Full Stack Developer). Build a small, Google-Docs-inspired editor that is a coherent product slice: create, edit, format, import, share and persist documents. Reviewers grade **product judgment and deliberate scope cuts** as heavily as implementation, plus deployment, code clarity, tests and the quality of written communication (README, architecture note, AI workflow note, `decisions.md`).

Success means a reviewer can open the deployed URL, create an account, write a formatted doc, import a file, share it with a second account, and see the right access behavior, all without friction or paid services. The repo should read as the work of someone who prioritizes deliberately and explains tradeoffs.

## 2. Goals / non-goals / anti-goals

**Goals**
- Rich-text editing: bold, italic, underline, H1–H3, bulleted and numbered lists. Also strikethrough, a paragraph style control and undo/redo, since they come nearly free with TipTap.
- Document lifecycle: create, rename, edit, autosave, reopen, delete (owner only).
- File import: `.txt`, `.md` or `.docx` (≤ 5 MB) becomes a new editable doc with its structure kept.
- Sharing: an owner shares by email as **viewer** or **editor**. Shares to unknown emails stay pending until that email signs up. The owner can change roles and revoke access. The dashboard separates "My documents" from "Shared with me".
- Auth: Google OAuth plus email-and-password signup/login.
- Persistence in Postgres. Formatting is preserved as TipTap JSON.
- Engineering quality: input validation, consistent error responses, server-side authorization, unit tests on the permission and import logic, one Playwright end-to-end happy path, a live Vercel deploy, and docs.

**Non-goals (deliberate cuts, logged in decisions.md)**
- Real-time co-editing (deferred; the design keeps a path open, see §7).
- Comments, suggestions, version history, page layout and printing, images and tables.
- Password reset, email verification and email notifications for shares (they need an email service).
- Folders, search, pagination of the doc list, export.
- Seeded demo accounts. The user will create demo accounts and data manually through the normal signup flow after deploy.

**Anti-goals (would count as failure even if it works)**
- Authorization enforced only in the UI. Every access check must happen on the server.
- Silent data loss: a stale tab overwriting newer content without warning, or lost unsaved edits on navigation.
- Requiring reviewers to pay for anything or run a complex local setup.
- Shallow coverage of many features instead of solid depth in the core flows.

## 3. Constraints
- Free tiers only: Vercel Hobby, Neon free, Google OAuth (free).
- Vercel functions are serverless, so there is no local filesystem persistence or long-lived socket server. The request body limit is 4.5 MB, so the upload limit is 4 MB for safety (the UI says so).
- Windows dev machine. Scripts must be cross-platform (npm scripts, no bash-only tooling).
- Accounts available: GitHub and Vercel. Neon and a Google Cloud OAuth client still need to be created; the plan includes guided steps.

## 4. Approaches considered

| Decision | Options | Picked | Why |
|---|---|---|---|
| Stack | Next.js + Neon + Vercel / Vite + Express + SQLite on Render / Supabase | **Next.js + Neon + Vercel** | One TypeScript codebase, free and zero-config deploy, real Postgres. SQLite is not viable on Vercel. Supabase would hide too much of the backend work being evaluated. |
| API style | REST route handlers + service layer / Server Actions | **REST + service layer** | The backend is explicit and reviewable. Permission logic sits in one testable module, and API errors are easy to show. |
| Editor | TipTap / Lexical | **TipTap** | Built on ProseMirror with ready extensions for every required format, JSON storage, and a direct Yjs path for later co-editing. |
| ORM | Drizzle / Prisma | **Drizzle** (builder's call, stated) | Lightweight, works well with serverless and the Neon HTTP driver, SQL-like migrations. |
| Auth | Seeded picker / Google only / Google + password / demo + Google | **Google + email/password** (user decision) | Real identities. Password signup lets reviewers create a second account without a second Google account. |
| Co-editing | Liveblocks / self-hosted Hocuspocus / defer | **Defer** (user decision) | Depth in the core first. Optimistic concurrency with a conflict warning covers the multi-tab case. |
| Upload | New doc / + insert at cursor / + attachments | **Import as new doc** (user decision) | The most product-relevant behavior with no blob storage needed. |
| Unknown-email share | Pending invite / reject | **Pending invite** (user decision) | Realistic product behavior. |

## 5. Architecture

```
Browser (Next.js App Router, React, TipTap)
  │  fetch JSON
  ▼
/app/api/**  route handlers  ── validate (Zod) ── auth (Auth.js session)
  │
  ▼
/lib/services/*   documents, shares, import   ← business logic
/lib/permissions.ts  getAccess(user, doc) → 'owner' | 'editor' | 'viewer' | null
  │
  ▼
Drizzle ORM → Neon Postgres
```

**Data model**
- `users`: id, email (unique, lowercased), name, image, password_hash (nullable, null for Google-only accounts), created_at. Plus the standard Auth.js `accounts` table for OAuth links. Sessions use JWT, which the Credentials provider requires.
- `documents`: id (uuid), owner_id → users, title (1–200 chars, default "Untitled document"), content (jsonb, TipTap doc), version (int, starts at 1), created_at, updated_at.
- `document_shares`: id, document_id → documents (cascade delete), email (lowercased; always set), user_id → users (nullable until claimed), role (`viewer` | `editor`), created_at. Unique on (document_id, email).
- Pending-invite resolution: on sign-in or signup, rows matching the user's email with a null `user_id` get claimed. Queries can match on email too, so claiming is an optimization rather than a correctness requirement.

**Permissions matrix (enforced in `permissions.ts` and used by every route)**

| Action | Owner | Editor | Viewer | None |
|---|---|---|---|---|
| View doc | ✓ | ✓ | ✓ | 404 |
| Edit content | ✓ | ✓ | 403 | 404 |
| Rename | ✓ | ✓ | 403 | 404 |
| Manage shares | ✓ | ✗ (403) | 403 | 404 |
| Delete | ✓ | 403 | 403 | 404 |

The server returns 404 rather than 403 for docs with no access, so it doesn't reveal that a doc exists. Owners cannot share a doc with themselves (400).

**API surface**
- `POST /api/auth/signup` (email, password ≥ 8 chars, name). Everything else under `/api/auth/*` is handled by Auth.js.
- `GET /api/documents` returns `{ owned: [...], shared: [...] }` with role and owner name.
- `POST /api/documents` creates an empty doc. `POST /api/documents/import` takes multipart form data and creates a doc from the file.
- `GET | PATCH | DELETE /api/documents/:id`. PATCH takes `{ title?, content?, version }` and returns 409 if the version is stale.
- `GET | POST /api/documents/:id/shares`, `PATCH | DELETE /api/documents/:id/shares/:shareId`.
- Error shape everywhere: `{ error: { code, message } }`.

**Editor and saving**
- TipTap StarterKit plus Underline and Placeholder. A toolbar shows active states, and the keyboard shortcuts work.
- Autosave is debounced (about 1 s after the last keystroke, plus on blur and before unload). The status indicator shows *Saving… / Saved / Offline–retrying / Conflict*.
- On a 409 conflict the editor shows a banner: "This document was changed elsewhere. Reload to see latest" (a copy-my-text option is a stretch goal).
- Viewers get `editable: false`, a hidden toolbar and a "View only" badge.
- The title is editable inline in the header, saves on blur or Enter, and is validated (trimmed, 1–200 chars).

**Import**
- `.txt`: paragraphs split on blank lines.
- `.md`: `marked` → HTML → TipTap JSON (generateJSON on the server).
- `.docx`: `mammoth` → HTML → TipTap JSON.
- Validation covers extension and MIME type, size ≤ 4 MB, and empty or unparseable files (422 with a clear message). Unsupported marks or nodes are dropped by the schema rather than raising errors. The doc title defaults to the filename without its extension. Supported types are listed on the upload button and in the README.

**Pages**
- `/login` and `/signup`: Google button plus an email/password form.
- `/` (dashboard): "My documents" and "Shared with me" sections, a New document button, an Import button, and per-doc cards showing title, updated time, role badge and owner (for shared docs).
- `/documents/[id]`: header with title, save status, Share button and back link; then toolbar and editor.
- Share dialog: email input with a role select, a list of current shares with "pending" tags, and role-change and revoke controls.

## 6. Quality, tests, deploy, docs
- **Unit tests (Vitest):** the permission matrix across all roles and actions, import conversion (txt, md and docx fixtures produce the expected node types), version-conflict logic, and Zod validators.
- **Integration (Vitest against a Neon test branch or local Postgres):** the share → pending → claim flow at the service level. Optional if time runs short; the unit tests come first.
- **E2E (Playwright):** sign up user A, create a doc with formatting, share it to B's email, sign up B, see the doc under "Shared with me" as viewer, and confirm it's read-only. Runs locally and is documented. Running it in CI is a stretch goal.
- **Deploy:** GitHub repo connected to Vercel, Neon attached through env vars. Migrations run through `drizzle-kit migrate` as a build step or manually (the choice gets documented).
- **Docs:** `README.md` (features, supported file types, setup, env vars, scripts, deployed URL, test instructions), `ARCHITECTURE.md` (priorities, data model, permission model, tradeoffs, what's next), `AI_NOTES.md` (tools used, where AI sped things up, what was changed or rejected, how it was verified), and `decisions.md` (a running dated log).
- Optional: a short walkthrough video script, since "verbal communication" is evaluated.

## 7. Path to co-editing (not built now)
TipTap supports `@tiptap/extension-collaboration` with Yjs. Later work would add a `ydoc_state bytea` column and a sync server (Hocuspocus or Liveblocks). Whichever authority holds the Yjs state would replace the version field. Nothing in the current schema blocks this.

## 8. Left to the builder
Exact UI styling (Tailwind + shadcn/ui, clean neutral look), component breakdown, debounce timing, migration mechanics, test fixture contents, and the folder layout within the structure above.
