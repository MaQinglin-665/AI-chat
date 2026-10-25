/* Presentation only: existing controllers continue to own toggle state/actions. */
(function () {
  "use strict";
  function install() {
    document.body.classList.add("visual-polish");
    const name = document.getElementById("assistant-name");
    if (name) {
      const syncName = () => { if (["馨语AI桌宠","馨语桌宠","Taffy Desktop Pet"].includes(name.textContent)) name.textContent="馨语"; };
      syncName(); new MutationObserver(syncName).observe(name,{childList:true});
    }
    const labels = {"speak-btn":"语音", "subtitle-toggle-btn":"字幕", "pet-mode-btn":"桌宠", "scene-btn":"场景", "more-btn":"更多", "galgame-open":"剧情对话", "lock-btn":"桌面锁定", "observe-btn":"观察桌面", "auto-chat-btn":"主动陪伴"};
    for (const [id,label] of Object.entries(labels)) {
      const button = document.getElementById(id);
      if (!button) continue;
      let reason;
      const sync = () => {
        const unavailable = button.disabled && ["lock-btn","observe-btn"].includes(id);
        if (unavailable && !reason) { reason=document.createElement("p"); reason.className="visual-unavailable"; button.after(reason); }
        if (reason) { reason.hidden=!unavailable; reason.textContent=id==="lock-btn" ? "桌面锁定需要在桌面应用中使用" : "观察桌面需要先在设置里开启桌面权限"; }
        button.hidden=unavailable;
        button.title=label; button.setAttribute("aria-label",label);
        if (button.textContent!==label) button.textContent=label;
      };
      sync(); new MutationObserver(sync).observe(button,{childList:true,attributes:true,attributeFilter:["disabled"]});
    }
    document.querySelectorAll('.config-switch-summary-item strong').forEach(el=>{
      const sync=()=>{el.title=el.textContent;}; sync();new MutationObserver(sync).observe(el,{childList:true,subtree:true,characterData:true});
    });
    document.querySelectorAll('.config-switch-field select').forEach(el=>{
      const sync=()=>{el.title=el.selectedOptions?.[0]?.textContent || "";};
      sync(); el.addEventListener('change',sync);
      new MutationObserver(sync).observe(el,{childList:true,subtree:true,characterData:true});
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();
