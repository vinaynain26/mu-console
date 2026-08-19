#!/usr/bin/env node
/**
 * CARRY EDITS ACROSS A KEY SHIFT.
 *
 * Field keys are positional — `s5.h21` is "the 21st field the extractor found in
 * section 5". So any change to what the extractor matches (a wider tag list, a
 * new pass for links or states) renumbers everything after it, and an edit that
 * was sitting on the old key is stranded: preserved in the table, rendering
 * nowhere.
 *
 * This finds those stranded edits and moves them onto the key that now holds
 * the same piece of copy. Matching is deliberately strict — same section, same
 * element, same ORIGINAL wording, and the destination must be untouched — so it
 * would rather skip than put someone's words in the wrong slot.
 *
 *   node scripts/heal-drift.mjs [--apply]
 */
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(import.meta.dirname, "..");
const db = new DatabaseSync(path.join(ROOT, "data/content.db"));
const apply = process.argv.includes("--apply");

/** What did this field say before anyone touched it? */
function originalOf(slug, key, current) {
  const first = db.prepare(
    "SELECT old_value FROM revisions WHERE page_slug = ? AND field_key = ? ORDER BY id ASC LIMIT 1"
  ).get(slug, key);
  return first ? first.old_value : current;
}

const slugs = db.prepare("SELECT slug FROM pages").all().map((r) => r.slug);
let moved = 0, skipped = 0;

for (const slug of slugs) {
  const stranded = db.prepare(`
    SELECT field_key, section_key, tag, value, draft_value, updated_at, updated_by
    FROM page_content
    WHERE page_slug = ? AND retired = 1
      AND updated_by IS NOT NULL AND updated_by <> 'import'
  `).all(slug);

  for (const f of stranded) {
    const was = originalOf(slug, f.field_key, f.value);

    // the destination must be the same copy, in the same place, still untouched
    const hits = db.prepare(`
      SELECT field_key, value FROM page_content
      WHERE page_slug = ? AND retired = 0
        AND section_key = ? AND tag = ? AND value = ?
        AND updated_by = 'import' AND value = draft_value
    `).all(slug, f.section_key, f.tag, was);

    if (hits.length !== 1) {
      skipped++;
      console.log(`  skip  ${f.field_key}  (${hits.length} candidates for ${JSON.stringify(was.slice(0, 40))})`);
      continue;
    }
    const dest = hits[0].field_key;
    console.log(`  move  ${f.field_key} -> ${dest}   ${JSON.stringify(f.value.slice(0, 45))}`);
    if (apply) {
      db.prepare(`UPDATE page_content SET value = ?, draft_value = ?, updated_at = ?, updated_by = ?
                  WHERE page_slug = ? AND field_key = ?`)
        .run(f.value, f.draft_value, f.updated_at, f.updated_by, slug, dest);
      // keep history pointing at something that exists
      db.prepare("UPDATE revisions SET field_key = ? WHERE page_slug = ? AND field_key = ?")
        .run(dest, slug, f.field_key);
      db.prepare("DELETE FROM page_content WHERE page_slug = ? AND field_key = ?").run(slug, f.field_key);
    }
    moved++;
  }
}

console.log(`\n  ${apply ? "moved" : "would move"} ${moved}, skipped ${skipped}`);
if (!apply && moved) console.log("  re-run with --apply to write the changes\n");
