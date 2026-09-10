/**
 * The git side of publishing.
 *
 * Content no longer goes live by flipping a column in SQLite. It goes live the
 * way code does: an editor's drafts are written as `content/<slug>.json` and
 * committed to a preview branch of the site repo; a super admin approves, and
 * that branch is merged into the live branch and pushed — to the personal repo
 * (what Vercel deploys) and to the Lovable repo (so Lovable's own preview shows
 * the same thing).
 *
 * All of it is plain `git` in a working clone under data/repo, driven from
 * the server. A token never lands in .git/config: it travels as a per-command
 * Authorization header, so a copied clone leaks nothing.
 *
 *   PERSONAL_REPO   https://github.com/<you>/<site>.git       (required)
 *   GITHUB_TOKEN    PAT with contents:write on the personal repo (required)
 *   LOVABLE_REPO    https://github.com/<lovable-org>/<site>.git (optional)
 *   LOVABLE_TOKEN   PAT with contents:write on the Lovable repo (optional)
 *   PREVIEW_BRANCH  default "previewbranch"
 *   LIVE_BRANCH     default "main"
 *   CONTENT_DIR     default "public/content" — where the JSON files live in the repo
 *   PREVIEW_URL     a deployment of the preview branch, shown on the review screen
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = import.meta.dirname;

export const cfg = () => ({
  personal: process.env.PERSONAL_REPO || "",
  token: process.env.GITHUB_TOKEN || "",
  lovable: process.env.LOVABLE_REPO || "",
  lovableToken: process.env.LOVABLE_TOKEN || process.env.GITHUB_TOKEN || "",
  preview: process.env.PREVIEW_BRANCH || "previewbranch",
  live: process.env.LIVE_BRANCH || "main",
  /* under public/ so the built site serves the files statically, and the
     runtime shipped with it can fetch them from any deployment */
  dir: (process.env.CONTENT_DIR || "public/content").replace(/^\/+|\/+$/g, ""),
  previewUrl: process.env.PREVIEW_URL || "",
  liveUrl: process.env.LIVE_URL || "",
  clone: process.env.REPO_CLONE_DIR || path.join(ROOT, "data/repo"),
});

export const configured = () => Boolean(cfg().personal && cfg().token);

export function describe() {
  const c = cfg();
  return {
    ready: configured(),
    personal: c.personal.replace(/\.git$/, ""),
    lovable: c.lovable.replace(/\.git$/, ""),
    lovableReady: Boolean(c.lovable && c.lovableToken),
    preview: c.preview, live: c.live, dir: c.dir,
    previewUrl: c.previewUrl, liveUrl: c.liveUrl,
  };
}

/* ---------------- running git ---------------- */

/** GitHub accepts a PAT as HTTP basic auth with any username. */
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
        // never echo the header back: the token would be in it
        const msg = String(stderr || err.message).replace(/AUTHORIZATION: basic \S+/g, "AUTHORIZATION: basic ***");
        const e = new Error(msg.trim() || "git failed");
        e.code = err.code;
        return reject(e);
      }
      resolve(String(stdout).trim());
    });
  });
}

/* One git operation at a time. Two publishes racing in the same working
   clone would leave it half-checked-out; a queue is cheaper than a lock file. */
let chain = Promise.resolve();
export const serial = (fn) => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
};

/* ---------------- the working clone ---------------- */

/**
 * A sparse, blobless clone: only `content/` is checked out, so the site's
 * media never hits the console's disk. Merges still work — git fetches the
 * few blobs it needs lazily.
 */
export async function ensureClone() {
  const c = cfg();
  if (!configured()) throw new Error("Git publishing is not configured. Set PERSONAL_REPO and GITHUB_TOKEN.");
  const cwd = c.clone;
  const isRepo = fs.existsSync(path.join(cwd, ".git"));
  if (!isRepo) {
    fs.mkdirSync(path.dirname(cwd), { recursive: true });
    await git(["clone", "--filter=blob:none", "--no-checkout", c.personal, cwd], { token: c.token, timeout: 600e3 });
    await git(["sparse-checkout", "set", c.dir], { cwd });
  }
  await git(["fetch", "--prune", "origin"], { cwd, token: c.token });
  return cwd;
}

async function hasRemoteBranch(cwd, branch) {
  try { await git(["rev-parse", "--verify", "--quiet", `origin/${branch}`], { cwd }); return true; }
  catch { return false; }
}

/** Check out `branch` at exactly origin/<branch>, creating it from `from` if the remote lacks it. */
async function checkoutFresh(cwd, branch, from) {
  const c = cfg();
  await git(["reset", "-q", "--hard"], { cwd }).catch(() => {});
  await git(["merge", "--abort"], { cwd }).catch(() => {});
  if (await hasRemoteBranch(cwd, branch)) {
    await git(["checkout", "-q", "-B", branch, `origin/${branch}`], { cwd });
  } else {
    if (!from) throw new Error(`Branch "${branch}" does not exist on ${c.personal}.`);
    await git(["checkout", "-q", "-B", branch, `origin/${from}`], { cwd });
  }
  await git(["sparse-checkout", "reapply"], { cwd }).catch(() => {});
}

