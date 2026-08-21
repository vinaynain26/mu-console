# Handoff — CMS on the Masters Union Lovable site

Read this whole file before touching anything. It records what was built, what
is broken, and the traps that already cost hours.

## The scenario

Lovable was used by a non-technical person to build the Masters Union site. The
prompt they used produced developer-friendly code, but nobody can edit the copy
or swap an image without going back through Lovable. The job is to put our own
CMS on that code so text, images, links and button states are all editable by a
marketing person, **without losing any of the design or animation.**

## The decision that matters most

The first instinct was to convert the React app to Handlebars, like the older
`pgp-bharat` page. **That was abandoned deliberately, and must not be revived.**

The site's motion is ~45 Framer Motion components plus GSAP/ScrollTrigger and
Lenis. A Framer Motion animation *is* a React component — there is no script to
carry into a template. Convert it and the animation is gone; keep React and
React owns the DOM and overwrites CMS content on every render.

So instead: **the app stays exactly as it is, and its source is instrumented at
build time** so every string comes from the CMS with the original English as a
fallback. Proven by A/B test — plugin off vs on, same page:

    OFF  12569 chars · 14 sections · height 13325
    ON   12561 chars · 14 sections · height 13325   (8 chars = a CMS edit)

## Where everything is

| | |
|---|---|
| CMS | `~/Downloads/mu-content-cms` → `github.com/vinaynain26/mu-console` (public) |
| The site | `~/Downloads/Masters Union Hero Launch` → `github.com/vinaynain26/masters-union-hero-launch` (private) |
| Run CMS | `cd mu-content-cms && npm start` → `localhost:4000/console` |
| Run site | `cd "Masters Union Hero Launch" && NITRO_PRESET=node-server npm run build && PORT=3000 node .output/server/index.mjs` |
| Login | `figma.uiux@mastersunion.org` / `mastersunion` |
| AI | Gemini, key in `mu-content-cms/.env`, provider swappable in one line |

## How it works

**Build time** — `tools/mu-cms/plugin.mjs` (a Vite plugin) rewrites the app's
own source:

    <h1>Careers</h1>            ->  <h1 data-c="k">{__mu("k","Careers")}</h1>
    { label: "Offers" }         ->  { label: __mu("k","Offers") }
    <img src={heroBg.url} />    ->  <img src={__mu("k", heroBg.url)} />

88% of this site's copy lives in data structures, not JSX — that is why the data
transform matters more than the text one. Values are *wrapped*, never replaced,
so an imported asset or template string still works as the fallback.

It emits `.mu-cms/manifest.json`: **3,223 fields** — 2,449 data, 589 text, 69
attributes, 62 link targets, 54 image sources.

**Run time** — `src/mu-cms-runtime.ts` exposes `c(key, fallback)`. The root
route loader fetches the page's copy plus the `shared` bucket, and it is
**inlined into the HTML** and read synchronously at module load. That is not
optional: components on this site render at very different times, and a store
filled asynchronously serves CMS copy to some and original English to others —
React hydration error #418.

**Seeding** — `node scripts/seed-from-manifest.mjs --manifest <path> --apply`
turns the manifest into CMS rows. Never overwrites an existing value.

**Editing** — the studio at `/console`, or inline on the site itself: visit any
page with `?edit=1` once, sign in, and the editor persists everywhere after.

## Traps already hit — do not rediscover these

- **Keys are `<file>.<hash of the text>`, never positional.** The older page
  keyed by position and every extractor change renumbered everything, stranding
  live edits. Do not "simplify" this.
- **Two extractors exist.** `build-page.mjs` is only for the hand-built
  `pgp-bharat` Handlebars page. `ingest-page.mjs` is for converted pages. The
  Lovable site uses **neither** — it uses the Vite plugin. A change to how copy
  is anchored may need making in more than one place.
- **The export ships no images.** 344 `.asset.json` pointers, zero files, all
  resolving to Lovable's `/__l5e/` endpoint. `tools/mu-cms/fetch-assets.mjs`
  downloads them from the deployed site into `public/` at the same paths, so no
  source change is needed. 331 of 344 exist; 13 are 404 on Lovable too.
- **`/faculty` is broken in the export, not by us.** 156 broken images, proven
  identical with the plugin disabled. The zip is a different build from what is
  deployed at `mastersunionv3.lovable.app`.
- **Never diagnose from `curl`.** Much of this site renders after hydration, so
  the SSR HTML looks empty. Use puppeteer and scroll the page.
- **Check the rendered DOM, not the API.** "No edit button" was a nested `<a>`
  inside an `<a>`, which browsers delete. "No editor" was `window.prompt()`
  being suppressed by Brave. Both times the API was fine and hours went into
  the wrong layer.
- **Emphasis is class-based** (`textHighlight`, `font-semibold`, `fr-TitleItalic`),
  differs per block, and `fr-HeadingItalic` is a different *typeface*, not
  italics.
- **`.claude/skills/` holds the apple-design skill** the design follows:
  translucent materials, response on pointer-down, critically damped motion,
  the three accessibility signals.

## State

Working: 40 pages / 4,742 fields in the CMS · edit → publish → live, verified ·
all animations intact · images 99% on most pages · inline editor with sign-in ·
roles, drafts, revisions, AI writer.

**Broken / unfinished, in priority order:**

