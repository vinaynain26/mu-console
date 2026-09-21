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

test("a pull moves a picture the designer added in Lovable to UnionStack and commits the pointer back", async () => {
  const http = await import("node:http");
  const uploads = await import("../uploads.js");
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  const db = makeDb();
  /* Lovable's storage, in miniature */
  const hits = [];
  const srv = http.createServer((req, res) => { hits.push(req.url); res.writeHead(200, { "content-type": "image/png" }); res.end("PNG-NEW"); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const calls = [];
  const saved = { key: process.env.UNIONSTACK_API_KEY, host: process.env.LOVABLE_ASSETS_URL, mirror: process.env.ASSET_MIRROR };
  process.env.UNIONSTACK_API_KEY = "unionstack_test"; process.env.LOVABLE_ASSETS_URL = `http://127.0.0.1:${srv.address().port}`; delete process.env.ASSET_MIRROR;
  uploads._setClient({ upload: async (bytes, opts) => { calls.push(opts.filename); return { url: "https://files.unionstack.in/f/moved1", fileId: "moved1", filename: opts.filename, mimetype: opts.mimeType, size: bytes.length }; } });
  try {
    await pullNow(db, { reason: "test" });
    /* the designer adds a picture in Lovable: a new pointer, on Lovable's storage */
    const rel = "src/assets/new-photo.png.asset.json";
    fs.mkdirSync(path.join(remote.work, "src/assets"), { recursive: true });
    fs.writeFileSync(path.join(remote.work, rel), JSON.stringify({ url: "/__l5e/assets-v1/n1/new-photo.png", original_filename: "new-photo.png", size: 7 }, null, 2) + "\n");
    remote.git(["add", "-A"]); remote.git(["commit", "-qm", "Lovable adds a photo"]); remote.git(["push", "-q", "origin", "main"]);
    const out = await pullNow(db, { reason: "poll" });
    assert.equal(out.mirror.moved, 1, "one picture moved");
    assert.deepEqual(calls, ["new-photo.png"]); assert.deepEqual(hits, ["/__l5e/assets-v1/n1/new-photo.png"]);
    /* the repo now points at UnionStack, by a commit from MU Console */
    remote.git(["pull", "-q", "origin", "main"]);
    const j = JSON.parse(fs.readFileSync(path.join(remote.work, rel), "utf8"));
    assert.equal(j.url, "https://files.unionstack.in/f/moved1"); assert.equal(j.lovableUrl, "/__l5e/assets-v1/n1/new-photo.png");
    assert.match(remote.git(["log", "-1", "--format=%an %s"]), /MU Console assets: 1 picture to UnionStack/);
    assert.equal(getState(db).last_remote_sha, out.sha, "the CMS knows its own commit as the head, so the next poll does not re-pull it");
    /* the next pull: nothing pending, nothing fetched, nothing uploaded, no new commit */
    const again = await pullNow(db, { reason: "poll" });
    assert.equal(again.skipped, true);
    assert.equal(calls.length, 1); assert.equal(hits.length, 1);
  } finally {
    srv.close();
    if (saved.key == null) delete process.env.UNIONSTACK_API_KEY; else process.env.UNIONSTACK_API_KEY = saved.key;
    if (saved.host == null) delete process.env.LOVABLE_ASSETS_URL; else process.env.LOVABLE_ASSETS_URL = saved.host;
    if (saved.mirror != null) process.env.ASSET_MIRROR = saved.mirror;
    uploads._setClient(null);
  }
});
