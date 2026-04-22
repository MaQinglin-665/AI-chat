#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const APP_JS = path.resolve(__dirname, "..", "web", "app.js");
const appSource = fs.readFileSync(APP_JS, "utf8");

function ensureSourceContains(pattern, label) {
  const ok = pattern instanceof RegExp ? pattern.test(appSource) : appSource.includes(pattern);
  assert.ok(ok, `Missing source pattern: ${label}`);
}

function staticChecks() {
  ensureSourceContains(
    'const sx = Number(e.data?.originalEvent?.screenX ?? e.data?.global?.x);',
    "Electron branch uses screenX fallback"
  );
  ensureSourceContains(
    'const sy = Number(e.data?.originalEvent?.screenY ?? e.data?.global?.y);',
    "Electron branch uses screenY fallback"
  );
  ensureSourceContains(
    "state._dragLastScreenX = NaN;",
    "screen drag cache initialized/reset"
  );
  ensureSourceContains(
    "state._dragLastScreenY = NaN;",
    "screen drag cache initialized/reset"
  );
  ensureSourceContains(
    "queueNativeWindowMoveBy(dx, dy);",
    "Electron drag path calls queueNativeWindowMoveBy"
  );
  ensureSourceContains(
    "!Number.isFinite(lastSx) || !Number.isFinite(lastSy)",
    "Electron drag path skips first frame until last screen coords exist"
  );
  assert.ok(
    !appSource.includes("pointerdown over the model body"),
    "Dead commented block should be removed"
  );
}

function assertApproxEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(Number(actual) - Number(expected)) <= epsilon,
    `Expected ${actual} ~= ${expected} (epsilon=${epsilon})`
  );
}

