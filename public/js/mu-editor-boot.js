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

  /* Once someone has signed in, the editor should simply be there — having to
     remember ?edit=1 on every page is not an editing experience. A visitor with
     no stored session still gets nothing but this file. */
  var asked = /[?&]edit=1\b/.test(location.search);
  var signedIn = !!localStorage.getItem(KEY);
  if (!asked && !signedIn) return;

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

  /* A real sign-in panel rather than window.prompt(). Browsers suppress
     repeated native prompts, some block them outright, and one appearing over a
     page with no explanation is easy to dismiss without registering what it
     was — which is exactly how this looked broken. */
  function signIn() {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "mu-auth";
      wrap.innerHTML =
        '<div class="mu-auth__card" role="dialog" aria-modal="true" aria-label="Sign in to edit">' +
          '<div class="mu-auth__eyebrow">Content editor</div>' +
          "<h2>Sign in to edit this page</h2>" +
          '<label class="mu-auth__lab" for="mu-auth-email">Email</label>' +
          '<input id="mu-auth-email" type="email" autocomplete="username" placeholder="you@mastersunion.org">' +
          '<label class="mu-auth__lab" for="mu-auth-pass">Password</label>' +
          '<input id="mu-auth-pass" type="password" autocomplete="current-password">' +
          '<div class="mu-auth__err" hidden></div>' +
          '<div class="mu-auth__row">' +
            '<button type="button" class="mu-auth__cancel">Not now</button>' +
            '<button type="button" class="mu-auth__go">Sign in</button>' +
          "</div>" +
        "</div>";
      document.body.appendChild(wrap);

      var email = wrap.querySelector("#mu-auth-email");
      var pass = wrap.querySelector("#mu-auth-pass");
      var err = wrap.querySelector(".mu-auth__err");
      var go = wrap.querySelector(".mu-auth__go");
      setTimeout(function () { email.focus(); }, 60);

      function close(user) { wrap.remove(); resolve(user || null); }
      function fail(msg) {
        err.textContent = msg; err.hidden = false;
        go.disabled = false; go.textContent = "Sign in";
      }

      async function submit() {
        if (!email.value || !pass.value) return fail("Email and password are both needed.");
        go.disabled = true; go.textContent = "Signing in…";
        try {
          var r = await fetch(CMS + "/api/account/login", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.value, password: pass.value }),
          });
          var j = await r.json();
          if (!r.ok) return fail(j.error || "Could not sign in.");
          localStorage.setItem(KEY, j.token);
          close(j.user);
        } catch (e) {
          fail("Could not reach the CMS at " + CMS);
        }
      }

      go.addEventListener("click", submit);
      wrap.querySelector(".mu-auth__cancel").addEventListener("click", function () { close(null); });
      wrap.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submit(); }
        if (e.key === "Escape") close(null);
      });
      wrap.addEventListener("click", function (e) { if (e.target === wrap) close(null); });
    });
  }

  (async function () {
    var token = localStorage.getItem(KEY);
    var user = token ? await whoami(token) : null;
    if (!user) {
      // a stored token that no longer works is worse than none
      localStorage.removeItem(KEY);
      // only interrupt someone who actually asked to edit
      if (!asked) return;
      try { await load(CMS + "/assets/css/inline-editor.css", true); } catch (e) { /* unstyled is still usable */ }
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
