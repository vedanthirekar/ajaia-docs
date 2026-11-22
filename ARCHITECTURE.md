# Architecture note

## What I prioritized and why

The brief rewards **depth in a few areas over breadth**, so I went deep on the parts where a real product most often fails and a reviewer can check correctness:

1. **Access control that can't be bypassed.** Every API route and page goes through one permissions module (`lib/permissions.ts`), not UI checks. A document you can't access returns **404** (its existence isn't revealed), and a role that's too low returns **403**. The full role × action matrix is unit-tested.
2. **No silent data loss.** Autosave is a small, framework-free state machine (`lib/editor/saveQueue.ts`) with optimistic concurrency on the server. Stale writes are rejected (409) instead of overwriting newer work, edits typed during a save aren't dropped, and pending edits are flushed when the tab is hidden or closed.
3. **A coherent editing experience.** Clean formatting controls, Markdown shortcuts, a page-like layout, clear save status, and view-only mode for viewers.
4. **Realistic sharing.** Viewer/editor roles, owner-only management, and **pending invites** for people who haven't signed up yet.

I cut real-time co-editing (see below), comments, version history and email features to protect those four.

## Shape of the system

```
Browser (Next.js App Router + React + TipTap)
   │  JSON over fetch (REST)
   ▼
app/api/**        route handlers: auth check → Zod validation → service call → JSON / {error:{code,message}}
app/**/page.tsx   server components call the same services directly
   │
   ▼
lib/services/*    documents · shares · users       (business rules; every function takes `db` as a parameter)
lib/permissions   getRole(user, doc) + can(role, action)   (single source of truth)
lib/import        .txt/.md/.docx → HTML → TipTap JSON (using the same schema the editor uses)
   │
   ▼
Drizzle ORM → Postgres   (Neon in production · PGlite file DB locally · PGlite in-memory in tests)
```

Passing `db` into every service means the tests run the **real SQL** against a fresh in-memory Postgres (PGlite) per test, with no mocks and no Docker. The same code runs locally against a file-backed PGlite (zero setup for reviewers) and in production against Neon over HTTP.

## Data model

| Table | Key columns | Notes |
|---|---|---|
| `users` | id, email (unique, lowercased), name, password_hash (nullable) | Shape compatible with the Auth.js adapter. Google-only users have no password hash. |
| `accounts` | provider, providerAccountId → user | OAuth links (Auth.js) |
| `documents` | id, owner_id, title, **content (jsonb)**, **version**, timestamps | Content is ProseMirror/TipTap JSON, so formatting round-trips exactly. |
| `document_shares` | document_id, **email**, user_id (nullable), role (`viewer`/`editor`) | Unique on (document, email). `user_id` is null while the invite is **pending**. Cascades on document delete. |

Shares are matched by user id **or** email, so a pending invite grants access the moment someone signs up with that address. Signup and sign-in also "claim" pending rows.

## Permission matrix

| Action | Owner | Editor | Viewer | No access |
|---|---|---|---|---|
| View | ✓ | ✓ | ✓ | 404 |
| Edit content / rename | ✓ | ✓ | 403 | 404 |
| Manage sharing | ✓ | 403 | 403 | 404 |
| Delete | ✓ | 403 | 403 | 404 |

## Saving and concurrency

- `PATCH /api/documents/:id` requires the `version` the client loaded. The update is a single conditional statement (`… WHERE id = ? AND version = ?`, then `version + 1`). Zero rows updated means **409 VERSION_CONFLICT**.
- The client save queue debounces for about 1 s and never has two requests in flight. Edits made during a save are sent afterwards with the newly returned version. 409 locks the editor with a "changed elsewhere — reload" banner (and a copy-my-text escape hatch). 403/404 locks it with "you no longer have access". 401 (signed out) and 400/413 (e.g. over the 1 MB limit) also lock it with a specific message. Network or 5xx errors retry with backoff while keeping the edits.
- Saves use `fetch(…, { keepalive: true })` whenever the body is under the browsers' 64 KiB keepalive limit, so a save outlives a tab close. Pending edits are flushed on `visibilitychange`, `pagehide` and `beforeunload`. On `pagehide`, edits typed while a save is still in flight are sent immediately at `version + 1`: if the earlier save failed, that request just gets a 409, so nothing newer is ever overwritten. An E2E test reloads 250 ms after typing to prove this, and I mutation-checked that the test fails without the flush.

## File import

`.txt` (paragraphs split on blank lines, HTML-escaped), `.md` (marked) and `.docx` (mammoth) are converted to HTML and then to TipTap JSON on the server, using **the same extension list as the editor**. Anything the editor can't represent (images, tables) is dropped rather than stored as invalid content. Limits: 4 MB upload (Vercel's request-body limit is 4.5 MB) and 1 MB of resulting document JSON. Text files are decoded with BOM detection (UTF-8 / UTF-16LE / UTF-16BE, as saved by Windows Notepad). Binary data renamed to `.txt`/`.md`, fake or corrupt `.docx` files and empty files return 422 with a clear message, never a 500. NUL characters, which Postgres `jsonb` can't store, are rejected at validation.

## Auth

Auth.js v5 with Google OAuth and email/password (bcrypt). The Credentials provider requires JWT sessions. A Google sign-in is **not** linked to an existing password account with the same email. Password signups aren't email-verified, so automatic linking would let someone pre-register a victim's address and keep access after the victim later signs in with Google. Such users are told to sign in with their password instead (D-015). `proxy.ts` only does an optimistic "is there a session cookie" redirect. Real authorization happens server-side on every request.

## Tradeoffs I'd revisit with more time

- **Real-time co-editing:** add `@tiptap/extension-collaboration` with Yjs and a sync server (Hocuspocus or a managed provider). The Yjs document state would become the source of truth and replace the version column. Nothing in the current schema blocks this. I deferred it because it needs long-lived socket infrastructure, and the conflict-detection model already prevents data loss.
- Email invites and notifications, password reset (needs an email provider).
- Version history (snapshot `content` on each N-th save), comments.
- Email verification (which would also make pending invites safe; see README limitations), rate limiting on auth endpoints, server-side session revocation.
- Pagination and search on the dashboard once lists get long.
