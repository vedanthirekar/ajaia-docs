# Ajaia Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed, Google-Docs-inspired editor with rich text, file import, owner/editor/viewer sharing with pending invites, and Postgres persistence.

**Architecture:** A single Next.js App Router app. REST route handlers under `app/api/**` validate input with Zod and delegate to services in `lib/services/*`. Every service takes a `db` argument and calls `lib/permissions.ts` for access decisions. Content is stored as TipTap JSON in Postgres (Neon in production, PGlite in tests).

**Tech Stack:** Next.js (latest, App Router, TypeScript), Tailwind + shadcn/ui, TipTap v3, Auth.js v5 (`next-auth@beta`) with `@auth/drizzle-adapter`, Drizzle ORM + `@neondatabase/serverless`, `@electric-sql/pglite` (tests), Zod, bcryptjs, marked, mammoth, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-collab-doc-editor-design.md`

## Global Constraints

- Free tiers only (Vercel Hobby, Neon free, Google OAuth). There must be no paid dependency.
- Node.js runtime only. Never set `export const runtime = 'edge'`.
- Upload limit: **4 MB**. Accepted: **`.txt`, `.md`, `.docx`**. That exact list must appear in the UI and the README.
- Title: trimmed, **1–200 chars**, default **"Untitled document"**.
- Password: **≥ 8 chars**, hashed with bcryptjs (cost 10).
- Emails are always stored and compared **trimmed + lowercased**.
- Roles: `'owner' | 'editor' | 'viewer'`. Share roles: `'editor' | 'viewer'` only.
- No-access docs return **404**, never 403. Insufficient role returns **403**.
- Error body everywhere: `{ "error": { "code": string, "message": string } }`.
- Content PATCH requires `version`. A stale version returns **409** `VERSION_CONFLICT`.
- Max serialized content size: **1 MB** (400 `CONTENT_TOO_LARGE`).
- Scripts must run on Windows (npm scripts, no bash-only commands).
- Append a `decisions.md` entry whenever a task makes a non-trivial choice not already logged.
- No seeded demo users.

## Review Focus

1. **Typing during an in-flight save:** keystrokes made while a save is pending must not be lost, and the next save must send the new version. Covered by Task 9 `saveQueue` tests.
2. **Email case and whitespace:** sharing to `" Bob@Example.com "` must match a later signup as `bob@example.com`, and the reverse. Covered by Task 6 tests.
3. **Access revoked while a doc is open:** the next save returns 404 or 403. The editor must stop autosaving, show a banner and go read-only, not retry forever. Covered by Task 6 (service returns NOT_FOUND after revoke) and Task 9 (`saveQueue` maps 403/404 to a terminal `forbidden` state).
4. **Reload right after typing:** content typed then reloaded within ~1 s must be saved (flush on `visibilitychange`/`pagehide`). Covered by the Task 12 E2E step.
5. **Bad uploads:** a `.docx` that isn't really a docx, an empty file, or a file over 4 MB each get a clear 422 or 413 response and never a 500. Covered by Task 7 tests.

---

## File Structure

```
app/
  layout.tsx, globals.css
  (auth)/login/page.tsx, (auth)/signup/page.tsx
  page.tsx                         dashboard (server component, redirects if signed out)
  documents/[id]/page.tsx          editor page (server: loads doc + role)
  api/auth/[...nextauth]/route.ts  Auth.js handlers
  api/auth/signup/route.ts
  api/documents/route.ts           GET list, POST create
  api/documents/import/route.ts    POST multipart
  api/documents/[id]/route.ts      GET, PATCH, DELETE
  api/documents/[id]/shares/route.ts            GET, POST
  api/documents/[id]/shares/[shareId]/route.ts  PATCH, DELETE
