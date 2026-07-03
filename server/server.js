/* =============================================
   ThesisHub · 后端 API 服务器
   Express + JSON 文件存储
   部署到 Render / Railway 等免费平台
   ============================================= */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// ---------- 中间件 ----------
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ---------- 数据库工具 ----------
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { posts: [], users: [], comments: [] };
  }
}

function writeDB(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---------- 初始化种子数据 ----------
function seedDB() {
  const db = readDB();
  if (db.posts.length > 0 && db.users.length > 0) return; // 已有数据

  const now = Date.now();
  const H = 3600000, D = 86400000;

  const seedUsers = [
    { id: 'user_li', username: '统计小白', title: '硕士二年级', bio: '量化研究方法学习中', email: 'li@thesishub.demo', password: '$2a$10$dummy', createdAt: now - 10 * D },
    { id: 'user_zhang', username: '已发核心的学长', title: '博士三年级', bio: '已发3篇CSSCI，欢迎交流', email: 'zhang@thesishub.demo', password: '$2a$10$dummy', createdAt: now - 15 * D },
    { id: 'user_wang', username: '学术新秀', title: '本科四年级', bio: '保研中，努力发论文', email: 'wang@thesishub.demo', password: '$2a$10$dummy', createdAt: now - 5 * D },
    { id: 'user_chen', username: '量化研究达人', title: '博士二年级', bio: 'SPSS/Mplus/AMOS 都熟', email: 'chen@thesishub.demo', password: '$2a$10$dummy', createdAt: now - 20 * D },
    { id: 'user_zhao', username: 'AI 探索者', title: '硕士三年级', bio: 'AI+学术交叉领域', email: 'zhao@thesishub.demo', password: '$2a$10$dummy', createdAt: now - 8 * D },
    { id: 'demo', username: '演示用户', title: '博士一年级', bio: '这是一个演示账号', email: 'demo@thesishub.demo', password: '$2a$10$dummy', createdAt: now - 1 * D }
  ];

  // 简单密码：所有种子用户密码都是 123456（base64 编码）
  seedUsers.forEach(u => { u.password = Buffer.from('123456').toString('base64'); });
  db.users = seedUsers;

  const seedPosts = [
    { id: 'post_sem', title: 'SPSS、AMOS 还是 Mplus？结构方程模型工具怎么选', content: '## 问题背景\n\n最近在做结构方程模型（SEM）的分析，但是不知道到底该选哪个软件。身边同学用的都不一样，搞得我很迷茫。\n\n## 我了解的情况\n\n### SPSS AMOS\n- ✅ 图形界面，拖拽操作，适合新手\n- ✅ 和 SPSS 无缝衔接\n- ❌ 功能有限，复杂的模型跑不了\n\n### Mplus\n- ✅ 功能最强大，几乎什么模型都能跑\n- ✅ 学术界认可度最高\n- ❌ 语法学习曲线陡峭\n\n## 想请教大家\n1. 你们用的什么工具？\n2. 初学者建议从哪个入手？', desc: '想跑结构方程模型，但不知道哪个软件更适合。SPSS AMOS 画图方便但好像功能有限，Mplus 功能强但语法太难上手...', tags: ['📊 数据分析'], authorId: 'user_li', authorName: '统计小白', authorTitle: '硕士二年级', createdAt: now - 2 * H, votes: 128, commentCount: 3, views: 1200 },
    { id: 'post_litreview', title: '文献综述的 3 层写法：从「复读机」到「有洞见」', content: '## 写在前面\n\n去年写第一篇综述的时候，被导师批"像读书笔记"。后来琢磨了很久，总结出一个三层框架。\n\n## 第一层：归纳共识\n\n> "已有研究主要关注了A、B、C三个方向"\n\n## 第二层：发现矛盾\n\n> "然而，在E问题上，不同研究得出了矛盾的结论"\n\n## 第三层：定位 Gap\n\n> "因此，目前尚不清楚H机制在I条件下的作用"\n\n## 实用技巧\n1. **做表格**: 把关键文献列表格\n2. **找最近5年**: 重点看近5年的综述文章', desc: '第一层归纳共识，第二层发现矛盾，第三层定位 gap。按这个框架来，导师说我的综述终于不是读书笔记了...', tags: ['✍️ 写作经验'], authorId: 'user_zhang', authorName: '已发核心的学长', authorTitle: '博士三年级', createdAt: now - 1 * D, votes: 89, commentCount: 2, views: 3400 },
    { id: 'post_defense', title: '答辩 PPT "最后一页" 到底怎么写才得体？', content: '## 问题\n\n答辩 PPT 的最后一张幻灯片，看似简单，其实有很多讲究。\n\n## 常见的结尾方案\n### 1. "谢谢聆听" ❌\n### 2. "请各位老师批评指正" ⚠️\n### 3. "恳请各位老师指导" ✅\n### 4. Q&A 型 ✅\n\n## 我的建议\n推荐组合：**"恳请各位老师指导" + 致谢导师 + 背景放母校校徽**', desc: '"谢谢聆听"有争议，"请各位老师批评指正"又太老套。我整理了多种结尾方案，大家看看哪种最合适？', tags: ['📖 论文求助', '🎤 答辩经验'], authorId: 'user_wang', authorName: '学术新秀', authorTitle: '本科四年级', createdAt: now - 3 * D, votes: 67, commentCount: 1, views: 2100 },
    { id: 'post_sample', title: '问卷调查样本量到底怎么算？别再凭感觉发了', content: '## 样本量计算的常见方法\n\n### 1. 经验法则\n- 问卷题目数的 5-10 倍\n- 最低 100-200 份\n\n### 2. G*Power 计算（推荐）\n免费软件，输入效应量和统计检验力就能算。\n\n### 3. 不同研究方法的样本量要求\n\n| 研究方法 | 最低样本量 | 建议样本量 |\n|---------|-----------|-----------|\n| 描述性研究 | 100 | 200-400 |\n| 结构方程模型 | 200 | 300-500 |', desc: '用 G*Power 算还是用经验公式？不同研究方法对样本量的要求差异很大。', tags: ['📊 数据分析'], authorId: 'user_chen', authorName: '量化研究达人', authorTitle: '博士二年级', createdAt: now - 5 * D, votes: 45, commentCount: 0, views: 980 },
    { id: 'post_ai', title: 'ChatGPT 辅助论文写作：能用在哪、不能用在哪？', content: '## 实测总结\n\n过去一个月，我系统测试了 ChatGPT 在论文写作各个环节的表现。\n\n## ✅ 可以用的场景\n### 1. 语言润色\n### 2. 头脑风暴\n### 3. 代码辅助\n\n## ❌ 不能用的场景\n### 1. 直接生成正文 ❌\n### 2. 数据分析 ❌\n\n## 使用建议\n> 把 AI 当工具，不当作者。', desc: '实测了 AI 辅助写作的边界——润色语言没问题，但让它分析数据结果就翻车了。', tags: ['🤖 AI 学术'], authorId: 'user_zhao', authorName: 'AI 探索者', authorTitle: '硕士三年级', createdAt: now - 6 * D, votes: 34, commentCount: 1, views: 2800 }
  ];
  db.posts = seedPosts;

  const seedComments = [
    { id: 'c1', postId: 'post_sem', authorId: 'user_zhang', authorName: '已发核心的学长', content: '强烈推荐 Mplus！虽然入门难，但一旦上手就回不去了。', createdAt: now - 1.5 * H },
    { id: 'c2', postId: 'post_sem', authorId: 'user_chen', authorName: '量化研究达人', content: '如果只是做简单的路径分析，AMOS 完全够用。', createdAt: now - 1 * H },
    { id: 'c3', postId: 'post_sem', authorId: 'user_wang', authorName: '学术新秀', content: '我们导师说先学 AMOS 入门，再转 Mplus。', createdAt: now - 0.5 * H },
    { id: 'c4', postId: 'post_litreview', authorId: 'user_chen', authorName: '量化研究达人', content: '表格法太真实了！每次写综述都先拉一个 Excel 表格。', createdAt: now - 20 * H },
    { id: 'c5', postId: 'post_litreview', authorId: 'user_zhao', authorName: 'AI 探索者', content: '补充一点：可以用 Zotero + Notion 搭建文献管理系统。', createdAt: now - 18 * H },
    { id: 'c6', postId: 'post_defense', authorId: 'user_zhang', authorName: '已发核心的学长', content: '我当时用的就是 "恳请各位老师指导"，答辩主席说很得体。', createdAt: now - 2.5 * D },
    { id: 'c7', postId: 'post_ai', authorId: 'user_chen', authorName: '量化研究达人', content: '完全赞同！很多人把 ChatGPT 当成论文生成器，这是很危险的。', createdAt: now - 5.5 * D }
  ];
  db.comments = seedComments;

  writeDB(db);
  console.log(`🌱 种子数据初始化完成: ${db.users.length} 用户, ${db.posts.length} 帖子, ${db.comments.length} 评论`);
}

// ---------- API 路由 ----------

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// ===== 统计 =====
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({ posts: db.posts.length, users: db.users.length, comments: db.comments.length });
});

