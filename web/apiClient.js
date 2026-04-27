(function () {
  const ns = (window.TaffyModules = window.TaffyModules || {});
  ns.apiClient = {
    resolveApiToken: (...args) => (typeof window.resolveApiToken === 'function' ? window.resolveApiToken(...args) : Promise.resolve('')),
    authFetch: (...args) => (typeof window.authFetch === 'function' ? window.authFetch(...args) : fetch(...args)),
    clearPersistedApiToken: () => {
      if (typeof window.clearPersistedApiToken === 'function') {
        window.clearPersistedApiToken();
      }
    }
  };
}());
