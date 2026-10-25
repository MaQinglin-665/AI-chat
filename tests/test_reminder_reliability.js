"use strict";

const assert = require("assert");
const utils = require("../web/reminderUtils.js");
const form = require("../web/scheduleFormModel.js");
const registry = require("../web/localCommandRegistry.js");
const executor = require("../web/localCommandExecutor.js");
const schedule = require("../web/reminderScheduleController.js");
const storage = require("../web/storageController.js");
const listView = require("../web/scheduleListView.js");
const tick = () => new Promise(resolve => setImmediate(resolve));
const fixedNow = new Date(2026, 9, 24, 12).getTime();

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

function fixture(mode = "assistant", response = async () => false) {
  let clock = Date.now();
  const item = { id: 1, text: "交实验报告", dueAt: clock - 1000, done: false, repeat: "once", mode };
  const state = { reminders: [item], reminderSeq: 2 };
  const localStorage = memoryStorage();
  const storageDeps = { windowObject: { localStorage }, ...utils };
  let calls = 0, handlers = null;
  const statuses = [], requests = [];
  const controller = schedule.createController({
    state, now: () => clock, reminderUtils: utils, ui: { scheduleList: {} },
    scheduleListView: { renderScheduleList: (_node, _items, options) => { handlers = options; } },
    requestAssistantReply: (...args) => { calls++; requests.push(args); return response(...args); },
    setStatus: status => statuses.push(status),
    saveRemindersToStorage: () => storage.saveReminders(state, storageDeps)
  });
  return { item, state, controller, statuses, requests, storageDeps,
    get calls() { return calls; }, get now() { return clock; }, get handlers() { return handlers; },
    advance: ms => { clock += ms; } };
}

