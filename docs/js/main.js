(() => {
  const THEME_STORAGE_KEY = 'taffy-theme';

  const getThemePreference = () => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  };

  const applyTheme = (theme) => {
    const finalTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', finalTheme);

    const toggleButtons = document.querySelectorAll('.theme-toggle');
    toggleButtons.forEach((button) => {
      const isDark = finalTheme === 'dark';
      button.textContent = isDark ? '☀️ 亮色' : '🌙 暗色';
      button.setAttribute('aria-pressed', String(isDark));
      button.setAttribute('aria-label', isDark ? '切换到亮色模式' : '切换到暗色模式');
    });
  };

  const setupThemeToggle = () => {
    applyTheme(getThemePreference());

    const toggleButtons = document.querySelectorAll('.theme-toggle');
    if (!toggleButtons.length) {
      return;
    }

    toggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      });
    });
  };

  const setupLazyLive2D = () => {
    const placeholder = document.querySelector('script[data-live2d-autoload]');
    if (!placeholder) {
      return;
    }

    const src = String(placeholder.getAttribute('data-live2d-autoload') || '').trim();
    if (!src) {
      return;
    }

    let loaded = false;
    const loadLive2D = () => {
      if (loaded) {
        return;
      }
      loaded = true;
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.setAttribute('data-live2d-loaded', 'true');
      document.body.appendChild(script);
    };

    const triggerLoad = () => {
      loadLive2D();
    };

    window.addEventListener('pointerdown', triggerLoad, { once: true, passive: true });
    window.addEventListener('touchstart', triggerLoad, { once: true, passive: true });
    window.addEventListener('keydown', triggerLoad, { once: true });

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => {
        loadLive2D();
      }, { timeout: 3000 });
    } else {
      window.setTimeout(loadLive2D, 1400);
    }
  };

  const setupGithubLinks = () => {
    const downloadBtn = document.getElementById('downloadGithubBtn');
    const sourceCodeLink = document.getElementById('sourceCodeLink');
    const footerGithubLink = document.getElementById('footerGithubLink');
    const footerIssuesLink = document.getElementById('footerIssuesLink');

    const targets = [downloadBtn, sourceCodeLink, footerGithubLink, footerIssuesLink].filter(Boolean);
    if (!targets.length) {
      return;
    }

    const host = window.location.hostname || '';
    if (!host.endsWith('.github.io')) {
      return;
    }

    const username = host.replace(/\.github\.io$/i, '').trim();
    const firstSegment = (window.location.pathname || '/').split('/').filter(Boolean)[0] || '';
    if (!username || !firstSegment) {
      return;
    }

    const repoUrl = `https://github.com/${username}/${firstSegment}`;
    const releasesUrl = `${repoUrl}/releases`;
    const issuesUrl = `${repoUrl}/issues`;

    if (downloadBtn) {
      downloadBtn.href = releasesUrl;
      downloadBtn.target = '_blank';
      downloadBtn.rel = 'noopener noreferrer';
    }
    if (sourceCodeLink) {
      sourceCodeLink.href = repoUrl;
      sourceCodeLink.target = '_blank';
      sourceCodeLink.rel = 'noopener noreferrer';
    }
    if (footerGithubLink) {
      footerGithubLink.href = repoUrl;
      footerGithubLink.target = '_blank';
      footerGithubLink.rel = 'noopener noreferrer';
    }
    if (footerIssuesLink) {
      footerIssuesLink.href = issuesUrl;
      footerIssuesLink.target = '_blank';
      footerIssuesLink.rel = 'noopener noreferrer';
    }
  };

  const parseGithubRepo = (rawUrl) => {
    if (!rawUrl) {
      return '';
    }

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (!/github\.com$/i.test(parsed.hostname)) {
        return '';
      }

      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length < 2) {
        return '';
      }

      const owner = segments[0];
      const repo = segments[1].replace(/\.git$/i, '');
      if (!owner || !repo) {
        return '';
      }
      return `${owner}/${repo}`;
    } catch (error) {
      return '';
    }
  };

  const VERSIONS_DATA_URL = 'data/versions.json';
  let versionsDataPromise = null;

  const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const asNonEmptyString = (value) => {
    const text = String(value || '').trim();
    return text || '';
  };

  const normalizeVersionItem = (item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`versions[${index}] 不是对象`);
    }

    const tag = asNonEmptyString(item.tag);
    const date = asNonEmptyString(item.date);
    const logAnchor = asNonEmptyString(item.log_anchor);
    const title = asNonEmptyString(item.title);
    const panelSummary = asNonEmptyString(item.panel_summary || item.summary);
    const releaseSummary = asNonEmptyString(item.release_summary);
    const highlights = Array.isArray(item.highlights)
      ? item.highlights.map((line) => asNonEmptyString(line)).filter(Boolean)
      : [];

    if (!tag) {
      throw new Error(`versions[${index}].tag 不能为空`);
    }
    if (!date) {
      throw new Error(`versions[${index}].date 不能为空`);
    }
    if (!logAnchor) {
      throw new Error(`versions[${index}].log_anchor 不能为空`);
    }
    if (!/^log-[a-z0-9-]+$/i.test(logAnchor)) {
      throw new Error(`versions[${index}].log_anchor 格式非法: ${logAnchor}`);
    }

    const finalPanelSummary = panelSummary || highlights[0] || '';
    if (!finalPanelSummary) {
      throw new Error(`versions[${index}] 缺少 panel_summary/summary/highlights`);
    }
    const finalHighlights = highlights.length ? highlights : [finalPanelSummary];

    return {
      tag,
      date,
      logAnchor,
      title: title || finalPanelSummary,
      panelSummary: finalPanelSummary,
      releaseSummary: releaseSummary || '',
      highlights: finalHighlights
    };
  };

  const validateVersionsPayload = (payload) => {
    if (!isPlainObject(payload)) {
      throw new Error('versions.json 顶层必须是对象');
    }

    const versions = Array.isArray(payload.versions) ? payload.versions : [];
    if (!versions.length) {
      throw new Error('versions.json 缺少 versions 列表');
    }

    const normalizedVersions = versions.map((item, index) => normalizeVersionItem(item, index));
    return {
      updatedAt: asNonEmptyString(payload.updated_at),
      versions: normalizedVersions
    };
  };

  const CONTENT_DATA_URL = 'data/content.json';
  let contentDataPromise = null;

  const loadVersionsData = () => {
    if (versionsDataPromise) {
      return versionsDataPromise;
    }

    versionsDataPromise = fetch(VERSIONS_DATA_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => validateVersionsPayload(payload))
      .catch((error) => {
        versionsDataPromise = null;
        throw error;
      });

    return versionsDataPromise;
  };

  const getCopyModeFromUrl = () => {
    const params = new URLSearchParams(window.location.search || '');
    const releaseModeEnabled = params.get('mode') === 'release' || params.get('copy') === 'release' || params.get('release') === '1';
    return releaseModeEnabled ? 'release' : 'default';
  };

  const setCopyMode = (mode) => {
    const normalized = mode === 'release' ? 'release' : 'default';
    document.documentElement.setAttribute('data-copy-mode', normalized);
    if (!document.body) {
      return normalized;
    }
    document.body.classList.toggle('release-mode', normalized === 'release');
    return normalized;
  };

  const isReleaseModeActive = () => document.body.classList.contains('release-mode');

  const normalizeContentMode = (modeName, modeData) => {
    if (!isPlainObject(modeData)) {
      throw new Error(`content.${modeName} 必须是对象`);
    }

    const selectorsRaw = isPlainObject(modeData.selectors) ? modeData.selectors : {};
    const selectors = {};
    Object.entries(selectorsRaw).forEach(([selector, text]) => {
      const key = asNonEmptyString(selector);
      const value = asNonEmptyString(text);
      if (key && value) {
        selectors[key] = value;
      }
    });

    const features = Array.isArray(modeData.features)
      ? modeData.features.map((line) => asNonEmptyString(line)).filter(Boolean)
      : [];
    const steps = Array.isArray(modeData.steps)
      ? modeData.steps.map((line) => asNonEmptyString(line)).filter(Boolean)
      : [];

    const noteRaw = isPlainObject(modeData.download_notes) ? modeData.download_notes : {};
    const downloadNotes = {};
    Object.entries(noteRaw).forEach(([indexText, note]) => {
      const idx = Number.parseInt(String(indexText), 10);
      const value = asNonEmptyString(note);
      if (Number.isInteger(idx) && idx >= 0 && idx <= 8 && value) {
        downloadNotes[String(idx)] = value;
      }
    });

    return {
      selectors,
      features,
      steps,
      downloadNotes
    };
  };

  const validateContentPayload = (payload) => {
    if (!isPlainObject(payload)) {
      throw new Error('content.json 顶层必须是对象');
    }
    const defaultMode = normalizeContentMode('default', payload.default);
    const releaseMode = payload.release ? normalizeContentMode('release', payload.release) : {
      selectors: {},
      features: [],
      steps: [],
      downloadNotes: {}
    };
    return {
      default: defaultMode,
      release: releaseMode
    };
  };

  const loadContentData = () => {
    if (contentDataPromise) {
      return contentDataPromise;
    }

    contentDataPromise = fetch(CONTENT_DATA_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => validateContentPayload(payload))
      .catch((error) => {
        contentDataPromise = null;
        throw error;
      });

    return contentDataPromise;
  };

  const applyContentMode = (modeData) => {
    if (!modeData || !isPlainObject(modeData)) {
      return;
    }

    const selectors = isPlainObject(modeData.selectors) ? modeData.selectors : {};
    Object.entries(selectors).forEach(([selector, text]) => {
      const node = document.querySelector(selector);
      if (node && text) {
        node.textContent = text;
      }
    });

    if (Array.isArray(modeData.features) && modeData.features.length) {
      const featureNodes = Array.from(document.querySelectorAll('.feature-card p'));
      featureNodes.forEach((node, index) => {
        if (modeData.features[index]) {
          node.textContent = modeData.features[index];
        }
      });
    }

    if (Array.isArray(modeData.steps) && modeData.steps.length) {
      const stepNodes = Array.from(document.querySelectorAll('.step-card p'));
      stepNodes.forEach((node, index) => {
        if (modeData.steps[index]) {
          node.textContent = modeData.steps[index];
        }
      });
    }

    const noteMap = isPlainObject(modeData.downloadNotes) ? modeData.downloadNotes : {};
    const downloadNotes = Array.from(document.querySelectorAll('#download .download-note'));
    Object.entries(noteMap).forEach(([key, note]) => {
      const idx = Number.parseInt(key, 10);
      if (Number.isInteger(idx) && downloadNotes[idx] && note) {
        downloadNotes[idx].textContent = note;
      }
    });
  };

  const applyReleaseCopyFallback = () => {
    applyContentMode({
      selectors: {
        '.hero-subtitle': '会聊天、会说话、会记忆的 AI 桌宠。',
        '#demo .section-title': '🎬 快速演示',
        '.demo-media-tip': '将演示素材放入 docs/assets/ 后可自动展示。',
        '.config-page-subtitle': '集中完成关键参数配置与运行检查。',
        '.version-panel-desc': '最近版本重点更新一览。'
      },
      features: [
        '接入主流大模型，日常聊天自然流畅。',
        '支持唤醒词、语音输入与拟声回复。',
        '向量记忆机制，长期保留关键对话。',
        '可感知桌面上下文并给出主动反馈。',
        '根据语气切换表情与动作状态。',
        '支持提醒指令，到点主动提示。'
      ],
      steps: [
        '下载并解压最新版安装包。',
        '填写 API Key 完成基础配置。',
        '双击启动脚本即可运行。'
      ],
      downloadNotes: {
        '1': '推荐流程：配置自检 → 一键应用 → 启动桌宠。',
        '2': '发布前建议先本地完整验证一次。'
      }
    });
  };

  const setupContentCopy = () => {
    const copyMode = setCopyMode(getCopyModeFromUrl());

    loadContentData()
      .then((contentData) => {
        applyContentMode(contentData.default);
        if (copyMode === 'release') {
          applyContentMode(contentData.release);
        }
      })
      .catch((error) => {
        console.warn('[馨语Ai桌宠] content.json 校验失败，已使用页面静态文案。', error);
        if (copyMode === 'release') {
          applyReleaseCopyFallback();
        }
      });
  };

  const setupReleaseInfo = () => {
    const releaseText = document.getElementById('latestReleaseText');
    const releaseDate = document.getElementById('latestReleaseDate');
    const sourceCodeLink = document.getElementById('sourceCodeLink');
    const footerGithubLink = document.getElementById('footerGithubLink');
    const downloadBtn = document.getElementById('downloadGithubBtn');

    if (!releaseText || !releaseDate) {
      return;
    }

    const candidates = [
      sourceCodeLink ? sourceCodeLink.href : '',
      footerGithubLink ? footerGithubLink.href : '',
      downloadBtn ? downloadBtn.href : '',
      'https://github.com/MaQinglin-665/AI-chat'
    ];

    const repo = candidates
      .map((url) => parseGithubRepo(url))
      .find((slug) => Boolean(slug));

    if (!repo) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6500);

    fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json'
      },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((release) => {
        if (!release || typeof release !== 'object') {
          return;
        }

        const tagName = String(release.tag_name || release.name || '').trim();
        if (tagName) {
          releaseText.textContent = tagName;
        }

        const rawDate = release.published_at || release.created_at;
        if (rawDate) {
          const date = new Date(rawDate);
          if (!Number.isNaN(date.getTime())) {
            const dateText = [
              date.getFullYear(),
              String(date.getMonth() + 1).padStart(2, '0'),
              String(date.getDate()).padStart(2, '0')
            ].join('-');
            releaseDate.textContent = `发布时间：${dateText}`;
          }
        }

        if (downloadBtn && release.html_url) {
          downloadBtn.href = release.html_url;
        }
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(timer);
      });
  };

  const setupScrollProgress = () => {
    const existing = document.querySelector('.scroll-progress');
    const progressBar = existing || document.createElement('div');
    if (!existing) {
      progressBar.className = 'scroll-progress';
      progressBar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(progressBar);
    }

    const updateProgress = () => {
      const doc = document.documentElement;
      const total = Math.max(0, doc.scrollHeight - doc.clientHeight);
      const ratio = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      progressBar.style.setProperty('--scroll-progress', String(ratio));
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  };

  const setupSmoothScroll = () => {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') {
          return;
        }

        const target = document.querySelector(href);
        if (!target) {
          return;
        }

        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  const setupNavbar = () => {
    const header = document.querySelector('.site-header');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));
    const sectionNavLinks = navLinks.filter((link) => {
      const href = link.getAttribute('href') || '';
      return href.startsWith('#');
    });
    const sections = Array.from(document.querySelectorAll('main section[id]'));

    const setScrolledState = () => {
      if (!header) {
        return;
      }

      header.classList.toggle('scrolled', window.scrollY > 12);
    };

    const setActiveLink = () => {
      if (!sections.length || !sectionNavLinks.length) {
        return;
      }

      const marker = window.scrollY + 140;
      let activeId = sections[0].id;

      sections.forEach((section) => {
        if (marker >= section.offsetTop) {
          activeId = section.id;
        }
      });

      sectionNavLinks.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${activeId}`;
        link.classList.toggle('active', isActive);
      });
    };

    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navMenu.classList.toggle('open', !expanded);
      });

      navLinks.forEach((link) => {
        link.addEventListener('click', () => {
          navToggle.setAttribute('aria-expanded', 'false');
          navMenu.classList.remove('open');
        });
      });
    }

    window.addEventListener('scroll', () => {
      setScrolledState();
      setActiveLink();
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 767 && navMenu && navToggle) {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    setScrolledState();
    setActiveLink();
  };

  const setupRevealAnimations = () => {
    const revealItems = document.querySelectorAll('.fade-in-up');
    if (!revealItems.length) {
      return;
    }

    const staggerGroups = [
      '.features-grid',
      '.steps-grid',
      '.demo-lab-grid',
      '.media-showcase',
      '.config-layout',
      '.changelog-layout',
      '.faq-list',
      '.plan-list'
    ];

    staggerGroups.forEach((selector) => {
      const groups = Array.from(document.querySelectorAll(selector));
      groups.forEach((group) => {
        const nodes = Array.from(group.querySelectorAll('.fade-in-up'));
        nodes.forEach((node, index) => {
          if (!(node instanceof HTMLElement) || node.dataset.revealDelayApplied === '1') {
            return;
          }
          const delay = Math.min(index * 75, 360);
          node.style.transitionDelay = `${delay}ms`;
          node.dataset.revealDelayApplied = '1';
        });
      });
    });

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, ob) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            ob.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px'
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  };

  const setupCardSpotlight = () => {
    const targets = Array.from(document.querySelectorAll(
      '.feature-card, .step-card, .demo-lab-card, .plan-card, .faq-item, .media-tile'
    ));
    if (!targets.length) {
      return;
    }

    const updateSpotlight = (event) => {
      const card = event.currentTarget;
      if (!(card instanceof HTMLElement)) {
        return;
      }
      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--spotlight-x', `${Math.min(100, Math.max(0, x)).toFixed(2)}%`);
      card.style.setProperty('--spotlight-y', `${Math.min(100, Math.max(0, y)).toFixed(2)}%`);
    };

    const resetSpotlight = (event) => {
      const card = event.currentTarget;
      if (!(card instanceof HTMLElement)) {
        return;
      }
      card.style.removeProperty('--spotlight-x');
      card.style.removeProperty('--spotlight-y');
    };

    targets.forEach((card) => {
      card.addEventListener('pointermove', updateSpotlight);
      card.addEventListener('pointerleave', resetSpotlight);
      card.addEventListener('pointercancel', resetSpotlight);
    });
  };

  const setupVersionPanel = () => {
    const panel = document.getElementById('versionPanel');
    const backdrop = document.getElementById('versionPanelBackdrop');
    const closeBtn = document.getElementById('versionPanelCloseBtn');
    const triggers = Array.from(document.querySelectorAll('.version-history-trigger'));

    if (!panel || !backdrop || !closeBtn || !triggers.length) {
      return;
    }

    let activeTrigger = null;
    let isOpen = false;

    const closePanel = () => {
      if (!isOpen) {
        return;
      }

      isOpen = false;
      panel.classList.remove('open');
      backdrop.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('version-panel-open');

      window.setTimeout(() => {
        backdrop.hidden = true;
        panel.hidden = true;
      }, 200);

      if (activeTrigger && typeof activeTrigger.focus === 'function') {
        activeTrigger.focus();
      }
      activeTrigger = null;
    };

    const openPanel = (triggerButton) => {
      if (isOpen) {
        return;
      }

      isOpen = true;
      activeTrigger = triggerButton;
      backdrop.hidden = false;
      panel.hidden = false;
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('version-panel-open');

      window.requestAnimationFrame(() => {
        panel.classList.add('open');
        backdrop.classList.add('open');
      });

      if (typeof panel.focus === 'function') {
        panel.focus();
      }
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        if (isOpen) {
          closePanel();
          return;
        }
        openPanel(trigger);
      });
    });

    closeBtn.addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);

    panel.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.matches('a[href]')) {
        closePanel();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    });
  };

  const setupVersionHistoryData = () => {
    const lists = Array.from(document.querySelectorAll('.version-panel-list'));
    if (!lists.length) {
      return;
    }

    const isConfigPage = document.body && document.body.classList.contains('config-page');
    const linkPrefix = isConfigPage ? 'index.html#' : '#';
    const releaseText = document.getElementById('latestReleaseText');
    const releaseDate = document.getElementById('latestReleaseDate');

    loadVersionsData()
      .then((payload) => {
        const versions = payload.versions || [];
        if (!versions.length) {
          return;
        }

        const releaseMode = isReleaseModeActive();
        lists.forEach((list) => {
          const fragment = document.createDocumentFragment();

          versions.forEach((item) => {
            const li = document.createElement('li');
            const title = document.createElement('h4');
            title.textContent = `${item.tag}（${item.date}）`;

            const desc = document.createElement('p');
            desc.textContent = releaseMode && item.releaseSummary ? item.releaseSummary : item.panelSummary;

            const wrap = document.createElement('p');
            const link = document.createElement('a');
            link.className = 'version-view-link';
            link.href = `${linkPrefix}${item.logAnchor}`;
            link.textContent = '查看变更';
            wrap.appendChild(link);

            li.appendChild(title);
            li.appendChild(desc);
            li.appendChild(wrap);
            fragment.appendChild(li);
          });

          if (fragment.childNodes.length) {
            list.innerHTML = '';
            list.appendChild(fragment);
          }
        });

        if (releaseText && versions[0] && versions[0].tag) {
          releaseText.textContent = `${versions[0].tag}（以 Release 为准）`;
        }
        if (releaseDate && payload.updatedAt) {
          releaseDate.textContent = `发布时间：${payload.updatedAt}`;
        }
      })
      .catch((error) => {
        console.warn('[馨语Ai桌宠] versions.json 校验失败，已使用静态版本列表。', error);
      });
  };

  const setupChangelogData = () => {
    const timeline = document.querySelector('#changelog .timeline');
    if (!timeline) {
      return;
    }
    let latestVersions = [];
    const COLLAPSE_AFTER_LINES = 4;

    const buildLines = (item) => {
      const lines = Array.isArray(item.highlights)
        ? item.highlights.filter((line) => typeof line === 'string' && line.trim().length > 0)
        : [];
      if (lines.length) {
        return lines;
      }
      if (item.panelSummary) {
        return [item.panelSummary];
      }
      if (item.summary) {
        return [item.summary];
      }
      return [];
    };

    const renderTimeline = () => {
      if (!latestVersions.length) {
        return;
      }

      const createLine = (line, animationDelay) => {
        const p = document.createElement('p');
        p.className = 'timeline-line';
        p.style.animationDelay = `${animationDelay}s`;
        p.textContent = `· ${line}`;
        return p;
      };

      const fragment = document.createDocumentFragment();
      latestVersions.forEach((item, index) => {
        const li = document.createElement('li');
        li.id = item.logAnchor;
        li.className = 'timeline-item';

        const title = document.createElement('h4');
        const tag = document.createElement('span');
        tag.className = 'timeline-version';
        tag.textContent = item.tag;
        const date = document.createElement('span');
        date.className = 'timeline-date';
        date.textContent = item.date;
        const titleText = document.createElement('span');
        titleText.className = 'timeline-title';
        titleText.textContent = item.title;
        title.appendChild(tag);
        title.appendChild(date);
        title.appendChild(titleText);
        li.appendChild(title);

        const lines = buildLines(item);
        const visibleLines = lines.slice(0, COLLAPSE_AFTER_LINES);
        visibleLines.forEach((line, lineIndex) => {
          li.appendChild(createLine(line, Math.min(0.08 * (index + lineIndex), 0.54)));
        });

        if (lines.length > COLLAPSE_AFTER_LINES) {
          const details = document.createElement('details');
          details.className = 'timeline-more';
          const summary = document.createElement('summary');
          summary.textContent = `查看该版本更多变更（${lines.length - COLLAPSE_AFTER_LINES}）`;
          details.appendChild(summary);
          lines.slice(COLLAPSE_AFTER_LINES).forEach((line, extraIndex) => {
            details.appendChild(createLine(line, Math.min(0.08 * (index + visibleLines.length + extraIndex), 0.54)));
          });
          li.appendChild(details);
        }

        fragment.appendChild(li);
      });

      timeline.innerHTML = '';
      timeline.appendChild(fragment);
    };

    loadVersionsData()
      .then((payload) => {
        const versions = payload.versions || [];
        if (!versions.length) {
          return;
        }
        latestVersions = versions;
        renderTimeline();
      })
      .catch((error) => {
        console.warn('[馨语Ai桌宠] 更新日志渲染失败，已使用静态日志。', error);
      });
  };

  const setupFAQAccordion = () => {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) {
      return;
    }

    faqItems.forEach((item) => {
      const trigger = item.querySelector('.faq-question');
      if (!trigger) {
        return;
      }

      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        item.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  };

  const setupBackToTop = () => {
    const button = document.getElementById('backToTop');
    if (!button) {
      return;
    }

    const toggleVisibility = () => {
      button.classList.toggle('visible', window.scrollY > 300);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    toggleVisibility();
  };

  const setupCopyConfig = () => {
    const copyButton = document.getElementById('copyConfigBtn');
    const preview = document.getElementById('configPreview');
    const toast = document.getElementById('toast');

    if (!copyButton || !preview || !toast) {
      return;
    }

    let toastTimer = null;

    const showToast = (message) => {
      toast.textContent = message;
      toast.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.classList.remove('show');
      }, 1600);
    };

    const copyText = async (text) => {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const tempArea = document.createElement('textarea');
      tempArea.value = text;
      tempArea.setAttribute('readonly', 'readonly');
      tempArea.style.position = 'absolute';
      tempArea.style.left = '-9999px';
      document.body.appendChild(tempArea);
      tempArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempArea);
    };

    copyButton.addEventListener('click', async () => {
      const text = preview.textContent.trim();
      if (!text) {
        showToast('暂无可复制内容');
        return;
      }

      try {
        await copyText(text);
        copyButton.textContent = '✅ 已复制!';
        showToast('已复制!');
        window.setTimeout(() => {
          copyButton.textContent = '📋 复制配置';
        }, 1200);
      } catch (error) {
        showToast('复制失败，请手动复制');
      }
    });
  };

  const setupChatDemo = () => {
    const log = document.getElementById('chatDemoLog');
    const startBtn = document.getElementById('chatDemoStartBtn');
    const nextBtn = document.getElementById('chatDemoNextBtn');
    const resetBtn = document.getElementById('chatDemoResetBtn');

    if (!log || !startBtn || !nextBtn || !resetBtn) {
      return;
    }

    const dialogLines = [
      { role: 'user', text: '塔菲，今天我有点焦虑，事情有点多。' },
      { role: 'taffy', text: '我在哦。先一起深呼吸三次，我们把任务拆成最小步骤，一步一步来。' },
      { role: 'user', text: '那我应该先做哪件事？' },
      { role: 'taffy', text: '先做最短、最容易完成的一项，拿到第一份进度感。然后我陪你排第二项。' },
      { role: 'user', text: '好，先把配置检查做完。' },
      { role: 'taffy', text: '太棒了，这就是启动 momentum 的方式。完成后告诉我，我给你下一步建议。' }
    ];

    let cursor = -1;
    let typingTimer = null;
    let isTyping = false;
    let isStarted = false;

    const clearTyping = () => {
      if (typingTimer) {
        window.clearTimeout(typingTimer);
        typingTimer = null;
      }
      isTyping = false;
    };

    const updateButtons = () => {
      const reachedEnd = cursor >= dialogLines.length - 1 && isStarted;
      startBtn.disabled = isStarted;
      nextBtn.disabled = !isStarted || isTyping || reachedEnd;
      resetBtn.disabled = !isStarted && cursor === -1;
    };

    const setPlaceholder = () => {
      log.innerHTML = '<p class="chat-demo-placeholder">点击“开始演示”，看看馨语Ai桌宠的聊天风格。</p>';
      cursor = -1;
      isStarted = false;
      clearTyping();
      updateButtons();
    };

    const scrollLogToBottom = () => {
      log.scrollTop = log.scrollHeight;
    };

    const appendLine = (line) => {
      const row = document.createElement('article');
      row.className = `chat-line ${line.role === 'user' ? 'from-user' : 'from-taffy'}`;

      const name = document.createElement('p');
      name.className = 'chat-name';
      name.textContent = line.role === 'user' ? '你' : '馨语Ai桌宠';

      const bubble = document.createElement('p');
      bubble.className = 'chat-bubble';

      row.appendChild(name);
      row.appendChild(bubble);
      log.appendChild(row);
      scrollLogToBottom();

      if (line.role === 'taffy') {
        clearTyping();
        isTyping = true;
        let index = 0;

        const typeNext = () => {
          index += 1;
          bubble.textContent = line.text.slice(0, index);
          scrollLogToBottom();
          if (index < line.text.length) {
            typingTimer = window.setTimeout(typeNext, 22);
            return;
          }
          clearTyping();
          updateButtons();
        };

        typeNext();
        return;
      }

      bubble.textContent = line.text;
      updateButtons();
    };

    const showCurrentLine = () => {
      if (cursor < 0 || cursor >= dialogLines.length || isTyping) {
        return;
      }
      appendLine(dialogLines[cursor]);
    };

    startBtn.addEventListener('click', () => {
      log.innerHTML = '';
      isStarted = true;
      cursor = 0;
      clearTyping();
      updateButtons();
      showCurrentLine();
    });

    nextBtn.addEventListener('click', () => {
      if (!isStarted || isTyping) {
        return;
      }
      cursor += 1;
      if (cursor >= dialogLines.length) {
        cursor = dialogLines.length - 1;
        updateButtons();
        return;
      }
      showCurrentLine();
    });

    resetBtn.addEventListener('click', () => {
      setPlaceholder();
    });

    setPlaceholder();
  };

  const setupDemoMedia = () => {
    const mediaTiles = Array.from(document.querySelectorAll('[data-media-tile]'));
    if (!mediaTiles.length) {
      return;
    }

    const initMediaTile = (tile) => {
      if (!tile || tile.dataset.mediaInitialized === '1') {
        return;
      }
      tile.dataset.mediaInitialized = '1';

      const video = tile.querySelector('.media-video');
      const placeholder = tile.querySelector('.media-placeholder');
      if (!video || !placeholder) {
        return;
      }

      const source = video.querySelector('source');
      const sourcePath = source ? source.getAttribute('src') : 'assets/demo.mp4';

      const showMedia = () => {
        tile.classList.add('has-media');
      };

      const showMissing = () => {
        tile.classList.remove('has-media');
        placeholder.textContent = `未检测到素材：${sourcePath}`;
      };

      video.addEventListener('loadeddata', showMedia);
      video.addEventListener('canplay', showMedia);
      video.addEventListener('error', showMissing);

      if (video.readyState >= 2) {
        showMedia();
        return;
      }

      try {
        video.load();
      } catch (error) {
        showMissing();
      }

      window.setTimeout(() => {
        if (video.readyState >= 2) {
          showMedia();
        } else {
          showMissing();
        }
      }, 1200);
    };

    if (typeof window.IntersectionObserver === 'function') {
      const observer = new window.IntersectionObserver((entries, io) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          initMediaTile(entry.target);
          io.unobserve(entry.target);
        });
      }, {
        root: null,
        rootMargin: '260px 0px',
        threshold: 0.01
      });

      mediaTiles.forEach((tile) => observer.observe(tile));
      return;
    }

    mediaTiles.forEach((tile) => initMediaTile(tile));
  };

  const setupVoiceDemo = () => {
    const textArea = document.getElementById('voiceDemoText');
    const endpointInput = document.getElementById('voiceDemoEndpoint');
    const voiceSelect = document.getElementById('voiceDemoVoice');
    const rateInput = document.getElementById('voiceDemoRate');
    const rateValue = document.getElementById('voiceDemoRateValue');
    const volumeInput = document.getElementById('voiceDemoVolume');
    const volumeValue = document.getElementById('voiceDemoVolumeValue');
    const playBackendBtn = document.getElementById('voiceDemoPlayBackendBtn');
    const playBrowserBtn = document.getElementById('voiceDemoPlayBrowserBtn');
    const stopBtn = document.getElementById('voiceDemoStopBtn');
    const status = document.getElementById('voiceDemoStatus');

    if (!textArea || !endpointInput || !playBackendBtn || !playBrowserBtn || !stopBtn || !status) {
      return;
    }

    let currentAudio = null;
    let currentObjectUrl = '';

    const setStatus = (message, type = '') => {
      status.textContent = message;
      status.classList.remove('is-ok', 'is-error', 'is-warn');
      if (type) {
        status.classList.add(type);
      }
    };

    const cleanupAudio = () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
      }
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = '';
      }
    };

    const stopPlayback = () => {
      cleanupAudio();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };

    const getInputText = () => String(textArea.value || '').trim();

    const resolveEndpoint = () => String(endpointInput.value || '').trim();

    const parseEndpoint = (endpointValue) => {
      if (!endpointValue) {
        return null;
      }

      try {
        const parsed = new URL(endpointValue, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.toString();
        }
        return null;
      } catch (error) {
        return null;
      }
    };

    const chooseZhVoice = () => {
      if (!('speechSynthesis' in window)) {
        return null;
      }
      const voices = window.speechSynthesis.getVoices();
      if (!voices || !voices.length) {
        return null;
      }

      return voices.find((voice) => /zh/i.test(voice.lang))
        || voices.find((voice) => /Chinese/i.test(voice.name))
        || voices[0];
    };

    const toFixedText = (value, digits) => {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        return String(value);
      }
      return numberValue.toFixed(digits);
    };

    const updateVoiceSliderLabels = () => {
      if (rateInput && rateValue) {
        rateValue.textContent = toFixedText(rateInput.value, 2);
      }
      if (volumeInput && volumeValue) {
        volumeValue.textContent = toFixedText(volumeInput.value, 2);
      }
    };

    const getVoiceRate = () => {
      if (!rateInput) {
        return 1.0;
      }
      const parsed = Number(rateInput.value);
      return Number.isFinite(parsed) ? parsed : 1.0;
    };

    const getVoiceVolume = () => {
      if (!volumeInput) {
        return 0.9;
      }
      const parsed = Number(volumeInput.value);
      return Number.isFinite(parsed) ? parsed : 0.9;
    };

    const getVoiceName = () => {
      if (!voiceSelect) {
        return 'auto';
      }
      return String(voiceSelect.value || 'auto');
    };

    const chooseVoiceByName = (voiceName) => {
      if (!('speechSynthesis' in window)) {
        return null;
      }
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        return null;
      }
      if (voiceName && voiceName !== 'auto') {
        const matched = voices.find((item) => item.name === voiceName);
        if (matched) {
          return matched;
        }
      }
      return chooseZhVoice();
    };

    const populateVoiceSelect = () => {
      if (!voiceSelect) {
        return;
      }

      if (!('speechSynthesis' in window)) {
        voiceSelect.innerHTML = '<option value="auto">当前浏览器不支持</option>';
        voiceSelect.disabled = true;
        return;
      }

      const previousValue = voiceSelect.value || 'auto';
      const voices = window.speechSynthesis.getVoices();
      const orderedVoices = voices.slice().sort((a, b) => {
        const aIsZh = /zh/i.test(a.lang) ? 0 : 1;
        const bIsZh = /zh/i.test(b.lang) ? 0 : 1;
        if (aIsZh !== bIsZh) {
          return aIsZh - bIsZh;
        }
        return a.name.localeCompare(b.name, 'zh-CN');
      });

      voiceSelect.innerHTML = '';
      const autoOption = document.createElement('option');
      autoOption.value = 'auto';
      autoOption.textContent = '自动选择（中文优先）';
      voiceSelect.appendChild(autoOption);

      orderedVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name}（${voice.lang}）`;
        voiceSelect.appendChild(option);
      });

      const hasPrevious = Array.from(voiceSelect.options).some((option) => option.value === previousValue);
      voiceSelect.value = hasPrevious ? previousValue : 'auto';
      voiceSelect.disabled = false;
    };

    if (rateInput) {
      rateInput.addEventListener('input', updateVoiceSliderLabels);
      rateInput.addEventListener('change', updateVoiceSliderLabels);
    }
    if (volumeInput) {
      volumeInput.addEventListener('input', updateVoiceSliderLabels);
      volumeInput.addEventListener('change', updateVoiceSliderLabels);
    }

    updateVoiceSliderLabels();
    populateVoiceSelect();

    if ('speechSynthesis' in window) {
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelect);
      } else {
        window.speechSynthesis.onvoiceschanged = populateVoiceSelect;
      }
    }

    const setLoading = (isLoading) => {
      playBackendBtn.disabled = isLoading;
      playBrowserBtn.disabled = isLoading;
    };

    playBackendBtn.addEventListener('click', async () => {
      const text = getInputText();
      if (!text) {
        setStatus('请输入要试听的文本。', 'is-warn');
        return;
      }

      const endpoint = parseEndpoint(resolveEndpoint());
      if (!endpoint) {
        setStatus('后端地址无效，请填写 http(s) URL。', 'is-error');
        return;
      }

      stopPlayback();
      setLoading(true);
      setStatus('正在请求后端语音...', 'is-warn');

      try {
        const payload = {
          text,
          voice: getVoiceName(),
          rate: getVoiceRate(),
          volume: getVoiceVolume()
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const audioBlob = await response.blob();
        if (!audioBlob.size) {
          throw new Error('返回了空音频');
        }

        currentObjectUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(currentObjectUrl);
        currentAudio.volume = getVoiceVolume();

        currentAudio.addEventListener('ended', () => {
          cleanupAudio();
          setStatus('后端试听播放完成。', 'is-ok');
        });

        currentAudio.addEventListener('error', () => {
          cleanupAudio();
          setStatus('音频解码失败，请检查 TTS 返回格式。', 'is-error');
        });

        await currentAudio.play();
        setStatus('正在播放后端语音...', 'is-ok');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`后端试听失败：${message}`, 'is-error');
      } finally {
        setLoading(false);
      }
    });

    playBrowserBtn.addEventListener('click', () => {
      const text = getInputText();
      if (!text) {
        setStatus('请输入要试听的文本。', 'is-warn');
        return;
      }

      if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
        setStatus('当前浏览器不支持语音合成。', 'is-error');
        return;
      }

      stopPlayback();

      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = getVoiceRate();
      utterance.volume = getVoiceVolume();
      utterance.pitch = 1.0;

      const voice = chooseVoiceByName(getVoiceName());
      if (voice) {
        utterance.voice = voice;
      }

      utterance.addEventListener('start', () => {
        setStatus('正在使用浏览器语音播放...', 'is-ok');
      });

      utterance.addEventListener('end', () => {
        setStatus('浏览器试听播放完成。', 'is-ok');
      });

      utterance.addEventListener('error', () => {
        setStatus('浏览器语音播放失败。', 'is-error');
      });

      window.speechSynthesis.speak(utterance);
    });

    stopBtn.addEventListener('click', () => {
      stopPlayback();
      setStatus('已停止播放。', 'is-warn');
    });

    window.addEventListener('beforeunload', stopPlayback);
  };

  const setupRuntimeConsole = () => {
    if (!document.body || document.querySelector('.runtime-console-root')) {
      return;
    }

    const STORAGE_KEY = 'taffy-runtime-console-open';
    const MAX_LOGS = 260;
    const records = [];

    const root = document.createElement('div');
    root.className = 'runtime-console-root';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'runtime-console-toggle';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-controls', 'runtimeConsolePanel');

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'runtime-console-toggle-label';
    toggleLabel.textContent = '🧭 控制台';

    const toggleBadge = document.createElement('span');
    toggleBadge.className = 'runtime-console-toggle-badge';
    toggleBadge.textContent = '0';

    toggleBtn.appendChild(toggleLabel);
    toggleBtn.appendChild(toggleBadge);

    const panel = document.createElement('section');
    panel.className = 'runtime-console-panel';
    panel.id = 'runtimeConsolePanel';
    panel.hidden = true;

    const header = document.createElement('div');
    header.className = 'runtime-console-header';

    const title = document.createElement('h3');
    title.className = 'runtime-console-title';
    title.textContent = '运行时控制台';

    const actions = document.createElement('div');
    actions.className = 'runtime-console-actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'runtime-console-btn';
    copyBtn.textContent = '复制';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'runtime-console-btn';
    clearBtn.textContent = '清空';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'runtime-console-btn';
    closeBtn.textContent = '收起';

    actions.appendChild(copyBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(actions);

    const logBox = document.createElement('div');
    logBox.className = 'runtime-console-log';
    logBox.setAttribute('role', 'log');
    logBox.setAttribute('aria-live', 'polite');

    const status = document.createElement('p');
    status.className = 'runtime-console-status';
    status.textContent = '等待日志...';

    panel.appendChild(header);
    panel.appendChild(logBox);
    panel.appendChild(status);

    root.appendChild(toggleBtn);
    root.appendChild(panel);
    document.body.appendChild(root);

    const setOpen = (nextOpen) => {
      const isOpen = Boolean(nextOpen);
      root.classList.toggle('open', isOpen);
      panel.hidden = !isOpen;
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      try {
        window.localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0');
      } catch (error) {
        // ignore storage error
      }
      if (isOpen) {
        logBox.scrollTop = logBox.scrollHeight;
      }
    };

    const updateStatus = () => {
      const warnCount = records.filter((item) => item.level === 'warn').length;
      const errorCount = records.filter((item) => item.level === 'error').length;
      const alertCount = warnCount + errorCount;
      toggleBadge.textContent = String(alertCount);
      toggleBadge.classList.toggle('has-alert', alertCount > 0);
      status.textContent = `共 ${records.length} 条日志，警告 ${warnCount}，错误 ${errorCount}`;
    };

    const formatArg = (arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
      }
      const valueType = typeof arg;
      if (valueType === 'string') {
        return arg;
      }
      if (arg === null) {
        return 'null';
      }
      if (typeof arg === 'undefined') {
        return 'undefined';
      }
      if (valueType === 'number' || valueType === 'boolean' || valueType === 'bigint' || valueType === 'symbol') {
        return String(arg);
      }
      if (valueType === 'function') {
        return `[Function ${arg.name || 'anonymous'}]`;
      }
      try {
        return JSON.stringify(arg);
      } catch (error) {
        try {
          return String(arg);
        } catch (stringError) {
          return '[Unserializable Value]';
        }
      }
    };

    const appendRecord = (level, message) => {
      const now = new Date();
      const stamp = now.toTimeString().slice(0, 8);
      const line = `[${stamp}] [${String(level || 'log').toUpperCase()}] ${String(message || '')}`;

      records.push({ level, line });
      if (records.length > MAX_LOGS) {
        records.shift();
      }

      const shouldAutoScroll = (logBox.scrollTop + logBox.clientHeight) >= (logBox.scrollHeight - 24);
      const row = document.createElement('div');
      row.className = `runtime-console-entry ${level}`;
      row.textContent = line;
      logBox.appendChild(row);
      while (logBox.childElementCount > MAX_LOGS) {
        logBox.removeChild(logBox.firstChild);
      }
      if (shouldAutoScroll) {
        logBox.scrollTop = logBox.scrollHeight;
      }
      updateStatus();
    };

    const writeLog = (level, args) => {
      const text = Array.isArray(args) ? args.map((item) => formatArg(item)).join(' ') : formatArg(args);
      appendRecord(level, text);
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

    toggleBtn.addEventListener('click', () => {
      const opened = root.classList.contains('open');
      setOpen(!opened);
    });
    const runConsoleAction = async (action) => {
      if (action === 'close') {
        setOpen(false);
        return;
      }
      if (action === 'clear') {
        records.length = 0;
        logBox.innerHTML = '';
        updateStatus();
        status.textContent = '日志已清空。';
        return;
      }
      if (action === 'copy') {
        const text = records.map((item) => item.line).join('\n');
        if (!text.trim()) {
          appendRecord('log', '没有可复制的日志。');
          return;
        }
        try {
          await copyText(text);
          appendRecord('log', '日志已复制到剪贴板。');
        } catch (error) {
          appendRecord('error', `复制失败：${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    const bindConsoleAction = (button, action) => {
      if (!button) {
        return;
      }
      let lastTriggerAt = 0;
      const handler = (event) => {
        const now = Date.now();
        if (now - lastTriggerAt < 180) {
          return;
        }
        lastTriggerAt = now;
        event.preventDefault();
        event.stopPropagation();
        const originalText = button.textContent || '';
        void runConsoleAction(action);
        if (action === 'copy') {
          button.textContent = '已复制';
          window.setTimeout(() => {
            button.textContent = originalText;
          }, 900);
        } else if (action === 'clear') {
          button.textContent = '已清空';
          window.setTimeout(() => {
            button.textContent = originalText;
          }, 900);
        }
      };
      button.addEventListener('click', handler);
      button.addEventListener('pointerup', handler);
      button.addEventListener('touchend', handler, { passive: false });
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        handler(event);
      });
    };

    bindConsoleAction(closeBtn, 'close');
    bindConsoleAction(clearBtn, 'clear');
    bindConsoleAction(copyBtn, 'copy');

    if (!window.__taffyConsoleSinks) {
      window.__taffyConsoleSinks = [];
    }
    const sink = (level, args) => writeLog(level, args);
    window.__taffyConsoleSinks.push(sink);

    if (!window.__taffyConsolePatched) {
      const levelMap = {
        log: 'log',
        info: 'log',
        debug: 'log',
        warn: 'warn',
        error: 'error'
      };
      const originals = {};
      Object.keys(levelMap).forEach((method) => {
        if (typeof console[method] === 'function') {
          originals[method] = console[method].bind(console);
          console[method] = (...args) => {
            if (Array.isArray(window.__taffyConsoleSinks)) {
              window.__taffyConsoleSinks.forEach((fn) => {
                try {
                  fn(levelMap[method], args);
                } catch (error) {
                  // ignore sink error
                }
              });
            }
            originals[method](...args);
          };
        }
      });
      window.__taffyConsolePatched = true;
      window.__taffyConsoleOriginals = originals;
    }

    window.addEventListener('error', (event) => {
      const head = `${event.message || '未知错误'} @ ${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`;
      const stack = event.error && event.error.stack ? `\n${event.error.stack}` : '';
      appendRecord('error', `${head}${stack}`);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      if (reason instanceof Error) {
        appendRecord('error', `Promise 未处理异常: ${reason.message}\n${reason.stack || ''}`);
        return;
      }
      appendRecord('error', `Promise 未处理异常: ${formatArg(reason)}`);
    });

    let defaultOpen = false;
    try {
      defaultOpen = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (error) {
      defaultOpen = false;
    }
    setOpen(defaultOpen);
    updateStatus();
    appendRecord('log', '控制台已就绪。');
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('js-enabled');
    setupScrollProgress();
    setupLazyLive2D();
    setupRuntimeConsole();
    setupThemeToggle();
    setupContentCopy();
    setupGithubLinks();
    setupVersionHistoryData();
    setupChangelogData();
    setupReleaseInfo();
    setupSmoothScroll();
    setupNavbar();
    setupVersionPanel();
    setupRevealAnimations();
    setupCardSpotlight();
    setupFAQAccordion();
    setupBackToTop();
    setupCopyConfig();
    setupChatDemo();
    setupDemoMedia();
    setupVoiceDemo();
  });
})();
