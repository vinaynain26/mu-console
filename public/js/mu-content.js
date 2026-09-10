/**
 * MU Console content runtime — shipped INTO the site repo as public/mu-content.js.
 *
 * The site keeps its original copy in code. The console commits the edited
 * copy to public/content/<page>.json, alongside the original text for each
 * field. This script loads that file and swaps original for edited wherever
 * the page shows it — text nodes, alt/title/placeholder, and images (matched
 * on the file stem, since the bundler renames assets). It re-applies on every
 * DOM change, so a re-render never puts the original back.
 *
 * It is deliberately framework-blind: no source file has to change beyond one
 * <script> tag in index.html, and the design and animation stay exactly as
 * the code renders them.
 */
(function () {
  "use strict";
  var me = document.currentScript;
  var base = (me && me.src ? me.src.replace(/[^/]*$/, "") : "/");   // …/mu-content.js -> …/
  var norm = function (s) { return String(s).replace(/\s+/g, " ").trim(); };
  var stem = function (p) { return String(p).split("/").pop().replace(/\.[^.]+$/, ""); };
  var texts = {}, media = [], mute = false, pending = null, loaded = false;

  function apply(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode;
      if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE") continue;
      var k = norm(n.nodeValue);
      if (k && Object.prototype.hasOwnProperty.call(texts, k)) {
        n.nodeValue = n.nodeValue.match(/^\s*/)[0] + texts[k] + n.nodeValue.match(/\s*$/)[0];
      }
    }
    var els = root.querySelectorAll ? root.querySelectorAll("[alt],[title],[placeholder],[aria-label],img[src],video[src],source[src]") : [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      for (var a = 0, A = ["alt", "title", "placeholder", "aria-label"]; a < A.length; a++) {
        var v = el.getAttribute(A[a]);
        if (v != null && Object.prototype.hasOwnProperty.call(texts, norm(v))) el.setAttribute(A[a], texts[norm(v)]);
      }
      var src = el.getAttribute("src");
      if (src) for (var j = 0; j < media.length; j++) {
        if (src.indexOf("/" + media[j].stem + "-") >= 0 || src.indexOf("/" + media[j].stem + ".") >= 0) el.setAttribute("src", media[j].to);
      }
    }
  }
  function schedule() {
    if (pending || !loaded) return;
    pending = setTimeout(function () { pending = null; if (!document.body) return; mute = true; apply(document.body); mute = false; }, 30);
  }

  var route = location.pathname.replace(/\/+$/, "") || "/";
  var siteBase = base.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
  if (siteBase && route.indexOf(siteBase) === 0) route = route.slice(siteBase.length) || "/";

  fetch(base + "content/routes.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (routes) {
      var slug = routes[route];
      if (!slug) return null;
      return fetch(base + "content/" + slug + ".json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; });
    })
    .then(function (d) {
      if (!d || !d.fields || !d.source) return;
      for (var key in d.fields) {
        if (!Object.prototype.hasOwnProperty.call(d.source, key)) continue;
        var from = d.source[key], to = d.fields[key];
        if (from === to || !to) continue;
        if (d.types && d.types[key] === "media") media.push({ stem: stem(from), to: to });
        else texts[norm(from)] = to;
      }
      loaded = true;
      if (document.body) { mute = true; apply(document.body); mute = false; }
      new MutationObserver(function () { if (!mute) schedule(); })
        .observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["src", "alt"] });
    })
    .catch(function () { /* no content: the page shows its own copy */ });
})();
