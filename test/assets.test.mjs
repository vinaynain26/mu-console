/* The repo ships .asset.json pointers, not pictures: every one names a path
   under /__l5e/ that only Lovable serves. Before a build, the missing files
   are fetched into public/ at the path the pointers already use. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { tmpDir } from "./helpers.mjs";
import { assetPointers, provisionAssets } from "../sync/assets.js";

function cloneWithPointers() {
  const d = tmpDir("assets");
  const put = (rel, url, size) => { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), JSON.stringify({ url, size, original_filename: path.basename(url) })); };
  put("src/assets/a.png.asset.json", "/__l5e/assets-v1/aaaa/a.png", 5);
  put("src/components/deep/b.jpg.asset.json", "/__l5e/assets-v1/bbbb/b.jpg", 7);
  put("src/assets/a-again.png.asset.json", "/__l5e/assets-v1/aaaa/a.png", 5);   // two pointers, one file
  fs.writeFileSync(path.join(d, "src/assets/broken.asset.json"), "{not json");
  return d;
}

/** Lovable, in miniature: serves a.png, has never heard of b.jpg. Counts hits. */
function lovable() {
  const hits = [];
  const srv = http.createServer((req, res) => {
    hits.push(req.url);
    if (req.url === "/__l5e/assets-v1/aaaa/a.png") { res.writeHead(200, { "content-type": "image/png" }); return res.end("PNG-A"); }
    res.writeHead(404); res.end("nope");
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ base: `http://127.0.0.1:${srv.address().port}`, hits, close: () => srv.close() })));
}

test("pointers are read from anywhere under src, once per url, skipping malformed ones", () => {
  const d = cloneWithPointers();
  const p = assetPointers(d);
  assert.deepEqual(p.map((x) => x.url).sort(), ["/__l5e/assets-v1/aaaa/a.png", "/__l5e/assets-v1/bbbb/b.jpg"]);
});

test("missing files are fetched into public/ at the pointer's path; present ones are left alone; a 404 is reported, not thrown", async () => {
  const d = cloneWithPointers();
  const lv = await lovable();
  try {
    const r1 = await provisionAssets(d, { from: lv.base });
    assert.equal(fs.readFileSync(path.join(d, "public/__l5e/assets-v1/aaaa/a.png"), "utf8"), "PNG-A");
    assert.deepEqual([r1.fetched, r1.present], [1, 0]);
    assert.deepEqual(r1.failed.map((f) => f.url), ["/__l5e/assets-v1/bbbb/b.jpg"]);
    assert.match(r1.failed[0].error, /404/);

    const before = lv.hits.length;
    const r2 = await provisionAssets(d, { from: lv.base });
    assert.deepEqual([r2.fetched, r2.present], [0, 1], "a second run fetches nothing that is already there");
    assert.ok(!lv.hits.slice(before).includes("/__l5e/assets-v1/aaaa/a.png"), "and does not even ask for it");
  } finally { lv.close(); }
});

test("an unreachable host fails every pointer and still resolves", async () => {
  const d = cloneWithPointers();
  const r = await provisionAssets(d, { from: "http://127.0.0.1:9" });
  assert.equal(r.fetched, 0); assert.equal(r.failed.length, 2);
});

test("a pointer that already names an absolute URL is not fetched: it lives on the CDN now", async () => {
  const d = tmpDir("assets");
  fs.mkdirSync(path.join(d, "src/assets"), { recursive: true });
  fs.writeFileSync(path.join(d, "src/assets/moved.png.asset.json"), JSON.stringify({ url: "https://files.unionstack.in/f/abc", lovableUrl: "/__l5e/assets-v1/aaaa/moved.png" }));
  assert.equal(assetPointers(d).length, 0, "nothing to provision");
  const r = await provisionAssets(d, { from: "http://127.0.0.1:9" });
  assert.deepEqual([r.fetched, r.present, r.failed.length], [0, 0, 0]);
});

test("urls given as already-failed are not asked for again, so one bad file cannot block every later build", async () => {
  const d = tmpDir("assets");
  const put = (rel, url) => { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), JSON.stringify({ url })); };
  put("src/assets/ok.png.asset.json", "/__l5e/assets-v1/aaaa/ok.png");
  put("src/assets/slow.mp4.asset.json", "/__l5e/assets-v1/bbbb/slow.mp4");
  const hits = [];
  const srv = http.createServer((req, res) => { hits.push(req.url); res.writeHead(200, { "content-type": "image/png" }); res.end("BYTES"); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const r = await provisionAssets(d, { from: base, skip: new Set(["/__l5e/assets-v1/bbbb/slow.mp4"]) });
    assert.deepEqual([r.fetched, r.skipped], [1, 1]);
    assert.deepEqual(hits, ["/__l5e/assets-v1/aaaa/ok.png"], "the skipped one was never requested");
  } finally { srv.close(); }
});
