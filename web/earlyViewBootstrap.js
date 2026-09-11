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

    const hour = new Date().getHours();
    const automaticScene = hour >= 5 && hour < 9
      ? "morning"
      : hour >= 9 && hour < 17
        ? "day"
        : hour >= 17 && hour < 20
          ? "dusk"
          : "night";
    let storedMode = "auto";
    try {
      const stored = JSON.parse(localStorage.getItem("taffy.stage-room.v1") || "null");
      const candidate = String(stored?.mode || "auto").toLowerCase();
      if (["morning", "day", "dusk", "night"].includes(candidate)) storedMode = candidate;
    } catch (_) {}
    const scene = storedMode === "auto" ? automaticScene : storedMode;
    const room = scene === "night" ? "night" : "day";
    document.body.dataset.stageScene = scene;
    document.body.dataset.stageRoom = room;
    document.body.dataset.stageRoomMode = storedMode;
  } catch (_) {
    // View classes are an early-paint optimization; the main startup path still validates the view.
  }
})();
