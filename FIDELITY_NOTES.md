# 像素级复刻 — 夜间保真清单

对照原站抓包 `C:\Users\david\lando-attempts-archive\00_lando-analysis\`。
存档检查点：`git tag archive/2026-06-18-night-start`（commit 47b451c）。

## 原站设计令牌（精确，来自 lando-1.css :root）
- 色：纸 `#efefe5` / 深绿 `#282c20`(bg+暗段) / 墨白 `#f4f4ed` / 黑 `#111112`
  / lime `#d2ff00` / lime-off `#b2c73a` / orange `#ff6b00`
  / tint-1 `#3b3c38`(卡片) / tint-2 `#535450` / off-white `#dde1d2`/`#b4b8a5` / grey `#ebeee0`/`#c8cbbd`
- 字体：Mona Sans Variable(200-900, 正文+impact) + Brier Bold(700, 衬线重音)
- 缓动：`cubic-bezier(.19,1,.22,1)`（唯一）
- 字号(rem)：eyebrow .625 / h6 1 / h5 1.2 / body 1.25(lh1.25) / h3 2 / title 2.625
  / h2 4.5(lh.886, ls-.125rem, wght750 wdth93) / impact 7~7.94(lh.82~.906)
- impact 文字 = Mona condensed-heavy：wght 660-750, wdth 93, 负字距
- 间距(rem)：gap/container 1.25 / mini1 small2 med3 large4 xlarge5 / radius small1 med3 large6.25
- 按钮 .btn-w：lime 底、深绿字、radius .54rem、height 3rem、padding 1rem、Mona uppercase wght800 wdth86
- nav：padding 1.25rem、brand 3.75rem、hamburger 3.75rem 方 radius .74rem 黑、store=lime 按钮

## 进度
- [x] 检查点存档 (tag + branch)
- [x] 嵌 Mona Sans + Brier woff2 (base64, 单文件)
- [x] :root 换原站精确色板 + lime 调色板/ shader 纸底 #efefe5
- [x] 全局字体栈 Impact→Mona / Georgia→Brier
- [x] 字号节奏：h2 lh.886、去 scaleY 拉伸、eyebrow 去斜体、hero 152px
- [x] 菜单按钮 → .btn-w 语言 (lime, radius .54rem, wght800 wdth86)
- [x] nav padding 1.25rem + 状态文字去斜体
- [x] 蹲蹲提交按钮 lime 化 + body 段落行高 1.95->1.72 Mona500
- [x] hero 头部缩小 h=0.68 (留白肖像, 贴近原站 ~30% 宽)
- [ ] 签名改潇洒（笔画+路径）
- [ ] hero/退场最终校准（待截图通道恢复后眼检）

## 阻塞（等用户素材，今夜做不了）
- 小红书接入（等 OpenCLI 扩展连守护进程）
- 真签名照 / 双门侧脸照 / off-track 生活照 / 随笔存稿 / 联系方式真链接
- Hermes dashboard 数据

## 已知障碍
- 预览 screenshot 通道反复超时 → 用 getComputedStyle + canvas readPixels 数值验证
