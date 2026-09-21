/* Pictures the super-admin adds in Lovable land on Lovable's storage. The
   mirror moves each one to UnionStack ONCE and rewrites its pointer, so the
   repo itself records what has moved: a pull with nothing new reads a few
   JSON files and touches no network. Same bytes never upload twice. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { tmpDir, makeDb } from "./helpers.mjs";
import { pendingPointers, mirrorAssets } from "../sync/mirror.js";

function cloneWith(pointers) {
  const d = tmpDir("mirror");
  for (const [rel, j] of Object.entries(pointers)) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), JSON.stringify(j, null, 2) + "\n"); }
  return d;
}
function lovable(files) {
  const hits = [];
  const srv = http.createServer((req, res) => { hits.push(req.url); if (files[req.url]) { res.writeHead(200, { "content-type": "image/png" }); return res.end(files[req.url]); } res.writeHead(404); res.end(); });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ base: `http://127.0.0.1:${srv.address().port}`, hits, close: () => srv.close() })));
}
const fakeUploader = () => { const calls = []; let n = 0; return { calls, upload: async ({ bytes, filename }) => { calls.push(filename); n++; return { url: "https://files.unionstack.in/f/id" + n, fileId: "id" + n, filename, mimeType: "image/png", size: bytes.length }; } }; };

test("only pointers still on Lovable are pending; moved ones cost nothing", () => {
  const d = cloneWith({
    "src/assets/a.png.asset.json": { url: "/__l5e/assets-v1/aaa/a.png", original_filename: "a.png" },
    "src/assets/b.png.asset.json": { url: "https://files.unionstack.in/f/already", lovableUrl: "/__l5e/assets-v1/bbb/b.png" },
    "src/assets/c.png.asset.json": { url: "/__l5e/assets-v1/ccc/c.png" },
  });
  assert.deepEqual(pendingPointers(d).map((p) => p.rel).sort(), ["src/assets/a.png.asset.json", "src/assets/c.png.asset.json"]);
});

test("a pending picture is fetched once, uploaded once, and its pointer rewritten with the old path kept", async () => {
  const d = cloneWith({ "src/assets/a.png.asset.json": { url: "/__l5e/assets-v1/aaa/a.png", original_filename: "Campus A.png", size: 5 } });
  const lv = await lovable({ "/__l5e/assets-v1/aaa/a.png": "PNG-A" });
  const up = fakeUploader(); const db = makeDb();
  try {
    const r = await mirrorAssets(d, { from: lv.base, uploader: up, db });
    assert.deepEqual(r.moved, ["src/assets/a.png.asset.json"]); assert.deepEqual(r.failed, []); assert.equal(r.reused, 0);
    const j = JSON.parse(fs.readFileSync(path.join(d, "src/assets/a.png.asset.json"), "utf8"));
    assert.equal(j.url, "https://files.unionstack.in/f/id1"); assert.equal(j.lovableUrl, "/__l5e/assets-v1/aaa/a.png"); assert.equal(j.original_filename, "Campus A.png");
    assert.deepEqual(up.calls, ["Campus A.png"]);
    assert.deepEqual(lv.hits, ["/__l5e/assets-v1/aaa/a.png"]);
    /* the second pull: nothing pending, nothing fetched, nothing uploaded */
    const r2 = await mirrorAssets(d, { from: lv.base, uploader: up, db });
    assert.deepEqual([r2.moved.length, r2.failed.length, up.calls.length, lv.hits.length], [0, 0, 1, 1]);
  } finally { lv.close(); }
});

test("the same bytes under a new Lovable id reuse the UnionStack file, no upload", async () => {
  const d = cloneWith({
    "src/assets/a.png.asset.json": { url: "/__l5e/assets-v1/aaa/a.png" },
    "src/components/deep/a-again.png.asset.json": { url: "/__l5e/assets-v1/zzz/a-again.png" },
  });
  const lv = await lovable({ "/__l5e/assets-v1/aaa/a.png": "PNG-A", "/__l5e/assets-v1/zzz/a-again.png": "PNG-A" });
  const up = fakeUploader(); const db = makeDb();
  try {
    const r = await mirrorAssets(d, { from: lv.base, uploader: up, db });
    assert.equal(r.moved.length, 2); assert.equal(r.reused, 1); assert.equal(up.calls.length, 1, "one upload for two identical pictures");
    const a = JSON.parse(fs.readFileSync(path.join(d, "src/assets/a.png.asset.json"), "utf8")).url;
    const b = JSON.parse(fs.readFileSync(path.join(d, "src/components/deep/a-again.png.asset.json"), "utf8")).url;
    assert.equal(a, b);
  } finally { lv.close(); }
});

