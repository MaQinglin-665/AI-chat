const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const {
  STORAGE_KEY,
  SCENES,
  MODES,
  getLocalDateKey,
  resolveAutomaticScene,
  resolveBaseRoom,
  resolveAutomaticRoom,
  resolveStoredPreference,
  getNextTransitionAt,
  formatLocalTime,
  createController
} = require(path.join(ROOT, "web", "stageThemeController.js"));

function localDate(year, month, day, hour, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

assert.deepStrictEqual(SCENES, ["morning", "day", "dusk", "night"]);
assert.deepStrictEqual(MODES, ["auto", "morning", "day", "dusk", "night"]);
assert.strictEqual(resolveAutomaticScene(localDate(2026, 7, 16, 4, 59)), "night");
assert.strictEqual(resolveAutomaticScene(localDate(2026, 7, 16, 5, 0)), "morning");
assert.strictEqual(resolveAutomaticScene(localDate(2026, 7, 16, 9, 0)), "day");
assert.strictEqual(resolveAutomaticScene(localDate(2026, 7, 16, 17, 0)), "dusk");
assert.strictEqual(resolveAutomaticScene(localDate(2026, 7, 16, 20, 0)), "night");
assert.strictEqual(resolveAutomaticRoom(localDate(2026, 7, 16, 18, 59)), "day");
assert.strictEqual(resolveBaseRoom("dusk"), "day");
assert.strictEqual(resolveBaseRoom("night"), "night");
assert.strictEqual(formatLocalTime(localDate(2026, 7, 16, 7, 5)), "07:05");
assert.strictEqual(getLocalDateKey(localDate(2026, 7, 6, 12)), "2026-07-06");

const sameDayManual = resolveStoredPreference(
  JSON.stringify({ mode: "night", selectedLocalDate: "2026-07-16" }),
  localDate(2026, 7, 16, 12)
);
assert.deepStrictEqual(sameDayManual, { mode: "night", selectedLocalDate: "2026-07-16" });
assert.deepStrictEqual(
  resolveStoredPreference(sameDayManual, localDate(2026, 7, 17, 0, 1)),
  { mode: "night", selectedLocalDate: "2026-07-16" }
);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 4), "auto").getHours(), 5);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 7), "auto").getHours(), 9);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 12), "auto").getHours(), 17);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 18), "auto").getHours(), 20);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 21), "auto").getDate(), 17);
assert.strictEqual(getNextTransitionAt(localDate(2026, 7, 16, 20), "day"), null);

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

const buttons = MODES.map(fakeButton);
const menuToggle = fakeButton("toggle");
const menu = { hidden: true };
const status = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
const label = { textContent: "" };
const clock = { textContent: "" };
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
    if (selector === "#stage-time-status") return status;
    if (selector === "#stage-time-label") return label;
    if (selector === "#stage-time-clock") return clock;
    if (selector === "#stage-scene-menu") return menu;
    if (selector === "#scene-btn") return menuToggle;
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
assert.deepStrictEqual(controller.start(), { mode: "auto", scene: "day", room: "day" });
assert.strictEqual(titleBarThemes.at(-1), "day");
assert.strictEqual(documentObject.body.dataset.stageRoom, "day");
assert.strictEqual(documentObject.body.dataset.stageScene, "day");
assert.strictEqual(buttons[0].attributes["aria-pressed"], "true");
assert.strictEqual(label.textContent, "白天");
assert.strictEqual(clock.textContent, "10:00");

const menuClickResult = menuToggle.click();
assert.deepStrictEqual(menuClickResult, { prevented: true, stopped: true });
assert.strictEqual(menu.hidden, false);
assert.strictEqual(menuToggle.attributes["aria-expanded"], "true");

const directClickResult = buttons[4].click();
assert.deepStrictEqual(directClickResult, { prevented: true, stopped: true });
assert.strictEqual(documentObject.body.dataset.stageRoom, "night");
assert.strictEqual(documentObject.body.dataset.stageScene, "night");
assert.strictEqual(titleBarThemes.at(-1), "night");
assert.strictEqual(JSON.parse(storageValues.get(STORAGE_KEY)).selectedLocalDate, "2026-07-16");
assert.strictEqual(buttons[4].hasClass("is-active"), true);
assert.strictEqual(menu.hidden, true);

const anchor = controller.getInteractionAnchor("microphone");
assert.strictEqual(anchor.room, "night");
assert.strictEqual(anchor.normalizedX, 0.19);
assert.strictEqual(anchor.normalizedY, 0.49);
assert.strictEqual(controller.getInteractionAnchor("unknown"), null);

