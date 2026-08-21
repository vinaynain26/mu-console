/**
 * A small content system for the existing Handlebars site.
 *
 *   1. a content table            (data/content.db, SQLite)
 *   2. an admin studio            (/console — auth lives on its own slug)
 *   3. a render-time hook         (the `c` helper)
 *   4. an inline editor           (injected into the live page for signed-in editors)
 *   5. an AI writer               (Claude, grounded in data/voice-guide.md)
 *
 * The template is untouched apart from hardcoded text becoming {{{c "key"}}}.
 */
import express from "express";
import { engine } from "express-handlebars";
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as auth from "./auth.js";
import * as ai from "./ai.js";

const ROOT = import.meta.dirname;

/* Secrets live in .env on disk, never in a command line or a shell history.
   Node reads it natively; if the file is absent nothing happens. */
try {
  if (fs.existsSync(path.join(ROOT, ".env"))) process.loadEnvFile(path.join(ROOT, ".env"));
} catch { /* older node without loadEnvFile — export the vars manually */ }

const PORT = process.env.PORT || 4000;
/* The studio sits on its own slug so the public page and the editing surface
   never share a namespace. Override with CONSOLE_SLUG. */
const CONSOLE = "/" + (process.env.CONSOLE_SLUG || "console").replace(/^\/+|\/+$/g, "");
const app = express();

/* The play/pause artwork this page already uses on its video sections — reused
   so a video an editor swaps in looks native instead of bolted on. */
const MU_PLAY  = "https://images.mastersunion.link/uploads/16062025/v2/MainButton.svg";
const MU_PAUSE = "https://images.mastersunion.link/uploads/27062025/v1/MainButton4.svg";

/* ------------------------------------------------------------------ *
 * database
 * ------------------------------------------------------------------ */
const db = new DatabaseSync(path.join(ROOT, "data/content.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS pages (
    slug TEXT PRIMARY KEY, title TEXT NOT NULL, template TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS page_content (
    page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
    section_key TEXT NOT NULL, section_title TEXT NOT NULL, section_ord INTEGER NOT NULL DEFAULT 0,
    tab_key TEXT NOT NULL DEFAULT '_all', tab_title TEXT NOT NULL DEFAULT 'Shown on every tab',
    label TEXT NOT NULL, tag TEXT, multiline INTEGER NOT NULL DEFAULT 0, ord INTEGER NOT NULL DEFAULT 0,
    value TEXT NOT NULL, draft_value TEXT NOT NULL, updated_at TEXT, updated_by TEXT,
    PRIMARY KEY (page_slug, field_key)
  );
  CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
    old_value TEXT, new_value TEXT, changed_by TEXT, changed_at TEXT
  );

  /* who published, when, and how much — the audit trail the old build had no
     way to answer because nobody had an identity. */
  CREATE TABLE IF NOT EXISTS publishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL,
    user_id INTEGER, user_name TEXT, user_email TEXT,
    fields INTEGER NOT NULL, published_at TEXT
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, page_slug TEXT NOT NULL, field_key TEXT NOT NULL,
    body TEXT NOT NULL, author_id INTEGER, author_name TEXT,
    created_at TEXT, resolved INTEGER NOT NULL DEFAULT 0
  );
  /* drag-to-reorder. A row only exists once someone has moved something. */
  CREATE TABLE IF NOT EXISTS section_order (
    page_slug TEXT NOT NULL, tab_key TEXT NOT NULL,
    section_key TEXT NOT NULL, ord INTEGER NOT NULL,
    PRIMARY KEY (page_slug, tab_key, section_key)
  );