auth.ts                            Auth.js config (Google + Credentials)
proxy.ts                           route protection (Next 16 name for middleware)
lib/
  db/schema.ts, db/index.ts        Drizzle schema + Neon client
  db/test-db.ts                    PGlite factory for tests
  errors.ts                        AppError + toResponse
  validation.ts                    Zod schemas
  permissions.ts                   getRole + can
  api.ts                           route helpers (requireUser, handle)
  services/users.ts, services/documents.ts, services/shares.ts
  import/convert.ts                file → TipTap JSON
  editor/extensions.ts             shared TipTap extension list (client + server)
  editor/saveQueue.ts              autosave state machine (framework-free)
components/
  editor/Editor.tsx, editor/Toolbar.tsx, editor/SaveStatus.tsx, editor/TitleInput.tsx
  dashboard/DocList.tsx, dashboard/NewDocButton.tsx, dashboard/ImportButton.tsx
  share/ShareDialog.tsx
  auth/AuthForm.tsx
tests/
  unit/*.test.ts, fixtures/, e2e/share-flow.spec.ts
drizzle/                           generated migrations
README.md, ARCHITECTURE.md, AI_NOTES.md, decisions.md
```

---

### Task 1: Scaffold, tooling, git

**Files:**
- Create: the Next.js app in the repo root (keep existing `decisions.md`, `docs/`, `assessment_instructions.md`), `vitest.config.ts`, `.env.example`, `.gitignore` additions, `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev | build | test | test:e2e | db:generate | db:migrate | lint`. The path alias `@/*` maps to the repo root.

- [ ] **Step 1:** `git init`, then `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes` (move existing files aside first if the CLI refuses a non-empty dir, then restore them).
- [ ] **Step 2:** `npx shadcn@latest init -d`, then add `button input label dialog dropdown-menu select badge card sonner separator`.
- [ ] **Step 3:** Install the runtime deps `drizzle-orm @neondatabase/serverless next-auth@beta @auth/drizzle-adapter zod bcryptjs marked mammoth @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/html` and the dev deps `drizzle-kit @electric-sql/pglite vitest @vitejs/plugin-react vite-tsconfig-paths @playwright/test @types/bcryptjs docx dotenv`.
- [ ] **Step 4:** Write `vitest.config.ts` (node environment, tsconfig paths, include `tests/unit/**/*.test.ts`) and `tests/unit/smoke.test.ts` asserting `1 + 1 === 2`. Add the scripts from Interfaces. `.env.example` lists `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL` (optional).
- [ ] **Step 5:** Run `npm test` (expect 1 passing test) and `npm run build` (expect success).
- [ ] **Step 6:** Commit with `chore: scaffold Next.js app with tooling`.

### Task 2: Database schema, clients, error and validation primitives

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `lib/db/test-db.ts`, `drizzle.config.ts`, `lib/errors.ts`, `lib/validation.ts`
- Test: `tests/unit/validation.test.ts`, `tests/unit/schema.test.ts`

**Interfaces:**
- Produces:
  - Tables: `users`, `accounts` (Auth.js adapter shape), `documents`, `documentShares`, with columns exactly as in spec §5. `documents.content` is `jsonb` with default `{"type":"doc","content":[{"type":"paragraph"}]}`. `documents.version` is an integer with default 1. `documentShares` has a unique index on `(documentId, email)` and `onDelete: 'cascade'` on documentId. `users.passwordHash` is nullable.
  - `type Db` (a Drizzle Postgres database typed with `schema`, valid for both the neon-http and pglite drivers). `db: Db` in `lib/db/index.ts`.
  - `createTestDb(): Promise<Db>` creates in-memory PGlite and applies `./drizzle` migrations.
  - `class AppError extends Error { code: ErrorCode; status: number }`, where `ErrorCode` is one of `'UNAUTHENTICATED'|'VALIDATION'|'NOT_FOUND'|'FORBIDDEN'|'VERSION_CONFLICT'|'CONTENT_TOO_LARGE'|'EMAIL_TAKEN'|'UNSUPPORTED_FILE'|'FILE_TOO_LARGE'|'UNPARSEABLE_FILE'|'SELF_SHARE'|'ALREADY_SHARED'`, with statuses 401/400/404/403/409/400/409/422/413/422/400/409. Also `errorResponse(e: unknown): Response`, which maps an AppError to its status and anything else to 500 `INTERNAL` (logging it).
  - Zod: `emailSchema` (trim → lowercase → email), `titleSchema`, `signupSchema {name 1–100, email, password ≥8 ≤72}`, `updateDocSchema {title?, content?, version: int ≥1}` with at least one of title or content, plus a content refine for `type === 'doc'` and `JSON.stringify(content).length ≤ 1_000_000`, `createShareSchema {email, role: 'editor'|'viewer'}`, `updateShareSchema {role}`.

- [ ] **Step 1: Write the failing tests.** In `validation.test.ts`: `emailSchema.parse('  Bob@Example.COM ') === 'bob@example.com'`; `titleSchema` rejects `''` and `'   '` and a 201-char string, and trims `'  Hi '` to `'Hi'`; `signupSchema` rejects a 7-char password; `updateDocSchema` rejects `{version:1}` (nothing to update), `{content:{type:'paragraph'},version:1}`, and content whose serialized size exceeds 1 MB (expect the issue to mention size); `createShareSchema` rejects role `'owner'`. In `schema.test.ts`: `createTestDb()` then insert a user and a document, and read back `version === 1` and the default content type `'doc'`.
- [ ] **Step 2:** Run `npm test` and expect it to fail on missing modules.
- [ ] **Step 3:** Implement the schema, run `npm run db:generate` to produce `drizzle/0000_*.sql`, then implement `test-db.ts` (`drizzle-orm/pglite` + `migrate` from `drizzle-orm/pglite/migrator`), `index.ts` (`drizzle-orm/neon-http`), `errors.ts` and `validation.ts`.
- [ ] **Step 4:** Run `npm test` and expect it to pass.
- [ ] **Step 5:** Commit with `feat: db schema, validation and error primitives`.

### Task 3: Permissions module

**Files:**
- Create: `lib/permissions.ts`
- Test: `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces:
  - `type Role = 'owner'|'editor'|'viewer'`, `type Action = 'view'|'edit'|'rename'|'share'|'delete'`
  - `can(role: Role | null, action: Action): boolean`, a pure function implementing spec §5's matrix.
  - `getRole(db: Db, user: {id: string; email: string}, docId: string): Promise<Role | null>`. Returns `owner` if the user owns the doc. Otherwise it returns the role of the share matching `userId = user.id` OR `email = user.email`. Otherwise null. A non-uuid `docId` returns null, not an error.
  - `assertCan(db, user, docId, action): Promise<Role>`. Throws `NOT_FOUND` when the role is null and `FORBIDDEN` when the role exists but the action isn't allowed.

