/**
 * main.js — 游戏入口、主循环、状态机（模块胶水）
 * 核心计分系统：处理弹幕拦截/命中、连击、能量、大招、游戏结束
 */

import { initRenderer, resizeCanvas, renderBackground, renderCore } from './renderer.js';
import { renderJoystick } from './renderer.js';
import { initInput, updateInput } from './input.js';
import { initShield, updateShield, renderShield } from './shield.js';
import { initProjectilePool, spawnProjectile, updateProjectiles, renderProjectiles } from './projectile.js';
import { initParticlePool, updateParticles, renderParticles } from './particle.js';
import {
  spawnDeflectEffect, spawnCoreHitEffect, spawnComboEffect, spawnUltimateEffect,
  updateScreenShake, applyScreenShake
} from './particle.js';
import { initBossSystem, spawnBoss, updateBoss, renderBoss, damageBoss } from './boss.js';
import { initPowerupSystem, spawnPowerup, updatePowerups, renderPowerups, updatePowerupTimers } from './powerup.js';
import { initDifficulty, updateDifficulty, getSpawnInterval, getProjectileSpeed, getRandomProjType, shouldSpawnBoss } from './difficulty.js';
import { initAudio, ensureAudioContext } from './audio.js';
import { playBlock, playPerfectBlock, playHit, playCombo, playUltimate, playGameOver } from './audio.js';
import { initUI, updateHUD, updateComboDisplay, flashScreen, showGameOver, showBossAnnounce, updateBossHealth, hideBossHealth, showScreen, updateMenuHighscore, showAchievement } from './ui.js';
import { loadHighScore, saveHighScore, loadAchievements, saveAchievement, incrementTotalGames } from './storage.js';
import { isPerfectBlock } from './shield.js';
import {
  MAX_DT, MAX_HEALTH, COMBO_TIMEOUT, MAX_COMBO_MULT,
  ENERGY_MAX, ENERGY_PER_BLOCK, ENERGY_PER_PERFECT,
  PROJ_TYPES, COLORS, POWERUP_SPAWN_CHANCE,
  JOYSTICK_AREA_RATIO, JOYSTICK_RADIUS_RATIO, MOBILE_BREAKPOINT
} from './config.js';

// --- 游戏状态 ---
const state = {
  // 屏幕
  screen: 'menu',           // menu | countdown | playing | bossIntro | waveClear | gameover
  cx: 0, cy: 0,
  screenWidth: 0, screenHeight: 0,
  radius: 0, coreRadius: 0,

  // 时间
  lastTimestamp: 0,
  elapsedTime: 0,
  gameTime: 0,

  // 游戏数据
  score: 0,
  health: MAX_HEALTH,
  combo: 0,
  maxCombo: 0,
  comboBuffer: 0,
  comboTimer: 0,
  energy: 0,
  wave: 1,
  level: 1,
  mode: 'classic',         // classic | challenge

  // 子系统状态（由各模块填充）
  shieldAngle: 0,
  targetShieldAngle: 0,
  shieldArc: 0,
  originalShieldArc: 0,
  projectilePool: null,
  particlePool: null,
  activePowerups: [],
  powerupObjects: [],
  boss: null,
  isPointerDown: false,

  // 计分系统内部状态
  _spawnAccum: 0,
  _countdownTimer: 0,
  _gameoverTimer: 0,       // 游戏结束后冷却计时（秒），冷却期间不响应点击/空格
  currentProjectileSpeed: 270,
  invincibleUntil: 0,
  slowMotionActive: false,
  scoreBoostActive: false,
  spacePressed: false,

  // 成就跟踪
  achievements: {},
  defeatedBosses: {},
  noHitWaves: 0,
  ultimateCount: 0,
  perfectBlockCount: 0,
  _lastWave: 1,

  // FPS 调试
  fps: 0,
  _frameCount: 0,
  _fpsTimeAccum: 0,

  // 输入流控制（上升沿触发，用于菜单/结算画面）
  _prevInputTrigger: false,
};

// ========================================================================
// 工具函数
// ========================================================================

/**
 * 根据波次返回 Boss 类型
 * 第 5 波 → ringCannon，第 10 波 → twinSatellite，第 15 波 → voidEye，之后循环
 * @param {number} wave 当前波次
 * @returns {string} Boss 类型标识
 */
function getBossTypeForWave(wave) {
  const cycle = ['ringCannon', 'twinSatellite', 'voidEye'];
  const index = (Math.floor(wave / 5) - 1) % 3;
  return cycle[index >= 0 ? index : 0];
}

