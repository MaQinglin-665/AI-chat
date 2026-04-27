(() => {
  const toFixedText = (value, digits) => Number(value).toFixed(digits);

  const initConfigPreview = () => {
    const form = document.getElementById('configForm');
    const preview = document.getElementById('configPreview');

    if (!form || !preview) {
      return;
    }

    const controls = {
      petName: document.getElementById('petName'),
      modelName: document.getElementById('modelName'),
      customModelName: document.getElementById('customModelName'),
      temperature: document.getElementById('temperature'),
      voiceEngine: document.getElementById('voiceEngine'),
      speechRate: document.getElementById('speechRate'),
      wakeWord: document.getElementById('wakeWord'),
      memoryEnabled: document.getElementById('memoryEnabled'),
      emotionIntensity: document.getElementById('emotionIntensity')
    };
    const customModelRow = document.getElementById('customModelRow');

    const resolveModelName = () => {
      if (controls.modelName.value !== 'custom') {
        return controls.modelName.value;
      }

      const customName = String(controls.customModelName?.value || '').trim();
      return customName || 'qwen-max-latest';
    };

    const labels = {
      temperature: document.getElementById('temperatureValue'),
      speechRate: document.getElementById('speechRateValue'),
      emotionIntensity: document.getElementById('emotionIntensityValue')
    };

    const buildConfig = () => ({
      pet: {
        name: controls.petName.value || '馨语AI桌宠',
        wake_word: controls.wakeWord.value || '塔菲'
      },
      llm: {
        model: resolveModelName(),
        temperature: Number(controls.temperature.value)
      },
      voice: {
        engine: controls.voiceEngine.value,
        rate: Number(controls.speechRate.value)
      },
      memory: {
        enabled: controls.memoryEnabled.checked
      },
      emotion: {
        intensity: Number(controls.emotionIntensity.value)
      }
    });

    const render = () => {
      const useCustomModel = controls.modelName.value === 'custom';
      if (customModelRow) {
        customModelRow.style.display = useCustomModel ? '' : 'none';
      }

      labels.temperature.textContent = toFixedText(controls.temperature.value, 2);
      labels.speechRate.textContent = toFixedText(controls.speechRate.value, 2);
      labels.emotionIntensity.textContent = toFixedText(controls.emotionIntensity.value, 1);

      const config = buildConfig();
      preview.textContent = JSON.stringify(config, null, 2);
    };

    Object.values(controls).forEach((control) => {
      if (!control) {
        return;
      }

      const eventName = control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'input';
      control.addEventListener(eventName, render);

      if (eventName === 'change') {
        control.addEventListener('input', render);
      }
    });

    render();
  };

  document.addEventListener('DOMContentLoaded', initConfigPreview);
})();
