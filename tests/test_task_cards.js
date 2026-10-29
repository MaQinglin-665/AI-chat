"use strict";
const assert = require("node:assert/strict");
const M = require("../web/taskCardModel.js");
const { createController } = require("../web/externalAgentController.js");
const chat = require("../web/chatMessageController.js");
const task = (status = "awaiting_approval") => ({ id: "a".repeat(32), status, goal_summary: "整理测试材料", workdir: "approved", created_at: 1, progress_count: 0, approval_warnings: { deletes: [], high_risk: false, needs_network: false },
  plan: { summary: "保留内容", steps: ["检查", "整理"], commands: ["example"], risk: "low", needs_network: false,
    files_to_create: ["to/a.txt", "folder"], files_to_modify: [], files_to_delete: ["a.txt"] }, planned_moves: [{ from: "a.txt", to: "to/a.txt" }] });
class Element {
  constructor() { this.children = []; this.handlers = {}; this.value = ""; this.hidden = false; this.dataset = {}; }
  appendChild(el) { this.children.push(el); if (el.value && !this.value) this.value = el.value; return el; }
  replaceChildren() { this.children = []; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  focus() {}
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
function setup(handler, useView = false) {
  const elements = {}, calls = [], speeches = []; let poll;
  if (useView) global.TaffyTaskCardView = { createView: () => ({ render() {}, showComposer() {}, mount() {}, created() {}, reveal() {} }) };
  const controller = createController({ document: { getElementById: id => elements[id] ||= new Element(), createElement: () => new Element() },
    authFetch: async (url, options) => { calls.push({ url, options }); return handler(url, options); },
    state: { speakingEnabled: true }, speak: async text => speeches.push(text), interval: fn => { poll = fn; } });
  delete global.TaffyTaskCardView;
  return { controller, calls, speeches, poll: () => poll(), elements };
}
async function main() {
  assert.deepEqual(M.model(task()).counts, { move: 1, create: 1, modify: 0, delete: 0 }, "moves are not counted twice");
  for (const state of ["planning", "awaiting_approval", "executing", "completed", "failed", "cancelled", "expired"]) {
    const data = M.model(task(state)); assert(data.label[0]); assert.equal(data.canApprove, state === "awaiting_approval"); assert.equal(data.terminal, M.terminal.has(state));
  }
  assert.equal(M.model({ ...task("executing"), cancel_requested: true }).status, "cancel_pending");
  assert.equal(M.model(task("unknown")).canApprove, false);
  assert.equal(M.model({ ...task(), plan: null }).canApprove, false);
  assert(M.model({ ...task("completed"), verification_error: "not verified" }).needsReview);
  assert(M.model({ ...task("completed"), changes: { planned_not_observed: { created: ["x"] } } }).needsReview);
  assert(M.model({ ...task(), plan: { ...task().plan, files_to_create: Array.from({ length: 11 }, (_, i) => `file${i}`) } }).large);
  for (const status of [401, 403, 404, 409, 500, 0]) assert(M.errorMessage({ status }).length > 10);

  let current = task(), failure = null;
  const context = setup(async (url, options) => {
    if (failure) return response({ ok: false }, failure);
    if (!options.method) return response(url === "/api/agent/task" ? { ok: true, tasks: [current], allowed_roots: ["approved"] } : { ok: true, task: current });
    current = { ...current, status: url.endsWith("cancel") ? "cancelled" : "executing" }; return response({ ok: true, task: current });
  }, true);
  await tick(); assert.equal(context.speeches.length, 0, "restoring tasks is silent");
  for (let i = 0; i < 100; i++) await context.poll();
  assert.equal(context.controller.snapshot().tasks.length, 1); assert.equal(context.speeches.length, 0);
  for (const status of [401, 403, 404, 409, 500]) {
    failure = status; await context.controller.approve(current.id);
    assert.equal(context.controller.snapshot().tasks[0].plan.summary, "保留内容");
    // Clear previous failure via an explicit successful read before trying a new action.
    assert(context.controller.snapshot().errors[current.id]); failure = null; await context.controller.refresh(current.id);
  }
  assert.equal(context.calls.filter(call => call.url.endsWith("approve")).length, 5, "no automatic approval retry");
  await context.controller.approve(current.id); assert.equal(context.controller.snapshot().tasks[0].status, "executing");
  assert.equal(context.speeches.length, 1); await context.controller.cancel(current.id);
  assert.equal(context.controller.snapshot().tasks[0].status, "cancelled");
  const count = context.calls.length; await context.poll(); assert.equal(context.calls.length, count, "terminal stops task polling");

  const slowGet = deferred(), slowApprove = deferred(); let initial = true;
  const race = setup((url, options) => {
    if (options.method) return slowApprove.promise;
    if (initial) { initial = false; return response({ ok: true, tasks: [task()], allowed_roots: ["approved"] }); }
    return slowGet.promise;
  }, true);
  await tick(); const read = race.poll(); const action = race.controller.approve(task().id);
  assert(race.controller.snapshot().busy);
  await race.controller.cancel(task().id); assert.equal(race.calls.filter(c => c.options.method).length, 1, "cross-view busy guard");
  slowApprove.resolve(response({ ok: true, task: task("executing") })); await action;
  slowGet.resolve(response({ ok: true, task: task() })); await read;
  assert.equal(race.controller.snapshot().tasks[0].status, "executing", "stale GET cannot roll back an action");

  const lost = setup(async () => { throw new Error("offline"); }, true);
  await tick(); await lost.controller.create("goal", "not-authorized");
  assert.equal(lost.calls.length, 1, "no unauthorized root or create retry");
  assert(lost.controller.snapshot().formError);
  const nonJson = setup(async () => ({ ok: false, status: 403, json: async () => { throw new SyntaxError("not JSON"); } }), true);
  await tick(); assert.equal(nonJson.controller.snapshot().formError.status, 403);
  assert.equal(nonJson.calls.length, 1);
  const state = { chatRecords: [{ role: "user", content: "hello" }, { kind: "task", role: "assistant", content: "private plan" }], history: [] };
  const messages = chat.createController({ state }); messages.syncConversationHistoryFromChatRecords();
  assert.deepEqual(state.history, [{ role: "user", content: "hello" }]); assert.equal(messages.normalizeChatRecord(state.chatRecords[1]), null);
  console.log("Task cards: states/counts, silent recovery, 100 polls, auth failures, response ordering, busy guard and history isolation passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
