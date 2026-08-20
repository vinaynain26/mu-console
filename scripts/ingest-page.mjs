#!/usr/bin/env node
/**
 * INGEST A CONVERTED PAGE.
 *
 * Takes the output of the Lovable → Handlebars converter (or any plain .hbs)
 * and turns it into a page this CMS manages: text anchored, images swappable
 * for video, link targets and button states editable, sections draggable.
 *
 * There is no route to register afterwards. The server reads every
 * data/seed-*.json on boot and serves whatever it finds at /page/<slug>, so
 * dropping a seed file in IS the deployment step.
 *
 *   node scripts/ingest-page.mjs \
 *     --view   ../dark-welcome-page-main/hbs-output/views/dark-welcome-page.hbs \
 *     --layout ../dark-welcome-page-main/hbs-output/views/layouts/dark-welcome-page.hbs \
 *     --slug   dark-welcome-page \
 *     --title  "Dark Welcome Page"
 *
 * This deliberately does NOT share code with build-page.mjs. That script
 * carries logic specific to the hand-built PGP page — five tab panels sharing
 * one template, slider arrays the page's own JavaScript overwrites — none of
 * which a generated page has. Keeping them apart means a change here cannot
 * break the page that is already live.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/* ---------- arguments ---------- */
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const viewPath = arg("view");
const layoutPath = arg("layout");
const slug = arg("slug");
const title = arg("title") || (slug || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

if (!viewPath || !slug) {
  console.error("usage: node scripts/ingest-page.mjs --view <file.hbs> [--layout <file.hbs>] --slug <slug> [--title <title>]");
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error(`--slug must be url-safe lowercase: got "${slug}"`);
  process.exit(1);
}
if (!fs.existsSync(viewPath)) {
  console.error("no such view: " + viewPath);
  process.exit(1);
}

let html = fs.readFileSync(viewPath, "utf8");

/* ---------- sections ---------- */
function sectionMap(src) {
  const re = /<section\b[^>]*>|<\/section>/gi;
  const marks = [];
  let m, depth = 0, current = null;
  while ((m = re.exec(src))) {
    if (m[0].startsWith("</")) {
      depth--;
      if (depth === 0 && current) { current.end = m.index; marks.push(current); current = null; }
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

/* A generated page is styled by utility classes, so the class list is a poor
   section name. Prefer the first heading inside it — that is what an editor
   will recognise in the studio. */
function sectionTitle(src, sec, i) {
  const body = src.slice(sec.start, sec.end);
  const h = body.match(/<h[1-6][^>]*>([^<]{2,60})</i);
  if (h) return h[1].trim().replace(/\s+/g, " ").slice(0, 48);
  if (sec.id) return sec.id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return "Section " + (i + 1);
}

let sections = sectionMap(html);
let titles = sections.map((s, i) => sectionTitle(html, s, i));
const remap = () => { sections = sectionMap(html); };

function sectionAt(pos) {
  for (let i = 0; i < sections.length; i++) {
    if (pos >= sections[i].start && pos < sections[i].end) {
      return { key: "s" + (i + 1), title: titles[i] || "Section " + (i + 1), ord: i + 1 };
    }
  }
  return { key: "s0", title: "Page header & footer", ord: 0 };
}

const fields = [];
const counters = new Map();
const nextKey = (sec, kind) => {
  const n = (counters.get(sec.key) || 0) + 1;
  counters.set(sec.key, n);
  return sec.key + "." + kind + n;
};
const base = (sec) => ({
  section_key: sec.key, section_title: sec.title, section_ord: sec.ord,
  tab_key: "_all", tab_title: "Whole page", multiline: 0,
});

/* ---------- hide code ---------- */
const vault = [];
html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
  vault.push(m);
  return "@@CODE" + (vault.length - 1) + "@@";
});
remap();

/* ---------- media ---------- */
let mediaCount = 0;
html = html.replace(/<img\b([^>]*)>/gi, (full, attrs, offset) => {
  const srcM = attrs.match(/\ssrc="([^"]*)"/i);
  if (!srcM) return full;
  const src = srcM[1].trim();
  if (!src || src.includes("${") || src.includes("{{") || /^data:/i.test(src)) return full;

  const rest = attrs.replace(/\ssrc="[^"]*"/i, "").trim();
  const sec = sectionAt(offset);
  const key = nextKey(sec, "media");
  const alt = (attrs.match(/\salt="([^"]*)"/i) || [])[1] || "";

  fields.push({ ...base(sec), key, tag: "media",
    label: (alt ? alt.slice(0, 40) + " — " : "") + "image / video", value: src, ord: fields.length });
  fields.push({ ...base(sec), key: key + "@poster", tag: "image",
    label: "Poster frame (used only when the above is a video)", value: "", ord: fields.length });
  fields.push({ ...base(sec), key: key + "@attrs", tag: "meta",
    label: "markup attributes (not editable)", value: rest, ord: fields.length });
  mediaCount++;
  return "{{{media '" + key + "'}}}";
});
remap();

/* ---------- links ---------- */
let linkCount = 0;
html = html.replace(/<a\b([^>]*?)href="([^"]*)"([^>]*)>/gi, (full, pre, href, post, offset) => {
  const h = href.trim();
  if (!h || h.includes("${") || h.includes("{{") || /^(#|javascript:)/i.test(h)) return full;
  const sec = sectionAt(offset);
  const key = nextKey(sec, "link");
  fields.push({ ...base(sec), key, tag: "link", label: "Link → " + h.slice(0, 60), value: h, ord: fields.length });
  linkCount++;
  return "<a" + pre + "href=\"{{{c '" + key + "'}}}\" data-c-link=\"" + key + "\"" + post + ">";
});
remap();

