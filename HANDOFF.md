# Handoff — Masters Union Hero Launch → CMS

Paste the prompt at the bottom into a fresh session if this one runs out of room.

## Where things stand

| | |
|---|---|
| CMS | `~/Downloads/mu-content-cms` → `github.com/vinaynain26/mu-console` (public) |
| Source site | `~/Downloads/Masters Union Hero Launch` → `github.com/vinaynain26/masters-union-hero-launch` (private) |
| Earlier test site | `github.com/vinaynain26/dark-welcome-page` (private, React Router) |
| Server | `npm start` → `localhost:4000/console`, login `figma.uiux@mastersunion.org` / `mastersunion` |
| AI | Gemini via `.env` (`AI_PROVIDER=gemini`), swappable to Claude in one line |

## What the new project is, and why it needed new code

`Masters Union Hero Launch` is **TanStack Start**, not the Vite + React Router shape the
first converter assumed. Concretely:

- Routes are **filenames** in `src/routes/`, dot-separated:
  `programmes.pg.pgp-tbm.tsx` → `/programmes/pg/pgp-tbm`. There is no `App.tsx`
  with `<Route>` elements to parse.
- It is **SSR via nitro**, and nitro defaults to a **Cloudflare worker**, which
  cannot be served locally. Building with `NITRO_PRESET=node-server` produces
  `.output/server/index.mjs`, which runs under node. **This is the key fact** —
  without it there is nothing to scrape.
- Config comes from `@lovable.dev/vite-tanstack-config` (public on npm).
- 38 routes.

## The two scripts that handle this

**`scripts/detect-app.mjs`** — the checker. Identifies the framework from
`package.json`, discovers routes the right way for it, and reports how to build
and serve. Verified against both projects:

    node scripts/detect-app.mjs ~/Downloads/dark-welcome-page-main      # react-router, 2 routes
    node scripts/detect-app.mjs "~/Downloads/Masters Union Hero Launch" # tanstack-start, 38 routes

**`scripts/convert-app.mjs`** — builds, serves, scrapes every route, writes
`hbs-output/views/<slug>.hbs`, a layout with the compiled CSS inlined, and
`pages.json`. It lives in the CMS, not in the source repo, so a source project
needs nothing added to it — which matters here because there is **no Lovable
access to this project**, only the exported zip.

    node scripts/convert-app.mjs --app "<path>" --home-slug mu-home [--only /route] [--skip-build]

Scroll-loaded images are handled: the page is scrolled top to bottom before
capture, `img[data-src]` is promoted to `src`, and `loading=lazy` is stripped.
A route that renders under 60 characters of text FAILS rather than publishing an
empty shell, and failures are excluded from `pages.json`.

## Ingest into the CMS

    node scripts/ingest-page.mjs --view <file.hbs> --layout <file.hbs> --slug <slug> --title "<title>"

Pages are discovered from `data/seed-*.json` at boot — dropping a seed file in
IS the deployment. No route to register.

## Things already learned the hard way — do not re-litigate

- **Two extractors exist.** `build-page.mjs` is only for the hand-built
  `pgp-bharat` page (five tab panels on one template, slider arrays its own JS
  overwrites). `ingest-page.mjs` is the generic one. **A change to how copy is
  anchored must be made in both** — the rich-text fix was missed in the second
  and shipped fragmented pages.
- **Field keys are positional** (`s5.h21`). Any change to what the extractor
  matches renumbers them. `server.js` realigns untouched fields to the seed and
  refreshes structural metadata on boot; `scripts/heal-drift.mjs --apply`
  carries human edits onto their new keys, including into rich blocks that
  absorbed them. Run it after any extractor change.
- **Emphasis is class-based, not `<b>`/`<i>`**, and differs per block
  (`textHighlight`, `white-medium`, `boldColor`, `font-semibold`,
  `fr-TitleItalic`). The editor derives its style buttons from the block itself.
- **Injected UI must not borrow tag names the page styles** — `header`, `nav`,
  `aside` all broke the sidebar. There is a containment sweep in
  `public/css/inline-editor.css`.
- **`font: 600 12px/1 inherit` is invalid CSS** and drops the whole declaration.
- **Sanitise rich text on save** — `{{{c}}}` does not escape.

## Still open

1. Ingest all 38 converted pages and check a sample in the console.
2. A sync workflow for `masters-union-hero-launch` (nothing pushes to it
   automatically — there is no Lovable connection, so it is manual/scheduled only).
3. `mu-console` is a **public** repo holding page content. Worth making private.
4. One voice guide (derived from pgp-bharat) applies to every page.
   `scripts/extract-voice.mjs <slug>` can make per-page guides.
5. Prune: ~60% of `page_content` rows are retired, and `revisions` grows
   unbounded. A prune script was agreed but not written.

---

## Prompt for a new session

> I'm continuing work on a CMS at `~/Downloads/mu-content-cms` (GitHub:
> `vinaynain26/mu-console`). Read `HANDOFF.md` in that repo first — it has the
> full state and the traps.
>
> The immediate goal: get all 38 pages of
> `~/Downloads/Masters Union Hero Launch` (TanStack Start, GitHub:
> `vinaynain26/masters-union-hero-launch`, private) converted to Handlebars and
> fully editable in the CMS — every piece of text, every image including
> scroll-loaded ones, every button link and state.
>
> `scripts/detect-app.mjs` and `scripts/convert-app.mjs` already handle both
> React Router and TanStack Start; the conversion has been verified working.
> Pick up from the "Still open" list.
>
> This project matters — verify each step by actually running it rather than
> assuming, and tell me plainly when something does not work.
