/**
 * The approval queue in front of Lovable.
 *
 * Publishing a repo page no longer pushes. It files a change request: who,
 * which page, and one row per field with the text before and after, taken
 * at that moment. The drafts stay drafts. A super admin then accepts the
 * request (the snapshot is written into the source and pushed, exactly as a
 * publish used to be) or declines it (the request closes, the drafts stay
 * for the editor to revise). Each request is its own commit, authored by
 * the submitter, so the repo history still says who changed what.
 *
 * Accepts are serialized by the git chain in push.js, so a burst of
 * approvals becomes ordered commits, never two pushes at once.
 */
import { pushRows } from "./push.js";
import { clean } from "./scan.js";
import { logEvent } from "./store.js";

export class QueueStateError extends Error {
  constructor(message) { super(message); this.status = 409; }
}

const now = () => new Date().toISOString();
const STATUSES = ["pending", "applying", "accepted", "declined", "failed"];

/** File (or refresh) the caller's request for this page. */
export function submitRequest(db, slug, { user }) {
  const page = db.prepare("SELECT slug, title, repo FROM pages WHERE slug = ?").get(slug);
  if (!page?.repo) throw new Error("This page did not come from the repo, so there is nothing to queue.");
  const rows = db.prepare(`SELECT field_key, label, section_title, type, src_file, value, draft_value FROM page_content
    WHERE page_slug = ? AND value <> draft_value AND retired = 0 ORDER BY section_ord, ord`).all(slug)
    /* an emptied picture or link has nothing to write into the source */
    .filter((r) => !((r.type === "media" || r.type === "link") && clean(r.draft_value) === ""));
  if (!rows.length) return { id: null, items: 0, replaced: false };
  const t = now();
  const open = db.prepare("SELECT id FROM change_requests WHERE page_slug = ? AND user_id IS ? AND status = 'pending'")
    .get(slug, user.id ?? null);
  let id, replaced = false;
  db.exec("BEGIN");
  try {
    if (open) {
      id = open.id; replaced = true;
      db.prepare("DELETE FROM change_request_items WHERE request_id = ?").run(id);
      db.prepare("UPDATE change_requests SET items = ?, updated_at = ?, page_title = ? WHERE id = ?").run(rows.length, t, page.title, id);
    } else {
      id = Number(db.prepare(`INSERT INTO change_requests
        (page_slug, page_title, user_id, user_name, user_email, status, items, created_at, updated_at)
        VALUES (?,?,?,?,?,'pending',?,?,?)`)
        .run(slug, page.title, user.id ?? null, user.name, user.email ?? null, rows.length, t, t).lastInsertRowid);
    }
    const ins = db.prepare(`INSERT INTO change_request_items
      (request_id, field_key, label, section_title, type, src_file, before, after, ord) VALUES (?,?,?,?,?,?,?,?,?)`);
    rows.forEach((r, i) => ins.run(id, r.field_key, r.label, r.section_title, r.type, r.src_file ?? null, r.value, r.draft_value, i));
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return { id, items: rows.length, replaced };
}

const load = (db, id) => {
  const r = db.prepare("SELECT * FROM change_requests WHERE id = ?").get(id);
  if (!r) throw new Error("No such request.");
  return r;
};

/**
 * Push the snapshot. Resolves to the request's new state; a push that
 * failed is a result (status "failed", error), not an exception, so the
 * dashboard can show it on the card. Only a wrong state throws.
 */
export async function acceptRequest(db, id, { user }) {
  const r = load(db, id);
  if (!["pending", "failed"].includes(r.status)) throw new QueueStateError(`Request #${id} is already ${r.status}.`);
  /* the claim: a second click, or a second super admin, gets the 409 */
  const claimed = db.prepare("UPDATE change_requests SET status = 'applying', updated_at = ?, error = NULL WHERE id = ? AND status IN ('pending','failed')")
    .run(now(), id).changes;
  if (!claimed) throw new QueueStateError(`Request #${id} is being applied.`);

  const items = db.prepare("SELECT * FROM change_request_items WHERE request_id = ? ORDER BY ord").all(id);
  const live = db.prepare("SELECT 1 FROM page_content WHERE page_slug = ? AND field_key = ? AND retired = 0");
  const rows = items.filter((i) => live.get(r.page_slug, i.field_key))
    .map((i) => ({ field_key: i.field_key, label: i.label, type: i.type, src_file: i.src_file, value: i.before, draft_value: i.after }));
  const submitter = { id: r.user_id, name: r.user_name, email: r.user_email };
  const n = rows.length;
  const message = `content(${r.page_slug}): ${n} change${n === 1 ? "" : "s"} via MU Console, approved by ${user.name}`;
  try {
    const out = await pushRows(db, r.page_slug, rows, { user: submitter, message });
    const t = now();
    db.prepare("UPDATE change_requests SET status = 'accepted', sha = ?, decided_by = ?, decided_at = ?, updated_at = ?, error = NULL WHERE id = ?")
      .run(out.sha, user.name, t, t, id);
    return { id, status: "accepted", sha: out.sha, pushed: out.pushed, local: out.local, published: out.published };
  } catch (e) {
    const error = String(e.message).split("\n")[0].slice(0, 400);
    db.prepare("UPDATE change_requests SET status = 'failed', error = ?, updated_at = ? WHERE id = ?").run(error, now(), id);
    return { id, status: "failed", error };
  }
}

export function declineRequest(db, id, { user, note = "" }) {
  const r = load(db, id);
  if (!["pending", "failed"].includes(r.status)) throw new QueueStateError(`Request #${id} is already ${r.status}.`);
  const t = now();
  db.prepare("UPDATE change_requests SET status = 'declined', decided_by = ?, decided_at = ?, updated_at = ?, note = ? WHERE id = ?")
    .run(user.name, t, t, String(note || "").slice(0, 500) || null, id);
  return { id, status: "declined" };
}

/** Requests with their items. Pending reads oldest first (a queue); history newest first. */
export function listRequests(db, { status = "pending", limit = 100 } = {}) {
  const where = status === "all" ? "" : "WHERE status = ?";
  const args = status === "all" ? [] : [STATUSES.includes(status) ? status : "pending"];
  const order = status === "pending" || status === "applying" ? "created_at ASC, id ASC" : "updated_at DESC, id DESC";
  const list = db.prepare(`SELECT * FROM change_requests ${where} ORDER BY ${order} LIMIT ?`).all(...args, Math.max(1, Math.min(500, limit)));
  const its = db.prepare("SELECT field_key, label, section_title, type, before, after, ord FROM change_request_items WHERE request_id = ? ORDER BY ord");
  return list.map((r) => ({ ...r, items: its.all(r.id) }));
}

export function summary(db) {
  const out = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare("SELECT status, COUNT(*) n FROM change_requests GROUP BY status").all()) if (r.status in out) out[r.status] = r.n;
  return out;
}

