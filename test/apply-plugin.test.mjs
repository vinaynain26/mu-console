/* Applying a plugin-profile scan onto rows the Vite plugin seeded: it must
   land on them, never beside them, and never touch what it does not own. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb } from "./helpers.mjs";
import { scan } from "../sync/scan.js";
import { applyScan } from "../sync/apply.js";
import { hashText7 } from "../sync/keys.js";

const ROOT = new URL("./fixtures/tanstack/", import.meta.url).pathname;
const OPTS = { repo: "o/r", branch: "main", sha: "aaaa111", prefix: "", homeSlug: "mu-home" };
const row = (db, slug, key) => db.prepare("SELECT * FROM page_content WHERE page_slug = ? AND field_key = ?").get(slug, key);
const K = (scope, text) => scope + "." + hashText7(text);

/* what the Vite plugin left behind before the repo was ever connected */
function seedLikePlugin(db) {
  db.prepare("INSERT INTO pages (slug, title, template, layout, source) VALUES (?,?,?,?,?)").run("mu-home", "Home", "__external", "main", "instrumented");
  db.prepare("INSERT INTO pages (slug, title, template, layout, source) VALUES (?,?,?,?,?)").run("shared", "Shared", "__external", "main", "instrumented");
  const ins = db.prepare(`INSERT INTO page_content (page_slug, field_key, section_key, section_title, label, tag, type, value, draft_value, updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  ins.run("mu-home", K("routes-index", "Find your"), "routes-index", "Index", "Find your", "h1", "text", "Find your", "Find your", "import");
  ins.run("mu-home", K("routes-index", "Offers per student"), "routes-index", "Index", "Offers", "label", "text", "Offers per student", "Offers per student", "import");
  /* an edit the CMS published that the repo never received */
  ins.run("shared", K("components-nav", "About"), "components-nav", "Nav", "About", "a", "text", "ABOUT US", "ABOUT US", "Vinay");
  /* rows this scanner does not own: a picture, a list structure, a CMS-born list item */
  ins.run("mu-home", "routes-index.media:hero.jpg", "routes-index", "Index", "Hero", "src", "media", "", "", "import");
  ins.run("shared", "components-chapters.list:RAW_CHAPTERS", "components-chapters", "Chapters", "Chapters", "list", "list", "{\"items\":[]}", "{\"items\":[]}", "Vinay");
  ins.run("shared", "components-chapters.list:RAW_CHAPTERS.it-1ff2e7e.body", "components-chapters", "Chapters", "Body", "body", "text", "Born in the CMS", "Born in the CMS", "Vinay");
  /* a text row the plugin once made from text that is no longer in the source */
  ins.run("mu-home", K("routes-index", "Text that was deleted upstream"), "routes-index", "Index", "Old", "p", "text", "Text that was deleted upstream", "Text that was deleted upstream", "import");
}

test("lands on the seeded pages with no prefix and keeps their source", () => {
  const db = makeDb(); seedLikePlugin(db);
  const report = applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  assert.deepEqual(report.map((r) => r.slug).sort(), ["about", "mu-home", "programmes-pg-pgp-tbm", "shared"]);
  const home = db.prepare("SELECT * FROM pages WHERE slug = 'mu-home'").get();
  assert.equal(home.source, "instrumented", "an existing page keeps its source");
  assert.equal(home.repo, "o/r"); assert.equal(home.ingested_sha, "aaaa111");
  assert.equal(db.prepare("SELECT source FROM pages WHERE slug = 'about'").get().source, "instrumented", "a new page from a plugin scan is instrumented too");
  assert.equal(db.prepare("SELECT COUNT(*) n FROM pages WHERE slug LIKE 'lab-%'").get().n, 0, "no prefixed duplicates");
});

test("matched rows keep their identity and gain the source path", () => {
  const db = makeDb(); seedLikePlugin(db);
  const r0 = row(db, "mu-home", K("routes-index", "Find your"));
  applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  const r = row(db, "mu-home", K("routes-index", "Find your"));
  assert.ok(r && !r.retired);
  assert.equal(r.src_file, "src/routes/index.tsx");
  assert.equal(r.updated_by, r0.updated_by, "a kept row is not re-stamped");
});

test("a CMS edit the repo lacks becomes a pending draft over the repo text", () => {
  const db = makeDb(); seedLikePlugin(db);
  const report = applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  const r = row(db, "shared", K("components-nav", "About"));
  assert.equal(r.value, "About", "live value is what the repo has");
  assert.equal(r.draft_value, "ABOUT US", "the CMS edit is waiting to be published");
  assert.equal(report.find((p) => p.slug === "shared").reconciled, 1);
});

test("rows the scanner does not own are left exactly as they were", () => {
  const db = makeDb(); seedLikePlugin(db);
  applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  for (const [slug, key] of [["mu-home", "routes-index.media:hero.jpg"], ["shared", "components-chapters.list:RAW_CHAPTERS"], ["shared", "components-chapters.list:RAW_CHAPTERS.it-1ff2e7e.body"]]) {
    const r = row(db, slug, key);
    assert.ok(r, key + " still exists");
    assert.equal(r.retired, 0, key + " is not retired");
  }
});

test("a picture row whose source vanished is retired too", () => {
  const db = makeDb(); seedLikePlugin(db);
  db.prepare(`INSERT INTO page_content (page_slug, field_key, section_key, section_title, label, tag, type, value, draft_value, updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run("mu-home", K("routes-index", "media:/gone.png"), "routes-index", "Index", "gone.png", "src", "media", "", "", "import");
  applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  assert.equal(row(db, "mu-home", K("routes-index", "media:/gone.png")).retired, 1);
  assert.equal(row(db, "mu-home", "routes-index.media:hero.jpg").retired, 0, "a row keyed outside the scan's shape is still left alone");
});

test("a text row whose source vanished is retired, like before", () => {
  const db = makeDb(); seedLikePlugin(db);
  applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  assert.equal(row(db, "mu-home", K("routes-index", "Text that was deleted upstream")).retired, 1);
});

test("pictures and links are fields with the plugin's identity, and are never reconciled", () => {
  const db = makeDb(); seedLikePlugin(db);
  /* a picture row the plugin seeded, with an override the editor set */
  db.prepare(`INSERT INTO page_content (page_slug, field_key, section_key, section_title, label, tag, type, value, draft_value, updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run("mu-home", K("routes-index", "media:/x.png"), "routes-index", "Index", "x.png", "src", "media", "https://cdn.example/override.jpg", "https://cdn.example/override.jpg", "Vinay");
  const report = applyScan(db, scan(ROOT, { homeSlug: "mu-home" }), OPTS);
  const pic = row(db, "mu-home", K("routes-index", "media:/x.png"));
  assert.equal(pic.value, "https://cdn.example/override.jpg", "the CMS override is kept, not reconciled");
  assert.equal(pic.draft_value, pic.value); assert.equal(pic.src_file, "src/routes/index.tsx"); assert.equal(pic.type, "media");
  const dataPic = row(db, "mu-home", K("routes-index", "media:/photos/offers.webp"));
  assert.ok(dataPic, "a picture in a data object is a field"); assert.equal(dataPic.type, "media"); assert.equal(dataPic.value, "/photos/offers.webp");
  const link = row(db, "mu-home", K("routes-index", "link:/placements"));
  assert.ok(link, "a link in a data object is a field"); assert.equal(link.type, "link");
  assert.equal(report.find((p) => p.slug === "mu-home").reconciled, 0);
});