- [ ] **Step 1: Write the failing tests.** A table-driven test over every `(role, action)` pair matching the matrix: owner can do everything; editor can view, edit and rename; viewer can only view; null can do nothing. DB tests with `createTestDb()`: the owner gets `'owner'`; a share by userId gets its role; a pending share by email (userId null) gets its role; an unrelated user gets null; `getRole` with `'not-a-uuid'` gets null; `assertCan` for a viewer doing `'edit'` rejects with code `FORBIDDEN`; for a stranger doing `'view'` it rejects with `NOT_FOUND`.
- [ ] **Step 2:** Run the tests and expect them to fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and expect them to pass.
- [ ] **Step 5:** Commit with `feat: permission matrix and role resolution`.

### Task 4: Auth (Google + email/password, signup, pending-share claim, route protection)

**Files:**
- Create: `lib/services/users.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/signup/route.ts`, `proxy.ts`, `lib/api.ts`
- Test: `tests/unit/users.test.ts`

**Interfaces:**
- Consumes: `Db`, `signupSchema`, `AppError`, `errorResponse`.
- Produces:
  - `createUserWithPassword(db, input: {name; email; password}): Promise<{id; email; name}>`. Throws `EMAIL_TAKEN` if the email exists, including Google-created users. Calls `claimPendingShares`.
  - `verifyCredentials(db, email, password): Promise<{id; email; name} | null>`. Returns null for an unknown email, a wrong password, or a user with no passwordHash.
  - `claimPendingShares(db, userId, email): Promise<number>` sets `userId` on shares where `email` matches and `userId` is null, and returns the count.
  - `auth.ts` exports `{ handlers, auth, signIn, signOut }`: `DrizzleAdapter`, `session: { strategy: 'jwt' }`, Google with `allowDangerousEmailAccountLinking: true`, Credentials calling `verifyCredentials`, `events.signIn` calling `claimPendingShares`, JWT/session callbacks putting `id` and `email` on `session.user`, and `pages: { signIn: '/login' }`.
  - `lib/api.ts`: `requireUser(): Promise<{id; email; name}>` (throws `UNAUTHENTICATED`) and `handle(fn: () => Promise<Response>): Promise<Response>` (try/catch → `errorResponse`).
  - `proxy.ts` redirects signed-out users to `/login` for `/` and `/documents/*`. API routes enforce auth themselves through `requireUser`.

