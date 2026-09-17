/**
 * Publish, for a page that came from the repo: the page's drafts are written
 * into the source files, committed as the editor, pushed to the branch
 * Lovable syncs, and only then re-keyed in the database. If anything fails
 * before the push is verified, the database does not change.
 */
import fs from "node:fs";
import path from "node:path";
import * as repo from "./repo.js";
import { keyParts, hashText, clean } from "./scan.js";
import { keyParts7, hashText7 } from "./keys.js";
import { locate, splice } from "./writeback.js";
import { logEvent, setState } from "./store.js";

/* Where a field lives and which occurrence it is. A plugin key is
   "<scope>.<7hex>[-N]" and cannot name its file, so the row carries it in
   src_file; a lab key "<file.ext>.<8hex>" names the file itself. */
function locateRow(row) {
  const p7 = keyParts7(row.field_key);
  if (row.src_file && p7) return { file: row.src_file, hash: p7.hash, ordinal: p7.ordinal, scope: p7.scope, style: "plugin" };
  const lp = keyParts(row.field_key);
  return { file: row.src_file || lp.file, hash: lp.hash, ordinal: 1, scope: lp.scope, style: "lab" };
}
const newKeyFor = (loc, text) => loc.style === "plugin"
  ? loc.scope + "." + hashText7(text) + (loc.ordinal > 1 ? "-" + loc.ordinal : "")
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
  const pending = db.prepare(`SELECT field_key, label, value, draft_value, src_file FROM page_content
    WHERE page_slug = ? AND value <> draft_value AND retired = 0 ORDER BY section_ord, ord`).all(slug);
  if (!pending.length) return { pushed: 0, sha: null, files: [] };

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
  rekey(db, slug, pending, sha, user, out.changed);
  return { pushed: pending.length, sha: out.sha, files: out.changed };
}

/* After the source holds the new text, the field's key is the hash of that
   text. Rename the row in place so drafts, comments and revisions follow. */
function rekey(db, slug, pending, sha, user, files) {
  const now = new Date().toISOString();
  const exists = db.prepare("SELECT 1 FROM page_content WHERE page_slug = ? AND field_key = ?");
  const rename = db.prepare(`UPDATE page_content SET field_key = ?, value = ?, draft_value = ?, updated_at = ?, updated_by = ?
    WHERE page_slug = ? AND field_key = ?`);
  const fold = db.prepare("UPDATE page_content SET retired = 1, value = draft_value WHERE page_slug = ? AND field_key = ?");
  const moveRev = db.prepare("UPDATE revisions SET field_key = ? WHERE page_slug = ? AND field_key = ?");
  const moveCom = db.prepare("UPDATE comments SET field_key = ? WHERE page_slug = ? AND field_key = ?");
  const rev = db.prepare("INSERT INTO revisions (page_slug, field_key, old_value, new_value, changed_by, changed_at) VALUES (?,?,?,?,?,?)");
  db.exec("BEGIN");
  try {
    for (const p of pending) {
      const text = clean(p.draft_value);
      const newKey = newKeyFor(p.__loc, text);
      if (newKey !== p.field_key && exists.get(slug, newKey)) {
        fold.run(slug, p.field_key);               // the editor typed another field's text: one field now
      } else {
        rename.run(newKey, text, text, now, user.name, slug, p.field_key);
        moveRev.run(newKey, slug, p.field_key);
        moveCom.run(newKey, slug, p.field_key);
      }
      rev.run(slug, newKey, p.value, text, user.name, now);
    }
    db.prepare("UPDATE pages SET ingested_sha = ? WHERE slug = ?").run(sha, slug);
    db.prepare("INSERT INTO publishes (page_slug, user_id, user_name, user_email, fields, published_at) VALUES (?,?,?,?,?,?)")
      .run(slug, user.id ?? null, user.name, user.email, pending.length, now);
    logEvent(db, { direction: "push", sha, summary: `${pending.length} change${pending.length === 1 ? "" : "s"} to ${slug} in ${files.join(", ") || "no files"}`, actor: user.name });
    setState(db, { last_push_sha: sha, last_push_at: now, last_error: null });
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
