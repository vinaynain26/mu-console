/**
 * Build the connected app from the working clone so the page an editor sees
 * is a build of the CURRENT commit, never a stale one: after a publish the
 * field keys in the build match the re-keyed rows, and after a Lovable edit
 * the new text is there. Two shapes of app:
 *
 *   site  a TanStack Start app (the Masters' Union site). The overlay adds
 *         the plugin, runtime, loader and editor boot at build time, the
 *         build produces a node server, and the CMS runs that server itself
 *         on SITE_PORT (3000). Nothing is committed to the repo.
 *   spa   a Vite single-page app (the SecureFlow demo). Built static with the
 *         lab plugin and served by the CMS under /page/<slug>.
 *
 * Dependencies are installed once into the clone (node_modules is gitignored
 * there, so a reset never removes them).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import * as repo from "./repo.js";
import { applyOverlay } from "./overlay.js";
import { provisionAssets, assetsBase } from "./assets.js";

const ROOT = path.resolve(import.meta.dirname, "..");
export const DIST = process.env.SYNC_DIST_DIR || path.join(ROOT, "data/lab-dist");
const SPA_CONFIG = path.join(ROOT, "sync/vite.lab.config.mjs");
const SITE_PORT = Number(process.env.SITE_PORT || 3000);
const CMS_URL = (process.env.CMS_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/+$/, "");

let state = { building: false, lastBuildAt: null, lastBuildMs: null, lastError: null, sha: null, mode: null };
let site = null;   // the running site process, mode "site" only

export const isSite = () => fs.existsSync(path.join(repo.cfg().clone, "src/routes"));
export const mode = () => (isSite() ? "site" : "spa");

export const buildState = () => ({
  ...state, mode: mode(),
  built: mode() === "site" ? fs.existsSync(path.join(repo.cfg().clone, ".output/server/index.mjs")) : fs.existsSync(path.join(DIST, "index.html")),
  site: mode() === "site" ? { port: SITE_PORT, url: `http://localhost:${SITE_PORT}`, running: Boolean(site && !site.killed && site.exitCode === null) } : null,
});

function run(cmd, args, { cwd, timeout = 600e3, env = {} }) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { out += d; });
    const t = setTimeout(() => { p.kill(); reject(new Error(cmd + " timed out")); }, timeout);
    p.on("error", (e) => { clearTimeout(t); reject(e); });
    p.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} ${args[0]} failed (${code}):\n` + out.split("\n").filter((l) => !/ExperimentalWarning|trace-warnings/.test(l)).slice(-25).join("\n")));
    });
  });
}

/** Only a Vite app can be built here. */
export function buildable() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repo.cfg().clone, "package.json"), "utf8"));
    return Boolean((pkg.devDependencies || {}).vite || (pkg.dependencies || {}).vite);
  } catch { return false; }
}

export async function ensureDeps() {
  const clone = repo.cfg().clone;
  if (fs.existsSync(path.join(clone, "node_modules/vite/bin/vite.js"))) return false;
  console.log("  build: installing the app's dependencies (once)…");
  await run("npm", ["install", "--no-audit", "--no-fund", "--no-package-lock", "--loglevel=error"], { cwd: clone });
  return true;
}

/* ---------------- the site process ---------------- */

/* "is something answering on this port": a real connection, not a bind
   attempt. Binding 127.0.0.1 can succeed on macOS while a server listens on
   every interface, which made a healthy site look like it never started. */
const portUp = (port) => new Promise((res) => {
  const c = net.connect({ port, host: "localhost" });
  const done = (v) => { c.destroy(); res(v); };
  c.once("connect", () => done(true)); c.once("error", () => done(false));
  c.setTimeout(1000, () => done(false));
});
const portFree = async (port) => !(await portUp(port));
const waitFor = async (fn, ms, step = 250) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };

