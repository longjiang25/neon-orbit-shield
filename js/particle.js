/**
 * particle.js — 粒子特效系统
 * 对象池管理、生成、更新、渲染、屏幕震动
 */

import { MAX_PARTICLES, MOBILE_PARTICLE_SCALE } from './config.js';
import { randomRange, clamp, lerpColor } from './utils.js';

/**
 * 创建粒子对象池
 * @returns {Array} 粒子池数组
 */
export function initParticlePool() {
  const pool = new Array(MAX_PARTICLES);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool[i] = {
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      life: 0,
      maxLife: 0,
      color: '#ffffff',
      size: 2,
      decay: 1.5,
      gravity: 0,
      shrink: true,
    };
  }
  return pool;
}

/**
 * 查找第一个非活跃粒子
 * @param {Array} pool
 * @returns {Object|null}
 */
function getInactiveParticle(pool) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) {
      return pool[i];
    }
  }
  return null;
}

/**
 * 生成粒子
 * @param {Array} pool 粒子池
 * @param {number} x 生成位置 X
 * @param {number} y 生成位置 Y
 * @param {string} color 粒子颜色
 * @param {number} count 粒子数量
 * @param {Object} [config] 配置覆盖项
 * @param {number} [config.maxLife=0.8]
 * @param {number} [config.minLife=0.3]
 * @param {number} [config.speedMin=50]
 * @param {number} [config.speedMax=200]
 * @param {number} [config.sizeMin=2]
 * @param {number} [config.sizeMax=2]
 * @param {number} [config.gravity=0]
 * @param {number} [config.decay=1.5]
 * @param {number} [config.spreadAngle] 主方向弧度（与 spreadRange 搭配使用）
 * @param {number} [config.spreadRange] 角度扩散范围弧度
 */
export function spawnParticles(pool, x, y, color, count, config = {}) {
  // 移动端降级
  if (window.innerWidth < 768) {
    count = Math.ceil(count * MOBILE_PARTICLE_SCALE);
  }
  if (count < 0) count = 0;

  const {
    maxLife = 0.8,
    minLife = 0.3,
    speedMin = 50,
    speedMax = 200,
    sizeMin = 2,
    sizeMax = 2,
    gravity = 0,
    decay = 1.5,
    spreadAngle,
    spreadRange,
  } = config;

  for (let i = 0; i < count; i++) {
    const p = getInactiveParticle(pool);
    if (!p) break;

    // 角度计算：优先使用 spreadAngle + spreadRange，否则 0~2π 均匀随机
    let angle;
    if (spreadAngle !== undefined && spreadRange !== undefined) {
      angle = spreadAngle + randomRange(-spreadRange / 2, spreadRange / 2);
    } else {
      angle = randomRange(0, Math.PI * 2);
    }

    const speed = randomRange(speedMin, speedMax);
    const life = randomRange(minLife, maxLife);

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = life;
    p.maxLife = life;
    p.color = color;
    p.size = randomRange(sizeMin, sizeMax);
    p.decay = decay;
    p.gravity = gravity;
    p.shrink = true;
  }
}

/**
 * 更新所有活跃粒子
 * @param {Array} pool 粒子池
 * @param {number} dt 帧时间差（秒）
 */
export function updateParticles(pool, dt) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;

    p.life -= dt * p.decay;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    if (p.shrink) {
      p.size *= (1 - dt * 0.5);
    }
  }
}

/**
 * 渲染所有活跃粒子（霓虹叠加效果）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} pool 粒子池
 */
export function renderParticles(ctx, pool) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;

    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size * 4;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.3, p.size), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 护盾格挡特效（沿切线方向爆发）
 * @param {Array} pool
 * @param {number} x 碰撞点 X
 * @param {number} y 碰撞点 Y
 * @param {string} color 颜色
 * @param {number} cx 圆心 X
 * @param {number} cy 圆心 Y
 */
