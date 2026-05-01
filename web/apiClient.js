(function (root) {
  "use strict";

  const API_TOKEN_STORAGE_KEYS = ["taffy_api_token", "TAFFY_API_TOKEN"];
  let apiTokenPromise = null;

  function getFetch() {
    if (typeof root.fetch === "function") {
      return root.fetch.bind(root);
    }
    if (typeof fetch === "function") {
      return fetch;
    }
    throw new Error("fetch is not available");
  }

  function getLocationSearch() {
    return String(root.location?.search || "");
  }

  function getLocationOrigin() {
    return String(root.location?.origin || "http://127.0.0.1");
  }

  function persistApiToken(token) {
    const safe = String(token || "").trim();
    if (!safe) {
      return;
    }
    for (const key of API_TOKEN_STORAGE_KEYS) {
      try {
        root.localStorage?.setItem(key, safe);
      } catch (_) {
        // ignore storage failures
      }
    }
    try {
      root.__TAFFY_API_TOKEN = safe;
    } catch (_) {
      // ignore
    }
  }

  function clearPersistedApiToken() {
    for (const key of API_TOKEN_STORAGE_KEYS) {
      try {
        root.localStorage?.removeItem(key);
      } catch (_) {
        // ignore storage failures
      }
    }
    try {
      if (root.__TAFFY_API_TOKEN) {
        root.__TAFFY_API_TOKEN = "";
      }
    } catch (_) {
      // ignore
    }
  }

  function readApiTokenFromQuery() {
    try {
      const query = new URLSearchParams(getLocationSearch());
      const queryToken = String(query.get("api_token") || "").trim();
      if (queryToken) {
        persistApiToken(queryToken);
        return queryToken;
      }
    } catch (_) {
      // ignore
    }
    return "";
  }

  function readApiTokenFromStorage() {
    for (const key of API_TOKEN_STORAGE_KEYS) {
      try {
        const value = String(root.localStorage?.getItem(key) || "").trim();
        if (value) {
          return value;
        }
      } catch (_) {
        // ignore storage failures
      }
    }
    return "";
  }

  function readApiTokenFromGlobal() {
    return String(root.__TAFFY_API_TOKEN || "").trim();
  }

  async function readApiTokenFromRuntime() {
    if (!root.electronAPI || typeof root.electronAPI.getApiToken !== "function") {
      return "";
    }
    try {
      return String(await root.electronAPI.getApiToken() || "").trim();
    } catch (_) {
      return "";
    }
  }

  async function resolveApiToken(forceRefresh = false) {
    if (forceRefresh) {
      apiTokenPromise = null;
    }
    if (apiTokenPromise) {
      return apiTokenPromise;
    }
    apiTokenPromise = (async () => {
      const queryToken = readApiTokenFromQuery();
      if (queryToken) {
        return queryToken;
      }
      // Prefer runtime token from Electron/main process, so stale localStorage does not override it.
      const runtimeToken = await readApiTokenFromRuntime();
      if (runtimeToken) {
        persistApiToken(runtimeToken);
        return runtimeToken;
      }
      let token = readApiTokenFromStorage();
      if (token) {
        persistApiToken(token);
        return token;
      }
      token = readApiTokenFromGlobal();
      if (token) {
        persistApiToken(token);
        return token;
      }
      clearPersistedApiToken();
      return "";
    })();
    return apiTokenPromise;
  }

  function isApiRequestTarget(input) {
    try {
      const isRequest = typeof Request !== "undefined" && input instanceof Request;
      const raw = isRequest ? input.url : String(input || "");
      const url = new URL(raw, getLocationOrigin());
      return url.pathname.startsWith("/api/");
    } catch (_) {
      return false;
    }
  }

  async function authFetch(input, init = {}) {
    const fetchImpl = getFetch();
    if (!isApiRequestTarget(input)) {
      return fetchImpl(input, init);
    }

    const isRequest = typeof Request !== "undefined" && input instanceof Request;
    const baseInit = init && typeof init === "object" ? { ...init } : {};
    const inheritedHeaders = isRequest ? input.headers : undefined;
    const firstToken = String(await resolveApiToken()).trim();
    const firstHeaders = new Headers(baseInit.headers || inheritedHeaders || {});
    if (firstToken && !firstHeaders.has("X-Taffy-Token") && !firstHeaders.has("Authorization")) {
      firstHeaders.set("X-Taffy-Token", firstToken);
    }

    let retrySeedRequest = null;
    let firstRequest = input;
    let firstFetchInit = { ...baseInit, headers: firstHeaders };
    if (isRequest) {
      try {
        retrySeedRequest = input.clone();
      } catch (_) {
        retrySeedRequest = null;
      }
      firstRequest = new Request(input, firstFetchInit);
      firstFetchInit = undefined;
    }

    const firstResp = await fetchImpl(firstRequest, firstFetchInit);
    if (firstResp.status !== 401) {
      return firstResp;
    }

    const refreshedToken = await resolveApiToken(true);
    const nextToken = String(refreshedToken || "").trim();
    if (!nextToken || nextToken === firstToken) {
      return firstResp;
    }

    const retryHeaders = new Headers(baseInit.headers || inheritedHeaders || {});
    if (!retryHeaders.has("X-Taffy-Token") && !retryHeaders.has("Authorization")) {
      retryHeaders.set("X-Taffy-Token", nextToken);
    }
    if (isRequest) {
      if (!retrySeedRequest) {
        return firstResp;
      }
      try {
        const retryRequest = new Request(retrySeedRequest, { ...baseInit, headers: retryHeaders });
        return fetchImpl(retryRequest);
      } catch (_) {
        return firstResp;
      }
    }
    return fetchImpl(input, { ...baseInit, headers: retryHeaders });
  }

  const api = {
    authFetch,
    clearPersistedApiToken,
    isApiRequestTarget,
    persistApiToken,
    resolveApiToken
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.apiClient = api;

  root.authFetch = authFetch;
  root.clearPersistedApiToken = clearPersistedApiToken;
  root.persistApiToken = persistApiToken;
  root.resolveApiToken = resolveApiToken;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
