/**
 * boss.js — Boss 系统（多阶段攻击模式）
 * 三个 Boss：环形炮台 (ringCannon)、双子卫星 (twinSatellite)、虚空之眼 (voidEye)
 *
 * 每个 Boss 有多个阶段，随血量降低解锁更强力的攻击模式。
 * Boss 弹幕独立管理于 state.bossProjectiles，避免与普通弹幕池冲突。
 */

import { BOSS_HEALTH, PROJECTILE_BASE_SPEED } from './config.js';
import { randomRange, normalizeAngle, angleDiff, dist, lerpAngle, clamp, rgbaFromHex } from './utils.js';
import { drawGlowCircle, drawGlowArc, drawGlowLine } from './renderer.js';
import { isWithinShield, isPerfectBlock } from './shield.js';
import { spawnDeflectEffect, spawnBossDeflectEffect, spawnCoreHitEffect } from './particle.js';
import { showBossAnnounce, updateBossHealth, hideBossHealth } from './ui.js';
import { playBlock } from './audio.js';

// ========================================================================
// 配置
// ========================================================================

/**
 * 根据 Boss 类型获取配置
 * @param {string} type Boss 类型标识
 * @returns {{ name: string, hp: number, maxPhases: number }}
 */
function getBossConfig(type) {
  const configs = {
    ringCannon:    { name: '环形炮台', hp: BOSS_HEALTH.ringCannon,    maxPhases: 2 },
    twinSatellite: { name: '双子卫星', hp: BOSS_HEALTH.twinSatellite, maxPhases: 2 },
    voidEye:       { name: '虚空之眼', hp: BOSS_HEALTH.voidEye,       maxPhases: 3 },
  };
  return configs[type] || configs.ringCannon;
}

// ========================================================================
// 系统生命周期
// ========================================================================

/**
 * 初始化 Boss 系统
 * @param {Object} state 游戏全局状态
 */
export function initBossSystem(state) {
  state.boss = null;
  state.bossProjectiles = [];
  state.lastDefeatedBossType = null;
}

/**
 * 生成指定类型的 Boss
 * @param {Object} state    游戏全局状态
 * @param {string} bossType Boss 类型标识
 */
export function spawnBoss(state, bossType) {
  const config = getBossConfig(bossType);

  // 不同类型使用不同的轨道半径
  const orbitRadii = {
    ringCannon:    state.radius * 0.85,
    twinSatellite: state.radius * 0.80,
    voidEye:       state.radius * 0.85,
  };

  const bossRadius = orbitRadii[bossType] || state.radius * 0.85;
  const startAngle = randomRange(0, Math.PI * 2);

  const boss = {
    // 通用
    type: bossType,
    name: config.name,
    hp: config.hp,
    maxHp: config.hp,
    phase: 1,
    maxPhases: config.maxPhases,
    angle: startAngle,
    radius: bossRadius,
    x: state.cx + Math.cos(startAngle) * bossRadius,
    y: state.cy + Math.sin(startAngle) * bossRadius,
    timer: 0,
    attackTimer: 0,
    phaseTimer: 0,
    active: true,
    introTimer: 2.0,

    // 环形炮台专用
    laserAngle: 0,
    laserDamageCooldown: 0,

    // 双子卫星专用
    satellites: [
      { angle: 0,                x: 0, y: 0 },
      { angle: Math.PI,          x: 0, y: 0 },
    ],
    satelliteShootIndex: 0,
    satelliteRadius: state.radius * 0.7,

    // 虚空之眼专用
    wallTimer: 4.0,
  };

  // 初始化卫星位置
  for (const sat of boss.satellites) {
    sat.x = state.cx + Math.cos(sat.angle) * boss.satelliteRadius;
    sat.y = state.cy + Math.sin(sat.angle) * boss.satelliteRadius;
  }

  state.boss = boss;
  state.bossProjectiles = [];
  showBossAnnounce(config.name);
}

// ========================================================================
// 更新
// ========================================================================

/**
 * 每帧更新 Boss 状态
 * @param {Object} state 游戏全局状态
 * @param {number} dt    帧时间差（秒）
 */
