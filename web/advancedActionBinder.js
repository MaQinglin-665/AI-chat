(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function bindAsyncButton(button, options = {}) {
    if (!button) {
      return;
    }
    button.addEventListener("click", async () => {
      const previousText = button.textContent || options.defaultText || "";
      if (options.busyText) {
        button.textContent = options.busyText;
      }
      button.disabled = options.disableWhileBusy !== false;
      try {
        await call(options.run);
      } catch (err) {
        call(options.onError, err);
      } finally {
        button.disabled = false;
        if (options.busyText) {
          button.textContent = previousText;
        }
      }
    });
  }

  function bindAdvancedActionControls(ui = {}, deps = {}) {
    if (ui.followupReadinessBtn) {
      ui.followupReadinessBtn.addEventListener("click", () => {
        const visible = call(deps.toggleFollowupReadinessPanel);
        call(deps.updateFollowupCharacterChip);
        call(deps.setStatus, visible ? "\u7eed\u8bdd\u72b6\u6001\u9762\u677f\u5df2\u6253\u5f00" : "\u7eed\u8bdd\u72b6\u6001\u9762\u677f\u5df2\u9690\u85cf");
      });
    }

    bindAsyncButton(ui.doctorBtn, {
      defaultText: "\u6545\u969c\u81ea\u68c0",
      busyText: "\u81ea\u68c0\u4e2d",
      run: deps.runDoctorAndAppendReport,
      onError: (err) => {
        call(deps.appendMessage, "assistant", `Doctor failed: ${err?.message || err}`, { enableTranslation: false });
        call(deps.setStatus, "\u6545\u969c\u81ea\u68c0\u5931\u8d25");
      }
    });

    bindAsyncButton(ui.characterRehearsalBtn, {
      defaultText: "\u89d2\u8272\u8bd5\u6f14",
      busyText: "\u8bd5\u6f14\u4e2d",
      run: deps.runCharacterRehearsalAndAppendReport,
      onError: (err) => {
        call(deps.appendMessage, "assistant", `\u89d2\u8272\u8bd5\u6f14\u5931\u8d25: ${err?.message || err}`, { enableTranslation: false });
        call(deps.setStatus, "\u89d2\u8272\u8bd5\u6f14\u5931\u8d25");
      }
    });

    if (ui.characterTuningBtn) {
      ui.characterTuningBtn.addEventListener("click", () => {
        call(deps.runCharacterTuningAndAppendReport);
      });
    }
    if (ui.subtitleToggleBtn) {
      ui.subtitleToggleBtn.addEventListener("click", () => {
        call(deps.toggleSubtitleEnabled);
      });
    }
    if (ui.translationChipBtn) {
      ui.translationChipBtn.addEventListener("click", () => {
        call(deps.toggleChatTranslationVisibility);
      });
    }
  }

  const api = {
    bindAdvancedActionControls,
    bindAsyncButton
  };

  root.TaffyAdvancedActionBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
