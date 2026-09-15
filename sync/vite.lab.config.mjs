/**
 * The Vite config the lab build runs with, instead of the repo's own. It
 * reproduces what Lovable's config does (React via SWC, the @ alias) and adds
 * the instrumentation plugin. Run from the clone as cwd; the plugins come
 * from the clone's node_modules so the app builds with its own versions.
 */
import path from "node:path";
import { createRequire } from "node:module";
import muLab from "./vite-plugin.mjs";

export default async () => {
  const root = process.cwd();
  const req = createRequire(path.join(root, "package.json"));
  const reactMod = req("@vitejs/plugin-react-swc");
  const react = reactMod.default || reactMod;
  return {
    root,
    base: process.env.MU_LAB_BASE || "/lab-build/",
    plugins: [
      muLab({ root, prefix: process.env.SYNC_SLUG_PREFIX || "lab", homeSlug: "home" }),
      react(),
    ],
    resolve: { alias: { "@": path.join(root, "src") } },
    build: { outDir: process.env.MU_LAB_OUT, emptyOutDir: true, sourcemap: false },
    logLevel: "warn",
  };
};