export function pendingByPage(db) {
  return new Map(db.prepare("SELECT page_slug, COUNT(*) n FROM change_requests WHERE status = 'pending' GROUP BY page_slug").all()
    .map((r) => [r.page_slug, r.n]));
}

/* ---------------- is it live yet? ----------------
 *
 * An accepted request is a commit on GitLab main, and the live site is
 * built from that branch by whatever deploys it. The console cannot see
 * that deploy, so it watches the site itself: the page is fetched every
 * so often until the new text is in it, and the request is marked live.
 * Lovable keeps syncing the same branch as before; this only reports.
 */
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const liveSiteUrl = () => String(process.env.LIVE_SITE_URL || process.env.LOVABLE_ASSETS_URL || "").replace(/\/+$/, "");
const LIVE_CHECK_MS = Number(process.env.LIVE_CHECK_SECONDS || 30) * 1000;
const LIVE_GIVE_UP_MS = Number(process.env.LIVE_GIVE_UP_MINUTES || 20) * 60e3;

/** The page's address on the live site: the home slug is "/", the rest "/<slug>". */
export function livePageUrl(slug, { homeSlug = process.env.SYNC_HOME_SLUG || "home" } = {}) {
  const base = liveSiteUrl();
  if (!base) return null;
  return base + (slug === homeSlug ? "/" : "/" + slug.replace(/^\/+/, ""));
}

