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

test("a publish with a picture and a text change pushes the text and takes the picture live locally", async () => {
  const { remote, db } = await setup();
  /* a media row the Vite plugin would have seeded: no source text to write back */
  db.prepare(`INSERT INTO page_content (page_slug, field_key, section_key, section_title, label, tag, type, value, draft_value, updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run("mu-home", "routes-index.media:hero-building-light", "routes-index", "Index", "hero-building-light.webp", "src", "media", "", "https://cdn.example/new-hero.mp4", "Vinay");
  draft(db, "mu-home", K("routes-index", "Find your"), "Find the");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.equal(out.pushed, 1, "the text change went to the repo");
  assert.equal(out.local, 1, "the picture went live in the CMS");
  assert.equal(out.published, 2);
  remote.git(["pull", "-q", "origin", "main"]);
  assert.ok(fs.readFileSync(path.join(remote.work, "src/routes/index.tsx"), "utf8").includes("Find the"));
  const media = row(db, "mu-home", "routes-index.media:hero-building-light");
  assert.equal(media.value, "https://cdn.example/new-hero.mp4", "live now"); assert.equal(media.draft_value, media.value);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM revisions WHERE field_key = ?").get("routes-index.media:hero-building-light").n, 1);
});

test("a publish with only a picture makes no commit and still goes live", async () => {
  const { db, sha } = await setup();
  db.prepare(`INSERT INTO page_content (page_slug, field_key, section_key, section_title, label, tag, type, value, draft_value, updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run("mu-home", "routes-index.media:hero", "routes-index", "Index", "hero.webp", "src", "media", "", "https://cdn.example/x.jpg", "Vinay");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.deepEqual([out.pushed, out.local, out.sha], [0, 1, null]);
  assert.equal(await repo.remoteHead(), sha, "nothing was committed");
  assert.equal(row(db, "mu-home", "routes-index.media:hero").value, "https://cdn.example/x.jpg");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM publishes WHERE page_slug = 'mu-home'").get().n, 1);
});

test("a picture change is written into the source and re-keyed, then the pull agrees", async () => {
  const { remote, db } = await setup();
  const key = K("routes-index", "media:/x.png");
  assert.ok(row(db, "mu-home", key), "the picture is a field after the scan");
  draft(db, "mu-home", key, "https://cdn.example/new-campus.jpg");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.equal(out.pushed, 1); assert.equal(out.local, 0);
  remote.git(["pull", "-q", "origin", "main"]);
  const src = fs.readFileSync(path.join(remote.work, "src/routes/index.tsx"), "utf8");
  assert.ok(src.includes('src="https://cdn.example/new-campus.jpg"'), "the source now names the new picture");
  assert.ok(!src.includes('"/x.png"'));
  const r = row(db, "mu-home", K("routes-index", "media:https://cdn.example/new-campus.jpg"));
  assert.ok(r, "re-keyed to the new picture's identity"); assert.equal(r.value, "https://cdn.example/new-campus.jpg"); assert.equal(r.type, "media");
  /* the pull after our own push must not add, retire or reconcile anything */
  const head = await repo.resetToRemote();
  const rep = applyScan(db, scan(repo.cfg().clone, { homeSlug: "mu-home" }), { repo: "local", branch: "main", sha: head, prefix: "", homeSlug: "mu-home" });
  const home = rep.find((p) => p.slug === "mu-home");
  assert.deepEqual([home.added, home.retired, home.reconciled, home.conflicts], [0, 0, 0, 0]);
});

test("a data-object picture and a link publish the same way", async () => {
  const { remote, db } = await setup();
  draft(db, "mu-home", K("routes-index", "media:/photos/offers.webp"), "/photos/offers-2026.webp");
  draft(db, "mu-home", K("routes-index", "link:/placements"), "/placements-2026");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.equal(out.pushed, 2);
  remote.git(["pull", "-q", "origin", "main"]);
  const src = fs.readFileSync(path.join(remote.work, "src/routes/index.tsx"), "utf8");
  assert.ok(src.includes('image: "/photos/offers-2026.webp"')); assert.ok(src.includes('href: "/placements-2026"'));
});

test("a picture that was an imported asset publishes as a plain src attribute, and the pull keeps the field", async () => {
  const { remote, db } = await setup();
  /* src={heroBuilding}: the plugin keys it by the expression, the CMS holds no path for it */
  const key = K("routes-index", "media:heroBuilding");
  const before = row(db, "mu-home", key);
  assert.ok(before, "src={heroBuilding} is a field after the scan"); assert.equal(before.type, "media"); assert.equal(before.value, "");
  draft(db, "mu-home", key, "https://cdn.example/hero-2026.webp");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.equal(out.pushed, 1); assert.equal(out.local, 0);
  remote.git(["pull", "-q", "origin", "main"]);
  const src = fs.readFileSync(path.join(remote.work, "src/routes/index.tsx"), "utf8");
  assert.ok(src.includes('src="https://cdn.example/hero-2026.webp"'), "written as a plain attribute, the one form the plugin and the scan both key");
  assert.ok(!src.includes('src={"https://cdn.example/hero-2026.webp"}'), "never a literal inside braces, which neither of them sees");
  const newKey = K("routes-index", "media:https://cdn.example/hero-2026.webp");
  const r = row(db, "mu-home", newKey);
  assert.ok(r, "re-keyed to the new picture's identity"); assert.equal(r.value, "https://cdn.example/hero-2026.webp");
  /* the pull after our own push: nothing added, and above all nothing retired */
  const head = await repo.resetToRemote();
  const rep = applyScan(db, scan(repo.cfg().clone, { homeSlug: "mu-home" }), { repo: "local", branch: "main", sha: head, prefix: "", homeSlug: "mu-home" });
  const home = rep.find((p) => p.slug === "mu-home");
  assert.deepEqual([home.added, home.retired, home.reconciled, home.conflicts], [0, 0, 0, 0]);
  assert.equal(row(db, "mu-home", newKey).retired, 0, "the picture is still a field the editor can change again");
});

test("a picture published onto a key that exists as a dormant row revives that row with the new value", async () => {
  const { remote, db } = await setup();
  /* the state production got into: the target key already exists, retired,
     holding an override from an earlier life (a picture's key is its URL,
     its value is whatever the CMS last showed there) */
  const target = K("routes-index", "media:https://cdn.example/new-campus.jpg");
  db.prepare(`INSERT INTO page_content (page_slug, field_key, section_key, section_title, label, tag, type, value, draft_value, updated_by, retired, src_file)
    VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`).run("mu-home", target, "routes-index", "Index", "new-campus.jpg", "src", "media", "/stale.png", "/stale.png", "Vinay", "src/routes/index.tsx");
  draft(db, "mu-home", K("routes-index", "media:/x.png"), "https://cdn.example/new-campus.jpg");
  const out = await pushPage(db, "mu-home", { user: USER });
  assert.equal(out.pushed, 1);
  remote.git(["pull", "-q", "origin", "main"]);
  assert.ok(fs.readFileSync(path.join(remote.work, "src/routes/index.tsx"), "utf8").includes('src="https://cdn.example/new-campus.jpg"'));
  const r = row(db, "mu-home", target);
  assert.equal(r.retired, 0, "the row under the new key is live");
  assert.equal(r.value, "https://cdn.example/new-campus.jpg", "and shows the picture the editor published, not its old override");
  assert.equal(r.draft_value, r.value);
  const head = await repo.resetToRemote();
  applyScan(db, scan(repo.cfg().clone, { homeSlug: "mu-home" }), { repo: "local", branch: "main", sha: head, prefix: "", homeSlug: "mu-home" });
  assert.equal(row(db, "mu-home", target).value, "https://cdn.example/new-campus.jpg", "the pull after the push keeps it");
  assert.equal(row(db, "mu-home", K("routes-index", "media:/x.png")).retired, 1, "the row it came from is folded away");
});
