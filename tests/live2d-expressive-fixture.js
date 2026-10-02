"use strict";
(async function () {
  const status = document.getElementById("status");
  try {
    const app = new PIXI.Application({ width: 600, height: 760, backgroundAlpha: 0, antialias: true });
    document.getElementById("stage").appendChild(app.view);
    const model = await PIXI.live2d.Live2DModel.from("/models/hiyori_pro_t11/hiyori_pro_t11.model3.json", { autoInteract: false });
    model.scale.set(Math.min(550 / model.width, 720 / model.height));
    model.anchor.set(0.5, 0.5); model.position.set(300, 395); app.stage.addChild(model);
    let speaking = false, paused = false, started = 0;
    const state = { model, uiView: "full", modelProfileName: "hiyori_pro_t11", ttsPlaybackGeneration: 0 };
    const controller = TaffyLive2DExpressionController.createController({
      state, hiyoriPerformanceDirector: TaffyHiyoriPerformanceDirector,
      isSpeakingNow: () => speaking, isSpeechMotionActive: () => speaking
    });
    const lines = { playful: "哼哼，这次是不是该夸夸我啦？", excited: "好耶！我们真的做到了！", shy: "你这样夸，我会不好意思的……", thinking: "嗯？让我想想，这里是不是少了一步？", sad: "有点难过，陪我待一会儿吧。", surprised: "欸？真的假的！", serious: "认真说，先把最重要的这一步做好。" };
    const emotion = document.getElementById("emotion");
    const showLine = () => { document.getElementById("line").textContent = lines[emotion.value]; };
    emotion.addEventListener("change", showLine); showLine();
    document.getElementById("play").onclick = () => {
      controller.endSpeechAnimation();
      speaking = true; paused = false; started = performance.now(); state.ttsPlaybackGeneration++;
      controller.beginSpeechAnimation(lines[emotion.value], "idle", "neutral", {
        durationMs: 30000,
        performanceCue: { emotion: emotion.value, action: "nod", speech: { holdMs: 500 } }
      });
    };
    document.getElementById("pause").onclick = () => { paused = !paused; };
    const finish = () => { speaking = false; paused = false; controller.finishSpeechAnimation(); };
    document.getElementById("finish").onclick = finish;
    document.getElementById("stop").onclick = () => {
      speaking = false; paused = false; state.ttsPlaybackGeneration++;
      controller.endSpeechAnimation();
    };
    model.internalModel.on("beforeModelUpdate", () => {
      const now = performance.now(), phase = ((now - started) % 1250) / 1250;
      if (speaking && now - started >= 30000) finish();
      const cue = controller.getActiveSpeechPerformanceCue(now);
      const level = speaking && !paused && phase < 0.6 ? Math.sin(phase / 0.6 * Math.PI) * 0.9 : 0;
      const core = model.internalModel.coreModel;
      core.setParameterValueById("ParamMouthOpenY", level * 0.8);
      const sample = controller.applyHiyoriPerformanceLayer(core, {
        now, speaking, audioActive: speaking, emotion: cue?.emotion || "neutral",
        audioLevel: level, bodyEnergy: level, playbackGeneration: state.ttsPlaybackGeneration,
        motionIntensity: document.getElementById("intensity").value, allowIdle: false
      });
      status.textContent = `${speaking ? (paused ? "句中停顿" : "模拟说话") : "已停止"}\n情绪：${sample.delivery}\n台词提示：${cue ? "有效" : "已释放"}\n句内动作：${sample.action || "无"}\n音量：${level.toFixed(2)}\n强调次数：${sample.speechAccentCount}\n身体偏转：${(sample.parameters.ParamBodyAngleY || 0).toFixed(2)}`;
    });
    status.textContent = "模型已就绪";
  } catch (error) { status.textContent = `加载失败：${error.message}`; }
})();
