# Approval Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publishing a Lovable page queues a change request that a super admin accepts (pushes to the repo) or declines, from an Approvals dashboard in the studio.

**Architecture:** A `change_requests` + `change_request_items` pair in SQLite holds snapshots of drafts. `sync/queue.js` owns submit, accept, decline and reads; accept reuses the write-back path by lifting `pushPage`'s body into `pushRows`. `server.js` exposes `/api/queue*` and reroutes the repo-page publish to submit. `admin/queue.html` is the dashboard.

**Tech Stack:** Node 22 (`node:sqlite`), Express 4, plain ES module browser scripts, `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-23-approval-queue-design.md`

## Global Constraints

- No git commits unless the user asks (standing rule for this repo).
- No new packages.
- No em dashes in any code comment, UI copy or doc.
- Studio pages use `admin/app.css` classes and `admin/shell.js` helpers, same look as `sync.html`.
- Tests run with `npm test` (`node --test "test/*.test.mjs"`); 103 pass today and must still pass.

---

### Task 1: Roles and permissions

**Files:**
- Modify: `auth.js:11-31` (ROLES, PERMS, labels, blurbs, TEAM seed)
- Modify: `server.js:422-440` (role change guard)
- Modify: `public/js/mu-editor-boot.js:139-142` (perm table copy)
- Modify: `admin/shell.js` (ROLE_TONE, nav gate), `admin/people.html:40` (gate), `admin/edit.html:107-111` (CAN)

**Produces:** `auth.can(role, "publish" | "publish-direct" | "approve" | "users")`, role key `superadmin`.

- [ ] Step 1: In `auth.js` set

```js
export const ROLES = ["viewer", "commenter", "editor", "admin", "superadmin"];
const PERMS = {
  viewer:     ["read"],
  commenter:  ["read", "comment"],
  editor:     ["read", "comment", "edit", "ai", "publish"],
  admin:      ["read", "comment", "edit", "ai", "publish", "publish-direct", "reorder", "users"],
  superadmin: ["read", "comment", "edit", "ai", "publish", "publish-direct", "approve", "reorder", "users"],
};
```
Labels: `superadmin: "Super Admin"`. Blurbs: editor "Can edit text, use the AI writer, and submit changes for approval."; admin "Can publish hand-built pages, reorder sections and manage people. Lovable changes still need a Super Admin."; superadmin "Approves or declines changes before they go to Lovable. Everything an admin can do." Add `{ email: "superadmin@mastersunion.org", name: "Super Admin", role: "superadmin" }` to TEAM so a demo login exists.

- [ ] Step 2: In `server.js` PUT users: the "only admin" guard becomes: if target is the last `superadmin` and the new role is not superadmin, refuse "This is the only super admin. Promote someone else first." Also: assigning or removing `superadmin` requires the caller to be superadmin, unless no superadmin exists yet (bootstrap). Return 403 "Only a super admin can grant Super Admin." Same check on POST users when `role === "superadmin"`.

- [ ] Step 3: `mu-editor-boot.js` perm table: add `publish` to editor, add the superadmin row, and expose `approve: can("approve")` in `can`. `admin/edit.html` CAN: `edit` for editor/admin/superadmin, `publish` for editor/admin/superadmin, `ai` likewise. `admin/people.html` gate: `!['admin','superadmin'].includes(role)`. `shell.js`: settings group for admin or superadmin; `ROLE_TONE.superadmin = 'crit'`.

- [ ] Step 4: `npm test` still green (no test touches these).

### Task 2: Schema and `pushRows`

**Files:**
- Modify: `sync/store.js` (two tables + indexes in `ensureSchema`)
- Modify: `sync/push.js` (split `pushPage` into `pushRows`)
- Test: `test/push.test.mjs` (existing must pass unchanged)

**Produces:**
- `pushRows(db, slug, rows, { user, author, message })` where `rows` are `{ field_key, label, value, draft_value, src_file, type }`; returns `{ pushed, local, published, sha, files }`. `author` defaults to `user`. `keepDraft(row, text)` rule lives inside `rekey`: `draft_value` is set to `text` only when the current draft equals `row.draft_value` (what was submitted) or `row.value`; otherwise the current draft stays.
- `pushPage(db, slug, { user })` = query dirty rows, then `pushRows`.

- [ ] Step 1: Add to `ensureSchema`:

