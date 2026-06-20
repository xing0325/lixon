// build-graph.mjs — assemble the LIXON knowledge graph from three live sources.
//
//   GitHub (gh CLI)  +  Claude memory (.md)  +  Obsidian vault (.md/.canvas)
//   → curated {nodes, edges, meta} → tools/graph-data.json
//   → injected into index.html between  /*__GRAPH_DATA__*/ … /*__GRAPH_DATA_END__*/
//
// Re-run after the sources change:  node tools/build-graph.mjs
// Zero dependencies. Credentials/secrets never enter the graph (see CRED_SKIP).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const INDEX     = path.join(ROOT, 'index.html');
const OUT_JSON  = path.join(__dirname, 'graph-data.json');

const MEM_DIR = 'C:/Users/david/.claude/projects/C--Users-david/memory';
const OBS_DIR = 'C:/Users/david/OneDrive/文档/Obsidian Vault';

// ─────────────────────────── curation maps ───────────────────────────

// memory nodes we never publish (contain secrets)
const CRED_SKIP = new Set(['github_credentials']);

// platform identity (hue lives in the front-end; here we just tag)
const PLATFORMS = {
  github:   { label: 'GitHub',   desc: '开源仓库 · 公开 build in public 的全部产物' },
  claude:   { label: 'Claude',   desc: '我和 Claude 的长期记忆：项目档案 / 协作偏好 / 参考' },
  obsidian: { label: 'Obsidian', desc: '个人笔记库：学习、规划、读书与随想' },
};

// canonical discipline names + synonym folding
const DISC_FOLD = {
  '游戏开发': '游戏', '棋类': '游戏', '游戏帝国': '游戏', '旅行': '游学', '露营': '游学',
  '仪式': '成长', '思维': '成长', '思辨': '成长', '哲学': '成长', '写作': '成长', '学习方法': '成长', '学习': '成长',
  '课程设计': '教育', '采访': '教育', '活动策划': '教育', '做事课': '教育',
  '资源': '工具脚本', '影评': '电影', '战略': '商业', '品牌': '商业',
  '会议记录': null,          // doc-type tag, not a discipline
};
const fold = d => (d in DISC_FOLD ? DISC_FOLD[d] : d);
const cleanDisc = arr => [...new Set(arr.map(fold))].filter(d => d && !/^[-—·\s]*$/.test(d));

// keyword → discipline, applied to label+desc+topics when a node has no explicit tags
const DISC_KEYWORDS = {
  '游戏':   ['游戏', '棋', 'battle royale', '逃杀', '跑酷', 'witness', 'braid', 'roulette', '转盘'],
  '教育':   ['教育', '课程', '学习社区', '培训', '夏令营', '教学', '好奇学院', '好奇学习', 'sitrain', '答辩'],
  '阅读':   ['阅读', '读书', 'epub', 'kindle', '书单', '荐书'],
  'Web动效': ['动效', 'animation', 'hero', '滚动', 'three.js', 'gsap', 'webgl', '流体'],
  '个人站':  ['个人站', '个人网站', '作品集', '齐马蓝', 'zima', 'lixon'],
  'AI工作台': ['ai 工作台', 'ai工作台', 'odysseus', 'agent', '自托管', '洞察'],
  '硬件':   ['硬件', 'cardputer', 'm5stack', '外设', '笔形', '固件', 'diy'],
  '中文打字': ['打字', 'monkeytype'],
  '剧本杀':  ['剧本杀', '叙事', '故事圣经'],
  '工具脚本': ['工具', '脚本', 'hook', 'bookmarklet', '油猴', '迁移', '热词', '备份'],
  'ClaudeCode生态': ['claude code', 'claude desktop', 'bypass', 'mcp', 'session', 'skill', '权限'],
  '佛教冥想': ['佛教', '冥想', '无常', '尼连禅', '原始佛教'],
  '3D建模':  ['3d', '建模', '失蜡', '铸造', '首饰', '戒指'],
  '商业':   ['摆摊', '进货', '成本', '利润', '创业', '品牌', '战略'],
  '成长':   ['成长', '随想', '复盘', '成人礼', '反思'],
};

// repos that are tooling/skills rather than end-user projects (技能·工具 layer)
const SKILL_REPOS = new Set([
  'bypass-pet', 'claude-bypass-hook', 'allow-floating-ball',
  'claude-account-switch-migration', 'sessionss', 'xiaohongshu-preview',
  'private-insight-officer', 'odysseus-zh-CN',
]);