`);

{
  const pcols = db.prepare("PRAGMA table_info(pages)").all().map((c) => c.name);
  if (!pcols.includes("layout")) {
    // a converted page ships its own layout with that build's CSS inlined
    db.exec("ALTER TABLE pages ADD COLUMN layout TEXT NOT NULL DEFAULT 'main'");
  }
  if (!pcols.includes("source")) {
    db.exec("ALTER TABLE pages ADD COLUMN source TEXT NOT NULL DEFAULT 'handbuilt'");
  }
}

const cols = db.prepare("PRAGMA table_info(page_content)").all().map((c) => c.name);
if (!cols.includes("retired")) {
  db.exec("ALTER TABLE page_content ADD COLUMN retired INTEGER NOT NULL DEFAULT 0");
}
if (!cols.includes("options")) {
  // a fixed vocabulary for state fields, so the studio can show a dropdown
  db.exec("ALTER TABLE page_content ADD COLUMN options TEXT");
}
if (!cols.includes("tab_key")) {
  db.exec("ALTER TABLE page_content ADD COLUMN tab_key TEXT NOT NULL DEFAULT '_all'");
  db.exec("ALTER TABLE page_content ADD COLUMN tab_title TEXT NOT NULL DEFAULT 'Shown on every tab'");
  console.log("  migrated: added tab columns");
}
/* ------------------------------------------------------------------ *
 * seeding, per page
 *
 * One file per page under data/: seed.json is the original hand-built page,
 * seed-<slug>.json is anything ingested since — a converted Lovable build, for
 * instance. Every page goes through the same four steps, so a new page needs no
 * new code: seed it, backfill what a rebuild added, realign what nobody has
 * edited, retire what the template no longer renders.
 * ------------------------------------------------------------------ */
function applySeed(seed, { layout = "main", template = null, source = "handbuilt" } = {}) {
  const slug = seed.page.slug;
  const tpl = template || seed.page.template || "page";

  db.prepare("INSERT OR IGNORE INTO pages (slug,title,template,layout,source) VALUES (?,?,?,?,?)")
    .run(slug, seed.page.title, tpl, seed.page.layout || layout, seed.page.source || source);
  db.prepare("UPDATE pages SET title = ?, template = ?, layout = ? WHERE slug = ?")
    .run(seed.page.title, tpl, seed.page.layout || layout, slug);

  const cols = `(page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title,
                 label, tag, multiline, ord, value, draft_value, updated_at, updated_by, options)`;
  const ins = db.prepare(`INSERT OR IGNORE INTO page_content ${cols} VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const now = new Date().toISOString();

  const has = new Set(
    db.prepare("SELECT field_key FROM page_content WHERE page_slug = ?").all(slug).map((r) => r.field_key)
  );
  const missing = seed.fields.filter((f) => !has.has(f.key));
  for (const f of missing) {
    ins.run(slug, f.key, f.section_key, f.section_title, f.section_ord,
            f.tab_key || "_all", f.tab_title || "Shown on every tab",
            f.label, f.tag, f.multiline, f.ord, f.value, f.value, now, "import", f.options || null);
  }
  if (missing.length) {
    console.log(`  ${slug}: ${has.size ? "backfilled" : "seeded"} ${missing.length} field(s)`);
  }

  /* tab attribution can change without the wording changing */
  {
    const upd = db.prepare("UPDATE page_content SET tab_key = ?, tab_title = ? WHERE page_slug = ? AND field_key = ? AND tab_key <> ?");
    for (const f of seed.fields) if (f.tab_key) upd.run(f.tab_key, f.tab_title, slug, f.key, f.tab_key);
  }

  /* Keys are positional, so a change to what the extractor matches renumbers
     everything after it and a key comes to mean a DIFFERENT piece of copy.
     Invariant: a field nobody has touched must equal the seed. Human edits are
     never overwritten — those are recovered by scripts/heal-drift.mjs, which
     matches on wording instead of position. */
  {
    const fix = db.prepare(`UPDATE page_content SET value = ?, draft_value = ?, label = ?
                            WHERE page_slug = ? AND field_key = ?
                              AND updated_by = 'import' AND value = draft_value AND value <> ?`);
    let n = 0;
    for (const f of seed.fields) n += fix.run(f.value, f.value, f.label, slug, f.key, f.value).changes;
    if (n) console.log(`  ${slug}: realigned ${n} untouched field(s)`);
  }

  /* Position, section and label describe where a field SITS, which is the
     template's business, not the editor's. Only value/draft_value belong to a
     human. Without refreshing these, a rebuild that reorders a section leaves
     the studio listing fields in the order a previous build happened to find
     them — a paragraph from the bottom of a section above the headline. */
  {
    const meta = db.prepare(`UPDATE page_content
      SET ord = ?, section_key = ?, section_title = ?, section_ord = ?, tag = ?, multiline = ?
      WHERE page_slug = ? AND field_key = ?`);
    for (const f of seed.fields) {
      meta.run(f.ord, f.section_key, f.section_title, f.section_ord, f.tag, f.multiline, slug, f.key);
    }
  }

  {
    const setOpt = db.prepare("UPDATE page_content SET options = ? WHERE page_slug = ? AND field_key = ?");
    for (const f of seed.fields) if (f.options) setOpt.run(f.options, slug, f.key);
  }

  /* A field the current build no longer emits renders nowhere. Mark it rather
     than delete it — the wording still matters if the slot comes back. */
  {
    const keys = new Set(seed.fields.map((f) => f.key));
    const gone = db.prepare("SELECT field_key FROM page_content WHERE page_slug = ? AND retired = 0")
      .all(slug).filter((r) => !keys.has(r.field_key));
    if (gone.length) {
      const mark = db.prepare("UPDATE page_content SET retired = 1 WHERE page_slug = ? AND field_key = ?");
      for (const r of gone) mark.run(slug, r.field_key);
      console.log(`  ${slug}: retired ${gone.length} field(s) the rebuild no longer renders`);
    }
    const unretire = db.prepare("UPDATE page_content SET retired = 0 WHERE page_slug = ? AND field_key = ? AND retired = 1");
    for (const f of seed.fields) unretire.run(slug, f.key);
  }
}

/* Every seed file in data/ becomes a page. Dropping one in is all an ingest has
   to do — no route to register, no code to change. */