/* ---------------- content files ---------------- */

export const contentPath = (slug) => `${cfg().dir}/${slug}.json`;

function writeFiles(cwd, files) {
  const out = [];
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(cwd, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
    out.push(rel);
  }
  return out;
}

/**
 * Commit `files` ({ "content/home.json": "…" }) on the preview branch and push.
 * Returns the new commit sha, or null when the files were already identical.
 */
export function commitToPreview({ files, message, author }) {
  return serial(async () => {
    const c = cfg();
    const cwd = await ensureClone();
    await checkoutFresh(cwd, c.preview, c.live);
    const paths = writeFiles(cwd, files);
    await git(["add", "--", ...paths], { cwd });
    const staged = await git(["diff", "--cached", "--name-only"], { cwd });
    if (!staged) return { sha: null, changed: [] };
    const who = author ? ["--author", `${author.name} <${author.email}>`] : [];
    await git(["commit", "-q", "-m", message, ...who], { cwd });
    const sha = await git(["rev-parse", "HEAD"], { cwd });
    await git(["push", "-q", "origin", `${c.preview}:${c.preview}`], { cwd, token: c.token });
    return { sha, changed: staged.split("\n") };
  });
}

/**
 * Bring the live branch up to date with Lovable, merge the preview branch into
 * it, and push — to the personal repo and, when configured, back to Lovable.
 * Returns the shas that now sit on live, and whether Lovable took the push.
 */
export function approveToLive({ message }) {
  return serial(async () => {
    const c = cfg();
    const cwd = await ensureClone();
    await checkoutFresh(cwd, c.live);

    let lovable = { configured: Boolean(c.lovable && c.lovableToken), pulled: false, pushed: false, error: null };
    if (lovable.configured) {
      /* Lovable may have edited the code since the last approval. Take that
         first, so live never goes backwards for Lovable and its push below
         is a fast-forward. Content files are ours alone, so this cannot
         conflict on them. */
      try {
        await git(["fetch", c.lovable, c.live], { cwd, token: c.lovableToken });
        await git(["merge", "-q", "--no-edit", "FETCH_HEAD", "-m", `Sync ${c.live} from Lovable`], { cwd });
        lovable.pulled = true;
      } catch (e) {
        await git(["merge", "--abort"], { cwd }).catch(() => {});
        throw new Error("Could not take Lovable's latest changes into " + c.live + ": " + e.message);
      }
    }

    if (!(await hasRemoteBranch(cwd, c.preview))) throw new Error(`Nothing to approve: "${c.preview}" does not exist yet.`);
    try {
      await git(["merge", "-q", "--no-ff", "--no-edit", `origin/${c.preview}`, "-m", message], { cwd });
    } catch (e) {
      await git(["merge", "--abort"], { cwd }).catch(() => {});
      throw new Error("Merging " + c.preview + " into " + c.live + " failed: " + e.message);
    }
    const sha = await git(["rev-parse", "HEAD"], { cwd });
    await git(["push", "-q", "origin", `${c.live}:${c.live}`], { cwd, token: c.token });

    if (lovable.configured) {
      try {
        await git(["push", "-q", c.lovable, `${c.live}:${c.live}`], { cwd, token: c.lovableToken });
        lovable.pushed = true;
      } catch (e) { lovable.error = e.message; }
    }

    /* keep preview level with live, so the next review carries only its own change */
    await git(["push", "-q", "origin", `${c.live}:${c.preview}`], { cwd, token: c.token }).catch(() => {});
    return { sha, lovable };
  });
}

/** What is waiting on the preview branch that live does not have. */
export function pendingOnPreview() {
  return serial(async () => {
    const c = cfg();
    const cwd = await ensureClone();
    if (!(await hasRemoteBranch(cwd, c.preview))) return { commits: [], files: [] };
    const range = `origin/${c.live}..origin/${c.preview}`;
    const log = await git(["log", "--format=%H%x1f%an%x1f%aI%x1f%s", range], { cwd });
    const commits = log ? log.split("\n").map((l) => {
      const [sha, author, at, subject] = l.split("\x1f");
      return { sha, author, at, subject };
    }) : [];
    const files = (await git(["diff", "--name-only", `origin/${c.live}...origin/${c.preview}`], { cwd }))
      .split("\n").filter(Boolean);
    return { commits, files };
  });
}

/**
 * Mirror the Lovable repo into the personal one: every branch and tag. Safe
 * to rerun — later runs just carry over what Lovable added since.
 */
