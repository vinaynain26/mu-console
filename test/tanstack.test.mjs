/* The Hero Launch profile: TanStack file routes, the Vite plugin's field
   identity (scope without extension, 7-char hash, -2 for repeats), route
   files own pages, everything else is `shared`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scan } from "../sync/scan.js";
import { scopeFor, hashText7 } from "../sync/keys.js";

const ROOT = new URL("./fixtures/tanstack/", import.meta.url).pathname;
const out = () => scan(ROOT, { homeSlug: "mu-home" });
const fields = (page) => page.sections.flatMap((s) => s.fields);
const byValue = (p, v) => fields(p).filter((f) => f.value === v);

test("layout is detected and routes come from the file names", () => {
  const o = out();
  assert.equal(o.profile, "plugin");
  assert.deepEqual(o.pages.map((p) => [p.route, p.slug]), [
    ["/", "mu-home"], ["/about", "about"], ["/programmes/pg/pgp-tbm", "programmes-pg-pgp-tbm"], [null, "shared"],
  ]);
  assert.equal(o.title, "Masters Union - Home", "title comes from the root route head()");
});

test("route files own their page, components go to shared, once", () => {
  const o = out();
  const shared = o.pages.find((p) => p.slug === "shared");
  assert.deepEqual(shared.sections.map((s) => s.file).sort(), ["src/components/Nav.tsx", "src/routes/__root.tsx"], "the layout is shared, like the plugin; Eyebrow has no copy of its own");
  assert.equal(fields(shared).filter((f) => f.value === "Masters Union - Home").length, 1, "a page title in head() is copy, as the plugin treats it");
  assert.equal(fields(shared).filter((f) => f.value === "summary_large_image").length, 0, "a meta tag object is not");
  const home = o.pages.find((p) => p.slug === "mu-home");
  assert.ok(!home.sections.some((s) => s.file.includes("Nav")), "Nav is not repeated under the home page");
  assert.ok(byValue(home, "Find your").length, "home page copy is under the home page");
});

test("keys match the plugin: scope without extension, 7-char hash, -2 for a repeat", () => {
  const o = out();
  const home = o.pages.find((p) => p.slug === "mu-home");
  const [f] = byValue(home, "Find your");
  assert.equal(f.key, "routes-index." + hashText7("Find your"));
  assert.equal(scopeFor("src/routes/programmes.pg.pgp-tbm.tsx"), "routes-programmes-pg-pgp-tbm");
  assert.equal(f.file, "src/routes/index.tsx", "the real path rides along, the scope is lossy");
  const shared = o.pages.find((p) => p.slug === "shared");
  const homes = byValue(shared, "Home").map((x) => x.key).sort();
  assert.deepEqual(homes, ["components-nav." + hashText7("Home"), "components-nav." + hashText7("Home") + "-2"]);
  assert.equal(shared.sections.find((s) => s.file.endsWith("Nav.tsx")).key, "components-nav", "section key is the scope, as the rows have today");
});

test("copy rules follow the plugin: allowlisted props, stat values, component props, ternary arms, attrs; not class names", () => {
  const home = out().pages.find((p) => p.slug === "mu-home");
  for (const v of ["Offers per student", "3.03×", "₹45L", "Round closed", "Apply now", "Placements", "Campus at dusk", "Path.", "Empower your operations with an intelligent platform."]) {
    assert.ok(byValue(home, v).length, "missing: " + v);
  }
  assert.equal(byValue(home, "text-lg").length, 0, "className is never copy");
  assert.equal(byValue(home, "summary_large_image").length, 0, "head() metadata is never copy");
  assert.equal(byValue(home, "3.03×")[0].tag, "value");
});

test("a literal in braces on an attribute is not a field, as the plugin has no rule for it", () => {
  const home = out().pages.find((p) => p.slug === "mu-home");
  const all = home.sections.flatMap((s) => s.fields);
  assert.equal(all.filter((f) => /poster-in-braces/.test(f.value) || /poster-in-braces/.test(f.label)).length, 0, 'src={"/…jpg"} is neither a picture nor text');
  assert.equal(byValue(home, "Braced attribute text").length, 0, 'title={"…"} is not element text');
  assert.ok(all.some((f) => f.type === "media" && f.label === "hero-building.webp"), "src={heroBuilding} next to it is still a picture");
});