/** (Re)start the built site on SITE_PORT. Resolves once it answers. */
export async function serveSite() {
  const clone = repo.cfg().clone;
  const entry = path.join(clone, ".output/server/index.mjs");
  if (!fs.existsSync(entry)) throw new Error("No site build to serve yet.");
  await stopSite();
  if (!(await portFree(SITE_PORT))) throw new Error(`Port ${SITE_PORT} is held by another process. Stop it, or set SITE_PORT.`);
  site = spawn("node", [entry], { cwd: clone, env: { ...process.env, PORT: String(SITE_PORT), NITRO_PORT: String(SITE_PORT) }, stdio: ["ignore", "pipe", "pipe"] });
  site.stdout.on("data", () => {}); site.stderr.on("data", (d) => { const s = String(d); if (!/ExperimentalWarning|trace-warnings/.test(s)) process.stderr.write("  [site] " + s); });
  site.on("exit", (code) => { if (code !== null && code !== 0) console.log(`  site exited (${code})`); });
  const up = await waitFor(() => portUp(SITE_PORT), 20e3);
  if (!up) throw new Error("The site did not start listening on " + SITE_PORT + " in time.");
  return { port: SITE_PORT };
}

export function stopSite() {
  return new Promise((res) => {
    if (!site || site.exitCode !== null) { site = null; return res(); }
    const p = site; site = null;
    p.once("exit", () => res());
    p.kill("SIGTERM");
    setTimeout(() => { try { p.kill("SIGKILL"); } catch { /* gone */ } res(); }, 4000);
  });
}
for (const sig of ["SIGINT", "SIGTERM", "exit"]) process.on(sig, () => { try { site?.kill("SIGTERM"); } catch { /* gone */ } });

/* ---------------- building ---------------- */

let chain = Promise.resolve();
/** Build now (serialised), and for a site restart it. Resolves to the build state. */
export function rebuild({ sha = null } = {}) {
  const job = chain.then(async () => {
    const clone = repo.cfg().clone;
    if (!fs.existsSync(path.join(clone, "package.json"))) throw new Error("No clone to build yet.");
    state.building = true;
    const t0 = Date.now();
    try {
      await ensureDeps();
      if (isSite()) {
        applyOverlay(clone, { cmsUrl: CMS_URL, homeSlug: repo.cfg().homeSlug });
        /* the pictures the repo points at but does not carry; public/ is
           gitignored there, so one fetch outlives every reset */
        const a = await provisionAssets(clone, { from: assetsBase() });
        if (a.fetched || a.failed.length) {
          console.log(`  assets: ${a.fetched} fetched, ${a.present} present, ${a.failed.length} missing from ${assetsBase()}` +
            (a.failed.length ? "\n" + a.failed.slice(0, 5).map((f) => "    " + f.url + " (" + f.error + ")").join("\n") + (a.failed.length > 5 ? "\n    …" : "") : ""));
        }
        await run("node", [path.join(clone, "node_modules/vite/bin/vite.js"), "build"], {
          cwd: clone, env: { NITRO_PRESET: "node-server", VITE_MU_CMS_URL: CMS_URL, NODE_ENV: "production" },
        });
        await serveSite();
      } else {
        await run("node", [path.join(clone, "node_modules/vite/bin/vite.js"), "build", "--config", SPA_CONFIG], {
          cwd: clone, env: { MU_LAB_OUT: DIST, SYNC_SLUG_PREFIX: repo.cfg().prefix, NODE_ENV: "production" },
        });
      }
      state = { building: false, lastBuildAt: new Date().toISOString(), lastBuildMs: Date.now() - t0, lastError: null, sha, mode: mode() };
    } catch (e) {
      state = { ...state, building: false, lastError: String(e.message).slice(0, 2000) };
      throw e;
    }
    return buildState();
  });
  chain = job.catch(() => {});
  return job;
}

/** The built SPA index.html, or null when there is no build yet. */
export function indexHtml() {
  const f = path.join(DIST, "index.html");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}
