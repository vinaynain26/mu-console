# mu-console: why your checkout looks emptier than mine

**Written:** 8 September 2026
**Repo:** https://github.com/vinaynain26/mu-console
**For:** the collaborator (Mridul), and for his Claude Code to act on.

Everything below was verified on Vinay's machine on 8 Sep 2026 against the live remote and the
actual working tree. Where something is unverified, it says so.

---

## The headline

There are two separate things going on, and only one of them is about git.

1. **The code.** A fix for the inline editor's undo button is on `main` as commit `f0272cc`. There
   is no feature branch for it. If you cannot see it, fetch, and check which branch you are on.
2. **The content.** The CMS database is **not in the repo and never has been**. It is gitignored.
   No amount of pulling will bring it. This is almost certainly why your console looks nearly empty
   compared to Vinay's.

Part 2 is the one people waste hours on, so it comes first.

---

# Part 1: the content is not in git

`.gitignore` excludes the database. These files exist on Vinay's machine and are invisible to the
repo:

| File | Size | What it is |
|---|---|---|
| `data/content.db` | 3.6 MB | **The live CMS.** Every edit, draft, published value, comment, revision, publish history and section order. |
| `content.snapshot.db` | 3.6 MB | The seed copy that a fresh host restores from. Also gitignored. |
| `.env` | 489 B | API keys and any admin credential overrides. Correctly ignored, never commit it. |
| `data/content.db.bak` | 3.6 MB | A backup, matched by the `*.bak` rule. |
| `demo/edit-home-demo.mp4` | | Screen recording. |
| `node_modules/` | | Normal. `npm install` fixes it. |

### What you actually get from a clean clone

`git clone` plus `npm install` plus `npm start` gives you a working app with an **empty history**.
On first boot `server.js` creates `data/content.db`, then seeds it from the seed files that *are*
tracked in `data/`:

| Seed file | Page slug | Fields |
|---|---|---|
| `data/seed.json` | `pgp-bharat` | 1804 |
| `data/seed-pricing.json` | `pricing` | 61 |
| `data/seed-dark-welcome-page.json` | `dark-welcome-page` | 23 |

`auth.initAuth(db)` then seeds the four default accounts.

So you get three pages with their **original extracted text**, where `value` equals `draft_value`
for every field and `updated_by` is `'import'`. Zero edits, zero drafts, zero comments, zero
publish history. Every change anyone has made through the studio lives only in Vinay's
`data/content.db`.

If Vinay has pages beyond those three, created through the studio or an ingest rather than from a
seed file, **you will not have them at all**. There is no seed file to recreate them from.

### How to get the real content

The database has to travel outside git. Ask Vinay for one of these two files:

- `content.snapshot.db` from the repo root, or
- a copy of `data/content.db`

Then, in your checkout:

```bash
# stop the server first
mv data/content.db data/content.db.mine     # keep your seeded one, just in case
cp ~/Downloads/content.snapshot.db data/content.db
npm start
```

`server.js` only auto-restores from `content.snapshot.db` when `data/content.db` does **not** exist,
so copying it straight to `data/content.db` is the reliable move.

You also need `.env`. Do not ask for it in a commit. `.env.example` is tracked and lists the keys;
get the real values from Vinay over a private channel.

### Before anyone suggests committing the database

Two reasons not to:

- `auth.initAuth(db)` creates the `users` and `sessions` tables **inside the same `content.db`**.
  Committing the database publishes account rows, scrypt password hashes and any live session
  tokens to everyone who can read the repo. Send it out of band instead.
- It is 3.6 MB of binary that changes on every edit, so git history would bloat fast.

### Related: this is also how production gets its content

`.railwayignore` excludes `data/content.db` but **not** `content.snapshot.db`. So `railway up`
uploads the snapshot, and on a host with an empty volume `server.js` restores the live database
from it. That is deliberate. It also means the snapshot on Vinay's disk is the thing that defines
production's starting content.

---

# Part 2: the git side

## Exact state of the remote

Output of `git ls-remote --heads origin`, 8 Sep 2026:

```
f0272ccf2062e84f42e57272916d46d03aa346d2  refs/heads/main
eecbdeb9cfe2b5c7a7ca7c720ed153cbcd85fb66  refs/heads/gitPreview
eecbdeb9cfe2b5c7a7ca7c720ed153cbcd85fb66  refs/heads/2WayHandshake
```

Three branches, that is all. Relative to `main`:

| Branch | Commit | Behind main | Ahead of main |
|---|---|---|---|
| `main` (default) | `f0272cc` | 0 | 0 |
| `gitPreview` | `eecbdeb` | 1 | 1 |
| `2WayHandshake` | `eecbdeb` | 1 | 1 |

`gitPreview` and `2WayHandshake` point at the identical commit. Same content, two names.

## Why there is no `v0Bugs` branch

The undo fix was written on a local branch called `v0Bugs`. It was **never pushed**. `main` was
fast-forwarded onto the commit and `main` was pushed instead, then the local branch was deleted. If
you are hunting GitHub's branch list for `v0Bugs`, that is why you cannot find it. Look at `main`.

## What landed on main

```
commit f0272ccf2062e84f42e57272916d46d03aa346d2
Author:  Vinay Nain <vinay.nain@mastersunion.org>
Date:    Tue Sep 8 11:32:31 2026 +0530
Subject: The drawer remembers what changed, so Undo survives a rebuild

 public/js/inline-editor.js | 13 +++++++++++++
```

The bug: a changed field's undo button is hidden by CSS until its row carries `.is-dirty`.

