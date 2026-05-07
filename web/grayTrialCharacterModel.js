(function (root) {
  "use strict";

  const PRESET_BY_DECISION = {
    REVIEW_AFTER_SUCCESS: {
      label: "轻轻收尾",
      mood: "happy",
      tone: "cooldown",
      description: "试跑已经有明确结果，角色以低打扰方式收尾和复盘。",
      sample: "这次结果已经很清楚了，我把它收个尾。"
    },
    GO_FOR_WATCHED_TRIAL: {
      label: "准备接话",
      mood: "thinking",
      tone: "ready",
      description: "如果进入 watched trial，角色会保持低打扰、随时准备轻轻接一句。",
      sample: "我先在旁边看着，你一声我就接。"
    },
    WATCH_ONLY: {
      label: "观察气氛",
      mood: "thinking",
      tone: "watching",
      description: "当前适合继续观察和整理，不主动推进试运行。",
      sample: "我先看着，不抢你的节奏。"
    },
    NO_GO: {
      label: "先安静待着",
      mood: "idle",
      tone: "quiet",
      description: "当前不适合进入试跑，角色保持安静与待命。",
      sample: "我先安静待着，等你准备好了再说。"
    }
  };

  const PRESET_BY_OUTCOME = {
    success: {
      label: "轻轻庆祝",
      mood: "happy",
      tone: "ready",
      description: "试跑成功后，角色以轻快但不夸张的方式庆祝一下。",
      sample: "这次跑通了，我轻轻开心一下就好。"
    },
    stopped: {
      label: "安静收口",
      mood: "neutral",
      tone: "quiet",
      description: "Emergency Stop 后角色收口，保持安静待命。",
      sample: "我先收口，等你确认下一步。"
    },
    disarmed: {
      label: "安静待机",
      mood: "idle",
      tone: "idle",
      description: "Disarm 后角色回到安静待机，不继续推试跑。",
      sample: "我先回到待机状态。"
    }
  };

  function defaultRuntimeHint(input = {}) {
    return {
      emotion: "neutral",
      action: "none",
      intensity: "low",
      voice_style: "neutral",
      live2d_hint: String(input.tone || "idle")
    };
  }

  function getRuntimeHint(input = {}, options = {}) {
    return typeof options.buildRuntimeHint === "function"
      ? options.buildRuntimeHint(input)
      : defaultRuntimeHint(input);
  }

  function buildCharacterCuePreview(input = {}, options = {}) {
    const signoff = input.signoff || {};
    const outcome = input.outcome || {};
    const decision = String(signoff.decision || "NO_GO");
    const outcomeName = String(outcome.outcome || "not_started");
    const preset = PRESET_BY_OUTCOME[outcomeName]
      || PRESET_BY_DECISION[decision]
      || PRESET_BY_DECISION.NO_GO;
    const runtimeHint = getRuntimeHint({ label: preset.label, tone: preset.tone }, options);
    return {
      readOnly: true,
      decision,
      outcome: outcomeName,
      label: preset.label,
      mood: preset.mood,
      tone: preset.tone,
      description: preset.description,
      sample: preset.sample,
      runtimeHint,
      stageRecommendation: signoff.stageRecommendation,
      nextAction: signoff.nextAction,
      safety: {
        noEventEmission: true,
        noRuntimeHintEmission: true,
        noLive2DMove: true,
        noTts: true,
        noModelCall: true,
        noFetch: true,
        noPollingStart: true,
        noFollowupExecution: true,
        noConfigWrites: true
      }
    };
  }

  function buildExpressionStrategyDraft(input = {}, options = {}) {
    const preview = input.preview || {};
    const checklist = input.checklist || {};
    const recap = input.recap || {};
    const baseRules = [
      {
        key: "no_go_quiet",
        when: "decision=NO_GO or outcome setup is incomplete",
        label: "先安静待着",
        tone: "quiet",
        runtimeHint: getRuntimeHint({ label: "先安静待着", tone: "quiet" }, options),
        sample: "我先安静待着，等你准备好了再说。",
        risk: "lowest",
        status: preview.decision === "NO_GO" ? "active_candidate" : "candidate"
      },
      {
        key: "watch_only_observe",
        when: "decision=WATCH_ONLY",
        label: "观察气氛",
        tone: "watching",
        runtimeHint: getRuntimeHint({ label: "观察气氛", tone: "watching" }, options),
        sample: "我先看着，不抢你的节奏。",
        risk: "low",
        status: preview.decision === "WATCH_ONLY" ? "active_candidate" : "candidate"
      },
      {
        key: "watched_trial_ready",
        when: "decision=GO_FOR_WATCHED_TRIAL",
        label: "准备接话",
        tone: "ready",
        runtimeHint: getRuntimeHint({ label: "准备接话", tone: "ready" }, options),
        sample: "我先在旁边看着，你一声我就接。",
        risk: "medium",
        status: preview.decision === "GO_FOR_WATCHED_TRIAL" ? "active_candidate" : "candidate"
      },
      {
        key: "post_success_cooldown",
        when: "decision=REVIEW_AFTER_SUCCESS or outcome=success",
        label: "轻轻收尾",
        tone: "cooldown",
        runtimeHint: getRuntimeHint({ label: "轻轻收尾", tone: "cooldown" }, options),
        sample: "这次结果已经很清楚了，我把它收个尾。",
        risk: "low",
        status: preview.decision === "REVIEW_AFTER_SUCCESS" || preview.outcome === "success" ? "active_candidate" : "candidate"
      },
      {
        key: "manual_emit_review",
        when: "manual cue emit accepted",
        label: "回看表现",
        tone: "cooldown",
        runtimeHint: getRuntimeHint({ label: "回看表现", tone: "cooldown" }, options),
        sample: "我先记下这次表现，看看是不是贴合场景。",
        risk: "low",
        status: recap.accepted === true ? "active_candidate" : "candidate"
      }
    ];
    const activeRule = baseRules.find((rule) => rule.status === "active_candidate") || baseRules[0];
    return {
      readOnly: true,
      status: "draft_only",
      decision: preview.decision,
      outcome: preview.outcome,
      activeRuleKey: activeRule.key,
      activeRule,
      rules: baseRules,
      manualEmitAccepted: recap.accepted === true,
      readyForImplementationPlanning: checklist.readyForImplementationPlanning === true,
      readyForAutomaticRuntime: false,
      nextAction: "Review the draft rules and one manual emit recap before deciding whether to create a separate strategy implementation task.",
      safety: {
        noRuntimeHintEmission: true,
        noLive2DMove: true,
        noTts: true,
        noModelCall: true,
        noFetch: true,
        noPollingStart: true,
        noFollowupExecution: true,
        noConfigWrites: true
      }
    };
  }

  function buildAutoRuntimeDryRun(input = {}) {
    const plan = input.plan || {};
    const strategy = input.strategy || {};
    const review = input.review || {};
    const activeRule = strategy.activeRule || {};
    const runtimeHint = activeRule.runtimeHint || null;
    const blockedReasons = [];
    if (plan.canPlanRollout !== true) {
      blockedReasons.push("auto_runtime_safety_plan_blocked");
    }
    if (review.goNoGo !== "READY_FOR_SEPARATE_IMPLEMENTATION_TASK") {
      blockedReasons.push("strategy_review_not_ready");
    }
    if (!runtimeHint) {
      blockedReasons.push("runtime_hint_missing");
    }
    const wouldSelectRule = !!runtimeHint;
    return {
      readOnly: true,
      status: blockedReasons.length ? "blocked" : "would_select",
      wouldEmit: false,
      wouldSelectRule,
      selectedRuleKey: activeRule.key || "",
      selectedRule: activeRule,
      runtimeHint,
      blockedReasons,
      planStatus: plan.status,
      goNoGo: review.goNoGo,
      dryRunOnly: true,
      nextAction: blockedReasons.length
        ? "Keep automatic runtime disabled; resolve blockers before implementation."
        : "This would select a rule, but still requires a separate explicit implementation task before any automatic emission.",
      safety: {
        noRuntimeHintEmission: true,
        noLive2DMove: true,
        noTts: true,
        noModelCall: true,
        noFetch: true,
        noPollingStart: true,
        noFollowupExecution: true,
        noConfigWrites: true,
        readyForAutomaticRuntime: false
      }
    };
  }

  const api = {
    PRESET_BY_DECISION,
    PRESET_BY_OUTCOME,
    buildCharacterCuePreview,
    buildExpressionStrategyDraft,
    buildAutoRuntimeDryRun
  };

  root.TaffyGrayTrialCharacterModel = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