for (const file of fs.readdirSync(path.join(ROOT, "data")).filter((f) => /^seed(-.+)?\.json$/.test(f)).sort()) {
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(ROOT, "data", file), "utf8"));
    if (seed?.page?.slug && Array.isArray(seed.fields)) applySeed(seed);
  } catch (e) {
    console.log(`  ! ${file}: ${e.message}`);
  }
}

auth.initAuth(db);

/* ------------------------------------------------------------------ *
 * the render-time hook
 * ------------------------------------------------------------------ */
function contentFor(slug, { draft = false } = {}) {
  const col = draft ? "draft_value" : "value";
  const rows = db.prepare(`SELECT field_key, ${col} AS v FROM page_content WHERE page_slug = ?`).all(slug);
  const map = new Map();
  for (const r of rows) map.set(r.field_key, r.v);
  return map;
}

app.engine("hbs", engine({
  extname: ".hbs",
  layoutsDir: path.join(ROOT, "views/layouts"),
  partialsDir: path.join(ROOT, "views/partials"),
  defaultLayout: "main",
  helpers: {
    c(key, options) {
      const v = options?.data?.root?.__content?.get(key);
      return v === undefined ? "" : v;
    },
    jsArray(name, options) {
      const map = options?.data?.root?.__content;
      if (!map) return "[]";
      const prefix = "js." + name + ".";
      const rows = [];
      for (const [key, val] of map) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const dot = rest.indexOf(".");
        if (dot < 0) continue;
        const i = Number(rest.slice(0, dot));
        if (!Number.isInteger(i)) continue;
        (rows[i] ||= {})[rest.slice(dot + 1)] = val;
      }
      return JSON.stringify(rows.filter(Boolean), null, 2);
    },
    /**
     * A media slot: an image, or a video the editor swapped in.
     *
     * For an image this emits exactly the <img> that was there before —
     * same attributes, same position — so nothing about the existing CSS
     * changes. Only a video gets a wrapper, and only then does the layout
     * differ, which is a deliberate editorial choice at that point.
     *
     * The play button is the same MainButton.svg this page already uses, so
     * a swapped-in video looks native rather than bolted on.
     */
    media(key, options) {
      const map = options?.data?.root?.__content;
      if (!map) return "";
      const src = (map.get(key) || "").trim();
      if (!src) return "";
      const attrs = map.get(key + "@attrs") || "";
      const poster = (map.get(key + "@poster") || "").trim();
      const esc = (v) => String(v).replace(/"/g, "&quot;");

      if (!/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)) {
        return `<img ${attrs} src="${esc(src)}" data-c-media="${esc(key)}">`;
      }
      return (
        `<span class="mu-media" data-c-media="${esc(key)}">` +
          `<img ${attrs} src="${esc(poster)}" data-mu-poster>` +
          `<video class="mu-media__video" playsinline preload="none" ` +
                 `data-src="${esc(src)}"${poster ? ` poster="${esc(poster)}"` : ""}></video>` +
          `<button type="button" class="mu-media__play" aria-label="Play video">` +
            `<img src="${MU_PLAY}" alt="">` +
          `</button>` +
        `</span>`
      );
    },
    eq: (a, b) => a === b,
  },
}));
app.set("view engine", "hbs");
app.set("views", path.join(ROOT, "views"));

app.use("/assets", express.static(path.join(ROOT, "public")));
app.use("/console-ui", express.static(path.join(ROOT, "admin")));
app.use(express.json({ limit: "2mb" }));

/* The inline editor runs inside the instrumented app, on a different origin.
   Credentials travel as a bearer token rather than a cookie, so the wildcard
   origin here is safe: without a valid token these routes return 401. */
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "authorization, content-type, accept");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(auth.attachUser(db));

/* ------------------------------------------------------------------ *
 * account API
 * ------------------------------------------------------------------ */
app.post("/api/account/login", (req, res) => {
  const { email = "", password = "" } = req.body || {};
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
  // Same message either way — never reveal which half was wrong.
  const bad = () => res.status(401).json({ error: "That email and password do not match." });
  if (!row) return bad();
  if (!auth.verifyPassword(password, row.pass_hash, row.pass_salt)) return bad();

  const { token, expires } = auth.createSession(db, row.id);
  auth.setSessionCookie(res, token, expires);
  db.prepare("UPDATE users SET last_seen = ? WHERE id = ?").run(new Date().toISOString(), row.id);
  // the token is returned as well as set, for an editor on another origin
  res.json({ user: { name: row.name, email: row.email, role: row.role }, token, expires });
});

