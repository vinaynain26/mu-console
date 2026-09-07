/**
 * Pages from GitHub.
 *
 * The console does not render a Lovable site itself — the site renders on its
 * own deployment. What the console needs is the site's COPY: every string a
 * marketing person might want to change, keyed so that the same string in the
 * same file always gets the same key, whatever else moves around.
 *
 * So: clone the repo from GitHub (shallow, with the token), find the routes,
 * walk each route's component tree, and lift out of the real TypeScript AST:
 *
 *   - JSX text            <h2>Build Wealth</h2>            -> text, tag h2
 *   - data arrays         { city: 'Mumbai', growth: '18%' } -> text, one per prop
 *   - image imports       <img src={heroImage}>            -> media
 *   - a few attributes    alt, title, placeholder, href     -> text / link
 *
 * Keys are `<file>.<hash of the text>` — never positional, so a re-ingest
 * after Lovable edits keeps every field whose text survived, retires the ones
 * whose text is gone, and adds the new ones. Existing edits are never
 * overwritten.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import * as repo from "./repo.js";

const ROOT = import.meta.dirname;

/* ---------------- getting the source ---------------- */

export const repoSlug = (u) => String(u || "").replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/+$/, "");
const dirFor = (slug) => path.join(process.env.SRC_CLONE_DIR || path.join(ROOT, "data/src"), slug.replace("/", "--"));

/** A shallow clone of one branch, refreshed on every call. Returns its path. */
export async function fetchSource({ url, token, branch }) {
  const dir = dirFor(repoSlug(url));
  if (!fs.existsSync(path.join(dir, ".git"))) {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    await repo.git(["clone", "-q", "--depth", "1", "--branch", branch, url, dir], { token, timeout: 600e3 });
  } else {
    await repo.git(["fetch", "-q", "--depth", "1", "origin", branch], { cwd: dir, token, timeout: 600e3 });
    await repo.git(["checkout", "-q", "-B", branch, "FETCH_HEAD"], { cwd: dir });
  }
  const sha = await repo.git(["rev-parse", "HEAD"], { cwd: dir });
  return { dir, sha };
}

/* ---------------- reading the app ---------------- */

const read = (f) => fs.readFileSync(f, "utf8");
const exists = (f) => fs.existsSync(f);
const EXT = [".tsx", ".ts", ".jsx", ".js"];

function resolveImport(fromFile, spec, root) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;                                            // a package
  for (const e of ["", ...EXT, ...EXT.map((x) => "/index" + x)]) if (exists(base + e) && fs.statSync(base + e).isFile()) return base + e;
  return null;
}

function ast(file) {
  return parse(read(file), {
    sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true,
    attachComment: false,
  });
}

/** Depth-first over every node, with the JSX element stack for context. */
function walk(node, fn, stack = []) {
  if (!node || typeof node.type !== "string") return;
  fn(node, stack);
  const isEl = node.type === "JSXElement";
  if (isEl) stack.push(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end" || k === "extra" || k === "range") continue;
    const v = node[k];
    if (Array.isArray(v)) for (const x of v) walk(x, fn, stack);
    else if (v && typeof v.type === "string") walk(v, fn, stack);
  }
  if (isEl) stack.pop();
}

const elName = (el) => {
  const n = el?.openingElement?.name;
  if (!n) return "";
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXMemberExpression") return n.property.name;
  return "";
};

/** Imports of a file: local name -> { source, file } */
function importsOf(tree, file, root) {
  const out = new Map();
  for (const n of tree.program.body) {
    if (n.type !== "ImportDeclaration") continue;
    const resolved = resolveImport(file, n.source.value, root);
    for (const s of n.specifiers) out.set(s.local.name, { source: n.source.value, file: resolved });
  }
  return out;
}

