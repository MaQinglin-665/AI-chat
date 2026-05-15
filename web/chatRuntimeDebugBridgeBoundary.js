(function (root) {
  "use strict";

  function createBoundary(deps = {}) {
    let runtimeMetadataController = null;

    function getRuntimeMetadataController() {
      const factory = deps.runtimeMetadataController;
      if (!runtimeMetadataController && factory && typeof factory.createController === "function") {
        runtimeMetadataController = factory.createController(
          typeof deps.createRuntimeMetadataDeps === "function" ? deps.createRuntimeMetadataDeps() : {}
        );
      }
      return runtimeMetadataController || factory;
    }

    function invoke(methodName, args = []) {
      const controller = getRuntimeMetadataController();
      const method = controller && controller[methodName];
      if (typeof method === "function") {
        return method.apply(controller, args);
      }
      return undefined;
    }

    return {
      getRuntimeMetadataController,
      stripRuntimeMetadataSuffix(text) { return invoke("stripRuntimeMetadataSuffix", [text]); },
      stripAssistantPayloadNoise(text) { return invoke("stripAssistantPayloadNoise", [text]); },
      normalizeCharacterRuntimeMetadataForFrontend(raw) { return invoke("normalizeCharacterRuntimeMetadataForFrontend", [raw]); },
      getCharacterRuntimeBroadcastChannel() { return invoke("getCharacterRuntimeBroadcastChannel"); },
      dispatchCharacterRuntimeMetadataLocally(normalized) { return invoke("dispatchCharacterRuntimeMetadataLocally", [normalized]); },
      broadcastCharacterRuntimeMetadataToModel(normalized) { return invoke("broadcastCharacterRuntimeMetadataToModel", [normalized]); },
      normalizeRuntimeEmotionForLive2D(emotion) { return invoke("normalizeRuntimeEmotionForLive2D", [emotion]); },
      getRuntimeEmotionExpressionTuning(mood) { return invoke("getRuntimeEmotionExpressionTuning", [mood]); },
      normalizeRuntimeActionForLive2D(action) { return invoke("normalizeRuntimeActionForLive2D", [action]); },
      getLive2DMotionForAction(action) { return invoke("getLive2DMotionForAction", [action]); },
      applyCharacterRuntimeEmotionToLive2D(metadata) { return invoke("applyCharacterRuntimeEmotionToLive2D", [metadata]); },
      applyCharacterRuntimeActionToLive2D(metadata) { return invoke("applyCharacterRuntimeActionToLive2D", [metadata]); },
      handleCharacterRuntimeMetadata(raw, options = {}) { return invoke("handleCharacterRuntimeMetadata", [raw, options]); },
      installCharacterRuntimeWindowBridge() { return invoke("installCharacterRuntimeWindowBridge"); },
      installCharacterRuntimeDebugBridge() { return invoke("installCharacterRuntimeDebugBridge"); }
    };
  }

  function createBoundaryIfAvailable(deps = {}, current = null) {
    if (current) {
      return current;
    }
    const factory = deps.runtimeMetadataController;
    if (factory && typeof factory.createController === "function") {
      return createBoundary(deps);
    }
    return null;
  }

  const api = { createBoundary, createBoundaryIfAvailable };
  root.TaffyChatRuntimeDebugBridgeBoundary = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
