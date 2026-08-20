#!/usr/bin/env node
/**
 * WHAT KIND OF APP IS THIS, AND WHAT PAGES DOES IT HAVE?
 *
 * The converter needs three things from a source project: how to build it, how
 * to serve the result, and what URLs to visit. Every framework answers those
 * differently, and guessing wrong fails in ways that look like a broken page
 * rather than a wrong assumption — so this works it out explicitly and says so.
 *
 *   node scripts/detect-app.mjs <path-to-app>
 *
 * Also importable:  import { detectApp } from "./detect-app.mjs"
 */
import fs from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------ *
 * route discovery, per framework
 * ------------------------------------------------------------------ */

/**
 * TanStack Start / TanStack Router file routes.
 * The filename IS the URL, with dots for separators:
 *   index.tsx                       -> /
 *   about.tsx                       -> /about
 *   programmes.pg.pgp-tbm.tsx       -> /programmes/pg/pgp-tbm
 *   posts.$postId.tsx               -> dynamic, skipped
 *   _layout.tsx / __root.tsx        -> not pages
 */
function tanstackRoutes(root) {
  const dir = path.join(root, "src/routes");
  if (!fs.existsSync(dir)) return [];
  const out = [];

  const walk = (d, prefix = "") => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const name = entry.name;
      if (entry.isDirectory()) { walk(path.join(d, name), prefix + name + "/"); continue; }
      if (!/\.(tsx|jsx|ts|js)$/.test(name)) continue;

      const base = name.replace(/\.(tsx|jsx|ts|js)$/, "");
      if (base.startsWith("__")) continue;                 // __root, __layout
      if (base.startsWith("-")) continue;                  // ignored by convention
      const parts = (prefix + base).split(/[./]/).filter(Boolean);
      if (parts.some((p) => p.startsWith("$"))) continue;   // dynamic segment
      if (parts.some((p) => p.startsWith("_")))  continue;  // pathless layout
      if (parts[parts.length - 1] === "route") parts.pop(); // layout route file

      let route = "/" + parts.filter((p) => p !== "index").join("/");
      if (route === "/" && parts[parts.length - 1] !== "index" && parts.length) continue;
      route = route.replace(/\/+/g, "/");
      out.push({ route, file: path.relative(root, path.join(d, name)) });
    }
  };
  walk(dir);
  return out;
}

/** React Router: <Route path="..."> declared in a component file. */
function reactRouterRoutes(root) {
  const candidates = ["src/App.tsx", "src/App.jsx", "src/routes.tsx", "src/main.tsx", "src/router.tsx"];
  const file = candidates.map((f) => path.join(root, f)).find((f) => fs.existsSync(f));
  if (!file) return [];
  const src = fs.readFileSync(file, "utf8");
  const out = [];
  const re = /<Route\s+([^>]*?)path=["']([^"']+)["']([^>]*?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const route = m[2].trim();
    if (route === "*" || route.includes(":")) continue;
    const comp = ((m[1] + " " + m[3]).match(/element=\{<\s*([A-Za-z0-9_]+)/) || [])[1] || "";
    if (/^NotFound$/i.test(comp)) continue;
    out.push({ route: route.startsWith("/") ? route : "/" + route, file: path.relative(root, file) });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * detection
 * ------------------------------------------------------------------ */
export function detectApp(root) {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { ok: false, reason: "no package.json — this does not look like a JS project" };
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const has = (n) => Boolean(deps[n]);

  let framework = null, routes = [], notes = [];

  if (has("next")) {
    return { ok: false, framework: "nextjs",
      reason: "Next.js is not supported by the converter yet — it has its own build and serve shape." };
  }

  if (has("@tanstack/react-start") || has("@tanstack/start")) {
    framework = "tanstack-start";
    routes = tanstackRoutes(root);
    // Nitro defaults to a Cloudflare worker here, which cannot be served locally.
    // The node preset produces .output/server/index.mjs, which can.
    notes.push("SSR via nitro — build with NITRO_PRESET=node-server so the output is runnable");
  } else if (has("@tanstack/react-router")) {
    framework = "tanstack-router";
    routes = tanstackRoutes(root);
    if (!routes.length) { routes = reactRouterRoutes(root); notes.push("no file routes found; fell back to declared routes"); }
  } else if (has("react-router-dom") || has("react-router")) {
    framework = "react-router";
    routes = reactRouterRoutes(root);
  } else if (has("vite")) {
    framework = "vite-spa";
    routes = [{ route: "/", file: "index.html" }];
    notes.push("no router detected — treating the app as a single page");
  } else {
    return { ok: false, reason: "could not identify the framework from package.json" };
  }

  // de-duplicate and put the home route first
  const seen = new Set();
  routes = routes.filter((r) => (seen.has(r.route) ? false : seen.add(r.route)))
                 .sort((a, b) => (a.route === "/" ? -1 : b.route === "/" ? 1 : a.route.localeCompare(b.route)));

  const ssr = framework === "tanstack-start";
  return {
    ok: routes.length > 0,
    reason: routes.length ? null : "the framework was identified but no routes were found",
    framework,
    routes,
    notes,
    build: {
      command: pkg.scripts?.build ? "npm run build" : "npx vite build",
      env: ssr ? { NITRO_PRESET: "node-server" } : {},
      output: ssr ? ".output/server/index.mjs" : "dist",
    },
    serve: ssr
      ? { kind: "node", command: "node .output/server/index.mjs", portEnv: "PORT" }
      : { kind: "static", command: "npx serve dist -s --no-clipboard", portFlag: "-p" },
    slugFor(route, homeSlug) {
      if (route === "/") return homeSlug;
      return route.replace(/^\/+|\/+$/g, "").replace(/\//g, "-").toLowerCase();
    },
  };
}

/* ------------------------------------------------------------------ *
 * cli
 * ------------------------------------------------------------------ */
if (process.argv[1] && process.argv[1].endsWith("detect-app.mjs")) {
  const root = process.argv[2];
  if (!root) { console.error("usage: node scripts/detect-app.mjs <path-to-app>"); process.exit(1); }
  const d = detectApp(path.resolve(root));
  if (!d.ok) {
    console.error("  cannot convert: " + d.reason);
    if (d.framework) console.error("  framework: " + d.framework);
    process.exit(1);
  }
  console.log("\n  framework : " + d.framework);
  console.log("  build     : " + d.build.command +
    (Object.keys(d.build.env).length ? "   (" + Object.entries(d.build.env).map(([k, v]) => k + "=" + v).join(" ") + ")" : ""));
  console.log("  serve     : " + d.serve.command);
  d.notes.forEach((n) => console.log("  note      : " + n));
  console.log("\n  " + d.routes.length + " page route(s):");
  for (const r of d.routes) {
    console.log("    " + r.route.padEnd(52) + "-> " + d.slugFor(r.route, "home"));
  }
  console.log("");
}