- [ ] **Step 1: Write the failing tests.** `createUserWithPassword` stores a lowercased email and a bcrypt hash that isn't the plaintext. A duplicate email in different case rejects with `EMAIL_TAKEN`. `verifyCredentials` returns the user for the correct password and null for a wrong password, an unknown email, or a user inserted with `passwordHash: null`. Pre-insert a share `{email:'new@x.com', userId:null}`, sign up `'New@X.com'`, and expect the share's `userId` to be set.
- [ ] **Step 2:** Run the tests and expect them to fail.
- [ ] **Step 3:** Implement the users service, `auth.ts`, the routes, `proxy.ts` and `lib/api.ts`. Check the Auth.js v5 + Next 16 APIs against the installed package docs, not from memory.
- [ ] **Step 4:** Run the tests and expect them to pass. Also run `npm run build` and expect success.
- [ ] **Step 5:** Append decision D-011 to `decisions.md` (JWT sessions required by Credentials; email-linking rationale). Commit with `feat: auth with Google and email/password`.

### Task 5: Documents service + API

**Files:**
- Create: `lib/services/documents.ts`, `app/api/documents/route.ts`, `app/api/documents/[id]/route.ts`
- Test: `tests/unit/documents.test.ts`

**Interfaces:**
- Consumes: `assertCan`, `getRole`, `can`, Zod schemas, `requireUser`, `handle`.
- Produces (`type User = {id; email; name}`; `DocSummary = {id, title, updatedAt, role, ownerName, ownerEmail}`; `DocDetail = DocSummary & {content, version}`):
  - `listDocuments(db, user): Promise<{owned: DocSummary[]; shared: DocSummary[]}>`. Both are sorted by `updatedAt` descending. `shared` covers shares by userId or email.
  - `createDocument(db, user, input?: {title?: string; content?: JSONContent}): Promise<DocDetail>`
  - `getDocument(db, user, id): Promise<DocDetail>` (view)
  - `updateDocument(db, user, id, input: {title?; content?; version}): Promise<DocDetail>`. Title-only changes need `rename` and content changes need `edit`. This is an atomic conditional update `WHERE id = ? AND version = ?` that sets `version = version + 1` and `updatedAt = now()`. Zero rows means `VERSION_CONFLICT`.
  - `deleteDocument(db, user, id): Promise<void>` (delete)
  - Routes: `GET /api/documents` gives a 200 list. `POST` with optional `{title}` gives 201. `GET/PATCH/DELETE /api/documents/:id` give 200/200/204, and every body is parsed with Zod (a failure gives 400 `VALIDATION` with the first issue message).

