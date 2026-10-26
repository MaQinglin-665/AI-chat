(function (root) {
  "use strict";
  const STORAGE_KEY = "xinyu.hiyori.bedroom.v1";
  const FADE_MS = 2600;
  const LOOKS = Object.freeze({
    night: Object.freeze({ filter: "brightness(.72) saturate(.78) sepia(.12) hue-rotate(245deg)", opacity: .22, width: 1, depth: 1, dx: 0, dy: 0 }),
    dusk: Object.freeze({ filter: "brightness(.88) saturate(1.04) sepia(.32) hue-rotate(345deg)", opacity: .37, width: 1.65, depth: 1.3, dx: .20, dy: .09 }),
    day: Object.freeze({ filter: "brightness(.98) saturate(.98) sepia(.02) hue-rotate(0deg)", opacity: .30, width: 1, depth: 1, dx: 0, dy: 0 })
  });
  const SHADOW = Object.freeze({ footInset: .030, width: .15, depth: .035 });
  // Read the existing layout result; do not change any model or rendering transform.
  function syncFoot({ model, renderer, canvas, style }) {
    if (!model || !renderer || !canvas || !style) return;
    const rect = canvas.getBoundingClientRect(), sx = rect.width / renderer.width, sy = rect.height / renderer.height;
    if (![sx, sy, model.x, model.y, model.height].every(Number.isFinite)) return;
    const height = model.height * sy;
    style.setProperty("--hiyori-foot-x", `${rect.left + model.x * sx}px`);
    style.setProperty("--hiyori-foot-y", `${rect.top + model.y * sy - height * SHADOW.footInset}px`);
    style.setProperty("--hiyori-shadow-width", `${height * SHADOW.width}px`);
    style.setProperty("--hiyori-shadow-depth", `${height * SHADOW.depth}px`);
  }
  const ASSET_ROOT = "./assets/backgrounds/bedroom/";
  function periodFor(scene) { return scene === "night" || scene === "dusk" ? scene : "day"; }
  function eligible(body) {
    return !!body?.classList.contains("view-full") && !body.classList.contains("transparent-mode") && body.dataset.avatarKind !== "vrm";
  }
  function create({ documentObject = root.document, storage = root.localStorage, ImageCtor = root.Image,
    Observer = root.MutationObserver, setTimer = root.setTimeout?.bind(root), clearTimer = root.clearTimeout?.bind(root) } = {}) {
    const body = documentObject.body, layer = documentObject.getElementById("hiyori-backdrop"),
      control = documentObject.getElementById("hiyori-backdrop-enabled"), panel = documentObject.getElementById("hiyori-backdrop-options");
    let enabled = false, generation = 0, desired = "", current = null, pending = null, timer = null, disposed = false;
    try { enabled = storage?.getItem(STORAGE_KEY) === "true"; } catch (_) { /* Optional local preference. */ }
    if (control) control.checked = enabled;
    function clear() {
      generation++; desired = "";
      if (timer !== null) clearTimer(timer); timer = null;
      if (pending) { pending.onload = pending.onerror = null; pending.removeAttribute("src"); pending = null; }
      current = null; layer?.replaceChildren(); delete body.dataset.hiyoriBackdrop;
    }
    function refresh() {
      if (disposed) return;
      if (panel) panel.hidden = !eligible(body);
      if (!enabled || !eligible(body) || !layer) { clear(); return; }
      const period = periodFor(body.dataset.stageScene || "night");
      if (desired === period) return;
      desired = period;
      const token = ++generation;
      if (timer !== null) clearTimer(timer); timer = null;
      // Drop the oldest fading plate before loading another; retain only current + next.
      for (const child of [...layer.children]) if (child !== current) child.remove();
      if (pending) { pending.onload = pending.onerror = null; pending.removeAttribute("src"); }
      const image = new ImageCtor(); pending = image;
      image.alt = ""; image.setAttribute("aria-hidden", "true"); image.className = "hiyori-backdrop-image";
      image.onload = () => {
        if (disposed || token !== generation) return;
        pending = null; image.onload = image.onerror = null;
        const old = current; current = image; layer.append(image);
        // Commit initial opacity before fading in, without delaying the first usable plate.
        image.getBoundingClientRect(); image.classList.add("is-visible");
        const look = LOOKS[period];
        body.style?.setProperty("--hiyori-filter", look.filter);
        body.style?.setProperty("--hiyori-shadow-opacity", look.opacity);
        body.style?.setProperty("--hiyori-shadow-scale-x", look.width);
        body.style?.setProperty("--hiyori-shadow-scale-y", look.depth);
        body.style?.setProperty("--hiyori-shadow-dx", look.dx);
        body.style?.setProperty("--hiyori-shadow-dy", look.dy);
        body.dataset.hiyoriBackdrop = "true";
        old?.classList.remove("is-visible");
        timer = setTimer(() => { old?.remove(); timer = null; }, FADE_MS);
      };
      image.onerror = () => { if (token === generation) clear(); };
      image.src = ASSET_ROOT + period + ".webp";
    }
    function change() {
      enabled = !!control.checked;
      try { storage?.setItem(STORAGE_KEY, String(enabled)); } catch (_) { /* Keep working without storage. */ }
      refresh();
    }
    control?.addEventListener("change", change);
    documentObject.addEventListener("taffy:stage-room-change", refresh);
    const observer = Observer ? new Observer(refresh) : null;
    observer?.observe(body, { attributes: true, attributeFilter: ["class", "data-avatar-kind", "data-stage-scene"] });
    refresh();
    return { refresh, dispose() { disposed = true; clear(); observer?.disconnect(); control?.removeEventListener("change", change);
      documentObject.removeEventListener("taffy:stage-room-change", refresh); },
      state: () => ({ enabled, period: desired, loaded: !!current, pending: !!pending }) };
  }
  const api = { LOOKS, SHADOW, syncFoot, STORAGE_KEY, FADE_MS, ASSET_ROOT, periodFor, eligible, create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.XinyuHiyoriBackdrop = api;
  if (root.document) {
    const boot = () => { root.__xinyuHiyoriBackdrop ||= create(); };
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
