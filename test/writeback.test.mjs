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

test("a string array item is replaced on its own, leaving its neighbours alone", () => {
  const { out } = rewrite(PRICING, "10 automated workflows", "20 automated workflows");
  assert.equal(out, PRICING.replace('"10 automated workflows"', '"20 automated workflows"'));
  assert.ok(out.includes('"Up to 5 team members"'), "the item before it is untouched");
});

test("a bullet shared by two plans is rewritten in both, matching the one-field rule", () => {
  const { out, hits } = rewrite(PRICING, "Email support", "Chat support");
  assert.equal(hits.length, 2);
  assert.equal((out.match(/Chat support/g) || []).length, 2);
});