export function updateBoss(state, dt) {
  const boss = state.boss;
  if (!boss) return;

  // ---- 登场动画：2 秒无敌过渡 ----
  if (boss.introTimer > 0) {
    boss.introTimer -= dt;
    return;
  }

  // ---- 根据类型调用专属更新 ----
  switch (boss.type) {
    case 'ringCannon':
      updateRingCannon(state, dt);
      break;
    case 'twinSatellite':
      updateTwinSatellite(state, dt);
      break;
    case 'voidEye':
      updateVoidEye(state, dt);
      break;
  }

  // ---- Boss 绕轨道缓慢旋转 ----
  boss.angle += dt * 0.5;
  boss.x = state.cx + Math.cos(boss.angle) * boss.radius;
  boss.y = state.cy + Math.sin(boss.angle) * boss.radius;

  // ---- 双子卫星位置跟随 ----
  if (boss.type === 'twinSatellite') {
    for (const sat of boss.satellites) {
      sat.x = state.cx + Math.cos(sat.angle) * boss.satelliteRadius;
      sat.y = state.cy + Math.sin(sat.angle) * boss.satelliteRadius;
    }
  }

  // ---- 阶段切换（基于 HP 比例） ----
  const hpRatio = boss.hp / boss.maxHp;
  if (boss.maxPhases === 2) {
    if (hpRatio <= 0.5 && boss.phase < 2) {
      boss.phase = 2;
      boss.phaseTimer = 0;
    }
  } else if (boss.maxPhases === 3) {
    if (hpRatio <= 0.66 && boss.phase < 2) {
      boss.phase = 2;
      boss.phaseTimer = 0;
    }
    if (hpRatio <= 0.33 && boss.phase < 3) {
      boss.phase = 3;
      boss.wallTimer = 4.0;
      boss.phaseTimer = 0;
    }
  }

  // ---- 攻击冷却（攻击函数自行设置 attackTimer） ----
  boss.attackTimer -= dt;

  // ---- 更新 Boss 专属弹幕 ----
  updateBossProjectiles(state, dt);
}

// ========================================================================
// 环形炮台 (Ring Cannon)
// ========================================================================

/**
 * 阶段 1：8 方向弹幕，每 2 秒一轮
 * 阶段 2：8 方向弹幕（每 1.5 秒）+ 激光扫射（旋转速度 2.5 rad/s）
 *         激光被护盾阻挡 → Boss 受到 3 反噬伤害
 */
function updateRingCannon(state, dt) {
  const boss = state.boss;

  if (boss.phase === 1) {
    if (boss.attackTimer <= 0) {
      fireRingCannonBarrage(state, 8, 200);
      boss.attackTimer = 2.0;
    }
  } else {
    // 阶段 2：弹幕 + 激光
    if (boss.attackTimer <= 0) {
      fireRingCannonBarrage(state, 8, 200);
      boss.attackTimer = 1.5;
    }

    // 激光旋转
    boss.laserAngle += dt * 2.5;

    // 反噬检测：带冷却防止每帧触发
    boss.laserDamageCooldown -= dt;
    if (boss.laserDamageCooldown <= 0 && isWithinShield(boss.laserAngle, state)) {
      damageBoss(state, 3);
      boss.laserDamageCooldown = 0.8; // 0.8 秒冷却
    }
  }
}

/**
 * 发射环形弹幕（均匀 n 方向，每发 ±15° 随机偏移）
 * @param {Object} state  游戏状态
 * @param {number} count  弹幕数量
 * @param {number} speed  弹幕速度 px/s
 */
function fireRingCannonBarrage(state, count, speed) {
  const boss = state.boss;
  const list = state.bossProjectiles;

  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const offset = randomRange(-Math.PI / 12, Math.PI / 12); // ±15°
    list.push({
      active: true,
      x: boss.x,
      y: boss.y,
      angle: baseAngle + offset,
      speed: speed,
      color: '#ff6600',
      radius: 5,
      hp: 1,
      maxHp: 1,
    });
  }
}

// ========================================================================
// 双子卫星 (Twin Satellite)
// ========================================================================

