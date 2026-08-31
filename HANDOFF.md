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

It emits `.mu-cms/manifest.json`: **5,110 fields**, of which 105 are `list`
entries — whole data arrays an editor can add to, reorder and prune. A list's
items carry stable content-hashed ids; its structure row in the CMS holds JSON
that re-shapes the code's array at render time.

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
- **Never SPREAD an instrumented object.** `{ ...chapter }` invokes every
  CMS getter at module boot and freezes English in — that was React #418
  *still live* on the dossier after the getter fix. Use `muMerge()` from
  `mu-cms-runtime`, and `muMapped()` instead of `.map()` at module scope.
- **A member expression on a loop variable must never be wrapped at the use
  site.** `src={project.image}` keyed by expression source gave all 10 slides
  ONE image field. The plugin now wraps such expressions only when they trace
  to an imported asset; the data was already wrapped at its source.
- **The router memoises matches.** A root re-render does not reach components
  that map over a list — structural edits re-mount the tree via a `key` on
  `<SmoothScroll>` instead. Visitors never trigger it (their store version
  never changes).
- **The editor's element-level "one field per node" rule breaks split text.**
  "FIND" and "YOUR" live in one `<h1>`; pieces share the element, so partial
  matches must not consume it in the `taken` set.
- **The MutationObserver that re-runs the sight pass must mute itself** while
  the pass writes anchors/spans, or it loops forever. And it must never run on
  template pages — their sections are server-sent, not sighted.
- **"Can't scroll back to the hero" is the export's own intro-lock, not a
  CMS bug.** `routes/index.tsx` deliberately sealed the hero once the content
  curtain covered the intro video — wheel-up snapped back, ArrowUp/PageUp/Home
  were blocked, only "Watch intro" returned. Proven identical with the plugin
  off. Changed 2026-08-24: an upward gesture at the boundary now RELEASES the
  lock (`releaseLock()`), so scrolling back up works; the curtain still
  engages on the way down and re-engages on the next pass. A CMS toggle for
  this behavior is a Phase 5 candidate.

## State — as of 2026-08-24 (the total-control upgrade)

The plan and its verification record live in
`~/.claude/plans/quirky-kindling-puzzle.md`. Baseline artifacts (pre-upgrade
manifest, DB dumps, SSR captures, audit output) are in
`data/baseline-2026-08-24/`.

**Working, all verified in a real scrolled browser, each phase A/B'd against a
`MU_CMS_OFF=1 npm run build` control (chars/sections/height identical):**

- **Correctness** — the dossier's React #418 is actually gone (`withSections`
  spread was freezing getters at boot; publish now lands in raw SSR HTML,
  proven with a marker). Each page inlines only its own `__mu_content`
  (AsyncLocalStorage per request; home revisit is byte-identical). The
  one-key-for-ten-slide-images bug is fixed; per-slide image fields work.
- **Coverage — 98.2% of visible characters on home** (was 82.6%): stat values
  ("₹3.38 Cr", "40%", "500+"), slide ordinals, conditional copy ("Live
  session"), component props, split headlines, footer link arrays,
  `@mu-copy v,l` short-key files. ~1,500 head-metadata junk rows suppressed
  and retired. Fields carry a real `type`
  (text|rich|media|link|date|number|color|boolean|select|list) —
  `scripts/migrate-types.mjs` backfilled 2,405 rows; `tag` is display context.
- **Collections** — the structural leap. The plugin auto-wraps module-level
  data arrays (105 lists site-wide) in a runtime list Proxy with stable
  content-hashed item ids; a `type='list'` structure row (JSON) reorders,
  hides and extends the code's items; CMS-born items get ordinary field rows
  under `<listKey>.<itemId>.<prop>`, so drafts/publish/revisions work
  unchanged. Routes: `PUT /api/pages/:slug/lists/:listKey`,
  `POST .../items` (blank or `copyFrom`), `DELETE .../items/:itemId`
  (CMS item retires; code item hides). The inline editor grew an **Items**
  tab: card per item, move/hide/duplicate/delete/add, live on the page as you
  click (store-version bump re-mounts the tree). Verified: 11th chapter added
  in the browser → 11 pills live; hide+reorder published → 9 slides in raw
  SSR; hydration clean throughout; `heal-drift` reports zero false moves.
  `ChapterPage` reads `/ ${CHAPTERS.length}`.
- **Visible editability** (the demo-readiness pass): the editor re-runs its
  sight pass on every DOM change (debounced MutationObserver), so the
  dossier's slides stay outlined while flipping; split text pieces ("FIND",
  "YOUR", "Path.") each get their own wrapped anchor; matching is
  case-insensitive (CSS uppercase vs stored casing). Slide 4 shows 21
  anchored fields right after flipping to it.

