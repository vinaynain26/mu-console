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
import { scopeFor, ownerFor, routeFor, makeKey } from "./keys.js";

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
  if (node.type === "ObjectProperty" && parent?.type === "ObjectExpression") node.__parentObj = parent;
  fn(node, stack, parent);
  const isEl = node.type === "JSXElement";
  if (isEl) stack.push(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end" || k === "extra" || k === "range" || k === "__parentObj") continue;
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

/** TanStack Start: one file per route under src/routes. __root is the layout. */
function tanstackRoutes(root) {
  const dir = path.join(root, "src/routes");
  if (!exists(dir)) return null;
  const routes = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/\.(tsx|jsx)$/.test(f) || f.startsWith("__") || f.startsWith("-")) continue;
    const rel = "src/routes/" + f;
    routes.push({ path: routeFor(rel), component: f.replace(/\.(tsx|jsx)$/, ""), file: path.join(root, rel) });
  }
  routes.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  const layout = ["__root.tsx", "__root.jsx"].map((f) => path.join(dir, f)).find(exists) || null;
  return { routes, layout };
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
/* Every occurrence carries `ctx` (where it sat) so a profile can accept or
   reject it by its own rules: jsxtext | container | attr | prop | arrayitem |
   condarm. `propName` is the attribute or property name, `onComponent` says
   whether an attribute sat on a capitalised component. */
