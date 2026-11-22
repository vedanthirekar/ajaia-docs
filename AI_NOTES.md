# AI-native workflow note

> _Draft generated from the build log. Personalize the first-person parts before submitting._

## Tools used

- **Claude Code** (Claude Opus, in VS Code) as a pair-programmer for scoping, planning, implementation, tests and documentation.
- **Claude in Chrome** to drive the running app in a real browser during manual verification.
- Plain tooling for verification: TypeScript, ESLint, Vitest, Playwright.

## How I worked with it

1. **Scope before code.** I gave the assignment to the AI and had it question me before proposing anything: timebox, stack, auth model, upload behavior, sharing edge cases. I made the product calls (Google plus email/password auth, defer co-editing, pending invites, import as a new doc). Every decision is logged in [decisions.md](decisions.md).
2. **Spec → plan → test-first execution.** A written design spec ([docs/superpowers/specs](docs/superpowers/specs)) became a 14-task plan ([docs/superpowers/plans](docs/superpowers/plans)). Each backend task started with failing tests, and the plan named the five failure modes most likely to hurt a real user (e.g. typing during an in-flight save, access revoked mid-edit) so each one got a test.
3. **Read the installed docs, not memory.** Next.js 16 ships its docs in `node_modules/next/dist/docs`. The AI read them before writing code, which caught real version differences: `middleware` → `proxy.ts`, Cache Components on by default, async `params`, and shadcn now generating Base UI components instead of Radix.

## Where AI materially sped things up

- Scaffolding the data layer, REST routes, Zod schemas and the error contract consistently across ~10 endpoints.
- Writing broad, table-driven tests quickly: the full role × action permission matrix, import fixtures (including generating a real `.docx` in-test), and the autosave state machine with fake timers.
- Building UI components (toolbar, share dialog, dashboard) on a component library I hadn't used in its new Base UI form.
- Docs: README, this note, and the architecture note, drafted from the actual decisions log.

## What I changed or rejected

| AI output / default | What happened |
|---|---|
| SQLite as the "simple" store | Rejected: Vercel's filesystem is ephemeral. Chose Neon Postgres, plus PGlite for zero-setup local dev and real-SQL tests. |
| Next 16's default Cache Components | Turned off: every page is per-user and dynamic, so it added build constraints with no benefit. |
| Autosave queue created with `useMemo` | **Bug caught in browser testing:** React Strict Mode's dev double-mount disposed the memoized queue and reused it, so every edit was silently dropped while the UI said "Saved". Rewrote it so the effect owns the queue's lifecycle. The E2E test now checks persistence after reload. |
| A single PGlite instance per module | **Bug caught in browser testing:** Next dev loads route handlers and pages as separate module copies, which created two embedded DB instances that didn't see each other's writes (a shared doc was missing from the dashboard). Fixed with a process-wide singleton. |
| `auth()` wrapper exported as the proxy | Didn't match Next 16's required export shape. Replaced with a cookie-presence redirect, and kept real checks server-side. |
| Import limited only by file size | Gap found while writing tests: a 1.8 MB `.txt` would import but then exceed the 1 MB save limit, so the doc could never be saved. Added a converted-size check, and wrote a test that I watched fail first. |
| My own "safe" calls, challenged by an independent AI code review | A fresh reviewer agent found four real issues I then fixed test-first: a tab-character open-redirect bypass (`/	/evil.com`), unsafe Google↔password account auto-linking (pre-account takeover), UTF-16/binary uploads causing a 500, and unload saves that silently failed for docs over 64 KiB. I also re-graded "401 retries forever" from minor to must-fix, because the user would keep typing into a doc that can't save. |
| A test with an escaped backslash | A shell heredoc collapsed `\\` and the open-redirect test checked the wrong input. Caught because the test failed for the wrong reason. Fixed the test, not the code. |

## How I verified correctness, UX quality and reliability

- **110 unit/integration tests** run real SQL against a fresh in-memory Postgres per test. No database mocks.
- **Test-first:** every service and pure module had its test written and seen failing before the implementation.
- **Mutation check on the riskiest E2E assertion:** I disabled the flush-on-pagehide code and confirmed the "reload right after typing" test fails, then restored it.
- **Manual end-to-end passes in a real browser** across two accounts: formatting round-trip, rename, conflict banner (simulated second tab), viewer read-only mode, editor rename allowed / delete forbidden, role downgrade, revoke → 404, self-share and duplicate-share errors, and 375 px mobile layout.
- **API-level checks with curl:** status codes and error bodies for malformed JSON, bad IDs, unsupported files, stale versions and unauthorized access.
- `tsc`, ESLint and a production `next build` run clean before each commit.