// cross-platform bridges that topic-match but aren't auto-detectable via githubRefs.
// ids: gh:<repo>  cl:<memory>  ob:<note-title>
const TOPICAL_BRIDGES = [
  ['ob:2025秋 露营周规划', 'cl:reference_camping_footage_backup'], // 同一件事：露营周
  ['ob:2025秋 贩冰冰计划', 'cl:project_silver_jewelry'],          // 同一个目标：麓湖摆摊
  ['ob:2025秋 给青少年的普世阅读指南', 'cl:project_kindle_station'], // 阅读
  ['ob:2025秋 课程反馈', 'gh:kiidschool'],                        // 好奇学习社区
  ['ob:2025秋 百万设计师', 'cl:project_ditie_paoku'],            // 游戏设计影响
  ['ob:游戏帝国', 'cl:project_chess_shogi'],                     // 做游戏的雄心
];

// the 大谷翔平 81-grid mandala → compact to a hub + 8 core themes
const OHTANI_HUB = '大谷翔平 81 宫格目标管理';
const OHTANI_THEMES = ['信用', '待人', '时间管理', '做事', '示范', '学习', '生活', '保持奖学金'];

// short descriptions for the 22 Obsidian notes (no good frontmatter desc exists)
const OBS_DESC = {
  '数学学习': '反思什么才算「学会」：抛开刷题排名，本质是输入输出锻炼神经通路对抗遗忘',
  '数列': '数学占位笔记',
  '会议：如何构建品牌，如何制定战略': '顾问张雅文分享：增强品牌影响力所需的思维与储备',
  '游戏帝国': 'EA 创始人 Trip 创业史与理念：免费是毒药、从世界需要出发、制作人话事',
  '暑假突击计划': '8.20–8.31 冲刺：8 本书 + 托福 SAT 各 60h，每日时间表与责任复利',
  '随想集': '关于世俗与抽象、理论崇拜、提问、做最好、死亡、亲情的多则随想',
  '《7号房的故事》影评': '论电影无法苛求真实，好坏须用真实之外的标准评判',
  '2025秋 露营周规划': '高原徒步露营装备清单、食品药品与爬坡分队事项',
  '资源大合集': '资源收藏：F1 电影《霹雳神风》',
  '线下活动': '有杏书店《北欧秘诀》新书分享会的海报要素、公告结构与复盘',
  '游戏《The Witness》': 'Jonathan Blow《见证者》游戏笔记',
  '游戏《BRAID》': 'Jonathan Blow《时空幻境》游戏笔记',
  '《BRAID》游戏画面': '《时空幻境》画面留存',
  '2025秋 百万设计师': '最爱的游戏设计师 Jonathan Blow（吹哥）及其代表作介绍',
  '王琦的采访大纲': '采访大纲：「创新教育的老师可以是什么样」',
  '2025秋 贩冰冰计划': '麓湖摆摊卖水/椰子水的进货零售保温方案与成本利润',
  '2025秋 课程反馈': '好奇学习社区第一周十门课程逐一反馈，最看好百万设计师',
  '2025秋 给青少年的普世阅读指南': '青少年荐书手册的构成与算法设计，附 2020-2022 书单',
  '《失败的逻辑》读书笔记': '复杂系统中人为何失败：超信号、隐式目标与完美主义灾难',
  '2025秋 日本游学规划': '日本游学城市清单与行程投票',
  '替潘昱辰写的作文': '以「容忍度光谱」回应反抗与忍耐之辩',
  '2025秋 成人礼': '随想：跳出视角看世界须靠吸收视角外之物',
};

// ─────────────────────────── helpers ───────────────────────────

const nodes = new Map();   // id → node
let edges = [];
const addNode = n => { if (!nodes.has(n.id)) nodes.set(n.id, n); return nodes.get(n.id); };
const addEdge = (a, b, type) => { if (a !== b && nodes.has(a) && nodes.has(b)) edges.push({ a, b, type }); };
const discId = d => 'disc:' + d;
const langId = l => 'lang:' + l;

function tagDisciplines(node, explicit = [], text = '') {
  let set = cleanDisc(explicit);
  if (!set.length) {
    const hay = (node.label + ' ' + (node.desc || '') + ' ' + text).toLowerCase();
    set = Object.entries(DISC_KEYWORDS)
      .filter(([, kws]) => kws.some(k => hay.includes(k.toLowerCase()))).map(([d]) => d);
  }
  node.disc = cleanDisc(set);
}