test("a file Lovable cannot serve, or a quota stop, leaves that pointer for next time and moves the rest", async () => {
  const d = cloneWith({
    "src/assets/gone.png.asset.json": { url: "/__l5e/assets-v1/ggg/gone.png" },
    "src/assets/ok.png.asset.json": { url: "/__l5e/assets-v1/ooo/ok.png" },
    "src/assets/zz-quota.png.asset.json": { url: "/__l5e/assets-v1/bbb/zz-quota.png" },   // sorts last: the stop comes after the others
  });
  const lv = await lovable({ "/__l5e/assets-v1/ooo/ok.png": "PNG-OK", "/__l5e/assets-v1/bbb/zz-quota.png": "PNG-BIG" });
  const db = makeDb();
  const up = { calls: [], upload: async ({ bytes, filename }) => { up.calls.push(filename); if (String(bytes) === "PNG-BIG") { const e = new Error("quota"); e.code = "QUOTA"; throw e; } return { url: "https://files.unionstack.in/f/ok", fileId: "ok", filename, mimeType: "image/png", size: bytes.length }; } };
  try {
    const r = await mirrorAssets(d, { from: lv.base, uploader: up, db, concurrency: 1, pace: 0 });
    assert.deepEqual(r.moved, ["src/assets/ok.png.asset.json"]);
    assert.deepEqual(r.failed.map((f) => f.rel), ["src/assets/zz-quota.png.asset.json"]);
    assert.ok(r.skipped.find((f) => f.rel.endsWith("gone.png.asset.json")).reason.includes("404"), "a file Lovable itself has lost is remembered, not retried every pull");
    assert.equal(JSON.parse(fs.readFileSync(path.join(d, "src/assets/gone.png.asset.json"), "utf8")).url, "/__l5e/assets-v1/ggg/gone.png", "untouched");
    assert.ok(r.stopped, "a quota error stops the run instead of failing every remaining file the same way");
  } finally { lv.close(); }
});

test("a rate limit pauses the run and retries the same picture; it moves once the host relents", async () => {
  const d = cloneWith({ "src/assets/a.png.asset.json": { url: "/__l5e/assets-v1/aaa/a.png" }, "src/assets/b.png.asset.json": { url: "/__l5e/assets-v1/bbb/b.png" } });
  const lv = await lovable({ "/__l5e/assets-v1/aaa/a.png": "PNG-A", "/__l5e/assets-v1/bbb/b.png": "PNG-B" });
  const db = makeDb(); let n = 0; const calls = [];
  const up = { upload: async ({ filename }) => { calls.push(filename); if (calls.length <= 2) { const e = new Error("API key rate limit exceeded. Slow down and retry."); e.code = "NETWORK"; e.status = 429; throw e; } n++; return { url: "https://files.unionstack.in/f/r" + n, fileId: "r" + n, filename, size: 5 }; } };
  try {
    const t0 = Date.now();
    const r = await mirrorAssets(d, { from: lv.base, uploader: up, db, concurrency: 2, backoffMs: 30 });
    assert.equal(r.moved.length, 2, "both moved in the end"); assert.deepEqual(r.failed, []); assert.equal(r.stopped, false);
    assert.ok(calls.length >= 4, "the limited attempts were retried: " + calls.length);
    assert.ok(Date.now() - t0 >= 30, "it waited before retrying");
  } finally { lv.close(); }
});

test("a picture over the key's size cap is remembered and never fetched or tried again", async () => {
  const d = cloneWith({ "src/assets/film.mp4.asset.json": { url: "/__l5e/assets-v1/fff/film.mp4", size: 231686883 }, "src/assets/a.png.asset.json": { url: "/__l5e/assets-v1/aaa/a.png" } });
  const lv = await lovable({ "/__l5e/assets-v1/fff/film.mp4": "MP4", "/__l5e/assets-v1/aaa/a.png": "PNG-A" });
  const db = makeDb(); const calls = [];
  const up = { upload: async ({ filename, bytes }) => { calls.push(filename); if (filename.endsWith(".mp4")) { const e = new Error("File size 231686883 exceeds this key's maximum 104857600."); e.code = "VALIDATION"; e.status = 413; throw e; } return { url: "https://files.unionstack.in/f/a", fileId: "a", filename, size: bytes.length }; } };
  try {
    const r1 = await mirrorAssets(d, { from: lv.base, uploader: up, db });
    assert.deepEqual(r1.moved, ["src/assets/a.png.asset.json"]);
    assert.equal(r1.skipped.length, 1); assert.match(r1.skipped[0].reason, /maximum/);
    assert.equal(r1.failed.length, 0, "a known impossibility is not a failure to report every pull");
    const fetched = lv.hits.length;
    const r2 = await mirrorAssets(d, { from: lv.base, uploader: up, db });
    assert.deepEqual([r2.moved.length, r2.skipped.length, r2.failed.length], [0, 1, 0]);
    assert.equal(lv.hits.length, fetched, "the film was not fetched again");
    assert.equal(calls.filter((c) => c.endsWith(".mp4")).length, 1, "and not tried again");
  } finally { lv.close(); }
});
