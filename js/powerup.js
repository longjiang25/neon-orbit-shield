/**
 * powerup.js — 道具系统
 *
 * 管理道具生成（屏幕边缘飞向核心）、护盾拾取、效果应用、持续时间管理、
 * 以及六角星霓虹渲染。
 *
 * 道具类型：shieldExpand（护盾扩大）, slowMotion（时间减速）,
 *           scoreBoost（分数翻倍）, heal（生命恢复）, repel（全屏弹开）
 */

import { POWERUP_DURATIONS, MAX_HEALTH } from './config.js';
import { dist } from './utils.js';
import { isWithinShield } from './shield.js';
import { spawnParticles } from './particle.js';

// ========================================================================
// 常量
// ========================================================================

/** 道具类型可视化配置 */
const POWERUP_CONFIGS = {
  shieldExpand: { color: '#00d4ff', label: '护盾扩大', icon: '⟐' },
  slowMotion:   { color: '#4488ff', label: '时间减速', icon: '⏱' },
  scoreBoost:   { color: '#ffdd00', label: '分数翻倍', icon: '✦' },
  heal:         { color: '#00ff88', label: '生命恢复', icon: '♥' },
  repel:        { color: '#ff8800', label: '全屏弹开', icon: '⚡' },
};

const POWERUP_TYPES = Object.keys(POWERUP_CONFIGS);
const MAX_FLYING_POWERUPS = 3;
const POWERUP_SPEED = 100;       // px/s，比弹幕慢
const POWERUP_RADIUS = 10;       // 碰撞半径
const PULSE_SPEED = 3;           // 脉冲动画速度
const STAR_POINTS = 6;           // 六角星顶点数
const SHADOW_BLUR = 20;

// ========================================================================
// 绘制辅助
// ========================================================================

/**
 * 绘制六角星（带霓虹发光）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x        中心 X
 * @param {number} y        中心 Y
 * @param {number} radius   半径
 * @param {string} color    填充/发光颜色
 * @param {number} rotOffset 旋转偏移（弧度）
 */
function drawStar(ctx, x, y, radius, color, rotOffset) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = SHADOW_BLUR;
  ctx.beginPath();
  for (let i = 0; i < STAR_POINTS; i++) {
    const angle = (i * Math.PI * 2) / STAR_POINTS - Math.PI / 2 + rotOffset;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 道具拾取通用粒子特效
 * @param {Object} state  游戏全局状态
 * @param {number} x      拾取位置 X
 * @param {number} y      拾取位置 Y
 * @param {string} color  粒子颜色
 */
function spawnPowerupEffect(state, x, y, color) {
  spawnParticles(state.particlePool, x, y, color, 30, {
    speedMin: 80,
    speedMax: 200,
    sizeMin: 2,
    sizeMax: 5,
    maxLife: 0.8,
    minLife: 0.3,
  });
}

// ========================================================================
// 初始化
// ========================================================================

/**
 * 初始化道具系统
 * @param {Object} state  游戏全局状态
 */
export function initPowerupSystem(state) {
  state.activePowerups = [];    // 已激活的效果列表
  state.powerupObjects = [];   // 正在飞行的道具对象
}

// ========================================================================
// 生成
// ========================================================================

/**
 * 在屏幕边缘生成一个飞行道具（飞向核心）
 *
 * 调用方应检查 POWERUP_SPAWN_CHANCE 决定是否调用此函数。
 * 如果有 Boss 在场或已有 3 个飞行道具，静默忽略。
 *
 * @param {Object} state  游戏全局状态
 */
export function spawnPowerup(state) {
  // 有 Boss 在场时不生成
  if (state.boss) return;

  // 限制同时飞行的道具数量（最多 3 个）
  let activeCount = 0;
  for (let i = 0; i < state.powerupObjects.length; i++) {
    if (state.powerupObjects[i].active) activeCount++;
  }
  if (activeCount >= MAX_FLYING_POWERUPS) return;

  // 随机选择道具类型
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const config = POWERUP_CONFIGS[type];

  // 在屏幕边缘随机位置生成（类似弹幕生成方式）
  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist = Math.max(state.screenWidth, state.screenHeight) * 0.75;

  const x = state.cx + Math.cos(spawnAngle) * spawnDist;
  const y = state.cy + Math.sin(spawnAngle) * spawnDist;

  state.powerupObjects.push({
    active: true,
    x: x,
    y: y,
    type: type,
    color: config.color,
    speed: POWERUP_SPEED,
    angle: Math.atan2(state.cy - y, state.cx - x), // 指向核心的方向
    radius: POWERUP_RADIUS,
    pulse: 0,
  });
}

// ========================================================================
// 更新
// ========================================================================

/**
 * 更新所有飞行道具位置、护盾拾取检测、核心到达检测，以及已激活道具的持续时间
 * @param {Object} state  游戏全局状态
 * @param {number} dt     帧时间差（秒）
 */
export function updatePowerups(state, dt) {
  if (dt <= 0) return;

  // ---- 1. 更新飞行道具 ----
  for (let i = state.powerupObjects.length - 1; i >= 0; i--) {
    const powerup = state.powerupObjects[i];
    if (!powerup.active) continue;

    // 脉冲动画计时器
    powerup.pulse += dt * PULSE_SPEED;

    // 向核心移动
    const dx = state.cx - powerup.x;
    const dy = state.cy - powerup.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > 1) {
      powerup.x += (dx / d) * powerup.speed * dt;
      powerup.y += (dy / d) * powerup.speed * dt;
      powerup.angle = Math.atan2(dy, dx);
    }

    // 护盾拦截检测（与弹幕碰撞检测相同的区间判定）
    const shieldRadius = state.shieldRadius || state.radius || 0;
    const distToCenter = dist(powerup.x, powerup.y, state.cx, state.cy);

    if (distToCenter <= shieldRadius + powerup.radius &&
        distToCenter >= shieldRadius - powerup.speed * dt - powerup.radius) {
      const projAngle = Math.atan2(powerup.y - state.cy, powerup.x - state.cx);
      if (isWithinShield(projAngle, state)) {
        collectPowerup(powerup, state);
        continue;
      }
    }

    // 飞到核心 → 消失（不伤害核心）
    if (distToCenter <= state.coreRadius + powerup.radius) {
      powerup.active = false;
      continue;
    }

    // 离屏回收（安全兜底）
    const maxDim = Math.max(state.screenWidth, state.screenHeight);
    if (distToCenter > maxDim * 1.5) {
      powerup.active = false;
    }
  }

  // 清理非活跃的飞行道具对象
  for (let i = state.powerupObjects.length - 1; i >= 0; i--) {
    if (!state.powerupObjects[i].active) {
      state.powerupObjects.splice(i, 1);
    }
  }

  // ---- 2. 更新已激活道具的持续时间 ----
  updatePowerupTimers(state, dt);
}

