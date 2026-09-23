import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeDb, makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import * as repo from "../sync/repo.js";
import { scan, hashText } from "../sync/scan.js";
import { applyScan } from "../sync/apply.js";
import { submitRequest, acceptRequest, declineRequest, listRequests, summary, pendingByPage, QueueStateError } from "../sync/queue.js";

const EDITOR = { id: 2, name: "Content Editor", email: "editor@example.com" };
const OTHER = { id: 3, name: "Someone Else", email: "else@example.com" };
const BOSS = { id: 9, name: "Super Admin", email: "boss@example.com" };
const K = (scope, text) => scope + "." + hashText(text);
const WELCOME = K("pages/Index.tsx", "Welcome to SecureFlow.");
const row = (db, key) => db.prepare("SELECT * FROM page_content WHERE page_slug = 'lab-home' AND field_key = ?").get(key);
const req = (db, id) => db.prepare("SELECT * FROM change_requests WHERE id = ?").get(id);
const items = (db, id) => db.prepare("SELECT * FROM change_request_items WHERE request_id = ? ORDER BY ord").all(id);

async function setup() {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const sha = await repo.resetToRemote();
  const db = makeDb();
  applyScan(db, scan(repo.cfg().clone), { repo: "local", branch: "main", sha, prefix: "lab" });
  return { remote, db, sha };
}
const draft = (db, key, text) =>
  db.prepare("UPDATE page_content SET draft_value = ? WHERE page_slug = 'lab-home' AND field_key = ?").run(text, key);

test("submit snapshots the dirty rows and leaves the drafts alone", async () => {
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const q = submitRequest(db, "lab-home", { user: EDITOR });
  assert.equal(q.items, 1); assert.equal(q.replaced, false); assert.ok(q.id);
  const r = req(db, q.id);
  assert.equal(r.status, "pending"); assert.equal(r.user_name, "Content Editor"); assert.equal(r.page_slug, "lab-home");
  const [it] = items(db, q.id);
  assert.equal(it.before, "Welcome to SecureFlow."); assert.equal(it.after, "Hello SecureFlow."); assert.equal(it.field_key, WELCOME);
  assert.equal(row(db, WELCOME).draft_value, "Hello SecureFlow.", "draft still a draft");
  assert.equal(row(db, WELCOME).value, "Welcome to SecureFlow.", "nothing live yet");
  assert.deepEqual(summary(db), { pending: 1, applying: 0, accepted: 0, declined: 0, failed: 0 });
  assert.equal(pendingByPage(db).get("lab-home"), 1);
});

test("nothing dirty submits nothing", async () => {
  const { db } = await setup();
  assert.deepEqual(submitRequest(db, "lab-home", { user: EDITOR }), { id: null, items: 0, replaced: false });
});

test("the same editor resubmitting replaces their pending request; another editor gets their own", async () => {
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const a = submitRequest(db, "lab-home", { user: EDITOR });
  draft(db, K("pages/Index.tsx", "Automated Workflows"), "Automated Flows");
  const b = submitRequest(db, "lab-home", { user: EDITOR });
  assert.equal(b.id, a.id); assert.equal(b.replaced, true); assert.equal(b.items, 2);
  assert.equal(items(db, a.id).length, 2);
  const c = submitRequest(db, "lab-home", { user: OTHER });
  assert.notEqual(c.id, a.id); assert.equal(c.items, 2);
  assert.equal(listRequests(db, { status: "pending" }).length, 2);
  assert.equal(listRequests(db, { status: "pending" })[0].id, a.id, "oldest first");
  assert.equal(listRequests(db, { status: "pending" })[0].items.length, 2, "items ride along");
});

test("accept pushes the snapshot as the submitter, re-keys the row, and records the sha", async () => {
  const { remote, db, sha } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const q = submitRequest(db, "lab-home", { user: EDITOR });
  const out = await acceptRequest(db, q.id, { user: BOSS });
  assert.equal(out.status, "accepted"); assert.ok(out.sha); assert.notEqual(out.sha, sha);
  assert.equal(await repo.remoteHead(), out.sha);
  const r = req(db, q.id);
  assert.equal(r.status, "accepted"); assert.equal(r.sha, out.sha); assert.equal(r.decided_by, "Super Admin"); assert.ok(r.decided_at);

  remote.git(["pull", "-q", "origin", "main"]);
  const file = fs.readFileSync(path.join(remote.work, "src/pages/Index.tsx"), "utf8");
  assert.ok(file.includes("Hello SecureFlow."));
  assert.match(remote.git(["log", "-1", "--format=%an|%s"]), /^Content Editor\|content\(lab-home\): 1 change via MU Console, approved by Super Admin/);

  const nk = K("pages/Index.tsx", "Hello SecureFlow.");
  assert.equal(row(db, WELCOME), undefined);
  assert.equal(row(db, nk).value, "Hello SecureFlow."); assert.equal(row(db, nk).draft_value, "Hello SecureFlow.");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM publishes WHERE page_slug = 'lab-home'").get().n, 1);
  assert.deepEqual(summary(db), { pending: 0, applying: 0, accepted: 1, declined: 0, failed: 0 });
});

