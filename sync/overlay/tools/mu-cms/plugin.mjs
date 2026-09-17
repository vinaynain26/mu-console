/**
 * MU CMS — build-time instrumentation.
 *
 * Rewrites the app's own source so every piece of copy comes from the CMS at
 * render, with the original English as the fallback. Nothing is scraped and
 * nothing is converted, so every animation, carousel and scroll effect keeps
 * working exactly as written — this plugin never touches a component wrapper,
 * only the strings inside it.
 *
 *   <h1>Careers</h1>
 *     ->  <h1 data-c="routes-placements.9a1c0f3">{__mu("routes-placements.9a1c0f3","Careers")}</h1>
 *
 *   { label: "Offers per student" }
 *     ->  { label: __mu("routes-placements.4d7e21b","Offers per student") }
 *
 * That second form matters more than the first here: 88% of this site's copy
 * lives in data structures, not in JSX.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { scopeFor, ownerFor, makeKey, hashText } from "./keys.mjs";

const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

/* Property names whose string values are copy a person should be able to edit.
   Everything else — className, style, id, type, variant, href, src, font
   stacks — stays untouchable, because letting someone "fix a typo" in a font
   stack or a class name breaks the page. */
const COPY_PROPS = new Set([
  "label", "title", "subtitle", "heading", "subheading", "text", "desc", "description",
  "body", "caption", "quote", "cta", "ctaLabel", "buttonText", "name", "role", "value",
  "stat", "statLabel", "eyebrow", "kicker", "blurb", "summary", "question", "answer",
  "placeholder", "alt", "tagline", "note", "detail", "prefix", "suffix", "unit",
  "headline", "pullQuote", "closing", "tag", "chips", "proof",
  // card metadata a marketer plainly needs to change: dates, sources, formats
  "month", "day", "time", "source", "duration", "format", "round", "status",
  "mode", "audience", "audiences", "timezone", "location", "country", "about",
  "shortName", "facts", "notes", "extras", "tags", "items", "kind", "nextTime",
  "company", "credential",
  // split headlines and section copy: <em>actually did it.</em> is titleItalic
  "titleItalic", "lede", "action", "designation", "chapter", "links",
]);

/* Where a card's button goes, and when its round closes — content decisions
   living in data. Dates fail the copy heuristic (no words) so they get their
   own gate; both wrap as getters like everything else. */
const LINK_PROPS = new Set(["href", "applyHref", "viewAllHref", "route", "link"]);
const DATE_PROPS = new Set(["deadline", "nextDate", "date"]);

/* Attributes that are visible copy rather than plumbing. */
const COPY_ATTRS = new Set(["alt", "title", "placeholder", "aria-label"]);

/* Object properties that hold a picture or a clip. The value is usually an
   imported asset rather than a string, so these wrap like src attributes do:
   original as fallback, empty CMS value until an editor sets one. */
const MEDIA_PROPS = new Set([
  "image", "img", "icon", "logo", "avatar", "photo", "poster", "video",
  "thumbnail", "thumb", "src",
]);

/* Where a link goes and which image is shown are content decisions, not code.
   The value is often an expression rather than a literal — an imported asset,
   a template string — so these are wrapped rather than replaced, keeping the
   original as the fallback. */
const TARGET_ATTRS = { href: "link", to: "link", src: "media", poster: "media" };

/* Props whose value is a headline number rather than words: "40%", "₹61.98L",
   "500+", "3.03×". These fail isCopy (no two consecutive letters) by design —
   isCopy guards prop names like `title` that also carry machine tokens. For
   these few names the value IS the display, so a looser gate applies. */