// ========================================================================
// 渲染
// ========================================================================

/**
 * 渲染所有飞行的道具（旋转六角星 + 脉冲发光）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object}                   state  游戏全局状态
 */
export function renderPowerups(ctx, state) {
  for (let i = 0; i < state.powerupObjects.length; i++) {
    const powerup = state.powerupObjects[i];
    if (!powerup.active) continue;

    // 脉冲半径：围绕基础半径伸缩 20%
    const pulseRadius = powerup.radius * (1 + 0.2 * Math.sin(powerup.pulse));
    // 随时间连续旋转
    const rotOffset = powerup.pulse * 0.5;

    drawStar(ctx, powerup.x, powerup.y, pulseRadius, powerup.color, rotOffset);
  }
}

// ========================================================================
// 拾取 & 效果应用
// ========================================================================

/**
 * 拾取道具并应用效果
 * @param {Object} powerup  道具对象
 * @param {Object} state    游戏全局状态
 */
export function collectPowerup(powerup, state) {
  powerup.active = false;

  // 通用拾取粒子特效
  spawnPowerupEffect(state, powerup.x, powerup.y, powerup.color);

  switch (powerup.type) {
    case 'shieldExpand':
      state.shieldArc = state.originalShieldArc * 1.6;
      state.activePowerups.push({ type: 'shieldExpand', duration: POWERUP_DURATIONS.shieldExpand });
      break;

    case 'slowMotion':
      state.slowMotionActive = true;
      state.activePowerups.push({ type: 'slowMotion', duration: POWERUP_DURATIONS.slowMotion });
      break;

    case 'scoreBoost':
      state.scoreBoostActive = true;
      state.activePowerups.push({ type: 'scoreBoost', duration: POWERUP_DURATIONS.scoreBoost });
      break;

    case 'heal':
      // 即时效果：恢复 1 点生命
      state.health = Math.min(MAX_HEALTH, (state.health || 0) + 1);
      break;

    case 'repel': {
      // 即时效果：将所有弹幕沿径向弹开到屏幕边缘
      if (state.projectilePool) {
        const pushDist = Math.max(state.screenWidth, state.screenHeight) * 0.8;
        for (let j = 0; j < state.projectilePool.length; j++) {
          const proj = state.projectilePool[j];
          if (!proj.active) continue;

          const dx = proj.x - state.cx;
          const dy = proj.y - state.cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0) {
            proj.x = state.cx + (dx / d) * pushDist;
            proj.y = state.cy + (dy / d) * pushDist;
            // 保持原有飞行方向，弹幕会重新向核心飞来
          }
        }
      }

      // 额外粒子效果（冲击波感）
      spawnParticles(state.particlePool, powerup.x, powerup.y, '#ff8800', 50, {
        speedMin: 100,
        speedMax: 300,
        sizeMin: 2,
        sizeMax: 6,
        maxLife: 1.0,
        minLife: 0.5,
      });
      break;
    }
  }
}

// ========================================================================
// 持续时间管理
// ========================================================================

/**
 * 更新已激活效果的剩余持续时间，过期时自动失效
 * @param {Object} state  游戏全局状态
 * @param {number} dt     帧时间差（秒）
 */
export function updatePowerupTimers(state, dt) {
  if (!state.activePowerups || state.activePowerups.length === 0) return;

  for (let i = state.activePowerups.length - 1; i >= 0; i--) {
    const p = state.activePowerups[i];
    if (p.duration !== undefined) {
      p.duration -= dt;
      if (p.duration <= 0) {
        expirePowerup(p, state);
        state.activePowerups.splice(i, 1);
      }
    }
  }
}

/**
 * 道具效果过期时的恢复逻辑
 * @param {Object} powerup  activePowerups 中的效果条目
 * @param {Object} state    游戏全局状态
 */
function expirePowerup(powerup, state) {
  switch (powerup.type) {
    case 'shieldExpand':
      state.shieldArc = state.originalShieldArc;
      break;

    case 'slowMotion':
      state.slowMotionActive = false;
      break;

    case 'scoreBoost':
      state.scoreBoostActive = false;
      break;
    // heal 和 repel 为即时效果，无需过期处理
  }
}
