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
      log.innerHTML = '<p class="chat-demo-placeholder">点击“开始演示”，看看 Taffy 的聊天风格。</p>';
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
      name.textContent = line.role === 'user' ? '你' : 'Taffy';

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

    mediaTiles.forEach((tile) => {
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
      }, 1000);
    });
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

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('js-enabled');
    setupThemeToggle();
    setupGithubLinks();
    setupReleaseInfo();
    setupSmoothScroll();
    setupNavbar();
    setupVersionPanel();
    setupRevealAnimations();
    setupFAQAccordion();
    setupBackToTop();
    setupCopyConfig();
    setupChatDemo();
    setupDemoMedia();
    setupVoiceDemo();
  });
})();
