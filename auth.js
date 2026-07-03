/* =============================================
   ThesisHub · 认证模块 v2 (API 优先 → localStorage 回退)
   ============================================= */

const Auth = {
  /** 获取当前登录用户 */
  currentUser() {
    try { return JSON.parse(localStorage.getItem('th_session')) || null; }
    catch { return null; }
  },

  isLoggedIn() {
    return !!this.currentUser();
  },

  /** 注册 */
  async register({ username, email, password, title }) {
    if (_apiOnline) {
      try {
        const res = await _api('POST', '/auth/register', { username, email, password, title });
        if (res.ok) {
          localStorage.setItem('th_session', JSON.stringify(res.user));
        }
        return res;
      } catch (e) {
        return { ok: false, msg: e.message };
      }
    }
    // localStorage 回退
    return _AuthLocal.register({ username, email, password, title });
  },

  /** 登录 */
  async login({ username, password }) {
    if (_apiOnline) {
      try {
        const res = await _api('POST', '/auth/login', { username, password });
        if (res.ok) {
          localStorage.setItem('th_session', JSON.stringify(res.user));
        }
        return res;
      } catch (e) {
        return { ok: false, msg: e.message };
      }
    }
    return _AuthLocal.login({ username, password });
  },

  /** 登出 */
  logout() {
    localStorage.removeItem('th_session');
  },

  /** 获取用户主页信息 */
  async getProfile(userId) {
    if (_apiOnline) {
      try { const d = await _api('GET', `/users/${userId}`); return d.user || d; } catch {}
    }
    return _AuthLocal.getProfile(userId);
  },

  /** 更新资料 */
  async updateProfile({ title, bio }) {
    const session = this.currentUser();
    if (!session) return { ok: false, msg: '请先登录' };

    if (_apiOnline) {
      try { return await _api('PUT', '/auth/profile', { userId: session.id, title, bio }); } catch {}
    }
    return _AuthLocal.updateProfile({ title, bio });
  },

  avatarColor(username) {
    const colors = [
      'linear-gradient(135deg, #2563eb, #60a5fa)',
      'linear-gradient(135deg, #059669, #34d399)',
      'linear-gradient(135deg, #d97706, #fbbf24)',
      'linear-gradient(135deg, #db2777, #f472b6)',
      'linear-gradient(135deg, #7c3aed, #a78bfa)',
      'linear-gradient(135deg, #dc2626, #f87171)',
      'linear-gradient(135deg, #0891b2, #22d3ee)',
      'linear-gradient(135deg, #ea580c, #fb923c)'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  avatarChar(username) { return username ? username.charAt(0) : '?'; },

  /** 用户总数 */
  async count() {
    if (_apiOnline) { try { const d = await _api('GET', '/stats'); return d.users || 0; } catch {} }
    return _AuthLocal.count();
  }
};

// localStorage 回退实现
const _AuthLocal = {
  register({ username, email, password, title }) {
    const users = _DB.get('users');
    if (users.find(u => u.username === username)) return { ok: false, msg: '用户名已被注册' };
    if (users.find(u => u.email === email)) return { ok: false, msg: '邮箱已被注册' };
    if (username.length < 2 || username.length > 20) return { ok: false, msg: '用户名长度为 2-20 个字符' };
    if (password.length < 6) return { ok: false, msg: '密码至少 6 位' };

    const user = { id: _DB.id(), username: username.trim(), email: email.trim(), password: btoa(password), title: title || '', bio: '这个用户很懒，还没有填写简介', createdAt: Date.now() };
    users.push(user);
    _DB.set('users', users);
    const session = { id: user.id, username: user.username, email: user.email, title: user.title, bio: user.bio, createdAt: user.createdAt };
    localStorage.setItem('th_session', JSON.stringify(session));
    return { ok: true, msg: '注册成功' };
  },

  login({ username, password }) {
    const users = _DB.get('users');
    const user = users.find(u => (u.username === username || u.email === username) && u.password === btoa(password));
    if (!user) return { ok: false, msg: '用户名/邮箱或密码错误' };
    const session = { id: user.id, username: user.username, email: user.email, title: user.title, bio: user.bio, createdAt: user.createdAt };
    localStorage.setItem('th_session', JSON.stringify(session));
    return { ok: true, msg: '登录成功', user: session };
  },

  getProfile(userId) {
    const users = _DB.get('users');
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    const userPosts = _PostsLocal.byUser(userId);
    return {
      id: user.id, username: user.username, email: user.email,
      title: user.title, bio: user.bio, createdAt: user.createdAt,
      postCount: userPosts.length,
      totalVotes: userPosts.reduce((s, p) => s + (p.votes || 0), 0),
      totalViews: userPosts.reduce((s, p) => s + (p.views || 0), 0),
      posts: userPosts
    };
  },

  updateProfile({ title, bio }) {
    const session = Auth.currentUser();
    if (!session) return { ok: false, msg: '请先登录' };
    const users = _DB.get('users');
    const user = users.find(u => u.id === session.id);
    if (!user) return { ok: false, msg: '用户不存在' };
    if (title !== undefined) user.title = title;
    if (bio !== undefined) user.bio = bio;
    _DB.set('users', users);
    session.title = user.title;
    session.bio = user.bio;
    localStorage.setItem('th_session', JSON.stringify(session));
    return { ok: true, msg: '更新成功' };
  },

  count() { return _DB.get('users').length; }
};
