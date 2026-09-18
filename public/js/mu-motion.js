/**
 * Motion for the editor's chrome: springs, the Apple way.
 *
 * Two designer numbers instead of mass/stiffness/damping: `damping` is the
 * damping ratio (1 = critically damped, no overshoot; below 1 bounces) and
 * `response` is how quickly the value reaches its target, in seconds. There
 * is no duration: a spring settles when it settles, and a new target given
 * mid-flight is taken from the CURRENT value and velocity, so nothing ever
 * jumps or hits a wall.
 *
 * Styles are written inline with priority "important": the editor lives on a
 * host page whose stylesheets know nothing about it, and the containment
 * rules in inline-editor.css zero transforms defensively. Inline-important
 * beats both.
 *
 * Reduced motion: every spring becomes a 150ms opacity cross-fade and the
 * value arrives at once.
 */
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* One value on one spring. Semi-implicit Euler, sub-stepped so a slow
     frame (tab switch, GC) never makes it explode. */
  function createSpring(o) {
    var s = {
      value: o.value || 0, target: o.target || 0, velocity: o.velocity || 0,
      damping: o.damping == null ? 1 : o.damping, response: o.response || 0.32,
      epsilon: o.epsilon || 0.05, done: false,
    };
    var k = Math.pow(TAU / s.response, 2);          // stiffness, mass 1
    var c = 2 * s.damping * Math.sqrt(k);            // damping coefficient
    s.retarget = function (t, v) {
      s.target = t;
      if (v != null) s.velocity = v;
      s.done = false;
    };
    s.step = function (dt) {
      if (s.done) return s.value;
      var steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      var h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var a = -k * (s.value - s.target) - c * s.velocity;
        s.velocity += a * h;
        s.value += s.velocity * h;
      }
      if (Math.abs(s.velocity) < s.epsilon && Math.abs(s.value - s.target) < s.epsilon) {
        s.value = s.target; s.velocity = 0; s.done = true;
      }
      return s.value;
    };
    return s;
  }

  /* ---------------- driving elements ---------------- */

  var reduced = function () {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  /* per element: current values for x, y, scale, opacity, blur; one spring
     per property that is moving; the frame loop */
  var states = typeof WeakMap === "function" ? new WeakMap() : null;
  var DEFAULTS = { x: 0, y: 0, scale: 1, opacity: 1, blur: 0 };
  var EPS = { x: 0.1, y: 0.1, scale: 0.001, opacity: 0.005, blur: 0.05 };
  var running = [], raf = 0, last = 0;

  function stateOf(el) {
    var st = states && states.get(el);
    if (!st) {
      st = { el: el, cur: Object.assign({}, DEFAULTS), springs: {}, waiters: [], extra: "" };
      if (states) states.set(el, st);
    }
    return st;
  }

  function paint(st) {
    var c = st.cur, el = st.el;
    var t = "translate3d(" + c.x.toFixed(2) + "px," + c.y.toFixed(2) + "px,0)" +
      (Math.abs(c.scale - 1) > 0.0005 ? " scale(" + c.scale.toFixed(4) + ")" : "") + (st.extra ? " " + st.extra : "");
    el.style.setProperty("transform", t, "important");
    el.style.setProperty("opacity", String(Math.max(0, Math.min(1, c.opacity))), "important");
    if (c.blur > 0.05) el.style.setProperty("filter", "blur(" + c.blur.toFixed(2) + "px)", "important");
    else el.style.removeProperty("filter");
  }

  function frame(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    for (var i = running.length - 1; i >= 0; i--) {
      var st = running[i], live = false;
      for (var p in st.springs) {
        var sp = st.springs[p];
        st.cur[p] = sp.step(dt);
        if (sp.done) delete st.springs[p]; else live = true;
      }
      paint(st);
      if (!live) {
        running.splice(i, 1);
        var w = st.waiters; st.waiters = [];
        for (var j = 0; j < w.length; j++) w[j]();
      }
    }
    raf = running.length ? requestAnimationFrame(frame) : 0;
  }

  function schedule(st) {
    if (running.indexOf(st) < 0) running.push(st);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  /** Put an element at these values now, no motion (the start of an entrance). */
  function set(el, vals) {
    var st = stateOf(el);
    for (var p in vals) if (p in DEFAULTS) { st.cur[p] = vals[p]; if (st.springs[p]) delete st.springs[p]; }
    if (vals.extra != null) st.extra = vals.extra;
    paint(st);
  }

  /**
   * Spring an element toward `to` ({x, y, scale, opacity, blur}, px for
   * x/y). Properties already moving are re-targeted from where they are.
   * Resolves when every property has settled.
   */
  function spring(el, to, opts) {
    opts = opts || {};
    var st = stateOf(el);
    if (reduced()) {
      /* arrive at once; only opacity eases, so a surface still reads as
         appearing rather than popping */
      for (var q in to) if (q in DEFAULTS && q !== "opacity") st.cur[q] = to[q];
      paint(st);
      if ("opacity" in to) {
        el.style.setProperty("transition", "opacity 150ms ease", "important");
        requestAnimationFrame(function () { st.cur.opacity = to.opacity; paint(st); });
      }
      return new Promise(function (r) { setTimeout(r, "opacity" in to ? 160 : 0); });
    }
    for (var p in to) {
      if (!(p in DEFAULTS)) continue;
      var sp = st.springs[p];
      if (sp) { sp.retarget(to[p], opts.velocity && opts.velocity[p]); if (opts.damping != null || opts.response) { /* new character: rebuild carrying state */ sp = null; } }
      if (!sp) {
        st.springs[p] = createSpring({
          value: st.cur[p], target: to[p],
          velocity: (opts.velocity && opts.velocity[p]) || (st.springs[p] ? st.springs[p].velocity : 0),
          damping: opts.damping, response: opts.response, epsilon: EPS[p],
        });
      }
    }
    schedule(st);
    return new Promise(function (r) { st.waiters.push(r); });
  }

  /** A surface arriving: blur, scale and opacity together, never a plain fade. */
  function materialize(el, opts) {
    opts = opts || {};
    set(el, { opacity: 0, scale: opts.scale == null ? 0.98 : opts.scale, blur: opts.blur == null ? 8 : opts.blur,
      x: opts.x || 0, y: opts.y || 0 });
    return spring(el, { opacity: 1, scale: 1, blur: 0, x: 0, y: 0 }, { damping: 1, response: opts.response || 0.25 });
  }

  /** The same surface leaving, back the way it came. Resolves when gone. */
  function dematerialize(el, opts) {
    opts = opts || {};
    return spring(el, { opacity: 0, scale: opts.scale == null ? 0.98 : opts.scale, blur: opts.blur == null ? 6 : opts.blur,
      x: opts.x || 0, y: opts.y || 0 }, { damping: 1, response: opts.response || 0.2 });
  }

  /* Feedback lives on the press: the instant the pointer goes down, not on
     release. Delegated, so late-rendered controls get it too. */
  function pressFeedback(root, selector) {
    var down = null;
    root.addEventListener("pointerdown", function (e) {
      var t = e.target && e.target.closest && e.target.closest(selector);
      if (!t || t.disabled) return;
      down = t;
      spring(t, { scale: 0.97 }, { damping: 1, response: 0.1 });
    }, true);
    var up = function () {
      if (!down) return;
      spring(down, { scale: 1 }, { damping: 1, response: 0.2 });
      down = null;
    };
    root.addEventListener("pointerup", up, true);
    root.addEventListener("pointercancel", up, true);
    window.addEventListener("blur", up);
  }

  window.MU_MOTION = { createSpring: createSpring, spring: spring, set: set, materialize: materialize,
    dematerialize: dematerialize, pressFeedback: pressFeedback, reduced: reduced };
})();
