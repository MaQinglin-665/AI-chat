(function (root) {
  "use strict";

  function buildCharacterCuePreviewText(preview = {}) {
    const hint = preview.runtimeHint || {};
    return [
      "灰度试运行角色表现预览（只读）",
      `decision=${preview.decision}  outcome=${preview.outcome}`,
      `label=${preview.label}  mood=${preview.mood}  tone=${preview.tone}`,
      `description=${preview.description}`,
      `sample=${preview.sample}`,
      `runtimeHint=emotion:${hint.emotion} action:${hint.action} intensity:${hint.intensity} voice_style:${hint.voice_style} live2d_hint:${hint.live2d_hint}`,
      `stageRecommendation=${preview.stageRecommendation}`,
      `next=${preview.nextAction}`,
      "安全：预览只读，不发生真实 runtime hint、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildCharacterCueHandoffChecklistText(checklist = {}, manualEmitStatus = {}) {
    const hint = checklist.runtimeHint || {};
    const itemLines = Array.isArray(checklist.items) ? checklist.items.map((item) => {
      const mark = item.ok === true ? "OK" : "WAIT";
      const required = item.required === true ? "required" : "observe";
      return `- [${mark}] ${item.key} (${required}): ${item.label} - ${item.note}`;
    }) : [];
    return [
      "灰度试运行角色接入前检查（只读）",
      `status=${checklist.status}  readyForImplementationPlanning=${checklist.readyForImplementationPlanning ? "true" : "false"}  manualEmitGateAvailable=${checklist.manualEmitGateAvailable ? "true" : "false"}  readyForRuntimeEmission=false`,
      `decision=${checklist.decision}  outcome=${checklist.outcome}  label=${checklist.label}  tone=${checklist.tone}`,
      `runtimeHint=emotion:${hint.emotion} action:${hint.action} intensity:${hint.intensity} voice_style:${hint.voice_style} live2d_hint:${hint.live2d_hint}`,
      ...itemLines,
      `manualEmitCount=${manualEmitStatus.count || 0}  lastManualEmitAt=${manualEmitStatus.lastEmitAt || 0}`,
      `next=${checklist.nextAction}`,
      "安全：检查只读，不发生真实 runtime hint、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildCharacterCueManualEmitStatusText(status = {}) {
    const lastEmit = status.lastEmit || null;
    const bridge = status.lastBackendBridge || null;
    const dispatch = status.lastRuntimeDispatch || null;
    const apply = status.lastRuntimeApply || null;
    const candidate = status.lastReplyCandidate || null;
    const lastEmitText = lastEmit
      ? `decision=${lastEmit.decision || ""} outcome=${lastEmit.outcome || ""} label=${lastEmit.label || ""} tone=${lastEmit.tone || ""}`
      : "none";
    const bridgeText = bridge
      ? `ok=${bridge.ok === true ? "true" : "false"} backendNoop=${bridge.backendNoop === true ? "true" : "false"} wouldExecute=${bridge.wouldExecute === true ? "true" : "false"} dispatched=${bridge.dispatched === true ? "true" : "false"}`
      : "none";
    const presetText = lastEmit
      ? `preset=${lastEmit.presetKey || "auto"} source=${lastEmit.presetDescription || "n/a"}`
      : "preset=auto source=n/a";
    const dispatchText = dispatch
      ? `local=${dispatch.localDispatched ? "true" : "false"} broadcast=${dispatch.broadcasted ? "true" : "false"} emotion=${dispatch.emotion || "n/a"} action=${dispatch.action || "n/a"}`
      : "none";
    const applyText = apply
      ? `emotion=${apply.appliedEmotion ? "true" : "false"} action=${apply.appliedAction ? "true" : "false"} modelReady=${apply.modelReady ? "true" : "false"}`
      : "none";
    const candidateText = candidate
      ? `tone=${candidate.tone || "n/a"} mood=${candidate.mood || "n/a"} emotion=${candidate.runtimeHint?.emotion || "n/a"} action=${candidate.runtimeHint?.action || "n/a"} eligible=${candidate.eligibleForManualSend ? "true" : "false"} emitted=${lastEmit?.source === "assistant_reply_candidate" && lastEmit?.replyCandidateGeneratedAt === candidate.generatedAt ? "true" : "false"}`
      : "none";
    return [
      "灰度试运行角色试发状态（只读）",
      `count=${status.count || 0}`,
      `lastEmitAt=${status.lastEmitAt || 0}`,
      `lastEmit=${lastEmitText}`,
      `manualCuePreset=${presetText}`,
      `backendBridge=${bridgeText}`,
      `runtimeDispatch=${dispatchText}`,
      `runtimeApply=${applyText}`,
      `replyCueCandidate=${candidateText}`,
      "安全：只是记录状态，不会自动发送新的 runtime cue。"
    ].join("\n");
  }

  function buildCharacterManualCueStatusCardText(input = {}) {
    const status = input.status || {};
    const lastEmit = status.lastEmit || null;
    const bridge = status.lastBackendBridge || null;
    const dispatch = status.lastRuntimeDispatch || null;
    const apply = status.lastRuntimeApply || null;
    const candidate = status.lastReplyCandidate || null;
    const autoApply = input.autoApply || null;
    const selectedPreset = String(input.selectedPreset || "auto");
    const preset = input.preset || {};
    const hint = lastEmit?.runtimeHint || {};
    const bridgeOk = bridge?.ok === true && bridge?.backendNoop === true && bridge?.wouldExecute !== true;
    const dispatchOk = dispatch?.localDispatched === true;
    const applyKnown = !!apply;
    const candidateEmitted = candidate
      && lastEmit?.source === "assistant_reply_candidate"
      && lastEmit?.replyCandidateGeneratedAt === candidate.generatedAt;
    return [
      "手动角色 cue 状态（只读）",
      `selectedPreset=${selectedPreset}  label=${preset.label || selectedPreset}  manualOnly=true`,
      `lastCount=${status.count || 0}  lastEmitAt=${status.lastEmitAt || 0}`,
      `lastPreset=${lastEmit?.presetKey || "none"}  lastLabel=${lastEmit?.label || "none"}  lastTone=${lastEmit?.tone || "none"}`,
      `backendPreview=${bridge ? (bridgeOk ? "noop_confirmed" : bridge.reason || "blocked") : "not_checked"}  backendWouldExecute=${bridge?.wouldExecute === true ? "true" : "false"}`,
      `runtimeHint=emotion:${hint.emotion || "n/a"} action:${hint.action || "n/a"} intensity:${hint.intensity || "n/a"} live2d_hint:${hint.live2d_hint || "n/a"}`,
      `replyCueCandidate=${candidate ? `tone:${candidate.tone || "n/a"} mood:${candidate.mood || "n/a"} emotion:${candidate.runtimeHint?.emotion || "n/a"} action:${candidate.runtimeHint?.action || "n/a"} emitted:${candidateEmitted ? "true" : "false"}` : "none"}`,
      `autoApplyReplyCue=${input.autoApplyReplyCueEnabled ? "true" : "false"} lastAutoApply=${autoApply ? `${autoApply.applied ? "applied" : "skipped"}:${autoApply.reason || "n/a"} voice:${autoApply.voiceStyle || "n/a"} speechStyle:${autoApply.speechStyle || "n/a"}` : "none"}`,
      `dispatch=${dispatch ? (dispatchOk ? "local_dispatched" : "not_dispatched") : "none"}  broadcast=${dispatch?.broadcasted ? "true" : "false"}  ui=${dispatch?.uiView || "n/a"}`,
      `live2dApply=${applyKnown ? `emotion:${apply.appliedEmotion ? "true" : "false"} action:${apply.appliedAction ? "true" : "false"} modelReady:${apply.modelReady ? "true" : "false"}` : "none"}`,
      "安全：默认关闭；手动试发仍需确认；auto_apply_reply_cue=true 时仅做本地 Live2D/TTS prosody 应用，不接 scheduler、不写 config。"
    ].join("\n");
  }

  function buildCharacterCueManualEmitRecapText(recap = {}) {
    const hint = recap.lastEmit?.runtimeHint || {};
    const bridge = recap.lastBackendBridge || {};
    const candidate = recap.replyCandidate || null;
    const events = Array.isArray(recap.recentEvents) ? recap.recentEvents : [];
    const eventLines = events.length
      ? events.map((event) => [
        `#${event.seq || "?"}`,
        `stage=${event.stage || ""}`,
        `atMs=${event.atMs || ""}`,
        `result=${event.result || ""}`,
        `error=${event.error || ""}`
      ].join(" "))
      : ["- none"];
    return [
      "灰度试运行角色 cue 试发回看（只读）",
      `status=${recap.status}  accepted=${recap.accepted ? "true" : "false"}  count=${recap.count || 0}`,
      `lastEmitAt=${recap.lastEmitAt || 0}`,
      `last=source:${recap.source || "n/a"} decision:${recap.lastEmit?.decision || "n/a"} outcome:${recap.lastEmit?.outcome || "n/a"} label:${recap.lastEmit?.label || "n/a"} tone:${recap.lastEmit?.tone || "n/a"}`,
      `manualCuePreset=${recap.lastEmit?.presetKey || "auto"} description:${recap.lastEmit?.presetDescription || "n/a"}`,
      `replyCueCandidate=${candidate ? `tone:${candidate.tone || "n/a"} mood:${candidate.mood || "n/a"} emotion:${candidate.runtimeHint?.emotion || "n/a"} action:${candidate.runtimeHint?.action || "n/a"} sent:${recap.replyCandidateSent ? "true" : "false"}` : "none"}`,
      `backendBridge=ok:${bridge.ok === true ? "true" : "false"} backendNoop:${bridge.backendNoop === true ? "true" : "false"} wouldExecute:${bridge.wouldExecute === true ? "true" : "false"} dispatched:${bridge.dispatched === true ? "true" : "false"}`,
      `runtimeHint=emotion:${hint.emotion || "n/a"} action:${hint.action || "n/a"} intensity:${hint.intensity || "n/a"} voice_style:${hint.voice_style || "n/a"} live2d_hint:${hint.live2d_hint || "n/a"}`,
      `runtimeDispatch=local:${recap.lastRuntimeDispatch?.localDispatched ? "true" : "false"} broadcast:${recap.lastRuntimeDispatch?.broadcasted ? "true" : "false"} ui:${recap.lastRuntimeDispatch?.uiView || "n/a"}`,
      `runtimeApply=emotion:${recap.lastRuntimeApply?.appliedEmotion ? "true" : "false"} action:${recap.lastRuntimeApply?.appliedAction ? "true" : "false"} modelReady:${recap.lastRuntimeApply?.modelReady ? "true" : "false"}`,
      `summary=${recap.summary}`,
      "recentEvents:",
      ...eventLines,
      `next=${recap.nextAction}`,
      "安全：回看只读，不发新 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildExpressionStrategyDraftText(draft = {}) {
    const rules = Array.isArray(draft.rules) ? draft.rules : [];
    const ruleLines = rules.map((rule) => [
      `- ${rule.key}`,
      `status=${rule.status}`,
      `when=${rule.when}`,
      `label=${rule.label}`,
      `tone=${rule.tone}`,
      `emotion=${rule.runtimeHint?.emotion}`,
      `action=${rule.runtimeHint?.action}`,
      `risk=${rule.risk}`,
      `sample=${rule.sample}`
    ].join(" | "));
    return [
      "灰度试运行角色表现策略草案（只读）",
      `status=${draft.status}  decision=${draft.decision}  outcome=${draft.outcome}`,
      `activeRule=${draft.activeRuleKey}  manualEmitAccepted=${draft.manualEmitAccepted ? "true" : "false"}  readyForAutomaticRuntime=false`,
      "rules:",
      ...ruleLines,
      `next=${draft.nextAction}`,
      "安全：策略草案只读，不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildExpressionStrategyReviewPackageText(review = {}) {
    const missing = Array.isArray(review.missing) ? review.missing : [];
    const missingLines = missing.length
      ? missing.map((item) => `- ${item.key}: ${item.reason}`)
      : ["- none"];
    const hint = review.activeRule?.runtimeHint || {};
    return [
      "灰度试运行角色表现策略评审包（只读）",
      `goNoGo=${review.goNoGo}  status=${review.status}`,
      `decision=${review.decision}  outcome=${review.outcome}  activeRule=${review.activeRuleKey}`,
      `ruleCount=${review.ruleCount}  manualEmitAccepted=${review.manualEmitAccepted ? "true" : "false"}  checklistReady=${review.checklistReady ? "true" : "false"}  approvedForNextPhase=false`,
      `activeHint=emotion:${hint.emotion || "n/a"} action:${hint.action || "n/a"} intensity:${hint.intensity || "n/a"} voice_style:${hint.voice_style || "n/a"} live2d_hint:${hint.live2d_hint || "n/a"}`,
      "missing:",
      ...missingLines,
      `next=${review.nextAction}`,
      "安全：评审包只读，不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildAutoRuntimeSafetyPlanText(plan = {}) {
    const gates = Array.isArray(plan.gates) ? plan.gates : [];
    const gateLines = gates.map((gate) => {
      const mark = gate.ok === true ? "OK" : "WAIT";
      const required = gate.required === true ? "required" : "observe";
      return `- [${mark}] ${gate.key} (${required}): ${gate.label} - ${gate.note}`;
    });
    const stages = Array.isArray(plan.rolloutStages) ? plan.rolloutStages : [];
    return [
      "灰度试运行自动角色表现接入计划（只读）",
      `status=${plan.status}  canPlanRollout=${plan.canPlanRollout ? "true" : "false"}  readyForAutomaticRuntime=false`,
      `goNoGo=${plan.goNoGo}  decision=${plan.decision}  outcome=${plan.outcome}`,
      `strategyStatus=${plan.strategyStatus}  ruleCount=${plan.ruleCount}  manualEmitAccepted=${plan.manualEmitAccepted ? "true" : "false"}  checklistReady=${plan.checklistReady ? "true" : "false"}`,
      "gates:",
      ...gateLines,
      "rolloutStages:",
      ...stages.map((stage, index) => `- ${index + 1}. ${stage}`),
      `next=${plan.nextAction}`,
      "安全：计划只读，不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildAutoRuntimeDryRunText(dryRun = {}) {
    const hint = dryRun.runtimeHint || {};
    const blocked = Array.isArray(dryRun.blockedReasons) ? dryRun.blockedReasons : [];
    const blockedLines = blocked.length ? blocked.map((reason) => `- ${reason}`) : ["- none"];
    return [
      "灰度试运行自动角色表现 dry-run（只读）",
      `status=${dryRun.status}  wouldEmit=false  wouldSelectRule=${dryRun.wouldSelectRule ? "true" : "false"}`,
      `selectedRule=${dryRun.selectedRuleKey || "n/a"}  planStatus=${dryRun.planStatus}  goNoGo=${dryRun.goNoGo}`,
      `runtimeHint=emotion:${hint.emotion || "n/a"} action:${hint.action || "n/a"} intensity:${hint.intensity || "n/a"} voice_style:${hint.voice_style || "n/a"} live2d_hint:${hint.live2d_hint || "n/a"}`,
      "blockedReasons:",
      ...blockedLines,
      `next=${dryRun.nextAction}`,
      "安全：dry-run 只读，不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildExplicitSwitchPlanText(switchPlan = {}) {
    const requirements = Array.isArray(switchPlan.requirements) ? switchPlan.requirements : [];
    const requirementLines = requirements.map((item) => {
      const mark = item.ok === true ? "OK" : "WAIT";
      const required = item.required === true ? "required" : "observe";
      return `- [${mark}] ${item.key} (${required}): ${item.label} - ${item.note}`;
    });
    const blocking = Array.isArray(switchPlan.blockingRequired) ? switchPlan.blockingRequired : [];
    const blockingLines = blocking.length
      ? blocking.map((item) => `- ${item.key}: ${item.note}`)
      : ["- none"];
    const states = Array.isArray(switchPlan.proposedRuntimeStates) ? switchPlan.proposedRuntimeStates : [];
    return [
      "灰度试运行自动角色表现显式开关计划（只读）",
      `status=${switchPlan.status}  proposedSwitch=${switchPlan.proposedSwitchKey}  proposedDefault=false`,
      "switchExists=false  wouldEnable=false  automaticRuntimeConnected=false  wouldEmit=false",
      `planStatus=${switchPlan.planStatus}  dryRunStatus=${switchPlan.dryRunStatus}  goNoGo=${switchPlan.goNoGo}`,
      "requirements:",
      ...requirementLines,
      "blockingRequired:",
      ...blockingLines,
      "proposedRuntimeStates:",
      ...states.map((stateName, index) => `- ${index + 1}. ${stateName}`),
      `next=${switchPlan.nextAction}`,
      "安全：开关计划只读，不新增配置、不写配置、不接自动 runtime、不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话。"
    ].join("\n");
  }

  function buildExplicitSwitchReviewPackageText(reviewPackage = {}) {
    const missing = Array.isArray(reviewPackage.missing) ? reviewPackage.missing : [];
    const missingLines = missing.length
      ? missing.map((item) => `- ${item.key}: ${item.reason}`)
      : ["- none"];
    const requirements = Array.isArray(reviewPackage.requirements) ? reviewPackage.requirements : [];
    const requirementLines = requirements.map((item) => {
      const mark = item.ok === true ? "OK" : "WAIT";
      return `- [${mark}] ${item.key}: ${item.label}`;
    });
    const blocking = Array.isArray(reviewPackage.blockingRequired) ? reviewPackage.blockingRequired : [];
    const blockingLines = blocking.length
      ? blocking.map((item) => `- ${item.key}: ${item.note}`)
      : ["- none"];
    return [
      "灰度试运行自动角色表现显式开关评审包（只读）",
      `status=${reviewPackage.status}  goNoGo=${reviewPackage.goNoGo}  approvedForNextPhase=false`,
      `switchPlanStatus=${reviewPackage.switchPlanStatus}  switchPlanDefault=${reviewPackage.switchPlanDefault ? "true" : "false"}  strategyGoNoGo=${reviewPackage.strategyGoNoGo}`,
      `dryRunStatus=${reviewPackage.dryRunStatus}  dryRunWouldSelectRule=${reviewPackage.dryRunWouldSelectRule ? "true" : "false"}  planStatus=${reviewPackage.planStatus}`,
      "requirements:",
      ...requirementLines,
      "blockingRequired:",
      ...blockingLines,
      "missing:",
      ...missingLines,
      `next=${reviewPackage.nextAction}`,
      "安全：评审包只读，不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildSwitchAcceptancePackageText(acceptance = {}) {
    const checks = Array.isArray(acceptance.acceptanceChecks) ? acceptance.acceptanceChecks : [];
    const checkLines = checks.map((item) => {
      const mark = item.ready === true ? "OK" : "WAIT";
      const required = item.required === true ? "required" : "observe";
      return `- [${mark}] ${item.key} (${required}): ${item.label} - ${item.verify}`;
    });
    const blocking = Array.isArray(acceptance.blockingRequired) ? acceptance.blockingRequired : [];
    const blockingLines = blocking.length
      ? blocking.map((item) => `- ${item.key}: ${item.verify}`)
      : ["- none"];
    return [
      "灰度试运行自动角色表现显式开关验收包（只读）",
      `status=${acceptance.status}  goNoGo=${acceptance.goNoGo}  implementationReady=false  approvedForNextPhase=false`,
      `reviewGoNoGo=${acceptance.reviewGoNoGo}  switchPlanStatus=${acceptance.switchPlanStatus}  dryRunStatus=${acceptance.dryRunStatus}`,
      `manualVerificationRequired=${acceptance.manualVerificationRequired ? "true" : "false"}  readyForAutomaticRuntime=false`,
      "acceptanceChecks:",
      ...checkLines,
      "blockingRequired:",
      ...blockingLines,
      `next=${acceptance.nextAction}`,
      "安全：验收包只读，不实现开关、不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildExplicitSwitchControlText(control = {}) {
    const blocked = Array.isArray(control.blockedReasons) ? control.blockedReasons : [];
    const blockedLines = blocked.length ? blocked.map((reason) => `- ${reason}`) : ["- none"];
    return [
      "灰度试运行自动角色表现显式开关控制（本地标记）",
      `status=${control.status}  enabled=${control.enabled ? "true" : "false"}  canEnable=${control.canEnable ? "true" : "false"}  canDisable=${control.canDisable ? "true" : "false"}`,
      `switchKey=${control.switchKey}  requiredConfirm=${control.requiredConfirm}  disabledReason=${control.disabledReason}`,
      `acceptanceStatus=${control.acceptanceStatus}  acceptanceGoNoGo=${control.acceptanceGoNoGo}  acceptanceReady=${control.acceptanceReady ? "true" : "false"}  manualVerificationRequired=${control.manualVerificationRequired ? "true" : "false"}`,
      `lastAction=${control.lastAction || "none"}  lastReason=${control.lastReason || "none"}  updatedAt=${control.updatedAt || 0}`,
      `rollbackAt=${control.rollbackAt || 0}  rollbackReason=${control.rollbackReason || "none"}  defaultOffBaseline=${control.defaultOffBaseline ? "true" : "false"}`,
      "blockedReasons:",
      ...blockedLines,
      `next=${control.nextAction}`,
      "安全：控制只改本地标记，不接 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildSwitchControlDiagnosticsText(diagnostics = {}) {
    const blockerDetails = Array.isArray(diagnostics.blockerDetails) ? diagnostics.blockerDetails : [];
    const blockerLines = blockerDetails.length
      ? blockerDetails.map((item) => `- ${item.key}: ${item.label} | impact=${item.impact} | next=${item.nextAction}`)
      : ["- none"];
    const acceptanceBlocking = Array.isArray(diagnostics.acceptanceBlocking) ? diagnostics.acceptanceBlocking : [];
    const acceptanceLines = acceptanceBlocking.length
      ? acceptanceBlocking.map((item) => `- ${item.key}: ${item.label} | next=${item.nextAction}`)
      : ["- none"];
    const checklist = Array.isArray(diagnostics.operatorChecklist) ? diagnostics.operatorChecklist : [];
    return [
      "灰度试运行自动角色表现显式开关诊断（只读）",
      `status=${diagnostics.status}  enabled=${diagnostics.enabled ? "true" : "false"}  canEnable=${diagnostics.canEnable ? "true" : "false"}  canDisable=${diagnostics.canDisable ? "true" : "false"}`,
      `disabledReason=${diagnostics.disabledReason}  readyForAutomaticRuntime=false`,
      "blockerDetails:",
      ...blockerLines,
      "acceptanceBlocking:",
      ...acceptanceLines,
      "operatorChecklist:",
      ...checklist.map((item, index) => `- ${index + 1}. ${item}`),
      `next=${diagnostics.nextAction}`,
      "安全：诊断只读，不改开关标记、不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildExplicitSwitchRollbackPackageText(rollback = {}) {
    const steps = Array.isArray(rollback.steps) ? rollback.steps : [];
    return [
      "灰度试运行自动角色表现显式开关回滚包（只读）",
      `status=${rollback.status}  ok=${rollback.ok ? "true" : "false"}  enabled=${rollback.enabled ? "true" : "false"}  canRollback=${rollback.canRollback ? "true" : "false"}  defaultOffBaseline=${rollback.defaultOffBaseline ? "true" : "false"}`,
      `switchKey=${rollback.switchKey}  controlStatus=${rollback.controlStatus}  diagnosticsStatus=${rollback.diagnosticsStatus}`,
      `rollbackAt=${rollback.rollbackAt || 0}  rollbackReason=${rollback.rollbackReason || "none"}  rollbackRecorded=${rollback.rollbackRecorded ? "true" : "false"}`,
      `lastAction=${rollback.lastAction || "none"}  lastReason=${rollback.lastReason || "none"}`,
      "steps:",
      ...steps.map((step, index) => `- ${index + 1}. ${step}`),
      `next=${rollback.nextAction}`,
      "安全：回收/恢复默认关闭只影响本地内存，不写 config，不改 scheduler，不接 automatic runtime。"
    ].join("\n");
  }

  function buildFinalPreflightText(preflight = {}) {
    const gates = Array.isArray(preflight.gates) ? preflight.gates : [];
    const gateLines = gates.map((gate) => {
      const mark = gate.ok === true ? "OK" : "WAIT";
      const required = gate.required === true ? "required" : "observe";
      return `- [${mark}] ${gate.key} (${required}): ${gate.label} - ${gate.note}`;
    });
    const blocking = Array.isArray(preflight.blockingRequired) ? preflight.blockingRequired : [];
    const blockingLines = blocking.length
      ? blocking.map((item) => `- ${item.key}: ${item.label}`)
      : ["- none"];
    return [
      "灰度试运行自动角色表现最终预检（只读）",
      `status=${preflight.status}  ok=${preflight.ok ? "true" : "false"}  goNoGo=${preflight.goNoGo}  separateImplementationTaskReady=${preflight.separateImplementationTaskReady ? "true" : "false"}`,
      `implementationReady=false  automaticRuntimeConnected=${preflight.automaticRuntimeConnected ? "true" : "false"}  manualVerificationRequired=${preflight.manualVerificationRequired ? "true" : "false"}`,
      `plan=${preflight.chain?.plan?.status}  review=${preflight.chain?.review?.status}/${preflight.chain?.review?.goNoGo}  acceptance=${preflight.chain?.acceptance?.status}/${preflight.chain?.acceptance?.goNoGo}`,
      `control=${preflight.chain?.control?.status}  diagnostics=${preflight.chain?.diagnostics?.status}  rollback=${preflight.chain?.rollback?.status}`,
      "gates:",
      ...gateLines,
      "blockingRequired:",
      ...blockingLines,
      `next=${preflight.nextAction}`,
      "安全：最终预检只读，不接 automatic runtime、不写 config，不改 scheduler、不发 runtime cue、不移动 Live2D、不发 TTS、不 arm/reset/start polling/继续续话。"
    ].join("\n");
  }

  function buildSeparateImplementationDraftText(draft = {}) {
    const modules = Array.isArray(draft.implementationModules) ? draft.implementationModules : [];
    const boundaries = Array.isArray(draft.safetyBoundaries) ? draft.safetyBoundaries : [];
    const verification = Array.isArray(draft.verificationPlan) ? draft.verificationPlan : [];
    return [
      "灰度试运行自动角色表现实现草案（只读）",
      `status=${draft.status}  ok=${draft.ok ? "true" : "false"}  defaultOffBaseline=${draft.defaultOffBaseline ? "true" : "false"}  automaticRuntimeConnected=${draft.automaticRuntimeConnected ? "true" : "false"}`,
      `chainReady=${draft.chainReady ? "true" : "false"}  preflightStatus=${draft.preflightStatus}  preflightReady=${draft.preflightReady ? "true" : "false"}`,
      "implementationModules:",
      ...modules.map((item) => `- ${item.file}: ${item.role}`),
      "safetyBoundaries:",
      ...boundaries.map((item) => `- ${item}`),
      "verificationPlan:",
      ...verification.map((item) => `- ${item}`),
      `next=${draft.nextAction}`,
      "安全：这只是后续实现骨架，不接 automatic runtime，不改 scheduler 默认行为，不发 runtime cue，不动 Live2D，不发 TTS，不写 config。"
    ].join("\n");
  }

  const api = {
    buildCharacterCuePreviewText,
    buildCharacterCueHandoffChecklistText,
    buildCharacterCueManualEmitStatusText,
    buildCharacterManualCueStatusCardText,
    buildCharacterCueManualEmitRecapText,
    buildExpressionStrategyDraftText,
    buildExpressionStrategyReviewPackageText,
    buildAutoRuntimeSafetyPlanText,
    buildAutoRuntimeDryRunText,
    buildExplicitSwitchPlanText,
    buildExplicitSwitchReviewPackageText,
    buildSwitchAcceptancePackageText,
    buildExplicitSwitchControlText,
    buildSwitchControlDiagnosticsText,
    buildExplicitSwitchRollbackPackageText,
    buildFinalPreflightText,
    buildSeparateImplementationDraftText
  };

  root.TaffyGrayTrialCharacterView = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
