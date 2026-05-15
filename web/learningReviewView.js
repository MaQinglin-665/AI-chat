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

  function formatLearningDate(item = {}) {
    const raw = String(item.updated_at || item.created_at || "").trim();
    if (!raw) {
      return "\u672a\u8bb0\u5f55\u65f6\u95f4";
    }
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) {
      return raw.slice(0, 16);
    }
    try {
      return new Date(parsed).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (_) {
      return raw.slice(0, 16);
    }
  }

  function buildLearningItemTitle(item = {}) {
    const text = String(item.compressed_pattern || item.assistant_preview || item.user_preview || "").trim();
    if (!text) {
      return "\u672a\u547d\u540d\u8bb0\u5fc6";
    }
    return text.length > 46 ? `${text.slice(0, 46)}...` : text;
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
    const tab = options.tab === "samples" ? "samples" : (options.tab === "short" ? "short" : (options.tab === "core" ? "core" : "candidates"));
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

      const titleWrap = doc.createElement("div");
      titleWrap.className = "learning-item-title-wrap";
      const title = doc.createElement("strong");
      title.className = "learning-item-title";
      title.textContent = buildLearningItemTitle(item);
      const meta = doc.createElement("small");
      meta.className = "learning-item-meta";
      meta.textContent = `${formatLearningDate(item)} · ID ${item.id}`;
      titleWrap.appendChild(title);
      titleWrap.appendChild(meta);

      const status = doc.createElement("span");
      const statusView = tab === "short"
        ? { statusClass: "active", label: "\u77ed\u671f" }
        : typeof model.getLearningStatusView === "function"
        ? model.getLearningStatusView(tab === "core" && item.pinned ? "pinned" : item.status)
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
      head.appendChild(titleWrap);
      head.appendChild(headRight);

      const preview = doc.createElement("div");
      preview.className = "learning-item-preview";
      if (tab === "short") {
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u7c7b\u578b\uff1a", item.kind || "current_topic"));
        const editLine = doc.createElement("div");
        editLine.className = "learning-item-line learning-item-pattern";
        const editLabel = doc.createElement("strong");
        editLabel.textContent = "\u77ed\u671f\u8bb0\u5fc6\uff1a";
        const textarea = doc.createElement("textarea");
        textarea.className = "short-memory-edit";
        textarea.dataset.id = item.id;
        textarea.value = item.text || item.compressed_pattern || "";
        editLine.appendChild(editLabel);
        editLine.appendChild(textarea);
        preview.appendChild(editLine);
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u8f6e\u6b21\uff1a", `${item.last_seen_turn || 0} / TTL ${item.ttl_turns || 0}`));
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u89e6\u53d1\u539f\u8bdd\uff1a", item.user_preview || "-"));
      } else if (tab === "core") {
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u7c7b\u578b\uff1a", `${item.kind || "semantic"} / ${item.category || "stable_fact"}`));
        const editLine = doc.createElement("div");
        editLine.className = "learning-item-line learning-item-pattern";
        const editLabel = doc.createElement("strong");
        editLabel.textContent = "\u8bb0\u5fc6\u5185\u5bb9\uff1a";
        const textarea = doc.createElement("textarea");
        textarea.className = "core-memory-edit";
        textarea.dataset.id = item.id;
        textarea.value = item.text || item.compressed_pattern || "";
        editLine.appendChild(editLabel);
        editLine.appendChild(textarea);
        preview.appendChild(editLine);
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u6765\u6e90\uff1a", item.source || "-"));
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u89e6\u53d1\u539f\u8bdd\uff1a", item.user_preview || "-"));
      } else {
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u7528\u6237\u539f\u8bdd\uff1a", item.user_preview || "-"));
        preview.appendChild(createTextLine(doc, "learning-item-line", "\u684c\u5ba0\u56de\u590d\uff1a", item.assistant_preview || "-"));
        preview.appendChild(createTextLine(doc, "learning-item-line learning-item-pattern", "\u63d0\u70bc\u8bb0\u5fc6\uff1a", item.compressed_pattern || "-"));
      }

      const metrics = doc.createElement("div");
      metrics.className = "learning-item-metrics";
      metrics.appendChild(createMetricTag(doc, "metric-score", metricViews?.score, "\u8bc4\u5206 0.00"));
      metrics.appendChild(createMetricTag(doc, "metric-confidence", metricViews?.confidence, "\u7f6e\u4fe1 0.00"));
      metrics.appendChild(createMetricTag(doc, "metric-support", metricViews?.support, "\u652f\u6301 0"));

      const actions = doc.createElement("div");
      actions.className = "learning-item-actions";
      if (tab === "short") {
        actions.appendChild(createActionButton(doc, item, "\u4fdd\u5b58\u4fee\u6539", "edit", "is-promote"));
      } else if (tab === "core") {
        actions.appendChild(createActionButton(doc, item, item.pinned ? "\u53d6\u6d88\u56fa\u5b9a" : "\u56fa\u5b9a", item.pinned ? "unpin" : "pin", "is-keep"));
        actions.appendChild(createActionButton(doc, item, "\u4fdd\u5b58\u4fee\u6539", "edit", "is-promote"));
      } else if (tab === "candidates") {
        actions.appendChild(createActionButton(doc, item, "\u91c7\u7528\u5230\u6b63\u5f0f\u6c60", "promote", "is-promote"));
        actions.appendChild(createActionButton(doc, item, "\u5148\u7559\u7740", "keep", "is-keep"));
      }
      actions.appendChild(createActionButton(doc, item, "\u66f4\u5e38\u7528", "weight_up", "is-up"));
      actions.appendChild(createActionButton(doc, item, "\u5c11\u7528", "weight_down", "is-down"));
      actions.appendChild(createActionButton(doc, item, "\u5220\u9664", "delete", "danger"));

      const body = doc.createElement("div");
      body.className = "learning-item-body";
      body.appendChild(preview);
      body.appendChild(metrics);
      body.appendChild(actions);

      setLearningCardCollapsed(card, toggleBtn, false);
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
    const tab = activeTab === "samples" ? "samples" : (activeTab === "short" ? "short" : (activeTab === "core" ? "core" : (activeTab === "debug" ? "debug" : "candidates")));
    setTabActive(ui.learningTabCandidates, tab === "candidates");
    setTabActive(ui.learningTabSamples, tab === "samples");
    setTabActive(ui.learningTabShort, tab === "short");
    setTabActive(ui.learningTabCore, tab === "core");
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