```css
.mu-revert{ ...display:none... }
.mu-row.is-dirty .mu-revert,.mu-card.is-dirty .mu-revert{display:inline-block}
```

That class was only applied by `markNode()`, at the instant of the edit. `renderTab()` rebuilds the
whole drawer with `body.innerHTML = ...` on every drawer open, tab switch and section change, and
`textRow()` emits a plain `.mu-row`. So every rebuild threw the class away. The change stayed in the
`dirty` map and stayed counted in the toolbar, but the way back vanished from the row.

Reproduction on the old code: edit a heading, click text in another section, come back to the
heading. Undo button gone. Scroll-away closes the drawer, so a plain reopen does it too.

The fix: a new `paintDirty()` beside `markNode()` re-derives `.is-dirty` for every rendered
`[data-row]` from the `dirty` map, and `renderTab()` calls it after wiring. `revertField()` and
`revertAll()` were already correct. Only the affordance to reach them was disappearing.

## If you cannot see the commit, run this

```bash
git fetch origin --prune
git checkout main
git pull
git log --oneline -1        # expect: f0272cc The drawer remembers what changed...
grep -n "paintDirty" public/js/inline-editor.js   # expect 2 hits, ~line 266 and ~line 1314
```

**Fetch before concluding anything.** Vinay's own clone had never fetched, so it did not know
`gitPreview` or `2WayHandshake` existed and listed only `main`. A stale clone shows a stale branch
list.

## If you are on gitPreview or 2WayHandshake

Both are one commit behind `main` now, so the undo fix is not visible from either:

```bash
git checkout gitPreview
git fetch origin
git merge origin/main       # or: git rebase origin/main
```

**We both edited the same file.** Commit `eecbdeb` ("handshake done", Mridul, 7 Sep 2026) changes
`public/js/inline-editor.js` in three places, all part of the send-for-review flow:

- around line 296, the Publish button becoming "Send for review" under `BOOT.review`
- around line 1174, the drawer footer text
- around line 2286, the `publish()` function

The undo fix touches lines around 266 and 1314. Different hunks in the same file, so the merge is
expected to be clean. Expected, not verified, since nobody has run it. If git does conflict, both
sides are wanted: keep the `BOOT.review` logic and keep `paintDirty`.

`eecbdeb` also adds `repo.js`, `ingest.js`, `admin/review.html`, `admin/projects.html`,
`scripts/ingest-repo.mjs`, `scripts/mirror-lovable.mjs` and `nixpacks.toml`. None of those exist on
`main` yet, which is another reason the two trees look so different.

## Pushing to GitHub does not deploy anything

The Railway deployment is **not** git-linked. Merging to `main` changes nothing live. A deploy
happens only when someone runs `railway up` from a local checkout.

Railway, confirmed on Vinay's machine: project `mu-console`, production environment, linked service
`mu-console`, CLI v5.45.1. As of writing, `f0272cc` is on GitHub but has **not** been deployed. The
live site still has the undo bug.

---

## How to verify the undo fix in a browser

```bash
npm start        # port 4000
```

Open a page, for example http://localhost:4000/page/pgp-bharat, sign in as an editor, switch to Edit
mode, then:

1. Click some text on the page and type a change.
2. Click text in a **different** section, so the drawer re-renders.
3. Come back and click the field you changed.
4. The undo button should still be on its row.

Step 4 is what was broken. The editor JS is served from disk at `/assets/js/inline-editor.js` with
`Cache-Control: max-age=0`, so no server restart is needed after pulling. Hard reload if the browser
caches.

---

## What is not known

- **Whether the undo fix works in a real browser.** Nobody has run the check above. There was no
  browser in the environment where it was written. The evidence is code-level only: syntax check
  passes, the server serves the patched file, and the logic was traced by reading.
- **Whether the merge with `eecbdeb` is genuinely conflict-free.** The hunks do not overlap, but no
  one has run the merge.
- **How many pages Vinay's database actually holds.** The API needs a login and was not queried.
  Vinay can check by signing into `/console` and counting. If it is more than the three seeded
  pages, the extras exist only in his `data/content.db`.

---

## Paste this into Claude Code

> Repo github.com/vinaynain26/mu-console, a Handlebars site with a small SQLite CMS. Two things to
> know. First, the content database is gitignored: `data/content.db` and `content.snapshot.db` are
> not in the repo, so a fresh clone boots with only the three seeded pages from `data/seed*.json`
> (pgp-bharat 1804 fields, pricing 61, dark-welcome-page 23) and zero edits, drafts, comments or
> publish history. To match the other developer's setup I need his `content.snapshot.db` sent
> out of band and copied to `data/content.db`, plus a real `.env` built from `.env.example`. Do not
> suggest committing the database, the `users` table with password hashes lives inside it. Second,
> the git state as of 8 Sep 2026: remote has exactly `main` at f0272cc, `gitPreview` and
> `2WayHandshake` both at eecbdeb and each 1 behind and 1 ahead of main. There is no `v0Bugs`
> branch, it was never pushed. An inline-editor undo fix is commit f0272cc on main, adding a
> `paintDirty()` function plus a call in `renderTab` in public/js/inline-editor.js. If I cannot see
> it, run `git fetch origin --prune`, my clone may be stale, and if I am on gitPreview or
> 2WayHandshake I must merge origin/main first. eecbdeb also edits public/js/inline-editor.js in the
> publish and review flow around lines 296, 1174 and 2286, which does not overlap the undo fix
> around 266 and 1314. Deploys are not git-linked, they happen via `railway up`.