export function collectCopy(tree) {
  const out = [];
  /* src={logo} and src={logoAsset.url} both trace back to an import whose
     filename is the picture's identity */
  const importSources = new Map();
  for (const node of tree.program.body) {
    if (node.type !== "ImportDeclaration") continue;
    for (const sp of node.specifiers) {
      if (sp.type === "ImportDefaultSpecifier" || sp.type === "ImportSpecifier") {
        importSources.set(sp.local.name, path.basename(node.source.value).replace(/\.asset\.json$/, ""));
      }
    }
  }
  const hintFor = (expr) => {
    let name = null;
    if (expr.type === "Identifier") name = expr.name;
    else if (expr.type === "MemberExpression" && expr.object.type === "Identifier" && expr.property.type === "Identifier" &&
             /^(url|src|default|href|image|img|photo)$/.test(expr.property.name)) name = expr.object.name;
    const h = name ? importSources.get(name) : null;
    return h && ASSET_RE.test(h) ? h : null;
  };
  /* what the plugin's generate(expr, { concise: true }) prints for the two shapes hintFor accepts */
  const exprCode = (expr) => expr.type === "Identifier" ? expr.name : expr.object.name + "." + expr.property.name;
  const propKey = (q) => q.key && (q.key.type === "Identifier" ? q.key.name : q.key.type === "StringLiteral" ? q.key.value : null);

  walk(tree, (n, stack, astParent) => {
    const parent = stack[stack.length - 1];
    /* {"literal"} as an attribute value, src={"/x.jpg"} or title={"…"}, is
       not element text, and the plugin has no rule for it either */
    const inAttr = astParent?.type === "JSXAttribute";
    if (n.type === "JSXText") {
      const v = clean(n.value);
      if (v) out.push({ node: n, kind: "jsxtext", ctx: "jsxtext", value: v, tag: (elName(parent) || "text").toLowerCase() });
    } else if (n.type === "JSXExpressionContainer" && !inAttr && n.expression.type === "ConditionalExpression" && stack.length && parent && n !== parent.openingElement) {
      /* {open ? "Hide details" : "View details"}: both arms are copy */
      for (const arm of [n.expression.consequent, n.expression.alternate]) {
        if (arm.type !== "StringLiteral") continue;
        const v = clean(arm.value);
        if (v) out.push({ node: arm, kind: "string", ctx: "container", value: v, tag: (elName(parent) || "text").toLowerCase(), condJsx: n });
      }
    } else if (n.type === "JSXExpressionContainer" && !inAttr && (n.expression.type === "StringLiteral" || n.expression.type === "TemplateLiteral")) {
      const ex = n.expression;
      const v = ex.type === "StringLiteral" ? clean(ex.value) : ex.expressions.length ? "" : clean(ex.quasis.map((q) => q.value.cooked).join(""));
      if (v && stack.length && parent && n !== parent.openingElement) {
        out.push({ node: ex, kind: ex.type === "StringLiteral" ? "string" : "template", ctx: "container", value: v, tag: (elName(parent) || "text").toLowerCase() });
      }
    } else if (n.type === "JSXAttribute" && n.value?.type === "JSXExpressionContainer" && n.value.expression.type === "ArrayExpression") {
      const tag = elName(stack[stack.length - 1]);
      const name = n.name.type === "JSXNamespacedName" ? n.name.namespace.name + "-" + n.name.name.name : n.name.name;
      const onComponent = /^[A-Z]/.test(tag);
      for (const el of n.value.expression.elements) {
        if (el?.type !== "StringLiteral") continue;
        const v = clean(el.value);
        if (v) out.push({ node: el, kind: "string", ctx: "attrarray", value: v, tag: name, label: v, propName: name, onComponent, elName: tag, attrArray: n });
      }
    } else if (n.type === "JSXAttribute" && n.value && TARGET_ATTRS[n.name.name] && n.name.type === "JSXIdentifier") {
      /* a link target or a picture source on an element */
      const kind = TARGET_ATTRS[n.name.name];
      if (n.value.type === "StringLiteral") {
        const v = n.value.value;
        if (v && !/^[#?]/.test(v)) out.push({ node: n.value, kind: "string", ctx: kind, value: v, keyText: kind + ":" + v, tag: n.name.name, type: kind, label: kind === "media" ? path.basename(v) : v });
      } else if (n.value.type === "JSXExpressionContainer" && n.value.expression.type !== "JSXEmptyExpression") {
        const hint = hintFor(n.value.expression);
        /* `container` is the {…} around the expression: a write-back replaces
           all of it with a plain attribute, src="…", because src={"…"} is a
           form neither the plugin nor this scan reads as a picture */
        if (hint) out.push({ node: n.value.expression, container: n.value, kind: "expr", ctx: kind, value: "", keyText: kind + ":" + exprCode(n.value.expression), tag: n.name.name, type: kind, label: hint });
      }
    } else if (n.type === "JSXAttribute" && n.value?.type === "StringLiteral") {
      const tag = elName(stack[stack.length - 1]);
      const name = n.name.type === "JSXNamespacedName" ? n.name.namespace.name + "-" + n.name.name.name : n.name.name;
      const onComponent = /^[A-Z]/.test(tag);
      const v = clean(n.value.value);
      if (v) out.push({ node: n.value, kind: "string", ctx: "attr", value: v, tag: name, label: v, propName: name, onComponent, elName: tag });
    } else if (n.type === "ObjectProperty" && !stack.length && n.__parentObj && MEDIA_PROPS.has(propKey(n)) && n.__parentObj.type !== "ObjectPattern") {
      /* a picture in the data: image: mu01, img: "/…/x.webp", or an empty slot */
      const k = propKey(n), val = n.value;
      if (val.type === "StringLiteral" && !val.value) {
        const sib = (n.__parentObj.properties || []).map((q) => {
          const kk = propKey(q);
          if (!kk || !/^(title|name|label|heading|headline)$/.test(kk)) return null;
          return q.type === "ObjectProperty" && q.value.type === "StringLiteral" ? q.value.value : null;
        }).find(Boolean);
        if (sib) out.push({ node: val, kind: "string", ctx: "media", value: "", keyText: "media-slot:" + sib, tag: "src", type: "media", label: sib.slice(0, 70), prop: n });
      } else if (val.type === "StringLiteral") {
        if (/[./]/.test(val.value)) out.push({ node: val, kind: "string", ctx: "media", value: val.value, keyText: "media:" + val.value, tag: "src", type: "media", label: path.basename(val.value), prop: n });
      } else {
        const hint = hintFor(val);
        if (hint) out.push({ node: val, kind: "expr", ctx: "media", value: "", keyText: "media:import:" + hint, tag: "src", type: "media", label: hint, prop: n });
      }
    } else if (n.type === "ObjectProperty" && !stack.length && n.__parentObj && LINK_PROPS.has(propKey(n)) && n.__parentObj.type !== "ObjectPattern" && n.value.type === "StringLiteral") {
      const v = n.value.value;
      if (/^(\/|https?:)/.test(v) && !/^\/\//.test(v)) out.push({ node: n.value, kind: "string", ctx: "link", value: v, keyText: "link:" + v, tag: "href", type: "link", label: v, prop: n });
    } else if (n.type === "ObjectProperty" && !stack.length) {
      const k = n.key.type === "Identifier" ? n.key.name : n.key.type === "StringLiteral" ? n.key.value : null;
      if (!k) return;
      const label = (v) => humanize(k) + ": " + (v.length > 40 ? v.slice(0, 37) + "…" : v);
      const meta = isMetaShape(n);
      if (n.value.type === "StringLiteral") {
        const v = clean(n.value.value);
        if (v) out.push({ node: n.value, kind: "string", ctx: "prop", value: v, tag: k, label: label(v), prop: n, propName: k, meta });
      } else if (n.value.type === "ArrayExpression") {
        /* A plain list of strings is copy too: a plan's feature bullets, a
           set of chips. Each item is its own field; the property carries the
           whole array, so the build wraps the property rather than the item
           (see `arrayProp`) or a module-level array would freeze at boot. */
        for (const el of n.value.elements) {
          if (el?.type !== "StringLiteral") continue;
          const v = clean(el.value);
          if (v) out.push({ node: el, kind: "string", ctx: "arrayitem", value: v, tag: k, label: label(v), arrayProp: n, propName: k, meta });
        }
      } else if (n.value.type === "ConditionalExpression") {
        /* status: closed ? "Round closed" : "Apply now": both arms are copy */
        for (const arm of [n.value.consequent, n.value.alternate]) {
          if (arm.type !== "StringLiteral") continue;
          const v = clean(arm.value);
          if (v) out.push({ node: arm, kind: "string", ctx: "condarm", value: v, tag: k, label: label(v), condProp: n, propName: k, meta });
        }
      }
    }
  });
  return out;
}

/* head() metadata, {name:"twitter:card", content:…}, is machine config
   wearing copy-prop names; nothing in it is editable. */
const isMetaShape = (prop) => {
  const obj = prop.__parentObj;   // set by walk below when available
  const props = obj?.properties || [];
  return props.some((q) => {
    const kk = q.key && (q.key.type === "Identifier" ? q.key.name : q.key.type === "StringLiteral" ? q.key.value : null);
    return kk === "content" || kk === "property" || kk === "rel" || kk === "charSet" || kk === "charset";
  });
};

/* ---------------- the Hero Launch rules, mirrored from the Vite plugin ---------------- */

const COPY_PROPS = new Set([
  "label", "title", "subtitle", "heading", "subheading", "text", "desc", "description",
  "body", "caption", "quote", "cta", "ctaLabel", "buttonText", "name", "role", "value",
  "stat", "statLabel", "eyebrow", "kicker", "blurb", "summary", "question", "answer",
  "placeholder", "alt", "tagline", "note", "detail", "prefix", "suffix", "unit",
  "headline", "pullQuote", "closing", "tag", "chips", "proof",
  "month", "day", "time", "source", "duration", "format", "round", "status",
  "mode", "audience", "audiences", "timezone", "location", "country", "about",
  "shortName", "facts", "notes", "extras", "tags", "items", "kind", "nextTime",
  "company", "credential",
  "titleItalic", "lede", "action", "designation", "chapter", "links",
]);
const STAT_PROPS = new Set(["value", "stat", "statLabel", "delta", "pct", "prefix", "suffix", "unit", "n"]);
const COPY_ATTRS = new Set(["alt", "title", "placeholder", "aria-label"]);
const MEDIA_PROPS = new Set(["image", "img", "icon", "logo", "avatar", "photo", "poster", "video", "thumbnail", "thumb", "src"]);
const LINK_PROPS = new Set(["href", "applyHref", "viewAllHref", "route", "link"]);
const TARGET_ATTRS = { href: "link", to: "link", src: "media", poster: "media" };
const ASSET_RE = /\.(png|jpe?g|webp|svg|gif|avif|mp4|webm|mov)$/i;

const isCopy = (s) => {
  const v = String(s).trim();
  if (v.length < 2 || v.length > 400) return false;
  if (!/[A-Za-z]{2}/.test(v)) return false;
  if (/^https?:|^\/\/|^data:|^#[0-9a-f]{3,8}$/i.test(v)) return false;
  if (/^[a-z0-9-]+$/.test(v) && !v.includes(" ")) return false;
  if (/[;{}]|:\s*[\d.]+(px|rem|em|%)/.test(v)) return false;
  if (/(system-ui|sans-serif|monospace|SFMono|ui-monospace)/.test(v)) return false;
  return true;
};
const isShortDisplay = (s) => {
  const v = String(s).trim();
  if (!v || v.length > 40) return false;
  if (/^https?:|^\/\/|^data:|^#[0-9a-f]{3,8}$/i.test(v)) return false;
  if (/[;{}]|:\s*[\d.]+(px|rem|em|%)/.test(v)) return false;
  if (/(system-ui|sans-serif|monospace|SFMono|ui-monospace)/.test(v)) return false;
  return true;
};

export const PROFILES = {
  /* the demo profile: keys carry the extension and an 8-char hash, the same
     text twice in a file is one field, shared components repeat per page */
  lab: {
    name: "lab",
    skipDir: /^src\/components\/ui\//,
    accepts(o) {
      if (!looksLikeCopy(o.value)) return false;
      if (o.ctx === "attr" || o.ctx === "attrarray") return TEXT_ATTRS.has(o.propName) || (o.onComponent && !SKIP_PROPS.has(o.propName) && o.value.length > 2);
      if (o.ctx === "prop" || o.ctx === "arrayitem") return !SKIP_DATA.has(o.propName);
      if (o.ctx === "condarm" || o.ctx === "media" || o.ctx === "link") return false;
      return true;
    },
    scope: (rel) => rel.replace(/^src\//, ""),
    key: (scope, text, seen) => { const k = scope + "." + hashText(text); if (seen.has(k)) return null; seen.add(k); return k; },
    newSeen: () => new Set(),
    sectionKey: (rel) => rel.replace(/^src\//, "").replace(/\.[^.]+$/, ""),
  },
  /* the Hero Launch profile: the Vite plugin's identity and rules */
  plugin: {
    name: "plugin",
    skipDir: null,                                             // the plugin instruments components/ui too
    accepts(o, extra = new Set()) {
      if (o.meta) return false;
      const byProp = (k, v) => ((COPY_PROPS.has(k) || extra.has(k)) && isCopy(v)) || ((STAT_PROPS.has(k) || extra.has(k)) && isShortDisplay(v));
      if (o.ctx === "media" || o.ctx === "link") return true;
      if (o.ctx === "jsxtext" || o.ctx === "container") return isCopy(o.value);
      if (o.ctx === "attr") return (COPY_ATTRS.has(o.propName) && isCopy(o.value)) || (o.onComponent && byProp(o.propName, o.value));
      if (o.ctx === "attrarray") return o.onComponent && byProp(o.propName, o.value);
      return byProp(o.propName, o.value);                     // prop, arrayitem, condarm
    },
    scope: (rel) => scopeFor(rel),
    key: (scope, text, seen) => makeKey(scope, text, seen),
    newSeen: () => new Map(),
    sectionKey: (rel) => scopeFor(rel),
  },
};

/** Every field in one component file, in source order. */
function fieldsOf(file, root, profile) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const scope = profile.scope(rel);
  const src = read(file);
  /* "// @mu-copy v,l": this file's data uses short prop names that are copy */
  const extra = new Set((src.match(/@mu-copy\s+([\w,\s]+)/) || ["", ""])[1].split(/[,\s]+/).filter(Boolean));
  const out = [], seen = profile.newSeen();
  for (const o of collectCopy(parse(src, PARSE_OPTS))) {
    if (!profile.accepts(o, extra)) continue;
    const key = profile.key(scope, o.keyText ?? o.value, seen);
    if (!key) continue;                                        // lab: same text twice = one field
    out.push({ key, label: o.label || (o.value.length > 60 ? o.value.slice(0, 57) + "…" : o.value), tag: o.tag, type: o.type || "text", value: o.value, file: rel });
  }
  return out;
}

/** Component files a route uses, in the order they first appear. */
function componentTree(entry, root, profile = PROFILES.lab) {
  const order = [], seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const rel = path.relative(root, file).split(path.sep).join("/");
    if ((profile.skipDir && profile.skipDir.test(rel)) || /\.d\.ts$/.test(rel)) return;
    order.push(file);
    let tree;
    try { tree = ast(file); } catch { return; }
    const imports = importsOf(tree, file, root);
    const used = [];
    walk(tree, (n) => { if (n.type === "JSXElement") { const nm = elName(n); if (imports.get(nm)?.file && !used.includes(nm)) used.push(nm); } });
    for (const nm of used) visit(imports.get(nm).file);
    /* data files matter as much as markup: chapters.ts alone carries a whole
       dossier of copy, so .ts imports are followed too (never .d.ts) */
    for (const [nm, im] of imports) if (im.file && !used.includes(nm) && /\.(tsx|jsx|ts|js)$/.test(im.file) && !/\.d\.ts$/.test(im.file)) visit(im.file);
  };
  visit(entry);
  return order;
}

const slugFor = (routePath, home) => routePath === "/" ? home : routePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export function scan(root, { homeSlug = "home", profile: profileName } = {}) {
  const ts = tanstackRoutes(root);
  const profile = PROFILES[profileName || (ts ? "plugin" : "lab")];
  let title = null;
  if (ts) {
    /* the title lives in the root route's head(): { title: "…" } */
    try { title = (read(ts.layout || "").match(/\btitle:\s*["'\`]([^"'\`]+)["'\`]/) || [])[1]?.trim() || null; } catch { /* none */ }
  } else {
    try { title = (read(path.join(root, "index.html")).match(/<title>([^<]*)<\/title>/) || [])[1]?.trim() || null; } catch { /* none */ }
  }
  const siteName = title ? title.split(/\s+[-|–—]\s+/)[0].trim() : null;
  const section = (f) => {
    const fields = fieldsOf(f, root, profile);
    if (!fields.length) return null;
    const rel = path.relative(root, f).split(path.sep).join("/");
    return { key: profile.sectionKey(rel), title: humanize(path.basename(rel)), file: rel, fields };
  };

  if (ts) {
    /* Route files own pages. Every other file reachable from a route or the
       layout is `shared`, listed once, however many pages render it. */
    const pages = [], sharedFiles = new Map();
    const claim = (f) => { const rel = path.relative(root, f).split(path.sep).join("/"); if (ownerFor(rel, homeSlug) === "shared") sharedFiles.set(f, rel); };
    if (ts.layout) for (const f of componentTree(ts.layout, root, profile)) claim(f);
    for (const r of ts.routes) {
      const rel = path.relative(root, r.file).split(path.sep).join("/");
      const own = section(r.file);
      for (const f of componentTree(r.file, root, profile)) if (f !== r.file) claim(f);
      pages.push({ slug: ownerFor(rel, homeSlug), route: r.path, component: r.component,
        title: r.path === "/" ? (siteName || "Home") : humanize(r.component), sections: own ? [own] : [] });
    }
    const shared = [];
    for (const f of sharedFiles.keys()) { const s = section(f); if (s) shared.push(s); }
    pages.push({ slug: "shared", route: null, component: null, title: "Shared", sections: shared });
    return { title, profile: profile.name, pages };
  }

  const routes = routesOf(root);
  if (!routes.length) throw new Error("No <Route path=… element=…> found in src/App.tsx, and no src/routes folder. Is this a React app?");
  const pages = [];
  for (const r of routes) {
    const sections = [];
    for (const f of componentTree(r.file, root, profile)) { const s = section(f); if (s) sections.push(s); }
    pages.push({ slug: slugFor(r.path, homeSlug), route: r.path, component: r.component,
      title: r.path === "/" ? (siteName || "Home") : humanize(r.component), sections });
  }
  return { title, profile: profile.name, pages };
}
