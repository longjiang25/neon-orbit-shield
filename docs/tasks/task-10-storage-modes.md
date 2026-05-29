# 任务 10：持久化 + 多模式

## 开发目标
实现 localStorage 持久化（最高分、成就、设置）和双游戏模式（Classic 无尽 / Challenge 固定波次）。

## 前置依赖
- 任务 8（状态机 + UI）
- 任务 0（config.js STORAGE_KEYS）

## 输入文件
- `js/storage.js` — 待实现
- `js/ui.js` — 模式选择 UI

## 详细实现规格

### storage.js

#### 最高分
```js
export function loadHighScore() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEYS.highScore)) || 0;
  } catch (e) {
    return 0;
  }
}

export function saveHighScore(score) {
  const current = loadHighScore();
  if (score > current) {
    try {
      localStorage.setItem(STORAGE_KEYS.highScore, String(score));
    } catch (e) {
      // localStorage 不可用时静默失败
    }
    return true; // 新纪录
  }
  return false;
}
```

#### 成就系统
成就列表：
```js
const ACHIEVEMENTS = [
  { id: 'firstBlock',    name: '初次防御', desc: '首次阻挡弹幕' },
  { id: 'combo10',       name: '连击大师', desc: '达到 10 连击' },
  { id: 'combo50',       name: '弹幕克星', desc: '达到 50 连击' },
  { id: 'score1000',     name: '起步',     desc: '得分超过 1000' },
  { id: 'score10000',    name: '高手',     desc: '得分超过 10000' },
  { id: 'firstBoss',     name: 'Boss 猎手', desc: '击败第一个 Boss' },
  { id: 'allBosses',     name: '轨道之王', desc: '击败全部 3 个 Boss' },
  { id: 'noHit3',        name: '完美防御', desc: '连续 3 波无伤' },
  { id: 'ultimate5',     name: '能量大师', desc: '释放 5 次大招' },
  { id: 'wave15',        name: '持久战士', desc: '到达第 15 波' },
  { id: 'perfectBlock10',name: '精准格挡', desc: '达成 10 次完美格挡' },
  { id: 'challengeClear',name: '挑战完成', desc: '通关 Challenge 模式' },
];
```

- 加载/保存为 JSON 对象 `{ achievementId: true, ... }`
- 成就解锁时调用 `showAchievement(msg)` 弹窗

#### 设置
```js
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : { soundEnabled: true };
  } catch (e) {
    return { soundEnabled: true };
  }
}
```

### 双模式

#### Classic 模式
- 无尽波次
- 难度持续递增
- 目标：冲击最高分

#### Challenge 模式
- 固定 20 波
- 3 个 Boss（第 5/10/15 波）
- 最后一波（20）为额外挑战波
- 通关后显示特殊评价
- 比 Classic 更难（弹幕速度 +20%）

#### 模式切换 UI
- menu-modes 两个按钮
- 点击切换 active 类
- 存储到 state.mode

## 接口定义
```js
// storage.js
export function loadHighScore()
export function saveHighScore(score)
export function loadAchievements()
export function saveAchievement(id)
export function loadSettings()
export function saveSettings(settings)

// ui.js 补充
export function showAchievement(msg)
export function updateModesUI(mode)
```

## 验收标准
- [ ] 刷新页面后最高分保留
- [ ] 新纪录时正确更新最高分
- [ ] 成就解锁时弹窗通知
- [ ] 成就列表在 localStorage 持久化
- [ ] Classic/Challenge 模式可切换
- [ ] Challenge 模式 20 波后正常结束
- [ ] 设置（音效开关）持久化

## 测试用例
1. 玩一局得 500 分 → 刷新 → 菜单显示最高分 500
2. 首次阻挡弹幕 → "初次防御"成就弹窗
3. 切换 Challenge 模式 → 游戏开始 → 确认难度更高
4. Challenge 模式 20 波通关 → 显示特殊通关评价
5. 音效关闭 → 刷新 → 仍为关闭状态
