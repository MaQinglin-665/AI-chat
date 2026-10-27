(function (root) {
  "use strict";
  // Pixi's XHR/image loaders cannot attach the local API token. Fetch the bounded
  // manifest resources through authFetch, then give Pixi private object URLs.
  async function prepare(path, host = root) {
    if (!String(path).startsWith("/api/avatar/live2d/")) return null;
    const fetch = host.authFetch || host.fetch;
    const urls = [], expressions = {};
    const dispose = () => { for (const url of urls.splice(0)) host.URL.revokeObjectURL(url); };
    const read = async url => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Live2D local resource unavailable");
      return response;
    };
    try {
      const settings = await (await read(path)).json();
      const refs = settings.FileReferences;
      const cache = new Map();
      async function resource(name, expression) {
        if (!name) return name;
        if (typeof name !== "string" || /[\\:%?#\x00]/.test(name) || name.startsWith("/") || name.split("/").some(p => !p || p === "." || p === "..")) {
          throw new Error("Invalid Live2D resource reference");
        }
        if (!cache.has(name)) cache.set(name, (async () => {
          const url = path.slice(0, path.lastIndexOf("/") + 1) + name.split("/").map(encodeURIComponent).join("/");
          const blob = await (await read(url)).blob();
          if (blob.size > 64 * 1024 * 1024) throw new Error("Live2D resource too large");
          const objectUrl = host.URL.createObjectURL(blob); urls.push(objectUrl);
          return { objectUrl, blob };
        })());
        const loaded = await cache.get(name);
        if (expression) expressions[expression] = JSON.parse(await loaded.blob.text());
        return loaded.objectUrl;
      }
      refs.Moc = await resource(refs.Moc);
      for (let i = 0; i < refs.Textures.length; i++) refs.Textures[i] = await resource(refs.Textures[i]);
      for (const key of ["Physics", "Pose"]) if (refs[key]) refs[key] = await resource(refs[key]);
      for (const item of refs.Expressions || []) item.File = await resource(item.File, item.Name);
      for (const group of Object.values(refs.Motions || {})) for (const item of group) {
        item.File = await resource(item.File);
        delete item.Sound; // No undeclared audio fetches from model manifests.
      }
      delete refs.DisplayInfo; delete refs.UserData;
      settings.url = new host.URL(path, host.location.origin).href;
      return { settings, expressions, dispose };
    } catch (error) { dispose(); throw error; }
  }
  const api = { prepare };
  root.XinyuLive2DAssets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
