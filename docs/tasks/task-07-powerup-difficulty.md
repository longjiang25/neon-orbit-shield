# 任务 7：道具 + 难度系统

## 开发目标
实现 5 种道具（护盾扩大、慢动作、分数翻倍、回血、全屏弹开）和难度递增管理。

## 前置依赖
- 任务 0（config.js）
- 任务 3（弹幕系统）
- 任务 5（ui.js 的能量/血量更新）

## 输入文件
- `js/powerup.js` — 待实现
- `js/difficulty.js` — 待实现

## 详细实现规格

### 道具系统 (powerup.js)

#### 道具类型
| 类型 | 效果 | 持续时间 |
|------|------|---------|
| shieldExpand | 护盾弧长 +60% | 8s |
| slowMotion | 所有弹幕速度 ×0.4 | 5s |
| scoreBoost | 分数 ×3 | 10s |
| heal | 回 1 血 | 即时 |
| repel | 所有弹幕弹回边缘 | 即时 |

#### 生成逻辑
- 12% 概率替代弹幕生成
- 至少每 45 秒保证一个
- Boss 战期间不生成
- 外观：旋转六角星 + 脉冲发光 + 对应颜色

#### 收集检测
- 与弹幕相同的碰撞检测（护盾拦截 = 收集）
- 收集后激活效果 + 粒子特效

### 难度系统 (difficulty.js)

#### 等级计算
```js
level = 1 + Math.floor(state.gameTime / LEVEL_INTERVAL)  // 每20秒
wave = 1 + Math.floor(state.gameTime / (LEVEL_INTERVAL * 1.5)) // 波次
```

#### 每级变化
- 弹幕生成间隔：1200ms → 每级 -120ms → 最低 350ms
- 弹幕速度：270 → 每级 +20 px/s
- 快速弹幕概率：0% → 每级 +5% → 最高 40%
- 坚韧弹幕概率：0% → 每级 +3% → 最高 25%
- 分裂弹幕概率：0% → 每级 +2% → 最高 15%
- 护盾弧长：50° → 每级 -2° → 最低 30°

#### 波次管理
- 每 5 波 = Boss 战
- 波间休息 3 秒（暂停弹幕生成，显示 "WAVE X"）

## 接口定义
```js
// powerup.js
export function initPowerupSystem(state)
export function spawnPowerup(state)
export function updatePowerups(state, dt)
export function renderPowerups(ctx, state)
export function collectPowerup(powerup, state)

// difficulty.js
export function initDifficulty(state)
export function updateDifficulty(state, dt)
export function getSpawnInterval(state)
export function getProjectileSpeed(state)
export function getLevel(state)
export function getWave(state)
```

## 验收标准
- [ ] 5 种道具均能正常生成
- [ ] 护盾扩大效果可见（弧长变大）
- [ ] 慢动作效果可感知（弹幕减速）
- [ ] 分数翻倍计算正确
- [ ] 回血恢复 1 点
- [ ] 全屏弹开立即清除所有弹幕
- [ ] 难度递增可感知

## 测试用例
1. 等待道具出现 → 收集 → 效果激活
2. 护盾扩大 → 8 秒后恢复
3. 慢动作 → 弹幕速度明显降低 → 5 秒后恢复
4. 玩 60 秒 → 弹幕更密更快
5. 波次正常递增

## 已知风险
- 道具效果叠加需要正确处理（如慢动作 + 护盾扩大可同时存在）
- Boss 战时需禁用道具生成
