(function (root) {
  "use strict";

  function createTextLine(doc, className, label, text) {
    const line = doc.createElement("p");
    line.className = className;
    const strong = doc.createElement("strong");
    strong.textContent = label;
    line.appendChild(strong);
    line.appendChild(doc.createTextNode(text || "-"));
    return line;
  }

  function createMetricTag(doc, className, view, fallbackText) {
    const tag = doc.createElement("span");
    tag.className = `learning-metric ${className}`;
    tag.textContent = view?.text || fallbackText;
    tag.classList.add(view?.className || "is-low");
    return tag;
  }

  function createActionButton(doc, item, label, action, extraClass = "") {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.dataset.action = action;
    btn.dataset.id = item.id;
    if (extraClass) {
      String(extraClass).split(/\s+/).filter(Boolean).forEach((cls) => btn.classList.add(cls));
    }
    return btn;
  }

  function setLearningCardCollapsed(card, toggleBtn, nextCollapsed) {
    card.classList.toggle("is-collapsed", !!nextCollapsed);
    toggleBtn.textContent = nextCollapsed ? "\u5c55\u5f00" : "\u6536\u8d77";
    toggleBtn.setAttribute("aria-expanded", String(!nextCollapsed));
  }

  function renderEmptyState(container, doc, text) {
    const empty = doc.createElement("div");
    empty.className = "learning-empty";
    empty.textContent = text || "\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6682\u65e0\u6570\u636e";
    container.appendChild(empty);
  }

  function renderLearningReviewItems(container, items, options = {}) {
    if (!container) {
      return 0;
    }
    const doc = options.document || root.document;
    if (!doc || typeof doc.createElement !== "function") {
      return 0;
    }
    const model = options.model || root.TaffyLearningReviewModel || {};
    const tab = options.tab === "samples" ? "samples" : "candidates";
    const selectedSet = options.selectedSet instanceof Set ? options.selectedSet : new Set();
    const list = Array.isArray(items) ? items : [];
    container.innerHTML = "";
    container.hidden = false;
    if (!list.length) {
      renderEmptyState(container, doc, options.emptyText);
      return 0;
    }

    list.forEach((item) => {
      const card = doc.createElement("article");
      card.className = "learning-item";
      const metricViews = typeof model.getLearningMetricViews === "function"
        ? model.getLearningMetricViews(item)
        : null;

      const head = doc.createElement("div");
      head.className = "learning-item-head";

      const checkLabel = doc.createElement("label");
      checkLabel.className = "learning-item-check";
      const checkbox = doc.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "learning-check";
      checkbox.dataset.id = item.id;
      checkbox.checked = selectedSet.has(item.id);
      const checkText = doc.createElement("span");
      checkText.textContent = item.id;
      checkLabel.appendChild(checkbox);
      checkLabel.appendChild(checkText);

      const status = doc.createElement("span");
      const statusView = typeof model.getLearningStatusView === "function"
        ? model.getLearningStatusView(item.status)
        : { statusClass: "candidate", label: String(item.status || "\u5019\u9009") };
      status.className = `learning-item-status is-${statusView.statusClass}`;
      status.textContent = statusView.label;

      const toggleBtn = doc.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "learning-item-toggle";

      const headRight = doc.createElement("div");
      headRight.className = "learning-item-head-right";
      headRight.appendChild(status);
      headRight.appendChild(toggleBtn);

      head.appendChild(checkLabel);
      head.appendChild(headRight);

      const preview = doc.createElement("div");
      preview.className = "learning-item-preview";
      preview.appendChild(createTextLine(doc, "learning-item-line", "\u539f\u59cb\u56de\u590d\uff1a", item.assistant_preview || "-"));
      preview.appendChild(createTextLine(doc, "learning-item-line", "\u98ce\u683c\u63d0\u70bc\uff1a", item.compressed_pattern || "-"));

      const metrics = doc.createElement("div");
      metrics.className = "learning-item-metrics";
      metrics.appendChild(createMetricTag(doc, "metric-score", metricViews?.score, "\u8bc4\u5206 0.00"));
      metrics.appendChild(createMetricTag(doc, "metric-confidence", metricViews?.confidence, "\u7f6e\u4fe1 0.00"));
      metrics.appendChild(createMetricTag(doc, "metric-support", metricViews?.support, "\u652f\u6301 0"));

      const actions = doc.createElement("div");
      actions.className = "learning-item-actions";
      actions.appendChild(createActionButton(doc, item, "\u4fdd\u7559", "keep", "is-keep"));
      actions.appendChild(createActionButton(doc, item, "\u5220\u9664", "delete", "danger"));
      actions.appendChild(createActionButton(doc, item, "\u5347\u6743 +0.05", "weight_up", "is-up"));
      actions.appendChild(createActionButton(doc, item, "\u964d\u6743 -0.05", "weight_down", "is-down"));
      if (tab === "candidates") {
        actions.appendChild(createActionButton(doc, item, "\u664b\u5347\u6b63\u5f0f\u6c60", "promote", "is-promote"));
      }

      const body = doc.createElement("div");
      body.className = "learning-item-body";
      body.appendChild(preview);
      body.appendChild(metrics);
      body.appendChild(actions);

      setLearningCardCollapsed(card, toggleBtn, true);
      toggleBtn.addEventListener("click", () => {
        setLearningCardCollapsed(card, toggleBtn, !card.classList.contains("is-collapsed"));
      });

      card.appendChild(head);
      card.appendChild(body);
      container.appendChild(card);
    });

    return list.length;
  }

  function setTabActive(btn, active) {
    if (!btn) {
      return;
    }
    btn.classList.toggle("is-active", active === true);
    btn.setAttribute("aria-selected", String(active === true));
  }

  function renderLearningTabs(ui = {}, activeTab = "candidates") {
    const tab = activeTab === "samples" ? "samples" : (activeTab === "debug" ? "debug" : "candidates");
    setTabActive(ui.learningTabCandidates, tab === "candidates");
    setTabActive(ui.learningTabSamples, tab === "samples");
    setTabActive(ui.learningTabDebug, tab === "debug");
  }

  function showLearningDebugPanel(ui = {}, visible = false) {
    if (ui.learningDebugPanel) {
      ui.learningDebugPanel.hidden = visible !== true;
    }
    if (ui.learningReviewList) {
      ui.learningReviewList.hidden = visible === true;
    }
  }

  const api = {
    createActionButton,
    createMetricTag,
    createTextLine,
    renderLearningReviewItems,
    renderLearningTabs,
    setLearningCardCollapsed,
    showLearningDebugPanel
  };

  root.TaffyLearningReviewView = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