/**
 * 两个卫星在轨道直径两端（相差 π）绕核心旋转。
 * 共享血条，弹幕被护盾挡住 → damageBoss(1)，完美格挡 → damageBoss(2)
 *
 * 阶段 1：角速度 2 rad/s，交替开火（每 1.8s），扇形 3 发 50°
 *          卫星 1（青色普通弹幕），卫星 2（品红快速弹幕）
 * 阶段 2：角速度 4 rad/s，同时开火（每 1.2s），扇形 5 发 50°
 */
function updateTwinSatellite(state, dt) {
  const boss = state.boss;
  const rotSpeed = boss.phase === 1 ? 2.0 : 4.0;

  // 卫星旋转
  for (const sat of boss.satellites) {
    sat.angle += dt * rotSpeed;
  }

  const interval = boss.phase === 1 ? 1.8 : 1.2;

  if (boss.attackTimer <= 0) {
    if (boss.phase === 1) {
      // 交替开火
      const satIndex = boss.satelliteShootIndex % 2;
      const sat = boss.satellites[satIndex];
      const color = satIndex === 0 ? '#00f0ff' : '#ff00ff';
      const speed = satIndex === 0 ? 200 : 280;
      fireFanBarrage(
        state,
        sat.x, sat.y,
        sat.angle + Math.PI,  // 卫星指向核心的反方向发射
        3,
        Math.PI * 50 / 180,
        speed,
        color
      );
      boss.satelliteShootIndex++;
    } else {
      // 同时开火
      for (let i = 0; i < 2; i++) {
        const sat = boss.satellites[i];
        const color = i === 0 ? '#00f0ff' : '#ff00ff';
        const speed = i === 0 ? 220 : 300;
        fireFanBarrage(
          state,
          sat.x, sat.y,
          sat.angle + Math.PI,
          5,
          Math.PI * 50 / 180,
          speed,
          color
        );
      }
    }
    boss.attackTimer = interval;
  }
}

/**
 * 发射扇形弹幕
 * @param {Object} state    游戏状态
 * @param {number} x        发射点 X
 * @param {number} y        发射点 Y
 * @param {number} baseAngle 中心方向弧度
 * @param {number} count    弹幕数量
 * @param {number} spread   总扇形弧度
 * @param {number} speed    弹幕速度
 * @param {string} color    弹幕颜色
 */
function fireFanBarrage(state, x, y, baseAngle, count, spread, speed, color) {
  const list = state.bossProjectiles;
  if (count <= 1) {
    list.push({
      active: true, x, y,
      angle: baseAngle,
      speed, color,
      radius: 5, hp: 1, maxHp: 1,
    });
    return;
  }

  const startAngle = baseAngle - spread / 2;
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / (count - 1)) * spread;
    list.push({
      active: true, x, y,
      angle: normalizeAngle(angle),
      speed, color,
      radius: 5, hp: 1, maxHp: 1,
    });
  }
}

// ========================================================================
// 虚空之眼 (Void Eye)
// ========================================================================

/**
 * 阶段 1 (HP > 66%)：弹幕雨
 *   每 1.0 秒从屏幕上方随机 X 生成 3 个弹幕，竖直向下 250 px/s
 *
 * 阶段 2 (HP 33% ~ 66%)：追踪弹
 *   每 2.5 秒发射 1 个追踪弹（120 px/s，4 HP，半径 10，色 #ff8800）
 *   追踪弹飞向 targetShieldAngle 方向上的护盾位置
 *
 * 阶段 3 (HP < 33%)：绝望之墙 + 追踪弹（更快频率）
 *   每 4 秒发射 36 个弹幕（360° 均匀，每 10° 一个）含 40° 缺口
 *   保留追踪弹，频率提升至每 1.5 秒
 */
