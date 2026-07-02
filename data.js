/* =============================================
   ThesisHub · 数据层 (localStorage 持久化)
   ============================================= */

const DB = {
  /** 读取集合 */
  get(collection) {
    try {
      return JSON.parse(localStorage.getItem(`th_${collection}`)) || [];
    } catch { return []; }
  },

  /** 写入集合 */
  set(collection, data) {
    localStorage.setItem(`th_${collection}`, JSON.stringify(data));
  },

  /** 生成短 ID */
  id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  /** 相对时间 */
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

  /** 格式化数字 */
  formatNum(n) {
    if (typeof n !== 'number') n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k';
    return String(n);
  },

  /** 判断是否已初始化种子数据 */
  _seeded: false
};

// =============================================
// 帖子操作
// =============================================
const Posts = {
  /** 获取所有帖子，按时间降序 */
  all() {
    return DB.get('posts').sort((a, b) => b.createdAt - a.createdAt);
  },

  /** 按 ID 获取单篇帖子 */
  getById(id) {
    return DB.get('posts').find(p => p.id === id) || null;
  },

  /** 创建帖子 */
  create({ title, content, desc, tags, authorId, authorName, authorTitle }) {
    const posts = DB.get('posts');
    const post = {
      id: DB.id(),
      title,
      content: content || '',
      desc: desc || title.slice(0, 120),
      tags: tags || [],
      authorId: authorId || 'guest',
      authorName: authorName || '匿名用户',
      authorTitle: authorTitle || '',
      createdAt: Date.now(),
      votes: 0,
      voters: {},
      commentCount: 0,
      views: 0
    };
    posts.unshift(post);
    DB.set('posts', posts);
    return post;
  },

  /** 增加浏览量 */
  addView(id) {
    const posts = DB.get('posts');
    const p = posts.find(x => x.id === id);
    if (p) { p.views = (p.views || 0) + 1; DB.set('posts', posts); }
    return p;
  },

  /** 投票 */
  vote(id, userId, direction) {
    // direction: 1 (up), -1 (down), 0 (取消)
    const posts = DB.get('posts');
    const p = posts.find(x => x.id === id);
    if (!p) return null;
    if (!p.voters) p.voters = {};
    const prev = p.voters[userId] || 0;

    if (direction === 1) {
      if (prev === 1) { direction = 0; }
      else { p.votes += (prev === -1) ? 2 : 1; }
    } else if (direction === -1) {
      if (prev === -1) { direction = 0; }
      else { p.votes -= (prev === 1) ? 2 : 1; }
    } else {
      p.votes -= prev;
    }

    if (direction === 0) delete p.voters[userId];
    else p.voters[userId] = direction;

    DB.set('posts', posts);
    return { votes: p.votes, myVote: direction };
  },

  /** 按话题筛选 */
  byTag(tag) {
    if (!tag || tag === '全部') return this.all();
    return this.all().filter(p => p.tags && p.tags.some(t => t.includes(tag)));
  },

  /** 按排序方式 */
  sorted(posts, sortBy = 'hot') {
    const list = [...posts];
    if (sortBy === 'newest') return list.sort((a, b) => b.createdAt - a.createdAt);
    if (sortBy === 'unanswered') return list.sort((a, b) => (a.commentCount || 0) - (b.commentCount || 0));
    // hot = 按热度 (votes * 3 + commentCount * 2 + views * 0.5)
    return list.sort((a, b) => {
      const scoreA = (a.votes || 0) * 3 + (a.commentCount || 0) * 2 + (a.views || 0) * 0.5;
      const scoreB = (b.votes || 0) * 3 + (b.commentCount || 0) * 2 + (b.views || 0) * 0.5;
      return scoreB - scoreA;
    });
  },

  /** 搜索 */
  search(keyword) {
    const q = keyword.toLowerCase().trim();
    if (!q) return this.all();
    return this.all().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.content && p.content.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.authorName && p.authorName.toLowerCase().includes(q))
    );
  },

  /** 获取某用户的帖子 */
  byUser(userId) {
    return this.all().filter(p => p.authorId === userId);
  },

  /** 获取帖子总数 */
  count() {
    return DB.get('posts').length;
  }
};

