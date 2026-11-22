# Decisions Log

A running log of product and engineering decisions: what was decided, the options considered, and why. Newest entries at the bottom.

Format: **D-### · Date · Title**. Decision / Options / Rationale / Tradeoff.

---

### D-001 · 2026-11-21 · Timebox and scope posture
- **Decision:** 2–3 day timebox. Core requirements done in depth first, then a small number of extras.
- **Rationale:** The brief rewards deliberate scope cuts and depth over breadth.

### D-002 · 2026-11-21 · Stack: Next.js + Neon Postgres + Vercel
- **Options:** Next.js + Neon + Vercel; Vite React + Express + SQLite (Render/Railway); Supabase.
- **Decision:** Next.js (App Router, TypeScript) on Vercel with Neon Postgres.
- **Rationale:** One codebase, free hosting and database, the simplest path to a reviewer-accessible deploy.
- **Tradeoff:** SQLite was ruled out because Vercel's filesystem is ephemeral. Supabase was ruled out because it would hide much of the backend and access logic being evaluated.

### D-003 · 2026-11-21 · API style: REST route handlers + service layer
- **Options:** REST route handlers; Server Actions.
- **Decision:** REST under `/api/**` with business logic in `lib/services` and a single `lib/permissions.ts`.
- **Rationale:** An explicit, reviewable backend, centralized and unit-testable authorization, clear error contracts.
- **Tradeoff:** Somewhat more boilerplate than Server Actions.

### D-004 · 2026-11-21 · Editor: TipTap
- **Options:** TipTap; Lexical.
- **Decision:** TipTap, with content stored as ProseMirror JSON (jsonb).
- **Rationale:** Ready extensions for all required formatting, structured storage that preserves formatting, and a direct Yjs path for future co-editing.

