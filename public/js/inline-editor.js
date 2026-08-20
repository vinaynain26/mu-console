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
  var dirty = new Map();          // key -> new value
  var original = new Map();       // key -> value as loaded
  var meta = new Map();           // key -> field record from the API
  var sectionsById = new Map();   // section key -> { title, fields[] }
  var comments = new Map();
  var mode = "browse";
  var live = null;                // node being typed into
  var activeSection = null;

  /* The page's emphasis is carried by classes, not by <b>/<i>. .fr-HeadingItalic
     is `font: italic 34px/1.2 "Fraunces", serif` — a different TYPEFACE, so a
     plain <i> would render the wrong font. Counts are from the page itself.  */
  var HOUSE = [
    { cmd: "bold",      cls: "font-semibold",    label: "B",  title: "Bold (house semibold)", style: "font-weight:700" },
    { cmd: "italic",    cls: null,               label: "It", title: "Italic (Fraunces)", style: 'font-family:Fraunces,serif;font-style:italic' },
    { cmd: "highlight", cls: "textHighlight",    label: "H",  title: "Highlight", style: "text-decoration:underline" },
  ];
  /* h1 titles and h2/h3 headings use different italic classes. */
  function italicClassFor(key) {
    var n = document.querySelector('[data-c="' + CSS.escape(key) + '"]');
    return n && n.tagName === "H1" ? "fr-TitleItalic" : "fr-HeadingItalic";
  }
  function classFor(item, key) { return item.cls || italicClassFor(key); }

  /** Wrap the selection in a span, or unwrap it when it is already wrapped. */
  function applyHouseStyle(box, key, item) {
    var cls = classFor(item, key);
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    if (!box.contains(range.commonAncestorContainer)) return;

    // already inside a span of this class? then this is a toggle off
    var node = range.commonAncestorContainer;
    var host = node.nodeType === 3 ? node.parentNode : node;
    var existing = host.closest ? host.closest("span." + cls) : null;
    if (existing && box.contains(existing)) {
      var parent = existing.parentNode;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      parent.normalize();
      return;
    }
    if (range.collapsed) {
      // no selection: take the word the caret is in, which is what people expect
      var tn = range.startContainer;
      if (tn.nodeType !== 3 || !tn.textContent.trim()) return;
      var text = tn.textContent, i = range.startOffset;
      var a = i, b2 = i;
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
    try {
      range.surroundContents(span);
    } catch (e) {
      // the selection crosses element boundaries; extract and re-insert instead
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    sel.removeAllRanges();
    var r2 = document.createRange();
    r2.selectNodeContents(span);
    sel.addRange(r2);
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
    if (opts.body) opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    var res = await fetch(url, opts);
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
      if (media && media.tagName === "IMG" && !isVideo(value)) media.src = value;
    }
    if (!opts.fromSidebar) syncSidebarInput(key, value);
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
    setField(key, original.get(key));
    var f = meta.get(key);
    if (f) f.value = original.get(key);
  }

  function revertAll() {
    if (!dirty.size) return;
    if (!confirm("Undo all " + dirty.size + " unsaved change(s) on this page?")) return;
    Array.prototype.slice.call(dirty.keys()).forEach(revertField);
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
    studio.href = BOOT.consoleUrl + "/page/" + SLUG;
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
      loadMeta().then(addSectionPills);
    } else {
      removeSectionPills();
    }
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
    Array.prototype.forEach.call(document.querySelectorAll("[data-sec]"), function (sec) {
      var key = sec.dataset.sec;
      var bucket = sectionsById.get(key);
      if (!bucket || !bucket.fields.length) return;
      if (!(sec.offsetParent !== null || sec.getClientRects().length)) return;

      var pill = el("button", "mu-pill");
      pill.type = "button";
      var b0 = bucketsFor(key);
      var total = b0 ? b0.content.length + b0.buttons.length + b0.images.length : 0;
      if (!total) return;
      pill.innerHTML = '<span class="mu-pill__i">✎</span> Edit section' +
        '<span class="mu-pill__n">' + total + "</span>";
      pill.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        openSidebar(key);
      });
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      sec.appendChild(pill);
      // only sections that actually start under a pinned header need the offset
      var inset = topInset();
      if (inset && sec.getBoundingClientRect().top < inset + 40) {
        pill.style.setProperty("top", (inset + 12) + "px", "important");
      }
      pills.push(pill);
    });
  }
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
  };
  var friendly = function (tag) { return FRIENDLY[tag] || "Text"; };

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

  var sideTab = "content";

  function bucketsFor(sectionKey) {
    var bucket = sectionsById.get(sectionKey);
    if (!bucket) return null;
    var fields = bucket.fields.filter(notMeta);
    return {
      title: bucket.title,
      content: fields.filter(function (f) { return ["link", "state", "media", "image"].indexOf(f.tag) < 0; }),
      buttons: buttonGroups(fields),
      // an icon inside a button is part of that button, not a page image
      images: fields.filter(function (f) {
        if (f.tag !== "media") return false;
        var n = document.querySelector('[data-c-media="' + CSS.escape(f.key) + '"]');
        return !(n && n.closest("a[data-c-link], [data-c-state]"));
      }),
    };
  }

  function openSidebar(sectionKey, focusKey) {
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
      document.body.appendChild(side);
      document.body.classList.add("mu-side-open");
    }

    // land on a tab that actually has something in it
    if (focusKey) {
      var f = meta.get(focusKey);
      if (f) sideTab = f.tag === "media" ? "images" : (["link", "state"].indexOf(f.tag) >= 0 ? "buttons" : "content");
    }
    if (!b[sideTab] || !b[sideTab].length) {
      sideTab = ["content", "buttons", "images"].filter(function (t) { return b[t].length; })[0] || "content";
    }

    side.innerHTML =
      '<div class="mu-side__head">' +
        '<div class="mu-side__title">' +
          '<div class="mu-side__eyebrow">Editing section</div>' +
          '<div class="mu-side__h">' + esc(b.title) + "</div>" +
        "</div>" +
        '<button class="mu-side__x" type="button" title="Close (Esc)" aria-label="Close">✕</button>' +
      "</div>" +
      '<div class="mu-tabs">' +
        tabBtn("content", "Content", b.content.length) +
        tabBtn("buttons", "Buttons", b.buttons.length) +
        tabBtn("images", "Images", b.images.length) +
      "</div>" +
      '<div class="mu-side__body" id="mu-side-body"></div>';

    side.querySelector(".mu-side__x").addEventListener("click", closeSidebar);
    side.querySelectorAll("[data-tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        if (t.disabled) return;
        sideTab = t.dataset.tab;
        renderTab(b);
      });
    });
    renderTab(b, focusKey);
  }

  function tabBtn(key, label, n) {
    return '<button type="button" class="mu-tab' + (sideTab === key ? " on" : "") + '" data-tab="' + key + '"' +
      (n ? "" : " disabled") + ">" + esc(label) +
      '<span class="mu-tab__n">' + n + "</span></button>";
  }

  function renderTab(b, focusKey) {
    side.querySelectorAll("[data-tab]").forEach(function (t) {
      t.classList.toggle("on", t.dataset.tab === sideTab);
    });
    var body = side.querySelector("#mu-side-body");
    var html;
    if (sideTab === "content") {
      html = b.content.length ? b.content.map(textRow).join("") : empty("No text in this section.");
    } else if (sideTab === "buttons") {
      html = b.buttons.length ? b.buttons.map(buttonRow).join("") : empty("No buttons or links in this section.");
    } else {
      html = b.images.length ? b.images.map(mediaRow).join("") : empty("No images in this section.");
    }
    /* Tabs fix most of the scrolling, but a few sections genuinely hold dozens
       of fields. Offer a filter there rather than making everyone scroll. */
    var count = sideTab === "content" ? b.content.length
              : sideTab === "buttons" ? b.buttons.length : b.images.length;
    body.innerHTML = (count > 8
      ? '<input type="search" class="mu-filter" placeholder="Filter ' + count + ' items…" data-filter>'
      : "") + '<div data-list>' + html + "</div>";
    body.scrollTop = 0;

    var filter = body.querySelector("[data-filter]");
    if (filter) {
      filter.addEventListener("input", function () {
        var q = filter.value.trim().toLowerCase();
        body.querySelectorAll("[data-row], .mu-card").forEach(function (row) {
          if (!q) { row.style.display = ""; return; }
          var input = row.querySelector("[data-f]");
          var text = ((input && input.value) || "") + " " + row.textContent;
          row.style.display = text.toLowerCase().indexOf(q) >= 0 ? "" : "none";
        });
      });
    }
    wireSidebar();
    if (focusKey) {
      var input = side.querySelector('[data-f="' + CSS.escape(focusKey) + '"]');
      if (input) { input.focus(); input.scrollIntoView({ block: "center" }); }
    }
  }

  function section(title, inner) {
    return '<div class="mu-grp"><div class="mu-grp__h">' + esc(title) + "</div>" + inner + "</div>";
  }
  function empty(msg) { return '<div class="mu-empty">' + esc(msg) + "</div>"; }

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
              HOUSE.map(function (h) {
                return '<button type="button" data-rt="' + h.cmd + '" title="' + esc(h.title) + '" style="' + h.style + '">' + h.label + "</button>";
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
    var vid = isVideo(v);
    return '<div class="mu-card" data-row="' + esc(f.key) + '">' +
      '<div class="mu-media-row">' +
        '<div class="mu-thumb">' + (v
          ? (vid ? '<video src="' + esc(v) + '" muted playsinline preload="metadata"></video>'
                 : '<img src="' + esc(v) + '" alt="" loading="lazy">')
          : '<span>empty</span>') + "</div>" +
        '<div class="mu-media-fields">' +
          '<label class="mu-lab">Source</label>' +
          '<input type="text" class="mu-mono" data-f="' + esc(f.key) + '" value="' + esc(v) + '" placeholder="https://…">' +
          '<div class="mu-hint">' + (vid
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

  function wireSidebar() {
    side.querySelectorAll("[data-f]").forEach(function (input) {
      var ev = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(ev, function () {
        var key = input.dataset.f;
        setField(key, input.value, { fromSidebar: true });
        var media = side.querySelector('[data-poster="' + CSS.escape(key) + '"]');
        if (media) media.style.display = isVideo(input.value) ? "" : "none";
      });
      input.addEventListener("focus", function () {
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
        barEl.querySelectorAll("[data-rt]").forEach(function (b) {
          var item = HOUSE.filter(function (h) { return h.cmd === b.dataset.rt; })[0];
          if (!item || !host || !host.closest) return b.classList.remove("on");
          var cls = classFor(item, box.dataset.rich);
          b.classList.toggle("on", !!host.closest("span." + cls) && box.contains(host));
        });
      }
      ["keyup", "mouseup"].forEach(function (e) { box.addEventListener(e, refreshBar); });

      barEl.querySelectorAll("[data-rt]").forEach(function (b) {
        // mousedown + preventDefault keeps focus in the box entirely
        b.addEventListener("mousedown", function (e) {
          e.preventDefault();
          var key = box.dataset.rich;
          if (document.activeElement !== box) box.focus();
          restore();

          var cmd = b.dataset.rt;
          if (cmd === "br") {
            insertBreak();
          } else if (cmd === "clear") {
            HOUSE.forEach(function (h) {
              var cls = classFor(h, key);
              Array.prototype.forEach.call(box.querySelectorAll("span." + cls), function (sp) {
                var par = sp.parentNode;
                while (sp.firstChild) par.insertBefore(sp.firstChild, sp);
                par.removeChild(sp);
                par.normalize();
              });
            });
          } else {
            var item = HOUSE.filter(function (h) { return h.cmd === cmd; })[0];
            if (item) applyHouseStyle(box, key, item);
          }
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
    out.innerHTML = '<div class="mu-hint"><span class="mu-spin"></span> Claude is writing…</div>';
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

    var node = e.target.closest("[data-c]");
    if (node) {
      e.preventDefault(); e.stopPropagation();
      beginTyping(node);
      var secEl = node.closest("[data-sec]");
      if (secEl && sectionsById.has(secEl.dataset.sec)) {
        if (activeSection !== secEl.dataset.sec) openSidebar(secEl.dataset.sec, node.dataset.c);
        else syncSidebarInput(node.dataset.c, node.hasAttribute("data-c-rich") ? node.innerHTML : node.textContent);
      }
      return;
    }
    var media = e.target.closest("[data-c-media]");
    if (media) {
      e.preventDefault(); e.stopPropagation();
      var ms = media.closest("[data-sec]");
      if (ms && sectionsById.has(ms.dataset.sec)) openSidebar(ms.dataset.sec, media.dataset.cMedia);
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
