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
      if (node && node !== live) node.textContent = value;

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

  function markNode(key) {
    var d = dirty.has(key);
    ["[data-c=", "[data-c-link=", "[data-c-state=", "[data-c-media="].forEach(function (sel) {
      var n = document.querySelector(sel + '"' + CSS.escape(key) + '"]');
      if (n) n.classList.toggle("mu-dirty", d);
    });
  }

  /* ---------------- toolbar ---------------- */
  var bar, elCount, btnSave, btnPub;

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
      pill.innerHTML = '<span class="mu-pill__i">✎</span> Edit section' +
        '<span class="mu-pill__n">' + bucket.fields.filter(notMeta).length + "</span>";
      pill.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        openSidebar(key);
      });
      if (getComputedStyle(sec).position === "static") sec.style.position = "relative";
      sec.appendChild(pill);
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

  function openSidebar(sectionKey, focusKey) {
    var bucket = sectionsById.get(sectionKey);
    if (!bucket) return;
    activeSection = sectionKey;

    Array.prototype.forEach.call(document.querySelectorAll(".mu-sec-active"), function (n) {
      n.classList.remove("mu-sec-active");
    });
    var host = document.querySelector('[data-sec="' + CSS.escape(sectionKey) + '"]');
    if (host) host.classList.add("mu-sec-active");

    if (!side) {
      side = el("aside", "mu-side");
      document.body.appendChild(side);
      document.body.classList.add("mu-side-open");
    }

    var fields = bucket.fields.filter(notMeta);
    var groups = {
      text: fields.filter(function (f) { return ["link", "state", "media", "image"].indexOf(f.tag) < 0; }),
      buttons: buttonGroups(fields),
      media: fields.filter(function (f) { return f.tag === "media"; }),
    };

    side.innerHTML =
      '<header class="mu-side__head">' +
        '<div><div class="mu-side__eyebrow">Editing section</div>' +
        '<h2>' + esc(bucket.title) + "</h2></div>" +
        '<button class="mu-side__x" type="button" aria-label="Close">✕</button>' +
      "</header>" +
      '<div class="mu-side__body">' +
        section("Copy", groups.text.map(textRow).join("") || empty("No text in this section.")) +
        (groups.buttons.length ? section("Buttons & links", groups.buttons.map(buttonRow).join("")) : "") +
        (groups.media.length ? section("Images & video", groups.media.map(mediaRow).join("")) : "") +
      "</div>";

    side.querySelector(".mu-side__x").addEventListener("click", closeSidebar);
    wireSidebar();

    if (focusKey) {
      var input = side.querySelector('[data-f="' + CSS.escape(focusKey) + '"]');
      if (input) { input.focus(); input.scrollIntoView({ block: "center" }); }
    }
  }

  function section(title, inner) {
    return '<section class="mu-grp"><h3>' + esc(title) + "</h3>" + inner + "</section>";
  }
  function empty(msg) { return '<p class="mu-empty">' + esc(msg) + "</p>"; }

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
      out.push({ state: st, label: labelField, link: linkField, host: host });
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
      '<label class="mu-lab"><span class="mu-tag">' + esc(f.tag) + "</span>" +
        esc(f.label) + (notes ? '<span class="mu-note">' + notes + " note" + (notes === 1 ? "" : "s") + "</span>" : "") +
      "</label>" +
      (f.multiline
        ? '<textarea data-f="' + esc(f.key) + '">' + esc(v) + "</textarea>"
        : '<input type="text" data-f="' + esc(f.key) + '" value="' + esc(v) + '">') +
      (CAN.ai
        ? '<div class="mu-ai">' +
            '<input type="text" class="mu-ai__ins" data-ins="' + esc(f.key) + '" placeholder="Tell the AI what to change…">' +
            '<button class="mu-mini" type="button" data-ai="rewrite" data-k="' + esc(f.key) + '">Rewrite</button>' +
            '<button class="mu-mini" type="button" data-ai="variants" data-k="' + esc(f.key) + '">3 options</button>' +
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
          '<p class="mu-hint">' + (vid
            ? "Rendering as a video with the house play button."
            : "Paste an .mp4 or .webm to turn this into a video.") + "</p>" +
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
    side.querySelectorAll("[data-ai]").forEach(function (b) {
      b.addEventListener("click", function () { runAI(b.dataset.ai, b.dataset.k, b); });
    });
  }

  function syncSidebarInput(key, value) {
    if (!side) return;
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
          (r.note ? '<p class="mu-hint">' + esc(r.note) + "</p>" : "");
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
    if (!original.has(key)) original.set(key, meta.has(key) ? meta.get(key).value : node.textContent);
    node.setAttribute("contenteditable", "plaintext-only");
    node.classList.add("mu-live");
    node.focus();
    node.addEventListener("input", onType);
    node.addEventListener("keydown", onTypeKey);
  }
  function onType() { setField(live.dataset.c, live.textContent, { fromPage: true }); }
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
        else syncSidebarInput(node.dataset.c, node.textContent);
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
        original.set(k, v);
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
