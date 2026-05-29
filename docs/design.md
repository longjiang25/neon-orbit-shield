# Neon Orbit Shield — 总体设计文档

> 版本：1.0 | 日期：2026-05-29

---

## 1. 游戏概念与玩法

**Neon Orbit Shield（霓虹轨道护盾）** 是一款赛博朋克风格的轨道防御游戏。

### 核心玩法
- 屏幕中央有一个发光的**能量核心**
- 玩家控制一个围绕核心旋转的**能量护盾**（弧形）
- 彩色**霓虹弹幕**从屏幕边缘飞向核心
- 旋转护盾**阻挡/弹开**弹幕 → 得分 + 粒子爆炸
- 弹幕**击中核心** → 扣血（共 5 条命）
- 完美格挡积累**能量槽** → 满后可释放**大招**（全屏清弹）
- 每 5 波出现 **Boss**，拥有独特攻击模式
- 难度随时间/波次递增

### 操作方式
| 平台 | 操作 |
|------|------|
| 桌面端（鼠标） | 移动鼠标控制护盾角度 |
| 桌面端（键盘） | 方向键 / WASD 旋转护盾，空格释放大招 |
| 移动端（触屏） | 手指拖动控制护盾角度 |

---

## 2. 技术架构

### 2.1 技术选型
- **HTML5 Canvas** — 所有游戏渲染
- **ES6 Modules** — 代码组织，无构建工具
- **Web Audio API** — 程序化音效
- **Pointer Events API** — 统一鼠标/触屏输入
- **localStorage** — 数据持久化
- **零依赖** — 纯原生 JavaScript

### 2.2 架构模式
采用 **模块化 MVC-like** 架构：
- **Model**：游戏状态对象 `state`（由 main.js 持有，各模块读写）
- **View**：renderer.js（Canvas 渲染）+ ui.js（DOM UI）
- **Controller**：input.js（输入）+ main.js（游戏循环/调度）

数据流：`Input → State Update → Render`

### 2.3 渲染管线
```
1. ctx.clearRect()
2. renderBackground()     — 星空 + 星云
3. renderParticles()      — 粒子（下层）
4. renderCore()           — 核心光球
5. renderBoss()           — Boss（如果有）
6. renderProjectiles()    — 弹幕
7. renderPowerups()       — 道具
8. renderShield()         — 护盾（最上层）
```

---

## 3. 模块职责与依赖关系

```
config.js   ←── 所有模块（全局常量）
utils.js    ←── 所有模块（工具函数）
                ↓
input.js    ←── main.js         [输入处理]
renderer.js ←── main.js         [背景/核心渲染]
shield.js   ←── main.js, utils, config  [护盾]
projectile.js ←── main.js, utils, config, particle [弹幕]
particle.js ←── main.js, utils, config  [粒子特效]
boss.js     ←── main.js, utils, config, projectile, particle [Boss]
powerup.js  ←── main.js, utils, config  [道具]
difficulty.js ←── main.js, config       [难度]
audio.js    ←── main.js         [音效]
ui.js       ←── main.js, storage [UI管理]
storage.js  ←── main.js         [持久化]
                ↓
main.js     ←── 所有模块（胶水层，游戏循环）
```

---

## 4. 游戏状态机

```
                    ┌──────────┐
          ┌────────→│   MENU   │←─────────┐
          │         └────┬─────┘          │
          │              │ 点击/空格       │
          │         ┌────▼─────┐          │
          │         │ COUNTDOWN │          │
          │         └────┬─────┘          │
          │              │ 3..2..1        │
          │         ┌────▼─────┐          │
          │   ┌─────│ PLAYING  │─────┐    │
          │   │     └────┬─────┘     │    │
          │   │          │           │    │
          │   │     ┌────▼─────┐     │    │
          │   │     │BOSS INTRO│     │    │
          │   │     └────┬─────┘     │    │
          │   │          │Boss HP=0  │    │
          │   │     ┌────▼─────┐     │    │
          │   │     │WAVE CLEAR│     │    │
          │   │     └────┬─────┘     │    │
          │   │          │           │    │
          │   │          ▼           │    │
          │   │      (继续下一波)     │    │
          │   │                     │    │
          │   │              health=0    │
          │   │          ┌────▼─────┐    │
          │   └──────────│GAME OVER │────┘
          │              └──────────┘
          │
          └─── 暂停（visibilitychange）
```

