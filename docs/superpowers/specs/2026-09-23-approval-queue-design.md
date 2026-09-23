# Approval queue for Lovable publishes

Written 23 September 2026. Branch `adminResult`.

## Why

Publishing a Lovable page in MU Console commits straight to the branch Lovable
syncs. Lovable shows "update preview" and that is the whole of it: nobody on the
Lovable side gets to accept or decline. Lovable has no review screen for incoming
commits (its docs: "changes pushed to the active GitLab branch sync back into
Lovable"). So the gate has to live in the console.

The console gains a queue of change requests and a dashboard where a super admin
accepts or declines each one. Only an accepted request is pushed to the repo, so
nothing reaches Lovable without a decision. The queue is designed for many
editors at once: requests are independent rows, decisions are serialized through
the existing git lock, and the dashboard polls.

## Roles

A new role `superadmin` sits above `admin`:

| Role | Read | Comment | Edit | AI | Submit | Publish direct (non-repo pages) | Approve | Reorder | People |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| viewer | yes | | | | | | | | |
| commenter | yes | yes | | | | | | | |
| editor | yes | yes | yes | yes | yes | | | | |
| admin | yes | yes | yes | yes | yes | yes | | yes | yes |
| superadmin | yes | yes | yes | yes | yes | yes | yes | yes | yes |

Permission names in `auth.js`: `publish` (submit a request on a repo page, or
publish a non-repo page when the caller also has `publish-direct`), `publish-direct`
(admin and superadmin), `approve` (superadmin), `users` (admin and superadmin).

Granting `superadmin`: only a superadmin may assign or remove the superadmin role,
with one exception for bootstrapping: while no superadmin exists, an admin may
promote one user. The "only admin left" guard extends to "only superadmin left".
Pages that did not come from the repo (hand-built, instrumented) keep today's
direct publish, gated by `publish-direct`. They never reach Lovable, so they do
not queue.

## Data

Two tables, created by `sync/store.js` `ensureSchema` alongside the sync tables:

```
change_requests
  id INTEGER PK, page_slug, page_title,
  user_id, user_name, user_email,
  status TEXT  -- pending | applying | accepted | declined | failed
  items INTEGER, created_at, updated_at,
  decided_by, decided_at, note, sha, error

change_request_items
  id INTEGER PK, request_id, field_key, label, section_title, type, src_file,
  before, after, ord
  index (request_id)
```

Indexes on `change_requests(status, created_at)` and `(page_slug, user_id, status)`.

## Submit

`POST /api/pages/:slug/publish` on a page with `repo` set, permission `publish`:

1. Collect every row on the page with `value <> draft_value AND retired = 0`,
   ordered by section and field order.
2. A media or link draft emptied to "" is dropped and its draft reset to the
   live value, exactly as `pushPage` does today.
3. If the caller already has a `pending` request on this page, its items are
   replaced and its `updated_at` and `items` refreshed; otherwise a new request is
   inserted. Items carry `before = value` and `after = draft_value` at this moment.
4. Drafts are not touched. The editor keeps working; the request is a snapshot.
5. Response: `{ queued: true, request: { id, items }, message }` with the message
   "Sent for approval: N changes, request #ID".

The inline editor's Publish button reads "Submit for approval" on repo pages when
the user cannot approve, and "Publish" otherwise; both call the same route. The
toast shows the message. No reload, since nothing changed on the page.

## Accept

`POST /api/queue/:id/accept`, permission `approve`. Runs `acceptRequest(db, id, { user })`
in `sync/queue.js`:

1. The request must be `pending` or `failed`; otherwise 409.
2. Status becomes `applying` at once, so a second super admin's click on the
   same card returns 409 rather than a second push.
3. The items are fed to the write-back path. `sync/push.js` gains
   `pushRows(db, slug, rows, { user, message })`, the current `pushPage` body with
   the row query lifted out, where each row is `{ field_key, label, value: before,
   draft_value: after, src_file, type }`. `pushPage` remains as a thin wrapper for
   the existing tests and the non-queued path.
4. The commit is authored by the submitter (`user_name <user_email>`), with the
   message `content(<slug>): N changes via MU Console, approved by <approver>` and
   the before -> after lines as today.
5. On success: status `accepted`, `sha`, `decided_by`, `decided_at`. Re-keying
   sets `value` to the snapshot text. `draft_value` becomes the snapshot text
   only if it still equals the submitted `after` (or the old `before`); a newer
   draft the editor typed since submission is kept.
6. Items the repo cannot take (lists, dates, CMS-born fields) go live in the
   console only, as today.
7. On `SourceMovedError` (the page changed in Lovable, or another accepted
   request already replaced that text): status `failed`, `error` set to the
   plain message. Drafts untouched. The dashboard shows "The page changed since
   this was submitted" with Retry and Decline. On any other push error: same,
   with the git message.
8. Every accept goes through `repo.serial`, so concurrent accepts become ordered
   commits. `POST /api/queue/accept-all` accepts every pending request oldest
   first, one after another, and returns per-request results.
9. After a successful push the server triggers `pullNow` so the site rebuilds
   at the new commit, without blocking the response beyond a short wait.

## Decline

`POST /api/queue/:id/decline` with optional `{ note }`, permission `approve`.
Pending or failed only. Status `declined`, `decided_by`, `decided_at`, `note`.
Drafts stay so the editor can revise and resubmit; resubmitting creates a new
request (a declined one is never reopened).

## Reading the queue

`GET /api/queue?status=pending|accepted|declined|failed|all&limit=100`,
permission `read`, returns requests newest first for history and oldest first
for pending, each with its items. `GET /api/queue/summary` returns counts by
status, used by the dashboard header and the side nav badge.

`GET /api/pages` gains `pending_requests` (count of pending requests on the page)
and `last_declined` (most recent declined request's time, if newer than the last
accept) so the page shelf can show a badge.

## Dashboard

`admin/queue.html`, served at `/console/approvals`, side nav item "Approvals"
shown to superadmins (with a pending count badge). Other roles get the nav item
hidden and the page shows "Only a super admin can review changes".

Layout, in the studio skin:

- Header: title, four counters (Pending, Accepted, Declined, Failed), buttons
  "Accept all pending" and "Refresh".
- Filter tabs: Pending (default), Accepted, Declined, Failed.
- One card per request. Card head: page title (link to the page), submitter name
  and email, time ago, "N changes", status badge. Card body: a table with
  columns Section, Field, Before, After. Long values wrap; before and after
  render as plain text. Card foot: Accept and Decline buttons for pending and
  failed; Retry replaces Accept when failed; the error line shows above the
  buttons. Accepted cards show the commit sha and who approved; declined cards
  show the note.
- Decline asks for an optional note in a prompt.
- The list polls every five seconds while the tab is visible.

## Files

New: `sync/queue.js`, `admin/queue.html`, `test/queue.test.mjs`.

Changed: `auth.js` (role, perms, labels), `sync/store.js` (schema),
`sync/push.js` (`pushRows`), `server.js` (publish route, queue routes, pages
summary, user role guard, console route), `admin/shell.js` (nav item, role tone),
`admin/people.html` (superadmin gate), `admin/index.html` (badge),
`public/js/inline-editor.js` (button label, toast, no reload on queue),
`public/js/mu-editor-boot.js` (perms table), `test/helpers.mjs` (nothing, the
schema comes from `ensureSchema`).

## Testing

`node --test test/queue.test.mjs` against the fixture repo:

- submit snapshots the dirty rows with before and after, leaves drafts alone;
- a second submit by the same user on the same page replaces the pending request;
- a different user's submit is a separate request;
- accept pushes the snapshot, re-keys, marks accepted with the sha, authored by
  the submitter;
- accept keeps a newer draft typed after submission;
- decline marks declined and leaves drafts;
- accept after the source moved marks failed with a readable error and leaves
  drafts;
- two accepts fired together land as two ordered commits;
- accept on an accepted request is refused.

Existing suites stay green. Then a browser run: submit as an editor, accept as a
superadmin, watch the Lovable repo receive the commit. That push to the GitLab
repo happens only after the user says so.

## Out of scope

Email or Slack notifications, per-field partial accept, editing a request's text
in the dashboard, a GitLab merge request mirror, and queueing for non-repo pages.