/* ---------- button states ---------- *
 * A generated page has no house state vocabulary, so this uses the CMS's own
 * `mu-disabled` / `hide`, which mu-media.css styles. Anything that looks like a
 * button — a link with a button class or role — gets the switch.
 */
const STATE_OPTIONS = [
  { label: "Active — clickable", value: "" },
  { label: "Closed — greyed out, not clickable", value: "mu-disabled" },
  { label: "Hidden — not on the page", value: "hide" },
];
let stateCount = 0;
html = html.replace(/<a\b([^>]*?)class="([^"]*)"([^>]*)>/gi, (full, pre, cls, post, offset) => {
  if (cls.includes("{{")) return full;
  const looksLikeButton = /\bbtn\b|\bbutton\b|rounded-(full|md|lg|xl)/i.test(cls) || /role="button"/i.test(pre + post);
  if (!looksLikeButton) return full;

  const sec = sectionAt(offset);
  const key = nextKey(sec, "state");
  fields.push({ ...base(sec), key, tag: "state", label: "Button — Active",
    value: "", options: JSON.stringify(STATE_OPTIONS), ord: fields.length });
  stateCount++;
  return "<a" + pre + "class=\"" + cls + " {{{c '" + key + "'}}}\" data-c-state=\"" + key + "\"" + post + ">";
});
remap();

/* ---------- text in a pure-text element ---------- */
const EDITABLE = /<(h1|h2|h3|h4|h5|h6|p|a|button|li|span|th|td|div|strong|b|em|i|label|figcaption|caption|blockquote|dt|dd|summary|small)\b([^>]*)>([^<>{}]+?)<\/\1>/gi;
let textCount = 0;
let templated = html.replace(EDITABLE, (full, tag, attrs, text, offset) => {
  const t = text.trim();
  if (t.length < 2 || !/[A-Za-z]{2}/.test(t) || /@@CODE\d+@@/.test(t)) return full;
  const sec = sectionAt(offset);
  const key = nextKey(sec, tag);
  const clean = t.replace(/\s+/g, " ");
  fields.push({ ...base(sec), key, tag,
    label: clean.slice(0, 70) + (clean.length > 70 ? "…" : ""),
    value: clean, multiline: clean.length > 90 ? 1 : 0, ord: fields.length });
  textCount++;
  return "<" + tag + attrs + " data-c=\"" + key + "\">{{{c \"" + key + "\"}}}</" + tag + ">";
});

/* ---------- text sharing an element with other markup ---------- */
let wrapped = 0;
templated = templated.replace(/(>)([^<>]+)(<)/g, (full, gt, text, lt, offset) => {
  if (templated.slice(Math.max(0, offset - 2), offset + 1) === "{{>") return full;
  if (text.includes("{{") || text.includes("}}") || text.includes("@@CODE")) return full;
  const lead = text.match(/^\s*/)[0];
  const tail = text.match(/\s*$/)[0];
  const core = text.slice(lead.length, text.length - tail.length);
  if (core.length < 5 || !/[A-Za-z]{2}/.test(core)) return full;   // connectives, not copy

  const sec = sectionAt(offset);
  const key = nextKey(sec, "text");
  const clean = core.replace(/\s+/g, " ");
  fields.push({ ...base(sec), key, tag: "text",
    label: clean.slice(0, 70) + (clean.length > 70 ? "…" : ""),
    value: clean, multiline: clean.length > 90 ? 1 : 0, ord: fields.length });
  wrapped++;
  return gt + lead + '<span data-c="' + key + '">{{{c "' + key + '"}}}</span>' + tail + lt;
});

/* ---------- restore code, tag sections ---------- */
let final = templated.replace(/@@CODE(\d+)@@/g, (_m, i) => vault[Number(i)]);
{
  const marks = sectionMap(final);
  for (let i = marks.length - 1; i >= 0; i--) {
    const at = marks[i].start;
    final = final.slice(0, at + "<section".length) + ` data-sec="s${i + 1}"` + final.slice(at + "<section".length);
  }
}

/* ---------- layout ---------- */
let layoutName = "main";
if (layoutPath && fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, "utf8");
  /* A generated layout references whatever partials that project assumed. Ones
     this app does not have would throw at render time and take the page down,
     so comment them out and say so rather than fail on first view. */
  const missing = [];
  layout = layout.replace(/\{\{>\s*([^}\s]+)\s*\}\}/g, (full, name) => {
    if (fs.existsSync(path.join(ROOT, "views/partials", name + ".hbs"))) return full;
    missing.push(name);
    return `<!-- partial "${name}" not present in this app -->`;
  });
  layoutName = slug;
  fs.mkdirSync(path.join(ROOT, "views/layouts"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "views/layouts", slug + ".hbs"), layout);
  if (missing.length) console.log("  ! layout referenced missing partial(s): " + missing.join(", "));
}

fs.writeFileSync(path.join(ROOT, "views", slug + ".hbs"), final);
fs.writeFileSync(
  path.join(ROOT, "data", "seed-" + slug + ".json"),
  JSON.stringify({
    page: { slug, title, template: slug, layout: layoutName, source: "lovable" },
    fields,
  }, null, 2)
);

console.log(`\n  ingested "${title}"  ->  /page/${slug}`);
console.log(`  ${fields.filter((f) => f.tag !== "meta").length} editable fields` +
            `   text ${textCount + wrapped}   media ${mediaCount}   links ${linkCount}   states ${stateCount}`);
console.log(`  -> views/${slug}.hbs`);
if (layoutName !== "main") console.log(`  -> views/layouts/${slug}.hbs`);
console.log(`  -> data/seed-${slug}.json   (restart the server to publish it)\n`);