```sql
CREATE TABLE IF NOT EXISTS change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, page_title TEXT,
  user_id INTEGER, user_name TEXT NOT NULL, user_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending', items INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  decided_by TEXT, decided_at TEXT, note TEXT, sha TEXT, error TEXT
);
CREATE INDEX IF NOT EXISTS cr_status ON change_requests (status, created_at);
CREATE INDEX IF NOT EXISTS cr_page_user ON change_requests (page_slug, user_id, status);
CREATE TABLE IF NOT EXISTS change_request_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL,
  field_key TEXT NOT NULL, label TEXT, section_title TEXT, type TEXT, src_file TEXT,
  before TEXT NOT NULL, after TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS cri_request ON change_request_items (request_id);
```

- [ ] Step 2: Refactor `push.js`: `pushPage` runs the SELECT and calls `pushRows(db, slug, rows, { user })`. `pushRows` holds everything from the "emptied" filter down. The emptied-draft reset only runs when the rows came from the drafts (pass `{ fromDrafts: true }` from `pushPage`); for queue rows, emptied media/link items are simply skipped. `rekey` and `goLiveLocal` take the draft-keeping rule: read the current `draft_value` before renaming; new draft = current draft if it differs from both `p.value` and `p.draft_value` (submitted after), else `text`. Commit message accepts `opts.message` override, author `opts.author || user`.

- [ ] Step 3: Run `npm test`. Expect 103 pass.

### Task 3: `sync/queue.js` with tests

**Files:**
- Create: `sync/queue.js`
- Create: `test/queue.test.mjs`

**Produces:**
```js
submitRequest(db, slug, { user }) -> { id, items, replaced: bool }  // throws if page has no repo or nothing dirty -> returns { id: null, items: 0 }
acceptRequest(db, id, { user }) -> { id, status: "accepted", sha, pushed, local } | throws QueueStateError(409)
declineRequest(db, id, { user, note }) -> { id, status: "declined" }
listRequests(db, { status = "pending", limit = 100 }) -> [{ ...request, items: [...] }]
summary(db) -> { pending, accepted, declined, failed, applying }
pendingByPage(db) -> Map<slug, n>
```

- [ ] Step 1: Write tests in `test/queue.test.mjs` using the `setup()` pattern from `test/push.test.mjs` (fixture app, `lab-home`, key `K("pages/Index.tsx", "Welcome to SecureFlow.")`):

  1. submit snapshots dirty rows: request pending, one item with before "Welcome to SecureFlow." and after "Hello SecureFlow.", draft still dirty in page_content.
  2. same user resubmits: same id, items replaced, `replaced: true`; another user submits: new id.
  3. accept: remote head moves, file has new text, request accepted with sha, commit author is the submitter, row re-keyed with value = draft = "Hello SecureFlow.", publishes row count 1.
  4. accept keeps a newer draft: after submit, set draft to "Newer text."; accept; row value "Hello SecureFlow.", draft "Newer text.".
  5. decline: status declined, note stored, draft still "Hello SecureFlow.".
  6. source moved: remote changes the sentence, then accept -> status failed, error matches /changed in Lovable/, draft untouched, remote head unchanged.
  7. two accepts fired with Promise.all on two different fields land as two commits, both accepted, remote log shows both in order.
  8. accept on an accepted request throws with `status === 409`.

- [ ] Step 2: Run `node --test test/queue.test.mjs`, expect failures (module missing).

- [ ] Step 3: Implement `sync/queue.js`:

