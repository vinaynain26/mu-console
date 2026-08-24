/**
 * Backfill page_content.type from the free-form `tag` column.
 *
 * `tag` records where the extractor found a value (h2, label, src, state…);
 * `type` records what kind of value it is, which is what the editor's controls
 * key off. One-time and idempotent: reruns only touch rows whose type no
 * longer matches what the mapping says, and never touch a type the mapping
 * doesn't know (so hand-set types like `color` survive).
 *
 *   node scripts/migrate-types.mjs           # dry run
 *   node scripts/migrate-types.mjs --apply
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new DatabaseSync(path.join(ROOT, "data/content.db"));
const apply = process.argv.includes("--apply");

/* tag -> type. Everything unlisted stays text. */
const BY_TAG = {
  rich: "rich",
  media: "media", image: "media", src: "media", poster: "media",
  link: "link", href: "link", to: "link", a: "link",
  state: "select",
  deadline: "date", nextDate: "date", date: "date",
};

const rows = db.prepare("SELECT page_slug, field_key, tag, type FROM page_content").all();
const changes = [];
for (const r of rows) {
  const want = BY_TAG[r.tag] || (r.tag === "meta" ? "meta" : null);
  if (want && r.type !== want) changes.push({ ...r, want });
}

const counts = {};
for (const c of changes) counts[`${c.type} -> ${c.want}`] = (counts[`${c.type} -> ${c.want}`] || 0) + 1;
console.log(`${rows.length} rows, ${changes.length} to update`);
for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`);

if (!apply) {
  console.log(changes.length ? "\nDry run — pass --apply to write." : "\nNothing to do.");
  process.exit(0);
}
const upd = db.prepare("UPDATE page_content SET type = ? WHERE page_slug = ? AND field_key = ?");
let n = 0;
for (const c of changes) n += upd.run(c.want, c.page_slug, c.field_key).changes;
console.log(`\nUpdated ${n} rows.`);
