const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const {
  STORAGE_KEY,
  getLocalDateKey,
  resolveAutomaticRoom,
  resolveStoredPreference,
  getNextTransitionAt,
  createController
} = require(path.join(ROOT, "web", "stageThemeController.js"));

function localDate(year, month, day, hour, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

assert.strictEqual(resolveAutomaticRoom(localDate(2026, 7, 16, 6, 59)), "night");
assert.strictEqual(resolveAutomaticRoom(localDate(2026, 7, 16, 7, 0)), "day");
assert.strictEqual(resolveAutomaticRoom(localDate(2026, 7, 16, 18, 59)), "day");
assert.strictEqual(resolveAutomaticRoom(localDate(2026, 7, 16, 19, 0)), "night");
assert.strictEqual(getLocalDateKey(localDate(2026, 7, 6, 12)), "2026-07-06");

const sameDayManual = resolveStoredPreference(
  JSON.stringify({ mode: "night", selectedLocalDate: "2026-07-16" }),
  localDate(2026, 7, 16, 12)
);
assert.deepStrictEqual(sameDayManual, { mode: "night", selectedLocalDate: "2026-07-16" });
assert.deepStrictEqual(
  resolveStoredPreference(sameDayManual, localDate(2026, 7, 17, 0, 1)),
  { mode: "auto", selectedLocalDate: "" }
);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 6), "auto").getHours(), 7);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 12), "auto").getHours(), 19);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 20), "auto").getDate(), 17);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 20), "day").getHours(), 0);

const storageValues = new Map();
const storage = {
  getItem(key) { return storageValues.get(key) || null; },
  setItem(key, value) { storageValues.set(key, value); },
  removeItem(key) { storageValues.delete(key); }
};

function fakeButton(mode) {
  const classes = new Set();
  const listeners = new Map();
  return {
    dataset: { stageThemeMode: mode },
    attributes: {},
    classList: {
      toggle(name, active) { active ? classes.add(name) : classes.delete(name); }
    },
    addEventListener(type, handler) { listeners.set(type, handler); },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    hasClass(name) { return classes.has(name); },
    click() {
      let prevented = false;
      let stopped = false;
      listeners.get("click")?.({
        currentTarget: this,
        preventDefault() { prevented = true; },
        stopPropagation() { stopped = true; }
      });
      return { prevented, stopped };
    }
  };
}

const buttons = [fakeButton("auto"), fakeButton("day"), fakeButton("night")];
const group = { setAttribute() {} };
const scene = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 }) };
const microphone = { getBoundingClientRect: () => ({ left: 190, top: 392, width: 0, height: 0 }) };
const documentObject = {
  body: { dataset: {} },
  hidden: false,
  defaultView: {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  querySelectorAll(selector) { return selector === "[data-stage-theme-mode]" ? buttons : []; },
  querySelector(selector) {
    if (selector === ".stage-theme-switch") return group;
    if (selector === ".stage-scene") return scene;
    if (selector === '[data-stage-anchor="microphone"]') return microphone;
    return null;
  }
};

let currentNow = localDate(2026, 7, 16, 10);
const titleBarThemes = [];
const controller = createController({
  documentObject,
  storage,
  now: () => new Date(currentNow.getTime()),
  setTimeoutFn: () => 1,
  clearTimeoutFn: () => {},
  setTitleBarTheme: (room) => titleBarThemes.push(room)
});
assert.deepStrictEqual(controller.start(), { mode: "auto", room: "day" });
assert.strictEqual(titleBarThemes.at(-1), "day");
assert.strictEqual(documentObject.body.dataset.stageRoom, "day");
assert.strictEqual(buttons[0].attributes["aria-pressed"], "true");

const directClickResult = buttons[2].click();
assert.deepStrictEqual(directClickResult, { prevented: true, stopped: true });
assert.strictEqual(documentObject.body.dataset.stageRoom, "night");
assert.strictEqual(titleBarThemes.at(-1), "night");
assert.strictEqual(JSON.parse(storageValues.get(STORAGE_KEY)).selectedLocalDate, "2026-07-16");
assert.strictEqual(buttons[2].hasClass("is-active"), true);

const anchor = controller.getInteractionAnchor("microphone");
assert.strictEqual(anchor.room, "night");
assert.strictEqual(anchor.normalizedX, 0.19);
assert.strictEqual(anchor.normalizedY, 0.49);
assert.strictEqual(controller.getInteractionAnchor("unknown"), null);

currentNow = localDate(2026, 7, 17, 10);
assert.deepStrictEqual(controller.refresh("clock"), { mode: "auto", room: "day" });
assert.strictEqual(storageValues.has(STORAGE_KEY), false);
controller.stop();

const indexHtml = fs.readFileSync(path.join(ROOT, "web", "index.html"), "utf8");
const stageCss = fs.readFileSync(path.join(ROOT, "web", "stage.css"), "utf8");
for (const anchorName of ["window", "microphone", "sofa", "guitar"]) {
  assert(indexHtml.includes(`data-stage-anchor="${anchorName}"`), `missing ${anchorName} anchor`);
}
assert(indexHtml.includes("./stageThemeController.js"));
assert(stageCss.includes('./assets/stage-rooms/day-room-v1.webp'));
assert(stageCss.includes('./assets/stage-rooms/night-room-v1.webp'));
assert(indexHtml.includes('rel="preload" href="./assets/stage-rooms/day-room-v1.webp"'));
assert(indexHtml.includes('rel="preload" href="./assets/stage-rooms/night-room-v1.webp"'));
assert(fs.existsSync(path.join(ROOT, "web", "assets", "stage-rooms", "day-room-v1.webp")));
assert(fs.existsSync(path.join(ROOT, "web", "assets", "stage-rooms", "night-room-v1.webp")));

console.log("Stage day/night theme frontend checks passed.");
