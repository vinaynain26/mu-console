#!/usr/bin/env node
/**
 * MANIFEST -> CMS PAGES.
 *
 * The Vite plugin writes .mu-cms/manifest.json during the app's build: every
 * key it instrumented, the original English, which source file it came from and
 * which page owns it. This turns that into rows the CMS serves.
 *
 *   node scripts/seed-from-manifest.mjs --manifest <path> [--apply]
 *
 * Runs as a dry run unless --apply is given, because it decides what an editor
 * sees and it is easier to read a plan than to undo a mistake.
 *
 * Existing values are NEVER overwritten. A key whose text a developer has since
 * changed arrives as a NEW key (the key is a hash of the English), so an
 * editor's override stays on the old one rather than silently replacing copy
 * somebody rewrote in code.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");

const manifestPath = arg("manifest");
if (!manifestPath || !fs.existsSync(manifestPath)) {
  console.error("usage: node scripts/seed-from-manifest.mjs --manifest <path/to/manifest.json> [--apply]");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const db = new DatabaseSync(path.join(ROOT, "data/content.db"));

/* A readable name for a source file, since that is what groups fields. */
/* "components-pg-layout-pghero" is a filename, not a name. An editor needs to
   recognise the part of the page they are looking at, so strip the plumbing and
   spell out the abbreviations the codebase uses. */
const WORDS = {
  pg: "Programme", ug: "Undergraduate", nav: "Navigation", cta: "Call to action",
  faq: "FAQ", ai: "AI", d2c: "D2C", tbm: "Tech & Business", hr: "HR",
  bottombar: "Bottom bar", mobilebottombar: "Mobile bottom bar",
  sectionnav: "Section navigation", homesections: "Home sections",
  widgetcarousel: "Widget carousel", pghero: "Hero", pgfaculty: "Faculty",
  pgcareers: "Careers", pgoutclass: "Outside the classroom", mastersvideos: "Videos",
  root: "Page shell", layout: "", index: "Home page",
};
const sectionTitle = (scope) => {
  const cleaned = scope.replace(/^routes-/, "").replace(/^components-/, "");
  const words = cleaned.split("-").filter(Boolean)
    .map((w) => (WORDS[w] !== undefined ? WORDS[w] : w))
    .filter(Boolean);
  if (!words.length) return "Content";
  const out = words.join(" ").replace(/\s+/g, " ").trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
};

const pageTitle = (slug) =>
  slug === manifest.homeSlug ? "Home"
    : slug === "shared" ? "Shared components"
      : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* group by page, then by source file, preserving the order they were found */
const pages = new Map();
manifest.fields.forEach((f, i) => {
  if (!pages.has(f.page)) pages.set(f.page, { scopes: new Map(), n: 0 });
  const p = pages.get(f.page);
  if (!p.scopes.has(f.scope)) p.scopes.set(f.scope, p.scopes.size);
  p.n++;
  f.__ord = i;
});

const now = new Date().toISOString();
const insPage = db.prepare("INSERT OR IGNORE INTO pages (slug,title,template,layout,source) VALUES (?,?,?,?,?)");
const insField = db.prepare(`INSERT OR IGNORE INTO page_content
  (page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title,
   label, tag, multiline, ord, value, draft_value, updated_at, updated_by, options)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const existing = db.prepare("SELECT 1 FROM page_content WHERE page_slug = ? AND field_key = ?");

let added = 0, already = 0;
for (const f of manifest.fields) {
  const page = pages.get(f.page);
  if (APPLY) {
    // instrumented pages are rendered by the app itself, not by a template here
    insPage.run(f.page, pageTitle(f.page), "__external", "__external", "instrumented");
  }
  if (existing.get(f.page, f.key)) { already++; continue; }
  added++;
  if (APPLY) {
    insField.run(
      f.page, f.key, f.scope, sectionTitle(f.scope), page.scopes.get(f.scope),
      "_all", "Whole page",
      f.value.slice(0, 70) + (f.value.length > 70 ? "…" : ""),
      f.tag, f.value.length > 90 ? 1 : 0, f.__ord,
      f.value, f.value, now, "import", null);
  }
}

console.log("");
console.log("  " + manifest.fields.length + " field(s) in the manifest across " + pages.size + " page(s)");
console.log("  " + added + " new, " + already + " already present (never overwritten)");
console.log("");
[...pages.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 12)
  .forEach(([slug, p]) => console.log("    " + String(p.n).padStart(5) + "  " + slug + "   (" + p.scopes.size + " source file(s))"));
if (pages.size > 12) console.log("    …and " + (pages.size - 12) + " more page(s)");
console.log("");
console.log(APPLY ? "  written to data/content.db\n" : "  dry run — re-run with --apply to write\n");
