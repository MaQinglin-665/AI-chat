(function (root) {
  "use strict";

  const SWITCH_KEY = "gray_auto_followup_character_runtime_enabled";
  const REQUIRED_CONFIRM = "ENABLE_GRAY_AUTO_TRIAL_CHARACTER_AUTO_RUNTIME_SWITCH";

  function safety(extra = {}) {
    return Object.assign({
      noRuntimeHintEmission: true,
      noLive2DMove: true,
      noTts: true,
      noModelCall: true,
      noFetch: true,
      noPollingStart: true,
      noFollowupExecution: true,
      noConfigWrites: true,
      readyForAutomaticRuntime: false
    }, extra);
  }

  function listRequiredBlockers(items = []) {
    return items.filter((item) => item && item.required === true && item.ok !== true && item.ready !== true);
  }

  function buildSafetyPlan(input = {}) {
    const review = input.review || {};
    const strategy = input.strategy || {};
    const recap = input.recap || {};
    const checklist = input.checklist || {};
    const rules = Array.isArray(strategy.rules) ? strategy.rules : [];
    const gates = [
      {
        key: "default_off",
        label: "默认关闭自动角色表现",
        ok: true,
        required: true,
        note: "自动 runtime 默认仍为 false。"
      },
      {
        key: "explicit_enable_flag",
        label: "需要显式启用开关",
        ok: false,
        required: true,
        note: "必须有独立配置或显式运行时开关，不允许隐式打开。"
      },
      {
        key: "separate_task_gate",
        label: "必须通过独立任务与审查",
        ok: review.goNoGo === "READY_FOR_SEPARATE_IMPLEMENTATION_TASK",
        required: true,
        note: "当前评审包只能给出建议，不直接接自动 runtime。"
      },
      {
        key: "manual_validation",
        label: "先手动验证 cue 与回看",
        ok: recap.accepted === true,
        required: true,
        note: "至少确认一次手动试发与回看，再考虑自动路径。"
      },
      {
        key: "handoff_check",
        label: "接入前检查必须通过",
        ok: checklist.readyForImplementationPlanning === true,
        required: true,
        note: "handoff checklist 仍然是自动接入前提。"
      },
      {
        key: "safety_stop",
        label: "必须有可用的安全停止",
        ok: true,
        required: true,
        note: "Emergency Stop 与 Disarm 必须继续存在。"
      }
    ];
    const blockingRequired = listRequiredBlockers(gates);
    const canPlanRollout = blockingRequired.length === 0;
    return {
      readOnly: true,
      status: canPlanRollout ? "safe_to_plan" : "blocked_for_auto_runtime",
      canPlanRollout,
      goNoGo: review.goNoGo,
      decision: review.decision,
      outcome: review.outcome,
      strategyStatus: strategy.status,
      ruleCount: rules.length,
      manualEmitAccepted: recap.accepted === true,
      checklistReady: checklist.readyForImplementationPlanning === true,
      gates,
      blockingRequired,
      rolloutStages: [
        "stage_0_review_only",
        "stage_1_explicit_flag",
        "stage_2_single_session_guard",
        "stage_3_manual_validation",
        "stage_4_limited_gray_rollout",
        "stage_5_observed_runtime_hardening"
      ],
      nextAction: canPlanRollout
        ? "Draft the separate automatic runtime implementation plan and keep default-off behavior."
        : "Keep reviewing the draft, recap, and handoff checklist before planning any automatic runtime path.",
      safety: safety()
    };
  }

  function buildExplicitSwitchPlan(input = {}) {
    const plan = input.plan || {};
    const dryRun = input.dryRun || {};
    const review = input.review || {};
    const session = input.session || {};
    const requirements = [
      {
        key: "default_off_baseline",
        label: "默认关闭基线",
        ok: true,
        required: true,
        note: "当前任务不新增配置开关，也不改任何默认值。"
      },
      {
        key: "explicit_config_switch",
        label: "需要显式配置开关",
        ok: false,
        required: true,
        note: "未来必须有独立配置项或同等显式开关，不允许随灰度试运行隐式开启。"
      },
      {
        key: "separate_runtime_task",
        label: "需要独立 runtime 接入任务",
        ok: false,
        required: true,
        note: "此处只定义开关门禁，不把 dry-run 接到自动发射路径。"
      },
      {
        key: "review_package_ready",
        label: "策略评审包先达到 Go",
        ok: review.goNoGo === "READY_FOR_SEPARATE_IMPLEMENTATION_TASK",
        required: true,
        note: "只有评审包认为可以进入独立实现任务时，才能继续考虑开关接入。"
      },
      {
        key: "dry_run_selects_rule",
        label: "dry-run 能选中规则",
        ok: dryRun.wouldSelectRule === true,
        required: true,
        note: "先证明只读 dry-run 可稳定选规则；即使通过，本任务仍保持 wouldEmit=false。"
      },
      {
        key: "single_session_cap",
        label: "单会话上限继续生效",
        ok: Number(session.max || 0) === 1,
        required: true,
        note: "首次真正接入时必须继续受单会话上限保护。"
      },
      {
        key: "manual_stop_available",
        label: "Emergency Stop / Disarm 保持可用",
        ok: true,
        required: true,
        note: "任何试验态都必须能立即 stop/disarm，不能绕过现有安全链路。"
      }
    ];
    const blockingRequired = listRequiredBlockers(requirements);
    return {
      readOnly: true,
      status: blockingRequired.length ? "blocked_until_explicit_switch_task" : "ready_to_design_switch_task",
      proposedSwitchKey: SWITCH_KEY,
      proposedDefault: false,
      switchExists: false,
      wouldEnable: false,
      automaticRuntimeConnected: false,
      wouldEmit: false,
      planStatus: plan.status,
      dryRunStatus: dryRun.status,
      goNoGo: review.goNoGo,
      requirements,
      blockingRequired,
      proposedRuntimeStates: [
        "off",
        "preview_only",
        "explicit_switch_on",
        "single_session_runtime",
        "stopped_or_disarmed"
      ],
      nextAction: blockingRequired.length
        ? "Keep automatic character runtime disabled; resolve required switch gates in a separate task before implementation."
        : "Create a separate explicit-switch implementation task; keep default-off and preserve emergency stop/disarm behavior.",
      safety: safety()
    };
  }

  function buildExplicitSwitchReviewPackage(input = {}) {
    const switchPlan = input.switchPlan || {};
    const review = input.review || {};
    const dryRun = input.dryRun || {};
    const plan = input.plan || {};
    const missing = [];
    if (switchPlan.status !== "ready_to_design_switch_task") {
      missing.push({ key: "switch_plan_ready", reason: "explicit switch plan is still blocked and should stay read-only" });
    }
    if (review.goNoGo !== "READY_FOR_SEPARATE_IMPLEMENTATION_TASK") {
      missing.push({ key: "strategy_review_ready", reason: "strategy review has not reached separate implementation readiness" });
    }
    if (dryRun.wouldSelectRule !== true) {
      missing.push({ key: "dry_run_selection", reason: "dry-run does not currently select a runtime rule" });
    }
    if (plan.canPlanRollout !== true) {
      missing.push({ key: "safety_plan_ready", reason: "safety plan still blocks rollout planning" });
    }
    const goNoGo = missing.length === 0
      ? "READY_FOR_SEPARATE_SWITCH_IMPLEMENTATION_TASK"
      : "NO_GO_FOR_AUTOMATIC_RUNTIME";
    return {
      readOnly: true,
      status: missing.length ? "blocked_for_explicit_switch_task" : "ready_for_explicit_switch_task",
      goNoGo,
      switchPlanStatus: switchPlan.status,
      switchPlanDefault: switchPlan.proposedDefault === false,
      strategyGoNoGo: review.goNoGo,
      dryRunStatus: dryRun.status,
      dryRunWouldSelectRule: dryRun.wouldSelectRule === true,
      planStatus: plan.status,
      requirements: Array.isArray(switchPlan.requirements) ? switchPlan.requirements : [],
      blockingRequired: Array.isArray(switchPlan.blockingRequired) ? switchPlan.blockingRequired : [],
      missing,
      approvedForNextPhase: false,
      nextAction: missing.length
        ? "Keep the explicit switch read-only and resolve the blockers before any separate implementation task."
        : "Create a separate explicit switch implementation task; keep default-off and do not connect automatic runtime yet.",
      safety: safety()
    };
  }

  function buildSwitchAcceptancePackage(input = {}) {
    const reviewPackage = input.reviewPackage || {};
    const switchPlan = input.switchPlan || {};
    const dryRun = input.dryRun || {};
    const acceptanceChecks = [
      { key: "default_off_after_restart", label: "重启后默认关闭", required: true, ready: false, verify: "没有显式配置或确认时，自动角色 runtime 必须保持关闭。" },
      { key: "wrong_confirmation_noop", label: "错误确认短语不生效", required: true, ready: false, verify: "错误或空确认不能启用开关，也不能发 runtime cue。" },
      { key: "explicit_switch_only", label: "只允许显式开关路径", required: true, ready: switchPlan.proposedDefault === false, verify: "不允许随 arm、dry-run、readiness 面板或评审包被隐式打开。" },
      { key: "single_session_cap_kept", label: "单会话上限保留", required: true, ready: true, verify: "首次实现后仍需复用现有单会话 cap，防止连续发射。" },
      { key: "emergency_stop_disarm_kept", label: "Emergency Stop / Disarm 保持收口", required: true, ready: true, verify: "任何试验中都必须能 stop/disarm，并立即停止自动 runtime 尝试。" },
      { key: "no_scheduler_side_effect_from_review", label: "评审与验收不改 scheduler", required: true, ready: true, verify: "打开面板、调用 helper、复制验收包都不能 arm/reset/start polling/trigger follow-up。" },
      { key: "no_config_write_from_review", label: "评审与验收不写配置", required: true, ready: true, verify: "当前验收包只读，不写 config、不修改默认值。" },
      { key: "no_privacy_surface_expansion", label: "不扩展隐私风险面", required: true, ready: true, verify: "不观察桌面、不截图、不读文件、不执行 shell/tool/backend 调用。" },
      { key: "runtime_emission_still_not_connected", label: "自动 runtime 发射仍未接入", required: true, ready: dryRun.wouldEmit === false, verify: "本验收包不接 maybeEmitFollowupCharacterRuntimeHint，不移动 Live2D，不播 TTS。" }
    ];
    const blockingRequired = acceptanceChecks.filter((item) => item.required === true && item.ready !== true);
    return {
      readOnly: true,
      status: blockingRequired.length ? "acceptance_not_ready" : "acceptance_ready_for_separate_task",
      goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
      implementationReady: false,
      approvedForNextPhase: false,
      reviewGoNoGo: reviewPackage.goNoGo,
      switchPlanStatus: switchPlan.status,
      dryRunStatus: dryRun.status,
      acceptanceChecks,
      blockingRequired,
      manualVerificationRequired: true,
      nextAction: "Use this package as acceptance criteria for a later separate switch implementation task; keep automatic runtime disabled now.",
      safety: safety()
    };
  }

  function buildExplicitSwitchControl(input = {}) {
    const acceptance = input.acceptance || {};
    const switchState = input.switchState || {};
    const enabled = switchState.enabled === true;
    const blockedReasons = [];
    if (acceptance.status !== "acceptance_ready_for_separate_task") {
      blockedReasons.push("acceptance_not_ready");
    }
    if (acceptance.manualVerificationRequired === true) {
      blockedReasons.push("manual_verification_required");
    }
    return {
      readOnly: true,
      status: enabled ? "enabled_local_flag_only" : (blockedReasons.length ? "blocked" : "disabled"),
      enabled,
      canEnable: blockedReasons.length === 0,
      canDisable: true,
      switchKey: SWITCH_KEY,
      requiredConfirm: REQUIRED_CONFIRM,
      disabledReason: blockedReasons.length ? "acceptance_not_ready" : "off_by_default",
      blockedReasons,
      acceptanceStatus: acceptance.status,
      acceptanceGoNoGo: acceptance.goNoGo,
      acceptanceReady: acceptance.status === "acceptance_ready_for_separate_task",
      manualVerificationRequired: acceptance.manualVerificationRequired === true,
      autoRuntimeConnected: false,
      lastAction: String(switchState.lastAction || ""),
      lastReason: String(switchState.lastReason || ""),
      updatedAt: Number(switchState.updatedAt || 0),
      rollbackAt: Number(switchState.rollbackAt || 0),
      rollbackReason: String(switchState.rollbackReason || ""),
      defaultOffBaseline: true,
      nextAction: enabled
        ? "Use the Rollback control to return to default-off, or the Disable control to clear the local switch flag; automatic runtime remains disconnected."
        : "Keep the switch off until the acceptance package becomes ready; the control only changes local state.",
      safety: safety()
    };
  }

  function buildSwitchControlDiagnostics(input = {}) {
    const control = input.control || {};
    const acceptance = input.acceptance || {};
    const blockerDetails = [];
    const blockedReasons = Array.isArray(control.blockedReasons) ? control.blockedReasons : [];
    if (blockedReasons.includes("acceptance_not_ready")) {
      blockerDetails.push({
        key: "acceptance_not_ready",
        label: "显式开关验收尚未就绪",
        impact: "启用开关会被阻止，本地标记保持关闭。",
        nextAction: "先复核验收包中的默认关闭、错误确认 no-op、stop/disarm 和不写配置条件。"
      });
    }
    if (blockedReasons.includes("manual_verification_required")) {
      blockerDetails.push({
        key: "manual_verification_required",
        label: "需要人工验收",
        impact: "即使代码静态检查通过，也不应自动认定可启用。",
        nextAction: "由本地观察者按 smoke checklist 手动确认后，再单独推进开关实现任务。"
      });
    }
    const acceptanceBlocking = (Array.isArray(acceptance.blockingRequired) ? acceptance.blockingRequired : []).map((item) => ({
      key: item.key,
      label: item.label,
      impact: "该验收项未准备好，不能作为自动 runtime 开关的通行条件。",
      nextAction: item.verify
    }));
    const operatorChecklist = [
      "确认打开 readiness 面板不会 arm/reset/start polling。",
      "确认复制状态和复制诊断仅写剪贴板。",
      "确认启用开关在验收未就绪时保持禁用或返回阻止。",
      "确认关闭开关只清除本地标记，不写 config。"
    ];
    return {
      readOnly: true,
      status: control.canEnable ? "ready_to_confirm_local_flag" : "blocked_explained",
      enabled: control.enabled === true,
      canEnable: control.canEnable === true,
      canDisable: control.canDisable !== false,
      disabledReason: control.disabledReason,
      blockedReasons,
      blockerDetails,
      acceptanceBlocking,
      operatorChecklist,
      nextAction: control.canEnable
        ? "Only enable after explicit local confirmation; automatic runtime still remains disconnected."
        : "Keep the switch off and review blocker details before any further implementation step.",
      safety: safety()
    };
  }

  function buildExplicitSwitchRollbackPackage(input = {}) {
    const control = input.control || {};
    const diagnostics = input.diagnostics || {};
    const switchState = input.switchState || {};
    const rollbackAt = Number(switchState.rollbackAt || 0);
    const rollbackReason = String(switchState.rollbackReason || "");
    const rollbackRecorded = rollbackAt > 0;
    const enabled = control.enabled === true;
    return {
      readOnly: true,
      ok: true,
      status: enabled ? "rollback_ready" : rollbackRecorded ? "default_off_restored" : "default_off",
      enabled,
      canRollback: enabled,
      defaultOffBaseline: true,
      switchKey: control.switchKey || SWITCH_KEY,
      controlStatus: control.status,
      diagnosticsStatus: diagnostics.status,
      rollbackAt,
      rollbackReason,
      rollbackRecorded,
      lastAction: String(control.lastAction || ""),
      lastReason: String(control.lastReason || ""),
      nextAction: enabled
        ? "Click the rollback button to clear the local switch flag and keep scheduler/config untouched."
        : rollbackRecorded
          ? "The switch is already back to default-off; restart the app if you want a blank renderer-memory slate."
          : "The switch is already default-off; keep the rollback action available for later local reset use.",
      steps: [
        "Clear the local explicit switch flag.",
        "Leave scheduler, config, and automatic runtime disconnected.",
        "Restart the app only if you want to clear renderer-memory trial history."
      ],
      safety: safety()
    };
  }

  function buildFinalPreflight(input = {}) {
    const plan = input.plan || {};
    const review = input.review || {};
    const acceptance = input.acceptance || {};
    const control = input.control || {};
    const diagnostics = input.diagnostics || {};
    const rollback = input.rollback || {};
    const gates = [
      { key: "plan_read_only", label: "显式开关计划保持只读", ok: plan.readOnly === true, required: true, note: "计划仍只提供 read-only 参考，不开启自动 runtime。" },
      { key: "review_read_only", label: "显式开关评审保持只读", ok: review.readOnly === true, required: true, note: "评审包仍只提供 blockers 与 nextAction，不直接实施。" },
      { key: "acceptance_read_only", label: "显式开关验收保持只读", ok: acceptance.readOnly === true, required: true, note: "验收包仍只做 acceptance criteria，不接自动 runtime。" },
      { key: "control_local_only", label: "显式开关控制仍是本地态", ok: control.readOnly === true && control.autoRuntimeConnected === false, required: true, note: "控制层只能改本地标记，不能连接自动 runtime。" },
      { key: "diagnostics_read_only", label: "显式开关诊断保持只读", ok: diagnostics.readOnly === true, required: true, note: "诊断包只解释 blocker，不改变控制状态。" },
      { key: "rollback_local_only", label: "回滚保持本地恢复", ok: rollback.readOnly === true && rollback.defaultOffBaseline === true, required: true, note: "回滚只恢复默认关闭，不写 config，不改 scheduler。" },
      { key: "default_off_kept", label: "默认关闭基线仍保持", ok: control.enabled !== true && control.defaultOffBaseline === true && rollback.defaultOffBaseline === true, required: true, note: "默认关闭仍是当前安全基线。" },
      { key: "runtime_disconnected", label: "自动 runtime 仍未接入", ok: control.autoRuntimeConnected === false && acceptance.safety?.readyForAutomaticRuntime === false, required: true, note: "当前链条仍不连接自动 runtime。" },
      { key: "separate_task_required", label: "后续仍需独立实现任务", ok: review.goNoGo === "READY_FOR_SEPARATE_IMPLEMENTATION_TASK" && acceptance.goNoGo === "NO_GO_FOR_AUTOMATIC_RUNTIME", required: true, note: "这里只是准备收口，不是实际接入。" }
    ];
    const blockingRequired = listRequiredBlockers(gates);
    const handoffReady = blockingRequired.length === 0;
    return {
      readOnly: true,
      ok: handoffReady,
      status: handoffReady ? "ready_for_separate_implementation_task" : "blocked_for_handoff",
      goNoGo: "NO_GO_FOR_AUTOMATIC_RUNTIME",
      implementationReady: false,
      separateImplementationTaskReady: handoffReady,
      defaultOffBaseline: true,
      automaticRuntimeConnected: false,
      manualVerificationRequired: acceptance.manualVerificationRequired === true || control.manualVerificationRequired === true,
      chain: {
        plan: { status: plan.status, readOnly: plan.readOnly === true },
        review: { status: review.status, goNoGo: review.goNoGo, readOnly: review.readOnly === true },
        acceptance: { status: acceptance.status, goNoGo: acceptance.goNoGo, readOnly: acceptance.readOnly === true },
        control: { status: control.status, enabled: control.enabled === true, autoRuntimeConnected: control.autoRuntimeConnected === true, readOnly: control.readOnly === true },
        diagnostics: { status: diagnostics.status, readOnly: diagnostics.readOnly === true },
        rollback: { status: rollback.status, readOnly: rollback.readOnly === true }
      },
      gates,
      blockingRequired,
      nextAction: handoffReady
        ? "Draft the separate explicit switch implementation task; keep automatic runtime disabled and default-off."
        : "Keep the chain read-only and resolve the blocking gates before drafting any separate implementation task.",
      safety: safety()
    };
  }

  function buildSeparateImplementationDraft(input = {}) {
    const preflight = input.preflight || {};
    const chainReady = preflight.ok === true && preflight.separateImplementationTaskReady === true;
    return {
      readOnly: true,
      ok: chainReady,
      status: chainReady ? "separate_implementation_draft_ready" : "blocked_for_draft",
      defaultOffBaseline: true,
      automaticRuntimeConnected: false,
      implementationStarted: false,
      chainReady,
      preflightStatus: preflight.status,
      preflightReady: preflight.separateImplementationTaskReady === true,
      implementationModules: [
        { file: "web/chat.js", role: "Keep the readiness panel draft and its copy action local-only until the later runtime implementation task is created." },
        { file: "app.py", role: "Later wire the real runtime execution entry point and guard checks into the backend path." },
        { file: "character_runtime.py", role: "Keep runtime metadata and prompt-contract changes behind the same safety boundary." },
        { file: "config.py", role: "Keep the gray auto gate default-off and preserve validation rules." },
        { file: "config.example.json", role: "Keep the example config honest and default-off." }
      ],
      safetyBoundaries: [
        "default-off stays the baseline",
        "do not write config",
        "do not connect automatic runtime by default",
        "do not change scheduler defaults",
        "do not emit runtime cues",
        "do not move Live2D",
        "do not play TTS",
        "do not request model output",
        "do not start polling",
        "do not execute follow-up"
      ],
      verificationPlan: [
        "After the later implementation task, rerun node --check, py_compile, JSON validation, and git diff --check.",
        "Confirm the panel draft still reads as read-only and can be copied only by explicit user click.",
        "Confirm the later implementation task keeps the same default-off, scheduler, and runtime boundaries."
      ],
      nextAction: "Use this as the skeleton for a later separate implementation task; do not wire automatic runtime yet.",
      safety: safety({
        noSchedulerDefaultChange: true
      })
    };
  }

  const api = {
    SWITCH_KEY,
    REQUIRED_CONFIRM,
    buildSafetyPlan,
    buildExplicitSwitchPlan,
    buildExplicitSwitchReviewPackage,
    buildSwitchAcceptancePackage,
    buildExplicitSwitchControl,
    buildSwitchControlDiagnostics,
    buildExplicitSwitchRollbackPackage,
    buildFinalPreflight,
    buildSeparateImplementationDraft
  };

  root.TaffyGrayTrialAutoRuntimeSwitchModel = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
