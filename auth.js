/* =============================================
   ThesisHub · 认证模块 (localStorage)
   ============================================= */

const Auth = {
  /** 获取当前登录用户 */
  currentUser() {
    try {
      const data = localStorage.getItem('th_session');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  /** 是否已登录 */
  isLoggedIn() {
    return !!this.currentUser();
  },

  /** 注册 */
  register({ username, email, password, title }) {
    const users = DB.get('users');

    // 查重
    if (users.find(u => u.username === username)) {
      return { ok: false, msg: '用户名已被注册' };
    }
    if (users.find(u => u.email === email)) {
      return { ok: false, msg: '邮箱已被注册' };
    }
    if (username.length < 2 || username.length > 20) {
      return { ok: false, msg: '用户名长度为 2-20 个字符' };
    }
    if (password.length < 6) {
      return { ok: false, msg: '密码至少 6 位' };
    }

    const user = {
      id: DB.id(),
      username: username.trim(),
      email: email.trim(),
      password: btoa(password), // 简单编码（演示用）
      title: title || '',
      bio: '这个用户很懒，还没有填写简介',
      createdAt: Date.now(),
      avatar: null
    };

    users.push(user);
    DB.set('users', users);

    // 自动登录
    this.login({ username, password });
    return { ok: true, msg: '注册成功' };
  },

  /** 登录 */
  login({ username, password }) {
    const users = DB.get('users');
    const user = users.find(u =>
      (u.username === username || u.email === username) &&
      u.password === btoa(password)
    );

    if (!user) {
      return { ok: false, msg: '用户名/邮箱或密码错误' };
    }

    const session = {
      id: user.id,
      username: user.username,
      email: user.email,
      title: user.title,
      bio: user.bio,
      createdAt: user.createdAt
    };

    localStorage.setItem('th_session', JSON.stringify(session));
    return { ok: true, msg: '登录成功', user: session };
  },

  /** 登出 */
  logout() {
    localStorage.removeItem('th_session');
  },

  /** 获取用户信息（含统计） */
  getProfile(userId) {
    const users = DB.get('users');
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const userPosts = Posts.byUser(userId);
    const totalVotes = userPosts.reduce((sum, p) => sum + (p.votes || 0), 0);
    const totalViews = userPosts.reduce((sum, p) => sum + (p.views || 0), 0);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      title: user.title,
      bio: user.bio,
      createdAt: user.createdAt,
      postCount: userPosts.length,
      totalVotes,
      totalViews,
      posts: userPosts
    };
  },

  /** 更新个人资料 */
  updateProfile({ title, bio }) {
    const session = this.currentUser();
    if (!session) return { ok: false, msg: '请先登录' };

    const users = DB.get('users');
    const user = users.find(u => u.id === session.id);
    if (!user) return { ok: false, msg: '用户不存在' };

    if (title !== undefined) user.title = title;
    if (bio !== undefined) user.bio = bio;
    DB.set('users', users);

    // 更新 session
    session.title = user.title;
    session.bio = user.bio;
    localStorage.setItem('th_session', JSON.stringify(session));

    return { ok: true, msg: '更新成功' };
  },

  /** 获取头像颜色（基于用户名） */
  avatarColor(username) {
    const colors = [
      'linear-gradient(135deg, #6366f1, #818cf8)',
      'linear-gradient(135deg, #f59e0b, #fbbf24)',
      'linear-gradient(135deg, #ec4899, #f472b6)',
      'linear-gradient(135deg, #10b981, #34d399)',
      'linear-gradient(135deg, #8b5cf6, #a78bfa)',
      'linear-gradient(135deg, #ef4444, #f87171)',
      'linear-gradient(135deg, #06b6d4, #22d3ee)',
      'linear-gradient(135deg, #f97316, #fb923c)'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  /** 获取头像首字 */
  avatarChar(username) {
    return username ? username.charAt(0) : '?';
  },

  /** 获取用户数 */
  count() {
    return DB.get('users').length;
  }
};
