#!/usr/bin/env node
/**
 * ANY SUPPORTED APP  ->  HANDLEBARS PAGES.
 *
 * Builds a source project, serves it, visits every route it declares, and
 * captures what each one renders. Framework differences — how to build, how to
 * serve, where the routes are declared — all come from detect-app.mjs, so this
 * file does not care whether it is looking at React Router or TanStack Start.
 *
 * The converter lives HERE rather than inside each source project. One copy to
 * maintain, and a source repo needs nothing added to it to be convertible —
 * which matters for a project exported from Lovable that nobody can push back to.
 *
 *   node scripts/convert-app.mjs --app <path> [--out <dir>] [--home-slug <slug>]
 *                                [--only <route>] [--skip-build] [--wait <ms>]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import url from "node:url";
import { detectApp } from "./detect-app.mjs";

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const flag = (n) => argv.includes("--" + n);

const APP = path.resolve(arg("app") || ".");
const OUT = path.resolve(arg("out") || path.join(APP, "hbs-output"));
const HOME_SLUG = arg("home-slug", "home");
const ONLY = arg("only");
const PORT = Number(arg("port", "5678"));
const WAIT = Number(arg("wait", "2200"));   // let entry animations settle

if (!fs.existsSync(APP)) { console.error("no such app: " + APP); process.exit(1); }

const app = detectApp(APP);
if (!app.ok) {
  console.error("\n  cannot convert: " + app.reason);
  if (app.framework) console.error("  framework: " + app.framework);
  process.exit(1);
}

let routes = app.routes;
if (ONLY) routes = routes.filter((r) => r.route === ONLY);
if (!routes.length) { console.error("no routes to convert" + (ONLY ? " matching " + ONLY : "")); process.exit(1); }

console.log("\n  app       : " + APP);
console.log("  framework : " + app.framework);
console.log("  routes    : " + routes.length + (ONLY ? "  (filtered to " + ONLY + ")" : ""));
app.notes.forEach((n) => console.log("  note      : " + n));

/* ---------- build ---------- */
if (!flag("skip-build")) {
  console.log("\n  building…");
  execSync(app.build.command, { cwd: APP, stdio: "inherit", env: { ...process.env, ...app.build.env } });
}

/* ---------- the compiled stylesheet(s) ---------- *
 * The rendered page links its CSS by URL. A Handlebars view lives on a
 * different origin with different asset paths, so the styles have to travel
 * with it — inlined into the layout. */
function collectCSS() {
  const roots = [path.join(APP, ".output/public"), path.join(APP, "dist"), path.join(APP, "build")];
  const found = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".css")) found.push(p);
    }
  };
  roots.forEach(walk);
  return found.map((f) => fs.readFileSync(f, "utf8")).join("\n");
}

/* ---------- serve ---------- */
function startServer() {
  if (app.serve.kind === "node") {
    const entry = path.join(APP, ".output/server/index.mjs");
    if (!fs.existsSync(entry)) throw new Error("build produced no server entry at " + entry);
    return spawn("node", [entry], {
      cwd: APP, stdio: "ignore", detached: true,
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
    });
  }
  return spawn("npx", ["serve", "dist", "-s", "-p", String(PORT), "--no-clipboard"],
    { cwd: APP, stdio: "ignore", detached: true });
}

