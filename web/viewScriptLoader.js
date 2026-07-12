(function (root) {
  "use strict";

  const MODEL_EXCLUDED_SCRIPTS = Object.freeze([
    "./debugPanelController.js",
    "./chatMessageController.js",
    "./onboardingController.js",
    "./personaAvatarController.js",
    "./relationshipStateController.js",
    "./reminderScheduleController.js",
    "./emotionStatsController.js",
    "./localAsrController.js",
    "./turnTakingDirector.js",
    "./autoChatController.js",
    "./diagnosticsRuntimeController.js",
    "./followupDebugController.js",
    "./grayTrialReportController.js",
    "./grayTrialCharacterPanelController.js",
    "./followupReadinessPanelController.js",
    "./chatApi.js",
    "./attachmentModel.js",
    "./attachmentController.js",
    "./stickerModel.js",
    "./stickerStore.js",
    "./stickerController.js",
    "./chatTranslationService.js",
    "./performanceAuditController.js",
    "./performanceTimelineController.js",
    "./streamTtsQueueController.js",
    "./chatReplyController.js",
    "./wakeWordController.js",
    "./learningReviewApi.js",
    "./learningReviewModel.js",
    "./learningReviewView.js",
    "./learningReviewBinder.js",
    "./learningReviewController.js",
    "./panelControlBinder.js",
    "./advancedActionBinder.js",
    "./chatInputBinder.js",
    "./onboarding.js",
    "./personaCard.js",
    "./schedulePanel.js",
    "./toolMetaView.js",
    "./localCommandRegistry.js",
    "./localCommandExecutor.js",
    "./reminderUtils.js",
    "./scheduleListView.js",
    "./scheduleFormModel.js",
    "./doctorDiagnostics.js",
    "./characterTuning.js",
    "./characterBrainDebug.js",
    "./characterExperienceController.js",
    "./characterDiagnosticsController.js",
    "./configSwitchController.js",
    "./firstRunWizardController.js"
  ]);

  function resolveView(locationObject = root.location) {
    const search = String(locationObject?.search || "");
    try {
      return String(new URLSearchParams(search).get("view") || "").trim().toLowerCase();
    } catch (_) {
      const match = search.match(/[?&]view=([^&]+)/i);
      return match ? decodeURIComponent(match[1]).trim().toLowerCase() : "";
    }
  }

  function isDeveloperModeEnabled(locationObject = root.location, storage = root.localStorage) {
    const search = String(locationObject?.search || "");
    let queryValue = "";
    try {
      const params = new URLSearchParams(search);
      queryValue = params.get("dev") || params.get("debug") || params.get("developer") || "";
    } catch (_) {}
    let storageValue = "";
    try {
      storageValue = storage?.getItem?.("taffy.devFeatures") || storage?.getItem?.("aiChat.devFeatures") || "";
    } catch (_) {}
    return /^(1|true|yes|on|dev)$/i.test(String(queryValue || storageValue).trim());
  }

  function collectManifestScripts(doc) {
    const manifest = doc?.getElementById?.("taffy-view-script-manifest");
    if (!manifest) return [];
    const scope = manifest.content || manifest;
    return Array.from(scope.querySelectorAll?.("script[src]") || [])
      .map((node) => String(node.getAttribute("src") || "").trim())
      .filter(Boolean);
  }

  function selectScriptsForView(scripts, view) {
    const ordered = Array.isArray(scripts) ? scripts.filter(Boolean) : [];
    if (view !== "model") return ordered;
    const excluded = new Set(MODEL_EXCLUDED_SCRIPTS);
    return ordered.filter((src) => !excluded.has(src));
  }

  function writeScriptTag(doc, src) {
    if (!doc || typeof doc.write !== "function") return false;
    doc.write(`<script src="${src}"><\/script>`);
    return true;
  }

  function installViewScripts(doc = root.document, options = {}) {
    const locationObject = options.location || root.location;
    const view = options.view || resolveView(locationObject);
    const manifestScripts = options.scripts || collectManifestScripts(doc);
    const developerMode = options.developerMode === true
      || (options.developerMode !== false && isDeveloperModeEnabled(locationObject, options.storage || root.localStorage));
    const selected = developerMode ? manifestScripts.slice() : selectScriptsForView(manifestScripts, view);
    const installed = selected.filter((src) => writeScriptTag(doc, src));
    root.__TAFFY_VIEW_SCRIPT_PROFILE__ = Object.freeze({
      view: view || "combined",
      developerMode,
      manifestCount: manifestScripts.length,
      installedCount: installed.length,
      skippedCount: manifestScripts.length - installed.length
    });
    return { view: view || "combined", scripts: installed };
  }

  const api = {
    MODEL_EXCLUDED_SCRIPTS,
    resolveView,
    isDeveloperModeEnabled,
    collectManifestScripts,
    selectScriptsForView,
    installViewScripts
  };

  root.TaffyViewScriptLoader = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document !== "undefined" && !root.__TAFFY_VIEW_SCRIPT_LOADER_SKIP_AUTO__) {
    installViewScripts(document);
  }
})(typeof window !== "undefined" ? window : globalThis);