app.post("/api/account/logout", (req, res) => {
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp(auth.COOKIE + "=([^;]+)"));
  if (m) auth.destroySession(db, decodeURIComponent(m[1]));
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get("/api/account", (req, res) => {
  res.json({
    user: req.user ? { name: req.user.name, email: req.user.email, role: req.user.role } : null,
    roles: auth.ROLES.map((r) => ({ key: r, label: auth.ROLE_LABEL[r], blurb: auth.ROLE_BLURB[r] })),
    ai: ai.configured(),
    aiInfo: ai.describe(),
    consoleUrl: CONSOLE,
    defaultEmail: auth.DEFAULT_EMAIL,
  });
});

app.get("/api/account/users", auth.require_("users"), (_req, res) => {
  res.json(db.prepare("SELECT id,email,name,role,created_at,last_seen FROM users ORDER BY role, name").all());
});

app.post("/api/account/users", auth.require_("users"), (req, res) => {
  const { email, name, role = "editor", password } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: "email, name and password are required." });
  if (!auth.ROLES.includes(role)) return res.status(400).json({ error: "Unknown role." });
  const { hash, salt } = auth.hashPassword(password);
  try {
    db.prepare(`INSERT INTO users (email,name,role,pass_hash,pass_salt,created_at) VALUES (?,?,?,?,?,?)`)
      .run(String(email).trim().toLowerCase(), name, role, hash, salt, new Date().toISOString());
  } catch {
    return res.status(409).json({ error: "That email already has an account." });
  }
  res.json({ ok: true });
});

app.put("/api/account/users/:id", auth.require_("users"), (req, res) => {
  const { role, password } = req.body || {};
  const id = Number(req.params.id);
  if (role) {
    if (!auth.ROLES.includes(role)) return res.status(400).json({ error: "Unknown role." });
    // Don't let the last admin demote themselves into a locked-out system.
    const admins = db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n;
    const target = db.prepare("SELECT role FROM users WHERE id = ?").get(id);
    if (target?.role === "admin" && role !== "admin" && admins <= 1) {
      return res.status(400).json({ error: "This is the only admin. Promote someone else first." });
    }
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  }
  if (password) {
    const { hash, salt } = auth.hashPassword(password);
    db.prepare("UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?").run(hash, salt, id);
  }
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 * the live page
 * ------------------------------------------------------------------ */

/** Swap section blocks between their existing slots. The markup between
 *  sections never moves, so a reorder cannot pull a block out of its panel. */
function applyOrder(html, slug, tab) {
  const rows = db.prepare(
    "SELECT section_key, ord FROM section_order WHERE page_slug = ? AND tab_key = ? ORDER BY ord"
  ).all(slug, tab);
  if (!rows.length) return html;

  const re = /<section\b[^>]*\bdata-sec="([^"]+)"[^>]*>/gi;
  const found = [];
  let m;
  while ((m = re.exec(html))) {
    const tagRe = /<section\b[^>]*>|<\/section>/gi;
    tagRe.lastIndex = m.index;
    let depth = 0, end = -1, t;
    while ((t = tagRe.exec(html))) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) { end = t.index + t[0].length; break; }
    }
    if (end > 0) found.push({ key: m[1], start: m.index, end });
  }
  if (found.length < 2) return html;

  const wanted = rows.map((r) => r.section_key).filter((k) => found.some((f) => f.key === k));
  const moving = found.filter((f) => wanted.includes(f.key));
  if (moving.length < 2) return html;

  const bodies = new Map(moving.map((f) => [f.key, html.slice(f.start, f.end)]));
  // slots keep their positions; only the contents are permuted
  let out = html, delta = 0;
  moving.forEach((slot, i) => {
    const body = bodies.get(wanted[i]);
    if (body === undefined) return;
    const s = slot.start + delta, e = slot.end + delta;
    out = out.slice(0, s) + body + out.slice(e);
    delta += body.length - (e - s);
  });
  return out;
}

