Paste this into Claude Code after copying the `design-handoff/` folder into your repo root.

---

I'm restyling Ajaia Docs with a new theme. Everything you need is in `design-handoff/`:

- `DESIGN.md` is the spec (colors, type, components, spacing).
- `tokens.css` has every color, font, radius and shadow as CSS variables.
- `screens/documents.html`, `screens/editor.html` and `screens/share-dialog.html` are static mockups. Open them to see the target look. They're the visual reference, not code to paste in.
- `assets/logo.png` is the app logo and favicon.

Please:

1. Look through the current frontend first and tell me which files make up the Documents page, the editor and the share flow, and how styling is done (Tailwind, CSS modules, shadcn, etc.).
2. Add the tokens in a way that fits that setup (CSS variables plus Tailwind theme extension if we use Tailwind). Load Inter and Newsreader.
3. Set `assets/logo.png` as the favicon and header logo.
4. Restyle the Documents page, then the editor, then the share dialog to match the mockups. Keep all existing behavior, routes, data fetching and permissions exactly as they are. This is a visual change only.
5. Where the mockup shows something we don't have yet (filter tabs, ⌘K search, "Blank document" tile, toolbar items, collaborator cursor), build the UI only if it's trivial. Otherwise list it at the end and leave it out.
6. Do one page at a time and stop after the Documents page so I can review it before you continue.
