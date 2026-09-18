/**
 * The pictures the repo does not ship. A Lovable export carries .asset.json
 * pointers, each naming a path under /__l5e/assets-v1/ that only Lovable's
 * own hosting serves; the files themselves never enter git. Before a build,
 * every pointer whose file is missing is fetched from the project's Lovable
 * host into public/ at the SAME path, so the source need not change and the
 * URLs simply start resolving. Present files are never re-fetched, and a
 * host that cannot be reached costs a log line, not the build.
 *
 *   LOVABLE_ASSETS_URL   where the files are served; default
 *                        https://<repo name>.lovable.app, the project's own
 *                        host (its /__l5e/ endpoint answers even with no
 *                        published build)
 */
import fs from "node:fs";
import path from "node:path";
import { repoName } from "./repo.js";

export const assetsBase = () => (process.env.LOVABLE_ASSETS_URL ||
  `https://${(repoName().split("/")[1] || repoName())}.lovable.app`).replace(/\/+$/, "");

/** Every distinct pointer under src: [{ url, size, name }]. */
export function assetPointers(clone) {
  const out = new Map();
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".asset.json")) {
        try {
          const j = JSON.parse(fs.readFileSync(p, "utf8"));
          if (j.url && !out.has(j.url)) out.set(j.url, { url: j.url, size: j.size || 0, name: j.original_filename || path.basename(j.url) });
        } catch { /* a malformed pointer is not worth failing the run over */ }
      }
    }
  })(path.join(clone, "src"));
  return [...out.values()];
}

const dest = (clone, url) => path.join(clone, "public", url.replace(/^\/+/, ""));
const present = (f) => { try { return fs.statSync(f).size > 0; } catch { return false; } };

/** Fetch what is missing. Returns { fetched, present, failed: [{ url, error }] }. */
export async function provisionAssets(clone, { from, concurrency = 8, timeout = 60e3 } = {}) {
  const base = String(from).replace(/\/+$/, "");
  const todo = assetPointers(clone).filter((p) => !present(dest(clone, p.url)));
  const r = { fetched: 0, present: assetPointers(clone).length - todo.length, failed: [] };
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const p = todo[i++];
      try {
        const res = await fetch(base + p.url, { signal: AbortSignal.timeout(timeout),
          headers: { "User-Agent": "Mozilla/5.0 (MU Console)", Referer: base + "/", Accept: "image/*,video/*,*/*" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) throw new Error("empty response");
        const f = dest(clone, p.url);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, buf);
        r.fetched++;
      } catch (e) { r.failed.push({ url: p.url, error: String(e.cause?.message || e.message) }); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  return r;
}
