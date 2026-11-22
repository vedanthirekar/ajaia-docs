# Key decisions

The seven choices that shaped the product most, and what each one means for the people using it.

---

## 1. Fewer features, done properly

**The situation:** I had 2–3 days. Copying Google Docs feature by feature would have given a big app that breaks in the places people care about most.

**What I chose:** to focus on the two things that hurt most when they go wrong: **losing your work** and **the wrong person seeing your document**. I left out live co-editing (seeing each other type), comments and version history.

**What this means for users:**
- Your work saves automatically about a second after you stop typing.
- If someone else changed the document since you opened it, the app **warns you instead of overwriting their changes**. It offers a reload button and a "copy my text" button, so nothing is lost.
- The trade-off: two people can't type in the same document at the same moment. They'll be warned, but their edits won't merge automatically.

## 2. Sharing you can trust

**The situation:** a sharing feature is only useful if people believe it. If someone could open a document just by guessing its link, nobody would share anything sensitive.

**What I chose:** every document has an **owner**, and the owner decides who gets in:
- **Viewer:** can read only.
- **Editor:** can read, edit and rename.
- Only the owner can share or delete.

These rules are checked by the server on every request, not just by hiding buttons on the screen. Someone without access sees **"Document not found"**, so they can't even tell the document exists.

**What this means for users:** you can share a roadmap with your manager as a viewer and with a teammate as an editor, and each sees exactly what they should.

## 3. Share the way people actually share

**The situation:** in real teams you often share with someone who hasn't joined yet, or you just want to send a link anyone can read.

**What I chose:**
- **Invite people before they sign up.** Share with any email address. The document shows as *Pending* and appears for that person as soon as they create an account.
- **"Anyone with the link can view."** One switch turns a document into a read-only page anyone can open, even without an account. Switching it off removes that access immediately.
- Making a document public never takes editing rights away from people you've added as editors.

**The trade-offs:**
- The app doesn't send invite emails, because that needs a paid or verified email service. You send the link yourself with the **Copy link** button.
- Accounts aren't email-verified, so whoever signs up first with an invited address gets the invite. Fine for a demo; a real product would verify emails.

## 4. Easy for reviewers to try, free for everyone

**The situation:** reviewers need a working link and a project that runs on their own machine without fuss, and they shouldn't have to pay for anything.

**What I chose:**
- **Hosting:** the live app runs on Vercel with a Postgres database (Neon), both on free plans.
- **Running locally:** the project brings its own built-in database, so there's nothing to install. `npm install` then `npm run dev` and it works.
- **Testing:** the automated tests use the same built-in database, so they check real behaviour rather than imitations. There are 143 of them.
- **Ruled out:** a simpler file-based database, because the hosting platform can't keep a saved file between requests.

**What this means for reviewers:** a working live link, and a local setup that takes a couple of minutes.

## 5. Real accounts, safely

**The situation:** fake "pick a user" logins are quicker to build, but real accounts make sharing believable and test it properly.

**What I chose:** proper sign-up and sign-in with email and password (passwords are stored securely hashed). Google sign-in is built too, ready to switch on later.

**A decision I reversed:** I'd planned that signing in with Google would automatically join an existing account with the same email. A review showed this was unsafe: someone could sign up with *your* email first, and then share your account once you signed in with Google. So the two stay separate, and the app tells you to use your password instead.

**The trade-off:** if you signed up with a password, you can't later switch to Google for the same email. Slightly less convenient, but no way for someone to take over your account.

## 6. Bring your existing documents in

**The situation:** people already have notes and documents elsewhere. Starting from a blank page every time is a reason not to use a new tool.

**What I chose:** upload a **`.txt`, `.md` (Markdown) or `.docx` (Word)** file of up to 4 MB, and it becomes a new, editable document.
- Headings, lists and bold or italic text are kept.
- Images and tables are dropped, and the upload button tells you what's supported.

I also made sure it never fails badly:
- Text files saved by Windows Notepad in "Unicode" import correctly.
- Fake, empty or damaged files get a clear message instead of an error page.
- A file too large to save afterwards is refused up front.

**The trade-off:** you can't insert a file into an existing document or attach files. One simple flow, done well.

## 7. Built for the person reviewing it

**The situation:** a reviewer has a few minutes, not an afternoon. If they have to create two accounts just to see sharing, they may never see it.

**What I chose:**
- **Three one-click demo accounts** (Maya, Leo and Priya) on the login page. Their documents are already shared with each other in every possible way: editor, viewer, pending invite, public link and private. Within a minute you can see the same document from the owner's, an editor's and a viewer's side.
- **A one-command reset,** because anyone can edit the demo data. This puts everything back as it was.
- **Visible polish:** a consistent visual design, a page that looks and prints like A4, and richer formatting (font sizes, colours, highlight, checklists).
- **Nothing that costs reviewers money:** I skipped a paid page-layout add-on for that reason.

**The trade-off:** the demo password is public. That's fine because the accounts hold only sample data, their passwords can't be changed, and everything resets with one command.

---

*The full design document and build plan are in `docs/superpowers/`.*
