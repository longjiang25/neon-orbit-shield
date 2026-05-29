# 任务 0：项目脚手架搭建

## 开发目标
创建完整项目目录结构、全局配置文件、工具函数库、所有模块骨架、HTML/CSS 入口、总体设计文档。

## 前置依赖
无（起始任务）

## 输入文件
无（从零创建）

## 输出文件

| 文件 | 状态 |
|------|------|
| `index.html` | ✅ 完整 HTML 结构 |
| `css/style.css` | ✅ 全局样式 + UI |
| `css/animations.css` | ✅ 关键帧动画 |
| `js/config.js` | ✅ 所有游戏常量 |
| `js/utils.js` | ✅ 数学工具函数 |
| `js/main.js` | ✅ 骨架（含游戏循环） |
| `js/renderer.js` | 骨架 |
| `js/shield.js` | 骨架 |
| `js/projectile.js` | 骨架 |
| `js/particle.js` | 骨架 |
| `js/boss.js` | 骨架 |
| `js/powerup.js` | 骨架 |
| `js/difficulty.js` | 骨架 |
| `js/audio.js` | 骨架 |
| `js/ui.js` | 骨架 |
| `js/storage.js` | 骨架 |
| `js/input.js` | 骨架 |
| `docs/design.md` | ✅ 总体设计文档 |
| `docs/test-report.md` | 模板 |
| `assets/favicon.svg` | ✅ |
| `README.md` | ✅ |
| `.gitignore` | ✅ |

## 详细实现规格

### config.js
- 导出所有游戏常量（画布、护盾、弹幕、粒子、血量、难度、道具、颜色、Boss、性能、持久化键名）
- 所有数值参数化，方便调优

### utils.js
- `normalizeAngle(rad)` — 归一化角度到 [0, 2π)
- `angleDiff(a, b)` — 最短有符号角度差 [-π, π]
- `lerp(a, b, t)` — 线性插值
- `lerpAngle(a, b, t)` — 角度平滑插值
- `dist(x1, y1, x2, y2)` — 欧几里得距离
- `clamp(v, min, max)` — 钳制
- `randomRange(min, max)` — 随机范围
- `randomChoice(arr)` — 随机选择
- `degToRad(deg)`, `radToDeg(rad)`
- `smoothstep(edge0, edge1, x)`
- `lerpColor(c1, c2, t)` — 颜色插值
- `rgbaFromHex(hex, alpha)` — 十六进制转 rgba

### index.html
- 语义化 viewport meta（移动端适配）
- Canvas + UI overlay 完整 DOM 结构
- module script 引用
- 社交分享 meta 标签（og:title, og:description 等）

### main.js 骨架
- state 对象定义（所有模块共享）
- init() 初始化函数（调用各模块 init）
- gameLoop() 主循环（requestAnimationFrame）
- update() / render() 分离

## 验收标准
- [x] 所有目录创建完毕
- [x] 所有骨架文件存在
- [x] index.html 在浏览器中打开无 404 错误
- [x] Canvas 元素存在，背景为黑色
- [x] config.js 和 utils.js 导出完整
- [x] main.js 能加载所有模块（无 import 报错）
- [x] 设计文档完整描述游戏架构

## 测试用例
1. 用浏览器打开 `index.html`，检查控制台无 JS 错误
2. 检查所有 import 正确加载（Network 面板无 404）

## 已知风险
- ES6 Module 需要 HTTP 服务（`file://` 协议可能被 CORS 阻止）
- 解决方案：使用 `npx serve .` 或 Live Server
