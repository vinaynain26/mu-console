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
