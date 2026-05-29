# 任务 11：整体集成 + 打磨

## 开发目标
将所有模块在 main.js 中完整集成，实现完整的游戏闭环，移动端适配，性能优化，全局错误处理。

## 前置依赖
- 所有任务 0-10 完成

## 输入文件
- `js/main.js` — 完成所有集成
- `index.html` — 可能需要微调

## 详细实现规格

### 模块集成检查清单
- [ ] renderer.js → renderBackground, renderCore 调用
- [ ] input.js → initInput, updateInput 正常工作
- [ ] shield.js → 渲染在正确 Z 层（弹幕之上）
- [ ] projectile.js → 碰撞事件正确路由到得分/扣血
- [ ] particle.js → 所有特效触发时机正确
- [ ] boss.js → 波次触发 + 攻击/受伤/击败流程
- [ ] powerup.js → 生成/收集/效果/过期
- [ ] difficulty.js → 难度曲线 + 波次推进
- [ ] audio.js → 所有事件对应音效
- [ ] ui.js → HUD 实时更新 + 状态画面切换
- [ ] storage.js → 持久化读写

### 事件路由表
```
弹幕被挡 → handleBlock()
  ├─ 得分增加
  ├─ 连击 +1
  ├─ 能量 +8 (或 +15 完美格挡)
  ├─ spawnDeflectEffect()
  ├─ playBlock()
  └─ 更新 HUD

弹幕命中核心 → handleCoreHit()
  ├─ 扣血
  ├─ 重置连击
  ├─ spawnCoreHitEffect()
  ├─ playHit()
  ├─ screenShake
  └─ health=0 → setState('gameover')

道具收集 → collectPowerup()
  ├─ 激活效果
  ├─ spawnPowerupEffect()
  └─ playPowerup()

Boss 被击中 → damageBoss()
  ├─ Boss HP--
  ├─ spawnDeflectEffect() (大)
  └─ playBossHit()

能量满 + 空格 → releaseUltimate()
  ├─ 全屏闪白
  ├─ 冲击波粒子
  ├─ 摧毁所有弹幕
  ├─ 短暂无敌
  └─ playUltimate()
```

### 移动端适配
- `window.visualViewport` 监听（处理软键盘/地址栏）
- 移动端粒子降级（×0.4）
- 触摸区域适配（护盾轨道偏大）
- 安全区适配（CSS env(safe-area-inset-*)）
- 禁止双击缩放和长按菜单

### 性能优化
- 帧率监控：记录最近 60 帧 dt
- 低帧率降级：<30fps 持续 1 秒 → 粒子减半 → 关闭拖尾
- visibilitychange：隐藏时暂停，返回时重置 dt
- 弹幕离屏回收：超出屏幕一定距离自动 deactivate

### 全局错误处理
```js
window.addEventListener('error', (e) => {
  console.error('Game Error:', e.message, e.filename, e.lineno);
  // 尝试优雅降级而非崩溃
});

// 模块加载失败
// 每个 import 用 try/catch 包裹（实际上 module 不支持 try/catch import）
// 使用 import() 动态导入 + .catch()
```

## 验收标准
- [ ] 所有模块正确集成，无 undefined 引用
- [ ] 完整游戏流程：菜单 → 游戏 → 死亡 → 重来
- [ ] 移动端触屏完整可玩
- [ ] 帧率稳定在 55+ fps（桌面端）
- [ ] 移动端帧率 30+ fps
- [ ] 切后台暂停，回来恢复
- [ ] 窗口缩放正常工作
- [ ] 无 console 报错

## 测试用例
1. 完整游戏流程测试（从菜单到重来）
2. 所有道具收集并使用
3. 所有 3 个 Boss 击败
4. 大招释放
5. 移动端完整测试
6. 标签页切换暂停/恢复
7. 窗口缩放
8. 长时间游戏（15 分钟）无内存泄漏
