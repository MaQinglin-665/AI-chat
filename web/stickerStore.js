(function (root) {
  "use strict";

  const DB_NAME = "taffy_stickers_v1";
  const DB_VERSION = 1;
  const STORE_NAME = "user_stickers";

  function getIndexedDB(windowObject = root) {
    return windowObject.indexedDB || windowObject.mozIndexedDB || windowObject.webkitIndexedDB || null;
  }

  function openDatabase(deps = {}) {
    const indexedDB = deps.indexedDB || getIndexedDB(deps.windowObject || root);
    if (!indexedDB || typeof indexedDB.open !== "function") {
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("open sticker database failed"));
    });
  }

  function withStore(mode, callback, deps = {}) {
    return openDatabase(deps).then((db) => {
      if (!db) {
        return callback(null);
      }
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        let result;
        tx.oncomplete = () => {
          try {
            db.close();
          } catch (_) {
            // ignore
          }
          resolve(result);
        };
        tx.onerror = () => {
          try {
            db.close();
          } catch (_) {
            // ignore
          }
          reject(tx.error || new Error("sticker database transaction failed"));
        };
        try {
          result = callback(store);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function requestToPromise(req, fallback) {
    return new Promise((resolve, reject) => {
      if (!req) {
        resolve(fallback);
        return;
      }
      req.onsuccess = () => resolve(req.result == null ? fallback : req.result);
      req.onerror = () => reject(req.error || new Error("sticker database request failed"));
    });
  }

  async function loadUserStickers(deps = {}) {
    const items = await withStore("readonly", async (store) => {
      if (!store) {
        return [];
      }
      return await requestToPromise(store.getAll(), []);
    }, deps);
    return (Array.isArray(items) ? items : [])
      .filter((item) => item && item.source === "user")
      .sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
  }

  async function saveUserSticker(sticker, deps = {}) {
    if (!sticker || !sticker.id) {
      return null;
    }
    await withStore("readwrite", (store) => {
      if (!store) {
        return null;
      }
      store.put({ ...sticker, source: "user" });
      return null;
    }, deps);
    return sticker;
  }

  async function deleteUserSticker(id, deps = {}) {
    const target = String(id || "").trim();
    if (!target) {
      return false;
    }
    await withStore("readwrite", (store) => {
      if (!store) {
        return null;
      }
      store.delete(target);
      return null;
    }, deps);
    return true;
  }

  const api = {
    DB_NAME,
    DB_VERSION,
    STORE_NAME,
    deleteUserSticker,
    loadUserStickers,
    openDatabase,
    saveUserSticker
  };

  root.TaffyStickerStore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
