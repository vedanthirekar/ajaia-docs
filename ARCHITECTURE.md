# Architecture note

## What I focused on, and why

The brief asked for depth over breadth, so I put the effort into the parts that most often go wrong in real products:

1. **Access control that can't be bypassed.** Every request is checked on the server by one module (`lib/permissions.ts`), not just hidden in the UI.
2. **Never losing someone's work.** Autosave refuses to overwrite a newer version and tells the user instead.
3. **A clean, usable editor.**
4. **Realistic sharing:** roles, pending invites and public links.

I cut real-time co-editing, comments and version history to protect those.

## How it fits together

```
Browser (Next.js + React + TipTap editor)
   │  JSON requests
   ▼
API routes (app/api/**)    check sign-in → validate input (Zod) → call a service
   │
   ▼
Services (lib/services)    documents · sharing · users
Permissions                one place that decides who can do what
Import                     .txt / .md / .docx → editor format
   │
   ▼
Postgres via Drizzle       Neon in production · embedded PGlite locally and in tests
```

Every service receives the database as a parameter. That lets the tests run real SQL against a fresh in-memory Postgres, with no mocks and no Docker.

## Data

| Table | Holds |
|---|---|
| `users`, `accounts` | People and their login methods (password and/or Google) |
| `documents` | Owner, title, content (stored as the editor's JSON, so formatting is preserved exactly), a `version` number and an `is_public` flag |
| `document_shares` | Who a doc is shared with: email, role (`viewer` / `editor`), and the user id once that person has an account (empty while the invite is pending) |

## Who can do what

| Action | Owner | Editor | Viewer (incl. public link) | Everyone else |
|---|---|---|---|---|
| Open | ✓ | ✓ | ✓ | "Not found" |
| Edit / rename | ✓ | ✓ | ✗ | "Not found" |
| Share, delete | ✓ | ✗ | ✗ | "Not found" |

People without access get "not found" rather than "forbidden", so the app doesn't reveal that a document exists.

## Saving without overwriting others

- Each document has a version number. A save only succeeds if the version it started from is still the latest; otherwise the server refuses it (409).
- The editor then shows "This document was changed elsewhere", with a reload button and a copy-my-text button.
- The browser never sends two saves at once, keeps edits typed during a save, and retries on network errors.
- Edits are also saved when you close or hide the tab, so the last second of typing isn't lost.

## Import

Files are converted on the server into the same format the editor uses, so imported docs always open correctly. Limits: 4 MB per file and 1 MB of resulting content. Wrong or corrupt files get a clear error, never a crash.

## Login

Auth.js handles email/password (hashed with bcrypt) and Google, with Google implemented but not switched on in the live app. Google sign-in is deliberately **not** auto-linked to an existing password account with the same email. Without email verification, auto-linking would let someone pre-register another person's address and take over the account.

## What I'd do next

- **Version history:** save snapshots, with a restore button.
- **Real-time co-editing:** the editor (TipTap) supports it through Yjs; it needs a sync server.
- **Email:** invites and password reset.
- **Comments.**
