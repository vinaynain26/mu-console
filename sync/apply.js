/**
 * A scan becomes rows. Rows whose key survived keep their value and draft.
 * New keys are inserted with the source text as both. Keys that vanished are
 * retired, and when a retired key carried an unpublished draft that is a
 * conflict: the designer changed text the editor was still working on.
 *
 * A kept key whose CMS value differs from the source text is an edit the
 * repo never received (published in the CMS before the repo was connected,
 * or pushed and lost). It becomes a pending draft over the repo's text, so
 * it shows up as unpublished and one Publish carries it into the repo.
 *
 * The scanner only ever retires rows it could have produced: plain text
 * rows with a scan-shaped key. Pictures, links, dates, list structures and
 * items born in the CMS are other features' rows and are left untouched.
 */
import { addConflict } from "./store.js";
import { clean } from "./scan.js";

/* a key this scanner could have produced: lab "<file.ext>.<8hex>" or plugin "<scope>.<7hex>[-N]" */
const SCAN_KEY = /^[A-Za-z0-9_/.-]+\.[0-9a-f]{7,8}(-\d+)?$/;
const ownsRow = (r) => (r.type === "text" || r.type === "rich") && SCAN_KEY.test(r.field_key) && !/\.(list|media|link|date):/.test(r.field_key);

export function ensureContentColumns(db) {
  const cols = db.prepare("PRAGMA table_info(page_content)").all().map((c) => c.name);
  if (!cols.includes("src_file")) db.exec("ALTER TABLE page_content ADD COLUMN src_file TEXT");
}

export function applyScan(db, scanResult, { repo, branch, sha, prefix = "lab", actor = "lovable" }) {
  ensureContentColumns(db);
  const now = new Date().toISOString();
  const pluginStyle = scanResult.profile === "plugin";
  /* a plugin-profile page is an instrumented app page, the kind the studio
     folds `shared` into; a lab page is a plain github page */
  const newSource = pluginStyle ? "instrumented" : "github";
  const upPage = db.prepare(`INSERT INTO pages (slug, title, template, layout, source, repo, branch, ingested_sha)
    VALUES (?, ?, '__external', 'main', ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET repo = excluded.repo, branch = excluded.branch, ingested_sha = excluded.ingested_sha`);
  const ins = db.prepare(`INSERT INTO page_content
    (page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title, label, tag, type, multiline, ord,
     value, draft_value, updated_at, updated_by, retired, src_file)
    VALUES (?,?,?,?,?,'_all','Whole page',?,?,?,?,?,?,?,?,?,0,?)
    ON CONFLICT(page_slug, field_key) DO UPDATE SET
      section_key = excluded.section_key, section_title = excluded.section_title, section_ord = excluded.section_ord,
      label = excluded.label, tag = excluded.tag, multiline = excluded.multiline, ord = excluded.ord, retired = 0, src_file = excluded.src_file`);
  const live = db.prepare(`SELECT field_key, section_key, tag, ord, label, value, draft_value, type
    FROM page_content WHERE page_slug = ? AND retired = 0`);
  const exists = db.prepare("SELECT value, draft_value FROM page_content WHERE page_slug = ? AND field_key = ?");
  const retire = db.prepare("UPDATE page_content SET retired = 1 WHERE page_slug = ? AND field_key = ?");
  const reconcileRow = db.prepare("UPDATE page_content SET value = ?, draft_value = ? WHERE page_slug = ? AND field_key = ?");

  const report = [];
  db.exec("BEGIN");
  try {
    for (const p of scanResult.pages) {
      const slug = prefix ? `${prefix}-${p.slug}` : p.slug;
      upPage.run(slug, p.title, newSource, repo, branch, sha);
      const before = new Map(live.all(slug).map((r) => [r.field_key, r]));
      const found = new Set();
      const fresh = [];                              // fields not in the DB before this apply
      let added = 0, kept = 0, reconciled = 0, sOrd = 0;
      for (const s of p.sections) {
        sOrd++;
        let ord = 0;
        for (const f of s.fields) {
          ord++;
          found.add(f.key);
          const was = exists.get(slug, f.key);
          ins.run(slug, f.key, s.key, s.title, sOrd, f.label, f.tag, f.type, f.value.length > 80 ? 1 : 0, ord, f.value, f.value, now, actor, f.file || null);
          if (!was) { added++; fresh.push({ ...f, section_key: s.key, ord }); continue; }
          kept++;
          /* the key is the hash of the source text, so a kept key means the
             source still reads as it did at seed time; a different CMS value
             is an edit the repo never got. Keep it, as a draft. */
          if (clean(was.value) !== clean(f.value)) {
            const draft = was.draft_value !== was.value ? was.draft_value : was.value;
            reconcileRow.run(f.value, draft, slug, f.key);
            reconciled++;
          }
        }
      }
      let retired = 0, conflicts = 0;
      for (const [key, r] of before) {
        if (found.has(key) || !ownsRow(r)) continue;
        if (r.draft_value !== r.value) {
          /* the replacement, if any: a brand-new field in the same file, same
             tag, same position; else the first new field in that file with the
             same tag; else nothing (the designer deleted it) */
          const same = fresh.filter((f) => f.section_key === r.section_key && f.tag === r.tag);
          const theirs = same.find((f) => f.ord === r.ord) || same[0] || null;
          addConflict(db, { page_slug: slug, file: "src/" + key.slice(0, key.lastIndexOf(".")), old_key: key,
            new_key: theirs ? theirs.key : null, label: r.label, original: r.value, theirs: theirs ? theirs.value : null, mine: r.draft_value });
          conflicts++;
        }
        retire.run(slug, key);
        retired++;
      }
      report.push({ slug, route: p.route, title: p.title, added, kept, retired, conflicts, reconciled });
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return report;
}
