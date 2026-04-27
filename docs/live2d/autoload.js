(() => {
  const IS_FILE_PROTOCOL = window.location.protocol === 'file:';

  const LIVE2D_BASE = (() => {
    const currentScript = document.currentScript?.src;
    if (currentScript) {
      return new URL('.', currentScript).toString();
    }

    const matched = Array.from(document.scripts)
      .map((item) => item.src)
      .find((src) => /\/live2d\/autoload\.js(?:\?|#|$)/.test(src));
    if (matched) {
      return new URL('.', matched).toString();
    }

    return new URL('live2d/', window.location.href).toString();
  })();

  const SCRIPT_CANDIDATES = [
    {
      name: 'PIXI',
      urls: [
        'vendor/pixi.min.js',
        'https://cdn.jsdelivr.net/npm/pixi.js@7.x/dist/pixi.min.js'
      ]
    },
    {
      name: 'CubismCore',
      urls: [
        'vendor/live2dcubismcore.min.js',
        'https://cubism.live2d.com/sdk-web/cubismsdkforweb-5-r.1/Core/live2d.min.js'
      ]
    },
    {
      name: 'pixi-live2d-display',
      urls: [
        'vendor/cubism4.min.js',
        'https://cdn.jsdelivr.net/npm/pixi-live2d-display/dist/cubism4.min.js'
      ]
    }
  ];

  const MODEL_URLS = IS_FILE_PROTOCOL
    ? [
        'models/hiyori_pro_t11/hiyori_pro_t11.model3.json',
        'models/haru_greeter_t03/haru_greeter_t03.model3.json',
        'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'
      ]
    : [
        'models/hiyori_pro_t11/hiyori_pro_t11.model3.json',
        'models/haru_greeter_t03/haru_greeter_t03.model3.json',
        'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json'
      ];

  const toAbsUrl = (src) => {
    if (/^https?:\/\//i.test(src) || /^file:\/\//i.test(src)) {
      return src;
    }
    return new URL(src, LIVE2D_BASE).toString();
  };

  const loadScript = (src) => new Promise((resolve, reject) => {
    const absSrc = toAbsUrl(src);
    const existed = Array.from(document.scripts).find((item) => item.src === absSrc);

    if (existed) {
      if (existed.dataset.loaded === '1') {
        resolve();
      } else {
        existed.addEventListener('load', resolve, { once: true });
        existed.addEventListener('error', () => reject(new Error(`脚本加载失败: ${src}`)), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = absSrc;
    script.async = true;
    if (/^https?:\/\//i.test(absSrc)) {
      script.crossOrigin = 'anonymous';
    }
    script.onload = () => {
      script.dataset.loaded = '1';
      resolve();
    };
    script.onerror = () => reject(new Error(`脚本加载失败: ${src}`));
    document.head.appendChild(script);
  });

  const loadFirstAvailableScript = async (name, urls) => {
    const errors = [];

    for (const url of urls) {
      try {
        await loadScript(url);
        return toAbsUrl(url);
      } catch (error) {
        errors.push(url);
      }
    }

    throw new Error(`${name} 加载失败：${errors.join(' | ')}`);
  };

  const loadTips = async () => {
    try {
      const response = await fetch(toAbsUrl('waifu-tips.json'), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('提示词读取失败');
      }

      const tips = await response.json();
      return Array.isArray(tips) && tips.length ? tips : [];
    } catch (error) {
      return [];
    }
  };

  const createWidget = () => {
    const existed = document.querySelector('.live2d-widget');
    if (existed) {
      return {
        widget: existed,
        canvas: existed.querySelector('.live2d-canvas'),
        bubble: existed.querySelector('.live2d-bubble'),
        fallback: existed.querySelector('.live2d-fallback')
      };
    }

    const widget = document.createElement('div');
    widget.className = 'live2d-widget';

    const canvas = document.createElement('canvas');
    canvas.className = 'live2d-canvas';
    canvas.width = 280;
    canvas.height = 350;

    const fallback = document.createElement('div');
    fallback.className = 'live2d-fallback';
    fallback.innerHTML = '<span class="emoji">🎀</span><p>Live2D 加载中...</p>';

    const bubble = document.createElement('div');
    bubble.className = 'live2d-bubble';
    bubble.textContent = '欢迎来到馨语Ai桌宠主页！';

    widget.appendChild(canvas);
    widget.appendChild(fallback);
    widget.appendChild(bubble);
    document.body.appendChild(widget);

    return { widget, canvas, bubble, fallback };
  };

  const randomPick = (items) => items[Math.floor(Math.random() * items.length)];

  const loadModelWithFallback = async (Live2DModel) => {
    const errors = [];

    for (const modelUrl of MODEL_URLS) {
      const resolvedUrl = toAbsUrl(modelUrl);
      try {
        const model = await Live2DModel.from(resolvedUrl);
        return { model, usedUrl: resolvedUrl };
      } catch (error) {
        errors.push(`${resolvedUrl} -> ${error?.message || '未知错误'}`);
      }
    }

    throw new Error(errors.join(' | '));
  };

  const initLive2D = async () => {
    const { widget, canvas, bubble, fallback } = createWidget();

    if (IS_FILE_PROTOCOL && fallback) {
      fallback.innerHTML = '<span class="emoji">🎀</span><p>正在尝试远程模型...</p>';
    }

    try {
      const loadedScripts = [];
      for (const item of SCRIPT_CANDIDATES) {
        const used = await loadFirstAvailableScript(item.name, item.urls);
        loadedScripts.push(`${item.name}: ${used}`);
      }
      console.info('[馨语Ai桌宠 Live2D] 脚本来源:', loadedScripts.join(' | '));

      const tips = await loadTips();

      const app = new window.PIXI.Application({
        view: canvas,
        width: 280,
        height: 350,
        autoStart: true,
        antialias: true,
        backgroundAlpha: 0
      });

      const Live2DModel = window.PIXI?.live2d?.Live2DModel;
      if (!Live2DModel) {
        if (fallback) {
          fallback.innerHTML = '<span class="emoji">⚠️</span><p>Live2D 组件未就绪</p>';
        }
        return;
      }

      const { model, usedUrl } = await loadModelWithFallback(Live2DModel);
      app.stage.addChild(model);
      console.info('[馨语Ai桌宠 Live2D] 模型来源:', usedUrl);

      const fitScale = Math.min((app.renderer.height * 0.88) / model.height, (app.renderer.width * 0.9) / model.width);
      model.scale.set(fitScale);

      if (model.anchor && typeof model.anchor.set === 'function') {
        model.anchor.set(0.5, 1);
      }

      model.x = app.renderer.width * 0.5;
      model.y = app.renderer.height * 0.98;
      model.interactive = true;

      if (fallback) {
        fallback.remove();
      }
      widget.classList.add('ready');

      const showBubble = (text) => {
        if (!text) {
          return;
        }

        bubble.textContent = text;
        bubble.classList.add('visible');
        window.clearTimeout(showBubble.timer);
        showBubble.timer = window.setTimeout(() => {
          bubble.classList.remove('visible');
        }, 2600);
      };

      const showRandomTip = () => {
        const text = tips.length ? randomPick(tips) : '欢迎来到馨语Ai桌宠主页！';
        showBubble(text);
      };

      window.addEventListener('pointermove', (event) => {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;

        if (typeof model.focus === 'function') {
          model.focus(x, -y);
        }
      });

      widget.addEventListener('mouseenter', showRandomTip);
      widget.addEventListener('click', showRandomTip);

      window.setTimeout(showRandomTip, 1200);
      window.setInterval(showRandomTip, 22000);
    } catch (error) {
      if (fallback) {
        const message = String(error?.message || '未知错误').slice(0, 260);
        fallback.innerHTML = `<span class="emoji">⚠️</span><p>模型加载失败</p><small>${message}</small>`;
      }
      console.warn('[馨语Ai桌宠 Live2D] 初始化失败', error);
    }
  };

  document.addEventListener('DOMContentLoaded', initLive2D);
})();