const STAT_PROPS = new Set([
  "value", "stat", "statLabel", "delta", "pct", "prefix", "suffix", "unit", "n",
]);
const isShortDisplay = (s) => {
  const v = String(s).trim();
  if (!v || v.length > 40) return false;
  if (/^https?:|^\/\/|^data:|^#[0-9a-f]{3,8}$/i.test(v)) return false;   // urls, colours
  if (/[;{}]|:\s*[\d.]+(px|rem|em|%)/.test(v)) return false;             // css
  if (/(system-ui|sans-serif|monospace|SFMono|ui-monospace)/.test(v)) return false;
  return true;
};

/* Route head() blocks pass {name, content} / {property, content} objects whose
   `name` is a machine token ("twitter:card"), not copy. An object with one of
   these sibling props is head metadata, and nothing in it is editable. */
const isMetaShape = (obj) => (obj && obj.properties || []).some((q) => {
  const kk = q.key && (t.isIdentifier(q.key) ? q.key.name
    : t.isStringLiteral(q.key) ? q.key.value : null);
  return kk === "content" || kk === "property" || kk === "rel" || kk === "charSet" || kk === "charset";
});

/* Why a GETTER and not `label: __mu(...)`: most of this data lives in
   module-level consts, and a module initialises on the server ONCE, at boot,
   before any request has loaded content — so an eager call freezes the
   fallback into the data forever and the server renders original English
   while the client renders the CMS value. That mismatch is React #418 on
   every page that carries a published edit. A getter defers the lookup to
   the moment of access — render time — on both sides. */
const replaceWithGetter = (p, expr) => {
  const key = p.node.key;
  const method = t.objectMethod("get", key, [],
    t.blockStatement([t.returnStatement(expr)]), false);
  p.replaceWith(method);
  p.skip();
};

const isCopy = (s) => {
  const v = String(s).trim();
  if (v.length < 2 || v.length > 400) return false;
  if (!/[A-Za-z]{2}/.test(v)) return false;              // numbers, symbols, icons
  if (/^https?:|^\/\/|^data:|^#[0-9a-f]{3,8}$/i.test(v)) return false;  // urls, colours
  if (/^[a-z0-9-]+$/.test(v) && !v.includes(" ")) return false;         // class/id/slug tokens
  if (/[;{}]|:\s*[\d.]+(px|rem|em|%)/.test(v)) return false;            // css
  if (/(system-ui|sans-serif|monospace|SFMono|ui-monospace)/.test(v)) return false;  // font stacks
  return true;
};

export default function muCms(options = {}) {
  const root = options.root || process.cwd();
  const homeSlug = options.homeSlug || "mu-home";
  const manifestPath = options.manifest || path.join(root, ".mu-cms/manifest.json");
  const runtime = options.runtime || "@/mu-cms-runtime";
  const entries = new Map();      // key -> field record

  return {
    name: "mu-cms",
    enforce: "pre",

    transform(code, id) {
      const file = id.split("?")[0];
      /* .ts is data, not markup — chapters.ts alone carries a 10-chapter
         dossier no one could edit while only .tsx was instrumented. */
      if (!/\.(tsx|jsx|ts)$/.test(file) || /\.d\.ts$/.test(file)) return null;
      if (file.includes("node_modules") || file.includes("/tools/mu-cms/")) return null;
      if (/mu-cms-runtime|\/server\.ts$/.test(file)) return null;
      if (!file.startsWith(root)) return null;
      const isPlainTs = /\.ts$/.test(file);

      const scope = scopeFor(file, root);
      const owner = ownerFor(file, root, homeSlug);
      const seen = new Map();
      let touched = 0;

      /* A data file can opt extra prop names in with a leading comment,
         `@mu-copy v,l` — for files whose keys are too short or too generic
         to put in the global whitelist without collateral damage. */
      const extra = (code.match(/@mu-copy\s+([\w$,\s]+?)\s*(?:\*\/|\n)/) || [])[1];
      const extraProps = new Set(extra ? extra.split(",").map((s) => s.trim()).filter(Boolean) : []);
      const copyProps = extraProps.size ? new Set([...COPY_PROPS, ...extraProps]) : COPY_PROPS;
      // an opted-in prop may hold a bare figure ("33%") as well as words
      const statProps = extraProps.size ? new Set([...STAT_PROPS, ...extraProps]) : STAT_PROPS;

      let ast;
      try {
        ast = parse(code, {
          sourceType: "module",
          // jsx syntax is ambiguous with generics in a plain .ts file
          plugins: [...(isPlainTs ? [] : ["jsx"]), "typescript", "decorators-legacy", "explicitResourceManagement"],
        });
      } catch {
        return null;   // never break a build over instrumentation
      }

      const record = (key, value, kind, tag, hint, type) => {
        entries.set(key, { key, page: owner, scope, kind, tag: tag || kind, value,
          type: type || (kind === "media" ? "media" : kind === "link" ? "link" : "text"),
          ...(hint ? { hint } : {}), file: path.relative(root, file) });
      };

      /* import name -> the filename it brings in, so an asset-valued field can
         say which picture it is even though its CMS value starts empty. */
      const importSources = new Map();
      for (const node of ast.program.body) {
        if (!t.isImportDeclaration(node)) continue;
        for (const s of node.specifiers) {
          if (t.isImportDefaultSpecifier(s) || t.isImportSpecifier(s)) {
            importSources.set(s.local.name, path.basename(node.source.value).replace(/\.asset\.json$/, ""));
          }
        }
      }
      const call = (key, value) =>
        t.callExpression(t.identifier("__mu"), [t.stringLiteral(key), t.stringLiteral(value)]);

      /* Which picture is this? src={logo} and src={logoAsset.url} both trace
         back to an import whose filename the editor can match on. */
      const hintFor = (expr) => {
        let name = null;
        if (t.isIdentifier(expr)) name = expr.name;
        else if (t.isMemberExpression(expr) && t.isIdentifier(expr.object) &&
                 t.isIdentifier(expr.property) && /^(url|src|default|href|image|img|photo)$/.test(expr.property.name)) {
          name = expr.object.name;
        }
        const h = name ? importSources.get(name) : null;
        return h && /\.(png|jpe?g|webp|svg|gif|avif|mp4|webm|mov)$/i.test(h) ? h : null;
      };

      traverse(ast, {
        /* ---- 1. text written directly in JSX ---- */
        JSXText(p) {
          const raw = p.node.value;
          const text = raw.trim().replace(/\s+/g, " ");
          if (!isCopy(text)) return;

          const parent = p.parent;
          const key = makeKey(scope, text, seen);
          const tag = t.isJSXElement(parent) && t.isJSXIdentifier(parent.openingElement.name)
            ? parent.openingElement.name.name : "text";
          record(key, text, "text", tag);

          // preserve the surrounding whitespace, or words weld together
          const lead = raw.match(/^\s*/)[0].includes("\n") ? "" : raw.match(/^\s*/)[0];
          const tail = raw.match(/\s*$/)[0].includes("\n") ? "" : raw.match(/\s*$/)[0];
          const nodes = [];
          if (lead) nodes.push(t.jsxText(lead));
          nodes.push(t.jsxExpressionContainer(call(key, text)));
          if (tail) nodes.push(t.jsxText(tail));
          p.replaceWithMultiple(nodes);

          // anchor for the inline editor, but only when this text is the whole
          // element — otherwise the anchor would claim its siblings too
          if (t.isJSXElement(parent)) {
            const real = parent.children.filter((c) =>
              !(t.isJSXText(c) && !c.value.trim()));
            if (real.length <= 1 && !parent.openingElement.attributes.some(
              (a) => t.isJSXAttribute(a) && a.name.name === "data-c")) {
              parent.openingElement.attributes.push(
                t.jsxAttribute(t.jsxIdentifier("data-c"), t.stringLiteral(key)));
            }
          }
          touched++;
          p.skip();
        },

        /* ---- 2. copy living in data structures ---- */
        ObjectProperty(p) {
          const k = t.isIdentifier(p.node.key) ? p.node.key.name
            : t.isStringLiteral(p.node.key) ? p.node.key.value : null;
          if (!k) return;

          // head() metadata — {name:"twitter:card", content:…} — is machine
          // config wearing copy-prop names; nothing in it is editable
          if (isMetaShape(p.parent)) return;

          /* A picture in the data: image: mu01. Wrapped like a src attribute —
             the import stays the fallback, the CMS value starts empty, and the
             import's filename rides along so the editor can find the rendered
             element and say which picture this is. */
          if (MEDIA_PROPS.has(k)) {
            // a destructuring pattern shares this node type but is not data
            if (p.parentPath.isObjectPattern() || t.isObjectPattern(p.parent)) return;
            const val = p.node.value;
            let seedValue = "", hint = null;
            if (t.isStringLiteral(val) && !val.value) {
              /* An EMPTY slot — image to be chosen in the CMS. Key and label
                 come from a copy sibling (the card's title), so the field is
                 findable and reads as "image for <story>" in the editor. */
              const sibText = (p.parent.properties || []).map((q) => {
                const kk = q.key && (t.isIdentifier(q.key) ? q.key.name : t.isStringLiteral(q.key) ? q.key.value : null);
                if (!kk || !/^(title|name|label|heading|headline)$/.test(kk)) return null;
                if (t.isObjectProperty(q) && t.isStringLiteral(q.value)) return q.value.value;
                // a sibling visited first is a getter already: get title() { return __mu(k, "…") }
                if (t.isObjectMethod(q) && q.body.body.length === 1 &&
                    t.isReturnStatement(q.body.body[0]) &&
                    t.isCallExpression(q.body.body[0].argument) &&
                    t.isStringLiteral(q.body.body[0].argument.arguments[1])) {
                  return q.body.body[0].argument.arguments[1].value;
                }
                return null;
              }).find(Boolean);
              if (!sibText) return;
              const key0 = makeKey(scope, "media-slot:" + sibText, seen);
              record(key0, "", "media", "src", sibText.slice(0, 70));
              replaceWithGetter(p, t.callExpression(t.identifier("__mu"),
                [t.stringLiteral(key0), t.stringLiteral("")]));
              touched++;
              return;
            }
            if (t.isStringLiteral(val)) {
              if (!/[./]/.test(val.value)) return;   // not a path
              seedValue = val.value;
            } else {
              // img: ftBhupesh.url or image: mu01 — only an expression that
              // provably traces to an asset FILE; an icon COMPONENT here
              // would break the moment an editor set a value
              hint = hintFor(val);
              if (!hint) return;
            }
            const basis = seedValue || "import:" + hint;
            const key = makeKey(scope, "media:" + basis, seen);
            record(key, seedValue, "media", "src", hint);
            replaceWithGetter(p, t.callExpression(t.identifier("__mu"),
              [t.stringLiteral(key), t.isStringLiteral(val) ? t.stringLiteral(val.value) : val]));
            touched++;
            return;
          }

          if (LINK_PROPS.has(k) && t.isStringLiteral(p.node.value) &&
              !t.isObjectPattern(p.parent)) {
            const v = p.node.value.value;
            if (/^(\/|https?:)/.test(v) && !/^\/\//.test(v)) {
              const key = makeKey(scope, "link:" + v, seen);
              record(key, v, "link", "href");
              replaceWithGetter(p, call(key, v));
              touched++;
            }
            return;
          }
          if (DATE_PROPS.has(k) && t.isStringLiteral(p.node.value) &&
              !t.isObjectPattern(p.parent) &&
              /^\d{4}-\d{2}-\d{2}/.test(p.node.value.value)) {
            const v = p.node.value.value;
            const key = makeKey(scope, "date:" + v + ":" + k, seen);
            record(key, v, "data", k, null, "date");
            replaceWithGetter(p, call(key, v));
            touched++;
            return;
          }

          if (!copyProps.has(k) && !statProps.has(k)) return;
          const accepts = (text) =>
            (copyProps.has(k) && isCopy(text)) ||
            (statProps.has(k) && isShortDisplay(text) && !isMetaShape(p.parent));

          // a list of strings under a copy prop is copy too: chips, proof
          if (t.isArrayExpression(p.node.value)) {
            let wrapped = 0;
            const elements = p.node.value.elements.map((el) => {
              if (!t.isStringLiteral(el)) return el;
              const text = el.value.trim().replace(/\s+/g, " ");
              if (!accepts(text)) return el;
              const key = makeKey(scope, text, seen);
              record(key, text, "data", k);
              wrapped++;
              return call(key, text);
            });
            if (wrapped) {
              replaceWithGetter(p, t.arrayExpression(elements));
              touched++;
            }
            return;
          }

          /* status: closed ? "Round closed" : "Apply now" — both arms are copy;
             wrap each so an editor can change either. The getter keeps the
             condition itself deciding at render time, exactly as before. */
          if (t.isConditionalExpression(p.node.value)) {
            const cond = p.node.value;
            const arms = [cond.consequent, cond.alternate].map((el) => {
              if (!t.isStringLiteral(el)) return null;
              const text = el.value.trim().replace(/\s+/g, " ");
              return accepts(text) ? text : null;
            });
            if (!arms[0] && !arms[1]) return;
            const wrapArm = (el, text) => {
              if (text == null) return el;
              const key = makeKey(scope, text, seen);
              record(key, text, "data", k);
              return call(key, text);
            };
            replaceWithGetter(p, t.conditionalExpression(cond.test,
              wrapArm(cond.consequent, arms[0]), wrapArm(cond.alternate, arms[1])));
            touched++;
            return;
          }

          if (!t.isStringLiteral(p.node.value)) return;
          const text = p.node.value.value.trim().replace(/\s+/g, " ");
          if (!accepts(text)) return;

          const key = makeKey(scope, text, seen);
          record(key, text, "data", k);
          replaceWithGetter(p, call(key, text));
          touched++;
        },

        /* ---- 3. link targets and image sources ---- */
        JSXAttribute(p) {
          const nm = t.isJSXIdentifier(p.node.name) ? p.node.name.name
            : t.isJSXNamespacedName(p.node.name)
              ? p.node.name.namespace.name + "-" + p.node.name.name.name : null;

          // visible words carried in an attribute
          if (nm && COPY_ATTRS.has(nm) && t.isStringLiteral(p.node.value)) {
            const text = p.node.value.value.trim().replace(/\s+/g, " ");
            if (isCopy(text)) {
              const k = makeKey(scope, text, seen);
              record(k, text, "attr", nm);
              p.node.value = t.jsxExpressionContainer(call(k, text));
              touched++;
            }
            return;
          }

          /* ---- 4. copy passed as a prop to a component ----
             <Eyebrow text="Placements" /> carries copy the same way an object
             literal does. Only components (capitalised) — the same name on a
             DOM element is an HTML attribute with meaning, not copy. Evaluated
             per render, so no getter is needed. */
          if (nm && (copyProps.has(nm) || statProps.has(nm)) && p.node.value) {
            const el = p.parentPath.node;   // JSXOpeningElement
            const elName = t.isJSXIdentifier(el.name) ? el.name.name : null;
            if (elName && /^[A-Z]/.test(elName)) {
              const ok = (text) =>
                (copyProps.has(nm) && isCopy(text)) ||
                (statProps.has(nm) && isShortDisplay(text));
              if (t.isStringLiteral(p.node.value)) {
                const text = p.node.value.value.trim().replace(/\s+/g, " ");
                if (ok(text)) {
                  const k = makeKey(scope, text, seen);
                  record(k, text, "attr", nm);
                  p.node.value = t.jsxExpressionContainer(call(k, text));
                  touched++;
                  return;
                }
              }
              // links={["Admissions", "Press & Media"]} — each string is copy
              if (t.isJSXExpressionContainer(p.node.value) &&
                  t.isArrayExpression(p.node.value.expression)) {
                const arr = p.node.value.expression;
                let wrapped = 0;
                arr.elements = arr.elements.map((elx) => {
                  if (!t.isStringLiteral(elx)) return elx;
                  const text = elx.value.trim().replace(/\s+/g, " ");
                  if (!ok(text)) return elx;
                  const k = makeKey(scope, text, seen);
                  record(k, text, "attr", nm);
                  wrapped++;
                  return call(k, text);
                });
                if (wrapped) { touched++; return; }
              }
            }
          }

          const kind = nm && TARGET_ATTRS[nm];
          if (!kind || !p.node.value) return;

          let original, seedValue;
          if (t.isStringLiteral(p.node.value)) {
            original = t.stringLiteral(p.node.value.value);
            seedValue = p.node.value.value;
            if (!seedValue || /^[#?]/.test(seedValue)) return;      // anchors, query-only
          } else if (t.isJSXExpressionContainer(p.node.value) &&
                     !t.isJSXEmptyExpression(p.node.value.expression)) {
            original = p.node.value.expression;
            // an expression has no text to hash, so hash the code that produces it
            seedValue = "";
            /* Only when it traces to an imported asset. A member expression on
               a render variable (src={project.image}) is data that was already
               wrapped at its source; wrapping it again here makes every item
               the loop renders share ONE key — edit it and all of them change. */
            if (!hintFor(original)) return;
          } else return;

          // a hashed key needs something stable: the literal, or the expression source
          const basis = seedValue || generate(original, { concise: true }).code;
          if (basis.length > 300) return;
          const key = makeKey(scope, kind + ":" + basis, seen);
          record(key, seedValue, kind, nm, kind === "media" && !seedValue ? hintFor(original) : null);

          p.node.value = t.jsxExpressionContainer(
            t.callExpression(t.identifier("__mu"), [t.stringLiteral(key), original]));
          touched++;
          return;
        },

        /* ---- 5. copy chosen by a condition, written directly in JSX ----
           {live ? "Live session" : "Recording"} — both arms are copy. Only in
           a JSX expression position; conditionals in data props are handled by
           the ObjectProperty visitor, where the getter matters. */
        ConditionalExpression(p) {
          if (!p.parentPath.isJSXExpressionContainer()) return;
          // child position only — an attribute value ({className}, {target})
          // sits in the same container node but is plumbing, not copy
          const holder = p.parentPath.parent;
          if (!t.isJSXElement(holder) && !t.isJSXFragment(holder)) return;
          const arms = [p.node.consequent, p.node.alternate].map((el) => {
            if (!t.isStringLiteral(el)) return null;
            const text = el.value.trim().replace(/\s+/g, " ");
            return isCopy(text) ? text : null;
          });
          if (!arms[0] && !arms[1]) return;
          [p.node.consequent, p.node.alternate].forEach((el, i) => {
            if (arms[i] == null) return;
            const key = makeKey(scope, arms[i], seen);
            record(key, arms[i], "text", "text");
            if (i === 0) p.node.consequent = call(key, arms[i]);
            else p.node.alternate = call(key, arms[i]);
          });
          touched++;
        },

      });

      /* ---- 6. whole data arrays become editable collections ----
         A module-level `const X = [ {…}, {…} ]` whose items carry instrumented
         copy is a LIST an editor should be able to add to, reorder and prune.
         Each item gets a stable identity (a hash of its identifying text, not
         its position), and the array is wrapped in the runtime's list Proxy so
         a CMS structure row can re-shape it at render time. Opt a variable out
         with a `@mu-static X` comment anywhere in the file. */
      let wrappedLists = 0;
      const listSeen = new Map();
      const unmu = (node) => {
        // get title() { return __mu("k","Text") }  ->  { key: "k", text: "Text" }
        if (t.isObjectMethod(node) && node.kind === "get" &&
            node.body.body.length === 1 && t.isReturnStatement(node.body.body[0])) {
          const r = node.body.body[0].argument;
          if (t.isCallExpression(r) && t.isStringLiteral(r.arguments[0])) {
            return { key: r.arguments[0].value,
                     text: t.isStringLiteral(r.arguments[1]) ? r.arguments[1].value : "",
                     expr: r };
          }
          if (t.isArrayExpression(r)) return { array: r };
        }
        return null;
      };
      const propName = (q) => q.key && (t.isIdentifier(q.key) ? q.key.name
        : t.isStringLiteral(q.key) ? q.key.value : null);

      traverse(ast, {
        VariableDeclarator(p) {
          const decl = p.parentPath;
          const holder = decl.parentPath;
          if (!holder.isProgram() && !holder.isExportNamedDeclaration()) return;
          if (!t.isIdentifier(p.node.id) || !t.isArrayExpression(p.node.init)) return;
          const listName = p.node.id.name;
          if (new RegExp(`@mu-static\\s+${listName}\\b`).test(code)) return;
          const els = p.node.init.elements;
          if (els.length < 2 || !els.every((e) => t.isObjectExpression(e))) return;
          if (!els.some((e) => e.properties.some((q) => unmu(q)))) return;

          const listKey = `${scope}.list:${listName}`;
          const items = [];
          els.forEach((el, i) => {
            // identity: the item's own identifying text, never its position
            let ident = null;
            for (const q of el.properties) {
              const nm2 = propName(q);
              if (nm2 && /^(headline|title|name|label|heading)$/.test(nm2)) {
                const u = unmu(q);
                if (u && u.text) { ident = u.text; break; }
                if (t.isObjectProperty(q) && t.isStringLiteral(q.value)) { ident = q.value.value; break; }
              }
            }
            if (!ident) {
              const first = el.properties.map((q) => unmu(q)).find((u) => u && u.text);
              ident = first ? first.text : `item-${i}`;
            }
            const h = hashText(`${listName}:${ident}`);
            const nth = (listSeen.get(h) || 0) + 1;
            listSeen.set(h, nth);
            const id = nth === 1 ? h : `${h}-${nth}`;
            el.properties.unshift(t.objectProperty(t.identifier("__id"), t.stringLiteral(id)));

            const fields = {}, children = {};
            for (const q of el.properties) {
              const nm2 = propName(q);
              if (!nm2 || nm2 === "__id") continue;
              const u = unmu(q);
              if (u && u.key) fields[nm2] = u.key;
              else if (u && u.array) {
                children[nm2] = u.array.elements
                  .filter((x) => t.isCallExpression(x) && t.isStringLiteral(x.arguments[0]))
                  .map((x) => x.arguments[0].value);
              } else if (t.isObjectProperty(q) && t.isArrayExpression(q.value) &&
                         q.value.elements.every((x) => t.isObjectExpression(x))) {
                children[nm2] = q.value.elements.map((sub) => {
                  const m = {};
                  for (const sq of sub.properties) {
                    const snm = propName(sq);
                    const su = unmu(sq);
                    if (snm && su && su.key) m[snm] = su.key;
                  }
                  return m;
                });
              }
            }
            items.push({ id, label: ident.slice(0, 60), fields,
              ...(Object.keys(children).length ? { children } : {}) });
          });

          /* what a NEW item is made of: every prop the first item has */
          const first = els[0];
          const itemTemplate = [];
          for (const q of first.properties) {
            const nm2 = propName(q);
            if (!nm2 || nm2 === "__id") continue;
            const u = unmu(q);
            const rec = u && u.key ? entries.get(u.key) : null;
            itemTemplate.push({
              prop: nm2,
              type: rec ? rec.type : u && u.array ? "chips"
                : t.isObjectProperty(q) && t.isArrayExpression(q.value) ? "group"
                : "text",
            });
          }

          entries.set(listKey, {
            key: listKey, page: owner, scope, kind: "list", tag: "list",
            type: "list", value: "", file: path.relative(root, file),
            list: { itemTemplate, items },
          });
          p.node.init = t.callExpression(t.identifier("__muList"),
            [t.stringLiteral(listKey), p.node.init]);
          wrappedLists++;
          touched++;
          p.skip();
        },
      });

      if (!touched) return null;

      // give the file the helpers it now calls
      const specs = [t.importSpecifier(t.identifier("__mu"), t.identifier("c"))];
      if (wrappedLists) specs.push(t.importSpecifier(t.identifier("__muList"), t.identifier("l")));
      ast.program.body.unshift(t.importDeclaration(specs, t.stringLiteral(runtime)));

      const out = generate(ast, { retainLines: true, jsescOption: { minimal: true } }, code);
      return { code: out.code, map: null };
    },

    buildEnd() {
      const fields = [...entries.values()];
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify({
        generatedAt: null,          // stamped by the seeder, keeps this file stable
        homeSlug,
        fields,
      }, null, 2));
      const byPage = new Map();
      fields.forEach((f) => byPage.set(f.page, (byPage.get(f.page) || 0) + 1));
      console.log(`\n  [mu-cms] ${fields.length} editable fields across ${byPage.size} page(s) -> ${path.relative(root, manifestPath)}`);

      /* ownerFor (here, build time) and pageSlugFor (__root.tsx, request time)
         are independent implementations of the same mapping. If they drift, a
         page fetches a bucket nothing was seeded into and every field silently
         falls back. Fail loud instead. */
      for (const rel of new Set(fields.map((f) => f.file))) {
        if (!rel.startsWith("src/routes/")) continue;
        const base = rel.slice("src/routes/".length).replace(/\.(tsx|jsx|ts|js)$/, "");
        if (base.startsWith("__")) continue;
        const owner = ownerFor(path.join(root, rel), root, homeSlug);
        const urlPath = base.split(/[./]/).filter(Boolean).filter((s) => s !== "index").join("/");
        const wouldFetch = urlPath === "" ? homeSlug : urlPath.replace(/\//g, "-").toLowerCase();
        if (owner !== wouldFetch) {
          console.warn(`  [mu-cms] SLUG DRIFT: ${rel} seeds page "${owner}" but the page will fetch "${wouldFetch}"`);
        }
      }
    },
  };
}