### D-005 · 2026-11-21 · ORM: Drizzle
- **Options:** Drizzle; Prisma.
- **Decision:** Drizzle with the Neon serverless driver.
- **Rationale:** Lightweight, works well with serverless, SQL-transparent migrations. (Builder's call.)

### D-006 · 2026-11-21 · Auth: Google OAuth + email/password, no seeded demo users
- **Options considered:** seeded user picker; email-only login; Google only; Google + one-click demo accounts; Google + email/password.
- **Decision:** Auth.js with a Google provider and a Credentials (email/password, bcrypt) provider, using JWT sessions. No seeded demo profiles. The owner will create demo accounts and data later through the normal signup flow.
- **Rationale:** Real identities. Password signup lets a reviewer create a second account to test sharing without needing a second Google account.
- **Tradeoff:** More setup than mocked auth (Google Cloud OAuth client, callback URLs). The OAuth consent screen must be published to production (basic scopes only, no verification needed) so reviewers can sign in.
- **Sub-decisions:** passwords ≥ 8 chars; the same email via Google and password links to one account (Google verifies emails); password reset and email verification are cut because they need an email service.

### D-007 · 2026-11-21 · Real-time co-editing: deferred
- **Options:** Liveblocks (managed Yjs); self-hosted Hocuspocus on Render; defer.
- **Decision:** Deferred. Use autosave with optimistic concurrency (a `version` column, 409 on stale writes, and a conflict banner) instead.
- **Rationale:** Depth in the core flows first. Co-editing needs long-lived socket infrastructure that Vercel functions don't provide simply.
- **Tradeoff:** Two simultaneous editors can't merge edits. The second writer is warned rather than silently overwriting. The schema leaves room to add Yjs later.

### D-008 · 2026-11-21 · Sharing: viewer/editor roles + pending invites
- **Decision:** Owners share by email with the role `viewer` or `editor`. Shares to emails without an account are stored as pending and claimed on signup or sign-in. Only owners manage shares or delete docs. A doc the user can't access returns 404 (not 403) so its existence isn't revealed.
- **Rationale:** Shows real access-control thinking at low cost.
- **Tradeoff:** No email notifications (no email service), so the invitee must be told out of band.

### D-009 · 2026-11-21 · File upload: import .txt / .md / .docx as a new document
- **Options:** import as new doc; also insert into an existing doc; also attachments (Vercel Blob).
- **Decision:** Import as a new doc only. Limit 4 MB (Vercel's request body limit is 4.5 MB). `.md` goes through `marked` and `.docx` through `mammoth`, each to HTML and then to TipTap JSON.
- **Rationale:** The most product-relevant behavior with no extra storage dependency.
- **Tradeoff:** Images, tables and complex `.docx` styling are dropped. This is documented in the UI and README.

### D-010 · 2026-11-21 · Testing strategy
- **Decision:** Vitest unit tests for the permission matrix, import conversion, version conflicts and validators. One Playwright E2E test for the share flow.
- **Rationale:** Tests target the logic where bugs would matter most: access control and data integrity.

### D-011 · 2026-11-21 · Framework config and session details
- **Decision:** Next.js 16's default `cacheComponents` / `partialPrefetching` are disabled. Auth.js uses JWT sessions. OAuth emails are normalized (lowercased) through a thin adapter wrapper.
- **Rationale:** Every page is per-user and rendered at request time, so caching adds build constraints and no benefit. The Credentials provider requires JWT sessions. Normalizing emails keeps share-by-email matching reliable across both login methods.
- **Tradeoff:** JWT sessions can't be revoked server-side before they expire. That's acceptable at this scope, and authorization is still re-checked against the database on every request.

### D-012 · 2026-11-21 · Embedded Postgres (PGlite) for local dev and tests
- **Decision:** `DATABASE_URL=pglite:<dir>` runs a file-backed embedded Postgres locally. Tests use an in-memory PGlite per test with the real migrations. Production uses Neon.
- **Rationale:** Reviewers can run the app with no database install, and tests exercise real SQL (constraints, cascades, conditional updates) with no mocks or Docker.
- **Tradeoff:** PGlite is single-process. Next dev loads route handlers and pages as separate module copies, so the instance is kept as a process-wide singleton. It isn't used in production.

### D-013 · 2026-11-21 · E2E runs on the installed Chrome
- **Decision:** Playwright uses `channel: "chrome"` by default (`PW_CHANNEL=chromium` switches to the bundled browser) and an isolated throwaway DB on port 3100.
- **Rationale:** No ~150 MB browser download is needed locally (the dev machine's system drive was nearly full). The E2E test never touches dev data.

### D-014 · 2026-11-21 · Migrations are applied manually before deploy
- **Decision:** `npm run db:migrate` runs explicitly against the production database rather than as part of the Vercel build.
- **Rationale:** Schema changes stay a deliberate step, and preview builds can't migrate the production DB by accident.

### D-015 · 2026-11-21 · Amends D-006: no automatic Google ↔ password account linking
- **Decision:** `allowDangerousEmailAccountLinking: false`. Google sign-in for an email that already has a password account shows "sign in with your password" (Auth.js `OAuthAccountNotLinked`).
- **Why it changed:** the final code review pointed out that D-006's safety argument looked at the wrong side. Google verifies the *Google* email, but password signups are never verified. An attacker could register `victim@gmail.com` with a password, and when the victim later used Google they'd be linked into an account whose password the attacker holds (pre-account takeover).
- **Tradeoff:** someone who signed up with a password can't later switch to Google for the same email. Proper fix later: email verification, then link only verified accounts.

### D-016 · 2026-11-21 · Import validates content, not MIME type
- **Decision:** uploads are checked by extension plus actually decoding/parsing the content (BOM-aware text decoding that rejects binary data; mammoth for .docx). The browser-supplied MIME type is not trusted or required.
- **Rationale:** browsers report inconsistent MIME types for `.md` (often empty or `application/octet-stream` on Windows), and the client controls that field anyway, so parsing is the stronger check. This deviates from the spec's "extension and MIME type" wording on purpose.