app.get("/page/:slug", (req, res, next) => {
  const page = db.prepare("SELECT * FROM pages WHERE slug = ?").get(req.params.slug);
  if (!page) return next();

  /* An instrumented page is rendered by its own app, not by this server — that
     is the whole point of instrumenting rather than converting. There is no
     template here to render, so send the editor to where the page actually
     lives instead of failing to look up a view that was never meant to exist. */
  if (page.template === "__external") {
    const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
    const path0 = page.slug === "mu-home" ? "/"
      : page.slug === "shared" ? "/"
        : "/" + page.slug.replace(/-/g, "/");
    return res.redirect(base + path0);
  }
  const draft = req.query.preview === "1";
  const tab = String(req.query.tab || "highlight");
  const editing = req.user && auth.can(req.user.role, "read");

  res.set("Cache-Control", "no-store, must-revalidate");

  res.render(page.template, {
    layout: page.layout || "main",
    title: page.title,
    __content: contentFor(page.slug, { draft }),
    isPreview: draft,
    activeTab: tab,
  }, (err, html) => {
    if (err) return next(err);

    let out = applyOrder(html, page.slug, tab)
      .replace(
        new RegExp('(<div[^>]*class=")([^"]*\\bpgpcourse\\b[^"]*)("[^>]*id="' + tab + '")', "g"),
        (_m, a, cls, b) => a + cls.trim() + " active" + b
      )
      .replace(
        new RegExp('(<li[^>]*data-rel="' + tab + '"[^>]*class=")([^"]*)(")', "g"),
        (_m, a, cls, b) => a + cls.trim() + " active" + b
      );

    /* Playback chrome for any video an editor has swapped in. This one DOES
       go to visitors — a published video has to play for them — but it is only
       injected when the page actually contains a media wrapper. */
    {
      // button states can appear anywhere, so the (tiny) stylesheet always ships;
      // the playback script only when the page actually holds a video
      let tag = `<link rel="stylesheet" href="/assets/css/mu-media.css">`;
      if (out.includes('class="mu-media"')) {
        tag += `\n<script>window.__MU_MEDIA__=${JSON.stringify({ play: MU_PLAY, pause: MU_PAUSE })};</script>` +
               `\n<script src="/assets/js/mu-media.js" defer></script>`;
      }
      out = out.includes("</body>") ? out.replace("</body>", tag + "\n</body>") : out + tag;
    }

    /* The editor ships only to someone who is signed in. A visitor's page is
       byte-for-byte what it was, apart from the data-c anchors. */
    if (editing) {
      const boot = {
        slug: page.slug, tab, preview: draft, consoleUrl: CONSOLE,
        user: { name: req.user.name, email: req.user.email, role: req.user.role },
        can: {
          edit: auth.can(req.user.role, "edit"),
          comment: auth.can(req.user.role, "comment"),
          publish: auth.can(req.user.role, "publish"),
          reorder: auth.can(req.user.role, "reorder"),
          ai: auth.can(req.user.role, "ai") && ai.configured(),
        },
      };
      const tag = `<link rel="stylesheet" href="/assets/css/inline-editor.css">
<script>window.__MU_EDITOR__=${JSON.stringify(boot).replace(/</g, "\\u003c")};</script>
<script src="/assets/js/inline-editor.js" defer></script>`;
      out = out.includes("</body>") ? out.replace("</body>", tag + "\n</body>") : out + tag;
    }
    res.send(out);
  });
});

/* ------------------------------------------------------------------ *
 * sanitising rich text
 *
 * A rich field holds markup and renders through {{{c}}}, which does not escape.
 * That is deliberate — it is what lets an editor keep the bold and the line
 * breaks inside a sentence. It also means whatever they paste goes straight
 * into the page, and people paste out of Word and Google Docs.
 *
 * So: an allowlist of inline formatting, `class` as the only surviving
 * attribute, and everything else unwrapped rather than dropped, so the words
 * survive even when the markup does not.
 * ------------------------------------------------------------------ */
const RICH_TAGS = new Set(["b", "strong", "i", "em", "u", "s", "small", "sup", "sub", "span", "br", "mark"]);

function sanitizeRich(html) {
  let out = String(html);
  // whole elements whose content should never survive
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*>/gi, "");

  out = out.replace(/<(\/)?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, slash, tag, attrs) => {
    const t = tag.toLowerCase();
    if (!RICH_TAGS.has(t)) return "";            // unwrap: keep the words, drop the tag
    if (slash) return "</" + t + ">";
    if (t === "br") return "<br>";
    const cls = attrs.match(/\sclass\s*=\s*"([^"]*)"/i) || attrs.match(/\sclass\s*=\s*'([^']*)'/i);
    // class only, and no javascript: smuggled through it
    const safe = cls && !/[<>"]|javascript:/i.test(cls[1]) ? ' class="' + cls[1] + '"' : "";
    return "<" + t + safe + ">";
  });
  return out.trim();
}

/* ------------------------------------------------------------------ *
 * public content, for an app that renders itself
 *
 * An instrumented app is not rendered by this server — it fetches its copy and
 * renders it with its own components, which is what keeps every animation
 * intact. So it needs one unauthenticated, cross-origin, published-only
 * endpoint. Drafts are deliberately not served here: an unauthenticated caller
 * gets exactly what a visitor should see.
 * ------------------------------------------------------------------ */
const PUBLIC_ORIGINS = (process.env.CMS_ALLOWED_ORIGINS ||
  "http://localhost:3000,http://localhost:5173,http://localhost:5678,http://127.0.0.1:3000,http://127.0.0.1:5173")
  .split(",").map((s) => s.trim()).filter(Boolean);

function publicCors(req, res) {
  const origin = req.headers.origin;
  // an app on an unknown origin still gets the content; it is public copy
  res.set("Access-Control-Allow-Origin", origin && PUBLIC_ORIGINS.includes(origin) ? origin : "*");
  res.set("Vary", "Origin");
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
}

app.options("/api/public/content/:slug", (req, res) => {
  publicCors(req, res);
  res.set("Access-Control-Allow-Headers", "accept, content-type");
  res.sendStatus(204);
});

app.get("/api/public/content/:slug", (req, res) => {
  publicCors(req, res);
  const draft = req.query.preview === "1" && req.user && auth.can(req.user.role, "read");
  const col = draft ? "draft_value" : "value";
  const rows = db.prepare(
    `SELECT field_key, ${col} AS v FROM page_content WHERE page_slug = ? AND retired = 0`
  ).all(req.params.slug);
  const fields = {};
  for (const r of rows) fields[r.field_key] = r.v;
  res.json({ slug: req.params.slug, count: rows.length, draft: Boolean(draft), fields });
});

