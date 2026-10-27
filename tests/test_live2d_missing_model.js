"use strict";
const assert = require("node:assert/strict");
const api = require("../web/live2dRuntimeController.js");
(async () => {
  const messages = [], statuses = [], state = { config: { avatar: { kind: "live2d" } } };
  const host = { XinyuAvatarRuntime: { describe: async () => { throw Error("400 model unavailable"); } } };
  const controller = api.createController({ state, windowObject: host, setStatus: x => statuses.push(x), appendMessage: (...args) => messages.push(args) });
  await controller.ensureLive2DRuntime();
  assert.equal(await controller.initLive2D(), null); assert.equal(state.avatarLoadUnavailable, true);
  assert.match(statuses.at(-1), /本地.*不可用/); assert.match(messages[0][1], /models_local/); assert.match(messages[0][1], /avatar.path/);
  // The Live2D guide must not swallow VRM/other renderer failures.
  state.config.avatar.kind = "vrm"; await assert.rejects(controller.ensureLive2DRuntime(), /400/);
  console.log("Missing local Live2D shows guide without rendering/crashing; other renderer failures preserved.");
})().catch(error => { console.error(error); process.exitCode = 1; });
