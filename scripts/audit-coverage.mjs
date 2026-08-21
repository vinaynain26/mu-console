/**
 * Coverage audit: of everything a visitor can SEE, how much can an editor CHANGE?
 *
 * Renders a page in a real browser (much of this site only exists after
 * hydration), scrolls it end to end, then walks every visible text node and
 * image and asks: is this inside an editor anchor, or does its content match
 * a CMS field for this page? The gap list is the to-do, the percentage is
 * the honest answer to "is the CMS done".
 *
 *   node scripts/audit-coverage.mjs                     # home page
 *   node scripts/audit-coverage.mjs --url http://localhost:3000/about --slug about
 */
import { createRequire } from "node:module";

const ARG = (name, dflt) => {
  const i = process.argv.indexOf("--" + name);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const URL_ = ARG("url", "http://localhost:3000/");
const SLUG = ARG("slug", "mu-home");
const CMS = ARG("cms", "http://localhost:4000");
const SITE_PKG = ARG("site", process.env.MU_SITE || "/Users/vinaynain/Downloads/Masters Union Hero Launch");

const require = createRequire(SITE_PKG + "/package.json");
const puppeteer = require("puppeteer");

// every field the page could draw from: its own bucket plus shared. The
// authenticated content API also carries labels — an asset field's label is
// the filename hint the editor matches images with, so the audit must too.
const EMAIL = ARG("email", "figma.uiux@mastersunion.org");
const PASS = ARG("password", "mastersunion");
const login = await (await fetch(`${CMS}/api/account/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
})).json();
const fields = [];
{
  const r = await fetch(`${CMS}/api/pages/${SLUG}/content`, {
    headers: { Authorization: "Bearer " + login.token },
  });
  const j = await r.json();
  for (const tb of j.tabs || [])
    for (const sec of tb.sections || [])
      for (const f of sec.fields || [])
        fields.push({ key: f.key, value: f.published != null ? f.published : f.value, label: f.label || "", tag: f.tag });
}

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL_, { waitUntil: "networkidle2", timeout: 90000 });
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 200));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 800));
});

const report = await page.evaluate((fieldValues) => {
  const norm = (s) => String(s == null ? "" : s)
    .replace(/<[^>]*>/g, " ").replace(/&nbsp;| /g, " ")
    .replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const values = new Set(fieldValues.map((f) => norm(f.value)).filter(Boolean));

  const visible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  // ---- text ----
  const out = { text: { covered: 0, coveredChars: 0, missed: 0, missedChars: 0, misses: [] },
                images: { covered: 0, missed: 0, misses: [] } };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest(".mu-bar, .mu-side, .mu-pill, .mu-toast, script, style, noscript")) continue;
    const t = norm(n.textContent);
    if (!t || !/[A-Za-z]{2}/.test(t)) continue;      // numbers, glyphs, dividers
    if (!visible(el)) continue;
    const anchored = !!el.closest("[data-c]");
    // a data value may be one text node, or this node may be a fragment of a
    // longer field (split spans) — check node text and its parent's full text
    const matched = anchored || values.has(t) || values.has(norm(el.textContent)) ||
      (el.parentElement && values.has(norm(el.parentElement.textContent)));
    if (matched) { out.text.covered++; out.text.coveredChars += t.length; }
    else {
      out.text.missed++; out.text.missedChars += t.length;
      if (out.text.misses.length < 60) {
        const sec = el.closest("section[id]");
        out.text.misses.push((sec ? sec.id + ": " : "") + t.slice(0, 70));
      }
    }
  }

  // ---- images ----
  for (const img of document.querySelectorAll("img, video")) {
    if (img.closest(".mu-bar, .mu-side")) continue;
    if (!visible(img)) continue;
    const src = (img.currentSrc || img.src || "").split(/[?#]/)[0];
    const base = src.split("/").pop();
    const anchored = !!img.closest("[data-c-media]");
    const matched = anchored || fieldValues.some((f) => {
      if (f.value && src.endsWith(String(f.value).split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, ""))) return true;
      // hint match: the label holds the source filename; the build may have
      // renamed it with a content hash (mu-01.webp -> mu-01-nx6T.webp)
      if (!f.value && /\.(png|jpe?g|webp|svg|gif|avif|mp4|webm)$/i.test(f.label || "")) {
        const stem = f.label.replace(/\.[a-z0-9]+$/i, "");
        if (base === f.label || base.startsWith(stem + "-") || base.startsWith(stem + ".")) return true;
      }
      return false;
    });
    if (matched) out.images.covered++;
    else {
      out.images.missed++;
      if (out.images.misses.length < 30) out.images.misses.push(base);
    }
  }
  return out;
}, fields);
await browser.close();

const t = report.text, i = report.images;
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + "%" : "n/a");
console.log(`\n  Coverage — ${URL_} (fields: ${fields.length})\n`);
console.log(`  text   ${pct(t.coveredChars, t.coveredChars + t.missedChars)} of visible characters editable` +
  `  (${t.covered}/${t.covered + t.missed} nodes)`);
console.log(`  images ${pct(i.covered, i.covered + i.missed)} editable  (${i.covered}/${i.covered + i.missed})\n`);
if (t.misses.length) {
  console.log("  uncovered text (first " + t.misses.length + "):");
  t.misses.forEach((m) => console.log("   - " + m));
}
if (i.misses.length) {
  console.log("\n  uncovered images:");
  i.misses.forEach((m) => console.log("   - " + m));
}
