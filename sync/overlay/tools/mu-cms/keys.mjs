/**
 * HOW A FIELD IS IDENTIFIED.
 *
 * This is the most consequential decision in the whole system, so it gets its
 * own file. On the previous project keys were positional — "the 21st field in
 * section 5" — which meant any change to what the extractor matched renumbered
 * everything after it and stranded live edits on keys nothing rendered. We had
 * to write a recovery tool. Not repeating that.
 *
 * A key here is:  <file scope>.<hash of the original text>
 *
 *   placements.a3f9c1b
 *
 * Which means it survives:
 *   - reordering sections, or moving a block up the file
 *   - adding or deleting other copy in the same file
 *   - a rebuild, a refactor, or the file growing
 *
 * And deliberately CHANGES when the source English changes, because that is a
 * different string. An editor's override then lands on a new key, which is the
 * honest outcome: the developer rewrote the sentence underneath them.
 */
import crypto from "node:crypto";
import path from "node:path";

/** Stable, readable scope from a source file path. */
export function scopeFor(file, root) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const base = rel.replace(/^src\//, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  return base.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/**
 * Which CMS page owns this field.
 * A route file owns its own page. Anything else is a shared component — its
 * copy appears on every page that uses it, so it belongs to one shared bucket
 * and is edited once rather than per page.
 */
export function ownerFor(file, root, homeSlug = "home") {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (!rel.startsWith("src/routes/")) return "shared";
  const base = rel.slice("src/routes/".length).replace(/\.(tsx|jsx|ts|js)$/, "");
  if (base.startsWith("__")) return "shared";
  const parts = base.split(/[./]/).filter(Boolean).filter((p) => p !== "index");
  return parts.length ? parts.join("-").toLowerCase() : homeSlug;
}

/** Short, stable hash of the original text. */
export function hashText(text) {
  return crypto.createHash("sha1").update(text.trim().replace(/\s+/g, " ")).digest("hex").slice(0, 7);
}

/**
 * The key, with a counter only when the SAME text appears twice in one file —
 * two "Learn more" links need separate fields, and without this they would
 * collide and share one value.
 */
export function makeKey(scope, text, seen) {
  const h = hashText(text);
  const base = scope + "." + h;
  const n = (seen.get(base) || 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : base + "-" + n;
}
