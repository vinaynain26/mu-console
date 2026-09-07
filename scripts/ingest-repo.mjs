/**
 * Read a site's pages out of its GitHub repository into the console.
 *
 *   node scripts/ingest-repo.mjs                      # the Lovable repo, its live branch
 *   node scripts/ingest-repo.mjs --repo owner/name --branch previewbranch
 *
 * Same code the "Read pages from GitHub" button runs. Safe to rerun: fields
 * whose text survived keep their edits; vanished ones are retired.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import * as repo from "../repo.js";
import * as ingest from "../ingest.js";

const ROOT = path.resolve(import.meta.dirname, "..");
if (fs.existsSync(path.join(ROOT, ".env"))) process.loadEnvFile(path.join(ROOT, ".env"));
const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const c = repo.cfg();
const name = ingest.repoSlug(arg("repo") || c.lovable);
if (!name) { console.error("No repo. Pass --repo owner/name or set LOVABLE_REPO."); process.exit(1); }
const isLovable = name.toLowerCase() === ingest.repoSlug(c.lovable).toLowerCase();
const token = isLovable ? c.lovableToken : c.token || c.lovableToken;
const branch = arg("branch") || (isLovable ? c.live : c.preview);

const db = new DatabaseSync(path.join(ROOT, "data/content.db"));
console.log(`  reading ${name} @ ${branch}`);
const out = await ingest.ingest(db, { url: "https://github.com/" + name + ".git", token, branch, homeSlug: arg("home-slug", "home"), siteUrl: process.env.LIVE_URL || null });
console.log(`  commit  ${out.sha.slice(0, 7)}`);
for (const p of out.pages) console.log(`  ${p.route.padEnd(12)} ${p.slug.padEnd(14)} ${p.fields} fields · ${p.sections} sections · +${p.added} new · ${p.retired} retired`);
