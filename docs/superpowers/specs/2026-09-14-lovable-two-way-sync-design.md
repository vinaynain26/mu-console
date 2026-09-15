# Lovable two-way sync: lab design

Date: 2026-09-14
Status: draft for review
Branch: `lovable-sync-lab`, created in place from the `v0Bugs` head. The lab uses its
own database file so the real CMS database is never opened by it.

## Goal

Copy edited in the CMS lands in the designer's Lovable project as real source code,
and copy the designer changes in Lovable lands in the CMS, without either side
overwriting the other silently. Proven on the throwaway project
`vinaynain26/dark-welcome-page` before anything touches the real site.

Success means all four of these happen against the real repo, timed and recorded:

1. Change a headline in the studio, publish, and the change is visible in Lovable's
   preview and in the file itself.
2. Ask Lovable to change a card title, and the CMS field shows the new text within
   one poll interval.
3. Put a draft on a headline in the CMS, then change the same headline in Lovable.
   The CMS shows a conflict with both versions instead of losing either.
4. Have Lovable add a card and delete a card. The CMS gains fields for the new one
   and retires the fields of the deleted one.

## Facts the design rests on

Verified on 2026-09-14 against docs.lovable.dev and the repo itself.

- Lovable and GitHub sync both ways on one active branch. Lovable pulls when
  GitHub's push webhook reaches it. If that notification is lost, the commit does
  not appear in Lovable. There is no Lovable API. The repo is the interface.
- Lovable creates the repository. An existing repo cannot be connected.
- The demo repo is public, branch `main`, a Vite plus React Router plus shadcn app.
  Lovable commits as `gpt-engineer-app[bot]`. Vinay's own commits from 2026-04 and
  2026-08 sit on the same branch and Lovable continued committing after them, so
  the GitHub-to-Lovable direction has already worked on this repo.
- A dry run of the scanner from the `2WayHandshake` branch against the repo finds
  78 text fields across `/` and `/pricing`. It does not find nested string arrays
  (the plan feature bullets), image URLs held in string constants, or hrefs.
- Lovable's `AGENTS.md` on connected projects forbids rewriting published history.
  The CMS only ever adds commits. Never force-push, never amend a pushed commit.

## Scope

Phase 1, this lab: text fields only. JSX text, string attributes such as `alt` and
`placeholder`, string values in module-level data objects, and template literals
without expressions.

Out of scope for phase 1: images and media, links, nested string arrays, list add,
reorder and hide, section order, the inline on-page editor, the review and approve
gate, the personal mirror repo, and deployment to Railway. Each is a phase 2 item
once the loop is proven.

## Architecture

Five parts, all on the lab branch. Nothing on `v0Bugs` changes.

### `sync/repo.js`, ported from `2WayHandshake`

Plain git in a working clone at `data/lab-repo`. One remote, the Lovable repo. The
token travels as a per-command HTTP header and never lands in `.git/config`. One
git operation at a time through a promise queue. Differences from the original: no
personal mirror, no preview branch, and a full checkout of the one branch rather
than a sparse one, because write-back needs the source files.

### `sync/scan.js`, ported from `2WayHandshake` `ingest.js`

Reads routes from `src/App.tsx`, walks each route's component tree, and lifts copy
out of the Babel AST. Keys are `<file path under src>.<8-char sha1 of the
whitespace-normalised text>`. The same text twice in one file is one field. Seeding
into the DB keeps rows whose key survived, adds rows for new keys, retires rows
whose key vanished. New in the lab: conflict detection, described under Pull.

Shared components such as the navbar and footer appear under every page that
renders them, as separate rows with identical keys. Phase 1 accepts that. Write-back
edits the one literal in the file, and the next scan re-keys every page's copy of it.

### `sync/writeback.js`, new

Turns a publish into a commit. Detailed under Push.

### `sync/watch.js`, new

Notices Lovable's commits. A poll every `SYNC_POLL_SECONDS` (default 20) runs
`git ls-remote` on the branch and compares the sha to the last one scanned. A
`POST /api/sync/webhook` endpoint accepts GitHub push events, verified with
`SYNC_WEBHOOK_SECRET` when set, and triggers the same pull. A poll tick is skipped
while a push is in progress.

