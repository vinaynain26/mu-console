/**
 * A scan becomes rows. Rows whose key survived keep their value and draft.
 * New keys are inserted with the source text as both. Keys that vanished are
 * retired, and when a retired key carried an unpublished draft that is a
 * conflict: the designer changed text the editor was still working on.
 */
import { addConflict } from "./store.js";

export function applyScan(db, scanResult, { repo, branch, sha, prefix = "lab", actor = "lovable" }) {
  const now = new Date().toISOString();
  const upPage = db.prepare(`INSERT INTO pages (slug, title, template, layout, source, repo, branch, ingested_sha)
    VALUES (?, ?, '__external', 'main', 'github', ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET title = excluded.title, repo = excluded.repo, branch = excluded.branch,
      ingested_sha = excluded.ingested_sha, source = 'github', template = '__external'`);
  const ins = db.prepare(`INSERT INTO page_content
    (page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title, label, tag, type, multiline, ord,
     value, draft_value, updated_at, updated_by, retired)
    VALUES (?,?,?,?,?,'_all','Whole page',?,?,?,?,?,?,?,?,?,0)
    ON CONFLICT(page_slug, field_key) DO UPDATE SET
      section_key = excluded.section_key, section_title = excluded.section_title, section_ord = excluded.section_ord,
      label = excluded.label, tag = excluded.tag, type = excluded.type, multiline = excluded.multiline, ord = excluded.ord, retired = 0`);
  const live = db.prepare(`SELECT field_key, section_key, tag, ord, label, value, draft_value
    FROM page_content WHERE page_slug = ? AND retired = 0`);
  const exists = db.prepare("SELECT retired FROM page_content WHERE page_slug = ? AND field_key = ?");
  const retire = db.prepare("UPDATE page_content SET retired = 1 WHERE page_slug = ? AND field_key = ?");

  const report = [];
  db.exec("BEGIN");
  try {
    for (const p of scanResult.pages) {
      const slug = `${prefix}-${p.slug}`;
      upPage.run(slug, p.title, repo, branch, sha);
      const before = new Map(live.all(slug).map((r) => [r.field_key, r]));
      const found = new Set();
      const fresh = [];                              // fields not in the DB before this apply
      let added = 0, kept = 0, sOrd = 0;
      for (const s of p.sections) {
        sOrd++;
        let ord = 0;
        for (const f of s.fields) {
          ord++;
          found.add(f.key);
          const was = exists.get(slug, f.key);
          ins.run(slug, f.key, s.key, s.title, sOrd, f.label, f.tag, f.type, f.value.length > 80 ? 1 : 0, ord, f.value, f.value, now, actor);
          if (was) kept++; else { added++; fresh.push({ ...f, section_key: s.key, ord }); }
        }
      }
      let retired = 0, conflicts = 0;
      for (const [key, r] of before) {
        if (found.has(key)) continue;
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
      report.push({ slug, route: p.route, title: p.title, added, kept, retired, conflicts });
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return report;
}
