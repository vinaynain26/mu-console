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
  assert.equal(f.filter((x) => x.value === "Request Demo" && x.file === "src/pages/Index.tsx").length, 1, "same text twice in one file is one field");
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

test("items in a string array are fields, keyed and tagged by their property", () => {
  const pricing = scan(FIXTURE_APP, { homeSlug: "home" }).pages[1];
  const f = pricing.sections.flatMap((s) => s.fields);
  for (const v of ["Up to 5 team members", "10 automated workflows", "Up to 25 team members", "Unlimited workflows"]) {
    const hit = f.find((x) => x.value === v);
    assert.ok(hit, "missing array item: " + v);
    assert.equal(hit.tag, "features");
    assert.equal(hit.key, "pages/Pricing.tsx." + hashText(v));
  }
  assert.equal(f.filter((x) => x.value === "Email support").length, 1, "the same bullet in two plans is one field");
  assert.ok(f.find((x) => x.value === "Starter"), "plain object props still work");
});
