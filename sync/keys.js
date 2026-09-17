/**
 * Field identity, the Hero Launch way. A port of tools/mu-cms/keys.mjs from
 * the site's Vite plugin, kept byte-compatible on purpose: the 5,000-odd rows
 * already in the CMS carry these keys, and a scan of the Lovable repo has to
 * land on them rather than beside them.
 *
 *   key   = <scope>.<7-char sha1 of the whitespace-normalised text>[-N]
 *   scope = path under src, extension dropped, non-alphanumerics to "-", lower
 *   -N    = the Nth time the same text appears in the same file (2, 3, …)
 */
import crypto from "node:crypto";

export function scopeFor(rel) {
  const base = rel.replace(/\\/g, "/").replace(/^src\//, "").replace(/\.(tsx|jsx|ts|js)$/, "");
  return base.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

/** A route file owns a page; anything else is shared across pages. */
export function ownerFor(rel, homeSlug = "mu-home") {
  const r = rel.replace(/\\/g, "/");
  if (!r.startsWith("src/routes/")) return "shared";
  const base = r.slice("src/routes/".length).replace(/\.(tsx|jsx|ts|js)$/, "");
  if (base.startsWith("__")) return "shared";
  const parts = base.split(/[./]/).filter(Boolean).filter((p) => p !== "index");
  return parts.length ? parts.join("-").toLowerCase() : homeSlug;
}

/** The URL a route file serves: index.tsx -> "/", a.b.c.tsx -> "/a/b/c". */
export function routeFor(rel) {
  const base = rel.replace(/\\/g, "/").slice("src/routes/".length).replace(/\.(tsx|jsx|ts|js)$/, "");
  const parts = base.split(/[./]/).filter(Boolean).filter((p) => p !== "index");
  return "/" + parts.join("/");
}

export const hashText7 = (text) =>
  crypto.createHash("sha1").update(String(text).trim().replace(/\s+/g, " ")).digest("hex").slice(0, 7);

export function makeKey(scope, text, seen) {
  const base = scope + "." + hashText7(text);
  const n = (seen.get(base) || 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : base + "-" + n;
}

/** Split a plugin key back into scope, hash and ordinal (1 for the first). */
export function keyParts7(key) {
  const m = key.match(/^(.*)\.([0-9a-f]{7})(?:-(\d+))?$/);
  if (!m) return null;
  return { scope: m[1], hash: m[2], ordinal: m[3] ? Number(m[3]) : 1 };
}
