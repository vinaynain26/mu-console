/* A poll that fails must SAY so. The symptom that cost hours was a sync that
   stopped with nothing in the panel to explain it. */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { makeDb, makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import { pullNow } from "../sync/watch.js";
import { getState, recentLog } from "../sync/store.js";
import { acquireLock, releaseLock, lockHolder } from "../sync/repo.js";

test("an unreachable remote is recorded, not swallowed", async () => {
  const db = makeDb();
  useRemote(path.join(tmpDir("gone"), "does-not-exist.git"), path.join(tmpDir("sync-clone"), "repo"));
  await assert.rejects(() => pullNow(db, { reason: "poll" }));
  const st = getState(db);
  assert.ok(st.last_error, "last_error must be set so the Sync panel can show it");
  assert.match(st.last_error, /Could not reach/i);
  assert.equal(recentLog(db, 1)[0].direction, "error", "the first failure is logged once");
});

test("repeated failures record the error but do not flood the log", async () => {
  const db = makeDb();
  useRemote(path.join(tmpDir("gone"), "does-not-exist.git"), path.join(tmpDir("sync-clone"), "repo"));
  for (let i = 0; i < 4; i++) await pullNow(db, { reason: "poll" }).catch(() => {});
  assert.equal(recentLog(db, 20).filter((l) => l.direction === "error").length, 1, "one entry, not four");
  assert.ok(getState(db).last_error);
});

test("recovery clears the error", async () => {
  const db = makeDb();
  const bad = path.join(tmpDir("gone"), "does-not-exist.git");
  const clone = path.join(tmpDir("sync-clone"), "repo");
  useRemote(bad, clone);
  await pullNow(db, { reason: "poll" }).catch(() => {});
  assert.ok(getState(db).last_error);
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, clone);
  const ok = await pullNow(db, { reason: "poll" });
  assert.ok(ok.sha);
  assert.equal(getState(db).last_error, null, "a good pull clears the error");
});

test("a second server cannot sync against a clone another one holds", () => {
  const dir = tmpDir("sync-lock");
  process.env.SYNC_CLONE_DIR = path.join(dir, "repo");
  assert.equal(acquireLock(), true, "first caller takes it");
  assert.equal(acquireLock(), true, "the same process re-taking it is fine");
  assert.equal(lockHolder().pid, process.pid);
  releaseLock();
  assert.equal(lockHolder(), null, "released");
});
