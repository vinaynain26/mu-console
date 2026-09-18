/**
 * Put an editor's text back into the file it came from.
 *
 * The file is never reprinted from the AST. The parser only tells us where
 * each string starts and ends; the new text is spliced into the original
 * source at those offsets, from the end backwards. Formatting, comments and
 * everything else survive, so the designer sees a one-line diff in Lovable.
 */
import crypto from "node:crypto";
import { parse } from "@babel/parser";
import { PARSE_OPTS, collectCopy, clean, PROFILES } from "./scan.js";

/* only what some scanner profile counts as copy may ever be rewritten: a
   class name or an href that happens to hash like a field is not a field */
const isField = (o) => Object.values(PROFILES).some((pr) => pr.accepts(o));

const fullHash = (text) => crypto.createHash("sha1").update(clean(text)).digest("hex");

/**
 * Every occurrence in `source` whose text hashes to one of `hashes`. A hash
 * may be 7 or 8 characters (plugin or lab keys): it matches as a prefix.
 * Each hit carries its `hash` as asked for, the full sha1, and its `ordinal`
 * among hits of the same text in source order (1 = first), which is what a
 * "-2" key refers to.
 */
export function locate(source, hashes) {
  const tree = parse(source, PARSE_OPTS);
  const hits = [], counts = new Map();
  for (const o of collectCopy(tree)) {
    if (!isField(o)) continue;
    const full = fullHash(o.keyText ?? o.value);
    let hash = null;
    for (const h of hashes) if (full.startsWith(h)) { hash = h; break; }
    if (!hash) continue;
    const ordinal = (counts.get(full) || 0) + 1;
    counts.set(full, ordinal);
    /* src={heroBuilding}: the hit is the whole {…}, so the attribute becomes src="…" */
    const span = o.container || o.node, kind = o.container ? "attrexpr" : o.kind;
    hits.push({ hash, full, ordinal, kind, start: span.start, end: span.end, raw: source.slice(span.start, span.end) });
  }
  return hits;
}

/* `{` `}` `<` `>` end a JSX text node; `&x;` would be read as an entity. Babel
   decodes these back to the plain characters, so the next scan hashes the
   same text the editor typed. */
const escapeJsxText = (t) => t
  .replace(/&(?=(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;")
  .replace(/[{}<>]/g, (c) => ({ "{": "&#123;", "}": "&#125;", "<": "&lt;", ">": "&gt;" }[c]));

function render(hit, text) {
  if (hit.kind === "jsxtext") {
    const lead = hit.raw.match(/^\s*/)[0], trail = hit.raw.match(/\s*$/)[0];
    return lead + escapeJsxText(text) + trail;
  }
  // image: heroBg -> image: "https://…"; src={heroBg} -> src="https://…" (the {…} is the hit)
  if (hit.kind === "expr" || hit.kind === "attrexpr") return JSON.stringify(text);
  if (hit.kind === "template") {
    return "`" + text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
  }
  const q = hit.raw[0] === "'" ? "'" : '"';
  const body = text.replace(/\\/g, "\\\\").split(q).join("\\" + q).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return q + body + q;
}

/** New source with each hit replaced. `textFor` is a Map keyed by hash (every
    occurrence of that text changes) or a function of the hit (so a caller can
    change only the second occurrence). Undefined leaves a hit alone. */
export function splice(source, hits, textFor) {
  const pick = typeof textFor === "function" ? textFor : (h) => textFor.get(h.hash);
  let out = source;
  for (const h of [...hits].sort((a, b) => b.start - a.start)) {
    const text = pick(h);
    if (text === undefined) continue;
    out = out.slice(0, h.start) + render(h, text) + out.slice(h.end);
  }
  return out;
}