function updateVoidEye(state, dt) {
  const boss = state.boss;

  // 瞳孔跟随玩家护盾方向（平滑插值）
  const target = state.targetShieldAngle || state.shieldAngle || 0;
  boss.laserAngle = lerpAngle(boss.laserAngle, target, dt * 3);

  if (boss.phase === 1) {
    // ---- 弹幕雨 ----
    if (boss.attackTimer <= 0) {
      const halfW = state.screenWidth * 0.3;
      for (let i = 0; i < 3; i++) {
        state.bossProjectiles.push({
          active: true,
          x: randomRange(state.cx - halfW, state.cx + halfW),
          y: state.cy - state.screenHeight * 0.5,
          angle: Math.PI / 2,           // 竖直向下
          speed: 250,
          color: '#8800ff',
          radius: 5,
          hp: 1,
          maxHp: 1,
        });
      }
      boss.attackTimer = 1.0;
    }
  } else if (boss.phase === 2) {
    // ---- 追踪弹 ----
    if (boss.attackTimer <= 0) {
      fireTrackingProjectile(state);
      boss.attackTimer = 2.5;
    }
  } else {
    // ---- 阶段 3：绝望之墙 + 追踪弹 ----
    boss.wallTimer -= dt;
    if (boss.wallTimer <= 0) {
      fireDespairWall(state);
      boss.wallTimer = 4.0;
    }

    // 追踪弹（更快频率）
    if (boss.attackTimer <= 0) {
      fireTrackingProjectile(state);
      boss.attackTimer = 1.5;
    }
  }
}

/**
 * 发射一枚追踪弹（4 HP，追踪护盾方向）
 */
function fireTrackingProjectile(state) {
  const boss = state.boss;
  state.bossProjectiles.push({
    active: true,
    x: boss.x,
    y: boss.y,
    angle: Math.atan2(state.cy - boss.y, state.cx - boss.x),
    speed: 120,
    color: '#ff8800',
    radius: 10,
    hp: 4,
    maxHp: 4,
  });
}

/**
 * 发射绝望之墙：36 个弹幕（360° 均匀）含一个 40° 缺口
 */
function fireDespairWall(state) {
  const boss = state.boss;
  const count = 36;
  const gapSize = Math.PI * 40 / 180;   // 40° 缺口
  const gapCenter = randomRange(0, Math.PI * 2);
  const gapStart = gapCenter - gapSize / 2;
  const gapEnd = gapCenter + gapSize / 2;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;

    // 检查是否在缺口内
    let inGap = false;
    if (gapStart <= gapEnd) {
      if (angle >= gapStart && angle <= gapEnd) inGap = true;
    } else {
      // 缺口跨越 0° 边界
      if (angle >= gapStart || angle <= gapEnd) inGap = true;
    }
    if (inGap) continue;

    state.bossProjectiles.push({
      active: true,
      x: boss.x,
      y: boss.y,
      angle: normalizeAngle(angle),
      speed: 200,
      color: '#8800ff',
      radius: 5,
      hp: 1,
      maxHp: 1,
    });
  }
}

// ========================================================================
// Boss 弹幕更新（移动 + 碰撞）
// ========================================================================

/**
 * 更新所有 Boss 专属弹幕
 * - 追踪弹每帧重定向到护盾位置
 * - 护盾拦截检测（含多血量弹幕反弹）
 * - 核心命中检测
 * - 离屏回收
 *
 * @param {Object} state 游戏状态
 * @param {number} dt    帧时间差（秒）
 */
function updateBossProjectiles(state, dt) {
  const list = state.bossProjectiles;
  const shieldRadius = state.shieldRadius || state.radius;
  const shieldAngle = state.shieldAngle;
  const targetAngle = state.targetShieldAngle || shieldAngle;

  for (let i = list.length - 1; i >= 0; i--) {
    const bp = list[i];
    if (!bp.active) {
      list.splice(i, 1);
      continue;
    }

    // ---- 追踪弹：重定向到护盾位置 ----
    const shieldX = state.cx + Math.cos(targetAngle) * shieldRadius;
    const shieldY = state.cy + Math.sin(targetAngle) * shieldRadius;
    const trackTarget = Math.atan2(shieldY - bp.y, shieldX - bp.x);
    bp.angle = normalizeAngle(lerpAngle(bp.angle, trackTarget, dt * 2));

    // ---- 移动 ----
    bp.x += Math.cos(bp.angle) * bp.speed * dt;
    bp.y += Math.sin(bp.angle) * bp.speed * dt;

    const d = dist(bp.x, bp.y, state.cx, state.cy);

    // ---- 护盾拦截 ----
    if (d <= shieldRadius + bp.radius &&
        d >= shieldRadius - bp.speed * dt - bp.radius) {
      const projAngle = Math.atan2(bp.y - state.cy, bp.x - state.cx);
      if (isWithinShield(projAngle, state)) {
        bp.hp--;
        if (bp.hp <= 0) {
          bp.active = false;
          // 反伤判定
          const isPerfect = isPerfectBlock(projAngle, state);
          let dmg = 1;
          if (state.boss && state.boss.type === 'twinSatellite') {
            dmg = isPerfect ? 2 : 1;
          }
          damageBoss(state, dmg);
          spawnDeflectEffect(state.particlePool, bp.x, bp.y, bp.color, state.cx, state.cy);
          playBlock();
        } else {
          // 多血量弹幕反弹
          bp.angle += Math.PI;
        }
        continue;
      }
    }

    // ---- 核心命中 ----
    if (d <= state.coreRadius + bp.radius) {
      bp.active = false;
      spawnCoreHitEffect(state.particlePool, state.cx, state.cy, state);
      // 核心扣血由 main.js 的 hit 事件处理管道完成
      continue;
    }

    // ---- 离屏回收 ----
    const maxDim = Math.max(state.screenWidth, state.screenHeight);
    if (d > maxDim * 1.5) {
      bp.active = false;
    }
  }
}

