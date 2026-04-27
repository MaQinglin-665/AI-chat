(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.onboarding = {
    open: () => {
      if (typeof window.openOnboardingModal === 'function') {
        window.openOnboardingModal({ force: true });
      }
    },
    close: () => {
      if (typeof window.closeOnboardingModal === 'function') {
        window.closeOnboardingModal();
      }
    },
    openHelp: () => {
      if (typeof window.openHelpModal === 'function') {
        window.openHelpModal();
      }
    }
  };
}());
