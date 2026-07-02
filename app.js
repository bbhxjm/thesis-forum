/* =============================================
   ThesisHub · 全局交互脚本
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ─── 导航栏滚动效果 ───
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (navbar) {
      if (y > 100) {
        navbar.style.background = 'rgba(11, 13, 20, 0.95)';
        navbar.style.borderBottomColor = 'var(--border)';
      } else {
        navbar.style.background = 'rgba(11, 13, 20, 0.8)';
        navbar.style.borderBottomColor = 'transparent';
      }
    }
  });

  // ─── 回到顶部按钮 ───
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('show', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // ─── 登录态感知 UI ───
  renderAuthUI();

  // ─── 用户下拉菜单 ───
  const navUser = document.querySelector('.nav-user');
  const dropdown = document.querySelector('.dropdown-menu');
  if (navUser && dropdown) {
    navUser.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdown.classList.remove('show'));
    dropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // ─── 登出 ───
  const logoutBtn = document.querySelector('.btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
      showToast('已退出登录', 'info');
      setTimeout(() => window.location.href = 'index.html', 300);
    });
  }

  // ─── 移动端菜单 ───
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const drawerOverlay = document.querySelector('.mobile-drawer-overlay');
  const drawer = document.querySelector('.mobile-drawer');
  const drawerClose = document.querySelector('.mobile-drawer-close');

  function openDrawer() {
    if (drawerOverlay) drawerOverlay.classList.add('show');
    if (drawer) drawer.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (drawerOverlay) drawerOverlay.classList.remove('show');
    if (drawer) drawer.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (mobileBtn) mobileBtn.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  // ─── 话题标签切换 (首页) ───
  const chips = document.querySelectorAll('.topic-chip');
  chips.forEach(c => {
    c.addEventListener('click', () => {
      chips.forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      // 触发筛选
      if (typeof filterPostsByTag === 'function') {
        filterPostsByTag(c.textContent.trim());
      }
    });
  });

  // ─── 排序标签切换 ───
  const sortTabs = document.querySelectorAll('.sort-tab');
  sortTabs.forEach(t => {
    t.addEventListener('click', () => {
      sortTabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      if (typeof sortPosts === 'function') {
        sortPosts(t.textContent.trim());
      }
    });
  });

  // ─── 搜索 ───
  const searchInput = document.querySelector('.hero-search input');
  const searchBtn = document.querySelector('.btn-search');

  function doSearch() {
    const val = searchInput ? searchInput.value.trim() : '';
    if (!val) {
      showToast('请输入搜索关键词', 'info');
      return;
    }
    // 跳转到首页并附带搜索参数
    window.location.href = `index.html?search=${encodeURIComponent(val)}`;
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', doSearch);
  }

  // ─── 投票功能 (动态绑定) ───
  document.addEventListener('click', function(e) {
    const voteBtn = e.target.closest('.vote-btn');
    if (!voteBtn) return;

    if (!Auth.isLoggedIn()) {
      showToast('请先登录后投票', 'error');
      return;
    }

    const card = voteBtn.closest('.post-card');
    if (!card) return;
    const postId = card.dataset.postId;
    if (!postId) return;

    const isUp = voteBtn.classList.contains('up');
    const direction = isUp ? 1 : -1;
    const count = card.querySelector('.vote-num');
    if (!count) return;

    const result = Posts.vote(postId, Auth.currentUser().id, direction);
    if (result) {
      count.textContent = DB.formatNum(result.votes);
      // 更新按钮样式
      card.querySelectorAll('.vote-btn').forEach(b => {
        b.classList.remove('up-voted', 'down-voted');
      });
      if (result.myVote === 1) card.querySelector('.vote-btn.up')?.classList.add('up-voted');
      if (result.myVote === -1) card.querySelector('.vote-btn.down')?.classList.add('down-voted');
    }
  });

  // ─── 帖子点击 ───
  document.addEventListener('click', function(e) {
    const title = e.target.closest('.post-title');
    if (!title) return;
    const card = title.closest('.post-card');
    if (!card) return;
    const postId = card.dataset.postId;
    if (postId) {
      Posts.addView(postId);
      window.location.href = `post.html?id=${postId}`;
    }
  });

  // ─── 用户头像/名称点击跳转 ───
  document.addEventListener('click', function(e) {
    const authorEl = e.target.closest('.post-author');
    if (!authorEl) return;
    e.preventDefault();
    const card = authorEl.closest('.post-card');
    if (!card) return;
    const userId = card.dataset.authorId;
    if (userId) {
      window.location.href = `profile.html?id=${userId}`;
    }
  });

  // ─── Toast 通知系统 ───
  window.showToast = function(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };
});

// ─── 渲染登录态 UI ───
function renderAuthUI() {
  const user = Auth.currentUser();
  const navActions = document.querySelector('.nav-actions');
  const mobileDrawer = document.querySelector('.mobile-drawer .drawer-links');

  if (!navActions) return;

  if (user) {
    // 替换登录按钮为个人头像
    const publishedBtn = navActions.querySelector('.btn-primary');
    const loginBtn = navActions.querySelector('.btn-ghost');

    if (loginBtn) {
      const color = Auth.avatarColor(user.username);
      const char = Auth.avatarChar(user.username);
      const dropdownHTML = `
        <div style="position:relative">
          <a href="profile.html?id=${user.id}" class="nav-user">
            <div class="avatar" style="background: ${color}">${char}</div>
            <span class="nav-username">${user.username}</span>
            <span class="nav-dropdown-icon">▾</span>
          </a>
          <div class="dropdown-menu">
            <a href="profile.html?id=${user.id}">👤 我的主页</a>
            <a href="publish.html">✍️ 发布帖子</a>
            <a href="profile.html?id=${user.id}">⚙️ 编辑资料</a>
            <div class="dropdown-divider"></div>
            <button class="btn-logout danger">🚪 退出登录</button>
          </div>
        </div>
      `;
      loginBtn.outerHTML = dropdownHTML;
    }
  } else {
    // 确保登录按钮存在
    const hasLogin = navActions.querySelector('.btn-ghost');
    if (!hasLogin) {
      navActions.innerHTML = `
        <a href="login.html" class="btn btn-ghost">登录</a>
        <a href="publish.html" class="btn btn-primary">发布帖子</a>
      `;
    }
  }

  // 移动端菜单渲染
  if (mobileDrawer) {
    if (user) {
      const color = Auth.avatarColor(user.username);
      const char = Auth.avatarChar(user.username);
      const userSection = document.querySelector('.drawer-user');
      if (userSection) {
        userSection.innerHTML = `
          <div class="avatar" style="background: ${color}">${char}</div>
          <div class="drawer-username">${user.username}</div>
          <div class="drawer-title">${user.title || '学者'}</div>
        `;
      }
      // 已有的 drawer-link 保留
    } else {
      const userSection = document.querySelector('.drawer-user');
      if (userSection) {
        userSection.innerHTML = `
          <div class="avatar" style="background: linear-gradient(135deg, #6366f1, #818cf8)">?</div>
          <div class="drawer-username">未登录</div>
          <a href="login.html" class="btn btn-primary btn-sm" style="margin-top:12px;display:inline-flex">登录 / 注册</a>
        `;
      }
    }
  }
}