```js
import * as repo from "./repo.js";
import { pushRows } from "./push.js";
import { clean } from "./scan.js";
export class QueueStateError extends Error { constructor(m) { super(m); this.status = 409; } }
const now = () => new Date().toISOString();

export function submitRequest(db, slug, { user }) {
  const page = db.prepare("SELECT slug, title, repo FROM pages WHERE slug = ?").get(slug);
  if (!page?.repo) throw new Error("This page did not come from the repo, so there is nothing to queue.");
  const rows = db.prepare(`SELECT field_key, label, section_title, type, src_file, value, draft_value FROM page_content
    WHERE page_slug = ? AND value <> draft_value AND retired = 0 ORDER BY section_ord, ord`).all(slug)
    .filter((r) => !((r.type === "media" || r.type === "link") && clean(r.draft_value) === ""));
  if (!rows.length) return { id: null, items: 0, replaced: false };
  const t = now();
  const open = db.prepare("SELECT id FROM change_requests WHERE page_slug = ? AND user_id IS ? AND status = 'pending'").get(slug, user.id ?? null);
  let id, replaced = false;
  db.exec("BEGIN");
  try {
    if (open) { id = open.id; replaced = true;
      db.prepare("DELETE FROM change_request_items WHERE request_id = ?").run(id);
      db.prepare("UPDATE change_requests SET items = ?, updated_at = ?, page_title = ? WHERE id = ?").run(rows.length, t, page.title, id);
    } else {
      id = Number(db.prepare(`INSERT INTO change_requests (page_slug, page_title, user_id, user_name, user_email, status, items, created_at, updated_at)
        VALUES (?,?,?,?,?,'pending',?,?,?)`).run(slug, page.title, user.id ?? null, user.name, user.email ?? null, rows.length, t, t).lastInsertRowid);
    }
    const ins = db.prepare(`INSERT INTO change_request_items (request_id, field_key, label, section_title, type, src_file, before, after, ord) VALUES (?,?,?,?,?,?,?,?,?)`);
    rows.forEach((r, i) => ins.run(id, r.field_key, r.label, r.section_title, r.type, r.src_file, r.value, r.draft_value, i));
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return { id, items: rows.length, replaced };
}
```
`acceptRequest`: load request; if status not pending/failed throw QueueStateError; UPDATE to `applying` guarded by `WHERE status IN ('pending','failed')` and check `changes === 1` (else QueueStateError); build rows from items (`value: before, draft_value: after`) filtered to rows that still exist and are not retired; call `pushRows(db, slug, rows, { user: submitter, message })` where submitter is `{ id: user_id, name: user_name, email: user_email }` and message `content(${slug}): N change(s) via MU Console, approved by ${user.name}`; on success UPDATE accepted with sha, decided_by, decided_at; on error UPDATE failed with `error` = first line of message and rethrow nothing (return `{ id, status: "failed", error }`). Wrap the push in `repo.serial` is already inside pushRows; ordering across concurrent accepts comes from that chain.
`declineRequest`: pending/failed only, else QueueStateError. `listRequests`: pending ordered by created_at ASC, others DESC; attach items ordered by ord. `summary`: one GROUP BY query. `pendingByPage`: GROUP BY page_slug WHERE status='pending'.

- [ ] Step 4: Run `node --test test/queue.test.mjs` until green, then `npm test`.

### Task 4: Server routes

**Files:**
- Modify: `server.js` (publish route ~988, new `/api/queue*` routes after sync routes, `/api/pages` summary ~680, console route for `/console/approvals`)

- [ ] Step 1: Publish route, repo branch: replace the push with

