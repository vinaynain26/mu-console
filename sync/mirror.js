/**
 * Pictures the site gets from Lovable become pictures on UnionStack.
 *
 * A Lovable export names every picture through a small .asset.json pointer
 * whose `url` is a path only Lovable's storage serves (/__l5e/...). The
 * mirror moves each such file to UnionStack ONCE and rewrites the pointer to
 * the CDN link, keeping the old path as `lovableUrl`. The repo then records
 * what has moved, so a pull with nothing new reads a few JSON files and
 * touches no network; only pointers still on Lovable are fetched, uploaded
 * and rewritten. A ledger in the database maps the bytes' sha1 to the CDN
 * link, so the same picture under a second Lovable id, or a retry after a
 * failed commit, never uploads again.
 *
 * Pure with respect to git: the caller commits the rewritten pointers.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const LOVABLE = /^\/__l5e\//;

/** Pointers whose picture still lives on Lovable: [{ rel, abs, json, raw }]. */
export function pendingPointers(clone) {
  const out = [];
  (function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".asset.json")) {
        let raw, json;
        try { raw = fs.readFileSync(p, "utf8"); json = JSON.parse(raw); } catch { continue; }
        if (json && typeof json.url === "string" && LOVABLE.test(json.url)) {
          out.push({ rel: path.relative(clone, p).split(path.sep).join("/"), abs: p, json, raw });
        }
      }
    }
  })(path.join(clone, "src"));
  return out;
}

export function ensureLedger(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS asset_mirror (
    sha1 TEXT PRIMARY KEY, url TEXT NOT NULL, file_id TEXT, filename TEXT, size INTEGER, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS asset_skip (
    lovable_url TEXT PRIMARY KEY, reason TEXT NOT NULL, created_at TEXT NOT NULL
  )`);
}

const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const STOP = new Set(["QUOTA", "AUTH", "CONFIG"]);   // the rest of the run would fail the same way
/* a 429 that is not a quota: the host wants us slower, not gone */
const limited = (e) => e && e.status === 429 && e.code !== "QUOTA";
/* the host will never take this file through this key (size, type) */
const impossible = (e) => e && (e.status === 413 || e.status === 415 || e.status === 404 || /exceeds this key's maximum/i.test(String(e.message || "")));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* keep the pointer's own formatting: two-space JSON with a trailing newline
   is what Lovable writes; match whatever indent the file already has */
function rewrite(p, url) {
  const indent = (p.raw.match(/^\n?[ \t]*"[^"]+":/m) || [""])[0].match(/^[ \t]*/)[0] || "  ";
  const next = { ...p.json, url, lovableUrl: p.json.lovableUrl || p.json.url };
  fs.writeFileSync(p.abs, JSON.stringify(next, null, indent.length ? indent : 2) + (p.raw.endsWith("\n") ? "\n" : ""));
  return JSON.stringify(next, null, indent.length ? indent : 2) + (p.raw.endsWith("\n") ? "\n" : "");
}

/**
 * Move every pending picture. Bytes come from the clone's public/ copy when
 * the build already fetched them, else from `from` (Lovable's host).
 * `uploader.upload({ bytes, filename, mimeType })` returns { url, fileId }.
 * Returns { moved: [rel], files: { rel: contents }, failed: [{ rel, error }],
 * reused, stopped }.
 */
export async function mirrorAssets(clone, { from, uploader, db, concurrency = 2, timeout = 900e3, backoffMs = 5000, pace = 350, log = () => {} } = {}) {
  ensureLedger(db);
  const base = String(from || "").replace(/\/+$/, "");
  const skipRow = db.prepare("SELECT reason FROM asset_skip WHERE lovable_url = ?");
  const r = { moved: [], files: {}, failed: [], skipped: [], reused: 0, stopped: false };
  /* what the host has said it will never take is not asked for again */
  const todo = pendingPointers(clone).filter((p) => {
    const k = skipRow.get(p.json.url);
    if (k) { r.skipped.push({ rel: p.rel, reason: k.reason }); return false; }
    return true;
  });
  if (!todo.length) return r;
  const seen = db.prepare("SELECT url FROM asset_mirror WHERE sha1 = ?");
  const remember = db.prepare("INSERT OR IGNORE INTO asset_mirror (sha1, url, file_id, filename, size, created_at) VALUES (?,?,?,?,?,?)");
  const skip = db.prepare("INSERT OR IGNORE INTO asset_skip (lovable_url, reason, created_at) VALUES (?,?,?)");

  /* one upload with the host's pace: a 429 waits, doubling each time, and
     the whole run slows to one lane once the host has complained */
  let lane = concurrency, limitedOnce = false;
  const send = async (args) => {
    for (let attempt = 0; ; attempt++) {
      try { return await uploader.upload(args); }
      catch (e) {
        if (!limited(e) || attempt >= 7) throw e;
        limitedOnce = true; lane = 1;
        const wait = Math.min(backoffMs * Math.pow(2, attempt), 60000);
        log(`  mirror: rate limited, waiting ${(wait / 1000).toFixed(0)}s`);
        await sleep(wait);
      }
    }
  };

  let i = 0;
  const worker = async (id) => {
    while (i < todo.length && !r.stopped) {
      if (id >= lane) return;                       // a lane closed by the rate limit
      const p = todo[i++];
      try {
        /* the bytes: from disk when the build has them, else from Lovable */
        const local = path.join(clone, "public", p.json.url.replace(/^\/+/, ""));
        let bytes;
        if (fs.existsSync(local) && fs.statSync(local).size > 0) bytes = fs.readFileSync(local);
        else {
          if (!base) throw new Error("no host to fetch from");
          const res = await fetch(base + p.json.url, { signal: AbortSignal.timeout(timeout), headers: { "User-Agent": "Mozilla/5.0 (MU Console)", Referer: base + "/" } });
          if (!res.ok) { const e = new Error("HTTP " + res.status + " from Lovable"); if (res.status === 404 || res.status === 410) e.status = 404; throw e; }
          bytes = Buffer.from(await res.arrayBuffer());
          if (!bytes.length) throw new Error("empty file from Lovable");
        }
        const hash = sha1(bytes);
        const known = seen.get(hash);
        let url;
        if (known) { url = known.url; r.reused++; }
        else {
          const filename = p.json.original_filename || path.basename(p.json.url);
          const mimeType = p.json.mime_type || p.json.mimetype || mimeFor(filename);
          const out = await send({ bytes, filename, mimeType });
          url = out.url;
          remember.run(hash, url, out.fileId || null, filename, bytes.length, new Date().toISOString());
          if (pace) await sleep(pace);
        }
        r.files[p.rel] = rewrite(p, url);
        r.moved.push(p.rel);
        log(`  mirror: ${p.rel} -> ${url}${known ? " (reused)" : ""}`);
      } catch (e) {
        if (impossible(e)) {
          const reason = String(e.message || e).slice(0, 200);
          skip.run(p.json.url, reason, new Date().toISOString());
          r.skipped.push({ rel: p.rel, reason });
          log(`  mirror: ${p.rel} stays on Lovable (${reason})`);
          continue;
        }
        r.failed.push({ rel: p.rel, error: String(e.message || e) });
        if (STOP.has(e && e.code) || limited(e)) r.stopped = true;   // the host has said stop; the rest waits for the next pull
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, (_, id) => worker(id)));
  r.limited = limitedOnce;
  return r;
}

function mimeFor(name) {
  const ext = (name.match(/\.([a-z0-9]+)$/i) || ["", ""])[1].toLowerCase();
  return { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" }[ext] || "application/octet-stream";
}
