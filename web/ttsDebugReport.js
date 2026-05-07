(function (root) {
  "use strict";

  function formatNumber(value, digits = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return "n/a";
    }
    return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
  }

  function buildReport(snapshot = {}, events = [], nowMs = 0) {
    const s = snapshot && typeof snapshot === "object" ? snapshot : {};
    const lines = [
      "TTS debug:",
      `provider=${s.provider}`,
      `speakingEnabled=${s.speakingEnabled}`,
      `streamMode=${s.streamMode}`,
      `streamWorking=${s.streamWorking}`,
      `queueLen=${s.queueLen}`,
      `bufferChars=${s.bufferChars}`,
      `session=${s.sessionId}`,
      `trace=${s.traceId || "(none)"}`,
      `audioPaused=${s.audioPaused}`,
      `audioEnded=${s.audioEnded}`,
      `audioReadyState=${s.audioReadyState}`,
      `audioCurrentMs=${formatNumber(s.currentMs)}`,
      `audioDurationMs=${formatNumber(s.durationMs)}`,
      `contextSpeaking=${s.contextSpeaking}`,
      `mouthOpen=${formatNumber(s.mouthOpen, 3)}`,
      `audioLevel=${formatNumber(s.audioLevel, 3)}`,
      `rawLevel=${formatNumber(s.rawLevel, 3)}`,
      `rms=${formatNumber(s.rms, 5)}`,
      `lastVoiceAgeMs=${s.lastVoiceAgeMs}`,
      `animUntilMs=${s.animUntilMs}`,
      `animDurationMs=${s.animDurationMs}`,
      `mood=${s.mood}`,
      `style=${s.style}`,
      `lastResult=${s.lastResult || "(none)"}`,
      `lastError=${s.lastError || "(none)"}`,
      `currentText=${s.currentText || "(none)"}`
    ];
    const recent = Array.isArray(events) ? events.slice(-12).map((event) => {
      const ageMs = Math.round(Number(nowMs || 0) - Number(event?.atMs || 0));
      const bits = [
        `#${event?.seq}`,
        `${event?.stage}`,
        `ageMs=${ageMs}`,
        event?.traceId ? `trace=${event.traceId}` : "",
        event?.segmentId ? `seg=${event.segmentId}` : "",
        event?.blobBytes ? `bytes=${event.blobBytes}` : "",
        event?.durationMs >= 0 ? `durMs=${event.durationMs}` : "",
        event?.currentMs ? `curMs=${event.currentMs}` : "",
        event?.result ? `result=${event.result}` : "",
        event?.error ? `error=${event.error}` : "",
        event?.text ? `text=${event.text}` : ""
      ].filter(Boolean);
      return bits.join(" ");
    }) : [];
    if (recent.length) {
      lines.push("recentEvents=");
      lines.push(...recent);
    } else {
      lines.push("recentEvents=none");
    }
    return lines.join("\n");
  }

  const api = {
    formatNumber,
    buildReport
  };

  root.TaffyTTSDebugReport = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
