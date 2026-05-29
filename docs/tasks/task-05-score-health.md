# 任务 5：分数/血量/连击/能量

## 开发目标
实现连击评级系统（D~SS）、能量槽 + 大招、血量管理、HUD 更新逻辑。

## 前置依赖
- 任务 0（config.js, utils.js）
- 任务 3（弹幕碰撞事件 blocked/hits）
- 任务 4（粒子特效）

## 输入文件
- `js/main.js` — 补充核心逻辑
- `js/ui.js` — 补充 HUD 更新

## 详细实现规格

### 连击系统
```js
// state 字段
combo: 0,
maxCombo: 0,
comboTimer: 0,
comboRating: 'D',   // D→C→B→A→S→SS

// 评级阈值
const RATINGS = [
  { name: 'D',  min: 0 },
  { name: 'C',  min: 5 },
  { name: 'B',  min: 10 },
  { name: 'A',  min: 20 },
  { name: 'S',  min: 35 },
  { name: 'SS', min: 50 },
];
```

每次弹开弹幕：`combo++`, `comboTimer = COMBO_TIMEOUT(3.0)`
每帧：`comboTimer -= dt`，若 ≤0 则重置 combo
评级随 combo 数值动态变化

### 完美格挡
- 弹幕在护盾正中 ±5° 范围内被挡 = 完美格挡
- 得分 ×1.5，额外能量

### 能量系统
```js
energy: 0,          // 0-100
ENERGY_MAX: 100,
ENERGY_PER_BLOCK: 8,
ENERGY_PER_PERFECT: 15,
```

- 能量满 100 → 能量槽高亮闪烁
- 按空格释放大招：
  - 全屏白闪（CSS animation）
  - 冲击波粒子环（从核心扩散）
  - 所有弹幕被摧毁（转为大量粒子）
  - 短暂无敌（0.5s）

### 血量管理
- `health: 5`, `MAX_HEALTH: 5`
- 每次核心击中扣 1
- health = 0 → 触发 gameover
- 回血道具恢复 1 点（不可超过 5）

### UI 更新
```js
// updateHUD
updateScoreDisplay(state.score)
updateHealthDisplay(state.health)
updateComboDisplay(state.combo, state.comboRating)
updateEnergyBar(state.energy)
updateWaveDisplay(state.wave)
```

- 分数：大号霓虹发光数字
- 血量：5 个圆点，空 = 暗色
- 连击：≥3 时显示，带弹出动画
- 能量槽：底部进度条

## 接口定义
```js
// main.js 中实现
export function handleBlock(proj, state)    // 处理弹开事件
export function handleCoreHit(proj, state)  // 处理命中事件
export function releaseUltimate(state)      // 释放大招

// ui.js 中实现
export function updateScoreDisplay(score)
export function updateHealthDisplay(health)
export function updateComboDisplay(combo, rating)
export function updateEnergyBar(energy)
export function updateWaveDisplay(wave)
export function flashScreen()
```

## 验收标准
- [ ] 弹开弹幕 → 分数增加（基础分 × 连击倍率）
- [ ] 连击≥3 → 屏幕显示 combo 计数和评级
- [ ] 连击未在 3 秒内接续 → 重置
- [ ] 能量满 → 空格释放大招，全屏清弹
- [ ] 核心被击中 → 血量减少，HUD 圆点变暗
- [ ] 血量归零 → 进入 gameover
- [ ] 完美格挡（正中间）→ 额外能量和分数

## 测试用例
1. 连续阻挡 5 个弹幕 → combo 显示 5，评级 C
2. 等待 3 秒不挡 → combo 归零
3. 阻挡弹幕积累能量 → 能量槽增长
4. 能量满按空格 → 全屏闪白，弹幕消失
5. 核心被击中 5 次 → gameover
6. 完美格挡判定：弹幕在护盾正中 ±5°

## 已知风险
- 连击在高速弹幕下可能极快增长 → 评级阈值可能需要按难度调整
- 大招释放时需短暂无敌，避免同帧弹幕又击中核心