/* the page as text: tags gone, entities that matter decoded, spaces folded */
const pageText = (html) => clean(String(html).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " "));

/**
 * One pass over every accepted request not yet seen live. Resolves to
 * { checked, live, waiting }. A request whose text items all read on the
 * live page becomes "live"; one still missing after LIVE_GIVE_UP_MINUTES
 * becomes "unseen" (the deploy may be slower, or the text is not in the
 * HTML); a request with nothing checkable (pictures, lists) is "live" as
 * soon as the push is, since nothing more happens for it.
 */
export async function checkLive(db, { fetch: f = fetch, log = () => {} } = {}) {
  const site = liveSiteUrl();
  const rows = db.prepare("SELECT * FROM change_requests WHERE status = 'accepted' AND (deploy_status IS NULL OR deploy_status = 'checking') ORDER BY id").all();
  const out = { checked: rows.length, live: 0, waiting: 0 };
  if (!rows.length) return out;
  const mark = db.prepare("UPDATE change_requests SET deploy_status = ?, deploy_url = ?, deploy_error = ?, deployed_at = ?, updated_at = ? WHERE id = ?");
  const its = db.prepare("SELECT type, after FROM change_request_items WHERE request_id = ?");
  const pages = new Map();       // one fetch per page per pass
  for (const r of rows) {
    const url = livePageUrl(r.page_slug);
    const texts = its.all(r.id).filter((i) => i.type === "text" || i.type === "rich").map((i) => clean(i.after)).filter(Boolean);
    if (!site || !texts.length) { mark.run("live", url, null, now(), now(), r.id); out.live++; continue; }
    if (!pages.has(url)) {
      pages.set(url, await f(url, { signal: AbortSignal.timeout(20e3), headers: { accept: "text/html" }, redirect: "follow" })
        .then(async (res) => (res.ok ? pageText(await res.text()) : { error: `${res.status} from the live site` }))
        .catch((e) => ({ error: String(e.message).slice(0, 160) })));
    }
    const page = pages.get(url);
    const t = now();
    if (typeof page === "string" && texts.every((x) => page.includes(x))) {
      mark.run("live", url, null, t, t, r.id); out.live++;
      logEvent(db, { direction: "live", sha: r.sha, summary: `request #${r.id} (${r.page_slug}) is on the live site`, actor: "approve" });
      log(`live: #${r.id} ${r.page_slug}`);
      continue;
    }
    /* the clock starts at the accept, or at the last "check again" */
    const since = new Date(r.check_since || r.decided_at || r.updated_at).getTime();
    if (Date.now() - since > LIVE_GIVE_UP_MS) {
      mark.run("unseen", url, page && page.error ? page.error : null, null, t, r.id);
      logEvent(db, { direction: "live", sha: r.sha, summary: `request #${r.id} (${r.page_slug}) not seen on the live site yet${page && page.error ? ": " + page.error : ""}`, actor: "approve" });
    } else {
      mark.run("checking", url, page && page.error ? page.error : null, null, t, r.id); out.waiting++;
    }
  }
  return out;
}

let watching = null;
/** Keep checking every LIVE_CHECK_SECONDS until nothing is waiting. One watcher at a time. */
export function watchLive(db, { fetch: f = fetch, sleep = defaultSleep, log = () => {} } = {}) {
  if (watching) return watching;
  watching = (async () => {
    for (;;) {
      let r;
      try { r = await checkLive(db, { fetch: f, log }); } catch (e) { log("live check: " + e.message); break; }
      if (!r.waiting) break;
      await sleep(LIVE_CHECK_MS);
    }
  })().finally(() => { watching = null; });
  return watching;
}
export const liveWatching = () => Boolean(watching);

/** Look again at a request the watcher gave up on. */
export function recheckLive(db, id) {
  const r = load(db, id);
  if (r.status !== "accepted") throw new QueueStateError(`Request #${id} is ${r.status}, not accepted.`);
  db.prepare("UPDATE change_requests SET deploy_status = NULL, deploy_error = NULL, check_since = ?, updated_at = ? WHERE id = ?").run(now(), now(), id);
  return { id, status: "accepted", deploy_status: null };
}
