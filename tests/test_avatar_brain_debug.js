"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const calls = [], listeners = [], intervals = [];
let executed = 0;
const root = {
  console: { debug() {} },
  document: { body: { dataset: { stageRoom: "day" } }, addEventListener(n) { listeners.push(n); }, removeEventListener() {} },
  addEventListener(n) { listeners.push(n); }, removeEventListener() {},
  setInterval(fn) { intervals.push(fn); return 1; }, clearInterval() {},
  authFetch: async (url, options) => { calls.push([url, JSON.parse(options.body)]); return { json: async () => ({ plans: [{ actions: [{ type: "sit" }] }] }) }; },
  __xinyuAvatarRenderer: { metrics: () => ({ world: { position: [1, 2], name: "rest" }, room: { preset: "room" } }),
    capabilities: () => ({ actions: ["wave"] }), playAction() { executed++; } },
  XinyuVRMScene: { layout: () => ({ activityPoints: { accompany: [0, 0], rest: [1, 2] } }) }
};
vm.runInNewContext(fs.readFileSync("web/avatar/avatarBrainDebug.js", "utf8"), { window: root, Date });
(async () => {
  const api = root.XinyuAvatarBrainDebug;
  assert.equal(calls.length, 0);
  assert.equal(intervals.length, 0); // No opt-in, no traffic or background timer.
  await api.send();
  assert.equal(calls[0][0], "/api/avatar/brain/world");
  assert.deepEqual(calls[0][1].places, ["accompany", "rest"]);
  await api.start(); await api.start();
  assert.equal(intervals.length, 1);
  await api.poll(); await api.think(); api.stop();
  assert.equal(executed, 0);
  assert(!calls.some(([url]) => url.endsWith("/ack")));
  console.log("avatar brain console debugger: passed");
})().catch(err => { console.error(err); process.exitCode = 1; });
