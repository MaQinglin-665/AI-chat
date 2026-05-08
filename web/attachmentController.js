(function (root) {
  "use strict";

  const DEFAULT_MAX_PENDING_ATTACHMENTS = 6;
  const DEFAULT_MAX_TEXT_ATTACHMENT_CHARS = 12000;
  const DEFAULT_MAX_TOTAL_ATTACHMENT_TEXT_CHARS = 24000;
  const DEFAULT_MAX_IMAGE_ATTACHMENT_BYTES = 6 * 1024 * 1024;

  function getModel(deps = {}) {
    return deps.model || root.TaffyAttachmentModel || {};
  }

  function call(fn, ...args) {
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function formatFileSize(size, deps = {}) {
    const model = getModel(deps);
    return typeof model.formatFileSize === "function"
      ? model.formatFileSize(size)
      : `${Math.max(0, Number(size) || 0)}B`;
  }

  function isImageFile(file, deps = {}) {
    const model = getModel(deps);
    return typeof model.isImageFile === "function" ? model.isImageFile(file) : false;
  }

  function isLikelyTextFile(file, deps = {}) {
    const model = getModel(deps);
    return typeof model.isLikelyTextFile === "function"
      ? model.isLikelyTextFile(file, deps.textAttachmentExts || model.TEXT_ATTACHMENT_EXTS || [])
      : false;
  }

  function sanitizeAttachmentExcerpt(text, deps = {}) {
    const model = getModel(deps);
    const maxChars = Number(deps.maxTextAttachmentChars) || DEFAULT_MAX_TEXT_ATTACHMENT_CHARS;
    return typeof model.sanitizeAttachmentExcerpt === "function"
      ? model.sanitizeAttachmentExcerpt(text, maxChars)
      : String(text || "").trim().slice(0, maxChars);
  }

  function buildAttachmentContextText(attachments, deps = {}) {
    const model = getModel(deps);
    return typeof model.buildAttachmentContextText === "function"
      ? model.buildAttachmentContextText(attachments, {
        maxTotalTextChars: Number(deps.maxTotalAttachmentTextChars) || DEFAULT_MAX_TOTAL_ATTACHMENT_TEXT_CHARS
      })
      : "";
  }

  function buildAttachmentDisplaySuffix(attachments, deps = {}) {
    const model = getModel(deps);
    return typeof model.buildAttachmentDisplaySuffix === "function"
      ? model.buildAttachmentDisplaySuffix(attachments)
      : "";
  }

  function renderPendingAttachments(wrap, itemsInput, deps = {}) {
    if (!wrap) {
      return;
    }
    const documentObject = deps.documentObject || root.document;
    const model = getModel(deps);
    const items = Array.isArray(itemsInput) ? itemsInput : [];
    wrap.innerHTML = "";
    if (!items.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    for (const item of items) {
      const chip = documentObject.createElement("div");
      chip.className = "attachment-chip";

      const icon = documentObject.createElement("span");
      icon.className = "attachment-chip-icon";
      icon.textContent = typeof model.getAttachmentIcon === "function" ? model.getAttachmentIcon(item.kind) : "";
      chip.appendChild(icon);

      const main = documentObject.createElement("span");
      main.className = "attachment-chip-main";

      const name = documentObject.createElement("span");
      name.className = "attachment-chip-name";
      name.textContent = String(item.name || "\u672a\u547d\u540d\u6587\u4ef6");
      main.appendChild(name);

      const meta = documentObject.createElement("span");
      meta.className = "attachment-chip-meta";
      const kindLabel = typeof model.getAttachmentKindLabel === "function"
        ? model.getAttachmentKindLabel(item.kind)
        : "";
      meta.textContent = `${kindLabel} · ${formatFileSize(item.size, deps)}`;
      main.appendChild(meta);
      chip.appendChild(main);

      const removeBtn = documentObject.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "attachment-chip-remove";
      removeBtn.textContent = "\u5220";
      removeBtn.title = "\u79fb\u9664";
      removeBtn.addEventListener("click", () => {
        call(deps.onRemove, item.id);
      });
      chip.appendChild(removeBtn);

      wrap.appendChild(chip);
    }
  }

  async function handleAttachmentFiles(fileList, deps = {}) {
    const files = Array.from(fileList || []);
    const state = deps.state || {};
    const maxPending = Number(deps.maxPendingAttachments) || DEFAULT_MAX_PENDING_ATTACHMENTS;
    const maxImageBytes = Number(deps.maxImageAttachmentBytes) || DEFAULT_MAX_IMAGE_ATTACHMENT_BYTES;
    if (!files.length) {
      return [];
    }
    if (state.attachmentReadBusy) {
      call(deps.setStatus, "\u9644\u4ef6\u5904\u7406\u4e2d\uff0c\u8bf7\u7a0d\u7b49...");
      return [];
    }
    state.attachmentReadBusy = true;
    try {
      const existing = Array.isArray(state.pendingAttachments) ? state.pendingAttachments.slice() : [];
      const remain = Math.max(0, maxPending - existing.length);
      if (remain <= 0) {
        call(deps.setStatus, `\u6700\u591a\u53ef\u9644\u52a0 ${maxPending} \u4e2a\u6587\u4ef6`);
        return [];
      }
      const picked = files.slice(0, remain);
      const nextItems = [];
      for (const file of picked) {
        const name = String(file?.name || "\u672a\u547d\u540d\u6587\u4ef6").slice(0, 180);
        const size = Math.max(0, Number(file?.size) || 0);
        const type = String(file?.type || "").toLowerCase();
        const base = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name,
          size,
          type
        };
        if (isImageFile(file, deps)) {
          if (size > maxImageBytes) {
            call(deps.setStatus, `\u56fe\u7247\u8fc7\u5927\u5df2\u8df3\u8fc7: ${name}`);
            continue;
          }
          try {
            const dataUrl = await call(deps.readFileAsDataUrl, file);
            if (!dataUrl || !String(dataUrl).startsWith("data:image/")) {
              call(deps.setStatus, `\u56fe\u7247\u8bfb\u53d6\u5931\u8d25: ${name}`);
              continue;
            }
            nextItems.push({ ...base, kind: "image", dataUrl });
          } catch (_) {
            call(deps.setStatus, `\u56fe\u7247\u8bfb\u53d6\u5931\u8d25: ${name}`);
          }
          continue;
        }
        if (isLikelyTextFile(file, deps)) {
          try {
            const raw = await file.text();
            const excerpt = sanitizeAttachmentExcerpt(raw, deps);
            nextItems.push(excerpt ? { ...base, kind: "text", text: excerpt } : { ...base, kind: "binary" });
          } catch (_) {
            nextItems.push({ ...base, kind: "binary" });
          }
          continue;
        }
        nextItems.push({ ...base, kind: "binary" });
      }
      state.pendingAttachments = existing.concat(nextItems).slice(0, maxPending);
      call(deps.renderPendingAttachments);
      if (nextItems.length) {
        call(deps.setStatus, `\u5df2\u6dfb\u52a0 ${nextItems.length} \u4e2a\u9644\u4ef6`);
      }
      return nextItems;
    } finally {
      state.attachmentReadBusy = false;
    }
  }

  const api = {
    formatFileSize,
    isImageFile,
    isLikelyTextFile,
    sanitizeAttachmentExcerpt,
    buildAttachmentContextText,
    buildAttachmentDisplaySuffix,
    renderPendingAttachments,
    handleAttachmentFiles
  };

  root.TaffyAttachmentController = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
