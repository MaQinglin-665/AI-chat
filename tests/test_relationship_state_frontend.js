"use strict";

const assert = require("assert");
const relationship = require("../web/relationshipStateController.js");

class FakeNode {
  constructor(value = "") {
    this.value = value;
    this.checked = false;
    this.disabled = false;
    this.textContent = "";
    this.listeners = {};
  }

  addEventListener(name, handler) {
    this.listeners[name] = handler;
  }
}

function makeUi() {
  return {
    relationshipStateSummary: new FakeNode(),
    relationshipStateUpdated: new FakeNode(),
    relationshipStateEnabled: new FakeNode(),
    relationshipStateAddress: new FakeNode(),
    relationshipStateReplyLength: new FakeNode(),
    relationshipStateAdviceStyle: new FakeNode(),
    relationshipStateTeasing: new FakeNode(),
    relationshipStateReloadBtn: new FakeNode(),
    relationshipStateSaveBtn: new FakeNode(),
    relationshipStateResetBtn: new FakeNode(),
    relationshipStateStatus: new FakeNode()
  };
}

function response(payload, ok = true) {
  return { ok, json: async () => payload };
}

async function run() {
  const ui = makeUi();
  const requests = [];
  const statuses = [];
  const authFetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url === "/api/relationship_state") {
      return response({
        ok: true,
        available: true,
        state: {
          revision: 4,
          enabled: true,
          updated_at: "2026-07-10T10:00:00+08:00",
          familiarity: { level: "known", eligible_turns: 8 },
          entries: [
            { key: "address", value: "Quinn", source: "manual", status: "pinned" },
            { key: "reply_length", value: "concise" },
            { key: "desktop_access", value: "enabled" }
          ]
        }
      });
    }
    const body = JSON.parse(options.body || "{}");
    if (body.action === "reset") {
      return response({
        ok: true,
        available: true,
        state: { revision: 6, enabled: true, familiarity: { level: "new", eligible_turns: 0 }, entries: [] }
      });
    }
    return response({
      ok: true,
      available: true,
      state: {
        revision: 5,
        enabled: body.enabled,
        familiarity: { level: "known", eligible_turns: 8 },
        entries: body.entries.filter((entry) => entry.value)
      }
    });
  };

  const controller = relationship.createController({
    ui,
    authFetch,
    setStatus: (message) => statuses.push(message),
    confirmFunc: () => true
  });
  controller.bindRelationshipStateControls();
  await controller.loadRelationshipState();

  assert.equal(ui.relationshipStateAddress.value, "Quinn");
  assert.equal(ui.relationshipStateReplyLength.value, "concise");
  assert.match(ui.relationshipStateSummary.textContent, /已经熟悉/);
  assert.match(ui.relationshipStateUpdated.textContent, /2 项偏好/);
  assert.equal(ui.relationshipStateSaveBtn.disabled, false);
  assert.equal(Object.prototype.hasOwnProperty.call(ui.relationshipStateSummary, "innerHTML"), false);

  ui.relationshipStateAddress.value = "小Q";
  ui.relationshipStateReplyLength.value = "detailed";
  ui.relationshipStateAdviceStyle.value = "ask_first";
  ui.relationshipStateTeasing.value = "gentle";
  ui.relationshipStateEnabled.checked = false;
  assert.equal(await controller.saveRelationshipState(), true);
  const saveBody = JSON.parse(requests.at(-1).options.body);
  assert.equal(saveBody.action, "upsert");
  assert.equal(saveBody.enabled, false);
  assert.deepEqual(saveBody.entries, [
    { key: "address", value: "小Q" },
    { key: "reply_length", value: "detailed" },
    { key: "advice_style", value: "ask_first" },
    { key: "teasing", value: "gentle" }
  ]);
  assert.match(ui.relationshipStateStatus.textContent, /已保存/);
  assert(statuses.some((message) => /已保存/.test(message)));

  assert.equal(await controller.resetRelationshipState(), true);
  assert.equal(ui.relationshipStateAddress.value, "");
  assert.match(ui.relationshipStateSummary.textContent, /0 次真实互动/);

  controller.render({ available: false, state: { enabled: true, familiarity: { eligible_turns: 0 }, entries: [] } });
  assert.equal(ui.relationshipStateSaveBtn.disabled, true);
  assert.equal(ui.relationshipStateAddress.disabled, true);
  assert.match(ui.relationshipStateSummary.textContent, /尚未在本地配置中启用/);

  const normalized = relationship.normalizeRelationshipState({
    enabled: true,
    familiarity: { eligible_turns: 99999999, level: "unknown" },
    entries: [
      { key: "address", value: "<img src=x>", source: "manual" },
      { key: "teasing", value: "playful" },
      { key: "permissions", value: "all" }
    ]
  });
  assert.equal(normalized.familiarity.eligible_turns, 1000000);
  assert.equal(normalized.familiarity.level, "familiar");
  assert.deepEqual(normalized.entries.map((entry) => entry.key), ["address", "teasing"]);

  console.log("[OK] relationship state frontend tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
