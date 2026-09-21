#!/usr/bin/env node
/**
 * Move every picture still on Lovable to UnionStack, now, in batches, until
 * nothing is pending. The same step the sync runs on each pull, without a
 * site rebuild per batch. Stop the CMS server first: two processes must not
 * work the same clone.
 *
 *   node scripts/mirror-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import * as repo from "../sync/repo.js";
import { ensureSchema, setState } from "../sync/store.js";
import { mirrorOn, mirrorStep } from "../sync/watch.js";

const ROOT = path.resolve(import.meta.dirname, "..");
if (fs.existsSync(path.join(ROOT, ".env"))) process.loadEnvFile(path.join(ROOT, ".env"));
if (!mirrorOn()) { console.log("Mirroring is off: set UNIONSTACK_API_KEY in .env (and not ASSET_MIRROR=0)."); process.exit(1); }
if (!repo.acquireLock()) { console.log("The CMS server owns the clone. Stop it first."); process.exit(1); }

const db = new DatabaseSync(path.join(ROOT, process.env.DB_PATH || "data/content.db"));
ensureSchema(db);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let totalMoved = 0, totalReused = 0;
try {
  for (let round = 1; ; round++) {
    const sha = await repo.serial(() => repo.resetToRemote());
    console.log(`\nround ${round}: clone at ${sha.slice(0, 7)}`);
    const m = await mirrorStep(db, repo.cfg().clone);
    totalMoved += m.moved; totalReused += m.reused;
    /* deliberately NOT recorded as pulled: the server must pull and build this commit when it starts */
    if (m.sha) setState(db, { last_push_sha: m.sha, last_push_at: new Date().toISOString() });
    console.log(`  moved ${m.moved} (${m.reused} reused), failed ${m.failed}, stopped ${m.stopped}${m.sha ? ", committed " + m.sha.slice(0, 7) : ""}`);
    if (!m.moved) break;                      // nothing moved this round: what is left is skipped or waiting on the host
    if (m.stopped) { console.log("  the host asked us to stop; waiting a minute"); await sleep(60e3); }
  }
  console.log(`\ndone: ${totalMoved} pictures moved to UnionStack (${totalReused} reused).`);
} finally { repo.releaseLock(); }
