import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDb } from "./helpers.mjs";
import { getState, setState, logEvent, recentLog, addConflict, openConflicts, resolveConflict } from "../sync/store.js";

test("schema adds pages columns and a single state row", () => {
  const db = makeDb();
  const cols = db.prepare("PRAGMA table_info(pages)").all().map((c) => c.name);
  for (const c of ["repo", "branch", "ingested_sha"]) assert.ok(cols.includes(c), c);
  assert.equal(getState(db).id, 1);
  assert.equal(getState(db).last_remote_sha, null);
});

test("state patch, log and conflicts round-trip", () => {
  const db = makeDb();
  setState(db, { last_remote_sha: "abc", last_error: null });
  assert.equal(getState(db).last_remote_sha, "abc");
  logEvent(db, { direction: "pull", sha: "abc", summary: "2 added", actor: "poll" });
  assert.equal(recentLog(db, 5)[0].summary, "2 added");
  const id = addConflict(db, { page_slug: "lab-home", file: "src/x.tsx", old_key: "x.tsx.11111111", new_key: "x.tsx.22222222",
    label: "Headline", original: "Old", theirs: "Theirs", mine: "Mine" });
  assert.equal(openConflicts(db).length, 1);
  resolveConflict(db, id, "keep-theirs");
  assert.equal(openConflicts(db).length, 0);
  assert.equal(db.prepare("SELECT resolution FROM sync_conflicts WHERE id = ?").get(id).resolution, "keep-theirs");
});
