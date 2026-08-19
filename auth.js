/**
 * Identity, roles and sessions.
 *
 * Before this, `role` was a <select> in the browser sent in the request body,
 * so anyone could pick "Admin" and publish. That is survivable for a form on a
 * private URL and fatal for an edit button that lives on the public page. The
 * role now comes from a session cookie and is never read from input.
 */
import crypto from "node:crypto";

export const ROLES = ["viewer", "commenter", "editor", "admin"];

const PERMS = {
  viewer:    ["read"],
  commenter: ["read", "comment"],
  editor:    ["read", "comment", "edit", "ai"],
  admin:     ["read", "comment", "edit", "ai", "publish", "reorder", "users"],
};

export const ROLE_LABEL = {
  viewer:    "Viewer",
  commenter: "Commenter",
  editor:    "Editor",
  admin:     "Admin",
};
export const ROLE_BLURB = {
  viewer:    "Can see drafts and comments. Changes nothing.",
  commenter: "Can leave notes on any field.",
  editor:    "Can edit text, use the AI writer, and save drafts.",
  admin:     "Can publish, reorder sections and manage people.",
};

export const can = (role, action) => (PERMS[role] || []).includes(action);

/* ---------------- passwords: scrypt, from node's own crypto ---------------- */
export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(String(password), salt, 64).toString("hex"), salt };
}
export function verifyPassword(password, hash, salt) {
  const attempt = crypto.scryptSync(String(password), salt, 64);
  const known = Buffer.from(hash, "hex");
  if (attempt.length !== known.length) return false;
  return crypto.timingSafeEqual(attempt, known);
}

/* ---------------- schema + the seeded team ---------------- */
const SESSION_DAYS = 14;

/** Deliberately fixed, as asked: one known login, no invite flow to run. */
export const DEFAULT_EMAIL = process.env.ADMIN_EMAIL || "figma.uiux@mastersunion.org";
export const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "mastersunion";

const TEAM = [
  { email: DEFAULT_EMAIL,                   name: "Vinay",         role: "admin" },
  { email: "editor@mastersunion.org",       name: "Content Editor", role: "editor" },
  { email: "reviewer@mastersunion.org",     name: "Reviewer",       role: "commenter" },
  { email: "viewer@mastersunion.org",       name: "Viewer",         role: "viewer" },
];

export function initAuth(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'editor',
      pass_hash  TEXT NOT NULL,
      pass_salt  TEXT NOT NULL,
      created_at TEXT,
      last_seen  TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      created_at TEXT,
      expires_at TEXT
    );
  `);

  const ins = db.prepare(`INSERT OR IGNORE INTO users
    (email,name,role,pass_hash,pass_salt,created_at) VALUES (?,?,?,?,?,?)`);
  const now = new Date().toISOString();
  let made = 0;
  for (const t of TEAM) {
    const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
    made += ins.run(t.email, t.name, t.role, hash, salt, now).changes;
  }
  if (made) {
    console.log("\n  ┌─ sign in ───────────────────────────────────────────");
    console.log("  │  " + DEFAULT_EMAIL + "  /  " + DEFAULT_PASSWORD);
    console.log("  │  " + made + " accounts seeded, one per role, same password.");
    console.log("  └─────────────────────────────────────────────────────");
  }
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
}

/* ---------------- sessions ---------------- */
export const COOKIE = "mu_session";

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 864e5);
  db.prepare("INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)")
    .run(token, userId, now.toISOString(), expires.toISOString());
  return { token, expires };
}

export const destroySession = (db, token) => {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
};

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return null;
}

export function currentUser(db, req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?
  `).get(token);
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) { destroySession(db, token); return null; }
  return row;
}

export const attachUser = (db) => (req, _res, next) => {
  req.user = currentUser(db, req);
  next();
};

/** Guards a route. Reads the role from the session only — never from the body. */
export const require_ = (action) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Please sign in." });
  if (!can(req.user.role, action)) {
    const article = /^[aeiou]/.test(req.user.role) ? "An" : "A";
    return res.status(403).json({ error: `${article} ${req.user.role} cannot ${action}. Ask an admin.` });
  }
  next();
};

export const setSessionCookie = (res, token, expires) =>
  res.setHeader("Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}`);

export const clearSessionCookie = (res) =>
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
