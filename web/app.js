(function () {
  const modules = [
    'apiClient',
    'chat',
    'voice',
    'live2dController',
    'personaCard',
    'schedulePanel',
    'onboarding',
    'desktopBridge'
  ];

  window.TaffyWebBundle = Object.freeze({
    version: 'split-20260427',
    modules
  });
}());
