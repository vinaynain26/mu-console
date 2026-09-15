/**
 * Build-time instrumentation for the lab build of the Lovable app.
 *
 * Every string the scanner counts as a field becomes a runtime lookup with
 * the original as its fallback, so the page renders CMS copy (drafts in
 * preview) and the inline editor can repaint after an edit:
 *
 *   <h1>Welcome</h1>            ->  <h1>{__mu("pages/Index.tsx.1a2b3c4d","Welcome")}</h1>
 *   { title: "Offers" }         ->  { get title() { return __mu("...", "Offers") } }
 *   alt="A photo"               ->  alt={__mu("...", "A photo")}
 *
 * Nothing here is ever committed. The clone is instrumented in memory at
 * build time and the source on disk stays exactly what Lovable wrote.
 *
 * The app also has to live under /page/<prefix>-<route> on the CMS origin,
 * so the router gets a basename, its routes are renamed, and absolute hrefs
 * are re-pointed. Same idea: the build moves, the source does not.
 */
import path from "node:path";
import { parse } from "@babel/parser";
import { PARSE_OPTS, collectCopy, looksLikeCopy, hashText, walk, elName } from "./scan.js";

const VIRTUAL = "virtual:mu-runtime";
const RESOLVED = "\0mu-runtime";

const slugFor = (routePath, home) => routePath === "/" ? home : routePath.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

export default function muLab({ root, prefix = "lab", homeSlug = "home", pagePrefix = "/page" } = {}) {
  const pageFor = (routePath) => `${pagePrefix}/${prefix}-${slugFor(routePath, homeSlug)}`;
  /* "/pricing#plans" -> "/page/lab-pricing#plans"; "/" -> "/page/lab-home" */
  const rehref = (href) => {
    const m = href.match(/^(\/[^#?]*)([#?].*)?$/);
    if (!m || href.startsWith("//")) return null;
    return pageFor(m[1]) + (m[2] || "");
  };

  return {
    name: "mu-lab",
    enforce: "pre",
    resolveId(id) { return id === VIRTUAL ? RESOLVED : null; },
    load(id) { return id === RESOLVED ? RUNTIME : null; },

    transform(code, id) {
      const file = id.split("?")[0];
      if (!/\.(tsx|ts|jsx|js)$/.test(file) || /\.d\.ts$/.test(file)) return null;
      if (file.includes("node_modules")) return null;
      const rel = path.relative(root, file).split(path.sep).join("/");
      if (!rel.startsWith("src/") || rel.startsWith("src/components/ui/")) return null;
      const scope = rel.replace(/^src\//, "");

      let tree;
      try { tree = parse(code, PARSE_OPTS); } catch { return null; }
      const edits = [];              // { start, end, text }
      const q = (s) => JSON.stringify(s);

      /* copy -> runtime lookups */
      for (const o of collectCopy(tree)) {
        if (!looksLikeCopy(o.value)) continue;
        const key = scope + "." + hashText(o.value);
        const call = `__mu(${q(key)}, ${q(o.value)})`;
        const n = o.node;
        if (o.kind === "jsxtext") {
          const raw = code.slice(n.start, n.end);
          const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
          edits.push({ start: n.start, end: n.end, text: lead + "{" + call + "}" + trail });
        } else if (o.prop) {
          const p = o.prop;
          const keySrc = code.slice(p.key.start, p.key.end);
          edits.push({ start: p.start, end: p.end, text: `get ${keySrc}() { return ${call}; }` });
        } else if (n.type === "StringLiteral" && code[n.start - 1] === "=") {
          edits.push({ start: n.start, end: n.end, text: "{" + call + "}" });     // attribute
        } else {
          edits.push({ start: n.start, end: n.end, text: call });                 // {"x"} or {`x`}
        }
      }

      /* routing: live under /page/<prefix>-<route> */
      walk(tree, (n, stack) => {
        if (n.type === "JSXElement" && elName(n) === "BrowserRouter") {
          const attrs = n.openingElement.attributes;
          if (!attrs.some((a) => a.type === "JSXAttribute" && a.name.name === "basename")) {
            const at = n.openingElement.name.end;
            edits.push({ start: at, end: at, text: ` basename=${q(pagePrefix)}` });
          }
        }
        if (n.type === "JSXAttribute" && n.value?.type === "StringLiteral") {
          const el = elName(stack[stack.length - 1]);
          const name = n.name.name, v = n.value.value;
          if (el === "Route" && name === "path" && v !== "*") {
            edits.push({ start: n.value.start, end: n.value.end, text: q("/" + prefix + "-" + slugFor(v, homeSlug)) });
          } else if ((name === "href" || name === "to") && v.startsWith("/")) {
            const r = rehref(v);
            if (r) edits.push({ start: n.value.start, end: n.value.end, text: q(r) });
          }
        }
        if (n.type === "ObjectProperty" && !stack.length && n.value.type === "StringLiteral") {
          const k = n.key.type === "Identifier" ? n.key.name : n.key.type === "StringLiteral" ? n.key.value : null;
          if (["href", "url", "link", "to"].includes(k) && n.value.value.startsWith("/")) {
            const r = rehref(n.value.value);
            if (r) edits.push({ start: n.value.start, end: n.value.end, text: q(r) });
          }
        }
      });

      /* the root render: wrap so a loud applyLocal re-renders the whole app */
      if (/src\/main\.(tsx|jsx)$/.test(rel)) {
        walk(tree, (n) => {
          if (n.type !== "CallExpression" || n.callee.type !== "MemberExpression") return;
          if (n.callee.property?.name !== "render" || n.callee.object.type !== "CallExpression") return;
          if (n.callee.object.callee?.name !== "createRoot" || !n.arguments[0]) return;
          const a = n.arguments[0];
          edits.push({ start: a.start, end: a.end, text: `<__MuRoot>${code.slice(a.start, a.end)}</__MuRoot>` });
        });
      }

      if (!edits.length) return null;
      edits.sort((a, b) => b.start - a.start);
      let out = code;
      for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
      out = `import { __mu, __MuRoot } from ${q(VIRTUAL)};\n` + out;
      return { code: out, map: null };
    },
  };
}

const RUNTIME = `
import { useSyncExternalStore, cloneElement } from "react";
const store = new Map();
try {
  const el = document.getElementById("__mu_content");
  if (el && el.textContent) for (const [k, v] of Object.entries(JSON.parse(el.textContent))) if (typeof v === "string") store.set(k, v);
} catch (e) { /* no content inlined: every string falls back to the source */ }
let version = 0;
const listeners = new Set();
const bump = () => { version++; listeners.forEach((f) => f()); };
export function __mu(key, fallback) { const v = store.get(key); return v === undefined || v === "" ? fallback : v; }
export function applyLocal(key, value, silent) { store.set(key, value); if (!silent) bump(); }
/* A loud applyLocal REMOUNTS the app (new key, new tree) rather than
   re-rendering it. Costlier, but it is what makes typing straight on the
   page safe: whatever a contenteditable did to React's text nodes is thrown
   away and the page is rebuilt from the store. */
export function __MuRoot({ children }) {
  const v = useSyncExternalStore((fn) => { listeners.add(fn); return () => listeners.delete(fn); }, () => version, () => version);
  return cloneElement(children, { key: "mu" + v });
}
if (typeof window !== "undefined") window.__MU_RUNTIME__ = { applyLocal, version: () => version, pageTyping: true };
`;
