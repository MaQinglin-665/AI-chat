(function (root) {
  "use strict";
  function createController({ document: doc = root.document, schedule = root.setTimeout, cancel = root.clearTimeout } = {}) {
    let timer, generation = 0, startupShown = false;
    function show(kind, message) {
      const box = doc?.getElementById("stage-feedback");
      if (!box) return;
      box.hidden = !message;
      box.dataset.kind = kind;
      doc.getElementById("stage-feedback-text").textContent = message || "";
      doc.getElementById("stage-feedback-doctor").hidden = kind === "waiting" || !message;
    }
    function clear() { cancel(timer); show("", ""); }
    function error(err) {
      cancel(timer);
      const auth = /401|invalid api token|token.*(?:invalid|missing)|令牌/.test(String(err?.message || err).toLowerCase());
      show(auth ? "auth" : "error", auth
        ? "访问令牌无效或缺失。请从桌宠打开页面，或检查浏览器访问链接的 api_token；更多 → 故障自检可查看连接配置。"
        : "暂时没能连接上，请稍后重试，或打开故障自检看看。布局与输入仍可使用。");
    }
    return {
      begin() { clear(); const id = ++generation; timer = schedule(() => { if (id === generation) show("waiting", "正在想…"); }, 600); return id; },
      received(id) { if (id === generation) clear(); },
      failed(id, err) { if (id === generation) error(err); },
      finish(id) { if (id === generation) cancel(timer); },
      startupFailure(err) { if (!startupShown) { startupShown = true; error(err); } },
      clear() { ++generation; clear(); },
      bind() {
        doc?.getElementById("stage-feedback-doctor")?.addEventListener("click", () => doc.getElementById("doctor-btn")?.click());
        doc?.getElementById("stage-feedback-dismiss")?.addEventListener("click", () => { ++generation; clear(); });
      }
    };
  }
  const api = { createController };
  if (root.document) { Object.assign(api, createController()); api.bind(); }
  root.TaffyStageFeedback = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
