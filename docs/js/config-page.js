(() => {
  const getElement = (id) => document.getElementById(id);

  const getDecimalDigits = (stepValue) => {
    const stepText = String(stepValue ?? '');
    if (!stepText.includes('.')) {
      return 0;
    }

    return stepText.split('.')[1].length;
  };

  const splitList = (rawText) => String(rawText ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const setByPath = (target, path, value) => {
    const keys = String(path).split('.');
    let cursor = target;

    for (let i = 0; i < keys.length - 1; i += 1) {
      const key = keys[i];
      if (!Object.prototype.hasOwnProperty.call(cursor, key) || typeof cursor[key] !== 'object' || cursor[key] === null || Array.isArray(cursor[key])) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }

    cursor[keys[keys.length - 1]] = value;
  };

  const getByPath = (target, path) => String(path)
    .split('.')
    .reduce((cursor, key) => (cursor && typeof cursor === 'object' ? cursor[key] : undefined), target);

  const readFieldValue = (field) => {
    const kind = field.dataset.kind || '';
    const type = (field.type || '').toLowerCase();

    if (type === 'checkbox') {
      return field.checked;
    }

    if (kind === 'list') {
      return splitList(field.value);
    }

    if (type === 'number' || type === 'range') {
      const numValue = Number(field.value);
      return Number.isFinite(numValue) ? numValue : 0;
    }

    return field.value;
  };

  const writeFieldValue = (field, nextValue) => {
    if (typeof nextValue === 'undefined') {
      return;
    }

    const kind = field.dataset.kind || '';
    const type = (field.type || '').toLowerCase();

    if (type === 'checkbox') {
      field.checked = Boolean(nextValue);
      return;
    }

    if (kind === 'list') {
      if (Array.isArray(nextValue)) {
        field.value = nextValue.join('\n');
      } else {
        field.value = String(nextValue ?? '');
      }
      return;
    }

    if (type === 'number' || type === 'range') {
      const numValue = Number(nextValue);
      if (Number.isFinite(numValue)) {
        field.value = String(numValue);
      }
      return;
    }

    field.value = String(nextValue ?? '');
  };

  const updateRangeBadge = (field) => {
    if ((field.type || '').toLowerCase() !== 'range') {
      return;
    }

    const targetId = field.dataset.valueTarget;
    if (!targetId) {
      return;
    }

    const target = getElement(targetId);
    if (!target) {
      return;
    }

    const digits = getDecimalDigits(field.step);
    const currentNumber = Number(field.value);
    target.textContent = Number.isFinite(currentNumber)
      ? currentNumber.toFixed(digits)
      : field.value;
  };

  const collectConfig = (fields) => {
    const output = {};

    fields.forEach((field) => {
      const path = field.dataset.path;
      if (!path) {
        return;
      }

      setByPath(output, path, readFieldValue(field));
    });

    return output;
  };

  const applyConfig = (fields, config) => {
    fields.forEach((field) => {
      const path = field.dataset.path;
      if (!path) {
        return;
      }

      const value = getByPath(config, path);
      if (typeof value === 'undefined') {
        return;
      }

      writeFieldValue(field, value);
      updateRangeBadge(field);
    });
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const downloadJson = (content, filename) => {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const API_TOKEN_STORAGE_KEYS = ['taffy_api_token', 'TAFFY_API_TOKEN'];
  let apiTokenPromise = null;

  const readApiTokenFromStorage = () => {
    try {
      const query = new URLSearchParams(window.location.search || '');
      const queryToken = String(query.get('api_token') || '').trim();
      if (queryToken) {
        try {
          localStorage.setItem(API_TOKEN_STORAGE_KEYS[0], queryToken);
        } catch (_) {
          // ignore storage failures
        }
        return queryToken;
      }
    } catch (_) {
      // ignore
    }

    for (const key of API_TOKEN_STORAGE_KEYS) {
      try {
        const value = String(localStorage.getItem(key) || '').trim();
        if (value) {
          return value;
        }
      } catch (_) {
        // ignore storage failures
      }
    }
    return '';
  };

  const resolveApiToken = async () => {
    if (apiTokenPromise) {
      return apiTokenPromise;
    }
    apiTokenPromise = (async () => {
      let token = readApiTokenFromStorage();
      if (!token && window.electronAPI && typeof window.electronAPI.getApiToken === 'function') {
        try {
          token = String(await window.electronAPI.getApiToken() || '').trim();
        } catch (_) {
          token = '';
        }
      }
      if (token) {
        try {
          localStorage.setItem(API_TOKEN_STORAGE_KEYS[0], token);
        } catch (_) {
          // ignore storage failures
        }
      }
      return token;
    })();
    return apiTokenPromise;
  };

  const isApiUrl = (url) => {
    try {
      const target = new URL(String(url || ''), window.location.href);
      return target.pathname.startsWith('/api/');
    } catch (_) {
      return false;
    }
  };

  const buildAuthHeaders = async (url, baseHeaders = {}, requestMode = '') => {
    const headers = new Headers(baseHeaders || {});
    if (String(requestMode || '').toLowerCase() === 'no-cors') {
      return headers;
    }
    if (!isApiUrl(url)) {
      return headers;
    }
    if (headers.has('X-Taffy-Token') || headers.has('Authorization')) {
      return headers;
    }
    const token = await resolveApiToken();
    if (token) {
      headers.set('X-Taffy-Token', token);
    }
    return headers;
  };

  const initLlmModelPreset = (onModelChange) => {
    const presetSelect = getElement('llmModelPreset');
    const modelInput = getElement('llmModelInput');
    if (!presetSelect || !modelInput) {
      return () => {};
    }

    const knownModels = [
      'qwen-plus',
      'qwen-turbo',
      'deepseek-chat',
      'gpt-4o-mini'
    ];

    const syncPresetFromInput = () => {
      const current = String(modelInput.value || '').trim();
      if (knownModels.includes(current)) {
        presetSelect.value = current;
        modelInput.readOnly = true;
        modelInput.classList.remove('is-custom-model');
        return;
      }

      presetSelect.value = 'custom';
      modelInput.readOnly = false;
      modelInput.classList.add('is-custom-model');
    };

    const applyPresetToInput = () => {
      const selected = presetSelect.value;
      if (selected === 'custom') {
        modelInput.readOnly = false;
        modelInput.classList.add('is-custom-model');
        const currentValue = String(modelInput.value || '').trim();
        if (!currentValue || knownModels.includes(currentValue)) {
          modelInput.value = 'qwen-max-latest';
        }
      } else {
        modelInput.value = selected;
        modelInput.readOnly = true;
        modelInput.classList.remove('is-custom-model');
      }

      if (typeof onModelChange === 'function') {
        onModelChange();
      }
    };

    presetSelect.addEventListener('change', applyPresetToInput);
    modelInput.addEventListener('input', syncPresetFromInput);

    syncPresetFromInput();
    return syncPresetFromInput;
  };

  const initSidebarNavigation = () => {
    const sideLinks = Array.from(document.querySelectorAll('.config-side-link[href^="#"]'));
    if (!sideLinks.length) {
      return;
    }

    const targets = sideLinks
      .map((link) => {
        const id = (link.getAttribute('href') || '').slice(1);
        const section = id ? document.getElementById(id) : null;
        return { link, section };
      })
      .filter((item) => Boolean(item.section));

    if (!targets.length) {
      return;
    }

    const activate = (id) => {
      let hasActive = false;

      targets.forEach(({ link, section }) => {
        const isActive = section.id === id;
        link.classList.toggle('active', isActive);
        if (isActive) {
          hasActive = true;
          const group = link.closest('.sidebar-group');
          if (group) {
            group.open = true;
          }
        }
      });

      if (!hasActive && targets[0]) {
        targets[0].link.classList.add('active');
      }
    };

    const resolveActiveIdByScroll = () => {
      const marker = window.scrollY + 170;
      let activeId = targets[0].section.id;

      targets.forEach(({ section }) => {
        if (section.offsetTop <= marker) {
          activeId = section.id;
        }
      });

      return activeId;
    };

    sideLinks.forEach((link) => {
      link.addEventListener('click', () => {
        const parentGroup = link.closest('.sidebar-group');
        if (parentGroup) {
          parentGroup.open = true;
        }
      });
    });

    window.addEventListener('scroll', () => {
      activate(resolveActiveIdByScroll());
    }, { passive: true });

    window.addEventListener('hashchange', () => {
      const hashId = decodeURIComponent((window.location.hash || '').replace('#', ''));
      if (hashId) {
        activate(hashId);
      } else {
        activate(resolveActiveIdByScroll());
      }
    });

    const initialHash = decodeURIComponent((window.location.hash || '').replace('#', ''));
    if (initialHash) {
      activate(initialHash);
      return;
    }

    activate(resolveActiveIdByScroll());
  };

  const init = () => {
    const form = getElement('advancedConfigForm');
    const preview = getElement('advancedConfigPreview');
    const copyButton = getElement('copyAdvancedConfigBtn');
    const downloadButton = getElement('downloadAdvancedConfigBtn');
    const resetButton = getElement('resetAdvancedConfigBtn');
    const importInput = getElement('importConfigJson');
    const applyImportButton = getElement('applyImportConfigBtn');
    const pickConfigDirButton = getElement('pickConfigDirBtn');
    const useLastConfigDirButton = getElement('useLastConfigDirBtn');
    const previewConfigDiffButton = getElement('previewConfigDiffBtn');
    const writeConfigToProjectButton = getElement('writeConfigToProjectBtn');
    const rollbackConfigFromBackupButton = getElement('rollbackConfigFromBackupBtn');
    const templateStatus = getElement('templateStatus');
    const configDirStatus = getElement('configDirStatus');
    const configDiffPanel = getElement('configDiffPanel');
    const configDiffSummary = getElement('configDiffSummary');
    const configDiffList = getElement('configDiffList');
    const runtimeReloadUrl = getElement('runtimeReloadUrl');
    const applyConfigToRuntimeButton = getElement('applyConfigToRuntimeBtn');
    const runtimeApplyStatus = getElement('runtimeApplyStatus');
    const runtimeRestartUrl = getElement('runtimeRestartUrl');
    const restartRuntimeButton = getElement('restartRuntimeBtn');
    const runtimeRestartStatus = getElement('runtimeRestartStatus');
    const oneClickApplyButton = getElement('oneClickApplyBtn');
    const oneClickApplyStatus = getElement('oneClickApplyStatus');
    const checkConnectivityButton = getElement('checkConnectivityBtn');
    const connectivityStatus = getElement('connectivityStatus');
    const connectivityList = getElement('connectivityList');
    const ttsModePreset = getElement('ttsModePreset');
    const applyTtsModePresetButton = getElement('applyTtsModePresetBtn');
    const ttsModePresetStatus = getElement('ttsModePresetStatus');
    const noviceModeToggleButton = getElement('noviceModeToggleBtn');
    const noviceModeField = getElement('noviceModeField');
    const noviceModeStatus = getElement('noviceModeStatus');
    const quickStartStatus = getElement('quickStartStatus');
    const applyBeginnerSafePresetButton = getElement('applyBeginnerSafePresetBtn');
    const beginnerSafePresetStatus = getElement('beginnerSafePresetStatus');
    const toast = getElement('toast');

    if (!form || !preview) {
      return;
    }

    initSidebarNavigation();

    let runPreviewDiffAction = async () => ({ ok: false, code: 'not_ready', message: '写入功能尚未初始化。' });
    let runWriteConfigAction = async () => ({ ok: false, code: 'not_ready', message: '写入功能尚未初始化。' });
    let runRuntimeReloadAction = async () => ({ ok: false, code: 'not_ready', message: '运行中重载尚未初始化。' });
    let runRuntimeRestartAction = async () => ({ ok: false, code: 'not_ready', message: '运行中重启尚未初始化。' });

    let syncLlmModelPreset = () => {};
    let syncTtsModePreset = () => {};
    let syncTtsFieldVisibility = () => {};
    let syncQuickStartStatus = () => {};
    let syncNoviceMode = () => {};
    let isNoviceMode = true;
    syncLlmModelPreset = initLlmModelPreset(() => {
      renderPreview();
    });

    const fields = Array.from(form.querySelectorAll('[data-path]'));
    if (!fields.length) {
      return;
    }

    const fieldByPath = new Map(
      fields
        .filter((field) => field.dataset.path)
        .map((field) => [field.dataset.path, field])
    );

    const requiredPaths = new Set([
      'assistant_name',
      'model_path',
      'server.host',
      'server.port',
      'llm.provider',
      'llm.model',
      'llm.base_url',
      'tts.provider'
    ]);

    const urlPaths = new Set([
      'llm.base_url',
      'tts.gpt_sovits_api_url',
      'tts.api_url'
    ]);

    const ensureFieldErrorElement = (field) => {
      const container = field.closest('.field');
      if (!container) {
        return null;
      }

      let errorNode = container.querySelector('.field-error');
      if (errorNode) {
        return errorNode;
      }

      errorNode = document.createElement('small');
      errorNode.className = 'field-error';
      errorNode.hidden = true;
      container.appendChild(errorNode);
      return errorNode;
    };

    const clearFieldError = (field) => {
      const container = field.closest('.field');
      if (container) {
        container.classList.remove('is-invalid');
      }

      field.removeAttribute('aria-invalid');
      const errorNode = ensureFieldErrorElement(field);
      if (errorNode) {
        errorNode.hidden = true;
        errorNode.textContent = '';
      }
    };

    const setFieldError = (field, message) => {
      const container = field.closest('.field');
      if (container) {
        container.classList.add('is-invalid');
      }

      field.setAttribute('aria-invalid', 'true');
      const errorNode = ensureFieldErrorElement(field);
      if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent = message;
      }
    };

    const isHttpUrl = (text) => {
      const value = String(text || '').trim();
      if (!value) {
        return false;
      }

      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch (error) {
        return false;
      }
    };

    const shouldValidateUrlPath = (path) => {
      if (path === 'tts.gpt_sovits_api_url') {
        const provider = String(readFieldValue(fieldByPath.get('tts.provider')) || '').trim().toLowerCase();
        return provider === 'gpt_sovits';
      }
      if (path === 'tts.api_url') {
        const provider = String(readFieldValue(fieldByPath.get('tts.provider')) || '').trim().toLowerCase();
        return provider === 'volcengine_tts' || provider === 'volcengine';
      }
      return true;
    };

    const resolveLlmProvider = () => String(readFieldValue(fieldByPath.get('llm.provider')) || '').trim().toLowerCase();
    const llmRequiresApiKey = (provider) => {
      const resolved = String(provider || resolveLlmProvider()).trim().toLowerCase();
      return resolved !== 'ollama';
    };
    const getSuggestedLlmApiKeyEnv = (provider) => {
      const resolved = String(provider || resolveLlmProvider()).trim().toLowerCase();
      if (resolved === 'openai') {
        return 'OPENAI_API_KEY';
      }
      return 'DASHSCOPE_API_KEY';
    };

    const validateField = (field, { silent = false } = {}) => {
      const path = field.dataset.path || '';
      const type = (field.type || '').toLowerCase();
      const rawValue = readFieldValue(field);
      let message = '';

      if (requiredPaths.has(path)) {
        if (type === 'checkbox') {
          // Required checkbox is always valid for this page.
        } else if (Array.isArray(rawValue)) {
          if (!rawValue.length) {
            message = '此项不能为空。';
          }
        } else if (String(rawValue ?? '').trim() === '') {
          message = '此项不能为空。';
        }
      }

      if (!message && urlPaths.has(path) && shouldValidateUrlPath(path)) {
        const text = String(rawValue ?? '').trim();
        if (text && !isHttpUrl(text)) {
          message = '请输入合法的 URL（http 或 https）。';
        }
      }

      if (!message && (type === 'number' || type === 'range')) {
        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
          message = '请输入合法数字。';
        } else {
          const min = field.min !== '' ? Number(field.min) : null;
          const max = field.max !== '' ? Number(field.max) : null;
          if (min !== null && numeric < min) {
            message = `不能小于 ${min}。`;
          } else if (max !== null && numeric > max) {
            message = `不能大于 ${max}。`;
          }
        }
      }

      if (!message && path === 'server.host') {
        const host = String(rawValue || '').trim();
        if (host.length < 2) {
          message = 'Host 过短，请检查。';
        }
      }

      if (!message && path === 'llm.model') {
        const model = String(rawValue || '').trim();
        if (model.length < 2) {
          message = '模型名称至少 2 个字符。';
        }
      }

      // `python` / `python3` command names are valid in PATH and should not block
      // onboarding or connectivity checks. Keep this field non-blocking here.

      if (!silent) {
        if (message) {
          setFieldError(field, message);
        } else {
          clearFieldError(field);
        }
      }

      return {
        valid: !message,
        path,
        message
      };
    };

    const setPathError = (path, message, { silent = false } = {}) => {
      const target = fieldByPath.get(path);
      if (!target) {
        return null;
      }

      if (!silent) {
        setFieldError(target, message);
      }

      return {
        valid: false,
        path,
        message
      };
    };

    const validateCrossRules = ({ silent = false } = {}) => {
      const issues = [];
      const getNumber = (path) => {
        const field = fieldByPath.get(path);
        if (!field) {
          return null;
        }
        const value = Number(readFieldValue(field));
        return Number.isFinite(value) ? value : null;
      };

      const autoMin = getNumber('observe.auto_chat_min_ms');
      const autoMax = getNumber('observe.auto_chat_max_ms');
      if (autoMin !== null && autoMax !== null && autoMin > autoMax) {
        const issue = setPathError('observe.auto_chat_max_ms', '最大间隔不能小于最小间隔。', { silent });
        if (issue) {
          issues.push(issue);
        }
      }

      const width = getNumber('desktop.width');
      const minWidth = getNumber('desktop.min_width');
      if (width !== null && minWidth !== null && minWidth > width) {
        const issue = setPathError('desktop.min_width', '最小宽度不能大于窗口宽度。', { silent });
        if (issue) {
          issues.push(issue);
        }
      }

      const height = getNumber('desktop.height');
      const minHeight = getNumber('desktop.min_height');
      if (height !== null && minHeight !== null && minHeight > height) {
        const issue = setPathError('desktop.min_height', '最小高度不能大于窗口高度。', { silent });
        if (issue) {
          issues.push(issue);
        }
      }

      const llmProvider = resolveLlmProvider();
      const llmApiKeyEnv = String(readFieldValue(fieldByPath.get('llm.api_key_env')) || '').trim();
      if (llmRequiresApiKey(llmProvider) && !llmApiKeyEnv) {
        const issue = setPathError('llm.api_key_env', '当前 LLM Provider 需要 API Key 环境变量名。', { silent });
        if (issue) {
          issues.push(issue);
        }
      }

      return issues;
    };

    const validateEndpointField = (input, emptyMessage, invalidMessage, { silent = false } = {}) => {
      if (!input) {
        return { valid: true };
      }

      const value = String(input.value || '').trim();
      let valid = true;
      let message = '';

      if (!value) {
        valid = false;
        message = emptyMessage;
      } else if (!isHttpUrl(value)) {
        valid = false;
        message = invalidMessage;
      }

      const container = input.closest('.field');
      if (!silent && container) {
        container.classList.toggle('is-invalid', !valid);
        let errorNode = container.querySelector('.field-error');
        if (!errorNode) {
          errorNode = document.createElement('small');
          errorNode.className = 'field-error';
          container.appendChild(errorNode);
        }
        errorNode.hidden = valid;
        errorNode.textContent = valid ? '' : message;
      }

      return { valid, message };
    };

    const validateRuntimeUrl = ({ silent = false } = {}) => validateEndpointField(
      runtimeReloadUrl,
      '请填写重载接口 URL。',
      '重载接口 URL 格式错误。',
      { silent }
    );

    const validateRuntimeRestartUrl = ({ silent = false } = {}) => validateEndpointField(
      runtimeRestartUrl,
      '请填写重启接口 URL。',
      '重启接口 URL 格式错误。',
      { silent }
    );

    const validateForm = ({ silent = false, focusFirst = false } = {}) => {
      const issues = [];
      fields.forEach((field) => {
        const result = validateField(field, { silent });
        if (!result.valid) {
          issues.push(result);
        }
      });

      issues.push(...validateCrossRules({ silent }));

      if (focusFirst && issues.length) {
        const first = fieldByPath.get(issues[0].path);
        if (first && typeof first.focus === 'function') {
          first.focus({ preventScroll: false });
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    };

    let toastTimer = null;

    const showToast = (message) => {
      if (!toast) {
        return;
      }

      toast.textContent = message;
      toast.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.classList.remove('show');
      }, 1700);
    };

    const setStatus = (element, message, status = 'neutral') => {
      if (!element) {
        return;
      }

      element.textContent = message;
      element.classList.remove('is-ok', 'is-error', 'is-warn');
      if (status === 'ok') {
        element.classList.add('is-ok');
      } else if (status === 'error') {
        element.classList.add('is-error');
      } else if (status === 'warn') {
        element.classList.add('is-warn');
      }
    };

    const setWriteStatus = (message, status = 'neutral') => {
      setStatus(configDirStatus, message, status);
    };

    const normalizeValue = (value) => {
      if (Array.isArray(value)) {
        return value.map((item) => normalizeValue(item));
      }

      if (value && typeof value === 'object') {
        const sortedKeys = Object.keys(value).sort();
        return sortedKeys.reduce((acc, key) => {
          acc[key] = normalizeValue(value[key]);
          return acc;
        }, {});
      }

      return value;
    };

    const stringifyValue = (value) => {
      if (typeof value === 'undefined') {
        return 'undefined';
      }

      return JSON.stringify(normalizeValue(value));
    };

    const truncateText = (text, maxLength = 96) => {
      const raw = String(text ?? '');
      return raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw;
    };

    const formatDiffValue = (value) => {
      if (typeof value === 'undefined') {
        return '（不存在）';
      }

      if (typeof value === 'string') {
        return `"${truncateText(value, 80)}"`;
      }

      return truncateText(stringifyValue(value), 110);
    };

    const flattenLeafMap = (value, basePath = '', target = new Map()) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value).sort();
        if (!keys.length && basePath) {
          target.set(basePath, value);
          return target;
        }

        keys.forEach((key) => {
          const nextPath = basePath ? `${basePath}.${key}` : key;
          flattenLeafMap(value[key], nextPath, target);
        });
        return target;
      }

      target.set(basePath || '(root)', value);
      return target;
    };

    const collectDiffs = (oldConfig, newConfig) => {
      const oldMap = flattenLeafMap(oldConfig || {});
      const newMap = flattenLeafMap(newConfig || {});
      const allPaths = Array.from(new Set([...oldMap.keys(), ...newMap.keys()])).sort();

      return allPaths.reduce((acc, path) => {
        const oldValue = oldMap.get(path);
        const newValue = newMap.get(path);
        if (stringifyValue(oldValue) !== stringifyValue(newValue)) {
          acc.push({ path, oldValue, newValue });
        }
        return acc;
      }, []);
    };

    const renderDiffPanel = (diffs, oldExists) => {
      if (!configDiffPanel || !configDiffSummary || !configDiffList) {
        return;
      }

      configDiffPanel.hidden = false;
      configDiffList.innerHTML = '';

      if (!diffs.length) {
        configDiffSummary.textContent = oldExists
          ? '未检测到配置变更，当前表单与现有 config.json 一致。'
          : '目录中尚无 config.json，首次写入将创建新文件。';
        const emptyItem = document.createElement('li');
        emptyItem.className = 'diff-empty';
        emptyItem.textContent = oldExists ? '无差异项。' : '将创建 config.json。';
        configDiffList.appendChild(emptyItem);
        return;
      }

      configDiffSummary.textContent = `检测到 ${diffs.length} 项变更，请确认后再写入。`;

      diffs.forEach((diff) => {
        const item = document.createElement('li');
        item.className = 'diff-item';

        const pathEl = document.createElement('p');
        pathEl.className = 'diff-path';
        pathEl.textContent = diff.path;

        const oldEl = document.createElement('p');
        oldEl.className = 'diff-row old-value';
        const oldLabel = document.createElement('strong');
        oldLabel.textContent = '旧：';
        const oldText = document.createTextNode(formatDiffValue(diff.oldValue));
        oldEl.appendChild(oldLabel);
        oldEl.appendChild(oldText);

        const newEl = document.createElement('p');
        newEl.className = 'diff-row new-value';
        const newLabel = document.createElement('strong');
        newLabel.textContent = '新：';
        const newText = document.createTextNode(formatDiffValue(diff.newValue));
        newEl.appendChild(newLabel);
        newEl.appendChild(newText);

        item.appendChild(pathEl);
        item.appendChild(oldEl);
        item.appendChild(newEl);
        configDiffList.appendChild(item);
      });
    };

    const resetDiffPanel = () => {
      if (!configDiffPanel || !configDiffSummary || !configDiffList) {
        return;
      }

      configDiffSummary.textContent = '尚未生成差异';
      configDiffList.innerHTML = '';
      configDiffPanel.hidden = true;
    };

    let pendingWriteContext = null;
    const clearPendingWrite = () => {
      pendingWriteContext = null;
      if (writeConfigToProjectButton) {
        writeConfigToProjectButton.disabled = true;
      }
    };

    const setPendingWrite = (context) => {
      pendingWriteContext = context;
      if (writeConfigToProjectButton) {
        writeConfigToProjectButton.disabled = false;
      }
    };

    const renderPreview = (options = {}) => {
      syncLlmModelPreset();
      syncTtsModePreset();
      syncTtsFieldVisibility();
      syncQuickStartStatus();
      syncNoviceMode();
      fields.forEach((field) => updateRangeBadge(field));
      const config = collectConfig(fields);
      preview.textContent = JSON.stringify(config, null, 2);
      if (!options.preservePending) {
        clearPendingWrite();
        if (configDiffPanel && !configDiffPanel.hidden && configDiffSummary) {
          configDiffSummary.textContent = '配置已变更，请重新点击“预览写入差异”再确认写入。';
        }
      }
      return config;
    };

    const supportsLocalWrite = typeof window.showDirectoryPicker === 'function';
    let configDirectoryHandle = null;
    const supportsHandleStorage = typeof window.indexedDB !== 'undefined';

    const HANDLE_DB_NAME = 'taffy-config-handle-db';
    const HANDLE_STORE = 'handles';
    const HANDLE_KEY = 'project-config-dir';

    const openHandleDb = () => new Promise((resolve, reject) => {
      if (!supportsHandleStorage) {
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(HANDLE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE)) {
          db.createObjectStore(HANDLE_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const saveDirectoryHandle = async (handle) => {
      if (!supportsHandleStorage || !handle) {
        return;
      }

      const db = await openHandleDb();
      if (!db) {
        return;
      }

      await new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    };

    const loadSavedDirectoryHandle = async () => {
      if (!supportsHandleStorage) {
        return null;
      }

      const db = await openHandleDb();
      if (!db) {
        return null;
      }

      const result = await new Promise((resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, 'readonly');
        const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      db.close();
      return result;
    };

    const writeTextToFile = async (fileHandle, content) => {
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    };

    const formatBackupTimestamp = () => {
      const now = new Date();
      const pad = (value) => String(value).padStart(2, '0');
      return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    };

    const initProjectConfigWriter = () => {
      if (
        !pickConfigDirButton
        || !useLastConfigDirButton
        || !previewConfigDiffButton
        || !writeConfigToProjectButton
        || !rollbackConfigFromBackupButton
        || !configDirStatus
      ) {
        return;
      }

      if (!supportsLocalWrite) {
        pickConfigDirButton.disabled = true;
        useLastConfigDirButton.disabled = true;
        previewConfigDiffButton.disabled = true;
        writeConfigToProjectButton.disabled = true;
        rollbackConfigFromBackupButton.disabled = true;
        setWriteStatus('当前浏览器不支持目录写入，请继续使用“下载 config.json”方式。', 'error');
        return;
      }

      resetDiffPanel();
      clearPendingWrite();
      setWriteStatus('未选择目录（浏览器内仅本次会话记住）');

      const ensureDirectorySelected = () => {
        if (configDirectoryHandle) {
          return true;
        }

        setWriteStatus('请先点击“选择配置目录”。', 'error');
        showToast('请先选择配置目录');
        return false;
      };

      const ensureReadPermission = async (handle) => {
        const query = await handle.queryPermission({ mode: 'read' });
        if (query === 'granted') {
          return true;
        }

        const request = await handle.requestPermission({ mode: 'read' });
        return request === 'granted';
      };

      const readCurrentConfigState = async (handle) => {
        try {
          const configHandle = await handle.getFileHandle('config.json');
          const rawText = await (await configHandle.getFile()).text();
          const trimmed = String(rawText || '').trim();
          if (!trimmed) {
            return {
              exists: true,
              text: rawText,
              config: {}
            };
          }

          let parsed = null;
          try {
            parsed = JSON.parse(trimmed);
          } catch (error) {
            throw new Error('INVALID_JSON');
          }

          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('INVALID_SHAPE');
          }

          return {
            exists: true,
            text: rawText,
            config: parsed
          };
        } catch (error) {
          if (error && error.name === 'NotFoundError') {
            return {
              exists: false,
              text: '',
              config: {}
            };
          }

          throw error;
        }
      };

      const readLatestBackupState = async (handle) => {
        let latestName = '';
        for await (const [entryName, entryHandle] of handle.entries()) {
          if (!entryHandle || entryHandle.kind !== 'file') {
            continue;
          }
          if (!/^config\.backup\.\d{8}-\d{6}\.json$/i.test(entryName)) {
            continue;
          }
          if (!latestName || entryName > latestName) {
            latestName = entryName;
          }
        }

        if (!latestName) {
          return { ok: false, code: 'backup_not_found', message: '目录中未找到 config.backup.*.json 备份文件。' };
        }

        const backupHandle = await handle.getFileHandle(latestName);
        const backupText = await (await backupHandle.getFile()).text();
        const trimmed = String(backupText || '').trim();
        if (!trimmed) {
          return { ok: false, code: 'backup_empty', message: `备份文件为空：${latestName}` };
        }

        let parsed = null;
        try {
          parsed = JSON.parse(trimmed);
        } catch (error) {
          return { ok: false, code: 'backup_invalid_json', message: `备份 JSON 解析失败：${latestName}` };
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { ok: false, code: 'backup_invalid_shape', message: `备份顶层结构不是对象：${latestName}` };
        }

        return {
          ok: true,
          backupName: latestName,
          backupText: backupText.endsWith('\n') ? backupText : `${backupText}\n`,
          backupConfig: parsed
        };
      };

      const pickConfigDirectory = async ({ quiet = false } = {}) => {
        try {
          const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
          configDirectoryHandle = handle;
          await saveDirectoryHandle(handle);
          clearPendingWrite();
          resetDiffPanel();
          setWriteStatus(`已选择目录：${handle.name}`, 'ok');
          if (!quiet) {
            showToast('已选择配置目录');
          }
          return { ok: true, handle };
        } catch (error) {
          if (error && error.name === 'AbortError') {
            return { ok: false, code: 'aborted', message: '已取消目录选择。' };
          }
          setWriteStatus('目录选择失败，请重试。', 'error');
          if (!quiet) {
            showToast('目录选择失败');
          }
          return { ok: false, code: 'pick_failed', message: '目录选择失败。' };
        }
      };

      const ensureDirectoryAvailable = async ({ allowPick = false, quiet = false } = {}) => {
        if (configDirectoryHandle) {
          return { ok: true, handle: configDirectoryHandle };
        }
        if (allowPick) {
          return pickConfigDirectory({ quiet });
        }
        setWriteStatus('请先点击“选择配置目录”。', 'error');
        if (!quiet) {
          showToast('请先选择配置目录');
        }
        return { ok: false, code: 'no_directory', message: '请先选择配置目录。' };
      };

      const performPreviewDiff = async ({
        allowPickDirectory = false,
        quiet = false,
        skipValidation = false
      } = {}) => {
        if (!skipValidation) {
          const validation = validateForm({ silent: false, focusFirst: true });
          if (!validation.valid) {
            const message = `发现 ${validation.issues.length} 处配置错误，请修正后再预览差异。`;
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('请先修正配置错误');
            }
            return { ok: false, code: 'invalid_form', message };
          }
        }

        const directory = await ensureDirectoryAvailable({
          allowPick: allowPickDirectory,
          quiet
        });
        if (!directory.ok) {
          return directory;
        }

        try {
          const canRead = await ensureReadPermission(configDirectoryHandle);
          if (!canRead) {
            const message = '未获得读取权限，请授权后重试。';
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('未获得读取权限');
            }
            return { ok: false, code: 'read_permission_denied', message };
          }

          const currentState = await readCurrentConfigState(configDirectoryHandle);
          const nextConfig = renderPreview({ preservePending: true });
          const diffs = collectDiffs(currentState.config, nextConfig);
          renderDiffPanel(diffs, currentState.exists);

          if (!diffs.length) {
            clearPendingWrite();
            const message = '未检测到配置变更，无需写入。';
            setWriteStatus(message, 'ok');
            if (!quiet) {
              showToast('无变更，无需写入');
            }
            return { ok: true, changed: false, diffCount: 0, message };
          }

          setPendingWrite({
            directoryHandle: configDirectoryHandle,
            nextConfig,
            previousContent: currentState.text
          });
          const message = `已生成 ${diffs.length} 项差异，请点击“确认写入”。`;
          setWriteStatus(message);
          if (!quiet) {
            showToast('差异预览已生成');
          }
          return { ok: true, changed: true, diffCount: diffs.length, message };
        } catch (error) {
          if (error && error.message === 'INVALID_JSON') {
            const message = '当前目录的 config.json 不是合法 JSON，请先修复后再写入。';
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('config.json 解析失败');
            }
            return { ok: false, code: 'invalid_json', message };
          }

          if (error && error.message === 'INVALID_SHAPE') {
            const message = '当前目录的 config.json 顶层必须是 JSON 对象。';
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('config.json 格式不支持');
            }
            return { ok: false, code: 'invalid_shape', message };
          }

          const message = '生成差异失败，请检查目录权限或重试。';
          setWriteStatus(message, 'error');
          if (!quiet) {
            showToast('差异预览失败');
          }
          return { ok: false, code: 'preview_failed', message };
        }
      };

      const performWriteConfig = async ({
        quiet = false,
        skipValidation = false
      } = {}) => {
        if (!skipValidation) {
          const validation = validateForm({ silent: false, focusFirst: true });
          if (!validation.valid) {
            clearPendingWrite();
            const message = `发现 ${validation.issues.length} 处配置错误，请重新预览差异。`;
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('配置错误，已取消写入');
            }
            return { ok: false, code: 'invalid_form', message };
          }
        }

        if (!pendingWriteContext) {
          const message = '请先点击“预览写入差异”。';
          setWriteStatus(message, 'error');
          if (!quiet) {
            showToast('请先预览差异');
          }
          return { ok: false, code: 'no_pending_diff', message };
        }

        try {
          const directoryHandle = pendingWriteContext.directoryHandle;
          const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
          if (permission !== 'granted') {
            const message = '未获得写入权限，请重新选择目录并授权。';
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('未获得写入权限');
            }
            return { ok: false, code: 'write_permission_denied', message };
          }

          const configHandle = await directoryHandle.getFileHandle('config.json', { create: true });
          const previousContent = String(pendingWriteContext.previousContent || '');
          if (previousContent.trim()) {
            const backupName = `config.backup.${formatBackupTimestamp()}.json`;
            const backupHandle = await directoryHandle.getFileHandle(backupName, { create: true });
            const backupContent = previousContent.endsWith('\n') ? previousContent : `${previousContent}\n`;
            await writeTextToFile(backupHandle, backupContent);
          }

          const nextConfigText = `${JSON.stringify(pendingWriteContext.nextConfig, null, 2)}\n`;
          await writeTextToFile(configHandle, nextConfigText);
          clearPendingWrite();
          const message = `写入成功：${directoryHandle.name}/config.json`;
          setWriteStatus(message, 'ok');
          if (configDiffSummary) {
            configDiffSummary.textContent = '写入已完成，当前差异已应用到 config.json。';
          }
          setStatus(runtimeApplyStatus, '配置已写入，可点击“应用到运行中的桌宠”触发重载。', 'warn');
          if (!quiet) {
            showToast('已写入 config.json（已自动备份旧文件）');
          }
          return { ok: true, code: 'written', message };
        } catch (error) {
          const message = '写入失败，请检查目录权限或重试。';
          setWriteStatus(message, 'error');
          if (!quiet) {
            showToast('写入失败');
          }
          return { ok: false, code: 'write_failed', message };
        }
      };

      const performRollbackFromLatestBackup = async ({
        allowPickDirectory = false,
        quiet = false
      } = {}) => {
        const directory = await ensureDirectoryAvailable({
          allowPick: allowPickDirectory,
          quiet
        });
        if (!directory.ok) {
          return directory;
        }

        try {
          const canRead = await ensureReadPermission(configDirectoryHandle);
          if (!canRead) {
            const message = '未获得读取权限，请授权后重试。';
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('未获得读取权限');
            }
            return { ok: false, code: 'read_permission_denied', message };
          }

          const backupState = await readLatestBackupState(configDirectoryHandle);
          if (!backupState.ok) {
            setWriteStatus(backupState.message, 'error');
            if (!quiet) {
              showToast('未找到可回滚备份');
            }
            return backupState;
          }

          if (!quiet) {
            const accepted = window.confirm(`将使用 ${backupState.backupName} 覆盖当前 config.json，是否继续？`);
            if (!accepted) {
              return { ok: false, code: 'aborted', message: '已取消回滚。' };
            }
          }

          const writePermission = await configDirectoryHandle.requestPermission({ mode: 'readwrite' });
          if (writePermission !== 'granted') {
            const message = '未获得写入权限，请重新选择目录并授权。';
            setWriteStatus(message, 'error');
            if (!quiet) {
              showToast('未获得写入权限');
            }
            return { ok: false, code: 'write_permission_denied', message };
          }

          let currentText = '';
          try {
            const currentHandle = await configDirectoryHandle.getFileHandle('config.json');
            currentText = await (await currentHandle.getFile()).text();
          } catch (error) {
            if (!(error && error.name === 'NotFoundError')) {
              throw error;
            }
          }

          if (String(currentText || '').trim()) {
            const preRollbackName = `config.pre-rollback.${formatBackupTimestamp()}.json`;
            const preRollbackHandle = await configDirectoryHandle.getFileHandle(preRollbackName, { create: true });
            const preRollbackText = currentText.endsWith('\n') ? currentText : `${currentText}\n`;
            await writeTextToFile(preRollbackHandle, preRollbackText);
          }

          const configHandle = await configDirectoryHandle.getFileHandle('config.json', { create: true });
          await writeTextToFile(configHandle, backupState.backupText);

          clearPendingWrite();
          resetDiffPanel();
          applyConfig(fields, backupState.backupConfig);
          renderPreview();
          validateForm({ silent: false });

          const message = `已回滚到最近备份：${backupState.backupName}`;
          setWriteStatus(message, 'ok');
          setStatus(runtimeApplyStatus, '已回滚配置，可点击“应用到运行中的桌宠”触发重载。', 'warn');
          if (!quiet) {
            showToast('回滚完成');
          }
          return { ok: true, code: 'rolled_back', message, backupName: backupState.backupName };
        } catch (error) {
          const message = '回滚失败，请检查目录权限或备份文件完整性。';
          setWriteStatus(message, 'error');
          if (!quiet) {
            showToast('回滚失败');
          }
          return { ok: false, code: 'rollback_failed', message };
        }
      };

      runPreviewDiffAction = performPreviewDiff;
      runWriteConfigAction = performWriteConfig;

      pickConfigDirButton.addEventListener('click', async () => {
        await pickConfigDirectory({ quiet: false });
      });

      useLastConfigDirButton.addEventListener('click', async () => {
        try {
          const savedHandle = await loadSavedDirectoryHandle();
          if (!savedHandle) {
            setWriteStatus('未找到上次目录，请先手动选择一次。', 'error');
            showToast('没有可用的上次目录');
            return;
          }

          const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
          configDirectoryHandle = savedHandle;
          clearPendingWrite();
          resetDiffPanel();
          if (permission === 'granted') {
            setWriteStatus(`已恢复上次目录：${savedHandle.name}`, 'ok');
            showToast('已恢复上次目录');
          } else {
            setWriteStatus(`已加载上次目录：${savedHandle.name}（写入时会再次授权）`);
            showToast('已加载上次目录');
          }
        } catch (error) {
          setWriteStatus('恢复上次目录失败，请重新手动选择。', 'error');
          showToast('恢复上次目录失败');
        }
      });

      loadSavedDirectoryHandle()
        .then((savedHandle) => {
          if (!savedHandle) {
            return;
          }
          configDirectoryHandle = savedHandle;
          setWriteStatus(`检测到上次目录：${savedHandle.name}（可点“使用上次目录”恢复）`);
        })
        .catch(() => {
          // Ignore storage read errors to keep the page functional.
        });

      previewConfigDiffButton.addEventListener('click', async () => {
        await performPreviewDiff({ allowPickDirectory: false, quiet: false });
      });

      writeConfigToProjectButton.addEventListener('click', async () => {
        await performWriteConfig({ quiet: false });
      });

      rollbackConfigFromBackupButton.addEventListener('click', async () => {
        await performRollbackFromLatestBackup({ allowPickDirectory: false, quiet: false });
      });
    };

    const templateProfiles = {
      daily_chat: {
        label: '日常聊天模式',
        config: {
          llm: {
            provider: 'openai-compatible',
            model: 'qwen-plus',
            temperature: 0.68,
            max_output_tokens: 320
          },
          tts: {
            provider: 'gpt_sovits',
            speed_ratio: 1.0,
            allow_browser_fallback: true
          },
          memory: {
            enabled: true,
            inject_recent: 2,
            inject_relevant: 2
          },
          asr: {
            keep_listening: true
          },
          observe: {
            auto_chat_enabled: true,
            allow_auto_chat: true
          }
        }
      },
      low_latency: {
        label: '低延迟模式',
        config: {
          llm: {
            provider: 'openai-compatible',
            model: 'qwen-turbo',
            temperature: 0.35,
            max_output_tokens: 180
          },
          tts: {
            provider: 'edge_tts',
            speed_ratio: 1.12
          },
          memory: {
            inject_recent: 1,
            inject_relevant: 1
          },
          observe: {
            auto_chat_enabled: false
          },
          asr: {
            max_speech_ms: 1600,
            silence_trigger_ms: 260
          }
        }
      },
      local_model: {
        label: '本地模型模式',
        config: {
          llm: {
            provider: 'ollama',
            model: 'qwen2.5:7b-instruct',
            base_url: 'http://127.0.0.1:11434/v1',
            temperature: 0.45,
            max_output_tokens: 220
          },
          tts: {
            provider: 'browser'
          },
          observe: {
            auto_chat_enabled: false
          },
          tools: {
            allow_shell: false
          }
        }
      }
    };

    const initTemplateSystem = () => {
      const templateButtons = Array.from(document.querySelectorAll('[data-template]'));
      if (!templateButtons.length) {
        return;
      }

      setStatus(templateStatus, '未应用模板');

      templateButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.getAttribute('data-template') || '';
          const profile = templateProfiles[key];
          if (!profile) {
            return;
          }

          applyConfig(fields, profile.config);
          resetDiffPanel();
          renderPreview();

          const validation = validateForm({ silent: false });
          if (validation.valid) {
            setStatus(templateStatus, `已应用模板：${profile.label}`, 'ok');
          } else {
            setStatus(templateStatus, `模板已应用：${profile.label}，但存在 ${validation.issues.length} 处待修正项。`, 'warn');
          }
          showToast(`已套用 ${profile.label}`);
        });
      });
    };

    const normalizeRuntimeHost = (hostValue) => {
      const host = String(hostValue || '').trim().toLowerCase();
      if (!host || host === '0.0.0.0' || host === '::' || host === '[::]') {
        return '127.0.0.1';
      }
      return host;
    };

    const buildEndpointCandidates = (manualUrl, canonicalPath, extraSuffixes = []) => {
      const host = normalizeRuntimeHost(readFieldValue(fieldByPath.get('server.host')));
      const port = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
      const base = `http://${host}:${port}`;
      const canonical = `${base}${canonicalPath}`;
      const candidates = [];

      if (manualUrl) {
        candidates.push(manualUrl);
      }

      candidates.push(canonical);

      // Localhost and 127.0.0.1 are both common in this project; try both to reduce manual friction.
      if (host === '127.0.0.1') {
        candidates.push(`http://localhost:${port}${canonicalPath}`);
      } else if (host === 'localhost') {
        candidates.push(`http://127.0.0.1:${port}${canonicalPath}`);
      }

      extraSuffixes.forEach((suffix) => {
        candidates.push(`${base}${suffix}`);
      });

      return Array.from(new Set(candidates));
    };

    const buildRuntimeReloadEndpoints = () => buildEndpointCandidates(
      String(runtimeReloadUrl?.value || '').trim(),
      '/api/config/reload',
      ['/api/config/reload', '/api/reload', '/reload', '/api/runtime/reload', '/api/desktop/reload']
    );

    const buildRuntimeRestartEndpoints = () => buildEndpointCandidates(
      String(runtimeRestartUrl?.value || '').trim(),
      '/api/runtime/restart',
      ['/api/runtime/restart', '/api/restart', '/restart', '/api/desktop/restart']
    );

    const requestRuntimeEndpoint = async (endpoint, {
      action = 'reload_config',
      allowGet = true,
      payloadExtra = null
    } = {}) => {
      const requestPayload = {
        action,
        source: 'taffy-config-center',
        ...(payloadExtra && typeof payloadExtra === 'object' ? payloadExtra : {})
      };
      const attempts = [
        { method: 'POST', body: JSON.stringify(requestPayload) },
        { method: 'POST', body: '' }
      ];
      if (allowGet) {
        attempts.push({ method: 'GET', body: undefined });
      }

      let lastFailure = null;

      for (const attempt of attempts) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = controller
          ? window.setTimeout(() => controller.abort(), 5000)
          : null;

        try {
          const headers = await buildAuthHeaders(
            endpoint,
            attempt.method === 'GET'
              ? {}
              : { 'Content-Type': 'application/json' },
            ''
          );
          const response = await fetch(endpoint, {
            method: attempt.method,
            headers,
            body: attempt.method === 'GET' ? undefined : attempt.body,
            cache: 'no-store',
            signal: controller ? controller.signal : undefined
          });

          if (timeout !== null) {
            window.clearTimeout(timeout);
          }

          let payload = null;
          try {
            payload = await response.json();
          } catch (error) {
            payload = null;
          }

          if (response.ok) {
            if (payload && payload.ok === false) {
              lastFailure = { ok: false, method: attempt.method, status: response.status, endpoint, payload };
              continue;
            }
            return { ok: true, method: attempt.method, status: response.status, endpoint, payload };
          }
          lastFailure = { ok: false, method: attempt.method, status: response.status, endpoint, payload };
        } catch (error) {
          if (timeout !== null) {
            window.clearTimeout(timeout);
          }
          lastFailure = {
            ok: false,
            method: attempt.method,
            status: 0,
            endpoint,
            error: String(error && error.message ? error.message : error)
          };
        }
      }

      return lastFailure || { ok: false, endpoint };
    };

    const getHealthItem = (id) => connectivityList
      ? connectivityList.querySelector(`[data-health-id="${id}"]`)
      : null;

    const setHealthItem = (id, {
      tone = 'idle',
      stateText = '待检测',
      detailText = '',
      fixes = []
    } = {}) => {
      const item = getHealthItem(id);
      if (!item) {
        return;
      }

      item.classList.remove('is-running', 'is-ok', 'is-warn', 'is-error');
      if (tone === 'running') {
        item.classList.add('is-running');
      } else if (tone === 'ok') {
        item.classList.add('is-ok');
      } else if (tone === 'warn') {
        item.classList.add('is-warn');
      } else if (tone === 'error') {
        item.classList.add('is-error');
      }

      const stateNode = item.querySelector('.health-state');
      if (stateNode) {
        stateNode.textContent = stateText;
      }

      const detailNode = item.querySelector('.health-detail');
      if (detailNode) {
        detailNode.textContent = detailText;
      }

      const actionsNode = item.querySelector('.health-actions');
      if (actionsNode) {
        actionsNode.innerHTML = '';
        if (Array.isArray(fixes)) {
          fixes
            .filter((fix) => fix && typeof fix.label === 'string' && typeof fix.onClick === 'function')
            .slice(0, 3)
            .forEach((fix) => {
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'health-fix-btn';
              button.textContent = fix.label;
              button.addEventListener('click', () => {
                fix.onClick();
              });
              actionsNode.appendChild(button);
            });
        }
      }
    };

    const fetchWithTimeout = async (url, options = {}, timeoutMs = 5500) => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : null;

      try {
        const requestMode = String(options?.mode || '').toLowerCase();
        const headers = await buildAuthHeaders(url, options?.headers || {}, requestMode);
        const response = await fetch(url, {
          cache: 'no-store',
          ...options,
          headers,
          signal: controller ? controller.signal : undefined
        });
        return response;
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      }
    };

    const probeUrlReachability = async (url) => {
      try {
        const response = await fetchWithTimeout(url, { method: 'GET', mode: 'cors' });
        return { reachable: true, status: Number(response.status || 0), opaque: false };
      } catch (error) {
        try {
          await fetchWithTimeout(url, { method: 'GET', mode: 'no-cors' });
          return { reachable: true, status: 0, opaque: true };
        } catch (fallbackError) {
          return {
            reachable: false,
            error: String(fallbackError && fallbackError.message ? fallbackError.message : fallbackError)
          };
        }
      }
    };

    const parseProbeResult = (probe, successPrefix) => {
      if (!probe.reachable) {
        return { tone: 'error', stateText: '不可达', detailText: `检测失败：${probe.error || '网络连接失败'}` };
      }
      if (probe.opaque) {
        return { tone: 'warn', stateText: '可达（受限）', detailText: `${successPrefix}，但浏览器受跨域限制无法读取响应码。` };
      }
      if (probe.status >= 500) {
        return { tone: 'warn', stateText: `可达（${probe.status}）`, detailText: `${successPrefix}，服务返回 ${probe.status}，请检查服务状态。` };
      }
      if (probe.status >= 400) {
        return { tone: 'warn', stateText: `可达（${probe.status}）`, detailText: `${successPrefix}，返回 ${probe.status}（可能需要特定请求方式或鉴权）。` };
      }
      return { tone: 'ok', stateText: `可用（${probe.status || 200}）`, detailText: `${successPrefix}，请求可达。` };
    };

    const probeRuntimeCandidates = async (endpoints, options = {}) => {
      let bestFailure = null;
      for (const endpoint of endpoints) {
        const result = await requestRuntimeEndpoint(endpoint, options);
        if (result.ok) {
          return result;
        }
        if (!bestFailure) {
          bestFailure = result;
        }
        if (result && result.payload && typeof result.payload.error === 'string') {
          bestFailure = result;
        }
      }
      return bestFailure || { ok: false };
    };

    const focusFieldByPath = (path) => {
      const field = fieldByPath.get(path);
      if (field && typeof field.focus === 'function') {
        field.focus({ preventScroll: false });
      }
      return field;
    };

    const applyQuickFix = (options = {}) => {
      const updates = Array.isArray(options.updates) ? options.updates : [];
      updates.forEach((update) => {
        if (!update || typeof update.path !== 'string') {
          return;
        }
        const field = fieldByPath.get(update.path);
        if (!field) {
          return;
        }
        writeFieldValue(field, update.value);
        updateRangeBadge(field);
      });
      renderPreview();
      validateForm({ silent: false });
      if (runtimeReloadUrl && options.reloadUrl) {
        runtimeReloadUrl.value = String(options.reloadUrl);
        validateRuntimeUrl({ silent: false });
      }
      if (runtimeRestartUrl && options.restartUrl) {
        runtimeRestartUrl.value = String(options.restartUrl);
        validateRuntimeRestartUrl({ silent: false });
      }
      if (typeof options.focusPath === 'string') {
        focusFieldByPath(options.focusPath);
      }
      if (typeof options.message === 'string' && options.message.trim()) {
        showToast(options.message);
      }
    };

    const initTtsModePreset = () => {
      if (!ttsModePreset || !applyTtsModePresetButton || !ttsModePresetStatus) {
        return () => {};
      }

      const providerField = fieldByPath.get('tts.provider');

      const describeMode = (modeKey) => {
        if (modeKey === 'browser') {
          return {
            label: '本地系统语音（Browser）',
            tip: '新手默认，零额外依赖，本机即可发声。'
          };
        }
        if (modeKey === 'edge') {
          return {
            label: '标准语音（Edge）',
            tip: '开箱即用，适合快速体验。'
          };
        }
        if (modeKey === 'volcengine') {
          return {
            label: '云端定制语音（Volcengine）',
            tip: '音色更自然，请确保已设置对应环境变量。'
          };
        }
        if (modeKey === 'gpt_sovits') {
          return {
            label: '本地高自由度（GPT-SoVITS）',
            tip: '适合追求音色上限，需要本地服务可用。'
          };
        }
        return {
          label: '自定义模式',
          tip: '保持当前参数，不自动改动。'
        };
      };

      const resolveModeByProvider = () => {
        const provider = String(readFieldValue(providerField) || '').trim().toLowerCase();
        if (provider === 'browser') {
          return 'browser';
        }
        if (provider === 'edge_tts') {
          return 'edge';
        }
        if (provider === 'gpt_sovits') {
          return 'gpt_sovits';
        }
        if (provider === 'volcengine_tts' || provider === 'volcengine') {
          return 'volcengine';
        }
        return 'custom';
      };

      const sync = () => {
        const modeKey = resolveModeByProvider();
        const modeInfo = describeMode(modeKey);
        ttsModePreset.value = modeKey;
        setStatus(ttsModePresetStatus, `当前模式：${modeInfo.label}。${modeInfo.tip}`);
      };

      const applyMode = (modeKey) => {
        if (modeKey === 'browser') {
          applyQuickFix({
            updates: [
              { path: 'tts.provider', value: 'browser' },
              { path: 'tts.voice', value: 'zh-CN-XiaoxiaoNeural' },
              { path: 'tts.gpt_sovits_realtime_tts', value: false },
              { path: 'tts.allow_browser_fallback', value: false }
            ],
            focusPath: 'tts.provider',
            message: '已切换到本地系统语音（Browser）'
          });
          setStatus(ttsModePresetStatus, '已套用 Browser 默认语音。无需额外服务，适合新手快速开始。', 'ok');
          return;
        }

        if (modeKey === 'edge') {
          applyQuickFix({
            updates: [
              { path: 'tts.provider', value: 'edge_tts' },
              { path: 'tts.voice', value: 'zh-CN-XiaoxiaoNeural' },
              { path: 'tts.gpt_sovits_realtime_tts', value: false },
              { path: 'tts.allow_browser_fallback', value: true }
            ],
            focusPath: 'tts.provider',
            message: '已切换到标准语音（Edge）'
          });
          setStatus(ttsModePresetStatus, '已套用标准语音。若你追求更自然音色，可改用云端定制语音。', 'ok');
          return;
        }

        if (modeKey === 'volcengine') {
          applyQuickFix({
            updates: [
              { path: 'tts.provider', value: 'volcengine_tts' },
              { path: 'tts.voice', value: 'S_uos2AQPX1' },
              { path: 'tts.app_id_env', value: 'VOLCENGINE_APP_ID' },
              { path: 'tts.access_token_env', value: 'VOLCENGINE_ACCESS_TOKEN' },
              { path: 'tts.secret_key_env', value: 'VOLCENGINE_SECRET_KEY' },
              { path: 'tts.cluster', value: 'volcano_icl' },
              { path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' },
              { path: 'tts.allow_browser_fallback', value: true }
            ],
            focusPath: 'tts.voice',
            message: '已切换到云端定制语音（Volcengine）'
          });
          setStatus(ttsModePresetStatus, '已套用云端定制语音。请确认环境变量已设置，再做连通性检测。', 'ok');
          return;
        }

        if (modeKey === 'gpt_sovits') {
          applyQuickFix({
            updates: [
              { path: 'tts.provider', value: 'gpt_sovits' },
              { path: 'tts.voice', value: 'default' },
              { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' },
              { path: 'tts.gpt_sovits_method', value: 'POST' },
              { path: 'tts.gpt_sovits_timeout_sec', value: 60 },
              { path: 'tts.gpt_sovits_format', value: 'wav' },
              { path: 'tts.gpt_sovits_text_lang', value: 'zh' },
              { path: 'tts.gpt_sovits_realtime_tts', value: false },
              { path: 'tts.allow_browser_fallback', value: true }
            ],
            focusPath: 'tts.gpt_sovits_api_url',
            message: '已切换到 GPT-SoVITS 模式'
          });
          setStatus(ttsModePresetStatus, '已套用 GPT-SoVITS。请确认本地服务已启动，再做连通性检测。', 'ok');
          return;
        }

        setStatus(ttsModePresetStatus, '当前是自定义模式：不会自动覆盖你的参数。', 'warn');
        showToast('自定义模式不会自动改动参数');
      };

      ttsModePreset.addEventListener('change', () => {
        const modeInfo = describeMode(String(ttsModePreset.value || 'custom'));
        setStatus(ttsModePresetStatus, `已选择：${modeInfo.label}。点击“一键套用”后生效。`, 'warn');
      });

      applyTtsModePresetButton.addEventListener('click', () => {
        applyMode(String(ttsModePreset.value || 'custom'));
      });

      if (providerField) {
        providerField.addEventListener('change', sync);
      }

      sync();
      return sync;
    };

    const resolveTtsProvider = () => String(readFieldValue(fieldByPath.get('tts.provider')) || '').trim().toLowerCase();
    const isVolcengineProvider = (provider) => provider === 'volcengine_tts' || provider === 'volcengine';

    const initTtsFieldVisibility = () => {
      const groupedFields = Array.from(form.querySelectorAll('#cfg-tts [data-tts-group]'));
      if (!groupedFields.length) {
        return () => {};
      }

      const isGroupVisible = (groupKey, provider) => {
        if (groupKey === 'common') {
          return true;
        }
        if (groupKey === 'gpt_sovits') {
          return provider === 'gpt_sovits';
        }
        if (groupKey === 'volcengine') {
          return isVolcengineProvider(provider);
        }
        if (groupKey === 'edge') {
          return provider === 'edge_tts';
        }
        return true;
      };

      const sync = () => {
        const provider = resolveTtsProvider();
        groupedFields.forEach((fieldNode) => {
          const groupKey = String(fieldNode.dataset.ttsGroup || 'common').trim().toLowerCase();
          const level = String(fieldNode.dataset.ttsLevel || '').trim().toLowerCase();
          const groupVisible = isGroupVisible(groupKey, provider);
          const levelVisible = !(isNoviceMode && level === 'advanced');
          fieldNode.hidden = !(groupVisible && levelVisible);
        });
      };

      sync();
      return sync;
    };

    const initQuickStartStatus = () => {
      if (!quickStartStatus) {
        return () => {};
      }

      const requiredByProvider = {
        edge_tts: ['tts.voice'],
        gpt_sovits: ['tts.voice', 'tts.gpt_sovits_api_url'],
        volcengine_tts: ['tts.voice', 'tts.app_id_env', 'tts.access_token_env', 'tts.cluster', 'tts.api_url'],
        volcengine: ['tts.voice', 'tts.app_id_env', 'tts.access_token_env', 'tts.cluster', 'tts.api_url'],
        browser: ['tts.voice']
      };

      const labels = {
        'server.host': 'server.host',
        'server.port': 'server.port',
        'llm.base_url': 'llm.base_url',
        'llm.api_key_env': 'llm.api_key_env',
        'llm.model': 'llm.model',
        'tts.provider': 'tts.provider',
        'tts.voice': 'tts.voice',
        'tts.gpt_sovits_api_url': 'tts.gpt_sovits_api_url',
        'tts.app_id_env': 'tts.app_id_env',
        'tts.access_token_env': 'tts.access_token_env',
        'tts.cluster': 'tts.cluster',
        'tts.api_url': 'tts.api_url'
      };

      const hasValue = (path) => {
        const field = fieldByPath.get(path);
        if (!field) {
          return true;
        }
        const value = readFieldValue(field);
        if ((field.type || '').toLowerCase() === 'checkbox') {
          return true;
        }
        return String(value ?? '').trim().length > 0;
      };

      const sync = () => {
        if (!isNoviceMode) {
          setStatus(quickStartStatus, '当前为高级模式：已显示全部可配置项。');
          return;
        }

        const provider = resolveTtsProvider();
        const required = ['server.host', 'server.port', 'llm.base_url', 'llm.model', 'tts.provider'];
        const llmProvider = resolveLlmProvider();
        if (llmRequiresApiKey(llmProvider)) {
          required.push('llm.api_key_env');
        }
        required.push(...(requiredByProvider[provider] || ['tts.voice']));

        const missing = Array.from(new Set(required)).filter((path) => !hasValue(path));
        if (!missing.length) {
          setStatus(
            quickStartStatus,
            '已就绪：请先检测连通性，再点击一键应用配置。',
            'ok'
          );
          return;
        }

        const preview = missing.slice(0, 3).map((path) => labels[path] || path).join(', ');
        const suffix = missing.length > 3 ? ', ...' : '';
        setStatus(
          quickStartStatus,
          `仍缺少 ${missing.length} 个必填项：${preview}${suffix}`,
          'warn'
        );
      };

      sync();
      return sync;
    };

    const initBeginnerSafePreset = () => {
      if (!applyBeginnerSafePresetButton || !beginnerSafePresetStatus) {
        return;
      }

      const safePresetUpdates = [
        { path: 'tts.provider', value: 'browser' },
        { path: 'observe.attach_mode', value: 'manual' },
        { path: 'tools.enabled', value: false },
        { path: 'tools.allow_shell', value: false }
      ];

      const applyPresetToForm = () => {
        applyQuickFix({
          updates: safePresetUpdates,
          focusPath: 'tts.provider',
          message: '已套用新手安全配置并刷新预览'
        });
        syncTtsModePreset();
        syncTtsFieldVisibility();
        syncQuickStartStatus();
      };

      setStatus(beginnerSafePresetStatus, '未套用新手安全配置。');
      applyBeginnerSafePresetButton.addEventListener('click', async () => {
        const acknowledged = window.confirm(
          '将套用新手安全配置。若写入本地 config.json，系统会先自动备份当前 config.json（config.backup.*.json）。是否继续？'
        );
        if (!acknowledged) {
          setStatus(beginnerSafePresetStatus, '已取消套用新手安全配置。', 'warn');
          return;
        }

        applyPresetToForm();
        setStatus(beginnerSafePresetStatus, '已套用到当前表单并更新实时 JSON 预览。', 'ok');

        if (!supportsLocalWrite) {
          setStatus(
            beginnerSafePresetStatus,
            '当前浏览器不支持直接写入本地 config.json。请下载配置后替换，并重载或重启桌宠。',
            'warn'
          );
          return;
        }

        const shouldWriteNow = window.confirm(
          '是否立即写入本地 config.json？写入前会自动备份当前 config.json。'
        );
        if (!shouldWriteNow) {
          setStatus(
            beginnerSafePresetStatus,
            '已套用并更新预览。可稍后在“写入项目配置”或“一键应用配置”中落盘（自动备份），然后重载或重启。',
            'ok'
          );
          return;
        }

        applyBeginnerSafePresetButton.disabled = true;
        setStatus(beginnerSafePresetStatus, '正在写入本地 config.json（自动备份中）...', 'warn');
        try {
          const previewResult = await runPreviewDiffAction({
            allowPickDirectory: true,
            quiet: true,
            skipValidation: true
          });
          if (!previewResult.ok) {
            setStatus(
              beginnerSafePresetStatus,
              `写入前检查失败：${previewResult.message || '无法生成差异预览'}`,
              'error'
            );
            showToast('新手安全配置写入中断');
            return;
          }

          if (!previewResult.changed) {
            setStatus(
              beginnerSafePresetStatus,
              '本地 config.json 已是新手安全配置。请点击“🚀 一键应用到运行中桌宠”或重启桌宠。',
              'ok'
            );
            showToast('本地配置已是新手安全配置');
            return;
          }

          const writeResult = await runWriteConfigAction({
            quiet: true,
            skipValidation: true
          });
          if (!writeResult.ok) {
            setStatus(
              beginnerSafePresetStatus,
              `写入失败：${writeResult.message || '请检查目录权限后重试'}`,
              'error'
            );
            showToast('新手安全配置写入失败');
            return;
          }

          setStatus(
            beginnerSafePresetStatus,
            '已写入本地 config.json 并自动备份。请点击“🚀 一键应用到运行中桌宠”或重启桌宠。',
            'ok'
          );
          showToast('新手安全配置已写入（已自动备份）');
        } finally {
          applyBeginnerSafePresetButton.disabled = false;
        }
      });
    };

    const initNoviceMode = () => {
      const ADVANCED_SECTIONS_SELECTOR = '[data-advanced-section="true"]';
      const storageKey = 'taffy.config.novice_mode';
      const hiddenSections = Array.from(document.querySelectorAll(ADVANCED_SECTIONS_SELECTOR));
      const sidebarLinks = Array.from(document.querySelectorAll('.config-side-link[href^="#"]'));

      const syncSidebarVisibility = () => {
        sidebarLinks.forEach((link) => {
          const href = String(link.getAttribute('href') || '').trim();
          if (!href.startsWith('#')) {
            return;
          }
          const target = document.querySelector(href);
          const item = link.closest('li');
          if (!target || !item) {
            return;
          }
          item.hidden = Boolean(target.hidden);
        });

        const sidebarGroups = Array.from(document.querySelectorAll('.sidebar-group'));
        sidebarGroups.forEach((group) => {
          const items = Array.from(group.querySelectorAll('.config-side-list > li'));
          if (!items.length) {
            return;
          }
          group.hidden = items.every((item) => item.hidden);
        });
      };

      const applyNoviceState = (enabled, { persist = true } = {}) => {
        isNoviceMode = Boolean(enabled);
        if (noviceModeToggleButton) {
          noviceModeToggleButton.setAttribute('aria-checked', isNoviceMode ? 'true' : 'false');
          noviceModeToggleButton.classList.toggle('is-on', isNoviceMode);
        }
        if (noviceModeField) {
          noviceModeField.classList.toggle('is-toggle-on', isNoviceMode);
        }
        if (document.body) {
          document.body.classList.toggle('is-novice-view', isNoviceMode);
        }
        hiddenSections.forEach((section) => {
          section.hidden = false;
        });
        syncSidebarVisibility();
        syncTtsFieldVisibility();
        syncQuickStartStatus();
        if (noviceModeStatus) {
          if (isNoviceMode) {
            setStatus(noviceModeStatus, '新手模式已开启：行为/记忆/工具等高级模块已隐藏。', 'ok');
          } else {
            setStatus(noviceModeStatus, '当前为高级模式：全部配置模块已显示。');
          }
        }
        if (persist) {
          try {
            window.localStorage.setItem(storageKey, isNoviceMode ? '1' : '0');
          } catch (error) {
            // Ignore storage exceptions.
          }
        }
      };

      let initialState = true;
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved === '0') {
          initialState = false;
        } else if (saved === '1') {
          initialState = true;
        } else if (noviceModeToggleButton) {
          initialState = String(noviceModeToggleButton.getAttribute('aria-checked') || 'true') !== 'false';
        }
      } catch (error) {
        initialState = noviceModeToggleButton
          ? String(noviceModeToggleButton.getAttribute('aria-checked') || 'true') !== 'false'
          : true;
      }

      if (noviceModeField) {
        noviceModeField.addEventListener('pointerdown', (event) => {
          if (typeof event.button === 'number' && event.button !== 0) {
            return;
          }
          event.preventDefault();
          applyNoviceState(!isNoviceMode);
        });
      }
      if (noviceModeToggleButton) {
        noviceModeToggleButton.addEventListener('keydown', (event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            applyNoviceState(!isNoviceMode);
          }
        });
      }

      applyNoviceState(initialState, { persist: false });
      return () => {
        applyNoviceState(isNoviceMode, { persist: false });
      };
    };

    const initConnectivityChecker = () => {
      if (!checkConnectivityButton || !connectivityStatus || !connectivityList) {
        return;
      }

      setStatus(connectivityStatus, '未执行连通性检测');
      ['llm', 'tts', 'reload', 'restart'].forEach((id) => {
        setHealthItem(id, {
          tone: 'idle',
          stateText: '待检测',
          detailText: '点击“检测配置连通性”开始检查。'
        });
      });

      checkConnectivityButton.addEventListener('click', async () => {
        const validation = validateForm({ silent: false, focusFirst: true });
        if (!validation.valid) {
          setStatus(connectivityStatus, `存在 ${validation.issues.length} 处配置错误，请先修正。`, 'error');
          showToast('请先修正配置错误');
          return;
        }

        checkConnectivityButton.disabled = true;
        setStatus(connectivityStatus, '正在检测 4 项关键连通性...', 'warn');

        let okCount = 0;
        let warnCount = 0;
        let errorCount = 0;
        const registerOutcome = (id, outcome) => {
          setHealthItem(id, outcome);
          if (outcome.tone === 'ok') {
            okCount += 1;
          } else if (outcome.tone === 'warn') {
            warnCount += 1;
          } else if (outcome.tone === 'error') {
            errorCount += 1;
          }
        };

        try {
          const llmProvider = resolveLlmProvider();
          const llmApiKeyEnv = String(readFieldValue(fieldByPath.get('llm.api_key_env')) || '').trim();
          const llmUrl = String(readFieldValue(fieldByPath.get('llm.base_url')) || '').trim();
          if (llmRequiresApiKey(llmProvider) && !llmApiKeyEnv) {
            const suggestedEnv = getSuggestedLlmApiKeyEnv(llmProvider);
            registerOutcome('llm', {
              tone: 'error',
              stateText: '缺少鉴权',
              detailText: `当前 Provider（${llmProvider || 'unknown'}）需要 llm.api_key_env，但该项为空。`,
              fixes: [
                {
                  label: `填入 ${suggestedEnv}`,
                  onClick: () => applyQuickFix({
                    updates: [{ path: 'llm.api_key_env', value: suggestedEnv }],
                    focusPath: 'llm.api_key_env',
                    message: `已填入 ${suggestedEnv}`
                  })
                },
                {
                  label: '切换到本地 Ollama',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'llm.provider', value: 'ollama' },
                      { path: 'llm.base_url', value: 'http://127.0.0.1:11434/v1' }
                    ],
                    focusPath: 'llm.base_url',
                    message: '已切换到 Ollama 本地地址'
                  })
                },
                {
                  label: '定位到 LLM 配置',
                  onClick: () => {
                    window.location.hash = '#cfg-llm';
                    focusFieldByPath('llm.api_key_env');
                  }
                }
              ]
            });
          } else if (!isHttpUrl(llmUrl)) {
            registerOutcome('llm', {
              tone: 'error',
              stateText: 'URL 无效',
              detailText: 'llm.base_url 不是合法 http/https 地址。',
              fixes: [
                {
                  label: '用 DashScope 默认地址',
                  onClick: () => applyQuickFix({
                    updates: [{ path: 'llm.base_url', value: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }],
                    focusPath: 'llm.base_url',
                    message: '已填入 DashScope 默认地址'
                  })
                },
                {
                  label: '改为 Ollama 本地地址',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'llm.provider', value: 'ollama' },
                      { path: 'llm.base_url', value: 'http://127.0.0.1:11434/v1' }
                    ],
                    focusPath: 'llm.base_url',
                    message: '已切换到 Ollama 本地地址'
                  })
                },
                {
                  label: '定位到 LLM 配置',
                  onClick: () => {
                    window.location.hash = '#cfg-llm';
                    focusFieldByPath('llm.base_url');
                  }
                }
              ]
            });
          } else {
            setHealthItem('llm', { tone: 'running', stateText: '检测中...', detailText: `正在访问：${llmUrl}` });
            const llmProbe = await probeUrlReachability(llmUrl);
            const llmOutcome = parseProbeResult(llmProbe, 'LLM 地址可达');
            if (llmOutcome.tone !== 'ok') {
              llmOutcome.fixes = [
                {
                  label: '切到 DashScope 地址',
                  onClick: () => applyQuickFix({
                    updates: [{ path: 'llm.base_url', value: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }],
                    focusPath: 'llm.base_url',
                    message: '已切到 DashScope 地址'
                  })
                },
                {
                  label: '切到本地 Ollama',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'llm.provider', value: 'ollama' },
                      { path: 'llm.base_url', value: 'http://127.0.0.1:11434/v1' }
                    ],
                    focusPath: 'llm.base_url',
                    message: '已切到 Ollama 本地地址'
                  })
                },
                {
                  label: '定位到 LLM 配置',
                  onClick: () => {
                    window.location.hash = '#cfg-llm';
                    focusFieldByPath('llm.base_url');
                  }
                }
              ];
            }
            registerOutcome('llm', llmOutcome);
          }

          const ttsProvider = String(readFieldValue(fieldByPath.get('tts.provider')) || '').trim().toLowerCase();
          if (ttsProvider === 'gpt_sovits') {
            const ttsUrl = String(readFieldValue(fieldByPath.get('tts.gpt_sovits_api_url')) || '').trim();
            if (!isHttpUrl(ttsUrl)) {
              registerOutcome('tts', {
                tone: 'error',
                stateText: 'URL 无效',
                detailText: '当前为 GPT-SoVITS 模式，但 tts.gpt_sovits_api_url 不是合法 http/https 地址。',
                fixes: [
                  {
                    label: '回填 GPT-SoVITS 地址',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'gpt_sovits' },
                        { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' }
                      ],
                      focusPath: 'tts.gpt_sovits_api_url',
                      message: '已回填 GPT-SoVITS 示例地址'
                    })
                  },
                  {
                    label: '切到 Edge 标准语音',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'edge_tts' },
                        { path: 'tts.voice', value: 'zh-CN-XiaoxiaoNeural' }
                      ],
                      focusPath: 'tts.voice',
                      message: '已切换到 Edge 标准语音'
                    })
                  },
                  {
                    label: '定位到 TTS 配置',
                    onClick: () => {
                      window.location.hash = '#cfg-tts';
                      focusFieldByPath('tts.gpt_sovits_api_url');
                    }
                  }
                ]
              });
            } else {
              setHealthItem('tts', { tone: 'running', stateText: '检测中...', detailText: `正在访问：${ttsUrl}` });
              const ttsProbe = await probeUrlReachability(ttsUrl);
              const ttsOutcome = parseProbeResult(ttsProbe, 'GPT-SoVITS 接口可达');
              if (ttsOutcome.tone !== 'ok') {
                ttsOutcome.fixes = [
                  {
                    label: '回填默认地址',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'gpt_sovits' },
                        { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' }
                      ],
                      focusPath: 'tts.gpt_sovits_api_url',
                      message: '已回填 GPT-SoVITS 示例地址'
                    })
                  },
                  {
                    label: '切到 Volcengine 音色',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'volcengine_tts' },
                        { path: 'tts.voice', value: 'S_uos2AQPX1' },
                        { path: 'tts.app_id_env', value: 'VOLCENGINE_APP_ID' },
                        { path: 'tts.access_token_env', value: 'VOLCENGINE_ACCESS_TOKEN' },
                        { path: 'tts.secret_key_env', value: 'VOLCENGINE_SECRET_KEY' },
                        { path: 'tts.cluster', value: 'volcano_icl' },
                        { path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }
                      ],
                      focusPath: 'tts.voice',
                      message: '已切换到 Volcengine 模式'
                    })
                  },
                  {
                    label: '定位到 TTS 配置',
                    onClick: () => {
                      window.location.hash = '#cfg-tts';
                      focusFieldByPath('tts.gpt_sovits_api_url');
                    }
                  }
                ];
              }
              registerOutcome('tts', ttsOutcome);
            }
          } else if (ttsProvider === 'volcengine_tts' || ttsProvider === 'volcengine') {
            const appIdEnv = String(readFieldValue(fieldByPath.get('tts.app_id_env')) || '').trim();
            const accessTokenEnv = String(readFieldValue(fieldByPath.get('tts.access_token_env')) || '').trim();
            const cluster = String(readFieldValue(fieldByPath.get('tts.cluster')) || '').trim();
            const volcApiUrl = String(readFieldValue(fieldByPath.get('tts.api_url')) || '').trim();
            const missingPaths = [];
            if (!appIdEnv) {
              missingPaths.push('tts.app_id_env');
            }
            if (!accessTokenEnv) {
              missingPaths.push('tts.access_token_env');
            }
            if (!cluster) {
              missingPaths.push('tts.cluster');
            }
            if (missingPaths.length > 0) {
              registerOutcome('tts', {
                tone: 'error',
                stateText: '参数缺失',
                detailText: `当前为 Volcengine 模式，缺少：${missingPaths.join('、')}。`,
                fixes: [
                  {
                    label: '回填 Volcengine 默认项',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'volcengine_tts' },
                        { path: 'tts.voice', value: 'S_uos2AQPX1' },
                        { path: 'tts.app_id_env', value: 'VOLCENGINE_APP_ID' },
                        { path: 'tts.access_token_env', value: 'VOLCENGINE_ACCESS_TOKEN' },
                        { path: 'tts.secret_key_env', value: 'VOLCENGINE_SECRET_KEY' },
                        { path: 'tts.cluster', value: 'volcano_icl' },
                        { path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }
                      ],
                      focusPath: 'tts.app_id_env',
                      message: '已回填 Volcengine 默认配置'
                    })
                  },
                  {
                    label: '切到 Edge 标准语音',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'edge_tts' },
                        { path: 'tts.voice', value: 'zh-CN-XiaoxiaoNeural' }
                      ],
                      focusPath: 'tts.provider',
                      message: '已切换到 Edge 标准语音'
                    })
                  },
                  {
                    label: '定位到 TTS 配置',
                    onClick: () => {
                      window.location.hash = '#cfg-tts';
                      focusFieldByPath('tts.app_id_env');
                    }
                  }
                ]
              });
            } else if (!isHttpUrl(volcApiUrl)) {
              registerOutcome('tts', {
                tone: 'error',
                stateText: 'URL 无效',
                detailText: '当前为 Volcengine 模式，但 tts.api_url 不是合法 http/https 地址。',
                fixes: [
                  {
                    label: '回填 Volcengine API',
                    onClick: () => applyQuickFix({
                      updates: [{ path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }],
                      focusPath: 'tts.api_url',
                      message: '已回填 Volcengine API 地址'
                    })
                  },
                  {
                    label: '切到 GPT-SoVITS',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'gpt_sovits' },
                        { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' }
                      ],
                      focusPath: 'tts.gpt_sovits_api_url',
                      message: '已切换到 GPT-SoVITS 模式'
                    })
                  },
                  {
                    label: '定位到 TTS 配置',
                    onClick: () => {
                      window.location.hash = '#cfg-tts';
                      focusFieldByPath('tts.api_url');
                    }
                  }
                ]
              });
            } else {
              setHealthItem('tts', { tone: 'running', stateText: '检测中...', detailText: `正在访问：${volcApiUrl}` });
              const volcProbe = await probeUrlReachability(volcApiUrl);
              const volcOutcome = parseProbeResult(volcProbe, 'Volcengine 接口可达');
              if (volcOutcome.tone !== 'ok') {
                volcOutcome.fixes = [
                  {
                    label: '回填默认 API 地址',
                    onClick: () => applyQuickFix({
                      updates: [{ path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }],
                      focusPath: 'tts.api_url',
                      message: '已回填 Volcengine API 地址'
                    })
                  },
                  {
                    label: '切到 GPT-SoVITS',
                    onClick: () => applyQuickFix({
                      updates: [
                        { path: 'tts.provider', value: 'gpt_sovits' },
                        { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' }
                      ],
                      focusPath: 'tts.gpt_sovits_api_url',
                      message: '已切换到 GPT-SoVITS 模式'
                    })
                  },
                  {
                    label: '定位到 TTS 配置',
                    onClick: () => {
                      window.location.hash = '#cfg-tts';
                      focusFieldByPath('tts.api_url');
                    }
                  }
                ];
              } else {
                const secretKeyEnv = String(readFieldValue(fieldByPath.get('tts.secret_key_env')) || '').trim();
                if (!secretKeyEnv) {
                  volcOutcome.tone = 'warn';
                  volcOutcome.stateText = '可达（建议补充）';
                  volcOutcome.detailText = 'Volcengine 接口可达，但未填写 tts.secret_key_env；若你的账号策略要求，请补齐。';
                }
              }
              registerOutcome('tts', volcOutcome);
            }
          } else if (ttsProvider === 'edge_tts') {
            const voice = String(readFieldValue(fieldByPath.get('tts.voice')) || '').trim();
            registerOutcome('tts', {
              tone: 'ok',
              stateText: '可用（本地）',
              detailText: `当前为 Edge 标准语音${voice ? `（voice: ${voice}）` : ''}，无需额外 API 地址检测。`,
              fixes: [
                {
                  label: '切到 Volcengine 音色',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'volcengine_tts' },
                      { path: 'tts.voice', value: 'S_uos2AQPX1' },
                      { path: 'tts.app_id_env', value: 'VOLCENGINE_APP_ID' },
                      { path: 'tts.access_token_env', value: 'VOLCENGINE_ACCESS_TOKEN' },
                      { path: 'tts.secret_key_env', value: 'VOLCENGINE_SECRET_KEY' },
                      { path: 'tts.cluster', value: 'volcano_icl' },
                      { path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }
                    ],
                    focusPath: 'tts.voice',
                    message: '已切换到 Volcengine 模式'
                  })
                },
                {
                  label: '切到 GPT-SoVITS',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'gpt_sovits' },
                      { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' }
                    ],
                    focusPath: 'tts.gpt_sovits_api_url',
                    message: '已切换到 GPT-SoVITS 模式'
                  })
                },
                {
                  label: '定位到 TTS 配置',
                  onClick: () => {
                    window.location.hash = '#cfg-tts';
                    focusFieldByPath('tts.provider');
                  }
                }
              ]
            });
          } else if (ttsProvider === 'browser') {
            registerOutcome('tts', {
              tone: 'ok',
              stateText: '本地系统语音（默认）',
              detailText: 'browser 使用本地系统语音发声，不依赖云端密钥，适合新手和本地开发。若需要更高音色自由度，可切换到 edge_tts / volcengine_tts / gpt_sovits。',
              fixes: [
                {
                  label: '切到在线标准语音（Edge）',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'edge_tts' },
                      { path: 'tts.voice', value: 'zh-CN-XiaoxiaoNeural' }
                    ],
                    focusPath: 'tts.provider',
                    message: '已切换到在线标准语音（Edge）'
                  })
                },
                {
                  label: '切到 Volcengine 音色',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'volcengine_tts' },
                      { path: 'tts.voice', value: 'S_uos2AQPX1' },
                      { path: 'tts.app_id_env', value: 'VOLCENGINE_APP_ID' },
                      { path: 'tts.access_token_env', value: 'VOLCENGINE_ACCESS_TOKEN' },
                      { path: 'tts.secret_key_env', value: 'VOLCENGINE_SECRET_KEY' },
                      { path: 'tts.cluster', value: 'volcano_icl' },
                      { path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }
                    ],
                    focusPath: 'tts.voice',
                    message: '已切换到 Volcengine 模式'
                  })
                },
                {
                  label: '定位到 TTS 配置',
                  onClick: () => {
                    window.location.hash = '#cfg-tts';
                    focusFieldByPath('tts.provider');
                  }
                }
              ]
            });
          } else {
            registerOutcome('tts', {
              tone: 'error',
              stateText: 'Provider 未支持',
              detailText: `当前 tts.provider 为 "${ttsProvider || '(空)'}"，支持 edge_tts / volcengine_tts / gpt_sovits / browser。`,
              fixes: [
                {
                  label: '切到 Edge 标准语音',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'edge_tts' },
                      { path: 'tts.voice', value: 'zh-CN-XiaoxiaoNeural' }
                    ],
                    focusPath: 'tts.provider',
                    message: '已切换到 Edge 标准语音'
                  })
                },
                {
                  label: '切到 Volcengine 音色',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'volcengine_tts' },
                      { path: 'tts.voice', value: 'S_uos2AQPX1' },
                      { path: 'tts.app_id_env', value: 'VOLCENGINE_APP_ID' },
                      { path: 'tts.access_token_env', value: 'VOLCENGINE_ACCESS_TOKEN' },
                      { path: 'tts.secret_key_env', value: 'VOLCENGINE_SECRET_KEY' },
                      { path: 'tts.cluster', value: 'volcano_icl' },
                      { path: 'tts.api_url', value: 'https://openspeech.bytedance.com/api/v1/tts' }
                    ],
                    focusPath: 'tts.provider',
                    message: '已切换到 Volcengine 模式'
                  })
                },
                {
                  label: '切到 GPT-SoVITS',
                  onClick: () => applyQuickFix({
                    updates: [
                      { path: 'tts.provider', value: 'gpt_sovits' },
                      { path: 'tts.gpt_sovits_api_url', value: 'http://127.0.0.1:9880/tts' }
                    ],
                    focusPath: 'tts.provider',
                    message: '已切换到 GPT-SoVITS 模式'
                  })
                }
              ]
            });
          }

          const reloadEndpoints = buildRuntimeReloadEndpoints();
          setHealthItem('reload', { tone: 'running', stateText: '检测中...', detailText: `正在尝试：${reloadEndpoints[0] || '(未生成地址)'}` });
          const reloadProbe = await probeRuntimeCandidates(reloadEndpoints, {
            action: 'reload_config',
            allowGet: true,
            payloadExtra: { dry_run: true }
          });
          if (reloadProbe.ok) {
            registerOutcome('reload', {
              tone: 'ok',
              stateText: `可用（${reloadProbe.status}）`,
              detailText: `已验证重载接口：${reloadProbe.endpoint}`
            });
          } else {
            const detail = reloadProbe && reloadProbe.payload && reloadProbe.payload.error
              ? String(reloadProbe.payload.error)
              : '无法连接重载接口，请确认桌宠后端正在运行。';
            registerOutcome('reload', {
              tone: 'error',
              stateText: '不可用',
              detailText: detail,
              fixes: [
                {
                  label: '改 host 为 127.0.0.1',
                  onClick: () => {
                    const portValue = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
                    applyQuickFix({
                      updates: [{ path: 'server.host', value: '127.0.0.1' }],
                      reloadUrl: `http://127.0.0.1:${portValue}/api/config/reload`,
                      focusPath: 'server.host',
                      message: '已将服务 Host 调整为 127.0.0.1'
                    });
                  }
                },
                {
                  label: '使用默认重载地址',
                  onClick: () => {
                    const hostValue = normalizeRuntimeHost(readFieldValue(fieldByPath.get('server.host')));
                    const portValue = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
                    applyQuickFix({
                      reloadUrl: `http://${hostValue}:${portValue}/api/config/reload`,
                      message: '已回填默认重载接口地址'
                    });
                  }
                },
                {
                  label: '定位到服务配置',
                  onClick: () => {
                    window.location.hash = '#cfg-desktop';
                    focusFieldByPath('server.host');
                  }
                }
              ]
            });
          }

          const restartEndpoints = buildRuntimeRestartEndpoints();
          setHealthItem('restart', { tone: 'running', stateText: '检测中...', detailText: `正在尝试：${restartEndpoints[0] || '(未生成地址)'}` });
          const restartProbe = await probeRuntimeCandidates(restartEndpoints, {
            action: 'restart_runtime_check',
            allowGet: false,
            payloadExtra: { dry_run: true }
          });
          if (restartProbe.ok) {
            registerOutcome('restart', {
              tone: 'ok',
              stateText: `可用（${restartProbe.status}）`,
              detailText: `已验证重启接口：${restartProbe.endpoint}`
            });
          } else {
            const detail = restartProbe && restartProbe.payload && restartProbe.payload.error
              ? String(restartProbe.payload.error)
              : '无法连接重启接口，请确认桌宠后端正在运行。';
            const isModeWarning = /electron/i.test(detail) || detail.includes('托管模式');
            registerOutcome('restart', {
              tone: isModeWarning ? 'warn' : 'error',
              stateText: isModeWarning ? '模式受限' : '不可用',
              detailText: detail,
              fixes: [
                {
                  label: '使用默认重启地址',
                  onClick: () => {
                    const hostValue = normalizeRuntimeHost(readFieldValue(fieldByPath.get('server.host')));
                    const portValue = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
                    applyQuickFix({
                      restartUrl: `http://${hostValue}:${portValue}/api/runtime/restart`,
                      message: '已回填默认重启接口地址'
                    });
                  }
                },
                {
                  label: '改 host 为 127.0.0.1',
                  onClick: () => {
                    const portValue = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
                    applyQuickFix({
                      updates: [{ path: 'server.host', value: '127.0.0.1' }],
                      restartUrl: `http://127.0.0.1:${portValue}/api/runtime/restart`,
                      focusPath: 'server.host',
                      message: '已将服务 Host 调整为 127.0.0.1'
                    });
                  }
                },
                {
                  label: '定位到运行中应用',
                  onClick: () => {
                    window.location.hash = '#cfg-runtime';
                    if (runtimeRestartUrl && typeof runtimeRestartUrl.focus === 'function') {
                      runtimeRestartUrl.focus({ preventScroll: false });
                    }
                  }
                }
              ]
            });
          }

          if (errorCount === 0 && warnCount === 0) {
            setStatus(connectivityStatus, `检测完成：${okCount}/4 项可用。`, 'ok');
            showToast('连通性检测通过');
          } else if (errorCount === 0) {
            setStatus(connectivityStatus, `检测完成：${okCount}/4 可用，${warnCount} 项需注意。`, 'warn');
            showToast('连通性检测完成（有注意项）');
          } else {
            setStatus(connectivityStatus, `检测完成：${errorCount} 项失败，${warnCount} 项需注意。`, 'error');
            showToast('连通性检测发现问题');
          }
        } finally {
          checkConnectivityButton.disabled = false;
        }
      });
    };

    const initRuntimeApplier = () => {
      if (!applyConfigToRuntimeButton) {
        return;
      }

      setStatus(runtimeApplyStatus, '未执行运行中应用');

      if (runtimeReloadUrl && !String(runtimeReloadUrl.value || '').trim()) {
        const host = normalizeRuntimeHost(readFieldValue(fieldByPath.get('server.host')));
        const port = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
        runtimeReloadUrl.value = `http://${host}:${port}/api/config/reload`;
      }

      if (runtimeReloadUrl) {
        runtimeReloadUrl.addEventListener('input', () => {
          validateRuntimeUrl({ silent: false });
        });
      }

      const triggerRuntimeReload = async ({
        skipValidation = false,
        quiet = false
      } = {}) => {
        if (!skipValidation) {
          const validation = validateForm({ silent: false, focusFirst: true });
          if (!validation.valid) {
            const message = `存在 ${validation.issues.length} 处配置错误，请先修正。`;
            setStatus(runtimeApplyStatus, message, 'error');
            if (!quiet) {
              showToast('请先修正配置错误');
            }
            return { ok: false, code: 'invalid_form', message };
          }
        }

        const runtimeValid = validateRuntimeUrl({ silent: false });
        if (!runtimeValid.valid) {
          setStatus(runtimeApplyStatus, runtimeValid.message, 'error');
          if (!quiet) {
            showToast('重载接口 URL 无效');
          }
          return { ok: false, code: 'invalid_url', message: runtimeValid.message };
        }

        const endpoints = buildRuntimeReloadEndpoints();
        setStatus(runtimeApplyStatus, '正在尝试连接桌宠重载接口...', 'warn');

        for (const endpoint of endpoints) {
          const result = await requestRuntimeEndpoint(endpoint, { action: 'reload_config', allowGet: true });
          if (result.ok) {
            const serverMessage = result.payload && typeof result.payload.message === 'string'
              ? `，${result.payload.message}`
              : '';
            const message = `已触发重载：${result.endpoint}（${result.method} ${result.status}${serverMessage}）`;
            setStatus(runtimeApplyStatus, message, 'ok');
            if (!quiet) {
              showToast('已触发运行中桌宠重载');
            }
            return { ok: true, code: 'reloaded', message, endpoint: result.endpoint };
          }
        }

        const message = '未能触发重载。请确认桌宠正在运行，且已开放 HTTP 重载接口与跨域访问。';
        setStatus(runtimeApplyStatus, message, 'error');
        if (!quiet) {
          showToast('重载触发失败');
        }
        return { ok: false, code: 'reload_failed', message };
      };

      runRuntimeReloadAction = triggerRuntimeReload;

      applyConfigToRuntimeButton.addEventListener('click', async () => {
        await triggerRuntimeReload({ skipValidation: false, quiet: false });
      });
    };

    const initRuntimeRestarter = () => {
      if (!restartRuntimeButton) {
        return;
      }

      setStatus(runtimeRestartStatus, '未执行运行中重启');

      if (runtimeRestartUrl && !String(runtimeRestartUrl.value || '').trim()) {
        const host = normalizeRuntimeHost(readFieldValue(fieldByPath.get('server.host')));
        const port = String(readFieldValue(fieldByPath.get('server.port')) || '8123').trim() || '8123';
        runtimeRestartUrl.value = `http://${host}:${port}/api/runtime/restart`;
      }

      if (runtimeRestartUrl) {
        runtimeRestartUrl.addEventListener('input', () => {
          validateRuntimeRestartUrl({ silent: false });
        });
      }

      const triggerRuntimeRestart = async ({
        skipValidation = false,
        quiet = false
      } = {}) => {
        if (!skipValidation) {
          const validation = validateForm({ silent: false, focusFirst: true });
          if (!validation.valid) {
            const message = `存在 ${validation.issues.length} 处配置错误，请先修正。`;
            setStatus(runtimeRestartStatus, message, 'error');
            if (!quiet) {
              showToast('请先修正配置错误');
            }
            return { ok: false, code: 'invalid_form', message };
          }
        }

        const runtimeValid = validateRuntimeRestartUrl({ silent: false });
        if (!runtimeValid.valid) {
          setStatus(runtimeRestartStatus, runtimeValid.message, 'error');
          if (!quiet) {
            showToast('重启接口 URL 无效');
          }
          return { ok: false, code: 'invalid_url', message: runtimeValid.message };
        }

        const endpoints = buildRuntimeRestartEndpoints();
        setStatus(runtimeRestartStatus, '正在发送重启指令...', 'warn');

        for (const endpoint of endpoints) {
          const result = await requestRuntimeEndpoint(endpoint, { action: 'restart_runtime', allowGet: false });
          if (result.ok) {
            const serverMessage = result.payload && typeof result.payload.message === 'string'
              ? `，${result.payload.message}`
              : '';
            const message = `已提交重启：${result.endpoint}（${result.method} ${result.status}${serverMessage}）`;
            setStatus(runtimeRestartStatus, message, 'ok');
            if (!quiet) {
              showToast('已提交运行中重启');
            }
            return { ok: true, code: 'restarted', message, endpoint: result.endpoint };
          }
        }

        const message = '未能触发重启。请确认桌宠为 Electron 托管模式，且重启接口已开放。';
        setStatus(runtimeRestartStatus, message, 'error');
        if (!quiet) {
          showToast('重启触发失败');
        }
        return { ok: false, code: 'restart_failed', message };
      };

      runRuntimeRestartAction = triggerRuntimeRestart;

      restartRuntimeButton.addEventListener('click', async () => {
        await triggerRuntimeRestart({ skipValidation: false, quiet: false });
      });
    };

    const initOneClickApply = () => {
      if (!oneClickApplyButton || !oneClickApplyStatus) {
        return;
      }

      setStatus(oneClickApplyStatus, '未执行一键应用');

      oneClickApplyButton.addEventListener('click', async () => {
        const validation = validateForm({ silent: false, focusFirst: true });
        if (!validation.valid) {
          const message = `存在 ${validation.issues.length} 处配置错误，请先修正后再一键应用。`;
          setStatus(oneClickApplyStatus, message, 'error');
          showToast('请先修正配置错误');
          return;
        }

        oneClickApplyButton.disabled = true;
        setStatus(oneClickApplyStatus, '正在执行：校验 → 差异预览 → 写入 → 重载...', 'warn');

        try {
          const previewResult = await runPreviewDiffAction({
            allowPickDirectory: true,
            quiet: true,
            skipValidation: true
          });
          if (!previewResult.ok) {
            setStatus(oneClickApplyStatus, `一键应用中断：${previewResult.message || '差异预览失败'}`, 'error');
            showToast('一键应用中断');
            return;
          }

          if (!previewResult.changed) {
            const reloadWithoutWrite = await runRuntimeReloadAction({
              skipValidation: true,
              quiet: true
            });
            if (reloadWithoutWrite.ok) {
              setStatus(oneClickApplyStatus, '配置未变更，但已触发运行中重载。', 'ok');
              showToast('一键应用完成（无配置改动）');
            } else {
              setStatus(oneClickApplyStatus, '配置未变更，且重载未成功。可手动点击“重启运行中桌宠”。', 'warn');
              showToast('无变更，重载失败');
            }
            return;
          }

          const writeResult = await runWriteConfigAction({
            quiet: true,
            skipValidation: true
          });
          if (!writeResult.ok) {
            setStatus(oneClickApplyStatus, `一键应用中断：${writeResult.message || '写入失败'}`, 'error');
            showToast('写入失败，请查看状态');
            return;
          }

          const reloadResult = await runRuntimeReloadAction({
            skipValidation: true,
            quiet: true
          });
          if (reloadResult.ok) {
            setStatus(oneClickApplyStatus, '一键应用完成：已写入并触发运行中重载。', 'ok');
            showToast('一键应用成功');
            return;
          }

          setStatus(oneClickApplyStatus, '配置已写入，但重载失败。可选择立即重启运行中桌宠。', 'warn');
          const needRestart = window.confirm('热重载失败。是否立即尝试“重启运行中桌宠”？');
          if (!needRestart) {
            showToast('已写入配置，请稍后手动重启');
            return;
          }

          const restartResult = await runRuntimeRestartAction({
            skipValidation: true,
            quiet: true
          });
          if (restartResult.ok) {
            setStatus(oneClickApplyStatus, '一键应用完成：已写入并提交运行中重启。', 'ok');
            showToast('已提交重启');
          } else {
            setStatus(oneClickApplyStatus, `已写入配置，但重启失败：${restartResult.message || '请手动重启桌宠。'}`, 'warn');
            showToast('重启失败，请手动处理');
          }
        } finally {
          oneClickApplyButton.disabled = false;
        }
      });
    };

    const defaultConfig = collectConfig(fields);

    const onFieldChange = () => {
      renderPreview();
      validateForm({ silent: false });
    };

    fields.forEach((field) => {
      const type = (field.type || '').toLowerCase();
      const eventName = field.tagName === 'SELECT' || type === 'checkbox' ? 'change' : 'input';
      field.addEventListener(eventName, onFieldChange);

      if (eventName === 'change') {
        field.addEventListener('input', onFieldChange);
      }
    });

    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        const text = preview.textContent.trim();
        if (!text) {
          showToast('暂无可复制内容');
          return;
        }

        try {
          await copyText(text);
          copyButton.textContent = '✅ 已复制!';
          showToast('配置已复制');
          window.setTimeout(() => {
            copyButton.textContent = '📋 复制配置';
          }, 1200);
        } catch (error) {
          showToast('复制失败，请手动复制');
        }
      });
    }

    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        const config = renderPreview();
        downloadJson(`${JSON.stringify(config, null, 2)}\n`, 'config.json');
        showToast('已下载 config.json');
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        form.reset();
        applyConfig(fields, defaultConfig);
        renderPreview();
        validateForm({ silent: false });
        if (importInput) {
          importInput.value = '';
        }
        setStatus(templateStatus, '已恢复默认配置');
        showToast('已恢复默认配置');
      });
    }

    if (applyImportButton && importInput) {
      applyImportButton.addEventListener('click', () => {
        const text = importInput.value.trim();
        if (!text) {
          showToast('请先粘贴 JSON 内容');
          return;
        }

        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (error) {
          showToast('JSON 格式错误，请检查后重试');
          return;
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          showToast('仅支持导入 JSON 对象');
          return;
        }

        applyConfig(fields, parsed);
        renderPreview();
        validateForm({ silent: false });
        setStatus(templateStatus, '已导入外部 JSON 配置', 'ok');
        showToast('导入配置已应用');
      });
    }

    initTemplateSystem();
    syncTtsModePreset = initTtsModePreset();
    syncTtsFieldVisibility = initTtsFieldVisibility();
    syncQuickStartStatus = initQuickStartStatus();
    syncNoviceMode = initNoviceMode();
    initConnectivityChecker();
    initRuntimeApplier();
    initRuntimeRestarter();
    initProjectConfigWriter();
    initBeginnerSafePreset();
    initOneClickApply();
    renderPreview();
    validateForm({ silent: false });
    validateRuntimeUrl({ silent: false });
    validateRuntimeRestartUrl({ silent: false });
  };

  document.addEventListener('DOMContentLoaded', init);
})();
