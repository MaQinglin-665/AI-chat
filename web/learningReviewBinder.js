(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  async function guarded(task, onError, message) {
    try {
      await task();
    } catch (err) {
      call(onError, `${message}: ${err?.message || err}`);
    }
  }

  function bindLearningReviewControls(ui = {}, deps = {}) {
    const state = deps.state || {};

    if (ui.learningReviewBtn) {
      ui.learningReviewBtn.addEventListener("click", () => {
        call(deps.toggleDrawer);
      });
    }

    if (ui.learningReviewCloseBtn) {
      ui.learningReviewCloseBtn.addEventListener("click", () => {
        call(deps.closeDrawer);
      });
    }

    if (ui.learningReviewBackdrop) {
      ui.learningReviewBackdrop.addEventListener("click", () => {
        call(deps.closeDrawer);
      });
    }

    if (ui.learningReviewUndoBtn) {
      ui.learningReviewUndoBtn.addEventListener("click", async () => {
        await guarded(() => call(deps.undoLastStep), deps.onError, "撤销失败");
      });
    }

    if (ui.learningTabCandidates) {
      ui.learningTabCandidates.addEventListener("click", () => {
        state.activeTab = "candidates";
        call(deps.render);
      });
    }

    if (ui.learningTabSamples) {
      ui.learningTabSamples.addEventListener("click", () => {
        state.activeTab = "samples";
        call(deps.render);
      });
    }

    if (ui.learningTabShort) {
      ui.learningTabShort.addEventListener("click", () => {
        state.activeTab = "short";
        call(deps.render);
      });
    }

    if (ui.learningTabCore) {
      ui.learningTabCore.addEventListener("click", () => {
        state.activeTab = "core";
        call(deps.render);
      });
    }

    if (ui.learningTabDebug) {
      ui.learningTabDebug.addEventListener("click", async () => {
        state.activeTab = "debug";
        call(deps.render);
        await guarded(() => call(deps.reloadMemoryDebug), deps.onError, "Memory debug failed");
      });
    }

    for (const filterInput of [
      ui.learningFilterScore,
      ui.learningFilterConfidence,
      ui.learningFilterKeyword
    ]) {
      if (!filterInput) {
        continue;
      }
      filterInput.addEventListener("input", () => {
        call(deps.render);
      });
    }

    if (ui.learningSortMode) {
      ui.learningSortMode.value = String(state.sortMode || "score_desc");
      ui.learningSortMode.addEventListener("change", () => {
        state.sortMode = String(ui.learningSortMode?.value || "score_desc");
        call(deps.render);
      });
    }

    if (ui.learningFilterHighBtn) {
      ui.learningFilterHighBtn.addEventListener("click", () => {
        call(deps.applyHighScorePreset);
      });
    }

    if (ui.learningFilterResetBtn) {
      ui.learningFilterResetBtn.addEventListener("click", () => {
        call(deps.resetFilters);
      });
    }

    if (ui.learningReloadBtn) {
      ui.learningReloadBtn.addEventListener("click", async () => {
        await guarded(() => call(deps.reload), deps.onError, "重读失败");
      });
    }

    if (ui.learningQuickApplyBtn) {
      ui.learningQuickApplyBtn.addEventListener("click", async () => {
        await guarded(() => call(deps.applyQuickSettings), deps.onError, "快捷开关更新失败");
      });
    }

    if (ui.learningSelectAll) {
      ui.learningSelectAll.addEventListener("change", () => {
        const selectedSet = call(deps.getSelectedSet);
        const filteredItems = call(deps.getFilteredItems) || [];
        if (!(selectedSet instanceof Set)) {
          return;
        }
        if (ui.learningSelectAll.checked) {
          filteredItems.forEach((item) => selectedSet.add(item.id));
        } else {
          filteredItems.forEach((item) => selectedSet.delete(item.id));
        }
        call(deps.render);
      });
    }

    const bindBatch = (button, action, label) => {
      if (!button) {
        return;
      }
      button.addEventListener("click", async () => {
        await guarded(() => call(deps.runBatchAction, action), deps.onError, `${label}失败`);
      });
    };
    bindBatch(ui.learningBatchDeleteBtn, "delete", "批量删除");
    bindBatch(ui.learningBatchUpBtn, "weight_up", "批量升权");
    bindBatch(ui.learningBatchDownBtn, "weight_down", "批量降权");
    bindBatch(ui.learningBatchPromoteBtn, "promote", "批量晋升");

    if (ui.learningReviewList) {
      ui.learningReviewList.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof root.HTMLInputElement)) {
          return;
        }
        if (!target.classList.contains("learning-check")) {
          return;
        }
        const id = String(target.dataset.id || "").trim();
        if (!id) {
          return;
        }
        const selectedSet = call(deps.getSelectedSet);
        if (!(selectedSet instanceof Set)) {
          return;
        }
        if (target.checked) {
          selectedSet.add(id);
        } else {
          selectedSet.delete(id);
        }
        call(deps.render);
      });

      ui.learningReviewList.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof root.HTMLButtonElement)) {
          return;
        }
        const action = String(target.dataset.action || "").trim();
        const id = String(target.dataset.id || "").trim();
        if (!action || !id) {
          return;
        }
        await guarded(() => call(deps.runSingleAction, action, id, target), deps.onError, "操作失败");
      });
    }
  }

  const api = {
    bindLearningReviewControls
  };

  root.TaffyLearningReviewBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
