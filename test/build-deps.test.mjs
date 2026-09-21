/* A Lovable export pins its dependencies with bun.lock and bun tolerates peer
   clashes that npm refuses (react-three/fiber vs a newer React). Install the
   way the project was built: bun when it is there and the lockfile is,
   otherwise npm with peer conflicts allowed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tmpDir } from "./helpers.mjs";
import { installCommand } from "../sync/build.js";

test("bun.lock plus bun on the machine means bun install, re-resolved (the lockfile names Lovable's private cache)", () => {
  const d = tmpDir("deps"); fs.writeFileSync(path.join(d, "bun.lock"), "{}");
  assert.deepEqual(installCommand(d, { bun: true }), ["bun", ["install"]]);
});

test("without bun, npm installs but does not refuse over peer dependencies", () => {
  const d = tmpDir("deps"); fs.writeFileSync(path.join(d, "bun.lock"), "{}");
  const [cmd, args] = installCommand(d, { bun: false });
  assert.equal(cmd, "npm"); assert.ok(args.includes("install") && args.includes("--legacy-peer-deps"));
});

test("no bun.lock means npm even when bun is available", () => {
  const d = tmpDir("deps");
  assert.equal(installCommand(d, { bun: true })[0], "npm");
});

test("waitForBuild resolves once the connected site has been built at that commit, and gives up after the timeout", async () => {
  const { waitForBuild, _setBuildState } = await import("../sync/build.js");
  _setBuildState({ building: true, sha: "old" });
  setTimeout(() => _setBuildState({ building: false, sha: "new1234" }), 120);
  const t0 = Date.now();
  assert.equal(await waitForBuild("new1234", 5000, 20), true);
  assert.ok(Date.now() - t0 >= 100, "it waited for the build to land");
  _setBuildState({ building: false, sha: "other" });
  assert.equal(await waitForBuild("never", 150, 20), false, "a build that never comes does not hang the publish forever");
});
