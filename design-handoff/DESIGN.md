# Ajaia Docs · Cotton theme design spec

The reference screens are in `screens/`. Open them in a browser. They are static HTML with inline styles, so treat them as the visual source of truth, not as code to copy line by line. The tokens are in `tokens.css` and the logo is at `assets/logo.png`.

## Look and feel

Warm cream background, dark ink outlines, soft pastel fills. The one signature detail is the **offset shadow**: a solid sky-blue block shifted 2 to 5px down and right with no blur, like the fill on a hand-printed icon. Use it only on the primary button, the "Blank document" plus icon and modal dialogs. Everything else stays flat with 1px warm borders. No gradients, no blurred drop shadows, no emoji.

## Typography

| Use | Font | Size / weight |
|---|---|---|
| Page title ("Documents") | Newsreader | 38px / 500, letter-spacing -0.01em |
| App name in header | Newsreader | 20px / 500 |
| Document title in editor header | Newsreader | 18px / 500 |
| Document body (editor) | Newsreader | 18px / 400, line-height 1.65 |
| Document H1 / H2 | Newsreader | 38px / 24px, weight 500 |
| UI text, buttons | Inter | 13 to 14px / 400 to 500 |
| Meta text | Inter | 12px, `--muted` |
| Section labels | Inter | 12 to 13px / 600, `--muted` |

Load from Google Fonts: Inter 400/500/600, Newsreader 400/500 plus italic 400.

## Components

**Header (app shell):** height 68px, `--surface` background, bottom border `--line`. Logo 32px + "Ajaia Docs" left, search centered (max 420px), avatar right.

**Logo:** `assets/logo.png`, also used as the favicon.

**Primary button:** height 40px, padding 0 18px, `--ink` background, white text, 1.5px `--ink` border, radius `--r-md`, box-shadow `--offset-md`. Optional leading icon 15px.

**Secondary button:** same size, `--surface` background, 1.5px `--ink` border, `--ink` text, no shadow.

**Search input:** height 38px, `--bg` fill, 1px `--border`, radius 10px, search icon left, "⌘K" key hint right.

**Avatar:** 34px circle, 1.5px `--ink` border, pastel fill, initials 12px/600. Collaborators get different pastels (sky, blush, butter, mint).

**Filter tabs:** pill links. Active: `--ink` fill, white text. Inactive: 1px `--border`, `--ink-2` text.

**Document card:** `--surface`, 1px `--card-border`, radius `--r-lg`. Top 160px is a pastel thumbnail with a white mini "page" outlined in 1.5px `--ink` showing the title and grey text lines. Below: name 14px/500, meta 12px `--muted`. Shared docs also show the owner and a role pill (1px `--ink` border, 11px/500). Cycle the soft pastels across cards.

**Blank document tile:** same size as a card, 1.5px dashed `--dashed` border, centered 44px circle with plus icon, `--offset-sm`.

**Grid:** `repeat(auto-fill, minmax(220px, 1fr))`, gap 22px, content max-width 1120px with 32px side padding.

**Editor toolbar:** floating pill under the header, `--surface`, 1px `--border`, radius 12px, 34×32 icon buttons, thin dividers. Active tool gets `--sky` fill.

**Editor page:** white, max-width 780px, padding 64px 80px, 1px `--card-border`, radius 6px, centered on `--bg`. Highlights use `--butter`, blockquotes a 3px `--sky` left border with italic `--ink-2` text.

**Save status:** 6px `--saved` dot + "Saved" in 12px `--muted` under the doc title.

**Share dialog:** `--surface`, 1.5px `--ink` border, radius `--r-xl`, shadow `--offset-lg`, padding 24px, over a `--backdrop` overlay. Contains: email input with role select + Invite button, "People with access" list (52px rows), and a general access block with a "Copy link" secondary button.

## Icons

Stroke icons, 1.6 to 2px stroke, round caps and joins, `currentColor`. Lucide matches this style closely.

## Accessibility

Real `<button>`, `<a>`, `<input>` with labels. `aria-label` on icon-only buttons. All text in the palette above passes 4.5:1 on the cream and white surfaces. Keep touch targets at least 36px tall (40px for primary actions).