### Studio: Sync panel

A page at `/console/sync` showing the connected repo and branch, the last synced
commit and when, the last push, a Sync now button, a log of pushes and pulls, and
the open conflicts with two actions each. Publish on a repo-backed page pushes.

## Data model

Existing tables are reused. `page_content` keeps `value`, `draft_value` and
`retired` unchanged.

- `pages` gains `repo`, `branch` and `ingested_sha`.
- `sync_state`, one row: `last_remote_sha`, `last_scan_at`, `last_push_sha`,
  `last_push_at`, `last_error`.
- `sync_log`: `id`, `direction` (`push` or `pull`), `sha`, `summary`, `by`, `at`.
- `sync_conflicts`: `id`, `page_slug`, `file`, `old_key`, `new_key` (nullable),
  `original` (the text both sides started from), `theirs` (the designer's new text,
  null when the text was deleted), `mine` (the editor's draft), `created_at`,
  `resolved_at`, `resolution` (`keep-theirs` or `reapply-mine`).

## Push: CMS to Lovable

Input: a page slug. Changes are that page's rows where `draft_value` differs from
`value` and `retired` is 0.

1. Fetch and reset the working clone to the remote branch head, so the write starts
   from exactly what Lovable has.
2. Group changes by file. The file is `src/` plus the key up to its last dot.
3. Parse each file with `@babel/parser` using the scanner's options. Walk it and
   collect every node whose normalised text hashes to a target key: `JSXText`,
   `StringLiteral` inside a `JSXExpressionContainer`, `StringLiteral` attribute
   values, `StringLiteral` values of module-level object properties, and
   `TemplateLiteral` with no expressions. Record start, end and kind.
4. If any target hash is not found in its file, the source moved under the editor
   since the last scan. Abort the whole publish with a clear message, run a pull,
   and let conflict detection surface what changed. Never push a partial page.
5. Splice the new text into the original source string from the last offset
   backwards, so earlier offsets stay valid. The file is never reprinted from the
   AST, so the designer sees a one-line diff and Lovable's formatting survives.
   Per kind: `JSXText` keeps the node's leading and trailing whitespace and replaces
   the inner text; a string literal keeps its original quote character and escapes
   the new text; a template literal keeps its backticks and escapes backticks and
   `${`. Every occurrence of the same text in the file is replaced, matching the
   scanner's one-field rule.
6. Commit with the editor as author and MU Console as committer. Message:
   `content(<slug>): <n> change(s) via MU Console`, then one line per field,
   `label: old text -> new text`, each truncated to 80 characters.
7. Push to the branch. If the push is rejected because Lovable pushed in between,
   repeat from step 1 once. If it fails again, report the error. The DB is not
   changed on any failure.
8. Verify with `git ls-remote` that the branch head is the new commit.
9. In one SQLite transaction: for each changed row, the new key is the file scope
   plus the hash of the new text; set `field_key` to it, `value` and `draft_value`
   to the new text, `updated_by` and `updated_at`; move the row's `comments` and
   `revisions` to the new key and add a revision old to new; if a row with the new
   key already exists on that page (the editor typed text identical to another
   field's text in the same file), retire the old row instead of renaming it. Then
   set `pages.ingested_sha` to the new sha, add a `publishes` row and a `sync_log`
   row.

Lovable needs nothing from us after the push. GitHub notifies it.

## Pull: Lovable to CMS

Trigger: the poll sees a new sha, the webhook fires, or someone presses Sync now.

1. Fetch and check out the branch head in the working clone.
2. Scan. For each page and each field key found: if a row exists, keep its `value`
   and `draft_value` and clear `retired`; otherwise insert with `value` and
   `draft_value` both set to the source text and `updated_by` set to `lovable`.
3. For each live row whose key is no longer found: if `draft_value` equals `value`,
   retire it. If they differ, the editor had an unpublished draft on text the
   designer changed or removed. Create a `sync_conflicts` row with `mine` set to
   the draft, `original` set to `value`, and `theirs` set to the text of the field
   that took its place, chosen as the newly added field in the same file with the
   same tag and the same position in source order, or null when there is none.
   Then retire the row.
4. Write `pages.ingested_sha`, `sync_state` and a `sync_log` row with counts of
   kept, added, retired and conflicting fields.

A pull after the CMS's own push is a no-op by construction: the re-keyed rows match
what the scan finds. The pull still runs, because it is cheap and it confirms the
push landed.

### Conflict resolution

Each open conflict offers two actions. Keep Lovable's drops the draft and resolves.
Re-apply mine copies `mine` into the replacement field's `draft_value`, so the
editor can review it on the page and publish it through the normal push. When
`theirs` is null the second action is unavailable, because there is no field to
apply it to.

## Configuration

In `.env`, alongside the existing keys:

```
LOVABLE_REPO=https://github.com/vinaynain26/dark-welcome-page.git
LOVABLE_TOKEN=github_pat_...        # fine-grained, this repo only, Contents read and write
LOVABLE_BRANCH=main
SYNC_POLL_SECONDS=20
SYNC_WEBHOOK_SECRET=                # optional, only needed once deployed
SYNC_SLUG_PREFIX=lab
DB_PATH=data/lab.db
```

Reading a public repo works without the token. Pushing does not.

## Isolation

The lab lives on the `lovable-sync-lab` branch in the same checkout. The real CMS is a
`git switch v0Bugs` away. Two things keep the experiment from touching real data:

- The server reads its database path from `DB_PATH` in `.env`, defaulting to
  `data/content.db`. The lab sets `DB_PATH=data/lab.db`, so it seeds and edits a
  separate file. The `v0Bugs` server ignores the variable and keeps using
  `data/content.db`.
- Pages ingested from the repo are slugged `<SYNC_SLUG_PREFIX>-<route>`, default prefix
  `lab`, so `/` becomes `lab-home` and `/pricing` becomes `lab-pricing`. The seed-file
  page named `pricing` is never touched.

One new dependency, `@babel/parser`, the same parser the site's Vite plugin already
uses. Installed on this branch with approval on 2026-09-14.

## Error handling

- Git or network failure on push: the editor sees the message, the DB is unchanged,
  the drafts remain drafts. `sync_state.last_error` records it for the panel.
- Git failure on pull: logged, the previous scan stays authoritative, the next poll
  retries.
- Token missing: the panel says so, publish on repo pages is disabled with the
  reason shown, pull still works on a public repo.
- The working clone in a bad state (half merge, dirty tree): every operation starts
  with `reset --hard` and `merge --abort`, so the next operation heals it.
- A lost GitHub-to-Lovable notification cannot be detected from our side. The demo
  script checks Lovable's UI after each push and records whether it appeared.

## Testing

All automated tests use `node:test` and `node:sqlite`, both built in, so no
further packages.

- Unit, write-back: fixture files covering JSX text with surrounding whitespace, a
  string attribute, a module-level object property, a template literal, the same
  text twice in one file, and the `<em>`-split headline. Each asserts the exact
  output file, byte for byte, so formatting preservation is proven, not assumed.
- Unit, scan and apply: a temporary DB, then keep, add, retire and conflict cases,
  including the draft-under-changed-text case that must produce a conflict row.
- Integration, local: a bare repo in the scratchpad initialised from the demo
  repo's files, a second clone playing the designer. Runs the full push, the full
  pull, the conflict and the add-and-delete-a-card beats without network.
- Live: the four success beats against the real repo, with timings and Lovable's
  behaviour recorded in the final report.

## Risks

- Lovable misses a GitHub notification. Known Lovable behaviour, outside our
  control. Recorded if it happens.
- Lovable reformats a file. Keys hash whitespace-normalised text, so formatting
  changes do not re-key anything.
- Lovable rewrites a sentence the editor is drafting on. Surfaced as a conflict, by
  design. This is the case the manager cares about most.
- A publish and a Lovable push cross in flight. The push is rejected, retried once
  from a fresh head, then reported. No partial state.
- The token leaks. Fine-grained, one repo, contents only, held in a gitignored
  `.env`, never printed, never written to git config.
