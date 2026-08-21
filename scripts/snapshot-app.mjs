#!/usr/bin/env node
/**
 * BASELINE, AND THE DIFF AGAINST IT.
 *
 * Records what every route renders BEFORE the CMS transform, so afterwards we
 * can prove the transform changed nothing an audience would see. Without this
 * there is no way to tell "the page is fine" from "the page looks fine".
 *
 *   node scripts/snapshot-app.mjs --app <path> --out <dir>              # record
 *   node scripts/snapshot-app.mjs --app <path> --out <dir> --compare    # check
 *
 * The comparison is on TEXT, not markup: added data-c attributes are expected
 * and ignored, while a single changed word fails the run.
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync, spawn } from "node:child_process";
import { detectApp } from "./detect-app.mjs";

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const flag = (n) => argv.includes("--" + n);

const APP = path.resolve(arg("app") || ".");
const OUT = path.resolve(arg("out") || path.join(APP, ".mu-baseline"));
const PORT = Number(arg("port", "5701"));
const WAIT = Number(arg("wait", "2200"));
const COMPARE = flag("compare");

const app = detectApp(APP);
if (!app.ok) { console.error("  " + app.reason); process.exit(1); }

/** What a reader actually sees: text content, whitespace normalised. */
function visibleText(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
/** Image and link targets, in order — these must survive the transform too. */
function targets(html) {
  const srcs = [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/gi)].map((m) => m[1]);
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)].map((m) => m[1]);
  return { srcs, hrefs };
}

async function loadPuppeteer() {
  const { createRequire } = await import("node:module");
  for (const from of [path.join(APP, "package.json"), path.join(import.meta.dirname, "../package.json")]) {
    try {
      const req = createRequire(from);
      const mod = await import(url.pathToFileURL(req.resolve("puppeteer")).href);
      return mod.default ?? mod;
    } catch { /* next */ }
  }
  throw new Error("puppeteer not installed");
}

async function waitForServer(ms = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/`, { redirect: "manual" }); if (r.status < 500) return true; }
    catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  let server;
  try {
    if (!flag("skip-build")) {
      console.log("  building…");
      execSync(app.build.command, { cwd: APP, stdio: "inherit", env: { ...process.env, ...app.build.env } });
    }

    server = app.serve.kind === "node"
      ? spawn("node", [path.join(APP, ".output/server/index.mjs")],
          { cwd: APP, stdio: "ignore", detached: true, env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" } })
      : spawn("npx", ["serve", "dist", "-s", "-p", String(PORT), "--no-clipboard"],
          { cwd: APP, stdio: "ignore", detached: true });

    if (!await waitForServer()) throw new Error("app never started on " + PORT);

    const puppeteer = await loadPuppeteer();
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    /* This site animates numbers upward on view (CountUp). Captured mid-count
       the digits differ between any two runs, which would make every
       comparison fail for a reason that has nothing to do with the change
       being tested. The app honours prefers-reduced-motion, so ask for it. */
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    fs.mkdirSync(OUT, { recursive: true });

    let pass = 0, fail = 0;
    const problems = [];

    for (const r of app.routes) {
      const slug = app.slugFor(r.route, "home");
      process.stdout.write("  " + r.route.padEnd(56));
      try {
        const res = await page.goto(`http://127.0.0.1:${PORT}${r.route}`, { waitUntil: "networkidle0", timeout: 45000 });
        if (res && res.status() >= 400) throw new Error("HTTP " + res.status());
        await new Promise((x) => setTimeout(x, WAIT));
        // scroll so lazy content and reveal-on-scroll sections are present
        await page.evaluate(async () => {
          await new Promise((done) => {
            let y = 0;
            const step = () => {
              window.scrollTo(0, y); y += window.innerHeight;
              if (y < document.body.scrollHeight + window.innerHeight) setTimeout(step, 100);
              else { window.scrollTo(0, 0); setTimeout(done, 300); }
            };
            step();
          });
        });
        const html = await page.evaluate(() => (document.querySelector("main") || document.body).outerHTML);
        const snap = { route: r.route, text: visibleText(html), ...targets(html) };
        const file = path.join(OUT, slug + ".json");

        if (!COMPARE) {
          fs.writeFileSync(file, JSON.stringify(snap, null, 2));
          console.log("recorded  " + snap.text.length + " chars");
          pass++;
        } else {
          if (!fs.existsSync(file)) { console.log("NO BASELINE"); problems.push(r.route + ": no baseline"); fail++; continue; }
          const base = JSON.parse(fs.readFileSync(file, "utf8"));
          const issues = [];
          let animated = false;
          if (base.text !== snap.text) {
            // a counter that has not finished counting is not a regression;
            // a changed WORD always is
            const mask = (x) => x.replace(/[0-9]/g, "#");
            if (mask(base.text) === mask(snap.text)) {
              animated = true;
            } else {
              const i = [...base.text].findIndex((c, k) => c !== snap.text[k]);
              issues.push(`text differs at char ${i}: was ${JSON.stringify(base.text.slice(i, i + 45))}, now ${JSON.stringify(snap.text.slice(i, i + 45))}`);
            }
          }
          if (base.srcs.join("|") !== snap.srcs.join("|")) issues.push(`image targets differ (${base.srcs.length} -> ${snap.srcs.length})`);
          if (base.hrefs.join("|") !== snap.hrefs.join("|")) issues.push(`link targets differ (${base.hrefs.length} -> ${snap.hrefs.length})`);
          if (issues.length) { console.log("CHANGED"); issues.forEach((x) => problems.push(r.route + ": " + x)); fail++; }
          else { console.log(animated ? "identical (bar animated digits)" : "identical"); pass++; }
        }
      } catch (e) {
        console.log("ERROR  " + e.message);
        problems.push(r.route + ": " + e.message);
        fail++;
      }
    }

    await browser.close();
    console.log("\n  " + (COMPARE ? "identical: " : "recorded: ") + pass + "   problems: " + fail);
    if (problems.length) {
      console.log("");
      problems.forEach((p) => console.log("    " + p));
      process.exitCode = 1;
    }
  } catch (e) {
    console.error("  " + e.message);
    process.exitCode = 1;
  } finally {
    if (server) { try { process.kill(-server.pid); } catch { server.kill(); } }
  }
})();