export function spawnDeflectEffect(pool, x, y, color, cx, cy) {
  const angle = Math.atan2(y - cy, x - cx);
  const tangentAngle = angle + Math.PI / 2;

  spawnParticles(pool, x, y, color, 25, {
    speedMin: 80,
    speedMax: 250,
    sizeMin: 1.5,
    sizeMax: 4,
    maxLife: 0.6,
    minLife: 0.3,
    spreadAngle: tangentAngle,
    spreadRange: Math.PI / 3,
  });
}

/**
 * 核心受击特效（爆炸 + 屏幕震动）
 * @param {Array} pool
 * @param {number} cx 核心 X
 * @param {number} cy 核心 Y
 * @param {Object} state 游戏状态（设置 screenShake）
 */
export function spawnCoreHitEffect(pool, cx, cy, state) {
  const colors = ['#ff3355', '#ff6600', '#ff8800', '#ff0040'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  spawnParticles(pool, cx, cy, color, 50, {
    speedMin: 100,
    speedMax: 350,
    sizeMin: 2,
    sizeMax: 6,
    maxLife: 1.0,
    minLife: 0.5,
    decay: 1.2,
    gravity: 20,
  });

  // 触发屏幕震动
  if (state) {
    state.screenShake = {
      duration: 0.35,
      maxDuration: 0.35,
      intensity: 10,
    };
  }
}

/**
 * 连击特效（金色粒子向上飘）
 * @param {Array} pool
 * @param {number} x
 * @param {number} y
 */
export function spawnComboEffect(pool, x, y) {
  spawnParticles(pool, x, y, '#ffdd00', 12, {
    speedMin: 40,
    speedMax: 120,
    sizeMin: 1,
    sizeMax: 3,
    maxLife: 1.2,
    minLife: 0.6,
    decay: 0.8,
    gravity: -30,
  });
}

/**
 * Boss 格挡特效（更大更亮）
 * @param {Array} pool
 * @param {number} x
 * @param {number} y
 * @param {string} color
 */
export function spawnBossDeflectEffect(pool, x, y, color) {
  spawnParticles(pool, x, y, color, 40, {
    speedMin: 120,
    speedMax: 350,
    sizeMin: 3,
    sizeMax: 7,
    maxLife: 0.9,
    minLife: 0.4,
  });
}

/**
 * 终极技能特效（冲击波环）
 * 沿圆周均匀分布粒子，混合白色与青色，高速向外扩散
 * @param {Array} pool
 * @param {number} cx 中心 X
 * @param {number} cy 中心 Y
 */
export function spawnUltimateEffect(pool, cx, cy) {
  const count = 60;
  const color = lerpColor('#ffffff', '#00ffcc', 0.5);

  for (let i = 0; i < count; i++) {
    const p = getInactiveParticle(pool);
    if (!p) break;

    const angle = (i / count) * Math.PI * 2;
    const speed = randomRange(200, 400);
    const life = randomRange(0.3, 0.6);

    p.active = true;
    p.x = cx;
    p.y = cy;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = life;
    p.maxLife = life;
    p.color = color;
    p.size = randomRange(3, 5);
    p.decay = 2.0;
    p.gravity = 0;
    p.shrink = true;
  }
}

/**
 * 应用屏幕震动变换（渲染时调用）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} state 游戏状态
 */
export function applyScreenShake(ctx, state) {
  if (state.screenShake && state.screenShake.duration > 0) {
    const s = state.screenShake;
    const progress = s.duration / s.maxDuration;
    const offsetX = (Math.random() - 0.5) * s.intensity * progress * 2;
    const offsetY = (Math.random() - 0.5) * s.intensity * progress * 2;
    ctx.translate(offsetX, offsetY);
  }
}

/**
 * 更新屏幕震动计时器（update 阶段调用）
 * @param {Object} state 游戏状态
 * @param {number} dt 帧时间差（秒）
 */
export function updateScreenShake(state, dt) {
  if (state.screenShake && state.screenShake.duration > 0) {
    state.screenShake.duration -= dt;
  }
}
