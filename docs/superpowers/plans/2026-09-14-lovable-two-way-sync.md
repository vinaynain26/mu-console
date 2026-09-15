# Lovable Two-Way Sync (Lab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy published in the CMS is committed into the Lovable-connected GitHub repo as source, and copy changed in Lovable flows back into the CMS, with conflicts surfaced instead of overwritten.

**Architecture:** A `sync/` folder holds five focused modules: git plumbing, an AST scanner, a DB applier with conflict detection, a source write-back that splices new text at exact offsets, and a watcher that polls the remote. `server.js` wires them into publish, a few `/api/sync` routes and a studio panel. The lab runs on its own database file.

**Tech Stack:** Node 22+, Express 4, `node:sqlite`, `@babel/parser` 7.29 (already installed on this branch), `node:test` for tests, plain `git` via `child_process`.

**Spec:** `docs/superpowers/specs/2026-09-14-lovable-two-way-sync-design.md`

## Global Constraints

- Branch is `lovable-sync-lab` in this checkout. Never switch branches, never touch `v0Bugs` or `main`.
- Never commit. Vinay commits himself. Each task ends by staging files with `git add` and reporting; nothing more.
- Never install a package beyond `@babel/parser`, which is already in `package.json`. Tests use only `node:test`, `node:sqlite`, `node:fs`, `node:child_process`.
- Never print the value of `LOVABLE_TOKEN`. Never write it to any file other than `.env`.
- Never force-push, amend, rebase or squash anything on the Lovable repo. Only add commits.
- Never run against the real repo (`vinaynain26/dark-welcome-page`) in an automated test. Tests use a local bare repo in a temp dir. Only Task 11 touches the real repo, by hand.
- No em dashes anywhere: not in code comments, commit messages, UI copy or docs. Use a comma, a colon or a full stop.
- The lab database is `data/lab.db`, selected by `DB_PATH` in `.env`. Never open `data/content.db`.
- Keys are `<file path under src, with extension>.<8-char sha1 of whitespace-normalised text>`. Example: `components/landing/Navbar.tsx.220f43b3`. Never positional.
- All new code is ESM (`import`/`export`), matching `server.js`.
- Run tests with `npm test` (added in Task 1). Every task must leave `npm test` green.

## File map

| File | Responsibility |
|---|---|
| `sync/store.js` | Sync tables, `pages` columns, state, log and conflict helpers. |
| `sync/repo.js` | Running git in a working clone of the one Lovable repo, token as header, serial queue. |
| `sync/scan.js` | Read routes and copy out of a Vite plus React Router app with Babel. Pure, no DB. |
| `sync/apply.js` | Write a scan into the DB: keep, add, retire, conflict. |
| `sync/writeback.js` | Find text by hash in a source file and splice new text at exact offsets. Pure. |
| `sync/push.js` | Publish a page: write back, commit, push, verify, re-key rows. |
| `sync/watch.js` | Pull on demand and on a poll. |
| `server.js` | `DB_PATH`, schema call, routes, publish branch, studio route, poll start. |
| `admin/sync.html` | The Sync panel. |
| `admin/shell.js` | One nav link. |
| `test/helpers.mjs` | Temp DB with the CMS schema, temp bare repo, fixture copy. |
| `test/fixtures/app/` | A tiny React Router app in the demo repo's shape. |
| `test/*.test.mjs` | One test file per module plus one end-to-end loop. |

---

### Task 1: Lab database path, sync schema, test runner

**Files:**
- Modify: `server.js:63` (the `DatabaseSync` line)
- Modify: `package.json` (scripts)
- Create: `sync/store.js`
- Create: `test/helpers.mjs`
- Test: `test/store.test.mjs`

**Interfaces:**
- Produces: `ensureSchema(db)`, `getState(db)`, `setState(db, patch)`, `logEvent(db, { direction, sha, summary, actor })`, `recentLog(db, n)`, `openConflicts(db)`, `addConflict(db, row)`, `resolveConflict(db, id, resolution)`. `makeDb()` in helpers returns an in-memory DB with the CMS tables plus the sync tables.

- [ ] **Step 1: Add the test script and the DB path**

In `package.json` add to `"scripts"`:

```json
"test": "node --test test/"
```

In `server.js` replace line 63:

```js
const db = new DatabaseSync(path.join(ROOT, "data/content.db"));
```

with:

```js
/* DB_PATH lets an experiment branch keep its own file (data/lab.db) while the
   normal server keeps data/content.db. Relative to the project root. */
const DB_FILE = path.join(ROOT, process.env.DB_PATH || "data/content.db");
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
```

- [ ] **Step 2: Write the test helper**

Create `test/helpers.mjs`:

```js
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ensureSchema } from "../sync/store.js";

/* The CMS tables the sync code touches, copied from server.js so tests need
   no server. Keep in step with server.js if those tables change. */
export function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE pages (slug TEXT PRIMARY KEY, title TEXT NOT NULL, template TEXT NOT NULL,
      layout TEXT NOT NULL DEFAULT 'main', source TEXT NOT NULL DEFAULT 'handbuilt');
    CREATE TABLE page_content (
      page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
      section_key TEXT NOT NULL, section_title TEXT NOT NULL, section_ord INTEGER NOT NULL DEFAULT 0,
      tab_key TEXT NOT NULL DEFAULT '_all', tab_title TEXT NOT NULL DEFAULT 'Shown on every tab',
      label TEXT NOT NULL, tag TEXT, multiline INTEGER NOT NULL DEFAULT 0, ord INTEGER NOT NULL DEFAULT 0,
      value TEXT NOT NULL, draft_value TEXT NOT NULL, updated_at TEXT, updated_by TEXT,
      retired INTEGER NOT NULL DEFAULT 0, options TEXT, type TEXT NOT NULL DEFAULT 'text',
      PRIMARY KEY (page_slug, field_key));
    CREATE TABLE revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
      old_value TEXT, new_value TEXT, changed_by TEXT, changed_at TEXT);
    CREATE TABLE publishes (id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL,
      user_id INTEGER, user_name TEXT, user_email TEXT, fields INTEGER NOT NULL, published_at TEXT);
    CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
      body TEXT NOT NULL, author_id INTEGER, author_name TEXT, created_at TEXT, resolved INTEGER NOT NULL DEFAULT 0);
  `);
  ensureSchema(db);
  return db;
}

export const tmpDir = (name) => fs.mkdtempSync(path.join(os.tmpdir(), name + "-"));

const git = (args, cwd) => execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd, stdio: "pipe" }).toString().trim();

/** A bare repo whose `main` holds a copy of `srcDir`. Returns { bare, work } paths. */
export function makeRemote(srcDir) {
  const root = tmpDir("sync-remote");
  const bare = path.join(root, "origin.git");
  const work = path.join(root, "seed");
  git(["init", "-q", "--bare", "-b", "main", bare], root);
  git(["clone", "-q", bare, work], root);
  fs.cpSync(srcDir, work, { recursive: true });
  git(["add", "-A"], work);
  git(["commit", "-q", "-m", "seed"], work);
  git(["push", "-q", "origin", "main"], work);
  return { bare, work, git: (args) => git(args, work) };
}

/** Point sync/repo.js at a local remote for the duration of a test. */
export function useRemote(bare, cloneDir) {
  process.env.LOVABLE_REPO = bare;
  process.env.LOVABLE_TOKEN = "";
  process.env.LOVABLE_BRANCH = "main";
  process.env.SYNC_CLONE_DIR = cloneDir;
  process.env.SYNC_SLUG_PREFIX = "lab";
}

export const FIXTURE_APP = new URL("./fixtures/app/", import.meta.url).pathname;
```

- [ ] **Step 3: Write the failing test**

Create `test/store.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb } from "./helpers.mjs";
import { getState, setState, logEvent, recentLog, addConflict, openConflicts, resolveConflict } from "../sync/store.js";

test("schema adds pages columns and a single state row", () => {
  const db = makeDb();
  const cols = db.prepare("PRAGMA table_info(pages)").all().map((c) => c.name);
  for (const c of ["repo", "branch", "ingested_sha"]) assert.ok(cols.includes(c), c);
  assert.equal(getState(db).id, 1);
  assert.equal(getState(db).last_remote_sha, null);
});