/** Routes in a React Router app: [{ path, component, file }]. */
function routesOf(root) {
  const appFile = ["src/App.tsx", "src/App.jsx", "src/main.tsx"].map((f) => path.join(root, f)).find(exists);
  if (!appFile) return [];
  const tree = ast(appFile);
  const imports = importsOf(tree, appFile, root);
  const routes = [];
  walk(tree, (n) => {
    if (n.type !== "JSXElement" || elName(n) !== "Route") return;
    let p = null, comp = null;
    for (const a of n.openingElement.attributes) {
      if (a.type !== "JSXAttribute") continue;
      if (a.name.name === "path" && a.value?.type === "StringLiteral") p = a.value.value;
      if (a.name.name === "element" && a.value?.type === "JSXExpressionContainer") {
        const ex = a.value.expression;
        if (ex.type === "JSXElement") comp = elName(ex);
      }
    }
    if (p && comp && p !== "*" && imports.get(comp)?.file) routes.push({ path: p, component: comp, file: imports.get(comp).file });
  });
  return routes;
}

/* ---------------- what counts as copy ---------------- */

const SKIP_PROPS = new Set(["className", "class", "id", "key", "icon", "variant", "size", "type", "color", "bg",
  "gradient", "delay", "animation", "style", "target", "rel", "name", "htmlFor", "for", "to", "as", "ref", "src", "value",
  "width", "height", "loading", "decoding", "fill", "stroke", "viewBox", "d", "xmlns", "role", "tabIndex"]);
const TEXT_ATTRS = new Set(["alt", "title", "placeholder", "aria-label", "label", "subtitle", "description", "heading",
  "text", "cta", "caption", "eyebrow", "badge", "buttonText", "tagline"]);
const LINK_ATTRS = new Set(["href"]);
const MEDIA_RE = /\.(png|jpe?g|gif|webp|svg|avif|mp4|webm|mov)$/i;

/* A Tailwind class string is words like "bg-white/20 md:pt-32 [background-clip:x]":
   every token is class-shaped and most carry a hyphen or a colon. */
