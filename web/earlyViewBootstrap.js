(function () {
  "use strict";

  try {
    const params = new URLSearchParams(window.location.search || "");
    let view = String(params.get("view") || "full").toLowerCase();
    if (!["model", "chat", "full"].includes(view)) {
      view = "full";
    }
    const classes = [`view-${view}`];
    if (params.get("desktop") === "1") {
      classes.push("desktop-mode");
    }
    if (params.get("transparent") === "1") {
      const alphaMode = params.get("alpha_mode") || "truealpha";
      classes.push("transparent-mode");
      classes.push(alphaMode === "colorkey" ? "alpha-colorkey" : "alpha-true");
    }
    classes.forEach((className) => {
      document.documentElement.classList.add(className);
      document.body.classList.add(className);
    });
  } catch (_) {
    // View classes are an early-paint optimization; the main startup path still validates the view.
  }
})();
