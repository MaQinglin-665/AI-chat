#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const APP_JS = path.resolve(__dirname, "..", "web", "app.js");
const appSource = fs.readFileSync(APP_JS, "utf8");
const TAP_MOVE_THRESHOLD = 10;

function ensureSourceContains(pattern, label) {
  const ok = pattern instanceof RegExp ? pattern.test(appSource) : appSource.includes(pattern);
  assert.ok(ok, `Missing source pattern: ${label}`);
}

function staticChecks() {
  ensureSourceContains(
    "if (state.windowDragActive && state.desktopBridge === \"electron\") {",
    "Electron pointerdown branch exists"
  );
  ensureSourceContains(
    "const onDocMove = (ev) => {",
    "Document-level electron pointermove handler exists"
  );
  ensureSourceContains(
    "document.addEventListener(\"pointermove\", onDocMove);",
    "Electron branch registers document pointermove listener"
  );
  ensureSourceContains(
    "document.removeEventListener(\"pointermove\", onDocMove);",
    "Electron branch removes document pointermove listener on cleanup"
  );
  ensureSourceContains(
    "// Handled by document-level pointermove listener.",
    "Model pointermove returns early for electron desktop drag"
  );
  ensureSourceContains(
    "state.suspendRelayoutUntil = performance.now() + 240;",
    "Desktop non-electron drag keeps relayout suspension"
  );
  ensureSourceContains(
    "state.suspendRelayoutUntil = performance.now() + 140;",
    "Overlay drag path keeps relayout suspension"
  );
  ensureSourceContains(
    "moveDesktopWindowBy(dx, dy);",
    "Native window move call is still used for non-electron pointermove path"
  );
  assert.ok(
    !appSource.includes("_dragLastScreenX"),
    "Legacy screen coordinate cache should be removed"
  );
  assert.ok(
    !appSource.includes("queueNativeWindowMoveBy("),
    "Legacy queued native move path should be removed"
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
    windowDragDx: 3,
    windowDragDy: -2,
    pointerDragMoved: false,
    lastPointerDownGlobal: { x: 0, y: 0 },
    modelPosX: 0,
    modelPosY: 0,
    grabOffsetX: 3,
    grabOffsetY: -2,
    model: { x: 0, y: 0 },
    baseTransform: { x: 0, y: 0 },
    canvasRect: { left: 10, top: 20, width: 200, height: 100 },
    rendererSize: { width: 400, height: 200 },
    dragData: {
      data: { global: { x: 0, y: 0 } },
      lastGlobal: { x: 0, y: 0 }
    }
  };
  let now = 1000;
  const perf = { now: () => now };

  function moveDesktopWindowBy(dx, dy) {
    calls.moved.push([dx, dy]);
  }

  function pointerMoveDesktopBranch(e) {
    if (!state.dragData) return "return_no_drag_data";
    const globalNow = e.data?.global || state.dragData?.data?.global;
    if (globalNow) {
      const dxTap = Number(globalNow.x) - Number(state.lastPointerDownGlobal?.x || 0);
      const dyTap = Number(globalNow.y) - Number(state.lastPointerDownGlobal?.y || 0);
      if ((dxTap * dxTap + dyTap * dyTap) > (TAP_MOVE_THRESHOLD * TAP_MOVE_THRESHOLD)) {
        state.pointerDragMoved = true;
      }
    }
    if (state.desktopMode) {
      if (state.desktopCanMoveWindow && state.windowDragActive) {
        if (state.desktopBridge === "electron") {
          return "return_electron_doc_move";
        }
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
          return "return_desktop_window_drag";
        }
      }
      return "return_desktop_mode";
    }
    if (state.desktopCanMoveWindow && state.windowDragActive) {
      const g = e.data?.global || state.dragData?.data?.global;
      if (g) {
        const last = state.dragData.lastGlobal || g;
        const dx = g.x - last.x;
        const dy = g.y - last.y;
        state.dragData.lastGlobal = { x: g.x, y: g.y };
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return "return_tiny_delta";
        state.suspendRelayoutUntil = perf.now() + 140;
        moveDesktopWindowBy(dx, dy);
        state.dragWindowAccumX = 0;
        state.dragWindowAccumY = 0;
        return "return_overlay_window_drag";
      }
      return "return_overlay_no_global";
    }
    return "return_free_drag";
  }

  function stopDesktopWindowDrag() {
    state.windowDragActive = false;
    state.windowDragDx = 0;
    state.windowDragDy = 0;
    state.dragWindowAccumX = 0;
    state.dragWindowAccumY = 0;
  }

  function onDocMoveElectron(ev) {
    if (!state.windowDragActive || !state.model) {
      return "return_inactive";
    }
    const rect = state.canvasRect;
    if (rect.width <= 0 || rect.height <= 0) return "return_bad_rect";
    const rw = Number(state.rendererSize?.width) || rect.width;
    const rh = Number(state.rendererSize?.height) || rect.height;
    const gx = (ev.clientX - rect.left) * (rw / rect.width);
    const gy = (ev.clientY - rect.top) * (rh / rect.height);
    state.dragData.lastGlobal = { x: gx, y: gy };
    const dxTap = Number(gx) - Number(state.lastPointerDownGlobal?.x || 0);
    const dyTap = Number(gy) - Number(state.lastPointerDownGlobal?.y || 0);
    if ((dxTap * dxTap + dyTap * dyTap) > (TAP_MOVE_THRESHOLD * TAP_MOVE_THRESHOLD)) {
      state.pointerDragMoved = true;
    }
    state.modelPosX = gx + state.grabOffsetX;
    state.modelPosY = gy + state.grabOffsetY;
    state.model.x = state.modelPosX;
    state.model.y = state.modelPosY;
    state.baseTransform.x = state.modelPosX;
    state.baseTransform.y = state.modelPosY;
    return "return_doc_move";
  }

  return {
    state,
    calls,
    perf,
    pointerMoveDesktopBranch,
    onDocMoveElectron,
    stopDesktopWindowDrag,
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

test("electron desktop pointermove returns early and leaves window movement to doc listener", () => {
  const h = createHarness();
  const ret = h.pointerMoveDesktopBranch({
    data: { global: { x: 20, y: 0 } }
  });
  assert.strictEqual(ret, "return_electron_doc_move");
  assert.deepStrictEqual(h.calls.moved, []);
  assert.strictEqual(h.state.pointerDragMoved, true);
});

test("desktop non-electron path keeps tiny-delta guard", () => {
  const h = createHarness();
  h.state.desktopBridge = "pywebview";
  h.state.dragData.lastGlobal = { x: 10, y: 10 };
  const ret = h.pointerMoveDesktopBranch({
    data: { global: { x: 10.0004, y: 10.0004 } }
  });
  assert.strictEqual(ret, "return_tiny_delta");
  assert.deepStrictEqual(h.calls.moved, []);
});

test("desktop non-electron path moves native window by global delta", () => {
  const h = createHarness();
  h.state.desktopBridge = "pywebview";
  h.state.dragData.lastGlobal = { x: 10, y: 10 };
  h.setNow(4321);
  const ret = h.pointerMoveDesktopBranch({
    data: { global: { x: 14, y: 16 } }
  });
  assert.strictEqual(ret, "return_desktop_window_drag");
  assert.deepStrictEqual(h.calls.moved, [[4, 6]]);
  assert.strictEqual(h.state.dragWindowAccumX, 0);
  assert.strictEqual(h.state.dragWindowAccumY, 0);
  assert.strictEqual(h.state.suspendRelayoutUntil, 4561);
});

test("non-desktop overlay path moves native window with +140 relayout hold", () => {
  const h = createHarness();
  h.state.desktopMode = false;
  h.state.desktopBridge = "pywebview";
  h.state.dragData.lastGlobal = { x: 1, y: 2 };
  h.setNow(2000);
  const ret = h.pointerMoveDesktopBranch({
    data: { global: { x: 6, y: 8 } }
  });
  assert.strictEqual(ret, "return_overlay_window_drag");
  assert.strictEqual(h.calls.moved.length, 1);
  assertApproxEqual(h.calls.moved[0][0], 5);
  assertApproxEqual(h.calls.moved[0][1], 6);
  assert.strictEqual(h.state.suspendRelayoutUntil, 2140);
});

test("electron document move updates model/world coordinates", () => {
  const h = createHarness();
  const ret = h.onDocMoveElectron({ clientX: 60, clientY: 70 });
  assert.strictEqual(ret, "return_doc_move");
  assertApproxEqual(h.state.dragData.lastGlobal.x, 100);
  assertApproxEqual(h.state.dragData.lastGlobal.y, 100);
  assertApproxEqual(h.state.modelPosX, 103);
  assertApproxEqual(h.state.modelPosY, 98);
  assertApproxEqual(h.state.model.x, 103);
  assertApproxEqual(h.state.model.y, 98);
  assertApproxEqual(h.state.baseTransform.x, 103);
  assertApproxEqual(h.state.baseTransform.y, 98);
  assert.strictEqual(h.state.pointerDragMoved, true);
});

test("stopDesktopWindowDrag resets drag flags and accumulators", () => {
  const h = createHarness();
  h.state.windowDragActive = true;
  h.state.windowDragDx = 12;
  h.state.windowDragDy = -8;
  h.state.dragWindowAccumX = 12;
  h.state.dragWindowAccumY = -8;
  h.stopDesktopWindowDrag();
  assert.strictEqual(h.state.windowDragActive, false);
  assert.strictEqual(h.state.windowDragDx, 0);
  assert.strictEqual(h.state.windowDragDy, 0);
  assert.strictEqual(h.state.dragWindowAccumX, 0);
  assert.strictEqual(h.state.dragWindowAccumY, 0);
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
