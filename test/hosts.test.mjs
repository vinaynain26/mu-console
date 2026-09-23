/* The sync talks to one git host over https with a token. GitHub and GitLab
   want different basic-auth usernames, name their projects differently, and
   sign their webhooks differently. Nothing else about the sync cares which
   host it is. */
import { test } from "node:test";
import assert from "node:assert/strict";

async function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) { saved[k] = process.env[k]; if (v == null) delete process.env[k]; else process.env[k] = v; }
  try { return await fn(); } finally { for (const [k, v] of Object.entries(saved)) { if (v == null) delete process.env[k]; else process.env[k] = v; } }
}
const repo = await import("../sync/repo.js");
const { assetsBase } = await import("../sync/assets.js");
const decode = (args) => {
  const h = args.join(" ").match(/AUTHORIZATION: basic (\S+)/);
  return h ? Buffer.from(h[1], "base64").toString("utf8") : null;
};

test("the basic-auth user follows the host: GitHub's x-access-token, GitLab's oauth2", async () => {
  assert.equal(decode(repo.authArgs("tok", "https://github.com/o/r.git")), "x-access-token:tok");
  assert.equal(decode(repo.authArgs("tok", "https://gitlab.com/group/sub/p.git")), "oauth2:tok");
  assert.equal(decode(repo.authArgs("tok", "https://git.mastersunion.org/team/site.git")), "oauth2:tok", "a self-managed host is GitLab-shaped by default");
  await withEnv({ LOVABLE_GIT_USER: "vinay" }, () => {
    assert.equal(decode(repo.authArgs("tok", "https://git.example.com/t/p.git")), "vinay:tok", "and can be named outright");
  });
  assert.deepEqual(repo.authArgs("", "https://gitlab.com/g/p.git"), [], "no token, no header");
});

test("a project is named without its host, on any host, including nested GitLab groups", async () => {
  for (const [url, name] of [
    ["https://github.com/vinaynain26/huggable-file-friend.git", "vinaynain26/huggable-file-friend"],
    ["https://gitlab.com/mastersunion/web/site.git", "mastersunion/web/site"],
    ["https://git.mastersunion.org/team/site", "team/site"],
    ["/tmp/sync-remote/origin.git", "/tmp/sync-remote/origin.git"],
  ]) {
    await withEnv({ LOVABLE_REPO: url }, () => assert.equal(repo.repoName(), name, url));
  }
});

test("the Lovable asset host is only guessed for a GitHub repo; elsewhere it must be given", async () => {
  await withEnv({ LOVABLE_ASSETS_URL: null, LOVABLE_REPO: "https://github.com/o/huggable-file-friend.git" },
    () => assert.equal(assetsBase(), "https://huggable-file-friend.lovable.app"));
  await withEnv({ LOVABLE_ASSETS_URL: null, LOVABLE_REPO: "https://gitlab.com/mastersunion/web/site.git" },
    () => assert.equal(assetsBase(), "", "a GitLab project name says nothing about the Lovable host"));
  await withEnv({ LOVABLE_ASSETS_URL: "https://staging.example.com/", LOVABLE_REPO: "https://gitlab.com/g/p.git" },
    () => assert.equal(assetsBase(), "https://staging.example.com"));
});

test("a webhook is accepted from either host's way of signing it, and refused otherwise", () => {
  const ok = (secret, req) => repo.webhookTokenOk(secret, req);
  assert.equal(ok("", { query: {}, headers: {} }), true, "no secret set: anything may ask for a pull");
  assert.equal(ok("s3cret", { query: { token: "s3cret" }, headers: {} }), true, "in the URL, as GitHub sends it");
  assert.equal(ok("s3cret", { query: {}, headers: { "x-gitlab-token": "s3cret" } }), true, "in the header, as GitLab sends it");
  assert.equal(ok("s3cret", { query: { token: "wrong" }, headers: {} }), false);
  assert.equal(ok("s3cret", { query: {}, headers: {} }), false);
});

test("a clone or dist directory given relatively is resolved against the project, not the working directory", async () => {
  const path = await import("node:path");
  const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
  await withEnv({ SYNC_CLONE_DIR: "data/gitlab-repo", SYNC_DIST_DIR: "data/gitlab-dist" }, async () => {
    assert.equal(repo.cfg().clone, path.join(ROOT, "data/gitlab-repo"));
    const { DIST } = await import("../sync/build.js?" + Math.random());
    assert.equal(DIST, path.join(ROOT, "data/gitlab-dist"));
  });
  await withEnv({ SYNC_CLONE_DIR: "/tmp/elsewhere/repo", SYNC_DIST_DIR: null }, async () => {
    assert.equal(repo.cfg().clone, "/tmp/elsewhere/repo", "an absolute one is left alone");
    const { DIST } = await import("../sync/build.js?" + Math.random());
    assert.equal(DIST, path.join(ROOT, "data/lab-dist"), "and the default is the project's own");
  });
});
