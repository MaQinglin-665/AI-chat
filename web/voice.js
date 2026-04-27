(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.voice = {
    init: () => {
      if (typeof window.initTTS === 'function') {
        window.initTTS();
      }
    },
    speak: (text, opts) => {
      if (typeof window.speak === 'function') {
        return window.speak(text, opts || {});
      }
      return Promise.resolve(false);
    }
  };
}());
