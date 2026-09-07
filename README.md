# MU Console

A content system for the existing Handlebars site. Editors change copy in a
studio **or directly on the page**, an AI writer drafts in the house voice, and
nothing reaches the live site until an admin publishes it.

```bash
npm start
# studio     http://localhost:4000/console
# live page  http://localhost:4000/page/pgp-bharat
```

Sign in with `figma.uiux@mastersunion.org` / `mastersunion`.
Three more accounts exist for trying the roles — `editor@`, `reviewer@`,
`viewer@mastersunion.org`, same password.

## Publishing through git — the review flow

With a site repo configured, nothing goes live from the studio directly.

1. An editor saves drafts, then presses **Send for review**. The page's copy is
   written as `content/<slug>.json` and committed to `previewbranch` of the
   personal repo. The page shows **In review**.
2. A **super admin** opens `/console/review`, reads the field-by-field diff,
   checks the preview deployment, and presses **Approve & go live** — or Reject.
3. Approval merges `previewbranch` into `main`, pushes `main` to the personal
   repo (what Vercel deploys) **and** to the Lovable repo, so Lovable shows the
   same thing. Reject restores the page's file on the branch and drops the drafts.

Set these in `.env` (see `.env.example`): `PERSONAL_REPO`, `GITHUB_TOKEN`,
`LOVABLE_REPO`, `LOVABLE_TOKEN`, optionally `PREVIEW_URL`. Without them,
Publish behaves as it always did and goes straight to the database.

First-time setup, after the tokens are in place:

```bash
npm run mirror        # every Lovable branch → personal repo, creates previewbranch
```

then sign in as the super admin and press **Seed content files** on the Review
page so `content/*.json` exists on the branch before the first edit. The
working clone lives in `data/repo/` (sparse: only `content/` is checked out).

Roles: `figma.uiux@` is the super admin; `admin@mastersunion.org` is a plain
admin who can send for review but not approve.

## Enabling the AI writer

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Without it everything else works and the AI buttons report that it is off.
Model defaults to `claude-opus-5`; override with `ANTHROPIC_MODEL`.

## The four parts

| | Where | What it does |
|---|---|---|
| Content table | `data/content.db` | `value` (live) and `draft_value` (being worked on) per field |
| Studio | `/console` | Page list, field editor, people & roles |
| Inline editor | injected into `/page/:slug` | Click the thing you want to change |
| AI writer | `ai.js` | Rewrites in the measured house voice |

### Roles

Enforced on the server, read from the session cookie — never from the request
body. That distinction matters: the previous build took `role` from a `<select>`
in the browser, so anyone could pick "Admin" and publish.

| Role | read | comment | edit | AI | publish | reorder | manage people |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| viewer | ✅ | | | | | | |
| commenter | ✅ | ✅ | | | | | |
| editor | ✅ | ✅ | ✅ | ✅ | | | |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### The inline editor

Loads **only for a signed-in user**. A visitor's page carries just the
`data-c` attributes — about 1.8 KB gzipped on a 139 KB page, a 1.3% increase.

- **Browse** — the page behaves exactly as it does for a visitor
- **Edit** — every `[data-c]` becomes editable; per-field AI and comments
- **Arrange** — drag `[data-sec]` sections into a new order

Edit mode intercepts clicks in the capture phase so the page's own slider,
drag and tab handlers don't fire while someone is aiming at text.

Reordering swaps section blocks **between their existing slots**, so a section
can never be pulled out of its tab panel. Order is per tab, stored in
`section_order`, and `DELETE /api/pages/:slug/order` resets it.

> Some sections are scroll-driven and assume document order. Reordering those
> can affect their animation. Check a reorder in the browser before publishing it.

### The AI writer

`data/voice-guide.md` is generated from published copy — **form, not facts**:

```bash
node scripts/extract-voice.mjs [slug]
```

It measures what the corpus actually does (character ceilings per element,
em-dash frequency in prose, `N+` statistic style, fragment vs sentence register)
and states each claim with its evidence, marking weak signals as weak. That is
deliberate: an overstated style guide makes the model confidently wrong.

Requests put the guide in a **cached system prefix**, so repeated edits read it
at roughly a tenth of the input price. Every result lands in `draft_value` —
the AI cannot write to the live site.

Endpoints: `ai/rewrite`, `ai/variants`, `ai/section` (one coherent pass over a
whole section — the thing a general chat box cannot do, because it needs the
field schema).

## Rebuilding the template

```bash
node scripts/build-page.mjs
```

Regenerates `views/page.hbs` and `data/seed.json` from `views/_source.hbs`,
replacing hardcoded text with `{{{c "key"}}}` and adding the `data-c` /
`data-sec` anchors.

On the next start the server **backfills** fields the rebuild added and
**retires** (does not delete) fields it no longer emits, so dead entries stop
being offered for editing while their wording is kept.

### Known limits

- **Partials are not covered.** Text inside `views/partials/**` has no field.
  Folding them in is not safe as-is: nine partials each declare `const names =
  [...]` with different data, and `videoData` appears twice — inlining would
  collapse distinct scopes onto one content key. Per-include namespacing is
  needed first.
- **API-driven sections can't be edited here.** The curriculum table and the
  roster grids are filled from `api.mastersunion.org` at runtime. That's records,
  not content.
- **The AI paths have not been exercised against the live API** in this
  environment — no key was available. The wiring, schemas and error handling are
  in place; the first real call is the test.
