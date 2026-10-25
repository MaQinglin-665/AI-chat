"use strict";
(async function () {
  const status = document.getElementById("status");
  try {
    const app = new PIXI.Application({ width: 600, height: 760, backgroundAlpha: 0, antialias: true });
    document.getElementById("stage").appendChild(app.view);
    const model = await PIXI.live2d.Live2DModel.from("/models/hiyori_pro_t11/hiyori_pro_t11.model3.json", { autoInteract: false });
    model.scale.set(Math.min(550 / model.width, 720 / model.height));
    model.anchor.set(0.5, 0.5); model.position.set(300, 395); app.stage.addChild(model);
    let speaking = false, paused = false, started = 0, realMode = false;
    const audio = new Audio();
    const state = { model, uiView: "full", modelProfileName: "hiyori_pro_t11", ttsPlaybackGeneration: 0,
      ttsAudioLevel: 0, ttsAudio: audio };
    const controller = TaffyLive2DExpressionController.createController({
      state, hiyoriPerformanceDirector: TaffyHiyoriPerformanceDirector,
      isSpeakingNow: () => speaking, isSpeechMotionActive: () => speaking
    });
    const lines = { playful: "哼哼，这次是不是该夸夸我啦？", excited: "好耶！我们真的做到了！", shy: "你这样夸，我会不好意思的……", thinking: "嗯？让我想想，这里是不是少了一步？", sad: "有点难过，陪我待一会儿吧。", hurt: "先休息一会儿吧，我陪着你。", surprised: "欸？真的假的！", serious: "认真说，先把最重要的这一步做好。" };
    const emotion = document.getElementById("emotion");
    const audioStatus = document.getElementById("audio-status");
    let silentGain = null, peakAudio = 0, mediaRequest = 0;
    const stopMedia = () => {
      mediaRequest++;
      audio.onplaying = null; audio.onended = null;
      audio.pause();
      speaking = false; paused = false;
    };
    const finish = () => {
      stopMedia(); realMode = false;
      controller.finishSpeechAnimation();
    };
    const showLine = () => { document.getElementById("line").textContent = lines[emotion.value]; };
    emotion.addEventListener("change", showLine); showLine();
    document.getElementById("play").onclick = () => {
      stopMedia(); realMode = false;
      controller.endSpeechAnimation();
      speaking = true; paused = false; started = performance.now(); state.ttsPlaybackGeneration++;
      controller.beginSpeechAnimation(lines[emotion.value], "idle", "neutral", {
        durationMs: 30000,
        performanceCue: { emotion: emotion.value, action: "none", speech: { holdMs: 500 } }
      });
    };
    document.getElementById("pause").onclick = () => { paused = !paused; };
    document.getElementById("finish").onclick = finish;
    document.getElementById("stop").onclick = () => {
      stopMedia(); realMode = false; state.ttsPlaybackGeneration++;
      controller.endSpeechAnimation();
    };
    const realLines = {
      question: { emotion: "thinking", text: "嗯？这里是不是少了一步？让我想想。" },
      comfort: { emotion: "hurt", text: "今天已经很努力了，先休息一会儿吧，我陪着你。" },
      excited: { emotion: "excited", text: "好耶！我们终于做到了，太开心啦！" }
    };
    for (const button of document.querySelectorAll("[data-speech]")) {
      button.onclick = async () => {
        stopMedia(); controller.endSpeechAnimation();
        const generation = ++state.ttsPlaybackGeneration;
        const request = mediaRequest;
        const id = button.dataset.speech, line = realLines[id], url = `/__speech_${id}.wav`;
        realMode = true; peakAudio = 0;
        emotion.value = line.emotion;
        document.getElementById("line").textContent = line.text;
        audioStatus.textContent = "正在加载真实 WAV…";
        audio.src = url;
        if (!controller.ensureTTSAudioAnalyser(audio)) {
          realMode = false; audioStatus.textContent = "当前浏览器无法分析音频。"; return;
        }
        if (!silentGain) {
          silentGain = state.ttsAudioContext.createGain(); silentGain.gain.value = 0;
          state.ttsAudioAnalyser.disconnect();
          state.ttsAudioAnalyser.connect(silentGain); silentGain.connect(state.ttsAudioContext.destination);
        }
        const current = () => mediaRequest === request
          && state.ttsPlaybackGeneration === generation && audio.src.endsWith(url);
        audio.onplaying = () => {
          if (!current()) return;
          speaking = true; started = performance.now();
          controller.beginSpeechAnimation(line.text, "idle", "neutral", {
            durationMs: audio.duration * 1000,
            performanceCue: { emotion: line.emotion, action: "none", speech: { holdMs: 500 } }
          });
          audioStatus.textContent = `真实 WAV · ${audio.duration.toFixed(2)}秒 · 静音分析`;
        };
        audio.onended = () => {
          if (!current() || !audio.ended) return;
          audioStatus.textContent += ` · 已播完，峰值音量 ${peakAudio.toFixed(2)}`;
          finish();
        };
        try {
          await state.ttsAudioContext.resume();
          if (!current()) return;
          await audio.play();
        }
        catch (_) {
          if (current()) {
            stopMedia(); realMode = false; controller.endSpeechAnimation();
            audioStatus.textContent = "测试 WAV 无法播放，请指定生成音频目录。";
          }
        }
      };
    }
    model.internalModel.on("beforeModelUpdate", () => {
      const now = performance.now(), phase = ((now - started) % 1250) / 1250;
      if (speaking && !realMode && now - started >= 30000) finish();
      const cue = controller.getActiveSpeechPerformanceCue(now);
      const measured = realMode ? controller.sampleTTSAudioLevel() : 0;
      const level = speaking && !paused
        ? (realMode ? measured : (phase < 0.6 ? Math.sin(phase / 0.6 * Math.PI) * 0.9 : 0)) : 0;
      if (realMode) peakAudio = Math.max(peakAudio, level);
      const core = model.internalModel.coreModel;
      core.setParameterValueById("ParamMouthOpenY", level * 0.8);
      const sample = controller.applyHiyoriPerformanceLayer(core, {
        now, speaking, audioActive: speaking, emotion: cue?.emotion || "neutral",
        audioLevel: level, bodyEnergy: level, playbackGeneration: state.ttsPlaybackGeneration,
        motionIntensity: document.getElementById("intensity").value, allowIdle: false
      });
      status.textContent = `${speaking ? (paused ? "句中停顿" : (realMode ? "真实音频播放" : "模拟说话")) : "已停止"}\n情绪：${sample.delivery}\n台词提示：${cue ? "有效" : "已释放"}\n语音姿态：${sample.speechGesture || "休息"}\n已用姿态：${sample.speechGestureHistory.join(" / ") || "无"}\n姿态次数：${sample.speechGestureCount}\n音量：${level.toFixed(2)}\n强调次数：${sample.speechAccentCount}\n身体偏转：${(sample.parameters.ParamBodyAngleY || 0).toFixed(2)}`;
    });
    status.textContent = "模型已就绪";
  } catch (error) { status.textContent = `加载失败：${error.message}`; }
})();
