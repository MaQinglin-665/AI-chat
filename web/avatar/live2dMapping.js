(function (root) {
  "use strict";
  const DEFAULT_PATH = "/avatar/mappings/hiyori.json";
  let defaultMapping = typeof module !== "undefined" && module.exports ? require("./mappings/hiyori.json") : null;
  let pending;
  const resolved = new WeakMap();
  function resolve(mapping) {
    if (!mapping || mapping.version !== 1 || !mapping.params || typeof mapping.params !== "object") {
      throw new Error("Live2D mapping must contain version 1 and params");
    }
    if (resolved.has(mapping)) return resolved.get(mapping);
    const params = Object.fromEntries(Object.entries(mapping.params).filter(([, id]) => typeof id === "string" && id));
    const groups = Object.fromEntries(Object.entries(mapping.channelGroups || {}).map(([group, aliases]) =>
      [group, new Set(aliases.map(alias => params[alias]).filter(Boolean))]));
    const value = { params, parts: mapping.parts || {},
      has: (group, id) => !!groups[group]?.has(id),
      poses: (poses = {}) => Object.fromEntries(Object.entries(poses).map(([name, pose]) =>
        [name, Object.fromEntries(Object.entries(pose).filter(([alias]) => params[alias]).map(([alias, v]) => [params[alias], v]))])) };
    resolved.set(mapping, value);
    return value;
  }
  async function load(path = DEFAULT_PATH) {
    if (path && typeof path === "object") { resolve(path); return path; }
    const url = String(path || DEFAULT_PATH).replace(/^web\//, "/");
    if (url === DEFAULT_PATH && defaultMapping) return defaultMapping;
    const response = await root.fetch(url);
    if (!response.ok) throw new Error(`Live2D mapping load failed: ${url}`);
    const mapping = await response.json(); resolve(mapping);
    if (url === DEFAULT_PATH) defaultMapping = mapping;
    return mapping;
  }
  function ready() { return defaultMapping ? Promise.resolve(defaultMapping) : (pending ||= load().catch(error => { pending = null; throw error; })); }
  function getDefault() {
    if (!defaultMapping) throw new Error("Await Live2D mapping.ready() before using model parameters");
    return defaultMapping;
  }
  const api = { DEFAULT_PATH, load, ready, getDefault, resolve };
  root.XinyuLive2DMapping = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
