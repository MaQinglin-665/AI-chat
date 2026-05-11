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

    function isRegressionPersonaText(value) {
      return /^回归检查-\d+$/u.test(String(value || "").trim());
    }

    function isLegacyOnlyPersonaText(value) {
      const parts = String(value || "")
        .split(/[;；]/u)
        .map((part) => part.trim())
        .filter(Boolean);
      if (!parts.length) {
        return false;
      }
      return parts.every((part) => (
        /^主动程度[:：]\s*(低|适中|高|很高)\s*$/u.test(part)
        || /^关系定位[:：]\s*(桌面伙伴|学习搭子|情绪陪伴|工作助手)\s*$/u.test(part)
      ));
    }

    function normalizePersonaText(value, options = {}) {
      const text = String(value || "").trim();
      if (!text || isRegressionPersonaText(text)) {
        return "";
      }
      if (options.dropLegacyOnly && isLegacyOnlyPersonaText(text)) {
        return "";
      }
      return text;
    }

    function getPersonaDefault(key, fallback = "") {
      const value = PERSONA_CARD_DEFAULT && Object.prototype.hasOwnProperty.call(PERSONA_CARD_DEFAULT, key)
        ? PERSONA_CARD_DEFAULT[key]
        : fallback;
      return normalizePersonaText(value, { dropLegacyOnly: true }) || fallback;
    }

    function normalizePersonaCardData(raw) {
      const src = raw && typeof raw === "object" ? raw : {};
      const characterName = normalizePersonaText(src.character_name)
        || getPersonaDefault("character_name", "馨语");
      const userAlias = normalizePersonaText(src.user_alias)
        || getPersonaDefault("user_alias", "");
      const personalityTags = normalizePersonaText(src.personality_tags, { dropLegacyOnly: true })
        || getPersonaDefault("personality_tags", "");
      const speakingStyle = normalizePersonaText(src.speaking_style)
        || getPersonaDefault("speaking_style", "");
      const catchphrases = normalizePersonaText(src.catchphrases)
        || getPersonaDefault("catchphrases", "");
      const likes = normalizePersonaText(src.likes || src.user_preferences, { dropLegacyOnly: true })
        || getPersonaDefault("likes", "");
      const dislikes = normalizePersonaText(src.dislikes || src.user_dislikes)
        || getPersonaDefault("dislikes", "");
      const initiativeLevel = normalizePersonaText(src.initiative_level)
        || getPersonaDefault("initiative_level", "适中")
        || "适中";
      const relationshipRole = normalizePersonaText(src.relationship_role)
        || getPersonaDefault("relationship_role", "桌面伙伴")
        || "桌面伙伴";
      const identity = normalizePersonaText(src.identity)
        || [
          relationshipRole ? `关系定位：${relationshipRole}` : "",
          characterName ? `角色名：${characterName}` : "",
          userAlias ? `用户称呼：${userAlias}` : ""
        ].filter(Boolean).join("；");
      const replyStyle = normalizePersonaText(src.reply_style) || speakingStyle;
      const companionshipStyle = normalizePersonaText(src.companionship_style, { dropLegacyOnly: true })
        || [personalityTags ? `性格标签：${personalityTags}` : "", `主动程度：${initiativeLevel}`, `关系定位：${relationshipRole}`].filter(Boolean).join("；");
      return {
        character_name: characterName,
        user_alias: userAlias,
        personality_tags: personalityTags,
        speaking_style: speakingStyle,
        catchphrases,
        likes,
        dislikes,
        initiative_level: initiativeLevel,
        relationship_role: relationshipRole,
        identity,
        user_preferences: normalizePersonaText(src.user_preferences || likes, { dropLegacyOnly: true }),
        user_dislikes: normalizePersonaText(src.user_dislikes || dislikes),
        common_topics: normalizePersonaText(src.common_topics || likes, { dropLegacyOnly: true }),
        reply_style: replyStyle,
        companionship_style: companionshipStyle,
        updated_at: normalizePersonaText(src.updated_at)
      };
    }

    function applyPersonaCardToForm(card) {
      const safe = normalizePersonaCardData(card);
      if (ui.personaCharacterName) ui.personaCharacterName.value = safe.character_name;
      if (ui.personaUserAlias) ui.personaUserAlias.value = safe.user_alias;
      if (ui.personaPersonalityTags) ui.personaPersonalityTags.value = safe.personality_tags;
      if (ui.personaSpeakingStyle) ui.personaSpeakingStyle.value = safe.speaking_style || safe.reply_style;
      if (ui.personaCatchphrases) ui.personaCatchphrases.value = safe.catchphrases;
      if (ui.personaInitiativeLevel) ui.personaInitiativeLevel.value = safe.initiative_level || "适中";
      if (ui.personaRelationshipRole) ui.personaRelationshipRole.value = safe.relationship_role || "桌面伙伴";
      if (ui.personaIdentity) ui.personaIdentity.value = safe.identity;
      if (ui.personaPreferences) ui.personaPreferences.value = safe.likes || safe.user_preferences;
      if (ui.personaDislikes) ui.personaDislikes.value = safe.dislikes || safe.user_dislikes;
      if (ui.personaTopics) ui.personaTopics.value = safe.common_topics;
      if (ui.personaReplyStyle) ui.personaReplyStyle.value = safe.reply_style;
      if (ui.personaCompanionshipStyle) ui.personaCompanionshipStyle.value = safe.companionship_style;
    }

    function readPersonaCardFromForm() {
      const characterName = String(ui.personaCharacterName?.value || "").trim();
      const userAlias = String(ui.personaUserAlias?.value || "").trim();
      const personalityTags = String(ui.personaPersonalityTags?.value || "").trim();
      const speakingStyle = String(ui.personaSpeakingStyle?.value || "").trim();
      const catchphrases = String(ui.personaCatchphrases?.value || "").trim();
      const likes = String(ui.personaPreferences?.value || "").trim();
      const dislikes = String(ui.personaDislikes?.value || "").trim();
      const initiativeLevel = String(ui.personaInitiativeLevel?.value || "适中").trim() || "适中";
      const relationshipRole = String(ui.personaRelationshipRole?.value || "桌面伙伴").trim() || "桌面伙伴";
      const identity = String(ui.personaIdentity?.value || "").trim()
        || [
          relationshipRole ? `关系定位：${relationshipRole}` : "",
          characterName ? `角色名：${characterName}` : "",
          userAlias ? `用户称呼：${userAlias}` : ""
        ].filter(Boolean).join("；");
      const replyStyle = [speakingStyle, catchphrases ? `口头禅/禁忌：${catchphrases}` : ""].filter(Boolean).join("；");
      const companionshipStyle = [personalityTags ? `性格标签：${personalityTags}` : "", `主动程度：${initiativeLevel}`, `关系定位：${relationshipRole}`].filter(Boolean).join("；");
      return normalizePersonaCardData({
        character_name: characterName,
        user_alias: userAlias,
        personality_tags: personalityTags,
        speaking_style: speakingStyle,
        catchphrases,
        likes,
        dislikes,
        initiative_level: initiativeLevel,
        relationship_role: relationshipRole,
        identity,
        user_preferences: likes,
        user_dislikes: dislikes,
        common_topics: String(ui.personaTopics?.value || likes).trim(),
        reply_style: replyStyle,
        companionship_style: companionshipStyle
      });
    }

    function applyPersonaTemplateDraft() {
      applyPersonaCardToForm({
        character_name: "馨语",
        user_alias: "小Q",
        personality_tags: "温柔、机灵、轻微吐槽、可靠、低打扰",
        speaking_style: "像熟悉的朋友，先给重点，再给一两句具体建议；不要官话，不要长篇说教。",
        catchphrases: "可以偶尔说“我在”；避免模板化结尾。",
        likes: "喜欢简洁直接的建议，也喜欢被温柔鼓励；常聊开发、学习计划、日常安排和效率提升。",
        dislikes: "不喜欢太官腔、太冗长、重复同一句安慰。",
        initiative_level: "适中",
        relationship_role: "桌面伙伴"
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
      const names = ["馨语", "小语", "Taffy"];
      const aliases = ["小Q", "主人", "搭档"];
      const tags = ["温柔、机灵、可靠", "活泼、轻微吐槽、低打扰", "认真、细心、会鼓励"];
      const roles = ["桌面伙伴", "学习搭子", "情绪陪伴", "工作助手"];
      const initiatives = ["低", "适中", "高"];
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)] || "";
      applyPersonaCardToForm({
        character_name: pick(names),
        user_alias: pick(aliases),
        personality_tags: pick(tags),
        speaking_style: pick(replyStyles),
        catchphrases: "少说套话，必要时用一句轻松吐槽。",
        likes: `${pick(preferences)} ${pick(topics)}`,
        dislikes: pick(dislikes),
        initiative_level: pick(initiatives),
        relationship_role: pick(roles),
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
      if (ui.personaCharacterName) {
        ui.personaCharacterName.focus();
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
      isRegressionPersonaText,
      isLegacyOnlyPersonaText,
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