// ========================================================================
// 渲染
// ========================================================================

/**
 * 渲染 Boss 及 Boss 弹幕
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} state 游戏状态
 */
export function renderBoss(ctx, state) {
  const boss = state.boss;
  if (!boss) return;

  // ---- 登场动画：从屏幕边缘飞入 ----
  if (boss.introTimer > 0) {
    const t = 1 - boss.introTimer / 2.0; // 0 → 1
    const animDist = Math.max(state.screenWidth, state.screenHeight) * 0.6;
    const sx = state.cx + Math.cos(boss.angle) * animDist * (1 - t);
    const sy = state.cy + Math.sin(boss.angle) * animDist * (1 - t);

    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 1.5);
    renderBossByType(ctx, state, sx, sy);
    ctx.restore();
    return;
  }

  // ---- 正常渲染 ----
  renderBossByType(ctx, state, boss.x, boss.y);

  // ---- Boss 弹幕 ----
  renderBossProjectiles(ctx, state);
}

/**
 * 根据 Boss 类型分发渲染
 */
function renderBossByType(ctx, state, x, y) {
  const boss = state.boss;
  switch (boss.type) {
    case 'ringCannon':
      renderRingCannon(ctx, state, x, y);
      break;
    case 'twinSatellite':
      renderTwinSatellite(ctx, state);
      break;
    case 'voidEye':
      renderVoidEye(ctx, state, x, y);
      break;
  }
}

// ------------------------------ 环形炮台 ------------------------------

/**
 * 渲染环形炮台
 * - 中心大圆（半径 20，#ff6600）
 * - 6 个发光炮管均匀分布指向外侧
 * - 阶段 2：激光扫射
 */
function renderRingCannon(ctx, state, x, y) {
  const boss = state.boss;

  // ---- 发光外圈（径向渐变） ----
  ctx.save();
  const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 40);
  glowGrad.addColorStop(0, 'rgba(255,102,0,0.25)');
  glowGrad.addColorStop(1, 'rgba(255,102,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- 6 个炮管（矩形） ----
  const cannonLen = 24;
  const cannonW = 6;
  const innerR = 14;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + boss.angle * 0.3;
    const sx = x + Math.cos(a) * innerR;
    const sy = y + Math.sin(a) * innerR;
    const ex = x + Math.cos(a) * (innerR + cannonLen);
    const ey = y + Math.sin(a) * (innerR + cannonLen);

    ctx.save();
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = cannonW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  // ---- 中心大圆 ----
  drawGlowCircle(ctx, x, y, 20, '#ff6600', 25);

  // ---- 阶段 2 激光 ----
  if (boss.phase >= 2) {
    const laserEndX = x + Math.cos(boss.laserAngle) * state.radius * 1.5;
    const laserEndY = y + Math.sin(boss.laserAngle) * state.radius * 1.5;
    drawGlowLine(ctx, x, y, laserEndX, laserEndY, '#ff0040', 3, 30);
  }
}

// ------------------------------ 双子卫星 ------------------------------

