# Key decisions

## 1. No live co-editing. Warn on conflicting saves instead.
- **Why:** live co-editing needs an always-on sync server, which is a lot of work and infrastructure for 2–3 days.
- **Instead:** every save checks whether someone else saved first. If they did, you see "This document was changed elsewhere", with Reload and Copy my text buttons. Nobody's work gets silently overwritten.
- **Cost:** two people can't type in the same doc at once.

## 2. People without access get "not found", not "no permission".
- **Why:** "no permission" tells a stranger the document exists.
- **How:** the server checks every request against the doc's owner, editors and viewers. Hiding buttons in the UI isn't relied on.
- **Cost:** none for users. Someone with the wrong link just sees "not found".

## 3. You can share with people who haven't signed up yet.
- **Why:** you usually share first and the other person joins later.
- **How:** the invite is saved against their email and shows as *Pending*. The doc appears for them when they sign up.
- **Cost:** no email is sent, because that needs an email service. You send the link yourself.
- **Cost:** there's no email verification, so whoever signs up first with that address gets the invite.

## 4. "Anyone with the link can view."
- **Why:** sometimes you just want to send a read-only link without adding people one by one.
- **How:** the owner flips one switch. It works without an account, it's view-only, and turning it off removes access immediately. People already added as editors keep editing.

## 5. Google and password accounts are not merged automatically.
- **Why:** I first planned to merge them by email, but that let someone sign up with your email first and then share your account. So I reversed it.
- **Cost:** if you signed up with a password, you can't later switch to Google for the same email.

## 6. Import creates a new document. It doesn't merge into an existing one.
- **Why:** it's the simplest useful version: drop in a `.txt`, `.md` or `.docx` file and keep working on it.
- **How:**
  - Headings, lists and bold/italic come through. Images and tables don't, and the upload button says what's supported.
  - Bad or empty files get a clear error.
  - Windows "Unicode" text files work.
- **Cost:** no attachments, and no inserting a file into a doc you've already started.

## 7. Three demo accounts with pre-shared documents.
- **Why:** testing sharing otherwise means creating two accounts and switching between them.
- **How:** one click on the login page signs you in. Together the accounts show editor, viewer, pending, public and private docs.
- **Reset:** one command, `npm run seed:demo`, puts the demo data back if someone changes it.
- **Cost:** the demo password is public. The accounts only hold sample data.