/* ------------------------------------------------------------------ *
 * content API
 * ------------------------------------------------------------------ */
app.get("/api/pages", auth.require_("read"), (_req, res) => {
  res.json(db.prepare(`
    SELECT p.slug, p.title, p.source,
           COUNT(CASE WHEN c.retired = 0 AND c.tag <> 'meta' THEN 1 END) AS fields,
           COUNT(DISTINCT CASE WHEN c.retired = 0 THEN c.section_key END) AS sections,
           SUM(CASE WHEN c.value <> c.draft_value AND c.retired = 0 THEN 1 ELSE 0 END) AS unpublished,
           (SELECT user_name FROM publishes WHERE page_slug = p.slug ORDER BY id DESC LIMIT 1) AS last_publisher,
           (SELECT published_at FROM publishes WHERE page_slug = p.slug ORDER BY id DESC LIMIT 1) AS last_published
    FROM pages p LEFT JOIN page_content c ON c.page_slug = p.slug
    GROUP BY p.slug ORDER BY p.title
  `).all());
});

app.get("/api/pages/:slug/content", auth.require_("read"), (req, res) => {
  const page0 = db.prepare("SELECT * FROM pages WHERE slug = ?").get(req.params.slug);

  /* An instrumented page renders shared components too — the nav, the footer,
     the home sections — and their copy lives in one `shared` bucket so it is
     edited once rather than once per page. Opening a page and finding almost
     nothing in it is not useful, so the shared copy is folded in here as its
     own tab, clearly labelled, rather than hidden on another page. */
  const withShared = page0 && page0.source === "instrumented" && req.params.slug !== "shared";
  const slugs = withShared ? [req.params.slug, "shared"] : [req.params.slug];

  const rows = db.prepare(`
    SELECT page_slug, field_key, section_key, section_title, section_ord, tab_key, tab_title,
           label, tag, multiline, ord, value, draft_value, updated_at, updated_by, options
    FROM page_content
    WHERE page_slug IN (${slugs.map(() => "?").join(",")}) AND retired = 0 AND tag <> 'meta'
    ORDER BY CASE page_slug WHEN ? THEN 0 ELSE 1 END, section_ord, ord
  `).all(...slugs, req.params.slug).map((r) => ({
    ...r,
    tab_key: r.page_slug === req.params.slug ? "_all" : "_shared",
    tab_title: r.page_slug === req.params.slug ? "This page" : "Shared components",
  }));

  const counts = new Map();
  for (const r of db.prepare(
    "SELECT field_key, COUNT(*) n FROM comments WHERE page_slug = ? AND resolved = 0 GROUP BY field_key"
  ).all(req.params.slug)) counts.set(r.field_key, r.n);

  const tabs = [], tabIndex = new Map(), index = new Map();
  for (const r of rows) {
    if (!tabIndex.has(r.tab_key)) {
      const t = { key: r.tab_key, title: r.tab_title, sections: [], changed: 0, fields: 0 };
      tabIndex.set(r.tab_key, t); tabs.push(t);
    }
    const tab = tabIndex.get(r.tab_key);
    if (!index.has(r.section_key)) {
      const s = { key: r.section_key, title: r.section_title, fields: [], changed: 0 };
      index.set(r.section_key, s); tab.sections.push(s);
    }
    const s = index.get(r.section_key);
    tab.fields++;
    if (r.value !== r.draft_value) { s.changed++; tab.changed++; }
    s.fields.push({
      key: r.field_key, label: r.label, tag: r.tag, multiline: !!r.multiline,
      options: r.options ? JSON.parse(r.options) : null,
      value: r.draft_value, published: r.value, dirty: r.value !== r.draft_value,
      updated_at: r.updated_at, updated_by: r.updated_by,
      comments: counts.get(r.field_key) || 0,
    });
  }
  const page = db.prepare("SELECT * FROM pages WHERE slug = ?").get(req.params.slug);
  const lastPublish = db.prepare(
    "SELECT user_name, user_email, fields, published_at FROM publishes WHERE page_slug = ? ORDER BY id DESC LIMIT 1"
  ).get(req.params.slug) || null;
  tabs.sort((a, b) => (a.key === "_shared" ? 1 : b.key === "_shared" ? -1 : 0));
  res.json({ page, tabs, lastPublish });
});

