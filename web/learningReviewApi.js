(function (root) {
  "use strict";

  async function fetchJson(authFetch, url, options = {}) {
    if (typeof authFetch !== "function") {
      throw new Error("authFetch is required");
    }
    const resp = await authFetch(url, options);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || (data && data.ok === false)) {
      const errText = String(data?.error || data?.message || `HTTP ${resp.status}`);
      throw new Error(errText);
    }
    return data;
  }

  async function reload(fetchJsonFn) {
    if (typeof fetchJsonFn !== "function") {
      throw new Error("fetchJson is required");
    }
    const [payload, debugPayload, shortPayload, corePayload] = await Promise.all([
      fetchJsonFn("/api/learning/reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }),
      fetchJsonFn("/api/memory/debug"),
      fetchJsonFn("/api/memory/short"),
      fetchJsonFn("/api/memory/core")
    ]);
    return { payload, debugPayload, shortPayload, corePayload };
  }

  function reloadMemoryDebug(fetchJsonFn) {
    if (typeof fetchJsonFn !== "function") {
      throw new Error("fetchJson is required");
    }
    return fetchJsonFn("/api/memory/debug");
  }

  function updateEntries(fetchJsonFn, action, extra = {}) {
    if (typeof fetchJsonFn !== "function") {
      throw new Error("fetchJson is required");
    }
    return fetchJsonFn("/api/learning/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...extra
      })
    });
  }

  function updateCoreEntries(fetchJsonFn, action, extra = {}) {
    if (typeof fetchJsonFn !== "function") {
      throw new Error("fetchJson is required");
    }
    return fetchJsonFn("/api/memory/core/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...extra
      })
    });
  }

  function updateShortEntries(fetchJsonFn, action, extra = {}) {
    if (typeof fetchJsonFn !== "function") {
      throw new Error("fetchJson is required");
    }
    return fetchJsonFn("/api/memory/short/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ...extra
      })
    });
  }

  function promoteEntries(fetchJsonFn, candidateIds) {
    if (typeof fetchJsonFn !== "function") {
      throw new Error("fetchJson is required");
    }
    return fetchJsonFn("/api/learning/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_ids: Array.isArray(candidateIds) ? candidateIds : []
      })
    });
  }

  function buildQuickSettingsPayload(injectCount, minSupport) {
    return {
      quick_settings: {
        inject_count: Number(injectCount) >= 1 ? 1 : 0,
        promotion_min_support: Number(minSupport) >= 2 ? 2 : 1
      }
    };
  }

  const api = {
    buildQuickSettingsPayload,
    fetchJson,
    promoteEntries,
    reload,
    reloadMemoryDebug,
    updateCoreEntries,
    updateShortEntries,
    updateEntries
  };

  root.TaffyLearningReviewApi = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