test("accept keeps a draft the editor typed after submitting", async () => {
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const q = submitRequest(db, "lab-home", { user: EDITOR });
  draft(db, WELCOME, "Newer text.");
  await acceptRequest(db, q.id, { user: BOSS });
  const nk = K("pages/Index.tsx", "Hello SecureFlow.");
  assert.equal(row(db, nk).value, "Hello SecureFlow.");
  assert.equal(row(db, nk).draft_value, "Newer text.", "the newer draft survives");
});

test("decline marks the request and leaves the draft", async () => {
  const { db, sha } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const q = submitRequest(db, "lab-home", { user: EDITOR });
  const out = declineRequest(db, q.id, { user: BOSS, note: "Not the house voice" });
  assert.equal(out.status, "declined");
  const r = req(db, q.id);
  assert.equal(r.status, "declined"); assert.equal(r.note, "Not the house voice"); assert.equal(r.decided_by, "Super Admin");
  assert.equal(row(db, WELCOME).draft_value, "Hello SecureFlow.");
  assert.equal(await repo.remoteHead(), sha, "nothing pushed");
  /* a declined request is never reopened: the next submit is a new one */
  const again = submitRequest(db, "lab-home", { user: EDITOR });
  assert.notEqual(again.id, q.id);
});

test("accept after the source moved lands as failed, readable, with the draft intact", async () => {
  const { remote, db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const q = submitRequest(db, "lab-home", { user: EDITOR });
  const f = path.join(remote.work, "src/pages/Index.tsx");
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("Welcome to SecureFlow.", "Theirs"));
  remote.git(["commit", "-qam", "Lovable edit"]); remote.git(["push", "-q", "origin", "main"]);
  const head = await repo.remoteHead();
  const out = await acceptRequest(db, q.id, { user: BOSS });
  assert.equal(out.status, "failed");
  assert.match(out.error, /changed in Lovable/);
  assert.equal(req(db, q.id).status, "failed"); assert.match(req(db, q.id).error, /changed in Lovable/);
  assert.equal(row(db, WELCOME).draft_value, "Hello SecureFlow.");
  assert.equal(await repo.remoteHead(), head, "remote untouched");
  /* a failed request can be declined */
  assert.equal(declineRequest(db, q.id, { user: BOSS }).status, "declined");
});

