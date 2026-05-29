/**
 * projectile.js — 弹幕系统（对象池、生成、移动、碰撞检测、渲染）
 *
 * 提供完整的弹幕生命周期管理：
 *   1. 对象池初始化
 *   2. 从屏幕边缘向核心生成弹幕
 *   3. 子步进碰撞检测（护盾拦截 + 核心命中）
 *   4. 霓虹发光渲染（circle / triangle / doubleRing / diamond）
 */

import {
  MAX_PROJECTILES,
  PROJ_TYPES,
  PROJECTILE_BASE_SPEED,
  MAX_DT,
  COLLISION_SUBSTEPS
} from './config.js';
import { dist, clamp, rgbaFromHex } from './utils.js';
import { isWithinShield, isPerfectBlock } from './shield.js';

// ========================================================================
// 对象池
// ========================================================================

/**
 * 创建弹幕对象池
 * 预先分配 MAX_PROJECTILES 个对象，避免运行时 GC 抖动
 * @returns {Array} 对象池数组
 */
export function initProjectilePool() {
  const pool = new Array(MAX_PROJECTILES);
  for (let i = 0; i < MAX_PROJECTILES; i++) {
    pool[i] = {
      active: false,
      x: 0,
      y: 0,
      speed: PROJECTILE_BASE_SPEED,
      angle: 0,             // 飞行方向（弧度，指向中心）
      type: 'normal',        // 'normal' | 'fast' | 'tough' | 'splitter'
      hp: 1,
      maxHp: 1,
      color: '#00f0ff',
      shape: 'circle',
      trail: [],             // 拖尾历史 [{x,y}] 最多 5 个
      radius: 5,             // 碰撞半径
    };
  }
  return pool;
}

/**
 * 从池中找到第一个未激活的对象
 * @param {Array} pool
 * @returns {Object|null}
 */
function getInactive(pool) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) return pool[i];
  }
  return null;
}

// ========================================================================
// 生成
// ========================================================================

/**
 * 从屏幕边缘向核心生成一枚弹幕
 * @param {Array}  pool  对象池
 * @param {Object} state 游戏全局状态
 * @param {string} type  弹幕类型（默认 'normal'）
 * @returns {Object|null} 生成的弹幕对象，池满时返回 null
 */
export function spawnProjectile(pool, state, type = 'normal') {
  const proj = getInactive(pool);
  if (!proj) return null;

  // 查找类型配置，兜底到 normal
  const typeConfig = PROJ_TYPES[type];
  if (!typeConfig) {
    console.warn(`Unknown projectile type "${type}", falling back to "normal"`);
    return spawnProjectile(pool, state, 'normal');
  }

  const speed = state.currentProjectileSpeed || PROJECTILE_BASE_SPEED;

  proj.active = true;
  proj.type = type;
  proj.color = typeConfig.color;
  proj.speed = speed * typeConfig.speedMult;
  proj.hp = typeConfig.hp;
  proj.maxHp = typeConfig.hp;
  proj.shape = typeConfig.shape;
  proj.radius = 5;

  // 随机生成角度 → 在屏幕边缘外生成
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist = Math.max(state.screenWidth, state.screenHeight) * 0.75;

  proj.x = state.cx + Math.cos(spawnAngle) * spawnDist;
  proj.y = state.cy + Math.sin(spawnAngle) * spawnDist;

  // 飞行方向指向游戏核心
  proj.angle = Math.atan2(state.cy - proj.y, state.cx - proj.x);
  proj.trail = [];

  return proj;
}

// ========================================================================
// 更新（移动 + 碰撞检测）
// ========================================================================

/**
 * 更新所有活跃弹幕：移动、子步进碰撞检测、拖尾记录
 *
 * @param {Array}  pool       对象池
 * @param {Object} state      游戏全局状态
 * @param {number} dt         帧时间差（秒）
 * @param {number} spawnTimer 生成计时器（当前未使用，为调用方预留）
 * @returns {{ blocked: Array, hits: Array }}
 *   blocked — 护盾拦截事件列表
 *   hits    — 核心命中事件列表
 */