const isClassList = (s) => {
  const t = s.split(" ");
  return t.length > 1 && t.every((x) => /^[!a-z0-9\-\[\]\/:.%()#,_]+$/.test(x)) && t.filter((x) => /[-:]/.test(x)).length >= t.length / 2;
};
const looksLikeCopy = (s) => /[A-Za-z0-9ऀ-ॿ₹]/.test(s) && !/^[\w-]+:[\w-]+$/.test(s) && !/^(#|\/|https?:)/.test(s) && !isClassList(s);
/* inside a data object almost every string is copy — only the styling knobs are not */
const SKIP_DATA = new Set(["className", "class", "id", "key", "icon", "variant", "size", "type", "color", "bg", "gradient",
  "delay", "animation", "style", "src", "image", "video", "poster"]);
const clean = (s) => String(s).replace(/\s+/g, " ").trim();
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);
const humanize = (s) => s.replace(/\.[^.]+$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

/**
 * Every field in one component file, in source order.
 * Returns [{ key, label, tag, type, value, file }]
 */
function fieldsOf(file, root) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const tree = ast(file);
  const imports = importsOf(tree, file, root);
  const out = [], seen = new Set();
  const push = (value, { tag, type = "text", label }) => {
    if (type !== "media" && !looksLikeCopy(value)) return;
    const key = rel.replace(/^src\//, "") + "." + hash(value);
    if (seen.has(key)) return;                                 // same text twice = one field
    seen.add(key);
    out.push({ key, label: label || (value.length > 60 ? value.slice(0, 57) + "…" : value), tag, type, value, file: rel });
  };
  const assetPath = (localName) => {
    const im = imports.get(localName);
    if (!im || !MEDIA_RE.test(im.source)) return null;
    return im.file ? path.relative(root, im.file).split(path.sep).join("/") : im.source;
  };

  walk(tree, (n, stack) => {
    const parent = stack[stack.length - 1];
    if (n.type === "JSXText") {
      const v = clean(n.value);
      if (v) push(v, { tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXExpressionContainer" && (n.expression.type === "StringLiteral" || n.expression.type === "TemplateLiteral")) {
      /* {"text"} and {`text`} without expressions */
      const ex = n.expression;
      const v = ex.type === "StringLiteral" ? clean(ex.value) : ex.expressions.length ? "" : clean(ex.quasis.map((q) => q.value.cooked).join(""));
      if (v && stack.length && parent && n !== parent.openingElement) push(v, { tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXAttribute" && n.value) {
      const el = stack[stack.length - 1];
      const name = n.name.name, tag = elName(el);
      const custom = /^[A-Z]/.test(tag);
      if (n.value.type === "StringLiteral") {
        const v = clean(n.value.value);
        if (!v) return;
        if (LINK_ATTRS.has(name)) push(v, { tag: "href", type: "link", label: "Link: " + v });
        else if (TEXT_ATTRS.has(name) || (custom && !SKIP_PROPS.has(name) && v.length > 2)) push(v, { tag: name, label: v });
      } else if (name === "src" && n.value.type === "JSXExpressionContainer" && n.value.expression.type === "Identifier") {
        const p = assetPath(n.value.expression.name);
        if (p) push(p, { tag: "src", type: "media", label: "Image: " + path.basename(p) });
      }
    } else if (n.type === "ObjectProperty" && !stack.length) {
      /* data objects at module level (or inside module-level arrays) */
      const k = n.key.type === "Identifier" ? n.key.name : n.key.type === "StringLiteral" ? n.key.value : null;
      if (!k) return;
      if (n.value.type === "StringLiteral") {
        const v = clean(n.value.value);
        if (!v) return;
        if (LINK_ATTRS.has(k) || k === "url" || k === "link") push(v, { tag: k, type: "link", label: "Link: " + v });
        else if (!SKIP_DATA.has(k)) push(v, { tag: k, label: humanize(k) + ": " + (v.length > 40 ? v.slice(0, 37) + "…" : v) });
      } else if (n.value.type === "Identifier") {
        const p = assetPath(n.value.name);
        if (p) push(p, { tag: k, type: "media", label: humanize(k) + ": " + path.basename(p) });
      }
    }
  });
  return out;
}

/** Component files a route uses, in the order they first appear. */
function componentTree(entry, root) {
  const order = [], seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (/^src\/components\/ui\//.test(rel) || /\.d\.ts$/.test(rel)) return;     // shadcn primitives: not copy
    order.push(file);
    let tree;
    try { tree = ast(file); } catch { return; }
    const imports = importsOf(tree, file, root);
    // walk children in the order they are rendered, not the order they are imported
    const used = [];
    walk(tree, (n) => { if (n.type === "JSXElement") { const nm = elName(n); if (imports.get(nm)?.file && !used.includes(nm)) used.push(nm); } });
    for (const nm of used) visit(imports.get(nm).file);
    for (const [nm, im] of imports) if (im.file && !used.includes(nm) && /\.(tsx|jsx)$/.test(im.file)) visit(im.file);
  };
  visit(entry);
  return order;
}

/* ---------------- the whole thing ---------------- */

const slugFor = (routePath, home) => routePath === "/" ? home : routePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export function scan(root, { homeSlug = "home" } = {}) {
  const routes = routesOf(root);
  if (!routes.length) throw new Error("No <Route path=… element=…> found in src/App.tsx — is this a React Router app?");
  let title = null, lovableUrl = null;
  try { title = (read(path.join(root, "index.html")).match(/<title>([^<]*)<\/title>/) || [])[1]?.trim() || null; } catch { /* none */ }
  try { lovableUrl = (read(path.join(root, "README.md")).match(/https:\/\/lovable\.dev\/projects\/[0-9a-f-]+/) || [])[0] || null; } catch { /* none */ }
  const pages = [];
  for (const r of routes) {
    const files = componentTree(r.file, root);
    const sections = [];
    for (const f of files) {
      const fields = fieldsOf(f, root);
      if (!fields.length) continue;
      const rel = path.relative(root, f).split(path.sep).join("/");
      sections.push({ key: rel.replace(/^src\//, "").replace(/\.[^.]+$/, ""), title: humanize(path.basename(rel)), file: rel, fields });
    }
    /* "Masters Union Real Estate - Build Wealth…" is a browser title; the page is the bit before the dash */
    const siteName = title ? title.split(/\s+[-|–—]\s+/)[0].trim() : null;
    pages.push({ slug: slugFor(r.path, homeSlug), route: r.path, component: r.component, title: r.path === "/" ? (siteName || "Home") : humanize(r.component), sections });
  }
  return { title, lovableUrl, pages };
}

/**
 * Seed the console from a scan. Never overwrites a value someone has edited;
 * retires fields whose text is no longer in the source; brings back ones that are.
 */
export function seed(db, scanResult, { repoName, url, sha }) {
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info(pages)").all().map((c) => c.name);
  if (!cols.includes("repo")) db.exec("ALTER TABLE pages ADD COLUMN repo TEXT");
  if (!cols.includes("url")) db.exec("ALTER TABLE pages ADD COLUMN url TEXT");
  if (!cols.includes("ingested_sha")) db.exec("ALTER TABLE pages ADD COLUMN ingested_sha TEXT");

  const upPage = db.prepare(`INSERT INTO pages (slug, title, template, layout, source, repo, url, ingested_sha)
    VALUES (?, ?, '__external', 'main', 'github', ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET title = excluded.title, repo = excluded.repo, url = excluded.url, ingested_sha = excluded.ingested_sha, source = 'github', template = '__external'`);
  const ins = db.prepare(`INSERT INTO page_content
    (page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title, label, tag, type, multiline, ord, value, draft_value, updated_at, updated_by, retired)
    VALUES (?,?,?,?,?,'_all','Whole page',?,?,?,?,?,?,?,?,?,0)
    ON CONFLICT(page_slug, field_key) DO UPDATE SET
      section_key = excluded.section_key, section_title = excluded.section_title, section_ord = excluded.section_ord,
      label = excluded.label, tag = excluded.tag, type = excluded.type, multiline = excluded.multiline, ord = excluded.ord, retired = 0`);
  const retire = db.prepare("UPDATE page_content SET retired = 1 WHERE page_slug = ? AND retired = 0 AND field_key NOT IN (SELECT value FROM json_each(?))");

  const report = [];
  for (const p of scanResult.pages) {
    upPage.run(p.slug, p.title, repoName, url || null, sha || null);
    const keys = [];
    let added = 0, kept = 0;
    let sOrd = 0;
    for (const s of p.sections) {
      sOrd++;
      let ord = 0;
      for (const f of s.fields) {
        ord++;
        keys.push(f.key);
        const before = db.prepare("SELECT 1 FROM page_content WHERE page_slug = ? AND field_key = ?").get(p.slug, f.key);
        ins.run(p.slug, f.key, s.key, s.title, sOrd, f.label, f.tag, f.type, f.value.length > 80 ? 1 : 0, ord, f.value, f.value, now, "github");
        before ? kept++ : added++;
      }
    }
    const retired = retire.run(p.slug, JSON.stringify(keys)).changes;
    report.push({ slug: p.slug, title: p.title, route: p.route, sections: p.sections.length, fields: keys.length, added, kept, retired });
  }
  /* pages from this repo that no route declares any more: keep, mark */
  return report;
}

/** Clone + scan + seed, and write the manifest the runtime will need. */
export async function ingest(db, { url, token, branch, homeSlug = "home", siteUrl }) {
  const name = repoSlug(url);
  const { dir, sha } = await fetchSource({ url, token, branch });
  const result = scan(dir, { homeSlug });
  const report = seed(db, result, { repoName: name, url: siteUrl || result.lovableUrl, sha });
  const manifest = {
    repo: name, sha, at: new Date().toISOString(),
    pages: result.pages.map((p) => ({
      slug: p.slug, route: p.route,
      fields: p.sections.flatMap((s) => s.fields.map((f) => ({ key: f.key, file: f.file, type: f.type, text: f.value }))),
    })),
  };
  const mdir = path.join(ROOT, "data/manifests");
  fs.mkdirSync(mdir, { recursive: true });
  fs.writeFileSync(path.join(mdir, name.replace("/", "--") + ".json"), JSON.stringify(manifest, null, 2));
  return { repo: name, sha, pages: report };
}
