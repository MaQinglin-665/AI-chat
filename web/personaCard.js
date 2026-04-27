(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.personaCard = {
    open: () => {
      if (typeof window.openPersonaPanel === 'function') {
        window.openPersonaPanel();
      }
    },
    close: () => {
      if (typeof window.closePersonaPanel === 'function') {
        window.closePersonaPanel();
      }
    },
    save: () => {
      if (typeof window.savePersonaCardFromForm === 'function') {
        return window.savePersonaCardFromForm();
      }
      return Promise.resolve(false);
    }
  };
}());