test("state patch, log and conflicts round-trip", () => {
  const db = makeDb();
  setState(db, { last_remote_sha: "abc", last_error: null });
  assert.equal(getState(db).last_remote_sha, "abc");
  logEvent(db, { direction: "pull", sha: "abc", summary: "2 added", actor: "poll" });
  assert.equal(recentLog(db, 5)[0].summary, "2 added");
  const id = addConflict(db, { page_slug: "lab-home", file: "src/x.tsx", old_key: "x.tsx.11111111", new_key: "x.tsx.22222222",
    label: "Headline", original: "Old", theirs: "Theirs", mine: "Mine" });
  assert.equal(openConflicts(db).length, 1);
  resolveConflict(db, id, "keep-theirs");
  assert.equal(openConflicts(db).length, 0);
  assert.equal(db.prepare("SELECT resolution FROM sync_conflicts WHERE id = ?").get(id).resolution, "keep-theirs");
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '../sync/store.js'`.

- [ ] **Step 5: Implement `sync/store.js`**

```js
/**
 * Sync bookkeeping: three small tables and three columns on `pages`.
 * Everything else about a field stays in page_content, untouched.
 */
export function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_remote_sha TEXT, last_scan_at TEXT, last_push_sha TEXT, last_push_at TEXT, last_error TEXT
    );
    INSERT OR IGNORE INTO sync_state (id) VALUES (1);
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL, sha TEXT,
      summary TEXT NOT NULL, actor TEXT, at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, file TEXT NOT NULL,
      old_key TEXT NOT NULL, new_key TEXT, label TEXT,
      original TEXT NOT NULL, theirs TEXT, mine TEXT NOT NULL,
      created_at TEXT NOT NULL, resolved_at TEXT, resolution TEXT
    );
  `);
  const cols = db.prepare("PRAGMA table_info(pages)").all().map((c) => c.name);
  for (const col of ["repo", "branch", "ingested_sha"]) {
    if (!cols.includes(col)) db.exec(`ALTER TABLE pages ADD COLUMN ${col} TEXT`);
  }
}

export const getState = (db) => db.prepare("SELECT * FROM sync_state WHERE id = 1").get();

export function setState(db, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  db.prepare(`UPDATE sync_state SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = 1`)
    .run(...keys.map((k) => patch[k]));
}

export function logEvent(db, { direction, sha = null, summary, actor = null }) {
  db.prepare("INSERT INTO sync_log (direction, sha, summary, actor, at) VALUES (?,?,?,?,?)")
    .run(direction, sha, summary, actor, new Date().toISOString());
}

export const recentLog = (db, n = 30) => db.prepare("SELECT * FROM sync_log ORDER BY id DESC LIMIT ?").all(n);

export function addConflict(db, c) {
  const info = db.prepare(`INSERT INTO sync_conflicts
    (page_slug, file, old_key, new_key, label, original, theirs, mine, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(c.page_slug, c.file, c.old_key, c.new_key ?? null, c.label ?? null, c.original, c.theirs ?? null, c.mine, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

export const openConflicts = (db) =>
  db.prepare("SELECT * FROM sync_conflicts WHERE resolved_at IS NULL ORDER BY id DESC").all();

export const getConflict = (db, id) => db.prepare("SELECT * FROM sync_conflicts WHERE id = ?").get(id);

export function resolveConflict(db, id, resolution) {
  db.prepare("UPDATE sync_conflicts SET resolved_at = ?, resolution = ? WHERE id = ? AND resolved_at IS NULL")
    .run(new Date().toISOString(), resolution, id);
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: 2 passing.

- [ ] **Step 7: Prove the server boots on the lab DB**

Run: `PORT=4100 timeout 6 node server.js; ls -la data/lab.db`
Expected: the console URL line prints with port 4100, then `data/lab.db` exists. `data/content.db` mtime is unchanged (`ls -la data/content.db` before and after).

- [ ] **Step 8: Stage**

```bash
git add package.json server.js sync/store.js test/helpers.mjs test/store.test.mjs
```

---

### Task 2: Git plumbing for one remote

**Files:**
- Create: `sync/repo.js`
- Test: `test/repo.test.mjs`

**Interfaces:**
- Produces: `cfg()` returning `{ repo, token, branch, clone, prefix, pollSeconds, webhookSecret }`; `configured()` (repo set); `canPush()` (repo and token set); `describe()` (safe for the browser, no token); `git(args, { cwd, token, timeout })`; `serial(fn)`; `ensureClone()`; `resetToRemote()` returning the local head sha; `remoteHead()`; `localHead()`; `commitAndPush({ files, message, author })` returning `{ sha, changed }`; `verifyPushed(sha)`.
- `files` is `{ "src/pages/Index.tsx": "<full new content>" }`. Paths are relative to the clone root.

- [ ] **Step 1: Write the failing test**

Create `test/repo.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import * as repo from "../sync/repo.js";

test("clone, read head, commit, push, verify, and see a remote change", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  assert.equal(repo.configured(), true);
  assert.equal(repo.canPush(), true, "a local path needs no token, canPush is about the repo being writable");

  const head0 = await repo.resetToRemote();
  assert.equal(head0, await repo.remoteHead());
  assert.ok(fs.existsSync(path.join(repo.cfg().clone, "src/App.tsx")));

  const out = await repo.commitAndPush({
    files: { "src/pages/Index.tsx": fs.readFileSync(path.join(repo.cfg().clone, "src/pages/Index.tsx"), "utf8").replace("Welcome", "Hello") },
    message: "content(lab-home): 1 change via MU Console",
    author: { name: "Vinay", email: "vinay@example.com" },
  });
  assert.equal(out.changed, ["src/pages/Index.tsx"]);
  assert.equal(await repo.verifyPushed(out.sha), true);
  assert.equal(await repo.remoteHead(), out.sha);
  assert.match(remote.git(["log", "-1", "--format=%an <%ae>", "origin/main"]) || remote.git(["log", "-1", "--format=%an <%ae>", "main"]), /Vinay <vinay@example.com>/);

  /* the designer pushes from elsewhere */
  remote.git(["pull", "-q", "origin", "main"]);
  fs.writeFileSync(path.join(remote.work, "src/pages/Index.tsx"), "export default () => <h1>Designer</h1>;\n");
  remote.git(["commit", "-qam", "Lovable edit"]);
  remote.git(["push", "-q", "origin", "main"]);
  const head2 = await repo.resetToRemote();
  assert.notEqual(head2, out.sha);
  assert.match(fs.readFileSync(path.join(repo.cfg().clone, "src/pages/Index.tsx"), "utf8"), /Designer/);
});

test("identical content is a no-op", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  await repo.resetToRemote();
  const same = fs.readFileSync(path.join(repo.cfg().clone, "src/App.tsx"), "utf8");
  const out = await repo.commitAndPush({ files: { "src/App.tsx": same }, message: "noop", author: { name: "A", email: "a@b.c" } });
  assert.equal(out.sha, null);
});
```

- [ ] **Step 2: Create the fixture app**

Create `test/fixtures/app/src/App.tsx`:

```tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Index from "./pages/Index.tsx";
import Pricing from "./pages/Pricing.tsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="*" element={<div>404</div>} />
    </Routes>
  </BrowserRouter>
);

export default App;
```

Create `test/fixtures/app/src/pages/Index.tsx`:

```tsx
import Navbar from "@/components/Navbar";

const features = [
  { n: "01", title: "Automated Workflows", desc: "Streamline complex processes with intelligent automation." },
  { n: "02", title: "Robust Security", desc: "State-of-the-art encryption keeps your data compliant." },
];

const Index = () => {
  return (
    <div>
      <Navbar />
      <h1 className="hero">
        Welcome to SecureFlow.
        <br /> Engineered for Precision.
      </h1>
      <p>{"Empower your operations with an intelligent platform."}</p>
      <p>{`Template copy without holes`}</p>
      <img src="/x.png" alt="SecureFlow dashboard preview" />
      <a href="#contact">Request Demo</a>
      <a href="#features">Request Demo</a>
      {features.map((f) => (
        <article key={f.n}><h3>{f.title}</h3><p>{f.desc}</p></article>
      ))}
    </div>
  );
};

export default Index;
```

Create `test/fixtures/app/src/pages/Pricing.tsx`:

```tsx
import Navbar from "@/components/Navbar";

const Pricing = () => (
  <div>
    <Navbar />
    <h1>
      Pricing that <em className="text-primary">scales</em> with your
      <em className="text-primary"> ambition</em>.
    </h1>
    <p>Choose a plan that fits your team today.</p>
  </div>
);

export default Pricing;
```

Create `test/fixtures/app/src/components/Navbar.tsx`:

```tsx
const Navbar = () => (
  <header>
    <span>SecureFlow</span>
    <a href="/pricing">Pricing</a>
    <a href="/#contact">Request Demo</a>
  </header>
);

export default Navbar;
```

Create `test/fixtures/app/index.html`:

```html
<!doctype html><html><head><title>SecureFlow - Secure Data Orchestration</title></head><body><div id="root"></div></body></html>
```

- [ ] **Step 3: Run the test to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '../sync/repo.js'`.

- [ ] **Step 4: Implement `sync/repo.js`**

```js
/**
 * Git for one remote: the Lovable-connected repository.
 *
 * Plain `git` in a working clone under data/lab-repo. The token never lands
 * in .git/config: it travels as a per-command Authorization header, so a
 * copied clone leaks nothing. One git operation runs at a time.
 *
 *   LOVABLE_REPO        https://github.com/<owner>/<name>.git  (or a local path in tests)
 *   LOVABLE_TOKEN       fine-grained PAT, contents read and write on that repo
 *   LOVABLE_BRANCH      default "main", the branch Lovable syncs
 *   SYNC_CLONE_DIR      default data/lab-repo
 *   SYNC_SLUG_PREFIX    default "lab"
 *   SYNC_POLL_SECONDS   default 20
 *   SYNC_WEBHOOK_SECRET optional
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

export const cfg = () => ({
  repo: process.env.LOVABLE_REPO || "",
  token: process.env.LOVABLE_TOKEN || "",
  branch: process.env.LOVABLE_BRANCH || "main",
  clone: process.env.SYNC_CLONE_DIR || path.join(ROOT, "data/lab-repo"),
  prefix: process.env.SYNC_SLUG_PREFIX || "lab",
  pollSeconds: Number(process.env.SYNC_POLL_SECONDS || 20),
  webhookSecret: process.env.SYNC_WEBHOOK_SECRET || "",
});

export const configured = () => Boolean(cfg().repo);
/* a local path (tests) needs no token; a GitHub URL does */
export const canPush = () => { const c = cfg(); return Boolean(c.repo) && (Boolean(c.token) || !/^https?:/.test(c.repo)); };

export function describe() {
  const c = cfg();
  return {
    configured: configured(), canPush: canPush(),
    repo: c.repo.replace(/\.git$/, ""), branch: c.branch, prefix: c.prefix, pollSeconds: c.pollSeconds,
  };
}

/* ---------------- running git ---------------- */

const authArgs = (token) => token
  ? ["-c", "http.extraheader=AUTHORIZATION: basic " + Buffer.from("x-access-token:" + token).toString("base64")]
  : [];
const IDENTITY = ["-c", "user.name=MU Console", "-c", "user.email=console@mastersunion.org"];

export function git(args, { cwd, token, timeout = 120e3 } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", [...IDENTITY, ...authArgs(token), ...args], {
      cwd, timeout, maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "" },
    }, (err, stdout, stderr) => {
      if (err) {
        const msg = String(stderr || err.message).replace(/AUTHORIZATION: basic \S+/g, "AUTHORIZATION: basic ***");
        const e = new Error(msg.trim() || "git failed");
        e.code = err.code;
        return reject(e);
      }
      resolve(String(stdout).trim());
    });
  });
}