export function mirrorFromLovable() {
  return serial(async () => {
    const c = cfg();
    if (!c.lovable || !c.lovableToken) throw new Error("Set LOVABLE_REPO and LOVABLE_TOKEN first.");
    const cwd = await ensureClone();
    await git(["fetch", c.lovable, `+refs/heads/*:refs/remotes/lovable/*`], { cwd, token: c.lovableToken, timeout: 600e3 });
    const heads = (await git(["for-each-ref", "--format=%(refname:strip=3)", "refs/remotes/lovable/"], { cwd }))
      .split("\n").filter(Boolean);
    const pushed = [];
    for (const b of heads) {
      if (b === c.preview) continue;             // ours, never Lovable's
      if (b === c.live) {
        /* Lovable's live merges into ours rather than replacing it, so the
           content files and approved copy survive a resync. */
        await checkoutFresh(cwd, c.live, c.live).catch(async () => {
          await git(["checkout", "-q", "-B", c.live, `refs/remotes/lovable/${c.live}`], { cwd });
        });
        if (await hasRemoteBranch(cwd, c.live)) {
          await git(["merge", "-q", "--no-edit", `refs/remotes/lovable/${c.live}`, "-m", `Sync ${c.live} from Lovable`], { cwd });
        }
        await git(["push", "-q", "origin", `${c.live}:${c.live}`], { cwd, token: c.token });
      } else {
        await git(["push", "-q", "origin", `refs/remotes/lovable/${b}:refs/heads/${b}`], { cwd, token: c.token });
      }
      pushed.push(b);
    }
    if (!(await hasRemoteBranch(cwd, c.preview))) {
      await git(["push", "-q", "origin", `origin/${c.live}:refs/heads/${c.preview}`], { cwd, token: c.token });
      pushed.push(c.preview + " (created)");
    }
    await git(["fetch", "--prune", "origin"], { cwd, token: c.token });
    return { branches: pushed };
  });
}

/** Where things stand, for the studio. Cheap: no network. */
export async function status() {
  const c = cfg();
  const out = describe();
  if (!configured() || !fs.existsSync(path.join(c.clone, ".git"))) return { ...out, cloned: false };
  const rev = async (ref) => { try { return await git(["rev-parse", "--short", ref], { cwd: c.clone }); } catch { return null; } };
  return { ...out, cloned: true, liveSha: await rev(`origin/${c.live}`), previewSha: await rev(`origin/${c.preview}`) };
}

/* ---------------- what GitHub knows ---------------- */

async function gh(url, token) {
  const r = await fetch(url, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "mu-console" } });
  if (!r.ok) throw new Error(`GitHub ${r.status} for ${url.replace("https://api.github.com", "")}`);
  return r.json();
}

const slugOf = (u) => (u || "").replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").toLowerCase();

/**
 * Every repository the configured tokens can see, straight from GitHub —
 * with the two that matter to publishing marked. Tokens stay on the server.
 */
export async function listProjects() {
  const c = cfg();
  const tokens = [...new Set([c.token, c.lovableToken].filter(Boolean))];
  if (!tokens.length) return { projects: [], accounts: [] };
  const seen = new Map(), accounts = [];
  for (const t of tokens) {
    let me = null;
    try { me = await gh("https://api.github.com/user", t); } catch { continue; }
    accounts.push(me.login);
    let repos = [];
    try { repos = await gh("https://api.github.com/user/repos?per_page=100&sort=pushed", t); } catch { continue; }
    for (const r of repos) {
      if (seen.has(r.full_name.toLowerCase())) continue;
      seen.set(r.full_name.toLowerCase(), {
        name: r.full_name, url: r.html_url, description: r.description, private: r.private,
        defaultBranch: r.default_branch, pushedAt: r.pushed_at, canPush: Boolean(r.permissions?.push),
        account: me.login, _token: t,
      });
    }
  }
  const lovable = slugOf(c.lovable), personal = slugOf(c.personal);
  const projects = [];
  for (const p of seen.values()) {
    const key = p.name.toLowerCase();
    p.role = key === lovable ? "lovable" : key === personal ? "personal" : null;
    if (p.role) {
      /* the two repos in the flow get their branch list, so the shelf can say
         whether previewbranch exists yet and what sits on it */
      try {
        const b = await gh(`https://api.github.com/repos/${p.name}/branches?per_page=100`, p._token);
        p.branches = b.map((x) => ({ name: x.name, sha: x.commit.sha.slice(0, 7) }));
      } catch { p.branches = []; }
    }
    delete p._token;
    projects.push(p);
  }
  projects.sort((a, b) => (a.role ? 0 : 1) - (b.role ? 0 : 1) || (b.pushedAt || "").localeCompare(a.pushedAt || ""));
  return { projects, accounts, lovable: c.lovable, personal: c.personal };
}
