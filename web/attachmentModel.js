(function (root) {
  "use strict";

  const TEXT_ATTACHMENT_EXTS = [
    "txt", "md", "markdown", "json", "csv", "tsv", "yaml", "yml",
    "xml", "html", "htm", "css", "js", "mjs", "cjs", "ts", "tsx",
    "jsx", "py", "java", "c", "cpp", "h", "hpp", "go", "rs",
    "sh", "ps1", "bat", "sql", "log", "ini", "toml"
  ];

  function formatFileSize(size) {
    const n = Math.max(0, Number(size) || 0);
    if (n < 1024) return `${n}B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
    return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  }

  function getFileExt(name) {
    const safe = String(name || "").trim().toLowerCase();
    const idx = safe.lastIndexOf(".");
    if (idx <= 0 || idx === safe.length - 1) {
      return "";
    }
    return safe.slice(idx + 1);
  }

  function isImageFile(file) {
    const type = String(file?.type || "").toLowerCase();
    if (type.startsWith("image/")) {
      return true;
    }
    return ["png", "jpg", "jpeg", "webp", "bmp", "gif"].includes(getFileExt(file?.name));
  }

  function isLikelyTextFile(file, exts = TEXT_ATTACHMENT_EXTS) {
    const type = String(file?.type || "").toLowerCase();
    if (type.startsWith("text/")) {
      return true;
    }
    if (type.includes("json") || type.includes("xml")) {
      return true;
    }
    const set = exts instanceof Set ? exts : new Set(Array.isArray(exts) ? exts : TEXT_ATTACHMENT_EXTS);
    return set.has(getFileExt(file?.name));
  }

  function sanitizeAttachmentExcerpt(text, maxChars = 12000) {
    const safeMax = Math.max(0, Number(maxChars) || 0);
    const src = String(text || "")
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n");
    const compact = src.trim();
    if (!compact) {
      return "";
    }
    if (!safeMax || compact.length <= safeMax) {
      return compact;
    }
    return `${compact.slice(0, safeMax)}\n...(\u6587\u4ef6\u5185\u5bb9\u5df2\u622a\u65ad)`;
  }

  function getAttachmentKindLabel(kind) {
    if (kind === "image") return "\u56fe\u7247";
    if (kind === "text") return "\u6587\u672c";
    return "\u6587\u4ef6";
  }

  function getAttachmentIcon(kind) {
    if (kind === "image") return "\u56fe";
    if (kind === "text") return "\u6587";
    return "\u6863";
  }

  function buildAttachmentContextText(attachments, options = {}) {
    const items = Array.isArray(attachments) ? attachments : [];
    if (!items.length) {
      return "";
    }
    const maxTotalTextChars = Math.max(0, Number(options.maxTotalTextChars) || 24000);
    const lines = ["\u3010\u672c\u8f6e\u9644\u4ef6\u3011"];
    let totalChars = 0;
    for (const item of items) {
      const name = String(item?.name || "\u672a\u547d\u540d\u6587\u4ef6").slice(0, 120);
      const size = formatFileSize(item?.size);
      if (item?.kind === "image") {
        lines.push(`- \u56fe\u7247: ${name} (${size})`);
        continue;
      }
      if (item?.kind === "text") {
        lines.push(`- \u6587\u672c\u6587\u4ef6: ${name} (${size})`);
        const excerpt = String(item?.text || "").trim();
        if (excerpt) {
          const room = Math.max(0, maxTotalTextChars - totalChars);
          if (room > 0) {
            const clip = excerpt.slice(0, room);
            lines.push(`  \u5185\u5bb9\u6458\u5f55:\n${clip}`);
            totalChars += clip.length;
          }
        }
        continue;
      }
      lines.push(`- \u6587\u4ef6: ${name} (${size})`);
    }
    return lines.join("\n");
  }

  function buildAttachmentDisplaySuffix(attachments) {
    const items = Array.isArray(attachments) ? attachments : [];
    if (!items.length) {
      return "";
    }
    const names = items
      .map((x) => String(x?.name || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const rest = items.length - names.length;
    const tail = rest > 0 ? ` \u7b49${items.length}\u4e2a` : "";
    return `\uff08\u9644\u4ef6: ${names.join("\u3001")}${tail}\uff09`;
  }

  function readFileAsDataUrl(file, FileReaderCtor = root.FileReader) {
    return new Promise((resolve, reject) => {
      if (typeof FileReaderCtor !== "function") {
        reject(new Error("FileReader is unavailable"));
        return;
      }
      const reader = new FileReaderCtor();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("\u8bfb\u53d6\u56fe\u7247\u5931\u8d25"));
      reader.readAsDataURL(file);
    });
  }

  const api = {
    TEXT_ATTACHMENT_EXTS,
    buildAttachmentContextText,
    buildAttachmentDisplaySuffix,
    formatFileSize,
    getAttachmentIcon,
    getAttachmentKindLabel,
    getFileExt,
    isImageFile,
    isLikelyTextFile,
    readFileAsDataUrl,
    sanitizeAttachmentExcerpt
  };

  root.TaffyAttachmentModel = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