// ===== 帖子 =====
app.get('/api/posts', (req, res) => {
  const db = readDB();
  let posts = [...db.posts].sort((a, b) => b.createdAt - a.createdAt);
  const { sorted, author, tag } = req.query;

  if (author) posts = posts.filter(p => p.authorId === author);
  if (tag) posts = posts.filter(p => p.tags && p.tags.some(t => t.includes(tag)));

  if (sorted === 'newest') posts.sort((a, b) => b.createdAt - a.createdAt);
  else if (sorted === 'unanswered') posts.sort((a, b) => (a.commentCount || 0) - (b.commentCount || 0));
  else posts.sort((a, b) => ((b.votes || 0) * 3 + (b.commentCount || 0) * 2 + (b.views || 0) * 0.5) - ((a.votes || 0) * 3 + (a.commentCount || 0) * 2 + (a.views || 0) * 0.5));

  res.json({ posts });
});

app.get('/api/posts/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ posts: [] });
  const db = readDB();
  const posts = db.posts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.desc || '').toLowerCase().includes(q) ||
    (p.content || '').toLowerCase().includes(q) ||
    (p.authorName || '').toLowerCase().includes(q) ||
    (p.tags || []).some(t => t.toLowerCase().includes(q))
  );
  res.json({ posts });
});

