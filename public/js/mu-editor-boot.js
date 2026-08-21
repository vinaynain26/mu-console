/**
 * Loads the inline editor into an instrumented app.
 *
 * Dropped into any page that renders itself. It stays completely dormant until
 * someone asks for it with ?edit=1, so a visitor downloads a couple of hundred
 * bytes and nothing else — the editor, its styles and the whole content API
 * only come into play for someone who is signing in to edit.
 *
 *   <script src="https://cms.example/assets/js/mu-editor-boot.js"
 *           data-cms="https://cms.example" defer></script>
 */
(function () {
  "use strict";
  var self = document.currentScript;
  var CMS = (self && self.dataset.cms) || "http://localhost:4000";
  var KEY = "mu.cms.token";

  var wants = /[?&]edit=1\b/.test(location.search);
  if (!wants) return;

  /** URL -> the CMS page holding its copy. Mirrors the build-time owner rule. */
  function slugFor() {
    var p = location.pathname.replace(/^\/+|\/+$/g, "");
    return p === "" ? (self && self.dataset.homeSlug) || "mu-home" : p.replace(/\//g, "-").toLowerCase();
  }

  function load(url, isCss) {
    return new Promise(function (res, rej) {
      var n;
      if (isCss) { n = document.createElement("link"); n.rel = "stylesheet"; n.href = url; }
      else { n = document.createElement("script"); n.src = url; }
      n.onload = res; n.onerror = function () { rej(new Error("could not load " + url)); };
      document.head.appendChild(n);
    });
  }

  async function whoami(token) {
    try {
      var r = await fetch(CMS + "/api/account", { headers: { Authorization: "Bearer " + token } });
      if (!r.ok) return null;
      var j = await r.json();
      return j.user || null;
    } catch { return null; }
  }

  async function signIn() {
    var email = window.prompt("CMS email");
    if (!email) return null;
    var password = window.prompt("Password for " + email);
    if (!password) return null;
    try {
      var r = await fetch(CMS + "/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      });
      var j = await r.json();
      if (!r.ok) { alert(j.error || "Could not sign in."); return null; }
      localStorage.setItem(KEY, j.token);
      return j.user;
    } catch (e) {
      alert("Could not reach the CMS at " + CMS);
      return null;
    }
  }

  (async function () {
    var token = localStorage.getItem(KEY);
    var user = token ? await whoami(token) : null;
    if (!user) {
      // a stored token that no longer works is worse than none
      localStorage.removeItem(KEY);
      user = await signIn();
      token = localStorage.getItem(KEY);
      if (!user || !token) return;
    }

    var role = user.role;
    var can = function (a) {
      return ({ viewer: ["read"], commenter: ["read", "comment"],
                editor: ["read", "comment", "edit", "ai"],
                admin: ["read", "comment", "edit", "ai", "publish", "reorder", "users"] }[role] || []).indexOf(a) >= 0;
    };

    window.__MU_EDITOR__ = {
      slug: slugFor(),
      tab: "_all",
      preview: false,
      apiBase: CMS,
      token: token,
      consoleBase: CMS,
      consoleUrl: "/console",
      user: user,
      can: {
        edit: can("edit"), comment: can("comment"), publish: can("publish"),
        reorder: false,            // sections here are source files, not movable blocks
        ai: can("ai"),
      },
    };

    try {
      await load(CMS + "/assets/css/inline-editor.css", true);
      await load(CMS + "/assets/js/inline-editor.js", false);
    } catch (e) {
      console.error("[mu-cms] " + e.message);
    }
  })();
})();
