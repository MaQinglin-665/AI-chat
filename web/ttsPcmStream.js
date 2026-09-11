(function (root) {
  "use strict";

  function concatBytes(left, right) {
    const a = left instanceof Uint8Array ? left : new Uint8Array(left || 0);
    const b = right instanceof Uint8Array ? right : new Uint8Array(right || 0);
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function parseStreamingWavHeader(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
    if (data.length < 12) return null;
    const text = (start, length) => String.fromCharCode(...data.slice(start, start + length));
    if (text(0, 4) !== "RIFF" || text(8, 4) !== "WAVE") throw new Error("Streaming TTS did not return a WAV header");
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 12;
    let format = null;
    while (offset + 8 <= data.length) {
      const id = text(offset, 4);
      const size = view.getUint32(offset + 4, true);
      const bodyOffset = offset + 8;
      if (id === "fmt ") {
        if (data.length < bodyOffset + Math.min(size, 16)) return null;
        format = {
          audioFormat: view.getUint16(bodyOffset, true),
          channels: view.getUint16(bodyOffset + 2, true),
          sampleRate: view.getUint32(bodyOffset + 4, true),
          bitsPerSample: view.getUint16(bodyOffset + 14, true)
        };
      } else if (id === "data") {
        if (!format) throw new Error("Streaming WAV data arrived before format metadata");
        if (format.audioFormat !== 1 || format.bitsPerSample !== 16) throw new Error("Streaming TTS requires signed 16-bit PCM WAV");
        if (format.channels < 1 || format.channels > 2 || format.sampleRate < 8000 || format.sampleRate > 96000) {
          throw new Error("Streaming WAV format is outside supported bounds");
        }
        return { ...format, dataOffset: bodyOffset };
      }
      const padded = size + (size % 2);
      if (data.length < bodyOffset + padded) return null;
      offset = bodyOffset + padded;
    }
    return null;
  }

  function decodePcm16Channels(bytes, channels) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
    const frameBytes = Math.max(2, Number(channels || 1) * 2);
    const frames = Math.floor(data.length / frameBytes);
    const output = Array.from({ length: channels }, () => new Float32Array(frames));
    const view = new DataView(data.buffer, data.byteOffset, frames * frameBytes);
    for (let frame = 0; frame < frames; frame += 1) {
      for (let channel = 0; channel < channels; channel += 1) {
        output[channel][frame] = view.getInt16((frame * channels + channel) * 2, true) / 32768;
      }
    }
    return { channels: output, frames, consumedBytes: frames * frameBytes };
  }

  async function playPcmStream(reader, options = {}) {
    const context = options.audioContext;
    if (!reader || typeof reader.read !== "function" || !context || typeof context.createBuffer !== "function") {
      throw new Error("PCM stream playback is unavailable");
    }
    const signal = options.signal || null;
    const outputNode = options.outputNode || context.destination;
    const playbackSource = String(options.source || "pcm_stream");
    let pending = new Uint8Array(0);
    let format = null;
    let nextStartAt = 0;
    let firstStartAt = 0;
    let started = false;
    let cancelled = false;
    let activeSources = 0;
    let readerDone = false;
    const minScheduleBytes = Math.max(512, Math.min(32768, Math.round(Number(options.minScheduleBytes) || 4096)));
    const sources = new Set();
    let settlePlayback = null;
    const playbackDone = new Promise((resolve) => { settlePlayback = resolve; });
    let progressTimer = 0;
    const notifyProgress = (final = false) => {
      if (!started || typeof options.onPlaybackProgress !== "function") return;
      const now = Number(context.currentTime || 0);
      const elapsedMs = Math.max(0, Math.round((now - firstStartAt) * 1000));
      const durationMs = Math.max(1, Math.round((nextStartAt - firstStartAt) * 1000));
      try {
        options.onPlaybackProgress({
          source: playbackSource,
          elapsedMs: Math.min(elapsedMs, durationMs),
          durationMs,
          bufferedDurationMs: durationMs,
          final: final === true
        });
      } catch (_) {
        // Subtitle timing hooks must never interrupt audio scheduling.
      }
    };
    const maybeSettle = () => {
      if ((readerDone || cancelled) && activeSources === 0) settlePlayback();
    };
    const cancel = () => {
      if (cancelled) return;
      cancelled = true;
      try { reader.cancel?.("playback_cancelled"); } catch (_) {}
      sources.forEach((source) => { try { source.stop(0); } catch (_) {} });
      sources.clear();
      activeSources = 0;
      maybeSettle();
    };
    if (signal?.aborted) cancel();
    else signal?.addEventListener?.("abort", cancel, { once: true });

    const schedule = (pcmBytes) => {
      const decoded = decodePcm16Channels(pcmBytes, format.channels);
      if (!decoded.frames) return 0;
      const buffer = context.createBuffer(format.channels, decoded.frames, format.sampleRate);
      decoded.channels.forEach((values, index) => buffer.getChannelData(index).set(values));
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(outputNode);
      const lead = started ? 0.012 : 0.035;
      const startAt = Math.max(Number(context.currentTime || 0) + lead, nextStartAt || 0);
      if (!firstStartAt) firstStartAt = startAt;
      nextStartAt = startAt + decoded.frames / format.sampleRate;
      activeSources += 1;
      sources.add(source);
      source.onended = () => {
        if (sources.delete(source)) activeSources = Math.max(0, activeSources - 1);
        maybeSettle();
      };
      try {
        source.start(startAt);
      } catch (error) {
        sources.delete(source);
        activeSources = Math.max(0, activeSources - 1);
        throw error;
      }
      if (!started) {
        started = true;
        options.onPlaybackStart?.({
          source: playbackSource,
          startedAtContextTime: startAt,
          durationMs: Math.max(1, Math.round((nextStartAt - firstStartAt) * 1000))
        });
        progressTimer = setInterval(() => notifyProgress(false), 50);
      }
      return decoded.consumedBytes;
    };

    try {
      if (typeof context.resume === "function") await context.resume();
      while (!cancelled) {
        const part = await reader.read();
        if (part?.done) break;
        if (!part?.value?.byteLength) continue;
        pending = concatBytes(pending, new Uint8Array(part.value));
        if (!format) {
          format = parseStreamingWavHeader(pending);
          if (!format) continue;
          pending = pending.slice(format.dataOffset);
        }
        if (pending.length >= minScheduleBytes) {
          const consumed = schedule(pending);
          if (consumed > 0) pending = pending.slice(consumed);
        }
      }
      if (!cancelled && format && pending.length) {
        const consumed = schedule(pending);
        if (consumed > 0) pending = pending.slice(consumed);
      }
      readerDone = true;
      maybeSettle();
      await playbackDone;
      notifyProgress(true);
      if (!format && !cancelled) throw new Error("Streaming TTS ended before a complete WAV header");
      return { ok: started && !cancelled, started, cancelled, format };
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      signal?.removeEventListener?.("abort", cancel);
      if (cancelled) maybeSettle();
    }
  }

  const api = { concatBytes, parseStreamingWavHeader, decodePcm16Channels, playPcmStream };
  root.TaffyTTSPcmStream = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
