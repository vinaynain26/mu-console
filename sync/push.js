/**
 * Publish, for a page that came from the repo. Text drafts are written into
 * the source files, committed as the editor, pushed to the branch Lovable
 * syncs, and only then re-keyed in the database. Everything else a page can
 * carry (a picture, a link, a list, a date) is not written back yet: those
 * drafts go live the way they always did, as CMS values the site reads at
 * render, and the response says so. If the push fails, nothing changes.
 */
import fs from "node:fs";
import path from "node:path";
import * as repo from "./repo.js";
import { keyParts, hashText, clean } from "./scan.js";
import { keyParts7, hashText7 } from "./keys.js";
import { locate, splice } from "./writeback.js";
import { logEvent, setState } from "./store.js";

/* what can be written back: a text row with a scan-shaped key, or a picture
   or link row that a scan has placed in a file (src_file). Anything else,
   a list, a date, an item born in the CMS, goes live here only. */
const SCAN_KEY = /^[A-Za-z0-9_/.-]+\.[0-9a-f]{7,8}(-\d+)?$/;
const writable = (r) => SCAN_KEY.test(r.field_key) && !/\.(list|media|link|date):/.test(r.field_key) &&
  ((r.type === "text" || r.type === "rich") || ((r.type === "media" || r.type === "link") && r.src_file));

/* Where a field lives and which occurrence it is. A plugin key is
   "<scope>.<7hex>[-N]" and cannot name its file, so the row carries it in
   src_file; a lab key "<file.ext>.<8hex>" names the file itself. */
function locateRow(row) {
  const p7 = keyParts7(row.field_key);
  if (row.src_file && p7) return { file: row.src_file, hash: p7.hash, ordinal: p7.ordinal, scope: p7.scope, style: "plugin" };
  const lp = keyParts(row.field_key);
  return { file: row.src_file || lp.file, hash: lp.hash, ordinal: 1, scope: lp.scope, style: "lab" };
}
/* after a write the source holds the new value, and the field's identity
   follows it: text hashes as itself, a picture as "media:<url>", a link as
   "link:<url>", exactly as the plugin will key it on the next build */
const basisFor = (type, text) => type === "media" ? "media:" + text : type === "link" ? "link:" + text : text;
const newKeyFor = (loc, text, type) => loc.style === "plugin"
  ? loc.scope + "." + hashText7(basisFor(type, text)) + (loc.ordinal > 1 ? "-" + loc.ordinal : "")
  : loc.scope + "." + hashText(text);

export class SourceMovedError extends Error {
  constructor(missing) {
    super("The page changed in Lovable since the last sync: " + missing.map((m) => `"${m.label}" in ${m.file}`).join(", ") + ". Sync, then review the conflicts.");
    this.missing = missing;
  }
}