async function waitForServer(ms = 30000) {
  const started = Date.now();
  while (Date.now() - started < ms) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  let server;
  try {
    console.log("\n  serving on :" + PORT + " …");
    server = startServer();
    if (!await waitForServer()) throw new Error("the app never started listening on " + PORT);

    /* Puppeteer may be installed in the app, or here, or hoisted somewhere
       above either. Let node resolve it from both roots rather than guessing a
       path inside the package, which changes between versions. */
    const puppeteer = await loadPuppeteer();

    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const css = collectCSS();
    fs.mkdirSync(path.join(OUT, "views/layouts"), { recursive: true });
    console.log("  stylesheet: " + (css.length / 1024).toFixed(0) + " KB inlined into each layout\n");

    const manifest = [];
    const failures = [];

    for (const r of routes) {
      const slug = app.slugFor(r.route, HOME_SLUG);
      process.stdout.write("  " + r.route.padEnd(58));
      try {
        const res = await page.goto(`http://127.0.0.1:${PORT}${r.route}`, { waitUntil: "networkidle0", timeout: 45000 });
        if (res && res.status() >= 400) throw new Error("HTTP " + res.status());
        await new Promise((x) => setTimeout(x, WAIT));

        // Images that load on scroll never enter the viewport for a headless
        // visit, so their real src is never set. Walk the page first.
        await page.evaluate(async () => {
          await new Promise((done) => {
            let y = 0;
            const step = () => {
              window.scrollTo(0, y);
              y += window.innerHeight;
              if (y < document.body.scrollHeight + window.innerHeight) setTimeout(step, 120);
              else { window.scrollTo(0, 0); setTimeout(done, 400); }
            };
            step();
          });
        });
        await page.evaluate(async () => {
          await Promise.all(Array.from(document.images)
            .filter((i) => !i.complete)
            .map((i) => new Promise((res2) => { i.onload = i.onerror = res2; })));
        });

        const out = await page.evaluate(() => {
          const main = document.querySelector("main");
          const root = main || document.querySelector("#root") || document.body;
          const clone = root.cloneNode(true);
          clone.querySelectorAll("script, noscript").forEach((n) => n.remove());
          // lazy loaders leave the real URL on a data attribute; promote it so
          // the captured markup points at the image, not a placeholder
          clone.querySelectorAll("img[data-src]").forEach((i) => {
            i.setAttribute("src", i.getAttribute("data-src"));
            i.removeAttribute("data-src");
          });
          clone.querySelectorAll("img[loading=lazy]").forEach((i) => i.removeAttribute("loading"));
          return { html: main ? clone.outerHTML : clone.innerHTML, title: document.title || "" };
        });

        const plain = out.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (plain.length < 60) throw new Error("rendered almost nothing (" + plain.length + " chars of text)");

        const title = r.route === "/"
          ? (out.title.split(/[|—–-]/)[0].trim().slice(0, 60) || "Home")
          : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

        fs.writeFileSync(path.join(OUT, "views", slug + ".hbs"), out.html);
        fs.writeFileSync(path.join(OUT, "views/layouts", slug + ".hbs"), layout(css, title));
        manifest.push({ slug, title, route: r.route, bytes: out.html.length });
        console.log("ok   " + (out.html.length / 1024).toFixed(0) + " KB");
      } catch (e) {
        failures.push({ route: r.route, error: e.message });
        console.log("FAILED  " + e.message);
      }
    }

    await browser.close();
    fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify({
      app: path.basename(APP), framework: app.framework, pages: manifest, failures,
    }, null, 2));

    console.log("\n  " + manifest.length + "/" + routes.length + " route(s) converted -> " + OUT);
    if (failures.length) {
      console.log("\n  " + failures.length + " FAILED — these are NOT in pages.json, so nothing half-rendered gets published:");
      failures.forEach((f) => console.log("    " + f.route + "  " + f.error));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("\n  " + err.message);
    process.exitCode = 1;
  } finally {
    if (server) { try { process.kill(-server.pid); } catch { server.kill(); } }
  }
})();

async function loadPuppeteer() {
  const { createRequire } = await import("node:module");
  const roots = [path.join(APP, "package.json"), path.join(import.meta.dirname, "../package.json")];
  for (const from of roots) {
    try {
      const req = createRequire(from);
      const mod = await import(url.pathToFileURL(req.resolve("puppeteer")).href);
      return mod.default ?? mod;
    } catch { /* try the next root */ }
  }
  throw new Error("puppeteer is not installed in the app or in the CMS — run: npm install puppeteer");
}

function layout(css, title) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{title}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <style>
${css}
    </style>
  </head>
  <body>
    {{{body}}}
  </body>
</html>`;
}
