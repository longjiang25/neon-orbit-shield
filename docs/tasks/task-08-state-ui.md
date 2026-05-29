# 任务 8：游戏状态机 + UI

## 开发目标
实现完整的游戏状态机和 UI 系统（菜单、倒计时、Boss 提示、波次切换、游戏结束、成就通知）。

## 前置依赖
- 任务 5（HUD 更新）
- 任务 6（Boss 系统）
- 任务 7（难度系统波次管理）

## 输入文件
- `js/main.js` — 状态机逻辑
- `js/ui.js` — UI 管理完整实现

## 详细实现规格

### 状态定义
```
screen: 'menu' | 'countdown' | 'playing' | 'bossIntro' | 'waveClear' | 'gameover'
```

### 状态转换

#### menu → countdown
- 点击屏幕或按空格
- 隐藏菜单画面，显示 3-2-1 倒计时

#### countdown → playing
- 倒计时结束
- 开始弹幕生成，计时开始

#### playing → bossIntro
- wave % 5 === 0 时触发
- 播放 Boss 登场动画
- 清除场上所有普通弹幕
- 显示 "⚠ BOSS ⚠"

#### bossIntro → playing
- Boss 登场动画结束（2 秒）
- Boss 开始攻击

#### playing → waveClear
- Boss HP = 0
- 或普通波次清除足够弹幕（计数达到目标）
- 显示 "WAVE X CLEAR"
- 3 秒休息

#### waveClear → playing
- 休息结束
- 新一波开始

#### playing → gameover
- health <= 0
- 慢动作效果（0.5s）
- 核心碎裂动画
- 游戏结束画面弹出

#### gameover → countdown
- 点击屏幕或按空格（需 1.5 秒冷却）
- 重置所有状态

### UI 函数实现

#### showScreen(screenName)
- 切换 CSS 类（hidden/visible）
- 处理过渡动画

#### showBossAnnounce(bossName)
- boss-announce 设置文本
- 添加 visible 类 → 2 秒后自动移除

#### showWaveClear(wave)
- 显示波次清除提示

#### showGameOver(stats)
- 填充 gameover-stats 数据
- 显示评级（根据分数范围）
- 显示 gameover-screen

#### showAchievement(msg)
- 右上角滑入通知
- 3 秒后自动滑出

### 倒计时
- 屏幕中央大字 "3" → "2" → "1" → "GO!"
- 每个数字有缩放动画
- 最后 "GO!" 闪烁后消失

## 接口定义
```js
// main.js
export function setState(newState)
export function resetGame()

// ui.js
export function initUI(state)
export function showScreen(screenName)
export function showBossAnnounce(bossName)
export function showWaveClear(wave)
export function showCountdown(number)
export function showGameOver(stats)
export function showAchievement(msg)
export function updateHUD(state)
```

## 验收标准
- [ ] 所有 6 个状态正确流转
- [ ] 菜单画面完整功能（标题、模式选择、开始提示、高分）
- [ ] 3-2-1 倒计时正常
- [ ] Boss 登场有动画提示
- [ ] 游戏结束画面显示正确数据
- [ ] 重新开始正常重置所有状态
- [ ] UI 在移动端和桌面端都正确显示

## 测试用例
1. 打开游戏 → 看到菜单 → 点击开始 → 3-2-1-GO → 游戏开始
2. 玩到第 5 波 → Boss 登场动画 → Boss 开始攻击
3. 击败 Boss → Wave Clear → 3 秒后下一波
4. 血量为 0 → 游戏结束画面 → 显示分数评级 → 点击重新开始
5. 重新开始后所有状态正确重置（分数 0、血量 5、波次 1）