app.put("/api/pages/:slug/content", auth.require_("edit"), (req, res) => {
  const { changes = {} } = req.body || {};
  const get = db.prepare("SELECT draft_value, tag FROM page_content WHERE page_slug = ? AND field_key = ?");
  // keys are globally unique, so a field the page does not own is a shared one
  const owner = (key) =>
    get.get(req.params.slug, key) ? req.params.slug
      : (get.get("shared", key) ? "shared" : null);
  const upd = db.prepare(`UPDATE page_content SET draft_value = ?, updated_at = ?, updated_by = ?
                          WHERE page_slug = ? AND field_key = ?`);
  const now = new Date().toISOString();
  let n = 0;
  for (const [key, val] of Object.entries(changes)) {
    const slug = owner(key);
    if (!slug) continue;
    const row = get.get(slug, key);
    const clean = row.tag === "rich" ? sanitizeRich(val) : String(val);
    if (row.draft_value === clean) continue;
    upd.run(clean, now, req.user.name, slug, key);
    n++;
  }
  res.json({ saved: n });
});

app.post("/api/pages/:slug/publish", auth.require_("publish"), (req, res) => {
  /* Shared copy is edited from the page it appears on, so publishing that page
     has to carry it. The count is reported separately, because a shared change
     goes live everywhere and the person clicking Publish should be told. */
  const pg = db.prepare("SELECT source FROM pages WHERE slug = ?").get(req.params.slug);
  const alsoShared = pg && pg.source === "instrumented" && req.params.slug !== "shared";
  const scope = alsoShared ? [req.params.slug, "shared"] : [req.params.slug];

  const pending = db.prepare(
    `SELECT page_slug, field_key, value, draft_value FROM page_content
     WHERE page_slug IN (${scope.map(() => "?").join(",")}) AND value <> draft_value`
  ).all(...scope);
  if (!pending.length) return res.json({ published: 0 });

  const rev = db.prepare(`INSERT INTO revisions
    (page_slug, field_key, old_value, new_value, changed_by, changed_at) VALUES (?,?,?,?,?,?)`);
  const pub = db.prepare("UPDATE page_content SET value = draft_value WHERE page_slug = ? AND field_key = ?");
  const now = new Date().toISOString();
  for (const p of pending) {
    rev.run(p.page_slug, p.field_key, p.value, p.draft_value, req.user.name, now);
    pub.run(p.page_slug, p.field_key);
  }
  const sharedCount = pending.filter((p) => p.page_slug === "shared").length;
  db.prepare(`INSERT INTO publishes (page_slug,user_id,user_name,user_email,fields,published_at)
              VALUES (?,?,?,?,?,?)`)
    .run(req.params.slug, req.user.id, req.user.name, req.user.email, pending.length, now);
  res.json({ published: pending.length, shared: sharedCount, by: req.user.name, at: now });
});

app.post("/api/pages/:slug/revert", auth.require_("edit"), (req, res) => {
  // scope to rows that actually differ, so the count means something
  const info = db.prepare("UPDATE page_content SET draft_value = value WHERE page_slug = ? AND draft_value <> value").run(req.params.slug);
  res.json({ reverted: info.changes });
});

app.get("/api/pages/:slug/revisions", auth.require_("read"), (req, res) => {
  res.json(db.prepare("SELECT * FROM revisions WHERE page_slug = ? ORDER BY id DESC LIMIT 100").all(req.params.slug));
});

app.get("/api/pages/:slug/activity", auth.require_("read"), (req, res) => {
  res.json({
    publishes: db.prepare(
      "SELECT user_name, user_email, fields, published_at FROM publishes WHERE page_slug = ? ORDER BY id DESC LIMIT 50"
    ).all(req.params.slug),
    revisions: db.prepare(
      "SELECT field_key, old_value, new_value, changed_by, changed_at FROM revisions WHERE page_slug = ? ORDER BY id DESC LIMIT 50"
    ).all(req.params.slug),
  });
});

/* ---------------- comments ---------------- */
app.get("/api/pages/:slug/comments", auth.require_("read"), (req, res) => {
  res.json(db.prepare(
    "SELECT * FROM comments WHERE page_slug = ? ORDER BY resolved, id DESC"
  ).all(req.params.slug));
});

app.post("/api/pages/:slug/comments", auth.require_("comment"), (req, res) => {
  const { field_key, body } = req.body || {};
  if (!field_key || !body?.trim()) return res.status(400).json({ error: "A field and a note are required." });
  db.prepare(`INSERT INTO comments (page_slug,field_key,body,author_id,author_name,created_at)
              VALUES (?,?,?,?,?,?)`)
    .run(req.params.slug, field_key, body.trim(), req.user.id, req.user.name, new Date().toISOString());
  res.json({ ok: true });
});

