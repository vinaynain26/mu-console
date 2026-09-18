/* When the model behind the writer is overloaded, the writer steps to the
   next model on the same provider rather than showing the editor Google's
   raw JSON. Exercised against a local OpenAI-compatible stub. */
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { z } from "zod";

const OVERLOADED = JSON.stringify([{ error: { code: 503, message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.", status: "UNAVAILABLE" } }]);

/** A provider where some models are overloaded and one answers. */
function stub(answering) {
  const calls = [];
  const srv = http.createServer((req, res) => {
    let body = ""; req.on("data", (d) => body += d); req.on("end", () => {
      const j = JSON.parse(body); calls.push(j.model);
      if (!answering.has(j.model)) { res.writeHead(503, { "content-type": "application/json" }); return res.end(OVERLOADED); }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ text: "Rewritten by " + j.model }) } }], usage: { total_tokens: 12 } }));
    });
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ base: `http://127.0.0.1:${srv.address().port}`, calls, close: () => srv.close() })));
}

async function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) { saved[k] = process.env[k]; if (v == null) delete process.env[k]; else process.env[k] = v; }
  try { return await fn(); }
  finally { for (const [k, v] of Object.entries(saved)) { if (v == null) delete process.env[k]; else process.env[k] = v; } }
}

const schema = z.object({ text: z.string() });

test("an overloaded primary model falls through to the next fallback, in order", async () => {
  const s = await stub(new Set(["model-c"]));
  try {
    const { generate, _resetClients } = await import("../ai-provider.js");
    _resetClients();
    const r = await withEnv({ AI_PROVIDER: "gemini", AI_BASE_URL: s.base, GEMINI_API_KEY: "test", AI_MODEL: "model-a",
      AI_FALLBACK_MODELS: "model-b, model-c", AI_MAX_RETRIES: "0" },
      () => generate({ system: "sys", user: "hello", schema }));
    assert.equal(r.out.text, "Rewritten by model-c");
    assert.equal(r.model, "model-c", "the reply says which model actually answered");
    assert.deepEqual(s.calls, ["model-a", "model-b", "model-c"]);
  } finally { s.close(); }
});

test("when every model is overloaded the editor gets one plain sentence, not the provider's JSON", async () => {
  const s = await stub(new Set());
  try {
    const { generate, explain, _resetClients } = await import("../ai-provider.js");
    _resetClients();
    const err = await withEnv({ AI_PROVIDER: "gemini", AI_BASE_URL: s.base, GEMINI_API_KEY: "test", AI_MODEL: "model-a",
      AI_FALLBACK_MODELS: "model-b", AI_MAX_RETRIES: "0" },
      () => generate({ system: "sys", user: "hello", schema })).then(() => null, (e) => e);
    assert.ok(err, "it fails");
    assert.deepEqual(s.calls, ["model-a", "model-b"]);
    const x = explain(err);
    assert.equal(x.status, 503);
    assert.match(x.error, /overloaded|busy/i);
    assert.doesNotMatch(x.error, /UNAVAILABLE|\{/, "no raw provider JSON");
  } finally { s.close(); }
});

test("gemini has sensible built-in fallbacks when none are configured", async () => {
  const { fallbackModels } = await import("../ai-provider.js");
  const list = await withEnv({ AI_PROVIDER: "gemini", AI_FALLBACK_MODELS: null, AI_MODEL: "gemini-3.5-flash" }, () => fallbackModels());
  assert.ok(list.length >= 2 && list.every((m) => /^gemini-/.test(m)) && !list.includes("gemini-3.5-flash"), JSON.stringify(list));
});