currentNow = localDate(2026, 7, 17, 10);
assert.deepStrictEqual(controller.refresh("clock"), { mode: "night", scene: "night", room: "night" });
assert.strictEqual(storageValues.has(STORAGE_KEY), true);
controller.setMode("auto");
assert.deepStrictEqual(controller.refresh("clock"), { mode: "auto", scene: "day", room: "day" });
assert.strictEqual(storageValues.has(STORAGE_KEY), false);
controller.stop();

const indexHtml = fs.readFileSync(path.join(ROOT, "web", "index.html"), "utf8");
const stageCss = fs.readFileSync(path.join(ROOT, "web", "stage.css"), "utf8");
const sceneCss = fs.readFileSync(path.join(ROOT, "web", "sceneExperience.css"), "utf8");
const earlyBootstrap = fs.readFileSync(path.join(ROOT, "web", "earlyViewBootstrap.js"), "utf8");
for (const anchorName of ["window", "microphone", "sofa", "guitar"]) {
  assert(indexHtml.includes(`data-stage-anchor="${anchorName}"`), `missing ${anchorName} anchor`);
}
assert(indexHtml.includes("./stageThemeController.js"));
assert(indexHtml.includes("./sceneExperience.css"));
assert(indexHtml.includes('id="stage-time-status"'));
assert(indexHtml.includes('id="scene-btn"'));
assert(indexHtml.includes('data-stage-theme-mode="morning"'));
assert(indexHtml.includes('data-stage-theme-mode="dusk"'));
assert(!indexHtml.includes('id="help-btn" type="button">上手</button>'));
assert(stageCss.includes('./assets/stage-rooms/day-room-v1.webp'));
assert(stageCss.includes('./assets/stage-rooms/morning-room-v1.webp'));
assert(stageCss.includes('./assets/stage-rooms/dusk-room-v1.webp'));
assert(stageCss.includes('./assets/stage-rooms/night-room-v2.webp'));
assert(indexHtml.includes('rel="preload" href="./assets/stage-rooms/day-room-v1.webp"'));
assert(indexHtml.includes('rel="preload" href="./assets/stage-rooms/morning-room-v1.webp"'));
assert(indexHtml.includes('rel="preload" href="./assets/stage-rooms/dusk-room-v1.webp"'));
assert(indexHtml.includes('rel="preload" href="./assets/stage-rooms/night-room-v2.webp"'));
assert(fs.existsSync(path.join(ROOT, "web", "assets", "stage-rooms", "day-room-v1.webp")));
assert(fs.existsSync(path.join(ROOT, "web", "assets", "stage-rooms", "morning-room-v1.webp")));
assert(fs.existsSync(path.join(ROOT, "web", "assets", "stage-rooms", "dusk-room-v1.webp")));
assert(fs.existsSync(path.join(ROOT, "web", "assets", "stage-rooms", "night-room-v2.webp")));
assert(indexHtml.includes('class="stage-room-background stage-room-background-morning"'));
assert(indexHtml.includes('class="stage-room-background stage-room-background-dusk"'));
assert(sceneCss.includes('body[data-stage-scene="morning"]'));
assert(sceneCss.includes('body[data-stage-scene="dusk"]'));
assert(
  sceneCss.includes('body[data-stage-scene="night"] .stage-room-background-night'),
  "night should reveal the generated same-room night artwork"
);
assert(sceneCss.includes('body[data-stage-scene="morning"] .stage-room-background-morning'), "morning should reveal its generated dawn artwork");
assert(sceneCss.includes('body[data-stage-scene="dusk"] .stage-room-background-dusk'), "dusk should reveal its generated sunset artwork");
assert(
  sceneCss.includes('body[data-stage-scene] .stage-room-background-day')
    && sceneCss.includes('body[data-stage-scene] .stage-room-background-morning')
    && sceneCss.includes('body[data-stage-scene] .stage-room-background-dusk')
    && sceneCss.includes('body[data-stage-scene] .stage-room-background-night')
    && sceneCss.includes("opacity: 0;"),
  "scene switching should hide every inactive time-scene background before revealing the selected one"
);
assert(sceneCss.includes('body[data-stage-scene="night"] .stage-room-atmosphere'), "night should have a dedicated blue atmosphere");
assert(sceneCss.includes("prefers-reduced-motion: reduce"));
assert(earlyBootstrap.includes('document.body.dataset.stageScene = scene'), "early paint should use the resolved four-phase scene");
assert(earlyBootstrap.includes('localStorage.getItem("taffy.stage-room.v1")'), "early paint should respect a persistent manual scene lock");

console.log("Four-phase stage theme frontend checks passed.");
