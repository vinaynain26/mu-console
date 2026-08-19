#!/usr/bin/env node
/**
 * FIELD AUDIT, AUTOMATED.
 *
 * Reads the original Handlebars page, finds every hardcoded piece of text,
 * replaces it with a content key, and records the original text as the seed
 * value. This is Phase 1 + Phase 2 of the plan done by a script instead of a
 * person reading 13,000 lines by hand.
 *
 *   node scripts/build-page.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "views/_source.hbs");
const OUT = path.join(ROOT, "views/page.hbs");
const SEED = path.join(ROOT, "data/seed.json");

let html = fs.readFileSync(SRC, "utf8");

/* ---------- 1. resolve the Handlebars we can decide at build time ---------- */
html = html
  .replace(/\{\{!--[\s\S]*?--\}\}/g, "")
  .replace(/\{\{![\s\S]*?\}\}/g, "")
  .replace(/\{\{\s*apiBaseURL\s*\}\}/g, "https://api.mastersunion.org")
  .replace(/\{\{#if\s+isIndia\s*\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1")
  .replace(/\{\{#if\s+isIndia\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1")
  // Which tab is "active" depends on the URL, so it cannot be baked in here.
  // Drop the conditional entirely; the /page route marks the right panel.
  // Resolving it (keeping the body) marks highlight active on every URL.
  .replace(/\{\{#if\s*\(eq\s+pgpTab\s*'[^']*'\s*\)\s*\}\}[\s\S]*?\{\{\/if\}\}/g, "")
  .replace(/\{\{#if[^}]*\}\}/g, "")
  .replace(/\{\{else\}\}/g, "")
  .replace(/\{\{\/if\}\}/g, "");


/* ---------- 3. work out which section each field belongs to ---------- */
function sectionMap(src) {
  const re = /<section\b[^>]*>|<\/section>/gi;
  const marks = [];
  let m, depth = 0, current = null;
  while ((m = re.exec(src))) {
    if (m[0].startsWith("</")) {
      depth--;
      if (depth === 0 && current) {
        current.end = m.index;
        marks.push(current);
        current = null;
      }
    } else {
      if (depth === 0) {
        current = {
          start: m.index,
          cls: (m[0].match(/class="([^"]*)"/) || [])[1] || "",
          id: (m[0].match(/id="([^"]*)"/) || [])[1] || "",
          end: src.length,
        };
      }
      depth++;
    }
  }
  return marks;
}
let sections = sectionMap(html);

/* ---------- 3b. which TAB does a position belong to? ---------- *
 * This page is five URLs sharing one template. Every tab's markup is present
 * at once; CSS shows one panel. Without recording the tab, an editor changes
 * a field, refreshes, sees nothing, and assumes the system is broken.
 */
const TAB_TITLES = {
  highlight: "Highlights",
  curriculum: "Curriculum",
  outcomes: "Outcomes",
  experienceBharat: "Beyond Classroom",
  admissionfees: "Admissions & Fees",
};

function panelMap(src) {
  const out = [];
  const re = /<div\b[^>]*class="[^"]*\bpgpcourse\b[^"]*"[^>]*id="([a-zA-Z]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(src))) {
    // walk forward to the matching </div>
    const tagRe = /<div\b[^>]*>|<\/div>/gi;
    tagRe.lastIndex = m.index;
    let depth = 0, end = src.length, t;
    while ((t = tagRe.exec(src))) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    out.push({ id: m[1], start: m.index, end });
  }
  return out;
}
let panels = panelMap(html);

function tabAt(pos) {
  for (const p of panels) {
    if (pos >= p.start && pos < p.end) {
      return { key: p.id, title: TAB_TITLES[p.id] || p.id };
    }
  }
  return { key: "_all", title: "Shown on every tab" };
}

const NOISE = ["hide", "new", "bg-white", "mob-hide", "mob-visible", "container", "active"];
function label(cls, id, i) {
  const primary = cls.split(/\s+/).filter((c) => c && !NOISE.includes(c))[0];
  const base = primary || id || "section-" + (i + 1);
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function sectionAt(pos) {
  for (let i = 0; i < sections.length; i++) {
    if (pos >= sections[i].start && pos < sections[i].end) {
      return { key: "s" + (i + 1), title: label(sections[i].cls, sections[i].id, i), ord: i + 1 };
    }
  }
  return { key: "s0", title: "Page header & footer", ord: 0 };
}

/* ---------- 1b. content that lives in a JavaScript array ---------- *
 * Some sections are JS-driven sliders: one slide sits in the HTML and the rest
 * live in a `const X = [...]` array, which then OVERWRITES the HTML on load.
 * Editing the HTML there does nothing — the script replaces it milliseconds
 * later. So we lift those arrays into the content table too and hand the data
 * back to the script at render time.
 */
const jsArrays = [];
/**
 * One regex cannot find these safely: `const dotPositions = [0, 20, 40, 60, 80];`
 * has no newline before its `]`, so a lazy `[\s\S]*?\n\s*\]` runs straight past
 * it and swallows the NEXT real array whole. Scan brackets, accept only arrays
 * of objects.
 */
function findObjectArrays(src) {
  const decl = /\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\[/g;
  const found = [];
  let m;
  while ((m = decl.exec(src))) {
    const open = src.lastIndexOf("[", m.index + m[0].length);
    if (!/^\s*\{/.test(src.slice(open + 1, open + 40))) continue;
    let depth = 0, quote = null, close = -1;
    for (let i = open; i < src.length; i++) {
      const ch = src[i];
      if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
      if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
      if (ch === "[") depth++;
      else if (ch === "]") { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close < 0 || src[close + 1] !== ";") continue;
    found.push({ name: m[1], start: m.index, end: close + 2, body: src.slice(open, close + 1) });
    decl.lastIndex = close;
  }
  return found;
}
{
  const hits = findObjectArrays(html);
  const used = new Map();
  for (let h = hits.length - 1; h >= 0; h--) {
    const { name, start, end, body } = hits[h];
    const objects = body.match(/\{[^{}]*\}/g);
    if (!objects || objects.length < 2) continue;
    const rows = objects.map((o) => {
      const item = {};
      for (const mm of o.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*'([^']*)'/g)) item[mm[1]] = mm[2];
      for (const mm of o.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"([^"]*)"/g)) item[mm[1]] = mm[2];
      return item;
    });
    if (!rows.length || !Object.keys(rows[0]).length) continue;

    // Two scopes can declare the same variable with different data. Give each
    // its own content key so they never cross-wire; the JS name is unchanged.
    const n = (used.get(name) || 0) + 1;
    used.set(name, n);
    const key = n === 1 ? name : name + "__" + n;

    const sec = sectionAt(start);
    const tb = tabAt(start);
    sec.tabKey = tb.key; sec.tabTitle = tb.title;
    jsArrays.unshift({ name: key, rows, section: sec });
    html = html.slice(0, start) + "const " + name + " = {{{jsArray \"" + key + "\"}}};" + html.slice(end);
  }
}

/* ---------- 3c. now hide code, and re-map offsets for the text pass ---------- */
const vault = [];
html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
  vault.push(m);
  return "@@CODE" + (vault.length - 1) + "@@";
});
sections = sectionMap(html);
panels = panelMap(html);

/* ---------- 4. swap hardcoded text for a content key ---------- */
/* Elements the page's own JavaScript rewrites on load. Without this the
   extractor mints a SECOND field for the same visible text, an editor changes
   it, and the script replaces it a frame later — the "my edit did nothing"
   bug. Bind them to the array field so there is one source of truth. */
const JS_BOUND = {
  slideLabel:   "js.SLIDES_DATA.0.label",
  slideHeading: "js.SLIDES_DATA.0.heading",
  slideSub:     "js.SLIDES_DATA.0.sub",
};
let boundCount = 0;

const EDITABLE = /<(h1|h2|h3|h4|h5|h6|p|a|button|li|span|th|td|div|strong|b|em|i|label|figcaption|caption|blockquote|dt|dd|summary|small)\b([^>]*)>([^<>{}]+?)<\/\1>/gi;
const fields = [];
const counters = new Map();

/* ---------- 4b. link targets ---------- *
 * A button's words were editable but the URL behind it was not, so repointing
 * "Apply Now" meant a developer and a deploy. This runs AFTER the script/style
 * vault, which is what keeps `${student.resume_url}` out of it — that is
 * JavaScript, not content.
 */
let linkCount = 0;
html = html.replace(/<a\b([^>]*?)href="([^"]*)"([^>]*)>/gi, (full, pre, href, post, offset) => {
  const h = href.trim();
  if (!h) return full;
  if (h.includes("${") || h.includes("{{")) return full;
  if (/^(#|javascript:)/i.test(h)) return full;

  const sec = sectionAt(offset);
  const tab = tabAt(offset);
  const n = (counters.get(sec.key) || 0) + 1;
  counters.set(sec.key, n);
  const key = sec.key + ".link" + n;

  fields.push({
    key,
    section_key: sec.key, section_title: sec.title, section_ord: sec.ord,
    tab_key: tab.key, tab_title: tab.title,
    tag: "link",
    label: "Link \u2192 " + h.slice(0, 60),
    value: h, multiline: 0, ord: fields.length,
  });
  linkCount++;
  // single quotes inside, or the attribute's own double quotes would close it
  return "<a" + pre + "href=\"{{{c '" + key + "'}}}\" data-c-link=\"" + key + "\"" + post + ">";
});

/* ---------- 4c. active / inactive states ---------- *
 * State lives in the class list: a cohort row is open, closed, or pulled from
 * the page entirely. Letting an editor type raw class names would be a
 * foot-gun, so each set below is a fixed vocabulary shown as a dropdown.
 * Anything not listed here is left exactly as it is.
 */
const STATE_SETS = [
  {
    name: "Cohort row",
    el: "tr",
    base: /\broundRow\b/,
    modifiers: ["notActiveRow", "botBypass", "hide"],
    options: [
      { label: "Open \u2014 accepting applications", value: "" },
      { label: "Closed \u2014 shown, greyed out", value: "notActiveRow botBypass" },
      { label: "Hidden \u2014 not on the page", value: "notActiveRow botBypass hide" },
    ],
  },
];

let stateCount = 0;
for (const set of STATE_SETS) {
  const re = new RegExp("<" + set.el + "\\b([^>]*?)class=\"([^\"]*)\"([^>]*)>", "gi");
  html = html.replace(re, (full, pre, cls, post, offset) => {
    if (!set.base.test(cls) || cls.includes("{{")) return full;

    const tokens = cls.split(/\s+/).filter(Boolean);
    const keep = tokens.filter((t) => !set.modifiers.includes(t));
    const state = tokens.filter((t) => set.modifiers.includes(t));
    const norm = (v) => v.split(/\s+/).filter(Boolean).sort().join(" ");
    const match = set.options.find((o) => norm(o.value) === norm(state.join(" ")));

    const sec = sectionAt(offset);
    const tab = tabAt(offset);
    const n = (counters.get(sec.key) || 0) + 1;
    counters.set(sec.key, n);
    const key = sec.key + ".state" + n;

    fields.push({
      key,
      section_key: sec.key, section_title: sec.title, section_ord: sec.ord,
      tab_key: tab.key, tab_title: tab.title,
      tag: "state",
      label: set.name + " \u2014 " + (match ? match.label.split(" \u2014 ")[0] : "custom"),
      value: match ? match.value : state.join(" "),
      options: JSON.stringify(set.options),
      multiline: 0, ord: fields.length,
    });
    stateCount++;
    return "<" + set.el + pre + "class=\"" + keep.join(" ") + " {{{c '" + key + "'}}}\" data-c-state=\"" + key + "\"" + post + ">";
  });
}

const templated = html.replace(EDITABLE, (full, tag, attrs, text, offset) => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return full;      // whitespace only
  if (!/[A-Za-z]{2}/.test(trimmed)) return full;         // icons, numbers, symbols
  if (trimmed.indexOf("") !== -1) return full;     // a vaulted script/style

  const idAttr = (attrs.match(/\bid="([^"]+)"/) || [])[1];
  if (idAttr && JS_BOUND[idAttr]) {
    boundCount++;
    const bk = JS_BOUND[idAttr];
    return "<" + tag + attrs + " data-c=\"" + bk + "\">{{{c \"" + bk + "\"}}}</" + tag + ">";
  }

  const sec = sectionAt(offset);
  const tab = tabAt(offset);
  const n = (counters.get(sec.key) || 0) + 1;
  counters.set(sec.key, n);
  const key = sec.key + "." + tag + n;
  const clean = trimmed.replace(/\s+/g, " ");

  fields.push({
    key,
    section_key: sec.key,
    section_title: sec.title,
    section_ord: sec.ord,
    tab_key: tab.key,
    tab_title: tab.title,
    tag,
    label: clean.slice(0, 70) + (clean.length > 70 ? "…" : ""),
    value: clean,
    multiline: clean.length > 90 ? 1 : 0,
    ord: fields.length,
  });

  // data-c is what the inline editor binds to. ~1.8 KB gzipped across the
  // whole page for visitors; the editor script itself ships to nobody else.
  return "<" + tag + attrs + " data-c=\"" + key + "\">{{{c \"" + key + "\"}}}</" + tag + ">";
});

/* ---------- 6b. text that shares an element with other markup ---------- *
 * `<h2>PGP Bharat - <span>Cohort Details</span></h2>` has TWO pieces of copy in
 * it. The pass above only matches an element whose content is pure text, so it
 * caught the span and skipped "PGP Bharat - " — leaving a visibly uneditable
 * gap right next to an editable one. Wrap what is left in its own span so it
 * gets an anchor too. Whitespace stays outside the wrapper so layout is
 * unchanged.
 */
let wrapped = 0;
const templated2 = templated.replace(
  /(>)([^<>]+)(<)/g,
  (full, gt, text, lt, offset) => {
    // Not a tag boundary at all: `{{> partial}}` opens with ">" too, and eating
    // that turns the include into `{{> <span…>` and the page stops compiling.
    if (templated.slice(Math.max(0, offset - 2), offset + 1) === "{{>") return full;
    if (text.includes("{{") || text.includes("}}")) return full;       // already templated
    if (text.includes("@@CODE")) return full;                          // a vaulted script/style
    const lead = text.match(/^\s*/)[0];
    const tail = text.match(/\s*$/)[0];
    const core = text.slice(lead.length, text.length - tail.length);
    if (!/[A-Za-z]{2}/.test(core)) return full;                        // icons, numbers, symbols
    /* Inline <b>/<span> inside a sentence splits it into pieces, leaving
       connectives like "with", "and", "from" as their own text nodes. Editing
       one of those in isolation is meaningless, and 68 of them would bury the
       real copy in the studio. Everything shorter than five characters in this
       corpus is such a fragment; "Learn", "Apply Now" and the rest survive. */
    if (core.length < 5) return full;

    const sec = sectionAt(offset);
    const tab = tabAt(offset);
    const n = (counters.get(sec.key) || 0) + 1;
    counters.set(sec.key, n);
    const key = sec.key + ".text" + n;
    const clean = core.replace(/\s+/g, " ");

    fields.push({
      key,
      section_key: sec.key, section_title: sec.title, section_ord: sec.ord,
      tab_key: tab.key, tab_title: tab.title,
      tag: "text",
      label: clean.slice(0, 70) + (clean.length > 70 ? "…" : ""),
      value: clean,
      multiline: clean.length > 90 ? 1 : 0,
      ord: fields.length,
    });
    wrapped++;
    return gt + lead + '<span data-c="' + key + '">{{{c "' + key + '"}}}</span>' + tail + lt;
  }
);

/* ---------- 5. put the code back ---------- */
let final = templated2.replace(/@@CODE(\d+)@@/g, (_m, i) => vault[Number(i)]);

/* JS-array content becomes ordinary editable rows, one per property */
const TEXTY = ["label", "heading", "sub", "title", "text", "desc", "description", "name", "caption", "subtitle", "city", "body"];
for (const arr of jsArrays) {
  arr.rows.forEach((row, i) => {
    for (const [prop, val] of Object.entries(row)) {
      const editable = TEXTY.includes(prop);
      fields.push({
        key: "js." + arr.name + "." + i + "." + prop,
        section_key: arr.section.key,
        section_title: arr.section.title,
        section_ord: arr.section.ord,
        tab_key: arr.section.tabKey || "_all",
        tab_title: arr.section.tabTitle || "Shown on every tab",
        tag: editable ? "slide" : "asset",
        label: (editable ? "" : "[link] ") + arr.name + " " + (i + 1) + " — " + prop,
        value: val,
        multiline: val.length > 90 ? 1 : 0,
        readonly: editable ? 0 : 1,
        ord: 10000 + i * 10,
      });
    }
  });
}

{
  const marks = sectionMap(final);
  for (let i = marks.length - 1; i >= 0; i--) {
    const at = marks[i].start;
    final = final.slice(0, at + "<section".length) +
            ` data-sec="s${i + 1}"` + final.slice(at + "<section".length);
  }
  console.log("  tagged " + marks.length + " sections with a drag handle");
}

fs.writeFileSync(OUT, final);
fs.writeFileSync(
  SEED,
  JSON.stringify({ page: { slug: "pgp-bharat", title: "PGP Bharat" }, fields }, null, 2)
);

const byTab = new Map();
for (const f of fields) {
  if (!byTab.has(f.tab_title)) byTab.set(f.tab_title, { fields: 0, sections: new Set() });
  const t = byTab.get(f.tab_title);
  t.fields++;
  t.sections.add(f.section_title);
}
console.log("\n  editable fields: " + fields.length);
console.log("  bound to a JS array instead of duplicated: " + boundCount);
console.log("  loose text nodes wrapped for editing: " + wrapped);
console.log("  editable links: " + linkCount + "   state switches: " + stateCount + "\n");
for (const [t, v] of byTab) {
  console.log("   " + String(v.fields).padStart(4) + " fields  " +
              String(v.sections.size).padStart(3) + " sections   " + t);
}
console.log("\n  -> views/page.hbs   (template, text replaced with content keys)");
console.log("  -> data/seed.json   (the original wording)\n");