// ─────────────────────────── structural spine ───────────────────────────

addNode({ id: 'root', label: 'chichu', desc: '18 岁 vibe coder · 操作熵↓ · build in public · 好奇心第一动力。这张图就是我这一年长出来的全部。', platform: 'core', cat: 'root', status: null });
for (const [p, m] of Object.entries(PLATFORMS)) {
  addNode({ id: 'hub:' + p, label: m.label, desc: m.desc, platform: p, cat: 'hub', status: null });
  addEdge('root', 'hub:' + p, 'struct');
}

// ─────────────────────────── 1 · GitHub ───────────────────────────

let gh = [];
try {
  gh = JSON.parse(execSync(
    'gh repo list xing0325 --limit 100 --json name,description,primaryLanguage,pushedAt,createdAt,isPrivate,isFork,homepageUrl,url,stargazerCount',
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch (e) { console.error('! gh failed — is the CLI authed? skipping GitHub.', e.message); }

const REPO_NAMES = gh.map(r => r.name);
const now = Date.now();
const DAY = 86400e3;

for (const r of gh) {
  const id = 'gh:' + r.name;
  const lang = r.primaryLanguage?.name || null;
  const ageD = (now - Date.parse(r.pushedAt)) / DAY;
  const status = ageD < 21 ? 'updating' : ageD < 120 ? 'live' : 'dormant';
  const node = addNode({
    id, label: r.name, desc: r.description || '', platform: 'github',
    cat: SKILL_REPOS.has(r.name) ? 'skill' : 'project',
    status, lang, private: !!r.isPrivate,
    url: (r.homepageUrl && /^https?:/.test(r.homepageUrl)) ? r.homepageUrl : r.url,
    repoUrl: r.url, stars: r.stargazerCount || 0,
  });
  tagDisciplines(node, [], (r.description || ''));
  addEdge('hub:github', id, 'struct');
  // language sub-layer (技能·工具)
  if (lang) { addNode({ id: langId(lang), label: lang, desc: '技术栈', platform: 'core', cat: 'skill', status: null, isLang: true }); addEdge(id, langId(lang), 'lang'); }
}

// repo lineage / sibling edges (curated, only when both repos exist)
const REPO_EDGES = [
  ['chichu-visual-talk', 'chichu-visual-talk-notes'], ['zima', 'zima-blue'],
  ['zima-blue', 'chichu-feishu-habits'], ['landonorris-teardown', 'web-anim-cookbook'],
  ['landonorris-teardown', 'lixon'], ['web-anim-cookbook', 'lixon'],
  ['bypass-pet', 'claude-bypass-hook'], ['claude-bypass-hook', 'allow-floating-ball'],
  ['claude-account-switch-migration', 'bypass-pet'], ['sessionss', 'curi-online'],
  ['credit-score', 'curi-online'], ['mofazhusha', 'kiidschool'],
  ['calling-suishoji', 'private-insight-officer'], ['china-truth-graph', 'jingqi-share'],
  ['chichu_habit', 'chichu-feishu-habits'],
];
for (const [a, b] of REPO_EDGES) addEdge('gh:' + a, 'gh:' + b, 'intra');

// ─────────────────────────── 2 · Claude memory ───────────────────────────

// labels + hooks from the index
const memIndex = {};
try {
  for (const line of fs.readFileSync(path.join(MEM_DIR, 'MEMORY.md'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^- \[(.+?)\]\((.+?)\.md\)\s*[—-]+\s*(.*)$/);
    if (m) memIndex[m[2]] = { label: m[1], hook: m[3].trim() };
  }
} catch (e) { console.error('! MEMORY.md missing', e.message); }

const memFiles = fs.readdirSync(MEM_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
const memIds = new Set(memFiles.map(f => f.replace(/\.md$/, '')));
const memLinks = [];   // [fromId, rawTarget]

for (const f of memFiles) {
  const id = f.replace(/\.md$/, '');
  if (CRED_SKIP.has(id)) continue;
  const body = fs.readFileSync(path.join(MEM_DIR, f), 'utf8');
  const typeM = body.match(/\btype:\s*(user|feedback|project|reference)\b/);
  const type = typeM ? typeM[1] : 'reference';
  const idx = memIndex[id] || {};
  const cat = type === 'project' ? 'project' : type === 'feedback' ? 'memory' : type === 'user' ? 'memory' : 'memory';
  const node = addNode({
    id: 'cl:' + id, label: idx.label || id, desc: idx.hook || '', platform: 'claude',
    cat, mtype: type, status: type === 'project' ? 'live' : null,
  });
  tagDisciplines(node, [], body.slice(0, 600));
  addEdge('hub:claude', 'cl:' + id, 'struct');
  // [[wikilinks]] → intra-platform edges
  for (const m of body.matchAll(/\[\[([^\]\|]+?)(?:\|[^\]]*)?\]\]/g)) {
    const t = m[1].trim().replace(/-/g, '_');
    if (t !== id) memLinks.push(['cl:' + id, t]);
  }
  // github references → cross-platform bridges
  for (const name of REPO_NAMES)
    if (name.length > 3 && body.includes(name)) addEdge('cl:' + id, 'gh:' + name, 'bridge');
}
for (const [from, raw] of memLinks) if (memIds.has(raw) && !CRED_SKIP.has(raw)) addEdge(from, 'cl:' + raw, 'intra');

// ─────────────────────────── 3 · Obsidian ───────────────────────────

let obsFiles = [];
try { obsFiles = fs.readdirSync(OBS_DIR); } catch (e) { console.error('! Obsidian vault unreadable', e.message); }

const noteIds = new Set();
for (const f of obsFiles.filter(f => f.endsWith('.md'))) {
  const title = f.replace(/\.md$/, '');
  noteIds.add(title);
  const body = fs.readFileSync(path.join(OBS_DIR, f), 'utf8');
  let desc = OBS_DESC[title];
  if (!desc) desc = (body.replace(/^---[\s\S]*?---/, '').split(/\r?\n/).find(l => l.trim() && !l.startsWith('#') && !l.startsWith('!')) || '').slice(0, 60);
  const tags = [];
  const tm = body.match(/tags:\s*\[?([^\]\n]+)\]?/);
  if (tm) tm[1].split(/[,，\s]+/).forEach(t => t && tags.push(t.replace(/['"#]/g, '')));
  const node = addNode({ id: 'ob:' + title, label: title.replace(/^2025秋\s*/, ''), desc, platform: 'obsidian', cat: 'note', status: null });
  tagDisciplines(node, tags, body.slice(0, 400));
  addEdge('hub:obsidian', 'ob:' + title, 'struct');
  // non-image [[links]]
  for (const m of body.matchAll(/(!?)\[\[([^\]\|]+?)(?:\|[^\]]*)?\]\]/g))
    if (m[1] !== '!') { const t = m[2].trim(); if (noteIds.has(t)) addEdge('ob:' + title, 'ob:' + t, 'intra'); }
}

// canvases
for (const f of obsFiles.filter(f => f.endsWith('.canvas'))) {
  let data; try { data = JSON.parse(fs.readFileSync(path.join(OBS_DIR, f), 'utf8')); } catch { continue; }
  if (/81|大谷|宫格/.test(f)) {
    const hub = 'ob:' + OHTANI_HUB;
    addNode({ id: hub, label: OHTANI_HUB, desc: '把目标拆成中心 + 8 区 × 8 行动的曼陀罗计划法', platform: 'obsidian', cat: 'note', status: null, disc: ['成长'] });
    addEdge('hub:obsidian', hub, 'struct');
    for (const t of OHTANI_THEMES) { const tid = hub + ':' + t; addNode({ id: tid, label: t, desc: 'Ohtani 81 宫格 · ' + t, platform: 'obsidian', cat: 'note', status: null, disc: ['成长'], small: true }); addEdge(hub, tid, 'intra'); }
    continue;
  }
  // generic canvas (e.g. Jonathan Blow talk): keep text nodes, link by edges, hang notes off it
  const keep = new Map();
  for (const n of data.nodes || []) {
    const lbl = (n.label || n.text || '').replace(/[*#`]/g, '').trim();
    const file = (n.file || '').split(/[\\/]/).pop();
    if (n.type === 'file' && file && file.endsWith('.md')) { keep.set(n.id, 'ob:' + file.replace(/\.md$/, '')); continue; }
    if (lbl && lbl.length <= 30 && !/\.(png|jpg|jpeg|webp)$/i.test(lbl)) {
      const cid = 'ob:canvas:' + n.id.slice(0, 6);
      addNode({ id: cid, label: lbl, desc: 'Obsidian canvas · ' + f.replace(/\.canvas$/, ''), platform: 'obsidian', cat: 'note', status: null, disc: ['游戏', '设计'], small: true });
      addEdge('hub:obsidian', cid, 'struct'); keep.set(n.id, cid);
    }
  }
  for (const e of data.edges || []) { const a = keep.get(e.fromNode), b = keep.get(e.toNode); if (a && b) addEdge(a, b, 'intra'); }
}

// ─────────────────────────── discipline + bridge layer ───────────────────────────

// realise discipline hubs from every node's tags, connect them
for (const node of [...nodes.values()]) {
  for (const d of node.disc || []) {
    const did = discId(d);
    addNode({ id: did, label: d, desc: '学科 / 兴趣聚类', platform: 'core', cat: 'discipline', status: null, isDisc: true });
    addEdge(node.id, did, 'disc');
  }
}
// disciplines hang off the persona too
for (const node of [...nodes.values()]) if (node.cat === 'discipline') addEdge('root', node.id, 'struct');

// topical bridges (only if both ends exist)
for (const [a, b] of TOPICAL_BRIDGES) addEdge(a, b, 'bridge');

// ─────────────────────────── prune singleton disciplines ───────────────────────────
// a discipline that only one node carries isn't a cluster — drop it to keep things tidy
const discDeg = {};
for (const e of edges) if (e.type === 'disc') discDeg[e.b] = (discDeg[e.b] || 0) + 1;
const dropped = new Set([...nodes.values()].filter(n => n.cat === 'discipline' && (discDeg[n.id] || 0) < 2).map(n => n.id));
for (const id of dropped) nodes.delete(id);
edges = edges.filter(e => !dropped.has(e.a) && !dropped.has(e.b));

// ─────────────────────────── finalise: degree → size, dedupe ───────────────────────────

const deg = {};
const seen = new Set();
const cleanEdges = [];
for (const e of edges) {
  const k = e.a < e.b ? e.a + '|' + e.b : e.b + '|' + e.a;
  if (seen.has(k)) continue; seen.add(k);
  cleanEdges.push(e); deg[e.a] = (deg[e.a] || 0) + 1; deg[e.b] = (deg[e.b] || 0) + 1;
}
const nodeList = [...nodes.values()].map(n => {
  const d = deg[n.id] || 0;
  let r = 4 + Math.sqrt(d) * 2.6;
  if (n.cat === 'root') r = 22;
  else if (n.cat === 'hub') r = 15;
  else if (n.cat === 'discipline') r = Math.max(8, r);
  else if (n.small) r = 4.5;
  r = Math.min(r, 20);
  return { ...n, deg: d, r: +r.toFixed(1), disc: n.disc || [] };
});

const meta = {
  built: new Date().toISOString().slice(0, 10),
  counts: {
    nodes: nodeList.length, edges: cleanEdges.length,
    github: nodeList.filter(n => n.platform === 'github').length,
    claude: nodeList.filter(n => n.platform === 'claude').length,
    obsidian: nodeList.filter(n => n.platform === 'obsidian').length,
    bridges: cleanEdges.filter(e => e.type === 'bridge').length,
  },
  disciplines: [...new Set(nodeList.filter(n => n.cat === 'discipline').map(n => n.label))].sort(),
  languages: [...new Set(nodeList.filter(n => n.isLang).map(n => n.label))].sort(),
};

const graph = { meta, nodes: nodeList, edges: cleanEdges };
fs.writeFileSync(OUT_JSON, JSON.stringify(graph, null, 0));
console.log('✓ graph-data.json written');
console.table(meta.counts);
console.log('disciplines:', meta.disciplines.join(' · '));
console.log('languages  :', meta.languages.join(' · '));

// inject into index.html if markers are present
if (fs.existsSync(INDEX)) {
  let html = fs.readFileSync(INDEX, 'utf8');
  const re = /\/\*__GRAPH_DATA__\*\/[\s\S]*?\/\*__GRAPH_DATA_END__\*\//;
  if (re.test(html)) {
    html = html.replace(re, `/*__GRAPH_DATA__*/\nconst GRAPH=${JSON.stringify(graph)};\n/*__GRAPH_DATA_END__*/`);
    fs.writeFileSync(INDEX, html);
    console.log('✓ injected into index.html');
  } else {
    console.log('· markers not found in index.html yet — wrote JSON only');
  }
}
