/**
 * shield.js — 护盾逻辑 + 渲染
 * 处理护盾角度平滑跟随、可变轨道半径、格挡判定
 */

import {
  SHIELD_ARC_DEFAULT,
  SHIELD_COLOR,
  SHIELD_LINE_WIDTH,
  SHIELD_GLOW,
  SHIELD_SMOOTHING,
  SHIELD_RADIUS_MIN_RATIO,
  SHIELD_RADIUS_MAX_RATIO,
  SHIELD_RADIAL_SMOOTHING,
} from './config.js';
import { lerpAngle, angleDiff, normalizeAngle, rgbaFromHex, lerp, clamp } from './utils.js';
import { drawGlowArc, drawGlowCircle } from './renderer.js';

/**
 * 初始化护盾状态
 */
export function initShield(state) {
  state.shieldAngle = 0;
  state.targetShieldAngle = 0;
  state.shieldArc = SHIELD_ARC_DEFAULT;
  state.originalShieldArc = SHIELD_ARC_DEFAULT;
  state.shieldActive = true;
  state.shieldRadius = 0;           // 当前实际轨道半径
  state.shieldBaseRadius = 0;       // 默认轨道半径
  state.targetShieldRadius = null;  // null=默认, 0~1=径向偏移比例
  state.shieldCurrentRadius = 0;    // 平滑后的当前半径
}

/**
 * 每帧更新护盾角度 + 径向位置
 */
export function updateShield(state, dt) {
  // ---- 角度平滑跟随 ----
  const targetAngle = (state.targetShieldAngle || 0) + (state.rotationOffset || 0);
  state.shieldAngle = lerpAngle(state.shieldAngle, targetAngle, SHIELD_SMOOTHING * 60 * dt);
  state.shieldAngle = normalizeAngle(state.shieldAngle);

  // ---- 径向平滑跟随 ----
  if (state.shieldBaseRadius <= 0) {
    state.shieldBaseRadius = state.radius || state.shieldRadius;
  }

  const baseR = state.shieldBaseRadius || state.radius || 0;

  // 计算目标半径
  let targetRadius;
  if (state.targetShieldRadius !== null && state.targetShieldRadius !== undefined) {
    // 0 → 内缩到最小, 1 → 外扩到最大
    const t = clamp(state.targetShieldRadius, 0, 1);
    targetRadius = baseR * (SHIELD_RADIUS_MIN_RATIO + t * (SHIELD_RADIUS_MAX_RATIO - SHIELD_RADIUS_MIN_RATIO));
  } else {
    targetRadius = baseR;
  }

  // 平滑插值
  if (state.shieldCurrentRadius <= 0) state.shieldCurrentRadius = targetRadius;
  state.shieldCurrentRadius = lerp(state.shieldCurrentRadius, targetRadius, SHIELD_RADIAL_SMOOTHING * 60 * dt);
  state.shieldRadius = state.shieldCurrentRadius;
}

/**
 * 渲染护盾
 */
export function renderShield(ctx, state) {
  const cx = state.cx;
  const cy = state.cy;
  const radius = state.shieldRadius || state.radius || 0;

  if (radius <= 0) return;

  // ---- 轨道虚线圆 ----
  ctx.save();
  ctx.setLineDash([8, 16]);
  ctx.strokeStyle = rgbaFromHex(SHIELD_COLOR, 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (!state.shieldActive) return;

  // ---- 护盾发光弧线 ----
  const startAngle = state.shieldAngle - state.shieldArc / 2;
  const endAngle = state.shieldAngle + state.shieldArc / 2;

  drawGlowArc(ctx, cx, cy, radius, startAngle, endAngle, SHIELD_COLOR, SHIELD_LINE_WIDTH, SHIELD_GLOW);

  // ---- 弧线两端光点 ----
  const tipRadius = SHIELD_LINE_WIDTH * 2;
  const tipGlow = 15;

  const x1 = cx + Math.cos(startAngle) * radius;
  const y1 = cy + Math.sin(startAngle) * radius;
  const x2 = cx + Math.cos(endAngle) * radius;
  const y2 = cy + Math.sin(endAngle) * radius;

  drawGlowCircle(ctx, x1, y1, tipRadius, SHIELD_COLOR, tipGlow);
  drawGlowCircle(ctx, x2, y2, tipRadius, SHIELD_COLOR, tipGlow);
}

/**
 * 判断弹幕角度是否在护盾范围内
 */
export function isWithinShield(angle, state) {
  const diff = Math.abs(angleDiff(angle, state.shieldAngle));
  return diff <= state.shieldArc / 2;
}

/**
 * 判断是否为完美格挡（约 5°）
 */
export function isPerfectBlock(angle, state) {
  const diff = Math.abs(angleDiff(angle, state.shieldAngle));
  return diff <= 0.087;
}
