/**
 * difficulty.js — 难度系统
 *
 * 管理等级/波次推进、护盾自动缩小、弹幕生成参数调节（速度/间隔/类型概率），
 * 以及 Boss 触发的判定。
 *
 * 依赖关系：所有难度参数的消费方（projectile.js, main.js）应从此模块
 *           导入 getSpawnInterval / getProjectileSpeed / getRandomProjType。
 */

import {
  LEVEL_INTERVAL,
  WAVES_PER_BOSS,
  DIFFICULTY,
  PROJECTILE_BASE_SPEED,
  PROJECTILE_BASE_INTERVAL,
  SHIELD_ARC_DEFAULT,
} from './config.js';
import { clamp } from './utils.js';

// ========================================================================
// 初始化
// ========================================================================

/**
 * 初始化难度状态
 * @param {Object} state  游戏全局状态
 */
export function initDifficulty(state) {
  state.level = 1;
  state.wave = 1;
  state.gameTime = 0;
  state.currentProjectileSpeed = PROJECTILE_BASE_SPEED;
}

// ========================================================================
// 每帧更新
// ========================================================================

/**
 * 每帧更新游戏时间和难度参数
 *
 * 注：调用方（main.js）应确保此函数在游戏进行时每帧调用。
 *     gameTime 在此函数中自增，调用方不应重复增加。
 *
 * @param {Object} state  游戏全局状态
 * @param {number} dt     帧时间差（秒）
 */
export function updateDifficulty(state, dt) {
  state.gameTime += dt;

  // ---- 等级更新 ----
  const newLevel = 1 + Math.floor(state.gameTime / LEVEL_INTERVAL);
  if (newLevel > state.level) {
    state.level = newLevel;

    // 等级提升时护盾缩小
    state.shieldArc = Math.max(
      DIFFICULTY.minShieldArc,
      SHIELD_ARC_DEFAULT - (state.level - 1) * DIFFICULTY.shieldShrinkPerLevel
    );
    state.originalShieldArc = state.shieldArc;

    // 同步更新弹幕基础速度
    state.currentProjectileSpeed = getProjectileSpeed(state);
  }

  // ---- 波次更新 ----
  const newWave = 1 + Math.floor(state.gameTime / (LEVEL_INTERVAL * 1.5));
  if (newWave > state.wave) {
    state.wave = newWave;
    // Boss 触发由调用方通过 shouldSpawnBoss() 判断
  }
}

// ========================================================================
// 弹幕参数查询
// ========================================================================

/**
 * 返回当前等级的弹幕生成间隔（毫秒）
 * @param {Object} state  游戏全局状态
 * @returns {number} 间隔毫秒数
 */
export function getSpawnInterval(state) {
  const base = PROJECTILE_BASE_INTERVAL - (state.level - 1) * DIFFICULTY.spawnIntervalDecrease;
  return clamp(base, DIFFICULTY.minSpawnInterval, PROJECTILE_BASE_INTERVAL);
}

/**
 * 返回当前等级的弹幕基础速度（px/s）
 * @param {Object} state  游戏全局状态
 * @returns {number} 速度 px/s
 */
export function getProjectileSpeed(state) {
  return PROJECTILE_BASE_SPEED + (state.level - 1) * DIFFICULTY.speedIncrease;
}

/**
 * 根据当前等级随机选择弹幕类型
 *
 * 概率累积：splitter < tough < fast < normal
 *
 * @param {Object} state  游戏全局状态
 * @returns {string} 'normal' | 'fast' | 'tough' | 'splitter'
 */
export function getRandomProjType(state) {
  const fastChance = clamp(
    (state.level - 1) * DIFFICULTY.fastChanceIncrease,
    0,
    DIFFICULTY.fastChanceMax
  );
  const toughChance = clamp(
    (state.level - 1) * DIFFICULTY.toughChanceIncrease,
    0,
    DIFFICULTY.toughChanceMax
  );
  const splitterChance = clamp(
    (state.level - 1) * DIFFICULTY.splitterChanceIncrease,
    0,
    DIFFICULTY.splitterChanceMax
  );

  const roll = Math.random();
  if (roll < splitterChance) return 'splitter';
  if (roll < splitterChance + toughChance) return 'tough';
  if (roll < splitterChance + toughChance + fastChance) return 'fast';
  return 'normal';
}

// ========================================================================
// 查询
// ========================================================================

/**
 * 返回当前等级
 * @param {Object} state
 * @returns {number}
 */
export function getLevel(state) {
  return state.level;
}

/**
 * 判断当前波次是否应触发 Boss 战
 * @param {Object} state  游戏全局状态
 * @returns {boolean}
 */
export function shouldSpawnBoss(state) {
  return state.wave > 0 && state.wave % WAVES_PER_BOSS === 0 && !state.boss;
}

/**
 * 手动推进到下一波
 * @param {Object} state  游戏全局状态
 * @returns {boolean} 是否应触发 Boss 战
 */
export function nextWave(state) {
  state.wave++;
  return state.wave % WAVES_PER_BOSS === 0;
}
