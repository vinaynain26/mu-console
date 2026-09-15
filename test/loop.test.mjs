/* The whole loop, both directions, against a local remote. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeDb, makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import * as repo from "../sync/repo.js";
import { hashText } from "../sync/scan.js";
import { pushPage } from "../sync/push.js";
import { pullNow } from "../sync/watch.js";
import { openConflicts, resolveConflict } from "../sync/store.js";

const USER = { id: 1, name: "Editor", email: "editor@example.com" };
const K = (scope, text) => scope + "." + hashText(text);
const row = (db, slug, key) => db.prepare("SELECT * FROM page_content WHERE page_slug = ? AND field_key = ?").get(slug, key);
const draft = (db, key, text) => db.prepare("UPDATE page_content SET draft_value = ? WHERE page_slug = 'lab-home' AND field_key = ?").run(text, key);
const designer = (remote, rel, from, to, msg = "Lovable edit") => {
  remote.git(["pull", "-q", "origin", "main"]);
  const f = path.join(remote.work, rel);
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(from, to));
  remote.git(["commit", "-qam", msg]); remote.git(["push", "-q", "origin", "main"]);
};
const remoteFile = (remote, rel) => { remote.git(["pull", "-q", "origin", "main"]); return fs.readFileSync(path.join(remote.work, rel), "utf8"); };

test("beat 1: the first pull seeds both pages", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();
  const r = await pullNow(db);
  assert.deepEqual(r.report.map((p) => p.slug), ["lab-home", "lab-pricing"]);
  assert.ok(row(db, "lab-home", K("pages/Index.tsx", "Welcome to SecureFlow.")));
});

test("beat 2: CMS to Lovable, and the next pull is a no-op", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();
  await pullNow(db);
  draft(db, K("pages/Index.tsx", "Welcome to SecureFlow."), "Hello SecureFlow.");
  const out = await pushPage(db, "lab-home", { user: USER });
  assert.ok(remoteFile(remote, "src/pages/Index.tsx").includes("Hello SecureFlow."));
  const after = await pullNow(db);
  assert.equal(after.skipped, undefined, "our own push is a new remote head, so it is pulled");
  assert.equal(after.sha, out.sha);
  assert.deepEqual([after.totals.added, after.totals.retired, after.totals.conflicts], [0, 0, 0]);
});

test("beat 3: Lovable to CMS", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();
  await pullNow(db);
  designer(remote, "src/pages/Index.tsx", "Automated Workflows", "Automated Everything");
  const r = await pullNow(db);
  assert.deepEqual([r.totals.added, r.totals.retired, r.totals.conflicts], [1, 1, 0]);
  assert.equal(row(db, "lab-home", K("pages/Index.tsx", "Automated Everything")).value, "Automated Everything");
});

test("beat 4: both edit the same line, the conflict is shown, re-apply mine wins on publish", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();
  await pullNow(db);
  draft(db, K("pages/Index.tsx", "Welcome to SecureFlow."), "Editor's headline");
  designer(remote, "src/pages/Index.tsx", "Welcome to SecureFlow.", "Designer's headline");
  const r = await pullNow(db);
  assert.equal(r.totals.conflicts, 1);
  const [c] = openConflicts(db);
  assert.equal(c.mine, "Editor's headline"); assert.equal(c.theirs, "Designer's headline");
  /* the server's reapply-mine path, done by hand here */
  db.prepare("UPDATE page_content SET draft_value = ? WHERE page_slug = ? AND field_key = ?").run(c.mine, c.page_slug, c.new_key);
  resolveConflict(db, c.id, "reapply-mine");
  assert.equal(openConflicts(db).length, 0);
  await pushPage(db, "lab-home", { user: USER });
  const file = remoteFile(remote, "src/pages/Index.tsx");
  assert.ok(file.includes("Editor's headline")); assert.ok(!file.includes("Designer's headline"));
});

test("beat 5: Lovable adds a card and deletes one", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();
  await pullNow(db);
  designer(remote, "src/pages/Index.tsx",
    '  { n: "01", title: "Automated Workflows", desc: "Streamline complex processes with intelligent automation." },\n',
    '  { n: "03", title: "Actionable Insights", desc: "Real-time analytics that guide strategic decisions." },\n', "Swap a card");
  const r = await pullNow(db);
  assert.equal(r.totals.added, 3, "n, title and desc of the new card");
  assert.equal(r.totals.retired, 3, "n, title and desc of the deleted card");
  assert.equal(row(db, "lab-home", K("pages/Index.tsx", "Automated Workflows")).retired, 1);
  assert.equal(row(db, "lab-home", K("pages/Index.tsx", "Actionable Insights")).retired, 0);
});
