/* Publishing a plugin-keyed page: the file comes from the row, the hash is
   seven characters, and "-2" means the second occurrence in the file. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeDb, makeRemote, useRemote, tmpDir } from "./helpers.mjs";
import * as repo from "../sync/repo.js";
import { scan } from "../sync/scan.js";
import { applyScan } from "../sync/apply.js";
import { pushPage } from "../sync/push.js";
import { hashText7 } from "../sync/keys.js";
import { locate, splice } from "../sync/writeback.js";

const FIX = new URL("./fixtures/tanstack/", import.meta.url).pathname;
const USER = { id: 1, name: "Vinay", email: "vinay@example.com" };
const K = (scope, text) => scope + "." + hashText7(text);
const row = (db, slug, key) => db.prepare("SELECT * FROM page_content WHERE page_slug = ? AND field_key = ?").get(slug, key);
const draft = (db, slug, key, text) => db.prepare("UPDATE page_content SET draft_value = ? WHERE page_slug = ? AND field_key = ?").run(text, slug, key);

async function setup() {
  const remote = makeRemote(FIX);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  process.env.SYNC_SLUG_PREFIX = ""; process.env.SYNC_HOME_SLUG = "mu-home";
  const sha = await repo.resetToRemote();
  const db = makeDb();
  applyScan(db, scan(repo.cfg().clone, { homeSlug: "mu-home" }), { repo: "local", branch: "main", sha, prefix: "", homeSlug: "mu-home" });
  return { remote, db, sha };
}

test("locate matches a 7-char hash and numbers repeats in source order", () => {
  const src = fs.readFileSync(path.join(FIX, "src/components/Nav.tsx"), "utf8");
  const hits = locate(src, new Set([hashText7("Home")]));
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((h) => h.ordinal), [1, 2]);
  const out = splice(src, hits, (h) => (h.ordinal === 2 ? "Top" : undefined));
  assert.equal((out.match(/>Home</g) || []).length, 1, "the first stays");
  assert.ok(out.includes(">Top<"), "only the second changed");
});

test("a shared-page edit publishes into the component file via src_file", async () => {
  const { remote, db } = await setup();
  const key = K("components-nav", "About");
  assert.equal(row(db, "shared", key).src_file, "src/components/Nav.tsx");
  draft(db, "shared", key, "About us");
  const out = await pushPage(db, "shared", { user: USER });
  assert.equal(out.pushed, 1);
  assert.deepEqual(out.files, ["src/components/Nav.tsx"]);
  remote.git(["pull", "-q", "origin", "main"]);
  assert.ok(fs.readFileSync(path.join(remote.work, "src/components/Nav.tsx"), "utf8").includes(">About us<"));
  const r = row(db, "shared", K("components-nav", "About us"));
  assert.ok(r, "re-keyed to the new text's hash");
  assert.equal(r.value, "About us"); assert.equal(r.src_file, "src/components/Nav.tsx");
});

test("the -2 occurrence publishes alone", async () => {
  const { remote, db } = await setup();
  const second = K("components-nav", "Home") + "-2";
  draft(db, "shared", second, "Back to top");
  await pushPage(db, "shared", { user: USER });
  remote.git(["pull", "-q", "origin", "main"]);
  const file = fs.readFileSync(path.join(remote.work, "src/components/Nav.tsx"), "utf8");
  assert.equal((file.match(/>Home</g) || []).length, 1);
  assert.ok(file.includes(">Back to top<"));
  assert.ok(row(db, "shared", K("components-nav", "Home")), "the first occurrence keeps its key");
});

test("a home-page data prop publishes through a getter-free source file", async () => {
  const { remote, db } = await setup();
  const key = K("routes-index", "Offers per student");
  draft(db, "mu-home", key, "Offers per graduate");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.equal(out.pushed, 1);
  remote.git(["pull", "-q", "origin", "main"]);
  assert.ok(fs.readFileSync(path.join(remote.work, "src/routes/index.tsx"), "utf8").includes('label: "Offers per graduate"'));
});
