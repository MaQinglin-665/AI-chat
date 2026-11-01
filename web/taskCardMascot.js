(function (root) {
  "use strict";
  const ns = "http://www.w3.org/2000/svg";
  // Original Sakura Dango drawing. No image pixels, third-party paths or brand icons.
  function svgNode(doc, name, attributes = {}) {
    const node = doc.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }
  function create(doc, variant = "awaiting_approval", sweat = false) {
    const svg = svgNode(doc, "svg", { viewBox: "0 0 210 96", "aria-hidden": "true", class: `task-mascot task-mascot-${variant}` });
    const add = (name, attrs, parent = svg) => parent.appendChild(svgNode(doc, name, attrs));
    const body = add("g", { class: "task-mascot-body" });
    add("ellipse", { cx: 102, cy: 87, rx: 53, ry: 4, class: "dango-shadow" });
    add("path", { d: "M57 51 Q51 15 74 33 Q96 21 121 33 Q143 13 141 53 Z", class: "dango-cream" }, body);
    add("path", { d: "M59 45 L59 29 L73 39 M124 39 L137 28 L137 47", class: "dango-petal" }, body);
    add("path", { d: "M49 68 C44 35 76 34 99 34 C126 32 150 45 150 68 C150 89 48 92 49 68Z", class: "dango-cream" }, body);
    for (const x of [69, 130]) add("ellipse", { cx: x, cy: 67, rx: 9, ry: 5, class: "dango-blush" }, body);
    const sleeping = variant === "expired";
    for (const x of [82, 117]) {
      if (sleeping) add("path", { d: `M${x - 4} 55 q4 5 8 0`, class: "dango-face", fill: "none" }, body);
      else add("circle", { cx: x, cy: 56, r: 2.7, class: "dango-face" }, body);
    }
    add("path", { d: ["failed", "auth_error"].includes(variant) ? "M94 69 Q100 62 106 69" : "M94 65 Q100 72 106 65", class: "dango-face", fill: "none" }, body);
    for (let i = 0; i < 5; i++) add("ellipse", { cx: 116, cy: 30, rx: 4, ry: 8, transform: `rotate(${i * 72} 116 35)`, class: "dango-flower" }, body);
    add("circle", { cx: 116, cy: 35, r: 3, class: "dango-center" }, body);
    for (const x of [64, 133]) add("ellipse", { cx: x, cy: 82, rx: 9, ry: 6, class: "dango-cream task-mascot-foot" }, body);
    const text = (value, x, y, cls) => { const t = add("text", { x, y, class: cls }); t.textContent = value; return t; };
    if (sweat || ["failed", "auth_error"].includes(variant)) add("path", { d: "M147 37 Q161 58 149 59 Q139 59 147 37", class: "dango-sweat" });
    if (variant === "awaiting_approval") {
      add("path", { d: "M157 59 L157 87", class: "dango-stick" });
      add("rect", { x: 139, y: 44, width: 69, height: 28, rx: 6, transform: "rotate(7 172 58)", class: "dango-sign" });
      text("等你决定～", 145, 62, "dango-sign-text");
    }
    if (variant === "cancel_pending") {
      add("path", { d: "M157 47 L157 87", class: "dango-stick" });
      add("path", { d: "M148 25 L167 25 L179 39 L179 57 L167 69 L148 69 L136 57 L136 39Z", class: "dango-stop" });
      add("rect", { x: 148, y: 37, width: 18, height: 18, rx: 2, class: "dango-cream" });
      text("…", 78, 24, "dango-note");
    }
    if (sleeping) text("zzz", 152, 37, "dango-note");
    if (variant === "completed") {
      for (const [x, y, angle] of [[41, 29, -20], [164, 18, 30], [26, 61, 45], [175, 65, -35]]) add("path", { d: `M${x} ${y} l4 0 l0 9 l-4 0Z`, transform: `rotate(${angle} ${x} ${y})`, class: "dango-confetti" });
      add("path", { d: "M49 72 l-14 -13 M146 71 l15 -15", class: "dango-stick" });
    }
    return svg;
  }
  function icon(doc, name) {
    const svg = svgNode(doc, "svg", { viewBox: "0 0 24 24", "aria-hidden": "true", class: `task-icon task-icon-${name}`, fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const paths = {
      star: "M12 2 L14.6 8.5 L22 12 L14.6 15 L12 22 L9 15 L2 12 L9 8.5Z",
      hourglass: "M6 3H18M6 21H18M7 3Q7 9 12 12Q17 15 17 21M17 3Q17 9 12 12Q7 15 7 21",
      check: "M4 12L9 17L20 6", alert: "M12 8V13M12 17V17.1M12 2L23 21H1Z",
      clock: "M12 7V12L16 14M22 12A10 10 0 1 1 2 12A10 10 0 1 1 22 12",
      stop: "M6 6H18V18H6Z", move: "M3 12H21M15 6L21 12L15 18", create: "M12 4V20M4 12H20",
      modify: "M4 20L5 14L16 3L21 8L10 19ZM14 5L19 10", delete: "M4 6H20M9 3H15M7 6L8 21H16L17 6M10 10V17M14 10V17",
      file: "M5 2H14L20 8V22H5ZM14 2V8H20M8 13H16M8 17H14",
      folder: "M2 5H9L12 8H22V21H2Z", lock: "M5 10H19V22H5ZM8 10V6A4 4 0 0 1 16 6V10M12 15V18"
    };
    svg.appendChild(svgNode(doc, "path", { d: paths[name] || paths.file }));
    return svg;
  }
  const api = { create, icon };
  root.TaffyTaskMascot = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