/**
 * 尝试解锁成就（如果尚未解锁则保存并显示通知）
 * @param {string} id 成就 ID
 * @param {Object} state 游戏状态
 */
function tryUnlock(id, state) {
  const achievement = saveAchievement(id);
  if (achievement) {
    showAchievement(achievement.name + ' — ' + achievement.desc);
  }
}

// ========================================================================
// 初始化
// ========================================================================

function init() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // 存储到 state
  state.canvas = canvas;
  state.ctx = ctx;

  // 初始化渲染器
  initRenderer(canvas, ctx);
  resizeCanvas(canvas, ctx, state);
  updateJoystickLayout(state);

  // 初始化子系统
  state.projectilePool = initProjectilePool();
  state.particlePool = initParticlePool();
  initShield(state);
  state.shieldBaseRadius = state.radius;
  state.shieldCurrentRadius = state.radius;
  initBossSystem(state);
  initPowerupSystem(state);
  initDifficulty(state);
  initInput(state, canvas);
  initAudio();
  initUI(state);

  // 加载持久化数据
  state.highScore = loadHighScore();

  // 额外初始化
  state._spawnAccum = 0;
  state._countdownTimer = 0;
  state._gameoverTimer = 0;
  state.currentProjectileSpeed = getProjectileSpeed(state);
  state.invincibleUntil = 0;
  showScreen('menu');
  updateMenuHighscore(state.highScore);

  // ---------- 模式按钮点击事件 ----------
  const modeBtns = document.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ---------- 菜单和结算画面点击事件（绕过 pointer-events 分层问题） ----------
  const menuScreen = document.getElementById('menu-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const handleScreenClick = (screen) => (e) => {
    // 注意：不调用 stopPropagation()，否则会阻止 audio.js 的 AudioContext 初始化
    // （audio.js 监听 document 上的 pointerdown 来激活 Web Audio）
    // 菜单有 pointer-events: auto 已经拦截了事件，canvas 不会收到重复事件
    // 双保险：主动激活 AudioContext（iOS Safari 要求用户手势中创建）
    ensureAudioContext();
    if (screen === 'menu') {
      state.isPointerDown = true;
      state.spacePressed = true;
      handleFlowInput(state);
      state.isPointerDown = false;
      state.spacePressed = false;
    } else if (screen === 'gameover') {
      state.isPointerDown = true;
      state.spacePressed = true;
      handleFlowInput(state);
      state.isPointerDown = false;
      state.spacePressed = false;
    }
  };
  if (menuScreen) {
    menuScreen.addEventListener('pointerdown', handleScreenClick('menu'));
    menuScreen.addEventListener('click', handleScreenClick('menu'));
  }
  if (gameoverScreen) {
    gameoverScreen.addEventListener('pointerdown', handleScreenClick('gameover'));
    gameoverScreen.addEventListener('click', handleScreenClick('gameover'));
  }

  // 窗口事件
  window.addEventListener('resize', () => {
    resizeCanvas(canvas, ctx, state);
    updateJoystickLayout(state);
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resizeCanvas(canvas, ctx, state);
      updateJoystickLayout(state);
    }, 100);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.lastTimestamp = 0; // 恢复时重置 dt
    }
  });

  // 启动游戏循环
  requestAnimationFrame(gameLoop);
}

// ========================================================================
// 游戏循环
// ========================================================================

function gameLoop(timestamp) {
  if (state.lastTimestamp === 0) {
    state.lastTimestamp = timestamp;
  }

  let dt = (timestamp - state.lastTimestamp) / 1000;
  if (dt > MAX_DT) dt = MAX_DT;
  state.lastTimestamp = timestamp;

  // ---- FPS 计算（每 0.5 秒更新一次） ----
  state._frameCount++;
  state._fpsTimeAccum += dt;
  if (state._fpsTimeAccum >= 0.5) {
    state.fps = Math.round(state._frameCount / state._fpsTimeAccum);
    state._frameCount = 0;
    state._fpsTimeAccum = 0;
  }

  const { canvas, ctx } = state;

  // 清屏
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 更新输入
  updateInput(state, dt);

  // 游戏流程输入处理（开始 / 重新开始）
  handleFlowInput(state);

  // 更新游戏逻辑
  if (state.screen === 'playing' || state.screen === 'bossIntro') {
    update(dt);
  }

  // 处理倒计时
  if (state.screen === 'countdown') {
    state._countdownTimer -= dt;
    if (state._countdownTimer <= 0) {
      state.screen = 'playing';
      state._spawnAccum = 0;
    }
  }

  // 更新 gameover 冷却计时器
  if (state.screen === 'gameover' && state._gameoverTimer > 0) {
    state._gameoverTimer -= dt;
  }

  // 渲染
  render(ctx, timestamp);

  requestAnimationFrame(gameLoop);
}

