/**
 * ui.js — DOM UI 管理（菜单、HUD、动画）
 * 提供 HUD 更新、画面切换、结算展示等功能
 */

import { MAX_HEALTH, COLORS, ENERGY_MAX } from './config.js';

/**
 * 缓存 DOM 元素引用到 state.uiElements
 * @param {Object} state
 */
export function initUI(state) {
  state.uiElements = {
    scoreDisplay: document.getElementById('score-display'),
    healthDisplay: document.getElementById('health-display'),
    comboDisplay: document.getElementById('combo-display'),
    energyBarFill: document.getElementById('energy-bar-fill'),
    energyBarContainer: document.getElementById('energy-bar-container'),
    waveDisplay: document.getElementById('wave-display'),
    menuScreen: document.getElementById('menu-screen'),
    gameoverScreen: document.getElementById('gameover-screen'),
    bossAnnounce: document.getElementById('boss-announce'),
    bossHealthContainer: document.getElementById('boss-health-container'),
    bossHealthFill: document.getElementById('boss-health-fill'),
    screenFlash: document.getElementById('screen-flash'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    menuHighscore: document.getElementById('menu-highscore'),
    gameoverRating: document.getElementById('gameover-rating'),
    statScore: document.getElementById('stat-score'),
    statCombo: document.getElementById('stat-combo'),
    statWave: document.getElementById('stat-wave'),
    statHighscore: document.getElementById('stat-highscore'),
    gameoverRestart: document.getElementById('gameover-restart'),
    menuStartHint: document.getElementById('menu-start-hint'),
  };
}

/**
 * 主 HUD 更新入口，调用各个子更新函数
 * @param {Object} state
 */
export function updateHUD(state) {
  if (!state.uiElements) return;
  updateScoreDisplay(state.uiElements.scoreDisplay, state.score);
  updateHealthDisplay(state.health, state.uiElements.healthDisplay);
  updateComboDisplay(state);
  updateEnergyBar(state.energy, state.uiElements.energyBarFill);
  updateWaveDisplay(state.uiElements.waveDisplay, state.wave);
}

/**
 * 更新分数显示（每三位加逗号）
 * @param {HTMLElement} el
 * @param {number} score
 */
export function updateScoreDisplay(el, score) {
  if (!el) return;
  el.textContent = Math.floor(score).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 更新血量显示（点阵）
 * @param {number} health
 * @param {HTMLElement} container
 */
export function updateHealthDisplay(health, container) {
  if (!container) return;
  const dots = container.querySelectorAll('.health-dot');
  dots.forEach((dot, i) => {
    if (i < health) {
      dot.classList.remove('empty');
    } else {
      dot.classList.add('empty');
    }
  });
}

// 连击评级阈值
const RATINGS = [
  { name: 'D',  min: 0,  color: '#ff3355' },
  { name: 'C',  min: 5,  color: '#ff8800' },
  { name: 'B',  min: 10, color: '#00d4ff' },
  { name: 'A',  min: 20, color: '#00ff88' },
  { name: 'S',  min: 35, color: '#ffdd00' },
  { name: 'SS', min: 50, color: '#ff00ff' },
];

/**
 * 根据连击数返回评级
 * @param {number} combo
 * @returns {{ name: string, min: number, color: string }}
 */
export function getComboRating(combo) {
  let rating = RATINGS[0];
  for (const r of RATINGS) {
    if (combo >= r.min) rating = r;
  }
  return rating;
}

/**
 * 更新连击显示（>=3 时显示，带颜色发光）
 * @param {Object} state
 */
export function updateComboDisplay(state) {
  const el = state.uiElements?.comboDisplay;
  if (!el) return;
  if (state.combo >= 3) {
    const rating = getComboRating(state.combo);
    el.textContent = `${rating.name}  COMBO x${state.combo}`;
    el.style.color = rating.color;
    el.style.textShadow = `0 0 12px ${rating.color}, 0 0 24px ${rating.color}`;
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
  }
}

/**
 * 更新能量条（百分比 + 充满时高亮）
 * @param {number} energy
 * @param {HTMLElement} fillEl
 */
export function updateEnergyBar(energy, fillEl) {
  if (!fillEl) return;
  const pct = Math.min(100, Math.max(0, (energy / ENERGY_MAX) * 100));
  fillEl.style.width = pct + '%';
  if (energy >= ENERGY_MAX) {
    fillEl.style.boxShadow = '0 0 16px #00ffcc, 0 0 32px #00ffcc';
  } else {
    fillEl.style.boxShadow = '0 0 8px #00ffcc';
  }
}

/**
 * 更新波数显示
 * @param {HTMLElement} el
 * @param {number} wave
 */
export function updateWaveDisplay(el, wave) {
  if (!el) return;
  el.textContent = `WAVE ${wave}`;
}

/**
 * 全屏白闪特效（大招）
 */
export function flashScreen() {
  const el = document.getElementById('screen-flash');
  if (!el) return;
  el.classList.remove('active');
  void el.offsetWidth; // reflow
  el.classList.add('active');
}

/**
 * 切换屏幕显示（menu / playing / gameover）
 * @param {string} screenName
 */
export function showScreen(screenName) {
  const menu = document.getElementById('menu-screen');
  const gameover = document.getElementById('gameover-screen');
  const bossAnnounce = document.getElementById('boss-announce');
  const joystickZone = document.getElementById('joystick-zone');

  if (screenName === 'menu') {
    if (menu) { menu.classList.remove('hidden'); menu.style.opacity = '1'; menu.style.pointerEvents = 'auto'; }
    if (gameover) { gameover.classList.remove('visible'); }
    if (joystickZone) joystickZone.classList.remove('mobile-visible');
  } else if (screenName === 'countdown' || screenName === 'playing') {
    if (menu) { menu.classList.add('hidden'); menu.style.opacity = '0'; menu.style.pointerEvents = 'none'; }
    if (gameover) { gameover.classList.remove('visible'); }
    if (bossAnnounce) bossAnnounce.classList.remove('visible');
    // 摇杆在游戏中显示（由 input.js 的 useJoystick 控制 CSS，此处不做改动）
    // showJoystickDOM 会通过 main.js 单独调用
  } else if (screenName === 'gameover') {
    if (gameover) gameover.classList.add('visible');
    if (menu) { menu.style.pointerEvents = 'none'; }
    if (joystickZone) joystickZone.classList.remove('mobile-visible');
  }
}

/**
 * 更新菜单最高分
 * @param {number} score
 */
export function updateMenuHighscore(score) {
  const el = document.getElementById('menu-highscore');
  if (!el) return;
  if (score > 0) {
    el.textContent = `🏆 最高分: ${score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  } else {
    el.textContent = '';
  }
}

/**
 * 显示 Boss 公告
 * @param {string} bossName
 */
export function showBossAnnounce(bossName) {
  const el = document.getElementById('boss-announce');
  if (!el) return;
  el.innerHTML = `⚠ ${bossName} ⚠`;
  el.classList.add('visible');
  // 2 秒后自动隐藏
  setTimeout(() => el.classList.remove('visible'), 2000);
}

/**
 * 更新 Boss 血条
 * @param {number} hp
 * @param {number} maxHp
 */
export function updateBossHealth(hp, maxHp) {
  const container = document.getElementById('boss-health-container');
  const fill = document.getElementById('boss-health-fill');
  if (!container || !fill) return;
  if (hp > 0) {
    container.classList.add('visible');
    fill.style.width = (hp / maxHp * 100) + '%';
  } else {
    container.classList.remove('visible');
  }
}

/**
 * 隐藏 Boss 血条
 */
export function hideBossHealth() {
  const container = document.getElementById('boss-health-container');
  if (container) container.classList.remove('visible');
}

/**
 * 显示游戏结束画面
 * @param {{ score: number, maxCombo: number, wave: number, highScore: number, isNewRecord: boolean }} stats
 */
export function showGameOver(stats) {
  const gameover = document.getElementById('gameover-screen');
  if (!gameover) return;

  const rating = getComboRating(stats.maxCombo);
  const ratingEl = document.getElementById('gameover-rating');
  if (ratingEl) {
    ratingEl.textContent = rating.name;
    ratingEl.className = 'rating-' + rating.name;
  }

  const statScore = document.getElementById('stat-score');
  const statCombo = document.getElementById('stat-combo');
  const statWave = document.getElementById('stat-wave');
  const statHighscore = document.getElementById('stat-highscore');

  if (statScore) statScore.textContent = Math.floor(stats.score).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (statCombo) statCombo.textContent = stats.maxCombo;
  if (statWave) statWave.textContent = stats.wave;
  if (statHighscore) statHighscore.textContent = (stats.highScore || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  gameover.classList.add('visible');
}

/**
 * 成就通知弹窗
 * @param {string} msg 成就显示文本
 */
export function showAchievement(msg) {
  const el = document.createElement('div');
  el.className = 'achievement-toast';
  el.textContent = '🏆 ' + msg;
  el.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid #ffdd00;
    color: #ffdd00;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    z-index: 200;
    box-shadow: 0 0 15px rgba(255, 221, 0, 0.4);
    animation: achievementSlide 2.5s ease forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