const short = (s, n = 80) => { s = clean(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

export async function pushPage(db, slug, { user }) {
  const page = db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug);
  if (!page?.repo) throw new Error("This page did not come from the repo, so there is nothing to push.");
  if (!repo.canPush()) throw new Error("Sync cannot push: set LOVABLE_TOKEN in .env.");
  const all0 = db.prepare(`SELECT field_key, label, value, draft_value, src_file, type FROM page_content
    WHERE page_slug = ? AND value <> draft_value AND retired = 0 ORDER BY section_ord, ord`).all(slug);
  /* A picture or link emptied in the CMS ("Original") has nothing to fall
     back to once the source names it by URL: writing "" would blank the
     picture on the site and lose the field. Such a draft is dropped, and
     the row goes back to what the source has. */
  const emptied = all0.filter((r) => writable(r) && (r.type === "media" || r.type === "link") && clean(r.draft_value) === "");
  if (emptied.length) {
    const back = db.prepare("UPDATE page_content SET draft_value = value WHERE page_slug = ? AND field_key = ?");
    for (const r of emptied) back.run(slug, r.field_key);
  }
  const all = all0.filter((r) => !emptied.includes(r));
  const pending = all.filter(writable), local = all.filter((r) => !writable(r));
  if (!all.length) return { pushed: 0, local: 0, published: 0, sha: null, files: [] };
  if (!pending.length) {
    /* nothing for the repo: a picture, a link, a list. Live in the CMS only. */
    goLiveLocal(db, slug, local, user);
    return { pushed: 0, local: local.length, published: local.length, sha: null, files: [] };
  }

  /* per file: which hashes to find, and the text each (hash, ordinal) becomes */
  const byFile = new Map();
  for (const p of pending) {
    const loc = locateRow(p);
    p.__loc = loc;
    if (!byFile.has(loc.file)) byFile.set(loc.file, { hashes: new Set(), text: new Map(), labels: new Map() });
    const f = byFile.get(loc.file);
    f.hashes.add(loc.hash);
    f.text.set(loc.hash + "#" + loc.ordinal, clean(p.draft_value));
    f.labels.set(loc.hash + "#" + loc.ordinal, p.label);
  }
  const message = `content(${slug}): ${pending.length} change${pending.length === 1 ? "" : "s"} via MU Console\n\n` +
    pending.map((p) => `${short(p.label, 40)}: ${short(p.value)} -> ${short(p.draft_value)}`).join("\n");

  const attempt = () => repo.serial(async () => {
    await repo.resetToRemote();
    const files = {}, missing = [];
    for (const [file, f] of byFile) {
      const abs = path.join(repo.cfg().clone, file);
      if (!fs.existsSync(abs)) { for (const id of f.text.keys()) missing.push({ file, label: f.labels.get(id) }); continue; }
      const src = fs.readFileSync(abs, "utf8");
      const hits = locate(src, f.hashes);
      const found = new Set(hits.map((h) => h.hash + "#" + h.ordinal));
      for (const id of f.text.keys()) if (!found.has(id)) missing.push({ file, label: f.labels.get(id) });
      files[file] = splice(src, hits, (h) => f.text.get(h.hash + "#" + h.ordinal));
    }
    if (missing.length) throw new SourceMovedError(missing);
    return repo.commitAndPush({ files, message, author: { name: user.name, email: user.email } });
  });

  let out;
  try { out = await attempt(); }
  catch (e) {
    if (e instanceof SourceMovedError) throw e;
    /* most likely Lovable pushed while we were writing: once more from the new head */
    out = await attempt();
  }
  const sha = out.sha || await repo.localHead();
  if (out.sha && !(await repo.verifyPushed(out.sha))) {
    throw new Error("The commit was pushed but the remote head is not it. Check the repository before publishing again.");
  }
  rekey(db, slug, pending, sha, user, out.changed, local);
  return { pushed: pending.length, local: local.length, published: pending.length + local.length, sha: out.sha, files: out.changed };
}

/** Drafts the repo cannot take yet: flip them live here, with a revision. */
function goLiveLocal(db, slug, rows, user, now = new Date().toISOString()) {
  const rev = db.prepare("INSERT INTO revisions (page_slug, field_key, old_value, new_value, changed_by, changed_at) VALUES (?,?,?,?,?,?)");
  const live = db.prepare("UPDATE page_content SET value = draft_value, updated_at = ?, updated_by = ? WHERE page_slug = ? AND field_key = ?");
  db.exec("BEGIN");
  try {
    for (const r of rows) { rev.run(slug, r.field_key, r.value, r.draft_value, user.name, now); live.run(now, user.name, slug, r.field_key); }
    if (rows.length) db.prepare("INSERT INTO publishes (page_slug, user_id, user_name, user_email, fields, published_at) VALUES (?,?,?,?,?,?)")
      .run(slug, user.id ?? null, user.name, user.email, rows.length, now);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

/* After the source holds the new text, the field's key is the hash of that
   text. Rename the row in place so drafts, comments and revisions follow. */
function rekey(db, slug, pending, sha, user, files, local = []) {
  const now = new Date().toISOString();
  const liveLocal = db.prepare("UPDATE page_content SET value = draft_value, updated_at = ?, updated_by = ? WHERE page_slug = ? AND field_key = ?");
  const exists = db.prepare("SELECT 1 FROM page_content WHERE page_slug = ? AND field_key = ?");
  const rename = db.prepare(`UPDATE page_content SET field_key = ?, value = ?, draft_value = ?, updated_at = ?, updated_by = ?
    WHERE page_slug = ? AND field_key = ?`);
  const fold = db.prepare("UPDATE page_content SET retired = 1, value = draft_value WHERE page_slug = ? AND field_key = ?");
  /* the key the text now hashes to may belong to a retired row from an earlier
     life, holding whatever the CMS showed there then (a picture's key is its
     URL, its value an override). The source now reads this text at this
     spot, so that row wakes carrying it, or the pull revives it stale. */
  const revive = db.prepare(`UPDATE page_content SET retired = 0, value = ?, draft_value = ?, updated_at = ?, updated_by = ?
    WHERE page_slug = ? AND field_key = ? AND retired = 1`);
  const moveRev = db.prepare("UPDATE revisions SET field_key = ? WHERE page_slug = ? AND field_key = ?");
  const moveCom = db.prepare("UPDATE comments SET field_key = ? WHERE page_slug = ? AND field_key = ?");
  const rev = db.prepare("INSERT INTO revisions (page_slug, field_key, old_value, new_value, changed_by, changed_at) VALUES (?,?,?,?,?,?)");
  db.exec("BEGIN");
  try {
    for (const p of pending) {
      const text = clean(p.draft_value);
      const newKey = newKeyFor(p.__loc, text, p.type);
      if (newKey !== p.field_key && exists.get(slug, newKey)) {
        fold.run(slug, p.field_key);               // the editor typed another field's text: one field now
        revive.run(text, text, now, user.name, slug, newKey);
      } else {
        rename.run(newKey, text, text, now, user.name, slug, p.field_key);
        moveRev.run(newKey, slug, p.field_key);
        moveCom.run(newKey, slug, p.field_key);
      }
      rev.run(slug, newKey, p.value, text, user.name, now);
    }
    /* the drafts the repo could not take ride along, live in the CMS */
    for (const r of local) { rev.run(slug, r.field_key, r.value, r.draft_value, user.name, now); liveLocal.run(now, user.name, slug, r.field_key); }
    db.prepare("UPDATE pages SET ingested_sha = ? WHERE slug = ?").run(sha, slug);
    db.prepare("INSERT INTO publishes (page_slug, user_id, user_name, user_email, fields, published_at) VALUES (?,?,?,?,?,?)")
      .run(slug, user.id ?? null, user.name, user.email, pending.length + local.length, now);
    logEvent(db, { direction: "push", sha, summary: `${pending.length} change${pending.length === 1 ? "" : "s"} to ${slug} in ${files.join(", ") || "no files"}`, actor: user.name });
    setState(db, { last_push_sha: sha, last_push_at: now, last_error: null });
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
