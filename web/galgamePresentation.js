(function (root) {
  "use strict";
  const defaultWait = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  function createCharacterTransition(deps = {}) {
    let revision = 0;
    const wait = deps.wait || defaultWait;
    const reducedMotion = deps.reducedMotion || (() => false);
    const showBlack = deps.showBlack || (() => {});
    const reveal = deps.reveal || (() => {});
    async function transitionCharacter({ load, commit, fadeOutMs = 210, fadeInMs = 210 } = {}) {
      if (typeof load !== "function" || typeof commit !== "function") throw new TypeError("transitionCharacter requires load and commit functions");
      const token = ++revision;
      const durationOut = reducedMotion() ? 0 : fadeOutMs;
      const durationIn = reducedMotion() ? 0 : fadeInMs;
      showBlack(); await wait(durationOut);
      if (token !== revision) return false;
      let prepared;
      try { prepared = await load(); } catch (_) { if (token === revision) { reveal(); await wait(durationIn); } return false; }
      if (token !== revision) return false;
      try { commit(prepared); } catch (_) { reveal(); await wait(durationIn); return false; }
      if (token !== revision) return false;
      reveal(); await wait(durationIn);
      return token === revision;
    }
    return { transitionCharacter, cancelCharacterTransition: () => { revision++; reveal(); } };
  }
  function installPresentation() {
    const host = document.getElementById("galgame-mode");
    if (!host || host.dataset.presentationInstalled) return;
    host.dataset.presentationInstalled = "true";
    const overlay = document.createElement("div");
    overlay.className = "galgame-character-transition"; overlay.setAttribute("aria-hidden", "true"); host.append(overlay);
    const transition = createCharacterTransition({
      reducedMotion: () => root.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      showBlack: () => { overlay.classList.remove("is-revealing"); overlay.classList.add("is-visible"); },
      reveal: () => { overlay.classList.remove("is-visible"); overlay.classList.add("is-revealing"); }
    });
    const dialogue = host.querySelector(".galgame-dialogue"), text = document.getElementById("galgame-text"), next = document.getElementById("galgame-next");
    if (dialogue && text && next) {
      const hint = document.createElement("span"); hint.className = "galgame-continue-hint"; hint.textContent = "继续"; hint.setAttribute("aria-hidden", "true"); dialogue.append(hint);
      let settleTimer = null;
      const clearFeedback = () => { host.removeAttribute("data-galgame-typing"); host.removeAttribute("data-galgame-ready"); };
      const settle = () => { settleTimer = null; host.removeAttribute("data-galgame-typing"); if (!next.disabled && text.textContent.trim()) host.dataset.galgameReady = "true"; };
      new MutationObserver(() => { clearTimeout(settleTimer); host.dataset.galgameTyping = "true"; host.removeAttribute("data-galgame-ready"); settleTimer = setTimeout(settle, root.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 115); }).observe(text, { childList: true, characterData: true, subtree: true });
      new MutationObserver(() => { if (next.disabled) clearFeedback(); }).observe(next, { attributes: true, attributeFilter: ["disabled"] });
    }
    root.TaffyGalgamePresentation = transition;
  }
  const api = { createCharacterTransition, installPresentation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installPresentation, { once: true }); else installPresentation(); }
})(typeof window !== "undefined" ? window : globalThis);
