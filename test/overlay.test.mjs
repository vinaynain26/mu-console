/* The overlay adds the CMS to a clean TanStack Start checkout at build time.
   It must be idempotent, and it must refuse loudly when the site no longer
   carries the lines it anchors on. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpDir } from "./helpers.mjs";
import { applyOverlay } from "../sync/overlay.js";

function cleanSite() {
  const d = tmpDir("overlay");
  fs.mkdirSync(path.join(d, "src/routes"), { recursive: true });
  fs.writeFileSync(path.join(d, "vite.config.ts"), `import { defineConfig } from "@lovable.dev/vite-tanstack-config";\n\nexport default defineConfig({\n  tanstackStart: {},\n});\n`);
  fs.writeFileSync(path.join(d, "src/server.ts"), `import handler from "@tanstack/react-start/server-entry";\n\nexport default {\n  async fetch(request, env, ctx) {\n    try {\n      const response = await handler.fetch(request, env, ctx);\n      return response;\n    } catch (e) { throw e; }\n  },\n};\n`);
  fs.writeFileSync(path.join(d, "src/routes/__root.tsx"), `import { useEffect, type ReactNode } from "react";\n\nexport const Route = createRootRouteWithContext()({\n  head: () => ({\n    meta: [],\n  }),\n  shellComponent: RootShell,\n  component: RootComponent,\n});\n\nfunction RootShell({ children }: { children: ReactNode }) {\n  return (\n    <html>\n      <head>\n        <HeadContent />\n      </head>\n      <body>{children}</body>\n    </html>\n  );\n}\n\nfunction RootComponent() {\n  return (\n      <SmoothScroll>\n        <Outlet />\n      </SmoothScroll>\n  );\n}\n`);
  return d;
}

test("applies every piece, and applying again changes nothing", () => {
  const d = cleanSite();
  applyOverlay(d, { cmsUrl: "http://cms.test", homeSlug: "mu-home" });
  const read = (f) => fs.readFileSync(path.join(d, f), "utf8");
  assert.ok(fs.existsSync(path.join(d, "tools/mu-cms/plugin.mjs")));
  assert.ok(fs.existsSync(path.join(d, "src/mu-cms-runtime.ts")));
  assert.match(read("vite.config.ts"), /muCms\(\{ homeSlug: "mu-home" \}\)/);
  assert.match(read("src/server.ts"), /muScope\.run\(new Map/);
  const root = read("src/routes/__root.tsx");
  assert.match(root, /loader: async \(\{ location \}\)/);
  assert.match(root, /mu-editor-boot\.js/);
  assert.match(root, /"data-cms": "http:\/\/cms\.test"/);
  assert.match(root, /id="__mu_content"/);
  assert.match(root, /<SmoothScroll key=\{useSyncExternalStore/);
  assert.ok(root.indexOf("scripts: [") < root.indexOf("shellComponent: RootShell"), "scripts sits inside head()");
  const snapshot = [read("vite.config.ts"), read("src/server.ts"), read("src/routes/__root.tsx")].join("\n");
  applyOverlay(d, { cmsUrl: "http://cms.test", homeSlug: "mu-home" });
  assert.equal([read("vite.config.ts"), read("src/server.ts"), read("src/routes/__root.tsx")].join("\n"), snapshot, "idempotent");
});

test("a moved anchor stops the build with the file named", () => {
  const d = cleanSite();
  fs.writeFileSync(path.join(d, "src/routes/__root.tsx"), "export const Route = {};\n");
  assert.throws(() => applyOverlay(d, {}), /anchor not found in __root\.tsx/);
});

test("a repo that already carries the instrumentation is left untouched", () => {
  const d = cleanSite();
  applyOverlay(d, { cmsUrl: "http://cms.test", homeSlug: "mu-home" });
  /* simulate the committed form: same content, no overlay marker */
  for (const f of ["vite.config.ts", "src/server.ts", "src/routes/__root.tsx"]) {
    const p = path.join(d, f); fs.writeFileSync(p, fs.readFileSync(p, "utf8").split("/* mu-cms overlay */").join(""));
  }
  fs.writeFileSync(path.join(d, "src/mu-cms-runtime.ts"), "// the repo's own copy\n");
  const before = ["vite.config.ts", "src/server.ts", "src/routes/__root.tsx", "src/mu-cms-runtime.ts"].map((f) => fs.readFileSync(path.join(d, f), "utf8")).join("\n");
  applyOverlay(d, { cmsUrl: "http://other.test", homeSlug: "mu-home" });
  const after = ["vite.config.ts", "src/server.ts", "src/routes/__root.tsx", "src/mu-cms-runtime.ts"].map((f) => fs.readFileSync(path.join(d, f), "utf8")).join("\n");
  assert.equal(after, before, "nothing rewritten, the repo's runtime not clobbered");
});

test("the runtime promises pageTyping: the site remounts on a loud applyLocal, so the editor may keep the caret on the page", () => {
  const d = cleanSite();
  applyOverlay(d, { cmsUrl: "http://cms.test", homeSlug: "mu-home" });
  const rt = fs.readFileSync(path.join(d, "src/mu-cms-runtime.ts"), "utf8");
  const block = rt.slice(rt.indexOf("__MU_RUNTIME__ = {"), rt.indexOf("};", rt.indexOf("__MU_RUNTIME__ = {")));
  assert.match(block, /pageTyping:\s*true/, "window.__MU_RUNTIME__ carries pageTyping: true");
  assert.match(block, /applyLocal:/, "next to applyLocal, which is what makes the promise true");
});
