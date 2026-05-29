# 任务 6：Boss 系统

## 开发目标
实现 3 个 Boss（环形炮台、双子卫星、虚空之眼），各含多阶段攻击模式、Boss 血条、登场/击败动画。

## 前置依赖
- 任务 3（弹幕系统）
- 任务 4（粒子特效）
- 任务 5（ui.js 的 updateBossHealth）

## 输入文件
- `js/boss.js` — 待实现

## 详细实现规格

### Boss 基类
```js
{
  type: 'ringCannon',
  hp: 40,
  maxHp: 40,
  phase: 1,
  maxPhases: 2,
  angle: 0,
  radius: orbitRadius * 0.8,
  x: 0, y: 0,
  timer: 0,
  attackTimer: 0,
  active: false,
  introTimer: 0,
}
```

### Boss 1：环形炮台 (Ring Cannon) — 第 5 波
- **外观**：绕轨道旋转的大型齿轮状结构，多个炮管
- **阶段 1 (HP > 50%)**：
  - 周期性发射 8 方向弹幕（每 2 秒）
  - 每个方向间隔 45°
  - Boss 缓慢绕轨道旋转
- **阶段 2 (HP ≤ 50%)**：
  - 保留 8 方向弹幕
  - 新增激光扫射：一条从核心指向边缘的射线，绕核心旋转
  - 玩家必须同时躲避激光 + 阻挡弹幕
  - 激光速度快，触碰扣 2 血

### Boss 2：双子卫星 (Twin Satellite) — 第 10 波
- **外观**：两个小卫星绕核心对向旋转
- **阶段 1 (HP > 60%)**：
  - 两个卫星轮流发射密集弹幕（3 发扇形）
  - 一个发射普通弹幕，另一个发射快速弹幕
- **阶段 2 (HP ≤ 60%)**：
  - 弹幕频率加倍
  - 卫星速度加快
- **特殊机制**：两个卫星共享血条，击中任意一个都扣血

### Boss 3：虚空之眼 (Void Eye) — 第 15 波
- **外观**：巨大的黑暗眼球，周围有多层环形结构
- **阶段 1 (HP > 66%)**：弹幕雨 — 从上方大量弹幕倾泻
- **阶段 2 (HP 33%-66%)**：追踪弹 — 发射缓慢但追踪玩家的弹幕
- **阶段 3 (HP < 33%)**：绝望之墙 — 360° 全屏弹幕，仅留一个小缺口（随机位置），必须精准找到缺口

### Boss 登场动画
- 屏幕边缘闪烁红色
- boss-announce 元素显示 "⚠ BOSS ⚠" + Boss 名称（2 秒）
- 屏幕震动
- Boss 从边缘出现

### Boss 血条
- boss-health-container 显示
- 宽度 = hp / maxHp × 100%
- 颜色从绿渐变到红
- Boss 被击中时闪烁白色

### Boss 击败动画
- 大量粒子爆炸（100+ 个）
- 屏幕白闪
- 血条消失
- 音效

## 接口定义
```js
export function initBossSystem(state)
export function spawnBoss(state, bossType)
export function updateBoss(state, dt)
export function renderBoss(ctx, state)
export function damageBoss(state, amount)
```

## 验收标准
- [ ] Boss 在第 5/10/15 波正确出现
- [ ] Boss 登场有动画 + 名称提示
- [ ] 3 个 Boss 有视觉区分
- [ ] Boss 攻击模式符合规格
- [ ] Boss 血条正常显示和减少
- [ ] Boss 被击败后爆炸粒子效果
- [ ] Boss 被击败后进入下一波

## 测试用例
1. 玩到第 5 波 → Boss 1 出现
2. 护盾挡住 Boss 弹幕 → Boss 受伤
3. Boss HP 到 0 → 击败动画 + 进入 Wave Clear
4. Boss 攻击时核心被击中 → 正常扣血
5. 3 个 Boss 都测试通过
