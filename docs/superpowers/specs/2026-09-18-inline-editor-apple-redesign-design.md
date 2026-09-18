# Inline editor: Apple-inspired redesign

**Date:** 2026-09-18
**Scope:** the inline editor's chrome only (`public/css/inline-editor.css`, the
toolbar and drawer rendering in `public/js/inline-editor.js`, one new motion
helper). No backend, no data-model change, no new capability. Desktop only.
**Reference:** `.claude/skills/apple-design` (the language the site follows).

## Why

Nine states of the current editor were captured on 2026-09-18 (browse, edit,
drawer on text, AI, pictures, unsaved, items, picture card, arrange). The
engine underneath is sound; the chrome reads as a developer tool: dashed cyan
boxes on every field all the time, machine names ("Section 2", "Textpath",
group headers shouting the heading in caps), a drawer that gives a video
slot, a heading and an AI button equal weight, pictures as a raw URL box,
items as truncated sentences, and show/hide with no motion. The goal is an
editor that feels like it belongs to the site and to the platform it runs
on: calm, precise, and smooth.

## Principles applied

Purpose, familiarity, simplicity-not-minimalism, craft (Apple's foundations)
and, for motion: respond on pointer-down, animate from the current value,
stay interruptible, use critically damped springs, materialize rather than
fade, mirror enter and exit paths, respect reduced motion and transparency.

## 1. Visual system (tokens)

All values live as `--mu-*` custom properties on `:root` (the editor's
stylesheet only loads for signed-in editors, so `:root` is safe and the
prefix keeps them clear of the site's own variables), so the whole chrome
retunes from one place.
Existing body state classes (`mu-editing`, `mu-side-open`, `mu-side-left`,
`mu-side-peek`) keep their names.

Material, "light glass":

| Token | Value |
|---|---|
| `--mu-glass` | `rgba(255,255,255,.72)` |
| `--mu-glass-blur` | `blur(24px) saturate(180%)` |
| `--mu-glass-edge` | `inset 0 1px 0 rgba(255,255,255,.6)` (light catching the top edge) |
| `--mu-glass-line` | `1px solid rgba(0,0,0,.08)` |
| `--mu-shadow-panel` | `0 12px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)` |
| `--mu-shadow-chip` | `0 4px 14px rgba(0,0,0,.12)` |

Colour: `--mu-ink #1d1d1f`, `--mu-ink-2 #6e6e73`, `--mu-ink-3 #a1a1a6`,
`--mu-accent #C9A84C` (the site's gold; selection and edited-state only),
`--mu-danger #d0342c`, `--mu-ok #2f8a4a`. Controls: `--mu-fill
rgba(0,0,0,.05)`, `--mu-fill-hover rgba(0,0,0,.08)`, `--mu-fill-press
rgba(0,0,0,.12)`. No blue anywhere; no dashed lines anywhere.

Type: `font-family: system-ui, -apple-system, "SF Pro Text", "Segoe UI",
Roboto, sans-serif` (SF on Mac). Never monospace. Scale, weight, leading,
tracking as a set:

| Role | Size | Weight | Leading | Tracking |
|---|---|---|---|---|
| Drawer title | 17px | 600 | 1.2 | -0.01em |
| Eyebrow / breadcrumb | 12px | 500 | 1.2 | +0.01em |
| Body / values | 13px | 400 | 1.45 | 0 |
| Labels (caps) | 11px | 600 | 1.2 | +0.04em |
| Control text | 13px | 500 | 1 | 0 |
| Toolbar status | 12px | 500 | 1 | 0 |

Spacing: 8pt grid. Rows 12px apart, groups 24px, card padding 14px, panel
padding 20px, toolbar padding 6px with 4px between controls. Radii: control
8px, card 12px, panel 20px, pill/chips 999px. Focus ring: 2px `--mu-accent`
at 60% outside the control (`box-shadow`), never the browser default.

## 2. On the page (Edit mode)

- Entering Edit: every editable field takes a soft gold wash
  (`background: rgba(201,168,76,.18)`) that fades over 600ms, once. This
  replaces always-on dashed outlines as the "everything here is editable"
  signal.
- Hover on a field: a 2px rounded ring (`--mu-accent` at 45%, radius 6px,
  drawn with `box-shadow` so layout never moves) and a chip above its
  top-left naming the field ("Heading", "Button label", "Picture") in the
  label style on a small glass surface. 150ms ease-out in, 120ms out.
- Selected field (open in the drawer, or being typed in): a solid ring
  (`--mu-accent`) and no chip.
- Unsaved field: a 6px gold dot at the field's top-right corner, on the
  page and beside its row in the drawer. Replaces `.mu-dirty`'s tint.
- Split headlines: rings draw only for the hovered piece; the parent never
  rings.
- Section pill ("Edit section · 19"): a glass chip that materializes when
  the pointer enters the section and stays while the drawer is open on it.
  Position unchanged (top-right of the section).
- Media hover: same ring on `img`/`video`; the chip reads "Picture" /
  "Video".

## 3. Toolbar

Bottom pill, glass, 44px tall, three groups separated by 1px lines at 40%:

`[ Browse | Edit ]  ·  status  ·  [ Undo ] [ Save ] [ Publish ]  ·  [ … ]`

- Mode: a segmented control whose selection pill springs between options.
- Status: one phrase, 12px: "No changes" · "3 unsaved" · "Saving…" ·
  "Saved" (2s, then back) · "Publishing…" · "Published". The count is the
  only bold word.
- Actions: Undo and Save are quiet buttons (fill on hover), Publish is the
  single filled button (`--mu-ink` background, white text). Disabled state
  is 40% opacity, never a different colour.
- `…` opens a small glass menu anchored to the button (transform-origin at
  the trigger): Preview, Studio ↗, signed-in name/role, Sign out.
- Peek (the eye) stays at the far left as an icon button.
- Placement: centred in the strip the drawer leaves free (existing
  behaviour); when the pill would cover site text within 24px of the
  viewport bottom it lifts by 56px; the move is a spring.
- Every control: pointer-down `scale(.97)` in 100ms, release to 1 in 200ms.

## 4. Drawer

Docked right, 400px, full height, glass with the panel shadow, 20px radius on
the outer top-left and bottom-left corners. Enters from the right on a
spring, leaves to the right on the same path; a close mid-flight that is
reopened continues from where it is.

Header (20px padding): eyebrow breadcrumb "Home" (page title), title = the
section's name, close as a 28px circular quiet button top-right.

Section name, derived on the client and never stored: the text of the first
`h1/h2/h3` inside the section host (trimmed to 40 chars, sentence case as
on the page); else the component's humanized name (already available as the
section title); else "Section N". The existing `b.title` stays the fallback.

Tabs: a segmented control (Content · Pictures · Items), counts as muted
numerals after a thin space, only tabs that hold something (existing rule).
The selection pill springs to the active tab; tab content cross-fades
(120ms out, 160ms in). Below the tabs a scroll-edge fade (12px gradient
mask), no divider line.

Body (20px side padding, 8pt grid):

- Group header: the nearest heading's text in sentence case, 11px label
  style, 24px above, 8px below. No caps shouting.
- Text row: label (11px caps) on the left; on the right, only on hover or
  focus of the row, the ✦ AI button (quiet, 24px) and the Undo glyph when
  the field is unsaved. Value control below the label, 13px, 36px tall,
  fill background, no border, focus ring as above. Rich rows keep the
  existing toolbar but restyled to the same controls.
- AI box: materializes beneath the row (blur 8→0, scale .98→1, opacity)
  with the instruction field and two buttons, Rewrite (filled) and Options
  (quiet). Result options render as a list of quiet cards, one per option,
  each a pointer-down target.
- Picture card: 16:9 preview on top (`object-fit: cover`, radius 12, a
  small play glyph on videos), file name as the row label, one URL field
  below with placeholder "Paste an image or video URL", and "Original" as
  a text action on the right of the label when the value differs from the
  original. The two helper sentences are removed.
- Items: each item a card (14px padding, radius 12) with the ordinal in a
  20px muted circle, title on one line (ellipsis), and on hover a grab
  handle at the left edge and an action row at the right (move up, move
  down, hide/show, duplicate, delete) as 24px icon buttons with `title`
  tooltips. Hidden items at 50% opacity with a strike on the ordinal.
  Add stays a full-width quiet button at the bottom, sticky over a
  scroll-edge fade.
- Footer: one 12px line, "Draft · 3 unsaved" / "Draft · saved" /
  "Nothing changes on the site until you publish" when clean. 12px padding.

Search field (when the section has more than 12 fields): a 32px fill input
with a search glyph, 20px below the tabs.

## 5. Micro-motion

One helper, `public/js/mu-motion.js` (~100 lines, no dependency), exposing
`spring(el, prop, target, { damping, response, velocity })` on rAF. It
reads the current value (transform/opacity) from a per-element state, so
a re-target mid-flight continues from the presentation value with the
current velocity. Defaults `damping 1.0`, `response 0.32`. Used for:

| Motion | Spec |
|---|---|
| Drawer in/out | x from +100% to 0 and back, damping 1.0, response 0.35 |
| Segmented selection pill | x/width to the active tab, damping 1.0, response 0.28 |
| Toolbar lift | y, damping 1.0, response 0.3 |
| Toast | y 8→0 with opacity, damping 1.0, response 0.3; out reversed |
| Item drop settle | damping 0.85, response 0.3 (the one bounce, after a drag) |
| Materialize (pills, chips, AI box, … menu) | opacity 0→1, scale .98→1, filter blur 8px→0 together, response 0.25 |

CSS transitions only for hover fills and rings (150ms ease-out). Drag
reorder tracks 1:1 with the pointer via Pointer Events and `setPointerCapture`,
respecting the grab offset.

Reduced motion: `@media (prefers-reduced-motion: reduce)` swaps every spring
for a 150ms opacity cross-fade and removes scale/blur; `prefers-reduced-transparency`
sets glass to `rgba(255,255,255,.96)` and drops the blur; `prefers-contrast:
more` gives glass a solid `--mu-glass-line` border at 30%.

## 6. What does not change

The engine: sighting, anchors, `setField`, dirty/original maps, save,
publish, AI calls, list operations, the runtime bridge, keyboard shortcuts.
Every class the engine queries keeps its name (`.mu-bar`, `.mu-side`,
`.mu-pill`, `.mu-row`, `.mu-card`, `.mu-item`, `[data-tab]`, `[data-row]`,
`.mu-count`, `.mu-dirty` is kept as the state hook and restyled). New
classes are additive. No change to server routes, the database, or the
site repo.

## 7. Verification

Puppeteer at 1440×900 against `localhost:3000/?edit=1`, the same nine
states as the 2026-09-18 baseline, compared side by side; the typing test
from 2026-09-17 must still pass; motion checked frame by frame at 4× slow
(rAF throttled) for the drawer and the segmented control; reduced-motion
run once with the media feature emulated. Manual: publish a text change
through the new toolbar.
