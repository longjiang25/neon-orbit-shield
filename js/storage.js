/**
 * storage.js — localStorage 持久化
 * 提供最高分、成就系统、设置、游戏次数等持久化功能
 */

import { STORAGE_KEYS } from './config.js';

// 成就列表
const ACHIEVEMENTS = [
  { id: 'firstBlock',    name: '初次防御', desc: '首次阻挡弹幕' },
  { id: 'combo10',       name: '连击大师', desc: '达到 10 连击' },
  { id: 'combo50',       name: '弹幕克星', desc: '达到 50 连击' },
  { id: 'score1000',     name: '起步',     desc: '得分超过 1,000' },
  { id: 'score10000',    name: '高手',     desc: '得分超过 10,000' },
  { id: 'firstBoss',     name: 'Boss 猎手', desc: '击败第一个 Boss' },
  { id: 'allBosses',     name: '轨道之王', desc: '击败全部 3 个 Boss' },
  { id: 'noHit3',        name: '完美防御', desc: '连续 3 波无伤' },
  { id: 'ultimate5',     name: '能量大师', desc: '释放 5 次大招' },
  { id: 'wave15',        name: '持久战士', desc: '到达第 15 波' },
  { id: 'perfectBlock10',name: '精准格挡', desc: '达成 10 次完美格挡' },
  { id: 'challengeClear',name: '挑战完成', desc: '通关 Challenge 模式' },
];

export function getAchievementList() {
  return ACHIEVEMENTS;
}

export function loadHighScore() {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.highScore);
    return val ? parseInt(val, 10) : 0;
  } catch (e) {
    return 0;
  }
}

export function saveHighScore(score) {
  const prev = loadHighScore();
  if (score > prev) {
    try {
      localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    } catch (e) {}
    return true;
  }
  return false;
}

export function loadAchievements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.achievements);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveAchievement(id) {
  try {
    const achievements = loadAchievements();
    if (!achievements[id]) {
      achievements[id] = Date.now(); // 记录解锁时间
      localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(achievements));
      return ACHIEVEMENTS.find(a => a.id === id); // 返回成就信息
    }
  } catch (e) {
    // silent fail
  }
  return null;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : { soundEnabled: true };
  } catch (e) {
    return { soundEnabled: true };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch (e) {}
}

// 加载总游戏次数
export function loadTotalGames() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEYS.totalGames)) || 0;
  } catch (e) {
    return 0;
  }
}

// 增加游戏次数
export function incrementTotalGames() {
  try {
    const count = loadTotalGames() + 1;
    localStorage.setItem(STORAGE_KEYS.totalGames, String(count));
    return count;
  } catch (e) {
    return 0;
  }
}