- [ ] **Step 1: Write the failing tests.** Create → `title 'Untitled document'`, `version 1`, role `owner`. Update with `version:1` → `version 2`, and the content round-trips deep-equal, including bold/heading/list marks. Update again with a stale `version:1` → `VERSION_CONFLICT`. A viewer updating content → `FORBIDDEN`. An editor renaming → OK. An editor deleting → `FORBIDDEN`. A stranger getting → `NOT_FOUND`. `listDocuments` puts the owned doc in `owned` and the shared one in `shared`, with the role and owner name.
- [ ] **Step 2:** Run the tests and expect them to fail.
- [ ] **Step 3:** Implement the service and routes.
- [ ] **Step 4:** Run the tests and expect them to pass.
- [ ] **Step 5:** Commit with `feat: documents service and REST API`.

### Task 6: Shares service + API

**Files:**
- Create: `lib/services/shares.ts`, `app/api/documents/[id]/shares/route.ts`, `app/api/documents/[id]/shares/[shareId]/route.ts`
- Test: `tests/unit/shares.test.ts`

**Interfaces:**
- Consumes: `assertCan(…, 'share')`, `createShareSchema`, `updateShareSchema`.
- Produces (`ShareView = {id, email, role, status: 'active'|'pending', name: string|null}`):
  - `listShares(db, user, docId): Promise<ShareView[]>` (owner only)
  - `createShare(db, user, docId, {email, role}): Promise<ShareView>`. Throws `SELF_SHARE` if the email is the owner's and `ALREADY_SHARED` on a duplicate. Sets `userId` immediately if a user with that email exists (status active), otherwise pending.
  - `updateShare(db, user, docId, shareId, {role})` and `deleteShare(db, user, docId, shareId)`. A share not on that doc gives `NOT_FOUND`.
  - Routes: GET 200, POST 201, PATCH 200, DELETE 204.

- [ ] **Step 1: Write the failing tests.** Sharing to an existing user gives status `active`. Sharing to `' Bob@Example.com '` before Bob exists gives `pending`; then `createUserWithPassword` for `bob@example.com` makes `listDocuments(bob).shared` contain the doc with role viewer. Sharing to the owner's own email gives `SELF_SHARE`. Sharing again gives `ALREADY_SHARED`. An editor creating a share gives `FORBIDDEN`. After `deleteShare`, `getDocument(bob)` gives `NOT_FOUND` and `updateDocument(bob, …)` gives `NOT_FOUND` (Review Focus 3). Downgrading editor to viewer makes the next content update give `FORBIDDEN`. Deleting the doc cascades its shares away.
- [ ] **Step 2:** Run the tests and expect them to fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and expect them to pass.
- [ ] **Step 5:** Commit with `feat: sharing with roles and pending invites`.

### Task 7: File import (convert + API)

**Files:**
- Create: `lib/editor/extensions.ts`, `lib/import/convert.ts`, `app/api/documents/import/route.ts`, `tests/fixtures/sample.md`, `tests/fixtures/sample.txt`
- Test: `tests/unit/import.test.ts`

