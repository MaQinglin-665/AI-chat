#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");

const API_CLIENT_JS = path.resolve(__dirname, "..", "web", "apiClient.js");
const api = require(API_CLIENT_JS);

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

async function testTokenResolutionOrder() {
  globalThis.location = { origin: "http://127.0.0.1:8123", search: "?api_token=query-token" };
  globalThis.localStorage = createStorage();
  globalThis.__TAFFY_API_TOKEN = "global-token";
  globalThis.electronAPI = { getApiToken: async () => "runtime-token" };

  assert.strictEqual(await api.resolveApiToken(true), "query-token");
  assert.strictEqual(globalThis.localStorage.getItem("taffy_api_token"), "query-token");

  globalThis.location = { origin: "http://127.0.0.1:8123", search: "" };
  globalThis.localStorage = createStorage();
  globalThis.electronAPI = { getApiToken: async () => "runtime-token" };
  assert.strictEqual(await api.resolveApiToken(true), "runtime-token");
  assert.strictEqual(globalThis.localStorage.getItem("taffy_api_token"), "runtime-token");

  globalThis.localStorage = createStorage({ taffy_api_token: "stored-token" });
  globalThis.electronAPI = { getApiToken: async () => "" };
  globalThis.__TAFFY_API_TOKEN = "global-token";
  assert.strictEqual(await api.resolveApiToken(true), "stored-token");

  globalThis.localStorage = createStorage();
  globalThis.__TAFFY_API_TOKEN = "global-token";
  assert.strictEqual(await api.resolveApiToken(true), "global-token");
}

async function testAuthFetchAddsAndRefreshesToken() {
  const calls = [];
  const runtimeTokens = ["first-token", "second-token"];
  globalThis.location = { origin: "http://127.0.0.1:8123", search: "" };
  globalThis.localStorage = createStorage();
  globalThis.__TAFFY_API_TOKEN = "";
  globalThis.electronAPI = {
    getApiToken: async () => runtimeTokens.shift() || ""
  };
  globalThis.fetch = async (input, init = {}) => {
    const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers || {});
    calls.push({
      input,
      token: headers.get("X-Taffy-Token"),
      authorization: headers.get("Authorization")
    });
    return { status: calls.length === 1 ? 401 : 200 };
  };

  await api.resolveApiToken(true);
  const resp = await api.authFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  assert.strictEqual(resp.status, 200);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].token, "first-token");
  assert.strictEqual(calls[1].token, "second-token");

  calls.length = 0;
  await api.authFetch("/config.json", { headers: {} });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].token, null);
}

async function main() {
  assert.strictEqual(api.isApiRequestTarget("/api/chat"), true);
  assert.strictEqual(api.isApiRequestTarget("/config.json"), false);
  await testTokenResolutionOrder();
  await testAuthFetchAddsAndRefreshesToken();
  console.log("API client frontend checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
