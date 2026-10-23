"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { appendRotating } = require("../electron/rotatingLog");
const startup = require("../web/appStartupController");
const dev = require("../web/devFeatureLoader");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "pet-log-test-"));
const file = path.join(folder, "test.log");
try {
  appendRotating(file, Buffer.alloc(35, 65), 10);
  assert.strictEqual(fs.statSync(file).size, 5);
  assert.strictEqual(fs.statSync(`${file}.1`).size, 10);
} finally {
  fs.unlinkSync(file); fs.unlinkSync(`${file}.1`); fs.rmdirSync(folder);
}
assert.deepStrictEqual(dev.installDeveloperFeatureScripts({write(){throw Error("unexpected script");}}, {enabled:false}).scripts, []);
for (const name of ["followupDebugController", "grayTrialReportController", "grayTrialCharacterPanelController", "performanceTimelineController"]) {
  assert(dev.DEVELOPER_FEATURE_SCRIPTS.includes(`./${name}.js`));
}
(async () => {
  let activate;
  let initialized = 0;
  const state = {uiView:"model"};
  const controller = startup.createController({
    state,
    windowObject: {setTimeout:()=>0, clearTimeout(){}, BroadcastChannel: class {close(){}},
      electronAPI: {getSurfaceActive:async()=>false, onSurfaceActiveChanged(fn){activate=fn;}}},
    loadConfig:async()=>{}, ensureLive2DRuntime:async()=>{},
    initLive2D:async()=>{initialized++;}, setStatus(){}
  });
  await controller.main();
  assert.strictEqual(initialized, 0, "inactive model must not load its assets");
  activate(true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.strictEqual(initialized, 1);
  activate(false); activate(true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.strictEqual(initialized, 1, "reactivation reuses existing model");
  console.log("Readiness resource checks passed");
})().catch(error=>{console.error(error);process.exitCode=1;});
