(function (root) {
  "use strict";

  function createController(deps = {}) {
    const state = deps.state || {};
    const ui = deps.ui || {};
    const document = deps.documentObject || root.document;
    const window = deps.windowObject || root;
    const STORAGE_CONTROLLER = deps.storageController || {};
    const authFetch = deps.authFetch;
    const setStatus = typeof deps.setStatus === "function" ? deps.setStatus : () => {};
    const ASSISTANT_AVATAR_DEFAULT = deps.assistantAvatarDefault || "./assets/assistant_avatar_ref.png?v=2";
    const ASSISTANT_AVATAR_MAX_BYTES = Number(deps.assistantAvatarMaxBytes) || 4 * 1024 * 1024;
    const PERSONA_CARD_DEFAULT = deps.personaCardDefault || {};
    const isHelpOpen = typeof deps.isHelpOpen === "function" ? deps.isHelpOpen : () => false;
    const closeHelpModal = typeof deps.closeHelpModal === "function" ? deps.closeHelpModal : () => {};
    const isOnboardingOpen = typeof deps.isOnboardingOpen === "function" ? deps.isOnboardingOpen : () => false;
    const closeOnboardingModal = typeof deps.closeOnboardingModal === "function" ? deps.closeOnboardingModal : () => {};
    const closeSchedulePanel = typeof deps.closeSchedulePanel === "function" ? deps.closeSchedulePanel : () => {};
    const isLearningReviewOpen = typeof deps.isLearningReviewOpen === "function" ? deps.isLearningReviewOpen : () => false;
    const closeLearningReviewDrawer = typeof deps.closeLearningReviewDrawer === "function" ? deps.closeLearningReviewDrawer : () => {};
    const File = window.File || root.File;
    const FileReader = window.FileReader || root.FileReader;
    const HTMLImageElement = window.HTMLImageElement || root.HTMLImageElement;
    function normalizeAssistantAvatarUrl(raw) {
      const value = String(raw || "").trim();
      if (!value) {
        return ASSISTANT_AVATAR_DEFAULT;
      }
      if (
        value.startsWith("data:image/")
        || value.startsWith("./")
        || value.startsWith("/")
        || value.startsWith("http://")
        || value.startsWith("https://")
        || value.startsWith("blob:")
      ) {
        return value;
      }
      return ASSISTANT_AVATAR_DEFAULT;
    }

    function readAssistantAvatarFromStorage() {
      return typeof STORAGE_CONTROLLER.readAssistantAvatar === "function"
        ? STORAGE_CONTROLLER.readAssistantAvatar({
          windowObject: window,
          normalizeAssistantAvatarUrl
        })
        : ASSISTANT_AVATAR_DEFAULT;
    }

    function saveAssistantAvatarToStorage(url) {
      if (typeof STORAGE_CONTROLLER.saveAssistantAvatar === "function") {
        STORAGE_CONTROLLER.saveAssistantAvatar(url, { windowObject: window });
      }
    }

    function avatarUrlToCssValue(url) {
      const safe = String(url || ASSISTANT_AVATAR_DEFAULT)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"");
      return `url("${safe}")`;
    }

    function applyAssistantAvatar(url, options = {}) {
      const safe = normalizeAssistantAvatarUrl(url);
      state.assistantAvatarUrl = safe;
      if (ui.heroAvatarImg) {
        ui.heroAvatarImg.src = safe;
      }
      if (ui.personaAvatarPreview) {
        ui.personaAvatarPreview.src = safe;
      }
      document.querySelectorAll(".persona-avatar-sync").forEach((img) => {
        if (img instanceof HTMLImageElement) {
          img.src = safe;
        }
      });
      document.documentElement.style.setProperty("--assistant-avatar-url", avatarUrlToCssValue(safe));
      if (options.persist !== false) {
        saveAssistantAvatarToStorage(safe);
      }
    }

    function initAssistantAvatar() {
      const domDefault = String(ui.heroAvatarImg?.getAttribute("src") || "").trim();
      const stored = readAssistantAvatarFromStorage();
      const initial = stored || domDefault || ASSISTANT_AVATAR_DEFAULT;
      applyAssistantAvatar(initial, { persist: false });
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
        reader.readAsDataURL(file);
      });
    }

    async function setAssistantAvatarFromFile(file) {
      if (!(file instanceof File)) {
        return;
      }
      const mime = String(file.type || "").toLowerCase();
      if (!mime.startsWith("image/")) {
        setStatus("请选择图片文件");
        return;
      }
      if (Number(file.size || 0) > ASSISTANT_AVATAR_MAX_BYTES) {
        setStatus("头像图片不能超过 4MB");
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl.startsWith("data:image/")) {
        throw new Error("图片格式无效");
      }
      applyAssistantAvatar(dataUrl);
      setStatus("头像已更新");
    }

    function normalizePersonaCardData(raw) {
      const src = raw && typeof raw === "object" ? raw : {};
      return {
        identity: String(src.identity || "").trim(),
        user_preferences: String(src.user_preferences || "").trim(),
        user_dislikes: String(src.user_dislikes || "").trim(),
        common_topics: String(src.common_topics || "").trim(),
        reply_style: String(src.reply_style || "").trim(),
        companionship_style: String(src.companionship_style || "").trim(),
        updated_at: String(src.updated_at || "").trim()
      };
    }

    function applyPersonaCardToForm(card) {
      const safe = normalizePersonaCardData(card);
      if (ui.personaIdentity) ui.personaIdentity.value = safe.identity;
      if (ui.personaPreferences) ui.personaPreferences.value = safe.user_preferences;
      if (ui.personaDislikes) ui.personaDislikes.value = safe.user_dislikes;
      if (ui.personaTopics) ui.personaTopics.value = safe.common_topics;
      if (ui.personaReplyStyle) ui.personaReplyStyle.value = safe.reply_style;
      if (ui.personaCompanionshipStyle) ui.personaCompanionshipStyle.value = safe.companionship_style;
    }

    function readPersonaCardFromForm() {
      return normalizePersonaCardData({
        identity: ui.personaIdentity?.value,
        user_preferences: ui.personaPreferences?.value,
        user_dislikes: ui.personaDislikes?.value,
        common_topics: ui.personaTopics?.value,
        reply_style: ui.personaReplyStyle?.value,
        companionship_style: ui.personaCompanionshipStyle?.value
      });
    }

    function applyPersonaTemplateDraft() {
      applyPersonaCardToForm({
        identity: "你是我的桌面搭子，叫馨语AI桌宠。",
        user_preferences: "我喜欢简洁直接的建议，也喜欢被温柔鼓励。",
        user_dislikes: "不喜欢太官腔、太冗长、反复重复同一句话。",
        common_topics: "开发、学习计划、日常安排、效率提升。",
        reply_style: "像熟悉的朋友，语气自然，短句优先，必要时再展开。",
        companionship_style: "会主动关心我，但不过度打扰，关键时刻能提醒我。"
      });
      setStatus("已导入人设模板草稿");
    }

    function applyRandomPersonaDraft() {
      const identities = [
        "你是馨语AI桌宠，我的桌面陪伴伙伴。",
        "你是我的桌宠搭子，偏活泼，也很细心。",
        "你是我长期协作的 AI 桌面助理，兼顾陪伴和执行。"
      ];
      const preferences = [
        "我喜欢清晰分点和可执行建议。",
        "我喜欢轻松口吻，但不想被敷衍。",
        "我喜欢先给结论，再补充原因。"
      ];
      const dislikes = [
        "不喜欢空话和模板化结尾。",
        "不喜欢过度追问和说教。",
        "不喜欢重复前文和无效安慰。"
      ];
      const topics = [
        "代码、项目推进、复盘、日程管理",
        "学习、计划、效率工具、习惯养成",
        "产品灵感、开发排障、日常状态"
      ];
      const replyStyles = [
        "语气自然，回复长度中等，必要时简短反问。",
        "先给重点，再给一到两条具体建议。",
        "多用短句，少套话，尽量贴近上下文。"
      ];
      const companionshipStyles = [
        "低打扰陪伴，适时主动提醒。",
        "对我情绪有感知，先共情再给建议。",
        "能和我连续聊下去，不像单轮问答机器人。"
      ];
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)] || "";
      applyPersonaCardToForm({
        identity: pick(identities),
        user_preferences: pick(preferences),
        user_dislikes: pick(dislikes),
        common_topics: pick(topics),
        reply_style: pick(replyStyles),
        companionship_style: pick(companionshipStyles)
      });
      setStatus("已随机生成人设草稿");
    }

    function resetPersonaDraft() {
      applyPersonaCardToForm(PERSONA_CARD_DEFAULT);
      setStatus("已重置人设草稿");
    }

    async function loadPersonaCard() {
      if (!ui.personaModal) {
        state.personaCard = normalizePersonaCardData(PERSONA_CARD_DEFAULT);
        return state.personaCard;
      }
      try {
      const resp = await authFetch("/api/persona_card", { cache: "no-store" });
        if (!resp.ok) {
          throw new Error("获取人设卡失败");
        }
        const data = normalizePersonaCardData(await resp.json());
        state.personaCard = data;
        applyPersonaCardToForm(data);
        return data;
      } catch (err) {
        state.personaCard = normalizePersonaCardData(PERSONA_CARD_DEFAULT);
        applyPersonaCardToForm(state.personaCard);
        console.warn("loadPersonaCard failed:", err);
        return state.personaCard;
      }
    }

    function openPersonaPanel() {
      if (!ui.personaModal) {
        return;
      }
      if (isHelpOpen()) {
        closeHelpModal();
      }
      if (isOnboardingOpen()) {
        closeOnboardingModal();
      }
      if (ui.scheduleModal && !ui.scheduleModal.hidden) {
        closeSchedulePanel();
      }
      if (isLearningReviewOpen()) {
        closeLearningReviewDrawer();
      }
      ui.personaModal.hidden = false;
      applyPersonaCardToForm(state.personaCard || PERSONA_CARD_DEFAULT);
      if (ui.personaIdentity) {
        ui.personaIdentity.focus();
      }
    }

    function closePersonaPanel() {
      if (!ui.personaModal) {
        return;
      }
      ui.personaModal.hidden = true;
    }

    async function savePersonaCardFromForm() {
      if (!ui.personaModal) {
        return false;
      }
      const payload = readPersonaCardFromForm();
      try {
      const resp = await authFetch("/api/persona_card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(String(data?.error || "保存失败"));
        }
        state.personaCard = normalizePersonaCardData(data);
        applyPersonaCardToForm(state.personaCard);
        setStatus("人设卡已保存");
        return true;
      } catch (err) {
        setStatus(`保存失败: ${err.message || err}`);
        return false;
      }
    }


    return {
      normalizeAssistantAvatarUrl,
      readAssistantAvatarFromStorage,
      saveAssistantAvatarToStorage,
      avatarUrlToCssValue,
      applyAssistantAvatar,
      initAssistantAvatar,
      readFileAsDataUrl,
      setAssistantAvatarFromFile,
      normalizePersonaCardData,
      applyPersonaCardToForm,
      readPersonaCardFromForm,
      applyPersonaTemplateDraft,
      applyRandomPersonaDraft,
      resetPersonaDraft,
      loadPersonaCard,
      openPersonaPanel,
      closePersonaPanel,
      savePersonaCardFromForm
    };
  }

  const api = { createController };
  root.TaffyPersonaAvatarController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
