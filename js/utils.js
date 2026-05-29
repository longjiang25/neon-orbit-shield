/**
 * utils.js — 数学工具函数
 */

/** 归一化角度到 [0, 2π) */
export function normalizeAngle(rad) {
  const twoPI = Math.PI * 2;
  return ((rad % twoPI) + twoPI) % twoPI;
}

/** 最短有符号角度差 a→b，结果在 [-π, π] */
export function angleDiff(a, b) {
  let d = normalizeAngle(b) - normalizeAngle(a);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** 线性插值 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 角度平滑插值（走最短弧） */
export function lerpAngle(a, b, t) {
  return a + angleDiff(a, b) * t;
}

/** 欧几里得距离 */
export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 值钳制 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** [min, max) 随机浮点数 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** 随机选择数组元素 */
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 角度转弧度 */
export function degToRad(deg) {
  return deg * Math.PI / 180;
}

/** 弧度转角度 */
export function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

/** 平滑步进（用于缓入缓出） */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 颜色插值 */
export function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** 带 alpha 的 rgba 颜色字符串 */
export function rgbaFromHex(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
