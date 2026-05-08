(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const window = deps.windowObject || root;
    const ONBOARDING_STEPS = Array.isArray(deps.onboardingSteps) ? deps.onboardingSteps : [];
    const saveOnboardingSeenToStorage = typeof deps.saveOnboardingSeenToStorage === "function" ? deps.saveOnboardingSeenToStorage : () => {};
    function isHelpOpen() {
      return !!(ui.helpModal && !ui.helpModal.hidden);
    }

    function isOnboardingOpen() {
      return !!(ui.onboardingModal && !ui.onboardingModal.hidden);
    }

    function closeHelpModal() {
      if (!ui.helpModal) {
        return;
      }
      ui.helpModal.hidden = true;
    }

    function openHelpModal() {
      if (!ui.helpModal) {
        return;
      }
      if (isOnboardingOpen()) {
        ui.onboardingModal.hidden = true;
      }
      ui.helpModal.hidden = false;
    }

    function openAdvancedConfigCenter() {
      const target = "/docs/config.html";
      try {
        const popup = window.open(target, "_blank", "noopener,noreferrer");
        if (popup && typeof popup.focus === "function") {
          popup.focus();
          return;
        }
      } catch (_) {
        // ignore and fallback to same-window navigation
      }
      window.location.href = target;
    }

    function renderOnboardingStep() {
      const total = ONBOARDING_STEPS.length;
      const index = Math.max(0, Math.min(total - 1, Number(state.onboardingStepIndex) || 0));
      state.onboardingStepIndex = index;
      const step = ONBOARDING_STEPS[index] || ONBOARDING_STEPS[0];
      if (ui.onboardingStepTitle) {
        ui.onboardingStepTitle.textContent = step.title;
      }
      if (ui.onboardingStepDesc) {
        ui.onboardingStepDesc.textContent = step.desc;
      }
      if (ui.onboardingStepTip) {
        ui.onboardingStepTip.textContent = step.tip;
      }
      if (ui.onboardingPathSplit) {
        ui.onboardingPathSplit.hidden = index !== 0;
      }
      if (ui.onboardingStepIndex) {
        ui.onboardingStepIndex.textContent = `${index + 1} / ${total}`;
      }
      if (ui.onboardingProgressBar) {
        const ratio = total > 1 ? index / (total - 1) : 1;
        ui.onboardingProgressBar.style.width = `${Math.round(ratio * 100)}%`;
      }
      const atLast = index >= total - 1;
      if (ui.onboardingPrevBtn) {
        ui.onboardingPrevBtn.disabled = index <= 0;
      }
      if (ui.onboardingNextBtn) {
        ui.onboardingNextBtn.hidden = atLast;
      }
      if (ui.onboardingDoneBtn) {
        ui.onboardingDoneBtn.hidden = !atLast;
      }
    }

    function closeOnboardingModal(options = {}) {
      if (!ui.onboardingModal) {
        return;
      }
      ui.onboardingModal.hidden = true;
      if (options.markSeen) {
        state.onboardingSeen = true;
        saveOnboardingSeenToStorage(true);
      }
    }

    function openOnboardingModal(options = {}) {
      if (!ui.onboardingModal) {
        return;
      }
      if (ui.helpModal && !ui.helpModal.hidden) {
        closeHelpModal();
      }
      if (options.resetStep) {
        state.onboardingStepIndex = 0;
      }
      ui.onboardingModal.hidden = false;
      renderOnboardingStep();
    }

    function moveOnboardingStep(delta) {
      const total = ONBOARDING_STEPS.length;
      const next = Math.max(0, Math.min(total - 1, (Number(state.onboardingStepIndex) || 0) + Number(delta || 0)));
      if (next === state.onboardingStepIndex) {
        return;
      }
      state.onboardingStepIndex = next;
      renderOnboardingStep();
    }

    function maybeAutoOpenOnboarding() {
      if (state.onboardingSeen) {
        return;
      }
      if (state.uiView === "model") {
        return;
      }
      openOnboardingModal({ resetStep: true });
    }


    return {
      isHelpOpen,
      isOnboardingOpen,
      closeHelpModal,
      openHelpModal,
      openAdvancedConfigCenter,
      renderOnboardingStep,
      closeOnboardingModal,
      openOnboardingModal,
      moveOnboardingStep,
      maybeAutoOpenOnboarding
    };
  }

  const api = { createController };
  root.TaffyOnboardingController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
