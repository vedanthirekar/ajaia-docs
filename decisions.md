# Key decisions

The seven decisions that shaped the product most: who each one was for, what I considered, and what I gave up.

---

## 1. Go deep on "safe collaboration" instead of copying Google Docs

**The problem:** the brief is open-ended, and the timebox was 2–3 days. Trying to copy Google Docs would give a shallow app that breaks in the places users care about most.

**Options:** real-time co-editing; comments and version history; or fewer features done properly.

**Decision:** I focused on the things that hurt most when they go wrong: **losing work** and **the wrong person seeing a document**. Real-time co-editing was cut. Instead, every save carries a version number. If someone else saved first, you get a clear "changed elsewhere" message, with a way to copy your text, instead of silently overwriting their work.

**Tradeoff:** two people can't type in the same doc at the same moment. But nobody ever loses work without being told, and the editor (TipTap) leaves a straightforward path to real-time later.

## 2. Access rules live in one place on the server, and outsiders see "not found"

**The problem:** hiding a button in the UI isn't security. A sharing feature is only trustworthy if every request is checked.

**Decision:** one small module decides who can do what (owner / editor / viewer), and every API route and page goes through it. It's tested for every role and action combination. People without access get **"not found"** rather than "forbidden", so the app doesn't even reveal that a document exists. Only the owner can share or delete.

**Tradeoff:** a little more code than checking roles ad hoc in each route, but the rules are easy to read, review and test.

## 3. Share like people actually share: pending invites and public links

**The problem:** in real teams you often share with someone who doesn't have an account yet, or you just want to send a read-only link.

**Options for unknown emails:** reject with an error, or remember the invite.

**Decision:**
- **Pending invites:** sharing with an unregistered email is saved, and the doc appears for that person as soon as they sign up.
- **"Anyone with the link can view":** the owner can turn this on. It works even for people who aren't signed in, and it's always read-only.
- Explicit roles always win: making a doc public never downgrades an editor.

**Tradeoff:** there are no invite emails, because sending email needs a paid or verified email service. The owner copies the link from the Share dialog instead. And with no email verification, a pending invite goes to whoever first signs up with that address. That's acceptable for a demo, and documented.

## 4. Choose the stack around a working deployment and easy review

**The problem:** reviewers need a live link and a project that runs locally without setup pain, and none of it should cost them money.

**Options:** SQLite (simple, but Vercel can't keep a database file); a separate Express backend; Supabase (fast, but it hides the backend work being assessed); Next.js + Postgres.

**Decision:**
- Next.js with real API routes on Vercel, and **Postgres (Neon)**, all on free tiers.
- Locally, the app uses an **embedded Postgres (PGlite)**, so a reviewer runs `npm install` and `npm run dev` with no database to install.
- The tests use the same thing: 143 tests run real SQL against a fresh in-memory database, with no mocks.

**Tradeoff:** two database drivers to support, one for production and one for local and tests, in exchange for zero-setup local runs and more trustworthy tests.

## 5. Real login, without an account-takeover hole

**The problem:** mocked users are quick to build, but real accounts make sharing believable and test it properly.

**Options:** seeded fake users; Google only (reviewers would need two Google accounts); Google plus email/password.

**Decision:** email/password, with Google sign-in built in. During the final review I **reversed one choice**: I'd planned to merge a Google login into an existing password account with the same email. But password signups aren't email-verified, so an attacker could register someone's address first and keep access once they later signed in with Google. Now these accounts are kept separate, and the user is told to sign in with their password.

**Tradeoff:** someone who signed up with a password can't switch to Google for the same email. A safe fix later is email verification.

## 6. Make file import useful, and impossible to crash

**The problem:** people already have documents in other formats. Uploading a file should give them an editable doc, not a bad experience.

**Decision:**
- Import **`.txt`, `.md` or `.docx` as a new document**, converted into the editor's own format so it always opens correctly. Headings, lists and bold/italic are kept; images and tables are dropped, and the UI says so.
- I check the actual file content rather than trusting its type label.
- Windows "Unicode" text files are decoded correctly.
- Fake or empty files get a clear error, never a crash.
- A file that would be too big to *save* later is rejected up front.

**Tradeoff:** no "insert into an existing document" option, and no attachments. Keeping it to one clear flow made it easy to do well.

## 7. Design for the people reviewing it, not just the feature list

**The problem:** a reviewer has minutes, not hours. If they have to sign up twice to see sharing, they may never see it.

**Decision:**
- **Three demo accounts** with realistic, cross-shared documents. One click on the login page signs you in, and together they show every sharing mode: editor, viewer, pending invite, public link and private.
- A script (`npm run seed:demo`) resets them to a clean state, because anyone can edit public demo data.
- I also spent time on polish where it's visible: a consistent visual theme, an A4 page that prints properly, and extra formatting from free, official editor extensions.
- I skipped a **paid** page-layout add-on, because the brief says reviewers shouldn't pay for anything.

**Tradeoff:** the demo password is public. That's fine because the accounts hold only mock data, can't have their password changed, and can be reset with one command.

---

*The full step-by-step design and plan the build followed are in `docs/superpowers/`.*
