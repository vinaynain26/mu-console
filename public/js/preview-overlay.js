/**
 * Preview overlay: the real page, with the console's copy laid on top.
 *
 * The built site still carries its original English. This script asks the
 * console which fields differ (draft or live, per ?preview=1), then swaps
 * text nodes, attributes and images whose ORIGINAL value matches. React may
 * re-render and put the original back, so the pass re-runs on every DOM
 * change — it is idempotent, and it never touches a node it did not match.
 */
(function () {
  "use strict";
  var BOOT = window.__MU_PREVIEW__;
  if (!BOOT) return;

  var base = "/preview/" + BOOT.repoDir;
  var route = location.pathname.slice(base.length) || "/";
  var norm = function (s) { return String(s).replace(/\s+/g, " ").trim(); };
  var stem = function (p) { return String(p).split("/").pop().replace(/\.[^.]+$/, ""); };

  var texts = {}, attrs = {}, media = [];
  var count = 0, banner, mute = false, pending = null;

  function apply(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode;
      if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || (p.id && p.id.indexOf("mu-") === 0)) continue;
      var key = norm(n.nodeValue);
      if (!key || !texts.hasOwnProperty(key)) continue;
      var lead = n.nodeValue.match(/^\s*/)[0], tail = n.nodeValue.match(/\s*$/)[0];
      n.nodeValue = lead + texts[key] + tail;
    }
    var els = root.querySelectorAll ? root.querySelectorAll("[alt],[title],[placeholder],[aria-label],img[src],video[src],source[src]") : [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      ["alt", "title", "placeholder", "aria-label"].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v != null && attrs.hasOwnProperty(norm(v))) el.setAttribute(a, attrs[norm(v)]);
      });
      var src = el.getAttribute("src");
      if (src) for (var j = 0; j < media.length; j++) {
        var m = media[j];
        // vite renames hero.jpg to hero-<hash>.jpg: match on the stem
        if (src.indexOf("/" + m.stem + "-") >= 0 || src.indexOf("/" + m.stem + ".") >= 0) el.setAttribute("src", m.to);
      }
    }
  }

  function badge() {
    if (banner || window.__MU_EDITOR__) return;   // the editor's own bar says all this
    banner = document.createElement("div");
    banner.id = "mu-preview-badge";
    banner.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:2147483647;font:600 12px/1 system-ui,sans-serif;color:#fff;" +
      "background:rgba(0,0,0,.78);backdrop-filter:blur(8px);padding:9px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);" +
      "display:flex;gap:8px;align-items:center;pointer-events:none";
    var dot = document.createElement("span");
    dot.style.cssText = "width:7px;height:7px;border-radius:50%;background:" + (BOOT.preview ? "#F7D344" : "#30D158");
    banner.appendChild(dot);
    var t = document.createElement("span");
    t.textContent = (BOOT.preview ? "Draft preview" : "Live copy") + " · " + count + " change" + (count === 1 ? "" : "s") + " shown";
    banner.appendChild(t);
    document.body.appendChild(banner);
  }

  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; mute = true; apply(document.body); mute = false; }, 40);
  }

  fetch("/api/preview/" + encodeURIComponent(BOOT.repoDir) + "/overlay?route=" + encodeURIComponent(route) + (BOOT.preview ? "&preview=1" : ""),
    { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("overlay " + r.status)); })
    .then(function (d) {
      d.changes.forEach(function (c) {
        if (c.type === "media") media.push({ stem: stem(c.from), to: c.to });
        else { texts[norm(c.from)] = c.to; attrs[norm(c.from)] = c.to; }
        count++;
      });
      mute = true; apply(document.body); mute = false;
      badge();
      new MutationObserver(function () { if (!mute) schedule(); })
        .observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["src", "alt"] });
    })
    .catch(function (e) { console.warn("[mu preview]", e.message); });
})();