test("two accepts fired together land as two ordered commits", async () => {
  const { remote, db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const a = submitRequest(db, "lab-home", { user: EDITOR });
  draft(db, K("components/Navbar.tsx", "Pricing"), "Plans");
  /* the second editor's page now carries both drafts; snapshot only theirs */
  draft(db, WELCOME, "Welcome to SecureFlow.");
  const b = submitRequest(db, "lab-home", { user: OTHER });
  const [ra, rb] = await Promise.all([acceptRequest(db, a.id, { user: BOSS }), acceptRequest(db, b.id, { user: BOSS })]);
  assert.equal(ra.status, "accepted"); assert.equal(rb.status, "accepted");
  assert.notEqual(ra.sha, rb.sha);
  assert.equal(await repo.remoteHead(), rb.sha);
  remote.git(["pull", "-q", "origin", "main"]);
  const log = remote.git(["log", "-2", "--format=%an"]).split("\n");
  assert.deepEqual(log, ["Someone Else", "Content Editor"]);
});

test("an accepted request cannot be accepted or declined again", async () => {
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const q = submitRequest(db, "lab-home", { user: EDITOR });
  await acceptRequest(db, q.id, { user: BOSS });
  await assert.rejects(() => acceptRequest(db, q.id, { user: BOSS }), (e) => e instanceof QueueStateError && e.status === 409);
  assert.throws(() => declineRequest(db, q.id, { user: BOSS }), (e) => e instanceof QueueStateError && e.status === 409);
  await assert.rejects(() => acceptRequest(db, 9999, { user: BOSS }), /No such request/);
});

/* ---------------- is it live yet? ---------------- */
import { checkLive, watchLive, recheckLive, livePageUrl } from "../sync/queue.js";
const noSleep = async () => {};
const withSite = () => { process.env.LIVE_SITE_URL = "https://live.example"; process.env.SYNC_HOME_SLUG = "lab-home"; };
const fakeFetch = (pages) => async (url) => {
  const body = pages[url];
  return body === undefined ? { ok: false, status: 404, text: async () => "" } : { ok: true, status: 200, text: async () => body };
};

test("livePageUrl: the home slug is the root, other slugs are paths", () => {
  withSite();
  assert.equal(livePageUrl("lab-home"), "https://live.example/");
  assert.equal(livePageUrl("about"), "https://live.example/about");
  process.env.LIVE_SITE_URL = ""; process.env.LOVABLE_ASSETS_URL = "";
  assert.equal(livePageUrl("about"), null);
});

test("checkLive marks a request live once its new text is on the live page, and keeps checking until then", async () => {
  withSite();
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const a = submitRequest(db, "lab-home", { user: EDITOR });
  await acceptRequest(db, a.id, { user: BOSS });
  const stale = fakeFetch({ "https://live.example/": "<h1>Welcome to SecureFlow.</h1>" });
  assert.deepEqual(await checkLive(db, { fetch: stale }), { checked: 1, live: 0, waiting: 1 });
  assert.equal(req(db, a.id).deploy_status, "checking"); assert.equal(req(db, a.id).deploy_url, "https://live.example/");
  const fresh = fakeFetch({ "https://live.example/": "<h1>Hello &amp; welcome</h1><p>Hello\n  SecureFlow.</p>" });
  assert.deepEqual(await checkLive(db, { fetch: fresh }), { checked: 1, live: 1, waiting: 0 });
  const r = req(db, a.id);
  assert.equal(r.deploy_status, "live"); assert.ok(r.deployed_at);
  assert.match(db.prepare("SELECT summary FROM sync_log WHERE direction = 'live' ORDER BY id DESC LIMIT 1").get().summary, /is on the live site/);
  /* done: nothing left to check */
  assert.deepEqual(await checkLive(db, { fetch: fresh }), { checked: 0, live: 0, waiting: 0 });
});

test("a request with nothing checkable, or no live site configured, is live as soon as it is pushed", async () => {
  withSite();
  process.env.LIVE_SITE_URL = ""; process.env.LOVABLE_ASSETS_URL = "";
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const a = submitRequest(db, "lab-home", { user: EDITOR });
  await acceptRequest(db, a.id, { user: BOSS });
  let calls = 0;
  assert.deepEqual(await checkLive(db, { fetch: async () => { calls++; } }), { checked: 1, live: 1, waiting: 0 });
  assert.equal(calls, 0, "no site, no fetch");
  assert.equal(req(db, a.id).deploy_status, "live");
});

test("the watcher gives up after the grace period, and recheck starts it again", async () => {
  withSite();
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const a = submitRequest(db, "lab-home", { user: EDITOR });
  await acceptRequest(db, a.id, { user: BOSS });
  /* accepted an hour ago */
  db.prepare("UPDATE change_requests SET decided_at = ? WHERE id = ?").run(new Date(Date.now() - 3600e3).toISOString(), a.id);
  const down = async () => { throw new Error("connect ECONNREFUSED"); };
  await watchLive(db, { fetch: down, sleep: noSleep });
  const r = req(db, a.id);
  assert.equal(r.deploy_status, "unseen"); assert.match(r.deploy_error, /ECONNREFUSED/);
  recheckLive(db, a.id);
  assert.equal(req(db, a.id).deploy_status, null);
  assert.ok(req(db, a.id).check_since, "recheck restarts the clock");
  /* the old accept time no longer counts: a still-stale page is "checking", not "unseen" */
  const stale = fakeFetch({ "https://live.example/": "<p>old</p>" });
  assert.deepEqual(await checkLive(db, { fetch: stale }), { checked: 1, live: 0, waiting: 1 });
  assert.equal(req(db, a.id).deploy_status, "checking");
  const up = fakeFetch({ "https://live.example/": "<p>Hello SecureFlow.</p>" });
  await watchLive(db, { fetch: up, sleep: noSleep });
  assert.equal(req(db, a.id).deploy_status, "live");
  /* recheck is only for accepted requests */
  draft(db, K("components/Navbar.tsx", "Pricing"), "Plans");
  const b = submitRequest(db, "lab-home", { user: OTHER });
  assert.throws(() => recheckLive(db, b.id), (e) => e.status === 409);
});

test("watchLive runs one watcher at a time and loops until nothing is waiting", async () => {
  withSite();
  const { db } = await setup();
  draft(db, WELCOME, "Hello SecureFlow.");
  const a = submitRequest(db, "lab-home", { user: EDITOR });
  await acceptRequest(db, a.id, { user: BOSS });
  let n = 0;
  const f = async (url) => ({ ok: true, status: 200, text: async () => (++n >= 3 ? "<p>Hello SecureFlow.</p>" : "<p>old</p>") });
  const w1 = watchLive(db, { fetch: f, sleep: noSleep });
  const w2 = watchLive(db, { fetch: f, sleep: noSleep });
  assert.equal(w1, w2, "second call joins the running watcher");
  await w1;
  assert.equal(n, 3); assert.equal(req(db, a.id).deploy_status, "live");
});
