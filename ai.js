/**
 * The AI writer.
 *
 * The point of this file is NOT "call an LLM". It is that the model writes with
 * everything this CMS already knows and a generic chat box does not:
 *
 *   - data/voice-guide.md — how this institution writes, measured from published
 *     copy rather than asserted. Form, never facts.
 *   - the character ceiling for the element being edited, because copy here is
 *     written to a slot and overflowing it breaks the layout.
 *   - the field's neighbours, so a rewritten heading still agrees with its
 *     own subheading.
 *
 * The voice guide is a large, unchanging prefix in front of a small, varying
 * question — exactly the shape prompt caching is for, so it carries a cache
 * breakpoint. Cached input reads at roughly a tenth of the normal rate, which
 * matters when editors fire many small requests at it.
 *
 * Nothing here writes to `value`. Every result lands in `draft_value` and goes
 * through the same publish gate as a human edit.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { generate, configured as providerReady, describe, explain as providerExplain } from "./ai-provider.js";

const ROOT = import.meta.dirname;

export const configured = providerReady;
export { describe };

/* ------------------------------------------------------------------ *
 * the stable, cached half of the prompt
 * ------------------------------------------------------------------ */
let voiceCache = null;
function voiceGuide() {
  if (voiceCache) return voiceCache;
  const p = path.join(ROOT, "data/voice-guide.md");
  voiceCache = fs.existsSync(p)
    ? fs.readFileSync(p, "utf8")
    : "# House voice\n\nNo guide generated yet. Run: node scripts/extract-voice.mjs";
  return voiceCache;
}
/** Call after regenerating the guide so the next request picks it up. */
export const reloadVoice = () => { voiceCache = null; };

const SYSTEM_TAIL = `
You are the copy assistant inside a content management system for Masters' Union
programme pages. You rewrite and draft copy for individual fields.

Absolute rules:
- Obey the character ceiling you are given. It is a layout constraint, not a
  style preference. Going over it breaks the page.
- Never invent a fact. No statistic, price, date, city, company, partner or
  person may appear in your output unless it was already in the field you were
  given or in the editor's instruction. If a draft needs a fact you do not have,
  write [TK] where it belongs.
- Match the register of the field. A fragment stays a fragment with no full
  stop; a sentence stays a sentence.
- Preserve proper nouns, numbers and currency exactly unless told to change them.
- Return only the copy. No markdown, no surrounding quotes, no commentary.
`;

/** system is an array so the big guide can carry its own cache breakpoint. */
function systemBlocks() {
  return [
    { type: "text", text: voiceGuide() + SYSTEM_TAIL, cache_control: { type: "ephemeral" } },
  ];
}

/* ------------------------------------------------------------------ *
 * per-request context
 * ------------------------------------------------------------------ */
function fieldBrief({ key, tag, value, label, section_title, tab_title, ceiling, siblings }) {
  const lines = [
    `Field key: ${key}`,
    `Element: <${tag}>`,
    `Section: ${section_title}`,
    `Appears on tab: ${tab_title}`,
    ceiling ? `Character ceiling: ${ceiling} (current text is ${value.length})` : null,
    label && label !== value ? `Editor label: ${label}` : null,
    "",
    "Current text:",
    value,
  ].filter(Boolean);

  if (siblings?.length) {
    lines.push("", "Neighbouring copy in the same section (for consistency — do not rewrite these):");
    for (const s of siblings.slice(0, 8)) lines.push(`- <${s.tag}> ${s.value}`);
  }
  return lines.join("\n");
}

const TextOut = z.object({
  text: z.string().describe("The rewritten copy. Plain text only."),
  note: z.string().describe("One short line on what changed, for the editor. Empty string if obvious."),
});
const VariantsOut = z.object({
  options: z.array(z.object({
    text: z.string().describe("A candidate rewrite, plain text."),
    angle: z.string().describe("Two or three words naming the angle taken."),
  })).describe("Distinct candidates, meaningfully different from each other."),
});
const BulkOut = z.object({
  items: z.array(z.object({
    key: z.string().describe("The field key, copied exactly from the input."),
    text: z.string().describe("The rewritten copy for that field."),
  })),
});

async function parse(schema, userText, effort = "medium") {
  const { out, usage, provider, model } = await generate({
    system: voiceGuide() + SYSTEM_TAIL,
    user: userText,
    schema,
    effort,
  });
  return { out, usage, provider, model };
}

/* ------------------------------------------------------------------ *
 * operations
 * ------------------------------------------------------------------ */
export async function rewrite(field, instruction) {
  const ask = instruction?.trim() || "Tighten this without changing its meaning.";
  return parse(TextOut,
    `${fieldBrief(field)}\n\nEditor's instruction:\n${ask}\n\nRewrite this one field.`);
}

export async function variants(field, instruction, n = 3) {
  const ask = instruction?.trim() || "Offer genuinely different ways to say this.";
  return parse(VariantsOut,
    `${fieldBrief(field)}\n\nEditor's instruction:\n${ask}\n\n` +
    `Give exactly ${n} candidates. Each must respect the ceiling and take a different angle.`);
}

/** One coherent pass over a whole section — the thing a chat box cannot do. */
export async function sectionPass(fields, instruction, sectionTitle) {
  const list = fields.map((f) =>
    `- key: ${f.key}\n  element: <${f.tag}>  ceiling: ${f.ceiling}\n  current: ${f.value}`
  ).join("\n");
  return parse(BulkOut,
    `Section: ${sectionTitle}\n\nEvery field in this section:\n${list}\n\n` +
    `Editor's instruction:\n${instruction}\n\n` +
    `Rewrite these as one coherent block of copy — they appear together, so they must ` +
    `agree in tense, person and rhythm. Return every key you were given, unchanged keys included.`,
    "high");
}

export const explain = providerExplain;