function createHarness() {
  const calls = {
    queued: [],
    moved: []
  };
  const state = {
    desktopMode: true,
    desktopCanMoveWindow: true,
    windowDragActive: true,
    desktopBridge: "electron",
    suspendRelayoutUntil: 0,
    dragWindowAccumX: 5,
    dragWindowAccumY: 6,
    _dragLastScreenX: NaN,
    _dragLastScreenY: NaN,
    dragData: {
      data: { global: { x: 0, y: 0 } },
      lastGlobal: { x: 0, y: 0 }
    }
  };
  let now = 1000;
  const perf = { now: () => now };

  function queueNativeWindowMoveBy(dx, dy) {
    calls.queued.push([dx, dy]);
  }

  function moveDesktopWindowBy(dx, dy) {
    calls.moved.push([dx, dy]);
  }

  function pointerMoveDesktopBranch(e) {
    if (state.desktopCanMoveWindow && state.windowDragActive) {
      if (state.desktopBridge === "electron") {
        const sx = Number(e.data?.originalEvent?.screenX ?? e.data?.global?.x);
        const sy = Number(e.data?.originalEvent?.screenY ?? e.data?.global?.y);
        if (!Number.isFinite(sx) || !Number.isFinite(sy)) return "return_non_finite";
        const lastSx = Number(state._dragLastScreenX);
        const lastSy = Number(state._dragLastScreenY);
        state._dragLastScreenX = sx;
        state._dragLastScreenY = sy;
        if (!Number.isFinite(lastSx) || !Number.isFinite(lastSy)) return "return_first_frame";
        const dx = sx - lastSx;
        const dy = sy - lastSy;
        if (dx === 0 && dy === 0) return "return_zero_delta";
        state.suspendRelayoutUntil = perf.now() + 220;
        queueNativeWindowMoveBy(dx, dy);
        state.dragWindowAccumX = 0;
        state.dragWindowAccumY = 0;
      } else {
        const g = e.data?.global || state.dragData?.data?.global;
        if (g) {
          const last = state.dragData.lastGlobal || g;
          const dx = g.x - last.x;
          const dy = g.y - last.y;
          state.dragData.lastGlobal = { x: g.x, y: g.y };
          if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return "return_tiny_delta";
          state.suspendRelayoutUntil = perf.now() + 240;
          moveDesktopWindowBy(dx, dy);
          state.dragWindowAccumX = 0;
          state.dragWindowAccumY = 0;
        }
      }
      return "return_after_drag";
    }
    return "return_no_drag";
  }

  function pointerDownStart() {
    state.windowDragActive = !!(state.desktopMode && state.desktopCanMoveWindow);
    state._dragLastScreenX = NaN;
    state._dragLastScreenY = NaN;
  }

  function stopDesktopWindowDrag() {
    state.windowDragActive = false;
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
    state._dragLastScreenX = NaN;
    state._dragLastScreenY = NaN;
  }

  function queueNativeWindowMoveByWithClamp(dx, dy) {
    const clampNumber = (v, min, max) => Math.max(min, Math.min(max, v));
    const cdx = clampNumber(dx, -64, 64);
    const cdy = clampNumber(dy, -64, 64);
    return [cdx, cdy];
  }

  return {
    state,
    calls,
    perf,
    pointerMoveDesktopBranch,
    pointerDownStart,
    stopDesktopWindowDrag,
    queueNativeWindowMoveByWithClamp,
    setNow(value) {
      now = value;
    }
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("static checks for updated drag code", () => {
  staticChecks();
});

test("pointerdown initializes screen drag cache to NaN", () => {
  const h = createHarness();
  h.state._dragLastScreenX = 123;
  h.state._dragLastScreenY = 456;
  h.pointerDownStart();
  assert.ok(Number.isNaN(h.state._dragLastScreenX));
  assert.ok(Number.isNaN(h.state._dragLastScreenY));
});

test("first electron move primes last screen coords and does not queue move", () => {
  const h = createHarness();
  const ret = h.pointerMoveDesktopBranch({
    data: { originalEvent: { screenX: 200, screenY: 300 }, global: { x: 1, y: 2 } }
  });
  assert.strictEqual(ret, "return_first_frame");
  assert.deepStrictEqual(h.calls.queued, []);
  assert.strictEqual(h.state._dragLastScreenX, 200);
  assert.strictEqual(h.state._dragLastScreenY, 300);
});

test("electron move with non-finite screen data returns early", () => {
  const h = createHarness();
  const ret = h.pointerMoveDesktopBranch({
    data: { originalEvent: { screenX: NaN, screenY: 12 }, global: { x: 5, y: 7 } }
  });
  assert.strictEqual(ret, "return_non_finite");
  assert.deepStrictEqual(h.calls.queued, []);
});

test("second electron move queues dx/dy in screen pixels and resets accumulators", () => {
  const h = createHarness();
  h.pointerMoveDesktopBranch({
    data: { originalEvent: { screenX: 120, screenY: 220 }, global: { x: 0, y: 0 } }
  });
  h.setNow(4321);
  const ret = h.pointerMoveDesktopBranch({
    data: { originalEvent: { screenX: 132, screenY: 226 }, global: { x: 0, y: 0 } }
  });
  assert.strictEqual(ret, "return_after_drag");
  assert.deepStrictEqual(h.calls.queued, [[12, 6]]);
  assert.strictEqual(h.state.dragWindowAccumX, 0);
  assert.strictEqual(h.state.dragWindowAccumY, 0);
  assert.strictEqual(h.state.suspendRelayoutUntil, 4541);
});

test("electron move falls back to global coords when originalEvent screen coords missing", () => {
  const h = createHarness();
  h.pointerMoveDesktopBranch({ data: { global: { x: 10, y: 20 } } });
  h.pointerMoveDesktopBranch({ data: { global: { x: 14, y: 16 } } });
  assert.deepStrictEqual(h.calls.queued, [[4, -4]]);
});

test("electron move with zero delta is ignored", () => {
  const h = createHarness();
  h.pointerMoveDesktopBranch({
    data: { originalEvent: { screenX: 500, screenY: 700 }, global: { x: 0, y: 0 } }
  });
  const ret = h.pointerMoveDesktopBranch({
    data: { originalEvent: { screenX: 500, screenY: 700 }, global: { x: 0, y: 0 } }
  });
  assert.strictEqual(ret, "return_zero_delta");
  assert.deepStrictEqual(h.calls.queued, []);
});

test("non-electron path uses global deltas and 0.001 threshold", () => {
  const h = createHarness();
  h.state.desktopBridge = "pywebview";
  h.state.dragData.lastGlobal = { x: 10, y: 10 };
  const tinyRet = h.pointerMoveDesktopBranch({ data: { global: { x: 10.0005, y: 10.0005 } } });
  assert.strictEqual(tinyRet, "return_tiny_delta");
  assert.deepStrictEqual(h.calls.moved, []);

  const ret = h.pointerMoveDesktopBranch({ data: { global: { x: 15, y: 13 } } });
  assert.strictEqual(ret, "return_after_drag");
  assert.strictEqual(h.calls.moved.length, 1);
  assertApproxEqual(h.calls.moved[0][0], 4.9995);
  assertApproxEqual(h.calls.moved[0][1], 2.9995);
});

test("stopDesktopWindowDrag resets active flag, accumulators and screen cache", () => {
  const h = createHarness();
  h.state.windowDragActive = true;
  h.state.dragWindowAccumX = 12;
  h.state.dragWindowAccumY = -8;
  h.state._dragLastScreenX = 900;
  h.state._dragLastScreenY = 901;
  h.stopDesktopWindowDrag();
  assert.strictEqual(h.state.windowDragActive, false);
  assert.strictEqual(h.state.dragWindowAccumX, 0);
  assert.strictEqual(h.state.dragWindowAccumY, 0);
  assert.ok(Number.isNaN(h.state._dragLastScreenX));
  assert.ok(Number.isNaN(h.state._dragLastScreenY));
});

test("queueNativeWindowMoveBy clamp boundary is within [-64, 64]", () => {
  const h = createHarness();
  assert.deepStrictEqual(h.queueNativeWindowMoveByWithClamp(100, -90), [64, -64]);
  assert.deepStrictEqual(h.queueNativeWindowMoveByWithClamp(12.5, -7.1), [12.5, -7.1]);
});

function run() {
  const startedAt = Date.now();
  let passed = 0;
  const failures = [];

  for (const t of tests) {
    try {
      t.fn();
      passed += 1;
      console.log(`PASS  ${t.name}`);
    } catch (err) {
      failures.push({ name: t.name, err });
      console.log(`FAIL  ${t.name}`);
      console.log(`      ${err && err.stack ? err.stack : String(err)}`);
    }
  }

  const tookMs = Date.now() - startedAt;
  console.log("");
  console.log(`Total: ${tests.length}, Passed: ${passed}, Failed: ${failures.length}, Time: ${tookMs}ms`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

run();
