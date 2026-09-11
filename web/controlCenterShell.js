(function (root) {
  "use strict";

  const PAGES = Object.freeze([
    { key: "schedule", label: "日程", targetId: "schedule-btn", glyph: "calendar" },
    { key: "persona", label: "人设卡", targetId: "persona-btn", glyph: "person" },
    { key: "config", label: "模型 / 语音", targetId: "config-switch-btn", glyph: "voice" },
    { key: "qq", label: "QQ 身份", targetId: "qq-identity-btn", glyph: "penguin" },
    { key: "memory", label: "记忆管理", targetId: "learning-review-btn", glyph: "memory" },
    { key: "doctor", label: "故障自检", targetId: "doctor-btn", glyph: "shield" }
  ]);

  const SURFACES = Object.freeze([
    [".schedule-dialog", "schedule"],
    [".persona-dialog", "persona"],
    [".config-switch-dialog", "config"],
    [".qq-identity-dialog", "qq"],
    [".learning-review-drawer", "memory"],
    [".doctor-dialog", "doctor"]
  ]);

  const PROGRESSIVE_PAGES = Object.freeze({
    schedule: {
      hint: "先写时间和提醒内容；需要工具任务时再打开更多选项。",
      detail: "执行类型与自动任务方式",
      selectors: ["#schedule-mode"]
    },
    config: {
      hint: "先完成模型、声音和角色选择，就可以正常使用。",
      detail: "接口、密钥、超时和模型位置",
      selectors: [
        ".config-switch-summary",
        "#config-switch-llm-base-url",
        "#config-switch-llm-api-key-env",
        "#config-switch-llm-api-key",
        "#config-switch-key-status",
        "#config-switch-tts-stream-mode",
        "#config-switch-gpt-sovits-row",
        "#config-switch-gpt-sovits-timeout-row",
        "#config-switch-volcengine-url-row",
        "#config-switch-volcengine-cluster-row",
        "#config-switch-tts-browser-fallback",
        "#config-switch-live2d-model-path",
        "#config-switch-live2d-scale",
        "#config-switch-live2d-x-ratio",
        "#config-switch-live2d-y-ratio",
        "#config-switch-live2d-report",
        "#config-switch-test-llm-btn",
        "#config-switch-test-live2d-btn"
      ]
    },
    persona: {
      hint: "先设置身份、性格和说话方式，其余内容可以稍后补充。",
      detail: "口头禅、表达偏好和关系状态",
      selectors: [
        "#persona-identity",
        "#persona-catchphrases",
        "#persona-dislikes",
        ".persona-preferences-section",
        ".persona-relationship-section",
        ".persona-guide-section",
        ".persona-footer-actions"
      ]
    },
    memory: {
      hint: "先查看和确认记忆，需要整理时再打开高级工具。",
      detail: "筛选、批量处理和调试信息",
      selectors: [
        "#learning-review-undo-btn",
        "#learning-tab-debug",
        ".learning-filter-card",
        ".learning-batch-card",
        "#learning-debug-panel"
      ]
    },
    doctor: {
      hint: "先看检查结论；排查问题时再查看完整报告。",
      detail: "完整的本地运行诊断报告",
      selectors: [".doctor-report-card"]
    }
  });

  const SURFACE_CONTAINER_SELECTORS = Object.freeze([
    ".schedule-modal",
    ".persona-modal",
    ".config-switch-modal",
    ".qq-identity-modal",
    ".learning-review-drawer",
    ".doctor-modal"
  ]);

  function getSurfaceContainers(documentObject) {
    return SURFACE_CONTAINER_SELECTORS
      .map((selector) => documentObject.querySelector(selector))
      .filter(Boolean);
  }

  function hasVisibleSurface(documentObject) {
    return getSurfaceContainers(documentObject).some((node) => node.hidden !== true);
  }

  function ensureBackplane(documentObject) {
    let backplane = documentObject.getElementById("control-center-backplane");
    if (backplane) return backplane;
    backplane = documentObject.createElement("div");
    backplane.id = "control-center-backplane";
    backplane.className = "control-center-backplane";
    backplane.hidden = true;
    backplane.setAttribute("aria-hidden", "true");
    backplane.innerHTML = [
      '<div class="control-center-backplane-shell">',
      '<div class="control-center-backplane-rail"></div>',
      '<div class="control-center-backplane-page"></div>',
      "</div>"
    ].join("");
    documentObject.body?.appendChild(backplane);
    return backplane;
  }

  function syncBackplane(documentObject, forceVisible = false) {
    const backplane = ensureBackplane(documentObject);
    const visible = forceVisible || hasVisibleSurface(documentObject);
    backplane.hidden = !visible;
    documentObject.body?.classList?.toggle("control-center-active", visible);
    return visible;
  }

  function beginPageSwitch(documentObject, targetKey) {
    const backplane = ensureBackplane(documentObject);
    backplane.dataset.targetPage = targetKey;
    documentObject.body?.classList?.add("control-center-switching");
    syncBackplane(documentObject, true);
    for (const button of documentObject.querySelectorAll(".control-center-nav-item")) {
      const selected = button.dataset.controlCenterTarget === targetKey;
      button.setAttribute("aria-current", selected ? "page" : "false");
    }
  }

  function scrollActiveNavigationIntoView(documentObject) {
    const activeSurface = getSurfaceContainers(documentObject).find((node) => node.hidden !== true);
    const activeButton = activeSurface?.querySelector?.('.control-center-nav-item[aria-current="page"]');
    activeButton?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }

  function finishPageSwitch(documentObject) {
    const raf = typeof root.requestAnimationFrame === "function"
      ? root.requestAnimationFrame.bind(root)
      : (callback) => setTimeout(callback, 0);
    raf(() => raf(() => {
      documentObject.body?.classList?.remove("control-center-switching");
      syncBackplane(documentObject);
      scrollActiveNavigationIntoView(documentObject);
    }));
  }

  function observeSurfaceVisibility(documentObject) {
    if (documentObject.body?.dataset.controlCenterObserver === "true") return;
    if (documentObject.body?.dataset) documentObject.body.dataset.controlCenterObserver = "true";
    const Observer = root.MutationObserver;
    if (typeof Observer !== "function") return;
    const observer = new Observer(() => syncBackplane(documentObject));
    for (const node of getSurfaceContainers(documentObject)) {
      observer.observe(node, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  function closeSurface(surface) {
    const closeButton = surface?.querySelector?.(
      "#schedule-close-btn, #persona-close-btn, #config-switch-close-btn, #qq-identity-close-btn, #learning-review-close-btn, #doctor-close-btn"
    );
    closeButton?.click?.();
  }

  function createNavigation(documentObject, activeKey, surface) {
    const nav = documentObject.createElement("aside");
    nav.className = "control-center-nav";
    nav.setAttribute("aria-label", "控制中心功能");

    const brand = documentObject.createElement("div");
    brand.className = "control-center-brand";
    brand.innerHTML = [
      '<img src="./assets/assistant_avatar_ref.png?v=2" alt="">',
      '<span><strong>馨语AI桌宠</strong><small>控制中心</small></span>'
    ].join("");
    nav.appendChild(brand);

    const pageList = documentObject.createElement("div");
    pageList.className = "control-center-nav-list";
    for (const page of PAGES) {
      const button = documentObject.createElement("button");
      button.type = "button";
      button.className = "control-center-nav-item";
      button.dataset.controlCenterTarget = page.key;
      button.dataset.glyph = page.glyph;
      button.setAttribute("aria-current", page.key === activeKey ? "page" : "false");
      button.innerHTML = `<span class="control-center-nav-icon" aria-hidden="true"></span><span>${page.label}</span>`;
      button.addEventListener("click", () => {
        if (page.key === activeKey) return;
        const targetButton = documentObject.getElementById(page.targetId);
        if (!targetButton) return;
        beginPageSwitch(documentObject, page.key);
        closeSurface(surface);
        targetButton.click();
        finishPageSwitch(documentObject);
      });
      pageList.appendChild(button);
    }
    nav.appendChild(pageList);

    const foot = documentObject.createElement("div");
    foot.className = "control-center-nav-foot";
    foot.innerHTML = '<span aria-hidden="true"></span><span>本地陪伴服务</span>';
    nav.appendChild(foot);
    return nav;
  }

  function resolveAdvancedTarget(node) {
    if (!node) return null;
    if (node.matches?.(
      ".config-switch-summary, .config-switch-note, .config-switch-live2d-report, .learning-card, .doctor-report-card, .persona-section, button"
    )) return node;
    return node.closest?.(
      ".persona-advanced-details, .config-switch-field, .config-switch-check, .persona-field, .schedule-field"
    ) || node;
  }

  function addProgressiveDisclosure(documentObject, surface, content, activeKey) {
    const config = PROGRESSIVE_PAGES[activeKey];
    if (!config) return;

    for (const selector of config.selectors) {
      const node = surface.querySelector(selector);
      resolveAdvancedTarget(node)?.classList?.add("control-center-advanced");
    }

    const modebar = documentObject.createElement("div");
    modebar.className = "control-center-modebar";
    modebar.innerHTML = [
      '<div class="control-center-modebar-copy">',
      '<strong>常用设置</strong>',
      `<span>${config.hint}</span>`,
      "</div>",
      '<button class="control-center-advanced-toggle" type="button" aria-expanded="false">',
      '<span class="control-center-advanced-toggle-icon" aria-hidden="true"></span>',
      '<span><strong>高级设置</strong>',
      `<small>${config.detail}</small></span>`,
      '<i aria-hidden="true"></i>',
      "</button>"
    ].join("");

    const header = content.firstElementChild;
    if (header?.nextSibling) content.insertBefore(modebar, header.nextSibling);
    else content.appendChild(modebar);

    const toggle = modebar.querySelector(".control-center-advanced-toggle");
    const update = (expanded) => {
      surface.dataset.advancedVisible = expanded ? "true" : "false";
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    };
    update(false);
    toggle.addEventListener("click", () => update(toggle.getAttribute("aria-expanded") !== "true"));
  }

  function enhanceSurface(documentObject, selector, activeKey) {
    const surface = documentObject.querySelector(selector);
    if (!surface || surface.dataset.controlCenterEnhanced === "true") return false;
    const content = documentObject.createElement("div");
    content.className = "control-center-content";
    while (surface.firstChild) content.appendChild(surface.firstChild);
    surface.classList.add("control-center-shell");
    surface.dataset.controlCenterEnhanced = "true";
    surface.dataset.controlCenterPage = activeKey;
    surface.appendChild(createNavigation(documentObject, activeKey, surface));
    surface.appendChild(content);
    addProgressiveDisclosure(documentObject, surface, content, activeKey);
    return true;
  }

  function enhanceControlCenter(documentObject = root.document) {
    if (!documentObject?.querySelector) return 0;
    let count = 0;
    for (const [selector, key] of SURFACES) {
      if (enhanceSurface(documentObject, selector, key)) count += 1;
    }
    ensureBackplane(documentObject);
    observeSurfaceVisibility(documentObject);
    syncBackplane(documentObject);
    return count;
  }

  const api = {
    PAGES,
    SURFACES,
    PROGRESSIVE_PAGES,
    SURFACE_CONTAINER_SELECTORS,
    hasVisibleSurface,
    closeSurface,
    enhanceControlCenter
  };
  root.TaffyControlCenterShell = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", () => enhanceControlCenter(), { once: true });
    } else {
      enhanceControlCenter();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
