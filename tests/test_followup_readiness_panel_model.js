#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const MODEL_JS = path.resolve(__dirname, "..", "web", "followupReadinessPanelModel.js");
const model = require(MODEL_JS);

function testBuildBackendEntryViewNormalizesNestedSummary() {
  const state = {
    followupReadinessBackendEntrySummary: {
      read_only: true,
      skeleton_only: true,
      default_off_baseline: true,
      configured_enabled: true,
      entry_ready: false,
      blocked_reasons: [" backend_entry_not_wired ", "", null],
      guard_contract: {
        read_only: true,
        fail_closed: true,
        required_checks: ["explicit switch"],
        disallowed_actions: ["shell"],
        rollback: ["disable flag"],
        operator_confirmation: "CONFIRM"
      },
      entry_execution_preview: {
        read_only: true,
        dry_run: true,
        accepted: false,
        would_execute: false,
        request_type: "automatic_character_runtime",
        requested_action: "emit_runtime_cue",
        blocked_reasons: [" runtime_cue_disabled "]
      },
      next_action: "Keep preview-only"
    },
    followupReadinessBackendEntryLoading: true,
    followupReadinessBackendEntryError: "network",
    followupReadinessBackendEntryLastRefreshAt: 10,
    followupReadinessBackendEntryLastSuccessAt: 8
  };

  assert.deepStrictEqual(model.buildBackendEntryView(state), {
    loaded: true,
    loading: true,
    error: "network",
    readOnly: true,
    skeletonOnly: true,
    defaultOffBaseline: true,
    configuredEnabled: true,
    configuredReturnMetadata: false,
    configuredDemoStable: false,
    configuredPersonaOverrideEnabled: false,
    explicitEnableRequired: false,
    automaticRuntimeConnected: false,
    schedulerDefaultChanged: false,
    configWriteEnabled: false,
    runtimeCueEnabled: false,
    live2dEnabled: false,
    ttsEnabled: false,
    entryReady: false,
    blockedReasons: ["backend_entry_not_wired"],
    guardContractReadOnly: true,
    guardContractFailClosed: true,
    guardContractRequiredChecks: ["explicit switch"],
    guardContractDisallowedActions: ["shell"],
    guardContractRollbackSteps: ["disable flag"],
    guardContractOperatorConfirmation: "CONFIRM",
    previewReadOnly: true,
    previewDryRun: true,
    previewAccepted: false,
    previewWouldExecute: false,
    previewRequestType: "automatic_character_runtime",
    previewRequestedAction: "emit_runtime_cue",
    previewBlockedReasons: ["runtime_cue_disabled"],
    nextAction: "Keep preview-only",
    lastRefreshAt: 10,
    lastSuccessAt: 8
  });
}

function testBuildPreviewCardDataSelectsCandidateAndBlockedSummary() {
  const snapshot = {
    followup: {
      pending: true,
      topicHint: "desk break",
      eligible: false,
      policy: "soft_checkin",
      blockedReasons: ["cooldown"],
      characterPreview: "fallback text",
      characterCue: { tone: "warm" },
      selectedReaction: {
        index: "2",
        preferredTone: "gentle",
        candidate: { text: "stretch your shoulders", tone: "calm" }
      }
    },
    silence: {},
    proactiveScheduler: {}
  };
  const data = model.buildPreviewCardData(snapshot, {
    getCharacterState: () => ({ label: "soft", mood: "idle" }),
    getScenarioLabel: () => "manual scenario"
  });

  assert.deepStrictEqual(data, {
    scenarioLabel: "manual scenario",
    characterLabel: "soft",
    characterMood: "idle",
    pending: true,
    topicHint: "desk break",
    eligible: false,
    blockedReasons: ["cooldown"],
    policy: "soft_checkin",
    tone: "gentle",
    selectedIndex: 2,
    candidateText: "stretch your shoulders",
    blocked: "cooldown"
  });
}

function testBuildManualConfirmationDataCoversStatuses() {
  const basePreview = {
    pending: true,
    topicHint: "desk",
    eligible: true,
    blockedReasons: [],
    policy: "soft",
    candidateText: "say hello"
  };
  const snapshot = {
    silence: { eligibleForSilenceFollowup: true, blockedReasons: [] },
    proactiveScheduler: { eligibleForSchedulerTick: true, blockedReasons: [] }
  };
  const dismissedKeys = new Set(["desk::soft::say hello"]);
  const helpers = {
    normalizeToken: (value) => String(value || "").trim(),
    buildKey: (input) => [input.topicHint, input.policy, input.candidateText].join("::")
  };

  const available = model.buildManualConfirmationData({
    previewData: basePreview,
    snapshot,
    dismissedKeys: new Set(),
    helpers
  });
  assert.strictEqual(available.status, "available");
  assert.strictEqual(available.available, true);
  assert.strictEqual(available.hidden, false);

  const blocked = model.buildManualConfirmationData({
    previewData: { ...basePreview, eligible: false, blockedReasons: ["cooldown"] },
    snapshot,
    dismissedKeys: new Set(),
    helpers
  });
  assert.strictEqual(blocked.status, "blocked");
  assert.strictEqual(blocked.available, false);
  assert.deepStrictEqual(blocked.blockedReasons, ["cooldown"]);

  const hidden = model.buildManualConfirmationData({
    previewData: { ...basePreview, pending: false },
    snapshot,
    dismissedKeys: new Set(),
    helpers
  });
  assert.strictEqual(hidden.status, "hidden");
  assert.strictEqual(hidden.hidden, true);

  const dismissed = model.buildManualConfirmationData({
    previewData: basePreview,
    snapshot,
    dismissedKeys,
    helpers
  });
  assert.strictEqual(dismissed.status, "dismissed");
  assert.strictEqual(dismissed.dismissed, true);
}

function testBuildManualConfirmationDebugPayloadSanitizesReason() {
  const payload = model.buildManualConfirmationDebugPayload(
    {
      topicHint: " desk ",
      policy: "soft",
      blockedReasons: ["cooldown", "no_candidate"],
      status: "blocked"
    },
    "",
    {
      sanitizeText: (value, maxLen) => String(value || "").slice(0, maxLen)
    }
  );

  assert.deepStrictEqual(payload, {
    text: " desk ",
    result: "blocked",
    error: "soft;cooldown,no_candidate"
  });
}

function main() {
  testBuildBackendEntryViewNormalizesNestedSummary();
  testBuildPreviewCardDataSelectsCandidateAndBlockedSummary();
  testBuildManualConfirmationDataCoversStatuses();
  testBuildManualConfirmationDebugPayloadSanitizesReason();
  console.log("Follow-up readiness panel model checks passed.");
}

main();
