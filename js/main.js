// ===== 主题切换 =====
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');

  function currentTheme() {
    return root.getAttribute('data-theme') || 'light';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      syncGiscusTheme(next);
    });
  }

  window.__currentTheme = currentTheme;
})();

// ===== 滚动时给导航加阴影 =====
(function () {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > 8);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ===== 元素进入视口时淡入 =====
(function () {
  const targets = document.querySelectorAll('.fade-in');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, i) {
      if (entry.isIntersecting) {
        const el = entry.target;
        setTimeout(function () { el.classList.add('visible'); }, i * 80);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(function (el) { observer.observe(el); });
})();

// ===== 搜索 + 标签筛选 =====
(function () {
  const grid = document.getElementById('postGrid');
  if (!grid) return; // 不在首页就跳过

  const cards = Array.prototype.slice.call(grid.querySelectorAll('.post-card'));
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const tagCloud = document.getElementById('tagCloud');
  const resultInfo = document.getElementById('resultInfo');
  const emptyState = document.getElementById('emptyState');

  let activeTag = '全部';
  let keyword = '';

  // ---------- 生成标签云 ----------
  const tagSet = {};
  cards.forEach(function (card) {
    const tags = (card.dataset.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    tags.forEach(function (t) {
      tagSet[t] = (tagSet[t] || 0) + 1;
    });
  });

  const allTags = Object.keys(tagSet).sort(function (a, b) {
    return tagSet[b] - tagSet[a] || a.localeCompare(b);
  });

  function makeTagButton(text, count, isAll) {
    const btn = document.createElement('button');
    btn.className = 'tag' + (isAll ? ' active' : '');
    btn.dataset.tag = text;
    btn.innerHTML = text + (isAll ? '' : '<span class="tag-count">' + count + '</span>');
    return btn;
  }

  tagCloud.appendChild(makeTagButton('全部', cards.length, true));
  allTags.forEach(function (t) {
    tagCloud.appendChild(makeTagButton(t, tagSet[t], false));
  });

  tagCloud.addEventListener('click', function (e) {
    const btn = e.target.closest('.tag');
    if (!btn) return;
    tagCloud.querySelectorAll('.tag').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    activeTag = btn.dataset.tag;

    // 同步到 URL，方便分享和刷新
    const url = new URL(window.location);
    if (activeTag === '全部') {
      url.searchParams.delete('tag');
    } else {
      url.searchParams.set('tag', activeTag);
    }
    history.replaceState(null, '', url);

    applyFilter();
  });

  // ---------- 搜索 ----------
  searchInput.addEventListener('input', function () {
    keyword = searchInput.value.trim().toLowerCase();
    searchClear.hidden = !keyword;
    applyFilter();
  });

  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    keyword = '';
    searchClear.hidden = true;
    searchInput.focus();
    applyFilter();
  });

  // 按 Esc 清空
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') searchClear.click();
  });

  // ---------- 过滤逻辑 ----------
  function applyFilter() {
    let visible = 0;

    cards.forEach(function (card) {
      const title = (card.dataset.title || '').toLowerCase();
      const excerpt = (card.dataset.excerpt || '').toLowerCase();
      const tags = (card.dataset.tags || '').toLowerCase();

      const matchTag = activeTag === '全部' || tags.split(',').map(t => t.trim()).indexOf(activeTag.toLowerCase()) > -1;
      const matchKeyword = !keyword ||
        title.indexOf(keyword) > -1 ||
        excerpt.indexOf(keyword) > -1 ||
        tags.indexOf(keyword) > -1;

      const show = matchTag && matchKeyword;

      if (show) {
        card.hidden = false;
        card.classList.add('visible');
        visible++;
      } else {
        card.hidden = true;
      }
    });

    // 结果提示
    if (visible === 0) {
      resultInfo.textContent = '';
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      if (keyword && activeTag !== '全部') {
        resultInfo.textContent = '「' + activeTag + '」下有 ' + visible + ' 篇包含「' + keyword + '」的文章';
      } else if (keyword) {
        resultInfo.textContent = '找到 ' + visible + ' 篇包含「' + keyword + '」的文章';
      } else if (activeTag !== '全部') {
        resultInfo.textContent = '「' + activeTag + '」下有 ' + visible + ' 篇文章';
      } else {
        resultInfo.textContent = '共 ' + visible + ' 篇文章';
      }
    }
  }

  // ---------- 读取 URL 参数 ----------
  (function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    if (tag) {
      const target = Array.prototype.slice.call(tagCloud.querySelectorAll('.tag'))
        .find(function (btn) { return btn.dataset.tag === tag; });
      if (target) {
        tagCloud.querySelectorAll('.tag').forEach(el => el.classList.remove('active'));
        target.classList.add('active');
        activeTag = tag;
      }
    }
  })();

  applyFilter();
})();

// ===== Giscus 评论主题同步 =====
function syncGiscusTheme(theme) {
  const iframe = document.querySelector('iframe.giscus-frame');
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme: theme } } },
    'https://giscus.app'
  );
}

(function () {
  if (!document.querySelector('.giscus')) return;

  // 监听 giscus iframe 被插入页面
  const observer = new MutationObserver(function () {
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
      const apply = function () {
        syncGiscusTheme(window.__currentTheme ? window.__currentTheme() : 'light');
      };
      iframe.addEventListener('load', apply);
      apply();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 兜底：页面加载完再试一次
  window.addEventListener('load', function () {
    setTimeout(function () {
      syncGiscusTheme(window.__currentTheme ? window.__currentTheme() : 'light');
    }, 800);
  });
})();