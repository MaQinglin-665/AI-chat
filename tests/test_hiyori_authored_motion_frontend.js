#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const cueController = require(path.join(ROOT, "web", "performanceCueController.js"));
const motionRuntimeController = require(path.join(ROOT, "web", "motionRuntimeController.js"));
const live2dExpressionController = require(path.join(ROOT, "web", "live2dExpressionController.js"));
const modelPath = path.join(ROOT, "web", "models", "hiyori_pro_t11", "hiyori_pro_t11.model3.json");
const modelDir = path.dirname(modelPath);
const chatSource = fs.readFileSync(path.join(ROOT, "web", "chat.js"), "utf8");

async function main() {
  const modelJson = JSON.parse(fs.readFileSync(modelPath, "utf8"));
  const motions = modelJson.FileReferences?.Motions || {};
  const expectedGroups = {
    EmotionShy: "motion/hiyori_m05.motion3.json",
    EmotionHappy: "motion/hiyori_m06.motion3.json",
    EmotionSurprised: "motion/hiyori_m07.motion3.json",
    EmotionPlayful: "motion/hiyori_m08.motion3.json",
    EmotionAngry: "motion/hiyori_m09.motion3.json",
    EmotionSad: "motion/hiyori_m10.motion3.json"
  };
  for (const [group, file] of Object.entries(expectedGroups)) {
    assert.deepStrictEqual(
      motions[group],
      [{ File: file }],
      `${group} should deterministically own exactly one verified Hiyori motion`
    );
    assert.ok(fs.existsSync(path.join(modelDir, file)), `${group} motion asset should exist locally`);
  }

  const expectedEmotionGroups = {
    happy: "EmotionHappy",
    excited: "EmotionHappy",
    playful: "EmotionPlayful",
    shy: "EmotionShy",
    hurt: "EmotionSad",
    sad: "EmotionSad",
    anxious: "EmotionSad",
    angry: "EmotionAngry",
    surprised: "EmotionSurprised"
  };
  for (const [emotion, group] of Object.entries(expectedEmotionGroups)) {
    const plan = cueController.resolvePerformanceCueMotionPlan({
      emotion,
      action: "none",
      intensity: "high"
    });
    assert.strictEqual(plan.shouldTrigger, true, `${emotion} high cue should trigger an authored motion`);
    assert.strictEqual(plan.authoredMotion?.group, group, `${emotion} should resolve to ${group}`);
    assert.strictEqual(plan.groups[0], group, `${emotion} authored group should be attempted before legacy fallbacks`);
    assert.ok(plan.authoredMotion.durationMs >= 1500, `${emotion} should retain its measured asset duration`);
    assert.ok(plan.cooldownMs > plan.authoredMotion.durationMs || emotion === "surprised", `${emotion} should have a bounded repeat cooldown`);
  }
  const mediumPlayful = cueController.resolvePerformanceCueMotionPlan({
    emotion: "playful",
    action: "none",
    intensity: "medium"
  });
  assert.strictEqual(mediumPlayful.shouldTrigger, false, "ordinary medium playful speech should stay subtle");
  assert.strictEqual(mediumPlayful.authoredMotion, null, "medium emotion should not reserve a full-body motion");
  const thinking = cueController.resolvePerformanceCueMotionPlan({
    emotion: "neutral",
    action: "think",
    intensity: "medium"
  });
  assert.strictEqual(thinking.authoredMotion?.group, "Thinking", "explicit think should use the dedicated authored motion");

  let rawCueSemanticTriggers = 0;
  const rawCueController = live2dExpressionController.createController({
    state: { modelProfileName: "hiyori_pro_t11" },
    performanceObject: { now: () => 900 },
    resolveHiyoriAuthoredMotion: cueController.resolveHiyoriAuthoredMotion,
    hiyoriPerformanceDirector: {
      createController() {
        return {
          requestMode() {
            return "speak";
          },
          triggerAction() {
            rawCueSemanticTriggers += 1;
            return true;
          },
          sample() {
            return { parameters: {}, mode: "speak", emotion: "happy", action: "", outgoingAction: "", idle: "", parameterCount: 0, at: 900 };
          }
        };
      }
    }
  });
  const normalizedRawCue = rawCueController.applySpeechPerformanceCue({
    emotion: "happy",
    live2dMood: "happy",
    action: "none",
    intensity: "high"
  });
  assert.strictEqual(normalizedRawCue.motionOwnership, "authored", "legacy/raw high cues should recover authored ownership");
  assert.strictEqual(normalizedRawCue.authoredMotion?.group, "EmotionHappy", "raw cues should recover the deterministic motion descriptor");
  assert.strictEqual(rawCueSemanticTriggers, 0, "recovered authored cues must not start a competing procedural action");

  let now = 1000;
  const played = [];
  const state = {
    motionEnabled: true,
    motionCooldownUntil: 0,
    ttsPlaybackGeneration: 7,
    model: {
      async motion(group, index, priority) {
        played.push({ group, index, priority });
        return true;
      }
    },
    motionDefinitions: {
      EmotionPlayful: [{}],
      Tap: [{}]
    }
  };
  const runtime = motionRuntimeController.createController({
    state,
    windowObject: {},
    performanceObject: { now: () => now }
  });
  const authoredMotion = cueController.resolveHiyoriAuthoredMotion("playful", "none", "high");
  const opts = {
    groups: ["EmotionPlayful", "Tap"],
    preserveGroupOrder: true,
    force: true,
    allowFallback: false,
    cooldownMs: authoredMotion.cooldownMs,
    motionCooldownKey: "hiyori:EmotionPlayful",
    authoredMotion,
    playbackGeneration: 7
  };
  assert.strictEqual(await runtime.tryBuiltInMotion("happy", opts), true, "available authored motion should start");
  assert.strictEqual(played[0].group, "EmotionPlayful", "the deterministic authored group should play first");
  assert.strictEqual(state.hiyoriAuthoredMotion?.playbackGeneration, 7, "authored motion should retain playback ownership");
  assert.strictEqual(state.hiyoriAuthoredMotionUntil, now + authoredMotion.durationMs, "ownership should match measured motion duration");
  assert.strictEqual(await runtime.tryBuiltInMotion("happy", opts), false, "same authored motion should be suppressed during cooldown");
  assert.strictEqual(played.length, 1, "cooldown rejection must not restart the model motion");
  now += authoredMotion.cooldownMs + 1;
  assert.strictEqual(await runtime.tryBuiltInMotion("happy", opts), true, "authored motion should be available after cooldown");

  const fallbackState = {
    motionEnabled: true,
    motionCooldownUntil: 0,
    model: {
      async motion(group) {
        fallbackState.playedGroup = group;
        return true;
      }
    },
    motionDefinitions: { Tap: [{}] }
  };
  const fallbackRuntime = motionRuntimeController.createController({
    state: fallbackState,
    windowObject: {},
    performanceObject: { now: () => 5000 }
  });
  assert.strictEqual(
    await fallbackRuntime.tryBuiltInMotion("happy", {
      groups: ["EmotionPlayful", "Tap"],
      preserveGroupOrder: true,
      force: true,
      allowFallback: false
    }),
    true,
    "a model without the named Hiyori group should degrade to an available legacy group"
  );
  assert.strictEqual(fallbackState.playedGroup, "Tap", "missing authored resources should not break motion playback");

  let stopped = 0;
  const interruptedState = {
    ttsPlaybackGeneration: 11,
    hiyoriAuthoredMotionUntil: 9000,
    hiyoriAuthoredMotion: { group: "EmotionAngry", playbackGeneration: 11 },
    model: {
      internalModel: {
        motionManager: {
          _stopAllMotions() {
            stopped += 1;
          }
        }
      }
    }
  };
  const interruptedExpression = live2dExpressionController.createController({
    state: interruptedState,
    performanceObject: { now: () => 4000 }
  });
  interruptedExpression.endSpeechAnimation();
  assert.strictEqual(stopped, 1, "speech interruption should cancel its owned authored body motion");
  assert.strictEqual(interruptedState.hiyoriAuthoredMotion, null, "interruption should clear authored ownership");

  const makeLayerGain = (authored) => {
    const additions = [];
    const layerState = {
      modelProfileName: "hiyori_pro_t11",
      ttsPlaybackGeneration: 3,
      hiyoriAuthoredMotionUntil: authored ? 8000 : 0,
      hiyoriAuthoredMotion: authored ? { playbackGeneration: 3 } : null
    };
    const controller = live2dExpressionController.createController({
      state: layerState,
      performanceObject: { now: () => 6000 },
      hiyoriPerformanceDirector: {
        createController() {
          return {
            sample() {
              return {
                parameters: { ParamAngleX: 4, ParamArmLA: 2, ParamMouthForm: 1 },
                mode: "speak",
                emotion: "playful",
                action: "",
                outgoingAction: "",
                idle: "",
                parameterCount: 3,
                at: 6000
              };
            },
            requestMode() {
              return "speak";
            },
            triggerAction() {
              return false;
            }
          };
        }
      }
    });
    controller.applyHiyoriPerformanceLayer({
      addParameterValueById(id, value, weight) {
        additions.push({ id, contribution: value * weight });
      }
    }, { now: 6000 });
    return Object.fromEntries(additions.map((item) => [item.id, item.contribution]));
  };
  const freeLayer = makeLayerGain(false);
  const authoredLayer = makeLayerGain(true);
  assert.ok(
    Math.abs(authoredLayer.ParamAngleX) < Math.abs(freeLayer.ParamAngleX) * 0.25,
    "authored motion should own large head/body channels"
  );
  assert.ok(
    Math.abs(authoredLayer.ParamArmLA) < Math.abs(freeLayer.ParamArmLA) * 0.3,
    "authored motion should own arm channels"
  );
  assert.ok(
    Math.abs(authoredLayer.ParamMouthForm) > Math.abs(freeLayer.ParamMouthForm) * 0.5,
    "facial speech expression should remain subtly active over authored body motion"
  );
  assert.ok(
    chatSource.includes("__TAFFY_HIYORI_MOTION_PREVIEW__")
      && chatSource.includes("installHiyoriMotionPreviewBridge"),
    "developer preview bridge should expose isolated authored emotion playback without adding a render loop"
  );

  console.log("[OK] Hiyori authored emotion motion frontend tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
