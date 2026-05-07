(function (root) {
  "use strict";

  function getToolCardTitle(item) {
    const tool = String(item?.tool || "").trim();
    if (tool === "write_file") return "已写入文件";
    if (tool === "replace_in_file") return "已修改文件";
    if (tool === "read_file") return "已读取文件";
    if (tool === "list_files") return "文件列表";
    if (tool === "search_text") return "文本搜索";
    if (tool === "run_command") return "命令执行";
    if (tool === "generate_image") return "图片生成";
    return tool || "工具结果";
  }

  function getToolCardSummary(item) {
    const tool = String(item?.tool || "").trim();
    if (!item?.ok) {
      return String(item?.error || "执行失败").trim() || "执行失败";
    }
    if (tool === "write_file") {
      return `${String(item?.path || "").trim()}${item?.chars_written ? ` · ${item.chars_written} 字符` : ""}`;
    }
    if (tool === "replace_in_file") {
      return `${String(item?.path || "").trim()} · 替换 ${Number(item?.replacements || 0)} 处`;
    }
    if (tool === "read_file") {
      return String(item?.path || "").trim();
    }
    if (tool === "list_files") {
      return `共 ${Number(item?.count || 0)} 项`;
    }
    if (tool === "search_text") {
      return `命中 ${Number(item?.count || 0)} 条`;
    }
    if (tool === "run_command") {
      const cmd = String(item?.args?.command || "").trim();
      const code = Number(item?.exit_code || 0);
      return `${cmd || "命令"} · 退出码 ${code}`;
    }
    if (tool === "generate_image") {
      return String(item?.saved_path || item?.image_url || "").trim() || "已生成图片";
    }
    return "执行完成";
  }

  function renderToolMetaCards(row, meta, doc = root.document) {
    if (!row || !doc) {
      return;
    }
    const existing = row.querySelector(".tool-meta");
    const items = Array.isArray(meta?.items) ? meta.items : [];
    if (!items.length) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    const wrap = existing || doc.createElement("div");
    wrap.className = "tool-meta";
    wrap.innerHTML = "";

    for (const item of items.slice(0, 4)) {
      const card = doc.createElement("div");
      card.className = `tool-card ${item?.ok === false ? "is-error" : ""}`;

      const title = doc.createElement("div");
      title.className = "tool-card-title";
      title.textContent = getToolCardTitle(item);

      const summary = doc.createElement("div");
      summary.className = "tool-card-summary";
      summary.textContent = getToolCardSummary(item);

      card.appendChild(title);
      card.appendChild(summary);

      const tool = String(item?.tool || "");
      if (item?.ok && String(item?.path || "").trim() && ["read_file", "write_file", "replace_in_file"].includes(tool)) {
        const pathEl = doc.createElement("div");
        pathEl.className = "tool-card-detail";
        pathEl.textContent = String(item.path || "").trim();
        card.appendChild(pathEl);
      }

      if (item?.ok && tool === "read_file" && String(item?.content_preview || "").trim()) {
        const pre = doc.createElement("pre");
        pre.className = "tool-card-pre";
        pre.textContent = String(item.content_preview || "").trim();
        card.appendChild(pre);
      }

      if (item?.ok && tool === "search_text" && Array.isArray(item?.results) && item.results.length) {
        for (const hit of item.results.slice(0, 3)) {
          const detail = doc.createElement("div");
          detail.className = "tool-card-detail";
          detail.textContent = `${String(hit?.path || "").trim()}:${Number(hit?.line || 0)} ${String(hit?.text || "").trim()}`;
          card.appendChild(detail);
        }
      }

      if (item?.ok && tool === "list_files" && Array.isArray(item?.entries) && item.entries.length) {
        const detail = doc.createElement("div");
        detail.className = "tool-card-detail";
        detail.textContent = item.entries.slice(0, 4).map((entry) => String(entry?.path || "").trim()).filter(Boolean).join("  |  ");
        if (detail.textContent) {
          card.appendChild(detail);
        }
      }

      if (item?.ok && tool === "run_command") {
        const out = String(item?.stdout_preview || item?.stderr_preview || "").trim();
        if (out) {
          const pre = doc.createElement("pre");
          pre.className = "tool-card-pre";
          pre.textContent = out;
          card.appendChild(pre);
        }
      }

      if (item?.ok && tool === "generate_image" && String(item?.image_url || "").trim()) {
        const img = doc.createElement("img");
        img.className = "tool-card-image";
        img.src = String(item.image_url || "").trim();
        img.alt = "生成图片";
        card.appendChild(img);
      }

      wrap.appendChild(card);
    }

    if (!existing) {
      row.appendChild(wrap);
    }
  }

  const api = {
    getToolCardTitle,
    getToolCardSummary,
    renderToolMetaCards
  };

  root.TaffyToolMetaView = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