let chain = Promise.resolve();
export const serial = (fn) => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
};

/* ---------------- the working clone ---------------- */

export async function ensureClone() {
  const c = cfg();
  if (!configured()) throw new Error("Sync is not configured. Set LOVABLE_REPO in .env.");
  if (!fs.existsSync(path.join(c.clone, ".git"))) {
    fs.mkdirSync(path.dirname(c.clone), { recursive: true });
    await git(["clone", "-q", "--branch", c.branch, "--single-branch", c.repo, c.clone], { token: c.token, timeout: 600e3 });
  }
  return c.clone;
}

/** Make the clone exactly origin/<branch>, discarding anything local. Returns the sha. */
export async function resetToRemote() {
  const c = cfg();
  const cwd = await ensureClone();
  await git(["merge", "--abort"], { cwd }).catch(() => {});
  await git(["fetch", "-q", "origin", c.branch], { cwd, token: c.token });
  await git(["checkout", "-q", "-B", c.branch, "FETCH_HEAD"], { cwd });
  await git(["reset", "-q", "--hard", "FETCH_HEAD"], { cwd });
  await git(["clean", "-fdq"], { cwd });
  return git(["rev-parse", "HEAD"], { cwd });
}

export const localHead = async () => git(["rev-parse", "HEAD"], { cwd: cfg().clone });

/** The branch head on the remote, without touching the clone. */
export async function remoteHead() {
  const c = cfg();
  const out = await git(["ls-remote", "--heads", c.repo, c.branch], { token: c.token, timeout: 30e3 });
  const sha = out.split(/\s+/)[0];
  if (!sha) throw new Error(`Branch "${c.branch}" not found on ${c.repo.replace(/\.git$/, "")}.`);
  return sha;
}

/**
 * Write `files`, commit as `author`, push. The caller has already called
 * resetToRemote(). Returns { sha: null } when nothing changed.
 */
export async function commitAndPush({ files, message, author }) {
  const c = cfg();
  const cwd = c.clone;
  const rels = [];
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(cwd, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
    rels.push(rel);
  }
  await git(["add", "--", ...rels], { cwd });
  const staged = await git(["diff", "--cached", "--name-only"], { cwd });
  if (!staged) return { sha: null, changed: [] };
  await git(["commit", "-q", "-m", message, "--author", `${author.name} <${author.email}>`], { cwd });
  const sha = await git(["rev-parse", "HEAD"], { cwd });
  await git(["push", "-q", "origin", `${c.branch}:${c.branch}`], { cwd, token: c.token });
  return { sha, changed: staged.split("\n") };
}