```js
if (pg?.repo) {
  try {
    const q = queue.submitRequest(db, req.params.slug, { user: req.user });
    if (!q.id) return res.json({ published: 0, queued: false, message: "Nothing to submit" });
    return res.json({ published: 0, queued: true, request: q, by: req.user.name, at: new Date().toISOString(),
      message: `Sent for approval: ${q.items} change${q.items === 1 ? "" : "s"}, request #${q.id}${q.replaced ? " (updated your earlier request)" : ""}` });
  } catch (e) { return res.status(400).json({ error: e.message }); }
}
/* hand-built and instrumented pages publish directly, admin and above */
if (!auth.can(req.user.role, "publish-direct")) return res.status(403).json({ error: "An editor cannot publish this page directly. Ask an admin." });
```

- [ ] Step 2: Queue routes:

```js
app.get("/api/queue", auth.require_("read"), (req, res) => res.json({ summary: queue.summary(db), requests: queue.listRequests(db, { status: req.query.status || "pending", limit: Number(req.query.limit) || 100 }) }));
app.post("/api/queue/:id/accept", auth.require_("approve"), async (req, res) => { try { const out = await queue.acceptRequest(db, Number(req.params.id), { user: req.user }); if (out.sha) settleAfterPush(out.sha); res.status(out.status === "failed" ? 502 : 200).json(out); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });
app.post("/api/queue/:id/decline", auth.require_("approve"), (req, res) => { try { res.json(queue.declineRequest(db, Number(req.params.id), { user: req.user, note: String(req.body?.note || "").slice(0, 500) })); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } });
app.post("/api/queue/accept-all", auth.require_("approve"), async (req, res) => { const ids = queue.listRequests(db, { status: "pending" }).map((r) => r.id); const results = []; for (const id of ids) { try { results.push(await queue.acceptRequest(db, id, { user: req.user })); } catch (e) { results.push({ id, status: "error", error: e.message }); } } const last = results.filter((r) => r.sha).pop(); if (last) settleAfterPush(last.sha); res.json({ results }); });
```
`settleAfterPush(sha)` = `pullNow(db, { reason: "approve" }).catch(log)` fire-and-forget (the site rebuilds when the poll sees the commit; the approver is not waiting on a page reload).

- [ ] Step 3: `/api/pages`: add `(SELECT COUNT(*) FROM change_requests r WHERE r.page_slug = p.slug AND r.status = 'pending') AS pending_requests` and `(SELECT MAX(decided_at) FROM change_requests r WHERE r.page_slug = p.slug AND r.status = 'declined') AS last_declined`.

- [ ] Step 4: `app.get(CONSOLE + "/approvals", gate, send("queue.html"));`

- [ ] Step 5: Start the server on a spare port with `SYNC_NO_POLL=1 PORT=3999`, curl login as editor, publish `mu-home` (or whichever repo page exists), GET `/api/queue`, decline as superadmin. Record the output.

### Task 5: Dashboard `admin/queue.html`

**Files:**
- Create: `admin/queue.html`
- Modify: `admin/shell.js` (nav item "Approvals" with pending badge for superadmin), `admin/index.html` (shelf badge)

- [ ] Step 1: Page skeleton like `sync.html`: `.shell` > `nav.side` + `main`. `phead` with h1 "Approvals", sub "Changes editors submitted. Accept sends them to Lovable; decline leaves them as drafts.", actions: "Accept all pending" (primary) + hint span. A counters row (four `.card`s inline, or a `.kv`-style strip) and a tab strip of four buttons with `data-status`. A `#list` container.

- [ ] Step 2: Script: `chrome('approvals')`; if `acct.user.role !== 'superadmin'` show banner and stop. `load()` fetches `/api/queue?status=` + current tab; renders counters and cards:

```html
<div class="card req" data-id>
  <header><h2>{page_title}</h2> <span class="badge {tone}">{status}</span> <div class="grow"></div>
    <span class="hint">{items} changes · {user_name} &lt;{user_email}&gt; · {ago(created_at)}</span></header>
  <div class="inner">
    <div class="tw"><table class="diff"><thead><tr><th>Section</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>…</tbody></table></div>
    {error ? <div class="banner crit">The page changed since this was submitted: {error}</div>}
    {status in pending|failed ? <div class="act"><button class="btn primary" data-acc>{failed ? 'Retry' : 'Accept'}</button><button class="btn" data-dec>Decline</button></div>}
    {accepted ? <div class="hint">Accepted by {decided_by} {ago} · commit {sha7}</div>}
    {declined ? <div class="hint">Declined by {decided_by} {ago}{note ? ': ' + note}</div>}
  </div>
</div>
```
Styles: `.diff{width:100%;border-collapse:collapse;font-size:13px} .diff th,.diff td{padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left} .diff td.b{color:var(--ink-sub);text-decoration:line-through} .tw{overflow-x:auto}`. Accept: `POST /api/queue/{id}/accept`, button busy text "Sending to Lovable…", then reload. Decline: `prompt('Reason (optional)')`, POST with note. Accept all: confirm, POST accept-all, show "N accepted, M failed". `setInterval(() => document.visibilityState === 'visible' && load(), 5000)`.

- [ ] Step 3: `shell.js`: after Sync, for superadmin: `<a href="/console/approvals" class="{on}">${icon('check')}Approvals${pending ? ` <span class="badge warn">${pending}</span>` : ''}</a>` where pending comes from `acct.queue?.pending`; add `queue: queue.summary(db)` to `/api/account` and a `check` icon path `<path d="m3 8.5 3 3 7-7"/>`.

- [ ] Step 4: `index.html` pmeta: after the drafts span, `${p.pending_requests > 0 ? '<span>·</span><span class="warn">' + p.pending_requests + ' awaiting approval</span>' : ''}`.

- [ ] Step 5: Open `/console/approvals` as superadmin in the browser (Puppeteer from the Hero Launch node_modules, `domcontentloaded` + selector), screenshot pending list, accept one against a local bare remote or the real repo only with the user's go-ahead.

### Task 6: Inline editor and studio edit page copy

**Files:**
- Modify: `public/js/inline-editor.js:519-523, 3303-3324`
- Modify: `admin/edit.html:382-396`

- [ ] Step 1: Inline editor: label = `CAN.approve ? "Publish" : "Submit for approval"` (`CAN.approve` from boot). Confirm text: "Send all drafts on this page for approval?" when not approve. In `publish()`, when `out.queued`: `btnDone(btnPub, "Sent", label, 2600); toast(out.message, 6000);` and no reload. Keep the existing branch for `out.published`.

- [ ] Step 2: `edit.html`: same label logic (`acct.user.role === 'superadmin'`), alert `r.message` (already does).

- [ ] Step 3: `npm test` green; manual check in browser that the button reads "Submit for approval" for the editor login.

### Task 7: Docs

- [ ] Update `PROJECT-OVERVIEW.md` roles table and the "Drafts, review, publish" paragraph with two sentences on the queue and the Super Admin role. No commit.