// =============================================
// 评论操作
// =============================================
const Comments = {
  /** 获取某帖子的评论 */
  byPost(postId) {
    return DB.get('comments')
      .filter(c => c.postId === postId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  /** 添加评论 */
  add({ postId, authorId, authorName, content }) {
    const comments = DB.get('comments');
    const c = {
      id: DB.id(),
      postId,
      authorId: authorId || 'guest',
      authorName: authorName || '匿名用户',
      content,
      createdAt: Date.now()
    };
    comments.push(c);
    DB.set('comments', comments);

    // 更新帖子的评论数
    const posts = DB.get('posts');
    const p = posts.find(x => x.id === postId);
    if (p) {
      p.commentCount = (p.commentCount || 0) + 1;
      DB.set('posts', posts);
    }
    return c;
  },

  /** 获取评论总数 */
  count() {
    return DB.get('comments').length;
  }
};

// =============================================
// 种子数据（首次使用时自动初始化）
// =============================================
function seedData() {
  if (localStorage.getItem('th_seeded')) return;
  localStorage.setItem('th_seeded', '1');

  const now = Date.now();
  const HOUR = 3600000;
  const DAY = 86400000;

  const seedUsers = [
    { id: 'user_li', username: '统计小白', title: '硕士二年级', bio: '量化研究方法学习中' },
    { id: 'user_zhang', username: '已发核心的学长', title: '博士三年级', bio: '已发3篇CSSCI，欢迎交流' },
    { id: 'user_wang', username: '学术新秀', title: '本科四年级', bio: '保研中，努力发论文' },
    { id: 'user_chen', username: '量化研究达人', title: '博士二年级', bio: 'SPSS/Mplus/AMOS 都熟' },
    { id: 'user_zhao', username: 'AI 探索者', title: '硕士三年级', bio: 'AI+学术交叉领域' },
    { id: 'demo', username: '演示用户', title: '博士一年级', bio: '这是一个演示账号' }
  ];

  // 自动注册种子用户（密码统一为 "123456"）
  const users = DB.get('users');
  seedUsers.forEach(u => {
    if (!users.find(x => x.id === u.id)) {
      users.push({
        ...u,
        email: `${u.id}@thesishub.demo`,
        password: btoa('123456'),
        createdAt: now - Math.random() * 30 * DAY,
        bio: u.bio || '这个用户很懒，还没有填写简介'
      });
    }
  });
  DB.set('users', users);

  const seedPosts = [
    {
      id: 'post_sem',
      title: 'SPSS、AMOS 还是 Mplus？结构方程模型工具怎么选',
      content: `## 问题背景\n\n最近在做结构方程模型（SEM）的分析，但是不知道到底该选哪个软件。身边同学用的都不一样，搞得我很迷茫。\n\n## 我了解的情况\n\n### SPSS AMOS\n- ✅ 图形界面，拖拽操作，适合新手\n- ✅ 和 SPSS 无缝衔接\n- ❌ 功能有限，复杂的模型跑不了\n- ❌ 近年来更新缓慢\n\n### Mplus\n- ✅ 功能最强大，几乎什么模型都能跑\n- ✅ 学术界认可度最高\n- ❌ 语法学习曲线陡峭\n- ❌ 需要写代码\n\n### 其他选项\n- **R (lavaan包)**: 免费开源，但需要编程基础\n- **Python**: 灵活性高，但学术圈用得少\n\n## 想请教大家\n1. 你们用的什么工具？\n2. 初学者建议从哪个入手？\n3. 导师要求用某个特定软件怎么办？`,
      desc: '想跑结构方程模型，但不知道哪个软件更适合。SPSS AMOS 画图方便但好像功能有限，Mplus 功能强但语法太难上手...',
      tags: ['📊 数据分析'],
      authorId: 'user_li',
      authorName: '统计小白',
      authorTitle: '硕士二年级',
      createdAt: now - 2 * HOUR,
      votes: 128,
      voters: {},
      commentCount: 0,
      views: 1200
    },
    {
      id: 'post_litreview',
      title: '文献综述的 3 层写法：从「复读机」到「有洞见」',
      content: `## 写在前面\n\n去年写第一篇综述的时候，被导师批"像读书笔记"。后来琢磨了很久，总结出一个三层框架，分享给大家。\n\n## 第一层：归纳共识\n\n> "已有研究主要关注了A、B、C三个方向，在D问题上形成了共识..."\n\n这是最基础的层次，把文献分类总结。绝大多数综述都能做到这一层。\n\n## 第二层：发现矛盾\n\n> "然而，在E问题上，不同研究得出了矛盾的结论。F研究认为...而G研究则认为..."\n\n这才是综述的价值所在——找到文献之间的冲突和张力。\n\n## 第三层：定位 Gap\n\n> "因此，目前尚不清楚H机制在I条件下的作用。本研究将填补这一空白。"\n\n最高境界——不仅知道别人研究了什么，还知道别人没研究什么。\n\n## 实用技巧\n\n1. **做表格**: 把关键文献按"作者/年份/方法/发现/局限"列表格\n2. **找最近5年**: 重点看近5年的综述文章，它们的参考文献就是你的宝库\n3. **反向引用**: 看到一篇好文章，去看它引用了谁，谁又引用了它`,
      desc: '第一层归纳共识，第二层发现矛盾，第三层定位 gap。按这个框架来，导师说我的综述终于不是读书笔记了...',
      tags: ['✍️ 写作经验'],
      authorId: 'user_zhang',
      authorName: '已发核心的学长',
      authorTitle: '博士三年级',
      createdAt: now - 1 * DAY,
      votes: 89,
      voters: {},
      commentCount: 0,
      views: 3400
    },
    {
      id: 'post_defense',
      title: '答辩 PPT "最后一页" 到底怎么写才得体？',
      content: `## 问题\n\n答辩 PPT 的最后一张幻灯片，看似简单，其实有很多讲究。\n\n## 常见的结尾方案\n\n### 1. "谢谢聆听" ❌\n- "聆听"是敬语，用于自己听别人讲，不是对别人说的\n- 很多老师会介意\n\n### 2. "请各位老师批评指正" ⚠️\n- 传统但略显老套\n- 不过绝对安全，不会出错\n\n### 3. "恳请各位老师指导" ✅\n- 得体、谦逊\n- 推荐使用\n\n### 4. 致谢型 ✅\n- "感谢各位老师的指导与帮助"\n- 如果有致谢名单也可以放\n\n### 5. 留白型 ⚠️\n- 只放一句引用或金句\n- 适合自信的大佬\n\n### 6. Q&A 型 ✅\n- "敬请各位老师提问指导"\n- 最实用，直接引导到问答环节\n\n## 我的建议\n\n推荐组合：**"恳请各位老师指导" + 致谢导师 + 背景放母校校徽**\n\n得体、安全、有温度。\n\n大家觉得哪种最好？`,
      desc: '"谢谢聆听"有争议，"请各位老师批评指正"又太老套。我整理了 8 种结尾方案，大家看看哪种最合适？',
      tags: ['📖 论文求助', '🎤 答辩经验'],
      authorId: 'user_wang',
      authorName: '学术新秀',
      authorTitle: '本科四年级',
      createdAt: now - 3 * DAY,
      votes: 67,
      voters: {},
      commentCount: 0,
      views: 2100
    },
    {
      id: 'post_sample',
      title: '问卷调查样本量到底怎么算？别再凭感觉发了',
      content: `## 样本量计算的常见方法\n\n### 1. 经验法则\n\n- 问卷题目数的 5-10 倍\n- 最低 100-200 份\n- 结构方程模型需要 300+ 份\n\n### 2. G*Power 计算（推荐）\n\n免费软件，输入效应量和统计检验力就能算。\n\n步骤：\n1. 选择检验方法（如 F test, t test）\n2. 输入效应量（Effect size）\n3. 设置 α = 0.05，Power = 0.80\n4. 得出所需样本量\n\n### 3. 不同研究方法的样本量要求\n\n| 研究方法 | 最低样本量 | 建议样本量 |\n|---------|-----------|-----------|\n| 描述性研究 | 100 | 200-400 |\n| 相关性研究 | 50 | 100-200 |\n| 回归分析 | 50+变量数×10 | 100-300 |\n| 结构方程模型 | 200 | 300-500 |\n| 实验研究 | 30/组 | 50+/组 |\n\n### 4. 常见误区\n\n- ❌ 样本量越大越好 → 过大容易导致统计显著但实际无意义\n- ❌ 只考虑总量 → 分组分析时每组也要够\n- ❌ 回收率没算 → 通常问卷回收率 30-50%，要发够\n\n### 实用建议\n\n先估一个数，用 G*Power 算一下，跟导师讨论，然后多发 20% 作为回收损耗。`,
      desc: '用 G*Power 算还是用经验公式？不同研究方法对样本量的要求差异很大，这篇文章帮你一次性理清。',
      tags: ['📊 数据分析'],
      authorId: 'user_chen',
      authorName: '量化研究达人',
      authorTitle: '博士二年级',
      createdAt: now - 5 * DAY,
      votes: 45,
      voters: {},
      commentCount: 0,
      views: 980
    },
    {
      id: 'post_ai',
      title: 'ChatGPT 辅助论文写作：能用在哪、不能用在哪？',
      content: `## 实测总结\n\n过去一个月，我系统测试了 ChatGPT 在论文写作各个环节的表现。\n\n## ✅ 可以用的场景\n\n### 1. 语言润色\n- 中译英：质量很高，比 DeepL 更自然\n- 语法检查：能发现细小错误\n- 句式优化：可以把长句拆短\n\n### 2. 头脑风暴\n- 提供研究方向建议\n- 帮助扩展思路\n- 生成关键词\n\n### 3. 代码辅助\n- 写数据分析脚本（R/Python）\n- 调试错误代码\n- 解释统计方法\n\n### 4. 文献搜索建议\n- 推荐关键词组合\n- 建议数据库和检索策略\n\n## ❌ 不能用的场景\n\n### 1. 直接生成正文 ❌\n- 内容空洞，缺乏深度\n- 引用文献可能是编的\n- 学术不端风险\n\n### 2. 数据分析 ❌\n- 不能理解复杂的统计结果\n- 会产生幻觉，编造数据\n\n### 3. 替代文献阅读 ❌\n- 不能替代你亲自读文献\n- 经常曲解原文意思\n\n## 使用建议\n\n> 把 AI 当工具，不当作者。\n\n用它来**改善表达**，而不是**创造内容**。\n用它来**拓展思路**，而不是**替代思考**。`,
      desc: '实测了 AI 辅助写作的边界——润色语言没问题，但让它分析数据结果就翻车了。整理了一份 AI 学术写作使用手册...',
      tags: ['🤖 AI 学术'],
      authorId: 'user_zhao',
      authorName: 'AI 探索者',
      authorTitle: '硕士三年级',
      createdAt: now - 6 * DAY,
      votes: 34,
      voters: {},
      commentCount: 0,
      views: 2800
    }
  ];

  // 初始评论
  const seedComments = [
    { postId: 'post_sem', authorId: 'user_zhang', authorName: '已发核心的学长', content: '强烈推荐 Mplus！虽然入门难，但一旦上手就回不去了。建议先看 Muthen 的官方教程。', createdAt: now - 1.5 * HOUR },
    { postId: 'post_sem', authorId: 'user_chen', authorName: '量化研究达人', content: '如果只是做简单的路径分析，AMOS 完全够用。但如果要做多层 SEM、交叉滞后面板模型，还是得上 Mplus。', createdAt: now - 1 * HOUR },
    { postId: 'post_sem', authorId: 'user_wang', authorName: '学术新秀', content: '我们导师说先学 AMOS 入门，再转 Mplus。我觉得这个路径挺好的。', createdAt: now - 0.5 * HOUR },
    { postId: 'post_litreview', authorId: 'user_chen', authorName: '量化研究达人', content: '表格法太真实了！我每次写综述都先拉一个 Excel 表格，把文献按主题分类，写起来快很多。', createdAt: now - 20 * HOUR },
    { postId: 'post_litreview', authorId: 'user_zhao', authorName: 'AI 探索者', content: '补充一点：可以用 Zotero + Notion 搭建文献管理系统，比 Excel 更高效。', createdAt: now - 18 * HOUR },
    { postId: 'post_defense', authorId: 'user_zhang', authorName: '已发核心的学长', content: '我当时用的就是 "恳请各位老师指导"，答辩主席说这个措辞很得体。推荐！', createdAt: now - 2.5 * DAY },
    { postId: 'post_ai', authorId: 'user_chen', authorName: '量化研究达人', content: '完全赞同！很多人把 ChatGPT 当成论文生成器，这是很危险的。', createdAt: now - 5.5 * DAY }
  ];

  const posts = DB.get('posts');
  const existing = posts.map(p => p.id);

  seedPosts.forEach(sp => {
    if (!existing.includes(sp.id)) {
      // 添加一些随机投票
      const voters = {};
      seedUsers.forEach((u, i) => {
        if (Math.random() > 0.5) {
          voters[u.id] = Math.random() > 0.3 ? 1 : -1;
        }
      });
      sp.voters = voters;
      sp.commentCount = seedComments.filter(c => c.postId === sp.id).length;
      posts.push(sp);
    }
  });
  DB.set('posts', posts);

  // 写评论
  const comments = DB.get('comments');
  const existingComments = comments.map(c => c.id);
  seedComments.forEach(sc => {
    const c = {
      id: DB.id(),
      ...sc,
      createdAt: sc.createdAt || (now - Math.random() * DAY)
    };
    if (!existingComments.includes(c.id)) {
      comments.push(c);
    }
  });
  DB.set('comments', comments);
}

// 自动初始化
seedData();
