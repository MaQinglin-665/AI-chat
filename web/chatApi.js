(function (root) {
  "use strict";

  function nowMs() {
    if (root.performance && typeof root.performance.now === "function") {
      return root.performance.now();
    }
    return Date.now();
  }

  function defaultPerfLog() {
    // optional hook
  }

  function buildChatRequestInit(payload) {
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    };
  }

  function createStreamLineHandler(context) {
    const onDelta = typeof context.onDelta === "function" ? context.onDelta : () => {};
    const onCharacterRuntimeMetadata = typeof context.onCharacterRuntimeMetadata === "function"
      ? context.onCharacterRuntimeMetadata
      : () => {};
    const perfHooks = context.perfHooks || null;
    const getNow = typeof context.now === "function" ? context.now : nowMs;

    let fullText = "";
    let doneReply = "";
    let seenFirstDelta = false;

    const handleDataLine = (line) => {
      if (!line || !line.startsWith("data:")) {
        return false;
      }
      const raw = line.slice(5).trim();
      if (!raw) {
        return false;
      }
      if (raw === "[DONE]") {
        return true;
      }
      let evt = null;
      try {
        evt = JSON.parse(raw);
      } catch (_) {
        return false;
      }
      if (evt.type === "error") {
        throw new Error(evt.error || "连接有点挤，请稍后再试。");
      }
      if (evt.type === "delta" && typeof evt.text === "string" && evt.text) {
        if (!seenFirstDelta) {
          seenFirstDelta = true;
          if (perfHooks && typeof perfHooks.onFirstDelta === "function") {
            perfHooks.onFirstDelta({ atPerfMs: getNow() });
          }
        }
        fullText += evt.text;
        onDelta(evt.text);
      }
      if (evt.type === "done" && typeof evt.reply === "string" && evt.reply.trim()) {
        doneReply = evt.reply.trim();
      }
      if (evt.type === "done") {
        onCharacterRuntimeMetadata(evt.character_runtime);
      }
      return evt.type === "done";
    };

    return {
      getFullText: () => fullText,
      getReply: () => doneReply || fullText,
      hasSeenFirstDelta: () => seenFirstDelta,
      handleDataLine
    };
  }

  async function readStreamingReply(resp, context) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const lineHandler = createStreamLineHandler(context);
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

        let lineIndex = buffer.indexOf("\n");
        while (lineIndex >= 0) {
          const line = buffer.slice(0, lineIndex).trim();
          buffer = buffer.slice(lineIndex + 1);
          const isDone = lineHandler.handleDataLine(line);
          if (isDone) {
            return {
              reply: lineHandler.getReply(),
              seenFirstDelta: lineHandler.hasSeenFirstDelta()
            };
          }
          lineIndex = buffer.indexOf("\n");
        }
      }

      const tail = buffer.trim();
      if (tail) {
        lineHandler.handleDataLine(tail);
      }
    } catch (err) {
      try {
        err.seenFirstDelta = lineHandler.hasSeenFirstDelta();
      } catch (_) {
        // ignore
      }
      throw err;
    }
    return {
      reply: lineHandler.getReply(),
      seenFirstDelta: lineHandler.hasSeenFirstDelta()
    };
  }

  async function streamAssistantReply(payload, onDelta, options = {}) {
    const authFetch = options.authFetch;
    if (typeof authFetch !== "function") {
      throw new Error("authFetch is required");
    }

    const perfHooks = options.perfHooks || null;
    const perfLog = typeof options.perfLog === "function" ? options.perfLog : defaultPerfLog;
    const getNow = typeof options.now === "function" ? options.now : nowMs;
    const onCharacterRuntimeMetadata = typeof options.onCharacterRuntimeMetadata === "function"
      ? options.onCharacterRuntimeMetadata
      : () => {};
    const requestInit = buildChatRequestInit(payload);

    const fetchDirectChat = async (fallbackReason = "") => {
      const directResp = await authFetch("/api/chat", requestInit);
      if (perfHooks && typeof perfHooks.onApiHeaders === "function") {
        perfHooks.onApiHeaders({
          mode: fallbackReason ? `chat_fallback:${fallbackReason}` : "chat",
          status: Number(directResp.status) || 0,
          atPerfMs: getNow()
        });
      }
      const directData = await directResp.json();
      if (!directResp.ok) {
        throw new Error(directData.error || `HTTP ${directResp.status}`);
      }
      onCharacterRuntimeMetadata(directData?.character_runtime);
      const text = String(directData.reply || "");
      if (text) {
        onDelta(text);
      }
      return text;
    };

    let resp;
    try {
      resp = await authFetch("/api/chat_stream", requestInit);
    } catch (err) {
      perfLog("chat", "stream_fallback", {
        reason: "stream_fetch_error",
        error: String(err?.message || err || "")
      });
      return await fetchDirectChat("stream_fetch_error");
    }

    if (perfHooks && typeof perfHooks.onApiHeaders === "function") {
      perfHooks.onApiHeaders({
        mode: "chat_stream",
        status: Number(resp.status) || 0,
        atPerfMs: getNow()
      });
    }

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const data = await resp.json();
        if (data?.error) {
          detail = data.error;
        }
      } catch (_) {
        // ignore
      }
      perfLog("chat", "stream_fallback", {
        reason: "stream_http_error",
        status: Number(resp.status) || 0
      });
      try {
        return await fetchDirectChat(`stream_http_${Number(resp.status) || 0}`);
      } catch (_) {
        throw new Error(detail);
      }
    }

    if (!resp.body || typeof resp.body.getReader !== "function") {
      perfLog("chat", "stream_fallback", {
        reason: "stream_reader_unavailable"
      });
      return await fetchDirectChat("stream_reader_unavailable");
    }

    try {
      const result = await readStreamingReply(resp, {
        onDelta,
        onCharacterRuntimeMetadata,
        perfHooks,
        now: getNow
      });
      return result.reply;
    } catch (err) {
      if (!err || err.seenFirstDelta !== true) {
        perfLog("chat", "stream_fallback", {
          reason: "stream_read_error_before_delta",
          error: String(err?.message || err || "")
        });
        return await fetchDirectChat("stream_read_error_before_delta");
      }
      throw err;
    }
  }

  const api = {
    buildChatRequestInit,
    createStreamLineHandler,
    readStreamingReply,
    streamAssistantReply
  };

  const ns = (root.TaffyModules = root.TaffyModules || {});
  ns.chatApi = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
