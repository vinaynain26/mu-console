import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeRemote, useRemote, tmpDir, FIXTURE_APP } from "./helpers.mjs";
import * as repo from "../sync/repo.js";

test("clone, read head, commit, push, verify, and see a remote change", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  assert.equal(repo.configured(), true);
  assert.equal(repo.canPush(), true, "a local path needs no token");

  const head0 = await repo.resetToRemote();
  assert.equal(head0, await repo.remoteHead());
  assert.ok(fs.existsSync(path.join(repo.cfg().clone, "src/App.tsx")));

  const out = await repo.commitAndPush({
    files: { "src/pages/Index.tsx": fs.readFileSync(path.join(repo.cfg().clone, "src/pages/Index.tsx"), "utf8").replace("Welcome", "Hello") },
    message: "content(lab-home): 1 change via MU Console",
    author: { name: "Vinay", email: "vinay@example.com" },
  });
  assert.deepEqual(out.changed, ["src/pages/Index.tsx"]);
  assert.equal(await repo.verifyPushed(out.sha), true);
  assert.equal(await repo.remoteHead(), out.sha);
  remote.git(["fetch", "-q", "origin"]);
  assert.match(remote.git(["log", "-1", "--format=%an <%ae>", "origin/main"]), /Vinay <vinay@example.com>/);

  /* the designer pushes from elsewhere */
  remote.git(["pull", "-q", "origin", "main"]);
  fs.writeFileSync(path.join(remote.work, "src/pages/Index.tsx"), "export default () => <h1>Designer</h1>;\n");
  remote.git(["commit", "-qam", "Lovable edit"]);
  remote.git(["push", "-q", "origin", "main"]);
  const head2 = await repo.resetToRemote();
  assert.notEqual(head2, out.sha);
  assert.match(fs.readFileSync(path.join(repo.cfg().clone, "src/pages/Index.tsx"), "utf8"), /Designer/);
});

test("identical content is a no-op", async () => {
  const remote = makeRemote(FIXTURE_APP);
  useRemote(remote.bare, path.join(tmpDir("sync-clone"), "repo"));
  await repo.resetToRemote();
  const same = fs.readFileSync(path.join(repo.cfg().clone, "src/App.tsx"), "utf8");
  const out = await repo.commitAndPush({ files: { "src/App.tsx": same }, message: "noop", author: { name: "A", email: "a@b.c" } });
  assert.equal(out.sha, null);
});