---

## 5. 数据流设计

### 5.1 输入流
```
PointerEvent / KeyboardEvent
        │
   input.js（统一处理）
        │
   state.targetShieldAngle
   state.energyRelease (空格)
        │
   shield.js（平滑插值）
   main.js（大招触发）
```

### 5.2 碰撞流
```
projectile.js 每帧检测
        │
   ┌────┴────┐
   ▼         ▼
护盾拦截    核心命中
   │         │
   ▼         ▼
得分+粒子   扣血+粒子
连击+1     连击重置
能量+       │
   │        health=0?
   ▼         ▼
可能触发    gameOver
大招
```

### 5.3 难度流
```
difficulty.js（每帧累积游戏时间）
        │
   gameTime / LEVEL_INTERVAL
        │
   level++
        │
   弹幕速度↑  生成间隔↓  新类型概率↑  护盾缩小
```

---

## 6. 配色方案与视觉风格

### 调色板
| 用途 | 色值 | 说明 |
|------|------|------|
| 背景 | `#0a0a1a` | 极深海军蓝 |
| 核心内层 | `#ffffff` | 纯白 |
| 核心中层 | `#ffdd44` | 暖金黄 |
| 核心外层 | `#ff6600` | 橙红 |
| 护盾 | `#00d4ff` | 亮青 |
| 普通弹幕 | `#00f0ff` | 青 |
| 快速弹幕 | `#ff00ff` | 品红 |
| 坚韧弹幕 | `#ff8800` | 橙 |
| 分裂弹幕 | `#00ff88` | 绿 |
| 血量 | `#ff3355` | 霓虹红粉 |
| 能量槽 | `#00ffcc` | 青绿 |
| Boss警告 | `#ff0040` | 警报红 |
| 连击金色 | `#ffdd00` | 金 |

### 视觉技术
- **霓虹发光**：`ctx.shadowBlur` + `ctx.shadowColor`
- **粒子叠加**：`globalCompositeOperation = 'lighter'`（additive blending）
- **核心呼吸**：`sin(time)` 驱动的半径和透明度变化
- **拖尾效果**：粒子跟随弹幕，继承颜色

---

## 7. 性能策略

| 策略 | 说明 |
|------|------|
| 对象池 | 弹幕和粒子预分配，避免 GC 压力 |
| 粒子上限 | 1000 个，超出则回收最旧的 |
| 移动端降级 | 粒子数量缩放到 40% |
| dt 上限 | 最大 50ms，防止长时间后台后物理异常 |
| visibility API | 页面隐藏时暂停，恢复时重置 dt |
| 自动降质 | 帧率 <30fps 持续 1 秒 → 减少粒子 |
| Canvas DPR | 处理 devicePixelRatio，Retina 清晰渲染 |

---

## 8. 兼容性

| 特性 | Chrome | Firefox | Safari | iOS Safari | Android Chrome |
|------|--------|---------|--------|------------|----------------|
| ES6 Modules | ✅ | ✅ | ✅ | ✅ | ✅ |
| Canvas 2D | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pointer Events | ✅ | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. 部署架构

```
GitHub Repository (neon-orbit-shield)
        │
   git push main
        │
   GitHub Pages (built-in)
        │
   https://<username>.github.io/neon-orbit-shield/
```

- 纯静态托管，无服务端
- 支持自定义域名（可选 CNAME）
- HTTPS 自动提供
- 全球 CDN 加速
