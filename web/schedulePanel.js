(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.schedulePanel = {
    open: () => {
      if (typeof window.openSchedulePanel === 'function') {
        window.openSchedulePanel();
      }
    },
    close: () => {
      if (typeof window.closeSchedulePanel === 'function') {
        window.closeSchedulePanel();
      }
    },
    saveFromForm: () => {
      if (typeof window.saveScheduleFromForm === 'function') {
        return window.saveScheduleFromForm();
      }
      return false;
    }
  };
}());
