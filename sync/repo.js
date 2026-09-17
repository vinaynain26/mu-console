/**
 * Git for one remote: the Lovable-connected repository.
 *
 * Plain `git` in a working clone under data/lab-repo. The token never lands
 * in .git/config: it travels as a per-command Authorization header, so a
 * copied clone leaks nothing. One git operation runs at a time.
 *
 *   LOVABLE_REPO        https://github.com/<owner>/<name>.git  (or a local path in tests)
 *   LOVABLE_TOKEN       fine-grained PAT, contents read and write on that repo
 *   LOVABLE_BRANCH      default "main", the branch Lovable syncs
 *   SYNC_CLONE_DIR      default data/lab-repo
 *   SYNC_SLUG_PREFIX    default "lab"
 *   SYNC_POLL_SECONDS   default 20
 *   SYNC_WEBHOOK_SECRET optional
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

export const cfg = () => ({
  repo: process.env.LOVABLE_REPO || "",
  token: process.env.LOVABLE_TOKEN || "",
  branch: process.env.LOVABLE_BRANCH || "main",
  clone: process.env.SYNC_CLONE_DIR || path.join(ROOT, "data/lab-repo"),
  prefix: process.env.SYNC_SLUG_PREFIX ?? "lab",           // "" means none: pages land on their own slugs
  homeSlug: process.env.SYNC_HOME_SLUG || "home",
  pollSeconds: Number(process.env.SYNC_POLL_SECONDS || 20),
  webhookSecret: process.env.SYNC_WEBHOOK_SECRET || "",
});

export const configured = () => Boolean(cfg().repo);
/* a local path (tests) needs no token; a GitHub URL does */
export const canPush = () => { const c = cfg(); return Boolean(c.repo) && (Boolean(c.token) || !/^https?:/.test(c.repo)); };

export const repoName = () => cfg().repo.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");

export function describe() {
  const c = cfg();
  return {
    configured: configured(), canPush: canPush(),
    repo: repoName(), repoUrl: /^https?:/.test(c.repo) ? c.repo.replace(/\.git$/, "") : "",
    branch: c.branch, prefix: c.prefix, pollSeconds: c.pollSeconds,
  };
}

/* ---------------- running git ---------------- */

const authArgs = (token) => token
  ? ["-c", "http.extraheader=AUTHORIZATION: basic " + Buffer.from("x-access-token:" + token).toString("base64")]
  : [];
const IDENTITY = ["-c", "user.name=MU Console", "-c", "user.email=console@mastersunion.org"];

export function git(args, { cwd, token, timeout = 120e3 } = {}) {
  return new Promise((resolve, reject) => {
    execFile("git", [...IDENTITY, ...authArgs(token), ...args], {
      cwd, timeout, maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "" },
    }, (err, stdout, stderr) => {
      if (err) {
        const msg = String(stderr || err.message).replace(/AUTHORIZATION: basic \S+/g, "AUTHORIZATION: basic ***");
        const e = new Error(msg.trim() || "git failed");
        e.code = err.code;
        return reject(e);
      }
      resolve(String(stdout).trim());
    });
  });
}

let chain = Promise.resolve();
export const serial = (fn) => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
};

/* ---------------- the working clone ---------------- */

export async function ensureClone() {
  const c = cfg();
  if (!configured()) throw new Error("Sync is not configured. Set LOVABLE_REPO in .env.");
  if (fs.existsSync(path.join(c.clone, ".git"))) {
    /* LOVABLE_REPO changed under an existing clone: start over, and take the
       old build with it, or the page would keep serving the previous site */
    const origin = await git(["remote", "get-url", "origin"], { cwd: c.clone }).catch(() => "");
    if (origin.replace(/\.git$/, "") !== c.repo.replace(/\.git$/, "")) {
      fs.rmSync(c.clone, { recursive: true, force: true });
      fs.rmSync(process.env.SYNC_DIST_DIR || path.join(ROOT, "data/lab-dist"), { recursive: true, force: true });
    }
  }
  if (!fs.existsSync(path.join(c.clone, ".git"))) {
    fs.mkdirSync(path.dirname(c.clone), { recursive: true });
    await git(["clone", "-q", "--branch", c.branch, "--single-branch", c.repo, c.clone], { token: c.token, timeout: 600e3 });
  }
  return c.clone;
}

/** Make the clone exactly origin/<branch>, discarding anything local. Returns the sha. */
export async function resetToRemote() {
  const c = cfg();
  const cwd = await ensureClone();
  await git(["merge", "--abort"], { cwd }).catch(() => {});
  await git(["fetch", "-q", "origin", c.branch], { cwd, token: c.token });
  /* forced: build-time overlay edits and untracked files must never block
     taking the remote, and the clean runs AFTER the checkout so the new
     commit's .gitignore decides what survives (provisioned assets do) */
  await git(["checkout", "-q", "-f", "-B", c.branch, "FETCH_HEAD"], { cwd });
  await git(["reset", "-q", "--hard", "FETCH_HEAD"], { cwd });
  await git(["clean", "-fdq"], { cwd });
  return git(["rev-parse", "HEAD"], { cwd });
}

export const localHead = async () => git(["rev-parse", "HEAD"], { cwd: cfg().clone });

/** The branch head on the remote, without touching the clone. */
export async function remoteHead() {
  const c = cfg();
  const out = await git(["ls-remote", "--heads", c.repo, c.branch], { token: c.token, timeout: 30e3 });
  const sha = out.split(/\s+/)[0];
  if (!sha) throw new Error(`Branch "${c.branch}" not found on ${repoName()}.`);
  return sha;
}

/**
 * Write `files`, commit as `author`, push. The caller has already called
 * resetToRemote(). Returns { sha: null } when nothing changed.
 */
export async function commitAndPush({ files, message, author }) {
  const c = cfg();
  const cwd = c.clone;
  const rels = [];
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(cwd, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
    rels.push(rel);
  }
  await git(["add", "--", ...rels], { cwd });
  const staged = await git(["diff", "--cached", "--name-only"], { cwd });
  if (!staged) return { sha: null, changed: [] };
  await git(["commit", "-q", "-m", message, "--author", `${author.name} <${author.email}>`], { cwd });
  const sha = await git(["rev-parse", "HEAD"], { cwd });
  await git(["push", "-q", "origin", `${c.branch}:${c.branch}`], { cwd, token: c.token });
  return { sha, changed: staged.split("\n") };
}

export async function verifyPushed(sha) {
  return (await remoteHead()) === sha;
}

/* ---------------- one syncer at a time ----------------
 *
 * Two servers pointed at the same clone reset, build and push into one
 * directory and produce a state neither of them can explain. The lock is a
 * file holding a pid: a live pid that is not us means someone else owns this
 * clone, and we stay read-only.
 */
const lockFile = () => path.join(path.dirname(cfg().clone), path.basename(cfg().clone) + ".lock");

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

/** { pid, at } when a live process holds the lock, else null. */
export function lockHolder() {
  try {
    const held = JSON.parse(fs.readFileSync(lockFile(), "utf8"));
    return held && alive(held.pid) ? held : null;
  } catch { return null; }
}

/** True when this process may sync. Re-taking our own lock is fine. */
export function acquireLock() {
  const held = lockHolder();
  if (held && held.pid !== process.pid) return false;
  fs.mkdirSync(path.dirname(lockFile()), { recursive: true });
  fs.writeFileSync(lockFile(), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  return true;
}

export function releaseLock() {
  const held = lockHolder();
  if (!held || held.pid === process.pid) { try { fs.unlinkSync(lockFile()); } catch { /* already gone */ } }
}
