/**
 * The instrumentation the site needs, applied to the clone at BUILD time and
 * never committed: the plugin and runtime as whole files, and three anchored
 * insertions into files the site already has. Every anchor is exact text; if
 * Lovable ever rewrites one of those lines the build stops with a message
 * naming the file, rather than producing a site that silently lost the CMS.
 *
 * Idempotent: applying twice is the same as applying once.
 */
import fs from "node:fs";
import path from "node:path";

const HERE = path.resolve(import.meta.dirname, "overlay");
const MARK = "/* mu-cms overlay */";

/* a file already carrying the instrumentation, whether by this overlay or
   because the repo committed it, is left alone */
const instrumented = (s) => s.includes(MARK) || /mu-cms-runtime|tools\/mu-cms\/plugin/.test(s);

function patch(file, edits) {
  let s = fs.readFileSync(file, "utf8");
  if (instrumented(s)) return false;
  for (const { anchor, insert, replace } of edits) {
    if (!s.includes(anchor)) {
      throw new Error(`overlay: anchor not found in ${path.basename(file)}: ${JSON.stringify(anchor.slice(0, 60))}. The site changed under the CMS; the overlay needs updating.`);
    }
    s = replace ? s.replace(anchor, replace) : s.replace(anchor, anchor + insert);
  }
  fs.writeFileSync(file, s);
  return true;
}

export function applyOverlay(clone, { cmsUrl = "http://localhost:4000", homeSlug = "mu-home" } = {}) {
  /* whole files, only where the repo does not carry them itself */
  for (const rel of ["tools/mu-cms/plugin.mjs", "tools/mu-cms/keys.mjs", "src/mu-cms-runtime.ts"]) {
    const to = path.join(clone, rel);
    if (fs.existsSync(to)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(HERE, rel), to);
  }

  /* vite.config.ts: register the plugin */
  patch(path.join(clone, "vite.config.ts"), [
    { anchor: 'import { defineConfig } from "@lovable.dev/vite-tanstack-config";',
      insert: `\nimport muCms from "./tools/mu-cms/plugin.mjs"; ${MARK}` },
    { anchor: "export default defineConfig({",
      insert: `\n  vite: { plugins: [muCms({ homeSlug: ${JSON.stringify(homeSlug)} })] },` },
  ]);

  /* server.ts: one CMS store per request */
  {
    const f = path.join(clone, "src/server.ts");
    let s = fs.readFileSync(f, "utf8");
    if (!instrumented(s)) {
      const fetchLine = "const response = await handler.fetch(request, env, ctx);";
      if (!s.includes(fetchLine)) throw new Error("overlay: anchor not found in server.ts: handler.fetch line. The site changed under the CMS; the overlay needs updating.");
      s = `import { AsyncLocalStorage } from "node:async_hooks"; ${MARK}\nimport { setServerStoreProvider } from "./mu-cms-runtime";\n` + s;
      s = s.replace("export default", `const muScope = new AsyncLocalStorage<Map<string, string>>();\nsetServerStoreProvider(() => muScope.getStore());\n\nexport default`);
      s = s.replace(fetchLine, "const response = await muScope.run(new Map<string, string>(), () => handler.fetch(request, env, ctx));");
      fs.writeFileSync(f, s);
    }
  }

  /* __root.tsx: load copy before render, inline it, boot the editor, remount on structure edits */
  patch(path.join(clone, "src/routes/__root.tsx"), [
    { anchor: 'import { useEffect, type ReactNode } from "react";',
      replace: `import { useEffect, useSyncExternalStore, type ReactNode } from "react"; ${MARK}\nimport { loadContent, snapshotContent, subscribeContent, contentVersion } from "@/mu-cms-runtime";` },
    { anchor: "  head: () => ({",
      replace: `  loader: async ({ location }) => { await loadContent(muPageSlugFor(location.pathname)); return null; },\n  head: () => ({` },
    { anchor: "  }),\n  shellComponent: RootShell,",
      replace: `    scripts: [{ src: ${JSON.stringify(cmsUrl)} + "/mu-assets/js/mu-editor-boot.js", "data-cms": ${JSON.stringify(cmsUrl)}, "data-home-slug": ${JSON.stringify(homeSlug)}, defer: true }],\n  }),\n  shellComponent: RootShell,` },
    { anchor: "        <HeadContent />\n      </head>",
      replace: `        <HeadContent />\n        {(() => { const snap = snapshotContent(); return snap ? <script id="__mu_content" type="application/json" dangerouslySetInnerHTML={{ __html: snap }} /> : null; })()}\n      </head>` },
    { anchor: "      <SmoothScroll>",
      replace: "      <SmoothScroll key={useSyncExternalStore(subscribeContent, contentVersion, contentVersion)}>" },
    { anchor: "function RootShell(",
      replace: `function muPageSlugFor(pathname: string): string {\n  const clean = pathname.replace(/^\\/+|\\/+$/g, "");\n  return clean === "" ? ${JSON.stringify(homeSlug)} : clean.replace(/\\//g, "-").toLowerCase();\n}\n\nfunction RootShell(` },
  ]);
  return true;
}
