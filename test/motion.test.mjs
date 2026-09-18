/* The spring runner behind every editor motion. The integrator is pure, so
   its promises can be checked without a browser: it settles, a damping of 1
   never overshoots, and a re-target mid-flight starts from the current
   value and velocity rather than jumping. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import fs from "node:fs";

/* the file is a browser script that puts MU_MOTION on window */
function loadMotion() {
  const src = fs.readFileSync(new URL("../public/js/mu-motion.js", import.meta.url), "utf8");
  const win = { matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 0, performance: { now: () => 0 } };
  vm.runInNewContext(src, { window: win, document: {}, requestAnimationFrame: win.requestAnimationFrame, performance: win.performance });
  return win.MU_MOTION;
}

test("a critically damped spring settles at the target without crossing it", () => {
  const M = loadMotion();
  const s = M.createSpring({ value: 0, target: 100, damping: 1, response: 0.3 });
  let maxV = -Infinity, steps = 0;
  while (!s.done && steps < 1000) { s.step(1 / 60); maxV = Math.max(maxV, s.value); steps++; }
  assert.ok(s.done, "it settles");
  assert.ok(Math.abs(s.value - 100) < 0.5, "at the target: " + s.value);
  assert.ok(maxV <= 100.5, "never overshoots: " + maxV);
  assert.ok(steps * (1 / 60) < 1.2, "settles in about a second, not more: " + (steps / 60).toFixed(2) + "s");
});

test("an under-damped spring overshoots once, then settles", () => {
  const M = loadMotion();
  const s = M.createSpring({ value: 0, target: 100, damping: 0.85, response: 0.3 });
  let maxV = -Infinity, steps = 0;
  while (!s.done && steps < 1000) { s.step(1 / 60); maxV = Math.max(maxV, s.value); steps++; }
  assert.ok(s.done);
  assert.ok(maxV > 100.01 && maxV < 110, "crosses the target, a little: " + maxV);
});

test("re-targeting mid-flight continues from the current value and velocity", () => {
  const M = loadMotion();
  const s = M.createSpring({ value: 0, target: 100, damping: 1, response: 0.3 });
  for (let i = 0; i < 6; i++) s.step(1 / 60);          // 100ms in
  const midValue = s.value, midVel = s.velocity;
  assert.ok(midValue > 5 && midValue < 95, "genuinely mid-flight: " + midValue);
  assert.ok(midVel > 0, "moving toward 100");
  s.retarget(0);                                       // reverse
  assert.equal(s.value, midValue, "no jump on retarget");
  assert.equal(s.velocity, midVel, "velocity carried through");
  s.step(1 / 60);
  assert.ok(Math.abs(s.value - midValue) < 3, "turns within a frame instead of snapping: " + s.value);
  let steps = 0;
  while (!s.done && steps < 1000) { s.step(1 / 60); steps++; }
  assert.ok(Math.abs(s.value) < 0.5, "settles back at 0");
});

test("an initial velocity is honoured (a flick keeps going before it turns)", () => {
  const M = loadMotion();
  const s = M.createSpring({ value: 0, target: 0, damping: 1, response: 0.3, velocity: 800 });
  s.step(1 / 60);
  assert.ok(s.value > 5, "moved with the hand-off velocity: " + s.value);
});
