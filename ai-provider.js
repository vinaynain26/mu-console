/**
 * Model provider, swappable.
 *
 * The writer needs one thing from a model: given a system prompt and a request,
 * return JSON of a known shape. Everything above this file is provider-agnostic,
 * so switching from a free experiment key to Claude later is an .env change,
 * not a rewrite.
 *
 * Two backends:
 *   anthropic         — the Claude SDK, with the voice guide in a cached prefix
 *   openai-compatible — anything speaking /v1/chat/completions: Groq, Gemini's
 *                       compatibility endpoint, OpenRouter, Cerebras, Together,
 *                       a local Ollama, or OpenAI itself
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/* Presets so a free key needs one line in .env, not three. */
const PRESETS = {
  groq:       { base: "https://api.groq.com/openai/v1",                    model: "llama-3.3-70b-versatile", env: "GROQ_API_KEY" },
  gemini:     { base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-flash-latest", env: "GEMINI_API_KEY" },
  openrouter: { base: "https://openrouter.ai/api/v1",                      model: "meta-llama/llama-3.3-70b-instruct:free", env: "OPENROUTER_API_KEY" },
  cerebras:   { base: "https://api.cerebras.ai/v1",                        model: "llama-3.3-70b",           env: "CEREBRAS_API_KEY" },
  mistral:    { base: "https://api.mistral.ai/v1",                         model: "mistral-large-latest",    env: "MISTRAL_API_KEY" },
  together:   { base: "https://api.together.xyz/v1",                       model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", env: "TOGETHER_API_KEY" },
  ollama:     { base: "http://localhost:11434/v1",                         model: "llama3.1",                env: null, key: "ollama" },
  openai:     { base: "https://api.openai.com/v1",                         model: "gpt-4o-mini",             env: "OPENAI_API_KEY" },
};

function settings() {
  const name = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  if (name === "anthropic") {
    return {
      kind: "anthropic",
      name: "anthropic",
      model: process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || "claude-opus-5",
      key: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || null,
    };
  }
  const p = PRESETS[name];
  if (!p) return { kind: "unknown", name, model: null, key: null };
  return {
    kind: "openai-compatible",
    name,
    base: process.env.AI_BASE_URL || p.base,
    model: process.env.AI_MODEL || p.model,
    key: process.env.AI_API_KEY || (p.env ? process.env[p.env] : null) || p.key || null,
  };
}

export function describe() {
  const s = settings();
  return { provider: s.name, model: s.model, ready: Boolean(s.key), kind: s.kind };
}
export const configured = () => Boolean(settings().key);

let anthropicClient = null, oaiClient = null;

function unconfigured(s) {
  const e = new Error(
    s.kind === "unknown"
      ? `Unknown AI_PROVIDER "${s.name}". Options: anthropic, ${Object.keys(PRESETS).join(", ")}.`
      : `The AI writer is not switched on. Add a key for "${s.name}" to .env and restart.`
  );
  e.code = "unconfigured";
  return e;
}

/**
 * @param system  the stable, cacheable half of the prompt
 * @param user    the varying request
 * @param schema  a zod object describing the JSON we want back
 */
export async function generate({ system, user, schema, effort = "medium" }) {
  const s = settings();
  if (!s.key) throw unconfigured(s);

  if (s.kind === "anthropic") {
    if (!anthropicClient) anthropicClient = new Anthropic();
    const res = await anthropicClient.messages.parse({
      model: s.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort, format: zodOutputFormat(schema) },
      // the guide is large and unchanging — give it its own cache breakpoint
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") {
      const e = new Error("The model declined this request.");
      e.code = "refusal"; throw e;
    }
    if (!res.parsed_output) {
      const e = new Error("The model's reply did not match the expected shape.");
      e.code = "unparsed"; throw e;
    }
    return { out: res.parsed_output, usage: res.usage, provider: s.name, model: s.model };
  }

  /* OpenAI-compatible. Strict json_schema support varies a lot between these
     hosts, so ask for a JSON object and validate with the same zod schema —
     that works everywhere from Groq to a local Ollama. */
  if (!oaiClient) oaiClient = new OpenAI({ apiKey: s.key, baseURL: s.base });

  const shape = JSON.stringify(shapeHint(schema), null, 2);
  const sys = system + "\n\nReply with a single JSON object and nothing else. Shape:\n" + shape;

  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await oaiClient.chat.completions.create({
      model: s.model,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: attempt === 0 ? user : user + "\n\nYour last reply was not valid JSON of that shape. Return only the JSON object." },
      ],
    });
    const text = res.choices?.[0]?.message?.content || "";
    try {
      const parsed = schema.parse(JSON.parse(stripFence(text)));
      return { out: parsed, usage: res.usage, provider: s.name, model: s.model };
    } catch (e) { last = e; }
  }
  const e = new Error("The model did not return usable JSON after two tries. " + (last?.message || ""));
  e.code = "unparsed";
  throw e;
}

/** Some hosts wrap JSON in a markdown fence despite being asked not to. */
function stripFence(t) {
  const m = String(t).trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : String(t).trim();
}

/** A compact example of the wanted JSON, built from the zod schema's describes. */
function shapeHint(schema) {
  const walk = (def) => {
    if (def instanceof z.ZodObject) {
      const o = {};
      for (const [k, v] of Object.entries(def.shape)) o[k] = walk(v);
      return o;
    }
    if (def instanceof z.ZodArray) return [walk(def.element)];
    const d = def.description;
    if (def instanceof z.ZodNumber) return d || 0;
    return d || "string";
  };
  return walk(schema);
}

/** Turns any provider's error into something an editor can act on. */
export function explain(err) {
  if (err?.code === "unconfigured") return { status: 503, error: err.message };
  if (err?.code === "refusal") return { status: 422, error: err.message };
  if (err?.code === "unparsed") return { status: 502, error: err.message };

  if (err instanceof Anthropic.AuthenticationError || err?.status === 401) {
    return { status: 401, error: "The API key is missing or invalid. Check .env and restart." };
  }
  if (err instanceof Anthropic.RateLimitError || err?.status === 429) {
    return { status: 429, error: "The model provider is rate limiting us. Wait a moment and try again." };
  }
  if (err?.status === 404) {
    return { status: 404, error: "That model name is not available on this provider. Set AI_MODEL in .env." };
  }
  if (err instanceof Anthropic.APIConnectionError || err?.code === "ECONNREFUSED") {
    return { status: 503, error: "Could not reach the model provider. Check the network or AI_BASE_URL." };
  }
  return { status: err?.status || 500, error: err?.message || "Unknown error from the AI writer." };
}
