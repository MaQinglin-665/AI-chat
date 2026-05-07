(function (root) {
  "use strict";

  function defaultJoinReasons(reasons) {
    if (!Array.isArray(reasons) || reasons.length === 0) {
      return "none";
    }
    return reasons.map((item) => String(item || "").trim()).filter(Boolean).join(", ") || "none";
  }

  function joinReasons(reasons, options = {}) {
    return typeof options.joinReasons === "function"
      ? options.joinReasons(reasons)
      : defaultJoinReasons(reasons);
  }

  function explainReasons(reasons, options = {}) {
    return typeof options.explainReasons === "function"
      ? options.explainReasons(reasons)
      : defaultJoinReasons(reasons);
  }

  function buildBackendEntryCardText(view = {}, options = {}) {
    const statusText = view.loading
      ? "加载中"
      : view.loaded
        ? "已获取"
        : "未获取";
    const loadedText = view.loaded ? "是" : "否";
    const errorText = view.error ? `\n获取错误：${view.error}` : "";
    return [
      "后端入口摘要（只读）",
      `状态：${statusText}  读取方式：authFetch(\"/api/character_runtime/backend_entry\")`,
      `已拉取：${loadedText}  只读：${view.loaded ? "是" : "未确认"}  骨架：${view.skeletonOnly ? "是" : "未确认"}`,
      `默认关闭：${view.loaded ? (view.defaultOffBaseline ? "是" : "否") : "未确认"}  显式启用要求：${view.loaded ? (view.explicitEnableRequired ? "是" : "否") : "未确认"}`,
      `自动 runtime 连接：${view.loaded ? (view.automaticRuntimeConnected ? "是" : "否") : "未确认"}  scheduler 默认行为：${view.loaded ? (view.schedulerDefaultChanged ? "已改" : "未改") : "未确认"}`,
      `config 写入：${view.loaded ? (view.configWriteEnabled ? "是" : "否") : "未确认"}  runtime cue：${view.loaded ? (view.runtimeCueEnabled ? "是" : "否") : "未确认"}  Live2D：${view.loaded ? (view.live2dEnabled ? "是" : "否") : "未确认"}  TTS：${view.loaded ? (view.ttsEnabled ? "是" : "否") : "未确认"}`,
      `配置快照：enabled=${view.loaded ? (view.configuredEnabled ? "是" : "否") : "n/a"}  return_metadata=${view.loaded ? (view.configuredReturnMetadata ? "是" : "否") : "n/a"}  demo_stable=${view.loaded ? (view.configuredDemoStable ? "是" : "否") : "n/a"}  persona_override=${view.loaded ? (view.configuredPersonaOverrideEnabled ? "是" : "否") : "n/a"}`,
      `可用性：${view.loaded ? (view.entryReady ? "就绪" : "未就绪") : (view.loading ? "加载中" : "未获取")}  阻塞原因：${view.loaded ? joinReasons(view.blockedReasons, options) : "n/a"}`,
      `守卫合约：${view.loaded ? (view.guardContractReadOnly ? "只读" : "非只读") : "未确认"} / ${view.loaded ? (view.guardContractFailClosed ? "fail-closed" : "未确认 fail-closed") : "未确认"}  required=${view.loaded ? view.guardContractRequiredChecks?.length || 0 : 0}  disallowed=${view.loaded ? view.guardContractDisallowedActions?.length || 0 : 0}`,
      `守卫确认：${view.loaded ? (view.guardContractOperatorConfirmation || "n/a") : "n/a"}  回退=${view.loaded ? joinReasons(view.guardContractRollbackSteps, options) : "n/a"}`,
      `执行预检：${view.loaded ? (view.previewDryRun ? "dry-run" : "n/a") : "未确认"}  accepted=${view.loaded ? (view.previewAccepted ? "是" : "否") : "n/a"}  would_execute=${view.loaded ? (view.previewWouldExecute ? "是" : "否") : "n/a"}  action=${view.loaded ? (view.previewRequestedAction || "n/a") : "n/a"}`,
      `预检阻塞：${view.loaded ? joinReasons(view.previewBlockedReasons, options) : "n/a"}`,
      `下一步：${view.loaded ? (view.nextAction || "n/a") : "先只读拉取 backend_entry 摘要，不改变任何状态"}`,
      `刷新：${view.lastRefreshAt > 0 ? "已尝试" : "未尝试"}  成功：${view.lastSuccessAt > 0 ? "已成功" : "未成功"}${errorText}`
    ].join("\n");
  }

  function buildPreviewCardText(data = {}) {
    return [
      `场景：${data.scenarioLabel}  状态：${data.characterLabel} / ${data.characterMood}`,
      `policy=${data.policy}  tone=${data.tone}  selected=${data.selectedIndex}`,
      `想接的一句：${data.candidateText}`,
      `阻塞：${data.blocked}  安全：仅本地预演，不请求模型/语音`
    ].join("\n");
  }

  function buildScenarioCompareText(rows = []) {
    const lines = Array.isArray(rows) ? rows.map((row) => {
      return `${row.label} | policy=${row.policy} | tone=${row.tone} | selected=${row.selectedIndex} | ${row.candidateText}`;
    }) : [];
    return [
      "场景对比（本地预演，不写入状态）",
      ...lines
    ].join("\n");
  }

  function buildPreviewCopyBundleText(data = {}) {
    const candidateText = data.candidateText === "n/a" ? "" : String(data.candidateText || "");
    const summary = buildPreviewCardText(data);
    return [
      "续话预演对比包",
      candidateText ? `短句：${candidateText}` : "短句：(空)",
      "",
      "摘要：",
      summary
    ].join("\n");
  }

  function buildPreviewJsonText(data = {}) {
    const snapshot = {
      scenario: data.scenarioLabel,
      character: {
        label: data.characterLabel,
        mood: data.characterMood
      },
      followup: {
        policy: data.policy,
        tone: data.tone,
        selectedIndex: data.selectedIndex,
        candidateText: data.candidateText === "n/a" ? "" : data.candidateText,
        blockedReasons: data.blocked === "none"
          ? []
          : String(data.blocked || "").split(",").map((item) => item.trim()).filter(Boolean)
      },
      safety: "local_preview_only_no_model_or_voice_requests"
    };
    return JSON.stringify(snapshot, null, 2);
  }

  function buildPreviewOneLineText(data = {}) {
    const candidateText = (data.candidateText === "n/a" ? "" : String(data.candidateText || "")).replace(/\s+/g, " ").trim();
    const safeCandidate = candidateText || "(empty)";
    return [
      `scenario=${data.scenarioLabel}`,
      `state=${data.characterLabel}/${data.characterMood}`,
      `policy=${data.policy}`,
      `tone=${data.tone}`,
      `selected=${data.selectedIndex}`,
      `blocked=${data.blocked}`,
      `line=${safeCandidate}`
    ].join(" | ");
  }

  function normalizeManualConfirmationToken(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function buildManualConfirmationKey(input = {}) {
    const topic = normalizeManualConfirmationToken(input.topicHint || input.reason || "");
    const policy = normalizeManualConfirmationToken(input.policy || "");
    const candidate = normalizeManualConfirmationToken(input.candidateText || "");
    if (!topic || !policy || !candidate) {
      return "";
    }
    return `${topic}::${policy}::${candidate}`;
  }

  function getManualConfirmationStatusLabel(status = "hidden") {
    switch (String(status || "")) {
      case "available":
        return "可确认";
      case "blocked":
        return "不可确认";
      case "dismissed":
        return "已忽略";
      default:
        return "隐藏";
    }
  }

  function buildManualConfirmationPreviewText(data = {}, options = {}) {
    return [
      `手动确认预览：${data.available === true ? "可确认" : "暂不可确认"}`,
      `想接的一句：${data.candidateText}`,
      `话题：${data.topicHint || "n/a"}`,
      `policy=${data.policy}  tone=${data.tone}  selected=${data.selectedIndex}`,
      `守卫说明：${data.available === true ? "当前守卫允许手动确认执行。" : explainReasons(data.blockedReasons, options)}`,
      `原始阻塞：${joinReasons(data.blockedReasons, options)}`,
      "安全：未点击确认前不会请求模型、不会发语音、不会执行续话。"
    ].join("\n");
  }

  function getGrayAutoTrialNextStep(status = "") {
    if (status === "ready_for_local_trial") {
      return "可以进入本地受控观察；继续保持人工监看，异常时先 stop 再 disarm。";
    }
    if (status === "runtime_guards_blocked") {
      return "五层门禁已打开，但候选续话、安静窗口、冷却或策略 guard 还在阻塞。";
    }
    if (status === "session_limit_reached") {
      return "本次 renderer session 已到达试运行上限；如需再试，先确认后再重置计数。";
    }
    return "保持默认关闭；若要本地试运行，先阅读 runbook，再用确认短语 arm。";
  }

  function buildGrayAutoTrialStatusCardText(input = {}, options = {}) {
    const preflight = input.preflight || {};
    const session = input.session || {};
    const events = input.events || {};
    const latest = events.last ? `${events.last.stage}/${events.lastTrialStatus}` : "none";
    return [
      "灰度自动试运行状态卡（只读）",
      `status=${preflight.status}  armed=${input.armed ? "true" : "false"}  polling=${input.polling ? "true" : "false"}`,
      `session=${session.count}/${session.max}  remaining=${session.remaining}  reached=${session.reached ? "true" : "false"}`,
      `wouldPoll=${preflight.dryRun?.wouldPollCheck === true ? "true" : "false"}  wouldTrigger=${preflight.dryRun?.wouldAttemptTrigger === true ? "true" : "false"}`,
      `blocked=${explainReasons(preflight.dryRun?.blockedReasons || preflight.gateBlockedReasons, options)}`,
      `events=${events.totalPollEvents}  last=${latest}`,
      `next=${getGrayAutoTrialNextStep(preflight.status)}`,
      "安全：本卡不 arm、不 disarm、不 stop/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildGrayAutoTrialAuditSummaryText(audit = {}, options = {}) {
    const recent = Array.isArray(audit.events?.recent) ? audit.events.recent.slice(-12) : [];
    const eventLines = recent.length
      ? recent.map((event) => [
        `#${event.seq}`,
        event.stage,
        `trial=${event.trialStatus || "none"}`,
        `wouldPoll=${event.wouldPoll ? "true" : "false"}`,
        `wouldTrigger=${event.wouldTrigger ? "true" : "false"}`,
        event.blocked ? `blocked=${event.blocked}` : ""
      ].filter(Boolean).join(" | "))
      : ["none"];
    return [
      "灰度自动试运行审计摘要（只读）",
      `status=${audit.status}  armed=${audit.armed ? "true" : "false"}  polling=${audit.polling ? "true" : "false"}`,
      `session=${audit.session?.count}/${audit.session?.max}  remaining=${audit.session?.remaining}  reached=${audit.session?.reached ? "true" : "false"}`,
      `wouldPoll=${audit.dryRun?.wouldPollCheck === true ? "true" : "false"}  wouldTrigger=${audit.dryRun?.wouldAttemptTrigger === true ? "true" : "false"}`,
      `blocked=${joinReasons(audit.blockedReasons, options)}`,
      `events=${audit.events?.totalPollEvents || 0}  last=${audit.events?.last?.stage || "none"}/${audit.events?.lastTrialStatus || "none"}`,
      "",
      "最近事件",
      ...eventLines,
      "",
      "安全边界",
      "默认关闭；Arm/Reset 需要确认短语；不写配置、不截图、不读文件、不调工具、不执行命令。"
    ].join("\n");
  }

  function buildGrayAutoTrialPreRunChecklistText(checklist = {}) {
    const items = Array.isArray(checklist.items) ? checklist.items : [];
    const lines = items.map((item) => {
      const mark = item.ok === true ? "OK" : "WAIT";
      const required = item.required === true ? "required" : "observe";
      return `${mark} [${required}] ${item.label} - ${item.note}`;
    });
    return [
      "灰度试运行前检查（只读）",
      `readyForWatchedTrial=${checklist.readyForWatchedTrial ? "true" : "false"}  readyForTriggerObservation=${checklist.readyForTriggerObservation ? "true" : "false"}`,
      `status=${checklist.status}  armed=${checklist.armed ? "true" : "false"}  polling=${checklist.polling ? "true" : "false"}  session=${checklist.session?.count}/${checklist.session?.max}`,
      ...lines,
      `next=${checklist.nextAction}`,
      "安全：本检查不 arm、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildGrayAutoTrialTimelineText(timeline = {}) {
    const entries = Array.isArray(timeline.entries) ? timeline.entries : [];
    const lines = entries.length
      ? entries.map((entry) => [
        `#${entry.seq}`,
        entry.category,
        entry.stage,
        entry.trialStatus ? `trial=${entry.trialStatus}` : "",
        entry.gates ? `gates=${entry.gates}` : "",
        `wouldPoll=${entry.wouldPoll ? "true" : "false"}`,
        `wouldTrigger=${entry.wouldTrigger ? "true" : "false"}`,
        entry.blocked ? `blocked=${entry.blocked}` : "",
        entry.result ? `result=${entry.result}` : ""
      ].filter(Boolean).join(" | "))
      : ["none"];
    return [
      "灰度试运行时间线（只读）",
      `events=${timeline.total || 0}  arm=${timeline.hasArm ? "yes" : "no"}  triggerSuccess=${timeline.hasTriggerSuccess ? "yes" : "no"}  stop=${timeline.hasStop ? "yes" : "no"}  disarm=${timeline.hasDisarm ? "yes" : "no"}`,
      ...lines,
      "安全：时间线只读，不会发出新事件或触发续话。"
    ].join("\n");
  }

  function formatRootCauseLines(rootCauses = []) {
    return Array.isArray(rootCauses) && rootCauses.length
      ? rootCauses.map((item) => `- ${item.reason}: ${item.explanation}`)
      : ["- none"];
  }

  function formatMissingRequiredLines(missingRequired = []) {
    return Array.isArray(missingRequired) && missingRequired.length
      ? missingRequired.map((item) => `- ${item.key}: ${item.label} (${item.note})`)
      : ["- none"];
  }

  function buildGrayAutoTrialOutcomeText(result = {}) {
    return [
      "灰度试运行结果判定（只读）",
      `outcome=${result.outcome}  severity=${result.severity}  status=${result.status}`,
      `armed=${result.armed ? "true" : "false"}  polling=${result.polling ? "true" : "false"}  session=${result.session?.count}/${result.session?.max}`,
      `timelineEvents=${result.timeline?.total || 0}  last=${result.timeline?.lastStage || "none"}  triggerSuccess=${result.timeline?.hasTriggerSuccess ? "true" : "false"}  triggerBlocked=${result.timeline?.hasTriggerBlocked ? "true" : "false"}`,
      `summary=${result.summary}`,
      "归因",
      ...formatRootCauseLines(result.rootCauses),
      `next=${result.nextAction}`,
      "安全：结果判定只读，不发事件、不 arm/reset、不启动 polling、不触发续话。"
    ].join("\n");
  }

  function buildGrayAutoTrialGoNoGoDecisionText(decision = {}) {
    return [
      "灰度试运行 Go/No-Go（只读）",
      `decision=${decision.decision}  outcome=${decision.outcome}  severity=${decision.severity}  status=${decision.status}`,
      `readyForWatchedTrial=${decision.readyForWatchedTrial ? "true" : "false"}  readyForTriggerObservation=${decision.readyForTriggerObservation ? "true" : "false"}`,
      `timelineEvents=${decision.timeline?.total || 0}  last=${decision.timeline?.lastStage || "none"}  triggerSuccess=${decision.timeline?.hasTriggerSuccess ? "true" : "false"}  triggerBlocked=${decision.timeline?.hasTriggerBlocked ? "true" : "false"}`,
      `reason=${decision.reason}`,
      "缺失必需项",
      ...formatMissingRequiredLines(decision.missingRequired),
      "归因",
      ...formatRootCauseLines(decision.rootCauses),
      `next=${decision.nextAction}`,
      "安全：Go/No-Go 只读，不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  function buildGrayAutoTrialSignoffPackageText(pkg = {}) {
    const checkLines = Array.isArray(pkg.manualChecks) ? pkg.manualChecks.map((item) => `- [ ] ${item}`) : [];
    return [
      "灰度试运行签收包（只读模板）",
      `trialId=${pkg.trialId}`,
      `decision=${pkg.decision}  outcome=${pkg.outcome}  severity=${pkg.severity}`,
      `stageRecommendation=${pkg.stageRecommendation}`,
      `summary=${pkg.summary}`,
      `timelineEvents=${pkg.timeline?.total || 0}  last=${pkg.timeline?.lastStage || "none"}  triggerSuccess=${pkg.timeline?.hasTriggerSuccess ? "true" : "false"}  triggerBlocked=${pkg.timeline?.hasTriggerBlocked ? "true" : "false"}`,
      "缺失必需项",
      ...formatMissingRequiredLines(pkg.missingRequired),
      "归因",
      ...formatRootCauseLines(pkg.rootCauses),
      "人工签收项",
      ...checkLines,
      "tester=",
      "reviewedAt=",
      "approvedForNextPhase=false",
      "notes=",
      `next=${pkg.nextAction}`,
      "安全：签收包只读，不 arm/reset、不启动 polling、不触发续话、不写配置。"
    ].join("\n");
  }

  const api = {
    buildBackendEntryCardText,
    buildPreviewCardText,
    buildScenarioCompareText,
    buildPreviewCopyBundleText,
    buildPreviewJsonText,
    buildPreviewOneLineText,
    normalizeManualConfirmationToken,
    buildManualConfirmationKey,
    getManualConfirmationStatusLabel,
    buildManualConfirmationPreviewText,
    buildGrayAutoTrialStatusCardText,
    buildGrayAutoTrialAuditSummaryText,
    buildGrayAutoTrialPreRunChecklistText,
    buildGrayAutoTrialTimelineText,
    buildGrayAutoTrialOutcomeText,
    buildGrayAutoTrialGoNoGoDecisionText,
    buildGrayAutoTrialSignoffPackageText
  };

  root.TaffyFollowupReadinessView = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
