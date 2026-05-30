/**
 * renderer.js — Canvas 渲染引擎（背景、核心、发光工具）
 * 负责画布自适应、星空/星云背景、核心光球、霓虹发光绘制
 */

import {
  CORE_RADIUS_RATIO,
  SHIELD_ORBIT_RATIO,
  STAR_COUNT,
  NEBULA_COUNT,
  COLORS,
} from './config.js';
import { randomRange } from './utils.js';

// ========== 模块级缓存 ==========
// 星空和星云数据在首次渲染时生成，窗口 resize 时重置
let _stars = null;
let _nebulaData = null;

// ========== 内部工具 ==========

/**
 * 从 'rgba(r,g,b,a)' 字符串中提取 r,g,b 分量
 */
function _parseRgbFromRgba(rgbaStr) {
  const match = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return { r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10) };
  }
  return { r: 255, g: 200, b: 50 };
}

/**
 * 惰性创建星空数据（150 颗星）
 */
function _ensureStars(state) {
  if (_stars) return _stars;
  _stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    _stars.push({
      x: randomRange(0, state.screenWidth),
      y: randomRange(0, state.screenHeight),
      size: randomRange(0.5, 2.5),
      twinkleSpeed: randomRange(0.5, 3.0),
      twinkleOffset: randomRange(0, Math.PI * 2),
      color: Math.random() > 0.7 ? '#b0d0ff' : '#ffffff',
    });
  }
  return _stars;
}

/**
 * 惰性创建星云数据（3 片大型星云）
 */
function _ensureNebula(state) {
  if (_nebulaData) return _nebulaData;
  const palette = [
    { r: 200, g: 50,  b: 255 },   // 紫
    { r: 0,   g: 200, b: 255 },   // 青
    { r: 255, g: 50,  b: 150 },   // 品红
  ];
  _nebulaData = [];
  for (let i = 0; i < NEBULA_COUNT; i++) {
    _nebulaData.push({
      x: state.cx + randomRange(-state.screenWidth * 0.15, state.screenWidth * 0.15),
      y: state.cy + randomRange(-state.screenHeight * 0.15, state.screenHeight * 0.15),
      rx: randomRange(state.screenWidth * 0.25, state.screenWidth * 0.45),
      ry: randomRange(state.screenHeight * 0.15, state.screenHeight * 0.30),
      color: palette[i % palette.length],
      alpha: randomRange(0.03, 0.08),
      rotationSpeed: randomRange(0.02, 0.05),
      rotationOffset: randomRange(0, Math.PI * 2),
    });
  }
  return _nebulaData;
}

// ========== 导出函数 ==========

/**
 * initRenderer — 渲染器初始化
 * 重置模块级缓存；由 main.js 在 resizeCanvas 前调用一次
 */
export function initRenderer(canvas, ctx) {
  _stars = null;
  _nebulaData = null;
}

/**
 * resizeCanvas — 画布尺寸自适应（支持 HiDPI）
 * 使用 devicePixelRatio 设置物理像素，CSS 像素坐标供后续绘制
 */
export function resizeCanvas(canvas, ctx, state) {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  // 物理像素
  canvas.width = w * dpr;
  canvas.height = h * dpr;

  // CSS 像素
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  // 重置变换矩阵并应用 DPR 缩放（后续所有绘制使用 CSS 像素坐标）
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 更新状态
  state.cx = w / 2;
  state.cy = h / 2;
  state.screenWidth = w;
  state.screenHeight = h;
  state.radius = Math.min(w, h) * SHIELD_ORBIT_RATIO;
  state.coreRadius = Math.min(w, h) * CORE_RADIUS_RATIO;

  // 重置模块级缓存，下次渲染按新尺寸重新生成
  _stars = null;
  _nebulaData = null;
}

/**
 * renderBackground — 绘制动态星空背景
 * - 深色径向渐变背景
 * - 3 片半透明星云（缓慢旋转、不同颜色）
 * - 150 颗闪烁星星
 */
