# 任务 1：渲染引擎

## 开发目标
实现 Canvas 渲染引擎，包括自适应画布、星空背景、动态星云、核心光球渲染和霓虹发光工具函数。

## 前置依赖
- 任务 0（config.js, utils.js, 项目骨架）

## 输入文件
- `js/renderer.js` — 待实现
- `config.js` — 颜色、尺寸常量
- `utils.js` — 数学工具

## 详细实现规格

### initRenderer(canvas, ctx)
设置初始 Canvas 状态。

### resizeCanvas(canvas, ctx, state)
- 获取 `devicePixelRatio`
- 计算实际像素尺寸 = CSS 尺寸 × DPR
- 设置 `canvas.width/height`
- `canvas.style.width/height`
- 调用 `ctx.scale(dpr, dpr)`
- 计算 `state.cx, state.cy, state.radius, state.coreRadius`
- 使用 `window.visualViewport` API 处理移动端安全区

### renderBackground(ctx, state, time)
- 绘制深色背景渐变（`#0a0a1a` → `#050515`）
- 星空：150 个随机位置的白点，透明度随 `sin(time + seed)` 闪烁
- 星云：3 个大型半透明径向渐变椭圆，缓慢旋转（不同速率）

### renderCore(ctx, state, time)
- 外层大范围光晕：`createRadialGradient`，`rgba(255,200,50,0.3)` → 透明
- 内层光球：`rgba(255,255,255,1)` → `rgba(255,221,68,1)` → `rgba(255,102,0,1)`
- 呼吸动画：`coreRadius *= (1 + 0.05 * sin(time * 2))`

### drawGlowCircle(ctx, x, y, radius, color, glowSize)
- `ctx.save()`
- `ctx.shadowColor = color`, `ctx.shadowBlur = glowSize`
- `ctx.fillStyle = color`, `ctx.beginPath()`, `ctx.arc()`, `ctx.fill()`
- 画两层：内层实心 + 外层半透明更大半径

### drawGlowArc(ctx, cx, cy, radius, startAngle, endAngle, color, lineWidth, glowSize)
- 同上但 `ctx.arc()` 画弧线
- `ctx.lineWidth = lineWidth`, `ctx.strokeStyle = color`
- 弧线两端画小光点（圆）

## 接口定义
```js
// 导出
export function initRenderer(canvas, ctx)
export function resizeCanvas(canvas, ctx, state)
export function renderBackground(ctx, state, time)
export function renderCore(ctx, state, time)
export function drawGlowCircle(ctx, x, y, radius, color, glowSize)
export function drawGlowArc(ctx, cx, cy, radius, startAngle, endAngle, color, lineWidth, glowSize)
```

## 验收标准
- [ ] 打开页面看到动态星空背景
- [ ] 中央有呼吸脉动的光球
- [ ] 窗口缩放后画布自适应
- [ ] HiDPI 屏幕渲染清晰（无模糊）
- [ ] `drawGlowCircle` 和 `drawGlowArc` 函数可正常工作

## 测试用例
1. 浏览器打开 → 看到星空和脉动核心
2. 缩放浏览器窗口 → Canvas 自适应
3. DevTools 切换到移动端 → 自适应正常
4. 用 `drawGlowCircle` 在 (100,100) 画一个发光点

## 已知风险
- `devicePixelRatio` 在某些双屏环境下变化，需要监听
- 移动端 `visualViewport` 比 `window.innerHeight` 更准确（避免地址栏干扰）
