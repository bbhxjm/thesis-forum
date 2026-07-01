// =============================================
// ThesisHub · 交互脚本
// =============================================

document.addEventListener('DOMContentLoaded', () => {

    // ─── 导航栏滚动效果 ───
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (y > 100) {
            navbar.style.background = 'rgba(11, 13, 20, 0.95)';
            navbar.style.borderBottomColor = 'var(--border)';
        } else {
            navbar.style.background = 'rgba(11, 13, 20, 0.8)';
            navbar.style.borderBottomColor = 'transparent';
        }
        lastScroll = y;
    });

    // ─── 搜索框 ───
    const searchInput = document.querySelector('.hero-search input');
    const searchBtn = document.querySelector('.btn-search');

    function doSearch() {
        const val = searchInput.value.trim();
        if (!val) return;
        alert(`🔍 搜索 "${val}"\n（演示站点，搜索功能待接入后端）`);
        searchInput.value = '';
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', doSearch);
    }

    // ─── 话题标签切换 ───
    const chips = document.querySelectorAll('.topic-chip');
    chips.forEach(c => {
        c.addEventListener('click', () => {
            chips.forEach(x => x.classList.remove('active'));
            c.classList.add('active');
        });
    });

    // ─── 排序标签切换 ───
    const sortTabs = document.querySelectorAll('.sort-tab');
    sortTabs.forEach(t => {
        t.addEventListener('click', () => {
            sortTabs.forEach(x => x.classList.remove('active'));
            t.classList.add('active');
        });
    });

    // ─── 投票功能 ───
    document.querySelectorAll('.post-card').forEach(card => {
        const upBtn = card.querySelector('.vote-btn.up');
        const downBtn = card.querySelector('.vote-btn.down');
        const count = card.querySelector('.vote-num');
        if (!upBtn || !downBtn || !count) return;

        let votes = parseInt(count.textContent.replace(/,/g, ''));
        let voted = 0; // 1: up, -1: down, 0: none

        upBtn.addEventListener('click', () => {
            if (voted === 1) { votes--; voted = 0; }
            else { votes += (voted === -1) ? 2 : 1; voted = 1; }
            count.textContent = formatNum(votes);
        });

        downBtn.addEventListener('click', () => {
            if (voted === -1) { votes++; voted = 0; }
            else { votes -= (voted === 1) ? 2 : 1; voted = -1; }
            count.textContent = formatNum(Math.max(0, votes));
        });

        function formatNum(n) {
            if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k';
            return String(n);
        }
    });

    // ─── 帖子点击 ───
    document.querySelectorAll('.post-title').forEach(t => {
        t.addEventListener('click', () => {
            alert('📄 帖子详情页（演示站点，待接入）');
        });
    });

    // ─── 发布按钮 ───
    const publishBtn = document.querySelector('.btn-primary');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
            alert('📝 发布功能即将上线！\n当前为静态演示站点。');
        });
    }

    // ─── 登录按钮 ───
    const loginBtn = document.querySelector('.btn-ghost');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            alert('🔐 登录功能（演示站点，待接入）');
        });
    }

    console.log('✅ ThesisHub 已加载');
});
