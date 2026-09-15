/**
 * Put an editor's text back into the file it came from.
 *
 * The file is never reprinted from the AST. The parser only tells us where
 * each string starts and ends; the new text is spliced into the original
 * source at those offsets, from the end backwards. Formatting, comments and
 * everything else survive, so the designer sees a one-line diff in Lovable.
 */
import { parse } from "@babel/parser";
import { PARSE_OPTS, collectCopy, looksLikeCopy, hashText } from "./scan.js";

/** Every occurrence in `source` whose text hashes to one of `hashes`. */
export function locate(source, hashes) {
  const tree = parse(source, PARSE_OPTS);
  const hits = [];
  for (const o of collectCopy(tree)) {
    if (!looksLikeCopy(o.value)) continue;
    const hash = hashText(o.value);
    if (!hashes.has(hash)) continue;
    hits.push({ hash, kind: o.kind, start: o.node.start, end: o.node.end, raw: source.slice(o.node.start, o.node.end) });
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
  if (hit.kind === "template") {
    return "`" + text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";
  }
  const q = hit.raw[0] === "'" ? "'" : '"';
  const body = text.replace(/\\/g, "\\\\").split(q).join("\\" + q).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  return q + body + q;
}

/** New source with each hit replaced by the text for its hash. */
export function splice(source, hits, textByHash) {
  let out = source;
  for (const h of [...hits].sort((a, b) => b.start - a.start)) {
    const text = textByHash.get(h.hash);
    if (text === undefined) continue;
    out = out.slice(0, h.start) + render(h, text) + out.slice(h.end);
  }
  return out;
}