export function renderBackground(ctx, state, time) {
  const { screenWidth: w, screenHeight: h } = state;

  // — 深色背景渐变 —
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, COLORS.background);
  bgGrad.addColorStop(1, '#050515');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // — 星云 —
  const nebulae = _ensureNebula(state);
  const timeSec = time / 1000;
  for (const nb of nebulae) {
    const angle = nb.rotationOffset + timeSec * nb.rotationSpeed;

    ctx.save();
    ctx.translate(nb.x, nb.y);
    ctx.rotate(angle);
    ctx.scale(1, 0.6);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, nb.rx);
    grad.addColorStop(0, `rgba(${nb.color.r},${nb.color.g},${nb.color.b},${nb.alpha})`);
    grad.addColorStop(0.4, `rgba(${nb.color.r},${nb.color.g},${nb.color.b},${nb.alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${nb.color.r},${nb.color.g},${nb.color.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, nb.rx, nb.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // — 星空（闪烁） —
  const stars = _ensureStars(state);
  for (const star of stars) {
    // twinkle = 0.3 ~ 1.0
    const twinkle =
      0.3 + 0.7 * (Math.sin(timeSec * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * renderCore — 绘制核心光球（呼吸动画 + 多层光晕）
 * - 3 层外层光晕（径向渐变）
 * - 内核 4 色渐变（白 → 黄 → 橙 → 透明）
 */
export function renderCore(ctx, state, time) {
  const { cx, cy, coreRadius } = state;
  const { r, g, b } = _parseRgbFromRgba(COLORS.coreGlow);

  // 呼吸系数
  const pulse = 1 + 0.04 * Math.sin(time * 0.002);

  // — 外层光晕 3 层（径向渐变） —

  // 层 1：最大范围，alpha 0.05
  const r1 = coreRadius * 6;
  const grad1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r1);
  grad1.addColorStop(0, `rgba(${r},${g},${b},0.05)`);
  grad1.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, Math.PI * 2);
  ctx.fill();

  // 层 2：coreRadius * 3，alpha 0.12
  const r2 = coreRadius * 3;
  const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
  grad2.addColorStop(0, `rgba(${r},${g},${b},0.12)`);
  grad2.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(cx, cy, r2, 0, Math.PI * 2);
  ctx.fill();

  // 层 3：coreRadius * 1.8，alpha 0.20
  const r3 = coreRadius * 1.8;
  const grad3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r3);
  grad3.addColorStop(0, `rgba(${r},${g},${b},0.20)`);
  grad3.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad3;
  ctx.beginPath();
  ctx.arc(cx, cy, r3, 0, Math.PI * 2);
  ctx.fill();

  // — 内核（4 色渐变，含呼吸） —
  const coreR = coreRadius * pulse;
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  innerGrad.addColorStop(0, COLORS.coreInner);           // #ffffff
  innerGrad.addColorStop(0.2, COLORS.coreMid);           // #ffdd44
  innerGrad.addColorStop(0.6, COLORS.coreOuter);         // #ff6600
  innerGrad.addColorStop(1, `rgba(255,102,0,0)`);        // 透明
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * drawGlowCircle — 绘制霓虹发光圆
 * - 内层：实心圆
 * - 外层：稍大半透明圆 + shadowBlur 发光
 */
export function drawGlowCircle(ctx, x, y, radius, color, glowSize = 20) {
  ctx.save();

  // 内层：实心
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 外层：半透明 + shadowBlur 发光
  ctx.shadowColor = color;
  ctx.shadowBlur = glowSize;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * drawGlowArc — 绘制霓虹发光弧线
 * - 弧线本体带 shadowBlur 发光
 * - 两端各画一个小光点 (半径 = lineWidth * 1.5)
 */
export function drawGlowArc(ctx, cx, cy, radius, startAngle, endAngle, color, lineWidth = 4, glowSize = 25) {
  ctx.save();

  // 发光弧线
  ctx.shadowColor = color;
  ctx.shadowBlur = glowSize;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  ctx.restore();

  // 弧两端小光点
  const dotRadius = lineWidth * 1.5;
  const angles = [startAngle, endAngle];
  for (const angle of angles) {
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize * 0.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * drawGlowLine — 绘制霓虹发光线段（Boss 激光用）
 */
export function drawGlowLine(ctx, x1, y1, x2, y2, color, lineWidth, glowSize) {
  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = glowSize;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

/**
 * renderJoystick — 渲染移动端虚拟摇杆 UI
 * 只在移动端 + 游戏进行中时调用
 *
 * - 半透明外圈（摇杆边界）
 * - 十字参考线
 * - 手指位置指示小球（按住时显示）
 */
export function renderJoystick(ctx, state) {
  const { joyCX, joyCY, joyRadius } = state;
  if (!joyRadius || joyRadius <= 0) return;

  ctx.save();

  // ---- 摇杆外圈 ----
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0, 212, 255, 0.25)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(joyCX, joyCY, joyRadius, 0, Math.PI * 2);
  ctx.stroke();

  // ---- 十字参考线 ----
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(joyCX - joyRadius, joyCY);
  ctx.lineTo(joyCX + joyRadius, joyCY);
  ctx.moveTo(joyCX, joyCY - joyRadius);
  ctx.lineTo(joyCX, joyCY + joyRadius);
  ctx.stroke();

  // ---- 中心点 ----
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0, 212, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(joyCX, joyCY, 4, 0, Math.PI * 2);
  ctx.fill();

  // ---- 手指位置指示（按住时） ----
  if (state.joystickActive) {
    const fingerX = joyCX + (state.joystickX || 0) * joyRadius;
    const fingerY = joyCY + (state.joystickY || 0) * joyRadius;

    // 连线
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(joyCX, joyCY);
    ctx.lineTo(fingerX, fingerY);
    ctx.stroke();

    // 手指圆点（外层发光）
    ctx.fillStyle = 'rgba(0, 255, 204, 0.7)';
    ctx.shadowColor = 'rgba(0, 255, 204, 0.6)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(fingerX, fingerY, 10, 0, Math.PI * 2);
    ctx.fill();

    // 内层高亮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(fingerX, fingerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- 标签文字 ----
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = `${Math.max(10, joyRadius * 0.12)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('按住拖动控制护盾', joyCX, joyCY - joyRadius - 12);

  ctx.restore();
}
