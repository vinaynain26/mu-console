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

1. **Section pills collapse to one** on the live page, so the inline sidebar
   lumps a whole page's fields into one list. The fix in progress: group by the
   page's own `<section>` elements — what a person sees — rather than by source
   file. **Start here.**
2. 500s and a 404 in the browser console, untraced.
3. React #418 hydration warning — likely the live clock in the footer, unconfirmed.
4. No coverage audit has been run, so nobody knows what percentage of visible
   copy is actually editable. This is what would justify calling it complete.
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
