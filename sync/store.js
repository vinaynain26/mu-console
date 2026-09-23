/**
 * Sync bookkeeping: three small tables and three columns on `pages`, plus
 * the approval queue (a change request and its before/after items).
 * Everything else about a field stays in page_content, untouched.
 */
export function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_remote_sha TEXT, last_scan_at TEXT, last_push_sha TEXT, last_push_at TEXT, last_error TEXT
    );
    INSERT OR IGNORE INTO sync_state (id) VALUES (1);
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL, sha TEXT,
      summary TEXT NOT NULL, actor TEXT, at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, file TEXT NOT NULL,
      old_key TEXT NOT NULL, new_key TEXT, label TEXT,
      original TEXT NOT NULL, theirs TEXT, mine TEXT NOT NULL,
      created_at TEXT NOT NULL, resolved_at TEXT, resolution TEXT
    );
    CREATE TABLE IF NOT EXISTS change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, page_title TEXT,
      user_id INTEGER, user_name TEXT NOT NULL, user_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending', items INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      decided_by TEXT, decided_at TEXT, note TEXT, sha TEXT, error TEXT
    );
    CREATE INDEX IF NOT EXISTS cr_status ON change_requests (status, created_at);
    CREATE INDEX IF NOT EXISTS cr_page_user ON change_requests (page_slug, user_id, status);
    CREATE TABLE IF NOT EXISTS change_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL,
      field_key TEXT NOT NULL, label TEXT, section_title TEXT, type TEXT, src_file TEXT,
      before TEXT NOT NULL, after TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS cri_request ON change_request_items (request_id);
  `);
  const cols = db.prepare("PRAGMA table_info(pages)").all().map((c) => c.name);
  for (const col of ["repo", "branch", "ingested_sha"]) {
    if (!cols.includes(col)) db.exec(`ALTER TABLE pages ADD COLUMN ${col} TEXT`);
  }
  /* what happened on Lovable after an accepted push: null (not published
     yet), running, completed (live at deploy_url) or error */
  const rcols = db.prepare("PRAGMA table_info(change_requests)").all().map((c) => c.name);
  for (const col of ["deploy_status", "deploy_id", "deploy_url", "deploy_error", "deployed_at", "check_since"]) {
    if (!rcols.includes(col)) db.exec(`ALTER TABLE change_requests ADD COLUMN ${col} TEXT`);
  }
}

export const getState = (db) => db.prepare("SELECT * FROM sync_state WHERE id = 1").get();

export function setState(db, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  db.prepare(`UPDATE sync_state SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = 1`)
    .run(...keys.map((k) => patch[k]));
}

export function logEvent(db, { direction, sha = null, summary, actor = null }) {
  db.prepare("INSERT INTO sync_log (direction, sha, summary, actor, at) VALUES (?,?,?,?,?)")
    .run(direction, sha, summary, actor, new Date().toISOString());
}

export const recentLog = (db, n = 30) => db.prepare("SELECT * FROM sync_log ORDER BY id DESC LIMIT ?").all(n);

export function addConflict(db, c) {
  const info = db.prepare(`INSERT INTO sync_conflicts
    (page_slug, file, old_key, new_key, label, original, theirs, mine, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(c.page_slug, c.file, c.old_key, c.new_key ?? null, c.label ?? null, c.original, c.theirs ?? null, c.mine, new Date().toISOString());
  return Number(info.lastInsertRowid);
}

export const openConflicts = (db) =>
  db.prepare("SELECT * FROM sync_conflicts WHERE resolved_at IS NULL ORDER BY id DESC").all();

export const getConflict = (db, id) => db.prepare("SELECT * FROM sync_conflicts WHERE id = ?").get(id);

export function resolveConflict(db, id, resolution) {
  db.prepare("UPDATE sync_conflicts SET resolved_at = ?, resolution = ? WHERE id = ? AND resolved_at IS NULL")
    .run(new Date().toISOString(), resolution, id);
}
