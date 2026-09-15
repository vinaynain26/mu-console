import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ensureSchema } from "../sync/store.js";

/* The CMS tables the sync code touches, copied from server.js so tests need
   no server. Keep in step with server.js if those tables change. */
export function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE pages (slug TEXT PRIMARY KEY, title TEXT NOT NULL, template TEXT NOT NULL,
      layout TEXT NOT NULL DEFAULT 'main', source TEXT NOT NULL DEFAULT 'handbuilt');
    CREATE TABLE page_content (
      page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
      section_key TEXT NOT NULL, section_title TEXT NOT NULL, section_ord INTEGER NOT NULL DEFAULT 0,
      tab_key TEXT NOT NULL DEFAULT '_all', tab_title TEXT NOT NULL DEFAULT 'Shown on every tab',
      label TEXT NOT NULL, tag TEXT, multiline INTEGER NOT NULL DEFAULT 0, ord INTEGER NOT NULL DEFAULT 0,
      value TEXT NOT NULL, draft_value TEXT NOT NULL, updated_at TEXT, updated_by TEXT,
      retired INTEGER NOT NULL DEFAULT 0, options TEXT, type TEXT NOT NULL DEFAULT 'text',
      PRIMARY KEY (page_slug, field_key));
    CREATE TABLE revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
      old_value TEXT, new_value TEXT, changed_by TEXT, changed_at TEXT);
    CREATE TABLE publishes (id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL,
      user_id INTEGER, user_name TEXT, user_email TEXT, fields INTEGER NOT NULL, published_at TEXT);
    CREATE TABLE comments (id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
      body TEXT NOT NULL, author_id INTEGER, author_name TEXT, created_at TEXT, resolved INTEGER NOT NULL DEFAULT 0);
  `);
  ensureSchema(db);
  return db;
}

export const tmpDir = (name) => fs.mkdtempSync(path.join(os.tmpdir(), name + "-"));

const git = (args, cwd) => execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd, stdio: "pipe" }).toString().trim();

/** A bare repo whose `main` holds a copy of `srcDir`. Returns { bare, work, git }. */
export function makeRemote(srcDir) {
  const root = tmpDir("sync-remote");
  const bare = path.join(root, "origin.git");
  const work = path.join(root, "seed");
  git(["init", "-q", "--bare", "-b", "main", bare], root);
  git(["clone", "-q", bare, work], root);
  fs.cpSync(srcDir, work, { recursive: true });
  git(["add", "-A"], work);
  git(["commit", "-q", "-m", "seed"], work);
  git(["push", "-q", "origin", "main"], work);
  return { bare, work, git: (args) => git(args, work) };
}

/** Point sync/repo.js at a local remote for the duration of a test. */
export function useRemote(bare, cloneDir) {
  process.env.LOVABLE_REPO = bare;
  process.env.LOVABLE_TOKEN = "";
  process.env.LOVABLE_BRANCH = "main";
  process.env.SYNC_CLONE_DIR = cloneDir;
  process.env.SYNC_SLUG_PREFIX = "lab";
}

export const FIXTURE_APP = new URL("./fixtures/app/", import.meta.url).pathname;
