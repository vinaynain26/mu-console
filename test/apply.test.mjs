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