app.post("/api/comments/:id/resolve", auth.require_("comment"), (req, res) => {
  db.prepare("UPDATE comments SET resolved = 1 WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true });
});

/* ---------------- section order ---------------- */
app.get("/api/pages/:slug/order", auth.require_("read"), (req, res) => {
  res.json(db.prepare(
    "SELECT tab_key, section_key, ord FROM section_order WHERE page_slug = ? ORDER BY tab_key, ord"
  ).all(req.params.slug));
});

app.put("/api/pages/:slug/order", auth.require_("reorder"), (req, res) => {
  const { tab, order } = req.body || {};
  if (!tab || !Array.isArray(order)) return res.status(400).json({ error: "tab and order[] are required." });
  db.prepare("DELETE FROM section_order WHERE page_slug = ? AND tab_key = ?").run(req.params.slug, tab);
  const ins = db.prepare("INSERT INTO section_order (page_slug,tab_key,section_key,ord) VALUES (?,?,?,?)");
  order.forEach((key, i) => ins.run(req.params.slug, tab, String(key), i));
  res.json({ ok: true, sections: order.length });
});

app.delete("/api/pages/:slug/order", auth.require_("reorder"), (req, res) => {
  const info = db.prepare("DELETE FROM section_order WHERE page_slug = ?").run(req.params.slug);
  res.json({ reset: info.changes });
});

/* ------------------------------------------------------------------ *
 * AI writer
 * ------------------------------------------------------------------ */
/** Ceiling for an element, taken from what this page already publishes. */
function ceilingFor(slug, tag) {
  const row = db.prepare(
    "SELECT MAX(LENGTH(value)) AS mx, COUNT(*) n FROM page_content WHERE page_slug = ? AND tag = ?"
  ).get(slug, tag);
  if (!row?.n) return 200;
  return Math.max(40, Math.round(row.mx * 1.1));
}

function loadField(slug, key) {
  const f = db.prepare("SELECT * FROM page_content WHERE page_slug = ? AND field_key = ?").get(slug, key);
  if (!f) return null;
  const siblings = db.prepare(
    `SELECT tag, draft_value AS value FROM page_content
     WHERE page_slug = ? AND section_key = ? AND field_key <> ? ORDER BY ord LIMIT 8`
  ).all(slug, f.section_key, key);
  return {
    key: f.field_key, tag: f.tag, value: f.draft_value, label: f.label,
    section_title: f.section_title, tab_title: f.tab_title,
    ceiling: ceilingFor(slug, f.tag), siblings,
  };
}

app.post("/api/pages/:slug/ai/rewrite", auth.require_("ai"), async (req, res) => {
  const { key, instruction } = req.body || {};
  const field = loadField(req.params.slug, key);
  if (!field) return res.status(404).json({ error: "No such field." });
  try {
    const { out, usage } = await ai.rewrite(field, instruction);
    res.json({ ...out, ceiling: field.ceiling, usage });
  } catch (e) { const x = ai.explain(e); res.status(x.status).json(x); }
});

app.post("/api/pages/:slug/ai/variants", auth.require_("ai"), async (req, res) => {
  const { key, instruction, n = 3 } = req.body || {};
  const field = loadField(req.params.slug, key);
  if (!field) return res.status(404).json({ error: "No such field." });
  try {
    const { out, usage } = await ai.variants(field, instruction, Math.min(5, Math.max(2, n)));
    res.json({ ...out, ceiling: field.ceiling, usage });
  } catch (e) { const x = ai.explain(e); res.status(x.status).json(x); }
});

app.post("/api/pages/:slug/ai/section", auth.require_("ai"), async (req, res) => {
  const { section, instruction } = req.body || {};
  if (!instruction?.trim()) return res.status(400).json({ error: "Say what you want changed." });
  const rows = db.prepare(
    `SELECT field_key, tag, draft_value, section_title FROM page_content
     WHERE page_slug = ? AND section_key = ? ORDER BY ord`
  ).all(req.params.slug, section);
  if (!rows.length) return res.status(404).json({ error: "No such section." });

  const fields = rows.map((r) => ({
    key: r.field_key, tag: r.tag, value: r.draft_value, ceiling: ceilingFor(req.params.slug, r.tag),
  }));
  try {
    const { out, usage } = await ai.sectionPass(fields, instruction, rows[0].section_title);
    res.json({ ...out, usage });
  } catch (e) { const x = ai.explain(e); res.status(x.status).json(x); }
});

/* ------------------------------------------------------------------ *
 * studio pages
 * ------------------------------------------------------------------ */
const send = (f) => (_req, res) => res.sendFile(path.join(ROOT, "admin", f));
const gate = (req, res, next) => req.user ? next() : res.redirect(CONSOLE + "/login");

app.get(CONSOLE + "/login", (req, res) =>
  req.user ? res.redirect(CONSOLE) : res.sendFile(path.join(ROOT, "admin/login.html")));
app.get(CONSOLE, gate, send("index.html"));
app.get(CONSOLE + "/people", gate, send("people.html"));
app.get(CONSOLE + "/page/:slug", gate, send("edit.html"));
app.get("/", (_req, res) => res.redirect(CONSOLE));
/* the old path, so nobody's bookmark dies */
app.get("/admin", (_req, res) => res.redirect(CONSOLE));

app.listen(PORT, () => {
  console.log(`\n  console    http://localhost:${PORT}${CONSOLE}`);
  console.log(`  live page  http://localhost:${PORT}/page/pgp-bharat`);
  console.log(`  AI writer  ${(() => { const d = ai.describe(); return d.ready ? `ready — ${d.provider} / ${d.model}` : `off — add a key to .env (provider: ${d.provider})`; })()}\n`);
});
