(function (root) {
  "use strict";

  const DECISIONS = new Set([
    "hold",
    "soft_react_only",
    "queue_after_user",
    "interject_now",
    "defer_until_tts_end",
    "cancel_stale_thought"
  ]);

  function clean(value, fallback = "", maxLen = 80) {
    let text = String(value || "").replace(/\s+/g, " ").trim().toLowerCase().replace(/-/g, "_");
    if (!text) text = fallback;
    if (text.length > maxLen) text = text.slice(0, Math.max(0, maxLen - 3)).trim() + "...";
    return text;
  }

  function cleanText(value, fallback = "", maxLen = 120) {
    let text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) text = fallback;
    if (text.length > maxLen) text = text.slice(0, Math.max(0, maxLen - 3)).trim() + "...";
    return text;
  }

  function clampInt(value, fallback, min, max) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function cleanList(values, limit = 6) {
    if (!Array.isArray(values)) return [];
    const out = [];
    const seen = new Set();
    for (const value of values) {
      const item = clean(value, "", 64);
      if (!item || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  }

  function isLocalOrDebugText(text = "") {
    const source = String(text || "").trim();
    if (!source) return false;
    if (/^\//.test(source)) return true;
    return /\b(doctor|braindebug|debug|api key|token|password|secret|private key)\b/i.test(source);
  }

  function isSafeClampedContext(context = {}) {
    const reason = clean(context.primaryReason, "");
    const director = context.director && typeof context.director === "object" && !Array.isArray(context.director)
      ? context.director
      : {};
    const clamp = clean(director.safety_clamp, "none");
    return ["comfort_quiet", "closing_quiet", "focused_quiet", "safety_quiet"].includes(reason)
      || (clamp && clamp !== "none");
  }

  function computeConversationPressure(context = {}, state = {}) {
    const score = Math.max(0, Math.min(1.4, Number(context.score || 0)));
    const burst = Math.max(0, Math.min(6, Number(state.autoChatBurstCount || 0)));
    const reasons = cleanList(context.reasons, 8);
    let pressure = score * 1.8 + Math.min(0.6, reasons.length * 0.12) - Math.min(0.8, burst * 0.16);
    if (reasons.includes("correction_afterthought")) pressure += 0.45;
    if (reasons.includes("stage_observation")) pressure += 0.32;
    if (reasons.includes("stage_callback")) pressure += 0.28;
    return Number(Math.max(0, Math.min(3, pressure)).toFixed(2));
  }

  function publicPendingThought(context = {}, decision = {}, nowMs = Date.now()) {
    const director = context.director && typeof context.director === "object" && !Array.isArray(context.director)
      ? context.director
      : {};
    return {
      version: 1,
      created_at: clampInt(nowMs, Date.now(), 0, Number.MAX_SAFE_INTEGER),
      expires_at: clampInt(nowMs, Date.now(), 0, Number.MAX_SAFE_INTEGER) + clampInt(decision.pending_ttl_ms, 18000, 4000, 45000),
      thought_type: clean(director.thought_type, "aside", 48),
      reason: clean(context.primaryReason, "afterthought", 64),
      decision: clean(decision.decision, "hold", 48),
      topic_hint: cleanText(context.topicHint, "", 64),
      expected_user_at: clampInt(context.expectedUserAt, 0, 0, Number.MAX_SAFE_INTEGER),
      expected_assistant_at: clampInt(context.expectedAssistantAt, 0, 0, Number.MAX_SAFE_INTEGER)
    };
  }

  function toPublicTurnTakingSummary(raw = null) {
    const safe = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const decision = clean(safe.decision, "hold", 48);
    return {
      version: 1,
      decision: DECISIONS.has(decision) ? decision : "hold",
      reason: clean(safe.reason, "none", 80),
      queued: safe.queued === true,
      retry: safe.retry === true,
      delay_ms: clampInt(safe.delay_ms, 0, 0, 60000),
      silence_window_ms: clampInt(safe.silence_window_ms, 650, 0, 10000),
      conversation_pressure: Math.max(0, Math.min(3, Number(safe.conversation_pressure) || 0)),
      pending_thought_type: clean(safe.pending_thought_type, "none", 48),
      suppressed: cleanList(safe.suppressed, 8),
      updated_at: clampInt(safe.updated_at, Date.now(), 0, Number.MAX_SAFE_INTEGER)
    };
  }

  function buildTurnTakingDecision(input = {}) {
    const context = input.context && typeof input.context === "object" && !Array.isArray(input.context)
      ? input.context
      : {};
    const state = input.state && typeof input.state === "object" && !Array.isArray(input.state)
      ? input.state
      : {};
    const nowMs = clampInt(input.nowMs, Date.now(), 0, Number.MAX_SAFE_INTEGER);
    const userText = cleanText(input.userText || context.userText || context.topicHint, "", 180);
    const expectedUserAt = clampInt(context.expectedUserAt, 0, 0, Number.MAX_SAFE_INTEGER);
    const expectedAssistantAt = clampInt(context.expectedAssistantAt, 0, 0, Number.MAX_SAFE_INTEGER);
    const lastUserAt = clampInt(input.lastUserAt || state.lastUserMessageAt || state.conversationLastUserAt, 0, 0, Number.MAX_SAFE_INTEGER);
    const lastAssistantAt = clampInt(input.lastAssistantAt || state.conversationLastAssistantAt, 0, 0, Number.MAX_SAFE_INTEGER);
    const lastInterjectionAt = clampInt(input.lastInterjectionAt || state.autoChatInterjectionLastAt || state.lastAutoChatAt, 0, 0, Number.MAX_SAFE_INTEGER);
    const cooldownMs = clampInt(input.cooldownMs, 22000, 0, 180000);
    const silenceWindowMs = clampInt(input.silenceWindowMs, 650, 150, 4000);
    const pending = state.turnTakingPendingThoughtBurst && typeof state.turnTakingPendingThoughtBurst === "object" && !Array.isArray(state.turnTakingPendingThoughtBurst)
      ? state.turnTakingPendingThoughtBurst
      : null;
    const pendingAgeMs = pending ? Math.max(0, nowMs - clampInt(pending.created_at, nowMs, 0, Number.MAX_SAFE_INTEGER)) : 0;
    const pendingExpired = pending && clampInt(pending.expires_at, 0, 0, Number.MAX_SAFE_INTEGER) > 0 && nowMs > clampInt(pending.expires_at, 0, 0, Number.MAX_SAFE_INTEGER);
    const suppressed = [];
    const pressure = computeConversationPressure(context, state);

    function result(decision, reason, extra = {}) {
      return toPublicTurnTakingSummary({
        decision,
        reason,
        queued: extra.queued === true,
        retry: extra.retry === true,
        delay_ms: clampInt(extra.delay_ms, 0, 0, 60000),
        silence_window_ms: silenceWindowMs,
        conversation_pressure: pressure,
        pending_thought_type: clean(extra.pending_thought_type || pending?.thought_type, "none", 48),
        suppressed: [...suppressed, ...(Array.isArray(extra.suppressed) ? extra.suppressed : [])],
        updated_at: nowMs
      });
    }

    if (context.interjection !== true || context.shouldTrigger !== true) {
      return result("hold", "not_interjection");
    }
    if (isLocalOrDebugText(userText)) {
      suppressed.push("local_command");
      return result("hold", "local_or_debug_command");
    }
    if (isSafeClampedContext(context)) {
      suppressed.push("safety_clamp");
      return result("soft_react_only", "safe_scene_reaction_only");
    }
    if (expectedUserAt > 0 && lastUserAt > expectedUserAt + 50) {
      suppressed.push("new_user_turn");
      return result("cancel_stale_thought", "new_user_turn", { pending_thought_type: pending?.thought_type });
    }
    if (expectedAssistantAt > 0 && lastAssistantAt > expectedAssistantAt + 50) {
      suppressed.push("new_assistant_turn");
      return result("cancel_stale_thought", "new_assistant_turn", { pending_thought_type: pending?.thought_type });
    }
    if (pendingExpired || pendingAgeMs > clampInt(input.maxPendingAgeMs, 18000, 4000, 45000)) {
      suppressed.push("pending_expired");
      return result("cancel_stale_thought", "pending_expired", { pending_thought_type: pending?.thought_type });
    }
    if (lastInterjectionAt > 0 && nowMs - lastInterjectionAt < cooldownMs) {
      suppressed.push("cooldown");
      return result("hold", "cooldown");
    }
    if (input.userSpeaking === true || input.userTyping === true) {
      return result("queue_after_user", input.userTyping === true ? "user_typing" : "user_speaking", {
        queued: true,
        retry: true,
        delay_ms: silenceWindowMs,
        pending_thought_type: context.director?.thought_type || pending?.thought_type
      });
    }
    if (input.assistantSpeaking === true || input.chatBusy === true) {
      return result("defer_until_tts_end", input.chatBusy === true ? "chat_busy" : "assistant_speaking", {
        queued: true,
        retry: true,
        delay_ms: clampInt(input.retryMs, 1400, 300, 6000),
        pending_thought_type: context.director?.thought_type || pending?.thought_type
      });
    }
    return result("interject_now", "both_idle", {
      delay_ms: clampInt(context.delayMs, 900, 250, 4000),
      pending_thought_type: context.director?.thought_type || pending?.thought_type
    });
  }

  function buildPendingThoughtBurst(context = {}, decision = {}, nowMs = Date.now()) {
    const safeDecision = toPublicTurnTakingSummary(decision);
    if (!["queue_after_user", "defer_until_tts_end", "interject_now"].includes(safeDecision.decision)) {
      return null;
    }
    return publicPendingThought(context, safeDecision, nowMs);
  }

  const api = {
    buildTurnTakingDecision,
    buildPendingThoughtBurst,
    toPublicTurnTakingSummary
  };

  root.TaffyTurnTakingDirector = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