/**
 * 渲染双子卫星
 * - 两个半径 12 的圆（#ff00ff），轨道直径两端
 * - 中间连接虚线
 * - 虚线轨道指示
 */
function renderTwinSatellite(ctx, state) {
  const boss = state.boss;
  const s1 = boss.satellites[0];
  const s2 = boss.satellites[1];

  // 同步卫星位置到 state
  s1.x = state.cx + Math.cos(s1.angle) * boss.satelliteRadius;
  s1.y = state.cy + Math.sin(s1.angle) * boss.satelliteRadius;
  s2.x = state.cx + Math.cos(s2.angle) * boss.satelliteRadius;
  s2.y = state.cy + Math.sin(s2.angle) * boss.satelliteRadius;

  // ---- 卫星轨道虚线圆 ----
  ctx.save();
  ctx.setLineDash([3, 12]);
  ctx.strokeStyle = rgbaFromHex('#ff00ff', 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(state.cx, state.cy, boss.satelliteRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ---- 连接虚线 ----
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = rgbaFromHex('#ff00ff', 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.stroke();
  ctx.restore();

  // ---- 两个卫星 ----
  drawGlowCircle(ctx, s1.x, s1.y, 12, '#ff00ff', 20);
  drawGlowCircle(ctx, s2.x, s2.y, 12, '#ff00ff', 20);
}

// ------------------------------ 虚空之眼 ------------------------------

/**
 * 渲染虚空之眼
 * - 外层大环（半径 35，#8800ff）
 * - 中间环（半径 22，#cc00ff）
 * - 内层瞳孔（半径 10，亮色，跟随护盾方向）
 */
function renderVoidEye(ctx, state, x, y) {
  const boss = state.boss;

  // ---- 外层大环 ----
  ctx.save();
  ctx.shadowColor = '#8800ff';
  ctx.shadowBlur = 30;
  ctx.strokeStyle = '#8800ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ---- 中间环 ----
  ctx.save();
  ctx.shadowColor = '#cc00ff';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = '#cc00ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ---- 瞳孔（跟随 shieldAngle 偏移） ----
  const pupilAngle = boss.laserAngle;
  const pupilDist = 8;
  const px = x + Math.cos(pupilAngle) * pupilDist;
  const py = y + Math.sin(pupilAngle) * pupilDist;

  drawGlowCircle(ctx, px, py, 10, '#ffffff', 25);
  // 瞳孔内部亮核
  ctx.save();
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------ Boss 弹幕渲染 ------------------------------

/**
 * 渲染 Boss 专属弹幕（发光圆形）
 */
function renderBossProjectiles(ctx, state) {
  const list = state.bossProjectiles;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const bp of list) {
    if (!bp.active) continue;

    ctx.save();
    ctx.shadowColor = bp.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = bp.color;
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, bp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ========================================================================
// 伤害与击败
// ========================================================================

/**
 * 对当前 Boss 造成伤害
 * @param {Object} state  游戏全局状态
 * @param {number} amount 伤害量
 */
export function damageBoss(state, amount) {
  if (!state.boss) return;
  state.boss.hp -= amount;
  if (state.boss.hp < 0) state.boss.hp = 0;

  updateBossHealth(state.boss.hp, state.boss.maxHp);

  if (state.boss.hp <= 0) {
    defeatBoss(state);
  }
}

/**
 * Boss 击败处理
 * - 三倍爆炸粒子
 * - 隐藏血条
 * - 清空 Boss 对象（main.js 处理 waveClear 状态切换）
 */
function defeatBoss(state) {
  const boss = state.boss;
  const particleColors = ['#ff6600', '#ff00ff', '#8800ff', '#ffdd00', '#00ffcc'];

  for (let i = 0; i < 3; i++) {
    spawnBossDeflectEffect(
      state.particlePool,
      boss.x + randomRange(-30, 30),
      boss.y + randomRange(-30, 30),
      particleColors[Math.floor(Math.random() * particleColors.length)]
    );
  }

  // 记录击败的 Boss 类型（main.js 用于成就检测）
  state.lastDefeatedBossType = boss.type;

  hideBossHealth();
  state.bossProjectiles = [];
  state.boss = null;
}
