# 任务 3：弹幕系统

## 开发目标
实现弹幕对象池、4 种弹幕类型、生成逻辑、移动、碰撞检测（含防穿透）。

## 前置依赖
- 任务 0（config.js, utils.js）
- 任务 2（shield.js 的 isWithinShield）

## 输入文件
- `js/projectile.js` — 待实现

## 详细实现规格

### 对象池设计
```js
// 每个弹幕对象
{
  active: false,
  x: 0, y: 0,
  vx: 0, vy: 0,           // 速度分量（或 speed + angle）
  speed: 270,
  angle: 0,               // 运动方向
  type: 'normal',          // normal | fast | tough | splitter
  hp: 1,
  color: '#00f0ff',
  shape: 'circle',
  trail: [],               // 拖尾历史位置（最多 5 个）
}
```

### initProjectilePool()
- 预分配 `MAX_PROJECTILES`(200) 个对象
- 返回数组

### spawnProjectile(pool, state, type)
- 从池中找到第一个 `active: false` 的对象
- 随机 spawnAngle → 计算边缘位置
- 设置速度方向指向中心
- 返回该对象引用（或 null 若池满）

### updateProjectiles(pool, state, dt, spawnTimer)
- 遍历活跃弹幕：更新位置
- 碰撞检测（子步进）：
  1. 计算到中心距离
  2. 如果进入护盾轨道范围 → 检查 `isWithinShield`
  3. 如果进入核心范围 → 核心命中
- 收集 `blocked[]` 和 `hits[]` 事件
- 返回 `{ blocked, hits }`

### renderProjectiles(ctx, pool, state)
- 根据 type 绘制不同形状：
  - normal: 发光圆
  - fast: 发光三角形（尖头指向运动方向）
  - tough: 双环（外环虚线）
  - splitter: 旋转菱形

### 碰撞检测防穿透
```js
const steps = Math.ceil(speed * dt / (state.radius * 0.05)) || 1;
const stepDt = dt / steps;
for (let i = 0; i < steps; i++) {
  // 小步移动 + 检测
}
```

## 接口定义
```js
export function initProjectilePool()
export function spawnProjectile(pool, state, type)
export function updateProjectiles(pool, state, dt, spawnTimer)
export function renderProjectiles(ctx, pool, state)
```

## 验收标准
- [ ] 弹幕从屏幕边缘飞向中央
- [ ] 4 种弹幕类型视觉区分明显
- [ ] 护盾弧内弹幕被正确拦截
- [ ] 弧外弹幕穿过并击中核心
- [ ] 坚韧弹幕需要 2 次打击
- [ ] 无弹幕穿透护盾（虚假漏判）
- [ ] 无弹幕被误判拦截（虚假命中）

## 测试用例
1. 等待弹幕生成 → 确认从边缘飞向中心
2. 移动护盾到弹幕路径 → 弹幕被弹开
3. 不移动护盾 → 弹幕击中核心
4. 连续快速弹幕 → 护盾正确拦截
5. 高速弹幕 → 不穿透

## 已知风险
- 高速弹幕可能一帧内穿过护盾 → 子步进解决
- 对象池耗尽 → 返回 null，调用方需处理
