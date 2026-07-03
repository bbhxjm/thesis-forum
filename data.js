/* =============================================
   ThesisHub · 数据层 v2 (API 优先 → localStorage 回退)
   所有方法均返回 Promise，兼容 async/await
   ============================================= */

// -------- 配置 --------
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : 'https://thesis-hub-api.onrender.com/api';

let _apiOnline = true; // 乐观假设，首次失败后设为 false
let _apiProbed = false;

// 探测 API 是否在线
(async function probe() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    _apiOnline = res.ok;
  } catch { _apiOnline = false; }
  _apiProbed = true;
  if (!_apiOnline) console.log('📡 API 离线，使用本地存储');
})();

async function _api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...opts, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ msg: `HTTP ${res.status}` }));
      throw new Error(err.msg || '请求失败');
    }
    _apiOnline = true;
    return res.json();
  } catch (e) {
    _apiOnline = false;
    throw e;
  }
}

// -------- 本地存储工具（回退）--------
const _DB = {
  get(collection) {
    try { return JSON.parse(localStorage.getItem(`th_${collection}`)) || []; }
    catch { return []; }
  },
  set(collection, data) {
    localStorage.setItem(`th_${collection}`, JSON.stringify(data));
  },
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },
  timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} 个月前`;
    return `${Math.floor(months / 12)} 年前`;
  },
  formatNum(n) {
    if (typeof n !== 'number') n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k';
    return String(n);
  }
};

/* =============================================
   帖子 API
   ============================================= */
const Posts = {
  async all() {
    if (_apiOnline) { try { const d = await _api('GET', '/posts'); return d.posts || d; } catch {} }
    return _PostsLocal.all();
  },
  async getById(id) {
    if (_apiOnline) { try { const d = await _api('GET', `/posts/${id}`); return d.post || d; } catch {} }
    return _PostsLocal.getById(id);
  },
  async create(data) {
    if (_apiOnline) {
      try { const d = await _api('POST', '/posts', data); return d.post || d; } catch {}
    }
    return _PostsLocal.create(data);
  },
  async vote(id, userId, direction) {
    if (_apiOnline) { try { return await _api('POST', `/posts/${id}/vote`, { userId, direction }); } catch {} }
    return _PostsLocal.vote(id, userId, direction);
  },
  async addView(id) {
    if (_apiOnline) { try { await _api('POST', `/posts/${id}/view`); } catch {} }
    return _PostsLocal.addView(id);
  },
  async byTag(tag) {
    if (_apiOnline && tag && tag !== '全部') { try { const d = await _api('GET', `/posts/bytag?tag=${encodeURIComponent(tag)}`); return d.posts || d; } catch {} }
    return this.all();
  },
  async sorted(sortBy) {
    if (_apiOnline) { try { const d = await _api('GET', `/posts?sorted=${sortBy || 'hot'}`); return d.posts || d; } catch {} }
    return _PostsLocal.sorted(sortBy);
  },
  async search(keyword) {
    const q = (keyword || '').trim().toLowerCase();
    if (!q) return this.all();
    if (_apiOnline) { try { const d = await _api('GET', `/posts/search?q=${encodeURIComponent(q)}`); return d.posts || d; } catch {} }
    return _PostsLocal.search(keyword);
  },
  async byUser(userId) {
    if (_apiOnline) { try { const d = await _api('GET', `/posts?author=${userId}`); return d.posts || d; } catch {} }
    return _PostsLocal.byUser(userId);
  },
  async count() {
    if (_apiOnline) { try { const d = await _api('GET', '/stats'); return d.posts || 0; } catch {} }
    return _PostsLocal.count();
  }
};

// localStorage 回退实现（原 Posts 逻辑不变）
const _PostsLocal = {
  all() {
    return _DB.get('posts').sort((a, b) => b.createdAt - a.createdAt);
  },
  getById(id) {
    return _DB.get('posts').find(p => p.id === id) || null;
  },
  create({ title, content, desc, tags, authorId, authorName, authorTitle }) {
    const posts = _DB.get('posts');
    const post = {
      id: _DB.id(), title, content: content || '',
      desc: desc || title.slice(0, 120), tags: tags || [],
      authorId: authorId || 'guest', authorName: authorName || '匿名用户',
      authorTitle: authorTitle || '', createdAt: Date.now(),
      votes: 0, voters: {}, commentCount: 0, views: 0
    };
    posts.unshift(post);
    _DB.set('posts', posts);
    return post;
  },
  addView(id) {
    const posts = _DB.get('posts');
    const p = posts.find(x => x.id === id);
    if (p) { p.views = (p.views || 0) + 1; _DB.set('posts', posts); }
    return p;
  },
  vote(id, userId, direction) {
    const posts = _DB.get('posts');
    const p = posts.find(x => x.id === id);
    if (!p) return null;
    if (!p.voters) p.voters = {};
    const prev = p.voters[userId] || 0;
    if (direction === 1) {
      if (prev === 1) direction = 0;
      else p.votes += (prev === -1) ? 2 : 1;
    } else if (direction === -1) {
      if (prev === -1) direction = 0;
      else p.votes -= (prev === 1) ? 2 : 1;
    } else {
      p.votes -= prev;
    }
    if (direction === 0) delete p.voters[userId];
    else p.voters[userId] = direction;
    _DB.set('posts', posts);
    return { votes: p.votes, myVote: direction };
  },
  byTag(tag) {
    if (!tag || tag === '全部') return this.all();
    return this.all().filter(p => p.tags && p.tags.some(t => t.includes(tag)));
  },
  sorted(sortBy = 'hot') {
    const list = this.all();
    if (sortBy === 'newest') return list.sort((a, b) => b.createdAt - a.createdAt);
    if (sortBy === 'unanswered') return list.sort((a, b) => (a.commentCount || 0) - (b.commentCount || 0));
    return list.sort((a, b) => ((b.votes || 0) * 3 + (b.commentCount || 0) * 2 + (b.views || 0) * 0.5) - ((a.votes || 0) * 3 + (a.commentCount || 0) * 2 + (a.views || 0) * 0.5));
  },
  search(keyword) {
    const q = (keyword || '').trim().toLowerCase();
    if (!q) return this.all();
    return this.all().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.content && p.content.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.authorName && p.authorName.toLowerCase().includes(q))
    );
  },
  byUser(userId) {
    return this.all().filter(p => p.authorId === userId);
  },
  count() {
    return _DB.get('posts').length;
  }
};

/* =============================================
   评论 API
   ============================================= */
const Comments = {
  async byPost(postId) {
    if (_apiOnline) { try { const d = await _api('GET', `/posts/${postId}/comments`); return d.comments || d; } catch {} }
    return _CommentsLocal.byPost(postId);
  },
  async add({ postId, authorId, authorName, content }) {
    if (_apiOnline) {
      try { return await _api('POST', `/posts/${postId}/comments`, { authorId, authorName, content }); } catch {}
    }
    return _CommentsLocal.add({ postId, authorId, authorName, content });
  },
  async count() {
    if (_apiOnline) { try { const d = await _api('GET', '/stats'); return d.comments || 0; } catch {} }
    return _CommentsLocal.count();
  }
};

const _CommentsLocal = {
  byPost(postId) {
    return _DB.get('comments').filter(c => c.postId === postId).sort((a, b) => a.createdAt - b.createdAt);
  },
  add({ postId, authorId, authorName, content }) {
    const comments = _DB.get('comments');
    const c = { id: _DB.id(), postId, authorId: authorId || 'guest', authorName: authorName || '匿名用户', content, createdAt: Date.now() };
    comments.push(c);
    _DB.set('comments', comments);
    const posts = _DB.get('posts');
    const p = posts.find(x => x.id === postId);
    if (p) { p.commentCount = (p.commentCount || 0) + 1; _DB.set('posts', posts); }
    return c;
  },
  count() { return _DB.get('comments').length; }
};

/* =============================================
   种子数据（仅首次 localStorage 使用）
   ============================================= */
if (!localStorage.getItem('th_seeded')) {
  _seedLocalData();
}

function _seedLocalData() {
  localStorage.setItem('th_seeded', '1');
  const now = Date.now();
  const H = 3600000, D = 86400000;

  const seedUsers = [
    { id: 'user_li', username: '统计小白', title: '硕士二年级', bio: '量化研究方法学习中' },
    { id: 'user_zhang', username: '已发核心的学长', title: '博士三年级', bio: '已发3篇CSSCI，欢迎交流' },
    { id: 'user_wang', username: '学术新秀', title: '本科四年级', bio: '保研中，努力发论文' },
    { id: 'user_chen', username: '量化研究达人', title: '博士二年级', bio: 'SPSS/Mplus/AMOS 都熟' },
    { id: 'user_zhao', username: 'AI 探索者', title: '硕士三年级', bio: 'AI+学术交叉领域' },
    { id: 'demo', username: '演示用户', title: '博士一年级', bio: '这是一个演示账号' }
  ];

  const users = _DB.get('users');
  seedUsers.forEach(u => {
    if (!users.find(x => x.id === u.id)) {
      users.push({ ...u, email: `${u.id}@thesishub.demo`, password: btoa('123456'), createdAt: now - Math.random() * 30 * D });
    }
  });
  _DB.set('users', users);

  const seedPosts = [
    { id: 'post_sem', title: 'SPSS、AMOS 还是 Mplus？结构方程模型工具怎么选', content: '## 问题背景\n\n最近在做结构方程模型（SEM）的分析，但是不知道到底该选哪个软件。身边同学用的都不一样，搞得我很迷茫。\n\n## 我了解的情况\n\n### SPSS AMOS\n- ✅ 图形界面，拖拽操作，适合新手\n- ✅ 和 SPSS 无缝衔接\n- ❌ 功能有限，复杂的模型跑不了\n- ❌ 近年来更新缓慢\n\n### Mplus\n- ✅ 功能最强大，几乎什么模型都能跑\n- ✅ 学术界认可度最高\n- ❌ 语法学习曲线陡峭\n- ❌ 需要写代码\n\n### 其他选项\n- **R (lavaan包)**: 免费开源，但需要编程基础\n- **Python**: 灵活性高，但学术圈用得少\n\n## 想请教大家\n1. 你们用的什么工具？\n2. 初学者建议从哪个入手？\n3. 导师要求用某个特定软件怎么办？', desc: '想跑结构方程模型，但不知道哪个软件更适合。SPSS AMOS 画图方便但好像功能有限，Mplus 功能强但语法太难上手...', tags: ['📊 数据分析'], authorId: 'user_li', authorName: '统计小白', authorTitle: '硕士二年级', createdAt: now - 2 * H, votes: 128, voters: {}, commentCount: 0, views: 1200 },
    { id: 'post_litreview', title: '文献综述的 3 层写法：从「复读机」到「有洞见」', content: '## 写在前面\n\n去年写第一篇综述的时候，被导师批"像读书笔记"。后来琢磨了很久，总结出一个三层框架，分享给大家。\n\n## 第一层：归纳共识\n\n> "已有研究主要关注了A、B、C三个方向，在D问题上形成了共识..."\n\n## 第二层：发现矛盾\n\n> "然而，在E问题上，不同研究得出了矛盾的结论。F研究认为...而G研究则认为..."\n\n## 第三层：定位 Gap\n\n> "因此，目前尚不清楚H机制在I条件下的作用。本研究将填补这一空白。"\n\n## 实用技巧\n\n1. **做表格**: 把关键文献按"作者/年份/方法/发现/局限"列表格\n2. **找最近5年**: 重点看近5年的综述文章\n3. **反向引用**: 看到一篇好文章，去看它引用了谁，谁又引用了它', desc: '第一层归纳共识，第二层发现矛盾，第三层定位 gap。按这个框架来，导师说我的综述终于不是读书笔记了...', tags: ['✍️ 写作经验'], authorId: 'user_zhang', authorName: '已发核心的学长', authorTitle: '博士三年级', createdAt: now - 1 * D, votes: 89, voters: {}, commentCount: 0, views: 3400 },
    { id: 'post_defense', title: '答辩 PPT "最后一页" 到底怎么写才得体？', content: '## 问题\n\n答辩 PPT 的最后一张幻灯片，看似简单，其实有很多讲究。\n\n## 常见的结尾方案\n\n### 1. "谢谢聆听" ❌\n- "聆听"是敬语，用于自己听别人讲，不是对别人说的\n\n### 2. "请各位老师批评指正" ⚠️\n- 传统但略显老套，但绝对安全\n\n### 3. "恳请各位老师指导" ✅\n- 得体、谦逊，推荐使用\n\n### 4. Q&A 型 ✅\n- "敬请各位老师提问指导"\n\n## 我的建议\n\n推荐组合：**"恳请各位老师指导" + 致谢导师 + 背景放母校校徽**', desc: '"谢谢聆听"有争议，"请各位老师批评指正"又太老套。我整理了 8 种结尾方案，大家看看哪种最合适？', tags: ['📖 论文求助', '🎤 答辩经验'], authorId: 'user_wang', authorName: '学术新秀', authorTitle: '本科四年级', createdAt: now - 3 * D, votes: 67, voters: {}, commentCount: 0, views: 2100 },
    { id: 'post_sample', title: '问卷调查样本量到底怎么算？别再凭感觉发了', content: '## 样本量计算的常见方法\n\n### 1. 经验法则\n- 问卷题目数的 5-10 倍\n- 最低 100-200 份\n\n### 2. G*Power 计算（推荐）\n免费软件，输入效应量和统计检验力就能算。\n\n### 3. 不同研究方法的样本量要求\n\n| 研究方法 | 最低样本量 | 建议样本量 |\n|---------|-----------|-----------|\n| 描述性研究 | 100 | 200-400 |\n| 相关性研究 | 50 | 100-200 |\n| 结构方程模型 | 200 | 300-500 |\n\n### 4. 常见误区\n- ❌ 样本量越大越好\n- ❌ 只考虑总量不考虑分组\n- ❌ 回收率没算', desc: '用 G*Power 算还是用经验公式？不同研究方法对样本量的要求差异很大，这篇文章帮你一次性理清。', tags: ['📊 数据分析'], authorId: 'user_chen', authorName: '量化研究达人', authorTitle: '博士二年级', createdAt: now - 5 * D, votes: 45, voters: {}, commentCount: 0, views: 980 },
    { id: 'post_ai', title: 'ChatGPT 辅助论文写作：能用在哪、不能用在哪？', content: '## 实测总结\n\n过去一个月，我系统测试了 ChatGPT 在论文写作各个环节的表现。\n\n## ✅ 可以用的场景\n\n### 1. 语言润色\n- 中译英：质量很高\n- 语法检查：能发现细小错误\n\n### 2. 头脑风暴\n- 提供研究方向建议\n\n## ❌ 不能用的场景\n\n### 1. 直接生成正文 ❌\n- 内容空洞，引用文献可能是编的\n\n### 2. 数据分析 ❌\n- 不能理解复杂的统计结果\n\n## 使用建议\n> 把 AI 当工具，不当作者。\n\n用它来**改善表达**，而不是**创造内容**。\n用它来**拓展思路**，而不是**替代思考**。', desc: '实测了 AI 辅助写作的边界——润色语言没问题，但让它分析数据结果就翻车了。整理了一份 AI 学术写作使用手册...', tags: ['🤖 AI 学术'], authorId: 'user_zhao', authorName: 'AI 探索者', authorTitle: '硕士三年级', createdAt: now - 6 * D, votes: 34, voters: {}, commentCount: 0, views: 2800 }
  ];

  const seedComments = [
    { postId: 'post_sem', authorId: 'user_zhang', authorName: '已发核心的学长', content: '强烈推荐 Mplus！虽然入门难，但一旦上手就回不去了。', createdAt: now - 1.5 * H },
    { postId: 'post_sem', authorId: 'user_chen', authorName: '量化研究达人', content: '如果只是做简单的路径分析，AMOS 完全够用。', createdAt: now - 1 * H },
    { postId: 'post_sem', authorId: 'user_wang', authorName: '学术新秀', content: '我们导师说先学 AMOS 入门，再转 Mplus。', createdAt: now - 0.5 * H },
    { postId: 'post_litreview', authorId: 'user_chen', authorName: '量化研究达人', content: '表格法太真实了！每次写综述都先拉一个 Excel 表格。', createdAt: now - 20 * H },
    { postId: 'post_litreview', authorId: 'user_zhao', authorName: 'AI 探索者', content: '补充一点：可以用 Zotero + Notion 搭建文献管理系统。', createdAt: now - 18 * H },
    { postId: 'post_defense', authorId: 'user_zhang', authorName: '已发核心的学长', content: '我当时用的就是 "恳请各位老师指导"，答辩主席说很得体。', createdAt: now - 2.5 * D },
    { postId: 'post_ai', authorId: 'user_chen', authorName: '量化研究达人', content: '完全赞同！很多人把 ChatGPT 当成论文生成器，这是很危险的。', createdAt: now - 5.5 * D }
  ];

  // 写入种子数据（仅当 localStorage 中没有时）
  const existingPosts = _DB.get('posts').map(p => p.id);
  const posts = _DB.get('posts');
  seedPosts.forEach(sp => {
    if (!existingPosts.includes(sp.id)) {
      const v = {};
      seedUsers.forEach(u => { if (Math.random() > 0.5) v[u.id] = Math.random() > 0.3 ? 1 : -1; });
      sp.voters = v;
      sp.commentCount = seedComments.filter(c => c.postId === sp.id).length;
      posts.push(sp);
    }
  });
  _DB.set('posts', posts);

  const ec = _DB.get('comments').map(c => c.id);
  const comments = _DB.get('comments');
  seedComments.forEach(sc => {
    const c = { id: _DB.id(), ...sc, createdAt: sc.createdAt || (now - Math.random() * D) };
    if (!ec.includes(c.id)) comments.push(c);
  });
  _DB.set('comments', comments);
}

// 暴露 DB 工具到全局（供 HTML 页面使用）
const DB = {
  timeAgo: (ts) => _DB.timeAgo(ts),
  formatNum: (n) => _DB.formatNum(n),
  id: () => _DB.id(),
  get: (c) => _DB.get(c),
  set: (c, d) => _DB.set(c, d)
};
