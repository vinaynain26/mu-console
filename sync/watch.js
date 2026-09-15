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

let pulling = false;

export async function pullNow(db, { reason = "manual", force = false } = {}) {
  if (!repo.configured()) throw new Error("Sync is not configured. Set LOVABLE_REPO in .env.");
  const c = repo.cfg();
  const remote = await repo.remoteHead();
  if (!force && remote === getState(db).last_remote_sha) return { skipped: true, sha: remote };
  pulling = true;
  try {
    const sha = await repo.serial(() => repo.resetToRemote());
    const result = scan(c.clone, { homeSlug: "home" });
    const report = applyScan(db, result, { repo: repo.repoName(), branch: c.branch, sha, prefix: c.prefix });
    const now = new Date().toISOString();
    setState(db, { last_remote_sha: sha, last_scan_at: now, last_error: null });
    const totals = report.reduce((a, r) => ({ added: a.added + r.added, kept: a.kept + r.kept, retired: a.retired + r.retired, conflicts: a.conflicts + r.conflicts }),
      { added: 0, kept: 0, retired: 0, conflicts: 0 });
    logEvent(db, { direction: "pull", sha,
      summary: `${report.length} page${report.length === 1 ? "" : "s"}: ${totals.kept} kept, ${totals.added} added, ${totals.retired} retired, ${totals.conflicts} conflict${totals.conflicts === 1 ? "" : "s"}`,
      actor: reason });
    /* the page the editor sees is a build of this commit; rebuild now so a
       change made in Lovable shows on the page, not only in the studio */
    let build = null;
    if (!buildable()) return { sha, report, totals, build };
    try { build = await rebuild({ sha }); }
    catch (e) {
      setState(db, { last_error: "Build failed: " + String(e.message).slice(0, 400) });
      logEvent(db, { direction: "build", sha, summary: "failed: " + String(e.message).split("\n")[0].slice(0, 160), actor: reason });
    }
    if (build) logEvent(db, { direction: "build", sha, summary: `built in ${(build.lastBuildMs / 1000).toFixed(1)}s`, actor: reason });
    return { sha, report, totals, build };
  } catch (e) {
    setState(db, { last_error: String(e.message).slice(0, 500) });
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

export const summary = (db) => ({ ...repo.describe(), state: getState(db), conflicts: openConflicts(db).length, pulling, build: buildState() });