/**
 * 处理菜单和结算界面的输入（开始 / 重新开始）
 * 使用上升沿检测避免同一帧内重复触发
 * @param {Object} state
 */
function handleFlowInput(state) {
  // 仅在菜单和结算界面处理开始/重启输入
  if (state.screen !== 'menu' && state.screen !== 'gameover') return;

  const currentTrigger = state.spacePressed || state.isPointerDown;
  const justPressed = currentTrigger && !state._prevInputTrigger;
  state._prevInputTrigger = currentTrigger;

  if (!justPressed) return;

  if (state.screen === 'menu') {
    resetGame(state);
  } else if (state.screen === 'gameover' && state._gameoverTimer <= 0) {
    // 冷却结束后允许重新开始
    resetGame(state);
  }
}

// ========================================================================
// 更新
// ========================================================================

function update(dt) {
  state.gameTime += dt;
  updateShield(state, dt);
  updateDifficulty(state, dt);

  // 波次变化检测（成就用）
  if (state.wave > state._lastWave) {
    state._lastWave = state.wave;
    state.noHitWaves++;
    if (state.noHitWaves >= 3) tryUnlock('noHit3', state);
    if (state.wave >= 15) tryUnlock('wave15', state);
  }

  updateScreenShake(state, dt);

  // 更新连击计时器
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
      state.comboTimer = 0;
    }
  }

  // ---------- Boss 触发检测 ----------
  if (shouldSpawnBoss(state)) {
    const bossType = getBossTypeForWave(state.wave);
    spawnBoss(state, bossType);
  }

  // ---------- 弹幕生成 ----------
  if (!state.boss) {
    state._spawnAccum += dt;
    const interval = getSpawnInterval(state) / 1000;
    if (state._spawnAccum >= interval) {
      state._spawnAccum -= interval;
      // 随机选择弹幕类型（基于难度概率）
      const type = getRandomProjType(state);
      spawnProjectile(state.projectilePool, state, type);
    }
  }

  // ---------- 道具生成（12% 概率每帧） ----------
  if (!state.boss && Math.random() < POWERUP_SPAWN_CHANCE) {
    spawnPowerup(state);
  }

  // ---------- 慢动作效果：所有弹幕速度 ×0.4 ----------
  const speedMult = state.slowMotionActive ? 0.4 : 1.0;
  state.currentProjectileSpeed = getProjectileSpeed(state) * speedMult;

  // 更新弹幕并收集事件
  const { blocked, hits } = updateProjectiles(state.projectilePool, state, dt, state._spawnAccum);

  // 处理弹开事件
  for (const event of blocked) {
    handleBlock(event, state);
  }

  // 处理命中事件
  for (const event of hits) {
    handleCoreHit(event, state);
  }

  // 更新粒子
  updateParticles(state.particlePool, dt);

  // 更新道具（含飞行道具移动 + 已激活效果计时）
  updatePowerups(state, dt);

  // Boss 更新
  if (state.boss) {
    updateBoss(state, dt);
  }

  // Boss 击败后成就检测
  if (state.lastDefeatedBossType) {
    const bossType = state.lastDefeatedBossType;
    state.lastDefeatedBossType = null;
    state.defeatedBosses[bossType] = true;
    tryUnlock('firstBoss', state);
  }

  // 大招检测
  if (state.spacePressed && state.energy >= ENERGY_MAX && state.screen === 'playing') {
    releaseUltimate(state);
  }

  // 更新 UI
  updateHUD(state);
}

// ========================================================================
// 渲染
// ========================================================================

/**
 * 计算虚拟摇杆在屏幕上的位置（移动端）
 * 底部居中，占屏幕高度 JOYSTICK_AREA_RATIO 的区域
 */
function updateJoystickLayout(state) {
  if (!state.useJoystick) return;
  const h = state.screenHeight;
  const w = state.screenWidth;
  const areaHeight = h * JOYSTICK_AREA_RATIO;
  state.joyCY = h - areaHeight / 2;
  state.joyCX = w / 2;
  state.joyRadius = Math.min(areaHeight * JOYSTICK_RADIUS_RATIO, w * 0.35);
  // 同步护盾基准半径（窗口缩放后需要更新）
  state.shieldBaseRadius = state.radius;
}

