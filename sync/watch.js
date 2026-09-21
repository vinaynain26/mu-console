/**
 * Noticing what Lovable committed. A pull is: remote head changed? fetch,
 * scan, apply. Cheap enough to run every few seconds, so the studio can
 * show the designer's edit within one poll of it landing on GitHub.
 */
import * as repo from "./repo.js";
import { scan } from "./scan.js";
import { applyScan } from "./apply.js";
import { getState, setState, logEvent, openConflicts } from "./store.js";
import { rebuild, buildState, buildable } from "./build.js";
import { mirrorAssets } from "./mirror.js";
import { assetsBase } from "./assets.js";
import * as uploads from "../uploads.js";

/* Pictures the designer adds in Lovable move to UnionStack on the pull that
   brings them, and the rewritten pointers go back to the repo as one commit.
   Only pointers still on Lovable are touched, so a pull with nothing new
   costs nothing. UNIONSTACK_API_KEY turns it on; ASSET_MIRROR=0 turns it off. */
export const mirrorOn = () => uploads.configured() && process.env.ASSET_MIRROR !== "0";
export async function mirrorStep(db, clone) {
  const m = await mirrorAssets(clone, { from: assetsBase(), uploader: { upload: uploads.uploadAny }, db, log: (l) => console.log(l) });
  const out = { moved: m.moved.length, reused: m.reused, failed: m.failed.length, stopped: m.stopped, sha: null };
  if (m.moved.length) {
    const n = m.moved.length;
    const message = `assets: ${n} picture${n === 1 ? "" : "s"} to UnionStack\n\nMoved from Lovable's storage to files.unionstack.in by MU Console; each pointer keeps its old path as lovableUrl.\n\n` +
      m.moved.slice(0, 40).map((r) => "  " + r).join("\n") + (n > 40 ? "\n  \u2026" : "");
    try {
      const pushed = await repo.serial(() => repo.commitAndPush({ files: m.files, message, author: { name: "MU Console", email: "console@mastersunion.org" } }));
      out.sha = pushed.sha;
      logEvent(db, { direction: "push", sha: pushed.sha, summary: `${n} picture${n === 1 ? "" : "s"} moved to UnionStack${m.reused ? ` (${m.reused} reused)` : ""}`, actor: "mirror" });
    } catch (e) {
      /* Lovable pushed at the same moment: the pointers are rewritten again
         next pull from the ledger, without uploading */
      logEvent(db, { direction: "error", sha: null, summary: "mirror commit failed: " + String(e.message).split("\n")[0].slice(0, 140), actor: "mirror" });
    }
  }
  if (m.failed.length) logEvent(db, { direction: "mirror", sha: null,
    summary: `${m.failed.length} picture${m.failed.length === 1 ? "" : "s"} still on Lovable: ` + m.failed.slice(0, 3).map((f) => f.rel.split("/").pop() + " (" + f.error + ")").join(", ") + (m.failed.length > 3 ? ", \u2026" : ""), actor: "mirror" });
  return out;
}

let pulling = false;
let failures = 0;        // consecutive, so a flapping network logs once, not forever

export async function pullNow(db, { reason = "manual", force = false } = {}) {
  if (!repo.configured()) throw new Error("Sync is not configured. Set LOVABLE_REPO in .env.");
  const c = repo.cfg();
  pulling = true;
  try {
    /* Reading the remote head sits INSIDE the guard on purpose. It used to be
       outside, so a failure here left nothing behind: no last_error, no log
       line, and a Sync panel that looked healthy while nothing was syncing. */
    let remote;
    try { remote = await repo.remoteHead(); }
    catch (e) { throw new Error("Could not reach " + repo.repoName() + ": " + e.message); }
    if (!force && remote === getState(db).last_remote_sha) {
      failures = 0;
      /* nothing new, but GitHub answered: a lingering "could not reach" from an
         earlier blip is no longer true, and the panel must not keep saying it */
      if (/^Could not reach/.test(getState(db).last_error || "")) setState(db, { last_error: null });
      return { skipped: true, sha: remote };
    }
    let sha = await repo.serial(() => repo.resetToRemote());
    const result = scan(c.clone, { homeSlug: c.homeSlug });
    const report = applyScan(db, result, { repo: repo.repoName(), branch: c.branch, sha, prefix: c.prefix });
    const now = new Date().toISOString();
    setState(db, { last_remote_sha: sha, last_scan_at: now, last_error: null });   // a good pull clears the last failure
    let mirror = null;
    if (mirrorOn()) {
      mirror = await mirrorStep(db, c.clone);
      /* our own commit is the head now; the next poll must not re-pull it */
      if (mirror.sha) { sha = mirror.sha; setState(db, { last_remote_sha: sha, last_push_sha: sha, last_push_at: new Date().toISOString() }); }
    }
    const totals = report.reduce((a, r) => ({ added: a.added + r.added, kept: a.kept + r.kept, retired: a.retired + r.retired, conflicts: a.conflicts + r.conflicts }),
      { added: 0, kept: 0, retired: 0, conflicts: 0 });
    logEvent(db, { direction: "pull", sha,
      summary: `${report.length} page${report.length === 1 ? "" : "s"}: ${totals.kept} kept, ${totals.added} added, ${totals.retired} retired, ${totals.conflicts} conflict${totals.conflicts === 1 ? "" : "s"}`,
      actor: reason });
    /* the page the editor sees is a build of this commit; rebuild now so a
       change made in Lovable shows on the page, not only in the studio */
    let build = null;
    if (!buildable()) return { sha, report, totals, build, mirror };
    try { build = await rebuild({ sha }); }
    catch (e) {
      setState(db, { last_error: "Build failed: " + String(e.message).slice(0, 400) });
      logEvent(db, { direction: "build", sha, summary: "failed: " + String(e.message).split("\n")[0].slice(0, 160), actor: reason });
    }
    if (build) logEvent(db, { direction: "build", sha, summary: `built in ${(build.lastBuildMs / 1000).toFixed(1)}s`, actor: reason });
    failures = 0;
    return { sha, report, totals, build, mirror };
  } catch (e) {
    const msg = String(e.message).slice(0, 500);
    /* Log a failure the first time it appears, then stay quiet while it
       repeats: a poll every 20s would bury the history under one line. The
       comparison is against what the database already holds, so this behaves
       the same after a restart as it does in a single run. */
    const seen = getState(db).last_error;
    setState(db, { last_error: msg });
    if (seen !== msg) logEvent(db, { direction: "error", sha: null, summary: msg.split("\n")[0].slice(0, 160), actor: reason });
    failures++;
    throw e;
  } finally { pulling = false; }
}

export function startPolling(db, { seconds = 20, onError = () => {} } = {}) {
  const tick = () => { if (pulling) return; pullNow(db, { reason: "poll" }).catch(onError); };
  const t = setInterval(tick, Math.max(5, seconds) * 1000);
  t.unref();
  setTimeout(tick, 1500).unref();
  return () => clearInterval(t);
}

export const summary = (db) => ({
  ...repo.describe(), state: getState(db), conflicts: openConflicts(db).length,
  pulling, failures, build: buildState(), owner: repo.lockHolder(),
});
