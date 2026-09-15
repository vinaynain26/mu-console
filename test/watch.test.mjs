import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeDb, makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import { pullNow, summary } from "../sync/watch.js";
import { getState, recentLog } from "../sync/store.js";

test("pull seeds, skips when unchanged, sees a designer commit, and force re-applies", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();

  const first = await pullNow(db, { reason: "test" });
  assert.equal(first.skipped, undefined);
  assert.deepEqual(first.report.map((r) => r.slug), ["lab-home", "lab-pricing"]);
  assert.ok(first.totals.added > 20);
  assert.equal(getState(db).last_remote_sha, first.sha);
  assert.equal(recentLog(db, 1)[0].direction, "pull");
  assert.equal(summary(db).conflicts, 0);

  const again = await pullNow(db, { reason: "poll" });
  assert.equal(again.skipped, true);
  assert.equal(again.sha, first.sha);

  const f = path.join(remote.work, "src/pages/Index.tsx");
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("Welcome to SecureFlow.", "Hello from Lovable."));
  remote.git(["commit", "-qam", "Lovable edit"]); remote.git(["push", "-q", "origin", "main"]);
  const third = await pullNow(db, { reason: "poll" });
  assert.notEqual(third.sha, first.sha);
  assert.equal(third.totals.added, 1); assert.equal(third.totals.retired, 1);
  assert.ok(db.prepare("SELECT 1 FROM page_content WHERE page_slug = 'lab-home' AND value = 'Hello from Lovable.' AND retired = 0").get());

  const forced = await pullNow(db, { reason: "manual", force: true });
  assert.equal(forced.skipped, undefined);
  assert.equal(forced.totals.added, 0);
});