export async function verifyPushed(sha) {
  return (await remoteHead()) === sha;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: 4 passing.

- [ ] **Step 6: Stage**

```bash
git add sync/repo.js test/repo.test.mjs test/fixtures/
```

---

### Task 3: The scanner

**Files:**
- Create: `sync/scan.js` (ported from `git show 2WayHandshake:ingest.js`, scan half only)
- Test: `test/scan.test.mjs`

**Interfaces:**
- Produces: `scan(root, { homeSlug })` returning `{ title, pages: [{ slug, route, component, title, sections: [{ key, title, file, fields: [{ key, label, tag, type, value, file }] }] }] }`; `clean(s)`; `hashText(s)` (8 hex chars); `keyParts(key)` returning `{ scope, hash, file }` where `file` is `"src/" + scope`.
- Slugs are unprefixed here (`home`, `pricing`). Task 4 adds the prefix.

- [ ] **Step 1: Write the failing test**

Create `test/scan.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { scan, hashText, keyParts, clean } from "../sync/scan.js";
import { FIXTURE_APP } from "./helpers.mjs";

const byValue = (fields, v) => fields.find((f) => f.value === v);
const allFields = (page) => page.sections.flatMap((s) => s.fields);

test("routes, pages and shared components", () => {
  const out = scan(FIXTURE_APP, { homeSlug: "home" });
  assert.equal(out.title, "SecureFlow - Secure Data Orchestration");
  assert.deepEqual(out.pages.map((p) => [p.route, p.slug]), [["/", "home"], ["/pricing", "pricing"]]);
  const home = out.pages[0], pricing = out.pages[1];
  assert.deepEqual(home.sections.map((s) => s.file), ["src/pages/Index.tsx", "src/components/Navbar.tsx"]);
  assert.ok(pricing.sections.some((s) => s.file === "src/components/Navbar.tsx"), "navbar appears under pricing too");
});

test("every copy form on the home page becomes a field, once", () => {
  const home = scan(FIXTURE_APP, { homeSlug: "home" }).pages[0];
  const f = allFields(home);
  for (const v of ["Welcome to SecureFlow.", "Engineered for Precision.",
    "Empower your operations with an intelligent platform.", "Template copy without holes",
    "SecureFlow dashboard preview", "Request Demo", "01", "Automated Workflows",
    "State-of-the-art encryption keeps your data compliant."]) {
    assert.ok(byValue(f, v), "missing: " + v);
  }
  assert.equal(f.filter((x) => x.value === "Request Demo").length, 1, "same text twice in one file is one field");
  assert.equal(byValue(f, "Welcome to SecureFlow.").tag, "h1");
  assert.equal(byValue(f, "SecureFlow dashboard preview").tag, "alt");
  assert.equal(byValue(f, "Automated Workflows").tag, "title");
  assert.ok(!byValue(f, "#contact"), "hrefs are not copy in phase 1");
  assert.ok(!byValue(f, "/x.png"), "string src is not copy in phase 1");
});

test("keys are file plus hash and split back apart", () => {
  const home = scan(FIXTURE_APP, { homeSlug: "home" }).pages[0];
  const f = byValue(allFields(home), "Welcome to SecureFlow.");
  assert.equal(f.key, "pages/Index.tsx." + hashText("Welcome to SecureFlow."));
  assert.match(f.key, /^pages\/Index\.tsx\.[0-9a-f]{8}$/);
  assert.deepEqual(keyParts(f.key), { scope: "pages/Index.tsx", hash: hashText("Welcome to SecureFlow."), file: "src/pages/Index.tsx" });
  assert.equal(hashText("  Welcome   to\n SecureFlow. "), hashText("Welcome to SecureFlow."), "whitespace never changes a key");
  assert.equal(clean(" a \n b "), "a b");
});

test("split headline pieces are separate fields", () => {
  const pricing = scan(FIXTURE_APP, { homeSlug: "home" }).pages[1];
  const f = allFields(pricing);
  for (const v of ["Pricing that", "scales", "with your", "ambition"]) assert.ok(byValue(f, v), v);
  assert.equal(byValue(f, "scales").tag, "em");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '../sync/scan.js'`.

- [ ] **Step 3: Implement `sync/scan.js`**

```js
/**
 * Copy out of a Vite plus React Router app, straight from the TypeScript AST.
 *
 *   - JSX text            <h2>Build Wealth</h2>            -> text, tag h2
 *   - {"literal"} / {`t`} inside an element               -> text
 *   - data objects        { title: "Mumbai" }             -> text, one per prop
 *   - a few attributes    alt, title, placeholder, label  -> text
 *
 * Keys are `<file under src>.<hash of the text>`, never positional, so a
 * rescan after Lovable edits keeps every field whose text survived.
 * Pure: reads files, touches no database.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "@babel/parser";

const read = (f) => fs.readFileSync(f, "utf8");
const exists = (f) => fs.existsSync(f);
const EXT = [".tsx", ".ts", ".jsx", ".js"];

export const clean = (s) => String(s).replace(/\s+/g, " ").trim();
export const hashText = (s) => crypto.createHash("sha1").update(clean(s)).digest("hex").slice(0, 8);
export function keyParts(key) {
  const i = key.lastIndexOf(".");
  const scope = key.slice(0, i);
  return { scope, hash: key.slice(i + 1), file: "src/" + scope };
}

export const PARSE_OPTS = { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true, attachComment: false };
export const ast = (file) => parse(read(file), PARSE_OPTS);

function resolveImport(fromFile, spec, root) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const e of ["", ...EXT, ...EXT.map((x) => "/index" + x)]) {
    if (exists(base + e) && fs.statSync(base + e).isFile()) return base + e;
  }
  return null;
}

/** Depth-first over every node, with the JSX element stack for context. */
export function walk(node, fn, stack = [], parent = null) {
  if (!node || typeof node.type !== "string") return;
  fn(node, stack, parent);
  const isEl = node.type === "JSXElement";
  if (isEl) stack.push(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end" || k === "extra" || k === "range") continue;
    const v = node[k];
    if (Array.isArray(v)) for (const x of v) walk(x, fn, stack, node);
    else if (v && typeof v.type === "string") walk(v, fn, stack, node);
  }
  if (isEl) stack.pop();
}

export const elName = (el) => {
  const n = el?.openingElement?.name;
  if (!n) return "";
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXMemberExpression") return n.property.name;
  return "";
};

function importsOf(tree, file, root) {
  const out = new Map();
  for (const n of tree.program.body) {
    if (n.type !== "ImportDeclaration") continue;
    const resolved = resolveImport(file, n.source.value, root);
    for (const s of n.specifiers) out.set(s.local.name, { source: n.source.value, file: resolved });
  }
  return out;
}

/** Routes in a React Router app: [{ path, component, file }]. */
function routesOf(root) {
  const appFile = ["src/App.tsx", "src/App.jsx", "src/main.tsx"].map((f) => path.join(root, f)).find(exists);
  if (!appFile) return [];
  const tree = ast(appFile);
  const imports = importsOf(tree, appFile, root);
  const routes = [];
  walk(tree, (n) => {
    if (n.type !== "JSXElement" || elName(n) !== "Route") return;
    let p = null, comp = null;
    for (const a of n.openingElement.attributes) {
      if (a.type !== "JSXAttribute") continue;
      if (a.name.name === "path" && a.value?.type === "StringLiteral") p = a.value.value;
      if (a.name.name === "element" && a.value?.type === "JSXExpressionContainer" && a.value.expression.type === "JSXElement") {
        comp = elName(a.value.expression);
      }
    }
    if (p && comp && p !== "*" && imports.get(comp)?.file) routes.push({ path: p, component: comp, file: imports.get(comp).file });
  });
  return routes;
}

/* ---------------- what counts as copy ---------------- */

const SKIP_PROPS = new Set(["className", "class", "id", "key", "icon", "variant", "size", "type", "color", "bg",
  "gradient", "delay", "animation", "style", "target", "rel", "name", "htmlFor", "for", "to", "as", "ref", "src", "value",
  "width", "height", "loading", "decoding", "fill", "stroke", "viewBox", "d", "xmlns", "role", "tabIndex"]);
const TEXT_ATTRS = new Set(["alt", "title", "placeholder", "aria-label", "label", "subtitle", "description", "heading",
  "text", "cta", "caption", "eyebrow", "badge", "buttonText", "tagline"]);
const SKIP_DATA = new Set(["className", "class", "id", "key", "icon", "variant", "size", "type", "color", "bg", "gradient",
  "delay", "animation", "style", "src", "image", "video", "poster", "href", "url", "link"]);

const isClassList = (s) => {
  const t = s.split(" ");
  return t.length > 1 && t.every((x) => /^[!a-z0-9\-\[\]\/:.%()#,_]+$/.test(x)) && t.filter((x) => /[-:]/.test(x)).length >= t.length / 2;
};
export const looksLikeCopy = (s) => /[A-Za-z0-9ऀ-ॿ₹]/.test(s) && !/^[\w-]+:[\w-]+$/.test(s) && !/^(#|\/|https?:)/.test(s) && !isClassList(s);
const humanize = (s) => s.replace(/\.[^.]+$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Every field in one component file, in source order. */
function fieldsOf(file, root) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const scope = rel.replace(/^src\//, "");
  const tree = ast(file);
  const out = [], seen = new Set();
  const push = (value, { tag, label }) => {
    if (!looksLikeCopy(value)) return;
    const key = scope + "." + hashText(value);
    if (seen.has(key)) return;                                 // same text twice = one field
    seen.add(key);
    out.push({ key, label: label || (value.length > 60 ? value.slice(0, 57) + "…" : value), tag, type: "text", value, file: rel });
  };

  walk(tree, (n, stack) => {
    const parent = stack[stack.length - 1];
    if (n.type === "JSXText") {
      const v = clean(n.value);
      if (v) push(v, { tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXExpressionContainer" && (n.expression.type === "StringLiteral" || n.expression.type === "TemplateLiteral")) {
      const ex = n.expression;
      const v = ex.type === "StringLiteral" ? clean(ex.value) : ex.expressions.length ? "" : clean(ex.quasis.map((q) => q.value.cooked).join(""));
      if (v && stack.length && parent && n !== parent.openingElement) push(v, { tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXAttribute" && n.value?.type === "StringLiteral") {
      const el = stack[stack.length - 1];
      const name = n.name.name, tag = elName(el);
      const custom = /^[A-Z]/.test(tag);
      const v = clean(n.value.value);
      if (!v) return;
      if (TEXT_ATTRS.has(name) || (custom && !SKIP_PROPS.has(name) && v.length > 2)) push(v, { tag: name, label: v });
    } else if (n.type === "ObjectProperty" && !stack.length && n.value.type === "StringLiteral") {
      /* data objects at module level (or inside module-level arrays) */
      const k = n.key.type === "Identifier" ? n.key.name : n.key.type === "StringLiteral" ? n.key.value : null;
      if (!k || SKIP_DATA.has(k)) return;
      const v = clean(n.value.value);
      if (v) push(v, { tag: k, label: humanize(k) + ": " + (v.length > 40 ? v.slice(0, 37) + "…" : v) });
    }
  });
  return out;
}

/** Component files a route uses, in the order they first appear. */
function componentTree(entry, root) {
  const order = [], seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (/^src\/components\/ui\//.test(rel) || /\.d\.ts$/.test(rel)) return;     // shadcn primitives: not copy
    order.push(file);
    let tree;
    try { tree = ast(file); } catch { return; }
    const imports = importsOf(tree, file, root);
    const used = [];
    walk(tree, (n) => { if (n.type === "JSXElement") { const nm = elName(n); if (imports.get(nm)?.file && !used.includes(nm)) used.push(nm); } });
    for (const nm of used) visit(imports.get(nm).file);
    for (const [nm, im] of imports) if (im.file && !used.includes(nm) && /\.(tsx|jsx)$/.test(im.file)) visit(im.file);
  };
  visit(entry);
  return order;
}

const slugFor = (routePath, home) => routePath === "/" ? home : routePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export function scan(root, { homeSlug = "home" } = {}) {
  const routes = routesOf(root);
  if (!routes.length) throw new Error("No <Route path=… element=…> found in src/App.tsx. Is this a React Router app?");
  let title = null;
  try { title = (read(path.join(root, "index.html")).match(/<title>([^<]*)<\/title>/) || [])[1]?.trim() || null; } catch { /* none */ }
  const siteName = title ? title.split(/\s+[-|–—]\s+/)[0].trim() : null;
  const pages = [];
  for (const r of routes) {
    const sections = [];
    for (const f of componentTree(r.file, root)) {
      const fields = fieldsOf(f, root);
      if (!fields.length) continue;
      const rel = path.relative(root, f).split(path.sep).join("/");
      sections.push({ key: rel.replace(/^src\//, "").replace(/\.[^.]+$/, ""), title: humanize(path.basename(rel)), file: rel, fields });
    }
    pages.push({ slug: slugFor(r.path, homeSlug), route: r.path, component: r.component,
      title: r.path === "/" ? (siteName || "Home") : humanize(r.component), sections });
  }
  return { title, pages };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: 8 passing.

- [ ] **Step 5: Dry-run the real repo, read only**

Run:

```bash
node -e '
import("./sync/scan.js").then(({ scan }) => {
  const out = scan(process.argv[1], { homeSlug: "home" });
  for (const p of out.pages) console.log(p.route, p.slug, p.sections.reduce((n, s) => n + s.fields.length, 0), "fields");
});' /private/tmp/claude-501/-Users-vinaynain-Downloads-mu-content-cms/9f453e80-adc7-4e32-a6b0-9c33cf1f82c4/scratchpad/dwp
```

Expected: `/ home 38 fields` and `/pricing pricing 40 fields` (78 total, matching the earlier dry run). If the scratchpad clone is gone, clone it again: `git clone -q https://github.com/vinaynain26/dark-welcome-page.git <that path>`.

- [ ] **Step 6: Stage**

```bash
git add sync/scan.js test/scan.test.mjs
```

---

### Task 4: Apply a scan to the database, with conflicts

**Files:**
- Create: `sync/apply.js`
- Test: `test/apply.test.mjs`

**Interfaces:**
- Consumes: `scan()` output from Task 3; `addConflict` from Task 1.
- Produces: `applyScan(db, scanResult, { repo, branch, sha, prefix, actor })` returning `[{ slug, route, title, added, kept, retired, conflicts }]`. Page slugs in the DB are `<prefix>-<scan slug>`, so `lab-home` and `lab-pricing`. Pages get `template '__external'`, `layout 'main'`, `source 'github'`.

- [ ] **Step 1: Write the failing test**

Create `test/apply.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeDb, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import { scan, hashText } from "../sync/scan.js";
import { applyScan } from "../sync/apply.js";
import { openConflicts } from "../sync/store.js";

const OPTS = { repo: "o/r", branch: "main", sha: "aaaa111", prefix: "lab" };
const copyFixture = () => { const d = tmpDir("sync-app"); fs.cpSync(FIXTURE_APP, d, { recursive: true }); return d; };
const edit = (dir, rel, from, to) => { const f = path.join(dir, rel); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(from, to)); };
const row = (db, slug, key) => db.prepare("SELECT * FROM page_content WHERE page_slug = ? AND field_key = ?").get(slug, key);
const K = (scope, text) => scope + "." + hashText(text);

test("first apply creates prefixed pages and fields", () => {
  const db = makeDb();
  const report = applyScan(db, scan(FIXTURE_APP), OPTS);
  assert.deepEqual(report.map((r) => r.slug), ["lab-home", "lab-pricing"]);
  assert.equal(report[0].added > 10, true);
  const page = db.prepare("SELECT * FROM pages WHERE slug = 'lab-home'").get();
  assert.equal(page.template, "__external"); assert.equal(page.source, "github");
  assert.equal(page.repo, "o/r"); assert.equal(page.branch, "main"); assert.equal(page.ingested_sha, "aaaa111");
  const r = row(db, "lab-home", K("pages/Index.tsx", "Welcome to SecureFlow."));
  assert.equal(r.value, "Welcome to SecureFlow."); assert.equal(r.draft_value, r.value);
  assert.equal(r.updated_by, "lovable"); assert.equal(r.retired, 0);
  assert.ok(row(db, "lab-pricing", K("components/Navbar.tsx", "Request Demo")), "shared component under the second page too");
});

test("second apply keeps values and drafts", () => {
  const db = makeDb();
  applyScan(db, scan(FIXTURE_APP), OPTS);
  const key = K("pages/Index.tsx", "Welcome to SecureFlow.");
  db.prepare("UPDATE page_content SET draft_value = 'My draft' WHERE page_slug = 'lab-home' AND field_key = ?").run(key);
  const report = applyScan(db, scan(FIXTURE_APP), { ...OPTS, sha: "bbbb222" });
  assert.equal(report[0].added, 0); assert.equal(report[0].retired, 0); assert.equal(report[0].conflicts, 0);
  assert.equal(row(db, "lab-home", key).draft_value, "My draft");
  assert.equal(db.prepare("SELECT ingested_sha FROM pages WHERE slug = 'lab-home'").get().ingested_sha, "bbbb222");
});

test("designer changes text with no draft: retire old, add new, no conflict", () => {
  const db = makeDb();
  applyScan(db, scan(FIXTURE_APP), OPTS);
  const dir = copyFixture();
  edit(dir, "src/pages/Index.tsx", "Welcome to SecureFlow.", "Hello SecureFlow.");
  const report = applyScan(db, scan(dir), OPTS);
  assert.equal(report[0].retired, 1); assert.equal(report[0].added, 1); assert.equal(report[0].conflicts, 0);
  assert.equal(row(db, "lab-home", K("pages/Index.tsx", "Welcome to SecureFlow.")).retired, 1);
  assert.equal(row(db, "lab-home", K("pages/Index.tsx", "Hello SecureFlow.")).value, "Hello SecureFlow.");
});

test("designer changes text under a draft: conflict with theirs matched by position", () => {
  const db = makeDb();
  applyScan(db, scan(FIXTURE_APP), OPTS);
  const oldKey = K("pages/Index.tsx", "Welcome to SecureFlow.");
  db.prepare("UPDATE page_content SET draft_value = 'My draft' WHERE page_slug = 'lab-home' AND field_key = ?").run(oldKey);
  const dir = copyFixture();
  edit(dir, "src/pages/Index.tsx", "Welcome to SecureFlow.", "Hello SecureFlow.");
  const report = applyScan(db, scan(dir), OPTS);
  assert.equal(report[0].conflicts, 1);
  const [c] = openConflicts(db);
  assert.equal(c.page_slug, "lab-home"); assert.equal(c.file, "src/pages/Index.tsx");
  assert.equal(c.old_key, oldKey); assert.equal(c.new_key, K("pages/Index.tsx", "Hello SecureFlow."));
  assert.equal(c.original, "Welcome to SecureFlow."); assert.equal(c.theirs, "Hello SecureFlow."); assert.equal(c.mine, "My draft");
  assert.equal(row(db, "lab-home", oldKey).retired, 1);
});

test("designer deletes text under a draft: conflict with theirs null", () => {
  const db = makeDb();
  applyScan(db, scan(FIXTURE_APP), OPTS);
  const key = K("pages/Index.tsx", "Template copy without holes");
  db.prepare("UPDATE page_content SET draft_value = 'Mine' WHERE page_slug = 'lab-home' AND field_key = ?").run(key);
  const dir = copyFixture();
  edit(dir, "src/pages/Index.tsx", "<p>{`Template copy without holes`}</p>", "");
  applyScan(db, scan(dir), OPTS);
  const [c] = openConflicts(db);
  assert.equal(c.old_key, key); assert.equal(c.new_key, null); assert.equal(c.theirs, null); assert.equal(c.mine, "Mine");
});

test("text that comes back revives the retired row with its old value", () => {
  const db = makeDb();
  applyScan(db, scan(FIXTURE_APP), OPTS);
  const key = K("pages/Index.tsx", "Welcome to SecureFlow.");
  db.prepare("UPDATE page_content SET value = 'Edited', draft_value = 'Edited' WHERE page_slug = 'lab-home' AND field_key = ?").run(key);
  const dir = copyFixture();
  edit(dir, "src/pages/Index.tsx", "Welcome to SecureFlow.", "Gone");
  applyScan(db, scan(dir), OPTS);
  assert.equal(row(db, "lab-home", key).retired, 1);
  applyScan(db, scan(FIXTURE_APP), OPTS);
  assert.equal(row(db, "lab-home", key).retired, 0);
  assert.equal(row(db, "lab-home", key).value, "Edited");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '../sync/apply.js'`.

- [ ] **Step 3: Implement `sync/apply.js`**

```js
/**
 * A scan becomes rows. Rows whose key survived keep their value and draft.
 * New keys are inserted with the source text as both. Keys that vanished are
 * retired, and when a retired key carried an unpublished draft that is a
 * conflict: the designer changed text the editor was still working on.
 */
import { addConflict } from "./store.js";

export function applyScan(db, scanResult, { repo, branch, sha, prefix = "lab", actor = "lovable" }) {
  const now = new Date().toISOString();
  const upPage = db.prepare(`INSERT INTO pages (slug, title, template, layout, source, repo, branch, ingested_sha)
    VALUES (?, ?, '__external', 'main', 'github', ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET title = excluded.title, repo = excluded.repo, branch = excluded.branch,
      ingested_sha = excluded.ingested_sha, source = 'github', template = '__external'`);
  const ins = db.prepare(`INSERT INTO page_content
    (page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title, label, tag, type, multiline, ord,
     value, draft_value, updated_at, updated_by, retired)
    VALUES (?,?,?,?,?,'_all','Whole page',?,?,?,?,?,?,?,?,?,0)
    ON CONFLICT(page_slug, field_key) DO UPDATE SET
      section_key = excluded.section_key, section_title = excluded.section_title, section_ord = excluded.section_ord,
      label = excluded.label, tag = excluded.tag, type = excluded.type, multiline = excluded.multiline, ord = excluded.ord, retired = 0`);
  const live = db.prepare(`SELECT field_key, section_key, tag, ord, label, value, draft_value
    FROM page_content WHERE page_slug = ? AND retired = 0`);
  const exists = db.prepare("SELECT retired FROM page_content WHERE page_slug = ? AND field_key = ?");
  const retire = db.prepare("UPDATE page_content SET retired = 1 WHERE page_slug = ? AND field_key = ?");

  const report = [];
  db.exec("BEGIN");
  try {
    for (const p of scanResult.pages) {
      const slug = `${prefix}-${p.slug}`;
      upPage.run(slug, p.title, repo, branch, sha);
      const before = new Map(live.all(slug).map((r) => [r.field_key, r]));
      const found = new Set();
      const fresh = [];                              // fields not in the DB before this apply
      let added = 0, kept = 0, sOrd = 0;
      for (const s of p.sections) {
        sOrd++;
        let ord = 0;
        for (const f of s.fields) {
          ord++;
          found.add(f.key);
          const was = exists.get(slug, f.key);
          ins.run(slug, f.key, s.key, s.title, sOrd, f.label, f.tag, f.type, f.value.length > 80 ? 1 : 0, ord, f.value, f.value, now, actor);
          if (was) kept++; else { added++; fresh.push({ ...f, section_key: s.key, ord }); }
        }
      }
      let retired = 0, conflicts = 0;
      for (const [key, r] of before) {
        if (found.has(key)) continue;
        if (r.draft_value !== r.value) {
          /* the replacement, if any: a brand-new field in the same file, same
             tag, same position; else the first new field in that file with the
             same tag; else nothing (the designer deleted it) */
          const same = fresh.filter((f) => f.section_key === r.section_key && f.tag === r.tag);
          const theirs = same.find((f) => f.ord === r.ord) || same[0] || null;
          addConflict(db, { page_slug: slug, file: "src/" + key.slice(0, key.lastIndexOf(".")), old_key: key,
            new_key: theirs ? theirs.key : null, label: r.label, original: r.value, theirs: theirs ? theirs.value : null, mine: r.draft_value });
          conflicts++;
        }
        retire.run(slug, key);
        retired++;
      }
      report.push({ slug, route: p.route, title: p.title, added, kept, retired, conflicts });
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return report;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: 14 passing.

- [ ] **Step 5: Stage**

```bash
git add sync/apply.js test/apply.test.mjs
```

---

### Task 5: Write-back, find by hash and splice at offsets

**Files:**
- Modify: `sync/scan.js` (extract `collectCopy`, rewrite `fieldsOf` to use it)
- Create: `sync/writeback.js`
- Test: `test/writeback.test.mjs`

**Interfaces:**
- Consumes: `PARSE_OPTS`, `walk`, `elName`, `clean`, `hashText`, `looksLikeCopy` from Task 3.
- Produces in `scan.js`: `collectCopy(tree)` returning every copy occurrence `{ node, kind, value, tag, label }` with `kind` in `jsxtext | string | template`. Produces in `writeback.js`: `locate(source, hashes: Set<string>)` returning `[{ hash, kind, start, end, raw }]`, and `splice(source, hits, textByHash: Map<string,string>)` returning the new source. Both pure.

Why the scanner is refactored here: write-back must replace exactly the strings the scanner counts as fields, nothing else. One collector serves both, so they cannot drift apart.

- [ ] **Step 1: Write the failing test**

Create `test/writeback.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FIXTURE_APP } from "./helpers.mjs";
import { hashText } from "../sync/scan.js";
import { locate, splice } from "../sync/writeback.js";

const INDEX = fs.readFileSync(path.join(FIXTURE_APP, "src/pages/Index.tsx"), "utf8");
const PRICING = fs.readFileSync(path.join(FIXTURE_APP, "src/pages/Pricing.tsx"), "utf8");

/* one field: old text -> new text, returning the new source */
function rewrite(src, from, to) {
  const h = hashText(from);
  const hits = locate(src, new Set([h]));
  assert.ok(hits.length, "no hit for " + from);
  return { out: splice(src, hits, new Map([[h, to]])), hits };
}

test("JSX text keeps its surrounding whitespace, so the diff is one line", () => {
  const { out } = rewrite(INDEX, "Welcome to SecureFlow.", "Hello SecureFlow.");
  assert.equal(out, INDEX.replace("Welcome to SecureFlow.", "Hello SecureFlow."));
});

test("a string attribute keeps its quotes and escapes the new text", () => {
  const { out } = rewrite(INDEX, "SecureFlow dashboard preview", 'A "quoted" alt');
  assert.ok(out.includes('alt="A \\"quoted\\" alt"'), out);
});

test("a data object property is replaced in place", () => {
  const { out } = rewrite(INDEX, "Automated Workflows", "Automated Flows");
  assert.equal(out, INDEX.replace('title: "Automated Workflows"', 'title: "Automated Flows"'));
});

test("a template literal keeps its backticks and escapes ticks and ${", () => {
  const { out } = rewrite(INDEX, "Template copy without holes", "Now with `ticks` and ${x}");
  assert.ok(out.includes("{`Now with \\`ticks\\` and \\${x}`}"), out);
});

test("the same text twice in a file is replaced everywhere", () => {
  const { out, hits } = rewrite(INDEX, "Request Demo", "Book a demo");
  assert.equal(hits.length, 2);
  assert.equal((out.match(/Book a demo/g) || []).length, 2);
  assert.ok(!out.includes("Request Demo"));
});

test("an em-split headline piece is replaced on its own", () => {
  const { out } = rewrite(PRICING, "scales", "grows");
  assert.equal(out, PRICING.replace('<em className="text-primary">scales</em>', '<em className="text-primary">grows</em>'));
});

test("JSX-unsafe characters are escaped and round-trip to the same hash", () => {
  const to = "Use {braces} & <tags>";
  const { out } = rewrite(INDEX, "Welcome to SecureFlow.", to);
  assert.ok(out.includes("Use &#123;braces&#125; & &lt;tags&gt;"), out);
  assert.equal(locate(out, new Set([hashText(to)])).length, 1, "the scanner reads the escaped text back as the same field");
});

test("a hash that is not in the file produces no hit", () => {
  assert.equal(locate(INDEX, new Set([hashText("Not in this file")])).length, 0);
});

test("a href is never a hit even when its hash is asked for", () => {
  assert.equal(locate(INDEX, new Set([hashText("#contact")])).length, 0);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '../sync/writeback.js'`.

- [ ] **Step 3: Refactor `sync/scan.js`**

Replace the whole `fieldsOf` function in `sync/scan.js` with these two functions (keep everything else as it is):

```js
/**
 * Every copy occurrence in a parsed file, in source order, duplicates
 * included. The scanner dedupes these into fields; write-back uses the node
 * positions. One collector, so the two can never disagree about what is copy.
 */
export function collectCopy(tree) {
  const out = [];
  walk(tree, (n, stack) => {
    const parent = stack[stack.length - 1];
    if (n.type === "JSXText") {
      const v = clean(n.value);
      if (v) out.push({ node: n, kind: "jsxtext", value: v, tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXExpressionContainer" && (n.expression.type === "StringLiteral" || n.expression.type === "TemplateLiteral")) {
      const ex = n.expression;
      const v = ex.type === "StringLiteral" ? clean(ex.value) : ex.expressions.length ? "" : clean(ex.quasis.map((q) => q.value.cooked).join(""));
      if (v && stack.length && parent && n !== parent.openingElement) {
        out.push({ node: ex, kind: ex.type === "StringLiteral" ? "string" : "template", value: v, tag: (elName(parent) || "text").toLowerCase() });
      }
    } else if (n.type === "JSXAttribute" && n.value?.type === "StringLiteral") {
      const tag = elName(stack[stack.length - 1]);
      const name = n.name.name, custom = /^[A-Z]/.test(tag);
      const v = clean(n.value.value);
      if (v && (TEXT_ATTRS.has(name) || (custom && !SKIP_PROPS.has(name) && v.length > 2))) {
        out.push({ node: n.value, kind: "string", value: v, tag: name, label: v });
      }
    } else if (n.type === "ObjectProperty" && !stack.length && n.value.type === "StringLiteral") {
      const k = n.key.type === "Identifier" ? n.key.name : n.key.type === "StringLiteral" ? n.key.value : null;
      if (!k || SKIP_DATA.has(k)) return;
      const v = clean(n.value.value);
      if (v) out.push({ node: n.value, kind: "string", value: v, tag: k, label: humanize(k) + ": " + (v.length > 40 ? v.slice(0, 37) + "…" : v) });
    }
  });
  return out;
}

/** Every field in one component file, in source order. */
function fieldsOf(file, root) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const scope = rel.replace(/^src\//, "");
  const out = [], seen = new Set();
  for (const o of collectCopy(ast(file))) {
    if (!looksLikeCopy(o.value)) continue;
    const key = scope + "." + hashText(o.value);
    if (seen.has(key)) continue;                               // same text twice = one field
    seen.add(key);
    out.push({ key, label: o.label || (o.value.length > 60 ? o.value.slice(0, 57) + "…" : o.value), tag: o.tag, type: "text", value: o.value, file: rel });
  }
  return out;
}
```

- [ ] **Step 4: Run the scanner tests to prove the refactor changed nothing**

Run: `node --test test/scan.test.mjs`
Expected: 4 passing.

- [ ] **Step 5: Implement `sync/writeback.js`**

```js
/**
 * Put an editor's text back into the file it came from.
 *
 * The file is never reprinted from the AST. The parser only tells us where
 * each string starts and ends; the new text is spliced into the original
 * source at those offsets, from the end backwards. Formatting, comments and
 * everything else survive, so the designer sees a one-line diff in Lovable.
 */
import { parse } from "@babel/parser";
import { PARSE_OPTS, collectCopy, looksLikeCopy, hashText } from "./scan.js";

/** Every occurrence in `source` whose text hashes to one of `hashes`. */
export function locate(source, hashes) {
  const tree = parse(source, PARSE_OPTS);
  const hits = [];
  for (const o of collectCopy(tree)) {
    if (!looksLikeCopy(o.value)) continue;
    const hash = hashText(o.value);
    if (!hashes.has(hash)) continue;
    hits.push({ hash, kind: o.kind, start: o.node.start, end: o.node.end, raw: source.slice(o.node.start, o.node.end) });
  }
  return hits;
}

/* `{` `}` `<` `>` end a JSX text node; `&x;` would be read as an entity. Babel
   decodes these back to the plain characters, so the next scan hashes the
   same text the editor typed. */
const escapeJsxText = (t) => t
  .replace(/&(?=(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;")
  .replace(/[{}<>]/g, (c) => ({ "{": "&#123;", "}": "&#125;", "<": "&lt;", ">": "&gt;" }[c]));

function render(hit, text) {
  if (hit.kind === "jsxtext") {
    const lead = hit.raw.match(/^\s*/)[0], trail = hit.raw.match(/\s*$/)[0];
    return lead + escapeJsxText(text) + trail;
  }
  if (hit.kind === "template") {
    return "`" + text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
  }
  const q = hit.raw[0] === "'" ? "'" : '"';
  const body = text.replace(/\\/g, "\\\\").split(q).join("\\" + q).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return q + body + q;
}

/** New source with each hit replaced by the text for its hash. */
export function splice(source, hits, textByHash) {
  let out = source;
  for (const h of [...hits].sort((a, b) => b.start - a.start)) {
    const text = textByHash.get(h.hash);
    if (text === undefined) continue;
    out = out.slice(0, h.start) + render(h, text) + out.slice(h.end);
  }
  return out;
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: 23 passing.

- [ ] **Step 7: Stage**

```bash
git add sync/scan.js sync/writeback.js test/writeback.test.mjs
```

---

### Task 6: Push a page: write back, commit, push, verify, re-key

**Files:**
- Create: `sync/push.js`
- Test: `test/push.test.mjs`

**Interfaces:**
- Consumes: `repo.*` (Task 2), `keyParts`, `hashText`, `clean` (Task 3), `locate`, `splice` (Task 5), `logEvent`, `setState` (Task 1), `applyScan` (Task 4, in the test only).
- Produces: `pushPage(db, slug, { user: { id, name, email } })` returning `{ pushed, sha, files }`; throws `SourceMovedError` (with `.missing: [{ file, label }]`) when a field's text is no longer in the source.

- [ ] **Step 1: Write the failing test**

Create `test/push.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeDb, makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import * as repo from "../sync/repo.js";
import { scan, hashText } from "../sync/scan.js";
import { applyScan } from "../sync/apply.js";
import { pushPage, SourceMovedError } from "../sync/push.js";
import { recentLog, getState } from "../sync/store.js";

const USER = { id: 1, name: "Vinay", email: "vinay@example.com" };
const K = (scope, text) => scope + "." + hashText(text);
const row = (db, slug, key) => db.prepare("SELECT * FROM page_content WHERE page_slug = ? AND field_key = ?").get(slug, key);

async function setup() {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const sha = await repo.resetToRemote();
  const db = makeDb();
  applyScan(db, scan(repo.cfg().clone), { repo: "local", branch: "main", sha, prefix: "lab" });
  return { remote, db, sha };
}
const draft = (db, slug, key, text) =>
  db.prepare("UPDATE page_content SET draft_value = ? WHERE page_slug = ? AND field_key = ?").run(text, slug, key);

test("publish writes the text into the file, pushes, and re-keys the row", async () => {
  const { remote, db, sha } = await setup();
  const oldKey = K("pages/Index.tsx", "Welcome to SecureFlow.");
  draft(db, "lab-home", oldKey, "Hello SecureFlow.");
  const out = await pushPage(db, "lab-home", { user: USER });
  assert.equal(out.pushed, 1);
  assert.notEqual(out.sha, sha);
  assert.deepEqual(out.files, ["src/pages/Index.tsx"]);
  assert.equal(await repo.remoteHead(), out.sha, "the commit is on the remote");

  remote.git(["pull", "-q", "origin", "main"]);
  const file = fs.readFileSync(path.join(remote.work, "src/pages/Index.tsx"), "utf8");
  assert.ok(file.includes("Hello SecureFlow."), "new text is in the source");
  assert.ok(!file.includes("Welcome to SecureFlow."), "old text is gone");
  assert.match(remote.git(["log", "-1", "--format=%an|%s"]), /^Vinay\|content\(lab-home\): 1 change via MU Console/);

  const newKey = K("pages/Index.tsx", "Hello SecureFlow.");
  assert.equal(row(db, "lab-home", oldKey), undefined, "old key renamed away");
  const r = row(db, "lab-home", newKey);
  assert.equal(r.value, "Hello SecureFlow."); assert.equal(r.draft_value, "Hello SecureFlow."); assert.equal(r.updated_by, "Vinay");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM revisions WHERE page_slug = 'lab-home' AND field_key = ?").get(newKey).n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM publishes WHERE page_slug = 'lab-home'").get().n, 1);
  assert.equal(db.prepare("SELECT ingested_sha FROM pages WHERE slug = 'lab-home'").get().ingested_sha, out.sha);
  assert.equal(recentLog(db, 1)[0].direction, "push");
  assert.equal(getState(db).last_push_sha, out.sha);

  /* the pull that follows our own push changes nothing */
  const head = await repo.resetToRemote();
  const report = applyScan(db, scan(repo.cfg().clone), { repo: "local", branch: "main", sha: head, prefix: "lab" });
  assert.equal(report[0].added, 0); assert.equal(report[0].retired, 0); assert.equal(report[0].conflicts, 0);
});

test("two drafts in two files go in one commit", async () => {
  const { db } = await setup();
  draft(db, "lab-home", K("pages/Index.tsx", "Automated Workflows"), "Automated Flows");
  draft(db, "lab-home", K("components/Navbar.tsx", "Pricing"), "Plans");
  const out = await pushPage(db, "lab-home", { user: USER });
  assert.equal(out.pushed, 2);
  assert.deepEqual(out.files.sort(), ["src/components/Navbar.tsx", "src/pages/Index.tsx"]);
});

test("nothing to publish is a no-op", async () => {
  const { db, sha } = await setup();
  const out = await pushPage(db, "lab-home", { user: USER });
  assert.deepEqual(out, { pushed: 0, sha: null, files: [] });
  assert.equal(await repo.remoteHead(), sha);
});

test("text the designer already changed refuses to push and leaves the DB alone", async () => {
  const { remote, db } = await setup();
  const key = K("pages/Index.tsx", "Welcome to SecureFlow.");
  draft(db, "lab-home", key, "Mine");
  const f = path.join(remote.work, "src/pages/Index.tsx");
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("Welcome to SecureFlow.", "Theirs"));
  remote.git(["commit", "-qam", "Lovable edit"]); remote.git(["push", "-q", "origin", "main"]);
  await assert.rejects(() => pushPage(db, "lab-home", { user: USER }), (e) => e instanceof SourceMovedError && e.missing[0].file === "src/pages/Index.tsx");
  assert.equal(row(db, "lab-home", key).draft_value, "Mine", "draft kept");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM publishes").get().n, 0);
});

test("a draft equal to text already in another field of the same file folds into it", async () => {
  const { db } = await setup();
  const a = K("pages/Index.tsx", "Automated Workflows"), b = K("pages/Index.tsx", "Robust Security");
  draft(db, "lab-home", a, "Robust Security");
  await pushPage(db, "lab-home", { user: USER });
  assert.equal(row(db, "lab-home", a).retired, 1);
  assert.equal(row(db, "lab-home", b).retired, 0);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '../sync/push.js'`.

- [ ] **Step 3: Implement `sync/push.js`**

```js
/**
 * Publish, for a page that came from the repo: the page's drafts are written
 * into the source files, committed as the editor, pushed to the branch
 * Lovable syncs, and only then re-keyed in the database. If anything fails
 * before the push is verified, the database does not change.
 */
import fs from "node:fs";
import path from "node:path";
import * as repo from "./repo.js";
import { keyParts, hashText, clean } from "./scan.js";
import { locate, splice } from "./writeback.js";
import { logEvent, setState } from "./store.js";

export class SourceMovedError extends Error {
  constructor(missing) {
    super("The page changed in Lovable since the last sync: " + missing.map((m) => `"${m.label}" in ${m.file}`).join(", ") + ". Sync, then review the conflicts.");
    this.missing = missing;
  }
}

const short = (s, n = 80) => { s = clean(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

export async function pushPage(db, slug, { user }) {
  const page = db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug);
  if (!page?.repo) throw new Error("This page did not come from the repo, so there is nothing to push.");
  if (!repo.canPush()) throw new Error("Sync cannot push: set LOVABLE_TOKEN in .env.");
  const pending = db.prepare(`SELECT field_key, label, value, draft_value FROM page_content
    WHERE page_slug = ? AND value <> draft_value AND retired = 0 ORDER BY section_ord, ord`).all(slug);
  if (!pending.length) return { pushed: 0, sha: null, files: [] };

  /* per file: which hashes to find, and the text each becomes */
  const byFile = new Map();
  for (const p of pending) {
    const { file, hash } = keyParts(p.field_key);
    if (!byFile.has(file)) byFile.set(file, { hashes: new Set(), text: new Map(), labels: new Map() });
    const f = byFile.get(file);
    f.hashes.add(hash); f.text.set(hash, clean(p.draft_value)); f.labels.set(hash, p.label);
  }
  const message = `content(${slug}): ${pending.length} change${pending.length === 1 ? "" : "s"} via MU Console\n\n` +
    pending.map((p) => `${short(p.label, 40)}: ${short(p.value)} -> ${short(p.draft_value)}`).join("\n");

  const attempt = () => repo.serial(async () => {
    await repo.resetToRemote();
    const files = {}, missing = [];
    for (const [file, f] of byFile) {
      const abs = path.join(repo.cfg().clone, file);
      if (!fs.existsSync(abs)) { for (const h of f.hashes) missing.push({ file, label: f.labels.get(h) }); continue; }
      const src = fs.readFileSync(abs, "utf8");
      const hits = locate(src, f.hashes);
      const found = new Set(hits.map((h) => h.hash));
      for (const h of f.hashes) if (!found.has(h)) missing.push({ file, label: f.labels.get(h) });
      files[file] = splice(src, hits, f.text);
    }
    if (missing.length) throw new SourceMovedError(missing);
    return repo.commitAndPush({ files, message, author: { name: user.name, email: user.email } });
  });

  let out;
  try { out = await attempt(); }
  catch (e) {
    if (e instanceof SourceMovedError) throw e;
    /* most likely Lovable pushed while we were writing: once more from the new head */
    out = await attempt();
  }
  const sha = out.sha || await repo.localHead();
  if (out.sha && !(await repo.verifyPushed(out.sha))) {
    throw new Error("The commit was pushed but the remote head is not it. Check the repository before publishing again.");
  }
  rekey(db, slug, pending, sha, user, out.changed);
  return { pushed: pending.length, sha: out.sha, files: out.changed };
}

/* After the source holds the new text, the field's key is the hash of that
   text. Rename the row in place so drafts, comments and revisions follow. */
function rekey(db, slug, pending, sha, user, files) {
  const now = new Date().toISOString();
  const exists = db.prepare("SELECT 1 FROM page_content WHERE page_slug = ? AND field_key = ?");
  const rename = db.prepare(`UPDATE page_content SET field_key = ?, value = ?, draft_value = ?, updated_at = ?, updated_by = ?
    WHERE page_slug = ? AND field_key = ?`);
  const fold = db.prepare("UPDATE page_content SET retired = 1, value = draft_value WHERE page_slug = ? AND field_key = ?");
  const moveRev = db.prepare("UPDATE revisions SET field_key = ? WHERE page_slug = ? AND field_key = ?");
  const moveCom = db.prepare("UPDATE comments SET field_key = ? WHERE page_slug = ? AND field_key = ?");
  const rev = db.prepare("INSERT INTO revisions (page_slug, field_key, old_value, new_value, changed_by, changed_at) VALUES (?,?,?,?,?,?)");
  db.exec("BEGIN");
  try {
    for (const p of pending) {
      const text = clean(p.draft_value);
      const newKey = keyParts(p.field_key).scope + "." + hashText(text);
      if (newKey !== p.field_key && exists.get(slug, newKey)) {
        fold.run(slug, p.field_key);               // the editor typed another field's text: one field now
      } else {
        rename.run(newKey, text, text, now, user.name, slug, p.field_key);
        moveRev.run(newKey, slug, p.field_key);
        moveCom.run(newKey, slug, p.field_key);
      }
      rev.run(slug, newKey, p.value, text, user.name, now);
    }
    db.prepare("UPDATE pages SET ingested_sha = ? WHERE slug = ?").run(sha, slug);
    db.prepare("INSERT INTO publishes (page_slug, user_id, user_name, user_email, fields, published_at) VALUES (?,?,?,?,?,?)")
      .run(slug, user.id ?? null, user.name, user.email, pending.length, now);
    logEvent(db, { direction: "push", sha, summary: `${pending.length} change${pending.length === 1 ? "" : "s"} to ${slug} in ${files.join(", ") || "no files"}`, actor: user.name });
    setState(db, { last_push_sha: sha, last_push_at: now, last_error: null });
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: 28 passing.

- [ ] **Step 5: Stage**

```bash
git add sync/push.js test/push.test.mjs
```

---

### Task 7: Pull on demand and on a poll

**Files:**
- Create: `sync/watch.js`
- Test: `test/watch.test.mjs`

**Interfaces:**
- Produces: `pullNow(db, { reason, force })` returning `{ skipped: true, sha }` when the remote head is unchanged and `force` is false, else `{ sha, report }` from `applyScan`; `startPolling(db, { seconds, onError })` returning a `stop()` function; `summary(db)` for `/api/account`.
- Consumes: `repo.remoteHead`, `repo.resetToRemote`, `scan`, `applyScan`, store helpers.

Steps: failing test (fresh remote: pull applies pages; second pull skips; a designer commit on the remote makes the next pull report `added` and `retired`; `force` re-applies even when unchanged) -> implement -> `npm test` green -> stage.

```js
import * as repo from "./repo.js";
import { scan } from "./scan.js";
import { applyScan } from "./apply.js";
import { getState, setState, logEvent, openConflicts } from "./store.js";

let pulling = false;
export async function pullNow(db, { reason = "manual", force = false } = {}) {
  if (!repo.configured()) throw new Error("Sync is not configured. Set LOVABLE_REPO in .env.");
  const c = repo.cfg();
  const remote = await repo.remoteHead();
  if (!force && remote === getState(db).last_remote_sha) return { skipped: true, sha: remote };
  pulling = true;
  try {
    const sha = await repo.serial(() => repo.resetToRemote());
    const result = scan(c.clone, { homeSlug: "home" });
    const report = applyScan(db, result, { repo: c.repo.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, ""), branch: c.branch, sha, prefix: c.prefix });
    const now = new Date().toISOString();
    setState(db, { last_remote_sha: sha, last_scan_at: now, last_error: null });
    const t = report.reduce((a, r) => ({ added: a.added + r.added, kept: a.kept + r.kept, retired: a.retired + r.retired, conflicts: a.conflicts + r.conflicts }), { added: 0, kept: 0, retired: 0, conflicts: 0 });
    logEvent(db, { direction: "pull", sha, summary: `${report.length} page(s): ${t.kept} kept, ${t.added} added, ${t.retired} retired, ${t.conflicts} conflict(s)`, actor: reason });
    return { sha, report, totals: t };
  } catch (e) {
    setState(db, { last_error: String(e.message).slice(0, 500) });
    throw e;
  } finally { pulling = false; }
}

export function startPolling(db, { seconds = 20, onError = () => {} } = {}) {
  const tick = () => { if (pulling) return; pullNow(db, { reason: "poll" }).catch(onError); };
  const t = setInterval(tick, Math.max(5, seconds) * 1000);
  t.unref();
  setTimeout(tick, 1500).unref();
  return () => clearInterval(t);
}

export const summary = (db) => ({ ...repo.describe(), state: getState(db), conflicts: openConflicts(db).length, pulling });
```

### Task 8: Wire the server

**Files:**
- Modify: `server.js` (imports; `ensureSchema` after `auth.initAuth`; `/api/account` gains `sync`; `/api/pages` selects `p.repo`; publish branches to `pushPage` for repo pages; new `/api/sync*` routes; `CONSOLE + "/sync"` route; start polling on boot when configured and not under test)
- Modify: `admin/shell.js` (nav link "Sync")

Routes:
- `GET /api/sync` (read): `{ ...summary, log: recentLog(db, 30), conflicts: openConflicts(db) }`.
- `POST /api/sync/pull` (edit): `pullNow(db, { reason: user.name, force: true })`.
- `POST /api/sync/webhook` (no session; if `SYNC_WEBHOOK_SECRET` is set, require `?token=` to equal it): `pullNow(db, { reason: "webhook" })`, respond 202 immediately.
- `POST /api/sync/conflicts/:id` (edit) body `{ resolution: "keep-theirs" | "reapply-mine" }`: `reapply-mine` sets `draft_value = mine` on `(page_slug, new_key)` when `new_key` exists, then resolves. `keep-theirs` resolves only.
- Publish: `const pg = SELECT source, repo`; if `pg.repo` then `await pushPage(db, slug, { user: req.user })` and respond `{ published: out.pushed, pushed: true, sha, files, by, at }`; `SourceMovedError` -> 409 with `{ error, moved: e.missing }` after running `pullNow(db, { reason: "publish", force: true })`; other errors -> 502.

Proof: `PORT=4100 node server.js` boots, `curl -s localhost:4100/api/sync` after login returns `configured: true`, and the poll pulls `lab-home` and `lab-pricing` into `data/lab.db` within a few seconds (visible in `/api/pages`).

### Task 9: The Sync panel

**Files:**
- Create: `admin/sync.html` (same skeleton as `admin/people.html`: `.shell`, `.side`, `.phead`, `.card`s)

Cards: Connection (repo link, branch, last pulled commit and time, last pushed commit and time, last error, Sync now button); Conflicts (one `.rrow` per open conflict: label, file, three columns Original / Lovable now / Your draft, two buttons); Activity (last 30 log rows, direction badge, summary, actor, `ago(at)`). Page refreshes its data every 10 seconds while open.

### Task 10: End-to-end loop against a local remote

**Files:**
- Test: `test/loop.test.mjs`

Beats, all against `makeRemote(FIXTURE_APP)`: (1) pull seeds pages; (2) draft plus `pushPage` lands on the remote and a following `pullNow` is a no-op; (3) designer commit then `pullNow` updates the field; (4) draft, designer changes the same text, `pullNow` produces a conflict, `reapply-mine` path copies the draft onto the new key and a `pushPage` then pushes it; (5) designer adds a card and deletes one, `pullNow` reports `added` and `retired`.

### Task 11: The live run, by hand, recorded

1. `PORT=4100 node server.js`, sign in at `localhost:4100/console`, open Sync, press Sync now. Expect `lab-home` (38 fields) and `lab-pricing` (40 fields).
2. Edit the hero headline on `lab-home`, Publish. Expect a commit on `github.com/vinaynain26/dark-welcome-page` authored by the signed-in user, and the new headline in Lovable's preview and in `LandingSections.tsx`. Record the time from Publish to visible in Lovable.
3. In Lovable, ask it to change a feature card title. Expect the CMS field to change within one poll. Record the time.
4. Draft the headline in the CMS, change the same headline in Lovable. Expect a conflict card with both texts. Resolve with Re-apply mine, Publish. Expect the CMS text to win in Lovable.
5. In Lovable, add a fourth feature card and delete the first. Expect Activity to show added and retired counts and the studio to show the new card's fields.
6. Record anything Lovable did not pick up.