app.get('/api/posts/bytag', (req, res) => {
  const tag = req.query.tag || '';
  const db = readDB();
  const posts = db.posts.filter(p => p.tags && p.tags.some(t => t.includes(tag)));
  res.json({ posts });
});

app.get('/api/posts/:id', (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ msg: '帖子不存在' });
  res.json({ post });
});

app.post('/api/posts', (req, res) => {
  const { title, content, desc, tags, authorId, authorName, authorTitle } = req.body;
  if (!title || !content) return res.status(400).json({ msg: '标题和内容不能为空' });

  const db = readDB();
  const post = {
    id: genId(),
    title, content: content || '',
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
  db.posts.unshift(post);
  writeDB(db);
  res.status(201).json({ post });
});

app.post('/api/posts/:id/vote', (req, res) => {
  const { userId, direction } = req.body;
  const db = readDB();
  const p = db.posts.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ msg: '帖子不存在' });

  if (!p.voters) p.voters = {};
  const prev = p.voters[userId] || 0;

  let d = direction;
  if (d === 1) {
    if (prev === 1) d = 0;
    else p.votes += (prev === -1) ? 2 : 1;
  } else if (d === -1) {
    if (prev === -1) d = 0;
    else p.votes -= (prev === 1) ? 2 : 1;
  } else {
    p.votes -= prev;
  }

  if (d === 0) delete p.voters[userId];
  else p.voters[userId] = d;

  writeDB(db);
  res.json({ votes: p.votes, myVote: d });
});

