# 任务 4：粒子特效

## 开发目标
实现粒子对象池（1000个）、多种特效（弹开/受伤/连击/Boss）、屏幕震动和 additive blending（霓虹叠加）。

## 前置依赖
- 任务 0（config.js, utils.js）

## 输入文件
- `js/particle.js` — 待实现

## 详细实现规格

### 粒子对象
```js
{
  active: false,
  x: 0, y: 0,
  vx: 0, vy: 0,
  life: 0, maxLife: 0,
  color: '#ffffff',
  size: 2,
  decay: 1,              // 生命衰减率
  gravity: 0,            // 重力加速度（可选）
  shrink: true,          // 是否缩小
}
```

### initParticlePool()
- 预分配 `MAX_PARTICLES`(1000) 个
- 返回数组

### spawnParticles(pool, x, y, color, count, config)
- config 可覆盖默认参数
- 激活 count 个粒子，从 (x, y) 位置发射
- 默认圆形扩散（随机角度 + 随机速度）

### 特效配置

#### deflect（弹开）
- 20-30 个粒子
- 颜色 = 弹幕颜色
- 速度：沿护盾切线方向为主 + 随机偏移
- 生命周期：0.3-0.6s

#### coreHit（核心受伤）
- 40-60 个粒子
- 颜色：红橙混合（#ff3355, #ff6600, #ff8800）
- 速度：径向向外爆发
- 生命周期：0.5-1.0s
- 屏幕震动：`state.screenShake = { duration: 0.3, intensity: 8 }`

#### combo（连击里程碑）
- 15-25 个金色粒子
- 速度：向上飘散
- 生命周期：0.8-1.2s

#### bossDeflect（Boss 弹幕被挡）
- 30-50 个粒子
- 更亮、更大、更长生命

### 屏幕震动
```js
// update 中
if (state.screenShake && state.screenShake.duration > 0) {
  const s = state.screenShake;
  s.duration -= dt;
  const offsetX = (Math.random() - 0.5) * s.intensity * (s.duration / s.maxDuration);
  const offsetY = (Math.random() - 0.5) * s.intensity * (s.duration / s.maxDuration);
  // 在渲染前应用 ctx.translate(offsetX, offsetY)
}
```

### additive blending
```js
// 渲染粒子前
ctx.globalCompositeOperation = 'lighter';
// ... 渲染所有粒子 ...
ctx.globalCompositeOperation = 'source-over';
```

## 接口定义
```js
export function initParticlePool()
export function spawnParticles(pool, x, y, color, count, config)
export function updateParticles(pool, dt)
export function renderParticles(ctx, pool)
export function spawnDeflectEffect(pool, x, y, color)
export function spawnCoreHitEffect(pool, cx, cy)
export function spawnComboEffect(pool, x, y)
export function applyScreenShake(ctx, state)
```

## 验收标准
- [ ] 弹开弹幕时有粒子爆发
- [ ] 核心被击中时有红橙爆炸
- [ ] 连击达到里程碑时有金色特效
- [ ] 粒子叠加后有霓虹发光效果（lighter blending）
- [ ] 屏幕震动功能正常
- [ ] 粒子到生命周期结束自动回收

## 测试用例
1. 挡住弹幕 → 看到粒子爆发
2. 让弹幕击中核心 → 看到红橙爆炸 + 屏幕震动
3. 连续阻挡 5 个 → 看到金色连击特效
4. 观察粒子渐隐消失（无突然消失）

## 已知风险
- additive blending 在大量粒子时 GPU 压力大
- 移动端降质：减少粒子数到 40%
