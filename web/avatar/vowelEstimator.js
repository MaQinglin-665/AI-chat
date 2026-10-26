(function (root) {
  "use strict";
  const prototypes = { a: [800, 1250], i: [300, 2300], u: [350, 750], e: [500, 1900], o: [500, 1000] };
  const empty = () => ({ vowel: null, confidence: 0 });
  function estimate(spectrum, sampleRate, fftSize, rms) {
    if (!spectrum?.length || !Number.isFinite(sampleRate) || sampleRate < 8000 || !Number.isFinite(fftSize) || fftSize < 256 || !(rms > 0.012)) return empty();
    const hz = sampleRate / fftSize, smooth = [];
    const radius = Math.max(1, Math.round(90 / hz));
    for (let i = 0; i < spectrum.length; i++) {
      let sum = 0, count = 0;
      for (let j = Math.max(0, i - radius); j <= Math.min(spectrum.length - 1, i + radius); j++) { sum += spectrum[j]; count++; }
      smooth.push(sum / count);
    }
    const peaks = [];
    for (let i = 1; i < smooth.length - 1; i++) {
      const frequency = i * hz;
      if (frequency < 180 || frequency > 3200 || smooth[i] < 55 || smooth[i] <= smooth[i - 1] || smooth[i] < smooth[i + 1]) continue;
      const flank = Math.max(2, Math.round(180 / hz));
      const base = Math.max(smooth[Math.max(0, i - flank)], smooth[Math.min(smooth.length - 1, i + flank)]);
      if (smooth[i] - base >= 12) peaks.push({ hz: frequency, level: smooth[i] });
    }
    // Two distinct envelope peaks are required; flat/noisy/unvoiced spectra fall
    // back to mouth opening. This is a conservative heuristic, not speech ASR.
    const first = peaks.filter(p => p.hz <= 1050).sort((a, b) => b.level - a.level)[0];
    if (!first) return empty();
    const second = peaks.filter(p => p.hz > first.hz + 250).sort((a, b) => b.level - a.level)[0];
    if (!second) return empty();
    const ranked = Object.entries(prototypes).map(([vowel, [f1, f2]]) => ({ vowel,
      distance: Math.hypot((first.hz - f1) / 230, (second.hz - f2) / 350) })).sort((a, b) => a.distance - b.distance);
    const best = ranked[0], margin = ranked[1].distance - best.distance;
    if (best.distance > 1.05 || margin < 0.23) return empty();
    return { vowel: best.vowel, confidence: Math.max(0, Math.min(1, (1 - best.distance / 1.4) * Math.min(1, margin))) };
  }
  function sample(state, analyser, rms, now, latencyMs = 0) {
    if (!(rms > 0.012) || !analyser?.getByteFrequencyData) {
      state.ttsVowel = null; state.ttsVowelConfidence = 0; state.ttsVowelHistory = []; return;
    }
    const size = analyser.frequencyBinCount;
    if (!state.ttsVowelSpectrum || state.ttsVowelSpectrum.length !== size) state.ttsVowelSpectrum = new Uint8Array(size);
    analyser.getByteFrequencyData(state.ttsVowelSpectrum);
    const result = estimate(state.ttsVowelSpectrum, analyser.context?.sampleRate, analyser.fftSize, rms);
    const history = state.ttsVowelHistory ||= [];
    history.push({ at: now, ...result });
    const audibleAt = now - Math.max(0, Math.min(350, latencyMs));
    while (history.length > 1 && history[1].at <= audibleAt) history.shift();
    if (history.length > 240) history.splice(0, history.length - 240);
    const audible = history[0]?.at <= audibleAt ? history[0] : empty();
    state.ttsVowel = audible.vowel; state.ttsVowelConfidence = audible.confidence;
  }
  const api = { estimate, sample }; root.XinyuVowelEstimator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
