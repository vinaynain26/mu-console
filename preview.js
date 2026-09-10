/**
 * Rendering a GitHub site inside the console.
 *
 * The console cannot render a React app from its copy alone, and it should
 * not try: the app renders itself. So the console does what a deployment
 * does — takes the repo from GitHub, runs its own build, and serves the
 * result — under /preview/<repo>/. On top of that rendered page a small
 * overlay script swaps the original copy for whatever the console holds
 * (draft or live), so an editor sees their change on the real page long
 * before the site itself learns to read content files.
 *
 * One tweak to the source is made in the working copy and reverted after the
 * build: <BrowserRouter> gets a basename, so the app's own router agrees to
 * live under a sub-path. Nothing is ever committed.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import * as repo from "./repo.js";
import * as ingest from "./ingest.js";

const ROOT = import.meta.dirname;
const BUILDS = process.env.BUILD_DIR || path.join(ROOT, "data/builds");

export const dirOf = (repoName) => ingest.repoSlug(repoName).replace("/", "--");
export const baseFor = (repoName) => `/preview/${dirOf(repoName)}/`;
const outDir = (repoName) => path.join(BUILDS, dirOf(repoName));
const metaFile = (repoName) => path.join(outDir(repoName), ".mu-build.json");

/* build state lives in memory: one build per repo at a time, with its log */
const jobs = new Map();

export function status(repoName) {
  const job = jobs.get(dirOf(repoName));
  let built = null;
  try { built = JSON.parse(fs.readFileSync(metaFile(repoName), "utf8")); } catch { /* not built */ }
  return {
    repo: ingest.repoSlug(repoName), base: baseFor(repoName),
    built: built && fs.existsSync(path.join(outDir(repoName), "index.html")) ? built : null,
    building: Boolean(job && !job.done),
    log: job ? job.log.slice(-4000) : "",
    error: job?.error || null,
  };
}

function run(cmd, args, { cwd, log }) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const p = spawn(isWin ? cmd + ".cmd" : cmd, args, { cwd, shell: isWin, env: { ...process.env, CI: "1", FORCE_COLOR: "0" } });
    p.stdout.on("data", (d) => log(String(d)));
    p.stderr.on("data", (d) => log(String(d)));
    p.on("error", reject);
    p.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)));
  });
}

/**
 * Fetch, install, build. Resolves when the build is on disk. A second call
 * while one is running returns the running job.
 */
export function build({ repoName, url, token, branch }) {
  const key = dirOf(repoName);
  const existing = jobs.get(key);
  if (existing && !existing.done) return existing.promise;

  const job = { log: "", done: false, error: null, startedAt: new Date().toISOString() };
  const log = (s) => { job.log += s; if (job.log.length > 200000) job.log = job.log.slice(-100000); };
  jobs.set(key, job);

  job.promise = ingest.withSource(ingest.repoSlug(repoName), async () => {
    log(`> fetch ${repoName} @ ${branch}\n`);
    const { dir, sha } = await ingest.fetchSource({ url, token, branch });

    /* the router has to know it lives under /preview/<repo>/ */
    const appFile = ["src/App.tsx", "src/App.jsx"].map((f) => path.join(dir, f)).find(fs.existsSync);
    let patched = false;
    if (appFile) {
      const src = fs.readFileSync(appFile, "utf8");
      if (/<BrowserRouter>/.test(src)) {
        fs.writeFileSync(appFile, src.replace(/<BrowserRouter>/g, `<BrowserRouter basename={import.meta.env.BASE_URL.replace(/\\/$/, "")}>`));
        patched = true;
        log("> router: basename set to BASE_URL for the build\n");
      }
    }
    try {
      const hasLock = fs.existsSync(path.join(dir, "package-lock.json"));
      log(`> npm ${hasLock ? "ci" : "install"}\n`);
      try { await run("npm", [hasLock ? "ci" : "install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: dir, log }); }
      catch (e) { log("! " + e.message + "\n> npm install (fallback)\n"); await run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: dir, log }); }

      const out = outDir(repoName);
      fs.mkdirSync(BUILDS, { recursive: true });
      log(`> vite build --base ${baseFor(repoName)}\n`);
      await run("npx", ["vite", "build", "--base", baseFor(repoName), "--outDir", out, "--emptyOutDir"], { cwd: dir, log });
      fs.writeFileSync(metaFile(repoName), JSON.stringify({ sha, branch, at: new Date().toISOString(), base: baseFor(repoName) }, null, 2));
      log(`> built ${sha.slice(0, 7)}\n`);
      return { sha, base: baseFor(repoName) };
    } finally {
      if (patched) await repo.git(["checkout", "-q", "--", path.relative(dir, appFile)], { cwd: dir }).catch(() => {});
    }
  });
  job.promise.then(() => { job.done = true; }, (e) => { job.done = true; job.error = e.message; });
  return job.promise;
}

/**
 * Express handler for /preview/<dir>/*: static files from the build, the
 * SPA's index.html for anything else, with the overlay script injected.
 */
export function serve(req, res, next) {
  const m = req.path.match(/^\/preview\/([\w.-]+)(\/.*)?$/);
  if (!m) return next();
  const dir = path.join(BUILDS, m[1]);
  if (!fs.existsSync(path.join(dir, "index.html"))) return res.status(404).send("Not built yet. Press Build preview in the studio.");
  const rel = decodeURIComponent(m[2] || "/");
  const file = path.normalize(path.join(dir, rel));
  if (file !== dir && !file.startsWith(dir + path.sep)) return res.sendStatus(400);
  if (rel !== "/" && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.set("Cache-Control", "no-store");
    return res.sendFile(file);
  }
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const route = rel.replace(/\/+$/, "") || "/";
  const boot = JSON.stringify({ repoDir: m[1], preview: req.query.preview === "1" }).replace(/</g, "\\u003c");
  let tag = `<script>window.__MU_PREVIEW__=${boot};</script>\n<script src="/mu-assets/js/preview-overlay.js" defer></script>`;
  /* ?edit=1: the inline editor rides on top, exactly as it does on a template
     page. The server hands us a boot object because it knows the user and
     which console page this route is. */
  const editor = req.query.edit === "1" && typeof req.muEditorBoot === "function" ? req.muEditorBoot(m[1], route) : null;
  if (editor) {
    tag += `\n<link rel="stylesheet" href="/mu-assets/css/inline-editor.css">
<script>window.__MU_EDITOR__=${JSON.stringify(editor).replace(/</g, "\\u003c")};</script>
<script src="/mu-assets/js/inline-editor.js" defer></script>`;
  }
  html = html.includes("</body>") ? html.replace("</body>", tag + "\n</body>") : html + tag;
  res.set("Cache-Control", "no-store");
  res.type("html").send(html);
}
