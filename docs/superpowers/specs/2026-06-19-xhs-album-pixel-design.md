# 小红书近期更新长廊 · 像素级复刻原站照片墙

**分支** `xhs-album-pixel-2026-06-19`（基于 master，独立 worktree）
**范围** 仅 `index.html` 的 `02 · 横向长廊 #album` 区块（CSS ~880–922 / HTML 1316–1325 / JS 2648–2687 + 滚动驱动 2753–2764）。不碰 hero 及其它在跑分支。
**目标** 把 landonorris.com 的 `is-horizontal-track` 照片墙像素级搬到本站，喂入真实小红书笔记（封面比例天然不一 = 错落的燃料）。修掉现状三宗罪：①统一 3:4 流水线卡 ②滚两下就完 ③无惯性。

## 取材来源
原站完整抓包 `C:\Users\david\lando-attempts-archive\00_lando-analysis\`：`live-index.html`（DOM，行1226）、`lando-1.css`（布局，未压缩可读）。

## 策略：B 可扩展模板（非死克隆）
照搬原站**尺寸三档 + neg-margin 错位 + spacer 节奏 + 引言 callout 位**作为一套语法，按真实笔记数循环铺开；每张封面在档位框内 `object-fit:cover` 按自身比例居中，不硬裁、数量随意。

## 原站参考值（桌面，全 `calc(var(--vh,1vh)*N)`）
| 项 | 值 |
|---|---|
| `--gap` | 1.25rem |
| `--grid-spacer` | 31.51vh（`.half` 15.76 / `.quarter` 7.88） |
| `.horizontal-track` | flex 行; height 100vh; padding-left **75vw**; padding-top 7vh; padding-right `--gap`; padding-bottom `2*--gap` |
| `.horizontal-grid-col` | flex 列; height 100%; align flex-start |
| `.horizontal-pin-sticky` | position sticky; top 0; flex |
| 图·小 | is-home4 21.98×20.96 · is-home6 21.38×26.48 · is-home7 20.74×20.74 |
| 图·中 | is-home1 27×33.46 · is-home2 29.3×29.3 · is-home5 31.75×28.75 · is-home9 27.42×24.91 · is-home10 31.69×30.9 |
| 图·巨 | is-home3 65.48×59.48 · is-home8 60.95×60.95 |
| eyebrow | Mona Sans .625rem / wght700 / 字距0 / 大写 / lh1 |
| 引言 callout | Brier 1.5rem / lh 94.6% / 字距 .05rem; callout-1 `margin-top:1.67vh`; callout-2 `max-width:30rem; margin-top:auto; margin-bottom:2.67vh` |

## 原站列/间距序列（基础模板，12 图 + 2 引言）
1. 列A：is-home-1(竖) ＋ is-home-2(方,`mt:auto mb:8.42 left:14.42`)
2. spacer 满
3. 列B(large-img)：callout-1(引言+签名,`mt:1.67`) ＋ is-home3 **巨**(`mt:auto`)
4. spacer 满
5. 列C(neg-margin)：is-home-4(`left:-.5*spacer`) ＋ is-5(`mt:auto mb:8.17`)
6. spacer 半
7. 列D：is-home-6(`mt:auto mb:1.17`)
8. 列E：is-home-7(`mb:auto mt:8`)
9. spacer 半
10. 列F：is-home-8 **巨**(`mt:2`) ＋ callout-2(引言+签名)
11. spacer 满
12. 列G(neg-margin)：is-home10(`mt:14.92`) ＋ is-home9(`mt:auto mb:2*gap left:-.5*spacer`)

> 笔记多于 12：在模板尾部按 [中,小]/[巨]/[中,中] + spacer(满/半) 循环续列。少于：截断到可用数。

## 滚动 / 惯性（零依赖，仅作用于本区块）
- pin 保持 sticky；`.s-album` 高度由 JS 按轨道实测宽度算：`height = innerHeight + (trackScrollWidth - innerWidth)`（≈1:1，长内容长滚程）→ 治"两下滚完"。
- 横移 `translateX` 加 **vanilla lerp**（每帧 `cur += (target-cur)*0.085`）复刻滑行/过冲惯性。原站全局平滑滚动属站级改动，**不在本 scope**（会动其它分支），仅记录为后续可选项。
- 保留 dark→paper 变色（原站 dark-green→white 同款）。

## 数据管线（OpenCLI → xhs.json）
代码已有 `fetch('xhs.json')` 自动加载钩子，产出即插即用。
1. 用户：连 Chrome opencli 扩展 + 登录 xiaohongshu.com（daemon 已在 19825）。
2. `opencli xiaohongshu whoami` → `creator-notes -f json` 取标题/日期/封面；逐条 `download` 落 `assets/xhs/`。
3. 整形 `{ profile, album:[{tag,d,line,cover,url}], notes:[...] }`，封面走本地相对路径（file:// 同源直显，无需 base64）。
4. `line` = 笔记标题轻改（符合字数、一句"我做了啥"）；引言 callout 用 chichu 调性代笔。

## 不做
全局平滑滚动；hero / 其它章节；改 xhs.json schema；引入 GSAP/Lenis。
