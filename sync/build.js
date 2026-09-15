/**
 * Build the Lovable app from the working clone so the CMS can serve it with
 * the inline editor on top. Dependencies are installed once into the clone
 * (node_modules is gitignored there, so a reset never removes them); the
 * build runs after every pull and every push.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as repo from "./repo.js";

const ROOT = path.resolve(import.meta.dirname, "..");
export const DIST = process.env.SYNC_DIST_DIR || path.join(ROOT, "data/lab-dist");
const CONFIG = path.join(ROOT, "sync/vite.lab.config.mjs");

let state = { building: false, lastBuildAt: null, lastBuildMs: null, lastError: null, sha: null };
export const buildState = () => ({ ...state, built: fs.existsSync(path.join(DIST, "index.html")) });

/** Only a Vite app can be built here. Anything else (a test fixture, a
    non-Vite repo) is scanned and edited from the studio, never rendered. */
export function buildable() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repo.cfg().clone, "package.json"), "utf8"));
    return Boolean((pkg.devDependencies || {}).vite || (pkg.dependencies || {}).vite);
  } catch { return false; }
}

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
      else reject(new Error(`${cmd} ${args[0]} failed (${code}):\n` + out.split("\n").slice(-25).join("\n")));
    });
  });
}

export async function ensureDeps() {
  const clone = repo.cfg().clone;
  const vite = path.join(clone, "node_modules/vite/bin/vite.js");
  if (fs.existsSync(vite)) return false;
  console.log("  lab: installing the app's dependencies (once)…");
  await run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: clone });
  return true;
}

let chain = Promise.resolve();
/** Build now (serialised). Resolves to the build state. */
export function rebuild({ sha = null } = {}) {
  const job = chain.then(async () => {
    const clone = repo.cfg().clone;
    if (!fs.existsSync(path.join(clone, "package.json"))) throw new Error("No clone to build yet.");
    state.building = true;
    const t0 = Date.now();
    try {
      await ensureDeps();
      await run("node", [path.join(clone, "node_modules/vite/bin/vite.js"), "build", "--config", CONFIG], {
        cwd: clone, env: { MU_LAB_OUT: DIST, SYNC_SLUG_PREFIX: repo.cfg().prefix, NODE_ENV: "production" },
      });
      state = { building: false, lastBuildAt: new Date().toISOString(), lastBuildMs: Date.now() - t0, lastError: null, sha };
    } catch (e) {
      state = { ...state, building: false, lastError: String(e.message).slice(0, 2000) };
      throw e;
    }
    return buildState();
  });
  chain = job.catch(() => {});
  return job;
}

/** The built index.html, or null when there is no build yet. */
export function indexHtml() {
  const f = path.join(DIST, "index.html");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}
