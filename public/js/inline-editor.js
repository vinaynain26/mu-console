/* eslint-disable */
/**
 * Inline editor — click the thing you want to change.
 *
 * Ships only to a signed-in user (server decides). A visitor's page never loads
 * this file; all they carry is the data-c attribute, ~1.8 KB gzipped.
 *
 * Three modes:
 *   Browse   — the page behaves exactly as it does for a visitor
 *   Edit     — every [data-c] becomes editable; AI and comments per field
 *   Arrange  — every [data-sec] can be dragged into a new order
 *
 * Nothing here writes to the live site. Saves land in draft_value and go
 * through the same publish gate a studio edit does.
 */
(function () {
  "use strict";
  var BOOT = window.__MU_EDITOR__;
  if (!BOOT) return;

  var CAN = BOOT.can, SLUG = BOOT.slug, TAB = BOOT.tab;
  var dirty = new Map();          // key -> new text
  var original = new Map();       // key -> text as loaded
  var mode = "browse";
  var live = null;                // element currently being edited
  var pop = null;
  var comments = new Map();       // key -> [comment]
  var meta = new Map();           // key -> {tag, value, options}

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
  function fields() { return Array.prototype.slice.call(document.querySelectorAll("[data-c]")); }

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
    elCount.innerHTML = n
      ? "<b>" + n + "</b> unsaved"
      : (BOOT.preview ? "Previewing draft" : "No changes");
    if (btnSave) btnSave.disabled = !n;
  }

  /* ---------------- modes ---------------- */
  function setMode(m) {
    if (mode === "edit" && m !== "edit") closeEditing();
    mode = m;
    document.body.classList.toggle("mu-editing", m === "edit");
    document.body.classList.toggle("mu-arranging", m === "arrange");
    Array.prototype.forEach.call(bar.querySelectorAll(".mu-seg button"), function (b) {
      b.classList.toggle("on", b.dataset.mode === m);
    });
    closePop();
    if (m === "arrange") enterArrange(); else exitArrange();
    if (m === "edit") {
      loadComments();
      loadMeta().then(function () { addStatePickers(); addMediaButtons(); });
    } else {
      removeStatePickers();
      removeMediaButtons();
    }
  }

  /* ---------------- editing ---------------- */
  function markDirty(node) {
    var key = node.dataset.c;
    var now = node.textContent;
    if (!original.has(key)) original.set(key, now);
    if (now === original.get(key)) { dirty.delete(key); node.classList.remove("mu-dirty"); }
    else { dirty.set(key, now); node.classList.add("mu-dirty"); }
    refreshCount();
  }

  function beginEdit(node) {
    if (live === node) return;
    closeEditing();
    live = node;
    if (!original.has(node.dataset.c)) original.set(node.dataset.c, node.textContent);
    node.setAttribute("contenteditable", "plaintext-only");
    node.classList.add("mu-live");
    node.focus();
    node.addEventListener("input", onInput);
    node.addEventListener("keydown", onKey);
    openPop(node);
  }
  function onInput() { markDirty(live); syncCounter(); }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); revertLive(); closeEditing(); }
    // Enter commits for single-line elements; Shift+Enter always inserts.
    if (e.key === "Enter" && !e.shiftKey && !/^(P|DIV|LI)$/.test(live.tagName)) {
      e.preventDefault(); closeEditing();
    }
  }
  function revertLive() {
    if (!live) return;
    var key = live.dataset.c;
    if (original.has(key)) live.textContent = original.get(key);
    dirty.delete(key);
    live.classList.remove("mu-dirty");
    refreshCount();
  }
  function closeEditing() {
    if (!live) return;
    live.removeAttribute("contenteditable");
    live.classList.remove("mu-live");
    live.removeEventListener("input", onInput);
    live.removeEventListener("keydown", onKey);
    live = null;
  }

  /* Capture phase: in edit mode the page's own click handlers (sliders, tabs,
     video triggers) must not fire when someone is aiming at a text node. */
  document.addEventListener("click", function (e) {
    if (mode !== "edit" && mode !== "arrange") return;
    if (!e.target.closest) return;
    // never swallow clicks on the editor's own chrome
    if (e.target.closest(".mu-bar, .mu-pop, .mu-toast, .mu-state, .mu-media-edit, .mu-grip")) return;

    // While editing, following a link would throw away unsaved work and take the
    // editor off the page they are editing. Nothing navigates until Browse.
    var link = e.target.closest("a[href]");
    if (link) { e.preventDefault(); e.stopPropagation(); }

    if (mode !== "edit") return;
    var node = e.target.closest("[data-c]");
    if (node) {
      e.preventDefault(); e.stopPropagation();
      beginEdit(node);
    } else if (!link) {
      closeEditing(); closePop();
    }
  }, true);

  /* Same for the drag handlers the slider binds. */
  ["mousedown", "touchstart", "pointerdown"].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      if (mode !== "edit") return;
      if (e.target.closest && e.target.closest(".mu-bar, .mu-pop")) return;
      if (e.target.closest && e.target.closest("[data-c]")) e.stopPropagation();
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
      var out = await api("/api/pages/" + SLUG + "/content", {
        method: "PUT", body: JSON.stringify({ changes: changes })
      });
      dirty.forEach(function (v, k) { original.set(k, v); });
      dirty.clear();
      fields().forEach(function (n) { n.classList.remove("mu-dirty"); });
      loadMeta();
      toast("Saved " + out.saved + " change" + (out.saved === 1 ? "" : "s") + " as a draft");
    } catch (e) {
      toast(e.message, 4000);
    } finally {
      btnSave.innerHTML = "Save draft";
      refreshCount();
    }
  }

  async function publish() {
    if (dirty.size && !confirm("You have " + dirty.size + " unsaved change(s). Save them first?\n\nOK saves, then publishes.")) return;
    if (dirty.size) await save();
    if (!confirm("Publish all drafts on this page to the live site?")) return;
    btnPub.innerHTML = '<span class="mu-spin"></span> Publishing';
    try {
      var out = await api("/api/pages/" + SLUG + "/publish", { method: "POST" });
      toast(out.published ? "Published " + out.published + " change(s) — live now" : "Nothing to publish");
      if (out.published) setTimeout(function () { location.reload(); }, 900);
    } catch (e) { toast(e.message, 4000); }
    finally { btnPub.innerHTML = "Publish"; }
  }

  /* ---------------- popover: AI + comments ---------------- */
  function closePop() { if (pop) { pop.remove(); pop = null; } }

  function syncCounter() {
    if (!pop || !live) return;
    var c = pop.querySelector(".ctr");
    if (!c) return;
    var n = live.textContent.length, max = Number(pop.dataset.ceiling || 0);
    c.textContent = n + (max ? " / " + max + " characters" : " characters");
    c.classList.toggle("over", !!max && n > max);
  }

  function openPop(node) {
    closePop();
    var key = node.dataset.c;
    pop = el("div", "mu-pop");
    pop.innerHTML =
      '<header><b>Edit field</b><span class="k">' + esc(key) + '</span><span style="flex:1"></span>' +
      '<button class="b" data-x>Done</button></header>' +
      '<div class="body">' +
        (CAN.ai
          ? '<input type="text" data-ins placeholder="Tell the AI what to change — or leave blank to tighten">' +
            '<div class="row">' +
              '<button class="b pri" data-ai="rewrite">Rewrite</button>' +
              '<button class="b" data-ai="variants">3 options</button>' +
            '</div>'
          : '<div class="hint">Type directly in the page to edit. The AI writer is off.</div>') +
        '<div class="ctr"></div>' +
        '<div data-out></div>' +
        linkRow(node) +
      '</div>' +
      (CAN.comment
        ? '<div class="mu-cmt"><div data-clist></div>' +
          '<div class="row" style="margin-top:4px">' +
            '<input type="text" data-cbody placeholder="Leave a note…" style="flex:1">' +
            '<button class="b" data-csend>Note</button>' +
          '</div></div>'
        : "");

    document.body.appendChild(pop);
    place(node);

    pop.querySelector("[data-x]").addEventListener("click", function () { closeEditing(); closePop(); });
    var ins = pop.querySelector("[data-ins]");
    Array.prototype.forEach.call(pop.querySelectorAll("[data-ai]"), function (b) {
      b.addEventListener("click", function () { runAI(b.dataset.ai, key, ins ? ins.value : ""); });
    });
    if (ins) ins.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); runAI("rewrite", key, ins.value); }
    });
    var send = pop.querySelector("[data-csend]");
    if (send) send.addEventListener("click", function () { addComment(key); });
    renderComments(key);
    wireLinkRow();
    syncCounter();
  }

  function place(node) {
    var r = node.getBoundingClientRect();
    var top = window.scrollY + r.bottom + 9;
    var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - 352);
    pop.style.top = top + "px";
    pop.style.left = Math.max(window.scrollX + 8, left) + "px";
  }

  async function runAI(kind, key, instruction) {
    var out = pop.querySelector("[data-out]");
    out.innerHTML = '<div class="hint"><span class="mu-spin"></span> Claude is writing…</div>';
    Array.prototype.forEach.call(pop.querySelectorAll("[data-ai]"), function (b) { b.disabled = true; });
    try {
      var r = await api("/api/pages/" + SLUG + "/ai/" + kind, {
        method: "POST", body: JSON.stringify({ key: key, instruction: instruction })
      });
      if (r.ceiling) { pop.dataset.ceiling = r.ceiling; syncCounter(); }

      if (kind === "rewrite") {
        out.innerHTML = '<div class="opt"><div class="angle">Suggested</div>' + esc(r.text) + "</div>" +
          (r.note ? '<div class="hint">' + esc(r.note) + "</div>" : "");
        out.querySelector(".opt").addEventListener("click", function () { applyText(r.text); });
      } else {
        out.innerHTML = (r.options || []).map(function (o, i) {
          return '<div class="opt" data-i="' + i + '"><div class="angle">' + esc(o.angle) + "</div>" + esc(o.text) + "</div>";
        }).join("");
        Array.prototype.forEach.call(out.querySelectorAll(".opt"), function (n) {
          n.addEventListener("click", function () { applyText(r.options[Number(n.dataset.i)].text); });
        });
      }
    } catch (e) {
      out.innerHTML = '<div class="err">' + esc(e.message) + "</div>";
    } finally {
      Array.prototype.forEach.call(pop.querySelectorAll("[data-ai]"), function (b) { b.disabled = false; });
    }
  }

  function applyText(text) {
    if (!live) return;
    live.textContent = text;
    markDirty(live);
    syncCounter();
    var out = pop.querySelector("[data-out]");
    out.innerHTML = '<div class="ok">Applied. Still a draft until you save and publish.</div>';
  }

  /* ---------------- comments ---------------- */
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
    } catch (e) { /* comments are optional chrome */ }
  }
  function renderComments(key) {
    if (!pop) return;
    var host = pop.querySelector("[data-clist]");
    if (!host) return;
    var list = comments.get(key) || [];
    host.innerHTML = list.length
      ? list.map(function (c) { return '<div class="c"><b>' + esc(c.author_name) + "</b> " + esc(c.body) + "</div>"; }).join("")
      : '<div class="c" style="color:#8a8a8a">No notes on this field.</div>';
  }
  async function addComment(key) {
    var input = pop.querySelector("[data-cbody]");
    if (!input.value.trim()) return;
    try {
      await api("/api/pages/" + SLUG + "/comments", {
        method: "POST", body: JSON.stringify({ field_key: key, body: input.value })
      });
      input.value = "";
      await loadComments();
      renderComments(key);
    } catch (e) { toast(e.message, 3500); }
  }

  /* ---------------- link + state fields ---------------- *
   * These are not text nodes, so they cannot be edited by typing on the page.
   * Links hang off the <a> that wraps the label; state lives in a row's class
   * list. Both get a proper control instead.
   */
  async function loadMeta() {
    try {
      var data = await api("/api/pages/" + SLUG + "/content");
      meta.clear();
      (data.tabs || []).forEach(function (t) {
        (t.sections || []).forEach(function (sec) {
          (sec.fields || []).forEach(function (f) { meta.set(f.key, f); });
        });
      });
    } catch (e) { /* the editor still works for plain text without this */ }
  }

  /** The URL row inside the popover, when the field sits inside a link. */
  function linkRow(node) {
    var a = node.closest("a[data-c-link]");
    if (!a) return "";
    var key = a.dataset.cLink;
    var f = meta.get(key);
    var val = dirty.has(key) ? dirty.get(key) : (f ? f.value : a.getAttribute("href") || "");
    return '<div style="margin-top:11px;padding-top:11px;border-top:1px solid #e3e3e3">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#616161;margin-bottom:5px">Link target</div>' +
      '<input type="text" data-link="' + esc(key) + '" value="' + esc(val) + '" ' +
      'placeholder="/path or https://…" style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px">' +
      '<div class="hint">Where this button goes. Saved as a draft like any other change.</div>' +
      '</div>';
  }

  function wireLinkRow() {
    if (!pop) return;
    var input = pop.querySelector("[data-link]");
    if (!input) return;
    input.addEventListener("input", function () {
      var key = input.dataset.link;
      var f = meta.get(key);
      if (!original.has(key)) original.set(key, f ? f.value : "");
      if (input.value === original.get(key)) dirty.delete(key);
      else dirty.set(key, input.value);
      // reflect it on the page so the change is visible immediately
      var a = document.querySelector('a[data-c-link="' + CSS.escape(key) + '"]');
      if (a) a.setAttribute("href", input.value);
      refreshCount();
    });
  }

  /* Media slots are not text, so they get their own handle rather than
     contentEditable. One button per slot, opening a small URL form. */
  function addMediaButtons() {
    removeMediaButtons();
    Array.prototype.forEach.call(document.querySelectorAll("[data-c-media]"), function (host) {
      var key = host.dataset.cMedia;
      var b = el("button", "mu-media-edit", "Replace");
      b.type = "button";
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        openMediaPop(host, key, b);
      });
      document.body.appendChild(b);
      b.__host = host;
      placeBeside(b, host);
      mediaBtns.push(b);
    });
  }
  function removeMediaButtons() {
    mediaBtns.forEach(function (b) { b.remove(); });
    mediaBtns = [];
  }

  function openMediaPop(host, key, btn) {
    closePop();
    var f = meta.get(key) || { value: "" };
    var pf = meta.get(key + "@poster") || { value: "" };
    var src = dirty.has(key) ? dirty.get(key) : f.value;
    var poster = dirty.has(key + "@poster") ? dirty.get(key + "@poster") : pf.value;

    pop = el("div", "mu-pop");
    pop.innerHTML =
      '<header><b>Image or video</b><span class="k">' + esc(key) + '</span>' +
      '<span style="flex:1"></span><button class="b" data-x>Done</button></header>' +
      '<div class="body">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#616161;margin-bottom:5px">Source</div>' +
        '<input type="text" data-media="' + esc(key) + '" value="' + esc(src) + '" placeholder="https://…">' +
        '<div class="hint">Paste an image URL, or an .mp4 / .webm to turn this into a video with the play button.</div>' +
        '<div data-posterrow style="margin-top:11px;' + (isVideo(src) ? '' : 'display:none') + '">' +
          '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#616161;margin-bottom:5px">Poster frame</div>' +
          '<input type="text" data-media="' + esc(key) + '@poster" value="' + esc(poster) + '" placeholder="https://… still image">' +
          '<div class="hint">Shown before the video plays.</div>' +
        '</div>' +
        '<div class="hint" style="margin-top:9px">Save the draft, then reload to see the swap on the page.</div>' +
      '</div>';
    document.body.appendChild(pop);
    place(btn);

    pop.querySelector("[data-x]").addEventListener("click", function () { closePop(); });
    Array.prototype.forEach.call(pop.querySelectorAll("[data-media]"), function (input) {
      input.addEventListener("input", function () {
        var k = input.dataset.media;
        var base = meta.get(k);
        if (!original.has(k)) original.set(k, base ? base.value : "");
        if (input.value === original.get(k)) dirty.delete(k);
        else dirty.set(k, input.value);
        if (k === key) {
          var row = pop.querySelector("[data-posterrow]");
          if (row) row.style.display = isVideo(input.value) ? "" : "none";
          // an image swap can be shown at once; a video needs the reload
          if (!isVideo(input.value) && host.tagName === "IMG") host.src = input.value;
        }
        refreshCount();
      });
    });
  }
  function isVideo(v) { return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(v || "")); }

  var mediaBtns = [];
  var statePickers = [];
  function addStatePickers() {
    removeStatePickers();
    Array.prototype.forEach.call(document.querySelectorAll("[data-c-state]"), function (host) {
      var key = host.dataset.cState;
      var f = meta.get(key);
      if (!f || !f.options) return;

      var sel = el("select", "mu-state");
      var current = dirty.has(key) ? dirty.get(key) : f.value;
      var known = false;
      f.options.forEach(function (o) {
        var op = el("option", null, esc(o.label));
        op.value = o.value;
        if (o.value === current) { op.selected = true; known = true; }
        sel.appendChild(op);
      });
      if (!known) {
        var op2 = el("option", null, "Custom — " + esc(current || "(none)"));
        op2.value = current; op2.selected = true;
        sel.appendChild(op2);
      }

      sel.addEventListener("change", function () {
        if (!original.has(key)) original.set(key, f.value);
        if (sel.value === original.get(key)) dirty.delete(key);
        else dirty.set(key, sel.value);
        // swap the classes live so the row greys out / hides as you choose
        var allTokens = [];
        f.options.forEach(function (o) { allTokens = allTokens.concat(o.value.split(/\s+/).filter(Boolean)); });
        allTokens.forEach(function (t) { host.classList.remove(t); });
        sel.value.split(/\s+/).filter(Boolean).forEach(function (t) { host.classList.add(t); });
        refreshCount();
      });
      sel.addEventListener("click", function (e) { e.stopPropagation(); });

      document.body.appendChild(sel);
      sel.__host = host;
      placeBeside(sel, host);
      statePickers.push(sel);
    });
  }
  /** Sit a control just outside its element — never on top of it. */
  function placeBeside(node, host) {
    var r = host.getBoundingClientRect();
    var w = node.offsetWidth || 150;
    var left = window.scrollX + r.right + 8;
    // fall back to the left side when there is no room on the right
    if (left + w > window.scrollX + document.documentElement.clientWidth - 8) {
      left = Math.max(window.scrollX + 8, window.scrollX + r.left - w - 8);
    }
    node.style.left = left + "px";
    node.style.top = (window.scrollY + r.top) + "px";
  }
  function repositionPickers() {
    statePickers.forEach(function (n) { if (n.__host) placeBeside(n, n.__host); });
    mediaBtns.forEach(function (n) { if (n.__host) placeBeside(n, n.__host); });
  }
  window.addEventListener("scroll", function () { if (mode === "edit") repositionPickers(); }, { passive: true });
  window.addEventListener("resize", function () { if (mode === "edit") repositionPickers(); });

  function removeStatePickers() {
    statePickers.forEach(function (s2) { s2.remove(); });
    statePickers = [];
  }

  /* ---------------- arrange ---------------- */
  var grips = [];
  function enterArrange() {
    exitArrange();
    Array.prototype.forEach.call(document.querySelectorAll("[data-sec]"), function (sec) {
      if (!isVisible(sec)) return;
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
  function isVisible(n) { return n.offsetParent !== null || n.getClientRects().length > 0; }
  function onOver(e) { e.preventDefault(); this.classList.add("mu-over"); }
  function onLeave() { this.classList.remove("mu-over"); }
  async function onDrop(e) {
    e.preventDefault(); e.stopPropagation();
    this.classList.remove("mu-over");
    var from = e.dataTransfer.getData("text/plain");
    var to = this.dataset.sec;
    if (!from || from === to) return;

    var order = Array.prototype.map.call(document.querySelectorAll("[data-sec]"), function (s) { return s.dataset.sec; })
      .filter(function (k, i, a) { return a.indexOf(k) === i; });
    var vis = order.filter(function (k) {
      var n = document.querySelector('[data-sec="' + k + '"]');
      return n && isVisible(n);
    });
    var i = vis.indexOf(from), j = vis.indexOf(to);
    if (i < 0 || j < 0) return;
    vis.splice(j, 0, vis.splice(i, 1)[0]);

    try {
      await api("/api/pages/" + SLUG + "/order", {
        method: "PUT", body: JSON.stringify({ tab: TAB, order: vis })
      });
      toast("Order saved — reloading");
      setTimeout(function () { location.reload(); }, 700);
    } catch (err) { toast(err.message, 4000); }
  }

  /* ---------------- go ---------------- */
  window.addEventListener("beforeunload", function (e) {
    if (dirty.size) { e.preventDefault(); e.returnValue = ""; }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildBar);
  else buildBar();
})();