**Interfaces:**
- Produces:
  - `editorExtensions` (StarterKit configured with headings 1–3; TipTap v3's StarterKit includes Underline). This exact array is used by both the client editor and server conversion so the schemas match. Placeholder is added client-side only.
  - `MAX_IMPORT_BYTES = 4 * 1024 * 1024`, `SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx']`
  - `fileToDoc(name: string, bytes: Buffer): Promise<{title: string; content: JSONContent}>`. Throws `UNSUPPORTED_FILE`, `FILE_TOO_LARGE` or `UNPARSEABLE_FILE` (empty, whitespace-only, or a parser failure). `.txt` splits paragraphs on blank lines (escape HTML). `.md` goes through `marked.parse` and then `generateJSON`. `.docx` goes through `mammoth.convertToHtml` and then `generateJSON`. Use `@tiptap/html`'s server entry; check the import path in the installed version. The title is the filename without its extension, trimmed to 200 chars, falling back to `'Untitled document'`.
  - `POST /api/documents/import` takes multipart with field `file`, and creates the doc through `createDocument` → 201 `DocDetail`.

- [ ] **Step 1: Write the failing tests.** The `sample.md` fixture (`# Title`, `**bold**`, `- a\n- b`, `1. x`) gives JSON containing node types `heading`(level 1), `bulletList` and `orderedList` and mark `bold`. `.txt` with `"a\n\nb"` gives two paragraphs, and `<script>` comes out as literal text. `.docx`, built in-test with the `docx` package (a Heading1, a bold run and a bullet), gives `heading` and `bold`. `'evil.docx'` with bytes `'not a zip'` gives `UNPARSEABLE_FILE`. An empty `.md` gives `UNPARSEABLE_FILE`. `'x.pdf'` gives `UNSUPPORTED_FILE`. A 4 MB + 1 byte buffer gives `FILE_TOO_LARGE`. The title of `'Q3 Plan.docx'` is `'Q3 Plan'`.
- [ ] **Step 2:** Run the tests and expect them to fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and expect them to pass.
- [ ] **Step 5:** Commit with `feat: import txt/md/docx as new documents`.

### Task 8: Auth pages + dashboard UI

**Files:**
- Create: `components/auth/AuthForm.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/page.tsx`, `components/dashboard/DocList.tsx`, `NewDocButton.tsx`, `ImportButton.tsx`, header with user menu and sign out in `app/layout.tsx`

**Interfaces:**
- Consumes: `signIn` (`next-auth/react`), `POST /api/auth/signup`, `listDocuments` (called directly in the server component), `POST /api/documents`, `POST /api/documents/import`.
- Behavior:
  - Login has a "Continue with Google" button, a divider, and an email/password form. Errors show inline ("Invalid email or password", "An account with this email already exists"). There's a link between login and signup. Signup calls the API and then `signIn('credentials')`.
  - The dashboard has two sections, "My documents" and "Shared with me". Each has an empty state ("No documents yet. Create one or import a file" / "Nothing shared with you yet"). Cards show the title, relative updated time and a role badge (Editor/Viewer), plus "Owner: name" on shared docs. Owned cards have a delete action in a menu, confirmed with a shadcn dialog, not `window.confirm`.
  - New document → POST, then navigate to `/documents/:id`.
  - The Import button opens a file picker with `accept=".txt,.md,.docx"` and the helper text **"Supported: .txt, .md, .docx (max 4 MB)"**. Errors appear as a toast showing the server message. Success navigates to the new doc.

- [ ] **Step 1:** Implement the components and pages.
- [ ] **Step 2:** Verify manually with `npm run dev` against a Neon dev branch (or a local Postgres URL): sign up, land on the empty dashboard, create a doc, import `tests/fixtures/sample.md`, delete a doc. Check the browser console has no errors and the layout holds at 375 px width.
- [ ] **Step 3:** Commit with `feat: auth pages and dashboard`.

### Task 9: Editor page (TipTap, toolbar, autosave, conflict/forbidden handling, read-only)

**Files:**
- Create: `lib/editor/saveQueue.ts`, `components/editor/Editor.tsx`, `Toolbar.tsx`, `SaveStatus.tsx`, `TitleInput.tsx`, `app/documents/[id]/page.tsx`
- Test: `tests/unit/saveQueue.test.ts`

**Interfaces:**
- Consumes: `editorExtensions`, `getDocument` (server component; NOT_FOUND → `notFound()`), `PATCH /api/documents/:id`.
- Produces:
  - `type SaveState = 'saved'|'dirty'|'saving'|'error'|'conflict'|'forbidden'`
  - `createSaveQueue(opts: {initialVersion: number; save: (payload: {content?; title?; version: number}) => Promise<{ok: true; version: number} | {ok: false; status: number}>; debounceMs?: number /*default 1000*/; onState: (s: SaveState) => void})`, returning `{ setContent(c), setTitle(t), flush(): Promise<void>, dispose() }`. Rules: only one request in flight at a time. Edits made during a save are merged and sent after it, using the version that save returned. A 409 response → `conflict`, and later edits are not sent. A 403 or 404 → `forbidden`, terminal. Other failures or network errors → `error`, retrying with backoff (2 s, 4 s, 8 s, max 30 s) and keeping the pending changes.
- Behavior:
  - The toolbar has Bold, Italic, Underline, Strikethrough, a paragraph/H1/H2/H3 select, bullet list, numbered list, undo and redo. Active states come from `editor.isActive`. Buttons have `aria-label`s and tooltips with shortcuts.
  - `SaveStatus` shows "Saving…" / "Saved" / "Unsaved changes" / "Connection problem — retrying" / conflict banner "This document was changed elsewhere. Reload to see the latest version." with a Reload button / forbidden banner "You no longer have edit access to this document." In the conflict and forbidden states the editor becomes `setEditable(false)`.
  - Flush on `visibilitychange` (hidden) and `pagehide`. Use `fetch(..., {keepalive: true})` for that flush. A `beforeunload` warning appears only while the state is dirty, saving or error.
  - Viewers get no toolbar, `editable: false`, a "View only" badge and a read-only title.
  - The page header has a back link to the dashboard, `TitleInput` (saves on blur or Enter; an empty value reverts and shows a toast), `SaveStatus`, and a Share button (owner only, wired up in Task 10).

- [ ] **Step 1: Write the failing tests** (fake timers, fake `save`). Debounce: three `setContent` calls inside 1 s give one save. Typing during an in-flight save gives exactly one more save after it resolves, carrying the latest content and the version returned by the first save (Review Focus 1). A 409 gives state `conflict`, and later `setContent` triggers no save. A 404 gives `forbidden`, with no retries. A 500 gives `error`, then a retry after 2 s and `saved` on success. `flush()` saves immediately without waiting for the debounce.
- [ ] **Step 2:** Run the tests and expect them to fail.
- [ ] **Step 3:** Implement `saveQueue`, then the editor components and the page.
- [ ] **Step 4:** Run the tests and expect them to pass. Manual check: every toolbar format works and survives a reload; edit the same doc in two tabs and confirm the second save shows the conflict banner; open the doc as a viewer and confirm it's read-only.
- [ ] **Step 5:** Commit with `feat: rich-text editor with safe autosave`.

### Task 10: Share dialog UI

**Files:**
- Create: `components/share/ShareDialog.tsx`; modify `app/documents/[id]/page.tsx` to mount it for owners.

**Interfaces:**
- Consumes: the `/api/documents/:id/shares` endpoints from Task 6.
- Behavior: email input + role select (Viewer default) + Share button. Server errors show inline (self-share, already shared, invalid email). The list shows each share's name or email, a "Pending — will get access when they sign up" tag for pending shares, a role select (PATCH on change) and a remove button. A note explains: "People you share with won't get an email; send them the link." A "Copy link" button copies the doc URL.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Manual check in two browsers (normal + incognito). A shares with B as viewer: B sees the doc under "Shared with me" and can't edit. A switches B to editor: after a refresh B can edit. A removes B: B's next save shows the forbidden banner, and on refresh B gets 404.
- [ ] **Step 3:** Commit with `feat: share dialog`.

### Task 11: Polish, error pages, empty and loading states

**Files:**
- Create: `app/documents/[id]/not-found.tsx` ("Document not found or you don't have access", with a link home), `app/error.tsx`, `app/documents/[id]/loading.tsx`; touch-ups across components.

- [ ] **Step 1:** Implement. Also check keyboard focus order and visible focus rings, `<title>` set to the doc title, and the editor at 375 px width (the toolbar wraps or scrolls horizontally inside its own row, never the whole page).
- [ ] **Step 2:** Run `npm run lint && npm test && npm run build` and expect all to pass.
- [ ] **Step 3:** Commit with `chore: polish states and accessibility`.

### Task 12: Playwright E2E share flow

**Files:**
- Create: `playwright.config.ts` (webServer `npm run dev`, baseURL from `E2E_BASE_URL` or `http://localhost:3000`), `tests/e2e/share-flow.spec.ts`

- [ ] **Step 1: Write the test.** Two browser contexts, with emails made unique by timestamp. A signs up, creates a doc, renames it to "E2E Doc", types a heading and a bold word, waits for "Saved", reloads, and expects the heading and bold text to still be there. Then A types "quick" and reloads within 300 ms, and expects "quick" to be present (Review Focus 4). A shares with B's email as Viewer and expects a "Pending" tag. B signs up and expects "E2E Doc" under "Shared with me" with the badge "Viewer". B opens it and expects "View only", no toolbar, and `contenteditable="false"`.
- [ ] **Step 2:** Run `npx playwright install chromium && npm run test:e2e` and expect it to pass (needs `DATABASE_URL` pointing at a dev or test Neon branch).
- [ ] **Step 3:** Commit with `test: e2e share flow`.

### Task 13: Deploy (Neon, Google OAuth, Vercel)

User-assisted. Walk the user through each external step and wait for confirmation before moving on.

- [ ] **Step 1:** Neon: create the project (or add it through the Vercel Marketplace), get pooled `DATABASE_URL`s for a `dev` and a `main` branch, put the dev one in `.env.local` and run `npm run db:migrate`.
- [ ] **Step 2:** Push to GitHub (the user creates the repo, then `git remote add origin … && git push -u origin main`), import it in Vercel, and set the env vars `DATABASE_URL` (main), `AUTH_SECRET` (`npx auth secret`), and `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`. Migrations are run manually with `npm run db:migrate` against main before the first deploy (decision D-012: manual is safer than migrating during the build).
- [ ] **Step 3:** Google Cloud: create a project → OAuth consent screen (External, scopes openid/email/profile) → **Publish app** → create an OAuth client (Web), with redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://<vercel-domain>/api/auth/callback/google`.
- [ ] **Step 4:** Smoke-test the production URL: Google sign-in, password signup, create, format, reload, import, share, and access from a second account. Run `E2E_BASE_URL=<prod> npm run test:e2e` (cross-platform through `cross-env`, added as a dev dep in this step).
- [ ] **Step 5:** Commit any config changes with `chore: deployment config`.

### Task 14: Documentation

**Files:**
- Create: `README.md`, `ARCHITECTURE.md`, `AI_NOTES.md`; finalize `decisions.md`

- [ ] **Step 1:** README: what it is, live URL, features, **supported import types (.txt, .md, .docx, max 4 MB) and what's dropped (images, tables, complex styles)**, how to test sharing (two accounts or an incognito window), local setup (Node 22+, `npm i`, `.env.local`, `npm run db:migrate`, `npm run dev`), scripts, tests, known limitations and deliberate cuts.
- [ ] **Step 2:** ARCHITECTURE.md (about one page): priorities and why, a diagram, the data model, the permission matrix, the autosave and conflict model, import pipeline, tradeoffs, and what comes next (Yjs co-editing path, email invites, version history).
- [ ] **Step 3:** AI_NOTES.md: the user fills in specifics. Pre-populate an outline with concrete entries gathered during the build (where AI sped things up, what was changed or rejected — for example AI-proposed SQLite on Vercel, server-action-only APIs, `window.confirm` — and how things were verified: tests, manual cross-account checks, E2E).
- [ ] **Step 4:** Check every doc link and command against the repo by running each command in the README from a clean clone.
- [ ] **Step 5:** Commit with `docs: README, architecture and AI notes`.