**Not done yet, in order:**

1. **Phase 4 remainder** — type-aware sidebar controls (color picker, number
   slider, toggles, date), image upload + asset library (URL-paste only
   today), blank-vs-unset (`explicit_blank` column; editors still cannot
   blank text), friendly shared-scope naming (`section-map.json`), sidebar
   de-clutter.
2. **Phase 5** — style tokens (revive the dead per-slide `bg`/`ink` colour
   system), animation tunables (hoist per-section `MOTION` consts; `n()`/`b()`
   runtime gates; editor reload-on-save), section visibility booleans.
3. **Phase 6** — audit extended to lists + report artifact, heal-drift learns
   structure rows, hydration battery on a fully customised home, editor docs.
4. Logo walls: images audit reads 66.2% because their old "coverage" was one
   shared key per wall (fake). Real per-logo fields need list treatment of
   `logos: AssetJson[]` arrays.
5. CMS-born items' child lists (stats/chips) have runtime support but no
   editor UI yet.
6. `mu-console` is a public repo holding page content — should be private.

## Deployed — 2026-08-29

Everything public runs through ONE domain (the app's), because Indian ISPs
DNS-block `*.up.railway.app` wholesale:

| | |
|---|---|
| Site | https://masters-union-hero-launch.vercel.app (Vercel, `vercel deploy --prod --archive=tgz`) |
| Editing | same URL + `?edit=1`, or any studio "Edit on page ↗" link |
| Studio | https://masters-union-hero-launch.vercel.app/console |
| CMS origin | https://mu-console-production.up.railway.app (Railway, volume at /app/data) |
| Accounts | all four seeded users share a rotated strong password (NOT `mastersunion`) — in the team vault, or reset via `ADMIN_PASSWORD` on Railway |

`vercel.json` rewrites `/api /console /console-ui /page /assets /mu-assets`
to Railway; the browser never sees the Railway domain. `content.snapshot.db`
+ `voice-guide.snapshot.md` (gitignored, shipped by `.railwayignore`) restore
a fresh volume on first boot — never overwriting an existing database.

**Deployment traps already paid for:**
- The app's platform stamps `/assets/*` with `max-age=31536000, immutable`
  at the routing layer — it owns that path for hashed bundles. The editor's
  js/css served under it got cache-poisoned for a year. The editor now lives
  under `/mu-assets/*`, which no framework claims.
- The router strips `?edit=1` during hydration; on slow machines it won the
  race against the boot script. The boot script now reads the NAVIGATION
  ENTRY (`performance.getEntriesByType("navigation")`) — the URL the document
  was requested with, which no router rewrite can touch.
- The hero film shipped as 221MB of 4K; Vercel caps static files at 100MB.
  It is re-encoded to 1080p (~63MB); the original is `campusFilm.orig.mp4`
  at the site root, gitignored.
- Bulk uploads to Vercel abort on this network — always `--archive=tgz`.

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
> the original as fallback. 5,110 fields including 105 editable collections
> (add/remove/reorder/hide items from the CMS), 98.2% of home's visible
> characters editable, edit→publish→live proven in raw SSR, animations verified
> untouched by A/B test at every phase.
>
> The full plan and its verification record are in
> `~/.claude/plans/quirky-kindling-puzzle.md` (phases 0–3 and 4a done).
> Continue with the "Not done yet" list in HANDOFF's State section — the
> Phase 4 remainder first: type-aware sidebar controls, image upload + asset
> library, blank-vs-unset, sidebar de-clutter.
>
> Verify by running things in a real browser (puppeteer, scrolled) rather than
> curl — much of this site renders after hydration. When something looks broken,
> A/B it with `MU_CMS_OFF=1` before assuming the CMS caused it. Never spread an
> instrumented object; never wrap a loop variable's member expression.