1. ~~Section pills collapse to one~~ **Fixed.** On an app page the editor now
   regroups fields by the page's own `<section>`/`<nav>`/`<footer>` landmarks:
   each field is found in the rendered DOM (anchor first, then by matching its
   value against text/attributes/URLs) and bucketed under the landmark it sits
   in. Values owned by more than one key are placed by their source file's
   other fields; fixed floaters go to the landmark beneath them. Home page:
   15 pills, each named after its section's own heading. Fields not on the
   page (the folded-in shared bucket) get no pill — the studio still lists
   them. Also fixed on the way: "Undo all" never reverted anything
   (`slice.call` on a Map iterator returns `[]`).
2. 500s and a 404 in the browser console, untraced. (One 404 seen on home:
   `/__l5e/assets-v1/.../widget-campus-life.jpg` — one of the 13 assets that
   are 404 on Lovable too.)

Also since fixed: the plugin skipped plain `.ts` files, so seven data files —
`chapters.ts` (the whole 10-things dossier), `pgp-tbm-content.ts`,
`campus-radio.ts`, the faculty lists — were invisible to the CMS. Now
instrumented (3,223 → 4,041 fields, seeded). The sidebar carries
`data-lenis-prevent` so scrolling it no longer scrolls the page, and
data fields whose exact text is found on the page are adopted for live
click-to-type editing like anchored copy.

Images: the plugin now wraps media-valued data props (`image: mu01`) with the
import's filename carried as a hint into the field's label; the editor matches
that hint against the hashed bundle URL, adopts the rendered `<img>` as a
media anchor, and the sidebar's Images tab gives live swap with
clear-to-restore. The dossier's grey rectangle was the Lovable export never
rendering `project.image` at all — `TenThings.tsx` now renders it (all ten
`mu-0*.webp` files were sitting unused in `src/assets`). The news cards'
grey boxes have NO image data in the export — adding CMS image slots there
is a decision, not a bug fix. One visible string belongs to one field now:
four chapters sharing the value "₹3.38 Cr" no longer produce four rows.
Anchors on remounting content (the dossier advances its slide and React
recreates the img seconds after regroup tagged it) are re-resolved lazily:
clicking any unanchored image or text matches it against the fields at
click time, adopts it on the spot, and opens its editor — so content that
mounts late (chapters 02–10) is editable the moment it is clicked.

Image coverage: media-valued data props reach through member expressions
too (`img: ftBhupesh.url` on an `.asset.json` import), so the faculty and
practitioner photos are fields now — 320 media fields, 255 with filename
hints, 47 of the home page's 58 visible images anchored. The sidebar's All
tab clusters rows under the section's own sub-headings (the ones a reader
scans), attribute fields carry human labels ("Screen-reader label", not
"Text"), and a late-adopted field slots in reading order. React #418 was
reproduced twice today on home — intermittent, consistent with the
header clock crossing a minute between SSR and hydration; still untraced.
3. ~~React #418 hydration warning~~ **Fixed — and the clock theory was wrong.**
   `label: __mu(key, "…")` inside a module-level const evaluates once: on the
   server that is process BOOT, before any request loads content, so SSR
   rendered original English forever while the client rendered CMS values —
   every published data-copy edit was a guaranteed mismatch, silently
   corrected post-hydration (which is also why publish looked "live" while
   SSR never actually carried it). The plugin now emits getters
   (`get label() { return __mu(…) }`) so lookups happen at render time on
   both sides; publish is live in the next SSR response, verified against
   raw HTML. The Programme Finder countdown also computed from `Date.now()`
   during render; it now seeds after mount.
4. ~~No coverage audit has been run~~ **Run — and rerunnable.**
   `node scripts/audit-coverage.mjs` renders a page in a real browser, scrolls
   it, and checks every visible text node and image against the page's fields
   (anchors, values, and filename hints). Home page as of 2026-08-22:
   **82.6% of visible characters editable · 100% of images** (4,862 fields
   across 37 pages). The uncovered remainder is mostly derivatives — dates
   formatted from now-editable ISO fields, a computed "Live session" ternary,
   the live clock — which the audit prints by name. Along the way the plugin
   grew: card metadata props (month/time/source/duration/format/round/company…),
   data-level link targets (href/applyHref/route), and ISO date props
   (deadline/nextDate) are all fields now.
5. `mu-console` is a public repo holding page content — probably should be private.

---

## Prompt for a new session

> I'm putting our own CMS onto a Masters Union site that was built in Lovable by
> a non-technical colleague, so marketing can edit text, images, links and
> button states without going back through Lovable — and without losing any of
> the design or animation.
>
> Two repos, both cloned locally:
> - CMS: `~/Downloads/mu-content-cms` (`vinaynain26/mu-console`)
> - Site: `~/Downloads/Masters Union Hero Launch` (`vinaynain26/masters-union-hero-launch`, TanStack Start)
>
> **Read `HANDOFF.md` in the CMS repo first** — it explains the architecture and
> lists traps that already cost hours, including why converting the app to
> Handlebars was tried and abandoned.
>
> The approach is settled and works: the app stays as it is, and a Vite plugin
> instruments its source at build time so every string comes from the CMS with
> the original as fallback. 3,223 fields instrumented, edit→publish→live proven,
> animations verified untouched by A/B test.
>
> Focus on the **home page only** for now — it carries the most animation.
> Start with item 1 in the "Broken / unfinished" list: the inline editor's
> section pills collapse into one, so the sidebar is unusable.
>
> Verify by running things in a real browser (puppeteer, scrolled) rather than
> curl — much of this site renders after hydration. When something looks broken,
> A/B it with the plugin disabled before assuming the CMS caused it.
