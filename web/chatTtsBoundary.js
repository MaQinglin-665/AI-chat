(function (root) {
  "use strict";

  function createController(factory, createDeps, current) {
    if (!current && factory && typeof factory.createController === "function") {
      return factory.createController(typeof createDeps === "function" ? createDeps() : {});
    }
    return current || factory;
  }

  function createBoundary(deps = {}) {
    let playbackController = null;
    let streamQueueController = null;
    let voiceRuntimeController = null;

    function getTTSPlaybackController() {
      playbackController = createController(
        deps.ttsPlaybackController,
        deps.createPlaybackDeps,
        playbackController
      );
      return playbackController || deps.ttsPlaybackController;
    }

    function getStreamTtsQueueController() {
      streamQueueController = createController(
        deps.streamTtsQueueController,
        deps.createStreamQueueDeps,
        streamQueueController
      );
      return streamQueueController || deps.streamTtsQueueController;
    }

    function getVoiceRuntimeController() {
      voiceRuntimeController = createController(
        deps.voiceRuntimeController,
        deps.createVoiceRuntimeDeps,
        voiceRuntimeController
      );
      return voiceRuntimeController || deps.voiceRuntimeController;
    }

    return {
      getTTSPlaybackController,
      getStreamTtsQueueController,
      getVoiceRuntimeController
    };
  }

  function hasController(factory) {
    return factory && typeof factory.createController === "function";
  }

  function createBoundaryIfAvailable(deps = {}, current = null) {
    if (current) {
      return current;
    }
    if (
      hasController(deps.ttsPlaybackController)
      || hasController(deps.streamTtsQueueController)
      || hasController(deps.voiceRuntimeController)
    ) {
      return createBoundary(deps);
    }
    return null;
  }

  const api = { createBoundary, createBoundaryIfAvailable };
  root.TaffyChatTtsBoundary = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
