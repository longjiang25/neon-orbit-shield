/**
 * config.js — 游戏所有常量与平衡参数
 * 所有模块均依赖此文件，修改参数即可调整游戏体验
 */

// ========== 画布与核心 ==========
export const CORE_RADIUS_RATIO = 0.045;       // 核心半径占屏幕比例
export const SHIELD_ORBIT_RATIO = 0.38;        // 护盾轨道半径占屏幕比例
export const STAR_COUNT = 150;
export const NEBULA_COUNT = 3;

// ========== 护盾 ==========
export const SHIELD_ARC_DEFAULT = Math.PI / 3.6;  // 默认 50°
export const SHIELD_SMOOTHING = 0.12;             // 平滑跟随系数
export const SHIELD_LINE_WIDTH = 4;
export const SHIELD_GLOW = 25;
export const SHIELD_COLOR = '#00d4ff';

// ========== 弹幕 ==========
export const MAX_PROJECTILES = 200;
export const PROJECTILE_BASE_SPEED = 270;          // 基础速度 px/s (较高难度)
export const PROJECTILE_BASE_INTERVAL = 1200;       // 基础生成间隔 ms
export const PROJECTILE_SPEED_VARIANCE = 0.3;       // 速度随机浮动
export const PROJECTILE_INTERVAL_VARIANCE = 0.4;    // 间隔随机浮动

// 弹幕类型
export const PROJ_TYPES = {
  normal:  { name: 'normal',  color: '#00f0ff', speedMult: 1.0, hp: 1, score: 10,  shape: 'circle' },
  fast:    { name: 'fast',    color: '#ff00ff', speedMult: 1.8, hp: 1, score: 25,  shape: 'triangle' },
  tough:   { name: 'tough',   color: '#ff8800', speedMult: 0.8, hp: 2, score: 40,  shape: 'doubleRing' },
  splitter:{ name: 'splitter',color: '#00ff88', speedMult: 1.2, hp: 1, score: 30,  shape: 'diamond' },
};

// ========== 粒子 ==========
export const MAX_PARTICLES = 1000;

// ========== 血量与分数 ==========
export const MAX_HEALTH = 5;
export const COMBO_TIMEOUT = 3.0;                   // 连击超时秒数
export const MAX_COMBO_MULT = 5.0;
export const ENERGY_MAX = 100;
export const ENERGY_PER_BLOCK = 8;
export const ENERGY_PER_PERFECT = 15;               // 完美格挡(正中间)

// ========== 难度 ==========
export const LEVEL_INTERVAL = 20;                    // 每20秒升级
export const WAVES_PER_BOSS = 5;                     // 每5波Boss
export const WAVE_REST_TIME = 3.0;                   // 波间休息3秒
export const BOSS_SPAWN_CHANCE = 0.12;               // 道具生成概率
export const BOSS_COUNTDOWN = 3;                     // Boss战倒计时

// 每级增量
export const DIFFICULTY = {
  spawnIntervalDecrease: 120,     // 每级生成间隔减少 ms
  minSpawnInterval: 350,          // 最低生成间隔 ms
  speedIncrease: 20,              // 每级速度增量 px/s
  fastChanceIncrease: 0.05,       // 每级快速弹幕概率增量
  fastChanceMax: 0.40,
  toughChanceIncrease: 0.03,
  toughChanceMax: 0.25,
  splitterChanceIncrease: 0.02,
  splitterChanceMax: 0.15,
  shieldShrinkPerLevel: Math.PI / 90, // 每级护盾缩小弧度
  minShieldArc: Math.PI / 6,          // 最小护盾弧度 30°
};

// ========== 道具 ==========
export const POWERUP_DURATIONS = {
  shieldExpand: 8.0,
  slowMotion: 5.0,
  scoreBoost: 10.0,
  heal: 0,        // instant
  repel: 0,       // instant
};
export const POWERUP_SPAWN_CHANCE = 0.12;

// ========== 颜色 ==========
export const COLORS = {
  background: '#0a0a1a',
  coreInner: '#ffffff',
  coreMid: '#ffdd44',
  coreOuter: '#ff6600',
  coreGlow: 'rgba(255, 200, 50, 0.3)',
  shield: '#00d4ff',
  health: '#ff3355',
  healthEmpty: '#331122',
  score: '#ffffff',
  comboGold: '#ffdd00',
  powerup: '#ffdd00',
  bossWarning: '#ff0040',
  energyBar: '#00ffcc',
  energyBarBg: '#0a2a2a',
};

// ========== Boss ==========
export const BOSS_HEALTH = {
  ringCannon: 40,
  twinSatellite: 60,
  voidEye: 80,
};

// ========== 性能 ==========
export const MOBILE_PARTICLE_SCALE = 0.4;
export const LOW_FPS_THRESHOLD = 30;
export const MAX_DT = 0.05;                          // 最大 delta time 防穿透
export const COLLISION_SUBSTEPS = 3;                  // 碰撞检测子步数

// ========== localStorage 键 ==========
export const STORAGE_KEYS = {
  highScore: 'neonOrbit_highScore',
  totalGames: 'neonOrbit_totalGames',
  achievements: 'neonOrbit_achievements',
  settings: 'neonOrbit_settings',
};
