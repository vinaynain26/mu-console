/**
 * Copy out of a Vite plus React Router app, straight from the TypeScript AST.
 *
 *   - JSX text            <h2>Build Wealth</h2>            -> text, tag h2
 *   - {"literal"} / {`t`} inside an element               -> text
 *   - data objects        { title: "Mumbai" }             -> text, one per prop
 *   - a few attributes    alt, title, placeholder, label  -> text
 *
 * Keys are `<file under src>.<hash of the text>`, never positional, so a
 * rescan after Lovable edits keeps every field whose text survived.
 * Pure: reads files, touches no database.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "@babel/parser";

const read = (f) => fs.readFileSync(f, "utf8");
const exists = (f) => fs.existsSync(f);
const EXT = [".tsx", ".ts", ".jsx", ".js"];

export const clean = (s) => String(s).replace(/\s+/g, " ").trim();
export const hashText = (s) => crypto.createHash("sha1").update(clean(s)).digest("hex").slice(0, 8);
export function keyParts(key) {
  const i = key.lastIndexOf(".");
  const scope = key.slice(0, i);
  return { scope, hash: key.slice(i + 1), file: "src/" + scope };
}

export const PARSE_OPTS = { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true, attachComment: false };
export const ast = (file) => parse(read(file), PARSE_OPTS);

function resolveImport(fromFile, spec, root) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const e of ["", ...EXT, ...EXT.map((x) => "/index" + x)]) {
    if (exists(base + e) && fs.statSync(base + e).isFile()) return base + e;
  }
  return null;
}

/** Depth-first over every node, with the JSX element stack for context. */
export function walk(node, fn, stack = [], parent = null) {
  if (!node || typeof node.type !== "string") return;
  fn(node, stack, parent);
  const isEl = node.type === "JSXElement";
  if (isEl) stack.push(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end" || k === "extra" || k === "range") continue;
    const v = node[k];
    if (Array.isArray(v)) for (const x of v) walk(x, fn, stack, node);
    else if (v && typeof v.type === "string") walk(v, fn, stack, node);
  }
  if (isEl) stack.pop();
}

export const elName = (el) => {
  const n = el?.openingElement?.name;
  if (!n) return "";
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXMemberExpression") return n.property.name;
  return "";
};

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
      if (a.name.name === "element" && a.value?.type === "JSXExpressionContainer" && a.value.expression.type === "JSXElement") {
        comp = elName(a.value.expression);
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
const SKIP_DATA = new Set(["className", "class", "id", "key", "icon", "variant", "size", "type", "color", "bg", "gradient",
  "delay", "animation", "style", "src", "image", "video", "poster", "href", "url", "link"]);

const isClassList = (s) => {
  const t = s.split(" ");
  return t.length > 1 && t.every((x) => /^[!a-z0-9\-\[\]\/:.%()#,_]+$/.test(x)) && t.filter((x) => /[-:]/.test(x)).length >= t.length / 2;
};
export const looksLikeCopy = (s) => /[A-Za-z0-9ऀ-ॿ₹]/.test(s) && !/^[\w-]+:[\w-]+$/.test(s) && !/^(#|\/|https?:)/.test(s) && !isClassList(s);
const humanize = (s) => s.replace(/\.[^.]+$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

/**
 * Every copy occurrence in a parsed file, in source order, duplicates
 * included. The scanner dedupes these into fields; write-back uses the node
 * positions. One collector, so the two can never disagree about what is copy.
 */
export function collectCopy(tree) {
  const out = [];
  walk(tree, (n, stack) => {
    const parent = stack[stack.length - 1];
    if (n.type === "JSXText") {
      const v = clean(n.value);
      if (v) out.push({ node: n, kind: "jsxtext", value: v, tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXExpressionContainer" && (n.expression.type === "StringLiteral" || n.expression.type === "TemplateLiteral")) {
      const ex = n.expression;
      const v = ex.type === "StringLiteral" ? clean(ex.value) : ex.expressions.length ? "" : clean(ex.quasis.map((q) => q.value.cooked).join(""));
      if (v && stack.length && parent && n !== parent.openingElement) {
        out.push({ node: ex, kind: ex.type === "StringLiteral" ? "string" : "template", value: v, tag: (elName(parent) || "text").toLowerCase() });
      }
    } else if (n.type === "JSXAttribute" && n.value?.type === "StringLiteral") {
      const tag = elName(stack[stack.length - 1]);
      const name = n.name.name, custom = /^[A-Z]/.test(tag);
      const v = clean(n.value.value);
      if (v && (TEXT_ATTRS.has(name) || (custom && !SKIP_PROPS.has(name) && v.length > 2))) {
        out.push({ node: n.value, kind: "string", value: v, tag: name, label: v });
      }
    } else if (n.type === "ObjectProperty" && !stack.length && n.value.type === "StringLiteral") {
      const k = n.key.type === "Identifier" ? n.key.name : n.key.type === "StringLiteral" ? n.key.value : null;
      if (!k || SKIP_DATA.has(k)) return;
      const v = clean(n.value.value);
      if (v) out.push({ node: n.value, kind: "string", value: v, tag: k, label: humanize(k) + ": " + (v.length > 40 ? v.slice(0, 37) + "…" : v), prop: n });
    }
  });
  return out;
}

/** Every field in one component file, in source order. */
function fieldsOf(file, root) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const scope = rel.replace(/^src\//, "");
  const out = [], seen = new Set();
  for (const o of collectCopy(ast(file))) {
    if (!looksLikeCopy(o.value)) continue;
    const key = scope + "." + hashText(o.value);
    if (seen.has(key)) continue;                               // same text twice = one field
    seen.add(key);
    out.push({ key, label: o.label || (o.value.length > 60 ? o.value.slice(0, 57) + "…" : o.value), tag: o.tag, type: "text", value: o.value, file: rel });
  }
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
    const used = [];
    walk(tree, (n) => { if (n.type === "JSXElement") { const nm = elName(n); if (imports.get(nm)?.file && !used.includes(nm)) used.push(nm); } });
    for (const nm of used) visit(imports.get(nm).file);
    for (const [nm, im] of imports) if (im.file && !used.includes(nm) && /\.(tsx|jsx)$/.test(im.file)) visit(im.file);
  };
  visit(entry);
  return order;
}

const slugFor = (routePath, home) => routePath === "/" ? home : routePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export function scan(root, { homeSlug = "home" } = {}) {
  const routes = routesOf(root);
  if (!routes.length) throw new Error("No <Route path=… element=…> found in src/App.tsx. Is this a React Router app?");
  let title = null;
  try { title = (read(path.join(root, "index.html")).match(/<title>([^<]*)<\/title>/) || [])[1]?.trim() || null; } catch { /* none */ }
  const siteName = title ? title.split(/\s+[-|–—]\s+/)[0].trim() : null;
  const pages = [];
  for (const r of routes) {
    const sections = [];
    for (const f of componentTree(r.file, root)) {
      const fields = fieldsOf(f, root);
      if (!fields.length) continue;
      const rel = path.relative(root, f).split(path.sep).join("/");
      sections.push({ key: rel.replace(/^src\//, "").replace(/\.[^.]+$/, ""), title: humanize(path.basename(rel)), file: rel, fields });
    }
    pages.push({ slug: slugFor(r.path, homeSlug), route: r.path, component: r.component,
      title: r.path === "/" ? (siteName || "Home") : humanize(r.component), sections });
  }
  return { title, pages };
}
