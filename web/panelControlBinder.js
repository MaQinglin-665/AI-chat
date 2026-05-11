(function (root) {
  "use strict";

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function bindHelpControls(ui = {}, deps = {}) {
    if (ui.helpBtn) {
      ui.helpBtn.addEventListener("click", () => {
        if (call(deps.isHelpOpen)) {
          call(deps.closeHelpModal);
        } else {
          call(deps.openHelpModal);
        }
      });
    }
    if (ui.helpCloseBtn) {
      ui.helpCloseBtn.addEventListener("click", () => call(deps.closeHelpModal));
    }
    if (ui.helpModal) {
      ui.helpModal.addEventListener("click", (event) => {
        if (event.target === ui.helpModal) {
          call(deps.closeHelpModal);
        }
      });
    }
    if (ui.helpOpenOnboardingBtn) {
      ui.helpOpenOnboardingBtn.addEventListener("click", () => {
        call(deps.openOnboardingModal, { resetStep: true });
      });
    }
  }

  function bindOnboardingControls(ui = {}, deps = {}) {
    if (ui.onboardingSkipBtn) {
      ui.onboardingSkipBtn.addEventListener("click", () => {
        call(deps.closeOnboardingModal, { markSeen: true });
      });
    }
    if (ui.onboardingQuickBtn) {
      ui.onboardingQuickBtn.addEventListener("click", () => {
        call(deps.closeOnboardingModal, { markSeen: true });
        call(deps.setStatus, "已进入立即体验模式");
      });
    }
    if (ui.onboardingAdvancedBtn) {
      ui.onboardingAdvancedBtn.addEventListener("click", () => {
        call(deps.closeOnboardingModal, { markSeen: true });
        call(deps.setStatus, "正在打开高级配置中心");
        call(deps.openAdvancedConfigCenter);
      });
    }
    if (ui.onboardingPrevBtn) {
      ui.onboardingPrevBtn.addEventListener("click", () => call(deps.moveOnboardingStep, -1));
    }
    if (ui.onboardingNextBtn) {
      ui.onboardingNextBtn.addEventListener("click", () => call(deps.moveOnboardingStep, 1));
    }
    if (ui.onboardingDoneBtn) {
      ui.onboardingDoneBtn.addEventListener("click", () => {
        call(deps.closeOnboardingModal, { markSeen: true });
        call(deps.setStatus, "新手引导已完成");
      });
    }
    if (ui.onboardingModal) {
      ui.onboardingModal.addEventListener("click", (event) => {
        if (event.target === ui.onboardingModal) {
          call(deps.closeOnboardingModal, { markSeen: true });
        }
      });
    }
  }

  function bindScheduleControls(ui = {}, deps = {}) {
    if (ui.scheduleBtn) {
      ui.scheduleBtn.addEventListener("click", () => {
        if (ui.scheduleModal?.hidden) {
          call(deps.openSchedulePanel);
        } else {
          call(deps.closeSchedulePanel);
        }
      });
    }
    if (ui.scheduleCloseBtn) {
      ui.scheduleCloseBtn.addEventListener("click", () => call(deps.closeSchedulePanel));
    }
    if (ui.scheduleModal) {
      ui.scheduleModal.addEventListener("click", (event) => {
        if (event.target === ui.scheduleModal) {
          call(deps.closeSchedulePanel);
        }
      });
    }
    if (ui.scheduleSaveBtn) {
      ui.scheduleSaveBtn.addEventListener("click", () => call(deps.saveScheduleFromForm));
    }
    if (ui.scheduleTask) {
      ui.scheduleTask.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          call(deps.saveScheduleFromForm);
        }
      });
    }
  }

  function bindPersonaControls(ui = {}, deps = {}) {
    if (ui.personaBtn) {
      ui.personaBtn.addEventListener("click", () => {
        if (ui.personaModal?.hidden) {
          call(deps.openPersonaPanel);
        } else {
          call(deps.closePersonaPanel);
        }
      });
    }
    if (ui.personaCloseBtn) {
      ui.personaCloseBtn.addEventListener("click", () => call(deps.closePersonaPanel));
    }
    if (ui.personaModal) {
      ui.personaModal.addEventListener("click", (event) => {
        if (event.target === ui.personaModal) {
          call(deps.closePersonaPanel);
        }
      });
    }
    if (ui.personaSaveBtn) {
      ui.personaSaveBtn.addEventListener("click", async () => {
        await call(deps.savePersonaCardFromForm);
      });
    }
    if (ui.personaPreviewBtn) {
      ui.personaPreviewBtn.addEventListener("click", () => {
        call(deps.setStatus, "预览提示：保存后会在接下来的对话中逐步生效");
      });
    }
    if (ui.personaAvatarChangeBtn && ui.personaAvatarInput) {
      ui.personaAvatarChangeBtn.addEventListener("click", () => {
        ui.personaAvatarInput.click();
      });
    }
    if (ui.personaAvatarInput) {
      ui.personaAvatarInput.addEventListener("change", async () => {
        try {
          const file = ui.personaAvatarInput.files && ui.personaAvatarInput.files[0];
          if (!file) {
            return;
          }
          await call(deps.setAssistantAvatarFromFile, file);
        } catch (err) {
          call(deps.setStatus, `头像更新失败: ${err?.message || err}`);
        } finally {
          ui.personaAvatarInput.value = "";
        }
      });
    }
    if (ui.personaAvatarResetBtn) {
      ui.personaAvatarResetBtn.addEventListener("click", () => {
        call(deps.applyAssistantAvatar, deps.assistantAvatarDefault);
        call(deps.setStatus, "已恢复默认头像");
      });
    }
    if (ui.personaApplyBtn) {
      ui.personaApplyBtn.addEventListener("click", async () => {
        const ok = await call(deps.savePersonaCardFromForm);
        if (ok) {
          call(deps.setStatus, "人设卡已应用");
        }
      });
    }
    if (ui.personaTestBtn) {
      ui.personaTestBtn.addEventListener("click", async () => {
        const ok = await call(deps.savePersonaCardFromForm);
        if (ok) {
          call(deps.preparePersonaTestPrompt);
        }
      });
    }
    if (ui.personaImportTemplateBtn) {
      ui.personaImportTemplateBtn.addEventListener("click", () => call(deps.applyPersonaTemplateDraft));
    }
    if (ui.personaRandomBtn) {
      ui.personaRandomBtn.addEventListener("click", () => call(deps.applyRandomPersonaDraft));
    }
    if (ui.personaResetBtn) {
      ui.personaResetBtn.addEventListener("click", () => call(deps.resetPersonaDraft));
    }
    for (const field of [
      ui.personaCharacterName,
      ui.personaUserAlias,
      ui.personaPersonalityTags,
      ui.personaSpeakingStyle,
      ui.personaCatchphrases,
      ui.personaInitiativeLevel,
      ui.personaRelationshipRole,
      ui.personaIdentity,
      ui.personaPreferences,
      ui.personaDislikes,
      ui.personaTopics,
      ui.personaReplyStyle,
      ui.personaCompanionshipStyle
    ]) {
      if (!field) {
        continue;
      }
      field.addEventListener("keydown", async (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          await call(deps.savePersonaCardFromForm);
        }
      });
    }
  }

  function bindPanelControls(ui = {}, deps = {}) {
    bindHelpControls(ui, deps);
    bindOnboardingControls(ui, deps);
    bindScheduleControls(ui, deps);
    bindPersonaControls(ui, deps);
  }

  const api = {
    bindHelpControls,
    bindOnboardingControls,
    bindPanelControls,
    bindPersonaControls,
    bindScheduleControls
  };

  root.TaffyPanelControlBinder = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