function render(ctx, time) {
  ctx.save();
  applyScreenShake(ctx, state);
  renderBackground(ctx, state, time);
  renderParticles(ctx, state.particlePool);
  renderCore(ctx, state, time);
  if (state.boss) renderBoss(ctx, state);
  renderProjectiles(ctx, state.projectilePool, state);
  renderPowerups(ctx, state);
  renderShield(ctx, state);
  ctx.restore();

  // --- 倒计时大字（Canvas 渲染，不受屏幕震动影响） ---
  if (state.screen === 'countdown') {
    renderCountdown(ctx, state);
  }

  // --- 虚拟摇杆 UI（移动端） ---
  if (state.useJoystick && (state.screen === 'playing' || state.screen === 'countdown')) {
    renderJoystick(ctx, state);
  }

  // --- FPS 显示（调试用） ---
  renderFPS(ctx, state);
}

/**
 * 渲染倒计时文字（3 → 2 → 1 → GO!）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} state
 */
function renderCountdown(ctx, state) {
  const t = state._countdownTimer;
  if (t <= 0) return;

  let text, glowColor;
  if (t > 2.0) {
    text = '3';
    glowColor = '#00d4ff';
  } else if (t > 1.0) {
    text = '2';
    glowColor = '#ffdd00';
  } else if (t > 0.5) {
    text = '1';
    glowColor = '#ff6600';
  } else {
    text = 'GO!';
    glowColor = '#00ff88';
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 外发光层
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 60;
  ctx.font = 'bold 140px "Orbitron", "Arial Black", sans-serif';
  ctx.fillStyle = glowColor;
  ctx.fillText(text, state.cx, state.cy);

  // 内发光层（叠加半透明）
  ctx.shadowBlur = 100;
  ctx.globalAlpha = 0.4;
  ctx.fillText(text, state.cx, state.cy);

  ctx.restore();
}

/**
 * 在左上角渲染 FPS 数值
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} state
 */
function renderFPS(ctx, state) {
  if (state.fps <= 0) return;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
  ctx.fillText(`FPS: ${state.fps}`, 10, 10);
  ctx.restore();
}

// ========================================================================
// 核心游戏逻辑函数
// ========================================================================

/**
 * 处理弹幕被护盾拦截
 * @param {{ proj: Object, x: number, y: number, perfect: boolean }} event
 * @param {Object} state
 */
function handleBlock(event, state) {
  const { proj, x, y, perfect } = event;
  const typeConfig = PROJ_TYPES[proj.type] || PROJ_TYPES.normal;

  // 得分：基础分 * 连击倍率 * 完美格挡倍率 * 分数翻倍倍率
  const comboMultiplier = Math.min(1 + state.combo * 0.1, MAX_COMBO_MULT);
  const perfectMultiplier = perfect ? 1.5 : 1.0;
  const scoreBoostMultiplier = state.scoreBoostActive ? 3 : 1;
  const scoreGain = typeConfig.score * comboMultiplier * perfectMultiplier * scoreBoostMultiplier;
  state.score += scoreGain;

  // 连击
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  state.comboTimer = COMBO_TIMEOUT;

  // 能量
  const energyGain = perfect ? ENERGY_PER_PERFECT : ENERGY_PER_BLOCK;
  state.energy = Math.min(ENERGY_MAX, state.energy + energyGain);

  // 粒子特效
  spawnDeflectEffect(state.particlePool, x, y, proj.color, state.cx, state.cy);

  // 连击里程碑特效（每 5 连击触发）
  if (state.combo % 5 === 0) {
    spawnComboEffect(state.particlePool, x, y);
    playCombo(Math.floor(state.combo / 5));
  }

  // 音效
  if (perfect) {
    playPerfectBlock();
  } else {
    playBlock();
  }

  // 更新 UI
  updateComboDisplay(state);

  // 成就检测
  if (state.combo === 1) tryUnlock('firstBlock', state);
  if (state.combo === 10) tryUnlock('combo10', state);
  if (state.combo === 50) tryUnlock('combo50', state);
  if (state.score >= 1000) tryUnlock('score1000', state);
  if (state.score >= 10000) tryUnlock('score10000', state);
  if (perfect) {
    state.perfectBlockCount++;
    if (state.perfectBlockCount >= 10) tryUnlock('perfectBlock10', state);
  }
}

/**
 * 处理弹幕击中核心
 * @param {{ proj: Object, x: number, y: number }} event
 * @param {Object} state
 */
function handleCoreHit(event, state) {
  // 无敌时间检查（大招后 0.5 秒无敌，或其他无敌效果）
  if (state.gameTime < state.invincibleUntil) return;

  state.health--;
  state.combo = 0;
  state.comboTimer = 0;
  state.noHitWaves = 0;

  // 粒子 + 屏幕震动
  spawnCoreHitEffect(state.particlePool, state.cx, state.cy, state);

  // 音效
  playHit();

  // 检查游戏结束
  if (state.health <= 0) {
    state.health = 0;
    endGame(state);
  }
}

/**
 * 释放大招（全屏清除弹幕）
 * @param {Object} state
 */
function releaseUltimate(state) {
  state.energy = 0;
  state.spacePressed = false;

  // 全屏白闪
  flashScreen();

  // 冲击波粒子
  spawnUltimateEffect(state.particlePool, state.cx, state.cy);

  // 摧毁所有弹幕
  for (const proj of state.projectilePool) {
    if (proj.active) {
      spawnDeflectEffect(state.particlePool, proj.x, proj.y, proj.color, state.cx, state.cy);
      proj.active = false;
    }
  }

  // 短暂无敌
  state.invincibleUntil = state.gameTime + 0.5;

  // 音效
  playUltimate();

  // 成就 — 累计大招次数
  state.ultimateCount++;
  if (state.ultimateCount >= 5) tryUnlock('ultimate5', state);

  updateHUD(state);
}

/**
 * 游戏结束
 * @param {Object} state
 */
function endGame(state) {
  state.screen = 'gameover';
  state._gameoverTimer = 1.5; // 1.5 秒冷却，期间不响应点击/空格

  // 保存最高分
  const isNew = saveHighScore(Math.floor(state.score));
  state.highScore = Math.max(state.highScore || 0, Math.floor(state.score));

  // 显示结算画面
  showGameOver({
    score: state.score,
    maxCombo: state.maxCombo,
    wave: state.wave,
    highScore: state.highScore,
    isNewRecord: isNew,
  });

  showScreen('gameover');

  // 成就检测 — 模式 / Boss / 波次
  if (state.mode === 'challenge' && Object.keys(state.defeatedBosses).length >= 3) {
    tryUnlock('challengeClear', state);
  }
  if (Object.keys(state.defeatedBosses).length >= 3) {
    tryUnlock('allBosses', state);
  }

  // 音效
  playGameOver();
}

/**
 * 重置游戏状态（开始新游戏）
 * @param {Object} state
 */
function resetGame(state) {
  state.screen = 'countdown';
  state.score = 0;
  state.health = MAX_HEALTH;
  state.combo = 0;
  state.maxCombo = 0;
  state.comboTimer = 0;
  state.energy = 0;
  state.wave = 1;
  state.level = 1;
  state.gameTime = 0;
  state.elapsedTime = 0;
  state._spawnAccum = 0;
  state._gameoverTimer = 0;
  state.currentProjectileSpeed = getProjectileSpeed(state);

  // 加载成就并重置跟踪
  state.achievements = loadAchievements();
  state.defeatedBosses = {};
  state.noHitWaves = 0;
  state.ultimateCount = 0;
  state.perfectBlockCount = 0;
  state._lastWave = state.wave;

  // 增加总游戏次数
  incrementTotalGames();

  // 清空弹幕
  for (const proj of state.projectilePool) {
    proj.active = false;
  }
  // 清空粒子
  for (const p of state.particlePool) {
    p.active = false;
  }
  // 清空 Boss
  state.boss = null;
  hideBossHealth();
  state.bossProjectiles = [];

  // 重置道具
  state.activePowerups = [];
  state.powerupObjects = [];
  state.shieldArc = state.originalShieldArc;
  state.slowMotionActive = false;
  state.scoreBoostActive = false;

  // 重置护盾
  state.shieldAngle = 0;
  state.targetShieldAngle = 0;
  state.rotationOffset = 0;
  state.invincibleUntil = 0;

  // 重置输入状态
  state.spacePressed = false;
  state._prevInputTrigger = false;

  // 更新 UI
  updateHUD(state);
  showScreen('countdown');

  // 简单倒计时（3 秒后开始）
  state._countdownTimer = 3;
}

// --- 启动 ---
init();