export function updateProjectiles(pool, state, dt, spawnTimer) {
  // 钳制 dt 防止穿透
  dt = clamp(dt, 0, MAX_DT);

  const blocked = [];
  const hits = [];

  for (let i = 0; i < pool.length; i++) {
    const proj = pool[i];
    if (!proj.active) continue;

    // ---- 子步进计算 ----
    // 步数基于速度、dt 和核心半径自适应；上限 COLLISION_SUBSTEPS
    let substeps = Math.ceil(proj.speed * dt / (state.coreRadius * 3)) || 1;
    substeps = Math.min(substeps, COLLISION_SUBSTEPS);
    const stepDt = dt / substeps;

    for (let step = 0; step < substeps; step++) {
      if (!proj.active) break;

      // 移动
      proj.x += Math.cos(proj.angle) * proj.speed * stepDt;
      proj.y += Math.sin(proj.angle) * proj.speed * stepDt;

      // ---- 碰撞检测 ----
      const d = dist(proj.x, proj.y, state.cx, state.cy);
      const shieldRadius = state.shieldRadius || state.radius;

      // 护盾拦截检查：弹幕与护盾轨道相交
      if (d <= shieldRadius + proj.radius &&
          d >= shieldRadius - proj.speed * stepDt - proj.radius) {
        const projAngle = Math.atan2(proj.y - state.cy, proj.x - state.cx);
        if (isWithinShield(projAngle, state)) {
          proj.hp--;
          if (proj.hp <= 0) {
            // 被护盾完全拦截
            proj.active = false;
            blocked.push({
              type: 'blocked',
              proj,
              x: proj.x,
              y: proj.y,
              perfect: isPerfectBlock(projAngle, state),
            });
          } else {
            // tough 弹幕存活：反弹，变色
            proj.angle += Math.PI;
            proj.color = '#ffcc44'; // 浅色表示受伤
          }
        }
      }

      // 核心命中检查
      if (d <= state.coreRadius + proj.radius) {
        if (proj.active) {
          proj.active = false;
          hits.push({
            type: 'coreHit',
            proj,
            x: proj.x,
            y: proj.y,
          });
        }
      }

      // 离屏回收
      const maxDim = Math.max(state.screenWidth, state.screenHeight);
      if (d > maxDim * 1.5) {
        proj.active = false;
      }
    }

    // ---- 拖尾记录 ----
    if (proj.active) {
      proj.trail.push({ x: proj.x, y: proj.y });
      if (proj.trail.length > 5) {
        proj.trail.shift();
      }
    }
  }

  return { blocked, hits };
}

// ========================================================================
// 渲染
// ========================================================================

/**
 * 渲染所有活跃弹幕（拖尾 + 本体霓虹发光）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array}  pool
 * @param {Object} state
 */
export function renderProjectiles(ctx, pool, state) {
  for (let i = 0; i < pool.length; i++) {
    const proj = pool[i];
    if (!proj.active) continue;

    // ---- 拖尾渲染（逐渐变小变透明的圆） ----
    if (proj.trail.length >= 2) {
      for (let j = 0; j < proj.trail.length; j++) {
        const t = proj.trail[j];
        // j=0 最旧 → 最小/最透明；j=len-1 最新 → 最大/最不透明
        const ratio = (j + 1) / (proj.trail.length + 1);
        const trailRadius = proj.radius * 0.6 * ratio;

        ctx.beginPath();
        ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
        ctx.fillStyle = rgbaFromHex(proj.color, ratio * 0.5);
        ctx.fill();
      }
    }

    // ---- 弹幕本体霓虹发光效果 ----
    ctx.save();
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = proj.color;
    ctx.strokeStyle = proj.color;

    switch (proj.shape) {
      case 'circle':
        drawCircle(ctx, proj);
        break;
      case 'triangle':
        drawTriangle(ctx, proj);
        break;
      case 'doubleRing':
        drawDoubleRing(ctx, proj);
        break;
      case 'diamond':
        drawDiamond(ctx, proj);
        break;
      default:
        drawCircle(ctx, proj);
        break;
    }

    ctx.restore();
  }
}

// ========================================================================
// 形状绘制函数
// ========================================================================

/** 圆形弹幕 */
function drawCircle(ctx, proj) {
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
  ctx.fill();
}

/** 三角形弹幕（尖头指向飞行方向） */
function drawTriangle(ctx, proj) {
  const r = proj.radius * 2;
  const a = proj.angle;
  // 三个顶点：前 + 后左 + 后右
  // 前顶点（飞行方向延伸）
  const fx = proj.x + Math.cos(a) * r;
  const fy = proj.y + Math.sin(a) * r;
  // 后左 / 后右顶点（相对前方偏移 150°）
  const offset = 150 * Math.PI / 180;
  const blx = proj.x + Math.cos(a + offset) * r;
  const bly = proj.y + Math.sin(a + offset) * r;
  const brx = proj.x + Math.cos(a - offset) * r;
  const bry = proj.y + Math.sin(a - offset) * r;

  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(blx, bly);
  ctx.lineTo(brx, bry);
  ctx.closePath();
  ctx.fill();
}

/** 双环弹幕（两个同心圆） */
function drawDoubleRing(ctx, proj) {
  ctx.lineWidth = 2;

  // 外环
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, proj.radius * 1.6, 0, Math.PI * 2);
  ctx.stroke();

  // 内环（填充以增强发光效果）
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, proj.radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** 菱形弹幕（4 顶点，45° 偏移） */
function drawDiamond(ctx, proj) {
  const r = proj.radius * 1.8;
  const a = proj.angle;
  const offset = Math.PI / 4; // 45°

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    // 顶点分布在 45°/135°/225°/315° 方向
    const va = a + offset + i * Math.PI / 2;
    const vx = proj.x + Math.cos(va) * r;
    const vy = proj.y + Math.sin(va) * r;
    if (i === 0) {
      ctx.moveTo(vx, vy);
    } else {
      ctx.lineTo(vx, vy);
    }
  }
  ctx.closePath();
  ctx.fill();
}
