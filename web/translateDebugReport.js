(function (root) {
  "use strict";

  function buildReport(snapshot = {}, nowMs = 0) {
    const s = snapshot && typeof snapshot === "object" ? snapshot : {};
    const events = Array.isArray(s.events) ? s.events : [];
    const lines = [
      "Translation debug:",
      `timeoutMs=${s.timeoutMs}`,
      `cacheSize=${s.cacheSize}`,
      `inFlight=${s.inFlight}`,
      `circuitOpen=${s.circuitOpen}`,
      `circuitFailures=${s.circuitFailures}`,
      `circuitCooldownMs=${s.circuitCooldownMs}`,
      `lastTrace=${s.lastTraceId || "(none)"}`,
      `lastResult=${s.lastResult || "(none)"}`,
      `lastError=${s.lastError || "(none)"}`,
      `lastText=${s.lastText || "(none)"}`
    ];
    const recent = events.slice(-12).map((event) => {
      const ageMs = Math.round(Number(nowMs || 0) - Number(event?.atMs || 0));
      const bits = [
        `#${event?.seq}`,
        `${event?.stage}`,
        `ageMs=${ageMs}`,
        event?.traceId ? `trace=${event.traceId}` : "",
        event?.elapsedMs >= 0 ? `elapsedMs=${event.elapsedMs}` : "",
        event?.status ? `status=${event.status}` : "",
        event?.sourceChars ? `sourceChars=${event.sourceChars}` : "",
        event?.translatedChars ? `translatedChars=${event.translatedChars}` : "",
        event?.cache ? `cache=${event.cache}` : "",
        event?.degraded ? "degraded=true" : "",
        event?.fallback ? "fallback=true" : "",
        event?.result ? `result=${event.result}` : "",
        event?.error ? `error=${event.error}` : "",
        event?.text ? `text=${event.text}` : ""
      ].filter(Boolean);
      return bits.join(" ");
    });
    if (recent.length) {
      lines.push("recentEvents=");
      lines.push(...recent);
    } else {
      lines.push("recentEvents=none");
    }
    return lines.join("\n");
  }

  const api = {
    buildReport
  };

  root.TaffyTranslateDebugReport = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
