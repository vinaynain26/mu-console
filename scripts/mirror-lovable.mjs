/**
 * Copy the Lovable repo into the personal repo, and make sure the preview
 * branch exists. Run once to set up; run again any time Lovable has changed.
 *
 *   node scripts/mirror-lovable.mjs            # every branch, then previewbranch from main
 *   node scripts/mirror-lovable.mjs --status   # just say where things stand
 *
 * Reads .env: LOVABLE_REPO, LOVABLE_TOKEN, PERSONAL_REPO, GITHUB_TOKEN,
 * and optionally PREVIEW_BRANCH / LIVE_BRANCH. The same code path the
 * console's "Sync from Lovable" button uses.
 */
import fs from "node:fs";
import path from "node:path";
import * as repo from "../repo.js";

const ROOT = path.resolve(import.meta.dirname, "..");
if (fs.existsSync(path.join(ROOT, ".env"))) process.loadEnvFile(path.join(ROOT, ".env"));

const d = repo.describe();
if (!d.ready) {
  console.error("Set PERSONAL_REPO and GITHUB_TOKEN in .env first.");
  process.exit(1);
}
console.log(`  personal  ${d.personal}`);
console.log(`  lovable   ${d.lovable || "(not set)"}`);
console.log(`  branches  ${d.preview} → ${d.live}`);

if (process.argv.includes("--status")) {
  console.log(await repo.status());
  process.exit(0);
}
if (!d.lovableReady) {
  console.error("Set LOVABLE_REPO and LOVABLE_TOKEN in .env to mirror from Lovable.");
  process.exit(1);
}

const t0 = Date.now();
const out = await repo.mirrorFromLovable();
console.log(`\n  pushed ${out.branches.length} branch(es) in ${((Date.now() - t0) / 1000).toFixed(1)}s:`);
for (const b of out.branches) console.log("   · " + b);
console.log(await repo.status());
