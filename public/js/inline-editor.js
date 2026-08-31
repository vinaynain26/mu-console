/* eslint-disable */
/**
 * Inline editor.
 *
 * Ships only to a signed-in user; a visitor's page carries nothing but the
 * data-c anchors.
 *
 * The editing surface is a right-hand sidebar rather than controls floated over
 * the page. Dropdowns and handles sitting on top of live UI fought the design
 * they were sitting on — a state picker parked over a button covered it and
 * passed clicks through to the link underneath. So: in Edit mode each section
 * gets one small "Edit" pill in its corner, and everything inside that section
 * — copy, button labels, link targets, states, images and video — is edited in
 * the sidebar, where there is room to lay it out properly.
 *
 * Typing directly on the page still works for text. Both surfaces write through
 * setField(), so they never disagree.
 */
(function () {
  "use strict";
  var BOOT = window.__MU_EDITOR__;
  if (!BOOT) return;

  var CAN = BOOT.can, SLUG = BOOT.slug, TAB = BOOT.tab;
  /* The editor also runs inside an instrumented app on its own origin. There
     the CMS is elsewhere and a SameSite cookie never arrives, so calls carry an
     explicit base URL and a bearer token. Empty base = same-origin studio. */
  var API = (BOOT.apiBase || "").replace(/\/+$/, "");
  var TOKEN = BOOT.token || null;
  var dirty = new Map();          // key -> new value
  var original = new Map();       // key -> value as loaded
  var meta = new Map();           // key -> field record from the API
  var sectionsById = new Map();   // section key -> { title, fields[] }
  var comments = new Map();
  var mode = "browse";
  var live = null;                // node being typed into
  var activeSection = null;

  /* Emphasis on this page is carried by CLASSES, and not the same class
     everywhere: the hero subtitle uses .textHighlight, one section uses
     .white-medium, another .black-medium, another .boldColor. A fixed three-
     button toolbar therefore applied the WRONG class half the time — hitting
     Bold on a .textHighlight word gave .font-semibold, which looks different.
     So the buttons are derived from what the block itself already uses. */
  var STYLE_NAMES = {
    "font-semibold": "Bold", "textHighlight": "Highlight",
    "white-medium": "Emphasis", "black-medium": "Emphasis",
    "boldColor": "Bold colour", "futureListBold": "Bold",
    "fr-TitleItalic": "Italic", "fr-HeadingItalic": "Italic",
    "textGradient": "Gradient", "bharatBold": "Bold", "font-white": "White",
    "industrySpan": "Emphasis",
  };
  /* Not every class on a span is a text style. These carry responsive
     visibility, geo targeting or block layout — offering them as formatting
     would let an editor break the page by "bolding" something. */
  var NOT_A_STYLE = /^(mob-|fellowship-geo|overlay|card|fr-Block|fr-Breather|tech)/;
  var ITALIC_CLASSES = ["fr-TitleItalic", "fr-HeadingItalic"];

  function italicClassFor(key) {
    var n = document.querySelector('[data-c="' + CSS.escape(key) + '"]');
    return n && n.tagName === "H1" ? "fr-TitleItalic" : "fr-HeadingItalic";
  }
  var prettyStyle = function (cls) { return STYLE_NAMES[cls] || cls; };

  /** The style buttons for one block: what it already uses, plus its italic. */
  function stylesForBlock(key) {
    var f = meta.get(key);
    var seen = [];
    var push = function (c) { if (c && seen.indexOf(c) < 0) seen.push(c); };
    var harvest = function (html, onlyKnown) {
      var m, re = /class="([^"]+)"/g;
      while ((m = re.exec(html || ""))) {
        m[1].split(/\s+/).forEach(function (c) {
          if (!c || NOT_A_STYLE.test(c)) return;
          if (onlyKnown && !STYLE_NAMES[c]) return;
          push(c);
        });
      }
    };
    harvest(valueOf(key), false);                       // this block's own styles first
    if (f) {
      var bucket = sectionsById.get(f.section_key || "");
      if (bucket) {
        bucket.fields.forEach(function (o) {
          if (o.tag === "rich" && o.key !== key) harvest(o.value, true);
        });
      }
    }
    push(italicClassFor(key));
    if (!seen.length) push("font-semibold");
    return seen.slice(0, 5).map(function (cls) {
      return { cls: cls, label: prettyStyle(cls), italic: ITALIC_CLASSES.indexOf(cls) >= 0 };
    });
  }

  /** Wrap the selection in a span, or unwrap it when it is already wrapped. */
  function applyHouseStyle(box, key, cls) {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    if (!box.contains(range.commonAncestorContainer)) return;

    var node = range.commonAncestorContainer;
    var host = node.nodeType === 3 ? node.parentNode : node;
    var existing = host.closest ? host.closest("span." + CSS.escape(cls)) : null;
    if (existing && box.contains(existing)) {
      var parent = existing.parentNode;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      parent.normalize();
      return;
    }

    if (range.collapsed) {
      var tn = range.startContainer;
      if (tn.nodeType !== 3 || !tn.textContent.trim()) return;
      var text = tn.textContent, i = range.startOffset, a = i, b2 = i;
      while (a > 0 && !/\s/.test(text[a - 1])) a--;
      while (b2 < text.length && !/\s/.test(text[b2])) b2++;
      if (a === b2) return;
      range = document.createRange();
      range.setStart(tn, a);
      range.setEnd(tn, b2);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    var span = document.createElement("span");
    span.className = cls;
    try { range.surroundContents(span); }
    catch (e) { span.appendChild(range.extractContents()); range.insertNode(span); }
    sel.removeAllRanges();
    var r2 = document.createRange();
    r2.selectNodeContents(span);
    sel.addRange(r2);
  }

  /** Strip styling from the SELECTION only — never the whole block. */
  function clearSelectionStyles(box) {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    if (range.collapsed || !box.contains(range.commonAncestorContainer)) return;
    var text = range.extractContents().textContent;
    range.insertNode(document.createTextNode(text));
    box.normalize();
  }

  var VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
  var isVideo = function (v) { return VIDEO_RE.test(String(v || "")); };

  /* ---------------- helpers ---------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function toast(msg, ms) {
    var t = el("div", "mu-toast", esc(msg));
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 220);
    }, ms || 2200);
  }
  async function api(url, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body) headers["Content-Type"] = "application/json";
    if (TOKEN) headers["Authorization"] = "Bearer " + TOKEN;
    opts.headers = headers;
    var res = await fetch(API + url, opts);
    var out = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(out.error || "Request failed (" + res.status + ")");
    return out;
  }
  function valueOf(key) {
    if (dirty.has(key)) return dirty.get(key);
    var f = meta.get(key);
    return f ? f.value : "";
  }

  /* ---------------- the one place a value changes ---------------- */
  function setField(key, value, opts) {
    opts = opts || {};
    if (!original.has(key)) {
      var f = meta.get(key);
      original.set(key, f ? f.value : "");
    }
    if (value === original.get(key)) dirty.delete(key);
    else dirty.set(key, value);

    // keep the page in step, unless the page is what just changed
    if (!opts.fromPage) {
      var node = document.querySelector('[data-c="' + CSS.escape(key) + '"]');
      if (node && node !== live) {
        if (node.hasAttribute("data-c-rich")) node.innerHTML = value;
        else node.textContent = value;
      }

      var link = document.querySelector('a[data-c-link="' + CSS.escape(key) + '"]');
      if (link) link.setAttribute("href", value);

      var stateHost = document.querySelector('[data-c-state="' + CSS.escape(key) + '"]');
      if (stateHost) applyState(stateHost, key, value);

      var media = document.querySelector('[data-c-media="' + CSS.escape(key) + '"]');
      if (media && media.tagName === "IMG" && !isVideo(value)) {
        media.src = value || media.dataset.muSrc || value;
        if (media.srcset) media.removeAttribute("srcset");   // or the browser keeps the old picture
      }
    }
    if (!opts.fromSidebar) syncSidebarInput(key, value);
    /* keep the app's own store true (silently — the DOM is already patched),
       so a structural re-render doesn't roll this edit back */
    if (window.__MU_RUNTIME__) window.__MU_RUNTIME__.applyLocal(key, value, true);
    markNode(key);
    refreshCount();
  }

  function applyState(host, key, value) {
    var f = meta.get(key);
    if (!f || !f.options) return;
    var all = [];
    f.options.forEach(function (o) { all = all.concat(String(o.value).split(/\s+/).filter(Boolean)); });
    all.forEach(function (t) { host.classList.remove(t); });
    String(value).split(/\s+/).filter(Boolean).forEach(function (t) { host.classList.add(t); });
  }

  /** Put one field back to what it was before this session's edits. */
  function revertField(key) {
    if (!original.has(key)) return;
    // a field being typed in is skipped by setField's page sync — release it
    if (live && live.dataset.c === key) stopTyping();
    setField(key, original.get(key));
    var f = meta.get(key);
    if (f) f.value = original.get(key);
  }

  function revertAll() {
    if (!dirty.size) return;
    if (!confirm("Undo all " + dirty.size + " unsaved change(s) on this page?")) return;
    Array.from(dirty.keys()).forEach(revertField);   // a Map iterator has no .length — slice.call gave []
    toast("Changes undone");
  }

  function markNode(key) {
    var d = dirty.has(key);
    if (side) {
      var row = side.querySelector('[data-row="' + CSS.escape(key) + '"]');
      if (row) row.classList.toggle("is-dirty", d);
    }
    ["[data-c=", "[data-c-link=", "[data-c-state=", "[data-c-media="].forEach(function (sel) {
      var n = document.querySelector(sel + '"' + CSS.escape(key) + '"]');
      if (n) n.classList.toggle("mu-dirty", d);
    });
  }

  /* ---------------- toolbar ---------------- */
  var bar, elCount, btnSave, btnPub, btnUndo;

  function buildBar() {
    bar = el("div", "mu-bar");
    var seg = el("div", "mu-seg");
    [["browse", "Browse"], ["edit", "Edit"], ["arrange", "Arrange"]].forEach(function (m) {
      if (m[0] === "edit" && !CAN.edit) return;
      if (m[0] === "arrange" && !CAN.reorder) return;
      var b = el("button", m[0] === mode ? "on" : "", m[1]);
      b.dataset.mode = m[0];
      b.addEventListener("click", function () { setMode(m[0]); });
      seg.appendChild(b);
    });
    bar.appendChild(seg);

    elCount = el("div", "mu-count", "");
    bar.appendChild(elCount);
    bar.appendChild(el("div", "mu-sep"));

    if (CAN.edit) {
      btnSave = el("button", "mu-btn", "Save draft");
      btnSave.disabled = true;
      btnSave.addEventListener("click", save);
      bar.appendChild(btnSave);
    }
    if (CAN.edit) {
      btnUndo = el("button", "mu-btn", "Undo all");
      btnUndo.disabled = true;
      btnUndo.addEventListener("click", revertAll);
      bar.appendChild(btnUndo);
    }
    if (CAN.publish) {
      btnPub = el("button", "mu-btn pri", "Publish");
      btnPub.addEventListener("click", publish);
      bar.appendChild(btnPub);
    }
    var prev = el("a", "mu-btn", BOOT.preview ? "Live" : "Preview");
    prev.href = "/page/" + SLUG + "?tab=" + encodeURIComponent(TAB) + (BOOT.preview ? "" : "&preview=1");
    bar.appendChild(prev);

    var studio = el("a", "mu-btn", "Studio ↗");
    studio.href = (BOOT.consoleBase || "") + BOOT.consoleUrl + "/page/" + SLUG;
    bar.appendChild(studio);

    bar.appendChild(el("span", "mu-role", esc(BOOT.user.role)));

    document.body.appendChild(bar);
    refreshCount();
  }

  function refreshCount() {
    var n = dirty.size;
    elCount.innerHTML = n ? "<b>" + n + "</b> unsaved" : (BOOT.preview ? "Previewing draft" : "No changes");
    if (btnSave) btnSave.disabled = !n;
    if (btnUndo) btnUndo.disabled = !n;
  }

  /* ---------------- modes ---------------- */
  function setMode(m) {
    if (mode === "edit" && m !== "edit") { stopTyping(); closeSidebar(); }
    mode = m;
    document.body.classList.toggle("mu-editing", m === "edit");
    document.body.classList.toggle("mu-arranging", m === "arrange");
    Array.prototype.forEach.call(bar.querySelectorAll(".mu-seg button"), function (b) {
      b.classList.toggle("on", b.dataset.mode === m);
    });
    if (m === "arrange") enterArrange(); else exitArrange();
    if (m === "edit") {
      loadComments();
      loadMeta().then(function () { addSectionPills(); watchDom(); });
    } else {
      removeSectionPills();
      unwatchDom();
    }
  }

  /* ---------------- continuous adoption ----------------
     The dossier remounts its slide on every advance, and React re-renders
     replace nodes the sight pass had anchored — so anything adopted there
     stopped LOOKING editable moments later. Watch the DOM and re-run the
     pass, so what is editable stays visibly editable while flipping through
     slides, opening accordions, or after the editor itself re-renders a list. */
  var domObs = null, readoptTimer = null, obsMuted = false;
  function watchDom() {
    if (domObs) return;
    domObs = new MutationObserver(function (muts) {
      if (obsMuted || mode !== "edit" || live) return;
      var relevant = false;
      for (var i = 0; i < muts.length && !relevant; i++) {
        var tgt = muts[i].target;
        if (tgt && tgt.nodeType !== 1) tgt = tgt.parentElement;
        if (!tgt || !tgt.closest) continue;
        if (tgt.closest(".mu-bar, .mu-side, .mu-toast, .mu-pill, .mu-auth")) continue;
        relevant = true;
      }
      if (!relevant) return;
      clearTimeout(readoptTimer);
      readoptTimer = setTimeout(function () {
        if (mode !== "edit" || live || !meta.size) return;
        // only pages the sight pass grouped — a template page's server-sent
        // sections must never be re-drawn by sight
        if (!document.querySelector("[data-mu-vsec]")) return;
        obsMuted = true;   // our own attribute/span writes must not re-trigger the pass
        try {
          /* a React re-render that replaced a section's children takes the
             injected pill with it — if any grouped section lost its pill,
             re-place them all (addSectionPills runs the sight pass itself) */
          var orphaned = false;
          sectionsById.forEach(function (b) {
            if (b.host && b.host.isConnected && !b.host.querySelector(".mu-pill")) orphaned = true;
          });
          if (orphaned) addSectionPills();
          else regroupBySight();
        } finally { setTimeout(function () { obsMuted = false; }, 0); }
      }, 350);
    });
    domObs.observe(document.body, { childList: true, subtree: true });
  }
  function unwatchDom() {
    if (domObs) { domObs.disconnect(); domObs = null; }
    clearTimeout(readoptTimer);
  }

  /* ---------------- data ---------------- */
  async function loadMeta() {
    try {
      var data = await api("/api/pages/" + SLUG + "/content");
      meta.clear(); sectionsById.clear();
      (data.tabs || []).forEach(function (t) {
        (t.sections || []).forEach(function (sec) {
          var bucket = sectionsById.get(sec.key) || { title: sec.title, fields: [] };
          (sec.fields || []).forEach(function (f) {
            f.__src = sec.key;      // the source file that carried this string
            /* An instrumented app records what it saw — src, poster, href —
               not what the studio's ingest calls it. Normalise so an image
               gets the image card and a link gets the link row. */
            if (f.tag === "src" || f.tag === "poster") f.tag = "media";
            else if (f.tag === "href" || f.tag === "to") f.tag = "link";
            meta.set(f.key, f);
            bucket.fields.push(f);
          });
          sectionsById.set(sec.key, bucket);
        });
      });
    } catch (e) { toast("Could not load fields: " + e.message, 3500); }
  }
  async function loadComments() {
    if (!CAN.comment) return;
    try {
      var list = await api("/api/pages/" + SLUG + "/comments");
      comments.clear();
      list.forEach(function (c) {
        if (c.resolved) return;
        if (!comments.has(c.field_key)) comments.set(c.field_key, []);
        comments.get(c.field_key).push(c);
      });
    } catch (e) { /* optional chrome */ }
  }

  /* ---------------- section pills ---------------- */
  var pills = [];
  function addSectionPills() {
    removeSectionPills();

    /* A template page renders data-sec wrappers, so the server already said
       where every section starts. An app page carries no such wrappers — and
       its API sections are SOURCE FILES, not places: one component file holds
       225 strings spread over the entire page, so its "section" was the page.
       There, regroup by what a reader actually sees before placing anything. */
    var served = document.querySelectorAll("[data-sec]:not([data-mu-vsec])");
    if (!served.length) regroupBySight();

    function place(host, key, bucket) {
      if (!host || !bucket) return;
      if (!(host.offsetParent !== null || host.getClientRects().length)) return;
      var b0 = bucketsFor(key);
      var total = b0 ? b0.all.length + b0.details.length : 0;
      if (!total && !(b0 && b0.lists.length)) return;

      var name = bucket.title || "section";
      if (name.length > 26) name = name.slice(0, 25).replace(/\s+\S*$/, "") + "\u2026";
      var pill = el("button", "mu-pill");
      pill.type = "button";
      pill.innerHTML = '<span class="mu-pill__i">\u270e</span> Edit \u201c' + esc(name) + '\u201d' +
        '<span class="mu-pill__n">' + total + "</span>";
      pill.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        openSidebar(key);
      });
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(pill);
      if (/^(HEADER|NAV)$/.test(host.tagName)) {
        // a bar's own corner holds its CTA — hang the pill just below instead
        pill.classList.add("mu-pill--bar");
      } else if (host.getBoundingClientRect().height > window.innerHeight * 0.85) {
        // a full-screen section's corners belong to the page's own fixed
        // controls (Watch intro, arrows) — hold the right edge instead
        pill.classList.add("mu-pill--tall");
      } else {
        // only sections that actually start under a pinned header need the offset
        var inset = topInset();
        if (inset && host.getBoundingClientRect().top < inset + 40) {
          pill.style.setProperty("top", (inset + 12) + "px", "important");
        }
      }
      pills.push(pill);
    }

    if (served.length) {
      // a template may render one section as several wrappers — pin each
      Array.prototype.forEach.call(served, function (sec) {
        place(sec, sec.dataset.sec, sectionsById.get(sec.dataset.sec));
      });
    } else {
      sectionsById.forEach(function (bucket, key) { place(bucket.host, key, bucket); });
    }
  }

  /* Rebuild sectionsById around the page's own <section>/<nav>/<footer>
     elements. Each field is found on the page — by its anchor when the build
     wrapped it, otherwise by matching its value against the rendered text,
     attributes or URLs — and bucketed under the landmark it sits in. A field
     that is nowhere on this page gets no pill and no sidebar row: the shared
     bucket carries every page's components, and offering a programme page's
     copy on the home page is what made the list unusable. */
  function regroupBySight() {
    // entering Edit twice must not stack a second pass on the first
    Array.prototype.forEach.call(document.querySelectorAll("[data-mu-vsec]"), function (n) {
      n.removeAttribute("data-sec");
      n.removeAttribute("data-mu-vsec");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-mu-adopted]"), function (n) {
      n.removeAttribute("data-c");
      n.removeAttribute("data-c-media");
      n.removeAttribute("data-mu-adopted");
    });
    /* spans this editor wrapped around split text ("FIND YOUR" beside an
       italic "Path.") dissolve back into plain text before re-matching */
    Array.prototype.forEach.call(document.querySelectorAll("[data-mu-wrapped]"), function (sp) {
      while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp);
      sp.remove();
    });

    var norm = function (s) {
      return String(s == null ? "" : s)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;|\u00a0/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
    };
    var urlKey = function (u) {
      u = String(u == null ? "" : u).trim();
      return u ? u.split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, "") : "";
    };

    /* One walk of the document builds every index a field could match on.
       Keys are lowercased: the page often renders uppercase via CSS
       (text-transform), and "FIND YOUR" must still find "Find your". */
    var lc = function (s) { return norm(s).toLowerCase(); };
    var byText = new Map(), byAttr = new Map(), byUrl = new Map();
    var pushTo = function (map, k, node) {
      if (!k) return;
      var a = map.get(k);
      if (!a) { a = []; map.set(k, a); }
      a.push(node);
    };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    for (var n = walker.nextNode(); n; n = walker.nextNode()) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(n.tagName)) continue;
      if (n.closest(".mu-bar, .mu-side, .mu-toast, .mu-pill, .mu-auth")) continue;
      var raw = n.textContent;
      if (raw && raw.length <= 600) {
        var t = lc(raw);
        if (t && t.length <= 400) pushTo(byText, t, n);
        /* a split headline — "FIND YOUR" beside an italic "Path." — never
           equals its element's whole text; index the pieces too */
        for (var ci = 0; ci < n.childNodes.length; ci++) {
          var cn = n.childNodes[ci];
          if (cn.nodeType !== 3) continue;
          var pt = lc(cn.nodeValue);
          if (pt && pt.length >= 2 && pt !== t) pushTo(byText, pt, n);
        }
      }
      for (var ai = 0; ai < ATTRS.length; ai++) {
        var av = n.getAttribute(ATTRS[ai]);
        if (av) pushTo(byAttr, lc(av), n);
      }
      for (var ui = 0; ui < URL_ATTRS.length; ui++) {
        var uv = n.getAttribute(URL_ATTRS[ui]);
        if (uv) pushTo(byUrl, urlKey(uv), n);
      }
      var st = n.getAttribute("style");
      if (st) {
        var m = /url\(["']?([^"')]+)/.exec(st);
        if (m) pushTo(byUrl, urlKey(m[1]), n);
      }
    }

    var locate = function (f) {
      var sel = CSS.escape(f.key);
      var a = document.querySelector(
        '[data-c="' + sel + '"], [data-c-media="' + sel + '"], ' +
        '[data-c-link="' + sel + '"], [data-c-state="' + sel + '"]');
      if (a) return [a];
      var v = String(f.value == null ? "" : f.value).trim();
      /* A bundled image has no value in the CMS — the build renamed the file
         (mu-01.webp -> mu-01-B2xq.webp), so the seeder stored the source
         filename as the label and we match on its stem. */
      if (!v && f.tag === "media" && /\.(png|jpe?g|webp|svg|gif|avif|mp4|webm)$/i.test(f.label || "")) {
        var stem = f.label.replace(/\.[a-z0-9]+$/i, "");
        var hits = [];
        byUrl.forEach(function (els2, k2) {
          var b = k2.split("/").pop();
          if (b === f.label || b.indexOf(stem + "-") === 0 || b.indexOf(stem + ".") === 0) {
            hits = hits.concat(els2);
          }
        });
        return hits.length ? hits : null;
      }
      /* An empty image SLOT has no picture to find — its label is the copy it
         sits beside (the news card's headline), so place it by that. */
      if (!v && f.tag === "media" && (f.label || "").length >= 12) {
        var near = byText.get(lc(f.label.replace(/\u2026$/, "")));
        if (near) return near;
      }
      if (!v) return null;
      if (/^(https?:)?\//.test(v) || /\.(png|jpe?g|webp|svg|gif|avif|mp4|webm|mov)([?#]|$)/i.test(v)) {
        var hit = byUrl.get(urlKey(v));
        if (hit) return hit;
      }
      var t = lc(v);
      if (!t) return null;
      var els = byText.get(t) || byAttr.get(t);
      if (!els) return null;
      // deepest matches only: a heading's text is also its whole section's text
      return els.filter(function (c) {
        return !els.some(function (o) { return o !== c && c.contains(o); });
      });
    };

    /* The landmark a node sits in — the nearest section-like ancestor, or the
       top-level block when the page never wrapped this part in one. A nav
       inside a header belongs to the header; a small floating control (the
       fixed play button over the hero) belongs to the landmark before it, not
       to a pill of its own crammed inside a 40px button. */
    var hostOf = function (node) {
      var cur = node, nav = null;
      while (cur && cur !== document.body) {
        if (/^(SECTION|HEADER|FOOTER)$/.test(cur.tagName)) return cur;
        if (cur.tagName === "NAV") nav = cur;    // outermost nav wins
        var p = cur.parentElement;
        if (p && (p.tagName === "MAIN" || p === document.body)) {
          if (nav) return nav;
          var cs = getComputedStyle(cur);
          if (cs.position === "fixed") {
            /* A floating control belongs to whatever it floats over — the
               rewatch button sits on the header, whatever the tree says. */
            var r = cur.getBoundingClientRect();
            var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            if (cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight) {
              var under = document.elementsFromPoint(cx, cy);
              for (var k = 0; k < under.length; k++) {
                if (/^(SECTION|HEADER|FOOTER|NAV)$/.test(under[k].tagName) &&
                    under[k] !== cur && !cur.contains(under[k])) return under[k];
              }
            }
          }
          if (cur.getBoundingClientRect().height < 200 || cs.position === "absolute") {
            var sib = cur.previousElementSibling;
            while (sib && !/^(SECTION|HEADER|FOOTER|NAV)$/.test(sib.tagName)) sib = sib.previousElementSibling;
            if (!sib) {           // a control rendered before its section folds forward
              sib = cur.nextElementSibling;
              while (sib && !/^(SECTION|HEADER|FOOTER|NAV)$/.test(sib.tagName)) sib = sib.nextElementSibling;
            }
            if (sib) return sib;
          }
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    var titleOf = function (host) {
      var h = host.querySelector("h1, h2, h3, h4");
      // innerText, not textContent: stacked <span> lines need the space back
      var t = h ? norm(h.innerText || h.textContent) : "";
      if (t) return t.length > 34 ? t.slice(0, 33).replace(/\s+\S*$/, "") + "\u2026" : t;
      if (host.id) {
        return host.id.replace(/[-_]+/g, " ")
          .replace(/^./, function (c) { return c.toUpperCase(); });
      }
      return { HEADER: "Header", NAV: "Navigation", FOOTER: "Footer" }[host.tagName] || "Section";
    };

    /* A value owned by more than one key cannot be placed by matching alone:
       three keys hold "About" — the nav's, the footer's, the mobile bar's —
       and each matches all three places. But the keys came from different
       SOURCE FILES, and a file's unambiguous fields have already shown which
       part of the page that file renders. So: place the certain fields first,
       then give each ambiguous one the candidate landmark where its own file
       already lives. No file-mate there — no pill; the studio still lists it. */
    var owners = new Map();
    meta.forEach(function (f) {
      var t = lc(f.value);
      if (t) owners.set(t, (owners.get(t) || 0) + 1);
    });

    var groups = new Map();   // host element -> { host, entries: [{f, node}] }
    var fileHosts = new Map();  // source file -> Map(host -> placed count)
    var claim = function (f, node, host) {
      var g = groups.get(host);
      if (!g) { g = { host: host, entries: [] }; groups.set(host, g); }
      g.entries.push({ f: f, node: node });
      f.__node = node;              // where it sits, for sidebar order and grouping
      var fh = fileHosts.get(f.__src);
      if (!fh) { fh = new Map(); fileHosts.set(f.__src, fh); }
      fh.set(host, (fh.get(host) || 0) + 1);

      /* A data field has no build-time anchor, but we just FOUND its node.
         Tagging it makes it behave like anchored copy — click to type, live
         sync from the sidebar — but only when the node holds nothing except
         this text, so typing cannot eat sibling markup. An image adopts as a
         media anchor instead, remembering the src it rendered with so an
         Undo can put the picture back. */
      if (f.tag === "media") {
        if (/^(IMG|VIDEO)$/.test(node.tagName) && !node.hasAttribute("data-c-media")) {
          node.setAttribute("data-c-media", f.key);
          node.setAttribute("data-mu-adopted", "1");
          if (!node.dataset.muSrc) node.dataset.muSrc = node.currentSrc || node.src || "";
        }
        return;
      }
      if (!node.hasAttribute("data-c") && !node.hasAttribute("data-c-media") &&
          f.tag !== "rich" &&
          String(f.value).trim() &&
          String(f.value).indexOf("<") < 0) {
        if (node.childElementCount === 0 && lc(node.textContent) === lc(f.value)) {
          node.setAttribute("data-c", f.key);
          node.setAttribute("data-mu-adopted", "1");
        } else {
          /* the value is one PIECE of this element — "FIND YOUR" next to an
             italic "Path." — so give that text node a span of its own to
             carry the anchor. Dissolved on every re-pass; if React re-renders
             the node away, the next pass simply wraps it again. */
          for (var wi = 0; wi < node.childNodes.length; wi++) {
            var wtn = node.childNodes[wi];
            if (wtn.nodeType !== 3 || lc(wtn.nodeValue) !== lc(f.value)) continue;
            var wsp = document.createElement("span");
            wsp.setAttribute("data-c", f.key);
            wsp.setAttribute("data-mu-adopted", "1");
            wsp.setAttribute("data-mu-wrapped", "1");
            node.insertBefore(wsp, wtn);
            wsp.appendChild(wtn);
            break;
          }
        }
      }
    };

    var taken = new Set();   // a visible thing belongs to ONE field
    var ambiguous = [];
    meta.forEach(function (f) {
      var sel = CSS.escape(f.key);
      var anchor = document.querySelector(
        '[data-c="' + sel + '"], [data-c-media="' + sel + '"], ' +
        '[data-c-link="' + sel + '"], [data-c-state="' + sel + '"]');
      if (!anchor && (owners.get(lc(f.value)) || 0) > 1) {
        ambiguous.push(f);
        return;
      }
      var els = locate(f);
      if (!els || !els.length) return;
      var seen = [];
      els.forEach(function (node) {
        // media placed by a nearby label shares that node with the label's
        // own field — placement is not ownership, so it never takes the node.
        // A PIECE of an element ("FIND" and "YOUR" in one heading) shares the
        // element with its sibling pieces, so it never takes it either.
        var partial = f.tag !== "media" && lc(node.textContent) !== lc(f.value);
        var owns = f.tag !== "media" && !partial;
        if (owns && taken.has(node)) return;
        var host = hostOf(node);
        if (!host || seen.indexOf(host) >= 0) return;
        seen.push(host);
        if (owns) taken.add(node);
        claim(f, node, host);
      });
    });

    ambiguous.forEach(function (f) {
      var els = locate(f);
      if (!els || !els.length) return;
      var fh = fileHosts.get(f.__src);
      if (!fh) return;
      var bestHost = null, bestNode = null, bestScore = 0;
      var partial = f.tag !== "media";
      els.forEach(function (node) {
        var whole = !partial || lc(node.textContent) === lc(f.value);
        if (whole && taken.has(node)) return;
        var host = hostOf(node);
        if (!host) return;
        var score = fh.get(host) || 0;
        if (score > bestScore) { bestScore = score; bestHost = host; bestNode = node; }
      });
      if (bestHost) {
        if (lc(bestNode.textContent) === lc(f.value)) taken.add(bestNode);
        claim(f, bestNode, bestHost);
      }
    });

    var before = function (x, y) {
      return x === y ? 0
        : (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    };
    var hosts = Array.from(groups.keys()).sort(before);

    sectionsById.clear();
    var used = {};
    hosts.forEach(function (host, i) {
      var g = groups.get(host);
      /* READING order, not DOM order: a two-column slide interleaves its
         columns in the source, but a person scans top-to-bottom then
         left-to-right — so should the sidebar. Rows within ~40px count as
         one line; document order breaks the remaining ties. */
      g.entries.sort(function (x, y) {
        var a = x.node.getBoundingClientRect(), b = y.node.getBoundingClientRect();
        var band = Math.round(a.top / 40) - Math.round(b.top / 40);
        if (band) return band;
        if (Math.abs(a.left - b.left) > 4) return a.left - b.left;
        return before(x.node, y.node);
      });
      var key = "v-" + (host.id || host.tagName.toLowerCase() + "-" + i);
      while (used[key]) key += "b";
      used[key] = 1;
      host.setAttribute("data-sec", key);
      host.setAttribute("data-mu-vsec", "1");
      var fields = [];
      g.entries.forEach(function (e) {
        if (fields.indexOf(e.f) < 0) fields.push(e.f);
        e.f.section_key = key;    // stylesForBlock reads this to find siblings
      });
      sectionsById.set(key, { title: titleOf(host), fields: fields, host: host });
    });

    /* a list's structure row has no DOM presence of its own — file it with
       the section where its items' fields landed, so the Items tab shows up
       when that part of the page is opened */
    meta.forEach(function (f) {
      if (f.type !== "list") return;
      var prefix = f.key.split(".list:")[0] + ".";
      var best = null, bestN = 0;
      sectionsById.forEach(function (bkt, k) {
        var n = 0;
        bkt.fields.forEach(function (x) { if (x.key.indexOf(prefix) === 0) n++; });
        if (n > bestN) { bestN = n; best = k; }
      });
      if (best) {
        var bkt = sectionsById.get(best);
        if (bkt.fields.indexOf(f) < 0) bkt.fields.push(f);
        f.section_key = best;
      }
    });
  }
  var ATTRS = ["aria-label", "alt", "placeholder", "title", "value"];
  var URL_ATTRS = ["src", "href", "poster"];

  function removeSectionPills() {
    pills.forEach(function (p) { p.remove(); });
    pills = [];
    Array.prototype.forEach.call(document.querySelectorAll(".mu-sec-active"), function (n) {
      n.classList.remove("mu-sec-active");
    });
  }
  function notMeta(f) { return f.tag !== "meta"; }

  /* An editor should never have to know what a <span> is. */
  var FRIENDLY = {
    h1: "Heading", h2: "Heading", h3: "Heading", h4: "Heading", h5: "Heading", h6: "Heading",
    p: "Paragraph", span: "Text", text: "Text", li: "List item", a: "Link text",
    button: "Button text", th: "Table heading", td: "Table cell", label: "Label",
    strong: "Bold text", b: "Bold text", em: "Italic text", i: "Italic text",
    div: "Text", small: "Small text", caption: "Caption", figcaption: "Caption",
    blockquote: "Quote", dt: "Term", dd: "Definition", summary: "Summary",
    media: "Image or video", image: "Image", link: "Link", state: "State", rich: "Text block",
    "aria-label": "Screen-reader label", alt: "Image description", title: "Page title",
    placeholder: "Placeholder", name: "Name", role: "Role", headline: "Headline",
    quote: "Quote", pullQuote: "Pull quote", closing: "Closing line", tag: "Tag",
    stat: "Stat", eyebrow: "Eyebrow", heading: "Heading", body: "Paragraph",
    proof: "Proof point", chips: "Chip", cta: "Button text", description: "Description",
    tagline: "Tagline", note: "Note", blurb: "Blurb", summary2: "Summary",
    value: "Stat", statLabel: "Stat label", n: "Number", delta: "Change indicator",
    pct: "Percentage", l: "Stat label", v: "Stat value", lede: "Intro paragraph",
    titleItalic: "Heading (italic part)", designation: "Title & company",
    chapter: "Tag", links: "Footer link", subtitle: "Subtitle", subheading: "Subheading",
    month: "Month", day: "Day", time: "Time", source: "Source", duration: "Duration",
    deadline: "Deadline", nextDate: "Date", location: "Location", company: "Company",
    action: "Button text", kicker: "Kicker", question: "Question", answer: "Answer",
  };
  var friendly = function (tag) {
    if (FRIENDLY[tag]) return FRIENDLY[tag];
    // an unknown prop name still reads better spelled out than as "Text"
    var t = String(tag || "").replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "Text";
  };

  /* A fixed or sticky header would sit over a pill placed at the very top of the
     page, so measure whatever is pinned up there and start below it. */
  function topInset() {
    var inset = 0;
    Array.prototype.forEach.call(document.body.querySelectorAll("header, nav, .navbar, [class*=header], [class*=nav]"), function (n) {
      var cs = getComputedStyle(n);
      if (cs.position !== "fixed" && cs.position !== "sticky") return;
      var r = n.getBoundingClientRect();
      if (r.top <= 4 && r.height > 8 && r.height < 220) inset = Math.max(inset, r.bottom);
    });
    return Math.round(inset);
  }

  /* ---------------- sidebar ---------------- */
  var side = null;

  function closeSidebar() {
    if (side) { side.remove(); side = null; }
    document.body.classList.remove("mu-side-open");
    Array.prototype.forEach.call(document.querySelectorAll(".mu-sec-active"), function (n) {
      n.classList.remove("mu-sec-active");
    });
    activeSection = null;
  }

  var sideTab = "all";

  function bucketsFor(sectionKey) {
    var bucket = sectionsById.get(sectionKey);
    if (!bucket) return null;
    var fields = bucket.fields.filter(notMeta);
    var buttons = buttonGroups(fields);

    /* Everything, in the order it appears on the page. Splitting copy from its
       buttons meant opening a section, then leaving it to find the button that
       belongs to it — and the tabs were showing fields out of sequence, so a
       paragraph from the bottom sat above the headline. */
    var consumed = {};
    buttons.forEach(function (g) {
      if (g.label) consumed[g.label.key] = 1;
      if (g.link) consumed[g.link.key] = 1;
      if (g.state) consumed[g.state.key] = 1;
      (g.icons || []).forEach(function (ic) { consumed[ic.key] = 1; });
    });

    /* lists: the structure rows for this section, each carrying its code
       items in options and any CMS-born items as sibling field rows */
    var lists = fields.filter(function (f) { return f.type === "list"; });

    /* Screen-reader labels and placeholders matter, but they are one level
       deeper than the copy an editor came for — folded away, not mixed in. */
    var DETAIL_TAGS = { "aria-label": 1, placeholder: 1, alt: 1 };

    var all = [], details = [];
    fields.forEach(function (f) {
      if (f.type === "list") return;                             // shown on the Items tab
      if (f.tag === "image" && /@poster$/.test(f.key)) return;   // shown with its media
      if (DETAIL_TAGS[f.tag] && !consumed[f.key]) { details.push(f); return; }
      if (consumed[f.key]) {
        // emit the button card at the position of its FIRST field
        var g = buttons.filter(function (x) {
          return (x.state && x.state.key === f.key) || (x.link && x.link.key === f.key) ||
                 (x.label && x.label.key === f.key) ||
                 (x.icons || []).some(function (ic) { return ic.key === f.key; });
        })[0];
        if (g && !g.__emitted) { g.__emitted = 1; all.push({ kind: "button", group: g }); }
        return;
      }
      if (f.tag === "media") all.push({ kind: "media", field: f });
      else all.push({ kind: "text", field: f });
    });
    buttons.forEach(function (g) { delete g.__emitted; });

    return {
      title: bucket.title,
      all: all,
      details: details,
      buttons: buttons,
      lists: lists,
      images: fields.filter(function (f) {
        if (f.tag !== "media") return false;
        var n = document.querySelector('[data-c-media="' + CSS.escape(f.key) + '"]');
        return !(n && n.closest("a[data-c-link], [data-c-state]"));
      }),
    };
  }

  function openSidebar(sectionKey, focusKey, doFocus) {
    var b = bucketsFor(sectionKey);
    if (!b) return;
    activeSection = sectionKey;

    Array.prototype.forEach.call(document.querySelectorAll(".mu-sec-active"), function (n) {
      n.classList.remove("mu-sec-active");
    });
    var host = document.querySelector('[data-sec="' + CSS.escape(sectionKey) + '"]');
    if (host) host.classList.add("mu-sec-active");

    if (!side) {
      side = el("div", "mu-side");
      /* The site scrolls through Lenis, which takes the wheel everywhere and
         would scroll the PAGE under a scrolling sidebar. Lenis honours this
         attribute on anything in the event's path. */
      side.setAttribute("data-lenis-prevent", "");
      document.body.appendChild(side);
      document.body.classList.add("mu-side-open");
    }

    // land on the tab that holds what was clicked: an image lands on
    // Images, everything else on Content
    if (focusKey) {
      var f = meta.get(focusKey);
      if (f) {
        var wantsImages = f.tag === "media" && b.images.some(function (x) {
          return x.key === focusKey.replace(/@poster$/, "");
        });
        sideTab = wantsImages ? "images" : "all";
      }
    }
    var tabHas = sideTab === "items" ? b.lists.length
      : sideTab === "all" ? (b.all.length + b.details.length)
      : (b[sideTab] && b[sideTab].length);
    if (!tabHas) {
      sideTab = (b.all.length + b.details.length) ? "all"
        : ["buttons", "images"].filter(function (t) { return b[t].length; })[0] ||
          (b.lists.length ? "items" : "all");
    }

    /* only tabs that hold something — a greyed-out tab is a question a
       non-developer cannot answer */
    var tabsHtml =
      (b.all.length || b.details.length ? tabBtn("all", "Content", b.all.length + b.details.length) : "") +
      (b.buttons.length ? tabBtn("buttons", "Buttons", b.buttons.length) : "") +
      (b.images.length ? tabBtn("images", "Images", b.images.length) : "") +
      (b.lists.length ? tabBtn("items", "Items", b.lists.reduce(function (n, f) {
        return n + listItemsOf(f).length;
      }, 0)) : "");

    side.innerHTML =
      '<div class="mu-side__head">' +
        '<div class="mu-side__title">' +
          '<div class="mu-side__eyebrow">You’re editing</div>' +
          '<div class="mu-side__h">' + esc(b.title) + "</div>" +
        "</div>" +
        '<button class="mu-side__x" type="button" title="Close (Esc)" aria-label="Close">✕</button>' +
      "</div>" +
      '<div class="mu-tabs">' + tabsHtml + "</div>" +
      '<div class="mu-side__body" id="mu-side-body"></div>' +
      '<div class="mu-side__foot">Everything here is a <b>draft</b> — nothing changes on the live site until you press Publish.</div>';

    side.querySelector(".mu-side__x").addEventListener("click", closeSidebar);
    side.querySelectorAll("[data-tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        if (t.disabled) return;
        sideTab = t.dataset.tab;
        renderTab(b);
      });
    });
    renderTab(b, focusKey, doFocus);
  }

  function tabBtn(key, label, n) {
    return '<button type="button" class="mu-tab' + (sideTab === key ? " on" : "") + '" data-tab="' + key + '"' +
      (n ? "" : " disabled") + ">" + esc(label) +
      '<span class="mu-tab__n">' + n + "</span></button>";
  }

  function renderTab(b, focusKey, doFocus) {
    side.querySelectorAll("[data-tab]").forEach(function (t) {
      t.classList.toggle("on", t.dataset.tab === sideTab);
    });
    var body = side.querySelector("#mu-side-body");
    var html;
    if (sideTab === "all") {
      /* Sixty flat rows are unreadable. The section's own sub-headings — the
         ones a reader scans on the page — become cluster labels, so the
         sidebar has the same shape as what it edits. */
      var host = activeSection ? document.querySelector('[data-sec="' + CSS.escape(activeSection) + '"]') : null;
      var heads = host ? Array.prototype.slice.call(host.querySelectorAll("h1, h2, h3, h4")) : [];
      var headTitle = function (h) {
        var t = (h.innerText || h.textContent || "").replace(/\s+/g, " ").trim();
        return t.length > 30 ? t.slice(0, 29).replace(/\s+\S*$/, "") + "\u2026" : t;
      };
      var nodeOf = function (item) {
        var f = item.field || (item.group && (item.group.label || item.group.state || item.group.link));
        if (!f) return null;
        var sel = CSS.escape(f.key);
        var n = document.querySelector('[data-c="' + sel + '"], [data-c-media="' + sel + '"], a[data-c-link="' + sel + '"]');
        if (n) return n;
        return f.__node && f.__node.isConnected ? f.__node : null;
      };
      // the last heading at or above this node; undefined = unknown, stay put
      var clusterOf = function (n) {
        if (!n) return undefined;
        var last = null;
        for (var i = 0; i < heads.length; i++) {
          if (heads[i] === n ||
              (heads[i].compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) last = heads[i];
          else break;
        }
        return last;
      };
      if (!b.all.length && !b.details.length) {
        html = empty("Nothing editable in this section.");
      } else {
        html = "";
        var cur = "__start";
        b.all.forEach(function (item) {
          var cl = clusterOf(nodeOf(item));
          if (cl !== undefined && cl !== cur) {
            cur = cl;
            var ct = cl ? headTitle(cl) : "";
            if (ct && ct !== b.title) html += '<div class="mu-grp__h">' + esc(ct) + "</div>";
          }
          if (item.kind === "button") html += buttonRow(item.group);
          else if (item.kind === "media") html += mediaRow(item.field);
          else html += textRow(item.field);
        });
        /* the deeper level: screen-reader labels, placeholders, image
           descriptions — present, labelled, out of the way */
        if (b.details.length) {
          html += '<details class="mu-adv" data-adv><summary>Details &amp; accessibility' +
            '<span class="mu-tab__n">' + b.details.length + "</span></summary>" +
            b.details.map(textRow).join("") + "</details>";
        }
      }
    } else if (sideTab === "buttons") {
      html = b.buttons.length ? b.buttons.map(buttonRow).join("") : empty("No buttons or links in this section.");
    } else if (sideTab === "items") {
      html = b.lists.length ? b.lists.map(listPanel).join("") : empty("No lists in this section.");
    } else {
      html = b.images.length ? b.images.map(mediaRow).join("") : empty("No images in this section.");
    }
    /* Tabs fix most of the scrolling, but a few sections genuinely hold dozens
       of fields. Offer a search there rather than making everyone scroll. */
    var count = sideTab === "all" ? b.all.length + b.details.length
              : sideTab === "buttons" ? b.buttons.length
              : sideTab === "items" ? b.lists.length : b.images.length;
    body.innerHTML = (count > 5
      ? '<input type="search" class="mu-filter" placeholder="Search this section…" data-filter>'
      : "") + '<div data-list>' + html + "</div>";
    body.scrollTop = 0;

    var filter = body.querySelector("[data-filter]");
    if (filter) {
      filter.addEventListener("input", function () {
        var q = filter.value.trim().toLowerCase();
        var adv = body.querySelector("[data-adv]");
        if (adv && q) adv.open = true;   // a search must be able to find the folded rows
        body.querySelectorAll("[data-row], .mu-card").forEach(function (row) {
          if (!q) { row.style.display = ""; return; }
          var input = row.querySelector("[data-f]");
          var text = ((input && input.value) || "") + " " + row.textContent;
          row.style.display = text.toLowerCase().indexOf(q) >= 0 ? "" : "none";
        });
        // cluster headings with nothing visible under them just add noise
        body.querySelectorAll("[data-list] > .mu-grp__h").forEach(function (h) {
          var n = h.nextElementSibling, any = false;
          while (n && !n.classList.contains("mu-grp__h")) {
            if ((n.hasAttribute("data-row") || n.classList.contains("mu-card")) &&
                n.style.display !== "none") { any = true; break; }
            n = n.nextElementSibling;
          }
          h.style.display = !q || any ? "" : "none";
        });
      });
    }
    wireSidebar();
    wireLists();
    if (focusKey) revealRow(focusKey, doFocus);
    else if (activeFieldKey) markActiveRow(activeFieldKey);
  }

  /* The drawer answers every click: the clicked thing's row scrolls to the
     centre and pulses. Focus moves into the drawer only for things you don't
     type on the page (images, links, states) — a text click keeps the cursor
     on the page and the drawer just mirrors. */
  var activeFieldKey = null;

  /* the row being edited keeps a solid ring — like the element on the page —
     until another field is chosen; the pulse only announces the arrival */
  function markActiveRow(key) {
    if (!side) return null;
    Array.prototype.forEach.call(side.querySelectorAll(".mu-row-active"), function (n) {
      n.classList.remove("mu-row-active");
    });
    activeFieldKey = key;
    var input = side.querySelector('[data-f="' + CSS.escape(key) + '"]') ||
                side.querySelector('[data-rich="' + CSS.escape(key) + '"]');
    var row = side.querySelector('[data-row="' + CSS.escape(key) + '"]') ||
              (input && input.closest(".mu-row, .mu-card, .mu-item"));
    var target = row || input;
    if (target) target.classList.add("mu-row-active");
    return { row: target, input: input };
  }

  function revealRow(key, doFocus) {
    if (!side) return;
    var m = markActiveRow(key);
    if (!m || !m.row) return false;
    m.row.scrollIntoView({ block: "center" });
    m.row.classList.remove("mu-row-flash");
    void m.row.offsetWidth;              // restart the pulse
    m.row.classList.add("mu-row-flash");
    setTimeout(function () { m.row.classList.remove("mu-row-flash"); }, 1700);
    if (doFocus && m.input && m.input.focus) { m.input.focus(); if (m.input.select) m.input.select(); }
    return true;
  }

  /* One door for every page click: same section, other section, any tab —
     the drawer lands on the clicked thing immediately. */
  function revealInDrawer(key, doFocus, node) {
    var f = meta.get(key) || meta.get(key.replace(/@poster$/, ""));
    var sec = null;
    if (node && node.closest) {
      var host = node.closest("[data-sec]");
      if (host && sectionsById.has(host.dataset.sec)) sec = host.dataset.sec;
    }
    if (!sec && f && f.section_key && sectionsById.has(f.section_key)) sec = f.section_key;
    if (!sec) return;
    if (!side || activeSection !== sec) { openSidebar(sec, key, doFocus); return; }
    var bx = bucketsFor(sec);
    if (!bx) return;
    var wantsImages = f && f.tag === "media" && bx.images.some(function (x) {
      return x.key === key.replace(/@poster$/, "");
    });
    var wantTab = wantsImages ? "images" : sideTab;
    if (!wantsImages && !side.querySelector('[data-f="' + CSS.escape(key) + '"]') &&
        !side.querySelector('[data-rich="' + CSS.escape(key) + '"]')) wantTab = "all";
    if (wantTab !== sideTab) { sideTab = wantTab; renderTab(bx, key, doFocus); return; }
    if (!revealRow(key, doFocus)) renderTab(bx, key, doFocus);
  }

  function section(title, inner) {
    return '<div class="mu-grp"><div class="mu-grp__h">' + esc(title) + "</div>" + inner + "</div>";
  }
  function empty(msg) { return '<div class="mu-empty">' + esc(msg) + "</div>"; }

  /* ---------------- collections ----------------
     A list field's options carry the code's items; CMS-born items are sibling
     rows keyed <listKey>.<itemId>.<prop>; the field's draft value is the
     structure JSON. This merges the three into what the page will render. */
  function cmsItemsOf(listKey) {
    var byId = {};
    meta.forEach(function (g, k) {
      if (k.indexOf(listKey + ".it-") !== 0) return;
      var rest = k.slice(listKey.length + 1);
      var id = rest.split(".")[0];
      var prop = rest.slice(id.length + 1);
      if (!prop) return;
      (byId[id] = byId[id] || {})[prop] = g;
    });
    return byId;
  }
  function listItemsOf(f) {
    var opts = f.options || {};
    var code = new Map();
    (opts.items || []).forEach(function (i) { code.set(i.id, i); });
    var cms = cmsItemsOf(f.key);
    var struct = null;
    try {
      var parsed = JSON.parse(valueOf(f.key) || "");
      if (parsed && Object.prototype.toString.call(parsed.items) === "[object Array]") struct = parsed.items;
    } catch (e) { /* unset — code order */ }

    var out = [], placed = {};
    var push = function (id, hidden, isCms) {
      var label;
      if (isCms) {
        var fs = cms[id] || {};
        var lf = fs.headline || fs.title || fs.name || fs.label || fs.heading;
        label = (lf && valueOf(lf.key)) || "New item";
        out.push({ id: id, hidden: !!hidden, cms: true, label: label, fields: fs });
      } else {
        var ci = code.get(id) || {};
        out.push({ id: id, hidden: !!hidden, cms: false, label: ci.label || id, fields: ci.fields || {} });
      }
    };
    if (struct) {
      struct.forEach(function (e) {
        if (!e || typeof e.id !== "string" || placed[e.id]) return;
        placed[e.id] = 1;
        if (e.src === "cms") { if (cms[e.id]) push(e.id, e.hidden, true); }
        else if (code.has(e.id)) push(e.id, e.hidden, false);
      });
      code.forEach(function (_, id) { if (!placed[id]) { placed[id] = 1; push(id, false, false); } });
      Object.keys(cms).forEach(function (id) { if (!placed[id]) push(id, false, true); });
    } else {
      code.forEach(function (_, id) { push(id, false, false); });
      Object.keys(cms).forEach(function (id) { push(id, false, true); });
    }
    return out;
  }

  /* the field to jump to when someone clicks an item's name */
  function itemGotoKey(it) {
    var order = ["headline", "title", "name", "label", "heading"];
    for (var i = 0; i < order.length; i++) {
      var v = it.fields && it.fields[order[i]];
      if (v) return typeof v === "string" ? v : v.key;
    }
    for (var p in it.fields) {
      var w = it.fields[p];
      return typeof w === "string" ? w : w.key;
    }
    return null;
  }

  function listPanel(f) {
    var items = listItemsOf(f);
    var name = (f.key.split("list:")[1] || "Items").replace(/[_-]+/g, " ").toLowerCase()
      .replace(/^raw /, "").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var shown = items.filter(function (x) { return !x.hidden; }).length;
    var rows = items.map(function (it, i) {
      var goto_ = itemGotoKey(it);
      return '<div class="mu-item' + (it.hidden ? " is-hidden" : "") + '" data-li="' + esc(it.id) + '" data-lk="' + esc(f.key) + '">' +
        '<div class="mu-item__row">' +
          '<span class="mu-item__n">' + (i + 1) + "</span>" +
          '<span class="mu-item__t"' + (goto_ ? ' data-goto="' + esc(goto_) + '" title="Edit this item’s text"' : "") + ">" +
            esc(it.label) +
            (it.hidden ? ' <em class="mu-item__badge">hidden</em>' : "") +
            (it.cms ? ' <em class="mu-item__badge mu-item__badge--new">added here</em>' : "") +
          "</span>" +
        "</div>" +
        '<div class="mu-item__acts">' +
          '<button type="button" class="mu-ib" data-lact="up" title="Move up">↑</button>' +
          '<button type="button" class="mu-ib" data-lact="down" title="Move down">↓</button>' +
          '<button type="button" class="mu-ib" data-lact="hide">' + (it.hidden ? "Show" : "Hide") + "</button>" +
          '<button type="button" class="mu-ib" data-lact="dup">Duplicate</button>' +
          (it.cms ? '<button type="button" class="mu-ib mu-ib--danger" data-lact="del">Delete</button>' : "") +
          (goto_ ? '<button type="button" class="mu-ib" data-goto="' + esc(goto_) + '">Edit text →</button>' : "") +
        "</div>" +
      "</div>";
    }).join("");
    return section(name + " — " + shown + " on the page",
      rows +
      '<button type="button" class="mu-add" data-ladd="' + esc(f.key) + '">＋ Add ' +
        esc(name.replace(/s$/i, "").toLowerCase() || "item") + "</button>" +
      '<div class="mu-hint">Reordering and hiding save to your draft immediately. ' +
      "Built-in items can be hidden, never deleted. Click an item’s name to edit its text.</div>");
  }

  async function saveStructure(f, items) {
    var payload = items.map(function (x) {
      var e = { id: x.id };
      if (x.cms) e.src = "cms";
      if (x.hidden) e.hidden = true;
      return e;
    });
    var out = await api("/api/pages/" + SLUG + "/lists/" + encodeURIComponent(f.key),
      { method: "PUT", body: JSON.stringify({ items: payload }) });
    var json = JSON.stringify({ items: out.items });
    f.value = json;
    if (window.__MU_RUNTIME__) window.__MU_RUNTIME__.applyLocal(f.key, json, false);
    var bb = bucketsFor(activeSection);
    if (bb) renderTab(bb);
  }

  function wireLists() {
    side.querySelectorAll("[data-lact]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var card = btn.closest("[data-li]");
        var listKey = card.getAttribute("data-lk"), id = card.getAttribute("data-li");
        var act = btn.getAttribute("data-lact");
        var f = meta.get(listKey);
        if (!f) return;
        var items = listItemsOf(f);
        var idx = -1;
        items.forEach(function (x, i) { if (x.id === id) idx = i; });
        if (idx < 0) return;
        try {
          if (act === "up" || act === "down") {
            var j = act === "up" ? idx - 1 : idx + 1;
            if (j < 0 || j >= items.length) return;
            var tmp = items[idx]; items[idx] = items[j]; items[j] = tmp;
            await saveStructure(f, items);
          } else if (act === "hide") {
            items[idx].hidden = !items[idx].hidden;
            await saveStructure(f, items);
          } else if (act === "dup") {
            var out = await api("/api/pages/" + SLUG + "/lists/" + encodeURIComponent(listKey) + "/items",
              { method: "POST", body: JSON.stringify({ copyFrom: id }) });
            adoptCmsItem(f, out, items[idx]);
            var again = listItemsOf(f);
            var ni = -1;
            again.forEach(function (x, i) { if (x.id === out.id) ni = i; });
            if (ni >= 0) { var moved = again.splice(ni, 1)[0]; again.splice(idx + 1, 0, moved); }
            await saveStructure(f, again);
            toast("Duplicated — click its name to edit the copy");
          } else if (act === "del") {
            if (!window.confirm("Delete this item? Its wording is kept in the CMS history.")) return;
            await api("/api/pages/" + SLUG + "/lists/" + encodeURIComponent(listKey) + "/items/" + encodeURIComponent(id),
              { method: "DELETE" });
            var gone = [];
            meta.forEach(function (_, k) { if (k.indexOf(listKey + "." + id + ".") === 0) gone.push(k); });
            gone.forEach(function (k) { meta.delete(k); dirty.delete(k); });
            await saveStructure(f, items.filter(function (x) { return x.id !== id; }));
          }
        } catch (e) { toast(e.message); }
      });
    });
    side.querySelectorAll("[data-ladd]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var listKey = btn.getAttribute("data-ladd");
        var f = meta.get(listKey);
        if (!f) return;
        try {
          var out = await api("/api/pages/" + SLUG + "/lists/" + encodeURIComponent(listKey) + "/items",
            { method: "POST", body: JSON.stringify({}) });
          adoptCmsItem(f, out, null);
          await saveStructure(f, listItemsOf(f));
          toast("Added — now give it some text");
          /* take them straight to the new item's first empty field */
          var firstKey = out.fields && (out.fields.headline || out.fields.title ||
            out.fields.name || out.fields.label || out.fields[Object.keys(out.fields)[0]]);
          if (firstKey) {
            sideTab = "all";
            var bb = bucketsFor(activeSection);
            if (bb) renderTab(bb, firstKey);
          }
        } catch (e) { toast(e.message); }
      });
    });
    /* an item's name (or its "Edit text" button) jumps to its copy */
    side.querySelectorAll("[data-goto]").forEach(function (el) {
      el.addEventListener("click", function () {
        var key = el.getAttribute("data-goto");
        sideTab = "all";
        var bb = bucketsFor(activeSection);
        if (bb) renderTab(bb, key);
      });
    });
  }

  /* the server seeded the new item's rows; mirror them locally so the item is
     editable without a reload — copying the source item's drafts when it was
     a duplicate, exactly as the server did */
  function adoptCmsItem(f, out, source) {
    Object.keys(out.fields || {}).forEach(function (prop) {
      var k = out.fields[prop];
      var val = "";
      if (source) {
        var sf = source.fields && source.fields[prop];
        var sk = sf && (sf.key || sf);
        if (typeof sk === "string") val = valueOf(sk);
      }
      meta.set(k, { key: k, label: prop, tag: prop, type: "text", multiline: val.length > 90,
        options: null, value: val, published: "", dirty: false,
        section_key: f.section_key, __cmsItem: true });
      var bucket = sectionsById.get(f.section_key);
      if (bucket) bucket.fields.push(meta.get(k));
      if (window.__MU_RUNTIME__) window.__MU_RUNTIME__.applyLocal(k, val, true);
    });
  }

  /** A button is its label, its destination and its state — shown together. */
  function buttonGroups(fields) {
    var out = [];
    fields.filter(function (f) { return f.tag === "state"; }).forEach(function (st) {
      var host = document.querySelector('[data-c-state="' + CSS.escape(st.key) + '"]');
      var labelField = null, linkField = null;
      if (host) {
        var lab = host.querySelector("[data-c]");
        if (lab) labelField = meta.get(lab.dataset.c) || null;
        var lk = host.matches("a[data-c-link]") ? host : host.querySelector("a[data-c-link]");
        if (lk) linkField = meta.get(lk.dataset.cLink) || null;
      }
      var icons = [];
      if (host) {
        Array.prototype.forEach.call(host.querySelectorAll("[data-c-media]"), function (n) {
          var mf = meta.get(n.dataset.cMedia);
          if (mf) icons.push(mf);
        });
      }
      out.push({ state: st, label: labelField, link: linkField, host: host, icons: icons });
    });
    // links that are not attached to a state switch still need somewhere to live
    fields.filter(function (f) { return f.tag === "link"; }).forEach(function (lf) {
      if (out.some(function (g) { return g.link && g.link.key === lf.key; })) return;
      out.push({ state: null, label: null, link: lf, host: null });
    });
    return out;
  }

  function textRow(f) {
    var v = valueOf(f.key);
    var notes = (comments.get(f.key) || []).length;
    return '<div class="mu-row" data-row="' + esc(f.key) + '">' +
      '<div class="mu-lab">' +
        "<span>" + esc(friendly(f.tag)) + "</span>" +
        (notes ? '<span class="mu-note">' + notes + "</span>" : "") +
        '<button type="button" class="mu-revert" data-revert="' + esc(f.key) + '" title="Undo this field">↺ Undo</button>' +
        (CAN.ai ? '<button type="button" class="mu-aibtn" data-aitoggle="' + esc(f.key) + '" title="Ask the AI to rewrite this">✦ AI</button>' : "") +
      "</div>" +
      (f.tag === "rich"
        ? '<div class="mu-rt">' +
            '<div class="mu-rt__bar">' +
              stylesForBlock(f.key).map(function (h) {
                return '<button type="button" data-cls="' + esc(h.cls) + '" title="' + esc(h.label + " \u2014 ." + h.cls) + '"' +
                  (h.italic ? ' style="font-family:Fraunces,Georgia,serif;font-style:italic"' : "") +
                  ">" + esc(h.label) + "</button>";
              }).join("") +
              '<span class="mu-rt__gap"></span>' +
              '<button type="button" data-rt="br" title="Line break">↵</button>' +
              '<button type="button" data-rt="clear" title="Remove formatting">✕</button>' +
            "</div>" +
            '<div class="mu-rt__box" contenteditable="true" data-rich="' + esc(f.key) + '">' + v + "</div>" +
          "</div>"
        : f.multiline
          ? '<textarea data-f="' + esc(f.key) + '">' + esc(v) + "</textarea>"
          : '<input type="text" data-f="' + esc(f.key) + '" value="' + esc(v) + '">') +
      (CAN.ai
        ? '<div class="mu-ai" data-aibox="' + esc(f.key) + '" hidden>' +
            '<input type="text" class="mu-ai__ins" data-ins="' + esc(f.key) + '" placeholder="What should change?">' +
            '<button class="mu-mini" type="button" data-ai="rewrite" data-k="' + esc(f.key) + '">Rewrite</button>' +
            '<button class="mu-mini" type="button" data-ai="variants" data-k="' + esc(f.key) + '">Options</button>' +
          '</div><div class="mu-out" data-out="' + esc(f.key) + '"></div>'
        : "") +
      "</div>";
  }

  function buttonRow(g) {
    var name = g.label ? valueOf(g.label.key) : (g.link ? "Link" : "Button");
    var rows = '<div class="mu-card">' +
      '<div class="mu-card__h">' + esc(name || "Button") + "</div>";
    if (g.label) {
      rows += '<label class="mu-lab">Label</label>' +
        '<input type="text" data-f="' + esc(g.label.key) + '" value="' + esc(valueOf(g.label.key)) + '">';
    }
    if (g.link) {
      rows += '<label class="mu-lab">Links to</label>' +
        '<input type="text" class="mu-mono" data-f="' + esc(g.link.key) + '" value="' + esc(valueOf(g.link.key)) + '" placeholder="/path or https://…">';
    }
    (g.icons || []).forEach(function (ic) {
      rows += '<label class="mu-lab">Icon</label>' +
        '<div class="mu-media-row"><div class="mu-thumb">' +
          (valueOf(ic.key) ? '<img src="' + esc(valueOf(ic.key)) + '" alt="">' : "<span>none</span>") +
        '</div><div class="mu-media-fields">' +
          '<input type="text" class="mu-mono" data-f="' + esc(ic.key) + '" value="' + esc(valueOf(ic.key)) + '">' +
        "</div></div>";
    });
    if (g.state) {
      var cur = valueOf(g.state.key);
      var known = (g.state.options || []).some(function (o) { return o.value === cur; });
      rows += '<label class="mu-lab">State</label><select data-f="' + esc(g.state.key) + '">' +
        (g.state.options || []).map(function (o) {
          return '<option value="' + esc(o.value) + '"' + (o.value === cur ? " selected" : "") + ">" + esc(o.label) + "</option>";
        }).join("") +
        (known ? "" : '<option value="' + esc(cur) + '" selected>Custom — ' + esc(cur || "(none)") + "</option>") +
        "</select>";
    }
    return rows + "</div>";
  }

  function mediaRow(f) {
    var v = valueOf(f.key);
    var poster = valueOf(f.key + "@poster");
    /* No CMS value yet just means the page still shows the built-in file —
       find it through the anchor so the editor sees what a visitor sees. */
    var shown = v;
    if (!shown) {
      var mn = document.querySelector('[data-c-media="' + CSS.escape(f.key) + '"]');
      if (mn) shown = mn.currentSrc || mn.src || "";
    }
    var vid = isVideo(v || shown);
    var head = !v && f.label && !/\.(png|jpe?g|webp|svg|gif|avif|mp4|webm)$/i.test(f.label)
      ? '<div class="mu-card__h">Image \u00b7 ' + esc(f.label) + "</div>" : "";
    return '<div class="mu-card" data-row="' + esc(f.key) + '">' + head +
      '<div class="mu-media-row">' +
        '<div class="mu-thumb">' + (shown
          ? (vid ? '<video src="' + esc(shown) + '" muted playsinline preload="metadata"></video>'
                 : '<img src="' + esc(shown) + '" alt="" loading="lazy">')
          : '<span>empty</span>') + "</div>" +
        '<div class="mu-media-fields">' +
          '<label class="mu-lab">Source</label>' +
          '<input type="text" class="mu-mono" data-f="' + esc(f.key) + '" value="' + esc(v) + '" placeholder="https://…">' +
          '<div class="mu-hint">' + (!v && shown
            ? "Showing the built-in image — paste a URL to replace it, clear to restore."
            : vid
            ? "Rendering as a video with the house play button."
            : "Paste an .mp4 or .webm to turn this into a video.") + "</div>" +
        "</div>" +
      "</div>" +
      '<div data-poster="' + esc(f.key) + '"' + (vid ? "" : ' style="display:none"') + ">" +
        '<label class="mu-lab">Poster frame</label>' +
        '<input type="text" class="mu-mono" data-f="' + esc(f.key) + '@poster" value="' + esc(poster) + '" placeholder="https://… still image">' +
      "</div>" +
      "</div>";
  }

  function nodeForKey(key) {
    var sel = CSS.escape(key.replace(/@poster$/, ""));
    return document.querySelector(
      '[data-c="' + sel + '"], [data-c-media="' + sel + '"], ' +
      'a[data-c-link="' + sel + '"], [data-c-state="' + sel + '"]');
  }

  function wireSidebar() {
    /* the map between a row and the thing it edits: hovering the row lights
       the element up on the page; clicking the row's label glides to it */
    side.querySelectorAll("[data-row]").forEach(function (row) {
      var key = row.getAttribute("data-row");
      row.addEventListener("mouseenter", function () {
        var n = nodeForKey(key);
        if (n) n.classList.add("mu-here");
      });
      row.addEventListener("mouseleave", function () {
        var n = nodeForKey(key);
        if (n) n.classList.remove("mu-here");
      });
      var lab = row.querySelector(".mu-lab > span:first-child");
      if (lab) {
        lab.classList.add("mu-locate");
        lab.title = "Show me where this is on the page";
        lab.addEventListener("click", function () {
          var n = nodeForKey(key);
          if (!n) return;
          var y = window.scrollY + n.getBoundingClientRect().top - window.innerHeight / 3;
          var lenis = window.__lenis;
          if (lenis && lenis.scrollTo) lenis.scrollTo(Math.max(0, y), { duration: 0.9 });
          else window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
          n.classList.add("mu-spot");
          setTimeout(function () { n.classList.remove("mu-spot"); }, 1500);
        });
      }
    });
    side.querySelectorAll("[data-f]").forEach(function (input) {
      var ev = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(ev, function () {
        var key = input.dataset.f;
        setField(key, input.value, { fromSidebar: true });
        var media = side.querySelector('[data-poster="' + CSS.escape(key) + '"]');
        if (media) media.style.display = isVideo(input.value) ? "" : "none";
      });
      input.addEventListener("focus", function () {
        markActiveRow(input.dataset.f);
        var n = document.querySelector('[data-c="' + CSS.escape(input.dataset.f) + '"]') ||
                document.querySelector('[data-c-media="' + CSS.escape(input.dataset.f) + '"]');
        if (n) {
          n.classList.add("mu-spot");
          setTimeout(function () { n.classList.remove("mu-spot"); }, 1400);
        }
      });
    });
    side.querySelectorAll("[data-revert]").forEach(function (b) {
      b.addEventListener("click", function () { revertField(b.dataset.revert); });
    });
    side.querySelectorAll("[data-rich]").forEach(function (box) {
      /* The selection has to be remembered. Clicking a toolbar button moves
         focus, and calling box.focus() to bring it back COLLAPSES the range to
         the start — which is why the format buttons silently did nothing: by
         the time the handler ran there was no selection left to wrap. */
      var saved = null;
      function remember() {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var r = sel.getRangeAt(0);
        if (box.contains(r.commonAncestorContainer)) saved = r.cloneRange();
      }
      function restore() {
        if (!saved) return false;
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(saved);
        return true;
      }
      ["keyup", "mouseup", "input"].forEach(function (e) { box.addEventListener(e, remember); });
      document.addEventListener("selectionchange", function () {
        if (document.activeElement === box) remember();
      });

      function grow() {
        box.style.height = "auto";
        box.style.height = Math.min(box.scrollHeight, 320) + "px";
      }
      box.addEventListener("input", function () {
        setField(box.dataset.rich, box.innerHTML, { fromSidebar: true });
        grow();
      });
      grow();

      var barEl = box.parentNode.querySelector(".mu-rt__bar");
      if (!barEl) return;

      /* Light up whichever styles the cursor is currently sitting inside. */
      function refreshBar() {
        var sel = window.getSelection();
        var node = sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
        var host = node && (node.nodeType === 3 ? node.parentNode : node);
        barEl.querySelectorAll("[data-cls]").forEach(function (b) {
          if (!host || !host.closest) return b.classList.remove("on");
          b.classList.toggle("on", !!host.closest("span." + CSS.escape(b.dataset.cls)) && box.contains(host));
        });
      }
      ["keyup", "mouseup"].forEach(function (e) { box.addEventListener(e, refreshBar); });

      barEl.querySelectorAll("button").forEach(function (b) {
        // mousedown + preventDefault keeps focus in the box entirely
        b.addEventListener("mousedown", function (e) {
          e.preventDefault();
          var key = box.dataset.rich;
          if (document.activeElement !== box) box.focus();
          restore();

          if (b.dataset.rt === "br") insertBreak();
          else if (b.dataset.rt === "clear") clearSelectionStyles(box);
          else if (b.dataset.cls) applyHouseStyle(box, key, b.dataset.cls);
          setField(key, box.innerHTML, { fromSidebar: true });
          remember();
          refreshBar();
          grow();
        });
      });

      function insertBreak() {
        var sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        var r = sel.getRangeAt(0);
        r.deleteContents();
        var br = document.createElement("br");
        r.insertNode(br);
        // put the caret after the break, or it lands before it
        r.setStartAfter(br);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    });

    side.querySelectorAll("[data-aitoggle]").forEach(function (t) {
      t.addEventListener("click", function () {
        var box = side.querySelector('[data-aibox="' + CSS.escape(t.dataset.aitoggle) + '"]');
        if (!box) return;
        box.hidden = !box.hidden;
        t.classList.toggle("on", !box.hidden);
        if (!box.hidden) box.querySelector(".mu-ai__ins").focus();
      });
    });
    side.querySelectorAll("[data-ai]").forEach(function (b) {
      b.addEventListener("click", function () { runAI(b.dataset.ai, b.dataset.k, b); });
    });
  }

  function syncSidebarInput(key, value) {
    if (!side) return;
    var rich = side.querySelector('[data-rich="' + CSS.escape(key) + '"]');
    if (rich) { if (rich.innerHTML !== value) rich.innerHTML = value; return; }
    var input = side.querySelector('[data-f="' + CSS.escape(key) + '"]');
    if (input && input.value !== value) input.value = value;
  }

  /* ---------------- AI ---------------- */
  async function runAI(kind, key, btn) {
    var out = side.querySelector('[data-out="' + CSS.escape(key) + '"]');
    var ins = side.querySelector('[data-ins="' + CSS.escape(key) + '"]');
    out.innerHTML = '<div class="mu-hint"><span class="mu-spin"></span> Writing in the house voice…</div>';
    btn.disabled = true;
    try {
      var r = await api("/api/pages/" + SLUG + "/ai/" + kind, {
        method: "POST", body: JSON.stringify({ key: key, instruction: ins ? ins.value : "" })
      });
      if (kind === "rewrite") {
        out.innerHTML = '<div class="mu-opt"><div class="mu-opt__a">Suggested' +
          (r.ceiling ? " · ceiling " + r.ceiling : "") + "</div>" + esc(r.text) + "</div>" +
          (r.note ? '<div class="mu-hint">' + esc(r.note) + "</p>" : "");
        out.querySelector(".mu-opt").addEventListener("click", function () { setField(key, r.text); });
      } else {
        out.innerHTML = (r.options || []).map(function (o, i) {
          return '<div class="mu-opt" data-i="' + i + '"><div class="mu-opt__a">' + esc(o.angle) + "</div>" + esc(o.text) + "</div>";
        }).join("");
        out.querySelectorAll(".mu-opt").forEach(function (n) {
          n.addEventListener("click", function () { setField(key, r.options[Number(n.dataset.i)].text); });
        });
      }
    } catch (e) {
      out.innerHTML = '<div class="mu-err">' + esc(e.message) + "</div>";
    } finally { btn.disabled = false; }
  }

  /* ---------------- typing on the page ---------------- */
  function beginTyping(node) {
    if (live === node) return;
    stopTyping();
    live = node;
    var key = node.dataset.c;
    if (!original.has(key)) {
      original.set(key, meta.has(key) ? meta.get(key).value
        : (node.hasAttribute("data-c-rich") ? node.innerHTML : node.textContent));
    }
    node.setAttribute("contenteditable", node.hasAttribute("data-c-rich") ? "true" : "plaintext-only");
    node.classList.add("mu-live");
    node.focus();
    node.addEventListener("input", onType);
    node.addEventListener("keydown", onTypeKey);
  }
  function onType() {
    setField(live.dataset.c, live.hasAttribute("data-c-rich") ? live.innerHTML : live.textContent, { fromPage: true });
  }
  function onTypeKey(e) {
    if (e.key === "Escape") { e.preventDefault(); stopTyping(); }
    if (e.key === "Enter" && !e.shiftKey && !/^(P|DIV|LI)$/.test(live.tagName)) { e.preventDefault(); stopTyping(); }
  }
  function stopTyping() {
    if (!live) return;
    live.removeAttribute("contenteditable");
    live.classList.remove("mu-live");
    live.removeEventListener("input", onType);
    live.removeEventListener("keydown", onTypeKey);
    live = null;
  }

  /* A page that re-renders sheds its anchors: the dossier remounts its slide
     on every advance and the img loses data-c-media moments after regroup
     tagged it. So an unanchored click resolves against the fields THEN —
     match the image's src (or the element's text), adopt on the spot, and
     open the right editor. */
  var normText = function (s) {
    return String(s == null ? "" : s).replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|\u00a0/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  };
  function bucketFor(el, f) {
    var host = el.closest("[data-sec]");
    if (!host) return null;
    var key = host.dataset.sec;
    var bucket = sectionsById.get(key);
    if (!bucket) return null;
    f.__node = el;
    if (bucket.fields.indexOf(f) < 0) {
      // slot a late-mounted field where it sits on the page, not at the end
      var at = bucket.fields.length;
      for (var i = 0; i < bucket.fields.length; i++) {
        var n = bucket.fields[i].__node;
        if (n && n.isConnected &&
            (el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) { at = i; break; }
      }
      bucket.fields.splice(at, 0, f);
    }
    f.section_key = key;
    return key;
  }
  function lazyAdopt(target) {
    if (!target || !target.closest || !sectionsById.size) return null;

    var mediaEl = target.closest("img, video");
    if (mediaEl && !mediaEl.closest("[data-c-media]")) {
      var srcPath = (mediaEl.currentSrc || mediaEl.src || "").split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, "");
      var base = srcPath.split("/").pop();
      var found = null;
      meta.forEach(function (f) {
        if (found || f.tag !== "media") return;
        if (document.querySelector('[data-c-media="' + CSS.escape(f.key) + '"]')) return;
        var v = String(f.value || "").split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, "");
        if (v) { if (v === srcPath) found = f; return; }
        if (/\.(png|jpe?g|webp|svg|gif|avif|mp4|webm|mov)$/i.test(f.label || "")) {
          var stem = f.label.replace(/\.[a-z0-9]+$/i, "");
          if (base === f.label || base.indexOf(stem + "-") === 0 || base.indexOf(stem + ".") === 0) found = f;
        }
      });
      if (!found) return null;
      mediaEl.setAttribute("data-c-media", found.key);
      mediaEl.setAttribute("data-mu-adopted", "1");
      if (!mediaEl.dataset.muSrc) mediaEl.dataset.muSrc = mediaEl.currentSrc || mediaEl.src || "";
      return { kind: "media", key: found.key, sec: bucketFor(mediaEl, found), node: mediaEl };
    }

    /* text: the clicked element (or a close ancestor) holds a field's value —
       as its whole text, or as one text node beside styled siblings. Compared
       lowercased: the page often renders uppercase via CSS. */
    var lcT = function (s) { return normText(s).toLowerCase(); };
    var el = target, depth = 0, hit = null;
    while (el && el !== document.body && depth < 4 && !hit) {
      if (!el.closest("[data-c]")) {
        var whole = lcT(el.textContent);
        var parts = [];
        for (var pi = 0; pi < el.childNodes.length; pi++) {
          var ptn = el.childNodes[pi];
          if (ptn.nodeType === 3) {
            var pv = lcT(ptn.nodeValue);
            if (pv && pv.length >= 2 && pv !== whole) parts.push({ t: pv, tn: ptn });
          }
        }
        if (whole) {
          meta.forEach(function (f) {
            if (hit || f.tag === "rich" || f.tag === "media" || f.type === "list") return;
            var v = String(f.value == null ? "" : f.value);
            if (!v.trim() || v.indexOf("<") >= 0) return;
            if (document.querySelector('[data-c="' + CSS.escape(f.key) + '"]')) return;
            var lv = lcT(v);
            if (lv === whole) { hit = { f: f, el: el, tn: null }; return; }
            for (var qi = 0; qi < parts.length; qi++) {
              if (parts[qi].t === lv) { hit = { f: f, el: el, tn: parts[qi].tn }; return; }
            }
          });
        }
      }
      el = el.parentElement; depth++;
    }
    if (!hit) return null;
    var adopted = false, node2 = hit.el;
    if (hit.tn) {
      var sp2 = document.createElement("span");
      sp2.setAttribute("data-c", hit.f.key);
      sp2.setAttribute("data-mu-adopted", "1");
      sp2.setAttribute("data-mu-wrapped", "1");
      hit.el.insertBefore(sp2, hit.tn);
      sp2.appendChild(hit.tn);
      node2 = sp2; adopted = true;
    } else if (hit.el.childElementCount === 0) {
      hit.el.setAttribute("data-c", hit.f.key);
      hit.el.setAttribute("data-mu-adopted", "1");
      adopted = true;
    }
    return { kind: "text", key: hit.f.key, sec: bucketFor(node2, hit.f), node: node2, adopted: adopted };
  }

  var lastNoFieldToast = 0;

  /* Nothing on the page navigates while editing. Before this, only [data-c]
     clicks were swallowed, so hitting a button's padding followed the link and
     threw away unsaved work. */
  document.addEventListener("click", function (e) {
    if (mode !== "edit" && mode !== "arrange") return;
    if (!e.target.closest) return;
    if (e.target.closest(".mu-bar, .mu-side, .mu-toast, .mu-pill, .mu-grip")) return;

    var link = e.target.closest("a[href]");
    if (link) { e.preventDefault(); e.stopPropagation(); }
    if (mode !== "edit") return;

    /* Layered designs put decorative DIVs OVER the copy (the dossier's intro
       sits under an absolutely-positioned layer) — the pointer hits the
       overlay and the heading underneath never gets the click. When the
       direct hit is not editable, look THROUGH the stack at this point for
       the topmost thing that is. */
    var hit = e.target;
    if (!hit.closest("[data-c], [data-c-media], [data-c-link], [data-c-state]") &&
        document.elementsFromPoint) {
      var stack = document.elementsFromPoint(e.clientX, e.clientY) || [];
      for (var si = 0; si < stack.length; si++) {
        if (!stack[si].closest) continue;
        if (stack[si].closest(".mu-side, .mu-bar, .mu-pill, .mu-toast")) continue;
        if (stack[si].closest("[data-c], [data-c-media], [data-c-link], [data-c-state]")) {
          hit = stack[si];
          break;
        }
      }
    }

    var node = hit.closest("[data-c]");
    if (node) {
      e.preventDefault(); e.stopPropagation();
      beginTyping(node);
      syncSidebarInput(node.dataset.c, node.hasAttribute("data-c-rich") ? node.innerHTML : node.textContent);
      revealInDrawer(node.dataset.c, false, node);   // page keeps the cursor
      return;
    }
    var media = hit.closest("[data-c-media]");
    if (media) {
      e.preventDefault(); e.stopPropagation();
      revealInDrawer(media.dataset.cMedia, true, media);
      return;
    }
    var linkHost = hit.closest("[data-c-link]");
    if (linkHost) {
      e.preventDefault(); e.stopPropagation();
      revealInDrawer(linkHost.dataset.cLink, true, linkHost);
      return;
    }
    var stateHost = hit.closest("[data-c-state]");
    if (stateHost) {
      e.preventDefault(); e.stopPropagation();
      revealInDrawer(stateHost.dataset.cState, true, stateHost);
      return;
    }

    var ad = lazyAdopt(hit) || (hit !== e.target ? lazyAdopt(e.target) : null);
    if (ad) {
      e.preventDefault(); e.stopPropagation();
      if (ad.kind === "text" && ad.adopted) beginTyping(ad.node);
      revealInDrawer(ad.key, ad.kind === "media", ad.node);
      return;
    }

    /* Nothing editable behind this click — say so, or the user thinks the
       CMS broke. Only for things that LOOK like content, and not more than
       once every few seconds. */
    var t = e.target;
    var looksLikeContent = (t.closest && t.closest("img, video")) ||
      (t.textContent && t.textContent.trim().length >= 3);
    if (looksLikeContent && Date.now() - lastNoFieldToast > 3000) {
      lastNoFieldToast = Date.now();
      toast("This text is computed by the site — it can’t be edited here.", 2600);
    }
  }, true);

  ["mousedown", "touchstart", "pointerdown"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (mode !== "edit" || !e.target.closest) return;
      if (e.target.closest(".mu-bar, .mu-side, .mu-pill")) return;
      if (e.target.closest("[data-c], a[href]")) e.stopPropagation();
    }, true);
  });

  /* ---------------- save & publish ---------------- */
  async function save() {
    if (!dirty.size) return;
    btnSave.disabled = true;
    btnSave.innerHTML = '<span class="mu-spin"></span> Saving';
    try {
      var changes = {};
      dirty.forEach(function (v, k) { changes[k] = v; });
      var out = await api("/api/pages/" + SLUG + "/content", { method: "PUT", body: JSON.stringify({ changes: changes }) });
      dirty.forEach(function (v, k) {
        original.set(k, v);            // saved value is the new baseline for Undo
        if (meta.has(k)) meta.get(k).value = v;
      });
      dirty.clear();
      Array.prototype.forEach.call(document.querySelectorAll(".mu-dirty"), function (n) { n.classList.remove("mu-dirty"); });
      toast("Saved " + out.saved + " change" + (out.saved === 1 ? "" : "s") + " as a draft");
    } catch (e) { toast(e.message, 4000); }
    finally { btnSave.innerHTML = "Save draft"; refreshCount(); }
  }

  async function publish() {
    if (dirty.size) {
      if (!confirm("You have " + dirty.size + " unsaved change(s). Save them first?\n\nOK saves, then publishes.")) return;
      await save();
    }
    if (!confirm("Publish all drafts on this page to the live site?")) return;
    btnPub.innerHTML = '<span class="mu-spin"></span> Publishing';
    try {
      var out = await api("/api/pages/" + SLUG + "/publish", { method: "POST" });
      toast(out.published ? "Published " + out.published + " change(s) — live now" : "Nothing to publish");
      if (out.published) setTimeout(function () { location.reload(); }, 900);
    } catch (e) { toast(e.message, 4000); }
    finally { btnPub.innerHTML = "Publish"; }
  }

  /* ---------------- arrange ---------------- */
  var grips = [];
  function enterArrange() {
    exitArrange();
    Array.prototype.forEach.call(document.querySelectorAll("[data-sec]"), function (sec) {
      if (!(sec.offsetParent !== null || sec.getClientRects().length)) return;
      sec.setAttribute("data-sec-label", sec.dataset.sec);
      var g = el("button", "mu-grip", "⠿ drag");
      g.draggable = true;
      g.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", sec.dataset.sec);
        e.dataTransfer.effectAllowed = "move";
        sec.classList.add("mu-drag");
      });
      g.addEventListener("dragend", function () { sec.classList.remove("mu-drag"); });
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      sec.appendChild(g);
      grips.push(g);
      sec.addEventListener("dragover", onOver);
      sec.addEventListener("dragleave", onLeave);
      sec.addEventListener("drop", onDrop);
    });
  }
  function exitArrange() {
    grips.forEach(function (g) { g.remove(); });
    grips = [];
    Array.prototype.forEach.call(document.querySelectorAll("[data-sec]"), function (sec) {
      sec.classList.remove("mu-drag", "mu-over");
      sec.removeEventListener("dragover", onOver);
      sec.removeEventListener("dragleave", onLeave);
      sec.removeEventListener("drop", onDrop);
    });
  }
  function onOver(e) { e.preventDefault(); this.classList.add("mu-over"); }
  function onLeave() { this.classList.remove("mu-over"); }
  async function onDrop(e) {
    e.preventDefault(); e.stopPropagation();
    this.classList.remove("mu-over");
    var from = e.dataTransfer.getData("text/plain"), to = this.dataset.sec;
    if (!from || from === to) return;
    var vis = Array.prototype.map.call(document.querySelectorAll("[data-sec]"), function (s) { return s.dataset.sec; })
      .filter(function (k, i, a) { return a.indexOf(k) === i; })
      .filter(function (k) {
        var n = document.querySelector('[data-sec="' + CSS.escape(k) + '"]');
        return n && (n.offsetParent !== null || n.getClientRects().length);
      });
    var i = vis.indexOf(from), j = vis.indexOf(to);
    if (i < 0 || j < 0) return;
    vis.splice(j, 0, vis.splice(i, 1)[0]);
    try {
      await api("/api/pages/" + SLUG + "/order", { method: "PUT", body: JSON.stringify({ tab: TAB, order: vis }) });
      toast("Order saved — reloading");
      setTimeout(function () { location.reload(); }, 700);
    } catch (err) { toast(err.message, 4000); }
  }

  /* ---------------- go ---------------- */
  window.addEventListener("beforeunload", function (e) {
    if (dirty.size) { e.preventDefault(); e.returnValue = ""; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && side && !live) closeSidebar();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildBar);
  else buildBar();
})();
