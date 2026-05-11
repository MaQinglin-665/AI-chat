(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function isBusy(deps, key) {
    const state = deps.state || {};
    return !!state[key];
  }

  function bindSendControls(ui = {}, deps = {}) {
    if (ui.sendBtn) {
      ui.sendBtn.addEventListener("click", () => {
        call(deps.sendChat);
      });
    }
    if (ui.chatInput) {
      ui.chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          call(deps.sendChat);
        }
      });
    }
  }

  function bindAttachmentControls(ui = {}, deps = {}) {
    if (!ui.attachBtn || !ui.attachInput) {
      return;
    }
    ui.attachBtn.addEventListener("click", () => {
      if (isBusy(deps, "attachmentReadBusy")) {
        call(deps.setStatus, "\u9644\u4ef6\u5904\u7406\u4e2d\uff0c\u8bf7\u7a0d\u7b49...");
        return;
      }
      ui.attachInput.click();
    });
    ui.attachInput.addEventListener("change", async () => {
      try {
        await call(deps.handleAttachmentFiles, ui.attachInput.files);
      } finally {
        ui.attachInput.value = "";
      }
    });
  }

  function bindStickerControls(ui = {}, deps = {}) {
    if (ui.stickerBtn) {
      ui.stickerBtn.addEventListener("click", (event) => {
        if (event && typeof event.stopPropagation === "function") {
          event.stopPropagation();
        }
        call(deps.toggleStickerPanel);
      });
    }
    if (ui.stickerCloseBtn) {
      ui.stickerCloseBtn.addEventListener("click", () => {
        call(deps.closeStickerPanel);
      });
    }
    if (ui.stickerImportBtn && ui.stickerImportInput) {
      ui.stickerImportBtn.addEventListener("click", () => {
        if (isBusy(deps, "stickerImportBusy")) {
          call(deps.setStatus, "\u8868\u60c5\u5305\u5bfc\u5165\u4e2d\uff0c\u8bf7\u7a0d\u7b49...");
          return;
        }
        ui.stickerImportInput.click();
      });
      ui.stickerImportInput.addEventListener("change", async () => {
        try {
          await call(deps.handleStickerImportFiles, ui.stickerImportInput.files);
        } finally {
          ui.stickerImportInput.value = "";
        }
      });
    }
    if (ui.stickerRespondToggle) {
      ui.stickerRespondToggle.addEventListener("change", () => {
        call(deps.setStickerRespondAfterSend, ui.stickerRespondToggle.checked === true);
      });
    }
  }

  function bindMicControls(ui = {}, deps = {}) {
    if (ui.micBtn) {
      ui.micBtn.addEventListener("click", async () => {
        await call(deps.toggleMicOpen);
      });
    }
  }

  function bindKeyboardShortcuts(ui = {}, deps = {}) {
    const target = deps.windowObject || root;
    if (!target || typeof target.addEventListener !== "function") {
      return;
    }
    target.addEventListener("keydown", async (event) => {
      if (!event.ctrlKey) {
        if (event.key === "Escape" && call(deps.isOnboardingOpen)) {
          event.preventDefault();
          call(deps.closeOnboardingModal, { markSeen: true });
          return;
        }
        if (event.key === "Escape" && call(deps.isHelpOpen)) {
          event.preventDefault();
          call(deps.closeHelpModal);
          return;
        }
        if (event.key === "Escape" && call(deps.isLearningReviewOpen)) {
          event.preventDefault();
          call(deps.closeLearningReviewDrawer);
          return;
        }
        if (event.key === "Escape" && ui.stickerPanel && !ui.stickerPanel.hidden) {
          event.preventDefault();
          call(deps.closeStickerPanel);
          return;
        }
        if (event.key === "Escape" && ui.personaModal && !ui.personaModal.hidden) {
          event.preventDefault();
          call(deps.closePersonaPanel);
          return;
        }
        if (event.key === "Escape" && ui.scheduleModal && !ui.scheduleModal.hidden) {
          event.preventDefault();
          call(deps.closeSchedulePanel);
        }
        return;
      }
      if (String(event.key || "").toLowerCase() !== "m") {
        return;
      }
      if (event.repeat) {
        return;
      }
      event.preventDefault();
      await call(deps.toggleMicOpen);
    });
  }

  function bindSpeakControls(ui = {}, deps = {}) {
    const state = deps.state || {};
    if (ui.speakBtn) {
      ui.speakBtn.addEventListener("click", () => {
        state.speakingEnabled = !state.speakingEnabled;
        call(deps.updateSpeakButton);
        if (!state.speakingEnabled) {
          call(deps.stopAllAudioPlayback);
        }
      });
    }
    if (ui.voiceNextBtn) {
      ui.voiceNextBtn.addEventListener("click", async () => {
        call(deps.switchVoice);
        state.speakingEnabled = true;
        call(deps.updateSpeakButton);
        const ok = await call(deps.speak, "\u4f60\u597d\uff0c\u6211\u662f\u65b0\u7684\u97f3\u8272\u3002", { force: true });
        if (!ok) {
          call(deps.setStatus, "\u5f53\u524d\u58f0\u7ebf\u4e0d\u53ef\u7528");
        }
      });
    }
  }

  function bindChatInputControls(ui = {}, deps = {}) {
    bindSendControls(ui, deps);
    bindAttachmentControls(ui, deps);
    bindStickerControls(ui, deps);
    bindMicControls(ui, deps);
    bindKeyboardShortcuts(ui, deps);
    bindSpeakControls(ui, deps);
  }

  const api = {
    bindChatInputControls,
    bindSendControls,
    bindAttachmentControls,
    bindStickerControls,
    bindMicControls,
    bindKeyboardShortcuts,
    bindSpeakControls
  };

  root.TaffyChatInputBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