async function main() {
  assert.strictEqual(utils.parseReminderWhen("10m", { now: () => fixedNow }), fixedNow + 600000);
  assert.strictEqual(utils.parseReminderWhen("21:30", { now: () => fixedNow }), new Date(2026, 9, 24, 21, 30).getTime());
  for (const input of ["25:90", "24:00", "12:60", "2026-02-30 09:00", "2026-00-12 09:00", "2026-11-31 09:00", "2026-01-01 99:00", "2026-01-00 09:00", "0m"]) {
    assert.strictEqual(utils.parseReminderWhen(input, { now: () => fixedNow }), 0, input);
  }
  assert.strictEqual(utils.parseReminderWhen("2028-02-29T09:00"), new Date(2028, 1, 29, 9).getTime());
  assert.strictEqual(utils.parseReminderWhen("2026-02-29 09:00"), 0);
  assert.strictEqual(utils.parseReminderWhen("01:00", { now: () => fixedNow }), new Date(2026, 9, 25, 1).getTime());
  assert.strictEqual(form.buildScheduleDraft({ rawDate: "2026-02-30T09:00", text: "报告" }, { now: () => fixedNow }).reason, "invalid_time");
  assert.ok(form.buildScheduleDraft({ rawDate: "2026-11-01T09:00", text: "报告" }, { now: () => fixedNow }).ok);

  const created = [], messages = [];
  const commands = executor.createLocalCommandHandlers({
    appendMessage: (_role, value) => messages.push(value),
    parseReminderWhen: value => utils.parseReminderWhen(value, { now: () => Date.now() }),
    formatReminderTime: utils.formatReminderTime,
    addReminder: (text, dueAt) => { created.push({ text, dueAt }); return created.length; }
  });
  for (const input of ["/提醒 2099-11-01 09:00 交报告", "/提醒 2099-11-01T09:00 交报告", "/提醒 10 分钟 喝水", "/提醒 30s 休息"]) {
    const command = registry.matchLocalCommand(input);
    commands[command.kind](command);
  }
  assert.strictEqual(created.length, 4);
  assert.deepStrictEqual(created[0], { text: "交报告", dueAt: new Date(2099, 10, 1, 9).getTime() });
  for (const input of ["/提醒 2000-01-01 09:00 过去", "/提醒 25:90 错误", "/提醒 2099-02-30 09:00 错误"]) commands.reminder_add(registry.matchLocalCommand(input));
  assert.strictEqual(created.length, 4, "invalid or past command must not create a reminder");

  const statuses = [], ui = {
    scheduleDatetime: { value: "2099-11-01T09:00", focus() {} }, scheduleTask: { value: "交报告", focus() {} },
    scheduleRepeat: { value: "once" }, scheduleMode: { value: "reminder" }
  };
  const save = schedule.createController({ state: { reminders: [], reminderSeq: 1 }, ui,
    reminderUtils: utils, scheduleFormModel: form, setStatus: value => statuses.push(value) });
  save.saveScheduleFromForm();
  assert.strictEqual(statuses[0], "已添加日程 #1");

  const retry = fixture();
  retry.controller.runReminderCheck();
  retry.controller.runReminderCheck();
  await tick();
  assert.strictEqual(retry.calls, 1, "polling cannot overlap a scheduled execution");
  assert.strictEqual(retry.item.retryAt, retry.now + 30000);
  retry.controller.runReminderCheck();
  await tick();
  assert.strictEqual(retry.calls, 1);
  retry.advance(30000);
  retry.controller.runReminderCheck(); await tick();
  assert.strictEqual(retry.calls, 2);
  assert.strictEqual(retry.item.retryAt, retry.now + 120000);
  retry.advance(120000);
  retry.controller.runReminderCheck(); await tick();
  assert.strictEqual(retry.calls, 3);
  assert.strictEqual(retry.item.retryPaused, true);
  retry.advance(86400000);
  retry.controller.runReminderCheck(); await tick();
  assert.strictEqual(retry.calls, 3, "failed occurrence has a bounded automatic retry budget");
  const reloaded = {};
  storage.loadReminders(reloaded, retry.storageDeps);
  assert.strictEqual(reloaded.reminders[0].retryAttempts, 3);
  assert.strictEqual(reloaded.reminders[0].retryPaused, true);
  retry.controller.renderScheduleList();
  retry.handlers.onRetry(retry.item);
  assert.ok(!retry.item.retryPaused);
  retry.controller.runReminderCheck(); await tick();
  assert.strictEqual(retry.calls, 4, "user may explicitly start a new attempt budget");

  const tool = fixture("tool");
  tool.controller.runReminderCheck(); await tick();
  tool.advance(86400000); tool.controller.runReminderCheck(); await tick();
  assert.strictEqual(tool.calls, 1, "tool failures must not automatically repeat possible side effects");
  assert.strictEqual(tool.item.retryPaused, true);
  assert.strictEqual(tool.requests[0][1].forceTools, true);

  const throwing = fixture("assistant", () => { throw new Error("offline"); });
  throwing.controller.runReminderCheck(); await tick();
  assert.strictEqual(throwing.item.retryAttempts, 1);
  assert.ok(throwing.item.retryAt > throwing.now);

  const daily = fixture("assistant");
  daily.item.repeat = "daily";
  daily.item.dueAt -= 4 * 86400000;
  const originalDate = daily.item.dueAt;
  daily.controller.runReminderCheck(); await tick();
  const dailyReloaded = {};
  storage.loadReminders(dailyReloaded, daily.storageDeps);
  assert.strictEqual(dailyReloaded.reminders[0].dueAt, originalDate, "reload must not replace the failed occurrence");
  assert.strictEqual(dailyReloaded.reminders[0].retryAttempts, 1);
  assert.strictEqual(dailyReloaded.reminders[0].retryAt, daily.item.retryAt);

  let resolvePending;
  const pending = fixture("assistant", () => new Promise(resolve => { resolvePending = resolve; }));
  pending.controller.runReminderCheck(); await tick();
  pending.controller.runReminderCheck(); await tick();
  assert.strictEqual(pending.calls, 1);
  pending.controller.removeReminderById(1);
  resolvePending(false); await tick();
  assert.deepStrictEqual(pending.state.reminders, [], "late response must not resurrect a deleted reminder");

  const success = fixture("assistant", async () => true);
  success.item.repeat = "daily";
  success.item.dueAt -= 4 * 86400000;
  success.controller.runReminderCheck(); await tick();
  assert.ok(success.item.dueAt > success.now, "daily success skips missed historical occurrences");
  assert.ok(!("retryAttempts" in success.item), "success resets the next occurrence's budget");

  const interruptedTool = fixture("tool");
  interruptedTool.item.retryAttempts = 1;
  storage.saveReminders(interruptedTool.state, interruptedTool.storageDeps);
  const afterCrash = {};
  storage.loadReminders(afterCrash, interruptedTool.storageDeps);
  assert.strictEqual(afterCrash.reminders[0].retryPaused, true, "restarted tool execution requires explicit recovery");

  // Exercise the real list view and its accessible recovery button without a browser dependency.
  function node() { return { children: [], appendChild(child) { this.children.push(child); }, setAttribute(k, v) { this[k] = v; }, addEventListener(event, callback) { this[event] = callback; } }; }
  const container = node(), doc = { createElement: () => node() };
  let retried = null;
  listView.renderScheduleList(container, [tool.item], { ...utils, onRetry: item => { retried = item; } }, doc);
  const buttons = container.children[0].children[1].children;
  assert.strictEqual(buttons[0].textContent, "重试");
  buttons[0].click();
  assert.strictEqual(retried, tool.item);
  console.log("[OK] Reminder dates, commands, status, retry budget, persistence, recovery and cancellation regressions passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