app.post('/api/posts/:id/view', (req, res) => {
  const db = readDB();
  const p = db.posts.find(x => x.id === req.params.id);
  if (p) { p.views = (p.views || 0) + 1; writeDB(db); }
  res.json({ ok: true });
});

// ===== 评论 =====
app.get('/api/posts/:id/comments', (req, res) => {
  const db = readDB();
  const comments = db.comments.filter(c => c.postId === req.params.id).sort((a, b) => a.createdAt - b.createdAt);
  res.json({ comments });
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { authorId, authorName, content } = req.body;
  if (!content) return res.status(400).json({ msg: '评论内容不能为空' });

  const db = readDB();
  const c = {
    id: genId(),
    postId: req.params.id,
    authorId: authorId || 'guest',
    authorName: authorName || '匿名用户',
    content,
    createdAt: Date.now()
  };
  db.comments.push(c);

  const p = db.posts.find(x => x.id === req.params.id);
  if (p) p.commentCount = (p.commentCount || 0) + 1;

  writeDB(db);
  res.status(201).json(c);
});

// ===== 认证 =====
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, title } = req.body;
  if (!username || !email || !password) return res.status(400).json({ msg: '请填写所有必填项' });
  if (password.length < 6) return res.status(400).json({ msg: '密码至少6位' });

  const db = readDB();
  if (db.users.find(u => u.username === username)) return res.status(400).json({ msg: '用户名已被注册' });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ msg: '邮箱已被注册' });

  const user = {
    id: genId(),
    username: username.trim(),
    email: email.trim(),
    password: Buffer.from(password).toString('base64'),
    title: title || '',
    bio: '这个用户很懒，还没有填写简介',
    createdAt: Date.now()
  };
  db.users.push(user);
  writeDB(db);

  const session = { id: user.id, username: user.username, email: user.email, title: user.title, bio: user.bio, createdAt: user.createdAt };
  res.json({ ok: true, msg: '注册成功', user: session });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ msg: '请输入用户名和密码' });

  const db = readDB();
  const user = db.users.find(u =>
    (u.username === username || u.email === username) &&
    u.password === Buffer.from(password).toString('base64')
  );

  if (!user) return res.status(401).json({ msg: '用户名/邮箱或密码错误' });

  const session = { id: user.id, username: user.username, email: user.email, title: user.title, bio: user.bio, createdAt: user.createdAt };
  res.json({ ok: true, msg: '登录成功', user: session });
});

app.put('/api/auth/profile', (req, res) => {
  const { userId, title, bio } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ msg: '用户不存在' });

  if (title !== undefined) user.title = title;
  if (bio !== undefined) user.bio = bio;
  writeDB(db);

  const session = { id: user.id, username: user.username, email: user.email, title: user.title, bio: user.bio, createdAt: user.createdAt };
  res.json({ ok: true, msg: '更新成功', user: session });
});

// ===== 用户 =====
app.get('/api/users/:id', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ msg: '用户不存在' });

  const userPosts = db.posts.filter(p => p.authorId === user.id);
  res.json({
    user: {
      id: user.id, username: user.username, email: user.email,
      title: user.title, bio: user.bio, createdAt: user.createdAt,
      postCount: userPosts.length,
      totalVotes: userPosts.reduce((s, p) => s + (p.votes || 0), 0),
      totalViews: userPosts.reduce((s, p) => s + (p.views || 0), 0),
      posts: userPosts
    }
  });
});

// ===== 前端静态文件（开发用）=====
app.use(express.static(path.join(__dirname, '..')));

// ---------- 启动 ----------
seedDB();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ThesisHub API 运行在 http://localhost:${PORT}`);
});
