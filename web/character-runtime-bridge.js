(function (root) {
  "use strict";

  const BROADCAST_CHANNEL = "taffy-character-runtime";
  const UPDATE_EVENT = "character-runtime:update";
  const METADATA_FIELDS = Object.freeze([
    "emotion",
    "action",
    "intensity",
    "live2d_hint",
    "voice_style"
  ]);

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function copyAllowedMetadataFields(raw) {
    if (!isPlainObject(raw)) {
      return null;
    }
    const out = {};
    let hasField = false;
    for (const key of METADATA_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) {
        continue;
      }
      out[key] = raw[key];
      hasField = true;
    }
    return hasField ? out : null;
  }

  function normalizeMetadataForFrontend(raw, runtimeApi) {
    if (!isPlainObject(raw)) {
      return null;
    }
    if (!runtimeApi || typeof runtimeApi.normalizeMetadataForFrontend !== "function") {
      return null;
    }
    return runtimeApi.normalizeMetadataForFrontend(raw);
  }

  function isNormalizedMetadata(value) {
    return isPlainObject(value);
  }

  function createRuntimeUpdateMessage(metadata) {
    if (!isNormalizedMetadata(metadata)) {
      return null;
    }
    return {
      type: UPDATE_EVENT,
      metadata
    };
  }

  const api = {
    BROADCAST_CHANNEL,
    UPDATE_EVENT,
    METADATA_FIELDS,
    isPlainObject,
    copyAllowedMetadataFields,
    normalizeMetadataForFrontend,
    isNormalizedMetadata,
    createRuntimeUpdateMessage
  };

  root.TaffyCharacterRuntimeBridge = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
