/**
 * Pictures an editor uploads, stored on UnionStack (Cloudflare behind it)
 * and served from files.unionstack.in. The browser never holds the key: a
 * file goes browser -> this server -> UnionStack, and the CDN link comes
 * back to fill the picture field, which publish then writes into the
 * source like any other URL.
 *
 *   UNIONSTACK_API_KEY   a server key (allowed origins "*"), from the
 *                        UnionStack dashboard
 */
import { createRequire } from "node:module";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = /^(image\/(png|jpe?g|webp|gif|avif|svg\+xml)|video\/(mp4|webm))$/i;

export const configured = () => Boolean(process.env.UNIONSTACK_API_KEY);

let client = null;
/** Tests hand in a stand-in for the SDK client. */
export const _setClient = (c) => { client = c; };

function getClient() {
  if (client) return client;
  const require = createRequire(import.meta.url);
  const { UnionStack } = require("@masters-union/union-stack/node");
  client = UnionStack.init({ apiKey: process.env.UNIONSTACK_API_KEY });
  return client;
}

const fail = (code, message) => { const e = new Error(message); e.code = code; return e; };

/** @returns {Promise<{url, fileId, filename, mimeType, size}>} */
export async function upload({ bytes, filename, mimeType }) {
  if (!configured()) throw fail("unconfigured", "Uploads are not switched on. Set UNIONSTACK_API_KEY in .env and restart.");
  const type = String(mimeType || "").split(";")[0].trim().toLowerCase();
  if (!ACCEPT.test(type)) throw fail("type", "That file is not an image or a video the site can show (png, jpg, webp, gif, avif, svg, mp4 or webm).");
  if (!bytes || !bytes.length) throw fail("empty", "That file is empty.");
  if (bytes.length > MAX_BYTES) throw fail("size", "That file is over 50 MB. Shrink it and try again.");
  const name = String(filename || "upload").replace(/[\\/]+/g, "_").slice(0, 180);
  const out = await getClient().upload(bytes, { filename: name, mimeType: type });
  return { url: out.url, fileId: out.fileId, filename: name, mimeType: type, size: bytes.length };
}

/** Turns any failure into something an editor can act on. */
export function explain(err) {
  const code = err && err.code;
  if (code === "unconfigured") return { status: 503, error: err.message };
  if (code === "type") return { status: 415, error: err.message };
  if (code === "empty") return { status: 400, error: err.message };
  if (code === "size") return { status: 413, error: err.message };
  /* the SDK's codes */
  if (code === "AUTH" || code === "CONFIG") return { status: 503, error: "UnionStack did not accept the upload key. Check UNIONSTACK_API_KEY in .env (it must be a server key with allowed origins \"*\")." };
  if (code === "QUOTA") return { status: 507, error: "The UnionStack storage or upload limit has been hit. Free up space or raise the plan, then try again." };
  if (code === "VALIDATION" || code === "EMPTY_FILE") return { status: 415, error: "UnionStack rejected that file (type, size or dimensions). Try another." };
  if (code === "NETWORK" || code === "PART_FAILED") return { status: 502, error: "Could not reach UnionStack. Check the network and try again." };
  if (code === "SERVER") return { status: 502, error: "UnionStack had a problem storing the file. Try again in a moment." };
  if (code === "ABORTED") return { status: 499, error: "The upload was cancelled." };
  return { status: 500, error: (err && err.message) || "The upload failed." };
}
