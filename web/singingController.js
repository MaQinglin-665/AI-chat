(function (root) {
  "use strict";
  async function convert() {
    const button = document.getElementById("singing-convert-btn");
    const status = document.getElementById("singing-convert-status");
    if (!root.electronAPI?.pickSingingSource) {
      status.textContent = "唱声转换仅在桌面版可用。";
      return;
    }
    const source = await root.electronAPI.pickSingingSource();
    if (!source) return;
    button.disabled = true;
    status.textContent = "正在把清唱转换成馨语的歌声…";
    try {
      const response = await root.TaffyModules.apiClient.authFetch("/api/singing/convert", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_path: source })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "转换失败");
      const audioResponse = await root.TaffyModules.apiClient.authFetch(data.output_url);
      if (!audioResponse.ok) throw new Error("结果音频读取失败");
      const url = URL.createObjectURL(await audioResponse.blob());
      const audio = new Audio(url);
      audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
      await audio.play();
      status.textContent = "转换完成，正在播放。";
    } catch (error) {
      status.textContent = `转换失败：${error?.message || error}`;
    } finally { button.disabled = false; }
  }
  async function perform(songId, title) {
    const status = document.getElementById("singing-convert-status");
    const buttons = [document.getElementById("singing-song-bushuo-btn"), document.getElementById("singing-song-yuai-btn")];
    buttons.forEach((button) => { if (button) button.disabled = true; });
    status.textContent = `正在准备《${title}》；首次完整转换约需数分钟…`;
    try {
      const response = await root.TaffyModules.apiClient.authFetch("/api/singing/catalog/perform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ song_id: songId }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "演唱失败");
      const audioResponse = await root.TaffyModules.apiClient.authFetch(data.output_url);
      if (!audioResponse.ok) throw new Error("结果音频读取失败");
      const url = URL.createObjectURL(await audioResponse.blob());
      const audio = new Audio(url); audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true }); await audio.play();
      status.textContent = `正在演唱《${data.title || title}》。`;
    } catch (error) { status.textContent = `演唱失败：${error?.message || error}`; }
    finally { buttons.forEach((button) => { if (button) button.disabled = false; }); }
  }
  function init() {
    const button = document.getElementById("singing-convert-btn");
    if (button) button.addEventListener("click", convert);
    document.getElementById("singing-song-bushuo-btn")?.addEventListener("click", () => perform("bushuo", "不说"));
    document.getElementById("singing-song-yuai-btn")?.addEventListener("click", () => perform("yuai", "雨爱"));
  }
  function matchSong(text) {
    const value = String(text || "").replace(/\s/g, "");
    if (/(唱|听).*(不说)|不说.*(唱|听)/.test(value)) return { id: "bushuo", title: "不说" };
    if (/(唱|听).*(雨爱)|雨爱.*(唱|听)/.test(value)) return { id: "yuai", title: "雨爱" };
    return null;
  }
  root.TaffySinging = { matchSong, performSong: perform };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}(window));
