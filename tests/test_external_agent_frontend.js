"use strict";
const assert = require("assert");
const api = require("../web/externalAgentController.js");
class Element {
  constructor() { this.children = []; this.handlers = {}; this.value = ""; this.hidden = false; }
  appendChild(el) { this.children.push(el); if (el.value && !this.value) this.value = el.value; return el; }
  replaceChildren() { this.children = []; }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  focus() {}
  get text() { return (this.textContent || "") + this.children.map(x => x.text).join("\n"); }
}
const plan = { summary: "完整计划", steps: ["step1", "step2"], files_to_delete: ["danger.txt"], files_to_modify: ["edit.txt"], files_to_create: ["new.txt"], commands: ["command1", "command2"], risk: "high", needs_network: true };
const task = { id: "a".repeat(32), status: "awaiting_approval", workdir: "allowed", plan };
async function main() {
  const doc = { createElement: () => new Element() }, container = new Element();
  api.renderTask(doc, container, task);
  for (const text of ["完整计划", "step1", "step2", "danger.txt", "edit.txt", "new.txt", "command1", "command2", "高风险", "计划需要网络"]) assert(container.text.includes(text));
  assert(container.children.some(x => x.className === "external-agent-danger" && x.text.includes("danger.txt")));
  const result = { ...task, status: "completed", changes: { created: [], modified: ["extra.txt"], deleted: [], out_of_plan: { created: [], modified: ["extra.txt"], deleted: [] }, out_of_plan_count: 1 } };
  api.renderTask(doc, container, result);
  assert(container.text.includes("out_of_plan") && container.text.includes("extra.txt"));
  assert(api.speechFor(result).includes("计划外"));
  const state = { speakingEnabled: true, micOpen: true }, calls = [];
  const narrator = api.createNarrator({ state, speak: async (text, opts) => calls.push({text, opts}) });
  await narrator.update(task); assert.equal(calls.length, 0);
  state.micOpen = false; state.chatBusy = true; await narrator.flush(); assert.equal(calls.length, 0);
  state.chatBusy = false; await narrator.flush(); assert.equal(calls.length, 1);
  for (let i = 0; i < 40; i++) await narrator.update(task);
  assert.equal(calls.length, 1, "same phase never repeats, even after 20 seconds");
  assert.equal(calls[0].opts.interrupt, false);
  state.speakingEnabled = false; await narrator.update(result); assert.equal(calls.length, 1);
  state.speakingEnabled = true; await narrator.flush(); assert.equal(calls.length, 2);
  const elements = {};
  doc.getElementById = id => elements[id] ||= new Element();
  const requests = []; let poll;
  const controller = api.createController({ document: doc, state, speak: async () => {}, interval: fn => { poll = fn; }, authFetch: async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => options?.method === "POST" ? { ok: true, task: { ...task, status: url.endsWith("cancel") ? "cancelled" : "awaiting_approval" } } : { ok: true, allowed_roots: ["allowed"], tasks: [] } };
  }});
  assert(!controller.offerDelegation("你觉得怎么整理比较好？"));
  assert(controller.offerDelegation("帮我去做文件整理"));
  await new Promise(resolve => setImmediate(resolve));
  assert(requests.every(x => x.options?.method !== "POST"), "chat delegation only opens form");
  await elements["external-agent-create"].handlers.click();
  assert.equal(requests.at(-1).url, "/api/agent/task");
  assert(container.text.includes("extra.txt"));
  await elements["external-agent-approve"].handlers.click();
  assert(requests.at(-1).url.endsWith("/approve"));
  await elements["external-agent-cancel"].handlers.click();
  assert(requests.at(-1).url.endsWith("/cancel"));
  assert(elements["external-agent-cancel"].hidden);
  const count = requests.length; await poll(); assert.equal(requests.length, count);
  const view = require("../web/toolMetaView.js");
  const row = new Element(); row.querySelector = () => null;
  view.renderToolMetaCards(row, { items: [{tool: "external_agent_task", pending_confirmation: true}] }, doc);
  assert.equal(row.children.length, 0, "generic approval card must hide external task");
  console.log("External agent cards, full plans, narration, explicit delegation and cancellation passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
