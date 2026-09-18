/* A picture chosen in the editor goes browser -> CMS -> UnionStack, and the
   CDN link comes back to fill the field. The module owns the rules (what is
   accepted, how big) and the words an editor sees when it fails. */
import { test } from "node:test";
import assert from "node:assert/strict";

async function fresh() {
  const m = await import("../uploads.js?" + Math.random());
  return m;
}
const png = Buffer.from("89504e470d0a1a0a", "hex");

test("not configured without a key, with a message that says what to set", async () => {
  const u = await fresh();
  const saved = process.env.UNIONSTACK_API_KEY; delete process.env.UNIONSTACK_API_KEY;
  try {
    assert.equal(u.configured(), false);
    const err = await u.upload({ bytes: png, filename: "a.png", mimeType: "image/png" }).then(() => null, (e) => e);
    assert.match(u.explain(err).error, /UNIONSTACK_API_KEY/);
    assert.equal(u.explain(err).status, 503);
  } finally { if (saved != null) process.env.UNIONSTACK_API_KEY = saved; }
});

test("uploads through the client and returns the CDN link and file facts", async () => {
  const u = await fresh();
  process.env.UNIONSTACK_API_KEY = "unionstack_test";
  const calls = [];
  u._setClient({ upload: async (bytes, opts) => { calls.push({ bytes, opts }); return { url: "https://files.unionstack.in/f/abc123", fileId: "abc123", filename: opts.filename, mimetype: opts.mimeType, size: bytes.length, status: "Stored" }; } });
  const out = await u.upload({ bytes: png, filename: "Hero Photo.png", mimeType: "image/png" });
  assert.deepEqual(out, { url: "https://files.unionstack.in/f/abc123", fileId: "abc123", filename: "Hero Photo.png", mimeType: "image/png", size: png.length });
  assert.equal(calls.length, 1); assert.equal(calls[0].opts.filename, "Hero Photo.png"); assert.equal(calls[0].opts.mimeType, "image/png");
});

test("only pictures and web video are accepted, and nothing empty or huge", async () => {
  const u = await fresh();
  process.env.UNIONSTACK_API_KEY = "unionstack_test";
  let called = 0; u._setClient({ upload: async () => { called++; return { url: "x" }; } });
  for (const [mimeType, bytes, why] of [["application/pdf", png, /image or a video/i], ["image/png", Buffer.alloc(0), /empty/i], ["image/png", Buffer.alloc(60 * 1024 * 1024), /50 ?MB/i]]) {
    const err = await u.upload({ bytes, filename: "f", mimeType }).then(() => null, (e) => e);
    assert.ok(err, "rejected: " + mimeType);
    assert.match(u.explain(err).error, why);
    assert.ok(u.explain(err).status >= 400 && u.explain(err).status < 500);
  }
  assert.equal(called, 0, "never reached the client");
  const ok = await u.upload({ bytes: png, filename: "clip.mp4", mimeType: "video/mp4" });
  assert.equal(ok.url, "x");
});

test("the SDK's error codes become one plain sentence each", async () => {
  const u = await fresh();
  process.env.UNIONSTACK_API_KEY = "unionstack_test";
  const fail = (code) => { const e = new Error("sdk said " + code); e.code = code; return e; };
  for (const [code, status, why] of [["AUTH", 503, /key/i], ["QUOTA", 507, /limit|quota/i], ["VALIDATION", 415, /rejected/i], ["NETWORK", 502, /reach/i], ["SERVER", 502, /UnionStack/]]) {
    u._setClient({ upload: async () => { throw fail(code); } });
    const err = await u.upload({ bytes: png, filename: "a.png", mimeType: "image/png" }).then(() => null, (e) => e);
    const x = u.explain(err);
    assert.equal(x.status, status, code); assert.match(x.error, why, code); assert.doesNotMatch(x.error, /sdk said/, "not the raw message");
  }
});
