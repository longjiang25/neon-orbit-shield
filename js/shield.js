/**
 * shield.js — 护盾逻辑 + 渲染
 * 处理护盾角度平滑跟随、轨道渲染、格挡判定
 */

import {
  SHIELD_ARC_DEFAULT,
  SHIELD_COLOR,
  SHIELD_LINE_WIDTH,
  SHIELD_GLOW,
  SHIELD_SMOOTHING,
} from './config.js';
import { lerpAngle, angleDiff, normalizeAngle, rgbaFromHex } from './utils.js';
import { drawGlowArc, drawGlowCircle } from './renderer.js';

/**
 * 初始化护盾状态
 * @param {Object} state  游戏全局状态
 */
export function initShield(state) {
  state.shieldAngle = 0;
  state.targetShieldAngle = 0;
  state.shieldArc = SHIELD_ARC_DEFAULT;
  state.originalShieldArc = SHIELD_ARC_DEFAULT;
  state.shieldActive = true;
  state.shieldRadius = 0; // 在 resize 时根据屏幕尺寸设置
}

/**
 * 每帧更新护盾角度（平滑跟随目标角度 + 键盘偏移）
 * @param {Object} state  游戏全局状态
 * @param {number}  dt    帧间隔（秒）
 */
export function updateShield(state, dt) {
  // 目标角度 = 指针角度 + 键盘旋转偏移
  const targetAngle = (state.targetShieldAngle || 0) + (state.rotationOffset || 0);

  // 帧率无关平滑跟随：乘以 60 使得 60fps 时系数 = SHIELD_SMOOTHING
  state.shieldAngle = lerpAngle(state.shieldAngle, targetAngle, SHIELD_SMOOTHING * 60 * dt);

  // 归一化到 [0, 2π)
  state.shieldAngle = normalizeAngle(state.shieldAngle);
}

/**
 * 渲染护盾（轨道虚线圆 + 发光弧线 + 端点光点）
 * @param {CanvasRenderingContext2D} ctx    Canvas 2D 上下文
 * @param {Object}                   state  游戏全局状态
 */
export function renderShield(ctx, state) {
  const cx = state.cx;
  const cy = state.cy;
  const radius = state.shieldRadius || state.radius || 0;

  if (radius <= 0) return;

  // ========== 轨道虚线圆 ==========
  ctx.save();
  ctx.setLineDash([8, 16]);
  ctx.strokeStyle = rgbaFromHex(SHIELD_COLOR, 0.2);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 护盾未激活时不画弧线
  if (!state.shieldActive) return;

  // ========== 护盾发光弧线 ==========
  const startAngle = state.shieldAngle - state.shieldArc / 2;
  const endAngle = state.shieldAngle + state.shieldArc / 2;

  drawGlowArc(ctx, cx, cy, radius, startAngle, endAngle, SHIELD_COLOR, SHIELD_LINE_WIDTH, SHIELD_GLOW);

  // ========== 弧线两端光点 ==========
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
 * @param {number} angle  弹幕入射角度
 * @param {Object} state  游戏全局状态
 * @returns {boolean}
 */
export function isWithinShield(angle, state) {
  const diff = Math.abs(angleDiff(angle, state.shieldAngle));
  return diff <= state.shieldArc / 2;
}

/**
 * 判断弹幕角度是否在完美格挡范围内（约 5°）
 * @param {number} angle  弹幕入射角度
 * @param {Object} state  游戏全局状态
 * @returns {boolean}
 */
export function isPerfectBlock(angle, state) {
  const diff = Math.abs(angleDiff(angle, state.shieldAngle));
  return diff <= 0.087; // ~5°
}
